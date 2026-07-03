import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  clearSheetLibraryTestState,
  PRACTICE_SESSION_DB_NAME,
  SHEET_LIBRARY_DB_NAME,
  seedRecordingHistory
} from "./fixtures/storage";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const sheetFixturesDir = path.resolve(currentDir, "../../test-fixtures/sheets");
const dbName = SHEET_LIBRARY_DB_NAME;

async function clearSheetDatabase(page: Page) {
  await clearSheetLibraryTestState(page, [dbName, PRACTICE_SESSION_DB_NAME]);
}

async function getSheetPersistence(page: Page, sheetId: string) {
  return page.evaluate(
    ({ databaseName, id }) =>
      new Promise<{
        sheetExists: boolean;
        sheetName: string | null;
        sheetCategory: string | null;
        bpm: number | null;
        timeSignature: string | null;
        tags: string[];
        favorite: boolean;
        artifactExists: boolean;
        artifactBlobSizes: number[];
      }>((resolve, reject) => {
        const openRequest = indexedDB.open(databaseName);

        openRequest.onerror = () => reject(openRequest.error);
        openRequest.onsuccess = () => {
          const database = openRequest.result;
          const transaction = database.transaction(
            ["sheets", "artifacts"],
            "readonly"
          );
          const sheetRequest = transaction.objectStore("sheets").get(id);
          const artifactRequest = transaction.objectStore("artifacts").get(id);

          transaction.oncomplete = () => {
            const artifact = artifactRequest.result as
              | { files?: Array<{ blob?: Blob }> }
              | undefined;

            database.close();
            resolve({
              sheetExists: !!sheetRequest.result,
              sheetName: sheetRequest.result?.name ?? null,
              sheetCategory: sheetRequest.result?.category ?? null,
              bpm: sheetRequest.result?.bpm ?? null,
              timeSignature: sheetRequest.result?.timeSignature ?? null,
              tags: sheetRequest.result?.tags ?? [],
              favorite: sheetRequest.result?.favorite ?? false,
              artifactExists: !!artifact,
              artifactBlobSizes:
                artifact?.files?.map((file) => file.blob?.size ?? 0) ?? []
            });
          };
          transaction.onerror = () => reject(transaction.error);
        };
      }),
    { databaseName: dbName, id: sheetId }
  );
}

function getSheetCard(page: Page, name: string) {
  return page
    .getByRole("heading", { name, exact: true })
    .locator("xpath=ancestor::div[contains(@class, 'bg-card')][1]");
}

async function sheetFixturePayload(
  fixtureName: string,
  mimeType: string,
  name = fixtureName
) {
  return {
    name,
    mimeType,
    buffer: await fs.readFile(path.join(sheetFixturesDir, fixtureName))
  };
}

