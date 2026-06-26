import { expect, test, type Page } from "@playwright/test";
import { installSyntheticMicrophone } from "./fixtures/audio";
import { importTestSheet } from "./fixtures/sheets";
import {
  clearDatabases,
  clearRecordingHistory,
  MEASURE_GRID_DB_NAME,
  PRACTICE_SEGMENT_DB_NAME,
  PRACTICE_SESSION_DB_NAME,
  readRecordingHistory,
  SHEET_LIBRARY_DB_NAME
} from "./fixtures/storage";

type PersistedSheetRecording = {
  id: string;
  type: "sheet";
  sheetId: string;
  audioDataUrl?: string | null;
  sizeBytes: number;
  trustedPeaks?: number[];
  segmentContext?: {
    segmentId: string;
    segmentName: string;
    range: {
      startMeasure: number;
      endMeasure: number;
    };
    targetBpm: number | null;
    measureGridVersion: string;
    measureGridSnapshot: {
      bpm: number;
      timeSignature: string;
      pickupBeats: number;
      measureOneOffsetMs: number;
    };
    measureRangeMs: {
      startMs: number;
      endMs: number;
    };
  } | null;
};

async function clearState(page: Page) {
  await page.goto("/sheet-library");
  await clearRecordingHistory(page);
  await clearDatabases(page, [
    SHEET_LIBRARY_DB_NAME,
    PRACTICE_SESSION_DB_NAME,
    MEASURE_GRID_DB_NAME,
    PRACTICE_SEGMENT_DB_NAME
  ]);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Sheet Library" })).toBeVisible();
}

async function saveMeasureGrid(page: Page) {
  await page.getByRole("spinbutton", { name: "Grid BPM" }).fill("96");
  await page.getByLabel("Grid time signature").selectOption("4/4");
  await page.getByRole("spinbutton", { name: "Pickup beats" }).fill("0");
  await page.getByRole("spinbutton", { name: "Measure 1 offset" }).fill("1000");
  await page.getByRole("button", { name: "Save grid" }).click();
  await expect(page.getByTestId("measure-grid-status")).toContainText("Calibrated");
}

async function createSelectedSegment(page: Page) {
  await page.getByRole("button", { name: "New segment" }).click();
  await page.getByLabel("Segment name").fill("Opening focus");
  await page.getByLabel("Start measure").fill("5");
  await page.getByLabel("End measure").fill("12");
  await page.getByLabel("Target BPM").fill("96");
  await page.getByLabel("Segment notes").fill("Keep it even.");
  await page.getByRole("button", { name: "Save segment" }).click();
  await expect(page.getByTestId("practice-segment-active-summary")).toContainText("Opening focus");
}

async function renameSelectedSegmentBeforeRecording(page: Page) {
  await page.getByRole("button", { name: "Edit Opening focus" }).click();
  await page.getByLabel("Segment name").fill("Renamed focus");
  await page.getByLabel("Start measure").fill("6");
  await page.getByLabel("End measure").fill("10");
  await page.getByLabel("Target BPM").fill("104");
  await page.getByLabel("Segment notes").fill("Edited before recording.");
  await page.getByRole("button", { name: "Save segment" }).click();
  await expect(page.getByTestId("practice-segment-active-summary")).toContainText("Renamed focus");
  await expect(page.getByTestId("practice-segment-active-summary")).toContainText("Measures 6-10");
  await expect(page.getByTestId("practice-segment-active-summary")).toContainText("Target 104 BPM");
}

async function recordSheetTake(page: Page) {
  await page.getByRole("button", { name: "Start recording" }).click();
  await expect(page.getByTestId("sheet-recording-state")).toContainText("active");
  await page.waitForTimeout(850);
  await page.getByRole("button", { name: "Stop recording" }).click();
  await expect(page.getByTestId("sheet-recording-state")).toContainText("stopped");
}

async function getSheetRecordings(page: Page, sheetId: string) {
  const history = await readRecordingHistory(page);
  const recordings = Array.isArray(history.recordings) ? history.recordings : [];

  return recordings.filter(
    (recording: PersistedSheetRecording) => recording.type === "sheet" && recording.sheetId === sheetId
  ) as PersistedSheetRecording[];
}

