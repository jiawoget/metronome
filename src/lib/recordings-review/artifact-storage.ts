import type { RecordingArtifactRef, ReviewRecording } from "@/lib/recordings-review/types";
import type { RecordingArtifact } from "@/lib/quick-metronome/types";
import {
  recordingArtifactRepository,
  type LocalRecordingArtifact,
  type RecordingArtifactRepository
} from "@/infrastructure/db/recording-artifact-repository";
import { recordingHistoryRepository } from "@/lib/recordings-review/repository";
import { isPotentiallyDecodableAudioMime } from "@/lib/recordings-review/audio-mime";
import {
  RecordingArtifactError,
  type RecordingArtifactBody
} from "@/lib/recordings-review/artifact-model";

export type RecordingArtifactCleanupResult = {
  recordingIds: string[];
  error: unknown | null;
};

export class RecordingArtifactCleanupError extends Error {
  constructor(
    readonly recordingIds: readonly string[],
    readonly cleanupCause: unknown
  ) {
    super("Recording metadata was updated, but local artifact cleanup failed.");
    this.name = "RecordingArtifactCleanupError";
  }
}

export function isValidArtifactRef(value: unknown): value is RecordingArtifactRef {
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

export function mapStorageError(error: unknown): RecordingArtifactError {
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

export function toLocalArtifact({
  recordingId,
  recordingType,
  artifact,
  createdAt
}: {
  recordingId: string;
  recordingType: "quick" | "sheet";
  artifact: Pick<RecordingArtifact, "blob" | "mimeType" | "sizeBytes">;
  createdAt: string;
}): LocalRecordingArtifact {
  return {
    artifactId: recordingId,
    recordingId,
    recordingType,
    mimeType: artifact.mimeType,
    sizeBytes: artifact.sizeBytes,
    blob: artifact.blob,
    createdAt,
    updatedAt: new Date().toISOString()
  };
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
): Promise<RecordingArtifactCleanupResult> {
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

export function assertRecordingArtifactCleanup(
  result: RecordingArtifactCleanupResult
) {
  if (result.error) {
    throw new RecordingArtifactCleanupError(result.recordingIds, result.error);
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
        throw error;
      }

      throw mapStorageError(error);
    }
  }

  throw new RecordingArtifactError(
    "This recording has no accessible local audio artifact. This recording has no accessible audio artifact in local storage.",
    "missing-artifact-ref"
  );
}
