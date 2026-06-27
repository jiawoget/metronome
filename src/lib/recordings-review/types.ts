import type { MetronomeSettings, RecordingArtifactAnalysis } from "@/lib/quick-metronome/types";
import type { SheetRecordingSegmentContext } from "@/domain/practice";

export type RecordingReviewType = "quick" | "sheet";

export type RecordingErrorMarker = {
  id: string;
  recordingId: string;
  timestampMs: number;
  note: string | null;
};

export type ReviewRecording = {
  id: string;
  type: RecordingReviewType;
  origin?: "user" | "demo";
  name?: string;
  sessionId: string;
  sheetId: string | null;
  sheetName?: string | null;
  createdAt: string;
  durationMs: number;
  sizeBytes: number;
  mimeType: string;
  audioDataUrl?: string | null;
  artifactAnalysis?: RecordingArtifactAnalysis | null;
  trustedPeaks?: number[];
  segmentContext?: SheetRecordingSegmentContext | null;
  settings: Pick<MetronomeSettings, "bpm" | "timeSignature"> &
    Partial<Omit<MetronomeSettings, "bpm" | "timeSignature">>;
};

export type RecordingReviewSnapshot = {
  sessions: unknown[];
  recordings: ReviewRecording[];
  errorMarkers: RecordingErrorMarker[];
  takeSelections?: RecordingTakeSelectionMetadata[];
};

export type RecordingTakeSelectionMetadata = {
  groupId: string;
  sheetId: string;
  segmentId: string | null;
  bestRecordingId: string | null;
  activeRecordingId: string | null;
  updatedAt: string;
};

export type RecordingTakeGroupKind = "sheet-segment" | "sheet-no-segment";

export type RecordingTakeGroup = {
  groupId: string;
  kind: RecordingTakeGroupKind;
  sheetId: string;
  sheetName: string | null;
  segmentId: string | null;
  segmentName: string | null;
  recordings: ReviewRecording[];
  takeCount: number;
  latestRecording: ReviewRecording;
  latestRecordedAt: string;
};

export type ReviewRecordingTakeGrouping = {
  takeGroups: RecordingTakeGroup[];
  quickRecordings: ReviewRecording[];
  ungroupedRecordings: ReviewRecording[];
};

export type ResolvedRecordingTakeSelection = {
  groupId: string;
  sheetId: string;
  segmentId: string | null;
  bestRecordingId: string | null;
  activeRecordingId: string | null;
  updatedAt: string | null;
  bestRecording: ReviewRecording | null;
  activeRecording: ReviewRecording | null;
};

export type RecordingArtifactDetails = {
  recordingId: string;
  decodedDurationMs: number;
  metadataDurationMs: number;
  durationDifferenceMs: number;
  durationWarning: string | null;
  peaks: number[];
  source: "decoded-audio" | "trusted-peaks";
};
