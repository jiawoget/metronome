import { clampBpm, parseTimeSignature } from "@/lib/quick-metronome/control";
import {
  DEFAULT_METRONOME_SETTINGS,
  type MetronomeSettings
} from "@/lib/quick-metronome/types";

export type SheetPracticeControlDefaults = {
  bpm: number | null;
  timeSignature: string | null;
};

export function createSheetPracticeMetronomeSettings(
  defaults: SheetPracticeControlDefaults
): MetronomeSettings {
  return {
    ...DEFAULT_METRONOME_SETTINGS,
    bpm: defaults.bpm === null ? DEFAULT_METRONOME_SETTINGS.bpm : clampBpm(defaults.bpm),
    timeSignature:
      defaults.timeSignature === null
        ? DEFAULT_METRONOME_SETTINGS.timeSignature
        : parseTimeSignature(defaults.timeSignature)
  };
}
