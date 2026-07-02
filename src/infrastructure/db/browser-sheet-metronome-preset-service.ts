"use client";

import Dexie, { type Table } from "dexie";

import {
  normalizeSheetMetronomePresetId,
  normalizeSheetMetronomePresetSegmentId,
  normalizeSheetMetronomePresetSheetId,
  parseSheetMetronomePreset,
  validateSheetMetronomePreset,
  type SheetMetronomePreset
} from "@/domain/practice";
import { SHEET_METRONOME_PRESET_DB_NAME } from "@/infrastructure/storage/storage-contracts";
import {
  createSheetMetronomePresetService,
  type SheetMetronomePresetRepository
} from "@/services/sheet-metronome-presets";

type PersistedSheetMetronomePresetRecord = {
  sheetId: string;
  presetId: string;
  segmentId: string | null;
  preset: SheetMetronomePreset;
  updatedAt: string;
};

export type SheetMetronomePresetMalformedRowInfo = {
  operation: "getPreset" | "listPresets";
  sheetId: string;
  presetId: string | null;
  row: unknown;
};

type SheetMetronomePresetDatabaseSchema = {
  presets: Table<PersistedSheetMetronomePresetRecord, [string, string]>;
};

class SheetMetronomePresetDexieDatabase
  extends Dexie
  implements SheetMetronomePresetDatabaseSchema
{
  presets!: Table<PersistedSheetMetronomePresetRecord, [string, string]>;

  constructor() {
    super(SHEET_METRONOME_PRESET_DB_NAME);

    this.version(1).stores({
      presets: "[sheetId+presetId], sheetId, presetId, segmentId, updatedAt"
    });
  }
}

let database: SheetMetronomePresetDexieDatabase | null = null;
let malformedRowListener:
  | ((info: SheetMetronomePresetMalformedRowInfo) => void)
  | null = null;

function getDatabase() {
  database ??= new SheetMetronomePresetDexieDatabase();

  return database;
}

function parseNormalizedRowId(
  value: unknown,
  normalizer: (value: string) => string
) {
  if (typeof value !== "string") {
    return null;
  }

  try {
    return normalizer(value);
  } catch {
    return null;
  }
}

function parsePersistedSegmentId(value: unknown) {
  if (
    value !== undefined &&
    value !== null &&
    typeof value !== "string"
  ) {
    return {
      ok: false as const
    };
  }

  return {
    ok: true as const,
    value: normalizeSheetMetronomePresetSegmentId(value)
  };
}

function parsePersistedSheetMetronomePresetRecordIdentifiers(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const candidate = value as {
    sheetId?: unknown;
    presetId?: unknown;
    segmentId?: unknown;
    preset?: unknown;
  };
  const normalizedSheetId = parseNormalizedRowId(
    candidate.sheetId,
    normalizeSheetMetronomePresetSheetId
  );
  const normalizedPresetId = parseNormalizedRowId(
    candidate.presetId,
    normalizeSheetMetronomePresetId
  );
  const parsedSegmentId = parsePersistedSegmentId(
    candidate.segmentId
  );
  const parsedPreset = parseSheetMetronomePreset(candidate.preset);

  if (
    !normalizedSheetId ||
    !normalizedPresetId ||
    !parsedSegmentId.ok ||
    !parsedPreset
  ) {
    return null;
  }

  if (
    parsedPreset.sheetId !== normalizedSheetId ||
    parsedPreset.id !== normalizedPresetId ||
    parsedPreset.segmentId !== parsedSegmentId.value
  ) {
    return null;
  }

  return {
    normalizedSheetId,
    normalizedPresetId,
    normalizedSegmentId: parsedSegmentId.value,
    parsedPreset
  };
}

export function parsePersistedSheetMetronomePresetRecord(
  value: unknown
): SheetMetronomePreset | null {
  const parsedRecord = parsePersistedSheetMetronomePresetRecordIdentifiers(
    value
  );

  return parsedRecord?.parsedPreset ?? null;
}

function reportMalformedPresetRow(info: SheetMetronomePresetMalformedRowInfo) {
  malformedRowListener?.(info);
}

function parsePresetRecordForRepositoryRead(input: {
  operation: "getPreset" | "listPresets";
  sheetId: string;
  presetId: string | null;
  row: unknown;
}) {
  const parsedRecord = parsePersistedSheetMetronomePresetRecordIdentifiers(
    input.row
  );

  if (!parsedRecord) {
    reportMalformedPresetRow(input);
    return null;
  }

  return parsedRecord.parsedPreset;
}

export const browserSheetMetronomePresetRepository: SheetMetronomePresetRepository =
  {
    async listPresets(sheetId) {
      const normalizedSheetId = normalizeSheetMetronomePresetSheetId(sheetId);
      const records = await getDatabase()
        .presets.where("sheetId")
        .equals(normalizedSheetId)
        .toArray();
      const parsedPresets: SheetMetronomePreset[] = [];

      for (const record of records) {
        const parsedRecord =
          parsePresetRecordForRepositoryRead({
            operation: "listPresets",
            sheetId: normalizedSheetId,
            presetId: null,
            row: record
          });

        if (!parsedRecord) {
          continue;
        }

        parsedPresets.push(parsedRecord);
      }

      return parsedPresets;
    },

    async getPreset(sheetId, presetId) {
      const normalizedSheetId = normalizeSheetMetronomePresetSheetId(sheetId);
      const normalizedPresetId = normalizeSheetMetronomePresetId(presetId);
      const row = await getDatabase().presets.get([
        normalizedSheetId,
        normalizedPresetId
      ]);

      if (row === undefined || row === null) {
        return null;
      }

      return parsePresetRecordForRepositoryRead({
        operation: "getPreset",
        sheetId: normalizedSheetId,
        presetId: normalizedPresetId,
        row
      });
    },

    async savePreset(preset) {
      const validatedPreset = validateSheetMetronomePreset(preset);

      await getDatabase().presets.put({
        sheetId: validatedPreset.sheetId,
        presetId: validatedPreset.id,
        segmentId: validatedPreset.segmentId,
        preset: validatedPreset,
        updatedAt: validatedPreset.updatedAt
      });
    },

    async deletePreset(sheetId, presetId) {
      const normalizedSheetId = normalizeSheetMetronomePresetSheetId(sheetId);
      const normalizedPresetId = normalizeSheetMetronomePresetId(presetId);

      await getDatabase().presets.delete([normalizedSheetId, normalizedPresetId]);
    }
  };

export const browserSheetMetronomePresetService =
  createSheetMetronomePresetService({
    repository: browserSheetMetronomePresetRepository
  });

export async function seedSheetMetronomePresetRecordForTests(
  sheetId: string,
  presetId: string,
  value: unknown
) {
  const normalizedSheetId = normalizeSheetMetronomePresetSheetId(sheetId);
  const normalizedPresetId = normalizeSheetMetronomePresetId(presetId);

  await getDatabase().presets.put({
    sheetId: normalizedSheetId,
    presetId: normalizedPresetId,
    segmentId: null,
    ...(value && typeof value === "object" && !Array.isArray(value) ? value : {})
  } as PersistedSheetMetronomePresetRecord);
}

export function resetSheetMetronomePresetDatabaseConnectionForTests() {
  database?.close();
  database = null;
  malformedRowListener = null;
}

export async function clearSheetMetronomePresetDatabaseForTests() {
  await getDatabase().delete();
  database = null;
}

export function setSheetMetronomePresetMalformedRowListenerForTests(
  listener: ((info: SheetMetronomePresetMalformedRowInfo) => void) | null
) {
  malformedRowListener = listener;
}
