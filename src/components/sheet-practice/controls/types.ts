import type { PracticeSessionService } from "@/services/practice-session";
import type { MeasureGridService } from "@/services/measure-grid";
import type { PracticeSegmentService } from "@/services/practice-segments";
import type { MetronomeService } from "@/services/metronome";
import type { SheetRecordingService } from "@/services/recording";

type SheetPracticeMetronomeService = Pick<MetronomeService, "onTick" | "update" | "start" | "stop">;

type SheetPracticeSessionService = Pick<
  PracticeSessionService,
  | "ensureSheetSession"
  | "restorePracticeSessionSnapshot"
  | "deletePracticeSessionSnapshot"
  | "updateSheetSessionDuration"
  | "endPracticeSession"
  | "createSheetRecordingMetadata"
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
  currentMeasureGridTimestampMs?: number | null;
};
