import type { MeasureGrid, MeasureRange, MeasureRangeMs } from "@/domain/practice/measure-grid";

type PracticeSourceType = "quick" | "sheet";

export type PracticeActivityTrigger = "metronome" | "recording" | "reference";

export type PracticeTimeSignature = "2/4" | "3/4" | "4/4" | "6/8" | "12/8";

export type SheetRecordingSegmentContext = {
  segmentId: string;
  segmentName: string;
  range: MeasureRange;
  targetBpm: number | null;
  measureGridVersion: string;
  measureGridSnapshot: MeasureGrid;
  measureRangeMs: MeasureRangeMs;
};

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
  segmentContext: SheetRecordingSegmentContext | null;
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
  segmentContext: SheetRecordingSegmentContext | null;
};

export type TodayPracticeSummary = {
  durationMs: number;
  minutesToday: number;
  sessionsToday: number;
  recordingsToday: number;
};

export type LocalPracticeGoalKind = "minutes" | "sessions" | "takes";
export type LocalPracticeGoalPeriod = "today" | "all-time";
export type LocalPracticeGoalStatus = "active" | "completed" | "invalid";

export type LocalPracticeGoal = {
  id: string;
  kind: LocalPracticeGoalKind;
  target: number;
  period: LocalPracticeGoalPeriod;
  createdAt: string;
  completedAt?: string | null;
  status?: LocalPracticeGoalStatus;
};

export type GoalCompletionEvaluation = {
  goalId: string;
  kind: LocalPracticeGoalKind | null;
  status: "not-started" | "in-progress" | "completed" | "invalid";
  progress: number;
  target: number | null;
  progressRatio: number;
  completedAt: string | null;
  reason: string | null;
};

export type HomeDashboardAnalyticsSource = {
  generatedAt: string;
  summary: TodayPracticeSummary;
  totals: {
    durationMs: number;
    sessions: number;
    sheetTakes: number;
    practicedSheets: number;
    segmentSessions: number;
  };
  emptyState: {
    hasPracticeHistory: boolean;
    hasSheetPractice: boolean;
    hasSegmentPractice: boolean;
    hasRecordings: boolean;
    hasGoals: boolean;
  };
  goals?: GoalCompletionEvaluation[];
};

export type HomePracticeStreaks = {
  generatedAt: string;
  currentStreakDays: number;
  longestStreakDays: number;
  practicedToday: boolean;
  lastPracticedLocalDay: string | null;
  emptyState: {
    hasPracticeHistory: boolean;
  };
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
