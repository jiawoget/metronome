import type { Page } from "@playwright/test";

import { RECORDING_HISTORY_STORAGE_KEY } from "@/infrastructure/storage/storage-contracts";

export {
  MEASURE_GRID_DB_NAME,
  PRACTICE_SEGMENT_DB_NAME,
  PRACTICE_SESSION_DB_NAME,
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
