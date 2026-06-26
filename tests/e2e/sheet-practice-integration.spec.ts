import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  PRACTICE_SESSION_DB_NAME,
  RECORDING_HISTORY_STORAGE_KEY,
  SHEET_LIBRARY_DB_NAME
} from "./fixtures/storage";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const sheetFixturesDir = path.resolve(currentDir, "../../test-fixtures/sheets");
const sheetDbName = SHEET_LIBRARY_DB_NAME;
const practiceDbName = PRACTICE_SESSION_DB_NAME;
const recordingHistoryStorageKey = RECORDING_HISTORY_STORAGE_KEY;

type MetronomeTrace = {
  bpm: number;
  audioTime: number;
  subdivision: string;
};

type SavedSheetRecording = {
  id: string;
  type: string;
  sessionId: string;
  sheetId: string;
  durationMs: number;
  audioDataUrl: string;
  trustedPeaks: number[];
};

type LayoutViewport = {
  name: string;
  width: number;
  height: number;
  expectControlsInInitialViewport: boolean;
  minViewerHeight: number;
};

const layoutViewports: LayoutViewport[] = [
  { name: "desktop", width: 1280, height: 820, expectControlsInInitialViewport: true, minViewerHeight: 220 },
  { name: "tablet", width: 1024, height: 768, expectControlsInInitialViewport: true, minViewerHeight: 220 },
  { name: "mobile", width: 390, height: 844, expectControlsInInitialViewport: false, minViewerHeight: 160 }
];

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

async function importIntegrationSheet(page: Page) {
  await page.goto("/sheet-library");
  await page.getByLabel("File").setInputFiles(path.join(sheetFixturesDir, "real-sheet.png"));
  await expect(page.getByText(/^Ready:/)).toBeVisible();
  await page.getByLabel("Name").fill("Integrated Practice Sheet");
  await page.getByLabel("BPM").fill("84");
  await page.getByLabel("Time signature").fill("4/4");
  await page.getByRole("button", { name: "Save Imported Sheet" }).click();
  await expect(page.getByRole("heading", { name: "Integrated Practice Sheet" })).toBeVisible();

  const link = page.getByRole("link", { name: "Open Sheet Practice" }).first();
  const href = await link.getAttribute("href");
  const sheetId = new URL(href ?? "", "http://127.0.0.1").pathname.split("/").pop() ?? "";

  expect(sheetId).toBeTruthy();

  return { link, sheetId };
}

async function installSyntheticMicrophone(page: Page, frequencyHz = 440) {
  await page.addInitScript((frequency) => {
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

          return destination.stream;
        }
      }
    });
  }, frequencyHz);
}

async function getPracticeSnapshot(page: Page) {
  return page.evaluate(
    ({ databaseName, storageKey }: { databaseName: string; storageKey: string }) =>
      new Promise<{
        sessions: Array<{
          id: string;
          sourceType: string;
          sheetId: string | null;
          recordingCount: number;
          latestRecordingId: string | null;
        }>;
        recordings: SavedSheetRecording[];
        errorMarkers: Array<{ recordingId: string; timestampMs: number; note: string | null }>;
      }>((resolve, reject) => {
        const readHistory = () => {
          const rawValue = window.localStorage.getItem(storageKey);
          const parsed = rawValue ? JSON.parse(rawValue) : { recordings: [], errorMarkers: [] };

          return {
            recordings: Array.isArray(parsed.recordings) ? parsed.recordings : [],
            errorMarkers: Array.isArray(parsed.errorMarkers) ? parsed.errorMarkers : []
          };
        };
        const openRequest = indexedDB.open(databaseName);

        openRequest.onerror = () => reject(openRequest.error);
        openRequest.onsuccess = () => {
          const database = openRequest.result;
          const history = readHistory();

          if (!database.objectStoreNames.contains("sessions")) {
            database.close();
            resolve({ sessions: [], ...history });
            return;
          }

          const transaction = database.transaction(["sessions"], "readonly");
          const sessionsRequest = transaction.objectStore("sessions").getAll();

          transaction.oncomplete = () => {
            database.close();
            resolve({
              sessions: sessionsRequest.result,
              ...history
            });
          };
          transaction.onerror = () => reject(transaction.error);
        };
      }),
    { databaseName: practiceDbName, storageKey: recordingHistoryStorageKey }
  );
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

      return {
        durationMs: audioBuffer.duration * 1_000,
        peakAmplitude,
        rmsAmplitude: Math.sqrt(sumSquares / Math.max(1, samples.length)),
        estimatedFrequencyHz:
          audioBuffer.duration > 0 ? positiveZeroCrossings / audioBuffer.duration : null
      };
    },
    { storageKey: recordingHistoryStorageKey, id: recordingId }
  );
}

