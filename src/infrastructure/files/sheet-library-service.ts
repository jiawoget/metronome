"use client";

import { browserSheetImportAdapter } from "@/infrastructure/files/sheet-import-adapter";
import { sheetLibraryRepository } from "@/infrastructure/files/sheet-library-repository";
import { createSheetLibraryService } from "@/services/sheet-library";

export const browserSheetLibraryService = createSheetLibraryService({
  repository: sheetLibraryRepository,
  importAdapter: browserSheetImportAdapter
});
