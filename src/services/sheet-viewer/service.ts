import type { SheetArtifact } from "@/domain/sheet";
import { titleForSheetViewerInspectionCode } from "@/services/sheet-viewer/format";
import {
  DEFAULT_SHEET_VIEWER_THUMBNAIL_MAX_WIDTH,
  createSheetViewerThumbnailCacheKey,
  rememberSheetViewerThumbnailBlobs
} from "@/services/sheet-viewer/thumbnails";
import type {
  SheetPageThumbnailSet,
  SheetPageThumbnailBlob,
  SheetViewerAdapter,
  SheetViewerErrorCode,
  SheetViewerLibraryReader,
  SheetViewerLoadState,
  SheetViewerObjectUrls
} from "@/services/sheet-viewer/types";

export {
  formatManualSegmentPageTurnDelay,
  formatSheetViewerPageLabel,
  titleForSheetViewerInspectionCode
} from "@/services/sheet-viewer/format";
export {
  armManualSegmentPageTurnTimer,
  getManualSegmentPageTurnDelayMs,
  getSheetViewerAssistedPageTurnDelayMs
} from "@/services/sheet-viewer/manual-page-turn-timer";
export {
  clampSheetViewerTransform,
  clampSheetViewerZoom,
  createSheetViewerTransform,
  panSheetViewerTransform,
  resetSheetViewerTransform,
  resetSheetViewerTransformForPageChange,
  setSheetViewerTransformScale,
  SHEET_VIEWER_TRANSFORM_LIMITS,
  stepSheetViewerZoom
} from "@/services/sheet-viewer/transform";

type SheetViewerServiceOptions = {
  sheetLibrary: SheetViewerLibraryReader;
  viewerAdapter: SheetViewerAdapter;
};

export type SheetViewerService = {
  loadSheet: (sheetId: string | null | undefined) => Promise<SheetViewerLoadState>;
  loadPageThumbnails: (sheetId: string | null | undefined) => Promise<SheetPageThumbnailSet>;
  revokePageThumbnails: (thumbnails: SheetPageThumbnailSet) => void;
  createArtifactObjectUrls: (artifact: SheetArtifact) => SheetViewerObjectUrls;
  revokeArtifactObjectUrls: (objectUrls: SheetViewerObjectUrls) => void;
};

function errorState(code: SheetViewerErrorCode, title: string, message: string) {
  return {
    status: "error",
    code,
    title,
    message
  } as const;
}

function hasReadableArtifactFile(artifact: SheetArtifact) {
  return artifact.files.some((file) => file.blob.size > 0);
}

export function createSheetViewerService({
  sheetLibrary,
  viewerAdapter
}: SheetViewerServiceOptions): SheetViewerService {
  const thumbnailCache = new Map<string, SheetPageThumbnailBlob[]>();

  const service: SheetViewerService = {
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
        return errorState(
          inspection.code,
          titleForSheetViewerInspectionCode(inspection.code),
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
    },

    async loadPageThumbnails(sheetId) {
      const readyState = await service.loadSheet(sheetId);

      if (readyState.status === "error") {
        return readyState;
      }

      const cacheKey = createSheetViewerThumbnailCacheKey(
        readyState.artifact,
        DEFAULT_SHEET_VIEWER_THUMBNAIL_MAX_WIDTH
      );
      let thumbnailBlobs = thumbnailCache.get(cacheKey);

      if (!thumbnailBlobs) {
        const generated = await viewerAdapter.generatePageThumbnails(
          readyState.sheet,
          readyState.artifact,
          { maxWidth: DEFAULT_SHEET_VIEWER_THUMBNAIL_MAX_WIDTH }
        );

        if (!generated.ok) {
          return errorState(
            generated.code,
            titleForSheetViewerInspectionCode(generated.code),
            generated.message
          );
        }

        thumbnailBlobs = generated.thumbnails;
        rememberSheetViewerThumbnailBlobs(thumbnailCache, cacheKey, thumbnailBlobs);
      }

      return {
        status: "ready",
        sheetId: readyState.sheet.id,
        pageCount: thumbnailBlobs.length,
        thumbnails: thumbnailBlobs.map((thumbnail) => ({
          sheetId: readyState.sheet.id,
          pageNumber: thumbnail.pageNumber,
          width: thumbnail.width,
          height: thumbnail.height,
          url: viewerAdapter.createFileUrl(thumbnail.blob)
        }))
      };
    },

    revokePageThumbnails(thumbnails) {
      if (thumbnails.status !== "ready") {
        return;
      }

      thumbnails.thumbnails.forEach((thumbnail) => viewerAdapter.revokeFileUrl(thumbnail.url));
    }
  };

  return service;
}
