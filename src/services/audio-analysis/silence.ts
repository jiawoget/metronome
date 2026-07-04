import type {
  AudioDecodeAdapter,
  RecordingArtifactAnalysis
} from "@/services/audio-analysis/types";
import { decodeAudioBlob } from "@/services/audio-analysis/decode";

const SILENT_RMS_THRESHOLD = 0.005;
const SILENT_PEAK_THRESHOLD = 0.01;

export function analyzeDecodedRecording(
  audioBuffer: AudioBuffer
): RecordingArtifactAnalysis {
  const channelData = audioBuffer.getChannelData(0);
  let peakAmplitude = 0;
  let sumSquares = 0;
  let positiveZeroCrossings = 0;
  let previousSample = channelData[0] ?? 0;

  for (let index = 0; index < channelData.length; index += 1) {
    const sample = channelData[index] ?? 0;
    const absoluteSample = Math.abs(sample);

    peakAmplitude = Math.max(peakAmplitude, absoluteSample);
    sumSquares += sample * sample;

    if (previousSample < 0 && sample >= 0) {
      positiveZeroCrossings += 1;
    }

    previousSample = sample;
  }

  const rmsAmplitude = Math.sqrt(sumSquares / Math.max(1, channelData.length));
  const decodedDurationMs = audioBuffer.duration * 1_000;
  const estimatedFrequencyHz =
    decodedDurationMs > 0
      ? positiveZeroCrossings / (decodedDurationMs / 1_000)
      : null;

  return {
    decodedDurationMs,
    sampleRate: audioBuffer.sampleRate,
    peakAmplitude,
    rmsAmplitude,
    estimatedFrequencyHz,
    isSilent:
      rmsAmplitude < SILENT_RMS_THRESHOLD ||
      peakAmplitude < SILENT_PEAK_THRESHOLD
  };
}

export async function analyzeRecordingBlob(
  blob: Blob,
  adapter: AudioDecodeAdapter
): Promise<RecordingArtifactAnalysis | null> {
  try {
    return analyzeDecodedRecording(await decodeAudioBlob(blob, adapter));
  } catch {
    return null;
  }
}
