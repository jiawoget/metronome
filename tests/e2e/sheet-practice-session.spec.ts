import { expect, test, type Page } from "@playwright/test";

import { importTestSheet } from "./fixtures/sheets";
import {
  clearDatabases,
  clearRecordingHistory,
  PRACTICE_SESSION_DB_NAME,
  RECORDING_HISTORY_STORAGE_KEY,
  readPracticeSnapshot,
  SHEET_LIBRARY_DB_NAME
} from "./fixtures/storage";

const recordingHarnessEvent = "sheet-practice-controls:set-recording-harness-active";

type PracticeSnapshot = {
  sessions: Array<{
    id: string;
    sourceType: string;
    sheetId: string | null;
    durationMs: number;
    recordingCount: number;
    latestRecordingId: string | null;
  }>;
  recordings: Array<{
    id: string;
    type: string;
    sessionId: string;
    sheetId: string;
    durationMs: number;
    audioDataUrl?: string | null;
  }>;
};

async function getPracticeSnapshot(page: Page) {
  return readPracticeSnapshot<PracticeSnapshot>(page);
}

async function getSheetLastPracticedAt(page: Page, sheetId: string) {
  return page.evaluate(
    ({ databaseName, id }: { databaseName: string; id: string }) =>
      new Promise<string | null>((resolve, reject) => {
        const openRequest = indexedDB.open(databaseName);

        openRequest.onerror = () => reject(openRequest.error);
        openRequest.onsuccess = () => {
          const database = openRequest.result;
          const transaction = database.transaction(["sheets"], "readonly");
          const request = transaction.objectStore("sheets").get(id);

          request.onsuccess = () => {
            database.close();
            resolve((request.result?.lastPracticedAt as string | null | undefined) ?? null);
          };
          request.onerror = () => reject(request.error);
        };
      }),
    { databaseName: SHEET_LIBRARY_DB_NAME, id: sheetId }
  );
}

async function seedQuickSession(page: Page) {
  await page.evaluate((storageKey) => {
    const startedAt = new Date(Date.now() - 60_000).toISOString();
    const endedAt = new Date(Date.now() - 30_000).toISOString();

    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        sessions: [
          {
            id: "quick-session-e2e",
            sourceType: "quick",
            startedAt,
            endedAt,
            settings: {
              bpm: 120,
              timeSignature: "4/4"
            }
          }
        ],
        recordings: [],
        errorMarkers: []
      })
    );
  }, RECORDING_HISTORY_STORAGE_KEY);
}

async function deleteSheetRecord(page: Page, sheetId: string) {
  await page.evaluate(
    ({ databaseName, id }: { databaseName: string; id: string }) =>
      new Promise<void>((resolve, reject) => {
        const openRequest = indexedDB.open(databaseName);

        openRequest.onerror = () => reject(openRequest.error);
        openRequest.onsuccess = () => {
          const database = openRequest.result;
          const transaction = database.transaction(["sheets", "artifacts"], "readwrite");

          transaction.objectStore("artifacts").delete(id);
          transaction.objectStore("sheets").delete(id);
          transaction.oncomplete = () => {
            database.close();
            resolve();
          };
          transaction.onerror = () => reject(transaction.error);
        };
      }),
    { databaseName: SHEET_LIBRARY_DB_NAME, id: sheetId }
  );
}

