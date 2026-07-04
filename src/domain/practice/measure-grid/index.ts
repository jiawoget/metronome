import { z } from "zod";

import { SUPPORTED_TIME_SIGNATURES } from "@/domain/music/meter-policy";
import { getMeterMeasureDurationMs, getMeterTimeSignatureParts } from "@/domain/practice/meter-timing";
import type { PracticeTimeSignature } from "@/domain/practice/types";

export type MeasureGrid = {
  bpm: number;
  timeSignature: PracticeTimeSignature;
  pickupBeats: number;
  measureOneOffsetMs: number;
};

export type MeasureRange = {
  startMeasure: number;
  endMeasure: number;
};

export type MeasureRangeMs = {
  startMs: number;
  endMs: number;
};

const practiceTimeSignatureSchema = z.enum(SUPPORTED_TIME_SIGNATURES);

const measureNumberSchema = z.number().finite().int().min(1);

export const measureRangeSchema = z
  .object({
    startMeasure: measureNumberSchema,
    endMeasure: measureNumberSchema
  })
  .superRefine((range, context) => {
    if (range.startMeasure > range.endMeasure) {
      context.addIssue({
        code: "custom",
        path: ["endMeasure"],
        message: "endMeasure must be greater than or equal to startMeasure."
      });
    }
  });

const measureGridBaseSchema = z.object({
  bpm: z.number().finite().int().min(30).max(300),
  timeSignature: practiceTimeSignatureSchema,
  pickupBeats: z.number().finite().int().nonnegative(),
  measureOneOffsetMs: z.number().finite().int().nonnegative()
});

export const measureGridSchema = measureGridBaseSchema.superRefine((grid, context) => {
  const { numerator } = getTimeSignatureParts(grid.timeSignature);

  if (grid.pickupBeats >= numerator) {
    context.addIssue({
      code: "custom",
      path: ["pickupBeats"],
      message: "pickupBeats must be smaller than the time signature numerator."
    });
  }
});

export function getTimeSignatureParts(timeSignature: PracticeTimeSignature) {
  return getMeterTimeSignatureParts(timeSignature);
}

export function parseMeasureGrid(value: unknown): MeasureGrid | null {
  const result = measureGridSchema.safeParse(value);

  return result.success ? result.data : null;
}

export function validateMeasureGrid(value: MeasureGrid): MeasureGrid {
  return measureGridSchema.parse(value);
}

export function parseMeasureNumber(value: unknown): number | null {
  const result = measureNumberSchema.safeParse(value);

  return result.success ? result.data : null;
}

export function validateMeasureNumber(value: number): number {
  return measureNumberSchema.parse(value);
}

export function parseMeasureRange(value: unknown): MeasureRange | null {
  const result = measureRangeSchema.safeParse(value);

  return result.success ? result.data : null;
}

export function validateMeasureRange(value: MeasureRange): MeasureRange {
  return measureRangeSchema.parse(value);
}

function getMeasureDurationMsFromValidatedGrid(validatedGrid: MeasureGrid) {
  return getMeterMeasureDurationMs(validatedGrid);
}

export function getMeasureDurationMs(grid: MeasureGrid) {
  const validatedGrid = validateMeasureGrid(grid);

  return getMeasureDurationMsFromValidatedGrid(validatedGrid);
}

function getMeasureStartMsFromValidatedGrid(validatedGrid: MeasureGrid, measureNumber: number) {
  const validatedMeasureNumber = validateMeasureNumber(measureNumber);
  const measureIndex = validatedMeasureNumber - 1;

  return validatedGrid.measureOneOffsetMs + getMeasureDurationMsFromValidatedGrid(validatedGrid) * measureIndex;
}

export function getMeasureStartMs(grid: MeasureGrid, measureNumber: number) {
  return getMeasureStartMsFromValidatedGrid(validateMeasureGrid(grid), measureNumber);
}

export function getMeasureEndMs(grid: MeasureGrid, measureNumber: number) {
  const validatedGrid = validateMeasureGrid(grid);

  return (
    getMeasureStartMsFromValidatedGrid(validatedGrid, measureNumber) +
    getMeasureDurationMsFromValidatedGrid(validatedGrid)
  );
}

export function getMeasureRangeMs(grid: MeasureGrid, range: MeasureRange): MeasureRangeMs {
  const validatedGrid = validateMeasureGrid(grid);
  const validatedRange = validateMeasureRange(range);

  return {
    startMs: getMeasureStartMsFromValidatedGrid(validatedGrid, validatedRange.startMeasure),
    endMs:
      getMeasureStartMsFromValidatedGrid(validatedGrid, validatedRange.endMeasure) +
      getMeasureDurationMsFromValidatedGrid(validatedGrid)
  };
}
