import type { SheetArtifact } from "@/domain/sheet";
import type { SheetPageThumbnailBlob } from "@/services/sheet-viewer/types";

export const DEFAULT_SHEET_VIEWER_THUMBNAIL_MAX_WIDTH = 120;
export const SHEET_VIEWER_THUMBNAIL_CACHE_LIMIT = 5;

export function createSheetViewerThumbnailCacheKey(artifact: SheetArtifact, maxWidth: number) {
  const filesKey = artifact.files
    .map((file) => `${file.pageNumber}:${file.sizeBytes}:${file.width ?? ""}x${file.height ?? ""}`)
    .join(",");

  return `${artifact.sheetId}:${artifact.createdAt}:${artifact.kind}:${maxWidth}:${filesKey}`;
}

export function rememberSheetViewerThumbnailBlobs(
  cache: Map<string, SheetPageThumbnailBlob[]>,
  key: string,
  thumbnails: SheetPageThumbnailBlob[],
  limit = SHEET_VIEWER_THUMBNAIL_CACHE_LIMIT
) {
  cache.set(key, thumbnails);

  if (cache.size > limit) {
    const oldestKey = cache.keys().next().value;

    if (oldestKey) {
      cache.delete(oldestKey);
    }
  }
}
