import type {
  RecordingArtifact as ServiceRecordingArtifact,
  RecordingArtifactAnalysis as ServiceRecordingArtifactAnalysis
} from "@/services/recording";
import type { RecordingArtifactRef } from "@/lib/recordings-review/types";

export const MIN_BPM = 30;
export const MAX_BPM = 240;
export const DEFAULT_BPM = 96;

export type TimeSignature = "2/4" | "3/4" | "4/4" | "6/8" | "12/8";
export type Subdivision = "quarter" | "eighth" | "triplet" | "sixteenth";
export type AccentMode = "downbeat" | "every-beat" | "off";

export type MetronomeSettings = {
  bpm: number;
  timeSignature: TimeSignature;
  subdivision: Subdivision;
  accent: AccentMode;
  countdownBeats: number;
};

export type QuickRecording = {
  id: string;
  type: "quick";
  origin: "user" | "demo";
  sessionId: string;
  sheetId: null;
  createdAt: string;
  durationMs: number;
  sizeBytes: number;
  mimeType: string;
  artifactRef?: RecordingArtifactRef | null;
  audioDataUrl?: string | null;
  artifactAnalysis: RecordingArtifactAnalysis | null;
  settings: MetronomeSettings;
};

export type SharedRecordingHistoryEntry =
  | QuickRecording
  | {
      id: string;
      type: string;
      sessionId: string;
      [key: string]: unknown;
    };

export type RecordingArtifactAnalysis = ServiceRecordingArtifactAnalysis;

export type RecordingArtifact = ServiceRecordingArtifact;

export type QuickMetronomeStoreSnapshot = {
  sessions: unknown[];
  recordings: SharedRecordingHistoryEntry[];
  errorMarkers: unknown[];
  takeSelections?: unknown[];
  recordingOrganization?: unknown[];
};

export const DEFAULT_METRONOME_SETTINGS: MetronomeSettings = {
  bpm: DEFAULT_BPM,
  timeSignature: "4/4",
  subdivision: "quarter",
  accent: "downbeat",
  countdownBeats: 0
};
