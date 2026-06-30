import { expect, test, type Page } from "@playwright/test";
import {
  createWavDataUrl,
  decodeRecordingHistoryAudio,
  installSyntheticMicrophone
} from "./fixtures/audio";
import { importTestSheet } from "./fixtures/sheets";
import {
  clearSheetLibraryTestState,
  PRACTICE_SESSION_DB_NAME,
  readRecordingHistory,
  seedRecordingHistory,
  SHEET_LIBRARY_DB_NAME
} from "./fixtures/storage";
import {
  createE2ESheetRecording,
  seedE2ERecordingArtifacts
} from "./fixtures/recordings-review";

type SavedRecordingEvidence = {
  id: string;
  type: string;
  sessionId: string;
  sheetId: string;
  durationMs: number;
  sizeBytes: number;
  mimeType: string;
  artifactRef?: {
    kind: "indexeddb";
    artifactId: string;
    storageVersion: 1;
  } | null;
  audioDataUrl?: string | null;
  trustedPeaks: number[];
  artifactAnalysis: {
    decodedDurationMs: number;
    rmsAmplitude: number;
    peakAmplitude: number;
    estimatedFrequencyHz: number | null;
    isSilent: boolean;
  } | null;
};

type SimpleWaveformState = {
  peakCount: number;
  source: string | null;
  heights: number[];
};

async function clearState(page: Page) {
  await clearSheetLibraryTestState(page, [SHEET_LIBRARY_DB_NAME, PRACTICE_SESSION_DB_NAME]);
}

async function getSavedRecordings(page: Page) {
  const parsed = await readRecordingHistory(page);

  return Array.isArray(parsed.recordings) ? parsed.recordings : [];
}

async function getSheetRecordings(page: Page, sheetId: string) {
  const recordings = await getSavedRecordings(page);

  return recordings.filter(
    (recording: { type: string; sheetId: string }) =>
      recording.type === "sheet" && recording.sheetId === sheetId
  ) as SavedRecordingEvidence[];
}

async function markerNotesFitTheirContainers(page: Page, testId: string) {
  return page
    .getByTestId(testId)
    .evaluateAll((elements) =>
      elements.every(
        (element) => element.scrollWidth <= element.clientWidth + 1
      )
    );
}

async function readWaveformState(
  page: Page,
  testId: string
): Promise<SimpleWaveformState> {
  const waveform = page.getByTestId(testId);

  await expect(waveform).toBeVisible();

  return waveform.evaluate((element) => ({
    peakCount: Number(element.getAttribute("data-peak-count")),
    source: element.getAttribute("data-waveform-source"),
    heights: Array.from(element.querySelectorAll("span")).map((span) =>
      Number.parseFloat((span as HTMLElement).style.height)
    )
  }));
}

