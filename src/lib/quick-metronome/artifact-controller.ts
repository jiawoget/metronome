import {
  migrateLegacyRecordingArtifacts,
  resolveRecordingArtifactBody
} from "@/lib/recordings-review/artifact-service";
import type { QuickRecording } from "@/lib/quick-metronome/types";

export function migrateQuickRecordingArtifacts() {
  return migrateLegacyRecordingArtifacts();
}

export function resolveQuickRecordingArtifactBody(
  recording: QuickRecording,
  options: { createObjectUrl?: boolean } = {}
) {
  return resolveRecordingArtifactBody(recording, options);
}
