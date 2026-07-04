import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { BarCountInReadyPlan } from "@/domain/practice/bar-count-in";
import type { PreStartCountdownPlan } from "@/lib/quick-metronome/pre-start-countdown";
import { DEFAULT_METRONOME_SETTINGS } from "@/lib/quick-metronome/types";
import { useMetronomeTransport } from "@/lib/quick-metronome/use-metronome-transport";
import type {
  CountdownExecutor,
  CountdownExecutorOptions,
  CountdownExecutorTick
} from "@/services/metronome";

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
        sourceMeasureNumber: 1,
        isPreRoll: false,
        beatNumber: 2,
        offsetMs: -500,
        durationMs: 500,
        startsAtMs: -500
      }
    ],
    ...overrides
  };
}

function createPreStartCountdownPlan(): PreStartCountdownPlan {
  return {
    beatCount: 2,
    totalDurationMs: 1_000,
    beats: [
      {
        count: 1,
        beatNumber: 1,
        offsetMs: -1_000
      },
      {
        count: 2,
        beatNumber: 2,
        offsetMs: -500
      }
    ]
  };
}

function createCountdownTick(overrides: Partial<CountdownExecutorTick> = {}): CountdownExecutorTick {
  return {
    count: 1,
    beatNumber: 1,
    remainingBeats: 1,
    scheduledOffsetMs: -1_000,
    scheduledDelayMs: 0,
    audioTime: 12.5,
    ...overrides
  };
}

function createDeferredCountdownExecutor() {
  const runs: CountdownExecutorOptions[] = [];
  const cancel = vi.fn();
  const executor: CountdownExecutor = {
    run: vi.fn((options) => {
      runs.push(options);

      return { cancel };
    })
  };

  return {
    executor,
    cancel,
    get options() {
      const options = runs.at(-1);

      if (!options) {
        throw new Error("Countdown executor was not run");
      }

      return options;
    }
  };
}