async function seedRecentPracticeSummary(page: Page, sheetId: string) {
  await page.evaluate(
    ({
      databaseName,
      sessions
    }: {
      databaseName: string;
      sessions: unknown[];
    }) =>
      new Promise<void>((resolve, reject) => {
        const openRequest = indexedDB.open(databaseName);

        openRequest.onupgradeneeded = () => {
          const database = openRequest.result;

          if (!database.objectStoreNames.contains("sessions")) {
            const store = database.createObjectStore("sessions", {
              keyPath: "id"
            });

            for (const indexName of ["sourceType", "sheetId", "startedAt", "updatedAt"]) {
              store.createIndex(indexName, indexName);
            }
          }
        };
        openRequest.onerror = () => reject(openRequest.error);
        openRequest.onsuccess = () => {
          const database = openRequest.result;
          const transaction = database.transaction(["sessions"], "readwrite");
          const store = transaction.objectStore("sessions");

          for (const session of sessions) {
            store.put(session);
          }

          transaction.oncomplete = () => {
            database.close();
            resolve();
          };
          transaction.onerror = () => {
            database.close();
            reject(transaction.error);
          };
        };
      }),
    {
      databaseName: PRACTICE_SESSION_DB_NAME,
      sessions: [
        {
          id: "library-recent-session-one",
          sourceType: "sheet",
          sheetId,
          startedAt: "2026-06-21T09:00:00.000Z",
          endedAt: "2026-06-21T09:02:00.000Z",
          durationMs: 120_000,
          bpm: 96,
          timeSignature: "6/8",
          recordingCount: 0,
          latestRecordingId: null,
          updatedAt: "2026-06-21T09:02:00.000Z",
          segmentContext: null
        },
        {
          id: "library-recent-session-two",
          sourceType: "sheet",
          sheetId,
          startedAt: "2026-06-21T10:00:00.000Z",
          endedAt: "2026-06-21T10:03:00.000Z",
          durationMs: 180_000,
          bpm: 96,
          timeSignature: "6/8",
          recordingCount: 1,
          latestRecordingId: "library-recent-take",
          updatedAt: "2026-06-21T10:03:00.000Z",
          segmentContext: null
        }
      ]
    }
  );

  await seedRecordingHistory(page, {
    sessions: [],
    recordings: [],
    errorMarkers: [],
    sheetRecordingMetadata: [
      {
        id: "library-recent-take",
        type: "sheet",
        sessionId: "library-recent-session-two",
        sheetId,
        sheetName: "Autumn Etude",
        createdAt: "2026-06-21T10:03:00.000Z",
        durationMs: 30_000,
        bpm: 96,
        timeSignature: "6/8",
        segmentContext: null
      }
    ]
  });
}

