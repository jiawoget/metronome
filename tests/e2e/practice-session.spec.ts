import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const sheetFixturesDir = path.resolve(currentDir, "../../test-fixtures/sheets");
const sheetDbName = "metronome-practice-v0-sheet-library";
const practiceDbName = "metronome-practice-v0-practice-sessions";
const recordingHistoryStorageKey = "metronome-practice:v0:quick-recordings";

type SessionSnapshot = Array<{
  id: string;
  sourceType: "quick" | "sheet";
  sheetId: string | null;
  startedAt: string;
  durationMs: number;
  recordingCount: number;
  latestRecordingId: string | null;
}>;

async function deleteDatabase(page: Page, databaseName: string) {
  await page.evaluate(
    (name) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase(name);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        request.onblocked = () => resolve();
      }),
    databaseName
  );
}

async function clearBrowserData(page: Page) {
  await page.goto("/");
  await page.evaluate((storageKey) => {
    window.localStorage.clear();
    window.localStorage.removeItem(storageKey);
  }, recordingHistoryStorageKey);
  await deleteDatabase(page, practiceDbName);
  await deleteDatabase(page, sheetDbName);
}

async function getPracticeSessions(page: Page) {
  return page.evaluate(
    (databaseName) =>
      new Promise<SessionSnapshot>((resolve, reject) => {
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
          const request = transaction.objectStore("sessions").getAll();

          transaction.oncomplete = () => {
            database.close();
            resolve(request.result);
          };
          transaction.onerror = () => reject(transaction.error);
        };
      }),
    practiceDbName
  );
}

async function seedDateBoundarySessions(page: Page) {
  await page.evaluate(
    (databaseName) =>
      new Promise<void>((resolve, reject) => {
        const openRequest = indexedDB.open(databaseName);

        openRequest.onerror = () => reject(openRequest.error);
        openRequest.onsuccess = () => {
          const database = openRequest.result;
          const transaction = database.transaction(["sessions"], "readwrite");
          const store = transaction.objectStore("sessions");
          const today = new Date();
          const todayStarted = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate(),
            9,
            0,
            0
          );
          const previousStarted = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate() - 1,
            23,
            0,
            0
          );
          const todayStartedAt = todayStarted.toISOString();
          const previousStartedAt = previousStarted.toISOString();

          store.put({
            id: "today-boundary-session",
            sourceType: "quick",
            sheetId: null,
            startedAt: todayStartedAt,
            endedAt: new Date(todayStarted.getTime() + 120_000).toISOString(),
            durationMs: 120_000,
            bpm: 100,
            timeSignature: "4/4",
            recordingCount: 2,
            latestRecordingId: "today-boundary-recording",
            updatedAt: todayStartedAt
          });
          store.put({
            id: "previous-boundary-session",
            sourceType: "quick",
            sheetId: null,
            startedAt: previousStartedAt,
            endedAt: new Date(previousStarted.getTime() + 600_000).toISOString(),
            durationMs: 600_000,
            bpm: 100,
            timeSignature: "4/4",
            recordingCount: 5,
            latestRecordingId: "previous-boundary-recording",
            updatedAt: previousStartedAt
          });

          transaction.oncomplete = () => {
            database.close();
            window.dispatchEvent(new Event("practice-session-change"));
            resolve();
          };
          transaction.onerror = () => reject(transaction.error);
        };
      }),
    practiceDbName
  );
}

async function importSheet(page: Page) {
  await page.goto("/sheet-library");
  await page.getByLabel("File").setInputFiles(path.join(sheetFixturesDir, "real-sheet.png"));
  await expect(page.getByText(/^Ready:/)).toBeVisible();
  await page.getByLabel("Name").fill("Practice Session Sheet");
  await page.getByRole("button", { name: "Save Imported Sheet" }).click();
  await expect(page.getByRole("heading", { name: "Practice Session Sheet" })).toBeVisible();

  const href = await page.getByRole("link", { name: "Open Sheet Practice" }).first().getAttribute("href");
  const sheetId = new URL(href ?? "", "http://127.0.0.1").pathname.split("/").pop() ?? "";

  expect(sheetId).toBeTruthy();

  return sheetId;
}

