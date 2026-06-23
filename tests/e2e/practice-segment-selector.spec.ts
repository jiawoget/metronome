import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const sheetFixturesDir = path.resolve(currentDir, "../../test-fixtures/sheets");
const sheetDbName = "metronome-practice-v0-sheet-library";
const practiceDbName = "metronome-practice-v0-practice-sessions";
const measureGridDbName = "metronome-practice-v1-measure-grids";
const practiceSegmentDbName = "metronome-practice-v1-practice-segments";
const recordingHistoryStorageKey = "metronome-practice:v0:quick-recordings";

type SeedMeasureGrid = {
  bpm: number;
  timeSignature: "2/4" | "3/4" | "4/4" | "6/8";
  pickupBeats: number;
  measureOneOffsetMs: number;
};

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
  await deleteDatabase(page, practiceDbName);
  await deleteDatabase(page, measureGridDbName);
  await deleteDatabase(page, practiceSegmentDbName);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Sheet Library" })).toBeVisible();
}

async function importSheet(page: Page, name: string) {
  await page.goto("/sheet-library");
  await page.getByLabel("File").setInputFiles(path.join(sheetFixturesDir, "real-sheet.png"));
  await expect(page.getByText(/^Ready:/)).toBeVisible();
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("BPM").fill("72");
  await page.getByLabel("Time signature").fill("4/4");
  await page.getByRole("button", { name: "Save Imported Sheet" }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();

  const link = page.getByRole("link", { name: "Open Sheet Practice" }).first();
  const href = await link.getAttribute("href");
  const sheetId = new URL(href ?? "", "http://127.0.0.1").pathname.split("/").pop() ?? "";

  expect(sheetId).toBeTruthy();

  return { link, sheetId };
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
        const openRequest = indexedDB.open(databaseName, 1);

        openRequest.onupgradeneeded = () => {
          const database = openRequest.result;

          if (!database.objectStoreNames.contains("grids")) {
            database.createObjectStore("grids", { keyPath: "sheetId" }).createIndex("updatedAt", "updatedAt");
          }
        };
        openRequest.onerror = () => reject(openRequest.error);
        openRequest.onsuccess = () => {
          const database = openRequest.result;
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
    { databaseName: measureGridDbName, targetSheetId: sheetId, targetGrid: grid }
  );
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
        const openRequest = indexedDB.open(databaseName, 1);

        openRequest.onupgradeneeded = () => {
          const database = openRequest.result;

          if (!database.objectStoreNames.contains("segments")) {
            const store = database.createObjectStore("segments", { keyPath: "key" });

            store.createIndex("sheetId", "sheetId");
            store.createIndex("segmentId", "segmentId");
            store.createIndex("updatedAt", "updatedAt");
          }
        };
        openRequest.onerror = () => reject(openRequest.error);
        openRequest.onsuccess = () => {
          const database = openRequest.result;
          const transaction = database.transaction(["segments"], "readwrite");
          const key = JSON.stringify([targetSheetId, targetSegmentId]);

          transaction.objectStore("segments").put({
            key,
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
      databaseName: practiceSegmentDbName,
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
  await clearDatabases(page);
  const sheetA = await importSheet(page, "Segment Selector Sheet A");
  const sheetB = await importSheet(page, "Segment Selector Sheet B");
  const sheetEmpty = await importSheet(page, "Segment Selector Empty Sheet");

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
