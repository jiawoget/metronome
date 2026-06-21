import type {
  ContinuePracticeTarget,
  PracticeActivityTrigger,
  PracticeSession,
  PracticeTimeSignature,
  SheetRecordingMetadata
} from "@/domain/practice";

export type SheetSessionContext = {
  id: string;
  name: string;
  bpm: number | null;
  timeSignature: PracticeTimeSignature | null;
};

export type PracticeSessionRepository = {
  listSessions: () => Promise<PracticeSession[]>;
  getSession: (sessionId: string) => Promise<PracticeSession | null>;
  getRecentSession: () => Promise<PracticeSession | null>;
  getRecentSheetSession: (sheetId: string) => Promise<PracticeSession | null>;
  saveSession: (session: PracticeSession) => Promise<void>;
  clear: () => Promise<void>;
  subscribe?: (listener: () => void) => () => void;
};

export type PracticeRecordingMetadataRepository = {
  listRecordingMetadata: () => Promise<SheetRecordingMetadata[]>;
  listRecordingMetadataForSession: (sessionId: string) => Promise<SheetRecordingMetadata[]>;
  saveRecordingMetadata: (recording: SheetRecordingMetadata, session: PracticeSession) => Promise<void>;
  clear: () => Promise<void>;
  subscribe?: (listener: () => void) => () => void;
};

export type PracticeSessionSheetGateway = {
  getSheetContext: (sheetId: string) => Promise<SheetSessionContext | null>;
  updateLastPracticedAt: (sheetId: string, practicedAt: string) => Promise<void>;
};

export type SheetPracticeActivityInput = {
  sheetId: string | null;
  trigger: PracticeActivityTrigger;
  bpm?: number | null;
  timeSignature?: PracticeTimeSignature | null;
};

export type SheetRecordingMetadataInput = {
  sheetId: string | null;
  durationMs?: number;
};

export type PracticeSessionService = {
  ensureSheetSession: (input: SheetPracticeActivityInput) => Promise<PracticeSession | null>;
  updateSheetSessionDuration: (sessionId: string) => Promise<PracticeSession | null>;
  endPracticeSession: (sessionId: string) => Promise<PracticeSession | null>;
  createSheetRecordingMetadata: (input: SheetRecordingMetadataInput) => Promise<SheetRecordingMetadata | null>;
  getRecentSession: () => Promise<PracticeSession | null>;
  getContinuePracticeTarget: () => Promise<ContinuePracticeTarget | null>;
  listRecordingMetadata: () => Promise<SheetRecordingMetadata[]>;
  clear: () => Promise<void>;
  subscribe: (listener: () => void) => () => void;
};
