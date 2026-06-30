import { expect, test, type Page } from "@playwright/test";
import { importTestSheet } from "./fixtures/sheets";
import {
  clearSheetLibraryTestState,
  MEASURE_GRID_DB_NAME,
  PRACTICE_SEGMENT_DB_NAME,
  PRACTICE_SESSION_DB_NAME,
  SHEET_LIBRARY_DB_NAME
} from "./fixtures/storage";

type SeedMeasureGrid = {
  bpm: number;
  timeSignature: "2/4" | "3/4" | "4/4" | "6/8";
  pickupBeats: number;
  measureOneOffsetMs: number;
};

async function clearState(page: Page) {
  await clearSheetLibraryTestState(page, [
    SHEET_LIBRARY_DB_NAME,
    PRACTICE_SESSION_DB_NAME,
    MEASURE_GRID_DB_NAME,
    PRACTICE_SEGMENT_DB_NAME
  ]);
}

async function saveMeasureGridThroughUi(page: Page, grid: SeedMeasureGrid) {
  await page.getByRole("spinbutton", { name: "Grid BPM" }).fill(String(grid.bpm));
  await page.getByLabel("Grid time signature").selectOption(grid.timeSignature);
  await page.getByRole("spinbutton", { name: "Pickup beats" }).fill(String(grid.pickupBeats));
  await page.getByRole("spinbutton", { name: "Measure 1 offset" }).fill(String(grid.measureOneOffsetMs));
  await page.getByRole("button", { name: "Save grid" }).click();
  await expect(page.getByTestId("measure-grid-status")).toContainText("Calibrated");
}

async function fillSegmentEditor(
  page: Page,
  {
    name,
    startMeasure,
    endMeasure,
    targetBpm,
    notes
  }: {
    name: string;
    startMeasure: number;
    endMeasure: number;
    targetBpm: number | null;
    notes: string;
  }
) {
  await page.getByLabel("Segment name").fill(name);
  await page.getByLabel("Start measure").fill(String(startMeasure));
  await page.getByLabel("End measure").fill(String(endMeasure));
  await page.getByLabel("Target BPM").fill(targetBpm === null ? "" : String(targetBpm));
  await page.getByLabel("Segment notes").fill(notes);
}

async function expectPracticeWorkspaceUsable(page: Page) {
  await page.getByTestId("sheet-practice-controls").scrollIntoViewIfNeeded();
  await expect(page.getByTestId("sheet-viewer-scroll")).toBeVisible();
  await expect(page.getByTestId("practice-segment-selector-panel")).toBeVisible();
  await expect(page.getByTestId("measure-grid-calibration-panel")).toBeVisible();
  await expect(page.getByRole("button", { name: "Start metronome" })).toBeVisible();

  const boxes = await page.evaluate(() => {
    const viewer = document.querySelector("[data-testid='sheet-viewer-scroll']")?.getBoundingClientRect();
    const controls = document.querySelector("[data-testid='sheet-practice-controls']")?.getBoundingClientRect();
    const selector = document.querySelector("[data-testid='practice-segment-selector-panel']")?.getBoundingClientRect();

    if (!viewer || !controls || !selector) {
      return null;
    }

    return {
      viewerBottom: viewer.bottom,
      controlsTop: controls.top,
      selectorLeft: selector.left,
      selectorRight: selector.right,
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth
    };
  });

  expect(boxes).not.toBeNull();
  expect(boxes?.controlsTop).toBeGreaterThanOrEqual((boxes?.viewerBottom ?? 0) - 1);
  expect(boxes?.controlsTop).toBeLessThan((boxes?.viewportHeight ?? 0) - 48);
  expect(boxes?.selectorLeft).toBeGreaterThanOrEqual(0);
  expect(boxes?.selectorRight).toBeLessThanOrEqual((boxes?.viewportWidth ?? 0) + 1);
}

