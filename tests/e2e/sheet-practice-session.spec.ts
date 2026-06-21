import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const sheetFixturesDir = path.resolve(currentDir, "../../test-fixtures/sheets");
const sheetDbName = "metronome-practice-v0-sheet-library";
const practiceDbName = "metronome-practice-v0-practice-sessions";
const recordingHistoryStorageKey = "metronome-practice:v0:quick-recordings";

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

async function clearDatabases(page: Page) {
  await page.goto("/sheet-library");
  await page.evaluate((storageKey) => window.localStorage.removeItem(storageKey), recordingHistoryStorageKey);
  await deleteDatabase(page, sheetDbName);
  await deleteDatabase(page, practiceDbName);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Sheet Library" })).toBeVisible();
}

async function importSheet(page: Page) {
  await page.goto("/sheet-library");
  await page.getByLabel("File").setInputFiles(path.join(sheetFixturesDir, "real-sheet.png"));
  await expect(page.getByText(/^Ready:/)).toBeVisible();
  await page.getByLabel("Name").fill("Session Contract Sheet");
  await page.getByRole("button", { name: "Save Imported Sheet" }).click();
  await expect(page.getByRole("heading", { name: "Session Contract Sheet" })).toBeVisible();

  const link = page.getByRole("link", { name: "Open Sheet Practice" }).first();
  const href = await link.getAttribute("href");
  const sheetId = new URL(href ?? "", "http://127.0.0.1").pathname.split("/").pop() ?? "";

  expect(sheetId).toBeTruthy();

  return { link, sheetId: sheetId ?? "" };
}

async function getPracticeSnapshot(page: Page) {
  return page.evaluate(
    ({ databaseName, storageKey }: { databaseName: string; storageKey: string }) =>
      new Promise<{
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
    { databaseName: practiceDbName, storageKey: recordingHistoryStorageKey }
  );
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
    { databaseName: sheetDbName, id: sheetId }
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
  }, recordingHistoryStorageKey);
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
    { databaseName: sheetDbName, id: sheetId }
  );
}

test("sheet practice session starts only on activity, persists, links metadata, and drives continue", async ({
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

  await clearDatabases(page);
  const { link, sheetId } = await importSheet(page);

  await link.click();
  await expect(page.getByRole("heading", { name: "Session Contract Sheet" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sheet Practice Session" })).toBeVisible();
  await expect(page.getByTestId("sheet-session-id")).toHaveText("none");
  expect(await getPracticeSnapshot(page)).toEqual({ sessions: [], recordings: [] });

  await seedQuickSession(page);
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Continue Practice" })).toHaveAttribute("href", "/quick-metronome");
  await page.goto(`/sheet-practice/${sheetId}`);
  await expect(page.getByRole("heading", { name: "Session Contract Sheet" })).toBeVisible();

  await page.getByRole("button", { name: "Start metronome trigger" }).click();
  await expect(page.getByTestId("sheet-session-source")).toHaveText("sheet");
  await expect(page.getByTestId("sheet-session-sheet-id")).toHaveText(sheetId);
  await expect(page.getByTestId("sheet-metronome-state")).toContainText("active");
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

  await page.getByRole("button", { name: "Stop metronome trigger" }).click();
  await expect(page.getByTestId("sheet-metronome-state")).toContainText("stopped");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Sheet Practice Session" })).toBeVisible();
  await expect(page.getByTestId("sheet-session-id")).toHaveText(sessionId);

  await page.goto("/");
  const continueLink = page.getByRole("link", { name: "Continue Practice" });

  await expect(continueLink).toBeVisible();
  await expect(continueLink).toHaveAttribute("href", `/sheet-practice/${sheetId}`);
  await continueLink.click();
  await expect(page).toHaveURL(new RegExp(`/sheet-practice/${sheetId}$`));

  await page.getByRole("button", { name: "Start recording trigger" }).click();
  await expect(page.getByTestId("sheet-recording-state")).toContainText("active");
  await expect(page.getByTestId("sheet-metronome-state")).toContainText("stopped");
  await page.getByRole("button", { name: "Start metronome trigger" }).click();
  await expect(page.getByTestId("sheet-recording-state")).toContainText("active");
  await expect(page.getByTestId("sheet-metronome-state")).toContainText("active");
  await page.getByRole("button", { name: "Stop metronome trigger" }).click();
  await expect(page.getByTestId("sheet-recording-state")).toContainText("active");
  await expect(page.getByTestId("sheet-metronome-state")).toContainText("stopped");
  await page.getByRole("button", { name: "Stop recording trigger" }).click();
  await expect(page.getByTestId("sheet-recording-count")).toContainText("1");

  await page.getByRole("button", { name: "Start metronome trigger" }).click();
  await page.getByRole("button", { name: "Start recording trigger" }).click();
  await page.getByRole("button", { name: "Stop recording trigger" }).click();
  await expect(page.getByTestId("sheet-metronome-state")).toContainText("active");
  await expect(page.getByTestId("sheet-recording-state")).toContainText("stopped");
  await page.getByRole("button", { name: "Stop metronome trigger" }).click();

  snapshot = await getPracticeSnapshot(page);
  expect(snapshot.sessions).toHaveLength(1);
  expect(snapshot.sessions[0]?.id).toBe(sessionId);
  expect(snapshot.sessions[0]?.recordingCount).toBe(2);
  expect(snapshot.recordings.map((recording) => recording.id)).toContain(snapshot.sessions[0]?.latestRecordingId);
  expect(snapshot.recordings).toHaveLength(2);
  expect(snapshot.recordings.every((recording) => recording.sessionId === sessionId && recording.sheetId === sheetId)).toBe(true);
  expect(snapshot.recordings.every((recording) => recording.audioDataUrl === null)).toBe(true);

  await page.goto("/recordings");
  await expect(page.getByRole("heading", { name: "Recordings" })).toBeVisible();
  await page.getByRole("textbox", { name: "Search recordings" }).fill("Session Contract Sheet");
  await expect(page.getByTestId("recordings-list")).toBeVisible();
  await expect(page.getByText("Sheet practice metadata").first()).toBeVisible();
  await expect(page.getByText("Session Contract Sheet").first()).toBeVisible();
  await expect(page.getByTestId("recording-artifact-error")).toContainText("no accessible audio artifact");

  await deleteSheetRecord(page, sheetId);
  await page.goto("/");
  await expect(page.getByText(/No recent practice session yet/i)).toBeVisible();
  await expect(page.getByRole("link", { name: "Continue Practice" })).toHaveCount(0);

  await page.goto("/sheet-practice/unknown-sheet");
  await expect(page.getByText("Sheet not found")).toBeVisible();
  await expect(page.getByRole("button", { name: "Start metronome trigger" })).toHaveCount(0);
  snapshot = await getPracticeSnapshot(page);
  expect(snapshot.sessions.some((session) => session.sheetId === "unknown-sheet")).toBe(false);

  expect(consoleErrors).toEqual([]);
});
