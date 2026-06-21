import { expect, test } from "@playwright/test";

type MetronomeTrace = {
  tickIndex: number;
  audioTime: number;
  bpm: number;
  expectedIntervalMs: number;
  subdivision: string;
};

type DecodedRecordingEvidence = {
  decodedDurationMs: number;
  peakAmplitude: number;
  rmsAmplitude: number;
  estimatedFrequencyHz: number | null;
};

function average(values: number[]) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function intervalsFromAudioTime(traces: MetronomeTrace[]) {
  return traces.slice(1).map((trace, index) => (trace.audioTime - traces[index].audioTime) * 1_000);
}

test("quick metronome records, replays, persists, and keeps playback and recording independent", async ({
  page
}) => {
  const consoleErrors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    consoleErrors.push(error.message);
  });

  await page.addInitScript(() => {
    if (!window.sessionStorage.getItem("quick-metronome-e2e-ready")) {
      window.localStorage.clear();
      window.sessionStorage.setItem("quick-metronome-e2e-ready", "true");
    }
    const e2eWindow = window as Window & { __quickMetronomeTraces?: unknown[] };

    e2eWindow.__quickMetronomeTraces = [];
    window.addEventListener("quick-metronome:scheduled-tick", (event) => {
      e2eWindow.__quickMetronomeTraces?.push((event as CustomEvent).detail);
    });

    const originalPlay = window.HTMLMediaElement.prototype.play;

    window.HTMLMediaElement.prototype.play = function play() {
      return originalPlay.call(this).catch(() => Promise.resolve());
    };

    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: async () => {
          const audioWindow = window as Window &
            typeof globalThis & { webkitAudioContext?: typeof AudioContext };
          const AudioContextConstructor = audioWindow.AudioContext || audioWindow.webkitAudioContext;
          if (!AudioContextConstructor) {
            throw new Error("Web Audio is not available in this browser.");
          }
          const audioContext = new AudioContextConstructor();
          const destination = audioContext.createMediaStreamDestination();
          const oscillator = audioContext.createOscillator();
          const gain = audioContext.createGain();

          oscillator.frequency.value = 440;
          gain.gain.value = 0.2;
          oscillator.connect(gain);
          gain.connect(destination);
          oscillator.start();

          return destination.stream;
        }
      }
    });
  });

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/quick-metronome");
  await expect(page.getByRole("heading", { name: "Quick Metronome" })).toBeVisible();
  await expect(page.getByText("Stopped").first()).toBeVisible();
  await expect(page.getByTestId("demo-recording-banner")).toBeVisible();
  await expect(page.getByText("Demo synthetic recording")).toBeVisible();
  const demoAudioDataUrl = await page.getByTestId("demo-recording-audio").getAttribute("src");

  expect(demoAudioDataUrl).toMatch(/^data:audio\/wav;base64,/);
  const decodedDemoEvidence = await page.evaluate(async (audioDataUrl) => {
    if (!audioDataUrl) {
      throw new Error("Missing demo audio data URL.");
    }

    const audioWindow = window as Window &
      typeof globalThis & { webkitAudioContext?: typeof AudioContext };
    const AudioContextConstructor = audioWindow.AudioContext || audioWindow.webkitAudioContext;

    if (!AudioContextConstructor) {
      throw new Error("Web Audio is not available in this browser.");
    }

    const response = await fetch(audioDataUrl);
    const arrayBuffer = await response.arrayBuffer();
    const audioContext = new AudioContextConstructor();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    const samples = audioBuffer.getChannelData(0);
    let peakAmplitude = 0;
    let sumSquares = 0;
    let positiveZeroCrossings = 0;
    let previousSample = samples[0] ?? 0;

    for (let index = 0; index < samples.length; index += 1) {
      const sample = samples[index] ?? 0;
      peakAmplitude = Math.max(peakAmplitude, Math.abs(sample));
      sumSquares += sample * sample;
      if (previousSample < 0 && sample >= 0) {
        positiveZeroCrossings += 1;
      }
      previousSample = sample;
    }

    await audioContext.close();

    return {
      decodedDurationMs: audioBuffer.duration * 1_000,
      peakAmplitude,
      rmsAmplitude: Math.sqrt(sumSquares / Math.max(1, samples.length)),
      estimatedFrequencyHz:
        audioBuffer.duration > 0 ? positiveZeroCrossings / audioBuffer.duration : null
    } satisfies DecodedRecordingEvidence;
  }, demoAudioDataUrl);

  expect(decodedDemoEvidence.decodedDurationMs).toBeGreaterThan(900);
  expect(decodedDemoEvidence.decodedDurationMs).toBeLessThan(1_100);
  expect(decodedDemoEvidence.rmsAmplitude).toBeGreaterThan(0.05);
  expect(decodedDemoEvidence.peakAmplitude).toBeGreaterThan(0.1);
  expect(decodedDemoEvidence.estimatedFrequencyHz).toBeGreaterThan(430);
  expect(decodedDemoEvidence.estimatedFrequencyHz).toBeLessThan(450);

  await page.getByRole("button", { name: "Replay Demo Recording" }).click();
  await expect(page.getByText("Replaying latest recording.").first()).toBeVisible();
  await page.getByRole("button", { name: "Stop Replay" }).click();
  await page.goto("/recordings");
  await expect(page.getByRole("heading", { name: "Recordings" })).toBeVisible();
  await expect(page.getByTestId("recordings-empty-state")).toBeVisible();
  await page.goto("/quick-metronome");

  const bpmInput = page.getByRole("spinbutton", { name: "BPM" });

  await page.getByRole("button", { name: "Increase BPM" }).click();
  await expect(bpmInput).toHaveValue("97");
  await page.getByRole("button", { name: "Decrease BPM" }).click();
  await expect(bpmInput).toHaveValue("96");
  await bpmInput.fill("");
  await bpmInput.fill("6");
  await expect(bpmInput).toHaveValue("6");
  await expect(page.getByText(/Tick interval 625 ms/i)).toBeVisible();
  await bpmInput.fill("60");
  await bpmInput.press("Enter");
  await expect(bpmInput).toHaveValue("60");
  await expect(page.getByText(/Tick interval 1000 ms/i)).toBeVisible();
  await bpmInput.fill("72");
  await page.getByRole("button", { name: "Tap Tempo" }).focus();
  await expect(bpmInput).toHaveValue("72");
  await expect(page.getByText(/Tick interval 833 ms/i)).toBeVisible();
  await bpmInput.fill("6");
  await page.getByRole("button", { name: "Increase BPM" }).click();
  await expect(bpmInput).toHaveValue("31");
  await expect(page.getByText(/Tick interval 1935 ms/i)).toBeVisible();
  await bpmInput.fill("120");
  await bpmInput.press("Enter");
  await expect(page.getByText(/Tick interval 500 ms/i)).toBeVisible();

  await page.getByLabel("Time signature").selectOption("3/4");
  await page.getByLabel("Subdivision").selectOption("eighth");
  await page.getByLabel("Countdown").selectOption("4");
  await page.getByRole("button", { name: "Every beat" }).click();
  await expect(page.getByRole("button", { name: "Every beat" })).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "Tap Tempo" }).click();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Tap Tempo" }).click();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Tap Tempo" }).click();
  await expect(bpmInput).toHaveValue(/10[8-9]|11[0-9]|12[0-9]|130/);

  await page.getByLabel("Countdown").selectOption("0");
  await page.getByLabel("Subdivision").selectOption("quarter");
  await bpmInput.fill("120");
  await page.getByRole("button", { name: "Start metronome" }).click();
  await expect(page.getByText("Metronome playing.")).toBeVisible();
  await expect(page.getByText(/locked while the metronome is running/i)).toBeVisible();
  await expect(page.getByLabel("Time signature")).toBeDisabled();
  await expect(page.getByLabel("Subdivision")).toBeDisabled();
  await expect(page.getByLabel("Countdown")).toBeDisabled();
  await expect(page.getByRole("button", { name: "Every beat" })).toBeDisabled();
  await page.waitForFunction(() => {
    const e2eWindow = window as Window & { __quickMetronomeTraces?: MetronomeTrace[] };

    return (e2eWindow.__quickMetronomeTraces ?? []).filter(
      (trace) => trace.bpm === 120 && trace.subdivision === "quarter"
    ).length >= 5;
  });

  const bpm120Traces = await page.evaluate(() => {
    const e2eWindow = window as Window & { __quickMetronomeTraces?: MetronomeTrace[] };

    return (e2eWindow.__quickMetronomeTraces ?? [])
      .filter((trace) => trace.bpm === 120 && trace.subdivision === "quarter")
      .slice(-5);
  });
  const bpm120Intervals = intervalsFromAudioTime(bpm120Traces);

  expect(average(bpm120Intervals)).toBeGreaterThan(475);
  expect(average(bpm120Intervals)).toBeLessThan(525);
  expect(Math.max(...bpm120Intervals) - Math.min(...bpm120Intervals)).toBeLessThan(8);

  await bpmInput.fill("180");
  await bpmInput.press("Enter");
  await page.waitForFunction(() => {
    const e2eWindow = window as Window & { __quickMetronomeTraces?: MetronomeTrace[] };

    return (e2eWindow.__quickMetronomeTraces ?? []).filter(
      (trace) => trace.bpm === 180 && trace.subdivision === "quarter"
    ).length >= 5;
  });

  const bpm180Traces = await page.evaluate(() => {
    const e2eWindow = window as Window & { __quickMetronomeTraces?: MetronomeTrace[] };

    return (e2eWindow.__quickMetronomeTraces ?? [])
      .filter((trace) => trace.bpm === 180 && trace.subdivision === "quarter")
      .slice(-5);
  });
  const bpm180Intervals = intervalsFromAudioTime(bpm180Traces);

  expect(average(bpm180Intervals)).toBeGreaterThan(310);
  expect(average(bpm180Intervals)).toBeLessThan(355);
  expect(average(bpm180Intervals)).toBeLessThan(average(bpm120Intervals) - 120);
  await page.getByRole("button", { name: "Stop metronome" }).click();
  await expect(page.getByText("Metronome stopped.")).toBeVisible();
  await expect(page.getByLabel("Countdown")).toBeEnabled();

  await page.getByRole("button", { name: "Start recording" }).click();
  await expect(page.getByText("Recording without metronome.")).toBeVisible();
  await expect(page.getByText("Recording").first()).toBeVisible();

  await page.getByRole("button", { name: "Start metronome" }).click();
  await expect(page.getByText(/Playing \+ Recording/i)).toBeVisible();
  await expect(page.getByText("Metronome playing.")).toBeVisible();

  await page.getByRole("button", { name: "Stop metronome" }).click();
  await expect(page.getByText("Metronome stopped; recording is still active.")).toBeVisible();
  await expect(page.getByText("Recording").first()).toBeVisible();

  await page.waitForTimeout(700);
  await page.getByRole("button", { name: "Stop recording" }).click();
  await expect(page.getByText(/^Recording saved/)).toBeVisible();
  await expect(page.getByTestId("latest-recording")).toBeVisible();
  await expect(page.getByText("quick").first()).toBeVisible();
  await expect(page.getByText("No sheet linked.")).toBeVisible();
  const latestRecording = await page.evaluate(() => {
    const rawValue = window.localStorage.getItem("metronome-practice:v0:quick-recordings");
    const parsed = rawValue ? JSON.parse(rawValue) : null;

    return parsed?.recordings?.[0] ?? null;
  });

  expect(latestRecording.type).toBe("quick");
  expect(latestRecording.sheetId).toBeNull();
  expect(latestRecording.sizeBytes).toBeGreaterThan(1_000);
  expect(latestRecording.artifactAnalysis.decodedDurationMs).toBeGreaterThan(600);
  expect(Math.abs(latestRecording.durationMs - latestRecording.artifactAnalysis.decodedDurationMs)).toBeLessThanOrEqual(1);
  expect(latestRecording.artifactAnalysis.rmsAmplitude).toBeGreaterThan(0.02);
  expect(latestRecording.artifactAnalysis.peakAmplitude).toBeGreaterThan(0.05);
  expect(latestRecording.artifactAnalysis.estimatedFrequencyHz).toBeGreaterThan(400);
  expect(latestRecording.artifactAnalysis.estimatedFrequencyHz).toBeLessThan(480);
  expect(latestRecording.artifactAnalysis.isSilent).toBe(false);

  const decodedEvidence = await page.evaluate(async () => {
    const rawValue = window.localStorage.getItem("metronome-practice:v0:quick-recordings");
    const parsed = rawValue ? JSON.parse(rawValue) : null;
    const recording = parsed.recordings[0];
    const audioWindow = window as Window &
      typeof globalThis & { webkitAudioContext?: typeof AudioContext };
    const AudioContextConstructor = audioWindow.AudioContext || audioWindow.webkitAudioContext;

    if (!AudioContextConstructor) {
      throw new Error("Web Audio is not available in this browser.");
    }

    const response = await fetch(recording.audioDataUrl);
    const arrayBuffer = await response.arrayBuffer();
    const audioContext = new AudioContextConstructor();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    const samples = audioBuffer.getChannelData(0);
    let peakAmplitude = 0;
    let sumSquares = 0;
    let positiveZeroCrossings = 0;
    let previousSample = samples[0] ?? 0;

    for (let index = 0; index < samples.length; index += 1) {
      const sample = samples[index] ?? 0;
      peakAmplitude = Math.max(peakAmplitude, Math.abs(sample));
      sumSquares += sample * sample;
      if (previousSample < 0 && sample >= 0) {
        positiveZeroCrossings += 1;
      }
      previousSample = sample;
    }

    await audioContext.close();

    return {
      decodedDurationMs: audioBuffer.duration * 1_000,
      peakAmplitude,
      rmsAmplitude: Math.sqrt(sumSquares / Math.max(1, samples.length)),
      estimatedFrequencyHz:
        audioBuffer.duration > 0 ? positiveZeroCrossings / audioBuffer.duration : null
    } satisfies DecodedRecordingEvidence;
  });

  expect(decodedEvidence.decodedDurationMs).toBeGreaterThan(600);
  expect(decodedEvidence.rmsAmplitude).toBeGreaterThan(0.02);
  expect(decodedEvidence.peakAmplitude).toBeGreaterThan(0.05);
  expect(decodedEvidence.estimatedFrequencyHz).toBeGreaterThan(400);
  expect(decodedEvidence.estimatedFrequencyHz).toBeLessThan(480);

  await page.getByRole("button", { name: "Replay Latest Recording" }).first().click();
  await expect(page.getByText("Replaying latest recording.").first()).toBeVisible();

  await page.getByRole("button", { name: "Start metronome" }).click();
  await expect(page.getByText("Metronome playing.")).toBeVisible();
  await page.getByRole("button", { name: "Start recording" }).click();
  await expect(page.getByText("Recording while metronome plays.")).toBeVisible();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Stop recording" }).click();
  await expect(page.getByText("Recording saved; metronome is still playing.")).toBeVisible();
  await expect(page.getByText("Playing").first()).toBeVisible();
  await page.getByRole("button", { name: "Stop metronome" }).click();
  await expect(page.getByText("Metronome stopped.")).toBeVisible();

  await page.goto("/recordings");
  await expect(page.getByRole("heading", { name: "Recordings" })).toBeVisible();
  await expect(page.getByTestId("recordings-list")).toBeVisible();
  await expect(page.getByText("Quick metronome recording").first()).toBeVisible();
  await expect(page.getByText("No sheet linked.")).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("recordings-list")).toBeVisible();
  await expect(page.getByText("quick").first()).toBeVisible();

  expect(consoleErrors).toEqual([]);
});

test("quick metronome shows microphone permission denial", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: async () => {
          throw new DOMException("Permission denied", "NotAllowedError");
        }
      }
    });
  });

  await page.goto("/quick-metronome");
  await page.getByRole("button", { name: "Start recording" }).click();
  await expect(page.getByText("Microphone access was denied")).toBeVisible();
});
