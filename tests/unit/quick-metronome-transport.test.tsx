import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { BarCountInReadyPlan } from "@/domain/practice/bar-count-in";
import { DEFAULT_METRONOME_SETTINGS } from "@/lib/quick-metronome/types";
import {
  type BarCountInSchedulerOptions,
  useMetronomeTransport
} from "@/lib/quick-metronome/use-metronome-transport";

function createTransportService() {
  return {
    update: vi.fn(),
    start: vi.fn(async () => undefined),
    stop: vi.fn()
  };
}

function createBarCountInPlan(overrides: Partial<BarCountInReadyPlan> = {}): BarCountInReadyPlan {
  return {
    status: "ready",
    scope: "whole-sheet",
    startMeasure: 1,
    startMs: 0,
    beatCount: 2,
    totalDurationMs: 1_000,
    beatDurationMs: 500,
    beatsPerMeasure: 2,
    timeSignature: "2/4",
    pickupBeats: 0,
    segmentId: null,
    segmentName: null,
    segmentRange: null,
    beats: [
      {
        count: 1,
        sourceMeasureNumber: null,
        isPreRoll: true,
        beatNumber: 1,
        offsetMs: -1_000,
        durationMs: 500,
        startsAtMs: -1_000
      },
      {
        count: 2,
        sourceMeasureNumber: null,
        isPreRoll: true,
        beatNumber: 2,
        offsetMs: -500,
        durationMs: 500,
        startsAtMs: -500
      }
    ],
    ...overrides
  };
}

function createDeferredBarCountInScheduler() {
  let scheduledOptions: BarCountInSchedulerOptions | null = null;
  const cancel = vi.fn();
  const schedule = vi.fn((options: BarCountInSchedulerOptions) => {
    scheduledOptions = options;
    return cancel;
  });

  return {
    schedule,
    cancel,
    get options() {
      if (scheduledOptions === null) {
        throw new Error("Bar count-in was not scheduled");
      }

      return scheduledOptions;
    }
  };
}

