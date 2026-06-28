import type {
  RecordingArtifactRef,
  RecordingArtifactDetails,
  ReviewRecording
} from "@/lib/recordings-review/types";
import type { RecordingArtifact } from "@/lib/quick-metronome/types";
import {
  recordingArtifactRepository,
  type LocalRecordingArtifact,
  type RecordingArtifactRepository
} from "@/infrastructure/db/recording-artifact-repository";
import {
  RecordingHistoryConcurrentWriteError,
  recordingHistoryRepository
} from "@/lib/recordings-review/repository";
import {
  getDataUrlMimeType,
  hasMatchingKnownExportAudioMime,
  isPotentiallyDecodableAudioMime
} from "@/lib/recordings-review/audio-mime";

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

async function decodeAudioBlob(blob: Blob) {
  const AudioContextConstructor = getAudioContextConstructor();

  if (!AudioContextConstructor) {
    throw new RecordingArtifactError(
      "Audio decoding is not available in this browser.",
      "decode-failed"
    );
  }

  try {
    const arrayBuffer = await blob.arrayBuffer();
    const audioContext = new AudioContextConstructor();

    try {
      return await audioContext.decodeAudioData(arrayBuffer.slice(0));
    } finally {
      void audioContext.close();
    }
  } catch {
    throw new RecordingArtifactError(
      "This recording artifact could not be decoded locally and cannot be decoded.",
      "decode-failed"
    );
  }
}

function isValidArtifactRef(value: unknown): value is RecordingArtifactRef {
  if (!value || typeof value !== "object") {
    return false;
  }

  const ref = value as Partial<RecordingArtifactRef>;

  return (
    ref.kind === "indexeddb" &&
    typeof ref.artifactId === "string" &&
    ref.artifactId.trim().length > 0 &&
    ref.storageVersion === 1
  );
}

export function createRecordingArtifactRef(recordingId: string): RecordingArtifactRef {
  return {
    kind: "indexeddb",
    artifactId: recordingId,
    storageVersion: 1
  };
}

export function dataUrlToRecordingArtifactBlob({
  dataUrl,
  expectedMimeType
}: {
  dataUrl: string;
  expectedMimeType?: string;
}) {
  const match = /^data:([^,]*),([\s\S]*)$/.exec(dataUrl.trim());

  if (!match) {
    throw new RecordingArtifactError(
      "This recording legacy artifact is malformed.",
      "legacy-artifact-malformed"
    );
  }

  const metadata = match[1] ?? "";
  const isBase64 = metadata
    .split(";")
    .some((part) => part.trim().toLowerCase() === "base64");
  const payload = match[2] ?? "";
  const mimeType = getDataUrlMimeType(metadata);

  if (!isPotentiallyDecodableAudioMime(mimeType)) {
    throw new RecordingArtifactError(
      "This recording artifact is not a supported audio type.",
      "unsupported-mime"
    );
  }

  if (
    expectedMimeType &&
    !hasMatchingKnownExportAudioMime({
      expectedMimeType,
      actualMimeType: mimeType
    })
  ) {
    throw new RecordingArtifactError(
      "This recording legacy artifact MIME does not match its metadata.",
      "unsupported-mime"
    );
  }

  try {
    const bytes = isBase64
      ? base64ToBytes(payload)
      : textToBytes(decodeURIComponent(payload));
    const blob = new Blob([bytes], { type: expectedMimeType ?? mimeType });

    if (blob.size <= 0) {
      throw new RecordingArtifactError(
        "This recording artifact decoded as empty audio.",
        "empty-audio"
      );
    }

    return {
      blob,
      mimeType
    };
  } catch (error) {
    if (error instanceof RecordingArtifactError) {
      throw error;
    }

    throw new RecordingArtifactError(
      "This recording legacy artifact is malformed.",
      "legacy-artifact-malformed"
    );
  }
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function textToBytes(value: string) {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(value);
  }

  const bytes = new Uint8Array(value.length);

  for (let index = 0; index < value.length; index += 1) {
    bytes[index] = value.charCodeAt(index);
  }

  return bytes;
}

