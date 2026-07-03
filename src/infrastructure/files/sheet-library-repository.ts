import Dexie, { type Table } from "dexie";

import {
  resolveSheetOrganization,
  type ImportedSheet,
  type SheetArtifact,
  type SheetOrganizationMetadata
} from "@/domain/sheet";
import { SHEET_LIBRARY_DB_NAME } from "@/infrastructure/storage/storage-contracts";
import type { SheetLibraryRepository } from "@/services/sheet-library";

type SheetLibraryDatabaseSchema = {
  sheets: Table<ImportedSheet, string>;
  artifacts: Table<SheetArtifact, string>;
};

class SheetLibraryDexieDatabase
  extends Dexie
  implements SheetLibraryDatabaseSchema
{
  sheets!: Table<ImportedSheet, string>;
  artifacts!: Table<SheetArtifact, string>;

  constructor() {
    super(SHEET_LIBRARY_DB_NAME);

    this.version(1).stores({
      sheets: "id, name, category, kind, createdAt",
      artifacts: "sheetId, kind, createdAt"
    });
  }
}

let database: SheetLibraryDexieDatabase | null = null;

function getDatabase() {
  database ??= new SheetLibraryDexieDatabase();

  return database;
}

function normalizeSheetOrganization(sheet: ImportedSheet) {
  return {
    ...sheet,
    ...resolveSheetOrganization(sheet)
  };
}

export const sheetLibraryRepository: SheetLibraryRepository = {
  async listSheets() {
    const sheets = await getDatabase().sheets.orderBy("createdAt").reverse().toArray();

    return sheets.map(normalizeSheetOrganization);
  },

  async getSheet(sheetId) {
    const sheet = await getDatabase().sheets.get(sheetId);

    return sheet ? normalizeSheetOrganization(sheet) : null;
  },

  async saveSheet(sheet, artifact) {
    const db = getDatabase();

    await db.transaction("rw", db.sheets, db.artifacts, async () => {
      await db.sheets.put(sheet);
      await db.artifacts.put(artifact, sheet.id);
    });
  },

  async updateSheetMetadata(sheetId, metadata, updatedAt) {
    const sheet = await getDatabase().sheets.get(sheetId);

    if (!sheet) {
      return null;
    }

    const updatedSheet = {
      ...sheet,
      ...metadata,
      updatedAt
    };

    await getDatabase().sheets.put(updatedSheet);

    return updatedSheet;
  },

  async updateSheetOrganization(
    sheetId,
    organization: SheetOrganizationMetadata,
    updatedAt
  ) {
    const sheet = await getDatabase().sheets.get(sheetId);

    if (!sheet) {
      return null;
    }

    const updatedSheet = {
      ...sheet,
      ...organization,
      updatedAt
    };

    await getDatabase().sheets.put(updatedSheet);

    return normalizeSheetOrganization(updatedSheet);
  },

  async updateLastPracticedAt(sheetId, practicedAt) {
    const sheet = await getDatabase().sheets.get(sheetId);

    if (!sheet) {
      return;
    }

    await getDatabase().sheets.put({
      ...sheet,
      lastPracticedAt: practicedAt,
      updatedAt: practicedAt
    });
  },

  async getArtifact(sheetId) {
    return (await getDatabase().artifacts.get(sheetId)) ?? null;
  },

  async deleteSheet(sheetId) {
    const db = getDatabase();

    await db.transaction("rw", db.sheets, db.artifacts, async () => {
      await db.artifacts.delete(sheetId);
      await db.sheets.delete(sheetId);
    });
  },

  async clear() {
    const db = getDatabase();

    await db.transaction("rw", db.sheets, db.artifacts, async () => {
      await db.artifacts.clear();
      await db.sheets.clear();
    });
  }
};

export async function clearSheetLibraryDatabaseForTests() {
  const db = getDatabase();

  await db.transaction("rw", db.sheets, db.artifacts, async () => {
    await db.artifacts.clear();
    await db.sheets.clear();
  });
}

export function resetSheetLibraryDatabaseConnectionForTests() {
  database?.close();
  database = null;
}

export async function seedSheetRowForTests(
  sheetId: string,
  sheet: Record<string, unknown>
) {
  await getDatabase()
    .table("sheets")
    .put({ ...sheet, id: sheetId } as ImportedSheet, sheetId);
}
