import { expect, test, type Page } from "@playwright/test";

const sheetDbName = "metronome-practice-v0-sheet-library";
const referenceDbName = "metronome-practice-v0-references";
const practiceDbName = "metronome-practice-v0-practice-sessions";
const settingsDbName = "metronome-practice-v0-settings";
const recordingStorageKey = "metronome-practice:v0:quick-recordings";

async function clearStores(page: Page, databaseName: string, storeNames: string[]) {
  await page.evaluate(
    ({ name, stores }) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open(name);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          const availableStores = stores.filter((storeName) => database.objectStoreNames.contains(storeName));

          if (availableStores.length === 0) {
            database.close();
            resolve();
            return;
          }

          const transaction = database.transaction(availableStores, "readwrite");

          for (const storeName of availableStores) {
            transaction.objectStore(storeName).clear();
          }

          transaction.oncomplete = () => {
            database.close();
            resolve();
          };
          transaction.onerror = () => {
            database.close();
            reject(transaction.error);
          };
        };
      }),
    { name: databaseName, stores: storeNames }
  );
}

async function seedLocalData(page: Page) {
  await clearStores(page, sheetDbName, ["sheets", "artifacts"]);
  await clearStores(page, referenceDbName, ["references", "artifacts"]);
  await clearStores(page, practiceDbName, ["sessions"]);

  await page.evaluate(
    ({ sheetDatabaseName, referenceDatabaseName, practiceDatabaseName, storageKey }) =>
      new Promise<void>((resolve, reject) => {
        const now = new Date("2026-06-22T08:00:00.000Z").toISOString();
        const sheetOpenRequest = indexedDB.open(sheetDatabaseName);

        sheetOpenRequest.onerror = () => reject(sheetOpenRequest.error);
        sheetOpenRequest.onsuccess = () => {
          const sheetDatabase = sheetOpenRequest.result;
          const sheetTransaction = sheetDatabase.transaction(["sheets", "artifacts"], "readwrite");
          const sheet = {
            id: "settings-sheet",
            name: "Settings Seed Sheet",
            category: "song",
            kind: "pdf",
            bpm: 118,
            timeSignature: "4/4",
            pageCount: 1,
            imageCount: 0,
            imageDimensions: [],
            mimeTypes: ["application/pdf"],
            sizeBytes: 12,
            originalFileNames: ["settings-seed.pdf"],
            createdAt: now,
            updatedAt: now,
            lastPracticedAt: now
          };

          sheetTransaction.objectStore("sheets").put(sheet);
          sheetTransaction.objectStore("artifacts").put(
            {
              sheetId: sheet.id,
              kind: "pdf",
              files: [{ name: "settings-seed.pdf", type: "application/pdf", size: 12, blob: new Blob(["%PDF-1.4"]) }],
              createdAt: now
            }
          );
          sheetTransaction.oncomplete = () => {
            sheetDatabase.close();
            const referenceOpenRequest = indexedDB.open(referenceDatabaseName);

            referenceOpenRequest.onerror = () => reject(referenceOpenRequest.error);
            referenceOpenRequest.onsuccess = () => {
              const referenceDatabase = referenceOpenRequest.result;
              const referenceTransaction = referenceDatabase.transaction(["references", "artifacts"], "readwrite");

              referenceTransaction.objectStore("references").put({
                id: "settings-reference",
                sheetId: sheet.id,
                kind: "local-audio",
                title: "Settings Reference",
                fileName: "reference.wav",
                mimeType: "audio/wav",
                sizeBytes: 16,
                durationMs: 500,
                createdAt: now,
                updatedAt: now,
                isActive: true
              });
              referenceTransaction.objectStore("artifacts").put(
                {
                  referenceId: "settings-reference",
                  sheetId: sheet.id,
                  fileName: "reference.wav",
                  mimeType: "audio/wav",
                  sizeBytes: 16,
                  blob: new Blob(["RIFF-reference"], { type: "audio/wav" }),
                  createdAt: now
                }
              );
              referenceTransaction.oncomplete = () => {
                referenceDatabase.close();
                const practiceOpenRequest = indexedDB.open(practiceDatabaseName);

                practiceOpenRequest.onerror = () => reject(practiceOpenRequest.error);
                practiceOpenRequest.onsuccess = () => {
                  const practiceDatabase = practiceOpenRequest.result;
                  const practiceTransaction = practiceDatabase.transaction(["sessions"], "readwrite");

                  practiceTransaction.objectStore("sessions").put({
                    id: "settings-session",
                    sourceType: "sheet",
                    sheetId: sheet.id,
                    startedAt: now,
                    endedAt: null,
                    durationMs: 120000,
                    bpm: 118,
                    timeSignature: "4/4",
                    recordingCount: 1,
                    latestRecordingId: "settings-recording",
                    updatedAt: now
                  });
                  practiceTransaction.oncomplete = () => {
                    practiceDatabase.close();
                    window.localStorage.setItem(
                      storageKey,
                      JSON.stringify({
                        sessions: [{ id: "quick-session", sourceType: "quick", startedAt: now, endedAt: null }],
                        recordings: [
                          {
                            id: "settings-recording",
                            type: "sheet",
                            origin: "user",
                            name: "Settings Recording",
                            sessionId: "settings-session",
                            sheetId: sheet.id,
                            sheetName: sheet.name,
                            createdAt: now,
                            durationMs: 1200,
                            sizeBytes: 32,
                            mimeType: "audio/wav",
                            audioDataUrl: "data:audio/wav;base64,UklGRg==",
                            settings: {
                              bpm: 118,
                              timeSignature: "4/4"
                            }
                          }
                        ],
                        errorMarkers: [
                          {
                            id: "settings-marker",
                            recordingId: "settings-recording",
                            timestampMs: 400,
                            note: "Needs cleanup"
                          }
                        ]
                      })
                    );
                    resolve();
                  };
                  practiceTransaction.onerror = () => {
                    practiceDatabase.close();
                    reject(practiceTransaction.error);
                  };
                };
              };
              referenceTransaction.onerror = () => {
                referenceDatabase.close();
                reject(referenceTransaction.error);
              };
            };
          };
          sheetTransaction.onerror = () => {
            sheetDatabase.close();
            reject(sheetTransaction.error);
          };
        };
      }),
    {
      sheetDatabaseName: sheetDbName,
      referenceDatabaseName: referenceDbName,
      practiceDatabaseName: practiceDbName,
      storageKey: recordingStorageKey
    }
  );
}

