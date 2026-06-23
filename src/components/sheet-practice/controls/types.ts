import type { PracticeSessionService } from "@/services/practice-session";
import type { MeasureGridService } from "@/services/measure-grid";
import type { PracticeSegmentService } from "@/services/practice-segments";
import type { BrowserMetronomeService } from "@/lib/quick-metronome/metronome-service";
import type { BrowserSheetRecordingService } from "@/lib/sheet-practice/recording-service";

export type SheetPracticeMetronomeService = Pick<
  BrowserMetronomeService,
  "onTick" | "update" | "start" | "stop"
>;

export type SheetPracticeSessionService = Pick<
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
  BrowserSheetRecordingService,
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
  createMetronomeService?: () => SheetPracticeMetronomeService;
  createSheetRecordingService?: () => SheetPracticeRecordingService;
  sessionService?: SheetPracticeSessionService;
  measureGridService?: MeasureGridService;
  practiceSegmentService?: PracticeSegmentService;
  currentMeasureGridTimestampMs?: number | null;
};