test("sheet library imports real PDF and image fixtures, persists, filters, opens, and deletes", async ({
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
  await expect(
    page.getByRole("heading", { name: "Sheet Library" })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "No sheets imported yet" })
  ).toBeVisible();

  await page
    .getByLabel("File")
    .setInputFiles(path.join(sheetFixturesDir, "real-sheet.pdf"));
  await expect(page.getByText("Ready: PDF with 1 page.")).toBeVisible();
  await page.getByLabel("Name").fill("Autumn Etude");
  await page
    .getByLabel("Sheet category", { exact: true })
    .selectOption("exercise");
  await page.getByLabel("BPM").fill("96");
  await page.getByLabel("Time signature").fill("6/8");
  await page.getByRole("button", { name: "Save Imported Sheet" }).click();

  await expect(
    page.getByRole("heading", { name: "Autumn Etude" })
  ).toBeVisible();
  const autumnSheet = getSheetCard(page, "Autumn Etude");
  await expect(
    autumnSheet.getByText("Exercise", { exact: true })
  ).toBeVisible();
  await expect(autumnSheet.getByText("1 page", { exact: true })).toBeVisible();
  await expect(page.getByText("PDF artifact parsed: 1 page")).toBeVisible();
  await expect(page.getByText("Not practiced yet")).toBeVisible();
  await expect(autumnSheet.getByText("No tags")).toBeVisible();
  const autumnFavoriteButton = autumnSheet.getByRole("button", {
    name: "Favorite Autumn Etude"
  });
  await expect(autumnFavoriteButton).toHaveAttribute("aria-pressed", "false");
  const practiceHref = await page
    .getByRole("link", { name: "Open Sheet Practice" })
    .getAttribute("href");
  const pdfSheetId =
    new URL(practiceHref ?? "", "http://127.0.0.1").pathname.split("/").pop() ??
    "";

  expect(pdfSheetId).toMatch(/^sheet_/);
  await expect
    .poll(() => getSheetPersistence(page, pdfSheetId ?? ""))
    .toMatchObject({
      sheetExists: true,
      tags: [],
      favorite: false,
      artifactExists: true
    });

  await autumnFavoriteButton.click();
  await expect(page.getByText("Favorited Autumn Etude.")).toBeVisible();
  await expect(
    autumnSheet.getByRole("button", { name: "Unfavorite Autumn Etude" })
  ).toHaveAttribute("aria-pressed", "true");
  await autumnSheet
    .getByLabel("Edit tags for Autumn Etude")
    .fill("Warm Up, Focus");
  await autumnSheet.getByRole("button", { name: "Save tags" }).click();
  await expect(page.getByText("Updated tags for Autumn Etude.")).toBeVisible();
  await expect(autumnSheet.getByText("Warm Up", { exact: true })).toBeVisible();
  await expect(autumnSheet.getByText("Focus", { exact: true })).toBeVisible();
  await expect
    .poll(() => getSheetPersistence(page, pdfSheetId ?? ""))
    .toMatchObject({
      tags: ["Warm Up", "Focus"],
      favorite: true
    });

  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Autumn Etude" })
  ).toBeVisible();
  await expect(page.getByText("PDF artifact parsed: 1 page")).toBeVisible();
  const reloadedAutumnSheet = getSheetCard(page, "Autumn Etude");
  await expect(
    reloadedAutumnSheet.getByRole("button", { name: "Unfavorite Autumn Etude" })
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    reloadedAutumnSheet.getByText("Warm Up", { exact: true })
  ).toBeVisible();
  await expect(
    reloadedAutumnSheet.getByText("Focus", { exact: true })
  ).toBeVisible();

  await reloadedAutumnSheet
    .getByLabel("Edit tags for Autumn Etude")
    .fill("this-tag-is-definitely-too-long");
  await reloadedAutumnSheet.getByRole("button", { name: "Save tags" }).click();
  await expect(
    page.getByText("Tags must be 24 characters or fewer.")
  ).toBeVisible();
  await expect(
    reloadedAutumnSheet.getByText("Warm Up", { exact: true })
  ).toBeVisible();
  await expect(
    reloadedAutumnSheet.getByText("Focus", { exact: true })
  ).toBeVisible();

  await page
    .getByLabel("File")
    .setInputFiles(path.join(sheetFixturesDir, "real-sheet.pdf"));
  await expect(page.getByText("Ready: PDF with 1 page.")).toBeVisible();
  await page.getByLabel("Name").fill("Plain Song");
  await page
    .getByLabel("Sheet category", { exact: true })
    .selectOption("song");
  await page.getByLabel("BPM").fill("110");
  await page.getByLabel("Time signature").fill("4/4");
  await page.getByRole("button", { name: "Save Imported Sheet" }).click();
  await expect(
    page.getByRole("heading", { name: "Plain Song" })
  ).toBeVisible();

  await seedRecentPracticeSummary(page, pdfSheetId);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Autumn Etude" })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Plain Song" })
  ).toBeVisible();
  const practicedAutumnSheet = getSheetCard(page, "Autumn Etude");
  const plainSongSheet = getSheetCard(page, "Plain Song");
  const autumnPracticeSummary = practicedAutumnSheet.getByLabel(
    "Recent practice for Autumn Etude"
  );

  await expect(
    autumnPracticeSummary.getByText("Recent practice", { exact: true })
  ).toBeVisible();
  await expect(autumnPracticeSummary.getByText(/Last practiced/)).toBeVisible();
  await expect(
    autumnPracticeSummary.getByText("5 min · 2 sessions · 1 recording")
  ).toBeVisible();
  await expect(
    plainSongSheet.getByText("No local practice summary yet.")
  ).toBeVisible();

  await page.getByLabel("Search").fill("autumn");
  await expect(
    page.getByRole("heading", { name: "Autumn Etude" })
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Plain Song" })).toHaveCount(
    0
  );
  await expect(
    getSheetCard(page, "Autumn Etude").getByText(
      "5 min · 2 sessions · 1 recording"
    )
  ).toBeVisible();
  await page.getByLabel("Search").fill("");

  await page.getByRole("button", { name: "Show favorites only" }).click();
  await expect(
    page.getByRole("heading", { name: "Autumn Etude" })
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Plain Song" })).toHaveCount(
    0
  );
  await page.getByLabel("Tag filter").fill("focus");
  await expect(
    page.getByRole("heading", { name: "Autumn Etude" })
  ).toBeVisible();
  await page.getByLabel("Sheet category filter").selectOption("song");
  await expect(page.getByRole("heading", { name: "Autumn Etude" })).toHaveCount(
    0
  );
  await page.getByLabel("Sheet category filter").selectOption("exercise");
  await page.getByLabel("Search").fill("warm up");
  await expect(
    page.getByRole("heading", { name: "Autumn Etude" })
  ).toBeVisible();
  await page.getByLabel("Search").fill("");
  await page.getByLabel("Tag filter").fill("");
  await page.getByRole("button", { name: "Show favorites only" }).click();
  await page.getByLabel("Sheet category filter").selectOption("all");
  await page
    .getByRole("heading", { name: "Plain Song", exact: true })
    .locator("xpath=ancestor::div[contains(@class, 'bg-card')][1]")
    .getByRole("button", { name: "Delete" })
    .click();
  await expect(page.getByRole("heading", { name: "Plain Song" })).toHaveCount(
    0
  );

  await page.getByRole("button", { name: "Edit Metadata" }).click();
  await page.getByLabel("Edit sheet name").fill("");
  await page.getByLabel("Edit sheet BPM").fill("12");
  await page.getByRole("button", { name: "Save metadata" }).click();
  await expect(
    page.getByText("Sheet name is required. BPM must be at least 30.")
  ).toBeVisible();
  await page.getByLabel("Edit sheet name").fill("Winter Etude");
  await page.getByLabel("Edit sheet category").selectOption("scale");
  await page.getByLabel("Edit sheet BPM").fill("144");
  await page.getByLabel("Edit sheet time signature").fill("7/8");
  await page.getByRole("button", { name: "Save metadata" }).click();
  await expect(page.getByText("Updated Winter Etude.")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Winter Etude" })
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Autumn Etude" })).toHaveCount(
    0
  );
  const winterSheet = getSheetCard(page, "Winter Etude");

  await expect(
    winterSheet.locator("span").filter({ hasText: /^Scale$/ })
  ).toBeVisible();
  await expect(winterSheet.getByText("144", { exact: true })).toBeVisible();
  await expect(winterSheet.getByText("7/8", { exact: true })).toBeVisible();
  await expect
    .poll(() => getSheetPersistence(page, pdfSheetId ?? ""))
    .toMatchObject({
      sheetExists: true,
      sheetName: "Winter Etude",
      sheetCategory: "scale",
      bpm: 144,
      timeSignature: "7/8",
      tags: ["Warm Up", "Focus"],
      favorite: true,
      artifactExists: true
    });

  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Winter Etude" })
  ).toBeVisible();
  await expect(page.getByText("PDF artifact parsed: 1 page")).toBeVisible();

  await page.getByLabel("Search").fill("7/8");
  await expect(
    page.getByRole("heading", { name: "Winter Etude" })
  ).toBeVisible();
  await page.getByLabel("Search").fill("missing sheet");
  await expect(page.getByRole("heading", { name: "Winter Etude" })).toHaveCount(
    0
  );
  await page.getByLabel("Search").fill("");
  await page.getByLabel("Sheet category filter").selectOption("song");
  await expect(page.getByRole("heading", { name: "Winter Etude" })).toHaveCount(
    0
  );
  await page.getByLabel("Sheet category filter").selectOption("scale");
  await expect(
    page.getByRole("heading", { name: "Winter Etude" })
  ).toBeVisible();

  await page.getByRole("link", { name: "Open Sheet Practice" }).click();
  await expect(page).toHaveURL(/\/sheet-practice\/sheet_/);
  await expect(
    page.getByRole("heading", { name: "Winter Etude" })
  ).toBeVisible();
  await expect(page.getByText("Page 1 of 1")).toBeVisible();

  await page.goto("/sheet-library");
  await page.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("heading", { name: "Winter Etude" })).toHaveCount(
    0
  );
  await expect
    .poll(() => getSheetPersistence(page, pdfSheetId ?? ""))
    .toEqual({
      sheetExists: false,
      sheetName: null,
      sheetCategory: null,
      bpm: null,
      timeSignature: null,
      tags: [],
      favorite: false,
      artifactExists: false,
      artifactBlobSizes: []
    });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Winter Etude" })).toHaveCount(
    0
  );
  await expect(
    page.getByRole("heading", { name: "No sheets imported yet" })
  ).toBeVisible();

  await page
    .getByLabel("File")
    .setInputFiles(path.join(sheetFixturesDir, "real-sheet.png"));
  await expect(page.getByText("Ready: 1 image.")).toBeVisible();
  await expect(page.getByText("2 x 2")).toBeVisible();
  await page.getByLabel("Name").fill("Pixel Scale");
  await page
    .getByLabel("Sheet category", { exact: true })
    .selectOption("scale");
  await page.getByLabel("BPM").fill("72");
  await page.getByLabel("Time signature").fill("4/4");
  await page.getByRole("button", { name: "Save Imported Sheet" }).click();
  await expect(
    page.getByRole("heading", { name: "Pixel Scale" })
  ).toBeVisible();
  await expect(page.getByText("Image artifact decoded: 2 x 2")).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Pixel Scale" })
  ).toBeVisible();
  await expect(page.getByText("Image artifact decoded: 2 x 2")).toBeVisible();

  await page
    .getByLabel("File")
    .setInputFiles(path.join(sheetFixturesDir, "unsupported-sheet.txt"));
  await expect(page.getByText(/Unsupported file type/)).toBeVisible();
  await page
    .getByLabel("File")
    .setInputFiles(path.join(sheetFixturesDir, "bad-sheet.pdf"));
  await expect(page.getByText(/PDF could not be read/)).toBeVisible();
  await page
    .getByLabel("File")
    .setInputFiles(path.join(sheetFixturesDir, "bad-sheet.png"));
  await expect(page.getByText(/image could not be decoded/)).toBeVisible();

  expect(consoleErrors).toEqual([]);
});

