import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const sheetFixturesDir = path.resolve(currentDir, "../../test-fixtures/sheets");
const sheetDbName = "metronome-practice-v0-sheet-library";
const practiceDbName = "metronome-practice-v0-practice-sessions";
const recordingHistoryStorageKey = "metronome-practice:v0:quick-recordings";

type SavedRecordingEvidence = {
  id: string;
  type: string;
  sessionId: string;
  sheetId: string;
  durationMs: number;
  sizeBytes: number;
  mimeType: string;
  audioDataUrl: string;
  trustedPeaks: number[];
  artifactAnalysis: {
    decodedDurationMs: number;
    rmsAmplitude: number;
    peakAmplitude: number;
    estimatedFrequencyHz: number | null;
    isSilent: boolean;
  } | null;
};

async function deleteDatabase(page: Page, databaseName: string) {
  await page.evaluate(
    (name: string) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase(name);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        request.onblocked = () => resolve();
      }),
    databaseName
  );
}

async function clearState(page: Page) {
  await page.goto("/sheet-library");
  await page.evaluate((storageKey) => window.localStorage.removeItem(storageKey), recordingHistoryStorageKey);
  await deleteDatabase(page, sheetDbName);
  await deleteDatabase(page, practiceDbName);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Sheet Library" })).toBeVisible();
}

async function importSheet(page: Page, name = "Recording Contract Sheet") {
  await page.goto("/sheet-library");
  await page.getByLabel("File").setInputFiles(path.join(sheetFixturesDir, "real-sheet.png"));
  await expect(page.getByText(/^Ready:/)).toBeVisible();
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("BPM").fill("88");
  await page.getByLabel("Time signature").fill("3/4");
  await page.getByRole("button", { name: "Save Imported Sheet" }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();

  const link = page.getByRole("link", { name: "Open Sheet Practice" }).first();
  const href = await link.getAttribute("href");
  const sheetId = new URL(href ?? "", "http://127.0.0.1").pathname.split("/").pop() ?? "";

  expect(sheetId).toBeTruthy();

  return { link, sheetId };
}

async function installSyntheticMicrophone(page: Page, frequencyHz = 440) {
  await page.addInitScript((frequency) => {
    const e2eWindow = window as Window & {
      __sheetSyntheticAudioNodes?: unknown[];
    };

    e2eWindow.__sheetSyntheticAudioNodes = [];
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

          oscillator.frequency.value = frequency;
          gain.gain.value = 0.22;
          oscillator.connect(gain);
          gain.connect(destination);
          oscillator.start();
          e2eWindow.__sheetSyntheticAudioNodes?.push({ audioContext, oscillator, gain });

          return destination.stream;
        }
      }
    });
  }, frequencyHz);
}

async function getSavedRecordings(page: Page) {
  return page.evaluate((storageKey) => {
    const rawValue = window.localStorage.getItem(storageKey);
    const parsed = rawValue ? JSON.parse(rawValue) : { recordings: [] };

    return Array.isArray(parsed.recordings) ? parsed.recordings : [];
  }, recordingHistoryStorageKey);
}

async function getSheetRecordings(page: Page, sheetId: string) {
  const recordings = await getSavedRecordings(page);

  return recordings.filter(
    (recording: { type: string; sheetId: string }) => recording.type === "sheet" && recording.sheetId === sheetId
  ) as SavedRecordingEvidence[];
}

