import { expect, type Page } from "@playwright/test";

import {
  PRACTICE_SESSION_DB_NAME,
  RECORDING_HISTORY_STORAGE_KEY
} from "@/infrastructure/storage/storage-contracts";

export {
  MEASURE_GRID_DB_NAME,
  PRACTICE_SEGMENT_DB_NAME,
  PRACTICE_SESSION_DB_NAME,
  RECORDING_ARTIFACT_DB_NAME,
  RECORDING_HISTORY_STORAGE_KEY,
  REFERENCE_DB_NAME,
  SETTINGS_DB_NAME,
  SHEET_LIBRARY_DB_NAME
} from "@/infrastructure/storage/storage-contracts";

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

export async function clearDatabases(page: Page, databaseNames: string[]) {
  for (const databaseName of databaseNames) {
    await deleteDatabase(page, databaseName);
  }
}

export async function clearSheetLibraryTestState(page: Page, databaseNames: string[]) {
  await page.goto("/sheet-library");
  await clearRecordingHistory(page);
  await clearDatabases(page, databaseNames);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Sheet Library" })).toBeVisible();
}

export async function clearRecordingHistory(page: Page) {
  await page.evaluate(
    (storageKey) => window.localStorage.removeItem(storageKey),
    RECORDING_HISTORY_STORAGE_KEY
  );
}

export async function readRecordingHistory(page: Page) {
  return page.evaluate((storageKey) => {
    const rawValue = window.localStorage.getItem(storageKey);

    return rawValue
      ? JSON.parse(rawValue)
      : { sessions: [], recordings: [], errorMarkers: [] };
  }, RECORDING_HISTORY_STORAGE_KEY);
}

type PracticeSnapshotOptions = {
  includeErrorMarkers?: boolean;
};

async function readPracticeSessionRows(page: Page) {
  return page.evaluate(
    (databaseName) =>
      new Promise<unknown[]>((resolve, reject) => {
        const openExistingDatabase = () => {
          const openRequest = indexedDB.open(databaseName);

          openRequest.onerror = () => reject(openRequest.error);
          openRequest.onsuccess = () => {
            const database = openRequest.result;

            if (!database.objectStoreNames.contains("sessions")) {
              database.close();
              resolve([]);
              return;
            }

            const transaction = database.transaction(["sessions"], "readonly");
            const sessionsRequest = transaction.objectStore("sessions").getAll();

            transaction.oncomplete = () => {
              database.close();
              resolve(sessionsRequest.result);
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

            resolve([]);
          }, reject);
          return;
        }

        openExistingDatabase();
      }),
    PRACTICE_SESSION_DB_NAME
  );
}

export async function readPracticeSnapshot<
  TSnapshot extends { sessions: unknown[]; recordings: unknown[] }
>(
  page: Page,
  options: PracticeSnapshotOptions = {}
): Promise<TSnapshot> {
  const sessions = await readPracticeSessionRows(page);
  const recordingHistory = await readRecordingHistory(page);
  const snapshot = {
    sessions,
    recordings: Array.isArray(recordingHistory.recordings)
      ? recordingHistory.recordings
      : []
  } as { sessions: unknown[]; recordings: unknown[]; errorMarkers?: unknown[] };

  if (options.includeErrorMarkers) {
    snapshot.errorMarkers = Array.isArray(recordingHistory.errorMarkers)
      ? recordingHistory.errorMarkers
      : [];
  }

  return snapshot as TSnapshot;
}

export async function seedRecordingHistory(page: Page, snapshot: unknown) {
  await page.evaluate(
    ({
      storageKey,
      nextSnapshot
    }: {
      storageKey: string;
      nextSnapshot: unknown;
    }) => {
      window.localStorage.setItem(storageKey, JSON.stringify(nextSnapshot));
    },
    { storageKey: RECORDING_HISTORY_STORAGE_KEY, nextSnapshot: snapshot }
  );
}