type PersistenceSnapshot = {
  sheets: number;
  sheetArtifacts: number;
  references: number;
  referenceArtifacts: number;
  recordings: number;
  recordingArtifacts: number;
  errorMarkers: number;
  practiceSessions: number;
  recordingHistorySessions: number;
  settingsRecords: number;
  settingsValue: {
    defaultBpm?: number;
    defaultTimeSignature?: string;
    defaultSubdivision?: string;
    metronomeVolume?: number;
    referenceDefaultVolume?: number;
  } | null;
};

async function countStores(page: Page, databaseName: string, storeNames: string[]) {
  return page.evaluate(
    ({ name, stores }) =>
      new Promise<Record<string, number>>((resolve, reject) => {
        const request = indexedDB.open(name);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          const availableStores = stores.filter((storeName) => database.objectStoreNames.contains(storeName));
          const result = Object.fromEntries(stores.map((storeName) => [storeName, 0]));

          if (availableStores.length === 0) {
            database.close();
            resolve(result);
            return;
          }

          const transaction = database.transaction(availableStores, "readonly");

          for (const storeName of availableStores) {
            const countRequest = transaction.objectStore(storeName).count();

            countRequest.onsuccess = () => {
              result[storeName] = countRequest.result;
            };
          }

          transaction.oncomplete = () => {
            database.close();
            resolve(result);
          };
          transaction.onerror = () => {
            database.close();
            reject(transaction.error);
          };
        };
      }),
    { name: databaseName, stores: storeNames }
  );
}

