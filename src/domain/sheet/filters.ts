import {
  resolveSheetOrganization,
  normalizeSheetTag
} from "@/domain/sheet/validation";
import {
  sheetCategoryLabels,
  type ImportedSheet,
  type SheetCategory,
  type SheetListItem
} from "@/domain/sheet/types";

export type SheetCategoryFilter = "all" | SheetCategory;
export type SheetFavoriteFilter = "all" | "favorites";
export type SheetFilterOptions = {
  query: string;
  category: SheetCategoryFilter;
  favorite?: SheetFavoriteFilter;
  tag?: string | null;
};

export function formatPageCount(sheet: Pick<ImportedSheet, "kind" | "pageCount" | "imageCount">) {
  if (sheet.kind === "pdf") {
    return sheet.pageCount === 1 ? "1 page" : `${sheet.pageCount ?? "Unknown"} pages`;
  }

  return sheet.imageCount === 1 ? "1 image" : `${sheet.imageCount} images`;
}

function matchesSheetSearch(sheet: ImportedSheet, query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  const organization = resolveSheetOrganization(sheet);
  const haystack = [
    sheet.name,
    sheet.category,
    sheetCategoryLabels[sheet.category],
    String(sheet.bpm),
    sheet.timeSignature,
    sheet.kind,
    ...sheet.originalFileNames,
    ...organization.tags
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedQuery);
}

function matchesOrganizationFilters(sheet: ImportedSheet, options: SheetFilterOptions) {
  const organization = resolveSheetOrganization(sheet);

  if ((options.favorite ?? "all") === "favorites" && !organization.favorite) {
    return false;
  }

  const requestedTag = options.tag?.trim() ?? "";

  if (!requestedTag) {
    return true;
  }

  const normalizedTag = normalizeSheetTag(requestedTag);

  if (!normalizedTag) {
    return false;
  }

  return organization.tags.some((tag) => tag.toLowerCase() === normalizedTag.toLowerCase());
}

export function filterSheets(
  sheets: SheetListItem[],
  options: SheetFilterOptions
) {
  return sheets.filter(
    (sheet) =>
      (options.category === "all" || sheet.category === options.category) &&
      matchesSheetSearch(sheet, options.query) &&
      matchesOrganizationFilters(sheet, options)
  );
}
