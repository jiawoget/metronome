"use client";

import Dexie, { type Table, type Transaction } from "dexie";

import { parsePracticeSegment, validatePracticeSegment, type PracticeSegment } from "@/domain/practice";
import { PRACTICE_SEGMENT_DB_NAME } from "@/infrastructure/storage/storage-contracts";
import {
  createPracticeSegmentService,
  normalizePracticeSegmentId,
  normalizePracticeSegmentSheetId,
  type PracticeSegmentRepository
} from "@/services/practice-segments";

type PersistedPracticeSegmentRecord = {
  sheetId: string;
  segmentId: string;
  segment: PracticeSegment;
  updatedAt: string;
};

type LegacyPersistedPracticeSegmentRecord = PersistedPracticeSegmentRecord & {
  key: string;
};

type PracticeSegmentDatabaseSchema = {
  segments: Table<PersistedPracticeSegmentRecord, [string, string]>;
};

const MIGRATED_UNKNOWN_UPDATED_AT = "1970-01-01T00:00:00.000Z";

class PracticeSegmentDexieDatabase extends Dexie implements PracticeSegmentDatabaseSchema {
  segments!: Table<PersistedPracticeSegmentRecord, [string, string]>;

  constructor() {
    super(PRACTICE_SEGMENT_DB_NAME);

    this.version(1).stores({
      segments: "key, sheetId, segmentId, updatedAt"
    });
    this.version(2)
      .stores({
        segments: null,
        segmentRecords: "[sheetId+segmentId], sheetId, segmentId, updatedAt"
      })
      .upgrade(migrateLegacySegmentsToCompoundRecords);
    this.version(3)
      .stores({
        segmentRecords: null,
        segments: "[sheetId+segmentId], sheetId, segmentId, updatedAt"
      })
      .upgrade(migrateCompoundRecordsToSegments);
  }
}

function getUpdatedAtMs(updatedAt: string) {
  const updatedAtMs = Date.parse(updatedAt);

  return Number.isFinite(updatedAtMs) ? updatedAtMs : 0;
}

function selectMigratedPracticeSegmentRecords(rows: unknown[]) {
  const recordsBySheetAndSegment = new Map<string, Map<string, PersistedPracticeSegmentRecord>>();

  for (const row of rows) {
    const parsedRecord = parsePersistedPracticeSegmentRecordIdentifiers(row);

    if (!parsedRecord) {
      continue;
    }

    const candidate = row as Partial<PersistedPracticeSegmentRecord>;
    const migratedRecord: PersistedPracticeSegmentRecord = {
      sheetId: parsedRecord.normalizedSheetId,
      segmentId: parsedRecord.normalizedSegmentId,
      segment: parsedRecord.parsedSegment,
      updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : MIGRATED_UNKNOWN_UPDATED_AT
    };
    const sheetRecords = recordsBySheetAndSegment.get(migratedRecord.sheetId) ?? new Map<string, PersistedPracticeSegmentRecord>();
    const existingRecord = sheetRecords.get(migratedRecord.segmentId);

    if (!existingRecord || getUpdatedAtMs(migratedRecord.updatedAt) >= getUpdatedAtMs(existingRecord.updatedAt)) {
      sheetRecords.set(migratedRecord.segmentId, migratedRecord);
      recordsBySheetAndSegment.set(migratedRecord.sheetId, sheetRecords);
    }
  }

  return Array.from(recordsBySheetAndSegment.values()).flatMap((sheetRecords) => Array.from(sheetRecords.values()));
}

async function migratePracticeSegmentRows(
  rows: unknown[],
  targetTable: Table<PersistedPracticeSegmentRecord, [string, string]>
) {
  const migratedRows = selectMigratedPracticeSegmentRecords(rows);

  if (migratedRows.length === 0) {
    return;
  }

  await targetTable.bulkPut(migratedRows);
}

async function migrateLegacySegmentsToCompoundRecords(transaction: Transaction) {
  const legacyRows = await transaction.table<LegacyPersistedPracticeSegmentRecord, string>("segments").toArray();

  // Invalid legacy rows keep the existing repository policy: they are treated as corrupt local data and filtered out.
  await migratePracticeSegmentRows(
    legacyRows,
    transaction.table<PersistedPracticeSegmentRecord, [string, string]>("segmentRecords")
  );
}

