import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const sheetFixturesDir = path.resolve(currentDir, "../../test-fixtures/sheets");
const sheetDbName = "metronome-practice-v0-sheet-library";
const referenceDbName = "metronome-practice-v0-references";
const practiceDbName = "metronome-practice-v0-practice-sessions";
const recordingHistoryStorageKey = "metronome-practice:v0:quick-recordings";

type ReferenceAudioSnapshot = {
  referenceId: string | null;
  state: "idle" | "playing" | "paused" | "error";
  currentTime: number;
  volume: number;
  duration: number;
  message: string | null;
};

function createReferenceWavBuffer() {
  const sampleRate = 44_100;
  const durationSeconds = 1.2;
  const sampleCount = Math.floor(sampleRate * durationSeconds);
  const dataSize = sampleCount * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let index = 0; index < sampleCount; index += 1) {
    const sample = Math.round(Math.sin((2 * Math.PI * 440 * index) / sampleRate) * 0.35 * 32767);

    buffer.writeInt16LE(sample, 44 + index * 2);
  }

  return buffer;
}

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
  await deleteDatabase(page, referenceDbName);
  await deleteDatabase(page, practiceDbName);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Sheet Library" })).toBeVisible();
}

async function installSyntheticMicrophone(page: Page, frequencyHz = 440) {
  await page.addInitScript((frequency) => {
    const e2eWindow = window as Window & {
      __referenceSyntheticAudioNodes?: unknown[];
    };

    e2eWindow.__referenceSyntheticAudioNodes = [];
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
          e2eWindow.__referenceSyntheticAudioNodes?.push({ audioContext, oscillator, gain });

          return destination.stream;
        }
      }
    });
  }, frequencyHz);
}

async function importSheet(page: Page) {
  await page.goto("/sheet-library");
  await page.getByLabel("File").setInputFiles(path.join(sheetFixturesDir, "real-sheet.png"));
  await expect(page.getByText(/^Ready:/)).toBeVisible();
  await page.getByLabel("Name").fill("Reference Contract Sheet");
  await page.getByLabel("BPM").fill("84");
  await page.getByLabel("Time signature").fill("4/4");
  await page.getByRole("button", { name: "Save Imported Sheet" }).click();
  await expect(page.getByRole("heading", { name: "Reference Contract Sheet" })).toBeVisible();

  const link = page.getByRole("link", { name: "Open Sheet Practice" }).first();
  const href = await link.getAttribute("href");
  const sheetId = new URL(href ?? "", "http://127.0.0.1").pathname.split("/").pop() ?? "";

  expect(sheetId).toBeTruthy();

  return { link, sheetId };
}

async function getReferenceSnapshot(page: Page, databaseName = referenceDbName) {
  return page.evaluate(
    (name) =>
      new Promise<{
        references: Array<{
          id: string;
          sheetId: string;
          kind: string;
          title: string;
          bvid?: string;
          isActive: boolean;
        }>;
        artifacts: Array<{
          referenceId: string;
          sheetId: string;
          sizeBytes: number;
          mimeType: string;
        }>;
      }>((resolve, reject) => {
        const request = indexedDB.open(name);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;

          if (!database.objectStoreNames.contains("references")) {
            database.close();
            resolve({ references: [], artifacts: [] });
            return;
          }

          const transaction = database.transaction(["references", "artifacts"], "readonly");
          const referencesRequest = transaction.objectStore("references").getAll();
          const artifactsRequest = transaction.objectStore("artifacts").getAll();

          transaction.oncomplete = () => {
            database.close();
            resolve({
              references: referencesRequest.result,
              artifacts: artifactsRequest.result
            });
          };
          transaction.onerror = () => reject(transaction.error);
        };
      }),
    databaseName
  );
}