async function expectSheetPriorityLayout(page: Page, viewport: LayoutViewport, phase: string) {
  const sheetImage = page.getByRole("img", { name: /Integrated Practice Sheet page 1/ });

  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(sheetImage).toBeVisible();
  await expect(page.getByTestId("sheet-viewer-scroll")).toBeVisible();
  await expect(page.getByTestId("sheet-practice-controls")).toBeVisible();

  const layout = await page.evaluate(() => {
    const viewer = document.querySelector("[data-testid='sheet-viewer-scroll']")?.getBoundingClientRect();
    const controls = document.querySelector("[data-testid='sheet-practice-controls']")?.getBoundingClientRect();
    const sheet = document.querySelector("img[alt='Integrated Practice Sheet page 1']")?.getBoundingClientRect();

    return viewer && controls && sheet
      ? {
          sheetVisibleHeight: Math.max(0, Math.min(sheet.bottom, window.innerHeight) - Math.max(sheet.top, 0)),
          sheetVisibleWidth: Math.max(0, Math.min(sheet.right, window.innerWidth) - Math.max(sheet.left, 0)),
          viewerHeight: viewer.height,
          viewerWidth: viewer.width,
          viewerBottomDocument: viewer.bottom + window.scrollY,
          controlsTopDocument: controls.top + window.scrollY,
          controlsHeight: controls.height,
          controlsWidth: controls.width,
          controlsVisibleHeight: Math.max(0, Math.min(controls.bottom, window.innerHeight) - Math.max(controls.top, 0)),
          controlsTop: controls.top,
          documentHeight: document.documentElement.scrollHeight,
          viewportHeight: window.innerHeight,
          viewportWidth: window.innerWidth
        }
      : null;
  });

  expect(layout).not.toBeNull();
  expect(layout?.viewerWidth, `${phase} ${viewport.name}: viewer has width`).toBeGreaterThan(240);
  expect(layout?.viewerHeight, `${phase} ${viewport.name}: viewer has height`).toBeGreaterThan(
    viewport.minViewerHeight
  );
  expect(layout?.sheetVisibleWidth, `${phase} ${viewport.name}: sheet image intersects viewport`).toBeGreaterThan(80);
  expect(layout?.sheetVisibleHeight, `${phase} ${viewport.name}: sheet image intersects viewport`).toBeGreaterThan(80);
  expect(
    layout?.controlsTopDocument,
    `${phase} ${viewport.name}: controls are laid out after the sheet viewer without overlaying it`
  ).toBeGreaterThanOrEqual((layout?.viewerBottomDocument ?? 0) - 1);
  expect(layout?.controlsWidth, `${phase} ${viewport.name}: controls have width`).toBeGreaterThan(240);
  expect(layout?.controlsHeight, `${phase} ${viewport.name}: controls have height`).toBeGreaterThan(120);

  if (viewport.expectControlsInInitialViewport) {
    expect(
      layout?.controlsVisibleHeight,
      `${phase} ${viewport.name}: bottom controls intersect the initial viewport`
    ).toBeGreaterThan(48);
    expect(
      layout?.controlsTop,
      `${phase} ${viewport.name}: bottom controls are not pushed entirely below the viewport`
    ).toBeLessThan((layout?.viewportHeight ?? 0) - 48);
  } else {
    expect(
      layout?.documentHeight,
      `${phase} ${viewport.name}: mobile layout remains scrollable to controls`
    ).toBeGreaterThan(layout?.viewportHeight ?? 0);
  }
}

async function expectControlsOperableAfterLayoutEvidence(page: Page, phase: string, viewport: LayoutViewport) {
  await page.getByTestId("sheet-practice-controls").scrollIntoViewIfNeeded();
  await expect(
    page.getByRole("button", { name: "Start metronome" }),
    `${phase} ${viewport.name}: metronome control is reachable`
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Start recording" }),
    `${phase} ${viewport.name}: recording control is reachable`
  ).toBeVisible();
}

