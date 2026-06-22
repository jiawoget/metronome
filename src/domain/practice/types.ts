export type PracticeSourceType = "quick" | "sheet";

export type PracticeActivityTrigger = "metronome" | "recording" | "reference";

export type PracticeTimeSignature = "2/4" | "3/4" | "4/4" | "6/8";

export type PracticeSession = {
  id: string;
  sourceType: PracticeSourceType;
  sheetId: string | null;
  startedAt: string;
  endedAt: string | null;
  durationMs: number;
  bpm: number | null;
  timeSignature: PracticeTimeSignature | null;
  recordingCount: number;
  latestRecordingId: string | null;
  updatedAt: string;
};

export type SheetRecordingMetadata = {
  id: string;
  type: "sheet";
  sessionId: string;
  sheetId: string;
  sheetName: string | null;
  createdAt: string;
  durationMs: number;
  bpm: number | null;
  timeSignature: PracticeTimeSignature | null;
};

export type TodayPracticeSummary = {
  durationMs: number;
  minutesToday: number;
  sessionsToday: number;
  recordingsToday: number;
};

export type ContinuePracticeTarget =
  | {
      sourceType: "quick";
      href: "/quick-metronome";
      label: "Continue Quick Practice";
      sessionId: string;
    }
  | {
      sourceType: "sheet";
      href: string;
      label: "Continue Sheet Practice";
      sessionId: string;
      sheetId: string;
    };

export type PracticeTransportState = {
  metronomeActive: boolean;
  recordingActive: boolean;
  referenceActive: boolean;
};
