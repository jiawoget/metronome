import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  clearDatabases,
  clearRecordingHistory,
  PRACTICE_SESSION_DB_NAME,
  RECORDING_HISTORY_STORAGE_KEY,
  SHEET_LIBRARY_DB_NAME
} from "./fixtures/storage";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const sheetFixturesDir = path.resolve(currentDir, "../../test-fixtures/sheets");
const recordingHarnessEvent = "sheet-practice-controls:set-recording-harness-active";

type MetronomeTrace = {
  tickIndex: number;
  audioTime: number;
  accented: boolean;
  bpm: number;
  expectedIntervalMs: number;
  subdivision: string;
  timeSignature: string;
};

function average(values: number[]) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function intervalsFromAudioTime(traces: MetronomeTrace[]) {
  return traces.slice(1).map((trace, index) => (trace.audioTime - traces[index].audioTime) * 1_000);
}

async function importSheet(page: Page) {
  await page.goto("/sheet-library");
  await page.getByLabel("File").setInputFiles(path.join(sheetFixturesDir, "real-sheet.png"));
  await expect(page.getByText(/^Ready:/)).toBeVisible();
  await page.getByLabel("Name").fill("Controls Contract Sheet");
  await page.getByLabel("BPM").fill("72");
  await page.getByLabel("Time signature").fill("4/4");
  await page.getByRole("button", { name: "Save Imported Sheet" }).click();
  await expect(page.getByRole("heading", { name: "Controls Contract Sheet" })).toBeVisible();

  const link = page.getByRole("link", { name: "Open Sheet Practice" }).first();
  const href = await link.getAttribute("href");
  const sheetId = new URL(href ?? "", "http://127.0.0.1").pathname.split("/").pop() ?? "";

  expect(sheetId).toBeTruthy();

  return { link, sheetId };
}

async function getPracticeSnapshot(page: Page) {
  return page.evaluate(
    ({ databaseName, storageKey }: { databaseName: string; storageKey: string }) =>
      new Promise<{
        sessions: Array<{
          id: string;
          sourceType: string;
          sheetId: string | null;
          bpm: number | null;
          timeSignature: string | null;
          recordingCount: number;
          latestRecordingId: string | null;
        }>;
        recordings: Array<{
          id: string;
          type: string;
          sessionId: string;
          sheetId: string;
          audioDataUrl?: string | null;
        }>;
      }>((resolve, reject) => {
        const readRecordings = () => {
          const rawValue = window.localStorage.getItem(storageKey);
          const parsed = rawValue ? JSON.parse(rawValue) : { recordings: [] };

          return Array.isArray(parsed.recordings) ? parsed.recordings : [];
        };
        const openExistingDatabase = () => {
          const openRequest = indexedDB.open(databaseName);

          openRequest.onerror = () => reject(openRequest.error);
          openRequest.onsuccess = () => {
            const database = openRequest.result;

            if (!database.objectStoreNames.contains("sessions")) {
              database.close();
              resolve({ sessions: [], recordings: readRecordings() });
              return;
            }

            const transaction = database.transaction(["sessions"], "readonly");
            const sessionsRequest = transaction.objectStore("sessions").getAll();

            transaction.oncomplete = () => {
              database.close();
              resolve({
                sessions: sessionsRequest.result,
                recordings: readRecordings()
              });
            };
            transaction.onerror = () => reject(transaction.error);
          };
        };

        if ("databases" in indexedDB) {
          indexedDB.databases().then((databases) => {
            if (databases.some((database) => database.name === databaseName)) {
              openExistingDatabase();
              return;
            }

            resolve({ sessions: [], recordings: readRecordings() });
          }, reject);
          return;
        }

        openExistingDatabase();
      }),
    {
      databaseName: PRACTICE_SESSION_DB_NAME,
      storageKey: RECORDING_HISTORY_STORAGE_KEY
    }
  );
}

