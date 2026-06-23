import { describe, expect, it } from "vitest";

import {
  getMeasureDurationMs,
  getMeasureEndMs,
  getMeasureRangeMs,
  getMeasureStartMs,
  parseMeasureGrid,
  parseMeasureNumber,
  parseMeasureRange,
  validateMeasureGrid,
  validateMeasureNumber,
  validateMeasureRange,
  type MeasureGrid
} from "@/domain/practice";

describe("measure grid domain", () => {
  const fourFourGrid: MeasureGrid = {
    bpm: 120,
    timeSignature: "4/4",
    pickupBeats: 0,
    measureOneOffsetMs: 0
  };

  it("converts measures 1-4 to 0-8000 ms at 120 BPM in 4/4 with zero offset", () => {
    expect(getMeasureStartMs(fourFourGrid, 1)).toBe(0);
    expect(getMeasureEndMs(fourFourGrid, 4)).toBe(8_000);
    expect(getMeasureRangeMs(fourFourGrid, { startMeasure: 1, endMeasure: 4 })).toEqual({
      startMs: 0,
      endMs: 8_000
    });
  });

  it("converts measures 1-4 to 1000-9000 ms at 120 BPM in 4/4 with a 1000 ms offset", () => {
    const offsetGrid: MeasureGrid = {
      ...fourFourGrid,
      measureOneOffsetMs: 1_000
    };

    expect(getMeasureRangeMs(offsetGrid, { startMeasure: 1, endMeasure: 4 })).toEqual({
      startMs: 1_000,
      endMs: 9_000
    });
  });

  it("uses three quarter-note beats per measure at 90 BPM in 3/4", () => {
    const grid: MeasureGrid = {
      bpm: 90,
      timeSignature: "3/4",
      pickupBeats: 0,
      measureOneOffsetMs: 250
    };

    expect(getMeasureDurationMs(grid)).toBe(2_000);
    expect(getMeasureStartMs(grid, 3)).toBe(4_250);
    expect(getMeasureEndMs(grid, 3)).toBe(6_250);
  });

  it("uses the literal denominator policy for 6/8 instead of dotted-quarter math", () => {
    const grid: MeasureGrid = {
      bpm: 120,
      timeSignature: "6/8",
      pickupBeats: 0,
      measureOneOffsetMs: 0
    };

    expect(getMeasureDurationMs(grid)).toBe(1_500);
    expect(getMeasureRangeMs(grid, { startMeasure: 2, endMeasure: 3 })).toEqual({
      startMs: 1_500,
      endMs: 4_500
    });
  });

  it("stores pickup beats without shifting numbered measure 1 away from measureOneOffsetMs", () => {
    const grid: MeasureGrid = {
      bpm: 120,
      timeSignature: "4/4",
      pickupBeats: 2,
      measureOneOffsetMs: 750
    };

    expect(validateMeasureGrid(grid)).toEqual(grid);
    expect(getMeasureStartMs(grid, 1)).toBe(750);
  });

  it("rejects invalid measure numbers and inclusive measure ranges", () => {
    expect(parseMeasureNumber(1)).toBe(1);
    expect(parseMeasureNumber(0)).toBeNull();
    expect(parseMeasureNumber(-1)).toBeNull();
    expect(parseMeasureNumber(1.5)).toBeNull();
    expect(parseMeasureNumber("2")).toBeNull();

    expect(parseMeasureRange({ startMeasure: 2, endMeasure: 5 })).toEqual({
      startMeasure: 2,
      endMeasure: 5
    });
    expect(parseMeasureRange({ startMeasure: 5, endMeasure: 2 })).toBeNull();
    expect(() => validateMeasureNumber(0)).toThrow();
    expect(() => validateMeasureRange({ startMeasure: 3, endMeasure: 2 })).toThrow();
  });

  it("rejects invalid BPM, time signature, pickup beats, and measure-one offsets", () => {
    expect(parseMeasureGrid(fourFourGrid)).toEqual(fourFourGrid);
    expect(parseMeasureGrid({ ...fourFourGrid, bpm: 29 })).toBeNull();
    expect(parseMeasureGrid({ ...fourFourGrid, bpm: 301 })).toBeNull();
    expect(parseMeasureGrid({ ...fourFourGrid, timeSignature: "5/4" } as Record<string, unknown>)).toBeNull();
    expect(parseMeasureGrid({ ...fourFourGrid, pickupBeats: -1 })).toBeNull();
    expect(parseMeasureGrid({ ...fourFourGrid, pickupBeats: 4 })).toBeNull();
    expect(parseMeasureGrid({ bpm: 120, timeSignature: "4/4", pickupBeats: 0 })).toBeNull();
    expect(parseMeasureGrid({ ...fourFourGrid, measureOneOffsetMs: -1 })).toBeNull();
    expect(parseMeasureGrid({ ...fourFourGrid, measureOneOffsetMs: 12.5 })).toBeNull();
    expect(parseMeasureGrid({ ...fourFourGrid, measureOneOffsetMs: Number.NaN })).toBeNull();
    expect(() =>
      validateMeasureGrid({ ...fourFourGrid, timeSignature: "5/4" } as unknown as MeasureGrid)
    ).toThrow();
  });
});
