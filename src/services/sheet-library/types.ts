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
