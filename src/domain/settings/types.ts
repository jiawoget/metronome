import type { Subdivision, TimeSignature } from "@/lib/quick-metronome/types";
import { SUBDIVISIONS, TIME_SIGNATURES } from "@/lib/quick-metronome/control";

export type UserSettings = {
  defaultBpm: number;
  defaultTimeSignature: TimeSignature;
  defaultSubdivision: Subdivision;
  metronomeVolume: number;
  referenceDefaultVolume: number;
};

export const DEFAULT_USER_SETTINGS: UserSettings = {
  defaultBpm: 96,
  defaultTimeSignature: "4/4",
  defaultSubdivision: "quarter",
  metronomeVolume: 80,
  referenceDefaultVolume: 100
};

export const SETTINGS_BPM_MIN = 30;
export const SETTINGS_BPM_MAX = 240;
export const SETTINGS_VOLUME_MIN = 0;
export const SETTINGS_VOLUME_MAX = 100;

export const SETTINGS_TIME_SIGNATURES = TIME_SIGNATURES;
export const SETTINGS_SUBDIVISIONS = SUBDIVISIONS;

export type MicrophonePermissionStatus =
  | "granted"
  | "denied"
  | "prompt"
  | "unknown"
  | "unsupported";

export type LocalDataCounts = {
  sheets: number;
  recordings: number;
  references: number;
  errorMarkers: number;
  practiceSessions: number;
};

export type BrowserStorageEstimate =
  | {
      supported: true;
      usageBytes: number;
      quotaBytes: number | null;
    }
  | {
      supported: false;
      message: string;
    };

export type LocalDataSummary = {
  counts: LocalDataCounts;
  storageEstimate: BrowserStorageEstimate;
};
