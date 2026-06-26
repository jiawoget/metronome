import { describe, expect, it } from "vitest";

import {
  calculateTapTempo,
  clampBpm,
  commitBpmDraft,
  getTickIntervalMs,
  isAccentTick,
  parseAccentMode,
  parseCountdownBeats,
  parseSubdivision,
  parseTimeSignature,
  stepBpm
} from "@/lib/quick-metronome/control";
import { DEFAULT_METRONOME_SETTINGS } from "@/lib/quick-metronome/types";

describe("quick metronome controls", () => {
  it("clamps BPM to the v0 range and steps by one", () => {
    expect(clampBpm(12)).toBe(30);
    expect(clampBpm(400)).toBe(240);
    expect(clampBpm(97.4)).toBe(97);
    expect(stepBpm(30, -1)).toBe(30);
    expect(stepBpm(239, 1)).toBe(240);
  });

  it("commits BPM draft values only when requested", () => {
    expect(commitBpmDraft("6", 96)).toBe(30);
    expect(commitBpmDraft("60", 96)).toBe(60);
    expect(commitBpmDraft("", 96)).toBe(96);
    expect(commitBpmDraft("999", 96)).toBe(240);
  });

  it("validates time signature, subdivision, accent, and countdown selections", () => {
    expect(parseTimeSignature("3/4")).toBe("3/4");
    expect(parseTimeSignature("5/4")).toBe(DEFAULT_METRONOME_SETTINGS.timeSignature);
    expect(parseSubdivision("triplet")).toBe("triplet");
    expect(parseSubdivision("quintuplet")).toBe(DEFAULT_METRONOME_SETTINGS.subdivision);
    expect(parseAccentMode("every-beat")).toBe("every-beat");
    expect(parseAccentMode("random")).toBe(DEFAULT_METRONOME_SETTINGS.accent);
    expect(parseCountdownBeats("8")).toBe(8);
    expect(parseCountdownBeats("3")).toBe(0);
  });

  it("calculates deterministic tap tempo from recent tap intervals", () => {
    expect(calculateTapTempo([0])).toBeNull();
    expect(calculateTapTempo([0, 500, 1_000, 1_500])).toBe(120);
    expect(calculateTapTempo([0, 1_000, 2_000])).toBe(60);
    expect(calculateTapTempo([0, 100])).toBeNull();
  });

  it("derives timing and accent behavior from meter settings", () => {
    expect(Math.round(getTickIntervalMs({ bpm: 120, timeSignature: "4/4", subdivision: "quarter" }))).toBe(500);
    expect(Math.round(getTickIntervalMs({ bpm: 120, timeSignature: "4/4", subdivision: "eighth" }))).toBe(250);
    expect(Math.round(getTickIntervalMs({ bpm: 120, timeSignature: "6/8", subdivision: "quarter" }))).toBe(250);

    expect(
      isAccentTick(0, {
        timeSignature: "4/4",
        subdivision: "quarter",
        accent: "downbeat"
      })
    ).toBe(true);
    expect(
      isAccentTick(1, {
        timeSignature: "4/4",
        subdivision: "quarter",
        accent: "downbeat"
      })
    ).toBe(false);
    expect(
      isAccentTick(2, {
        timeSignature: "4/4",
        subdivision: "eighth",
        accent: "every-beat"
      })
    ).toBe(true);
    expect(
      isAccentTick(0, {
        timeSignature: "3/4",
        subdivision: "quarter",
        accent: "off"
      })
    ).toBe(false);
    expect(
      isAccentTick(6, {
        timeSignature: "6/8",
        subdivision: "quarter",
        accent: "downbeat"
      })
    ).toBe(true);
  });
});
