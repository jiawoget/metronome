import type { PracticeSessionService } from "@/services/practice-session";
import type { MeasureGridService } from "@/services/measure-grid";
import type { PracticeSegmentService } from "@/services/practice-segments";
import type { MetronomeService } from "@/services/metronome";
import type { SheetRecordingService } from "@/services/recording";
import type { SheetMetronomePresetService } from "@/services/sheet-metronome-presets";
import type { BarCountInReadyPlan } from "@/domain/practice/bar-count-in";
import type { BarCountInSchedulerTick } from "@/lib/quick-metronome/use-metronome-transport";

type SheetPracticeMetronomeService = Pick<MetronomeService, "onTick" | "update" | "start" | "stop">;

type SheetPracticeSessionService = Pick<
  PracticeSessionService,
  | "captureSessionEvent"
  | "ensureSheetSession"
  | "restorePracticeSessionSnapshot"
  | "deletePracticeSessionSnapshot"
  | "updateSheetSessionDuration"
  | "endPracticeSession"
  | "createSheetRecordingMetadata"
  | "prepareSheetRecordingMetadata"
  | "commitPreparedSheetRecordingSession"
  | "getRecentSession"
  | "getRecentSheetSession"
  | "listRecordingMetadata"
  | "subscribe"
>;

export type SheetPracticeRecordingService = Pick<
  SheetRecordingService,
  | "isRecording"
  | "getRecording"
  | "startCapture"
  | "stopAndSave"
  | "discardCapture"
  | "getLatestSheetRecording"
  | "subscribe"
>;

export type SheetPracticeBarCountInBlockReason =
  | "no-measure-grid"
  | "segment-grid-stale"
  | "invalid-plan";

export type SheetPracticeBarCountInBlock = {
  reason: SheetPracticeBarCountInBlockReason;
  message: string;
};

export type SheetPracticeBarCountInOptions = {
  enabled: boolean;
  countInMeasures?: number;
  onPlanPrepared?: (plan: BarCountInReadyPlan) => void;
  onPlanBlocked?: (block: SheetPracticeBarCountInBlock) => void;
  onTick?: (tick: BarCountInSchedulerTick) => void;
};

export type SheetPracticeControlsProps = {
  sheetId: string;
  sheetName: string;
  defaultBpm: number | null;
  defaultTimeSignature: string | null;
  sourceRecordingId?: string | null;
  returnSegmentId?: string | null;
  createMetronomeService?: () => SheetPracticeMetronomeService;
  createSheetRecordingService?: () => SheetPracticeRecordingService;
  sessionService?: SheetPracticeSessionService;
  measureGridService?: MeasureGridService;
  practiceSegmentService?: PracticeSegmentService;
  sheetMetronomePresetService?: SheetMetronomePresetService;
  currentMeasureGridTimestampMs?: number | null;
  barCountIn?: SheetPracticeBarCountInOptions;
};
