"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { BarCountInReadyPlan } from "@/domain/practice/bar-count-in";
import { getMeterBeatDurationMs } from "@/domain/practice/meter-timing";
import {
  schedulePreStartCountdown,
  type PreStartCountdownBeat,
  type PreStartCountdownPlan,
  type PreStartCountdownSchedulerOptions
} from "@/lib/quick-metronome/pre-start-countdown";
import type { MetronomeSettings } from "@/lib/quick-metronome/types";
import type { MetronomeService } from "@/services/metronome";

export type MetronomeTransportState = "stopped" | "counting" | "playing";

type MetronomeTransportService = Pick<MetronomeService, "update" | "start" | "stop">;

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
  plan: BarCountInReadyPlan;
  setTimeout: typeof window.setTimeout;
  clearTimeout: typeof window.clearTimeout;
  onTick?: (tick: BarCountInSchedulerTick) => void;
  onComplete: () => void;
};

export type BarCountInScheduler = (options: BarCountInSchedulerOptions) => () => void;

export type BarCountInTransportOptions = {
  enabled?: boolean;
  plan: BarCountInReadyPlan | null;
  schedule: BarCountInScheduler;
  onTick?: (tick: BarCountInSchedulerTick) => void;
};

export type PreStartCountdownScheduler = (
  options: PreStartCountdownSchedulerOptions
) => { cancel: () => void };

export type PreStartCountdownTransportOptions = {
  enabled?: boolean;
  plan: PreStartCountdownPlan | null;
  schedule?: PreStartCountdownScheduler;
  onTick?: (tick: PreStartCountdownBeat) => void;
};

export type UseMetronomeTransportOptions<StartContext> = {
  settings: MetronomeSettings;
  metronomeService: MetronomeTransportService;
  barCountIn?: BarCountInTransportOptions;
  preStartCountdown?: PreStartCountdownTransportOptions;
  beforeStart?: () => Promise<StartContext | null> | StartContext | null;
  onCountdownStarted?: (remainingBeats: number) => void;
  onStartBlocked?: () => void;
  onStarted?: (context: StartContext | null) => void;
  onStartFailed?: (error: unknown, context: StartContext | null) => Promise<void> | void;
  onStopped?: () => Promise<void> | void;
};

