import {
  normalizeSheetMetronomePresetId,
  normalizeSheetMetronomePresetNameForComparison,
  normalizeSheetMetronomePresetSegmentId,
  normalizeSheetMetronomePresetSheetId,
  validateSheetMetronomePresetName,
  validateSheetMetronomePreset,
  validateSheetMetronomePresetSettings,
  type SheetMetronomePreset
} from "@/domain/practice";
import type {
  CreateSheetMetronomePresetInput,
  ListSheetMetronomePresetsOptions,
  RenameSheetMetronomePresetInput,
  SheetMetronomePresetRepository,
  SheetMetronomePresetService
} from "@/services/sheet-metronome-presets/types";

type CreateSheetMetronomePresetServiceOptions = {
  repository: SheetMetronomePresetRepository;
  now?: () => Date;
  createId?: () => string;
};

export const DUPLICATE_SHEET_METRONOME_PRESET_NAME_ERROR_MESSAGE =
  "Preset name already exists.";
export const MISSING_SHEET_METRONOME_PRESET_ERROR_MESSAGE =
  "Preset was not found.";

function createDefaultPresetId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `preset_${globalThis.crypto.randomUUID()}`;
  }

  return `preset_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function compareSheetMetronomePresets(
  left: SheetMetronomePreset,
  right: SheetMetronomePreset
) {
  const updatedAtComparison = right.updatedAt.localeCompare(left.updatedAt);

  if (updatedAtComparison !== 0) {
    return updatedAtComparison;
  }

  const normalizedNameComparison = normalizeSheetMetronomePresetNameForComparison(
    left.name
  ).localeCompare(normalizeSheetMetronomePresetNameForComparison(right.name));

  if (normalizedNameComparison !== 0) {
    return normalizedNameComparison;
  }

  const displayNameComparison = left.name.localeCompare(right.name);

  if (displayNameComparison !== 0) {
    return displayNameComparison;
  }

  return left.id.localeCompare(right.id);
}

function isSamePresetScope(
  left: Pick<SheetMetronomePreset, "sheetId" | "segmentId">,
  right: Pick<SheetMetronomePreset, "sheetId" | "segmentId">
) {
  return left.sheetId === right.sheetId && left.segmentId === right.segmentId;
}

function assertPresetNameIsUnique(
  presets: SheetMetronomePreset[],
  preset: SheetMetronomePreset
) {
  const normalizedName = normalizeSheetMetronomePresetNameForComparison(
    preset.name
  );
  const duplicatePreset = presets.find(
    (existingPreset) =>
      existingPreset.id !== preset.id &&
      isSamePresetScope(existingPreset, preset) &&
      normalizeSheetMetronomePresetNameForComparison(existingPreset.name) ===
        normalizedName
  );

  if (duplicatePreset) {
    throw new Error(DUPLICATE_SHEET_METRONOME_PRESET_NAME_ERROR_MESSAGE);
  }
}

function filterPresetsByScope(
  presets: SheetMetronomePreset[],
  options?: ListSheetMetronomePresetsOptions
) {
  if (options?.segmentId === undefined) {
    return presets;
  }

  const normalizedSegmentId = normalizeSheetMetronomePresetSegmentId(
    options.segmentId
  );

  return presets.filter(
    (preset) => preset.segmentId === normalizedSegmentId
  );
}

export function createSheetMetronomePresetService({
  repository,
  now = () => new Date(),
  createId = createDefaultPresetId
}: CreateSheetMetronomePresetServiceOptions): SheetMetronomePresetService {
  return {
    async listPresets(sheetId, options) {
      const normalizedSheetId = normalizeSheetMetronomePresetSheetId(sheetId);
      const presets = await repository.listPresets(normalizedSheetId);

      return [...filterPresetsByScope(presets, options)].sort(
        compareSheetMetronomePresets
      );
    },

    async getPreset(sheetId, presetId) {
      return repository.getPreset(
        normalizeSheetMetronomePresetSheetId(sheetId),
        normalizeSheetMetronomePresetId(presetId)
      );
    },

    async savePreset(input: CreateSheetMetronomePresetInput) {
      const normalizedSheetId = normalizeSheetMetronomePresetSheetId(
        input.sheetId
      );
      const normalizedPresetId = normalizeSheetMetronomePresetId(
        input.id ?? createId()
      );
      const normalizedSegmentId = normalizeSheetMetronomePresetSegmentId(
        input.segmentId
      );
      const validatedName = validateSheetMetronomePresetName(input.name);
      const validatedSettings = validateSheetMetronomePresetSettings(
        input.settings
      );
      const existingPreset = await repository.getPreset(
        normalizedSheetId,
        normalizedPresetId
      );
      const timestamp = now().toISOString();
      const preset = validateSheetMetronomePreset({
        id: normalizedPresetId,
        sheetId: normalizedSheetId,
        segmentId: normalizedSegmentId,
        name: validatedName,
        settings: validatedSettings,
        createdAt: existingPreset?.createdAt ?? timestamp,
        updatedAt: timestamp
      });
      const sameSheetPresets = await repository.listPresets(normalizedSheetId);

      assertPresetNameIsUnique(sameSheetPresets, preset);
      await repository.savePreset(preset);

      return preset;
    },

    async renamePreset(input: RenameSheetMetronomePresetInput) {
      const normalizedSheetId = normalizeSheetMetronomePresetSheetId(
        input.sheetId
      );
      const normalizedPresetId = normalizeSheetMetronomePresetId(
        input.presetId
      );
      const validatedName = validateSheetMetronomePresetName(input.name);
      const existingPreset = await repository.getPreset(
        normalizedSheetId,
        normalizedPresetId
      );

      if (!existingPreset) {
        throw new Error(MISSING_SHEET_METRONOME_PRESET_ERROR_MESSAGE);
      }

      const renamedPreset = validateSheetMetronomePreset({
        ...existingPreset,
        name: validatedName,
        updatedAt: now().toISOString()
      });
      const sameSheetPresets = await repository.listPresets(normalizedSheetId);

      assertPresetNameIsUnique(sameSheetPresets, renamedPreset);
      await repository.savePreset(renamedPreset);

      return renamedPreset;
    },

    async deletePreset(sheetId, presetId) {
      return repository.deletePreset(
        normalizeSheetMetronomePresetSheetId(sheetId),
        normalizeSheetMetronomePresetId(presetId)
      );
    },

    async loadPreset(sheetId, presetId) {
      const preset = await repository.getPreset(
        normalizeSheetMetronomePresetSheetId(sheetId),
        normalizeSheetMetronomePresetId(presetId)
      );

      if (!preset) {
        return { status: "missing" } as const;
      }

      return {
        status: "loaded" as const,
        preset,
        settings: {
          ...preset.settings,
          barCountIn: {
            ...preset.settings.barCountIn
          }
        }
      };
    }
  };
}