describe("useMetronomeTransport", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts, updates, and stops the shared metronome service", async () => {
    const service = createTransportService();
    const onStarted = vi.fn();
    const onStopped = vi.fn();
    const { result } = renderHook(() =>
      useMetronomeTransport({
        settings: DEFAULT_METRONOME_SETTINGS,
        metronomeService: service,
        onStarted,
        onStopped
      })
    );

    expect(service.update).toHaveBeenCalledWith(DEFAULT_METRONOME_SETTINGS);

    await act(async () => {
      await result.current.startMetronome();
    });

    expect(service.start).toHaveBeenCalledWith(DEFAULT_METRONOME_SETTINGS);
    expect(onStarted).toHaveBeenCalledWith(null);
    expect(result.current.transportState).toBe("playing");

    await act(async () => {
      await result.current.stopMetronome();
    });

    expect(service.stop).toHaveBeenCalled();
    expect(onStopped).toHaveBeenCalled();
    expect(result.current.transportState).toBe("stopped");
  });

  it("runs countdown before starting playback", async () => {
    vi.useFakeTimers();

    const service = createTransportService();
    const onCountdownStarted = vi.fn();
    const { result } = renderHook(() =>
      useMetronomeTransport({
        settings: {
          ...DEFAULT_METRONOME_SETTINGS,
          bpm: 120,
          countdownBeats: 2
        },
        metronomeService: service,
        onCountdownStarted
      })
    );

    await act(async () => {
      await result.current.startMetronome();
    });

    expect(onCountdownStarted).toHaveBeenCalledWith(2);
    expect(result.current.transportState).toBe("counting");
    expect(result.current.countdownRemaining).toBe(2);
    expect(service.start).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(result.current.countdownRemaining).toBe(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(service.start).toHaveBeenCalled();
    expect(result.current.transportState).toBe("playing");
  });

  it("runs countdown using the shared denominator-aware meter timing policy", async () => {
    vi.useFakeTimers();

    const service = createTransportService();
    const { result } = renderHook(() =>
      useMetronomeTransport({
        settings: {
          ...DEFAULT_METRONOME_SETTINGS,
          bpm: 120,
          timeSignature: "6/8",
          countdownBeats: 2
        },
        metronomeService: service
      })
    );

    await act(async () => {
      await result.current.startMetronome();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });

    expect(result.current.countdownRemaining).toBe(1);
    expect(service.start).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });

    expect(service.start).toHaveBeenCalled();
    expect(result.current.transportState).toBe("playing");
  });

  it("uses latest settings when countdown finishes after BPM changes", async () => {
    vi.useFakeTimers();

    const service = createTransportService();
    const initialSettings = {
      ...DEFAULT_METRONOME_SETTINGS,
      bpm: 90,
      countdownBeats: 2
    };
    const editedSettings = {
      ...initialSettings,
      bpm: 132
    };
    const { result, rerender } = renderHook(
      ({ settings }) =>
        useMetronomeTransport({
          settings,
          metronomeService: service
        }),
      {
        initialProps: {
          settings: initialSettings
        }
      }
    );

    await act(async () => {
      await result.current.startMetronome();
    });

    expect(result.current.transportState).toBe("counting");
    expect(service.start).not.toHaveBeenCalled();

    rerender({ settings: editedSettings });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_400);
    });

    expect(service.start).toHaveBeenCalledWith(editedSettings);
    expect(result.current.transportState).toBe("playing");
  });

  it("passes pre-start context to failure cleanup when playback start rejects", async () => {
    const service = createTransportService();
    const context = { sessionId: "session-alpha" };
    const onStartFailed = vi.fn();

    service.start.mockRejectedValueOnce(new Error("Tone unavailable"));

    const { result } = renderHook(() =>
      useMetronomeTransport({
        settings: DEFAULT_METRONOME_SETTINGS,
        metronomeService: service,
        beforeStart: async () => context,
        onStartFailed
      })
    );

    await act(async () => {
      await result.current.startMetronome();
    });

    expect(service.start).toHaveBeenCalled();
    expect(service.stop).toHaveBeenCalled();
    expect(onStartFailed).toHaveBeenCalledWith(expect.any(Error), context);
    expect(result.current.transportState).toBe("stopped");
  });

  it("schedules a ready bar count-in before starting playback", async () => {
    const service = createTransportService();
    const plan = createBarCountInPlan();
    const scheduler = createDeferredBarCountInScheduler();
    const onCountdownStarted = vi.fn();
    const onTick = vi.fn();
    const { result } = renderHook(() =>
      useMetronomeTransport({
        settings: DEFAULT_METRONOME_SETTINGS,
        metronomeService: service,
        barCountIn: {
          enabled: true,
          plan,
          schedule: scheduler.schedule,
          onTick
        },
        onCountdownStarted
      })
    );

    await act(async () => {
      await result.current.startMetronome();
    });

    expect(scheduler.schedule).toHaveBeenCalledWith(
      expect.objectContaining({
        plan,
        setTimeout: window.setTimeout,
        clearTimeout: window.clearTimeout
      })
    );
    expect(onCountdownStarted).toHaveBeenCalledWith(plan.beatCount);
    expect(result.current.transportState).toBe("counting");
    expect(result.current.countdownRemaining).toBe(plan.beatCount);
    expect(service.start).not.toHaveBeenCalled();

    act(() => {
      scheduler.options.onTick?.({
        count: 1,
        beatNumber: 1,
        remainingBeats: 1,
        sourceMeasureNumber: null,
        isPreRoll: true,
        scheduledOffsetMs: -1_000,
        scheduledDelayMs: 0
      });
    });

    expect(onTick).toHaveBeenCalledWith(expect.objectContaining({ remainingBeats: 1 }));
    expect(result.current.countdownRemaining).toBe(1);

    await act(async () => {
      scheduler.options.onComplete();
      await Promise.resolve();
    });

    expect(service.start).toHaveBeenCalledWith(DEFAULT_METRONOME_SETTINGS);
    expect(result.current.transportState).toBe("playing");
    expect(result.current.countdownRemaining).toBe(0);
  });

  it("uses a ready bar count-in instead of simple countdown beats", async () => {
    vi.useFakeTimers();

    const service = createTransportService();
    const plan = createBarCountInPlan();
    const scheduler = createDeferredBarCountInScheduler();
    const { result } = renderHook(() =>
      useMetronomeTransport({
        settings: {
          ...DEFAULT_METRONOME_SETTINGS,
          bpm: 120,
          countdownBeats: 2
        },
        metronomeService: service,
        barCountIn: {
          enabled: true,
          plan,
          schedule: scheduler.schedule
        }
      })
    );

    await act(async () => {
      await result.current.startMetronome();
    });

    expect(scheduler.schedule).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });

    expect(service.start).not.toHaveBeenCalled();
    expect(result.current.transportState).toBe("counting");
  });

  it("cancels bar count-in without starting playback when stopped", async () => {
    const service = createTransportService();
    const scheduler = createDeferredBarCountInScheduler();
    const onStopped = vi.fn();
    const { result } = renderHook(() =>
      useMetronomeTransport({
        settings: DEFAULT_METRONOME_SETTINGS,
        metronomeService: service,
        barCountIn: {
          enabled: true,
          plan: createBarCountInPlan(),
          schedule: scheduler.schedule
        },
        onStopped
      })
    );

    await act(async () => {
      await result.current.startMetronome();
    });

    await act(async () => {
      await result.current.stopMetronome();
    });

    expect(scheduler.cancel).toHaveBeenCalledTimes(1);
    expect(service.stop).toHaveBeenCalled();
    expect(onStopped).toHaveBeenCalled();
    expect(result.current.transportState).toBe("stopped");

    await act(async () => {
      scheduler.options.onComplete();
      await Promise.resolve();
    });

    expect(service.start).not.toHaveBeenCalled();
  });

  it("uses latest settings when bar count-in completes after settings change", async () => {
    const service = createTransportService();
    const scheduler = createDeferredBarCountInScheduler();
    const initialSettings = {
      ...DEFAULT_METRONOME_SETTINGS,
      bpm: 96
    };
    const editedSettings = {
      ...initialSettings,
      bpm: 144
    };
    const { result, rerender } = renderHook(
      ({ settings }) =>
        useMetronomeTransport({
          settings,
          metronomeService: service,
          barCountIn: {
            enabled: true,
            plan: createBarCountInPlan(),
            schedule: scheduler.schedule
          }
        }),
      {
        initialProps: {
          settings: initialSettings
        }
      }
    );

    await act(async () => {
      await result.current.startMetronome();
    });

    rerender({ settings: editedSettings });

    await act(async () => {
      scheduler.options.onComplete();
      await Promise.resolve();
    });

    expect(service.start).toHaveBeenCalledWith(editedSettings);
    expect(result.current.transportState).toBe("playing");
  });

  it("does not create duplicate bar count-in schedulers from repeated starts while counting", async () => {
    const service = createTransportService();
    const scheduler = createDeferredBarCountInScheduler();
    const { result } = renderHook(() =>
      useMetronomeTransport({
        settings: DEFAULT_METRONOME_SETTINGS,
        metronomeService: service,
        barCountIn: {
          enabled: true,
          plan: createBarCountInPlan(),
          schedule: scheduler.schedule
        }
      })
    );

    await act(async () => {
      await result.current.startMetronome();
      await result.current.startMetronome();
    });

    expect(scheduler.schedule).toHaveBeenCalledTimes(1);

    await act(async () => {
      scheduler.options.onComplete();
      await Promise.resolve();
    });

    expect(service.start).toHaveBeenCalledTimes(1);
  });

  it("does not create duplicate bar count-in schedulers or playback starts while playing", async () => {
    const service = createTransportService();
    const scheduler = createDeferredBarCountInScheduler();
    const { result } = renderHook(() =>
      useMetronomeTransport({
        settings: DEFAULT_METRONOME_SETTINGS,
        metronomeService: service,
        barCountIn: {
          enabled: true,
          plan: createBarCountInPlan(),
          schedule: scheduler.schedule
        }
      })
    );

    await act(async () => {
      await result.current.startMetronome();
    });

    await act(async () => {
      scheduler.options.onComplete();
      await Promise.resolve();
    });

    expect(result.current.transportState).toBe("playing");

    await act(async () => {
      await result.current.startMetronome();
    });

    expect(scheduler.schedule).toHaveBeenCalledTimes(1);
    expect(service.start).toHaveBeenCalledTimes(1);
    expect(result.current.transportState).toBe("playing");
  });
});
