import type { PreStartCountdownPlan } from "@/lib/quick-metronome/pre-start-countdown";
import type { TimeSignature } from "@/lib/quick-metronome/types";

export type CountdownExecutorTick = {
  count: number;
  beatNumber: number;
  remainingBeats: number;
  scheduledOffsetMs: number;
  scheduledDelayMs: number;
  audioTime: number;
};

export type CountdownExecutorRun = {
  cancel: () => void;
};

export type CountdownExecutorOptions = {
  plan: PreStartCountdownPlan;
  bpm: number;
  timeSignature: TimeSignature;
  onTick?: (tick: CountdownExecutorTick) => void;
  onComplete: () => void;
  onError?: (error: unknown) => void;
};

export type CountdownExecutor = {
  run: (options: CountdownExecutorOptions) => CountdownExecutorRun;
};

export function assertSchedulableCountdownPlan(plan: PreStartCountdownPlan) {
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
