import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const sheetFixturesDir = path.resolve(currentDir, "../../test-fixtures/sheets");
const dbName = "metronome-practice-v0-sheet-library";

type SeedSheetOptions = {
  id: string;
  name: string;
  kind: "pdf" | "image";
  fixtureName?: string;
  mimeType?: string;
  pageCount?: number | null;
  imageCount?: number;
  imageDimensions?: Array<{ width: number; height: number }>;
};

async function clearSheetDatabase(page: Page) {
  await page.goto("/sheet-library");
  await page.evaluate(
    (databaseName: string) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase(databaseName);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        request.onblocked = () => resolve();
      }),
    dbName
  );
  await page.reload();
  await expect(page.getByRole("heading", { name: "Sheet Library" })).toBeVisible();
}

async function importSheet(page: Page, fixtureName: string, name: string) {
  await page.goto("/sheet-library");
  await page.getByLabel("File").setInputFiles(path.join(sheetFixturesDir, fixtureName));
  await expect(page.getByText(/^Ready:/)).toBeVisible();
  await page.getByLabel("Name").fill(name);
  await page.getByRole("button", { name: "Save Imported Sheet" }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();

  const link = page.getByRole("link", { name: "Open Sheet Practice" }).first();
  const href = await link.getAttribute("href");
  const sheetId = new URL(href ?? "", "http://127.0.0.1").pathname.split("/").pop() ?? "";

  expect(sheetId).toBeTruthy();

  return { sheetId: sheetId ?? "", link };
}

function getSheetPracticePath(sheetId: string) {
  return `/sheet-practice/${encodeURIComponent(sheetId)}`;
}

async function seedSheets(page: Page, optionsList: SeedSheetOptions[]) {
  const seeds = await Promise.all(
    optionsList.map(async (options) => ({
      options,
      bytes: options.fixtureName ? Array.from(await fs.readFile(path.join(sheetFixturesDir, options.fixtureName))) : null
    }))
  );

  await page.evaluate(
    ({ databaseName, seeds: browserSeeds }) =>
      new Promise<void>((resolve, reject) => {
        const openRequest = indexedDB.open(databaseName);

        openRequest.onerror = () => reject(openRequest.error);
        openRequest.onupgradeneeded = () => {
          const database = openRequest.result;
          const sheetsStore = database.createObjectStore("sheets", { keyPath: "id" });
          const artifactsStore = database.createObjectStore("artifacts", { keyPath: "sheetId" });

          sheetsStore.createIndex("name", "name");
          sheetsStore.createIndex("category", "category");
          sheetsStore.createIndex("kind", "kind");
          sheetsStore.createIndex("createdAt", "createdAt");
          artifactsStore.createIndex("kind", "kind");
          artifactsStore.createIndex("createdAt", "createdAt");
        };
        openRequest.onsuccess = () => {
          try {
            const database = openRequest.result;
            const transaction = database.transaction(["sheets", "artifacts"], "readwrite");
            const sheetsStore = transaction.objectStore("sheets");
            const artifactsStore = transaction.objectStore("artifacts");

            browserSeeds.forEach(({ options, bytes }) => {
              const mimeType = options.mimeType ?? (options.kind === "pdf" ? "application/pdf" : "image/png");
              const sheet = {
                id: options.id,
                name: options.name,
                category: "exercise",
                bpm: 96,
                timeSignature: "4/4",
                kind: options.kind,
                pageCount: options.pageCount ?? (options.kind === "pdf" ? 1 : options.imageCount ?? 1),
                imageCount: options.imageCount ?? (options.kind === "image" ? 1 : 0),
                imageDimensions: options.imageDimensions ?? [],
                mimeTypes: [mimeType],
                sizeBytes: bytes?.length ?? 512,
                originalFileNames: [options.fixtureName ?? "missing-artifact.pdf"],
                createdAt: "2026-06-21T11:00:00.000Z",
                updatedAt: "2026-06-21T11:00:00.000Z",
                lastPracticedAt: null
              };

              sheetsStore.put(sheet);

              if (bytes) {
                artifactsStore.put({
                  sheetId: options.id,
                  kind: options.kind,
                  createdAt: "2026-06-21T11:00:00.000Z",
                  files: [
                    {
                      name: options.fixtureName,
                      mimeType,
                      sizeBytes: bytes.length,
                      pageNumber: 1,
                      blob: new Blob([new Uint8Array(bytes)], { type: mimeType }),
                      width: options.imageDimensions?.[0]?.width ?? null,
                      height: options.imageDimensions?.[0]?.height ?? null
                    }
                  ]
                });
              }
            });

            transaction.oncomplete = () => {
              database.close();
              resolve();
            };
            transaction.onerror = () => reject(transaction.error);
          } catch (error) {
            reject(error);
          }
        };
      }),
    {
      databaseName: dbName,
      seeds
    }
  );
}

async function expectPdfCanvasRendered(page: Page) {
  const canvas = page.locator(".react-pdf__Page__canvas").first();

  await expect(canvas).toBeVisible();

  const canvasStats = await canvas.evaluate((node) => {
    const canvasElement = node as HTMLCanvasElement;
    const context = canvasElement.getContext("2d");

    if (!context) {
      return { width: canvasElement.width, height: canvasElement.height, changedPixels: 0 };
    }

    const data = context.getImageData(0, 0, canvasElement.width, canvasElement.height).data;
    let changedPixels = 0;

    for (let index = 0; index < data.length; index += 4) {
      const red = data[index] ?? 255;
      const green = data[index + 1] ?? 255;
      const blue = data[index + 2] ?? 255;
      const alpha = data[index + 3] ?? 0;

      if (alpha > 0 && (red < 250 || green < 250 || blue < 250)) {
        changedPixels += 1;
      }
    }

    return {
      width: canvasElement.width,
      height: canvasElement.height,
      changedPixels
    };
  });

  expect(canvasStats.width).toBeGreaterThan(100);
  expect(canvasStats.height).toBeGreaterThan(100);
  expect(canvasStats.changedPixels).toBeGreaterThan(100);

  return canvas;
}

test("sheet viewer renders imported PDF with navigation, zoom, scroll, resize, reload, and library return", async ({
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

  await clearSheetDatabase(page);
  const { link, sheetId } = await importSheet(page, "two-page-sheet.pdf", "Viewer Two Page PDF");

  await link.click();
  await expect(page).toHaveURL(/\/sheet-practice\/sheet_/);
  await expect(page.getByRole("heading", { name: "Viewer Two Page PDF" })).toBeVisible();
  await expect(page.getByText("Page 1 of 2")).toBeVisible();
  let canvas = await expectPdfCanvasRendered(page);
  const initialWidth = await canvas.evaluate((node) => (node as HTMLCanvasElement).width);

  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page.getByText("Page 2 of 2")).toBeVisible();
  await expectPdfCanvasRendered(page);
  await page.getByRole("button", { name: "Previous page" }).click();
  await expect(page.getByText("Page 1 of 2")).toBeVisible();

  await page.getByRole("button", { name: "Zoom in" }).click();
  await expect(page.getByLabel("Zoom level")).toHaveText("125%");
  canvas = await expectPdfCanvasRendered(page);
  await expect.poll(() => canvas.evaluate((node) => (node as HTMLCanvasElement).width)).toBeGreaterThan(initialWidth);

  const scrollArea = page.getByTestId("sheet-viewer-scroll");
  await scrollArea.evaluate((element) => {
    element.scrollTop = 120;
    element.scrollLeft = 80;
  });
  await expect.poll(() => scrollArea.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("heading", { name: "Viewer Two Page PDF" })).toBeVisible();
  await expectPdfCanvasRendered(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await expectPdfCanvasRendered(page);

  await page.reload();
  await expect(page.getByRole("heading", { name: "Viewer Two Page PDF" })).toBeVisible();
  await expect(page.getByText("Page 1 of 2")).toBeVisible();
  await expectPdfCanvasRendered(page);

  await page.goto(getSheetPracticePath(sheetId));
  await expect(page).toHaveURL(new RegExp(`/sheet-practice/${sheetId}$`));
  await expect(page.getByRole("heading", { name: "Viewer Two Page PDF" })).toBeVisible();
  await expect(page.getByText("Page 1 of 2")).toBeVisible();
  await expectPdfCanvasRendered(page);

  await page.getByRole("link", { name: "Library", exact: true }).click();
  await expect(page).toHaveURL(/\/sheet-library$/);
  await expect(page.getByRole("heading", { name: "Viewer Two Page PDF" })).toBeVisible();

  expect(consoleErrors).toEqual([]);
});

test("sheet viewer renders imported image artifact with zoom, resize, and reload", async ({ page }) => {
  const consoleErrors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    consoleErrors.push(error.message);
  });

  await clearSheetDatabase(page);
  const { link } = await importSheet(page, "real-sheet.png", "Viewer Pixel Scale");

  await link.click();
  await expect(page.getByRole("heading", { name: "Viewer Pixel Scale" })).toBeVisible();
  await expect(page.getByText("Page 1 of 1")).toBeVisible();

  const image = page.getByRole("img", { name: "Viewer Pixel Scale page 1" });

  await expect(image).toBeVisible();
  const initialDimensions = await image.evaluate((node) => {
    const img = node as HTMLImageElement;

    return {
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      clientWidth: img.clientWidth
    };
  });

  expect(initialDimensions.naturalWidth).toBe(2);
  expect(initialDimensions.naturalHeight).toBe(2);
  expect(initialDimensions.clientWidth).toBeGreaterThanOrEqual(300);

  await page.getByRole("button", { name: "Zoom in" }).click();
  await expect(page.getByLabel("Zoom level")).toHaveText("125%");
  await expect.poll(() => image.evaluate((node) => (node as HTMLImageElement).clientWidth)).toBeGreaterThan(
    initialDimensions.clientWidth
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(image).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(image).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Viewer Pixel Scale" })).toBeVisible();
  await expect(image).toBeVisible();

  expect(consoleErrors).toEqual([]);
});

test("sheet viewer shows clear states for missing id, unknown sheet, missing artifact, bad PDF, and bad image", async ({
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

  await clearSheetDatabase(page);
  await seedSheets(page, [
    {
      id: "sheet-missing-artifact",
      name: "Missing Artifact",
      kind: "pdf",
      fixtureName: undefined
    },
    {
      id: "sheet-bad-pdf",
      name: "Bad PDF",
      kind: "pdf",
      fixtureName: "bad-sheet.pdf",
      mimeType: "application/pdf"
    },
    {
      id: "sheet-bad-image",
      name: "Bad Image",
      kind: "image",
      fixtureName: "bad-sheet.png",
      mimeType: "image/png",
      imageCount: 1,
      imageDimensions: [{ width: 2, height: 2 }]
    }
  ]);

  await page.goto("/sheet-practice");
  await expect(page.getByRole("heading", { name: "No sheet selected" })).toBeVisible();

  await page.goto("/sheet-practice?sheetId=unknown-sheet");
  await expect(page.getByRole("heading", { name: "Sheet not found" })).toBeVisible();

  await page.goto("/sheet-practice/unknown-sheet");
  await expect(page.getByRole("heading", { name: "Sheet not found" })).toBeVisible();

  await page.goto("/sheet-practice?sheetId=sheet-missing-artifact");
  await expect(page.getByRole("heading", { name: "Sheet file missing" })).toBeVisible();

  await page.goto("/sheet-practice?sheetId=sheet-bad-pdf");
  await expect(page.getByRole("heading", { name: "PDF cannot be rendered" })).toBeVisible();

  await page.goto("/sheet-practice?sheetId=sheet-bad-image");
  await expect(page.getByRole("heading", { name: "Image cannot be rendered" })).toBeVisible();

  expect(consoleErrors).toEqual([]);
});