async function seedSheetMarkerRecordings({
  page,
  sheetId,
  latestRecordingId = "marker-sheet-a",
  includeSecondRecording = false
}: {
  page: Page;
  sheetId: string;
  latestRecordingId?: "marker-sheet-a" | "marker-sheet-b";
  includeSecondRecording?: boolean;
}) {
  const markerAArtifact = await createWavDataUrl(page, 330, 2);
  const markerBArtifact = await createWavDataUrl(page, 440, 2);
  const existing = await readRecordingHistory(page);
  const recordings = [
    createE2ESheetRecording({
      id: "marker-sheet-a",
      origin: "user",
      name: "Marker sheet take A",
      sessionId: "session-marker-a",
      sheetId,
      sheetName: "Marker Contract Sheet",
      artifact: markerAArtifact,
      createdAt:
        latestRecordingId === "marker-sheet-a"
          ? "2026-06-22T08:10:00.000Z"
          : "2026-06-22T08:00:00.000Z",
      trustedPeaks: [0.1, 0.6, 0.9, 0.4, 0.2],
      settings: {
        bpm: 88,
        timeSignature: "3/4"
      }
    }),
    ...(includeSecondRecording
      ? [
          createE2ESheetRecording({
            id: "marker-sheet-b",
            origin: "user",
            name: "Marker sheet take B",
            sessionId: "session-marker-b",
            sheetId,
            sheetName: "Marker Contract Sheet",
            artifact: markerBArtifact,
            createdAt:
              latestRecordingId === "marker-sheet-b"
                ? "2026-06-22T08:20:00.000Z"
                : "2026-06-22T07:50:00.000Z",
            trustedPeaks: [0.2, 0.7, 0.5, 0.3, 0.1],
            settings: {
              bpm: 92,
              timeSignature: "4/4"
            }
          })
        ]
      : [])
  ];

  await seedRecordingHistory(page, {
    sessions: [
      { id: "session-marker-a", sourceType: "sheet", sheetId },
      ...(includeSecondRecording
        ? [{ id: "session-marker-b", sourceType: "sheet", sheetId }]
        : [])
    ],
    recordings,
    errorMarkers: Array.isArray(existing.errorMarkers)
      ? existing.errorMarkers
      : []
  });
  await seedE2ERecordingArtifacts(page, recordings);
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
    const e2eWindow = window as Window & {
      __sheetRecordingPlaybackEvents?: unknown[];
      __sheetRecordingSeekEvents?: {
        recordingId: string;
        timestampMs: number;
        currentTimeMs: number;
      }[];
    };

    e2eWindow.__sheetRecordingPlaybackEvents = [];
    e2eWindow.__sheetRecordingSeekEvents = [];
    window.addEventListener("recordings-review:playback", (event) => {
      e2eWindow.__sheetRecordingPlaybackEvents?.push(
        (event as CustomEvent).detail
      );
    });
    window.addEventListener("recordings-review:seek", (event) => {
      e2eWindow.__sheetRecordingSeekEvents?.push((event as CustomEvent).detail);
    });
  });

  await page.setViewportSize({ width: 1280, height: 820 });
  await clearState(page);
  const { link, sheetId } = await importTestSheet(page, {
    name: "Recording Contract Sheet",
    bpm: 88,
    timeSignature: "3/4"
  });

  await link.click();
  await expect(
    page.getByRole("heading", { name: "Recording Contract Sheet" })
  ).toBeVisible();
  await expect(page.getByTestId("sheet-recording-state")).toContainText(
    "stopped"
  );
  await page.getByRole("button", { name: "Start recording" }).click();
  await expect(page.getByText("Recording without metronome.")).toBeVisible();
  await expect(page.getByTestId("sheet-recording-state")).toContainText(
    "active"
  );
  await page.getByRole("link", { name: "Sheet Library" }).click();
  await expect(page).toHaveURL(new RegExp(`/sheet-practice/${sheetId}$`));
  await expect(
    page.getByTestId("active-recording-navigation-guard")
  ).toContainText("Stop and save the recording before changing pages.");
  await expect(page.getByTestId("sheet-recording-state")).toContainText(
    "active"
  );
  await page.waitForTimeout(850);
  await page.getByRole("button", { name: "Stop recording" }).click();
  await expect(page.getByText("Recording saved.")).toBeVisible();
  await expect(page.getByTestId("sheet-latest-recording")).toBeVisible();
  await expect(page.getByTestId("sheet-waveform-source")).toContainText(
    "trusted peaks"
  );

  let sheetRecordings = await getSheetRecordings(page, sheetId);

  expect(sheetRecordings).toHaveLength(1);
  const originalRecording = sheetRecordings[0];
  const originalSnapshot = { ...originalRecording };

  expect(originalRecording).toMatchObject({
    type: "sheet",
    sheetId
  });
  expect(originalRecording.sessionId).toBeTruthy();
  expect(originalRecording.artifactRef).toMatchObject({
    kind: "indexeddb",
    artifactId: originalRecording.id,
    storageVersion: 1
  });
  expect(originalRecording.audioDataUrl ?? null).toBeNull();
  expect(originalRecording.sizeBytes).toBeGreaterThan(0);
  expect(originalRecording.trustedPeaks.length).toBeGreaterThan(12);
  expect(
    originalRecording.trustedPeaks.every((peak) => Number.isFinite(peak))
  ).toBe(true);
  expect(originalRecording.trustedPeaks.some((peak) => peak > 0)).toBe(true);

  const decodedOriginal = await decodeRecordingHistoryAudio(
    page,
    originalRecording.id
  );

  expect(decodedOriginal.decodedDurationMs).toBeGreaterThan(600);
  expect(decodedOriginal.rmsAmplitude).toBeGreaterThan(0.01);
  expect(decodedOriginal.peakAmplitude).toBeGreaterThan(0.02);
  expect(decodedOriginal.estimatedFrequencyHz ?? 0).toBeGreaterThan(390);
  expect(decodedOriginal.estimatedFrequencyHz ?? 0).toBeLessThan(490);
  expect(
    Math.abs(originalRecording.durationMs - decodedOriginal.decodedDurationMs)
  ).toBeLessThanOrEqual(1);

  const waveformBeforePlay = await readWaveformState(
    page,
    "sheet-derived-waveform"
  );

  expect(waveformBeforePlay.peakCount).toBeGreaterThan(12);
  expect(waveformBeforePlay.source).toBe("trusted-peaks");
  expect(waveformBeforePlay.heights.some((height) => height > 8)).toBe(true);

  const sheetWaveformAdapter = page.getByTestId("sheet-waveform-adapter");

  await expect(sheetWaveformAdapter).toHaveAttribute(
    "data-playback-ready",
    "true"
  );
  const sheetSeekSurface = page.getByTestId(
    "sheet-waveform-adapter-seek-surface"
  );
  const sheetWaveformBox = await sheetSeekSurface.boundingBox();

  expect(sheetWaveformBox).not.toBeNull();
  await sheetSeekSurface.click({
    position: {
      x: (sheetWaveformBox?.width ?? 0) * 0.6,
      y: (sheetWaveformBox?.height ?? 0) / 2
    }
  });
  await expect
    .poll(async () =>
      Number(await sheetWaveformAdapter.getAttribute("data-current-time-ms"))
    )
    .toBeGreaterThan(originalRecording.durationMs * 0.45);
  await expect
    .poll(async () =>
      Number(await sheetWaveformAdapter.getAttribute("data-current-time-ms"))
    )
    .toBeLessThan(originalRecording.durationMs * 0.75);

  await page
    .getByRole("button", { name: "Play latest sheet recording" })
    .click();
  await page.waitForFunction((recordingId) => {
    const e2eWindow = window as Window & {
      __sheetRecordingPlaybackEvents?: { recordingId: string; state: string }[];
    };

    return e2eWindow.__sheetRecordingPlaybackEvents?.some(
      (event) => event.recordingId === recordingId && event.state === "playing"
    );
  }, originalRecording.id);
  await page
    .getByRole("button", { name: "Pause latest sheet recording" })
    .click();
  expect(await readWaveformState(page, "sheet-derived-waveform")).toEqual(
    waveformBeforePlay
  );

  for (let index = 0; index < 3; index += 1) {
    await page.waitForTimeout(150);
    expect(await readWaveformState(page, "sheet-derived-waveform")).toEqual(
      waveformBeforePlay
    );
  }

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await readWaveformState(page, "sheet-derived-waveform")).toEqual(
    waveformBeforePlay
  );
  await page.reload();
  await expect(page.getByTestId("sheet-latest-recording")).toBeVisible();
  expect(await readWaveformState(page, "sheet-derived-waveform")).toEqual(
    waveformBeforePlay
  );

  await page.goto("/recordings");
  await page
    .getByRole("textbox", { name: "Search recordings" })
    .fill("Recording Contract Sheet");
  await page.getByLabel("Type filter").selectOption("sheet");
  await expect(
    page.getByTestId(`recording-row-${originalRecording.id}`)
  ).toBeVisible();
  await page.getByTestId(`recording-row-${originalRecording.id}`).click();
  await page.getByRole("link", { name: "Practice Again" }).click();
  await expect(page).toHaveURL(
    new RegExp(
      `/sheet-practice\\?recordingId=${originalRecording.id}&sheetId=${sheetId}`
    )
  );
  await expect(
    page.getByRole("heading", { name: "Recording Contract Sheet" })
  ).toBeVisible();

  await page.getByRole("button", { name: "Start recording" }).click();
  await expect(page.getByTestId("sheet-recording-state")).toContainText(
    "active"
  );
  await page.waitForTimeout(700);
  await page.getByRole("button", { name: "Stop recording" }).click();
  await expect(page.getByText("Recording saved.")).toBeVisible();

  sheetRecordings = await getSheetRecordings(page, sheetId);
  expect(sheetRecordings).toHaveLength(2);

  const originalAfterPracticeAgain = sheetRecordings.find(
    (recording) => recording.id === originalRecording.id
  );
  const continuedRecording = sheetRecordings.find(
    (recording) => recording.id !== originalRecording.id
  );

  expect(originalAfterPracticeAgain).toEqual(originalSnapshot);
  expect(continuedRecording?.sessionId).toBeTruthy();
  expect(continuedRecording?.sessionId).not.toBe(originalRecording.sessionId);
  expect(continuedRecording?.artifactRef).toMatchObject({
    kind: "indexeddb",
    artifactId: continuedRecording?.id,
    storageVersion: 1
  });
  expect(continuedRecording?.audioDataUrl ?? null).toBeNull();

  const decodedContinued = await decodeRecordingHistoryAudio(
    page,
    continuedRecording?.id ?? ""
  );

  expect(decodedContinued.decodedDurationMs).toBeGreaterThan(500);
  expect(
    Math.abs(
      (continuedRecording?.durationMs ?? 0) - decodedContinued.decodedDurationMs
    )
  ).toBeLessThanOrEqual(1);

  await page.getByRole("button", { name: "Start metronome" }).click();
  await expect(page.getByTestId("sheet-metronome-state")).toContainText(
    "Playing"
  );
  await page.getByRole("button", { name: "Start recording" }).click();
  await expect(page.getByTestId("sheet-recording-state")).toContainText(
    "active"
  );
  await page.getByRole("button", { name: "Stop metronome" }).click();
  await expect(page.getByTestId("sheet-recording-state")).toContainText(
    "active"
  );
  await expect(page.getByTestId("sheet-metronome-state")).toContainText(
    "Stopped"
  );
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Stop recording" }).click();
  await expect(page.getByText("Recording saved.")).toBeVisible();

  await page.getByRole("button", { name: "Start metronome" }).click();
  await page.getByRole("button", { name: "Start recording" }).click();
  await expect(page.getByTestId("sheet-metronome-state")).toContainText(
    "Playing"
  );
  await expect(page.getByTestId("sheet-recording-state")).toContainText(
    "active"
  );
  await page.waitForTimeout(700);
  await page.getByRole("button", { name: "Stop recording" }).click();
  await expect(
    page.getByText("Recording saved; metronome is still playing.")
  ).toBeVisible();
  await expect(page.getByTestId("sheet-metronome-state")).toContainText(
    "Playing"
  );
  await page.getByRole("button", { name: "Stop metronome" }).click();

  expect(consoleErrors).toEqual([]);
});

