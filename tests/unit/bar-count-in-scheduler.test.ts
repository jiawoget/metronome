import { afterEach, describe, expect, it, vi } from "vitest";

import type { BarCountInPlan, BarCountInReadyPlan } from "@/domain/practice/bar-count-in";
import { scheduleBarCountIn } from "@/lib/quick-metronome/bar-count-in-scheduler";

function buildReadyPlan(overrides: Partial<BarCountInReadyPlan> = {}): BarCountInReadyPlan {
  const beats: BarCountInReadyPlan["beats"] = [
    {
      count: 1,
      sourceMeasureNumber: null,
      isPreRoll: true,
      beatNumber: 1,
      offsetMs: -2_000,
      durationMs: Number.NaN,
      startsAtMs: -2_000
    },
    {
      count: 2,
      sourceMeasureNumber: null,
      isPreRoll: true,
      beatNumber: 2,
      offsetMs: -1_500,
      durationMs: Number.NaN,
      startsAtMs: -1_500
    },
    {
      count: 3,
      sourceMeasureNumber: null,
      isPreRoll: true,
      beatNumber: 3,
      offsetMs: -1_000,
      durationMs: Number.NaN,
      startsAtMs: -1_000
    },
    {
      count: 4,
      sourceMeasureNumber: null,
      isPreRoll: true,
      beatNumber: 4,
      offsetMs: -500,
      durationMs: Number.NaN,
      startsAtMs: -500
    }
  ];

  return {
    status: "ready",
    scope: "whole-sheet",
    startMeasure: 1,
    startMs: 0,
    beatCount: beats.length,
    totalDurationMs: 2_000,
    beatDurationMs: Number.NaN,
    beatsPerMeasure: 4,
    timeSignature: "4/4",
    pickupBeats: 0,
    segmentId: null,
    segmentName: null,
    segmentRange: null,
    beats,
    ...overrides
  };
}

describe("bar count-in scheduler", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("schedules every tick from beat offsets normalized to the first beat", async () => {
    vi.useFakeTimers();

    const onTick = vi.fn();
    const onComplete = vi.fn();

    scheduleBarCountIn({
      plan: buildReadyPlan(),
      onTick,
      onComplete
    });

    await vi.advanceTimersByTimeAsync(0);

    expect(onTick).toHaveBeenCalledWith({
      count: 1,
      beatNumber: 1,
      remainingBeats: 3,
      sourceMeasureNumber: null,
      isPreRoll: true,
      scheduledOffsetMs: -2_000,
      scheduledDelayMs: 0
    });

    await vi.advanceTimersByTimeAsync(500);

    expect(onTick).toHaveBeenLastCalledWith({
      count: 2,
      beatNumber: 2,
      remainingBeats: 2,
      sourceMeasureNumber: null,
      isPreRoll: true,
      scheduledOffsetMs: -1_500,
      scheduledDelayMs: 500
    });

    await vi.advanceTimersByTimeAsync(1_500);

    expect(onTick).toHaveBeenCalledTimes(4);
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it("preserves fractional offset-derived delays and completes from totalDurationMs", () => {
    const setTimeout = vi.fn((callback: () => void, delay?: number) => {
      return window.setTimeout(callback, delay);
    });
    const clearTimeout = vi.fn(window.clearTimeout);
    const plan = buildReadyPlan({
      totalDurationMs: 7.25,
      beatDurationMs: 999_999,
      beats: [
        {
          count: 1,
          sourceMeasureNumber: 4,
          isPreRoll: false,
          beatNumber: 1,
          offsetMs: -12.75,
          durationMs: 999_999,
          startsAtMs: 387.25
        },
        {
          count: 2,
          sourceMeasureNumber: 4,
          isPreRoll: false,
          beatNumber: 2,
          offsetMs: -12.25,
          durationMs: 999_999,
          startsAtMs: 387.75
        },
        {
          count: 3,
          sourceMeasureNumber: 4,
          isPreRoll: false,
          beatNumber: 3,
          offsetMs: -10,
          durationMs: 999_999,
          startsAtMs: 390
        }
      ]
    });

    const scheduled = scheduleBarCountIn({
      plan,
      setTimeout,
      clearTimeout,
      onComplete: vi.fn()
    });

    expect(setTimeout.mock.calls.map(([, delay]) => delay)).toEqual([0, 0.5, 2.75, 7.25]);

    scheduled.cancel();
  });

  it("preserves bar count-in presentation metadata on wrapper ticks", async () => {
    vi.useFakeTimers();

    const onTick = vi.fn();

    scheduleBarCountIn({
      plan: buildReadyPlan({
        beats: [
          {
            count: 1,
            sourceMeasureNumber: 4,
            isPreRoll: false,
            beatNumber: 1,
            offsetMs: -1_000,
            durationMs: 500,
            startsAtMs: 7_000
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
        beatCount: 2,
        totalDurationMs: 1_000
      }),
      onTick,
      onComplete: vi.fn()
    });

    await vi.advanceTimersByTimeAsync(500);

    expect(onTick).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        sourceMeasureNumber: 4,
        isPreRoll: false
      })
    );
    expect(onTick).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        sourceMeasureNumber: null,
        isPreRoll: true
      })
    );
  });

  it("cancel clears pending timers and prevents future ticks and completion", async () => {
    vi.useFakeTimers();

    const onTick = vi.fn();
    const onComplete = vi.fn();
    const clearTimeoutSpy = vi.spyOn(window, "clearTimeout");

    const scheduler = scheduleBarCountIn({
      plan: buildReadyPlan(),
      onTick,
      onComplete
    });

    await vi.advanceTimersByTimeAsync(0);
    scheduler.cancel();
    await vi.advanceTimersByTimeAsync(2_000);

    expect(onTick).toHaveBeenCalledOnce();
    expect(onComplete).not.toHaveBeenCalled();
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(5);
  });

  it("refuses non-ready plans", () => {
    const plan: BarCountInPlan = {
      status: "segment-grid-stale",
      scope: "selected-segment",
      startMeasure: 5,
      startMs: 8_000,
      beatCount: 0,
      totalDurationMs: 0,
      beatDurationMs: 0,
      beatsPerMeasure: 4,
      timeSignature: "4/4",
      pickupBeats: 0,
      segmentId: "segment-alpha",
      segmentName: "Bridge",
      segmentRange: {
        startMeasure: 5,
        endMeasure: 8
      },
      beats: []
    };

    expect(() =>
      scheduleBarCountIn({
        plan,
        onComplete: vi.fn()
      })
    ).toThrow(/segment-grid-stale/);
  });
});
