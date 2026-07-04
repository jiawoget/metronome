export type AudioDecodeAdapter = {
  decodeBlob: (blob: Blob) => Promise<AudioBuffer>;
};

export type AudioDecodeFailureReason = "unavailable" | "decode-failed";

export class AudioDecodeError extends Error {
  constructor(
    message: string,
    readonly reason: AudioDecodeFailureReason = "decode-failed",
    readonly cause?: unknown
  ) {
    super(message);
    this.name = "AudioDecodeError";
  }
}

export type RecordingArtifactAnalysis = {
  decodedDurationMs: number;
  sampleRate: number;
  peakAmplitude: number;
  rmsAmplitude: number;
  estimatedFrequencyHz: number | null;
  isSilent: boolean;
};