test("practice sessions drive quick, sheet, summary, recording links, reload, and clear data", async ({ page }) => {
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
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: async () => {
          const audioWindow = window as Window &
            typeof globalThis & { webkitAudioContext?: typeof AudioContext };
          const AudioContextConstructor = audioWindow.AudioContext || audioWindow.webkitAudioContext;
          const audioContext = new AudioContextConstructor();
          const destination = audioContext.createMediaStreamDestination();
          const oscillator = audioContext.createOscillator();
          const gain = audioContext.createGain();

          oscillator.frequency.value = 440;
          gain.gain.value = 0.2;
          oscillator.connect(gain);
          gain.connect(destination);
          oscillator.start();

          return destination.stream;
        }
      }
    });
  });

  await clearBrowserData(page);
  await page.goto("/quick-metronome");
  await page.getByRole("button", { name: "Start metronome" }).click();
  await expect(page.getByText("Metronome playing.")).toBeVisible();
  await page.waitForTimeout(250);
  await page.getByRole("button", { name: "Stop metronome" }).click();
  await expect(page.getByText("Metronome stopped.")).toBeVisible();

  let sessions = await getPracticeSessions(page);
  const quickSession = sessions.find((session) => session.sourceType === "quick");

  expect(quickSession).toMatchObject({
    sourceType: "quick",
    sheetId: null,
    recordingCount: 0,
    latestRecordingId: null
  });

  await page.goto("/");
  await expect(page.getByRole("link", { name: "Continue Practice" })).toHaveAttribute("href", "/quick-metronome");

  await page.goto("/quick-metronome");
  await page.getByRole("button", { name: "Start recording" }).click();
  await expect(page.getByText("Recording without metronome.")).toBeVisible();
  await page.waitForTimeout(700);
  await page.getByRole("button", { name: "Stop recording" }).click();
  await expect(page.getByText(/^Recording saved/)).toBeVisible();

  sessions = await getPracticeSessions(page);
  const quickWithRecording = sessions.find((session) => session.sourceType === "quick");

  expect(quickWithRecording?.recordingCount).toBe(1);
  expect(quickWithRecording?.latestRecordingId).toBeTruthy();

  const sheetId = await importSheet(page);

  await page.goto(`/sheet-practice/${sheetId}`);
  await page.getByRole("button", { name: "Start metronome" }).click();
  await expect(page.getByTestId("sheet-session-source")).toHaveText("sheet");
  await page.getByRole("button", { name: "Stop metronome" }).click();
  await expect(page.getByTestId("sheet-metronome-state")).toContainText("Stopped");

  await page.goto("/");
  await expect(page.getByRole("link", { name: "Continue Practice" })).toHaveAttribute(
    "href",
    `/sheet-practice/${sheetId}`
  );

  await seedDateBoundarySessions(page);
  await page.reload();

  sessions = await getPracticeSessions(page);

  expect(sessions).toHaveLength(5);
  expect(sessions.filter((session) => session.sourceType === "quick")).toHaveLength(4);
  await expect(page.getByTestId("today-summary-minutes")).toHaveText("2");
  await expect(page.getByTestId("today-summary-sessions")).toHaveText("4");
  await expect(page.getByTestId("today-summary-recordings")).toHaveText("3");

  await page.reload();
  await expect(page.getByRole("link", { name: "Continue Practice" })).toHaveAttribute(
    "href",
    `/sheet-practice/${sheetId}`
  );
  await expect(page.getByTestId("today-summary-sessions")).toHaveText("4");

  await page.goto("/settings");
  await expect(page.getByTestId("settings-count-sessions")).not.toHaveText("0");
  await page.getByRole("button", { name: "Clear All Local Data" }).click();
  await page.getByRole("button", { name: "Confirm clear local data" }).click();
  await expect(page.getByText("All local data was cleared and settings returned to defaults.")).toBeVisible();
  await expect(page.getByTestId("settings-count-sessions")).toHaveText("0");

  await page.goto("/");
  await expect(page.getByText(/No recent practice session yet/i)).toBeVisible();
  await expect(page.getByTestId("today-summary-sessions")).toHaveText("0");
  await expect(page.getByTestId("today-summary-recordings")).toHaveText("0");
  await page.reload();
  await expect(page.getByTestId("today-summary-sessions")).toHaveText("0");
  await expect(getPracticeSessions(page)).resolves.toEqual([]);
  await expect(page.evaluate((storageKey) => window.localStorage.getItem(storageKey), recordingHistoryStorageKey)).resolves.toBe(
    JSON.stringify({ sessions: [], recordings: [], errorMarkers: [] })
  );
  expect(consoleErrors).toEqual([]);
});
