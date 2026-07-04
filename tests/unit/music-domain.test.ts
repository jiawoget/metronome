import { describe, expect, it } from "vitest";

import {
  SUPPORTED_SUBDIVISIONS,
  SUPPORTED_TIME_SIGNATURES,
  getMusicBeatDurationMs,
  getMusicDurationForDenominator,
  getMusicTimeSignatureParts,
  isSupportedSubdivision,
  isSupportedTimeSignature,
  parseMusicDuration,
  parseMusicTimeSignature
} from "@/domain/music";

describe("music domain facade", () => {
  it("keeps the repo-owned product meter policy exact", () => {
    expect(SUPPORTED_TIME_SIGNATURES).toEqual(["2/4", "3/4", "4/4", "6/8", "12/8"]);
    expect(SUPPORTED_SUBDIVISIONS).toEqual(["quarter", "eighth", "triplet", "sixteenth"]);

    for (const timeSignature of SUPPORTED_TIME_SIGNATURES) {
      expect(isSupportedTimeSignature(timeSignature)).toBe(true);
    }
    for (const subdivision of SUPPORTED_SUBDIVISIONS) {
      expect(isSupportedSubdivision(subdivision)).toBe(true);
    }
  });

  it("parses current supported signatures through TonalJS", () => {
    expect(getMusicTimeSignatureParts("2/4")).toEqual({ numerator: 2, denominator: 4 });
    expect(getMusicTimeSignatureParts("3/4")).toEqual({ numerator: 3, denominator: 4 });
    expect(getMusicTimeSignatureParts("4/4")).toEqual({ numerator: 4, denominator: 4 });
    expect(getMusicTimeSignatureParts("6/8")).toEqual({ numerator: 6, denominator: 8 });
    expect(getMusicTimeSignatureParts("12/8")).toEqual({ numerator: 12, denominator: 8 });
    expect(parseMusicTimeSignature("6/8")).toMatchObject({
      name: "6/8",
      numerator: 6,
      denominator: 8,
      type: "compound",
      additive: []
    });
  });

  it("does not turn TonalJS's broader parsing into product support", () => {
    expect(parseMusicTimeSignature("5/4")).toMatchObject({
      numerator: 5,
      denominator: 4,
      type: "simple"
    });
    expect(parseMusicTimeSignature("3+2+3/8")).toMatchObject({
      numerator: 8,
      denominator: 8,
      type: "irregular",
      additive: [3, 2, 3]
    });
    expect(parseMusicTimeSignature("12/10")).toMatchObject({
      numerator: 12,
      denominator: 10,
      type: "irrational"
    });

    for (const unsupported of ["5/4", "3+2+3/8", "12/10", "bad", "", null, 42]) {
      expect(isSupportedTimeSignature(unsupported)).toBe(false);
    }
    expect(parseMusicTimeSignature("bad")).toBeNull();
    expect(parseMusicTimeSignature(null)).toBeNull();
  });

  it("derives denominator durations through TonalJS duration values", () => {
    expect(parseMusicDuration("quarter")).toMatchObject({
      value: 0.25,
      fraction: [1, 4],
      shorthand: "q"
    });
    expect(getMusicDurationForDenominator(4)).toMatchObject({
      name: "quarter",
      fraction: [1, 4]
    });
    expect(getMusicDurationForDenominator(8)).toMatchObject({
      name: "eighth",
      fraction: [1, 8]
    });
    expect(getMusicBeatDurationMs({ bpm: 120, denominator: 4 })).toBe(500);
    expect(getMusicBeatDurationMs({ bpm: 120, denominator: 8 })).toBe(250);
    expect(parseMusicDuration("8t")).toBeNull();
    expect(() => getMusicDurationForDenominator(10)).toThrow(/denominator/);
  });
});
