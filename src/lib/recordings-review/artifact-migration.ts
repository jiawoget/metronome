import type { RecordingArtifactRepository } from "@/infrastructure/db/recording-artifact-repository";
import { recordingArtifactRepository } from "@/infrastructure/db/recording-artifact-repository";
import {
  RecordingHistoryConcurrentWriteError,
  recordingHistoryRepository
} from "@/lib/recordings-review/repository";
import { dataUrlToRecordingArtifactBlob } from "@/lib/recordings-review/artifact-data-url";
import {
  createRecordingArtifactRef,
  isValidArtifactRef,
  isValidOwnedArtifactBody,
  mapStorageError,
  toLocalArtifact
} from "@/lib/recordings-review/artifact-storage";
import {
  RecordingArtifactError,
  type RecordingArtifactUnavailableReason
} from "@/lib/recordings-review/artifact-model";

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
