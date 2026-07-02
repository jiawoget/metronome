import { z } from "zod";

import {
  ACCENT_MODES,
  COUNTDOWN_BEAT_OPTIONS,
  SUBDIVISIONS,
  TIME_SIGNATURES,
  clampBpm,
  parseAccentMode,
  parseCountdownBeats,
  parseSubdivision,
  parseTimeSignature
} from "@/lib/quick-metronome/control";
import {
  MAX_BPM,
  MIN_BPM,
  type AccentMode,
  type MetronomeSettings,
  type Subdivision,
  type TimeSignature
} from "@/lib/quick-metronome/types";

export type SheetMetronomePresetScope = {
  sheetId: string;
  segmentId: string | null;
};

export type SheetMetronomePresetBarCountIn = {
  enabled: boolean;
  bars: 1 | 2;
};

export type SheetMetronomePresetSettings = {
  bpm: number;
  timeSignature: TimeSignature;
  subdivision: Subdivision;
  accent: AccentMode;
  countdownBeats: number;
  barCountIn: SheetMetronomePresetBarCountIn;
};

export type SheetMetronomePreset = {
  id: string;
  sheetId: string;
  segmentId: string | null;
  name: string;
  settings: SheetMetronomePresetSettings;
  createdAt: string;
  updatedAt: string;
};

const isoDateSchema = z.iso
  .datetime({ offset: true })
  .refine((value) => {
    const parsedValue = new Date(value);

    return Number.isFinite(parsedValue.getTime()) && parsedValue.toISOString() === value;
  }, {
    message: "Expected a strict ISO datetime with a real calendar date."
  });
const presetSheetIdSchema = z.string().trim().min(1, "sheetId is required.");
const presetIdSchema = z.string().trim().min(1, "presetId is required.");
const presetNameSchema = z.string().trim().min(1, "Preset name is required.");
const presetSegmentIdSchema = z.preprocess((value) => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return value;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length === 0 ? null : trimmedValue;
}, z.string().trim().min(1).nullable());
const presetSegmentIdFieldSchema = presetSegmentIdSchema
  .optional()
  .transform((value) => value ?? null);
const presetBpmSchema = z.number().finite().int().min(MIN_BPM).max(MAX_BPM);
const presetTimeSignatureSchema = z.enum(TIME_SIGNATURES);
const presetSubdivisionSchema = z.enum(SUBDIVISIONS);
const presetAccentSchema = z.custom<AccentMode>(
  (value): value is AccentMode =>
    typeof value === "string" && ACCENT_MODES.includes(value as AccentMode),
  "accent must be a supported metronome accent mode."
);
const presetCountdownBeatsSchema = z
  .number()
  .finite()
  .int()
  .refine(
    (value) =>
      COUNTDOWN_BEAT_OPTIONS.includes(
        value as (typeof COUNTDOWN_BEAT_OPTIONS)[number]
      ),
    {
      message: "countdownBeats must be a supported metronome countdown option."
    }
  );
const presetBarCountInSchema = z.object({
  enabled: z.boolean(),
  bars: z.union([z.literal(1), z.literal(2)])
});
const sheetMetronomePresetSettingsSchema = z.object({
  bpm: presetBpmSchema,
  timeSignature: presetTimeSignatureSchema,
  subdivision: presetSubdivisionSchema,
  accent: presetAccentSchema,
  countdownBeats: presetCountdownBeatsSchema,
  barCountIn: presetBarCountInSchema
});
const sheetMetronomePresetSchema = z.object({
  id: presetIdSchema,
  sheetId: presetSheetIdSchema,
  segmentId: presetSegmentIdFieldSchema,
  name: presetNameSchema,
  settings: sheetMetronomePresetSettingsSchema,
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema
});

export function normalizeSheetMetronomePresetSheetId(sheetId: string) {
  return presetSheetIdSchema.parse(sheetId);
}

export function normalizeSheetMetronomePresetId(presetId: string) {
  return presetIdSchema.parse(presetId);
}

export function parseSheetMetronomePresetSegmentId(value: unknown): string | null {
  const result = presetSegmentIdSchema.safeParse(value);

  return result.success ? result.data : null;
}

export function normalizeSheetMetronomePresetSegmentId(
  segmentId: string | null | undefined
): string | null {
  return presetSegmentIdSchema.parse(segmentId);
}

export function normalizeSheetMetronomePresetNameForComparison(name: string) {
  return name.trim().toLowerCase();
}

export function validateSheetMetronomePresetName(value: string) {
  return presetNameSchema.parse(value);
}

export function parseSheetMetronomePresetSettings(
  value: unknown
): SheetMetronomePresetSettings | null {
  const result = sheetMetronomePresetSettingsSchema.safeParse(value);

  return result.success ? result.data : null;
}

export function validateSheetMetronomePresetSettings(
  value: SheetMetronomePresetSettings
): SheetMetronomePresetSettings {
  return sheetMetronomePresetSettingsSchema.parse(value);
}

export function parseSheetMetronomePreset(
  value: unknown
): SheetMetronomePreset | null {
  const result = sheetMetronomePresetSchema.safeParse(value);

  return result.success ? result.data : null;
}

export function validateSheetMetronomePreset(
  value: SheetMetronomePreset
): SheetMetronomePreset {
  return sheetMetronomePresetSchema.parse(value);
}

export function createSheetMetronomePresetSettingsSnapshot(input: {
  settings: MetronomeSettings;
  barCountIn: SheetMetronomePresetBarCountIn;
}): SheetMetronomePresetSettings {
  return validateSheetMetronomePresetSettings({
    bpm: clampBpm(input.settings.bpm),
    timeSignature: parseTimeSignature(input.settings.timeSignature),
    subdivision: parseSubdivision(input.settings.subdivision),
    accent: parseAccentMode(input.settings.accent),
    countdownBeats: parseCountdownBeats(input.settings.countdownBeats),
    barCountIn: presetBarCountInSchema.parse(input.barCountIn)
  });
}

export function createMetronomeControlStateFromPreset(
  presetSettings: SheetMetronomePresetSettings
): {
  settings: MetronomeSettings;
  barCountIn: SheetMetronomePresetBarCountIn;
} {
  const validatedPresetSettings =
    validateSheetMetronomePresetSettings(presetSettings);

  return {
    settings: {
      bpm: validatedPresetSettings.bpm,
      timeSignature: validatedPresetSettings.timeSignature,
      subdivision: validatedPresetSettings.subdivision,
      accent: validatedPresetSettings.accent,
      countdownBeats: validatedPresetSettings.countdownBeats
    },
    barCountIn: {
      enabled: validatedPresetSettings.barCountIn.enabled,
      bars: validatedPresetSettings.barCountIn.bars
    }
  };
}