test("sheet library batch imports mixed files and preserves multi-image single import", async ({
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
  await page.getByLabel("File").setInputFiles([
    await sheetFixturePayload("real-sheet.pdf", "application/pdf", "batch-pdf.pdf"),
    await sheetFixturePayload("real-sheet.png", "image/png", "batch-image.png"),
    await sheetFixturePayload("unsupported-sheet.txt", "text/plain"),
    await sheetFixturePayload("bad-sheet.pdf", "application/pdf"),
    await sheetFixturePayload("bad-sheet.png", "image/png")
  ]);
  await expect(page.getByText(/Unsupported file type/)).toBeVisible();
  await page.getByRole("button", { name: "Import files separately" }).click();

  await expect(
    page.getByText("Imported 2 of 5 files. 3 failed.")
  ).toBeVisible();
  await expect(
    page.getByText("batch-pdf.pdf: Imported batch-pdf.")
  ).toBeVisible();
  await expect(
    page.getByText("batch-image.png: Imported batch-image.")
  ).toBeVisible();
  await expect(page.getByText(/unsupported-sheet\.txt: Unsupported file type/)).toBeVisible();
  await expect(page.getByText(/bad-sheet\.pdf: The uploaded PDF could not be read/)).toBeVisible();
  await expect(page.getByText(/bad-sheet\.png: The uploaded image could not be decoded/)).toBeVisible();

  const batchPdfCard = getSheetCard(page, "batch-pdf");
  const batchImageCard = getSheetCard(page, "batch-image");

  await expect(batchPdfCard).toBeVisible();
  await expect(batchImageCard).toBeVisible();
  await expect(batchPdfCard.getByText("PDF artifact parsed: 1 page")).toBeVisible();
  await expect(batchImageCard.getByText("Image artifact decoded: 2 x 2")).toBeVisible();
  await expect(page.getByRole("heading", { name: "unsupported-sheet" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "bad-sheet" })).toHaveCount(0);

  const batchPdfHref = await batchPdfCard
    .getByRole("link", { name: "Open Sheet Practice" })
    .getAttribute("href");
  const batchImageHref = await batchImageCard
    .getByRole("link", { name: "Open Sheet Practice" })
    .getAttribute("href");
  const batchPdfId =
    new URL(batchPdfHref ?? "", "http://127.0.0.1").pathname.split("/").pop() ??
    "";
  const batchImageId =
    new URL(batchImageHref ?? "", "http://127.0.0.1").pathname
      .split("/")
      .pop() ?? "";

  await expect.poll(() => getSheetPersistence(page, batchPdfId)).toMatchObject({
    sheetExists: true,
    sheetName: "batch-pdf",
    tags: [],
    favorite: false,
    artifactExists: true
  });
  await expect.poll(() => getSheetPersistence(page, batchImageId)).toMatchObject({
    sheetExists: true,
    sheetName: "batch-image",
    tags: [],
    favorite: false,
    artifactExists: true
  });
  await expect
    .poll(async () =>
      (await getSheetPersistence(page, batchPdfId)).artifactBlobSizes.every(
        (size) => size > 0
      )
    )
    .toBe(true);
  await expect
    .poll(async () =>
      (await getSheetPersistence(page, batchImageId)).artifactBlobSizes.every(
        (size) => size > 0
      )
    )
    .toBe(true);

  await page.reload();
  await expect(page.getByRole("heading", { name: "batch-pdf" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "batch-image" })).toBeVisible();
  await expect(page.getByText("PDF artifact parsed: 1 page")).toBeVisible();
  await expect(page.getByText("Image artifact decoded: 2 x 2")).toBeVisible();
  await expect(page.getByRole("heading", { name: "unsupported-sheet" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "bad-sheet" })).toHaveCount(0);

  await clearSheetDatabase(page);
  await page.getByLabel("File").setInputFiles([
    await sheetFixturePayload("real-sheet.png", "image/png", "multi-a.png"),
    await sheetFixturePayload("real-sheet.png", "image/png", "multi-b.png")
  ]);
  await expect(page.getByText("Ready: 2 images.")).toBeVisible();
  await page.getByLabel("Name").fill("Two Image Sheet");
  await page.getByRole("button", { name: "Save Imported Sheet" }).click();

  await expect(
    page.getByRole("heading", { name: "Two Image Sheet" })
  ).toHaveCount(1);
  const multiImageCard = getSheetCard(page, "Two Image Sheet");

  await expect(multiImageCard.getByText("2 images")).toBeVisible();
  await expect(
    multiImageCard.getByText("Image artifact decoded: 2 x 2")
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "multi-a" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "multi-b" })).toHaveCount(0);

  const multiImageHref = await multiImageCard
    .getByRole("link", { name: "Open Sheet Practice" })
    .getAttribute("href");
  const multiImageId =
    new URL(multiImageHref ?? "", "http://127.0.0.1").pathname
      .split("/")
      .pop() ?? "";
  const multiImagePersistence = await getSheetPersistence(page, multiImageId);

  expect(multiImagePersistence).toMatchObject({
    sheetExists: true,
    sheetName: "Two Image Sheet",
    tags: [],
    favorite: false,
    artifactExists: true
  });
  expect(multiImagePersistence.artifactBlobSizes).toHaveLength(2);
  expect(multiImagePersistence.artifactBlobSizes.every((size) => size > 0)).toBe(
    true
  );

  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Two Image Sheet" })
  ).toBeVisible();
  await expect(page.getByText("Image artifact decoded: 2 x 2")).toBeVisible();

  expect(consoleErrors).toEqual([]);
});