function mapStorageError(error: unknown): RecordingArtifactError {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (message.includes("quota")) {
    return new RecordingArtifactError(
      "Local recording artifact storage quota was exceeded.",
      "quota-exceeded"
    );
  }

  return new RecordingArtifactError(
    "Local recording artifact storage is unavailable in this browser.",
    "storage-unavailable"
  );
}

function toLocalArtifact({
  recordingId,
  recordingType,
  artifact,
  createdAt,
  legacyMigratedFrom
}: {
  recordingId: string;
  recordingType: "quick" | "sheet";
  artifact: Pick<RecordingArtifact, "blob" | "mimeType" | "sizeBytes">;
  createdAt: string;
  legacyMigratedFrom?: "audioDataUrl";
}): LocalRecordingArtifact {
  return {
    artifactId: recordingId,
    recordingId,
    recordingType,
    mimeType: artifact.mimeType,
    sizeBytes: artifact.sizeBytes,
    blob: artifact.blob,
    createdAt,
    updatedAt: new Date().toISOString(),
    legacyMigratedFrom
  };
}

function isValidOwnedArtifactBody(
  artifact: LocalRecordingArtifact | null,
  recording: ReviewRecording
) {
  return (
    !!artifact &&
    artifact.artifactId === recording.id &&
    artifact.recordingId === recording.id &&
    artifact.blob instanceof Blob &&
    artifact.blob.size > 0 &&
    Number.isFinite(artifact.sizeBytes) &&
    artifact.sizeBytes > 0 &&
    isPotentiallyDecodableAudioMime(artifact.mimeType)
  );
}

export async function saveCapturedRecordingArtifact(
  input: {
    recordingId: string;
    recordingType: "quick" | "sheet";
    artifact: RecordingArtifact;
    createdAt: string;
  },
  repository: RecordingArtifactRepository = recordingArtifactRepository
): Promise<RecordingArtifactRef> {
  try {
    await repository.saveArtifact(
      toLocalArtifact({
        recordingId: input.recordingId,
        recordingType: input.recordingType,
        artifact: input.artifact,
        createdAt: input.createdAt
      })
    );

    const savedArtifact = await repository.getArtifact(input.recordingId);

    if (!savedArtifact || savedArtifact.recordingId !== input.recordingId) {
      throw new RecordingArtifactError(
        "This recording's local audio artifact is missing.",
        "missing-artifact-body"
      );
    }

    return createRecordingArtifactRef(input.recordingId);
  } catch (error) {
    if (error instanceof RecordingArtifactError) {
      throw error;
    }

    throw mapStorageError(error);
  }
}

export async function cleanupCommittedRecordingArtifacts(
  recordingIds: readonly string[],
  repository: RecordingArtifactRepository = recordingArtifactRepository
) {
  const candidateRecordingIds = recordingIds
    .map((recordingId) => recordingId.trim())
    .filter(Boolean);
  const retainedRecordingIds = new Set(
    recordingHistoryRepository
      .getSnapshot()
      .recordings.map((recording) => recording.id)
  );
  const cleanupRecordingIds = [...new Set(candidateRecordingIds)].filter(
    (recordingId) => !retainedRecordingIds.has(recordingId)
  );

  if (cleanupRecordingIds.length === 0) {
    return { recordingIds: [], error: null };
  }

  try {
    const artifacts = await repository.listArtifactsForRecordings(cleanupRecordingIds);
    const retainedRecordingIdsAfterList = new Set(
      recordingHistoryRepository
        .getSnapshot()
        .recordings.map((recording) => recording.id)
    );
    const ownedArtifactIds = artifacts
      .filter(
        (artifact) =>
          cleanupRecordingIds.includes(artifact.recordingId) &&
          artifact.artifactId === artifact.recordingId &&
          !retainedRecordingIdsAfterList.has(artifact.recordingId)
      )
      .map((artifact) => artifact.artifactId);

    if (ownedArtifactIds.length > 0) {
      await repository.deleteArtifacts(ownedArtifactIds);
    }

    return { recordingIds: cleanupRecordingIds, error: null };
  } catch (error) {
    return { recordingIds: cleanupRecordingIds, error };
  }
}

