import type {
  RecordingReviewSnapshot,
  ReviewRecording
} from "@/lib/recordings-review/types";
import {
  buildRecordingReviewSnapshot,
  deleteRecordingFromSnapshot,
  deleteRecordingsFromSnapshot,
  getArtifactCleanupRecordingIds,
  isSessionWithId,
  omitPersistedAudioBody,
  removeUnreferencedSessions
} from "@/lib/recordings-review/recording-history-snapshot";

export type RecordingHistoryArtifactCleanupResult = {
  snapshot: RecordingReviewSnapshot;
  artifactCleanupRecordingIds: string[];
};

type MutateRecordingHistorySnapshot = (
  mutate: (snapshot: RecordingReviewSnapshot) => RecordingReviewSnapshot
) => RecordingReviewSnapshot;

export function createRecordingHistoryOperations({
  mutateSnapshot
}: {
  mutateSnapshot: MutateRecordingHistorySnapshot;
}) {
  function saveQuickRecordingMetadata(recording: ReviewRecording) {
    if (recording.type !== "quick") {
      throw new Error("Quick recording metadata must have type quick.");
    }

    const recordingToSave = omitPersistedAudioBody(recording);

    return mutateSnapshot((snapshot) => {
      if (snapshot.recordings.some((item) => item.id === recordingToSave.id)) {
        throw new Error("Recording id collision prevented artifact metadata save.");
      }

      return buildRecordingReviewSnapshot({
        ...snapshot,
        recordings: [
          recordingToSave,
          ...snapshot.recordings.filter((item) => item.id !== recordingToSave.id)
        ]
      });
    });
  }

  function saveSheetReviewRecordingMetadata(recording: ReviewRecording) {
    if (recording.type !== "sheet") {
      throw new Error("Sheet recording metadata must have type sheet.");
    }

    const recordingToSave = omitPersistedAudioBody(recording);

    return mutateSnapshot((snapshot) =>
      buildRecordingReviewSnapshot({
        ...snapshot,
        recordings: [
          recordingToSave,
          ...snapshot.recordings.filter((item) => item.id !== recordingToSave.id)
        ]
      })
    );
  }

  function saveSheetRecordingMetadataWithSession({
    recording,
    session
  }: {
    recording: ReviewRecording;
    session: unknown;
  }) {
    if (recording.type !== "sheet") {
      throw new Error("Sheet recording metadata must have type sheet.");
    }

    const recordingToSave = omitPersistedAudioBody(recording);
    const sessionId = isSessionWithId(session) ? session.id : null;

    return mutateSnapshot((snapshot) =>
      buildRecordingReviewSnapshot({
        ...snapshot,
        sessions: [
          session,
          ...snapshot.sessions.filter(
            (item) => !sessionId || !isSessionWithId(item) || item.id !== sessionId
          )
        ],
        recordings: [
          recordingToSave,
          ...snapshot.recordings.filter(
            (item) => item.id !== recordingToSave.id
          )
        ]
      })
    );
  }

  function deleteQuickRecordingMetadataByIdentity({
    recordingId,
    sessionId,
    createdAt
  }: {
    recordingId: string;
    sessionId: string;
    createdAt: string;
  }): RecordingHistoryArtifactCleanupResult {
    let removedRecordingIds: string[] = [];
    const snapshot = mutateSnapshot((currentSnapshot) => {
      const target = currentSnapshot.recordings.find(
        (item) =>
          item.id === recordingId &&
          item.type === "quick" &&
          item.sessionId === sessionId &&
          item.createdAt === createdAt
      );

      if (!target) {
        removedRecordingIds = [];
        return currentSnapshot;
      }

      removedRecordingIds = [target.id];

      return deleteRecordingsFromSnapshot(currentSnapshot, new Set(removedRecordingIds));
    });

    return {
      snapshot,
      artifactCleanupRecordingIds: getArtifactCleanupRecordingIds({
        removedRecordingIds,
        snapshot
      })
    };
  }

  function rollbackSheetRecordingMetadata({
    recordingId,
    sessionId,
    createdAt,
    previousSession
  }: {
    recordingId: string;
    sessionId: string;
    createdAt: string;
    previousSession: unknown | null;
  }): RecordingHistoryArtifactCleanupResult {
    let removedRecordingIds: string[] = [];
    const snapshot = mutateSnapshot((currentSnapshot) => {
      const target = currentSnapshot.recordings.find(
        (item) =>
          item.id === recordingId &&
          item.type === "sheet" &&
          item.sessionId === sessionId &&
          item.createdAt === createdAt
      );

      if (!target) {
        removedRecordingIds = [];
        return currentSnapshot;
      }

      removedRecordingIds = [target.id];
      const retainedRecordings = currentSnapshot.recordings.filter(
        (item) => !removedRecordingIds.includes(item.id)
      );
      const retainedSessionIsReferenced = retainedRecordings.some(
        (item) => item.sessionId === sessionId
      );
      const sessions = previousSession
        ? [
            previousSession,
            ...currentSnapshot.sessions.filter(
              (session) => !isSessionWithId(session) || session.id !== sessionId
            )
          ]
        : currentSnapshot.sessions.filter((session) => {
            if (!isSessionWithId(session)) {
              return true;
            }

            return !(
              session.id === sessionId &&
              session.sourceType === "sheet" &&
              !retainedSessionIsReferenced
            );
          });

      return buildRecordingReviewSnapshot({
        ...deleteRecordingsFromSnapshot(currentSnapshot, new Set(removedRecordingIds)),
        sessions
      });
    });

    return {
      snapshot,
      artifactCleanupRecordingIds: getArtifactCleanupRecordingIds({
        removedRecordingIds,
        snapshot
      })
    };
  }

  function deleteRecordingMetadata(recordingId: string): RecordingHistoryArtifactCleanupResult {
    let removedRecordingIds: string[] = [];
    const snapshot = mutateSnapshot((currentSnapshot) => {
      const target = currentSnapshot.recordings.find(
        (recording) => recording.id === recordingId
      );

      if (!target) {
        removedRecordingIds = [];
        return currentSnapshot;
      }

      removedRecordingIds = [target.id];

      return deleteRecordingFromSnapshot(currentSnapshot, target.id);
    });

    return {
      snapshot,
      artifactCleanupRecordingIds: getArtifactCleanupRecordingIds({
        removedRecordingIds,
        snapshot
      })
    };
  }

  function clearRecordingsByType(
    recordingType: "quick" | "sheet"
  ): RecordingHistoryArtifactCleanupResult {
    let removedRecordings: ReviewRecording[] = [];
    const snapshot = mutateSnapshot((currentSnapshot) => {
      removedRecordings = currentSnapshot.recordings.filter(
        (recording) => recording.type === recordingType
      );

      if (removedRecordings.length === 0) {
        return currentSnapshot;
      }

      const removedRecordingIds = new Set(
        removedRecordings.map((recording) => recording.id)
      );
      const retainedRecordings = currentSnapshot.recordings.filter(
        (recording) => !removedRecordingIds.has(recording.id)
      );

      return buildRecordingReviewSnapshot({
        ...deleteRecordingsFromSnapshot(currentSnapshot, removedRecordingIds),
        sessions: removeUnreferencedSessions({
          sessions: currentSnapshot.sessions,
          removedRecordings,
          retainedRecordings,
          sourceType: recordingType,
          removeAnyUnreferencedSourceSession: recordingType === "quick"
        })
      });
    });

    return {
      snapshot,
      artifactCleanupRecordingIds: getArtifactCleanupRecordingIds({
        removedRecordingIds: removedRecordings.map((recording) => recording.id),
        snapshot
      })
    };
  }

  return {
    saveQuickRecordingMetadata,
    saveSheetReviewRecordingMetadata,
    saveSheetRecordingMetadataWithSession,
    deleteQuickRecordingMetadataByIdentity,
    rollbackSheetRecordingMetadata,
    clearQuickRecordings() {
      return clearRecordingsByType("quick");
    },
    clearSheetRecordings() {
      return clearRecordingsByType("sheet");
    },
    deleteRecording: deleteRecordingMetadata
  };
}
