import type {
  ImportedSheet,
  SheetArtifact,
  SheetArtifactStatus,
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
  getSheet: (sheetId: string) => Promise<ImportedSheet | null>;
  saveSheet: (sheet: ImportedSheet, artifact: SheetArtifact) => Promise<void>;
  updateLastPracticedAt: (sheetId: string, practicedAt: string) => Promise<void>;
  getArtifact: (sheetId: string) => Promise<SheetArtifact | null>;
  deleteSheet: (sheetId: string) => Promise<void>;
  clear: () => Promise<void>;
};

export type SheetImportAdapter = {
  analyzeFiles: (files: File[]) => Promise<SheetImportResult>;
  inspectArtifact: (sheet: ImportedSheet, artifact: SheetArtifact | null) => Promise<SheetArtifactStatus>;
};

export type SheetLibraryService = {
  listSheets: () => Promise<SheetListItem[]>;
  getSheet: (sheetId: string) => Promise<SheetListItem | null>;
  previewImport: (files: File[]) => Promise<SheetImportResult>;
  importSheet: (input: ImportSheetInput) => Promise<{ ok: true; sheet: SheetListItem } | { ok: false; message: string }>;
  updateLastPracticedAt: (sheetId: string, practicedAt: string) => Promise<void>;
  deleteSheet: (sheetId: string) => Promise<void>;
  getArtifact: (sheetId: string) => Promise<SheetArtifact | null>;
  clear: () => Promise<void>;
};
