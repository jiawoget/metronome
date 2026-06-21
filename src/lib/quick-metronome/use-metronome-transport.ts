"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { BrowserMetronomeService } from "@/lib/quick-metronome/metronome-service";
import type { MetronomeSettings } from "@/lib/quick-metronome/types";

export type MetronomeTransportState = "stopped" | "counting" | "playing";

type MetronomeTransportService = Pick<BrowserMetronomeService, "update" | "start" | "stop">;

export type UseMetronomeTransportOptions<StartContext> = {
  settings: MetronomeSettings;
  metronomeService: MetronomeTransportService;
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
  beforeStart,
  onCountdownStarted,
  onStartBlocked,
  onStarted,
  onStartFailed,
  onStopped
}: UseMetronomeTransportOptions<StartContext>) {
  const [transportState, setTransportState] = useState<MetronomeTransportState>("stopped");
  const [countdownRemaining, setCountdownRemaining] = useState(0);
  const countdownTimeoutRef = useRef<number | null>(null);
  const latestOptionsRef = useRef({
    settings,
    beforeStart,
    onCountdownStarted,
    onStartBlocked,
    onStarted,
    onStartFailed,
    onStopped
  });

  useEffect(() => {
    latestOptionsRef.current = {
      settings,
      beforeStart,
      onCountdownStarted,
      onStartBlocked,
      onStarted,
      onStartFailed,
      onStopped
    };
  }, [beforeStart, onCountdownStarted, onStartBlocked, onStartFailed, onStarted, onStopped, settings]);

  useEffect(() => {
    metronomeService.update(settings);
  }, [metronomeService, settings]);

  useEffect(() => {
    return () => {
      if (countdownTimeoutRef.current !== null) {
        window.clearTimeout(countdownTimeoutRef.current);
      }

      metronomeService.stop();
    };
  }, [metronomeService]);

  const clearCountdown = useCallback(() => {
    if (countdownTimeoutRef.current !== null) {
      window.clearTimeout(countdownTimeoutRef.current);
      countdownTimeoutRef.current = null;
    }
  }, []);

  const startPlaybackNow = useCallback(async () => {
    let startContext: StartContext | null = null;

    try {
      const latestOptions = latestOptionsRef.current;

      startContext = latestOptions.beforeStart ? await latestOptions.beforeStart() : null;

      if (latestOptions.beforeStart && startContext === null) {
        metronomeService.stop();
        setTransportState("stopped");
        setCountdownRemaining(0);
        latestOptions.onStartBlocked?.();
        return;
      }

      await metronomeService.start(latestOptions.settings);
      setTransportState("playing");
      setCountdownRemaining(0);
      latestOptions.onStarted?.(startContext);
    } catch (error) {
      metronomeService.stop();
      setTransportState("stopped");
      setCountdownRemaining(0);
      await latestOptionsRef.current.onStartFailed?.(error, startContext);
    }
  }, [metronomeService]);

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
        }, 60_000 / latestOptionsRef.current.settings.bpm);
      };

      scheduleNextBeat(remainingBeats);
    },
    [clearCountdown, startPlaybackNow]
  );

  const startMetronome = useCallback(async () => {
    if (settings.countdownBeats > 0) {
      setTransportState("counting");
      setCountdownRemaining(settings.countdownBeats);
      latestOptionsRef.current.onCountdownStarted?.(settings.countdownBeats);
      runCountdown(settings.countdownBeats);
      return;
    }

    await startPlaybackNow();
  }, [runCountdown, settings.countdownBeats, startPlaybackNow]);

  const stopMetronome = useCallback(async () => {
    clearCountdown();
    metronomeService.stop();
    setTransportState("stopped");
    setCountdownRemaining(0);
    await latestOptionsRef.current.onStopped?.();
  }, [clearCountdown, metronomeService]);

  return {
    transportState,
    countdownRemaining,
    isPlaying: transportState === "playing",
    isCounting: transportState === "counting",
    startMetronome,
    stopMetronome
  };
}
