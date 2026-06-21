import type {
  ImportedSheet,
  SheetArtifact,
  SheetImageDimensions,
  SheetKind,
  SheetListItem,
  SheetMetadataInput
} from "@/domain/sheet";

export type SheetImportPreview = {
  kind: SheetKind;
  pageCount: number | null;
  imageCount: number;
  imageDimensions: SheetImageDimensions[];
  mimeTypes: string[];
  sizeBytes: number;
  originalFileNames: string[];
  files: SheetArtifact["files"];
};

export type SheetImportResult =
  | {
      ok: true;
      preview: SheetImportPreview;
    }
  | {
      ok: false;
      message: string;
    };

export type ImportSheetInput = {
  files: File[];
  metadata: SheetMetadataInput;
};

export type SheetLibraryRepository = {
  listSheets: () => Promise<ImportedSheet[]>;
  saveSheet: (sheet: ImportedSheet, artifact: SheetArtifact) => Promise<void>;
  getArtifact: (sheetId: string) => Promise<SheetArtifact | null>;
  deleteSheet: (sheetId: string) => Promise<void>;
};

export type SheetImportAdapter = {
  analyzeFiles: (files: File[]) => Promise<SheetImportResult>;
};

export type SheetLibraryService = {
  listSheets: () => Promise<SheetListItem[]>;
  previewImport: (files: File[]) => Promise<SheetImportResult>;
  importSheet: (input: ImportSheetInput) => Promise<{ ok: true; sheet: SheetListItem } | { ok: false; message: string }>;
  deleteSheet: (sheetId: string) => Promise<void>;
  getArtifact: (sheetId: string) => Promise<SheetArtifact | null>;
};
