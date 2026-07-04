import { describe, expect, it } from "vitest";

import type { BarCountInReadyPlan } from "@/domain/practice/bar-count-in";
import {
  getQuickAdvancedCountdownPlan,
  toPreStartCountdownPlan
} from "@/lib/quick-metronome/pre-start-countdown";

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
