import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const sheetFixturesDir = path.resolve(currentDir, "../../test-fixtures/sheets");
const sheetDbName = "metronome-practice-v0-sheet-library";
const practiceDbName = "metronome-practice-v0-practice-sessions";
const measureGridDbName = "metronome-practice-v1-measure-grids";
const recordingHistoryStorageKey = "metronome-practice:v0:quick-recordings";

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

async function readMeasureGrid(page: Page, sheetId: string) {
  return page.evaluate(
    ({ databaseName, targetSheetId }: { databaseName: string; targetSheetId: string }) =>
      new Promise<unknown>((resolve, reject) => {
        const openRequest = indexedDB.open(databaseName);

        openRequest.onerror = () => reject(openRequest.error);
        openRequest.onsuccess = () => {
          const database = openRequest.result;

          if (!database.objectStoreNames.contains("grids")) {
            database.close();
            resolve(null);
            return;
          }

          const transaction = database.transaction(["grids"], "readonly");
          const request = transaction.objectStore("grids").get(targetSheetId);

          transaction.oncomplete = () => {
            database.close();
            resolve(request.result ?? null);
          };
          transaction.onerror = () => reject(transaction.error);
        };
      }),
    { databaseName: measureGridDbName, targetSheetId: sheetId }
  );
}

async function expectControlsUsable(page: Page) {
  await expect(page.getByTestId("sheet-viewer-scroll")).toBeVisible();
  await expect(page.getByTestId("measure-grid-calibration-panel")).toBeVisible();
  await page.getByTestId("sheet-practice-controls").scrollIntoViewIfNeeded();
  await expect(page.getByRole("button", { name: "Start metronome" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save grid" })).toBeVisible();

  const boxes = await page.evaluate(() => {
    const viewer = document.querySelector("[data-testid='sheet-viewer-scroll']")?.getBoundingClientRect();
    const controls = document.querySelector("[data-testid='sheet-practice-controls']")?.getBoundingClientRect();

    if (!viewer || !controls) {
      return null;
    }

    return {
      viewerBottom: viewer.bottom,
      controlsTop: controls.top,
      viewportHeight: window.innerHeight
    };
  });

  expect(boxes).not.toBeNull();
  expect(boxes?.controlsTop).toBeGreaterThanOrEqual((boxes?.viewerBottom ?? 0) - 1);
  expect(boxes?.controlsTop).toBeLessThan((boxes?.viewportHeight ?? 0) - 48);
}

test("measure grid calibration saves, reloads, isolates sheets, and uses manual offset fallback", async ({ page }) => {
  const consoleErrors: string[] = [];

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
  const firstSheet = await importSheet(page, "Measure Grid Sheet A");

  await firstSheet.link.click();
  await expect(page.getByRole("heading", { name: "Measure Grid Sheet A" })).toBeVisible();
  await expect(page.getByTestId("measure-grid-calibration-panel")).toBeVisible();
  await expect(page.getByTestId("measure-grid-calibration-panel").getByRole("heading", { name: "Measure grid" })).toBeVisible();
  await expect(page.getByTestId("measure-grid-status")).toContainText("Needs calibration");
  await expect(page.getByRole("spinbutton", { name: "Grid BPM" })).toHaveValue("72");
  await expect(page.getByLabel("Grid time signature")).toHaveValue("4/4");
  await expect(page.getByRole("spinbutton", { name: "Pickup beats" })).toHaveValue("0");
  await expect(page.getByRole("spinbutton", { name: "Measure 1 offset" })).toHaveValue("");
  await expect(page.getByRole("button", { name: "Set measure 1 here" })).toBeDisabled();
  await expect(page.getByText("No playback timestamp available.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save grid" })).toBeDisabled();
  await expectControlsUsable(page);

  await page.getByRole("spinbutton", { name: "Grid BPM" }).fill("84");
  await page.getByLabel("Grid time signature").selectOption("3/4");
  await page.getByRole("spinbutton", { name: "Pickup beats" }).fill("1");
  await page.getByRole("spinbutton", { name: "Measure 1 offset" }).fill("1250");
  await expect(page.getByTestId("measure-grid-status")).toContainText("Unsaved changes");
  await page.getByRole("button", { name: "Save grid" }).click();
  await expect(page.getByTestId("measure-grid-status")).toContainText("Calibrated");

  expect(await readMeasureGrid(page, firstSheet.sheetId)).toMatchObject({
    sheetId: firstSheet.sheetId,
    grid: {
      bpm: 84,
      timeSignature: "3/4",
      pickupBeats: 1,
      measureOneOffsetMs: 1250
    }
  });

  await page.reload();
  await expect(page.getByTestId("measure-grid-status")).toContainText("Calibrated");
  await expect(page.getByRole("spinbutton", { name: "Grid BPM" })).toHaveValue("84");
  await expect(page.getByLabel("Grid time signature")).toHaveValue("3/4");
  await expect(page.getByRole("spinbutton", { name: "Pickup beats" })).toHaveValue("1");
  await expect(page.getByRole("spinbutton", { name: "Measure 1 offset" })).toHaveValue("1250");

  await page.getByRole("spinbutton", { name: "Grid BPM" }).fill("29");
  await expect(page.getByText("Grid BPM must be an integer from 30 to 300.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save grid" })).toBeDisabled();
  await page.getByRole("spinbutton", { name: "Grid BPM" }).fill("84");

  await page.getByRole("spinbutton", { name: "Pickup beats" }).fill("3");
  await expect(page.getByText("Pickup beats must be an integer from 0 to 2.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save grid" })).toBeDisabled();
  expect(await readMeasureGrid(page, firstSheet.sheetId)).toMatchObject({
    grid: {
      bpm: 84,
      timeSignature: "3/4",
      pickupBeats: 1,
      measureOneOffsetMs: 1250
    }
  });
  await page.getByRole("spinbutton", { name: "Pickup beats" }).fill("1");

  await page.getByRole("spinbutton", { name: "Measure 1 offset" }).fill("-1");
  await expect(page.getByText("Measure 1 offset must be a non-negative integer in milliseconds.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save grid" })).toBeDisabled();
  expect(await readMeasureGrid(page, firstSheet.sheetId)).toMatchObject({
    grid: {
      bpm: 84,
      timeSignature: "3/4",
      pickupBeats: 1,
      measureOneOffsetMs: 1250
    }
  });
  await page.getByRole("spinbutton", { name: "Measure 1 offset" }).fill("1250");

  const secondSheet = await importSheet(page, "Measure Grid Sheet B");

  await secondSheet.link.click();
  await expect(page.getByRole("heading", { name: "Measure Grid Sheet B" })).toBeVisible();
  await expect(page.getByTestId("measure-grid-status")).toContainText("Needs calibration");
  await expect(page.getByRole("spinbutton", { name: "Grid BPM" })).toHaveValue("72");
  await expect(page.getByLabel("Grid time signature")).toHaveValue("4/4");
  await expect(page.getByRole("spinbutton", { name: "Measure 1 offset" })).toHaveValue("");
  expect(await readMeasureGrid(page, secondSheet.sheetId)).toBeNull();

  for (const viewport of [
    { width: 1280, height: 820 },
    { width: 1024, height: 768 },
    { width: 390, height: 844 }
  ]) {
    await page.setViewportSize(viewport);
    await expectControlsUsable(page);
  }

  expect(consoleErrors).toEqual([]);
});
