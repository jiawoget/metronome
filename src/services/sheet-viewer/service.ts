import type { SheetArtifact } from "@/domain/sheet";
import { createSheetRecordingSegmentContext, type PracticeSegment } from "@/domain/practice";
import type {
  SheetPageThumbnailSet,
  SheetPageThumbnailBlob,
  SheetViewerAdapter,
  SheetViewerTransform,
  SheetViewerTransformBounds,
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
  loadPageThumbnails: (sheetId: string | null | undefined) => Promise<SheetPageThumbnailSet>;
  revokePageThumbnails: (thumbnails: SheetPageThumbnailSet) => void;
  createArtifactObjectUrls: (artifact: SheetArtifact) => SheetViewerObjectUrls;
  revokeArtifactObjectUrls: (objectUrls: SheetViewerObjectUrls) => void;
};

const DEFAULT_THUMBNAIL_MAX_WIDTH = 120;
const THUMBNAIL_CACHE_LIMIT = 5;

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

function titleForInspectionCode(
  code: Extract<SheetViewerErrorCode, "bad-pdf" | "bad-image" | "missing-artifact" | "artifact-mismatch">
) {
  return {
    "bad-pdf": "PDF cannot be rendered",
    "bad-image": "Image cannot be rendered",
    "missing-artifact": "Sheet file missing",
    "artifact-mismatch": "Sheet file mismatch"
  }[code];
}

function thumbnailCacheKey(artifact: SheetArtifact, maxWidth: number) {
  const filesKey = artifact.files
    .map((file) => `${file.pageNumber}:${file.sizeBytes}:${file.width ?? ""}x${file.height ?? ""}`)
    .join(",");

  return `${artifact.sheetId}:${artifact.createdAt}:${artifact.kind}:${maxWidth}:${filesKey}`;
}

function rememberThumbnailBlobs(
  cache: Map<string, SheetPageThumbnailBlob[]>,
  key: string,
  thumbnails: SheetPageThumbnailBlob[]
) {
  cache.set(key, thumbnails);

  if (cache.size > THUMBNAIL_CACHE_LIMIT) {
    const oldestKey = cache.keys().next().value;

    if (oldestKey) {
      cache.delete(oldestKey);
    }
  }
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
          titleForInspectionCode(inspection.code),
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

      const cacheKey = thumbnailCacheKey(readyState.artifact, DEFAULT_THUMBNAIL_MAX_WIDTH);
      let thumbnailBlobs = thumbnailCache.get(cacheKey);

      if (!thumbnailBlobs) {
        const generated = await viewerAdapter.generatePageThumbnails(
          readyState.sheet,
          readyState.artifact,
          { maxWidth: DEFAULT_THUMBNAIL_MAX_WIDTH }
        );

        if (!generated.ok) {
          return errorState(
            generated.code,
            titleForInspectionCode(generated.code),
            generated.message
          );
        }

        thumbnailBlobs = generated.thumbnails;
        rememberThumbnailBlobs(thumbnailCache, cacheKey, thumbnailBlobs);
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

export const SHEET_VIEWER_TRANSFORM_LIMITS = {
  minScale: 0.5,
  maxScale: 2,
  scaleStep: 0.25
} as const;

function clampValue(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function clampSheetViewerZoom(value: number) {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return clampValue(
    value,
    SHEET_VIEWER_TRANSFORM_LIMITS.minScale,
    SHEET_VIEWER_TRANSFORM_LIMITS.maxScale
  );
}

export function stepSheetViewerZoom(current: number, direction: "in" | "out") {
  const base = Number.isFinite(current) ? current : 1;
  const next = base + (direction === "in" ? SHEET_VIEWER_TRANSFORM_LIMITS.scaleStep : -SHEET_VIEWER_TRANSFORM_LIMITS.scaleStep);

  return clampSheetViewerZoom(Number(next.toFixed(2)));
}

function normalizeTranslation(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function hasPositiveFiniteSize(size: { width?: unknown; height?: unknown } | null | undefined) {
  const width = size?.width;
  const height = size?.height;

  return (
    typeof width === "number" &&
    typeof height === "number" &&
    Number.isFinite(width) &&
    Number.isFinite(height) &&
    width > 0 &&
    height > 0
  );
}

function hasUsableTransformBounds(bounds: SheetViewerTransformBounds | undefined): bounds is SheetViewerTransformBounds {
  return hasPositiveFiniteSize(bounds?.viewport) && hasPositiveFiniteSize(bounds?.content);
}

function roundScale(value: number) {
  return Number(value.toFixed(2));
}

function clampTranslation(value: number, maxPan: number) {
  if (maxPan <= 0) {
    return 0;
  }

  return clampValue(value, -maxPan, maxPan);
}

export function createSheetViewerTransform(input: Partial<SheetViewerTransform> = {}): SheetViewerTransform {
  return {
    scale: clampSheetViewerZoom(input.scale ?? 1),
    translateX: normalizeTranslation(input.translateX),
    translateY: normalizeTranslation(input.translateY)
  };
}

export function resetSheetViewerTransform(): SheetViewerTransform {
  return {
    scale: 1,
    translateX: 0,
    translateY: 0
  };
}

export function resetSheetViewerTransformForPageChange(): SheetViewerTransform {
  return resetSheetViewerTransform();
}

export function clampSheetViewerTransform(
  transform: SheetViewerTransform,
  bounds?: SheetViewerTransformBounds
): SheetViewerTransform {
  const normalized = createSheetViewerTransform(transform);

  if (!hasUsableTransformBounds(bounds)) {
    return {
      ...normalized,
      translateX: 0,
      translateY: 0
    };
  }

  const effectiveWidth = bounds.content.width * normalized.scale;
  const effectiveHeight = bounds.content.height * normalized.scale;
  const maxX = effectiveWidth <= bounds.viewport.width ? 0 : (effectiveWidth - bounds.viewport.width) / 2;
  const maxY = effectiveHeight <= bounds.viewport.height ? 0 : (effectiveHeight - bounds.viewport.height) / 2;

  return {
    ...normalized,
    translateX: clampTranslation(normalized.translateX, maxX),
    translateY: clampTranslation(normalized.translateY, maxY)
  };
}

export function setSheetViewerTransformScale(
  transform: SheetViewerTransform,
  scale: number,
  bounds?: SheetViewerTransformBounds
): SheetViewerTransform {
  return clampSheetViewerTransform(
    {
      ...createSheetViewerTransform(transform),
      scale: clampSheetViewerZoom(Number.isFinite(scale) ? roundScale(scale) : 1)
    },
    bounds
  );
}

export function panSheetViewerTransform(
  transform: SheetViewerTransform,
  delta: { x: number; y: number },
  bounds?: SheetViewerTransformBounds
): SheetViewerTransform {
  const normalized = createSheetViewerTransform(transform);

  return clampSheetViewerTransform(
    {
      ...normalized,
      translateX: normalized.translateX + normalizeTranslation(delta.x),
      translateY: normalized.translateY + normalizeTranslation(delta.y)
    },
    bounds
  );
}

export function getSheetViewerAssistedPageTurnDelayMs(segment: PracticeSegment | null | undefined) {
  if (!segment) {
    return null;
  }

  try {
    const { measureRangeMs } = createSheetRecordingSegmentContext(segment);
    const delayMs = measureRangeMs.endMs - measureRangeMs.startMs;

    return Number.isFinite(delayMs) && delayMs > 0 ? delayMs : null;
  } catch {
    return null;
  }
}

export function formatSheetViewerPageLabel(currentPage: number, totalPages: number) {
  return `Page ${currentPage} of ${totalPages}`;
}
