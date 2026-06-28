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

function toReviewRecording(
  recording: SheetRecordingMetadata,
  session: PracticeSession
): ReviewRecording {
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
    id: validRecording.id,
    type: "sheet",
    origin: "user",
    name: "Sheet practice metadata",
    sessionId: validRecording.sessionId,
    sheetId: validRecording.sheetId,
    sheetName: validRecording.sheetName,
    createdAt: validRecording.createdAt,
    durationMs: validRecording.durationMs,
    sizeBytes: 0,
    mimeType: "metadata/session",
    audioDataUrl: null,
    segmentContext: validRecording.segmentContext,
    settings: {
      bpm: validRecording.bpm ?? validSession.bpm ?? 96,
      timeSignature:
        validRecording.timeSignature ?? validSession.timeSignature ?? "4/4"
    }
  };
}

async function listRecordingMetadata() {
  return recordingHistoryRepository
    .getSnapshot()
    .recordings.filter(
      (recording) => recording.type === "sheet" && recording.sheetId
    )
    .map(toSheetRecordingMetadata);
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
      const reviewRecording = toReviewRecording(recording, session);

      recordingHistoryRepository.saveSheetRecordingMetadataWithSession({
        recording: reviewRecording,
        session: validatePracticeSession(session)
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
