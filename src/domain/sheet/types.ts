export const SHEET_CATEGORIES = ["song", "exercise", "scale"] as const;

export type SheetCategory = (typeof SHEET_CATEGORIES)[number];

export type SheetKind = "pdf" | "image";

export type SheetImageDimensions = {
  width: number;
  height: number;
};

export type ImportedSheet = {
  id: string;
  name: string;
  category: SheetCategory;
  bpm: number;
  timeSignature: string;
  kind: SheetKind;
  pageCount: number | null;
  imageCount: number;
  imageDimensions: SheetImageDimensions[];
  mimeTypes: string[];
  sizeBytes: number;
  originalFileNames: string[];
  createdAt: string;
  updatedAt: string;
  lastPracticedAt: string | null;
};

export type SheetMetadataInput = {
  name: string;
  category: SheetCategory;
  bpm: number;
  timeSignature: string;
};

export type SheetArtifactFile = {
  name: string;
  mimeType: string;
  sizeBytes: number;
  pageNumber: number;
  blob: Blob;
  width: number | null;
  height: number | null;
};

export type SheetArtifact = {
  sheetId: string;
  kind: SheetKind;
  files: SheetArtifactFile[];
  createdAt: string;
};

export type SheetArtifactStatus = {
  readable: boolean;
  label: string;
};

export type SheetListItem = ImportedSheet & {
  artifactStatus: SheetArtifactStatus;
};

export const sheetCategoryLabels: Record<SheetCategory, string> = {
  song: "Song",
  exercise: "Exercise",
  scale: "Scale"
};
