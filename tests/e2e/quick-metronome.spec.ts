import { expect, test } from "@playwright/test";

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
  const bpmInput = page.getByRole("spinbutton", { name: "BPM" });

  await page.getByRole("button", { name: "Increase BPM" }).click();
  await expect(bpmInput).toHaveValue("97");
  await page.getByRole("button", { name: "Decrease BPM" }).click();
  await expect(bpmInput).toHaveValue("96");
  await bpmInput.fill("120");
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
  await expect(bpmInput).toHaveValue(/11[5-9]|12[0-5]/);

  await page.getByLabel("Countdown").selectOption("0");

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
  await expect(page.getByTestId("latest-recording")).toBeVisible();
  await expect(page.getByText("quick").first()).toBeVisible();
  await expect(page.getByText("No sheet linked.")).toBeVisible();

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
  await expect(page.getByTestId("latest-recording")).toBeVisible();
  await expect(page.getByText("No sheet linked.")).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("latest-recording")).toBeVisible();
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
