import type { BarCountInPlan, BarCountInReadyPlan } from "@/domain/practice/bar-count-in";

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

  const timerIds: BarCountInSchedulerTimerId[] = [];
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
        sourceMeasureNumber: beat.sourceMeasureNumber,
        isPreRoll: beat.isPreRoll,
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
