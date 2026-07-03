import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { importTestSheet } from "./fixtures/sheets";
import { SHEET_LIBRARY_DB_NAME } from "./fixtures/storage";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const sheetFixturesDir = path.resolve(currentDir, "../../test-fixtures/sheets");
const dbName = SHEET_LIBRARY_DB_NAME;

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

type BrowserThumbnailSet =
  | {
      status: "ready";
      sheetId: string;
      pageCount: number;
      thumbnails: Array<{
        sheetId: string;
        pageNumber: number;
        width: number;
        height: number;
        url: string;
      }>;
    }
  | {
      status: "error";
      code: string;
      title: string;
      message: string;
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

async function loadPageThumbnailsInBrowser(page: Page, sheetId: string) {
  return page.evaluate(async (targetSheetId): Promise<BrowserThumbnailSet> => {
    const service = (window as Window & {
      __metronomeSheetViewerService?: {
        loadPageThumbnails: (sheetId: string) => Promise<BrowserThumbnailSet>;
      };
    }).__metronomeSheetViewerService;

    if (!service) {
      throw new Error("Sheet viewer E2E service is unavailable.");
    }

    return service.loadPageThumbnails(targetSheetId);
  }, sheetId);
}

async function revokePageThumbnailsInBrowser(page: Page, thumbnails: BrowserThumbnailSet) {
  await page.evaluate((thumbnailSet) => {
    const service = (window as Window & {
      __metronomeSheetViewerService?: {
        revokePageThumbnails: (thumbnails: BrowserThumbnailSet) => void;
      };
    }).__metronomeSheetViewerService;

    if (!service) {
      throw new Error("Sheet viewer E2E service is unavailable.");
    }

    service.revokePageThumbnails(thumbnailSet);
  }, thumbnails);
}

async function expectThumbnailUrlsDecodable(page: Page, urls: string[]) {
  const dimensions = await page.evaluate(async (thumbnailUrls) => Promise.all(
    thumbnailUrls.map((url) => new Promise<{ width: number; height: number }>((resolve, reject) => {
      const image = new Image();

      image.onload = () => resolve({
        width: image.naturalWidth,
        height: image.naturalHeight
      });
      image.onerror = () => reject(new Error(`Thumbnail did not decode: ${url}`));
      image.src = url;
    }))
  ), urls);

  for (const dimension of dimensions) {
    expect(dimension.width).toBeGreaterThan(0);
    expect(dimension.height).toBeGreaterThan(0);
  }

  return dimensions;
}

async function expectThumbnailUrlRevoked(page: Page, url: string) {
  await expect(
    page.evaluate((thumbnailUrl) => new Promise((resolve, reject) => {
      const image = new Image();

      image.onload = () => resolve("loaded");
      image.onerror = () => reject(new Error("revoked"));
      image.src = thumbnailUrl;
    }), url)
  ).rejects.toThrow("revoked");
}

async function expectPdfCanvasRendered(page: Page) {
  const canvas = page.locator(".react-pdf__Page__canvas").first();

  await expect(canvas).toBeVisible();

  const getCanvasStats = () => canvas.evaluate((node) => {
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

  await expect.poll(async () => (await getCanvasStats()).width).toBeGreaterThan(100);
  await expect.poll(async () => (await getCanvasStats()).height).toBeGreaterThan(100);
  await expect
    .poll(async () => (await getCanvasStats()).changedPixels, {
      message: "PDF canvas should contain non-white painted pixels after PDF.js rendering completes"
    })
    .toBeGreaterThan(100);

  return canvas;
}

async function expectViewerControlsDoNotOverlap(page: Page) {
  const scrollBox = await page.getByTestId("sheet-viewer-scroll").boundingBox();
  const controlsBox = await page.getByTestId("sheet-practice-controls").boundingBox();

  expect(scrollBox).not.toBeNull();
  expect(controlsBox).not.toBeNull();

  if (!scrollBox || !controlsBox) {
    return;
  }

  expect(scrollBox.y + scrollBox.height).toBeLessThanOrEqual(controlsBox.y);
}

async function submitPageJump(page: Page, value: string, submitWithEnter = false) {
  const input = page.getByRole("textbox", { name: "Page number" });

  await input.fill(value);

  if (submitWithEnter) {
    await input.press("Enter");
    return;
  }

  await page.getByRole("button", { name: "Go", exact: true }).click();
}

async function expectPageJumpError(page: Page, value: string, message: string) {
  await submitPageJump(page, value);
  await expect(page.getByText(message, { exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Page number" })).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText("Page 1 of 2")).toBeVisible();
  await expect(page.getByRole("button", { name: "Go to page 1" })).toHaveAttribute("aria-current", "page");
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
  await page.setViewportSize({ width: 1280, height: 800 });
  const { link, sheetId } = await importTestSheet(page, {
    fixture: "two-page-sheet.pdf",
    name: "Viewer Two Page PDF",
    bpm: "72",
    timeSignature: "4/4"
  });

  await link.click();
  await expect(page).toHaveURL(/\/sheet-practice\/sheet_/);
  await expect(page.getByRole("heading", { name: "Viewer Two Page PDF" })).toBeVisible();
  await expect(page.getByText("Page 1 of 2")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Page thumbnails" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Go to page 1" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("button", { name: "Go to page 2" })).toBeVisible();
  let canvas = await expectPdfCanvasRendered(page);
  const initialWidth = await canvas.evaluate((node) => (node as HTMLCanvasElement).width);

  await expect(page.getByRole("textbox", { name: "Page number" })).toBeVisible();
  await submitPageJump(page, "2");
  await expect(page.getByText("Page 2 of 2")).toBeVisible();
  await expect(page.getByRole("button", { name: "Go to page 2" })).toHaveAttribute("aria-current", "page");
  await expectPdfCanvasRendered(page);
  await submitPageJump(page, "1", true);
  await expect(page.getByText("Page 1 of 2")).toBeVisible();
  await expect(page.getByRole("button", { name: "Go to page 1" })).toHaveAttribute("aria-current", "page");

  await expectPageJumpError(page, "999", "Page must be between 1 and 2.");
  await expectPageJumpError(page, "abc", "Enter a page number from 1 to 2.");
  await expectPageJumpError(page, "1.5", "Enter a page number from 1 to 2.");
  await expectPageJumpError(page, "-1", "Enter a page number from 1 to 2.");
  await expectPageJumpError(page, "0", "Page must be between 1 and 2.");
  await submitPageJump(page, "2");
  await expect(page.getByText("Page 2 of 2")).toBeVisible();
  await expect(page.getByRole("button", { name: "Go to page 2" })).toHaveAttribute("aria-current", "page");

  await page.getByRole("button", { name: "Previous page" }).click();
  await expect(page.getByText("Page 1 of 2")).toBeVisible();
  await page.getByRole("button", { name: "Go to page 2" }).click();
  await expect(page.getByText("Page 2 of 2")).toBeVisible();
  await page.getByRole("button", { name: "Previous page" }).click();
  await expect(page.getByText("Page 1 of 2")).toBeVisible();

  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page.getByText("Page 2 of 2")).toBeVisible();
  await expect(page.getByRole("button", { name: "Go to page 2" })).toHaveAttribute("aria-current", "page");
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
  await expect(page.getByRole("button", { name: "Page thumbnails" })).toBeVisible();
  await page.getByRole("button", { name: "Page thumbnails" }).click();
  await expect(page.getByRole("button", { name: "Page thumbnails" })).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("button", { name: "Go to page 2" }).click();
  await expect(page.getByRole("button", { name: "Page thumbnails" })).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByText("Page 2 of 2")).toBeVisible();
  await expectPdfCanvasRendered(page);
  await submitPageJump(page, "1");
  await expect(page.getByText("Page 1 of 2")).toBeVisible();
  await expectPdfCanvasRendered(page);
  await expectViewerControlsDoNotOverlap(page);
  await page.setViewportSize({ width: 900, height: 800 });
  await expect(page.getByRole("heading", { name: "Viewer Two Page PDF" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Page thumbnails" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Page thumbnails" })).toBeHidden();
  await page.getByRole("button", { name: "Page thumbnails" }).click();
  await expect(page.getByRole("button", { name: "Page thumbnails" })).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("button", { name: "Go to page 1" }).click();
  await expect(page.getByText("Page 1 of 2")).toBeVisible();
  await expectViewerControlsDoNotOverlap(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.getByRole("navigation", { name: "Page thumbnails" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Go to page 1" })).toHaveAttribute("aria-current", "page");
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

test("sheet viewer thumbnail service returns decodable blob thumbnails for imported PDF and image artifacts", async ({
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
  const pdfSheet = await importTestSheet(page, {
    fixture: "two-page-sheet.pdf",
    name: "Thumbnail Two Page PDF",
    bpm: "72",
    timeSignature: "4/4"
  });

  await page.goto(getSheetPracticePath(pdfSheet.sheetId));
  await expect(page.getByRole("heading", { name: "Thumbnail Two Page PDF" })).toBeVisible();

  const pdfThumbnails = await loadPageThumbnailsInBrowser(page, pdfSheet.sheetId);

  expect(pdfThumbnails).toMatchObject({
    status: "ready",
    sheetId: pdfSheet.sheetId,
    pageCount: 2
  });

  if (pdfThumbnails.status !== "ready") {
    throw new Error(`PDF thumbnail service failed: ${pdfThumbnails.code}`);
  }

  expect(pdfThumbnails.thumbnails.map((thumbnail) => thumbnail.pageNumber)).toEqual([1, 2]);
  expect(pdfThumbnails.thumbnails.every((thumbnail) => thumbnail.url.startsWith("blob:"))).toBe(true);
  expect(pdfThumbnails.thumbnails.every((thumbnail) => thumbnail.width > 0 && thumbnail.height > 0)).toBe(true);
  await expectThumbnailUrlsDecodable(page, pdfThumbnails.thumbnails.map((thumbnail) => thumbnail.url));
  await revokePageThumbnailsInBrowser(page, pdfThumbnails);
  await expectThumbnailUrlRevoked(page, pdfThumbnails.thumbnails[0].url);

  const imageSheet = await importTestSheet(page, {
    fixture: "real-sheet.png",
    name: "Thumbnail Pixel Scale",
    bpm: "72",
    timeSignature: "4/4"
  });

  await page.goto(getSheetPracticePath(imageSheet.sheetId));
  await expect(page.getByRole("heading", { name: "Thumbnail Pixel Scale" })).toBeVisible();

  const imageThumbnails = await loadPageThumbnailsInBrowser(page, imageSheet.sheetId);

  expect(imageThumbnails).toMatchObject({
    status: "ready",
    sheetId: imageSheet.sheetId,
    pageCount: 1
  });

  if (imageThumbnails.status !== "ready") {
    throw new Error(`Image thumbnail service failed: ${imageThumbnails.code}`);
  }

  expect(imageThumbnails.thumbnails.map((thumbnail) => thumbnail.pageNumber)).toEqual([1]);
  expect(imageThumbnails.thumbnails[0].url).toMatch(/^blob:/);
  expect(imageThumbnails.thumbnails[0].width).toBeGreaterThan(0);
  expect(imageThumbnails.thumbnails[0].height).toBeGreaterThan(0);
  await expectThumbnailUrlsDecodable(page, [imageThumbnails.thumbnails[0].url]);
  await revokePageThumbnailsInBrowser(page, imageThumbnails);

  expect(consoleErrors.filter((error) => !error.includes("ERR_FILE_NOT_FOUND"))).toEqual([]);
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
  const { link } = await importTestSheet(page, {
    fixture: "real-sheet.png",
    name: "Viewer Pixel Scale",
    bpm: "72",
    timeSignature: "4/4"
  });

  await link.click();
  await expect(page.getByRole("heading", { name: "Viewer Pixel Scale" })).toBeVisible();
  await expect(page.getByText("Page 1 of 1")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Page thumbnails" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Go to page 1" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("textbox", { name: "Page number" })).toBeVisible();
  await submitPageJump(page, "2");
  await expect(page.getByText("Page must be between 1 and 1.", { exact: true })).toBeVisible();
  await expect(page.getByText("Page 1 of 1")).toBeVisible();
  await submitPageJump(page, "1");
  await expect(page.getByText("Page must be between 1 and 1.", { exact: true })).toHaveCount(0);

  const image = page
    .getByTestId("sheet-viewer-scroll")
    .getByRole("img", { name: "Viewer Pixel Scale page 1", exact: true });

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

  await expect(loadPageThumbnailsInBrowser(page, "sheet-bad-pdf")).resolves.toMatchObject({
    status: "error",
    code: "bad-pdf"
  });
  await expect(loadPageThumbnailsInBrowser(page, "sheet-bad-image")).resolves.toMatchObject({
    status: "error",
    code: "bad-image"
  });

  expect(consoleErrors).toEqual([]);
});
