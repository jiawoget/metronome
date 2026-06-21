import {
  sheetCategoryLabels,
  type ImportedSheet,
  type SheetCategory,
  type SheetListItem
} from "@/domain/sheet/types";

export type SheetCategoryFilter = "all" | SheetCategory;

export function getSheetPracticeHref(sheetId: string) {
  return `/sheet-practice?sheetId=${encodeURIComponent(sheetId)}`;
}

export function formatPageCount(sheet: Pick<ImportedSheet, "kind" | "pageCount" | "imageCount">) {
  if (sheet.kind === "pdf") {
    return sheet.pageCount === 1 ? "1 page" : `${sheet.pageCount ?? "Unknown"} pages`;
  }

  return sheet.imageCount === 1 ? "1 image" : `${sheet.imageCount} images`;
}

export function matchesSheetSearch(sheet: ImportedSheet, query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  const haystack = [
    sheet.name,
    sheet.category,
    sheetCategoryLabels[sheet.category],
    String(sheet.bpm),
    sheet.timeSignature,
    sheet.kind,
    ...sheet.originalFileNames
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedQuery);
}

export function filterSheets(
  sheets: SheetListItem[],
  options: { query: string; category: SheetCategoryFilter }
) {
  return sheets.filter(
    (sheet) =>
      (options.category === "all" || sheet.category === options.category) &&
      matchesSheetSearch(sheet, options.query)
  );
}
