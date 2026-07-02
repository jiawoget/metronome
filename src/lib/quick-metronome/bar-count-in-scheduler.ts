import type { BarCountInPlan, BarCountInReadyPlan } from "@/domain/practice/bar-count-in";
import {
  schedulePreStartCountdown,
  toPreStartCountdownPlan
} from "@/lib/quick-metronome/pre-start-countdown";

type BarCountInSchedulerTimerId = number;
type BarCountInSchedulerSetTimeout = (
  callback: () => void,
  delayMs: number
) => BarCountInSchedulerTimerId;
type BarCountInSchedulerClearTimeout = (
  timerId: BarCountInSchedulerTimerId
) => void;

export type BarCountInSchedulerTick = {
  count: number;
  beatNumber: number;
  remainingBeats: number;
  sourceMeasureNumber: number | null;
  isPreRoll: boolean;
  scheduledOffsetMs: number;
  scheduledDelayMs: number;
};

export type BarCountInSchedulerOptions = {
  plan: BarCountInPlan;
  setTimeout?: BarCountInSchedulerSetTimeout;
  clearTimeout?: BarCountInSchedulerClearTimeout;
  onTick?: (tick: BarCountInSchedulerTick) => void;
  onComplete: () => void;
};

export type BarCountInSchedulerCancel = {
  cancel: () => void;
};

function assertReadyPlan(plan: BarCountInPlan): asserts plan is BarCountInReadyPlan {
  if (plan.status !== "ready") {
    throw new Error(`Cannot schedule bar count-in plan with status "${plan.status}".`);
  }

  if (plan.beats.length === 0) {
    throw new Error("Cannot schedule a ready bar count-in plan without beats.");
  }
}

export function scheduleBarCountIn({
  plan,
  setTimeout = globalThis.setTimeout.bind(globalThis) as BarCountInSchedulerSetTimeout,
  clearTimeout = globalThis.clearTimeout.bind(globalThis) as BarCountInSchedulerClearTimeout,
  onTick,
  onComplete
}: BarCountInSchedulerOptions): BarCountInSchedulerCancel {
  assertReadyPlan(plan);

  return schedulePreStartCountdown({
    plan: toPreStartCountdownPlan(plan),
    setTimeout,
    clearTimeout,
    onTick: (tick) => {
      const beat = plan.beats[tick.count - 1];

      onTick?.({
        count: tick.count,
        beatNumber: tick.beatNumber,
        remainingBeats: tick.remainingBeats,
        sourceMeasureNumber: beat.sourceMeasureNumber,
        isPreRoll: beat.isPreRoll,
        scheduledOffsetMs: tick.scheduledOffsetMs,
        scheduledDelayMs: tick.scheduledDelayMs
      });
    },
    onComplete
  });
}
