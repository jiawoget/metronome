import type { MetronomeSettings } from "@/lib/quick-metronome/types";
import type { SheetRecordingMetadata } from "@/domain/practice";
import type { RecordingArtifactDetails, ReviewRecording } from "@/lib/recordings-review/types";
import type { PracticeSessionService } from "@/services/practice-session";

export type RecordingArtifactAnalysis = {
  decodedDurationMs: number;
  sampleRate: number;
  peakAmplitude: number;
  rmsAmplitude: number;
  estimatedFrequencyHz: number | null;
  isSilent: boolean;
};

export type RecordingArtifact = {
  blob: Blob;
  dataUrl: string;
  durationMs: number;
  mimeType: string;
  sizeBytes: number;
  analysis: RecordingArtifactAnalysis | null;
};

export type RecordingCaptureService = {
  readonly isRecording: boolean;
  start: () => Promise<void>;
  stop: () => Promise<RecordingArtifact>;
};

export class RecordingPermissionError extends Error {
  constructor(message = "Microphone access was denied. Enable microphone permission to record a take.") {
    super(message);
    this.name = "RecordingPermissionError";
  }
}

export type SheetRecordingSessionService = Pick<
  PracticeSessionService,
  | "createSheetRecordingMetadata"
  | "deletePracticeSessionSnapshot"
  | "getRecentSheetSession"
  | "restorePracticeSessionSnapshot"
>;

export type SaveSheetRecordingInput = {
  sheetId: string;
  sessionId: string | null;
  settings: MetronomeSettings;
  forceNewSession: boolean;
  sessionService: SheetRecordingSessionService;
};

export type SaveSheetRecordingResult = {
  metadata: SheetRecordingMetadata;
  recording: ReviewRecording;
  artifactDetails: RecordingArtifactDetails;
};

export type SheetRecordingService = {
  readonly isRecording: boolean;
  getLatestSheetRecording: (sheetId: string) => ReviewRecording | null;
  subscribe: (listener: () => void) => () => void;
  startCapture: () => Promise<void>;
  discardCapture: () => Promise<void>;
  stopAndSave: (input: SaveSheetRecordingInput) => Promise<SaveSheetRecordingResult>;
};
