import { z } from "zod";

import {
  getMeasureStartMs,
  getTimeSignatureParts,
  validateMeasureGrid,
  type MeasureGrid,
  type MeasureRange
} from "@/domain/practice/measure-grid";
import { getMeterBeatDurationMs } from "@/domain/practice/meter-timing";
import {
  getPracticeSegmentGridStatus,
  validatePracticeSegment,
  type PracticeSegment
} from "@/domain/practice/segments";

export type BarCountInScope = "selected-segment" | "whole-sheet";

export type BarCountInStatus = "ready" | "segment-grid-stale";

export type BarCountInBeat = {
  count: number;
  sourceMeasureNumber: number | null;
  isPreRoll: boolean;
  beatNumber: number;
  offsetMs: number;
  durationMs: number;
  startsAtMs: number;
};

export type BarCountInReadyPlan = {
  status: "ready";
  scope: BarCountInScope;
  startMeasure: number;
  startMs: number;
  beatCount: number;
  totalDurationMs: number;
  beatDurationMs: number;
  beatsPerMeasure: number;
  timeSignature: MeasureGrid["timeSignature"];
  pickupBeats: number;
  segmentId: string | null;
  segmentName: string | null;
  segmentRange: MeasureRange | null;
  beats: BarCountInBeat[];
};

export type BarCountInStalePlan = {
  status: "segment-grid-stale";
  scope: "selected-segment";
  startMeasure: number;
  startMs: number;
  beatCount: 0;
  totalDurationMs: 0;
  beatDurationMs: 0;
  beatsPerMeasure: number;
  timeSignature: MeasureGrid["timeSignature"];
  pickupBeats: number;
  segmentId: string;
  segmentName: string;
  segmentRange: MeasureRange;
  beats: [];
};

export type BarCountInPlan = BarCountInReadyPlan | BarCountInStalePlan;

export type BarCountInInput = {
  measureGrid: MeasureGrid;
  selectedSegment: PracticeSegment | null;
  countInMeasures?: number;
};

const countInMeasuresSchema = z.number().finite().int().positive();

function validateCountInMeasures(value: number): number {
  return countInMeasuresSchema.parse(value);
}

function cloneMeasureRange(range: MeasureRange): MeasureRange {
  return {
    startMeasure: range.startMeasure,
    endMeasure: range.endMeasure
  };
}

function getBarCountInBeats({
  beatCount,
  beatDurationMs,
  beatsPerMeasure,
  countInMeasures,
  startMeasure,
  startMs,
  totalDurationMs
}: {
  beatCount: number;
  beatDurationMs: number;
  beatsPerMeasure: number;
  countInMeasures: number;
  startMeasure: number;
  startMs: number;
  totalDurationMs: number;
}): BarCountInBeat[] {
  return Array.from({ length: beatCount }, (_, index) => {
    const sourceMeasureNumber = startMeasure - countInMeasures + Math.floor(index / beatsPerMeasure);
    const displayedSourceMeasureNumber = sourceMeasureNumber >= 1 ? sourceMeasureNumber : null;
    const offsetMs = -totalDurationMs + beatDurationMs * index;

    return {
      count: index + 1,
      sourceMeasureNumber: displayedSourceMeasureNumber,
      isPreRoll: displayedSourceMeasureNumber === null,
      beatNumber: (index % beatsPerMeasure) + 1,
      offsetMs,
      durationMs: beatDurationMs,
      startsAtMs: startMs + offsetMs
    };
  });
}

export function getBarCountInPlan({
  measureGrid,
  selectedSegment,
  countInMeasures = 1
}: BarCountInInput): BarCountInPlan {
  const validatedGrid = validateMeasureGrid(measureGrid);
  const validatedCountInMeasures = validateCountInMeasures(countInMeasures);
  const validatedSegment = selectedSegment === null ? null : validatePracticeSegment(selectedSegment);
  const { numerator: beatsPerMeasure } = getTimeSignatureParts(validatedGrid.timeSignature);
  const scope: BarCountInScope = validatedSegment === null ? "whole-sheet" : "selected-segment";
  const startMeasure = validatedSegment?.range.startMeasure ?? 1;
  const startMs = getMeasureStartMs(validatedGrid, startMeasure);
  const segmentRange = validatedSegment === null ? null : cloneMeasureRange(validatedSegment.range);

  if (
    validatedSegment !== null &&
    getPracticeSegmentGridStatus(validatedSegment, validatedGrid) !== "current"
  ) {
    return {
      status: "segment-grid-stale",
      scope: "selected-segment",
      startMeasure,
      startMs,
      beatCount: 0,
      totalDurationMs: 0,
      beatDurationMs: 0,
      beatsPerMeasure,
      timeSignature: validatedGrid.timeSignature,
      pickupBeats: validatedGrid.pickupBeats,
      segmentId: validatedSegment.id,
      segmentName: validatedSegment.name,
      segmentRange: segmentRange ?? cloneMeasureRange(validatedSegment.range),
      beats: []
    };
  }

  const beatDurationMs = getMeterBeatDurationMs({
    bpm: validatedGrid.bpm,
    timeSignature: validatedGrid.timeSignature
  });
  const beatCount = beatsPerMeasure * validatedCountInMeasures;
  const totalDurationMs = beatDurationMs * beatCount;

  return {
    status: "ready",
    scope,
    startMeasure,
    startMs,
    beatCount,
    totalDurationMs,
    beatDurationMs,
    beatsPerMeasure,
    timeSignature: validatedGrid.timeSignature,
    pickupBeats: validatedGrid.pickupBeats,
    segmentId: validatedSegment?.id ?? null,
    segmentName: validatedSegment?.name ?? null,
    segmentRange,
    beats: getBarCountInBeats({
      beatCount,
      beatDurationMs,
      beatsPerMeasure,
      countInMeasures: validatedCountInMeasures,
      startMeasure,
      startMs,
      totalDurationMs
    })
  };
}