test("reference system saves local audio and Bilibili references through Sheet Practice", async ({ page }) => {
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
    const testWindow = window as Window & {
      __referenceSystemUseFixtureSearch?: boolean;
      __referenceAudioSnapshots?: ReferenceAudioSnapshot[];
    };

    testWindow.__referenceSystemUseFixtureSearch = true;
    testWindow.__referenceAudioSnapshots = [];
    window.addEventListener("reference-audio:state-change", (event) => {
      testWindow.__referenceAudioSnapshots?.push((event as CustomEvent<ReferenceAudioSnapshot>).detail);
    });
  });
  await installSyntheticMicrophone(page);

  await page.setViewportSize({ width: 1280, height: 860 });
  await clearDatabases(page);
  const { link, sheetId } = await importSheet(page);

  await link.click();
  await expect(page).toHaveURL(new RegExp(`/sheet-practice/${sheetId}$`));
  await expect(page.getByRole("heading", { name: "Reference Contract Sheet" })).toBeVisible();
  await expect(page.getByTestId("reference-panel")).toBeVisible();
  await expect(page.getByTestId("active-reference-title")).toHaveText("No active reference");
  await expect(page.getByText(/Download|Extract|A-B loop|Playback speed|Offset/i)).toHaveCount(0);

  await page.getByLabel("Local title").fill("Tone Reference");
  await page.getByLabel("Local audio file").setInputFiles({
    name: "reference-tone.wav",
    mimeType: "audio/wav",
    buffer: createReferenceWavBuffer()
  });
  await page.getByRole("button", { name: "Save local reference" }).click();
  await expect(page.getByTestId("active-reference-title")).toHaveText("Tone Reference");
  await expect(page.getByTestId("active-reference-summary")).toContainText("reference-tone.wav");
  await expect(page.getByTestId("reference-count")).toContainText("1");

  let snapshot = await getReferenceSnapshot(page);

  expect(snapshot.references).toMatchObject([
    {
      sheetId,
      kind: "local-audio",
      title: "Tone Reference",
      isActive: true
    }
  ]);
  expect(snapshot.artifacts[0]).toMatchObject({
    sheetId,
    mimeType: "audio/wav"
  });
  expect(snapshot.artifacts[0]?.sizeBytes).toBeGreaterThan(1000);

  await page.getByRole("button", { name: "Play local reference" }).click();
  await expect(page.getByText("Local reference playing.")).toBeVisible();
  await expect(page.getByTestId("reference-playback-state")).toHaveText("playing");
  await expect(page.getByTestId("sheet-session-source")).toContainText("sheet");
  await page.waitForFunction(() => {
    const testWindow = window as Window & { __referenceAudioSnapshots?: ReferenceAudioSnapshot[] };

    return (testWindow.__referenceAudioSnapshots ?? []).some(
      (audioSnapshot) => audioSnapshot.state === "playing" && audioSnapshot.currentTime > 0.05
    );
  });

  await page.getByLabel("Reference volume").fill("0.35");
  await expect(page.getByTestId("reference-volume-state")).toHaveText("35");
  await page.getByRole("button", { name: "Pause local reference" }).click();
  await expect(page.getByText("Local reference paused.")).toBeVisible();
  await expect(page.getByTestId("reference-playback-state")).toHaveText("paused");
  const pausedTime = await page
    .getByTestId("reference-current-time")
    .textContent()
    .then((value) => Number(value));
  await page.waitForTimeout(400);
  const timeAfterPause = await page
    .getByTestId("reference-current-time")
    .textContent()
    .then((value) => Number(value));

  expect(timeAfterPause - pausedTime).toBeLessThan(0.08);

  await page.reload();
  await expect(page.getByTestId("active-reference-title")).toHaveText("Tone Reference");
  await page.getByRole("button", { name: "Play local reference" }).click();
  await expect(page.getByTestId("reference-playback-state")).toHaveText("playing");
  await page.getByRole("button", { name: "Pause local reference" }).click();

  await page.getByRole("button", { name: "Start recording" }).click();
  await expect(page.getByText("Recording without metronome.")).toBeVisible();
  await expect(page.getByTestId("sheet-recording-state")).toContainText("active");
  await page.getByRole("button", { name: "Start metronome" }).click();
  await expect(page.getByTestId("sheet-metronome-state")).toContainText(/Playing|Counting/);
  await page.getByRole("button", { name: "Play local reference" }).click();
  await expect(page.getByTestId("sheet-recording-state")).toContainText("active");
  await expect(page.getByTestId("sheet-metronome-state")).toContainText(/Playing|Counting/);
  await page.getByRole("button", { name: "Pause local reference" }).click();
  await page.getByRole("button", { name: "Stop metronome" }).click();
  await page.waitForTimeout(350);
  await page.getByRole("button", { name: "Stop recording" }).click();
  await expect(page.getByText("Recording saved.")).toBeVisible();
  await expect(page.getByTestId("sheet-recording-state")).toContainText("stopped");
  await expect(page.getByTestId("sheet-recording-count")).toContainText("1");

  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(page.getByTestId("reference-panel")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByTestId("reference-panel").scrollIntoViewIfNeeded();
  await expect(page.getByTestId("reference-panel")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save local reference" })).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 860 });

  await page.getByPlaceholder("Search Bilibili").fill("canon");
  await page.getByRole("button", { name: "Search Bilibili" }).click();
  await expect(page.getByTestId("bilibili-search-results")).toBeVisible();
  await page.getByRole("button", { name: /Canon in D guitar practice reference/ }).click();
  await page.getByRole("button", { name: "Save selected result" }).click();
  await expect(page.getByText("Bilibili search result saved as the active reference.")).toBeVisible();
  await expect(page.getByTestId("active-reference-title")).toHaveText("Canon in D guitar practice reference");
  await expect(page.getByRole("link", { name: "Open Bilibili reference" })).toHaveAttribute(
    "href",
    "https://www.bilibili.com/video/BV1ab411c7dE"
  );

  await page.reload();
  await expect(page.getByTestId("active-reference-title")).toHaveText("Canon in D guitar practice reference");
  await expect(page.getByTestId("active-reference-summary")).toContainText("BV1ab411c7dE");

  await page.getByLabel("URL title").fill("Pasted Bilibili");
  await page.getByRole("textbox", { name: "Bilibili URL" }).fill("https://www.bilibili.com/video/BV1XY411P7mn");
  await page.getByRole("button", { name: "Save Bilibili URL" }).click();
  await expect(page.getByText("Bilibili URL saved as the active reference.")).toBeVisible();
  await expect(page.getByTestId("active-reference-title")).toHaveText("Pasted Bilibili");
  await expect(page.getByTestId("active-reference-summary")).toContainText("BV1XY411P7mn");

  await page.getByRole("textbox", { name: "Bilibili URL" }).fill("https://example.com/video/BV1XY411P7mn");
  await page.getByRole("button", { name: "Save Bilibili URL" }).click();
  await expect(page.getByText("Enter a Bilibili video URL like https://www.bilibili.com/video/BV...")).toBeVisible();

  await page.getByPlaceholder("Search Bilibili").fill("force failure");
  await page.getByRole("button", { name: "Search Bilibili" }).click();
  await expect(page.getByText("Bilibili search failed. Keep your query and try again.")).toBeVisible();

  snapshot = await getReferenceSnapshot(page);
  expect(snapshot.references.filter((reference) => reference.sheetId === sheetId)).toHaveLength(3);
  expect(snapshot.references.filter((reference) => reference.isActive)).toMatchObject([
    {
      kind: "bilibili",
      title: "Pasted Bilibili",
      bvid: "BV1XY411P7mn"
    }
  ]);

  expect(consoleErrors).toEqual([]);
});
