import { describe, expect, it } from "vitest";

import { getBarCountInPlan } from "@/domain/practice/bar-count-in";
import {
  createPracticeSegmentGridAssociation,
  getMeasureStartMs,
  getMeterBeatDurationMs,
  type MeasureGrid,
  type PracticeSegment
} from "@/domain/practice";

describe("bar count-in domain", () => {
  const fourFourGrid: MeasureGrid = {
    bpm: 120,
    timeSignature: "4/4",
    pickupBeats: 0,
    measureOneOffsetMs: 0
  };

  const buildSegment = (
    grid: MeasureGrid,
    overrides: Partial<PracticeSegment> = {}
  ): PracticeSegment => ({
    id: "segment-bridge",
    sheetId: "sheet-alpha",
    name: "Bridge",
    range: {
      startMeasure: 5,
      endMeasure: 8
    },
    targetBpm: null,
    notes: null,
    grid: createPracticeSegmentGridAssociation(grid),
    ...overrides
  });

  it("creates a one-bar whole-sheet 4/4 count-in before measure 1", () => {
    const plan = getBarCountInPlan({
      measureGrid: fourFourGrid,
      selectedSegment: null
    });

    expect(plan).toEqual({
      status: "ready",
      scope: "whole-sheet",
      startMeasure: 1,
      startMs: 0,
      beatCount: 4,
      totalDurationMs: 2_000,
      beatDurationMs: 500,
      beatsPerMeasure: 4,
      timeSignature: "4/4",
      pickupBeats: 0,
      segmentId: null,
      segmentName: null,
      segmentRange: null,
      beats: [
        {
          count: 1,
          sourceMeasureNumber: null,
          isPreRoll: true,
          beatNumber: 1,
          offsetMs: -2_000,
          durationMs: 500,
          startsAtMs: -2_000
        },
        {
          count: 2,
          sourceMeasureNumber: null,
          isPreRoll: true,
          beatNumber: 2,
          offsetMs: -1_500,
          durationMs: 500,
          startsAtMs: -1_500
        },
        {
          count: 3,
          sourceMeasureNumber: null,
          isPreRoll: true,
          beatNumber: 3,
          offsetMs: -1_000,
          durationMs: 500,
          startsAtMs: -1_000
        },
        {
          count: 4,
          sourceMeasureNumber: null,
          isPreRoll: true,
          beatNumber: 4,
          offsetMs: -500,
          durationMs: 500,
          startsAtMs: -500
        }
      ]
    });
  });

  it("uses the selected segment start measure and previous measure beat labels", () => {
    const segment = buildSegment(fourFourGrid, {
      range: {
        startMeasure: 5,
        endMeasure: 12
      }
    });

    const plan = getBarCountInPlan({
      measureGrid: fourFourGrid,
      selectedSegment: segment
    });

    expect(plan).toMatchObject({
      status: "ready",
      scope: "selected-segment",
      startMeasure: 5,
      startMs: getMeasureStartMs(fourFourGrid, 5),
      beatCount: 4,
      totalDurationMs: 2_000,
      beatDurationMs: 500,
      segmentId: "segment-bridge",
      segmentName: "Bridge",
      segmentRange: {
        startMeasure: 5,
        endMeasure: 12
      }
    });
    expect(plan.beats.map(({ sourceMeasureNumber, isPreRoll, beatNumber }) => ({
      sourceMeasureNumber,
      isPreRoll,
      beatNumber
    }))).toEqual([
      { sourceMeasureNumber: 4, isPreRoll: false, beatNumber: 1 },
      { sourceMeasureNumber: 4, isPreRoll: false, beatNumber: 2 },
      { sourceMeasureNumber: 4, isPreRoll: false, beatNumber: 3 },
      { sourceMeasureNumber: 4, isPreRoll: false, beatNumber: 4 }
    ]);
  });

  it("preserves fractional generated sums for 3/4 at 90 BPM", () => {
    const grid: MeasureGrid = {
      bpm: 90,
      timeSignature: "3/4",
      pickupBeats: 0,
      measureOneOffsetMs: 0
    };
    const beatDurationMs = getMeterBeatDurationMs(grid);

    const plan = getBarCountInPlan({
      measureGrid: grid,
      selectedSegment: null
    });

    expect(plan).toMatchObject({
      status: "ready",
      beatCount: 3,
      beatsPerMeasure: 3,
      beatDurationMs,
      totalDurationMs: beatDurationMs * 3
    });
    expect(plan.beats).toHaveLength(3);
    expect(plan.beats.map((beat) => beat.durationMs)).toEqual([
      beatDurationMs,
      beatDurationMs,
      beatDurationMs
    ]);
    expect(plan.beats.at(0)?.offsetMs).toBeCloseTo(-2_000);
    expect(plan.beats.at(-1)?.offsetMs).toBeCloseTo(-beatDurationMs);
  });

  it("uses numerator beat counts and eighth-note durations for 6/8 and 12/8", () => {
    const sixEightGrid: MeasureGrid = {
      bpm: 120,
      timeSignature: "6/8",
      pickupBeats: 0,
      measureOneOffsetMs: 0
    };
    const twelveEightGrid: MeasureGrid = {
      ...sixEightGrid,
      timeSignature: "12/8"
    };

    expect(getBarCountInPlan({
      measureGrid: sixEightGrid,
      selectedSegment: null
    })).toMatchObject({
      status: "ready",
      beatCount: 6,
      beatsPerMeasure: 6,
      beatDurationMs: 250,
      totalDurationMs: 1_500
    });
    expect(getBarCountInPlan({
      measureGrid: twelveEightGrid,
      selectedSegment: null
    })).toMatchObject({
      status: "ready",
      beatCount: 12,
      beatsPerMeasure: 12,
      beatDurationMs: 250,
      totalDurationMs: 3_000
    });
  });

  it("labels two count-in measures before a selected segment", () => {
    const segment = buildSegment(fourFourGrid);

    const plan = getBarCountInPlan({
      measureGrid: fourFourGrid,
      selectedSegment: segment,
      countInMeasures: 2
    });

    expect(plan).toMatchObject({
      status: "ready",
      beatCount: 8,
      totalDurationMs: 4_000,
      startMeasure: 5,
      startMs: getMeasureStartMs(fourFourGrid, 5)
    });
    expect(plan.beats.map(({ sourceMeasureNumber, isPreRoll, beatNumber }) => ({
      sourceMeasureNumber,
      isPreRoll,
      beatNumber
    }))).toEqual([
      { sourceMeasureNumber: 3, isPreRoll: false, beatNumber: 1 },
      { sourceMeasureNumber: 3, isPreRoll: false, beatNumber: 2 },
      { sourceMeasureNumber: 3, isPreRoll: false, beatNumber: 3 },
      { sourceMeasureNumber: 3, isPreRoll: false, beatNumber: 4 },
      { sourceMeasureNumber: 4, isPreRoll: false, beatNumber: 1 },
      { sourceMeasureNumber: 4, isPreRoll: false, beatNumber: 2 },
      { sourceMeasureNumber: 4, isPreRoll: false, beatNumber: 3 },
      { sourceMeasureNumber: 4, isPreRoll: false, beatNumber: 4 }
    ]);
  });

  it("labels two whole-sheet count-in measures as pre-roll before measure 1", () => {
    const plan = getBarCountInPlan({
      measureGrid: fourFourGrid,
      selectedSegment: null,
      countInMeasures: 2
    });

    expect(plan).toMatchObject({
      status: "ready",
      scope: "whole-sheet",
      startMeasure: 1,
      beatCount: 8,
      totalDurationMs: 4_000
    });
    expect(plan.beats.map(({ sourceMeasureNumber, isPreRoll, beatNumber }) => ({
      sourceMeasureNumber,
      isPreRoll,
      beatNumber
    }))).toEqual([
      { sourceMeasureNumber: null, isPreRoll: true, beatNumber: 1 },
      { sourceMeasureNumber: null, isPreRoll: true, beatNumber: 2 },
      { sourceMeasureNumber: null, isPreRoll: true, beatNumber: 3 },
      { sourceMeasureNumber: null, isPreRoll: true, beatNumber: 4 },
      { sourceMeasureNumber: null, isPreRoll: true, beatNumber: 1 },
      { sourceMeasureNumber: null, isPreRoll: true, beatNumber: 2 },
      { sourceMeasureNumber: null, isPreRoll: true, beatNumber: 3 },
      { sourceMeasureNumber: null, isPreRoll: true, beatNumber: 4 }
    ]);
  });

  it("reports pickup beats without shifting measure 1 timing", () => {
    const pickupGrid: MeasureGrid = {
      ...fourFourGrid,
      pickupBeats: 2,
      measureOneOffsetMs: 750
    };

    const plan = getBarCountInPlan({
      measureGrid: pickupGrid,
      selectedSegment: null
    });

    expect(plan).toMatchObject({
      status: "ready",
      startMeasure: 1,
      startMs: 750,
      pickupBeats: 2
    });
    expect(plan.beats.map((beat) => beat.startsAtMs)).toEqual([-1_250, -750, -250, 250]);
  });

  it("accounts for nonzero measure-one offsets in absolute starts", () => {
    const offsetGrid: MeasureGrid = {
      ...fourFourGrid,
      measureOneOffsetMs: 2_500
    };

    const plan = getBarCountInPlan({
      measureGrid: offsetGrid,
      selectedSegment: null
    });

    expect(plan).toMatchObject({
      status: "ready",
      startMs: 2_500
    });
    expect(plan.beats.map((beat) => beat.offsetMs)).toEqual([-2_000, -1_500, -1_000, -500]);
    expect(plan.beats.map((beat) => beat.startsAtMs)).toEqual([500, 1_000, 1_500, 2_000]);
  });

  it("uses the same count-in timing for one-measure and multi-measure segments with the same start", () => {
    const oneMeasureSegment = buildSegment(fourFourGrid, {
      range: {
        startMeasure: 5,
        endMeasure: 5
      }
    });
    const multiMeasureSegment = buildSegment(fourFourGrid, {
      id: "segment-multi",
      range: {
        startMeasure: 5,
        endMeasure: 12
      }
    });

    const oneMeasurePlan = getBarCountInPlan({
      measureGrid: fourFourGrid,
      selectedSegment: oneMeasureSegment
    });
    const multiMeasurePlan = getBarCountInPlan({
      measureGrid: fourFourGrid,
      selectedSegment: multiMeasureSegment
    });

    expect(oneMeasurePlan.status).toBe("ready");
    expect(multiMeasurePlan.status).toBe("ready");
    expect(oneMeasurePlan.startMs).toBe(multiMeasurePlan.startMs);
    expect(oneMeasurePlan.totalDurationMs).toBe(multiMeasurePlan.totalDurationMs);
    expect(oneMeasurePlan.beats.map((beat) => beat.offsetMs)).toEqual(
      multiMeasurePlan.beats.map((beat) => beat.offsetMs)
    );
  });

  it("returns the exact non-schedulable shape for stale selected segment associations", () => {
    const oldGrid: MeasureGrid = {
      ...fourFourGrid,
      bpm: 96,
      measureOneOffsetMs: 500
    };
    const segment = buildSegment(oldGrid);

    expect(getBarCountInPlan({
      measureGrid: fourFourGrid,
      selectedSegment: segment
    })).toEqual({
      status: "segment-grid-stale",
      scope: "selected-segment",
      startMeasure: 5,
      startMs: getMeasureStartMs(fourFourGrid, 5),
      beatCount: 0,
      totalDurationMs: 0,
      beatDurationMs: 0,
      beatsPerMeasure: 4,
      timeSignature: "4/4",
      pickupBeats: 0,
      segmentId: "segment-bridge",
      segmentName: "Bridge",
      segmentRange: {
        startMeasure: 5,
        endMeasure: 8
      },
      beats: []
    });
  });

  it("throws for invalid measure grids", () => {
    const invalidGrids: MeasureGrid[] = [
      { ...fourFourGrid, bpm: 29 },
      { ...fourFourGrid, timeSignature: "5/4" as MeasureGrid["timeSignature"] },
      { ...fourFourGrid, pickupBeats: 4 },
      { bpm: 120, timeSignature: "4/4", pickupBeats: 0 } as MeasureGrid
    ];

    for (const measureGrid of invalidGrids) {
      expect(() =>
        getBarCountInPlan({
          measureGrid,
          selectedSegment: null
        })
      ).toThrow();
    }
  });

  it("throws for invalid selected segments", () => {
    const invalidSegments: PracticeSegment[] = [
      buildSegment(fourFourGrid, {
        range: {
          startMeasure: 7,
          endMeasure: 6
        }
      }),
      buildSegment(fourFourGrid, {
        id: ""
      }),
      buildSegment(fourFourGrid, {
        name: ""
      }),
      buildSegment(fourFourGrid, {
        grid: {
          measureGridVersion: "",
          measureGridSnapshot: fourFourGrid
        }
      })
    ];

    for (const selectedSegment of invalidSegments) {
      expect(() =>
        getBarCountInPlan({
          measureGrid: fourFourGrid,
          selectedSegment
        })
      ).toThrow();
    }
  });

  it("throws for invalid count-in measure values", () => {
    for (const countInMeasures of [
      0,
      -1,
      1.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY
    ]) {
      expect(() =>
        getBarCountInPlan({
          measureGrid: fourFourGrid,
          selectedSegment: null,
          countInMeasures
        })
      ).toThrow();
    }
  });

  it("does not mutate the input grid or selected segment", () => {
    const measureGrid: MeasureGrid = {
      ...fourFourGrid,
      measureOneOffsetMs: 1_000
    };
    const selectedSegment = buildSegment(measureGrid);
    const gridSnapshot = structuredClone(measureGrid);
    const segmentSnapshot = structuredClone(selectedSegment);

    getBarCountInPlan({
      measureGrid,
      selectedSegment,
      countInMeasures: 2
    });

    expect(measureGrid).toEqual(gridSnapshot);
    expect(selectedSegment).toEqual(segmentSnapshot);
  });
});
