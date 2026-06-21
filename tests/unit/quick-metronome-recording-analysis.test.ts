import { describe, expect, it } from "vitest";

import { analyzeDecodedRecording } from "@/lib/quick-metronome/recording-service";

function createAudioBufferLike({
  frequencyHz,
  durationSeconds,
  sampleRate,
  amplitude
}: {
  frequencyHz: number;
  durationSeconds: number;
  sampleRate: number;
  amplitude: number;
}) {
  const length = Math.round(durationSeconds * sampleRate);
  const channelData = new Float32Array(length);

  for (let index = 0; index < length; index += 1) {
    channelData[index] = amplitude * Math.sin((2 * Math.PI * frequencyHz * index) / sampleRate);
  }

  return {
    duration: durationSeconds,
    sampleRate,
    getChannelData: () => channelData
  } as unknown as AudioBuffer;
}

describe("recording artifact analysis", () => {
  it("detects decoded synthetic input frequency and amplitude", () => {
    const analysis = analyzeDecodedRecording(
      createAudioBufferLike({
        frequencyHz: 440,
        durationSeconds: 0.8,
        sampleRate: 48_000,
        amplitude: 0.25
      })
    );

    expect(analysis.decodedDurationMs).toBeCloseTo(800, 0);
    expect(analysis.rmsAmplitude).toBeGreaterThan(0.15);
    expect(analysis.peakAmplitude).toBeGreaterThan(0.24);
    expect(analysis.estimatedFrequencyHz).toBeGreaterThan(435);
    expect(analysis.estimatedFrequencyHz).toBeLessThan(445);
    expect(analysis.isSilent).toBe(false);
  });

  it("marks silent decoded content as silent", () => {
    const analysis = analyzeDecodedRecording(
      createAudioBufferLike({
        frequencyHz: 440,
        durationSeconds: 0.8,
        sampleRate: 48_000,
        amplitude: 0
      })
    );

    expect(analysis.rmsAmplitude).toBe(0);
    expect(analysis.peakAmplitude).toBe(0);
    expect(analysis.isSilent).toBe(true);
  });
});
