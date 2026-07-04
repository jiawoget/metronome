import type {
  RecordingArtifactDetails,
  ReviewRecording
} from "@/lib/recordings-review/types";
import { RecordingArtifactError } from "@/lib/recordings-review/artifact-model";
import { resolveRecordingArtifactBody } from "@/lib/recordings-review/artifact-storage";
import { createBrowserAudioDecodeAdapter } from "@/infrastructure/audio/browser-audio-decode-adapter";
import {
  AudioDecodeError,
  decodeAudioBlob,
  derivePeaksFromBuffer,
  hasUsablePeaks,
  normalizePeaks,
  type AudioDecodeAdapter
} from "@/services/audio-analysis";

const MIN_DURATION_TOLERANCE_MS = 250;
const DURATION_TOLERANCE_RATIO = 0.1;

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

async function decodeRecordingArtifactBlob(
  blob: Blob,
  adapter: AudioDecodeAdapter
) {
  try {
    return await decodeAudioBlob(blob, adapter);
  } catch (error) {
    if (error instanceof AudioDecodeError && error.reason === "unavailable") {
      throw new RecordingArtifactError(
        "Audio decoding is not available in this browser.",
        "decode-failed"
      );
    }

    throw new RecordingArtifactError(
      "This recording artifact could not be decoded locally and cannot be decoded.",
      "decode-failed"
    );
  }
}

export async function loadRecordingArtifactDetailsFromBody({
  recordingId,
  blob,
  metadataDurationMs,
  trustedPeaks,
  decodeAdapter = createBrowserAudioDecodeAdapter()
}: {
  recordingId: string;
  blob: Blob;
  metadataDurationMs: number;
  trustedPeaks?: number[];
  decodeAdapter?: AudioDecodeAdapter;
}): Promise<RecordingArtifactDetails> {
  const audioBuffer = await decodeRecordingArtifactBlob(blob, decodeAdapter);
  const decodedPeaks = derivePeaksFromBuffer(audioBuffer);

  if (decodedPeaks.length === 0 || Math.max(...decodedPeaks) <= 0) {
    throw new RecordingArtifactError(
      "This recording artifact decoded as empty audio.",
      "empty-audio"
    );
  }

  const decodedDurationMs = audioBuffer.duration * 1_000;
  const useTrustedPeaks = !!trustedPeaks && trustedPeaks.length > 0;

  if (useTrustedPeaks && !trustedPeaks.every((peak) => Number.isFinite(peak))) {
    throw new RecordingArtifactError(
      "This recording has invalid waveform peak data.",
      "decode-failed"
    );
  }

  const normalizedTrustedPeaks = useTrustedPeaks ? normalizePeaks(trustedPeaks) : [];

  if (useTrustedPeaks && !hasUsablePeaks(normalizedTrustedPeaks)) {
    throw new RecordingArtifactError(
      "This recording has invalid waveform peak data.",
      "decode-failed"
    );
  }

  const durationWarning = getDurationWarning({
    decodedDurationMs,
    metadataDurationMs
  });

  return {
    recordingId,
    decodedDurationMs,
    metadataDurationMs,
    durationDifferenceMs: Math.abs(decodedDurationMs - metadataDurationMs),
    durationWarning,
    peaks: useTrustedPeaks ? normalizedTrustedPeaks : decodedPeaks,
    source: useTrustedPeaks ? "trusted-peaks" : "decoded-audio"
  };
}

export async function loadRecordingArtifactDetails(
  recording: ReviewRecording
): Promise<RecordingArtifactDetails> {
  const artifactBody = await resolveRecordingArtifactBody(recording);

  return loadRecordingArtifactDetailsFromBody({
    recordingId: recording.id,
    blob: artifactBody.blob,
    metadataDurationMs: recording.durationMs,
    trustedPeaks: recording.trustedPeaks
  });
}