test("practice segment selector creates, edits, deletes, reloads, scopes by sheet, and stays responsive", async ({ page }) => {
  const consoleErrors: string[] = [];
  const currentGrid: SeedMeasureGrid = {
    bpm: 96,
    timeSignature: "4/4",
    pickupBeats: 0,
    measureOneOffsetMs: 1_000
  };

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    consoleErrors.push(error.message);
  });

  await page.setViewportSize({ width: 1280, height: 820 });
  await clearState(page);
  const sheetA = await importTestSheet(page, { name: "Segment Selector Sheet A" });
  const sheetB = await importTestSheet(page, { name: "Segment Selector Sheet B" });

  await page.goto(`/sheet-practice/${sheetA.sheetId}`);
  await expect(page.getByRole("heading", { name: "Segment Selector Sheet A" })).toBeVisible();
  await expect(page.getByTestId("practice-segment-selector-status")).toContainText("0 saved");
  await expect(page.getByRole("button", { name: "New segment" })).toBeDisabled();
  await expect(page.getByText("Save a measure grid before creating segments.")).toBeVisible();

  await saveMeasureGridThroughUi(page, currentGrid);
  await expect(page.getByRole("button", { name: "New segment" })).toBeEnabled();

  await page.getByRole("button", { name: "New segment" }).click();
  await fillSegmentEditor(page, {
    name: "Opening focus",
    startMeasure: 5,
    endMeasure: 12,
    targetBpm: 96,
    notes: "Keep the opening even."
  });
  await page.getByRole("button", { name: "Save segment" }).click();

  await expect(page.getByTestId("practice-segment-selector-status")).toContainText("1 saved");
  await expect(page.getByText("Opening focus").first()).toBeVisible();
  await expect(page.getByText("Measures 5-12").first()).toBeVisible();
  await expect(page.getByText("Target 96 BPM").first()).toBeVisible();
  await expect(page.getByText("Ready").first()).toBeVisible();
  await expect(page.getByTestId("practice-segment-active-summary")).toContainText("Active segment");
  await expect(page.getByTestId("practice-segment-active-summary")).toContainText("Opening focus");
  await expect(page.getByTestId("practice-segment-active-summary")).toContainText("Measures 5-12");
  await expect(page.getByTestId("practice-segment-active-summary")).toContainText("Target 96 BPM");
  await expect(page.getByTestId("practice-segment-active-status")).toContainText("Ready");

  await page.getByRole("button", { name: "New segment" }).click();
  await fillSegmentEditor(page, {
    name: " opening focus ",
    startMeasure: 13,
    endMeasure: 16,
    targetBpm: null,
    notes: ""
  });
  await page.getByRole("button", { name: "Save segment" }).click();
  await expect(page.getByText("Segment name already exists.")).toBeVisible();
  await expect(page.getByTestId("practice-segment-selector-status")).toContainText("1 saved");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();

  await page.reload();
  await expect(page.getByTestId("practice-segment-selector-status")).toContainText("1 saved");
  await expect(page.getByText("Opening focus").first()).toBeVisible();
  await expect(page.getByTestId("practice-segment-active-summary")).toContainText("Choose a segment");

  await page.getByRole("button", { name: "Edit Opening focus" }).click();
  await fillSegmentEditor(page, {
    name: "Bridge revision",
    startMeasure: 6,
    endMeasure: 9,
    targetBpm: null,
    notes: "Slow and even."
  });
  await page.getByRole("button", { name: "Save segment" }).click();

  await expect(page.getByTestId("practice-segment-selector-status")).toContainText("1 saved");
  await expect(page.getByText("Bridge revision").first()).toBeVisible();
  await expect(page.getByText("Measures 6-9").first()).toBeVisible();
  await expect(page.getByText("No target BPM").first()).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("practice-segment-selector-status")).toContainText("1 saved");
  await expect(page.getByText("Bridge revision").first()).toBeVisible();
  await expect(page.getByText("Measures 6-9").first()).toBeVisible();
  await expect(page.getByText("No target BPM").first()).toBeVisible();

  await page.getByRole("button", { name: /Bridge revision.*Measures 6-9/ }).click();
  await expect(page.getByTestId("practice-segment-active-summary")).toContainText("Active segment");

  await page.goto(`/sheet-practice/${sheetB.sheetId}`);
  await expect(page.getByRole("heading", { name: "Segment Selector Sheet B" })).toBeVisible();
  await expect(page.getByTestId("practice-segment-selector-status")).toContainText("0 saved");
  await expect(page.getByText("No saved segments yet.")).toBeVisible();
  await expect(page.getByText("Bridge revision")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "New segment" })).toBeDisabled();

  await page.goto(`/sheet-practice/${sheetA.sheetId}`);
  await expect(page.getByTestId("practice-segment-selector-status")).toContainText("1 saved");
  await expect(page.getByText("Bridge revision").first()).toBeVisible();
  await expect(page.getByTestId("practice-segment-active-summary")).toContainText("Choose a segment");

  await page.getByRole("button", { name: "Delete Bridge revision" }).click();
  await expect(page.getByText("Delete Bridge revision (Measures 6-9)?")).toBeVisible();
  await page.getByRole("button", { name: "Confirm delete Bridge revision" }).click();
  await expect(page.getByTestId("practice-segment-selector-status")).toContainText("0 saved");
  await expect(page.getByText("Bridge revision")).toHaveCount(0);
  await expect(page.getByTestId("practice-segment-empty-state")).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("practice-segment-selector-status")).toContainText("0 saved");
  await expect(page.getByText("Bridge revision")).toHaveCount(0);
  await expect(page.getByTestId("practice-segment-empty-state")).toBeVisible();

  await page.getByRole("button", { name: "New segment" }).click();
  await fillSegmentEditor(page, {
    name: "Invalid target",
    startMeasure: 3,
    endMeasure: 2,
    targetBpm: 301,
    notes: ""
  });
  await expect(page.getByText("End measure must be greater than or equal to start measure.")).toBeVisible();
  await expect(page.getByText("Target BPM must be an integer from 30 to 300.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save segment" })).toBeDisabled();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();

  for (const viewport of [
    { width: 1280, height: 820 },
    { width: 1024, height: 768 },
    { width: 390, height: 844 }
  ]) {
    await page.setViewportSize(viewport);
    await expectPracticeWorkspaceUsable(page);
  }

  expect(consoleErrors).toEqual([]);
});
