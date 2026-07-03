import type { ImportedSheet, SheetArtifact, SheetImageDimensions, SheetListItem } from "@/domain/sheet";

export type SheetViewerErrorCode =
  | "missing-sheet-id"
  | "sheet-not-found"
  | "load-failed"
  | "missing-artifact"
  | "artifact-mismatch"
  | "bad-pdf"
  | "bad-image";

export type SheetViewerInspection =
  | {
      ok: true;
      pageCount: number | null;
      imageDimensions: SheetImageDimensions[];
    }
  | {
      ok: false;
      code: Extract<SheetViewerErrorCode, "bad-pdf" | "bad-image" | "missing-artifact" | "artifact-mismatch">;
      message: string;
    };

export type SheetViewerAdapter = {
  inspectArtifact: (sheet: ImportedSheet, artifact: SheetArtifact) => Promise<SheetViewerInspection>;
  generatePageThumbnails: (
    sheet: ImportedSheet,
    artifact: SheetArtifact,
    options?: { maxWidth?: number }
  ) => Promise<SheetViewerThumbnailGeneration>;
  createFileUrl: (blob: Blob) => string;
  revokeFileUrl: (url: string) => void;
};

export type SheetViewerLibraryReader = {
  getSheet: (sheetId: string) => Promise<SheetListItem | null>;
  getArtifact: (sheetId: string) => Promise<SheetArtifact | null>;
};

type SheetViewerReadyState = {
  status: "ready";
  sheet: SheetListItem;
  artifact: SheetArtifact;
  pageCount: number;
  imageDimensions: SheetImageDimensions[];
};

type SheetViewerErrorState = {
  status: "error";
  code: SheetViewerErrorCode;
  title: string;
  message: string;
};

export type SheetViewerLoadState = SheetViewerReadyState | SheetViewerErrorState;

export type SheetViewerObjectUrls = {
  sheetId: string;
  urls: string[];
};

export type SheetPageThumbnailBlob = {
  pageNumber: number;
  blob: Blob;
  width: number;
  height: number;
};

export type SheetViewerThumbnailGeneration =
  | {
      ok: true;
      thumbnails: SheetPageThumbnailBlob[];
    }
  | {
      ok: false;
      code: Extract<SheetViewerErrorCode, "bad-pdf" | "bad-image" | "missing-artifact" | "artifact-mismatch">;
      message: string;
    };

export type SheetPageThumbnail = {
  sheetId: string;
  pageNumber: number;
  width: number;
  height: number;
  url: string;
};

export type SheetPageThumbnailSet =
  | {
      status: "ready";
      sheetId: string;
      pageCount: number;
      thumbnails: SheetPageThumbnail[];
    }
  | SheetViewerErrorState;

export type SheetViewerTransform = {
  scale: number;
  translateX: number;
  translateY: number;
};

export type SheetViewerViewportSize = {
  width: number;
  height: number;
};

export type SheetViewerContentSize = {
  width: number;
  height: number;
};

export type SheetViewerTransformBounds = {
  viewport: SheetViewerViewportSize;
  content: SheetViewerContentSize;
};
