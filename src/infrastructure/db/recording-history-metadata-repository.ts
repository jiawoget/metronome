import type { PracticeSession, SheetRecordingMetadata } from "@/domain/practice";
import { recordingHistoryRepository } from "@/lib/recordings-review/repository";
import type { ReviewRecording } from "@/lib/recordings-review/types";
import type { PracticeRecordingMetadataRepository } from "@/services/practice-session";

function toSheetRecordingMetadata(recording: ReviewRecording): SheetRecordingMetadata {
  return {
    id: recording.id,
    type: "sheet",
    sessionId: recording.sessionId,
    sheetId: recording.sheetId ?? "",
    sheetName: recording.sheetName ?? null,
    createdAt: recording.createdAt,
    durationMs: recording.durationMs,
    bpm: recording.settings.bpm,
    timeSignature:
      recording.settings.timeSignature === "2/4" ||
      recording.settings.timeSignature === "3/4" ||
      recording.settings.timeSignature === "4/4" ||
      recording.settings.timeSignature === "6/8"
        ? recording.settings.timeSignature
        : null
  };
}

function toReviewRecording(recording: SheetRecordingMetadata, session: PracticeSession): ReviewRecording {
  return {
    id: recording.id,
    type: "sheet",
    origin: "user",
    name: "Sheet practice metadata",
    sessionId: recording.sessionId,
    sheetId: recording.sheetId,
    sheetName: recording.sheetName,
    createdAt: recording.createdAt,
    durationMs: recording.durationMs,
    sizeBytes: 0,
    mimeType: "metadata/session",
    audioDataUrl: null,
    settings: {
      bpm: recording.bpm ?? session.bpm ?? 96,
      timeSignature: recording.timeSignature ?? session.timeSignature ?? "4/4"
    }
  };
}

function isObjectWithId(value: unknown): value is { id?: string } {
  return !!value && typeof value === "object";
}

async function listRecordingMetadata() {
  return recordingHistoryRepository
    .getSnapshot()
    .recordings.filter((recording) => recording.type === "sheet" && recording.sheetId)
    .map(toSheetRecordingMetadata);
}

export const recordingHistoryMetadataRepository: PracticeRecordingMetadataRepository = {
  listRecordingMetadata,

  async listRecordingMetadataForSession(sessionId) {
    return (await listRecordingMetadata()).filter((recording) => recording.sessionId === sessionId);
  },

  async saveRecordingMetadata(recording, session) {
    const snapshot = recordingHistoryRepository.getSnapshot();
    const reviewRecording = toReviewRecording(recording, session);

    recordingHistoryRepository.saveSnapshot({
      sessions: [
        session,
        ...snapshot.sessions.filter((item) => !isObjectWithId(item) || item.id !== session.id)
      ],
      recordings: [
        reviewRecording,
        ...snapshot.recordings.filter((item) => item.id !== reviewRecording.id)
      ],
      errorMarkers: snapshot.errorMarkers
    });
  },

  async clear() {
    const snapshot = recordingHistoryRepository.getSnapshot();
    const sheetRecordingIds = new Set(
      snapshot.recordings.filter((recording) => recording.type === "sheet").map((recording) => recording.id)
    );

    recordingHistoryRepository.saveSnapshot({
      sessions: snapshot.sessions.filter((item) => {
        if (!item || typeof item !== "object") {
          return true;
        }

        return (item as { sourceType?: string }).sourceType !== "sheet";
      }),
      recordings: snapshot.recordings.filter((recording) => recording.type !== "sheet"),
      errorMarkers: snapshot.errorMarkers.filter((marker) => !sheetRecordingIds.has(marker.recordingId))
    });
  },

  subscribe(listener) {
    return recordingHistoryRepository.subscribe(listener);
  }
};