async function migrateCompoundRecordsToSegments(transaction: Transaction) {
  const compoundRows = await transaction.table<PersistedPracticeSegmentRecord, [string, string]>("segmentRecords").toArray();

  await migratePracticeSegmentRows(
    compoundRows,
    transaction.table<PersistedPracticeSegmentRecord, [string, string]>("segments")
  );
}

let database: PracticeSegmentDexieDatabase | null = null;

function getDatabase() {
  database ??= new PracticeSegmentDexieDatabase();

  return database;
}

function parseNormalizedRowId(value: unknown, normalizer: (value: string) => string) {
  if (typeof value !== "string") {
    return null;
  }

  try {
    return normalizer(value);
  } catch {
    return null;
  }
}

function parsePersistedPracticeSegmentRecordIdentifiers(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const candidate = value as {
    sheetId?: unknown;
    segmentId?: unknown;
    segment?: unknown;
  };
  const normalizedSheetId = parseNormalizedRowId(candidate.sheetId, normalizePracticeSegmentSheetId);
  const normalizedSegmentId = parseNormalizedRowId(candidate.segmentId, normalizePracticeSegmentId);
  const parsedSegment = parsePracticeSegment(candidate.segment);

  if (!normalizedSheetId || !normalizedSegmentId || !parsedSegment) {
    return null;
  }

  if (
    parsedSegment.sheetId !== normalizedSheetId ||
    parsedSegment.id !== normalizedSegmentId
  ) {
    return null;
  }

  return {
    normalizedSheetId,
    normalizedSegmentId,
    parsedSegment
  };
}

export function parsePersistedPracticeSegmentRecord(value: unknown): PracticeSegment | null {
  const parsedRecord = parsePersistedPracticeSegmentRecordIdentifiers(value);

  return parsedRecord?.parsedSegment ?? null;
}

export const browserPracticeSegmentRepository: PracticeSegmentRepository = {
  async listSegments(sheetId) {
    const normalizedSheetId = normalizePracticeSegmentSheetId(sheetId);
    const records = await getDatabase().segments.where("sheetId").equals(normalizedSheetId).toArray();
    const parsedSegments: PracticeSegment[] = [];

    for (const record of records) {
      const parsedRecord = parsePersistedPracticeSegmentRecordIdentifiers(record);

      if (!parsedRecord) {
        continue;
      }

      parsedSegments.push(parsedRecord.parsedSegment);
    }

    return parsedSegments;
  },

  async getSegment(sheetId, segmentId) {
    const normalizedSheetId = normalizePracticeSegmentSheetId(sheetId);
    const normalizedSegmentId = normalizePracticeSegmentId(segmentId);

    return parsePersistedPracticeSegmentRecord(
      await getDatabase().segments.get([normalizedSheetId, normalizedSegmentId])
    );
  },

  async saveSegment(segment) {
    const validatedSegment = validatePracticeSegment(segment);
    const normalizedSheetId = normalizePracticeSegmentSheetId(validatedSegment.sheetId);
    const normalizedSegmentId = normalizePracticeSegmentId(validatedSegment.id);

    await getDatabase().segments.put({
      sheetId: normalizedSheetId,
      segmentId: normalizedSegmentId,
      segment: validatedSegment,
      updatedAt: new Date().toISOString()
    });
  },

  async deleteSegment(sheetId, segmentId) {
    const normalizedSheetId = normalizePracticeSegmentSheetId(sheetId);
    const normalizedSegmentId = normalizePracticeSegmentId(segmentId);

    await getDatabase().segments.delete([normalizedSheetId, normalizedSegmentId]);
  }
};

export const browserPracticeSegmentService = createPracticeSegmentService(browserPracticeSegmentRepository);

export async function seedPracticeSegmentRecordForTests(sheetId: string, segmentId: string, value: unknown) {
  const normalizedSheetId = normalizePracticeSegmentSheetId(sheetId);
  const normalizedSegmentId = normalizePracticeSegmentId(segmentId);

  await getDatabase().segments.put({
    sheetId: normalizedSheetId,
    segmentId: normalizedSegmentId,
    ...(value && typeof value === "object" && !Array.isArray(value) ? value : {})
  } as PersistedPracticeSegmentRecord);
}

export function resetPracticeSegmentDatabaseConnectionForTests() {
  database?.close();
  database = null;
}

export async function clearPracticeSegmentDatabaseForTests() {
  await getDatabase().delete();
  database = null;
}
