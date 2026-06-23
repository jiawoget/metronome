import {
  createPracticeSegmentGridAssociation,
  type MeasureGrid,
  type PracticeSegment
} from "@/domain/practice";

export const TEST_ISO_DATE = "2026-06-23T10:00:00.000Z";

export function buildMeasureGrid(overrides: Partial<MeasureGrid> = {}): MeasureGrid {
  return {
    bpm: 96,
    timeSignature: "4/4",
    pickupBeats: 0,
    measureOneOffsetMs: 500,
    ...overrides
  };
}

export function buildPracticeSegment(overrides: Partial<PracticeSegment> = {}): PracticeSegment {
  const baseGrid = buildMeasureGrid();

  return {
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
  };
}
