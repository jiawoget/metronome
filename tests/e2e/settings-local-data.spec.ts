import { expect, test, type Page } from "@playwright/test";

const sheetDbName = "metronome-practice-v0-sheet-library";
const referenceDbName = "metronome-practice-v0-references";
const practiceDbName = "metronome-practice-v0-practice-sessions";
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

  await page.reload();
  await expect(page.getByTestId("settings-default-bpm")).toHaveValue("142");
  await expect(page.getByTestId("settings-time-signature")).toHaveValue("6/8");
  await expect(page.getByTestId("settings-subdivision")).toHaveValue("sixteenth");
  await expect(page.getByTestId("settings-metronome-volume")).toHaveText("55");
  await expect(page.getByTestId("settings-reference-volume")).toHaveText("45");

  await page.getByRole("button", { name: "Clear All Local Data" }).click();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByText("Cleanup canceled. Local data was not changed.")).toBeVisible();
  await expect(page.getByTestId("settings-count-sheets")).toHaveText("1");
  await expect(page.getByTestId("settings-count-recordings")).toHaveText("1");

  await page.getByRole("button", { name: "Clear All Local Data" }).click();
  await page.getByRole("button", { name: "Confirm clear local data" }).click();
  await expect(page.getByText("All local data was cleared and settings returned to defaults.")).toBeVisible();
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