async function getSettingsValue(page: Page) {
  return page.evaluate(
    (databaseName) =>
      new Promise<PersistenceSnapshot["settingsValue"]>((resolve, reject) => {
        const request = indexedDB.open(databaseName);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;

          if (!database.objectStoreNames.contains("settings")) {
            database.close();
            resolve(null);
            return;
          }

          const transaction = database.transaction(["settings"], "readonly");
          const settingsRequest = transaction.objectStore("settings").get("user-settings");

          settingsRequest.onsuccess = () => {
            const value = settingsRequest.result?.value ?? null;

            database.close();
            resolve(value);
          };
          settingsRequest.onerror = () => {
            database.close();
            reject(settingsRequest.error);
          };
        };
      }),
    settingsDbName
  );
}

async function getPersistenceSnapshot(page: Page): Promise<PersistenceSnapshot> {
  const [sheetStores, referenceStores, practiceStores, settingsStores, settingsValue, recordingSnapshot] =
    await Promise.all([
      countStores(page, sheetDbName, ["sheets", "artifacts"]),
      countStores(page, referenceDbName, ["references", "artifacts"]),
      countStores(page, practiceDbName, ["sessions"]),
      countStores(page, settingsDbName, ["settings"]),
      getSettingsValue(page),
      page.evaluate((storageKey) => {
        const rawValue = window.localStorage.getItem(storageKey);
        const parsed = rawValue
          ? (JSON.parse(rawValue) as {
              sessions?: unknown[];
              recordings?: Array<{ audioDataUrl?: string | null }>;
              errorMarkers?: unknown[];
            })
          : {};

        return {
          sessions: parsed.sessions?.length ?? 0,
          recordings: parsed.recordings?.length ?? 0,
          recordingArtifacts: parsed.recordings?.filter((recording) => !!recording.audioDataUrl).length ?? 0,
          errorMarkers: parsed.errorMarkers?.length ?? 0
        };
      }, recordingStorageKey)
    ]);

  return {
    sheets: sheetStores.sheets ?? 0,
    sheetArtifacts: sheetStores.artifacts ?? 0,
    references: referenceStores.references ?? 0,
    referenceArtifacts: referenceStores.artifacts ?? 0,
    recordings: recordingSnapshot.recordings,
    recordingArtifacts: recordingSnapshot.recordingArtifacts,
    errorMarkers: recordingSnapshot.errorMarkers,
    practiceSessions: practiceStores.sessions ?? 0,
    recordingHistorySessions: recordingSnapshot.sessions,
    settingsRecords: settingsStores.settings ?? 0,
    settingsValue
  };
}

