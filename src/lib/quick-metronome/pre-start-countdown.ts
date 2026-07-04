import type { BarCountInReadyPlan } from "@/domain/practice/bar-count-in";
import {
  getMeterBeatDurationMs,
  getMeterTimeSignatureParts
} from "@/domain/practice/meter-timing";
import { isQuickMetronomeTimeSignature } from "@/lib/quick-metronome/control";
import { MAX_BPM, MIN_BPM, type TimeSignature } from "@/lib/quick-metronome/types";

export type PreStartCountdownPlan = {
  beatCount: number;
  totalDurationMs: number;
  beats: Array<{
    count: number;
    beatNumber: number;
    offsetMs: number;
  }>;
};

export type QuickAdvancedCountdownMode = "beats" | "measures";

export type QuickAdvancedCountdownInput = {
  mode: QuickAdvancedCountdownMode;
  count: number;
  bpm: number;
  timeSignature: TimeSignature;
};

function assertPositiveInteger(value: number, label: string) {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }
}

function assertQuickCountdownInput(input: QuickAdvancedCountdownInput) {
  assertPositiveInteger(input.count, "Countdown count");

  if (!Number.isFinite(input.bpm) || input.bpm < MIN_BPM || input.bpm > MAX_BPM) {
    throw new Error(`Countdown BPM must be between ${MIN_BPM} and ${MAX_BPM}.`);
  }

  if (!isQuickMetronomeTimeSignature(input.timeSignature)) {
    throw new Error("Countdown time signature is not supported.");
  }
}

export function toPreStartCountdownPlan(plan: BarCountInReadyPlan): PreStartCountdownPlan {
  return {
    beatCount: plan.beatCount,
    totalDurationMs: plan.totalDurationMs,
    beats: plan.beats.map((beat) => ({
      count: beat.count,
      beatNumber: beat.beatNumber,
      offsetMs: beat.offsetMs
    }))
  };
}

export function getQuickAdvancedCountdownPlan(
  input: QuickAdvancedCountdownInput
): PreStartCountdownPlan {
  assertQuickCountdownInput(input);

  const { numerator } = getMeterTimeSignatureParts(input.timeSignature);
  const beatCount = input.mode === "measures" ? input.count * numerator : input.count;
  const beatDurationMs = getMeterBeatDurationMs({
    bpm: input.bpm,
    timeSignature: input.timeSignature
  });
  const totalDurationMs = beatDurationMs * beatCount;

  return {
    beatCount,
    totalDurationMs,
    beats: Array.from({ length: beatCount }, (_, index) => ({
      count: index + 1,
      beatNumber: (index % numerator) + 1,
      offsetMs: -totalDurationMs + beatDurationMs * index
    }))
  };
}
