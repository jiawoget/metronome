import { expect, test, type Page } from "@playwright/test";
import { importTestSheet } from "./fixtures/sheets";
import {
  clearDatabases,
  clearRecordingHistory,
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

function gridVersion(grid: SeedMeasureGrid) {
  return [
    `bpm:${grid.bpm}`,
    `timeSignature:${grid.timeSignature}`,
    `pickupBeats:${grid.pickupBeats}`,
    `measureOneOffsetMs:${grid.measureOneOffsetMs}`
  ].join("|");
}

async function seedMeasureGrid(page: Page, sheetId: string, grid: SeedMeasureGrid) {
  await page.evaluate(
    ({ databaseName, targetSheetId, targetGrid }: { databaseName: string; targetSheetId: string; targetGrid: SeedMeasureGrid }) =>
      new Promise<void>((resolve, reject) => {
        const openRequest = indexedDB.open(databaseName);

        openRequest.onerror = () => reject(openRequest.error);
        openRequest.onsuccess = () => {
          const database = openRequest.result;

          if (!database.objectStoreNames.contains("grids")) {
            database.close();
            reject(new Error("Measure grid seed requires the current grids store."));
            return;
          }

          const transaction = database.transaction(["grids"], "readwrite");

          transaction.objectStore("grids").put({
            sheetId: targetSheetId,
            grid: targetGrid,
            updatedAt: "2026-06-23T00:00:00.000Z"
          });
          transaction.oncomplete = () => {
            database.close();
            resolve();
          };
          transaction.onerror = () => reject(transaction.error);
        };
      }),
    { databaseName: MEASURE_GRID_DB_NAME, targetSheetId: sheetId, targetGrid: grid }
  );
}

async function initializePracticeSegmentDatabase(page: Page, sheetId: string) {
  await page.goto(`/sheet-practice/${sheetId}`);
  await expect(page.getByTestId("practice-segment-selector-status")).toContainText("0 saved");
  await page.evaluate((databaseName) => {
    return new Promise<void>((resolve, reject) => {
      const openRequest = indexedDB.open(databaseName);

      openRequest.onerror = () => reject(openRequest.error);
      openRequest.onsuccess = () => {
        const database = openRequest.result;
        const hasCurrentStore = database.objectStoreNames.contains("segments");

        database.close();

        if (!hasCurrentStore) {
          reject(new Error("Practice segment seed requires the current segments store."));
          return;
        }

        resolve();
      };
    });
  }, PRACTICE_SEGMENT_DB_NAME);
}

async function seedPracticeSegment({
  page,
  sheetId,
  segmentId,
  name,
  startMeasure,
  endMeasure,
  targetBpm,
  associatedGrid
}: {
  page: Page;
  sheetId: string;
  segmentId: string;
  name: string;
  startMeasure: number;
  endMeasure: number;
  targetBpm: number | null;
  associatedGrid: SeedMeasureGrid;
}) {
  await page.evaluate(
    ({
      databaseName,
      targetSheetId,
      targetSegmentId,
      segmentName,
      start,
      end,
      bpm,
      grid,
      version
    }: {
      databaseName: string;
      targetSheetId: string;
      targetSegmentId: string;
      segmentName: string;
      start: number;
      end: number;
      bpm: number | null;
      grid: SeedMeasureGrid;
      version: string;
    }) =>
      new Promise<void>((resolve, reject) => {
        const openRequest = indexedDB.open(databaseName);

        openRequest.onerror = () => reject(openRequest.error);
        openRequest.onsuccess = () => {
          const database = openRequest.result;

          if (!database.objectStoreNames.contains("segments")) {
            database.close();
            reject(new Error("Practice segment seed requires the current segments store."));
            return;
          }

          const transaction = database.transaction(["segments"], "readwrite");

          transaction.objectStore("segments").put({
            sheetId: targetSheetId,
            segmentId: targetSegmentId,
            segment: {
              id: targetSegmentId,
              sheetId: targetSheetId,
              name: segmentName,
              range: {
                startMeasure: start,
                endMeasure: end
              },
              targetBpm: bpm,
              notes: null,
              grid: {
                measureGridVersion: version,
                measureGridSnapshot: grid
              }
            },
            updatedAt: "2026-06-23T00:00:00.000Z"
          });
          transaction.oncomplete = () => {
            database.close();
            resolve();
          };
          transaction.onerror = () => reject(transaction.error);
        };
      }),
    {
      databaseName: PRACTICE_SEGMENT_DB_NAME,
      targetSheetId: sheetId,
      targetSegmentId: segmentId,
      segmentName: name,
      start: startMeasure,
      end: endMeasure,
      bpm: targetBpm,
      grid: associatedGrid,
      version: gridVersion(associatedGrid)
    }
  );
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

test("practice segment selector lists, selects, reloads, scopes by sheet, and stays responsive", async ({ page }) => {
  const consoleErrors: string[] = [];
  const currentGrid: SeedMeasureGrid = {
    bpm: 96,
    timeSignature: "4/4",
    pickupBeats: 0,
    measureOneOffsetMs: 1_000
  };
  const staleAssociationGrid: SeedMeasureGrid = {
    bpm: 84,
    timeSignature: "3/4",
    pickupBeats: 1,
    measureOneOffsetMs: 500
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
  const sheetEmpty = await importTestSheet(page, { name: "Segment Selector Empty Sheet" });

  await initializePracticeSegmentDatabase(page, sheetA.sheetId);
  await seedMeasureGrid(page, sheetA.sheetId, currentGrid);
  await seedPracticeSegment({
    page,
    sheetId: sheetA.sheetId,
    segmentId: "segment-a-current",
    name: "Opening focus",
    startMeasure: 5,
    endMeasure: 12,
    targetBpm: 96,
    associatedGrid: currentGrid
  });
  await seedPracticeSegment({
    page,
    sheetId: sheetA.sheetId,
    segmentId: "segment-a-stale",
    name: "Older calibration",
    startMeasure: 13,
    endMeasure: 16,
    targetBpm: null,
    associatedGrid: staleAssociationGrid
  });
  await seedPracticeSegment({
    page,
    sheetId: sheetB.sheetId,
    segmentId: "segment-b-no-grid",
    name: "Bravo no grid",
    startMeasure: 2,
    endMeasure: 4,
    targetBpm: 88,
    associatedGrid: currentGrid
  });

  await page.goto(`/sheet-practice/${sheetA.sheetId}`);
  await expect(page.getByRole("heading", { name: "Segment Selector Sheet A" })).toBeVisible();
  await expect(page.getByTestId("practice-segment-selector-status")).toContainText("2 saved");
  await expect(page.getByText("Opening focus")).toBeVisible();
  await expect(page.getByText("Measures 5-12")).toBeVisible();
  await expect(page.getByText("Target 96 BPM")).toBeVisible();
  await expect(page.getByTestId("practice-segment-status-segment-a-current")).toContainText("Ready");
  await expect(page.getByText("Older calibration")).toBeVisible();
  await expect(page.getByText("No target BPM")).toBeVisible();
  await expect(page.getByTestId("practice-segment-status-segment-a-stale")).toContainText("Grid changed");
  await expect(page.getByText("Bravo no grid")).toHaveCount(0);

  await page.getByTestId("practice-segment-row-segment-a-current").click();
  await expect(page.getByTestId("practice-segment-active-summary")).toContainText("Active segment");
  await expect(page.getByTestId("practice-segment-active-summary")).toContainText("Opening focus");
  await expect(page.getByTestId("practice-segment-active-summary")).toContainText("Measures 5-12");
  await expect(page.getByTestId("practice-segment-active-summary")).toContainText("Target 96 BPM");
  await expect(page.getByTestId("practice-segment-active-status")).toContainText("Ready");

  await page.getByRole("spinbutton", { name: "Grid BPM" }).fill(String(staleAssociationGrid.bpm));
  await page.getByLabel("Grid time signature").selectOption(staleAssociationGrid.timeSignature);
  await page.getByRole("spinbutton", { name: "Pickup beats" }).fill(String(staleAssociationGrid.pickupBeats));
  await page.getByRole("spinbutton", { name: "Measure 1 offset" }).fill(String(staleAssociationGrid.measureOneOffsetMs));
  await page.getByRole("button", { name: "Save grid" }).click();
  await expect(page.getByTestId("measure-grid-status")).toContainText("Calibrated");
  await expect(page.getByTestId("practice-segment-status-segment-a-stale")).toContainText("Ready");
  await expect(page.getByTestId("practice-segment-status-segment-a-current")).toContainText("Grid changed");

  await page.reload();
  await expect(page.getByTestId("practice-segment-selector-status")).toContainText("2 saved");
  await expect(page.getByText("Opening focus")).toBeVisible();
  await expect(page.getByTestId("practice-segment-active-summary")).toContainText("Choose a segment");

  await page.getByTestId("practice-segment-row-segment-a-current").click();
  await expect(page.getByTestId("practice-segment-active-summary")).toContainText("Active segment");

  await page.goto(`/sheet-practice/${sheetB.sheetId}`);
  await expect(page.getByRole("heading", { name: "Segment Selector Sheet B" })).toBeVisible();
  await expect(page.getByTestId("practice-segment-selector-status")).toContainText("1 saved");
  await expect(page.getByText("Bravo no grid")).toBeVisible();
  await expect(page.getByTestId("practice-segment-status-segment-b-no-grid")).toContainText("Needs calibration");
  await expect(page.getByText("Opening focus")).toHaveCount(0);
  await expect(page.getByText("Older calibration")).toHaveCount(0);

  await page.goto(`/sheet-practice/${sheetEmpty.sheetId}`);
  await expect(page.getByRole("heading", { name: "Segment Selector Empty Sheet" })).toBeVisible();
  await expect(page.getByTestId("practice-segment-selector-status")).toContainText("0 saved");
  await expect(page.getByText("No saved segments yet.")).toBeVisible();
  await expect(page.getByRole("button", { name: /create|edit|delete/i })).toHaveCount(0);

  await page.goto(`/sheet-practice/${sheetA.sheetId}`);
  await expect(page.getByTestId("practice-segment-selector-status")).toContainText("2 saved");
  await expect(page.getByTestId("practice-segment-active-summary")).toContainText("Choose a segment");

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
