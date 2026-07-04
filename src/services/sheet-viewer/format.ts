import type { SheetViewerErrorCode } from "@/services/sheet-viewer/types";

type InspectionErrorCode = Extract<
  SheetViewerErrorCode,
  "bad-pdf" | "bad-image" | "missing-artifact" | "artifact-mismatch"
>;

export function titleForSheetViewerInspectionCode(code: InspectionErrorCode) {
  return {
    "bad-pdf": "PDF cannot be rendered",
    "bad-image": "Image cannot be rendered",
    "missing-artifact": "Sheet file missing",
    "artifact-mismatch": "Sheet file mismatch"
  }[code];
}

export function formatSheetViewerPageLabel(currentPage: number, totalPages: number) {
  return `Page ${currentPage} of ${totalPages}`;
}

export function formatManualSegmentPageTurnDelay(delayMs: number | null) {
  if (delayMs === null) {
    return null;
  }

  return delayMs >= 1000
    ? `${Math.round(delayMs / 1000)}s`
    : `${Math.round(delayMs)}ms`;
}
