"use client";

import Dexie, { type Table } from "dexie";

import { parsePracticeSegment, validatePracticeSegment, type PracticeSegment } from "@/domain/practice";
import {
  createPracticeSegmentService,
  normalizePracticeSegmentId,
  normalizePracticeSegmentSheetId,
  type PracticeSegmentRepository
} from "@/services/practice-segments";

export const PRACTICE_SEGMENT_DB_NAME = "metronome-practice-v1-practice-segments";

type PersistedPracticeSegmentRecord = {
  key: string;
  sheetId: string;
  segmentId: string;
  segment: PracticeSegment;
  updatedAt: string;
};

type PracticeSegmentDatabaseSchema = {
  segments: Table<PersistedPracticeSegmentRecord, string>;
};

class PracticeSegmentDexieDatabase extends Dexie implements PracticeSegmentDatabaseSchema {
  segments!: Table<PersistedPracticeSegmentRecord, string>;

  constructor() {
    super(PRACTICE_SEGMENT_DB_NAME);

    this.version(1).stores({
      segments: "key, sheetId, segmentId, updatedAt"
    });
  }
}

let database: PracticeSegmentDexieDatabase | null = null;

function getDatabase() {
  database ??= new PracticeSegmentDexieDatabase();

  return database;
}

function createPracticeSegmentRecordKey(sheetId: string, segmentId: string) {
  return JSON.stringify([sheetId, segmentId]);
}

function createLegacyPracticeSegmentRecordKey(sheetId: string, segmentId: string) {
  return `${sheetId}::${segmentId}`;
}

function isPracticeSegmentRecordKeyMatch(key: string, sheetId: string, segmentId: string) {
  return (
    key === createPracticeSegmentRecordKey(sheetId, segmentId) ||
    key === createLegacyPracticeSegmentRecordKey(sheetId, segmentId)
  );
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
    key?: unknown;
    sheetId?: unknown;
    segmentId?: unknown;
    segment?: unknown;
  };
  const key =
    typeof candidate.key === "string"
      ? candidate.key
      : null;
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
    key,
    normalizedSheetId,
    normalizedSegmentId,
    parsedSegment
  };
}

function hasMatchingPracticeSegmentRecordIdentifiers(
  value: unknown,
  sheetId: string,
  segmentId: string
) {
  const parsedRecord = parsePersistedPracticeSegmentRecordIdentifiers(value);

  return (
    parsedRecord?.normalizedSheetId === sheetId &&
    parsedRecord.normalizedSegmentId === segmentId
  );
}

export function parsePersistedPracticeSegmentRecord(value: unknown): PracticeSegment | null {
  const parsedRecord = parsePersistedPracticeSegmentRecordIdentifiers(value);

  if (
    !parsedRecord?.key ||
    !isPracticeSegmentRecordKeyMatch(
      parsedRecord.key,
      parsedRecord.normalizedSheetId,
      parsedRecord.normalizedSegmentId
    )
  ) {
    return null;
  }

  return parsedRecord.parsedSegment;
}

export const browserPracticeSegmentRepository: PracticeSegmentRepository = {
  async listSegments(sheetId) {
    const normalizedSheetId = normalizePracticeSegmentSheetId(sheetId);
    const records = await getDatabase().segments.where("sheetId").equals(normalizedSheetId).toArray();
    const parsedSegments = new Map<string, PracticeSegment>();

    for (const record of records) {
      const parsedRecord = parsePersistedPracticeSegmentRecordIdentifiers(record);

      if (!parsedRecord?.key) {
        continue;
      }

      if (
        !isPracticeSegmentRecordKeyMatch(
          parsedRecord.key,
          parsedRecord.normalizedSheetId,
          parsedRecord.normalizedSegmentId
        )
      ) {
        continue;
      }

      const existingSegment = parsedSegments.get(parsedRecord.parsedSegment.id);
      const isCurrentKey =
        parsedRecord.key ===
        createPracticeSegmentRecordKey(parsedRecord.normalizedSheetId, parsedRecord.normalizedSegmentId);

      if (!existingSegment || isCurrentKey) {
        parsedSegments.set(parsedRecord.parsedSegment.id, parsedRecord.parsedSegment);
      }
    }

    return Array.from(parsedSegments.values());
  },

  async getSegment(sheetId, segmentId) {
    const normalizedSheetId = normalizePracticeSegmentSheetId(sheetId);
    const normalizedSegmentId = normalizePracticeSegmentId(segmentId);
    const currentKey = createPracticeSegmentRecordKey(normalizedSheetId, normalizedSegmentId);
    const record = await getDatabase().segments.get(currentKey);

    if (record) {
      return parsePersistedPracticeSegmentRecord(record);
    }

    const legacyKey = createLegacyPracticeSegmentRecordKey(normalizedSheetId, normalizedSegmentId);

    if (legacyKey === currentKey) {
      return null;
    }

    return parsePersistedPracticeSegmentRecord(await getDatabase().segments.get(legacyKey));
  },

  async saveSegment(segment) {
    const validatedSegment = validatePracticeSegment(segment);
    const normalizedSheetId = normalizePracticeSegmentSheetId(validatedSegment.sheetId);
    const normalizedSegmentId = normalizePracticeSegmentId(validatedSegment.id);

    await getDatabase().segments.put({
      key: createPracticeSegmentRecordKey(normalizedSheetId, normalizedSegmentId),
      sheetId: normalizedSheetId,
      segmentId: normalizedSegmentId,
      segment: validatedSegment,
      updatedAt: new Date().toISOString()
    });

    const legacyKey = createLegacyPracticeSegmentRecordKey(normalizedSheetId, normalizedSegmentId);

    if (legacyKey !== createPracticeSegmentRecordKey(normalizedSheetId, normalizedSegmentId)) {
      const legacyRecord = await getDatabase().segments.get(legacyKey);

      if (hasMatchingPracticeSegmentRecordIdentifiers(legacyRecord, normalizedSheetId, normalizedSegmentId)) {
        await getDatabase().segments.delete(legacyKey);
      }
    }
  },

  async deleteSegment(sheetId, segmentId) {
    const normalizedSheetId = normalizePracticeSegmentSheetId(sheetId);
    const normalizedSegmentId = normalizePracticeSegmentId(segmentId);
    const currentKey = createPracticeSegmentRecordKey(normalizedSheetId, normalizedSegmentId);

    await getDatabase().segments.delete(currentKey);

    const legacyKey = createLegacyPracticeSegmentRecordKey(normalizedSheetId, normalizedSegmentId);

    if (legacyKey !== currentKey) {
      const legacyRecord = await getDatabase().segments.get(legacyKey);

      if (hasMatchingPracticeSegmentRecordIdentifiers(legacyRecord, normalizedSheetId, normalizedSegmentId)) {
        await getDatabase().segments.delete(legacyKey);
      }
    }
  }
};

export const browserPracticeSegmentService = createPracticeSegmentService(browserPracticeSegmentRepository);

export async function seedPracticeSegmentRecordForTests(sheetId: string, segmentId: string, value: unknown) {
  const normalizedSheetId = normalizePracticeSegmentSheetId(sheetId);
  const normalizedSegmentId = normalizePracticeSegmentId(segmentId);

  await getDatabase().segments.put({
    key: createPracticeSegmentRecordKey(normalizedSheetId, normalizedSegmentId),
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
