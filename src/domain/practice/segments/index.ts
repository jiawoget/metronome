import { z } from "zod";

import {
  getMeasureRangeMs,
  measureGridSchema,
  measureRangeSchema,
  parseMeasureGrid,
  validateMeasureGrid,
  type MeasureGrid,
  type MeasureRange,
  type MeasureRangeMs
} from "@/domain/practice/measure-grid";
import { validateSheetRecordingSegmentContext } from "@/domain/practice/validation";
import type { SheetRecordingSegmentContext } from "@/domain/practice/types";

export type PracticeSegmentGridAssociation = {
  measureGridVersion: string;
  measureGridSnapshot: MeasureGrid;
};

export type PracticeSegment = {
  id: string;
  sheetId: string;
  name: string;
  range: MeasureRange;
  targetBpm: number | null;
  notes: string | null;
  grid: PracticeSegmentGridAssociation;
};

export type PracticeSegmentGridStatus = "current" | "stale" | "missing-grid" | "invalid-association";

const trimmedRequiredStringSchema = z.string().trim().min(1);

const practiceSegmentNameSchema = z.string().trim().min(1).max(80);

const practiceSegmentTargetBpmSchema = z
  .preprocess((value) => (value === undefined ? null : value), z.number().finite().int().min(30).max(300).nullable());

const practiceSegmentTargetBpmFieldSchema = practiceSegmentTargetBpmSchema.optional().transform((value) => value ?? null);

const practiceSegmentNotesSchema = z.preprocess((value) => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return value;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length === 0 ? null : trimmedValue;
}, z.string().max(1000).nullable());

const practiceSegmentNotesFieldSchema = practiceSegmentNotesSchema.optional().transform((value) => value ?? null);

const practiceSegmentGridAssociationSchema = z.object({
  measureGridVersion: trimmedRequiredStringSchema,
  measureGridSnapshot: measureGridSchema
});

const practiceSegmentSchema = z.object({
  id: trimmedRequiredStringSchema,
  sheetId: trimmedRequiredStringSchema,
  name: practiceSegmentNameSchema,
  range: measureRangeSchema,
  targetBpm: practiceSegmentTargetBpmFieldSchema,
  notes: practiceSegmentNotesFieldSchema,
  grid: practiceSegmentGridAssociationSchema
});

export function parsePracticeSegmentName(value: unknown): string | null {
  const result = practiceSegmentNameSchema.safeParse(value);

  return result.success ? result.data : null;
}

export function validatePracticeSegmentName(value: string): string {
  return practiceSegmentNameSchema.parse(value);
}

export function parsePracticeSegmentNotes(value: unknown): string | null {
  const result = practiceSegmentNotesSchema.safeParse(value);

  return result.success ? result.data : null;
}

export function validatePracticeSegmentNotes(value: string | null): string | null {
  return practiceSegmentNotesSchema.parse(value);
}

export function parsePracticeSegmentTargetBpm(value: unknown): number | null {
  const result = practiceSegmentTargetBpmSchema.safeParse(value);

  return result.success ? result.data : null;
}

export function validatePracticeSegmentTargetBpm(value: number | null): number | null {
  return practiceSegmentTargetBpmSchema.parse(value);
}

export function parsePracticeSegmentGridAssociation(value: unknown): PracticeSegmentGridAssociation | null {
  const result = practiceSegmentGridAssociationSchema.safeParse(value);

  return result.success ? result.data : null;
}

export function validatePracticeSegmentGridAssociation(
  value: PracticeSegmentGridAssociation
): PracticeSegmentGridAssociation {
  return practiceSegmentGridAssociationSchema.parse(value);
}

export function parsePracticeSegment(value: unknown): PracticeSegment | null {
  const result = practiceSegmentSchema.safeParse(value);

  return result.success ? result.data : null;
}

export function validatePracticeSegment(value: PracticeSegment): PracticeSegment {
  return practiceSegmentSchema.parse(value);
}

export function getMeasureGridVersion(grid: MeasureGrid): string {
  const validatedGrid = validateMeasureGrid(grid);

  return [
    `bpm:${validatedGrid.bpm}`,
    `timeSignature:${validatedGrid.timeSignature}`,
    `pickupBeats:${validatedGrid.pickupBeats}`,
    `measureOneOffsetMs:${validatedGrid.measureOneOffsetMs}`
  ].join("|");
}

export function createPracticeSegmentGridAssociation(grid: MeasureGrid): PracticeSegmentGridAssociation {
  const validatedGrid = validateMeasureGrid(grid);

  return {
    measureGridVersion: getMeasureGridVersion(validatedGrid),
    measureGridSnapshot: validatedGrid
  };
}

export function getPracticeSegmentGridStatus(
  segment: unknown,
  currentGrid: MeasureGrid | null
): PracticeSegmentGridStatus {
  const parsedSegment = parsePracticeSegment(segment);

  if (!parsedSegment) {
    return "invalid-association";
  }

  if (currentGrid === null) {
    return "missing-grid";
  }

  if (parseMeasureGrid(currentGrid) === null) {
    return "invalid-association";
  }

  return parsedSegment.grid.measureGridVersion === getMeasureGridVersion(currentGrid) ? "current" : "stale";
}

export function isPracticeSegmentGridStale(segment: unknown, currentGrid: MeasureGrid | null): boolean {
  const status = getPracticeSegmentGridStatus(segment, currentGrid);

  return status === "stale" || status === "missing-grid";
}

export function getPracticeSegmentRangeMs(segment: PracticeSegment, grid: MeasureGrid): MeasureRangeMs {
  const validatedSegment = validatePracticeSegment(segment);

  return getMeasureRangeMs(grid, validatedSegment.range);
}

export function createSheetRecordingSegmentContext(
  segment: PracticeSegment
): SheetRecordingSegmentContext {
  const validatedSegment = validatePracticeSegment(segment);
  const segmentContext: SheetRecordingSegmentContext = {
    segmentId: validatedSegment.id,
    segmentName: validatedSegment.name,
    range: validatedSegment.range,
    targetBpm: validatedSegment.targetBpm,
    measureGridVersion: validatedSegment.grid.measureGridVersion,
    measureGridSnapshot: validatedSegment.grid.measureGridSnapshot,
    measureRangeMs: getMeasureRangeMs(
      validatedSegment.grid.measureGridSnapshot,
      validatedSegment.range
    )
  };

  return validateSheetRecordingSegmentContext(segmentContext);
}
