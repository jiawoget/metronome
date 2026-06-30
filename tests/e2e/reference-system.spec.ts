import { expect, test, type Page } from "@playwright/test";
import { installSyntheticMicrophone } from "./fixtures/audio";
import { importTestSheet } from "./fixtures/sheets";
import {
  clearSheetLibraryTestState,
  PRACTICE_SESSION_DB_NAME,
  readRecordingHistory,
  REFERENCE_DB_NAME,
  SHEET_LIBRARY_DB_NAME
} from "./fixtures/storage";

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
    const sample = Math.round(
      Math.sin((2 * Math.PI * 440 * index) / sampleRate) * 0.35 * 32767
    );

    buffer.writeInt16LE(sample, 44 + index * 2);
  }

  return buffer;
}

async function clearState(page: Page) {
  await clearSheetLibraryTestState(page, [
    SHEET_LIBRARY_DB_NAME,
    REFERENCE_DB_NAME,
    PRACTICE_SESSION_DB_NAME
  ]);
}

async function getReferenceSnapshot(
  page: Page,
  databaseName = REFERENCE_DB_NAME
) {
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

          const transaction = database.transaction(
            ["references", "artifacts"],
            "readonly"
          );
          const referencesRequest = transaction
            .objectStore("references")
            .getAll();
          const artifactsRequest = transaction
            .objectStore("artifacts")
            .getAll();

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

async function getPracticeSnapshot(page: Page) {
  const sessions = await page.evaluate(
    (databaseName) =>
      new Promise<
        Array<{
          id: string;
          sourceType: string;
          sheetId: string | null;
          recordingCount: number;
          latestRecordingId: string | null;
        }>
      >((resolve, reject) => {
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
      }),
    PRACTICE_SESSION_DB_NAME
  );
  const recordingHistory = await readRecordingHistory(page);

  return {
    sessions,
    recordings: Array.isArray(recordingHistory.recordings)
      ? (recordingHistory.recordings as Array<{
          id: string;
          type: string;
          sessionId: string;
          sheetId: string | null;
        }>)
      : []
  };
}

test("reference system saves local audio and Bilibili references through Sheet Practice", async ({
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
    const testWindow = window as Window & {
      __referenceSystemUseFixtureSearch?: boolean;
      __referenceAudioSnapshots?: ReferenceAudioSnapshot[];
    };

    testWindow.__referenceSystemUseFixtureSearch = true;
    testWindow.__referenceAudioSnapshots = [];
    window.addEventListener("reference-audio:state-change", (event) => {
      testWindow.__referenceAudioSnapshots?.push(
        (event as CustomEvent<ReferenceAudioSnapshot>).detail
      );
    });
  });
  await installSyntheticMicrophone(page);

  await page.setViewportSize({ width: 1280, height: 860 });
  await clearState(page);
  const { link, sheetId } = await importTestSheet(page, {
    name: "Reference Contract Sheet",
    bpm: 84,
    timeSignature: "4/4"
  });

  await link.click();
  await expect(page).toHaveURL(new RegExp(`/sheet-practice/${sheetId}$`));
  await expect(
    page.getByRole("heading", { name: "Reference Contract Sheet" })
  ).toBeVisible();
  await expect(page.getByTestId("reference-panel")).toBeVisible();
  await expect(page.getByTestId("active-reference-title")).toHaveText(
    "No active reference"
  );
  await expect(
    page
      .getByTestId("reference-panel")
      .getByText(/Download|Extract|A-B loop|Playback speed|Offset/i)
  ).toHaveCount(0);

  await page.getByLabel("Local title").fill("Tone Reference");
  await page.getByLabel("Local audio file").setInputFiles({
    name: "reference-tone.wav",
    mimeType: "audio/wav",
    buffer: createReferenceWavBuffer()
  });
  await page.getByRole("button", { name: "Save local reference" }).click();
  await expect(page.getByTestId("active-reference-title")).toHaveText(
    "Tone Reference"
  );
  await expect(page.getByTestId("active-reference-summary")).toContainText(
    "reference-tone.wav"
  );
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
  await expect(page.getByTestId("reference-playback-state")).toHaveText(
    "playing"
  );
  await expect(page.getByTestId("sheet-session-source")).toContainText("sheet");
  await page.waitForFunction(() => {
    const testWindow = window as Window & {
      __referenceAudioSnapshots?: ReferenceAudioSnapshot[];
    };

    return (testWindow.__referenceAudioSnapshots ?? []).some(
      (audioSnapshot) =>
        audioSnapshot.state === "playing" && audioSnapshot.currentTime > 0.05
    );
  });
  const referenceOnlyPracticeSnapshot = await getPracticeSnapshot(page);
  const referenceSessionId =
    referenceOnlyPracticeSnapshot.sessions[0]?.id ?? "";

  expect(referenceSessionId).toBeTruthy();
  expect(referenceOnlyPracticeSnapshot.sessions).toHaveLength(1);
  expect(referenceOnlyPracticeSnapshot.sessions[0]).toMatchObject({
    sourceType: "sheet",
    sheetId,
    recordingCount: 0,
    latestRecordingId: null
  });
  expect(referenceOnlyPracticeSnapshot.recordings).toEqual([]);

  await page.getByLabel("Reference volume").fill("0.35");
  await expect(page.getByTestId("reference-volume-state")).toHaveText("35");
  await page.getByRole("button", { name: "Pause local reference" }).click();
  await expect(page.getByText("Local reference paused.")).toBeVisible();
  await expect(page.getByTestId("reference-playback-state")).toHaveText(
    "paused"
  );
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
  await expect(page.getByTestId("active-reference-title")).toHaveText(
    "Tone Reference"
  );
  await page.getByRole("button", { name: "Play local reference" }).click();
  await expect(page.getByTestId("reference-playback-state")).toHaveText(
    "playing"
  );
  await page.getByRole("button", { name: "Pause local reference" }).click();
  await expect(page.getByTestId("sheet-session-id")).toHaveText(
    referenceSessionId
  );
  expect(await getPracticeSnapshot(page)).toMatchObject({
    sessions: [
      {
        id: referenceSessionId,
        sourceType: "sheet",
        sheetId,
        recordingCount: 0,
        latestRecordingId: null
      }
    ],
    recordings: []
  });

  await page.getByRole("button", { name: "Start recording" }).click();
  await expect(page.getByText("Recording without metronome.")).toBeVisible();
  await expect(page.getByTestId("sheet-recording-state")).toContainText(
    "active"
  );
  await page.getByRole("button", { name: "Start metronome" }).click();
  await expect(page.getByTestId("sheet-metronome-state")).toContainText(
    /Playing|Counting/
  );
  await page.getByRole("button", { name: "Play local reference" }).click();
  await expect(page.getByTestId("sheet-recording-state")).toContainText(
    "active"
  );
  await expect(page.getByTestId("sheet-metronome-state")).toContainText(
    /Playing|Counting/
  );
  await page.getByRole("button", { name: "Pause local reference" }).click();
  await page.getByRole("button", { name: "Stop metronome" }).click();
  await page.waitForTimeout(350);
  await page.getByRole("button", { name: "Stop recording" }).click();
  await expect(page.getByText("Recording saved.")).toBeVisible();
  await expect(page.getByTestId("sheet-recording-state")).toContainText(
    "stopped"
  );
  await expect(page.getByTestId("sheet-recording-count")).toContainText("1");
  const practiceSnapshotAfterRecording = await getPracticeSnapshot(page);

  expect(practiceSnapshotAfterRecording.sessions).toHaveLength(1);
  expect(practiceSnapshotAfterRecording.sessions[0]).toMatchObject({
    id: referenceSessionId,
    sourceType: "sheet",
    sheetId,
    recordingCount: 1
  });
  expect(
    practiceSnapshotAfterRecording.recordings.filter(
      (recording) => recording.sheetId === sheetId
    )
  ).toEqual([
    expect.objectContaining({
      type: "sheet",
      sessionId: referenceSessionId,
      sheetId
    })
  ]);

  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(page.getByTestId("reference-panel")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByTestId("reference-panel").scrollIntoViewIfNeeded();
  await expect(page.getByTestId("reference-panel")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save local reference" })
  ).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 860 });

  await page.getByPlaceholder("Search Bilibili").fill("canon");
  await page.getByRole("button", { name: "Search Bilibili" }).click();
  await expect(page.getByTestId("bilibili-search-results")).toBeVisible();
  await page
    .getByRole("button", { name: /Canon in D guitar practice reference/ })
    .click();
  await page.getByRole("button", { name: "Save selected result" }).click();
  await expect(
    page.getByText("Bilibili search result saved as the active reference.")
  ).toBeVisible();
  await expect(page.getByTestId("active-reference-title")).toHaveText(
    "Canon in D guitar practice reference"
  );
  await expect(
    page.getByRole("link", { name: "Open Bilibili reference" })
  ).toHaveAttribute("href", "https://www.bilibili.com/video/BV1ab411c7dE");

  await page.reload();
  await expect(page.getByTestId("active-reference-title")).toHaveText(
    "Canon in D guitar practice reference"
  );
  await expect(page.getByTestId("active-reference-summary")).toContainText(
    "BV1ab411c7dE"
  );

  await page.getByLabel("URL title").fill("Pasted Bilibili");
  await page
    .getByRole("textbox", { name: "Bilibili URL" })
    .fill("https://www.bilibili.com/video/BV1XY411P7mn");
  await page.getByRole("button", { name: "Save Bilibili URL" }).click();
  await expect(
    page.getByText("Bilibili URL saved as the active reference.")
  ).toBeVisible();
  await expect(page.getByTestId("active-reference-title")).toHaveText(
    "Pasted Bilibili"
  );
  await expect(page.getByTestId("active-reference-summary")).toContainText(
    "BV1XY411P7mn"
  );

  await page
    .getByRole("textbox", { name: "Bilibili URL" })
    .fill("https://example.com/video/BV1XY411P7mn");
  await page.getByRole("button", { name: "Save Bilibili URL" }).click();
  await expect(
    page.getByText(
      "Enter a Bilibili video URL like https://www.bilibili.com/video/BV..."
    )
  ).toBeVisible();

  await page.getByPlaceholder("Search Bilibili").fill("force failure");
  await page.getByRole("button", { name: "Search Bilibili" }).click();
  await expect(
    page.getByText("Bilibili search failed. Keep your query and try again.")
  ).toBeVisible();
  await expect(page.getByTestId("bilibili-search-fallback")).toContainText(
    "Use Bilibili web search in a new tab"
  );
  await expect(
    page.getByRole("link", { name: "Open Bilibili web search" })
  ).toHaveAttribute(
    "href",
    "https://search.bilibili.com/all?keyword=force%20failure"
  );

  snapshot = await getReferenceSnapshot(page);
  expect(
    snapshot.references.filter((reference) => reference.sheetId === sheetId)
  ).toHaveLength(3);
  expect(
    snapshot.references.filter((reference) => reference.isActive)
  ).toMatchObject([
    {
      kind: "bilibili",
      title: "Pasted Bilibili",
      bvid: "BV1XY411P7mn"
    }
  ]);

  expect(consoleErrors).toEqual([]);
});
