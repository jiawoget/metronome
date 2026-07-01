import type {
  ContinuePracticeTarget,
  HomeRecentActivityOptions,
  HomeRecentActivityResult,
  PracticeActivityTrigger,
  PracticeSession,
  PracticeSessionEvent,
  PracticeSessionMetronomeEventKind,
  PracticeSessionRecordingEventKind,
  PracticeSessionReferenceEventKind,
  SessionHistoryGroup,
  SessionHistoryGroupingMode,
  SheetRecordingSegmentContext,
  PracticeTimeSignature,
  SheetRecordingMetadata,
  TodayPracticeSummary
} from "@/domain/practice";

type SheetSessionContext = {
  id: string;
  name: string;
  bpm: number | null;
  timeSignature: PracticeTimeSignature | null;
};

type SegmentSessionContext = {
  id: string;
  name: string | null;
};

export type PracticeSessionRepository = {
  listSessions: () => Promise<PracticeSession[]>;
  getSession: (sessionId: string) => Promise<PracticeSession | null>;
  getRecentSession: () => Promise<PracticeSession | null>;
  getRecentSheetSession: (sheetId: string) => Promise<PracticeSession | null>;
  saveSession: (session: PracticeSession) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
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

export type PracticeSessionSegmentGateway = {
  getSegmentContext: (sheetId: string, segmentId: string) => Promise<SegmentSessionContext | null>;
};

export type SheetPracticeActivityInput = {
  sheetId: string | null;
  trigger: PracticeActivityTrigger;
  bpm?: number | null;
  timeSignature?: PracticeTimeSignature | null;
  forceNewSession?: boolean;
};

export type QuickPracticeActivityInput = {
  trigger: PracticeActivityTrigger;
  bpm?: number | null;
  timeSignature?: PracticeTimeSignature | null;
  forceNewSession?: boolean;
};

export type SheetRecordingMetadataInput = {
  sheetId: string | null;
  sessionId?: string | null;
  durationMs?: number;
  bpm?: number | null;
  timeSignature?: PracticeTimeSignature | null;
  segmentContext?: SheetRecordingSegmentContext | null;
  forceNewSession?: boolean;
};

export type PreparedSheetRecordingMetadata = {
  metadata: SheetRecordingMetadata;
  session: PracticeSession;
};

export type PreparedSheetRecordingSessionInput = PreparedSheetRecordingMetadata;

export type PracticeRecordingLinkInput = {
  sessionId: string | null | undefined;
  recordingId: string | null | undefined;
};

export type PracticeSessionEventCaptureKind =
  | PracticeSessionMetronomeEventKind
  | PracticeSessionRecordingEventKind
  | PracticeSessionReferenceEventKind;

export type PracticeSessionEventCaptureInput = {
  sessionId: string | null | undefined;
  kind: PracticeSessionEventCaptureKind;
  sheetId?: string | null;
  segmentId?: string | null;
  recordingId?: string | null;
  referenceId?: string | null;
};

export type PracticeSessionEventSink = {
  captureEvent: (event: PracticeSessionEvent) => Promise<void> | void;
};

export type PracticeSessionService = {
  ensureQuickSession: (input: QuickPracticeActivityInput) => Promise<PracticeSession>;
  ensureSheetSession: (input: SheetPracticeActivityInput) => Promise<PracticeSession | null>;
  captureSessionEvent: (input: PracticeSessionEventCaptureInput) => Promise<PracticeSessionEvent | null>;
  restorePracticeSessionSnapshot: (session: PracticeSession) => Promise<PracticeSession>;
  deletePracticeSessionSnapshot: (sessionId: string) => Promise<void>;
  updatePracticeSessionDuration: (sessionId: string) => Promise<PracticeSession | null>;
  updateSheetSessionDuration: (sessionId: string) => Promise<PracticeSession | null>;
  endPracticeSession: (sessionId: string) => Promise<PracticeSession | null>;
  linkRecordingToSession: (input: PracticeRecordingLinkInput) => Promise<PracticeSession | null>;
  prepareSheetRecordingMetadata: (input: SheetRecordingMetadataInput) => Promise<PreparedSheetRecordingMetadata | null>;
  commitPreparedSheetRecordingSession: (input: PreparedSheetRecordingSessionInput) => Promise<void>;
  createSheetRecordingMetadata: (input: SheetRecordingMetadataInput) => Promise<SheetRecordingMetadata | null>;
  listSessions: () => Promise<PracticeSession[]>;
  getHomeRecentActivity: (options?: HomeRecentActivityOptions) => Promise<HomeRecentActivityResult>;
  getSessionHistoryGroups: (mode: SessionHistoryGroupingMode) => Promise<SessionHistoryGroup[]>;
  getTodaySummary: () => Promise<TodayPracticeSummary>;
  getRecentSession: () => Promise<PracticeSession | null>;
  getRecentSheetSession: (sheetId: string) => Promise<PracticeSession | null>;
  getContinuePracticeTarget: () => Promise<ContinuePracticeTarget | null>;
  listRecordingMetadata: () => Promise<SheetRecordingMetadata[]>;
  clear: () => Promise<void>;
  subscribe: (listener: () => void) => () => void;
};
