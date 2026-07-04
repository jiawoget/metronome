"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { BarCountInReadyPlan } from "@/domain/practice/bar-count-in";
import {
  getQuickAdvancedCountdownPlan,
  type PreStartCountdownPlan,
  toPreStartCountdownPlan
} from "@/lib/quick-metronome/pre-start-countdown";
import type { MetronomeSettings } from "@/lib/quick-metronome/types";
import type {
  CountdownExecutor,
  CountdownExecutorTick,
  MetronomeService
} from "@/services/metronome";

export type MetronomeTransportState = "stopped" | "counting" | "playing";

type MetronomeTransportService = Pick<MetronomeService, "update" | "start" | "stop">;

export type BarCountInCountdownTick = {
  count: number;
  beatNumber: number;
  remainingBeats: number;
  sourceMeasureNumber: number | null;
  isPreRoll: boolean;
  scheduledOffsetMs: number;
  scheduledDelayMs: number;
  audioTime: number;
};

export type BarCountInTransportOptions = {
  enabled?: boolean;
  plan: BarCountInReadyPlan | null;
  onTick?: (tick: BarCountInCountdownTick) => void;
};

export type PreStartCountdownTransportOptions = {
  enabled?: boolean;
  plan: PreStartCountdownPlan | null;
  onTick?: (tick: CountdownExecutorTick) => void;
};

export type UseMetronomeTransportOptions<StartContext> = {
  settings: MetronomeSettings;
  metronomeService: MetronomeTransportService;
  countdownExecutor?: CountdownExecutor;
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
  countdownExecutor,
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
  const countdownCancelRef = useRef<(() => void) | null>(null);
  const preStartRunIdRef = useRef(0);
  const latestOptionsRef = useRef({
    settings,
    countdownExecutor,
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
      countdownExecutor,
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
    countdownExecutor,
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

      countdownCancelRef.current?.();
      countdownCancelRef.current = null;
      metronomeService.stop();
    };
  }, [metronomeService]);

  const clearCountdown = useCallback(() => {
    countdownCancelRef.current?.();
    countdownCancelRef.current = null;
  }, []);

  const clearPreStartScheduling = useCallback(() => {
    preStartRunIdRef.current += 1;
    clearCountdown();
  }, [clearCountdown]);

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

  const handleCountdownExecutorError = useCallback(
    async (runId: number, error: unknown) => {
      if (preStartRunIdRef.current !== runId) {
        return;
      }

      preStartRunIdRef.current += 1;
      countdownCancelRef.current = null;
      metronomeService.stop();
      setTransportStateValue("stopped");
      setCountdownRemaining(0);
      await latestOptionsRef.current.onStartFailed?.(error, null);
    },
    [metronomeService, setTransportStateValue]
  );

  const runCountdownPlan = useCallback(
    ({
      plan,
      onTick
    }: {
      plan: PreStartCountdownPlan;
      onTick?: (tick: CountdownExecutorTick) => void;
    }) => {
      const latestOptions = latestOptionsRef.current;
      const executor = latestOptions.countdownExecutor;

      if (!executor) {
        throw new Error("Countdown executor is required before starting a countdown.");
      }

      const runId = preStartRunIdRef.current + 1;
      preStartRunIdRef.current = runId;
      setTransportStateValue("counting");
      setCountdownRemaining(plan.beatCount);
      latestOptions.onCountdownStarted?.(plan.beatCount);

      try {
        const run = executor.run({
          plan,
          bpm: latestOptions.settings.bpm,
          timeSignature: latestOptions.settings.timeSignature,
          onTick: (tick) => {
            if (preStartRunIdRef.current !== runId) {
              return;
            }

            setCountdownRemaining(tick.remainingBeats);
            onTick?.(tick);
          },
          onComplete: () => {
            if (preStartRunIdRef.current !== runId || transportStateRef.current !== "counting") {
              return;
            }

            preStartRunIdRef.current += 1;
            countdownCancelRef.current = null;
            void startPlaybackNow();
          },
          onError: (error) => {
            void handleCountdownExecutorError(runId, error);
          }
        });

        countdownCancelRef.current = run.cancel;
      } catch (error) {
        void handleCountdownExecutorError(runId, error);
      }
    },
    [handleCountdownExecutorError, setTransportStateValue, startPlaybackNow]
  );

  const runBarCountIn = useCallback(
    (options: BarCountInTransportOptions) => {
      if (options.enabled === false || options.plan === null) {
        return false;
      }

      const barCountInPlan = options.plan;

      runCountdownPlan({
        plan: toPreStartCountdownPlan(barCountInPlan),
        onTick: (tick) => {
          const beat = barCountInPlan.beats[tick.count - 1];

          if (!beat) {
            return;
          }

          latestOptionsRef.current.barCountIn?.onTick?.({
            count: tick.count,
            beatNumber: tick.beatNumber,
            remainingBeats: tick.remainingBeats,
            sourceMeasureNumber: beat.sourceMeasureNumber,
            isPreRoll: beat.isPreRoll,
            scheduledOffsetMs: tick.scheduledOffsetMs,
            scheduledDelayMs: tick.scheduledDelayMs,
            audioTime: tick.audioTime
          });
        }
      });

      return true;
    },
    [runCountdownPlan]
  );

  const runPreStartCountdown = useCallback(
    (options: PreStartCountdownTransportOptions) => {
      if (options.enabled === false || options.plan === null) {
        return false;
      }

      runCountdownPlan({
        plan: options.plan,
        onTick: (tick) => {
          latestOptionsRef.current.preStartCountdown?.onTick?.(tick);
        }
      });

      return true;
    },
    [runCountdownPlan]
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
      runCountdownPlan({
        plan: getQuickAdvancedCountdownPlan({
          mode: "beats",
          count: latestOptions.settings.countdownBeats,
          bpm: latestOptions.settings.bpm,
          timeSignature: latestOptions.settings.timeSignature
        })
      });
      return;
    }

    await startPlaybackNow();
  }, [
    runBarCountIn,
    runPreStartCountdown,
    runCountdownPlan,
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
