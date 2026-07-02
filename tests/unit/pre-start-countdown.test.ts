import { afterEach, describe, expect, it, vi } from "vitest";

import type { BarCountInReadyPlan } from "@/domain/practice/bar-count-in";
import {
  getQuickAdvancedCountdownPlan,
  schedulePreStartCountdown,
  toPreStartCountdownPlan,
  type PreStartCountdownPlan
} from "@/lib/quick-metronome/pre-start-countdown";

function createPlan(overrides: Partial<PreStartCountdownPlan> = {}): PreStartCountdownPlan {
  return {
    beatCount: 3,
    totalDurationMs: 7.25,
    beats: [
      {
        count: 1,
        beatNumber: 1,
        offsetMs: -12.75
      },
      {
        count: 2,
        beatNumber: 2,
        offsetMs: -12.25
      },
      {
        count: 3,
        beatNumber: 3,
        offsetMs: -10
      }
    ],
    ...overrides
  };
}

function createBarCountInPlan(): BarCountInReadyPlan {
  return {
    status: "ready",
    scope: "selected-segment",
    startMeasure: 5,
    startMs: 8_000,
    beatCount: 2,
    totalDurationMs: 1_000,
    beatDurationMs: 500,
    beatsPerMeasure: 2,
    timeSignature: "2/4",
    pickupBeats: 0,
    segmentId: "segment-alpha",
    segmentName: "Bridge",
    segmentRange: {
      startMeasure: 5,
      endMeasure: 8
    },
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
        sourceMeasureNumber: 4,
        isPreRoll: false,
        beatNumber: 2,
        offsetMs: -500,
        durationMs: 500,
        startsAtMs: 7_500
      }
    ]
  };
}

describe("pre-start countdown", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("schedules ticks from beat offsets and completion from totalDurationMs", () => {
    const setTimeout = vi.fn((callback: () => void, delay?: number) => {
      return window.setTimeout(callback, delay);
    });
    const clearTimeout = vi.fn(window.clearTimeout);

    const scheduled = schedulePreStartCountdown({
      plan: createPlan(),
      setTimeout,
      clearTimeout,
      onComplete: vi.fn()
    });

    expect(setTimeout.mock.calls.map(([, delay]) => delay)).toEqual([0, 0.5, 2.75, 7.25]);

    scheduled.cancel();
  });

  it("cancel prevents future ticks and completion", async () => {
    vi.useFakeTimers();

    const onTick = vi.fn();
    const onComplete = vi.fn();
    const clearTimeoutSpy = vi.spyOn(window, "clearTimeout");

    const scheduled = schedulePreStartCountdown({
      plan: {
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
      },
      onTick,
      onComplete
    });

    await vi.advanceTimersByTimeAsync(0);
    scheduled.cancel();
    await vi.advanceTimersByTimeAsync(1_000);

    expect(onTick).toHaveBeenCalledOnce();
    expect(onComplete).not.toHaveBeenCalled();
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(3);
  });

  it("rejects invalid scheduler plans", () => {
    expect(() =>
      schedulePreStartCountdown({
        plan: createPlan({ beats: [] }),
        onComplete: vi.fn()
      })
    ).toThrow(/without beats/);
    expect(() =>
      schedulePreStartCountdown({
        plan: createPlan({ beatCount: 0 }),
        onComplete: vi.fn()
      })
    ).toThrow(/positive beat count/);
    expect(() =>
      schedulePreStartCountdown({
        plan: createPlan({ totalDurationMs: Number.POSITIVE_INFINITY }),
        onComplete: vi.fn()
      })
    ).toThrow(/positive duration/);
  });

  it("adapts bar count-in plans to neutral countdown fields", () => {
    expect(toPreStartCountdownPlan(createBarCountInPlan())).toEqual({
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
    });
  });

  it("builds quick beat countdown plans with meter-cycling beat numbers", () => {
    expect(
      getQuickAdvancedCountdownPlan({
        mode: "beats",
        count: 4,
        bpm: 120,
        timeSignature: "4/4"
      })
    ).toEqual({
      beatCount: 4,
      totalDurationMs: 2_000,
      beats: [
        { count: 1, beatNumber: 1, offsetMs: -2_000 },
        { count: 2, beatNumber: 2, offsetMs: -1_500 },
        { count: 3, beatNumber: 3, offsetMs: -1_000 },
        { count: 4, beatNumber: 4, offsetMs: -500 }
      ]
    });

    expect(
      getQuickAdvancedCountdownPlan({
        mode: "beats",
        count: 5,
        bpm: 120,
        timeSignature: "3/4"
      }).beats.map((beat) => beat.beatNumber)
    ).toEqual([1, 2, 3, 1, 2]);
  });

  it("builds quick measure countdown plans from the meter numerator", () => {
    const plan = getQuickAdvancedCountdownPlan({
      mode: "measures",
      count: 2,
      bpm: 90,
      timeSignature: "3/4"
    });

    expect(plan.beatCount).toBe(6);
    expect(plan.totalDurationMs).toBeCloseTo(4_000);
    expect(plan.beats.at(0)?.offsetMs).toBeCloseTo(-4_000);
    expect(plan.beats.at(-1)?.offsetMs).toBeCloseTo(-2_000 / 3);
  });

  it("uses denominator-aware timing for compound meters", () => {
    expect(
      getQuickAdvancedCountdownPlan({
        mode: "measures",
        count: 1,
        bpm: 120,
        timeSignature: "6/8"
      }).totalDurationMs
    ).toBe(1_500);
    expect(
      getQuickAdvancedCountdownPlan({
        mode: "measures",
        count: 1,
        bpm: 120,
        timeSignature: "12/8"
      }).totalDurationMs
    ).toBe(3_000);
  });

  it("rejects invalid quick countdown input", () => {
    for (const count of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() =>
        getQuickAdvancedCountdownPlan({
          mode: "beats",
          count,
          bpm: 120,
          timeSignature: "4/4"
        })
      ).toThrow(/positive integer/);
    }

    expect(() =>
      getQuickAdvancedCountdownPlan({
        mode: "beats",
        count: 4,
        bpm: Number.NaN,
        timeSignature: "4/4"
      })
    ).toThrow(/BPM/);
    expect(() =>
      getQuickAdvancedCountdownPlan({
        mode: "beats",
        count: 4,
        bpm: 120,
        timeSignature: "5/4" as "4/4"
      })
    ).toThrow(/time signature/);
  });
});