export function useMetronomeTransport<StartContext = null>({
  settings,
  metronomeService,
  barCountIn,
  preStartCountdown,
  beforeStart,
  onCountdownStarted,
  onStartBlocked,
  onStarted,
  onStartFailed,
  onStopped
}: UseMetronomeTransportOptions<StartContext>) {
  const [transportState, setTransportState] = useState<MetronomeTransportState>("stopped");
  const [countdownRemaining, setCountdownRemaining] = useState(0);
  const transportStateRef = useRef<MetronomeTransportState>("stopped");
  const countdownTimeoutRef = useRef<number | null>(null);
  const barCountInCancelRef = useRef<(() => void) | null>(null);
  const preStartRunIdRef = useRef(0);
  const latestOptionsRef = useRef({
    settings,
    barCountIn,
    preStartCountdown,
    beforeStart,
    onCountdownStarted,
    onStartBlocked,
    onStarted,
    onStartFailed,
    onStopped
  });

  const setTransportStateValue = useCallback((state: MetronomeTransportState) => {
    transportStateRef.current = state;
    setTransportState(state);
  }, []);

  useEffect(() => {
    latestOptionsRef.current = {
      settings,
      barCountIn,
      preStartCountdown,
      beforeStart,
      onCountdownStarted,
      onStartBlocked,
      onStarted,
      onStartFailed,
      onStopped
    };
  }, [
    barCountIn,
    beforeStart,
    onCountdownStarted,
    onStartBlocked,
    onStartFailed,
    onStarted,
    onStopped,
    preStartCountdown,
    settings
  ]);

  useEffect(() => {
    metronomeService.update(settings);
  }, [metronomeService, settings]);

  useEffect(() => {
    return () => {
      preStartRunIdRef.current += 1;

      if (countdownTimeoutRef.current !== null) {
        window.clearTimeout(countdownTimeoutRef.current);
      }

      barCountInCancelRef.current?.();
      barCountInCancelRef.current = null;
      metronomeService.stop();
    };
  }, [metronomeService]);

  const clearCountdown = useCallback(() => {
    if (countdownTimeoutRef.current !== null) {
      window.clearTimeout(countdownTimeoutRef.current);
      countdownTimeoutRef.current = null;
    }
  }, []);

  const clearBarCountIn = useCallback(() => {
    barCountInCancelRef.current?.();
    barCountInCancelRef.current = null;
  }, []);

  const clearPreStartScheduling = useCallback(() => {
    preStartRunIdRef.current += 1;
    clearCountdown();
    clearBarCountIn();
  }, [clearBarCountIn, clearCountdown]);

  const startPlaybackNow = useCallback(async () => {
    let startContext: StartContext | null = null;

    try {
      const latestOptions = latestOptionsRef.current;

      startContext = latestOptions.beforeStart ? await latestOptions.beforeStart() : null;

      if (latestOptions.beforeStart && startContext === null) {
        metronomeService.stop();
        setTransportStateValue("stopped");
        setCountdownRemaining(0);
        latestOptions.onStartBlocked?.();
        return;
      }

      await metronomeService.start(latestOptions.settings);
      setTransportStateValue("playing");
      setCountdownRemaining(0);
      latestOptions.onStarted?.(startContext);
    } catch (error) {
      metronomeService.stop();
      setTransportStateValue("stopped");
      setCountdownRemaining(0);
      await latestOptionsRef.current.onStartFailed?.(error, startContext);
    }
  }, [metronomeService, setTransportStateValue]);

  const runCountdown = useCallback(
    (remainingBeats: number) => {
      const scheduleNextBeat = (remaining: number) => {
        clearCountdown();

        if (remaining <= 0) {
          void startPlaybackNow();
          return;
        }

        setCountdownRemaining(remaining);
        countdownTimeoutRef.current = window.setTimeout(() => {
          scheduleNextBeat(remaining - 1);
        }, getMeterBeatDurationMs(latestOptionsRef.current.settings));
      };

      scheduleNextBeat(remainingBeats);
    },
    [clearCountdown, startPlaybackNow]
  );

  const runBarCountIn = useCallback(
    (options: BarCountInTransportOptions) => {
      if (options.enabled === false || options.plan === null) {
        return false;
      }

      const runId = preStartRunIdRef.current + 1;
      preStartRunIdRef.current = runId;
      setTransportStateValue("counting");
      setCountdownRemaining(options.plan.beatCount);
      latestOptionsRef.current.onCountdownStarted?.(options.plan.beatCount);

      barCountInCancelRef.current = options.schedule({
        plan: options.plan,
        setTimeout: window.setTimeout,
        clearTimeout: window.clearTimeout,
        onTick: (tick) => {
          if (preStartRunIdRef.current !== runId) {
            return;
          }

          setCountdownRemaining(tick.remainingBeats);
          latestOptionsRef.current.barCountIn?.onTick?.(tick);
        },
        onComplete: () => {
          if (preStartRunIdRef.current !== runId || transportStateRef.current !== "counting") {
            return;
          }

          preStartRunIdRef.current += 1;
          barCountInCancelRef.current = null;
          void startPlaybackNow();
        }
      });

      return true;
    },
    [setTransportStateValue, startPlaybackNow]
  );

  const runPreStartCountdown = useCallback(
    (options: PreStartCountdownTransportOptions) => {
      if (options.enabled === false || options.plan === null) {
        return false;
      }

      const runId = preStartRunIdRef.current + 1;
      preStartRunIdRef.current = runId;
      setTransportStateValue("counting");
      setCountdownRemaining(options.plan.beatCount);
      latestOptionsRef.current.onCountdownStarted?.(options.plan.beatCount);

      const scheduled = (options.schedule ?? schedulePreStartCountdown)({
        plan: options.plan,
        setTimeout: window.setTimeout,
        clearTimeout: window.clearTimeout,
        onTick: (tick) => {
          if (preStartRunIdRef.current !== runId) {
            return;
          }

          setCountdownRemaining(tick.remainingBeats);
          latestOptionsRef.current.preStartCountdown?.onTick?.(tick);
        },
        onComplete: () => {
          if (preStartRunIdRef.current !== runId || transportStateRef.current !== "counting") {
            return;
          }

          preStartRunIdRef.current += 1;
          barCountInCancelRef.current = null;
          void startPlaybackNow();
        }
      });

      barCountInCancelRef.current = scheduled.cancel;

      return true;
    },
    [setTransportStateValue, startPlaybackNow]
  );

  const startMetronome = useCallback(async () => {
    if (transportStateRef.current !== "stopped") {
      return;
    }

    const latestOptions = latestOptionsRef.current;

    if (latestOptions.barCountIn && runBarCountIn(latestOptions.barCountIn)) {
      return;
    }

    if (
      latestOptions.preStartCountdown &&
      runPreStartCountdown(latestOptions.preStartCountdown)
    ) {
      return;
    }

    if (latestOptions.settings.countdownBeats > 0) {
      preStartRunIdRef.current += 1;
      setTransportStateValue("counting");
      setCountdownRemaining(latestOptions.settings.countdownBeats);
      latestOptions.onCountdownStarted?.(latestOptions.settings.countdownBeats);
      runCountdown(latestOptions.settings.countdownBeats);
      return;
    }

    await startPlaybackNow();
  }, [
    runBarCountIn,
    runCountdown,
    runPreStartCountdown,
    setTransportStateValue,
    startPlaybackNow
  ]);

  const stopMetronome = useCallback(async () => {
    clearPreStartScheduling();
    metronomeService.stop();
    setTransportStateValue("stopped");
    setCountdownRemaining(0);
    await latestOptionsRef.current.onStopped?.();
  }, [clearPreStartScheduling, metronomeService, setTransportStateValue]);

  return {
    transportState,
    countdownRemaining,
    isPlaying: transportState === "playing",
    isCounting: transportState === "counting",
    startMetronome,
    stopMetronome
  };
}
