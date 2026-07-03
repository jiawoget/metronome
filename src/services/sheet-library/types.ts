import type {
  ImportedSheet,
  SheetArtifact,
  SheetArtifactStatus,
  SheetImageDimensions,
  SheetKind,
  SheetListItem,
  SheetMetadataInput,
  SheetOrganizationMetadata,
  SheetTag
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

export type SheetBatchImportMetadataDefaults = Omit<
  SheetMetadataInput,
  "name"
>;

export type ImportSheetsBatchInput = {
  files: File[];
  metadataDefaults: SheetBatchImportMetadataDefaults;
};

export type SheetBatchImportItemResult =
  | {
      ok: true;
      fileName: string;
      sheet: SheetListItem;
    }
  | {
      ok: false;
      fileName: string;
      message: string;
    };

export type SheetBatchImportResult =
  | {
      ok: true;
      total: number;
      importedCount: number;
      failedCount: number;
      items: SheetBatchImportItemResult[];
    }
  | {
      ok: false;
      message: string;
      total: number;
      importedCount: 0;
      failedCount: number;
      items: [];
    };

export type UpdateSheetMetadataInput = {
  sheetId: string;
  metadata: SheetMetadataInput;
};

export type UpdateSheetOrganizationInput =
  | {
      sheetId: string;
      tags: SheetTag[];
      favorite?: boolean;
    }
  | {
      sheetId: string;
      tags?: SheetTag[];
      favorite: boolean;
    };

export type SetSheetTagsInput = {
  sheetId: string;
  tags: SheetTag[];
};

export type SetSheetFavoriteInput = {
  sheetId: string;
  favorite: boolean;
};

export type SheetLibraryRepository = {
  listSheets: () => Promise<ImportedSheet[]>;
  getSheet: (sheetId: string) => Promise<ImportedSheet | null>;
  saveSheet: (sheet: ImportedSheet, artifact: SheetArtifact) => Promise<void>;
  updateSheetMetadata: (
    sheetId: string,
    metadata: SheetMetadataInput,
    updatedAt: string
  ) => Promise<ImportedSheet | null>;
  updateSheetOrganization: (
    sheetId: string,
    organization: SheetOrganizationMetadata,
    updatedAt: string
  ) => Promise<ImportedSheet | null>;
  updateLastPracticedAt: (
    sheetId: string,
    practicedAt: string
  ) => Promise<void>;
  getArtifact: (sheetId: string) => Promise<SheetArtifact | null>;
  deleteSheet: (sheetId: string) => Promise<void>;
  clear: () => Promise<void>;
};

export type SheetImportAdapter = {
  analyzeFiles: (files: File[]) => Promise<SheetImportResult>;
  inspectArtifact: (
    sheet: ImportedSheet,
    artifact: SheetArtifact | null
  ) => Promise<SheetArtifactStatus>;
};

export type SheetLibraryService = {
  listSheets: () => Promise<SheetListItem[]>;
  getSheet: (sheetId: string) => Promise<SheetListItem | null>;
  previewImport: (files: File[]) => Promise<SheetImportResult>;
  importSheet: (
    input: ImportSheetInput
  ) => Promise<
    { ok: true; sheet: SheetListItem } | { ok: false; message: string }
  >;
  importSheetsBatch: (
    input: ImportSheetsBatchInput
  ) => Promise<SheetBatchImportResult>;
  updateSheetMetadata: (
    input: UpdateSheetMetadataInput
  ) => Promise<
    { ok: true; sheet: SheetListItem } | { ok: false; message: string }
  >;
  updateSheetOrganization: (
    input: UpdateSheetOrganizationInput
  ) => Promise<
    { ok: true; sheet: SheetListItem } | { ok: false; message: string }
  >;
  setSheetTags: (
    input: SetSheetTagsInput
  ) => Promise<
    { ok: true; sheet: SheetListItem } | { ok: false; message: string }
  >;
  setSheetFavorite: (
    input: SetSheetFavoriteInput
  ) => Promise<
    { ok: true; sheet: SheetListItem } | { ok: false; message: string }
  >;
  updateLastPracticedAt: (
    sheetId: string,
    practicedAt: string
  ) => Promise<void>;
  deleteSheet: (sheetId: string) => Promise<void>;
  getArtifact: (sheetId: string) => Promise<SheetArtifact | null>;
  clear: () => Promise<void>;
};