test("sheet practice creates recording-scoped error markers and seeks playback to marker time", async ({
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
    const e2eWindow = window as Window & {
      __sheetMarkerSeekEvents?: {
        recordingId: string;
        timestampMs: number;
        currentTimeMs: number;
      }[];
    };

    e2eWindow.__sheetMarkerSeekEvents = [];
    window.addEventListener("recordings-review:seek", (event) => {
      e2eWindow.__sheetMarkerSeekEvents?.push((event as CustomEvent).detail);
    });
  });

  await page.setViewportSize({ width: 1280, height: 820 });
  await clearState(page);
  const { link, sheetId } = await importTestSheet(page, {
    name: "Marker Contract Sheet",
    bpm: 88,
    timeSignature: "3/4"
  });
  const longUnbrokenNote = "L".repeat(160);

  await link.click();
  await expect(page.getByTestId("sheet-latest-recording-empty")).toBeVisible();
  await expect(page.getByTestId("sheet-error-marker-empty")).toContainText(
    "Save a sheet recording before adding manual error markers."
  );
  await expect(page.getByRole("button", { name: "Mark Error" })).toHaveCount(0);

  await seedSheetMarkerRecordings({ page, sheetId });
  await page.goto(`/sheet-practice/${sheetId}`);
  await expect(page.getByTestId("sheet-latest-recording")).toBeVisible();
  await expect(page.getByTestId("sheet-error-marker-scope")).toContainText(
    "marker-sheet-a"
  );
  await expect(page.getByTestId("sheet-error-marker-list-empty")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Use playback time" })
  ).toBeEnabled();

  await page
    .getByRole("spinbutton", { name: "Marker time seconds" })
    .fill("1.2");
  await page
    .getByRole("textbox", { name: "Marker note" })
    .fill("  Missed left hand  ");
  await page.getByRole("button", { name: "Mark Error" }).click();
  await expect(page.getByTestId("sheet-error-marker-list")).toContainText(
    "0:01"
  );
  await expect(page.getByTestId("sheet-error-marker-list")).toContainText(
    "Missed left hand"
  );

  await page.getByRole("button", { name: /Seek to marker 0:01/ }).click();
  await page.waitForFunction(() => {
    const e2eWindow = window as Window & {
      __sheetMarkerSeekEvents?: {
        recordingId: string;
        timestampMs: number;
        currentTimeMs: number;
      }[];
    };

    return e2eWindow.__sheetMarkerSeekEvents?.some(
      (event) =>
        event.recordingId === "marker-sheet-a" &&
        event.timestampMs === 1_200 &&
        Math.abs(event.currentTimeMs - 1_200) <= 80
    );
  });
  await expect(page.getByTestId("sheet-error-marker-message")).toContainText(
    "Playback moved to 0:01."
  );

  await page
    .getByRole("spinbutton", { name: "Marker time seconds" })
    .fill("0.4");
  await page
    .getByRole("textbox", { name: "Marker note" })
    .fill("Early entrance");
  await page.getByRole("button", { name: "Mark Error" }).click();
  await page
    .getByRole("spinbutton", { name: "Marker time seconds" })
    .fill("1.6");
  await page
    .getByRole("textbox", { name: "Marker note" })
    .fill(longUnbrokenNote);
  await page.getByRole("button", { name: "Mark Error" }).click();

  await expect
    .poll(async () =>
      page
        .getByTestId("sheet-error-marker-list")
        .locator("li")
        .allTextContents()
    )
    .toEqual([
      expect.stringContaining("Early entrance"),
      expect.stringContaining("Missed left hand"),
      expect.stringContaining(longUnbrokenNote)
    ]);

  await page.reload();
  await expect(page.getByTestId("sheet-error-marker-list")).toContainText(
    "Early entrance"
  );
  await expect(page.getByTestId("sheet-error-marker-list")).toContainText(
    "Missed left hand"
  );
  await expect(page.getByTestId("sheet-error-marker-list")).toContainText(
    longUnbrokenNote
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId("sheet-error-marker-panel")).toBeVisible();
  await expect(page.getByTestId("sheet-error-marker-list")).toContainText(
    "Missed left hand"
  );
  await expect
    .poll(async () =>
      markerNotesFitTheirContainers(page, "sheet-error-marker-note")
    )
    .toBe(true);
  await page.setViewportSize({ width: 1280, height: 820 });
  await expect(page.getByRole("button", { name: "Mark Error" })).toBeVisible();

  await page.goto("/recordings");
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("textbox", { name: "Search recordings" })
    .fill("Marker sheet take A");
  await page.getByLabel("Type filter").selectOption("sheet");
  await page.getByTestId("recording-row-marker-sheet-a").click();
  await expect(page.getByTestId("error-marker-list")).toContainText(
    longUnbrokenNote
  );
  await expect
    .poll(async () => markerNotesFitTheirContainers(page, "error-marker-note"))
    .toBe(true);

  await page.goto(`/sheet-practice/${sheetId}`);
  await page.setViewportSize({ width: 1280, height: 820 });
  await expect(page.getByTestId("sheet-error-marker-list")).toContainText(
    "Early entrance"
  );

  await page.getByRole("button", { name: /Delete marker 0:00/ }).click();
  await expect(page.getByTestId("sheet-error-marker-list")).not.toContainText(
    "Early entrance"
  );
  await page.reload();
  await expect(page.getByTestId("sheet-error-marker-list")).not.toContainText(
    "Early entrance"
  );
  await expect(page.getByTestId("sheet-error-marker-list")).toContainText(
    "Missed left hand"
  );

  await seedSheetMarkerRecordings({
    page,
    sheetId,
    latestRecordingId: "marker-sheet-b",
    includeSecondRecording: true
  });
  await page.reload();
  await expect(page.getByTestId("sheet-error-marker-scope")).toContainText(
    "marker-sheet-b"
  );
  await expect(page.getByTestId("sheet-error-marker-list-empty")).toBeVisible();
  await expect(
    page.getByTestId("sheet-error-marker-list-empty")
  ).not.toContainText("Missed left hand");

  const markerPersistence = (await readRecordingHistory(page)).errorMarkers.map(
    (marker: { recordingId: string; note: string | null }) => marker
  );

  expect(markerPersistence).toEqual([
    expect.objectContaining({
      recordingId: "marker-sheet-a",
      note: "Missed left hand"
    }),
    expect.objectContaining({
      recordingId: "marker-sheet-a",
      note: longUnbrokenNote
    })
  ]);
  expect(consoleErrors).toEqual([]);
});

