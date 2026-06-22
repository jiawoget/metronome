export type ReferenceKind = "local-audio" | "bilibili";

export type LocalAudioReference = {
  id: string;
  sheetId: string;
  kind: "local-audio";
  title: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  durationMs: number;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
};

export type BilibiliReference = {
  id: string;
  sheetId: string;
  kind: "bilibili";
  title: string;
  url: string;
  bvid: string;
  author: string | null;
  durationLabel: string | null;
  thumbnailUrl: string | null;
  embedUrl: string | null;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
};

export type SheetReference = LocalAudioReference | BilibiliReference;

export type LocalAudioReferenceArtifact = {
  referenceId: string;
  sheetId: string;
  blob: Blob;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

export type BilibiliSearchResult = {
  id: string;
  title: string;
  url: string;
  bvid: string;
  author: string | null;
  durationLabel: string | null;
  thumbnailUrl: string | null;
  embedUrl: string | null;
};

export type BilibiliUrlMetadata = {
  url: string;
  bvid: string;
  embedUrl: string;
};
