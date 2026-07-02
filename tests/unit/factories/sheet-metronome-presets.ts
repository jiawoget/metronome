import type {
  SheetMetronomePreset,
  SheetMetronomePresetSettings
} from "@/domain/practice";

export const TEST_PRESET_CREATED_AT = "2026-07-02T09:00:00.000Z";
export const TEST_PRESET_UPDATED_AT = "2026-07-02T09:15:00.000Z";

type SheetMetronomePresetSettingsOverrides = Partial<
  Omit<SheetMetronomePresetSettings, "barCountIn">
> & {
  barCountIn?: Partial<SheetMetronomePresetSettings["barCountIn"]>;
};

type SheetMetronomePresetOverrides = Partial<
  Omit<SheetMetronomePreset, "settings">
> & {
  settings?: SheetMetronomePresetSettingsOverrides;
};

export function buildSheetMetronomePresetSettings(
  overrides: SheetMetronomePresetSettingsOverrides = {}
): SheetMetronomePresetSettings {
  const { barCountIn, ...settingOverrides } = overrides;

  return {
    bpm: 96,
    timeSignature: "4/4",
    subdivision: "quarter",
    accent: "downbeat",
    countdownBeats: 0,
    barCountIn: {
      enabled: false,
      bars: 1,
      ...barCountIn
    },
    ...settingOverrides
  };
}

export function buildSheetMetronomePreset(
  overrides: SheetMetronomePresetOverrides = {}
): SheetMetronomePreset {
  const { settings, ...presetOverrides } = overrides;

  return {
    id: "preset-1",
    sheetId: "sheet-alpha",
    segmentId: null,
    name: "Default Practice",
    settings: buildSheetMetronomePresetSettings(settings),
    createdAt: TEST_PRESET_CREATED_AT,
    updatedAt: TEST_PRESET_UPDATED_AT,
    ...presetOverrides
  };
}