test("sheet practice session starts only on activity, persists, keeps recording independent, and drives continue", async ({
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
      __sheetPracticeControlsTestHarness?: boolean;
    };

    e2eWindow.__sheetPracticeControlsTestHarness = true;
  });

  await page.goto("/sheet-library");
  await clearRecordingHistory(page);
  await clearDatabases(page, [SHEET_LIBRARY_DB_NAME, PRACTICE_SESSION_DB_NAME]);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Sheet Library" })).toBeVisible();
  const { link, sheetId } = await importTestSheet(page, {
    name: "Session Contract Sheet",
    bpm: "72",
    timeSignature: "4/4"
  });

  await link.click();
  await expect(page.getByRole("heading", { name: "Session Contract Sheet" })).toBeVisible();
  await expect(page.getByTestId("sheet-practice-controls")).toBeVisible();
  await expect(page.getByTestId("sheet-session-id")).toHaveText("none");
  expect(await getPracticeSnapshot(page)).toEqual({ sessions: [], recordings: [] });

  await seedQuickSession(page);
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Continue quick practice" })).toHaveAttribute(
    "href",
    "/quick-metronome"
  );
  await page.goto(`/sheet-practice/${sheetId}`);
  await expect(page.getByRole("heading", { name: "Session Contract Sheet" })).toBeVisible();

  await page.getByRole("button", { name: "Start metronome" }).click();
  await expect(page.getByTestId("sheet-session-source")).toHaveText("sheet");
  await expect(page.getByTestId("sheet-session-sheet-id")).toHaveText(sheetId);
  await expect(page.getByTestId("sheet-metronome-state")).toContainText("Playing");
  await expect(page.getByTestId("sheet-recording-state")).toContainText("stopped");

  let snapshot = await getPracticeSnapshot(page);
  expect(snapshot.sessions).toHaveLength(1);
  expect(snapshot.sessions[0]).toMatchObject({
    sourceType: "sheet",
    sheetId,
    recordingCount: 0,
    latestRecordingId: null
  });
  expect(snapshot.recordings).toEqual([]);
  await expect.poll(() => getSheetLastPracticedAt(page, sheetId)).not.toBeNull();

  const sessionId = snapshot.sessions[0]?.id ?? "";

  await page.getByRole("button", { name: "Stop metronome" }).click();
  await expect(page.getByTestId("sheet-metronome-state")).toContainText("Stopped");
  await page.reload();
  await expect(page.getByTestId("sheet-practice-controls")).toBeVisible();
  await expect(page.getByTestId("sheet-session-id")).toHaveText(sessionId);

  await page.goto("/");
  const continueLink = page.getByRole("link", { name: "Continue sheet practice Session Contract Sheet" });

  await expect(continueLink).toBeVisible();
  await expect(continueLink).toHaveAttribute("href", `/sheet-practice/${sheetId}`);
  await continueLink.click();
  await expect(page).toHaveURL(new RegExp(`/sheet-practice/${sheetId}$`));

  await expect(page.getByRole("button", { name: "Start recording harness" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Stop recording harness" })).toHaveCount(0);

  await page.evaluate((eventName) => {
    window.dispatchEvent(new CustomEvent(eventName, { detail: { active: true } }));
  }, recordingHarnessEvent);
  await expect(page.getByTestId("sheet-recording-state")).toContainText("active");
  await expect(page.getByTestId("sheet-metronome-state")).toContainText("Stopped");
  await page.getByRole("button", { name: "Start metronome" }).click();
  await expect(page.getByTestId("sheet-recording-state")).toContainText("active");
  await expect(page.getByTestId("sheet-metronome-state")).toContainText("Playing");
  await page.getByRole("button", { name: "Stop metronome" }).click();
  await expect(page.getByTestId("sheet-recording-state")).toContainText("active");
  await expect(page.getByTestId("sheet-metronome-state")).toContainText("Stopped");
  await page.evaluate((eventName) => {
    window.dispatchEvent(new CustomEvent(eventName, { detail: { active: false } }));
  }, recordingHarnessEvent);
  await expect(page.getByTestId("sheet-recording-count")).toContainText("0");

  await page.getByRole("button", { name: "Start metronome" }).click();
  await page.evaluate((eventName) => {
    window.dispatchEvent(new CustomEvent(eventName, { detail: { active: true } }));
    window.dispatchEvent(new CustomEvent(eventName, { detail: { active: false } }));
  }, recordingHarnessEvent);
  await expect(page.getByTestId("sheet-metronome-state")).toContainText("Playing");
  await expect(page.getByTestId("sheet-recording-state")).toContainText("stopped");
  await page.getByRole("button", { name: "Stop metronome" }).click();

  snapshot = await getPracticeSnapshot(page);
  expect(snapshot.sessions).toHaveLength(1);
  expect(snapshot.sessions[0]?.id).toBe(sessionId);
  expect(snapshot.sessions[0]?.recordingCount).toBe(0);
  expect(snapshot.sessions[0]?.latestRecordingId).toBeNull();
  expect(snapshot.recordings).toEqual([]);

  await deleteSheetRecord(page, sheetId);
  await page.goto("/");
  await expect(page.getByRole("region", { name: "Continue Practice" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Continue sheet practice Session Contract Sheet" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Continue Practice", exact: true })).toHaveCount(0);

  await page.goto("/sheet-practice/unknown-sheet");
  await expect(page.getByText("Sheet not found")).toBeVisible();
  await expect(page.getByRole("button", { name: "Start metronome" })).toHaveCount(0);
  snapshot = await getPracticeSnapshot(page);
  expect(snapshot.sessions.some((session) => session.sheetId === "unknown-sheet")).toBe(false);

  expect(consoleErrors).toEqual([]);
});