test("sheet recording surfaces microphone denial and bad artifact states", async ({
  page
}) => {
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
  const { link, sheetId } = await importTestSheet(page, {
    name: "Bad Artifact Contract Sheet",
    bpm: 88,
    timeSignature: "3/4"
  });

  await link.click();
  await page.getByRole("button", { name: "Start recording" }).click();
  await expect(
    page.getByText(
      "Microphone access was denied. Enable microphone permission to record a take."
    )
  ).toBeVisible();
  await expect(page.getByTestId("sheet-recording-state")).toContainText(
    "stopped"
  );

  const badArtifact = {
    dataUrl: "data:audio/wav;base64,bm90LWF1ZGlv",
    durationMs: 900,
    sizeBytes: 12
  };
  const badRecordings = [
    createE2ESheetRecording({
      id: "bad-sheet-recording",
      origin: "user",
      name: "Bad sheet take",
      sessionId: "session-bad-sheet",
      sheetId,
      sheetName: "Bad Artifact Contract Sheet",
      artifact: badArtifact,
      createdAt: "2026-06-22T06:30:00.000Z",
      trustedPeaks: [0.4, 0.8],
      settings: {
        bpm: 88,
        timeSignature: "3/4"
      }
    })
  ];

  await seedRecordingHistory(page, {
    sessions: [{ id: "session-bad-sheet", sourceType: "sheet", sheetId }],
    recordings: badRecordings,
    errorMarkers: []
  });
  await seedE2ERecordingArtifacts(page, badRecordings);

  await page.goto(`/sheet-practice/${sheetId}`);
  await expect(page.getByTestId("sheet-latest-recording")).toBeVisible();
  await expect(
    page.getByTestId("sheet-recording-artifact-error")
  ).toContainText("cannot be decoded");
  await expect(
    page.getByRole("button", { name: "Play latest sheet recording" })
  ).toBeDisabled();

  const mismatchArtifact = await createWavDataUrl(page, 330, 1);

  const mismatchRecordings = [
    createE2ESheetRecording({
      id: "mismatch-sheet-recording",
      origin: "user",
      name: "Mismatch sheet take",
      sessionId: "session-mismatch-sheet",
      sheetId,
      sheetName: "Bad Artifact Contract Sheet",
      artifact: mismatchArtifact,
      createdAt: "2026-06-22T06:35:00.000Z",
      durationMs: 4_000,
      trustedPeaks: [0.2, 0.7, 0.4],
      settings: {
        bpm: 88,
        timeSignature: "3/4"
      }
    })
  ];

  await seedRecordingHistory(page, {
    sessions: [{ id: "session-mismatch-sheet", sourceType: "sheet", sheetId }],
    recordings: mismatchRecordings,
    errorMarkers: []
  });
  await seedE2ERecordingArtifacts(page, mismatchRecordings);

  await page.goto(`/sheet-practice/${sheetId}`);
  await expect(page.getByTestId("sheet-latest-recording")).toBeVisible();
  await expect(
    page.getByTestId("sheet-recording-duration-warning")
  ).toContainText("differs from saved metadata");
});
