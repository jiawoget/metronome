import type { SheetArtifact } from "@/domain/sheet";
import type {
  SheetViewerAdapter,
  SheetViewerErrorCode,
  SheetViewerLibraryReader,
  SheetViewerLoadState,
  SheetViewerObjectUrls
} from "@/services/sheet-viewer/types";

type SheetViewerServiceOptions = {
  sheetLibrary: SheetViewerLibraryReader;
  viewerAdapter: SheetViewerAdapter;
};

export type SheetViewerService = {
  loadSheet: (sheetId: string | null | undefined) => Promise<SheetViewerLoadState>;
  createArtifactObjectUrls: (artifact: SheetArtifact) => SheetViewerObjectUrls;
  revokeArtifactObjectUrls: (objectUrls: SheetViewerObjectUrls) => void;
};

function errorState(code: SheetViewerErrorCode, title: string, message: string): SheetViewerLoadState {
  return {
    status: "error",
    code,
    title,
    message
  };
}

function hasReadableArtifactFile(artifact: SheetArtifact) {
  return artifact.files.some((file) => file.blob.size > 0);
}

export function createSheetViewerService({
  sheetLibrary,
  viewerAdapter
}: SheetViewerServiceOptions): SheetViewerService {
  return {
    createArtifactObjectUrls(artifact) {
      return {
        sheetId: artifact.sheetId,
        urls: artifact.files.map((file) => viewerAdapter.createFileUrl(file.blob))
      };
    },

    revokeArtifactObjectUrls(objectUrls) {
      objectUrls.urls.forEach((url) => viewerAdapter.revokeFileUrl(url));
    },

    async loadSheet(sheetId) {
      const normalizedSheetId = sheetId?.trim();

      if (!normalizedSheetId) {
        return errorState(
          "missing-sheet-id",
          "No sheet selected",
          "Open a sheet from Sheet Library to view it in Sheet Practice."
        );
      }

      const sheet = await sheetLibrary.getSheet(normalizedSheetId);

      if (!sheet) {
        return errorState(
          "sheet-not-found",
          "Sheet not found",
          "This sheet is not in the local Sheet Library. Return to Sheet Library and choose an imported sheet."
        );
      }

      const artifact = await sheetLibrary.getArtifact(normalizedSheetId);

      if (!artifact || artifact.files.length === 0 || !hasReadableArtifactFile(artifact)) {
        return errorState(
          "missing-artifact",
          "Sheet file missing",
          "The sheet metadata exists, but its imported PDF or image artifact is unavailable."
        );
      }

      if (artifact.sheetId !== sheet.id || artifact.kind !== sheet.kind) {
        return errorState(
          "artifact-mismatch",
          "Sheet file mismatch",
          "The saved sheet file does not match this sheet metadata. Reimport the sheet from Sheet Library."
        );
      }

      const inspection = await viewerAdapter.inspectArtifact(sheet, artifact);

      if (!inspection.ok) {
        const titleByCode = {
          "bad-pdf": "PDF cannot be rendered",
          "bad-image": "Image cannot be rendered",
          "missing-artifact": "Sheet file missing",
          "artifact-mismatch": "Sheet file mismatch"
        } as const;

        return errorState(
          inspection.code,
          titleByCode[inspection.code],
          inspection.message
        );
      }

      return {
        status: "ready",
        sheet,
        artifact,
        pageCount: Math.max(inspection.pageCount ?? sheet.pageCount ?? sheet.imageCount ?? 1, 1),
        imageDimensions: inspection.imageDimensions
      };
    }
  };
}

const SHEET_VIEWER_ZOOM = {
  min: 0.5,
  max: 2,
  step: 0.25
} as const;

export function clampSheetViewerZoom(value: number) {
  return Math.min(SHEET_VIEWER_ZOOM.max, Math.max(SHEET_VIEWER_ZOOM.min, value));
}

export function stepSheetViewerZoom(current: number, direction: "in" | "out") {
  const next = current + (direction === "in" ? SHEET_VIEWER_ZOOM.step : -SHEET_VIEWER_ZOOM.step);

  return clampSheetViewerZoom(Number(next.toFixed(2)));
}

export function formatSheetViewerPageLabel(currentPage: number, totalPages: number) {
  return `Page ${currentPage} of ${totalPages}`;
}