export async function resolveRecordingArtifactBody(
  recording: ReviewRecording,
  {
    repository = recordingArtifactRepository,
    createObjectUrl = false
  }: {
    repository?: RecordingArtifactRepository;
    createObjectUrl?: boolean;
  } = {}
): Promise<RecordingArtifactBody> {
  async function resolveLegacyBody() {
    if (!recording.audioDataUrl?.trim()) {
      return null;
    }

    const { blob } = dataUrlToRecordingArtifactBlob({
      dataUrl: recording.audioDataUrl,
      expectedMimeType: recording.mimeType
    });
    const body = {
      artifactId: recording.id,
      recordingId: recording.id,
      mimeType: recording.mimeType,
      sizeBytes: blob.size,
      blob,
      objectUrl:
        createObjectUrl && typeof URL !== "undefined"
          ? URL.createObjectURL(blob)
          : undefined
    };

    await repository
      .saveArtifact(
        toLocalArtifact({
          recordingId: recording.id,
          recordingType: recording.type,
          artifact: {
            blob,
            mimeType: recording.mimeType,
            sizeBytes: blob.size
          },
          createdAt: recording.createdAt,
          legacyMigratedFrom: "audioDataUrl"
        })
      )
      .catch(() => undefined);

    return body;
  }

  if (isValidArtifactRef(recording.artifactRef)) {
    try {
      const artifact = await repository.getArtifact(recording.id);

      if (!artifact || artifact.recordingId !== recording.id) {
        throw new RecordingArtifactError(
          "This recording's local audio artifact is missing.",
          "missing-artifact-body"
        );
      }

      if (!isPotentiallyDecodableAudioMime(artifact.mimeType)) {
        throw new RecordingArtifactError(
          "This recording artifact is not a supported audio type.",
          "unsupported-mime"
        );
      }

      return {
        artifactId: artifact.artifactId,
        recordingId: artifact.recordingId,
        mimeType: artifact.mimeType,
        sizeBytes: artifact.sizeBytes,
        blob: artifact.blob,
        objectUrl:
          createObjectUrl && typeof URL !== "undefined"
            ? URL.createObjectURL(artifact.blob)
            : undefined
      };
    } catch (error) {
      if (error instanceof RecordingArtifactError) {
        if (error.reason === "missing-artifact-body") {
          const legacyBody = await resolveLegacyBody();

          if (legacyBody) {
            return legacyBody;
          }
        }

        throw error;
      }

      const legacyBody = await resolveLegacyBody();

      if (legacyBody) {
        return legacyBody;
      }

      throw mapStorageError(error);
    }
  }

  const legacyBody = await resolveLegacyBody();

  if (legacyBody) {
    return legacyBody;
  }

  throw new RecordingArtifactError(
    "This recording has no accessible local audio artifact. This recording has no accessible audio artifact in local storage.",
    "missing-artifact-ref"
  );
}

