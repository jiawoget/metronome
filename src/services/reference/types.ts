import type {
  BilibiliSearchResult,
  BilibiliReference,
  LocalAudioReference,
  LocalAudioReferenceArtifact,
  SheetReference
} from "@/domain/reference";

export type ReferenceResult<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      message: string;
    };

export type LocalAudioInspection = {
  durationMs: number;
};

export type LocalAudioReferenceInput = {
  sheetId: string | null;
  file: File;
  title?: string;
};

export type BilibiliUrlReferenceInput = {
  sheetId: string | null;
  url: string;
  title?: string;
};

export type BilibiliResultReferenceInput = {
  sheetId: string | null;
  result: BilibiliSearchResult;
};

export type ReferenceRepository = {
  listReferences: (sheetId: string) => Promise<SheetReference[]>;
  countAllReferences: () => Promise<number>;
  getActiveReference: (sheetId: string) => Promise<SheetReference | null>;
  getLocalAudioArtifact: (referenceId: string) => Promise<LocalAudioReferenceArtifact | null>;
  saveReference: (reference: SheetReference, artifact?: LocalAudioReferenceArtifact | null) => Promise<void>;
  clear: () => Promise<void>;
  subscribe: (listener: () => void) => () => void;
};

export type LocalAudioInspectionAdapter = {
  inspectFile: (file: File) => Promise<ReferenceResult<LocalAudioInspection>>;
};

export type BilibiliSearchAdapter = {
  search: (query: string) => Promise<ReferenceResult<BilibiliSearchResult[]>>;
};

export type ReferenceService = {
  listReferences: (sheetId: string) => Promise<SheetReference[]>;
  countAllReferences: () => Promise<number>;
  getActiveReference: (sheetId: string) => Promise<SheetReference | null>;
  getLocalAudioArtifact: (referenceId: string) => Promise<LocalAudioReferenceArtifact | null>;
  addLocalAudioReference: (input: LocalAudioReferenceInput) => Promise<ReferenceResult<LocalAudioReference>>;
  saveBilibiliUrlReference: (input: BilibiliUrlReferenceInput) => Promise<ReferenceResult<BilibiliReference>>;
  saveBilibiliSearchResultReference: (
    input: BilibiliResultReferenceInput
  ) => Promise<ReferenceResult<BilibiliReference>>;
  searchBilibili: (query: string) => Promise<ReferenceResult<BilibiliSearchResult[]>>;
  subscribe: (listener: () => void) => () => void;
};
