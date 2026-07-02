import { validatePracticeSegment, type PracticeSegment } from "@/domain/practice/segments";
import { clampBpm } from "@/lib/quick-metronome/control";

export type SegmentTempoApplyStatus =
  | "applied"
  | "already-applied"
  | "no-segment"
  | "no-target-bpm";

export type SegmentTempoApplyInput = {
  currentBpm: number;
  segment: PracticeSegment | null;
};

export type SegmentTempoApplyResult = {
  status: SegmentTempoApplyStatus;
  segmentId: string | null;
  segmentName: string | null;
  targetBpm: number | null;
  previousBpm: number;
  nextBpm: number;
};

export function getSegmentTempoApplyPolicy({
  currentBpm,
  segment
}: SegmentTempoApplyInput): SegmentTempoApplyResult {
  const normalizedCurrentBpm = clampBpm(currentBpm);

  if (segment === null) {
    return {
      status: "no-segment",
      segmentId: null,
      segmentName: null,
      targetBpm: null,
      previousBpm: normalizedCurrentBpm,
      nextBpm: normalizedCurrentBpm
    };
  }

  const validatedSegment = validatePracticeSegment(segment);

  if (validatedSegment.targetBpm === null) {
    return {
      status: "no-target-bpm",
      segmentId: validatedSegment.id,
      segmentName: validatedSegment.name,
      targetBpm: null,
      previousBpm: normalizedCurrentBpm,
      nextBpm: normalizedCurrentBpm
    };
  }

  const normalizedTargetBpm = clampBpm(validatedSegment.targetBpm);

  if (normalizedTargetBpm === normalizedCurrentBpm) {
    return {
      status: "already-applied",
      segmentId: validatedSegment.id,
      segmentName: validatedSegment.name,
      targetBpm: validatedSegment.targetBpm,
      previousBpm: normalizedCurrentBpm,
      nextBpm: normalizedCurrentBpm
    };
  }

  return {
    status: "applied",
    segmentId: validatedSegment.id,
    segmentName: validatedSegment.name,
    targetBpm: validatedSegment.targetBpm,
    previousBpm: normalizedCurrentBpm,
    nextBpm: normalizedTargetBpm
  };
}
