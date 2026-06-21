import { expect, test } from "@playwright/test";

test("recordings review lists, filters, plays, continues, deletes, and handles bad audio", async ({
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
    if (!window.sessionStorage.getItem("recordings-review-e2e-ready")) {
      window.localStorage.clear();
      window.sessionStorage.setItem("recordings-review-e2e-ready", "true");
    }
    const e2eWindow = window as Window & {
      __recordingsPlaybackEvents?: unknown[];
    };

    e2eWindow.__recordingsPlaybackEvents = [];
    window.addEventListener("recordings-review:playback", (event) => {
      e2eWindow.__recordingsPlaybackEvents?.push((event as CustomEvent).detail);
    });

    const originalPlay = window.HTMLMediaElement.prototype.play;

    window.HTMLMediaElement.prototype.play = function play() {
      return originalPlay.call(this).catch(() => Promise.resolve());
    };
  });

  await page.goto("/recordings");
  await expect(page.getByRole("heading", { name: "Recordings" })).toBeVisible();
  await expect(page.getByTestId("recordings-empty-state")).toBeVisible();

  await page.evaluate(() => {
    function createWavDataUrl(frequencyHz: number, durationSeconds: number) {
      const sampleRate = 8_000;
      const sampleCount = Math.floor(sampleRate * durationSeconds);
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
        const sample = Math.sin((2 * Math.PI * frequencyHz * index) / sampleRate) * 0.35;
        view.setInt16(44 + index * 2, Math.max(-1, Math.min(1, sample)) * 0x7fff, true);
      }

      let binary = "";
      const bytes = new Uint8Array(buffer);

      for (let index = 0; index < bytes.length; index += 1) {
        binary += String.fromCharCode(bytes[index]);
      }

      return {
        dataUrl: `data:audio/wav;base64,${window.btoa(binary)}`,
        sizeBytes: bytes.length,
        durationMs: durationSeconds * 1_000
      };
    }

    const quickArtifact = createWavDataUrl(440, 1);
    const sheetArtifact = createWavDataUrl(330, 1.2);

    window.localStorage.setItem(
      "metronome-practice:v0:quick-recordings",
      JSON.stringify({
        sessions: [
          { id: "session-quick-1", sourceType: "quick" },
          { id: "session-sheet-1", sourceType: "sheet" }
        ],
        recordings: [
          {
            id: "quick-alpha",
            type: "quick",
            origin: "user",
            name: "Alpha quick take",
            sessionId: "session-quick-1",
            sheetId: null,
            createdAt: "2026-06-21T09:00:00.000Z",
            durationMs: quickArtifact.durationMs,
            sizeBytes: quickArtifact.sizeBytes,
            mimeType: "audio/wav",
            audioDataUrl: quickArtifact.dataUrl,
            artifactAnalysis: {
              decodedDurationMs: quickArtifact.durationMs,
              sampleRate: 8_000,
              peakAmplitude: 0.35,
              rmsAmplitude: 0.24,
              estimatedFrequencyHz: 440,
              isSilent: false
            },
            settings: {
              bpm: 120,
              timeSignature: "4/4"
            }
          },
          {
            id: "sheet-beta",
            type: "sheet",
            origin: "user",
            name: "Beta sheet take",
            sessionId: "session-sheet-1",
            sheetId: "sheet-42",
            sheetName: "Moonlight Etude",
            createdAt: "2026-06-21T10:00:00.000Z",
            durationMs: sheetArtifact.durationMs,
            sizeBytes: sheetArtifact.sizeBytes,
            mimeType: "audio/wav",
            audioDataUrl: sheetArtifact.dataUrl,
            artifactAnalysis: {
              decodedDurationMs: sheetArtifact.durationMs,
              sampleRate: 8_000,
              peakAmplitude: 0.35,
              rmsAmplitude: 0.24,
              estimatedFrequencyHz: 330,
              isSilent: false
            },
            trustedPeaks: [0.1, 0.4, 0.9, 0.45, 0.2],
            settings: {
              bpm: 96,
              timeSignature: "3/4"
            }
          },
          {
            id: "bad-gamma",
            type: "quick",
            origin: "user",
            name: "Broken audio take",
            sessionId: "session-quick-1",
            sheetId: null,
            createdAt: "2026-06-21T11:00:00.000Z",
            durationMs: 900,
            sizeBytes: 12,
            mimeType: "audio/wav",
            audioDataUrl: "data:audio/wav;base64,bm90LWF1ZGlv",
            settings: {
              bpm: 72,
              timeSignature: "4/4"
            }
          }
        ],
        errorMarkers: [
          {
            id: "marker-late",
            recordingId: "quick-alpha",
            timestampMs: 1_500,
            note: "Late accent"
          },
          {
            id: "marker-early",
            recordingId: "quick-alpha",
            timestampMs: 500,
            note: "Early entrance"
          }
        ]
      })
    );
  });

  await page.reload();
  await expect(page.getByTestId("recordings-list")).toBeVisible();
  await expect(page.getByText("Alpha quick take")).toBeVisible();
  await expect(page.getByText("Moonlight Etude")).toBeVisible();

  await page.getByRole("textbox", { name: "Search recordings" }).fill("Alpha");
  await expect(page.getByTestId("recording-row-quick-alpha")).toBeVisible();
  await expect(page.getByText("Moonlight Etude")).toBeHidden();
  await page.getByLabel("Type filter").selectOption("quick");
  await expect(page.getByTestId("recording-row-quick-alpha")).toBeVisible();

  await page.getByTestId("recording-row-quick-alpha").click();
  await expect(page.getByTestId("recording-details")).toBeVisible();
  await expect(page.getByTestId("recording-details").getByText("120")).toBeVisible();
  await expect(page.getByTestId("recording-details").getByText("4/4")).toBeVisible();
  await expect(page.getByTestId("derived-waveform")).toHaveAttribute("data-waveform-source", "decoded-audio");
  await expect(page.getByTestId("derived-waveform")).toHaveAttribute("data-peak-count", "48");
  await expect(page.getByTestId("error-marker-list")).toContainText("0:01");
  await expect(page.getByTestId("error-marker-list")).toContainText("Early entrance");
  await expect(page.getByTestId("error-marker-list")).toContainText("Late accent");

  await page.getByRole("button", { name: "Play Recording" }).click();
  await expect(page.getByTestId("recording-playback-status")).toBeVisible();
  await page.waitForFunction(() => {
    const e2eWindow = window as Window & {
      __recordingsPlaybackEvents?: { recordingId: string; state: string }[];
    };

    return e2eWindow.__recordingsPlaybackEvents?.some(
      (event) => event.recordingId === "quick-alpha" && event.state === "playing"
    );
  });
  await page.getByRole("button", { name: "Pause Recording" }).click();
  await expect(page.getByTestId("recording-playback-status")).toBeHidden();

  await page.getByRole("link", { name: "Continue Practice" }).click();
  await expect(page).toHaveURL(/\/quick-metronome\?recordingId=quick-alpha/);

  await page.goto("/recordings");
  await page.getByRole("textbox", { name: "Search recordings" }).fill("");
  await page.getByLabel("Type filter").selectOption("sheet");
  await expect(page.getByTestId("recording-row-sheet-beta")).toBeVisible();
  await expect(page.getByText("Alpha quick take")).toBeHidden();
  await page.getByTestId("recording-row-sheet-beta").click();
  await expect(page.getByTestId("recording-details").getByText("Moonlight Etude")).toBeVisible();
  await expect(page.getByTestId("derived-waveform")).toHaveAttribute("data-waveform-source", "trusted-peaks");
  await page.getByRole("link", { name: "Continue Practice" }).click();
  await expect(page).toHaveURL(/\/sheet-practice\?recordingId=sheet-beta&sheetId=sheet-42/);

  await page.goto("/recordings");
  await page.getByRole("textbox", { name: "Search recordings" }).fill("Alpha");
  await page.getByLabel("Type filter").selectOption("all");
  await page.getByTestId("recording-row-quick-alpha").click();
  await page.getByRole("button", { name: "Delete Recording" }).click();
  await page.getByRole("button", { name: "Confirm Delete" }).click();
  await expect(page.getByText("Alpha quick take")).toBeHidden();

  await page.reload();
  await expect(page.getByText("Alpha quick take")).toBeHidden();
  const deletedEvidence = await page.evaluate(() => {
    const rawValue = window.localStorage.getItem("metronome-practice:v0:quick-recordings");
    const parsed = rawValue ? JSON.parse(rawValue) : null;

    return {
      hasDeletedRecording: parsed.recordings.some((recording: { id: string }) => recording.id === "quick-alpha"),
      hasDeletedMarker: parsed.errorMarkers.some(
        (marker: { recordingId: string }) => marker.recordingId === "quick-alpha"
      ),
      deletedArtifact:
        parsed.recordings.find((recording: { id: string }) => recording.id === "quick-alpha")
          ?.audioDataUrl ?? null
    };
  });

  expect(deletedEvidence).toEqual({
    hasDeletedRecording: false,
    hasDeletedMarker: false,
    deletedArtifact: null
  });

  await page.getByRole("textbox", { name: "Search recordings" }).fill("Broken");
  await page.getByTestId("recording-row-bad-gamma").click();
  await expect(page.getByTestId("recording-artifact-error")).toContainText("cannot be decoded");
  await expect(page.getByRole("button", { name: "Play Recording" })).toBeDisabled();

  expect(consoleErrors).toEqual([]);
});
