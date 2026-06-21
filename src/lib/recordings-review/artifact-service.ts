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

function getAudioContextConstructor() {
  if (typeof window === "undefined") {
    return null;
  }

  const audioWindow = window as Window &
    typeof globalThis & { webkitAudioContext?: typeof AudioContext };

  return audioWindow.AudioContext || audioWindow.webkitAudioContext || null;
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
  if (recording.trustedPeaks && recording.trustedPeaks.length > 0) {
    return {
      recordingId: recording.id,
      decodedDurationMs: recording.artifactAnalysis?.decodedDurationMs ?? recording.durationMs,
      peaks: recording.trustedPeaks.map((peak) => Math.max(0, Math.min(1, peak))),
      source: "trusted-peaks"
    };
  }

  if (!recording.audioDataUrl) {
    throw new RecordingArtifactError("This recording has no accessible audio artifact.");
  }

  const audioBuffer = await decodeAudioDataUrl(recording.audioDataUrl);
  const peaks = derivePeaksFromSamples(audioBuffer.getChannelData(0));

  if (peaks.length === 0 || Math.max(...peaks) <= 0) {
    throw new RecordingArtifactError("This recording artifact decoded as empty audio.");
  }

  return {
    recordingId: recording.id,
    decodedDurationMs: audioBuffer.duration * 1_000,
    peaks,
    source: "decoded-audio"
  };
}
