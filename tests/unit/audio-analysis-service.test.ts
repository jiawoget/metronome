import { describe, expect, it } from "vitest";

import {
  analyzeDecodedRecording,
  analyzeRecordingBlob,
  derivePeaksFromBuffer,
  derivePeaksFromSamples,
  hasUsablePeaks,
  normalizePeaks,
  type AudioDecodeAdapter
} from "@/services/audio-analysis";

function createAudioBufferLike({
  samples,
  durationSeconds = 1,
  sampleRate = 8_000
}: {
  samples: Float32Array;
  durationSeconds?: number;
  sampleRate?: number;
}) {
  return {
    duration: durationSeconds,
    sampleRate,
    getChannelData: () => samples
  } as unknown as AudioBuffer;
}

describe("audio analysis service", () => {
  it("derives and normalizes fixed-count peaks from decoded samples", () => {
    expect(derivePeaksFromSamples(new Float32Array([0, 0.5, -1, 0.25]), 2)).toEqual([
      0.5,
      1
    ]);
    expect(
      derivePeaksFromBuffer(
        createAudioBufferLike({
          samples: new Float32Array([0, -0.2, 0.4, -0.8])
        }),
        4
      )
    ).toEqual([0, 0.25, 0.5, 1]);
    expect(normalizePeaks([-1, 0.25, 2])).toEqual([0, 0.25, 1]);
  });

  it("reports empty and invalid peaks as unusable", () => {
    expect(derivePeaksFromSamples(new Float32Array(), 48)).toEqual([]);
    expect(hasUsablePeaks([])).toBe(false);
    expect(hasUsablePeaks([0, 0])).toBe(false);
    expect(hasUsablePeaks([Number.NaN, 0.5])).toBe(false);
    expect(hasUsablePeaks([Number.POSITIVE_INFINITY, 0.5])).toBe(false);
    expect(hasUsablePeaks([0, 0.5])).toBe(true);
  });

  it("preserves current silence threshold behavior", () => {
    expect(
      analyzeDecodedRecording(
        createAudioBufferLike({
          samples: new Float32Array([0.009, -0.009, 0.009, -0.009])
        })
      ).isSilent
    ).toBe(true);
    const audibleAnalysis = analyzeDecodedRecording(
      createAudioBufferLike({
        samples: new Float32Array([0.02, -0.02, 0.02, -0.02])
      })
    );

    expect(audibleAnalysis.peakAmplitude).toBeCloseTo(0.02);
    expect(audibleAnalysis.isSilent).toBe(false);
  });

  it("uses an injected decode adapter and returns null on decode failure", async () => {
    const blob = new Blob(["audio"], { type: "audio/webm" });
    const decodeAdapter: AudioDecodeAdapter = {
      async decodeBlob() {
        return createAudioBufferLike({
          samples: new Float32Array([0, 0.5, -0.5, 0]),
          durationSeconds: 0.5,
          sampleRate: 4_000
        });
      }
    };
    const failingAdapter: AudioDecodeAdapter = {
      async decodeBlob() {
        throw new Error("decode failed");
      }
    };

    await expect(analyzeRecordingBlob(blob, decodeAdapter)).resolves.toMatchObject({
      decodedDurationMs: 500,
      sampleRate: 4_000,
      isSilent: false
    });
    await expect(analyzeRecordingBlob(blob, failingAdapter)).resolves.toBeNull();
  });

  it("has no wavesurfer or DOM container dependency", () => {
    expect(() =>
      derivePeaksFromSamples(new Float32Array([0.1, -0.2, 0.4]), 3)
    ).not.toThrow();
  });
});
