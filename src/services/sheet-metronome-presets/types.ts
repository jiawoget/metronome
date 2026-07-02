import type {
  SheetMetronomePreset,
  SheetMetronomePresetSettings
} from "@/domain/practice";

export type CreateSheetMetronomePresetInput = {
  id?: string;
  sheetId: string;
  segmentId?: string | null;
  name: string;
  settings: SheetMetronomePresetSettings;
};

export type RenameSheetMetronomePresetInput = {
  sheetId: string;
  presetId: string;
  name: string;
};

export type ListSheetMetronomePresetsOptions = {
  segmentId?: string | null;
};

export type SheetMetronomePresetLoadResult =
  | {
      status: "loaded";
      preset: SheetMetronomePreset;
      settings: SheetMetronomePresetSettings;
    }
  | { status: "missing" };

export type SheetMetronomePresetRepository = {
  listPresets: (sheetId: string) => Promise<SheetMetronomePreset[]>;
  getPreset: (
    sheetId: string,
    presetId: string
  ) => Promise<SheetMetronomePreset | null>;
  savePreset: (preset: SheetMetronomePreset) => Promise<void>;
  deletePreset: (sheetId: string, presetId: string) => Promise<void>;
};

export type SheetMetronomePresetService = {
  listPresets: (
    sheetId: string,
    options?: ListSheetMetronomePresetsOptions
  ) => Promise<SheetMetronomePreset[]>;
  getPreset: (
    sheetId: string,
    presetId: string
  ) => Promise<SheetMetronomePreset | null>;
  savePreset: (
    input: CreateSheetMetronomePresetInput
  ) => Promise<SheetMetronomePreset>;
  renamePreset: (
    input: RenameSheetMetronomePresetInput
  ) => Promise<SheetMetronomePreset>;
  deletePreset: (sheetId: string, presetId: string) => Promise<void>;
  loadPreset: (
    sheetId: string,
    presetId: string
  ) => Promise<SheetMetronomePresetLoadResult>;
};