async function expectIntegratedLayoutAcrossViewports(page: Page, phase: string) {
  for (const viewport of layoutViewports) {
    await expectSheetPriorityLayout(page, viewport, phase);
    await expectControlsOperableAfterLayoutEvidence(page, phase, viewport);
  }

  await page.setViewportSize({ width: 1280, height: 820 });
  await page.evaluate(() => window.scrollTo(0, 0));
}

test("sheet practice parent integration opens from library and preserves sheet, session, recording, marker, and continue context", async ({
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
      __sheetMetronomeTraces?: MetronomeTrace[];
      __sheetRecordingPlaybackEvents?: unknown[];
      __sheetMarkerSeekEvents?: unknown[];
    };

    e2eWindow.__sheetMetronomeTraces = [];
    e2eWindow.__sheetRecordingPlaybackEvents = [];
    e2eWindow.__sheetMarkerSeekEvents = [];
    window.addEventListener("quick-metronome:scheduled-tick", (event) => {
      e2eWindow.__sheetMetronomeTraces?.push((event as CustomEvent<MetronomeTrace>).detail);
    });
    window.addEventListener("recordings-review:playback", (event) => {
      e2eWindow.__sheetRecordingPlaybackEvents?.push((event as CustomEvent).detail);
    });
    window.addEventListener("recordings-review:seek", (event) => {
      e2eWindow.__sheetMarkerSeekEvents?.push((event as CustomEvent).detail);
    });
  });

  await page.setViewportSize({ width: 1280, height: 820 });
  await clearState(page);
  const { link, sheetId } = await importIntegrationSheet(page);

  await link.click();
  await expect(page).toHaveURL(new RegExp(`/sheet-practice/${sheetId}$`));
  await expect(page.getByRole("heading", { name: "Integrated Practice Sheet" })).toBeVisible();
  await expect(page.getByRole("spinbutton", { name: /^BPM$/ })).toHaveValue("84");
  await expect(page.getByLabel("Time signature", { exact: true })).toHaveValue("4/4");
  await expectIntegratedLayoutAcrossViewports(page, "initial open");
  await expect(page.getByTestId("sheet-session-id")).toHaveText("none");
  expect(await getPracticeSnapshot(page)).toMatchObject({ sessions: [] });

  await page.getByRole("button", { name: "Start metronome" }).click();
  await expect(page.getByTestId("sheet-metronome-state")).toContainText("Playing");
  await expect(page.getByTestId("sheet-session-source")).toContainText("sheet");
  await expect(page.getByTestId("sheet-session-sheet-id")).toContainText(sheetId);
  await page.waitForFunction(() => {
    const e2eWindow = window as Window & { __sheetMetronomeTraces?: MetronomeTrace[] };

    return (e2eWindow.__sheetMetronomeTraces ?? []).filter(
      (trace) => trace.bpm === 84 && trace.subdivision === "quarter"
    ).length >= 3;
  });
  await page.getByRole("button", { name: "Stop metronome" }).click();
  await expect(page.getByTestId("sheet-metronome-state")).toContainText("Stopped");

  await page.getByRole("button", { name: "Start recording" }).click();
  await expect(page.getByTestId("sheet-recording-state")).toContainText("active");
  await page.waitForTimeout(850);
  await page.getByRole("button", { name: "Stop recording" }).click();
  await expect(page.getByText("Recording saved.")).toBeVisible();
  await expect(page.getByTestId("sheet-latest-recording")).toBeVisible();
  await expect(page.getByTestId("sheet-waveform-source")).toContainText("trusted peaks");

  let snapshot = await getPracticeSnapshot(page);
  const sheetRecordings = snapshot.recordings.filter(
    (recording) => recording.type === "sheet" && recording.sheetId === sheetId
  );

  expect(snapshot.sessions).toHaveLength(1);
  expect(snapshot.sessions[0]).toMatchObject({
    sourceType: "sheet",
    sheetId,
    recordingCount: 1
  });
  expect(sheetRecordings).toHaveLength(1);
  expect(sheetRecordings[0]).toMatchObject({
    type: "sheet",
    sheetId,
    sessionId: snapshot.sessions[0]?.id
  });
  expect(sheetRecordings[0]?.trustedPeaks.length).toBeGreaterThan(12);

  const decodedRecording = await decodeRecording(page, sheetRecordings[0]?.id ?? "");

  expect(decodedRecording.durationMs).toBeGreaterThan(600);
  expect(decodedRecording.rmsAmplitude).toBeGreaterThan(0.01);
  expect(decodedRecording.peakAmplitude).toBeGreaterThan(0.02);
  expect(decodedRecording.estimatedFrequencyHz ?? 0).toBeGreaterThan(390);
  expect(decodedRecording.estimatedFrequencyHz ?? 0).toBeLessThan(490);

  await page.getByRole("button", { name: "Play latest sheet recording" }).click();
  await page.waitForFunction((recordingId) => {
    const e2eWindow = window as Window & {
      __sheetRecordingPlaybackEvents?: { recordingId: string; state: string }[];
    };

    return e2eWindow.__sheetRecordingPlaybackEvents?.some(
      (event) => event.recordingId === recordingId && event.state === "playing"
    );
  }, sheetRecordings[0]?.id);
  await page.getByRole("button", { name: "Pause latest sheet recording" }).click();

  await page.getByRole("spinbutton", { name: "Marker time seconds" }).fill("");
  await page.getByRole("button", { name: "Mark Error" }).click();
  await expect(page.getByTestId("sheet-error-marker-error")).toContainText(
    "Choose a valid recording timestamp."
  );
  await page.getByRole("spinbutton", { name: "Marker time seconds" }).fill("-1");
  await page.getByRole("button", { name: "Mark Error" }).click();
  await expect(page.getByTestId("sheet-error-marker-error")).toContainText(
    "Marker time must be within the recording."
  );
  await page.getByRole("spinbutton", { name: "Marker time seconds" }).fill("99");
  await page.getByRole("button", { name: "Mark Error" }).click();
  await expect(page.getByTestId("sheet-error-marker-error")).toContainText(
    "Marker time must be within the recording."
  );
  expect((await getPracticeSnapshot(page)).errorMarkers).toEqual([]);

  await page.getByRole("spinbutton", { name: "Marker time seconds" }).fill("0.4");
  await page.getByRole("textbox", { name: "Marker note" }).fill("  Integrated marker  ");
  await page.getByRole("button", { name: "Mark Error" }).click();
  await expect(page.getByTestId("sheet-error-marker-list")).toContainText("Integrated marker");
  await expectIntegratedLayoutAcrossViewports(page, "recording and marker UI");
  await page.getByRole("button", { name: /Seek to marker 0:00/ }).click();
  await page.waitForFunction((recordingId) => {
    const e2eWindow = window as Window & {
      __sheetMarkerSeekEvents?: { recordingId: string; timestampMs: number; currentTimeMs: number }[];
    };

    return e2eWindow.__sheetMarkerSeekEvents?.some(
      (event) =>
        event.recordingId === recordingId &&
        event.timestampMs === 400 &&
        Math.abs(event.currentTimeMs - 400) <= 80
    );
  }, sheetRecordings[0]?.id);

  await page.reload();
  await expect(page).toHaveURL(new RegExp(`/sheet-practice/${sheetId}$`));
  await expect(page.getByRole("heading", { name: "Integrated Practice Sheet" })).toBeVisible();
  await expectIntegratedLayoutAcrossViewports(page, "reload");
  await expect(page.getByTestId("sheet-latest-recording")).toBeVisible();
  await expect(page.getByTestId("sheet-error-marker-list")).toContainText("Integrated marker");

  snapshot = await getPracticeSnapshot(page);
  expect(snapshot.errorMarkers).toEqual([
    expect.objectContaining({
      recordingId: sheetRecordings[0]?.id,
      timestampMs: 400,
      note: "Integrated marker"
    })
  ]);

  await page.goto("/");
  const continuePractice = page.getByRole("link", { name: "Continue Practice" });

  await expect(continuePractice).toBeVisible();
  await expect(continuePractice).toHaveAttribute("href", `/sheet-practice/${sheetId}`);
  await continuePractice.click();
  await expect(page).toHaveURL(new RegExp(`/sheet-practice/${sheetId}$`));
  await expect(page.getByRole("heading", { name: "Integrated Practice Sheet" })).toBeVisible();
  await expect(page.getByTestId("sheet-latest-recording")).toBeVisible();
  await expect(page.getByTestId("sheet-error-marker-list")).toContainText("Integrated marker");
  await expectIntegratedLayoutAcrossViewports(page, "continue practice return");

  await expect(page.getByTestId("reference-panel")).toBeVisible();
  await expect(page.getByText(/automatic|analysis|bar detection|current bar|mistake detection/i)).toHaveCount(0);
  expect(consoleErrors).toEqual([]);
});
