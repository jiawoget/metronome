import type { ImportedSheet, SheetArtifact, SheetImageDimensions, SheetListItem } from "@/domain/sheet";

export type SheetViewerErrorCode =
  | "missing-sheet-id"
  | "sheet-not-found"
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
  createFileUrl: (blob: Blob) => string;
  revokeFileUrl: (url: string) => void;
};

export type SheetViewerLibraryReader = {
  getSheet: (sheetId: string) => Promise<SheetListItem | null>;
  getArtifact: (sheetId: string) => Promise<SheetArtifact | null>;
};

export type SheetViewerReadyState = {
  status: "ready";
  sheet: SheetListItem;
  artifact: SheetArtifact;
  pageCount: number;
  imageDimensions: SheetImageDimensions[];
};

export type SheetViewerErrorState = {
  status: "error";
  code: SheetViewerErrorCode;
  title: string;
  message: string;
};

export type SheetViewerLoadState = SheetViewerReadyState | SheetViewerErrorState;
