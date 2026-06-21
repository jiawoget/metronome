import { TIME_SIGNATURES, clampBpm, parseTimeSignature } from "@/lib/quick-metronome/control";
import {
  DEFAULT_METRONOME_SETTINGS,
  type MetronomeSettings,
  type TimeSignature
} from "@/lib/quick-metronome/types";

export type SheetPracticeControlDefaults = {
  bpm: number | null;
  timeSignature: string | null;
};

export type SheetPracticeControlInitialState = {
  settings: MetronomeSettings;
  unsupportedTimeSignature: string | null;
};

function isSupportedTimeSignature(value: string | null): value is TimeSignature {
  return value !== null && TIME_SIGNATURES.includes(value as TimeSignature);
}

export function createSheetPracticeMetronomeSettings(
  defaults: SheetPracticeControlDefaults
): MetronomeSettings {
  return createSheetPracticeControlInitialState(defaults).settings;
}

export function createSheetPracticeControlInitialState(
  defaults: SheetPracticeControlDefaults
): SheetPracticeControlInitialState {
  const unsupportedTimeSignature =
    defaults.timeSignature !== null && !isSupportedTimeSignature(defaults.timeSignature)
      ? defaults.timeSignature
      : null;

  return {
    settings: {
      ...DEFAULT_METRONOME_SETTINGS,
      bpm: defaults.bpm === null ? DEFAULT_METRONOME_SETTINGS.bpm : clampBpm(defaults.bpm),
      timeSignature:
        defaults.timeSignature === null
          ? DEFAULT_METRONOME_SETTINGS.timeSignature
          : parseTimeSignature(defaults.timeSignature)
    },
    unsupportedTimeSignature
  };
}

export function formatUnsupportedTimeSignatureMessage(timeSignature: string) {
  return `Sheet meter ${timeSignature} is not supported by the v0 metronome; using ${DEFAULT_METRONOME_SETTINGS.timeSignature}.`;
}
