"use client";

import Dexie, { type Table } from "dexie";

import { parseMeasureGrid, validateMeasureGrid, type MeasureGrid } from "@/domain/practice";
import { MEASURE_GRID_DB_NAME } from "@/infrastructure/storage/storage-contracts";
import {
  createMeasureGridService,
  normalizeMeasureGridSheetId,
  type MeasureGridRepository
} from "@/services/measure-grid";

type PersistedMeasureGridRecord = {
  sheetId: string;
  grid: MeasureGrid;
  updatedAt: string;
};

type MeasureGridDatabaseSchema = {
  grids: Table<PersistedMeasureGridRecord, string>;
};

class MeasureGridDexieDatabase extends Dexie implements MeasureGridDatabaseSchema {
  grids!: Table<PersistedMeasureGridRecord, string>;

  constructor() {
    super(MEASURE_GRID_DB_NAME);

    this.version(1).stores({
      grids: "sheetId, updatedAt"
    });
  }
}

let database: MeasureGridDexieDatabase | null = null;

function getDatabase() {
  database ??= new MeasureGridDexieDatabase();

  return database;
}

export function parsePersistedMeasureGridRecord(value: unknown): MeasureGrid | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return parseMeasureGrid((value as { grid?: unknown }).grid);
}

export const browserMeasureGridRepository: MeasureGridRepository = {
  async getGrid(sheetId) {
    const record = await getDatabase().grids.get(normalizeMeasureGridSheetId(sheetId));

    return parsePersistedMeasureGridRecord(record ?? null);
  },

  async saveGrid(sheetId, grid) {
    const normalizedSheetId = normalizeMeasureGridSheetId(sheetId);
    const validatedGrid = validateMeasureGrid(grid);

    await getDatabase().grids.put({
      sheetId: normalizedSheetId,
      grid: validatedGrid,
      updatedAt: new Date().toISOString()
    });
  },

  async clearGrid(sheetId) {
    await getDatabase().grids.delete(normalizeMeasureGridSheetId(sheetId));
  }
};

export const browserMeasureGridService = createMeasureGridService(browserMeasureGridRepository);

export async function seedMeasureGridRecordForTests(sheetId: string, value: unknown) {
  await getDatabase().grids.put({
    sheetId: normalizeMeasureGridSheetId(sheetId),
    ...(value && typeof value === "object" && !Array.isArray(value) ? value : {})
  } as PersistedMeasureGridRecord);
}

export function resetMeasureGridDatabaseConnectionForTests() {
  database?.close();
  database = null;
}

export async function clearMeasureGridDatabaseForTests() {
  await getDatabase().delete();
  database = null;
}
