import Dexie, { type Table } from "dexie";

import type { ImportedSheet, SheetArtifact } from "@/domain/sheet";
import type { SheetLibraryRepository } from "@/services/sheet-library";

export const SHEET_LIBRARY_DB_NAME = "metronome-practice-v0-sheet-library";

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

export const sheetLibraryRepository: SheetLibraryRepository = {
  async listSheets() {
    return getDatabase().sheets.orderBy("createdAt").reverse().toArray();
  },

  async getSheet(sheetId) {
    return (await getDatabase().sheets.get(sheetId)) ?? null;
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
  await getDatabase().delete();
  database = null;
}