describe("useMetronomeTransport", () => {
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

  it("runs fixed countdown beats through the countdown executor before playback", async () => {
    const service = createTransportService();
    const countdown = createDeferredCountdownExecutor();
    const onCountdownStarted = vi.fn();
    const { result } = renderHook(() =>
      useMetronomeTransport({
        settings: {
          ...DEFAULT_METRONOME_SETTINGS,
          bpm: 120,
          countdownBeats: 2
        },
        metronomeService: service,
        countdownExecutor: countdown.executor,
        onCountdownStarted
      })
    );

    await act(async () => {
      await result.current.startMetronome();
    });

    expect(onCountdownStarted).toHaveBeenCalledWith(2);
    expect(countdown.executor.run).toHaveBeenCalledWith(
      expect.objectContaining({
        bpm: 120,
        timeSignature: "4/4",
        plan: {
          beatCount: 2,
          totalDurationMs: 1_000,
          beats: [
            { count: 1, beatNumber: 1, offsetMs: -1_000 },
            { count: 2, beatNumber: 2, offsetMs: -500 }
          ]
        }
      })
    );
    expect(result.current.transportState).toBe("counting");
    expect(result.current.countdownRemaining).toBe(2);
    expect(service.start).not.toHaveBeenCalled();

    act(() => {
      countdown.options.onTick?.(createCountdownTick());
    });

    expect(result.current.countdownRemaining).toBe(1);

    await act(async () => {
      countdown.options.onComplete();
      await Promise.resolve();
    });

    expect(service.start).toHaveBeenCalledWith(
      expect.objectContaining({ countdownBeats: 2 })
    );
    expect(result.current.transportState).toBe("playing");
  });

  it("builds fixed countdown plans with denominator-aware meter timing", async () => {
    const service = createTransportService();
    const countdown = createDeferredCountdownExecutor();
    const { result } = renderHook(() =>
      useMetronomeTransport({
        settings: {
          ...DEFAULT_METRONOME_SETTINGS,
          bpm: 120,
          timeSignature: "6/8",
          countdownBeats: 2
        },
        metronomeService: service,
        countdownExecutor: countdown.executor
      })
    );

    await act(async () => {
      await result.current.startMetronome();
    });

    expect(countdown.options.plan).toEqual({
      beatCount: 2,
      totalDurationMs: 500,
      beats: [
        { count: 1, beatNumber: 1, offsetMs: -500 },
        { count: 2, beatNumber: 2, offsetMs: -250 }
      ]
    });
    expect(service.start).not.toHaveBeenCalled();
  });

  it("uses latest settings when fixed countdown finishes after BPM changes", async () => {
    const service = createTransportService();
    const countdown = createDeferredCountdownExecutor();
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
          metronomeService: service,
          countdownExecutor: countdown.executor
        }),
      { initialProps: { settings: initialSettings } }
    );

    await act(async () => {
      await result.current.startMetronome();
    });

    rerender({ settings: editedSettings });

    await act(async () => {
      countdown.options.onComplete();
      await Promise.resolve();
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

  it("runs a ready bar count-in through the countdown executor before playback", async () => {
    const service = createTransportService();
    const plan = createBarCountInPlan();
    const countdown = createDeferredCountdownExecutor();
    const onCountdownStarted = vi.fn();
    const onTick = vi.fn();
    const { result } = renderHook(() =>
      useMetronomeTransport({
        settings: DEFAULT_METRONOME_SETTINGS,
        metronomeService: service,
        countdownExecutor: countdown.executor,
        barCountIn: {
          enabled: true,
          plan,
          onTick
        },
        onCountdownStarted
      })
    );

    await act(async () => {
      await result.current.startMetronome();
    });

    expect(countdown.options.plan).toEqual({
      beatCount: 2,
      totalDurationMs: 1_000,
      beats: [
        { count: 1, beatNumber: 1, offsetMs: -1_000 },
        { count: 2, beatNumber: 2, offsetMs: -500 }
      ]
    });
    expect(onCountdownStarted).toHaveBeenCalledWith(plan.beatCount);
    expect(result.current.transportState).toBe("counting");
    expect(result.current.countdownRemaining).toBe(plan.beatCount);
    expect(service.start).not.toHaveBeenCalled();

    act(() => {
      countdown.options.onTick?.(createCountdownTick());
    });

    expect(onTick).toHaveBeenCalledWith({
      count: 1,
      beatNumber: 1,
      remainingBeats: 1,
      sourceMeasureNumber: null,
      isPreRoll: true,
      scheduledOffsetMs: -1_000,
      scheduledDelayMs: 0,
      audioTime: 12.5
    });
    expect(result.current.countdownRemaining).toBe(1);

    await act(async () => {
      countdown.options.onComplete();
      await Promise.resolve();
    });

    expect(service.start).toHaveBeenCalledWith(DEFAULT_METRONOME_SETTINGS);
    expect(result.current.transportState).toBe("playing");
    expect(result.current.countdownRemaining).toBe(0);
  });

  it("uses a ready bar count-in instead of fixed countdown beats", async () => {
    const service = createTransportService();
    const countdown = createDeferredCountdownExecutor();
    const { result } = renderHook(() =>
      useMetronomeTransport({
        settings: {
          ...DEFAULT_METRONOME_SETTINGS,
          bpm: 120,
          countdownBeats: 2
        },
        metronomeService: service,
        countdownExecutor: countdown.executor,
        barCountIn: {
          enabled: true,
          plan: createBarCountInPlan()
        }
      })
    );

    await act(async () => {
      await result.current.startMetronome();
    });

    expect(countdown.executor.run).toHaveBeenCalledTimes(1);
    expect(countdown.options.plan.totalDurationMs).toBe(1_000);
    expect(service.start).not.toHaveBeenCalled();
    expect(result.current.transportState).toBe("counting");
  });

  it("runs a generic pre-start countdown before playback", async () => {
    const service = createTransportService();
    const plan = createPreStartCountdownPlan();
    const countdown = createDeferredCountdownExecutor();
    const onCountdownStarted = vi.fn();
    const onTick = vi.fn();
    const { result } = renderHook(() =>
      useMetronomeTransport({
        settings: DEFAULT_METRONOME_SETTINGS,
        metronomeService: service,
        countdownExecutor: countdown.executor,
        preStartCountdown: {
          enabled: true,
          plan,
          onTick
        },
        onCountdownStarted
      })
    );

    await act(async () => {
      await result.current.startMetronome();
    });

    expect(countdown.options.plan).toBe(plan);
    expect(onCountdownStarted).toHaveBeenCalledWith(plan.beatCount);
    expect(result.current.transportState).toBe("counting");
    expect(service.start).not.toHaveBeenCalled();

    act(() => {
      countdown.options.onTick?.(createCountdownTick());
    });

    expect(onTick).toHaveBeenCalledWith(expect.objectContaining({ remainingBeats: 1 }));
    expect(result.current.countdownRemaining).toBe(1);

    await act(async () => {
      countdown.options.onComplete();
      await Promise.resolve();
    });

    expect(service.start).toHaveBeenCalledWith(DEFAULT_METRONOME_SETTINGS);
    expect(result.current.transportState).toBe("playing");
  });

  it("uses latest settings when generic pre-start countdown completes", async () => {
    const service = createTransportService();
    const countdown = createDeferredCountdownExecutor();
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
          countdownExecutor: countdown.executor,
          preStartCountdown: {
            enabled: true,
            plan: createPreStartCountdownPlan()
          }
        }),
      { initialProps: { settings: initialSettings } }
    );

    await act(async () => {
      await result.current.startMetronome();
    });

    rerender({ settings: editedSettings });

    await act(async () => {
      countdown.options.onComplete();
      await Promise.resolve();
    });

    expect(service.start).toHaveBeenCalledWith(editedSettings);
  });

  it("cancels generic pre-start countdown without starting playback when stopped", async () => {
    const service = createTransportService();
    const countdown = createDeferredCountdownExecutor();
    const { result } = renderHook(() =>
      useMetronomeTransport({
        settings: DEFAULT_METRONOME_SETTINGS,
        metronomeService: service,
        countdownExecutor: countdown.executor,
        preStartCountdown: {
          enabled: true,
          plan: createPreStartCountdownPlan()
        }
      })
    );

    await act(async () => {
      await result.current.startMetronome();
    });

    await act(async () => {
      await result.current.stopMetronome();
    });

    expect(countdown.cancel).toHaveBeenCalledTimes(1);
    expect(result.current.transportState).toBe("stopped");

    await act(async () => {
      countdown.options.onComplete();
      await Promise.resolve();
    });

    expect(service.start).not.toHaveBeenCalled();
  });

  it("does not create duplicate generic pre-start countdown runs", async () => {
    const service = createTransportService();
    const countdown = createDeferredCountdownExecutor();
    const { result } = renderHook(() =>
      useMetronomeTransport({
        settings: DEFAULT_METRONOME_SETTINGS,
        metronomeService: service,
        countdownExecutor: countdown.executor,
        preStartCountdown: {
          enabled: true,
          plan: createPreStartCountdownPlan()
        }
      })
    );

    await act(async () => {
      await result.current.startMetronome();
      await result.current.startMetronome();
    });

    expect(countdown.executor.run).toHaveBeenCalledTimes(1);

    await act(async () => {
      countdown.options.onComplete();
      await Promise.resolve();
    });

    expect(service.start).toHaveBeenCalledTimes(1);
  });

  it("lets bar count-in win when both pre-start modes are provided", async () => {
    const service = createTransportService();
    const countdown = createDeferredCountdownExecutor();
    const { result } = renderHook(() =>
      useMetronomeTransport({
        settings: DEFAULT_METRONOME_SETTINGS,
        metronomeService: service,
        countdownExecutor: countdown.executor,
        barCountIn: {
          enabled: true,
          plan: createBarCountInPlan()
        },
        preStartCountdown: {
          enabled: true,
          plan: createPreStartCountdownPlan()
        }
      })
    );

    await act(async () => {
      await result.current.startMetronome();
    });

    expect(countdown.executor.run).toHaveBeenCalledTimes(1);
    expect(countdown.options.plan.totalDurationMs).toBe(1_000);
    expect(result.current.transportState).toBe("counting");
  });

  it("falls back to fixed countdown when generic pre-start countdown is disabled", async () => {
    const service = createTransportService();
    const countdown = createDeferredCountdownExecutor();
    const { result } = renderHook(() =>
      useMetronomeTransport({
        settings: {
          ...DEFAULT_METRONOME_SETTINGS,
          bpm: 120,
          countdownBeats: 2
        },
        metronomeService: service,
        countdownExecutor: countdown.executor,
        preStartCountdown: {
          enabled: false,
          plan: createPreStartCountdownPlan()
        }
      })
    );

    await act(async () => {
      await result.current.startMetronome();
    });

    expect(countdown.executor.run).toHaveBeenCalledTimes(1);
    expect(countdown.options.plan.beatCount).toBe(2);

    await act(async () => {
      countdown.options.onComplete();
      await Promise.resolve();
    });

    expect(service.start).toHaveBeenCalledWith(
      expect.objectContaining({ countdownBeats: 2 })
    );
  });

  it("falls back to fixed countdown when generic pre-start countdown plan is null", async () => {
    const service = createTransportService();
    const countdown = createDeferredCountdownExecutor();
    const { result } = renderHook(() =>
      useMetronomeTransport({
        settings: {
          ...DEFAULT_METRONOME_SETTINGS,
          bpm: 120,
          countdownBeats: 2
        },
        metronomeService: service,
        countdownExecutor: countdown.executor,
        preStartCountdown: {
          plan: null
        }
      })
    );

    await act(async () => {
      await result.current.startMetronome();
    });

    expect(countdown.executor.run).toHaveBeenCalledTimes(1);
    expect(countdown.options.plan.beatCount).toBe(2);
  });

  it("cancels bar count-in without starting playback when stopped", async () => {
    const service = createTransportService();
    const countdown = createDeferredCountdownExecutor();
    const onStopped = vi.fn();
    const { result } = renderHook(() =>
      useMetronomeTransport({
        settings: DEFAULT_METRONOME_SETTINGS,
        metronomeService: service,
        countdownExecutor: countdown.executor,
        barCountIn: {
          enabled: true,
          plan: createBarCountInPlan()
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

    expect(countdown.cancel).toHaveBeenCalledTimes(1);
    expect(service.stop).toHaveBeenCalled();
    expect(onStopped).toHaveBeenCalled();
    expect(result.current.transportState).toBe("stopped");

    await act(async () => {
      countdown.options.onComplete();
      await Promise.resolve();
    });

    expect(service.start).not.toHaveBeenCalled();
  });

  it("uses latest settings when bar count-in completes after settings change", async () => {
    const service = createTransportService();
    const countdown = createDeferredCountdownExecutor();
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
          countdownExecutor: countdown.executor,
          barCountIn: {
            enabled: true,
            plan: createBarCountInPlan()
          }
        }),
      { initialProps: { settings: initialSettings } }
    );

    await act(async () => {
      await result.current.startMetronome();
    });

    rerender({ settings: editedSettings });

    await act(async () => {
      countdown.options.onComplete();
      await Promise.resolve();
    });

    expect(service.start).toHaveBeenCalledWith(editedSettings);
    expect(result.current.transportState).toBe("playing");
  });

  it("does not create duplicate bar count-in runs from repeated starts while counting", async () => {
    const service = createTransportService();
    const countdown = createDeferredCountdownExecutor();
    const { result } = renderHook(() =>
      useMetronomeTransport({
        settings: DEFAULT_METRONOME_SETTINGS,
        metronomeService: service,
        countdownExecutor: countdown.executor,
        barCountIn: {
          enabled: true,
          plan: createBarCountInPlan()
        }
      })
    );

    await act(async () => {
      await result.current.startMetronome();
      await result.current.startMetronome();
    });

    expect(countdown.executor.run).toHaveBeenCalledTimes(1);

    await act(async () => {
      countdown.options.onComplete();
      await Promise.resolve();
    });

    expect(service.start).toHaveBeenCalledTimes(1);
  });

  it("does not create duplicate bar count-in runs or playback starts while playing", async () => {
    const service = createTransportService();
    const countdown = createDeferredCountdownExecutor();
    const { result } = renderHook(() =>
      useMetronomeTransport({
        settings: DEFAULT_METRONOME_SETTINGS,
        metronomeService: service,
        countdownExecutor: countdown.executor,
        barCountIn: {
          enabled: true,
          plan: createBarCountInPlan()
        }
      })
    );

    await act(async () => {
      await result.current.startMetronome();
    });

    await act(async () => {
      countdown.options.onComplete();
      await Promise.resolve();
    });

    expect(result.current.transportState).toBe("playing");

    await act(async () => {
      await result.current.startMetronome();
    });

    expect(countdown.executor.run).toHaveBeenCalledTimes(1);
    expect(service.start).toHaveBeenCalledTimes(1);
    expect(result.current.transportState).toBe("playing");
  });

  it("rolls back counting state when countdown executor startup fails", async () => {
    const service = createTransportService();
    const countdown = createDeferredCountdownExecutor();
    const onStartFailed = vi.fn();
    const error = new Error("Tone unavailable");
    const { result } = renderHook(() =>
      useMetronomeTransport({
        settings: {
          ...DEFAULT_METRONOME_SETTINGS,
          countdownBeats: 2
        },
        metronomeService: service,
        countdownExecutor: countdown.executor,
        onStartFailed
      })
    );

    await act(async () => {
      await result.current.startMetronome();
    });
    await act(async () => {
      countdown.options.onError?.(error);
      await Promise.resolve();
    });

    expect(service.stop).toHaveBeenCalled();
    expect(onStartFailed).toHaveBeenCalledWith(error, null);
    expect(result.current.transportState).toBe("stopped");
    expect(result.current.countdownRemaining).toBe(0);
  });
});