async function expectNoViewerOverlap(page: Page) {
  await expect(page.getByTestId("sheet-practice-controls")).toBeVisible();
  await expect(page.getByTestId("sheet-viewer-scroll")).toBeVisible();
  await page.getByTestId("sheet-practice-controls").scrollIntoViewIfNeeded();
  await expect(page.getByRole("button", { name: "Start metronome" })).toBeVisible();

  const boxes = await page.evaluate(() => {
    const viewer = document.querySelector("[data-testid='sheet-viewer-scroll']")?.getBoundingClientRect();
    const controls = document.querySelector("[data-testid='sheet-practice-controls']")?.getBoundingClientRect();

    if (!viewer || !controls) {
      return null;
    }

    return {
      viewerBottom: viewer.bottom,
      controlsTop: controls.top,
      viewportHeight: window.innerHeight
    };
  });

  expect(boxes).not.toBeNull();
  expect(boxes?.controlsTop).toBeGreaterThanOrEqual((boxes?.viewerBottom ?? 0) - 1);
  expect(boxes?.controlsTop).toBeLessThan((boxes?.viewportHeight ?? 0) - 48);
}

test("sheet practice controls drive shared metronome timing, session activity, and recording independence", async ({
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
      __sheetMetronomeTraces?: MetronomeTrace[];
      __sheetPracticeControlsTestHarness?: boolean;
    };

    e2eWindow.__sheetPracticeControlsTestHarness = true;
    e2eWindow.__sheetMetronomeTraces = [];
    window.addEventListener("quick-metronome:scheduled-tick", (event) => {
      e2eWindow.__sheetMetronomeTraces?.push((event as CustomEvent<MetronomeTrace>).detail);
    });
  });

  await page.setViewportSize({ width: 1280, height: 820 });
  await page.goto("/sheet-library");
  await clearRecordingHistory(page);
  await clearDatabases(page, [SHEET_LIBRARY_DB_NAME, PRACTICE_SESSION_DB_NAME]);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Sheet Library" })).toBeVisible();
  const { link, sheetId } = await importSheet(page);

  await link.click();
  await expect(page.getByRole("heading", { name: "Controls Contract Sheet" })).toBeVisible();
  await expect(page.getByTestId("sheet-practice-controls")).toBeVisible();
  await expect(page.getByRole("spinbutton", { name: "BPM", exact: true })).toHaveValue("72");
  await expect(page.getByLabel("Time signature", { exact: true })).toHaveValue("4/4");
  await expect(page.getByText("Defaults: 72 BPM, 4/4")).toBeVisible();
  await expect(page.getByTestId("sheet-session-id")).toContainText("none");
  await expect(page.getByTestId("sheet-recording-count")).toContainText("0");
  await expect(page.getByRole("button", { name: "Start recording harness" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Stop recording harness" })).toHaveCount(0);
  expect(await getPracticeSnapshot(page)).toEqual({ sessions: [], recordings: [] });
  await expectNoViewerOverlap(page);

  await page.getByRole("button", { name: "Start metronome" }).click();
  await expect(page.getByTestId("sheet-metronome-state")).toContainText("Playing");
  await expect(page.getByText("Metronome playing.")).toBeVisible();
  await expect(page.getByText(/locked while the metronome is running/i)).toBeVisible();
  await expect(page.getByLabel("Time signature", { exact: true })).toBeDisabled();
  await expect(page.getByLabel("Subdivision", { exact: true })).toBeDisabled();
  await expect(page.getByLabel("Countdown", { exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Every beat" })).toBeDisabled();
  await expect(page.getByRole("spinbutton", { name: "BPM", exact: true })).toBeEnabled();
  await expect(page.getByTestId("sheet-session-source")).toContainText("sheet");
  await page.waitForFunction(() => {
    const e2eWindow = window as Window & { __sheetMetronomeTraces?: MetronomeTrace[] };

    return (e2eWindow.__sheetMetronomeTraces ?? []).filter(
      (trace) => trace.bpm === 72 && trace.subdivision === "quarter"
    ).length >= 4;
  });

  let snapshot = await getPracticeSnapshot(page);

  expect(snapshot.sessions).toHaveLength(1);
  expect(snapshot.sessions[0]).toMatchObject({
    sourceType: "sheet",
    sheetId,
    bpm: 72,
    timeSignature: "4/4",
    recordingCount: 0,
    latestRecordingId: null
  });
  expect(snapshot.recordings).toEqual([]);

  const bpm72Traces = await page.evaluate(() => {
    const e2eWindow = window as Window & { __sheetMetronomeTraces?: MetronomeTrace[] };

    return (e2eWindow.__sheetMetronomeTraces ?? [])
      .filter((trace) => trace.bpm === 72 && trace.subdivision === "quarter")
      .slice(-4);
  });
  const bpm72Intervals = intervalsFromAudioTime(bpm72Traces);

  expect(average(bpm72Intervals)).toBeGreaterThan(805);
  expect(average(bpm72Intervals)).toBeLessThan(860);
  expect(Math.max(...bpm72Intervals) - Math.min(...bpm72Intervals)).toBeLessThan(8);

  const bpmInput = page.getByRole("spinbutton", { name: "BPM", exact: true });

  await bpmInput.fill("90");
  await bpmInput.press("Enter");
  await expect(page.getByText(/Tick interval 667 ms/i)).toBeVisible();
  await page.waitForFunction(() => {
    const e2eWindow = window as Window & { __sheetMetronomeTraces?: MetronomeTrace[] };

    return (e2eWindow.__sheetMetronomeTraces ?? []).filter(
      (trace) => trace.bpm === 90 && trace.subdivision === "quarter"
    ).length >= 4;
  });

  const bpm90Traces = await page.evaluate(() => {
    const e2eWindow = window as Window & { __sheetMetronomeTraces?: MetronomeTrace[] };

    return (e2eWindow.__sheetMetronomeTraces ?? [])
      .filter((trace) => trace.bpm === 90 && trace.subdivision === "quarter")
      .slice(-4);
  });
  const bpm90Intervals = intervalsFromAudioTime(bpm90Traces);

  expect(average(bpm90Intervals)).toBeGreaterThan(640);
  expect(average(bpm90Intervals)).toBeLessThan(695);
  expect(average(bpm90Intervals)).toBeLessThan(average(bpm72Intervals) - 120);

  await page.getByRole("button", { name: "Stop metronome" }).click();
  await expect(page.getByTestId("sheet-metronome-state")).toContainText("Stopped");
  const traceCountAfterStop = await page.evaluate(() => {
    const e2eWindow = window as Window & { __sheetMetronomeTraces?: MetronomeTrace[] };

    return e2eWindow.__sheetMetronomeTraces?.length ?? 0;
  });
  await page.waitForTimeout(700);
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const e2eWindow = window as Window & { __sheetMetronomeTraces?: MetronomeTrace[] };

        return e2eWindow.__sheetMetronomeTraces?.length ?? 0;
      })
    )
    .toBe(traceCountAfterStop);

  await page.getByLabel("Countdown", { exact: true }).selectOption("4");
  await page.getByRole("button", { name: "Start metronome" }).click();
  await expect(page.getByTestId("sheet-metronome-state")).toContainText("Counting");
  await expect(page.getByText(/locked while the metronome is running/i)).toBeVisible();
  await expect(page.getByLabel("Time signature", { exact: true })).toBeDisabled();
  await expect(page.getByLabel("Subdivision", { exact: true })).toBeDisabled();
  await expect(page.getByLabel("Countdown", { exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Every beat" })).toBeDisabled();
  await expect(bpmInput).toBeEnabled();
  await bpmInput.fill("91");
  await bpmInput.press("Enter");
  await expect(bpmInput).toHaveValue("91");
  await page.waitForFunction(() => {
    const e2eWindow = window as Window & { __sheetMetronomeTraces?: MetronomeTrace[] };

    return (e2eWindow.__sheetMetronomeTraces ?? []).some(
      (trace) => trace.bpm === 91 && trace.subdivision === "quarter"
    );
  });
  await expect(page.getByTestId("sheet-metronome-state")).toContainText("Playing");
  snapshot = await getPracticeSnapshot(page);
  expect(snapshot.sessions[0]).toMatchObject({
    bpm: 91
  });
  await page.getByRole("button", { name: "Stop metronome" }).click();
  await expect(page.getByLabel("Countdown", { exact: true })).toBeEnabled();
  await page.getByLabel("Countdown", { exact: true }).selectOption("0");

  await bpmInput.fill("120");
  await bpmInput.press("Enter");
  await page.getByLabel("Time signature", { exact: true }).selectOption("3/4");
  await page.getByLabel("Subdivision", { exact: true }).selectOption("eighth");
  await page.getByRole("button", { name: "Downbeat" }).click();
  await page.getByRole("button", { name: "Start metronome" }).click();
  await page.waitForFunction(() => {
    const e2eWindow = window as Window & { __sheetMetronomeTraces?: MetronomeTrace[] };

    return (e2eWindow.__sheetMetronomeTraces ?? []).filter(
      (trace) => trace.bpm === 120 && trace.timeSignature === "3/4" && trace.subdivision === "eighth"
    ).length >= 7;
  });

  const eighthTraces = await page.evaluate(() => {
    const e2eWindow = window as Window & { __sheetMetronomeTraces?: MetronomeTrace[] };

    return (e2eWindow.__sheetMetronomeTraces ?? [])
      .filter((trace) => trace.bpm === 120 && trace.timeSignature === "3/4" && trace.subdivision === "eighth")
      .slice(-7);
  });
  const eighthIntervals = intervalsFromAudioTime(eighthTraces);

  expect(eighthTraces.map((trace) => trace.accented)).toEqual([true, false, false, false, false, false, true]);
  expect(eighthTraces.every((trace) => trace.expectedIntervalMs === 250)).toBe(true);
  expect(average(eighthIntervals)).toBeGreaterThan(235);
  expect(average(eighthIntervals)).toBeLessThan(265);

  await page.getByRole("button", { name: "Stop metronome" }).click();
  await page.getByRole("button", { name: "Every beat" }).click();
  await expect(page.getByRole("button", { name: "Every beat" })).toHaveAttribute("aria-pressed", "true");
  const countBeforeEveryBeat = await page.evaluate(() => {
    const e2eWindow = window as Window & { __sheetMetronomeTraces?: MetronomeTrace[] };

    return (e2eWindow.__sheetMetronomeTraces ?? []).filter(
      (trace) => trace.bpm === 120 && trace.timeSignature === "3/4" && trace.subdivision === "eighth"
    ).length;
  });
  await page.getByRole("button", { name: "Start metronome" }).click();
  await page.waitForFunction((previousCount) => {
    const e2eWindow = window as Window & { __sheetMetronomeTraces?: MetronomeTrace[] };

    return (e2eWindow.__sheetMetronomeTraces ?? []).filter(
      (trace) => trace.bpm === 120 && trace.timeSignature === "3/4" && trace.subdivision === "eighth"
    ).length >= previousCount + 7;
  }, countBeforeEveryBeat);

  const everyBeatTraces = await page.evaluate(() => {
    const e2eWindow = window as Window & { __sheetMetronomeTraces?: MetronomeTrace[] };

    return (e2eWindow.__sheetMetronomeTraces ?? [])
      .filter((trace) => trace.bpm === 120 && trace.timeSignature === "3/4" && trace.subdivision === "eighth")
      .slice(-7);
  });

  expect(everyBeatTraces.map((trace) => trace.accented)).toEqual([true, false, true, false, true, false, true]);

  await page.getByRole("button", { name: "Stop metronome" }).click();
  await page.getByRole("button", { name: "Off" }).click();
  await expect(page.getByRole("button", { name: "Off" })).toHaveAttribute("aria-pressed", "true");
  const countBeforeOff = await page.evaluate(() => {
    const e2eWindow = window as Window & { __sheetMetronomeTraces?: MetronomeTrace[] };

    return (e2eWindow.__sheetMetronomeTraces ?? []).filter(
      (trace) => trace.bpm === 120 && trace.timeSignature === "3/4" && trace.subdivision === "eighth"
    ).length;
  });
  await page.getByRole("button", { name: "Start metronome" }).click();
  await page.waitForFunction((previousCount) => {
    const e2eWindow = window as Window & { __sheetMetronomeTraces?: MetronomeTrace[] };

    return (e2eWindow.__sheetMetronomeTraces ?? []).filter(
      (trace) => trace.bpm === 120 && trace.timeSignature === "3/4" && trace.subdivision === "eighth"
    ).length >= previousCount + 4;
  }, countBeforeOff);

  const offTraces = await page.evaluate(() => {
    const e2eWindow = window as Window & { __sheetMetronomeTraces?: MetronomeTrace[] };

    return (e2eWindow.__sheetMetronomeTraces ?? [])
      .filter((trace) => trace.bpm === 120 && trace.timeSignature === "3/4" && trace.subdivision === "eighth")
      .slice(-4);
  });

  expect(offTraces.map((trace) => trace.accented)).toEqual([false, false, false, false]);

  await page.getByRole("button", { name: "Stop metronome" }).click();
  await expect(page.getByTestId("sheet-recording-count")).toContainText("0");

  await page.evaluate((eventName) => {
    window.dispatchEvent(new CustomEvent(eventName, { detail: { active: true } }));
  }, recordingHarnessEvent);
  await expect(page.getByTestId("sheet-recording-state")).toContainText("active");
  await page.getByRole("button", { name: "Start metronome" }).click();
  await expect(page.getByTestId("sheet-recording-state")).toContainText("active");
  await expect(page.getByTestId("sheet-metronome-state")).toContainText("Playing");
  await page.getByRole("button", { name: "Stop metronome" }).click();
  await expect(page.getByTestId("sheet-recording-state")).toContainText("active");
  await expect(page.getByTestId("sheet-metronome-state")).toContainText("Stopped");
  await page.evaluate((eventName) => {
    window.dispatchEvent(new CustomEvent(eventName, { detail: { active: false } }));
  }, recordingHarnessEvent);
  await expect(page.getByTestId("sheet-recording-state")).toContainText("stopped");
  await page.getByRole("button", { name: "Start metronome" }).click();
  await page.evaluate((eventName) => {
    window.dispatchEvent(new CustomEvent(eventName, { detail: { active: true } }));
    window.dispatchEvent(new CustomEvent(eventName, { detail: { active: false } }));
  }, recordingHarnessEvent);
  await expect(page.getByTestId("sheet-metronome-state")).toContainText("Playing");
  await page.getByRole("button", { name: "Stop metronome" }).click();

  snapshot = await getPracticeSnapshot(page);
  expect(snapshot.sessions).toHaveLength(1);
  expect(snapshot.recordings).toEqual([]);
  expect(snapshot.sessions[0]?.recordingCount).toBe(0);
  expect(snapshot.sessions[0]?.latestRecordingId).toBeNull();
  await expect(page.getByTestId("sheet-recording-count")).toContainText("0");

  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoViewerOverlap(page);
  await page.getByRole("button", { name: "Start metronome" }).click();
  await expect(page.getByTestId("sheet-metronome-state")).toContainText("Playing");
  await expectNoViewerOverlap(page);
  await page.setViewportSize({ width: 1024, height: 768 });
  await expectNoViewerOverlap(page);
  await page.getByRole("button", { name: "Stop metronome" }).click();
  await page.setViewportSize({ width: 1280, height: 820 });
  await expectNoViewerOverlap(page);

  expect(consoleErrors).toEqual([]);
});
