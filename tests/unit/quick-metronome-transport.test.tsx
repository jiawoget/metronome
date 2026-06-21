import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_METRONOME_SETTINGS } from "@/lib/quick-metronome/types";
import { useMetronomeTransport } from "@/lib/quick-metronome/use-metronome-transport";

function createTransportService() {
  return {
    update: vi.fn(),
    start: vi.fn(async () => undefined),
    stop: vi.fn()
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
});
