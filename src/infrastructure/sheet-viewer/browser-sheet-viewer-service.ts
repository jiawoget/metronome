"use client";

import { browserSheetLibraryService } from "@/infrastructure/files/sheet-library-service";
import { browserSheetViewerAdapter } from "@/infrastructure/sheet-viewer/browser-sheet-viewer-adapter";
import { createSheetViewerService } from "@/services/sheet-viewer";

export const browserSheetViewerService = createSheetViewerService({
  sheetLibrary: browserSheetLibraryService,
  viewerAdapter: browserSheetViewerAdapter
});

if (process.env.NEXT_PUBLIC_METRONOME_E2E === "1" && typeof window !== "undefined") {
  (window as Window & { __metronomeSheetViewerService?: typeof browserSheetViewerService })
    .__metronomeSheetViewerService = browserSheetViewerService;
}
