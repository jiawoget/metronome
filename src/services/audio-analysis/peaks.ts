export const DEFAULT_AUDIO_PEAK_COUNT = 48;

export function normalizePeaks(peaks: number[]) {
  return peaks.map((peak) => Math.max(0, Math.min(1, peak)));
}

export function hasUsablePeaks(peaks: number[]) {
  return (
    peaks.length > 0 &&
    peaks.every((peak) => Number.isFinite(peak)) &&
    peaks.some((peak) => peak > 0)
  );
}

export function derivePeaksFromSamples(
  samples: Float32Array,
  peakCount = DEFAULT_AUDIO_PEAK_COUNT
) {
  if (samples.length === 0 || peakCount <= 0) {
    return [];
  }

  const peaks: number[] = [];
  const bucketSize = Math.max(1, Math.floor(samples.length / peakCount));

  for (let peakIndex = 0; peakIndex < peakCount; peakIndex += 1) {
    const start = peakIndex * bucketSize;
    const end = Math.min(samples.length, start + bucketSize);
    let peak = 0;

    for (let index = start; index < end; index += 1) {
      peak = Math.max(peak, Math.abs(samples[index] ?? 0));
    }

    peaks.push(Number(peak.toFixed(4)));
  }

  const maxPeak = Math.max(...peaks, 0);

  return maxPeak > 0
    ? peaks.map((peak) => Number((peak / maxPeak).toFixed(4)))
    : peaks;
}

export function derivePeaksFromBuffer(
  audioBuffer: AudioBuffer,
  peakCount = DEFAULT_AUDIO_PEAK_COUNT
) {
  return derivePeaksFromSamples(audioBuffer.getChannelData(0), peakCount);
}