test("sheet recording persists selected segment context and keeps it after source deletion", async ({ page }) => {
  const consoleErrors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    consoleErrors.push(error.message);
  });
  await installSyntheticMicrophone(page, 440);
  await page.setViewportSize({ width: 1280, height: 820 });
  await clearState(page);
  const { link, sheetId } = await importTestSheet(page, {
    name: "Segment Recording Sheet",
    bpm: 96,
    timeSignature: "4/4"
  });

  await link.click();
  await saveMeasureGrid(page);
  await createSelectedSegment(page);
  await recordSheetTake(page);
  await expect(page.getByText("Recording saved for Opening focus.")).toBeVisible();

  let sheetRecordings = await getSheetRecordings(page, sheetId);

  expect(sheetRecordings).toHaveLength(1);
  const segmentRecording = sheetRecordings[0];
  const savedContext = segmentRecording.segmentContext;

  expect(segmentRecording.audioDataUrl).toMatch(/^data:audio\//);
  expect(segmentRecording.sizeBytes).toBeGreaterThan(0);
  expect(segmentRecording.trustedPeaks?.length ?? 0).toBeGreaterThan(12);
  expect(savedContext).toMatchObject({
    segmentName: "Opening focus",
    range: {
      startMeasure: 5,
      endMeasure: 12
    },
    targetBpm: 96,
    measureGridVersion: "bpm:96|timeSignature:4/4|pickupBeats:0|measureOneOffsetMs:1000",
    measureGridSnapshot: {
      bpm: 96,
      timeSignature: "4/4",
      pickupBeats: 0,
      measureOneOffsetMs: 1000
    },
    measureRangeMs: {
      startMs: 11000,
      endMs: 31000
    }
  });
  expect(savedContext?.segmentId).toBeTruthy();

  await page.reload();
  sheetRecordings = await getSheetRecordings(page, sheetId);
  expect(sheetRecordings.find((recording) => recording.id === segmentRecording.id)?.segmentContext).toEqual(
    savedContext
  );

  await page.getByRole("button", { name: "Delete Opening focus" }).click();
  await page.getByRole("button", { name: "Confirm delete Opening focus" }).click();
  await expect(page.getByTestId("practice-segment-selector-status")).toContainText("0 saved");
  sheetRecordings = await getSheetRecordings(page, sheetId);
  expect(sheetRecordings.find((recording) => recording.id === segmentRecording.id)?.segmentContext).toEqual(
    savedContext
  );

  await recordSheetTake(page);
  await expect(page.getByText("Recording saved.")).toBeVisible();
  sheetRecordings = await getSheetRecordings(page, sheetId);
  expect(sheetRecordings).toHaveLength(2);
  expect(sheetRecordings.find((recording) => recording.id !== segmentRecording.id)?.segmentContext ?? null).toBeNull();
  expect(consoleErrors).toEqual([]);
});

test("selected segment state does not leak to another sheet recording", async ({ page }) => {
  await installSyntheticMicrophone(page, 330);
  await page.setViewportSize({ width: 1280, height: 820 });
  await clearState(page);
  const sheetA = await importTestSheet(page, {
    name: "Segment Source Sheet",
    bpm: 96,
    timeSignature: "4/4"
  });
  const sheetB = await importTestSheet(page, {
    name: "No Segment Sheet",
    bpm: 72,
    timeSignature: "3/4"
  });

  await page.goto(`/sheet-practice/${sheetA.sheetId}`);
  await saveMeasureGrid(page);
  await createSelectedSegment(page);
  await expect(page.getByTestId("practice-segment-active-summary")).toContainText("Opening focus");

  await page.goto(`/sheet-practice/${sheetB.sheetId}`);
  await expect(page.getByRole("heading", { name: "No Segment Sheet" })).toBeVisible();
  await expect(page.getByTestId("practice-segment-selector-status")).toContainText("0 saved");
  await recordSheetTake(page);

  const sheetBRecordings = await getSheetRecordings(page, sheetB.sheetId);

  expect(sheetBRecordings).toHaveLength(1);
  expect(sheetBRecordings[0].segmentContext ?? null).toBeNull();
});

test("sheet recording snapshots a renamed selected segment at save time", async ({ page }) => {
  const consoleErrors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    consoleErrors.push(error.message);
  });
  await installSyntheticMicrophone(page, 550);
  await page.setViewportSize({ width: 1280, height: 820 });
  await clearState(page);
  const { link, sheetId } = await importTestSheet(page, {
    name: "Renamed Segment Recording Sheet",
    bpm: 96,
    timeSignature: "4/4"
  });

  await link.click();
  await saveMeasureGrid(page);
  await createSelectedSegment(page);
  await renameSelectedSegmentBeforeRecording(page);
  await recordSheetTake(page);
  await expect(page.getByText("Recording saved for Renamed focus.")).toBeVisible();

  const sheetRecordings = await getSheetRecordings(page, sheetId);

  expect(sheetRecordings).toHaveLength(1);
  expect(sheetRecordings[0].segmentContext).toMatchObject({
    segmentName: "Renamed focus",
    range: {
      startMeasure: 6,
      endMeasure: 10
    },
    targetBpm: 104,
    measureGridVersion: "bpm:96|timeSignature:4/4|pickupBeats:0|measureOneOffsetMs:1000",
    measureGridSnapshot: {
      bpm: 96,
      timeSignature: "4/4",
      pickupBeats: 0,
      measureOneOffsetMs: 1000
    },
    measureRangeMs: {
      startMs: 13500,
      endMs: 26000
    }
  });
  expect(sheetRecordings[0].segmentContext?.segmentName).not.toBe("Opening focus");
  expect(sheetRecordings[0].segmentContext?.segmentId).toBeTruthy();
  expect(consoleErrors).toEqual([]);
});
