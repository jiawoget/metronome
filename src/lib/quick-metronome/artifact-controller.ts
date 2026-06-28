import {
  deleteRecordingArtifactById,
  migrateLegacyRecordingArtifacts,
  resolveRecordingArtifactBody,
  saveCapturedRecordingArtifact
} from "@/lib/recordings-review/artifact-service";
import type { QuickRecording, RecordingArtifact } from "@/lib/quick-metronome/types";

export function migrateQuickRecordingArtifacts() {
  return migrateLegacyRecordingArtifacts();
}

export function saveQuickRecordingArtifact({
  recording,
  artifact
}: {
  recording: QuickRecording;
  artifact: RecordingArtifact;
}) {
  return saveCapturedRecordingArtifact({
    recordingId: recording.id,
    recordingType: "quick",
    artifact,
    createdAt: recording.createdAt
  });
}

export function deleteQuickRecordingArtifact(recordingId: string) {
  return deleteRecordingArtifactById(recordingId);
}

export function resolveQuickRecordingArtifactBody(
  recording: QuickRecording,
  options: { createObjectUrl?: boolean } = {}
) {
  return resolveRecordingArtifactBody(recording, options);
}
