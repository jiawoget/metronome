import { z } from "zod";

import {
  DEFAULT_USER_SETTINGS,
  SETTINGS_BPM_MAX,
  SETTINGS_BPM_MIN,
  SETTINGS_SUBDIVISIONS,
  SETTINGS_TIME_SIGNATURES,
  SETTINGS_VOLUME_MAX,
  SETTINGS_VOLUME_MIN,
  type MicrophonePermissionStatus,
  type UserSettings
} from "@/domain/settings/types";

const userSettingsSchema = z.object({
  defaultBpm: z.number().finite(),
  defaultTimeSignature: z.enum(SETTINGS_TIME_SIGNATURES),
  defaultSubdivision: z.enum(SETTINGS_SUBDIVISIONS),
  metronomeVolume: z.number().finite(),
  referenceDefaultVolume: z.number().finite()
});

function clampNumber(value: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(value)));
}

export function normalizeUserSettings(value: unknown): UserSettings {
  const result = userSettingsSchema.safeParse(value);

  if (!result.success) {
    return DEFAULT_USER_SETTINGS;
  }

  return {
    defaultBpm: clampNumber(
      result.data.defaultBpm,
      SETTINGS_BPM_MIN,
      SETTINGS_BPM_MAX,
      DEFAULT_USER_SETTINGS.defaultBpm
    ),
    defaultTimeSignature: result.data.defaultTimeSignature,
    defaultSubdivision: result.data.defaultSubdivision,
    metronomeVolume: clampNumber(
      result.data.metronomeVolume,
      SETTINGS_VOLUME_MIN,
      SETTINGS_VOLUME_MAX,
      DEFAULT_USER_SETTINGS.metronomeVolume
    ),
    referenceDefaultVolume: clampNumber(
      result.data.referenceDefaultVolume,
      SETTINGS_VOLUME_MIN,
      SETTINGS_VOLUME_MAX,
      DEFAULT_USER_SETTINGS.referenceDefaultVolume
    )
  };
}

export function normalizeSettingsPatch(current: UserSettings, patch: Partial<UserSettings>): UserSettings {
  return normalizeUserSettings({
    ...current,
    ...patch
  });
}

export function mapPermissionState(value: PermissionState | string | null | undefined): MicrophonePermissionStatus {
  if (value === "granted" || value === "denied" || value === "prompt") {
    return value;
  }

  if (value === "unsupported") {
    return "unsupported";
  }

  return "unknown";
}

export function formatStorageBytes(sizeBytes: number) {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return "0 B";
  }

  if (sizeBytes < 1024) {
    return `${Math.round(sizeBytes)} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
}

export function getClearLocalDataPlan() {
  return [
    "settings",
    "sheets",
    "sheet artifacts",
    "recordings",
    "recording artifacts",
    "references",
    "reference artifacts",
    "error markers",
    "practice sessions",
    "practice history"
  ];
}

