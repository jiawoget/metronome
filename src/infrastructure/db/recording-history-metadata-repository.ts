import {
  parseSheetRecordingMetadata,
  validatePracticeSession,
  validateSheetRecordingMetadata,
  type PracticeSession,
  type SheetRecordingMetadata
} from "@/domain/practice";
import { recordingHistoryRepository } from "@/lib/recordings-review/repository";
import { removeRecordingReferencesFromTakeSelections } from "@/lib/recordings-review/take-selection-metadata";
import type { ReviewRecording } from "@/lib/recordings-review/types";
import { parseTimeSignature } from "@/lib/quick-metronome/control";
import type { TimeSignature } from "@/lib/quick-metronome/types";
import type { PracticeRecordingMetadataRepository } from "@/services/practice-session";

function parseOptionalTimeSignature(value: string): TimeSignature | null {
  const parsed = parseTimeSignature(value);

  return parsed === value ? parsed : null;
}

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
    timeSignature: parseOptionalTimeSignature(recording.settings.timeSignature),
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

function isObjectWithId(value: unknown): value is { id?: string } {
  return !!value && typeof value === "object";
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
      const snapshot = recordingHistoryRepository.getSnapshot();
      const reviewRecording = toReviewRecording(recording, session);

      recordingHistoryRepository.saveSnapshot({
        sessions: [
          validatePracticeSession(session),
          ...snapshot.sessions.filter(
            (item) => !isObjectWithId(item) || item.id !== session.id
          )
        ],
        recordings: [
          reviewRecording,
          ...snapshot.recordings.filter(
            (item) => item.id !== reviewRecording.id
          )
        ],
        errorMarkers: snapshot.errorMarkers,
        takeSelections: snapshot.takeSelections
      });
    },

    async clear() {
      const snapshot = recordingHistoryRepository.getSnapshot();
      const sheetRecordingIds = new Set(
        snapshot.recordings
          .filter((recording) => recording.type === "sheet")
          .map((recording) => recording.id)
      );

      recordingHistoryRepository.saveSnapshot({
        sessions: snapshot.sessions.filter((item) => {
          if (!item || typeof item !== "object") {
            return true;
          }

          return (item as { sourceType?: string }).sourceType !== "sheet";
        }),
        recordings: snapshot.recordings.filter(
          (recording) => recording.type !== "sheet"
        ),
        errorMarkers: snapshot.errorMarkers.filter(
          (marker) => !sheetRecordingIds.has(marker.recordingId)
        ),
        takeSelections: removeRecordingReferencesFromTakeSelections({
          takeSelections: recordingHistoryRepository.getTakeSelections(),
          recordingIds: sheetRecordingIds,
          updatedAt: new Date().toISOString()
        })
      });
    },

    subscribe(listener) {
      return recordingHistoryRepository.subscribe(listener);
    }
  };
