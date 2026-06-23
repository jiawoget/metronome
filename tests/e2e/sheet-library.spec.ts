import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { SHEET_LIBRARY_DB_NAME } from "./fixtures/storage";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const sheetFixturesDir = path.resolve(currentDir, "../../test-fixtures/sheets");
const dbName = SHEET_LIBRARY_DB_NAME;

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
  const autumnSheet = page
    .getByRole("heading", { name: "Autumn Etude" })
    .locator("../..");
  await expect(
    autumnSheet.getByText("Exercise", { exact: true })
  ).toBeVisible();
  await expect(autumnSheet.getByText("1 page", { exact: true })).toBeVisible();
  await expect(page.getByText("PDF artifact parsed: 1 page")).toBeVisible();
  await expect(page.getByText("Not practiced yet")).toBeVisible();
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
      artifactExists: true
    });

  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Autumn Etude" })
  ).toBeVisible();
  await expect(page.getByText("PDF artifact parsed: 1 page")).toBeVisible();

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
  const winterSheet = page
    .getByRole("heading", { name: "Winter Etude" })
    .locator("../..");

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