async function decodeRecording(page: Page, recordingId: string) {
  return page.evaluate(
    async ({ storageKey, id }: { storageKey: string; id: string }) => {
      const rawValue = window.localStorage.getItem(storageKey);
      const parsed = rawValue ? JSON.parse(rawValue) : { recordings: [] };
      const recording = parsed.recordings.find((item: { id: string }) => item.id === id);
      const audioWindow = window as Window &
        typeof globalThis & { webkitAudioContext?: typeof AudioContext };
      const AudioContextConstructor = audioWindow.AudioContext || audioWindow.webkitAudioContext;

      if (!recording?.audioDataUrl || !AudioContextConstructor) {
        throw new Error(`Cannot decode ${id}.`);
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

      const decodedDurationMs = audioBuffer.duration * 1_000;

      return {
        decodedDurationMs,
        peakAmplitude,
        rmsAmplitude: Math.sqrt(sumSquares / Math.max(1, samples.length)),
        estimatedFrequencyHz:
          decodedDurationMs > 0 ? positiveZeroCrossings / (decodedDurationMs / 1_000) : null
      };
    },
    { storageKey: recordingHistoryStorageKey, id: recordingId }
  );
}

async function getWaveformState(page: Page) {
  const waveform = page.getByTestId("sheet-derived-waveform");

  await expect(waveform).toBeVisible();

  return waveform.evaluate((element) => ({
    peakCount: Number(element.getAttribute("data-peak-count")),
    source: element.getAttribute("data-waveform-source"),
    heights: Array.from(element.querySelectorAll("span")).map((span) => Number.parseFloat((span as HTMLElement).style.height))
  }));
}

test("sheet practice records real synthetic audio, replays latest take, persists waveform, and keeps Practice Again immutable", async ({
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
  await installSyntheticMicrophone(page, 440);
  await page.addInitScript(() => {
    const e2eWindow = window as Window & { __sheetRecordingPlaybackEvents?: unknown[] };

    e2eWindow.__sheetRecordingPlaybackEvents = [];
    window.addEventListener("recordings-review:playback", (event) => {
      e2eWindow.__sheetRecordingPlaybackEvents?.push((event as CustomEvent).detail);
    });
  });

  await page.setViewportSize({ width: 1280, height: 820 });
  await clearState(page);
  const { link, sheetId } = await importSheet(page);

  await link.click();
  await expect(page.getByRole("heading", { name: "Recording Contract Sheet" })).toBeVisible();
  await expect(page.getByTestId("sheet-recording-state")).toContainText("stopped");
  await page.getByRole("button", { name: "Start recording" }).click();
  await expect(page.getByText("Recording without metronome.")).toBeVisible();
  await expect(page.getByTestId("sheet-recording-state")).toContainText("active");
  await page.waitForTimeout(850);
  await page.getByRole("button", { name: "Stop recording" }).click();
  await expect(page.getByText("Recording saved.")).toBeVisible();
  await expect(page.getByTestId("sheet-latest-recording")).toBeVisible();
  await expect(page.getByTestId("sheet-waveform-source")).toContainText("trusted peaks");

  let sheetRecordings = await getSheetRecordings(page, sheetId);

  expect(sheetRecordings).toHaveLength(1);
  const originalRecording = sheetRecordings[0];
  const originalSnapshot = { ...originalRecording };

  expect(originalRecording).toMatchObject({
    type: "sheet",
    sheetId
  });
  expect(originalRecording.sessionId).toBeTruthy();
  expect(originalRecording.audioDataUrl).toMatch(/^data:audio\//);
  expect(originalRecording.sizeBytes).toBeGreaterThan(0);
  expect(originalRecording.trustedPeaks.length).toBeGreaterThan(12);
  expect(originalRecording.trustedPeaks.every((peak) => Number.isFinite(peak))).toBe(true);
  expect(originalRecording.trustedPeaks.some((peak) => peak > 0)).toBe(true);

  const decodedOriginal = await decodeRecording(page, originalRecording.id);

  expect(decodedOriginal.decodedDurationMs).toBeGreaterThan(600);
  expect(decodedOriginal.rmsAmplitude).toBeGreaterThan(0.01);
  expect(decodedOriginal.peakAmplitude).toBeGreaterThan(0.02);
  expect(decodedOriginal.estimatedFrequencyHz ?? 0).toBeGreaterThan(390);
  expect(decodedOriginal.estimatedFrequencyHz ?? 0).toBeLessThan(490);
  expect(Math.abs(originalRecording.durationMs - decodedOriginal.decodedDurationMs)).toBeLessThanOrEqual(1);

  const waveformBeforePlay = await getWaveformState(page);

  expect(waveformBeforePlay.peakCount).toBeGreaterThan(12);
  expect(waveformBeforePlay.source).toBe("trusted-peaks");
  expect(waveformBeforePlay.heights.some((height) => height > 8)).toBe(true);

  await page.getByRole("button", { name: "Play latest sheet recording" }).click();
  await page.waitForFunction((recordingId) => {
    const e2eWindow = window as Window & {
      __sheetRecordingPlaybackEvents?: { recordingId: string; state: string }[];
    };

    return e2eWindow.__sheetRecordingPlaybackEvents?.some(
      (event) => event.recordingId === recordingId && event.state === "playing"
    );
  }, originalRecording.id);
  await page.getByRole("button", { name: "Pause latest sheet recording" }).click();
  expect(await getWaveformState(page)).toEqual(waveformBeforePlay);

  for (let index = 0; index < 3; index += 1) {
    await page.waitForTimeout(150);
    expect(await getWaveformState(page)).toEqual(waveformBeforePlay);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await getWaveformState(page)).toEqual(waveformBeforePlay);
  await page.reload();
  await expect(page.getByTestId("sheet-latest-recording")).toBeVisible();
  expect(await getWaveformState(page)).toEqual(waveformBeforePlay);

  await page.goto("/recordings");
  await page.getByRole("textbox", { name: "Search recordings" }).fill("Recording Contract Sheet");
  await page.getByLabel("Type filter").selectOption("sheet");
  await expect(page.getByTestId(`recording-row-${originalRecording.id}`)).toBeVisible();
  await page.getByTestId(`recording-row-${originalRecording.id}`).click();
  await page.getByRole("link", { name: "Practice Again" }).click();
  await expect(page).toHaveURL(new RegExp(`/sheet-practice\\?recordingId=${originalRecording.id}&sheetId=${sheetId}`));
  await expect(page.getByRole("heading", { name: "Recording Contract Sheet" })).toBeVisible();

  await page.getByRole("button", { name: "Start recording" }).click();
  await expect(page.getByTestId("sheet-recording-state")).toContainText("active");
  await page.waitForTimeout(700);
  await page.getByRole("button", { name: "Stop recording" }).click();
  await expect(page.getByText("Recording saved.")).toBeVisible();

  sheetRecordings = await getSheetRecordings(page, sheetId);
  expect(sheetRecordings).toHaveLength(2);

  const originalAfterPracticeAgain = sheetRecordings.find((recording) => recording.id === originalRecording.id);
  const continuedRecording = sheetRecordings.find((recording) => recording.id !== originalRecording.id);

  expect(originalAfterPracticeAgain).toEqual(originalSnapshot);
  expect(continuedRecording?.sessionId).toBeTruthy();
  expect(continuedRecording?.sessionId).not.toBe(originalRecording.sessionId);
  expect(continuedRecording?.audioDataUrl).toMatch(/^data:audio\//);

  const decodedContinued = await decodeRecording(page, continuedRecording?.id ?? "");

  expect(decodedContinued.decodedDurationMs).toBeGreaterThan(500);
  expect(Math.abs((continuedRecording?.durationMs ?? 0) - decodedContinued.decodedDurationMs)).toBeLessThanOrEqual(1);

  await page.getByRole("button", { name: "Start metronome" }).click();
  await expect(page.getByTestId("sheet-metronome-state")).toContainText("Playing");
  await page.getByRole("button", { name: "Start recording" }).click();
  await expect(page.getByTestId("sheet-recording-state")).toContainText("active");
  await page.getByRole("button", { name: "Stop metronome" }).click();
  await expect(page.getByTestId("sheet-recording-state")).toContainText("active");
  await expect(page.getByTestId("sheet-metronome-state")).toContainText("Stopped");
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Stop recording" }).click();
  await expect(page.getByText("Recording saved.")).toBeVisible();

  await page.getByRole("button", { name: "Start metronome" }).click();
  await page.getByRole("button", { name: "Start recording" }).click();
  await expect(page.getByTestId("sheet-metronome-state")).toContainText("Playing");
  await expect(page.getByTestId("sheet-recording-state")).toContainText("active");
  await page.waitForTimeout(700);
  await page.getByRole("button", { name: "Stop recording" }).click();
  await expect(page.getByText("Recording saved; metronome is still playing.")).toBeVisible();
  await expect(page.getByTestId("sheet-metronome-state")).toContainText("Playing");
  await page.getByRole("button", { name: "Stop metronome" }).click();

  expect(consoleErrors).toEqual([]);
});

test("sheet recording surfaces microphone denial and bad artifact states", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: async () => {
          throw new DOMException("Permission denied", "NotAllowedError");
        }
      }
    });
  });

  await clearState(page);
  const { link, sheetId } = await importSheet(page, "Bad Artifact Contract Sheet");

  await link.click();
  await page.getByRole("button", { name: "Start recording" }).click();
  await expect(page.getByText("Microphone access was denied. Enable microphone permission to record a take.")).toBeVisible();
  await expect(page.getByTestId("sheet-recording-state")).toContainText("stopped");

  await page.evaluate(
    ({ storageKey, id }: { storageKey: string; id: string }) => {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          sessions: [{ id: "session-bad-sheet", sourceType: "sheet", sheetId: id }],
          recordings: [
            {
              id: "bad-sheet-recording",
              type: "sheet",
              origin: "user",
              name: "Bad sheet take",
              sessionId: "session-bad-sheet",
              sheetId: id,
              sheetName: "Bad Artifact Contract Sheet",
              createdAt: "2026-06-22T06:30:00.000Z",
              durationMs: 900,
              sizeBytes: 12,
              mimeType: "audio/wav",
              audioDataUrl: "data:audio/wav;base64,bm90LWF1ZGlv",
              trustedPeaks: [0.4, 0.8],
              settings: {
                bpm: 88,
                timeSignature: "3/4"
              }
            }
          ],
          errorMarkers: []
        })
      );
    },
    { storageKey: recordingHistoryStorageKey, id: sheetId }
  );

  await page.goto(`/sheet-practice/${sheetId}`);
  await expect(page.getByTestId("sheet-latest-recording")).toBeVisible();
  await expect(page.getByTestId("sheet-recording-artifact-error")).toContainText("cannot be decoded");
  await expect(page.getByRole("button", { name: "Play latest sheet recording" })).toBeDisabled();

  await page.evaluate(
    ({ storageKey, id }: { storageKey: string; id: string }) => {
      const sampleRate = 8_000;
      const durationSeconds = 1;
      const sampleCount = sampleRate * durationSeconds;
      const dataSize = sampleCount * 2;
      const buffer = new ArrayBuffer(44 + dataSize);
      const view = new DataView(buffer);

      function writeString(offset: number, value: string) {
        for (let index = 0; index < value.length; index += 1) {
          view.setUint8(offset + index, value.charCodeAt(index));
        }
      }

      writeString(0, "RIFF");
      view.setUint32(4, 36 + dataSize, true);
      writeString(8, "WAVE");
      writeString(12, "fmt ");
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, 1, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * 2, true);
      view.setUint16(32, 2, true);
      view.setUint16(34, 16, true);
      writeString(36, "data");
      view.setUint32(40, dataSize, true);

      for (let index = 0; index < sampleCount; index += 1) {
        const sample = Math.sin((2 * Math.PI * 330 * index) / sampleRate) * 0.35;

        view.setInt16(44 + index * 2, Math.max(-1, Math.min(1, sample)) * 0x7fff, true);
      }

      let binary = "";
      const bytes = new Uint8Array(buffer);

      for (let index = 0; index < bytes.length; index += 1) {
        binary += String.fromCharCode(bytes[index]);
      }

      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          sessions: [{ id: "session-mismatch-sheet", sourceType: "sheet", sheetId: id }],
          recordings: [
            {
              id: "mismatch-sheet-recording",
              type: "sheet",
              origin: "user",
              name: "Mismatch sheet take",
              sessionId: "session-mismatch-sheet",
              sheetId: id,
              sheetName: "Bad Artifact Contract Sheet",
              createdAt: "2026-06-22T06:35:00.000Z",
              durationMs: 4_000,
              sizeBytes: bytes.length,
              mimeType: "audio/wav",
              audioDataUrl: `data:audio/wav;base64,${window.btoa(binary)}`,
              trustedPeaks: [0.2, 0.7, 0.4],
              settings: {
                bpm: 88,
                timeSignature: "3/4"
              }
            }
          ],
          errorMarkers: []
        })
      );
    },
    { storageKey: recordingHistoryStorageKey, id: sheetId }
  );

  await page.goto(`/sheet-practice/${sheetId}`);
  await expect(page.getByTestId("sheet-latest-recording")).toBeVisible();
  await expect(page.getByTestId("sheet-recording-duration-warning")).toContainText(
    "differs from saved metadata"
  );
});
