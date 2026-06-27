import { describe, expect, it } from "vitest";

import {
  createPracticeSegmentGridAssociation,
  createSheetRecordingSegmentContext,
  getMeasureGridVersion,
  getPracticeSegmentGridStatus,
  getPracticeSegmentRangeMs,
  isPracticeSegmentGridStale,
  parsePracticeSegment,
  parsePracticeSegmentGridAssociation,
  parsePracticeSegmentName,
  parsePracticeSegmentNotes,
  parsePracticeSegmentTargetBpm,
  validatePracticeSegment,
  validatePracticeSegmentGridAssociation,
  validatePracticeSegmentName,
  validatePracticeSegmentNotes,
  validatePracticeSegmentTargetBpm,
  type MeasureGrid,
  type PracticeSegment
} from "@/domain/practice";

describe("practice segment domain", () => {
  const baseGrid: MeasureGrid = {
    bpm: 96,
    timeSignature: "4/4",
    pickupBeats: 0,
    measureOneOffsetMs: 500
  };

  const buildSegment = (overrides: Partial<PracticeSegment> = {}): PracticeSegment => ({
    id: "segment-1",
    sheetId: "sheet-alpha",
    name: "Bridge",
    range: {
      startMeasure: 5,
      endMeasure: 12
    },
    targetBpm: 96,
    notes: "Focus on clean shifts",
    grid: createPracticeSegmentGridAssociation(baseGrid),
    ...overrides
  });

  it("parses and validates a segment with normalized strings and grid association", () => {
    const parsed = parsePracticeSegment({
      id: "  segment-1  ",
      sheetId: "  sheet-alpha  ",
      name: "  Bridge  ",
      range: {
        startMeasure: 5,
        endMeasure: 12
      },
      targetBpm: 96,
      notes: "  Focus on clean shifts  ",
      grid: createPracticeSegmentGridAssociation(baseGrid)
    });

    expect(parsed).toEqual({
      id: "segment-1",
      sheetId: "sheet-alpha",
      name: "Bridge",
      range: {
        startMeasure: 5,
        endMeasure: 12
      },
      targetBpm: 96,
      notes: "Focus on clean shifts",
      grid: createPracticeSegmentGridAssociation(baseGrid)
    });

    expect(validatePracticeSegment(buildSegment())).toEqual(buildSegment());
  });

  it("accepts one-measure ranges and delegates range timing to measure-grid math", () => {
    const segment = buildSegment({
      range: {
        startMeasure: 8,
        endMeasure: 8
      }
    });

    expect(validatePracticeSegment(segment)).toEqual(segment);
    expect(getPracticeSegmentRangeMs(segment, baseGrid)).toEqual({
      startMs: 18_000,
      endMs: 20_500
    });
  });

  it("creates immutable sheet recording segment context from the segment grid snapshot", () => {
    const oldGrid: MeasureGrid = {
      bpm: 96,
      timeSignature: "4/4",
      pickupBeats: 0,
      measureOneOffsetMs: 500
    };
    const liveGrid: MeasureGrid = {
      bpm: 120,
      timeSignature: "4/4",
      pickupBeats: 0,
      measureOneOffsetMs: 2_000
    };
    const segment = buildSegment({
      id: "segment-bridge",
      name: "Bridge before rename",
      range: {
        startMeasure: 2,
        endMeasure: 3
      },
      targetBpm: null,
      grid: createPracticeSegmentGridAssociation(oldGrid)
    });

    expect(createSheetRecordingSegmentContext(segment)).toEqual({
      segmentId: "segment-bridge",
      segmentName: "Bridge before rename",
      range: {
        startMeasure: 2,
        endMeasure: 3
      },
      targetBpm: null,
      measureGridVersion: "bpm:96|timeSignature:4/4|pickupBeats:0|measureOneOffsetMs:500",
      measureGridSnapshot: oldGrid,
      measureRangeMs: {
        startMs: 3_000,
        endMs: 8_000
      }
    });
    expect(getPracticeSegmentRangeMs(segment, liveGrid)).not.toEqual(
      createSheetRecordingSegmentContext(segment).measureRangeMs
    );
  });

  it("normalizes optional notes and target BPM helpers", () => {
    expect(parsePracticeSegmentNotes(undefined)).toBeNull();
    expect(parsePracticeSegmentNotes(null)).toBeNull();
    expect(parsePracticeSegmentNotes("   ")).toBeNull();
    expect(parsePracticeSegmentNotes("  line 1\nline 2  ")).toBe("line 1\nline 2");
    expect(validatePracticeSegmentNotes(null)).toBeNull();

    expect(parsePracticeSegmentTargetBpm(undefined)).toBeNull();
    expect(parsePracticeSegmentTargetBpm(null)).toBeNull();
    expect(parsePracticeSegmentTargetBpm(30)).toBe(30);
    expect(parsePracticeSegmentTargetBpm(300)).toBe(300);
    expect(validatePracticeSegmentTargetBpm(null)).toBeNull();
  });

  it("accepts omitted target BPM and omitted notes on segment parsing", () => {
    const withoutTargetBpm = parsePracticeSegment({
      id: "segment-1",
      sheetId: "sheet-alpha",
      name: "Bridge",
      range: {
        startMeasure: 5,
        endMeasure: 12
      },
      notes: "Keep it relaxed",
      grid: createPracticeSegmentGridAssociation(baseGrid)
    });

    const withoutNotes = parsePracticeSegment({
      id: "segment-1",
      sheetId: "sheet-alpha",
      name: "Bridge",
      range: {
        startMeasure: 5,
        endMeasure: 12
      },
      targetBpm: 96,
      grid: createPracticeSegmentGridAssociation(baseGrid)
    });

    const withoutBoth = parsePracticeSegment({
      id: "segment-1",
      sheetId: "sheet-alpha",
      name: "Bridge",
      range: {
        startMeasure: 5,
        endMeasure: 12
      },
      grid: createPracticeSegmentGridAssociation(baseGrid)
    });

    expect(withoutTargetBpm?.targetBpm).toBeNull();
    expect(withoutTargetBpm?.notes).toBe("Keep it relaxed");
    expect(withoutNotes?.targetBpm).toBe(96);
    expect(withoutNotes?.notes).toBeNull();
    expect(withoutBoth?.targetBpm).toBeNull();
    expect(withoutBoth?.notes).toBeNull();
  });

  it("normalizes omitted target BPM and notes to null during validation", () => {
    const segmentWithoutOptionalFields = {
      id: "segment-1",
      sheetId: "sheet-alpha",
      name: "Bridge",
      range: {
        startMeasure: 5,
        endMeasure: 12
      },
      grid: createPracticeSegmentGridAssociation(baseGrid)
    } as PracticeSegment;

    expect(validatePracticeSegment(segmentWithoutOptionalFields)).toEqual({
      ...segmentWithoutOptionalFields,
      targetBpm: null,
      notes: null
    });
  });

  it("accepts exact name and notes boundaries", () => {
    expect(parsePracticeSegmentName("x".repeat(80))).toBe("x".repeat(80));
    expect(validatePracticeSegmentName("x".repeat(80))).toBe("x".repeat(80));
    expect(parsePracticeSegmentNotes("n".repeat(1000))).toBe("n".repeat(1000));
  });

  it("rejects invalid ids, sheet ids, names, ranges, target BPM, notes, and malformed associations", () => {
    expect(parsePracticeSegment(buildSegment({ id: "   " }))).toBeNull();
    expect(parsePracticeSegment(buildSegment({ sheetId: "   " }))).toBeNull();
    expect(parsePracticeSegmentName("   ")).toBeNull();
    expect(parsePracticeSegmentName("x".repeat(81))).toBeNull();
    expect(parsePracticeSegment(buildSegment({ range: { startMeasure: 0, endMeasure: 1 } }))).toBeNull();
    expect(parsePracticeSegment(buildSegment({ range: { startMeasure: -1, endMeasure: 1 } }))).toBeNull();
    expect(parsePracticeSegment(buildSegment({ range: { startMeasure: 1.5, endMeasure: 2 } }))).toBeNull();
    expect(parsePracticeSegment({ ...buildSegment(), range: { startMeasure: "5", endMeasure: 12 } })).toBeNull();
    expect(parsePracticeSegment(buildSegment({ range: { startMeasure: 7, endMeasure: 6 } }))).toBeNull();
    expect(parsePracticeSegment(buildSegment({ targetBpm: 29 }))).toBeNull();
    expect(parsePracticeSegment(buildSegment({ targetBpm: 301 }))).toBeNull();
    expect(parsePracticeSegment(buildSegment({ targetBpm: 96.5 }))).toBeNull();
    expect(parsePracticeSegment({ ...buildSegment(), targetBpm: "96" })).toBeNull();
    expect(parsePracticeSegment({ ...buildSegment(), targetBpm: Number.NaN })).toBeNull();
    expect(parsePracticeSegment({ ...buildSegment(), targetBpm: Number.POSITIVE_INFINITY })).toBeNull();
    expect(parsePracticeSegmentNotes("n".repeat(1001))).toBeNull();
    expect(parsePracticeSegment({ ...buildSegment(), notes: 42 })).toBeNull();
    expect(parsePracticeSegment({ ...buildSegment(), grid: null })).toBeNull();
    expect(parsePracticeSegmentGridAssociation({ measureGridVersion: " ", measureGridSnapshot: baseGrid })).toBeNull();
    expect(
      parsePracticeSegmentGridAssociation({
        measureGridVersion: "bpm:96|timeSignature:4/4|pickupBeats:0|measureOneOffsetMs:500",
        measureGridSnapshot: { ...baseGrid, bpm: 29 }
      })
    ).toBeNull();

    expect(() => validatePracticeSegment(buildSegment({ id: "   " }))).toThrow();
    expect(() => validatePracticeSegmentGridAssociation({ measureGridVersion: "", measureGridSnapshot: baseGrid })).toThrow();
    expect(() => validatePracticeSegmentName("   ")).toThrow();
    expect(() => validatePracticeSegmentTargetBpm(29)).toThrow();
    expect(() => validatePracticeSegmentNotes("n".repeat(1001))).toThrow();
  });

  it("creates deterministic grid versions and marks matching grids as current", () => {
    const equivalentGrid: MeasureGrid = {
      bpm: 96,
      timeSignature: "4/4",
      pickupBeats: 0,
      measureOneOffsetMs: 500
    };

    const association = createPracticeSegmentGridAssociation(baseGrid);

    expect(association).toEqual({
      measureGridVersion: "bpm:96|timeSignature:4/4|pickupBeats:0|measureOneOffsetMs:500",
      measureGridSnapshot: baseGrid
    });
    expect(getMeasureGridVersion(baseGrid)).toBe(getMeasureGridVersion(equivalentGrid));
    expect(getPracticeSegmentGridStatus(buildSegment(), equivalentGrid)).toBe("current");
    expect(isPracticeSegmentGridStale(buildSegment(), equivalentGrid)).toBe(false);
  });

  it("marks grid changes and missing grids with the expected stale statuses", () => {
    const segment = buildSegment();

    expect(getMeasureGridVersion({ ...baseGrid, bpm: 120 })).not.toBe(getMeasureGridVersion(baseGrid));
    expect(getMeasureGridVersion({ ...baseGrid, timeSignature: "3/4" })).not.toBe(getMeasureGridVersion(baseGrid));
    expect(getMeasureGridVersion({ ...baseGrid, pickupBeats: 1 })).not.toBe(getMeasureGridVersion(baseGrid));
    expect(getMeasureGridVersion({ ...baseGrid, measureOneOffsetMs: 750 })).not.toBe(getMeasureGridVersion(baseGrid));

    expect(getPracticeSegmentGridStatus(segment, { ...baseGrid, bpm: 120 })).toBe("stale");
    expect(getPracticeSegmentGridStatus(segment, { ...baseGrid, timeSignature: "3/4" })).toBe("stale");
    expect(getPracticeSegmentGridStatus(segment, { ...baseGrid, pickupBeats: 1 })).toBe("stale");
    expect(getPracticeSegmentGridStatus(segment, { ...baseGrid, measureOneOffsetMs: 750 })).toBe("stale");
    expect(getPracticeSegmentGridStatus(segment, null)).toBe("missing-grid");
    expect(isPracticeSegmentGridStale(segment, null)).toBe(true);
    expect(isPracticeSegmentGridStale(segment, { ...baseGrid, bpm: 120 })).toBe(true);
  });

  it("reports invalid associations for malformed segment-like inputs", () => {
    expect(getPracticeSegmentGridStatus(null, baseGrid)).toBe("invalid-association");
    expect(getPracticeSegmentGridStatus({ ...buildSegment(), grid: { measureGridVersion: "", measureGridSnapshot: baseGrid } }, baseGrid)).toBe(
      "invalid-association"
    );
    expect(getPracticeSegmentGridStatus(buildSegment(), { ...baseGrid, bpm: 29 } as MeasureGrid)).toBe("invalid-association");
  });
});
