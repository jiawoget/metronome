import { z } from "zod";

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

const practiceTimeSignatureSchema = z.enum(["2/4", "3/4", "4/4", "6/8"]);

const measureNumberSchema = z.number().finite().int().min(1);

const measureRangeSchema = z
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
  const [numerator, denominator] = timeSignature.split("/").map((value) => Number.parseInt(value, 10));

  return { numerator, denominator };
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

export function getMeasureDurationMs(grid: MeasureGrid) {
  const validatedGrid = validateMeasureGrid(grid);
  const { numerator, denominator } = getTimeSignatureParts(validatedGrid.timeSignature);
  const beatDurationMs = (60_000 / validatedGrid.bpm) * (4 / denominator);

  return Math.round(numerator * beatDurationMs);
}

export function getMeasureStartMs(grid: MeasureGrid, measureNumber: number) {
  const validatedGrid = validateMeasureGrid(grid);
  const validatedMeasureNumber = validateMeasureNumber(measureNumber);
  const measureIndex = validatedMeasureNumber - 1;

  return validatedGrid.measureOneOffsetMs + getMeasureDurationMs(validatedGrid) * measureIndex;
}

export function getMeasureEndMs(grid: MeasureGrid, measureNumber: number) {
  return getMeasureStartMs(grid, measureNumber) + getMeasureDurationMs(grid);
}

export function getMeasureRangeMs(grid: MeasureGrid, range: MeasureRange): MeasureRangeMs {
  const validatedRange = validateMeasureRange(range);

  return {
    startMs: getMeasureStartMs(grid, validatedRange.startMeasure),
    endMs: getMeasureEndMs(grid, validatedRange.endMeasure)
  };
}
