import type { BarCountInReadyPlan } from "@/domain/practice/bar-count-in";
import {
  getMeterBeatDurationMs,
  getMeterTimeSignatureParts
} from "@/domain/practice/meter-timing";
import { isQuickMetronomeTimeSignature } from "@/lib/quick-metronome/control";
import { MAX_BPM, MIN_BPM, type TimeSignature } from "@/lib/quick-metronome/types";

type PreStartCountdownTimerId = number;
type PreStartCountdownSetTimeout = (
  callback: () => void,
  delayMs: number
) => PreStartCountdownTimerId;
type PreStartCountdownClearTimeout = (timerId: PreStartCountdownTimerId) => void;

export type PreStartCountdownBeat = {
  count: number;
  beatNumber: number;
  remainingBeats: number;
  scheduledOffsetMs: number;
  scheduledDelayMs: number;
};

export type PreStartCountdownPlan = {
  beatCount: number;
  totalDurationMs: number;
  beats: Array<{
    count: number;
    beatNumber: number;
    offsetMs: number;
  }>;
};

export type PreStartCountdownSchedulerOptions = {
  plan: PreStartCountdownPlan;
  setTimeout?: PreStartCountdownSetTimeout;
  clearTimeout?: PreStartCountdownClearTimeout;
  onTick?: (tick: PreStartCountdownBeat) => void;
  onComplete: () => void;
};

export type PreStartCountdownSchedulerCancel = {
  cancel: () => void;
};

export type QuickAdvancedCountdownMode = "beats" | "measures";

export type QuickAdvancedCountdownInput = {
  mode: QuickAdvancedCountdownMode;
  count: number;
  bpm: number;
  timeSignature: TimeSignature;
};

function assertSchedulablePlan(plan: PreStartCountdownPlan) {
  if (!Number.isFinite(plan.beatCount) || plan.beatCount <= 0) {
    throw new Error("Cannot schedule a pre-start countdown without a positive beat count.");
  }

  if (!Number.isFinite(plan.totalDurationMs) || plan.totalDurationMs <= 0) {
    throw new Error("Cannot schedule a pre-start countdown without a positive duration.");
  }

  if (plan.beats.length === 0) {
    throw new Error("Cannot schedule a pre-start countdown without beats.");
  }
}

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

export function schedulePreStartCountdown({
  plan,
  setTimeout = globalThis.setTimeout.bind(globalThis) as PreStartCountdownSetTimeout,
  clearTimeout = globalThis.clearTimeout.bind(globalThis) as PreStartCountdownClearTimeout,
  onTick,
  onComplete
}: PreStartCountdownSchedulerOptions): PreStartCountdownSchedulerCancel {
  assertSchedulablePlan(plan);

  const timerIds: PreStartCountdownTimerId[] = [];
  let cancelled = false;
  const firstOffsetMs = plan.beats[0].offsetMs;

  const scheduleTimer = (callback: () => void, delayMs: number) => {
    const timerId = setTimeout(() => {
      if (!cancelled) {
        callback();
      }
    }, delayMs);

    timerIds.push(timerId);
  };

  for (const [index, beat] of plan.beats.entries()) {
    const scheduledDelayMs = beat.offsetMs - firstOffsetMs;

    scheduleTimer(() => {
      onTick?.({
        count: beat.count,
        beatNumber: beat.beatNumber,
        remainingBeats: plan.beats.length - index - 1,
        scheduledOffsetMs: beat.offsetMs,
        scheduledDelayMs
      });
    }, scheduledDelayMs);
  }

  scheduleTimer(onComplete, plan.totalDurationMs);

  return {
    cancel: () => {
      if (cancelled) {
        return;
      }

      cancelled = true;

      for (const timerId of timerIds) {
        clearTimeout(timerId);
      }

      timerIds.length = 0;
    }
  };
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
