import {
  parseSheetRecordingMetadata,
  validatePracticeSession,
  validateSheetRecordingMetadata,
  type PracticeSession,
  type SheetRecordingMetadata
} from "@/domain/practice";
import { parsePracticeTimeSignature } from "@/domain/practice/validation";
import { recordingHistoryRepository } from "@/lib/recordings-review/repository";
import {
  assertRecordingArtifactCleanup,
  cleanupCommittedRecordingArtifacts
} from "@/lib/recordings-review/artifact-storage";
import type { ReviewRecording } from "@/lib/recordings-review/types";
import type { PracticeRecordingMetadataRepository } from "@/services/practice-session";

function toSheetRecordingMetadata(
  recording: ReviewRecording
): SheetRecordingMetadata {
  const metadata = parseSheetRecordingMetadata({
    id: recording.id,
    type: "sheet",
    sessionId: recording.sessionId,
    sheetId: recording.sheetId ?? "",
    sheetName: recording.sheetName ?? null,
    createdAt: recording.createdAt,
    durationMs: recording.durationMs,
    bpm: recording.settings.bpm,
    timeSignature: parsePracticeTimeSignature(recording.settings.timeSignature),
    segmentContext: recording.segmentContext ?? null
  });

  if (!metadata) {
    throw new Error("Invalid sheet recording metadata in recording history.");
  }

  return metadata;
}

function validateSheetRecordingMetadataLink(
  recording: SheetRecordingMetadata,
  session: PracticeSession
): { recording: SheetRecordingMetadata; session: PracticeSession } {
  const validRecording = validateSheetRecordingMetadata(recording);
  const validSession = validatePracticeSession(session);

  if (validSession.sourceType !== "sheet" || !validSession.sheetId) {
    throw new Error(
      "Sheet recording metadata requires a sheet practice session."
    );
  }

  if (validRecording.sessionId !== validSession.id) {
    throw new Error(
      "Sheet recording metadata sessionId must match the session id."
    );
  }

  if (validRecording.sheetId !== validSession.sheetId) {
    throw new Error(
      "Sheet recording metadata sheetId must match the session sheetId."
    );
  }

  return {
    recording: validRecording,
    session: validSession
  };
}

async function listRecordingMetadata() {
  const snapshot = recordingHistoryRepository.getSnapshot();
  const realSheetRecordings = snapshot.recordings.filter(
    (recording) =>
      recording.type === "sheet" &&
      !!recording.sheetId &&
      recording.mimeType !== "metadata/session"
  );

  return [
    ...(snapshot.sheetRecordingMetadata ?? []),
    ...realSheetRecordings.map(toSheetRecordingMetadata)
  ];
}

export const recordingHistoryMetadataRepository: PracticeRecordingMetadataRepository =
  {
    listRecordingMetadata,

    async listRecordingMetadataForSession(sessionId) {
      return (await listRecordingMetadata()).filter(
        (recording) => recording.sessionId === sessionId
      );
    },

    async saveRecordingMetadata(recording, session) {
      const validated = validateSheetRecordingMetadataLink(recording, session);

      recordingHistoryRepository.saveSheetRecordingMetadataOnly({
        recording: validated.recording,
        session: validated.session
      });
    },

    async clear() {
      const result = recordingHistoryRepository.clearSheetRecordings();
      const cleanupResult = await cleanupCommittedRecordingArtifacts(
        result.artifactCleanupRecordingIds
      );

      assertRecordingArtifactCleanup(cleanupResult);
    },

    subscribe(listener) {
      return recordingHistoryRepository.subscribe(listener);
    }
  };
