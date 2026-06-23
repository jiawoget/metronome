import { expect, type Locator, type Page } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const sheetFixturesDir = path.resolve(currentDir, "../../../test-fixtures/sheets");

export type ImportedTestSheet = {
  sheetId: string;
  link: Locator;
};

export async function importTestSheet(
  page: Page,
  {
    name,
    bpm = "72",
    timeSignature = "4/4",
    fixture = "real-sheet.png"
  }: {
    name: string;
    bpm?: string | number;
    timeSignature?: string;
    fixture?: string;
  }
): Promise<ImportedTestSheet> {
  await page.goto("/sheet-library");
  await page.getByLabel("File").setInputFiles(path.join(sheetFixturesDir, fixture));
  await expect(page.getByText(/^Ready:/)).toBeVisible();
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("BPM").fill(String(bpm));
  await page.getByLabel("Time signature").fill(timeSignature);
  await page.getByRole("button", { name: "Save Imported Sheet" }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();

  const link = page.getByRole("link", { name: "Open Sheet Practice" }).first();
  const href = await link.getAttribute("href");
  const sheetId = new URL(href ?? "", "http://127.0.0.1").pathname.split("/").pop() ?? "";

  expect(sheetId).toBeTruthy();

  return { link, sheetId };
}
