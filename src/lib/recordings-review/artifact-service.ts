import type {
  RecordingArtifactDetails,
  ReviewRecording
} from "@/lib/recordings-review/types";

export class RecordingArtifactError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RecordingArtifactError";
  }
}

const MIN_DURATION_TOLERANCE_MS = 250;
const DURATION_TOLERANCE_RATIO = 0.1;

function getAudioContextConstructor() {
  if (typeof window === "undefined") {
    return null;
  }

  const audioWindow = window as Window &
    typeof globalThis & { webkitAudioContext?: typeof AudioContext };

  return audioWindow.AudioContext || audioWindow.webkitAudioContext || null;
}

export function getDurationWarning({
  decodedDurationMs,
  metadataDurationMs
}: {
  decodedDurationMs: number;
  metadataDurationMs: number;
}) {
  const durationDifferenceMs = Math.abs(decodedDurationMs - metadataDurationMs);
  const toleranceMs = Math.max(MIN_DURATION_TOLERANCE_MS, metadataDurationMs * DURATION_TOLERANCE_RATIO);

  if (durationDifferenceMs <= toleranceMs) {
    return null;
  }

  return `Decoded audio duration (${(decodedDurationMs / 1_000).toFixed(1)}s) differs from saved metadata (${(metadataDurationMs / 1_000).toFixed(1)}s).`;
}

function normalizeTrustedPeaks(peaks: number[]) {
  return peaks.map((peak) => Math.max(0, Math.min(1, peak)));
}

export function hasUsablePeaks(peaks: number[]) {
  return peaks.length > 0 && peaks.every((peak) => Number.isFinite(peak)) && peaks.some((peak) => peak > 0);
}

export function derivePeaksFromSamples(samples: Float32Array, peakCount = 48) {
  if (samples.length === 0) {
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

  return maxPeak > 0 ? peaks.map((peak) => Number((peak / maxPeak).toFixed(4))) : peaks;
}

async function decodeAudioDataUrl(audioDataUrl: string) {
  const AudioContextConstructor = getAudioContextConstructor();

  if (!AudioContextConstructor) {
    throw new RecordingArtifactError("Audio decoding is not available in this browser.");
  }

  try {
    const response = await fetch(audioDataUrl);
    const arrayBuffer = await response.arrayBuffer();
    const audioContext = new AudioContextConstructor();

    try {
      return await audioContext.decodeAudioData(arrayBuffer.slice(0));
    } finally {
      void audioContext.close();
    }
  } catch {
    throw new RecordingArtifactError("This recording artifact is missing or cannot be decoded.");
  }
}

export async function loadRecordingArtifactDetails(
  recording: ReviewRecording
): Promise<RecordingArtifactDetails> {
  if (!recording.audioDataUrl) {
    throw new RecordingArtifactError("This recording has no accessible audio artifact.");
  }

  const audioBuffer = await decodeAudioDataUrl(recording.audioDataUrl);
  const decodedPeaks = derivePeaksFromSamples(audioBuffer.getChannelData(0));

  if (decodedPeaks.length === 0 || Math.max(...decodedPeaks) <= 0) {
    throw new RecordingArtifactError("This recording artifact decoded as empty audio.");
  }

  const decodedDurationMs = audioBuffer.duration * 1_000;
  const trustedPeaks = recording.trustedPeaks;
  const useTrustedPeaks = !!trustedPeaks && trustedPeaks.length > 0;

  if (useTrustedPeaks && !trustedPeaks.every((peak) => Number.isFinite(peak))) {
    throw new RecordingArtifactError("This recording has invalid waveform peak data.");
  }

  const normalizedTrustedPeaks = useTrustedPeaks ? normalizeTrustedPeaks(trustedPeaks) : [];

  if (useTrustedPeaks && !hasUsablePeaks(normalizedTrustedPeaks)) {
    throw new RecordingArtifactError("This recording has invalid waveform peak data.");
  }

  const durationWarning = getDurationWarning({
    decodedDurationMs,
    metadataDurationMs: recording.durationMs
  });

  return {
    recordingId: recording.id,
    decodedDurationMs,
    metadataDurationMs: recording.durationMs,
    durationDifferenceMs: Math.abs(decodedDurationMs - recording.durationMs),
    durationWarning,
    peaks: useTrustedPeaks ? normalizedTrustedPeaks : decodedPeaks,
    source: useTrustedPeaks ? "trusted-peaks" : "decoded-audio"
  };
}