test("settings persist and clear all local data across reloads", async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/settings");
  await seedLocalData(page);
  await page.reload();

  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await expect(page.getByTestId("settings-count-sheets")).toHaveText("1");
  await expect(page.getByTestId("settings-count-recordings")).toHaveText("1");
  await expect(page.getByTestId("settings-count-references")).toHaveText("1");
  await expect(page.getByTestId("settings-count-markers")).toHaveText("1");
  await expect(page.getByTestId("settings-count-sessions")).toHaveText("2");
  await expect(page.getByTestId("settings-storage-estimate")).toBeVisible();
  await expect(page.getByTestId("settings-microphone-status")).toBeVisible();
  await expect(page.getByText("v0 does not include account controls, cloud sync")).toBeVisible();

  await page.getByTestId("settings-default-bpm").fill("142");
  await page.keyboard.press("Enter");
  await page.getByTestId("settings-time-signature").selectOption("6/8");
  await page.getByTestId("settings-subdivision").selectOption("sixteenth");
  await page.getByLabel("Metronome volume").fill("55");
  await page.getByLabel("Reference default volume").fill("45");

  await expect.poll(() => getSettingsValue(page)).toMatchObject({
    defaultBpm: 142,
    defaultTimeSignature: "6/8",
    defaultSubdivision: "sixteenth",
    metronomeVolume: 55,
    referenceDefaultVolume: 45
  });

  await page.reload();
  await expect(page.getByTestId("settings-default-bpm")).toHaveValue("142");
  await expect(page.getByTestId("settings-time-signature")).toHaveValue("6/8");
  await expect(page.getByTestId("settings-subdivision")).toHaveValue("sixteenth");
  await expect(page.getByTestId("settings-metronome-volume")).toHaveText("55");
  await expect(page.getByTestId("settings-reference-volume")).toHaveText("45");

  await expect.poll(() => getPersistenceSnapshot(page)).toMatchObject({
    sheets: 1,
    sheetArtifacts: 1,
    references: 1,
    referenceArtifacts: 1,
    recordings: 1,
    recordingArtifacts: 1,
    errorMarkers: 1,
    practiceSessions: 1,
    recordingHistorySessions: 1,
    settingsRecords: 1,
    settingsValue: {
      defaultBpm: 142,
      defaultTimeSignature: "6/8",
      defaultSubdivision: "sixteenth",
      metronomeVolume: 55,
      referenceDefaultVolume: 45
    }
  });

  await page.getByRole("button", { name: "Clear All Local Data" }).click();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByText("Cleanup canceled. Local data was not changed.")).toBeVisible();
  await expect(page.getByTestId("settings-count-sheets")).toHaveText("1");
  await expect(page.getByTestId("settings-count-recordings")).toHaveText("1");
  await expect.poll(() => getPersistenceSnapshot(page)).toMatchObject({
    sheets: 1,
    sheetArtifacts: 1,
    references: 1,
    referenceArtifacts: 1,
    recordings: 1,
    recordingArtifacts: 1,
    errorMarkers: 1,
    practiceSessions: 1,
    recordingHistorySessions: 1,
    settingsRecords: 1
  });

  await page.getByRole("button", { name: "Clear All Local Data" }).click();
  await page.getByRole("button", { name: "Confirm clear local data" }).click();
  await expect(page.getByText("All local data was cleared and settings returned to defaults.")).toBeVisible();
  await expect.poll(() => getPersistenceSnapshot(page)).toMatchObject({
    sheets: 0,
    sheetArtifacts: 0,
    references: 0,
    referenceArtifacts: 0,
    recordings: 0,
    recordingArtifacts: 0,
    errorMarkers: 0,
    practiceSessions: 0,
    recordingHistorySessions: 0,
    settingsRecords: 1,
    settingsValue: {
      defaultBpm: 96,
      defaultTimeSignature: "4/4",
      defaultSubdivision: "quarter",
      metronomeVolume: 80,
      referenceDefaultVolume: 100
    }
  });
  await page.reload();

  await expect(page.getByTestId("settings-default-bpm")).toHaveValue("96");
  await expect(page.getByTestId("settings-time-signature")).toHaveValue("4/4");
  await expect(page.getByTestId("settings-subdivision")).toHaveValue("quarter");
  await expect(page.getByTestId("settings-count-sheets")).toHaveText("0");
  await expect(page.getByTestId("settings-count-recordings")).toHaveText("0");
  await expect(page.getByTestId("settings-count-references")).toHaveText("0");
  await expect(page.getByTestId("settings-count-markers")).toHaveText("0");
  await expect(page.getByTestId("settings-count-sessions")).toHaveText("0");

  await page.goto("/sheet-library");
  await expect(page.getByText("No sheets imported yet")).toBeVisible();

  await page.goto("/recordings");
  await expect(page.getByTestId("recordings-empty-state")).toBeVisible();

  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test("settings shows browser fallback storage estimate and denied microphone status", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "storage", {
      configurable: true,
      value: {}
    });
    Object.defineProperty(navigator, "permissions", {
      configurable: true,
      value: {
        async query() {
          return { state: "denied" };
        }
      }
    });
  });

  await page.goto("/settings");

  await expect(page.getByTestId("settings-storage-estimate")).toContainText(
    "Storage estimate is not available in this browser."
  );
  await expect(page.getByTestId("settings-microphone-status")).toContainText("Microphone permission denied");
});
