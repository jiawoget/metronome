export type RecordingArtifactBody = {
  artifactId: string;
  recordingId: string;
  mimeType: string;
  sizeBytes: number;
  blob: Blob;
  objectUrl?: string;
};

export type RecordingArtifactUnavailableReason =
  | "missing-artifact-ref"
  | "missing-artifact-body"
  | "legacy-artifact-malformed"
  | "unsupported-mime"
  | "decode-failed"
  | "empty-audio"
  | "storage-unavailable"
  | "quota-exceeded";

export class RecordingArtifactError extends Error {
  constructor(
    message: string,
    readonly reason: RecordingArtifactUnavailableReason = "decode-failed"
  ) {
    super(message);
    this.name = "RecordingArtifactError";
  }
}