export async function loadRecordingArtifactDetails(
  recording: ReviewRecording
): Promise<RecordingArtifactDetails> {
  const artifactBody = await resolveRecordingArtifactBody(recording);
  const audioBuffer = await decodeAudioBlob(artifactBody.blob);
  const decodedPeaks = derivePeaksFromSamples(audioBuffer.getChannelData(0));

  if (decodedPeaks.length === 0 || Math.max(...decodedPeaks) <= 0) {
    throw new RecordingArtifactError(
      "This recording artifact decoded as empty audio.",
      "empty-audio"
    );
  }

  const decodedDurationMs = audioBuffer.duration * 1_000;
  const trustedPeaks = recording.trustedPeaks;
  const useTrustedPeaks = !!trustedPeaks && trustedPeaks.length > 0;

  if (useTrustedPeaks && !trustedPeaks.every((peak) => Number.isFinite(peak))) {
    throw new RecordingArtifactError(
      "This recording has invalid waveform peak data.",
      "decode-failed"
    );
  }

  const normalizedTrustedPeaks = useTrustedPeaks ? normalizeTrustedPeaks(trustedPeaks) : [];

  if (useTrustedPeaks && !hasUsablePeaks(normalizedTrustedPeaks)) {
    throw new RecordingArtifactError(
      "This recording has invalid waveform peak data.",
      "decode-failed"
    );
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

export type RecordingArtifactMigrationResult = {
  migrated: number;
  skipped: number;
  failed: number;
  orphaned: number;
  entries: Array<{
    recordingId: string;
    status: "migrated" | "skipped" | "failed" | "orphaned";
    reason?: RecordingArtifactUnavailableReason | "already-migrated" | "metadata-only";
    message?: string;
  }>;
};

export async function migrateLegacyRecordingArtifacts(
  repository: RecordingArtifactRepository = recordingArtifactRepository
): Promise<RecordingArtifactMigrationResult> {
  const maxAttempts = 3;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const writeSession =
      recordingHistoryRepository.beginLegacyArtifactMigrationWrite();
    const entries: RecordingArtifactMigrationResult["entries"] = [];
    const migratedIds = new Set<string>();

    for (const recording of writeSession.snapshot.recordings) {
      if (isValidArtifactRef(recording.artifactRef)) {
        try {
          const existingArtifact = await repository.getArtifact(recording.id);

          if (isValidOwnedArtifactBody(existingArtifact, recording)) {
            if (recording.audioDataUrl?.trim()) {
              migratedIds.add(recording.id);
            } else {
              entries.push({
                recordingId: recording.id,
                status: "skipped",
                reason: "already-migrated"
              });
            }
            continue;
          }
        } catch {
          // Fall through to legacy restoration if bytes are still available.
        }
      }

      if (!recording.audioDataUrl?.trim()) {
        entries.push({
          recordingId: recording.id,
          status: "skipped",
          reason: "metadata-only"
        });
        continue;
      }

      try {
        const { blob } = dataUrlToRecordingArtifactBlob({
          dataUrl: recording.audioDataUrl,
          expectedMimeType: recording.mimeType
        });

        await repository.saveArtifact(
          toLocalArtifact({
            recordingId: recording.id,
            recordingType: recording.type,
            artifact: {
              blob,
              mimeType: recording.mimeType,
              sizeBytes: blob.size
            },
            createdAt: recording.createdAt,
            legacyMigratedFrom: "audioDataUrl"
          })
        );

        const savedArtifact = await repository.getArtifact(recording.id);

        if (!savedArtifact || savedArtifact.recordingId !== recording.id) {
          throw new RecordingArtifactError(
            "This recording's local audio artifact is missing.",
            "missing-artifact-body"
          );
        }

        migratedIds.add(recording.id);
      } catch (error) {
        const artifactError =
          error instanceof RecordingArtifactError ? error : mapStorageError(error);

        entries.push({
          recordingId: recording.id,
          status: "failed",
          reason: artifactError.reason,
          message: artifactError.message
        });
      }
    }

    if (migratedIds.size > 0) {
      try {
        recordingHistoryRepository.commitLegacyArtifactMigrationWrite(
          writeSession,
          (snapshot) => ({
            ...snapshot,
            recordings: snapshot.recordings.map((recording) => {
              if (!migratedIds.has(recording.id) || !recording.audioDataUrl?.trim()) {
                return recording;
              }

              const metadata = { ...recording };

              delete metadata.audioDataUrl;

              return {
                ...metadata,
                artifactRef: createRecordingArtifactRef(recording.id)
              };
            })
          })
        );

        for (const recordingId of migratedIds) {
          entries.push({
            recordingId,
            status: "migrated"
          });
        }
      } catch (error) {
        if (
          error instanceof RecordingHistoryConcurrentWriteError &&
          attempt < maxAttempts - 1
        ) {
          continue;
        }

        for (const recordingId of migratedIds) {
          entries.push({
            recordingId,
            status: "orphaned",
            message: error instanceof Error ? error.message : "Metadata rewrite failed."
          });
        }
      }
    }

    return {
      migrated: entries.filter((entry) => entry.status === "migrated").length,
      skipped: entries.filter((entry) => entry.status === "skipped").length,
      failed: entries.filter((entry) => entry.status === "failed").length,
      orphaned: entries.filter((entry) => entry.status === "orphaned").length,
      entries
    };
  }

  return {
    migrated: 0,
    skipped: 0,
    failed: 0,
    orphaned: 0,
    entries: []
  };
}
