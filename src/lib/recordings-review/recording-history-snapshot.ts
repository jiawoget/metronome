import type {
  RecordingOrganizationMetadata,
  RecordingReviewSnapshot,
  RecordingTakeSelectionMetadata,
  ReviewRecording
} from "@/lib/recordings-review/types";
import {
  normalizeTakeSelectionMetadataEntries,
  removeRecordingReferencesFromTakeSelections
} from "@/lib/recordings-review/take-selection-metadata";
import {
  normalizeRecordingOrganizationEntries,
  removeRecordingOrganizations
} from "@/lib/recordings-review/recording-organization-metadata";

export function buildRecordingReviewSnapshot({
  sessions,
  recordings,
  errorMarkers,
  takeSelections,
  recordingOrganization,
  ...futureFields
}: RecordingReviewSnapshot & {
  takeSelections?: RecordingTakeSelectionMetadata[];
  recordingOrganization?: RecordingOrganizationMetadata[];
}): RecordingReviewSnapshot {
  const snapshot: RecordingReviewSnapshot = {
    ...futureFields,
    sessions,
    recordings,
    errorMarkers
  };

  if (takeSelections && takeSelections.length > 0) {
    snapshot.takeSelections = takeSelections;
  }

  if (recordingOrganization && recordingOrganization.length > 0) {
    snapshot.recordingOrganization = recordingOrganization;
  }

  return snapshot;
}

export function getNormalizedTakeSelections(snapshot: RecordingReviewSnapshot) {
  return normalizeTakeSelectionMetadataEntries(snapshot.takeSelections);
}

export function getNormalizedRecordingOrganizations(snapshot: RecordingReviewSnapshot) {
  return normalizeRecordingOrganizationEntries(
    snapshot.recordingOrganization,
    snapshot.recordings.map((recording) => recording.id)
  );
}

export function deleteRecordingFromSnapshot(
  snapshot: RecordingReviewSnapshot,
  recordingId: string
) {
  return buildRecordingReviewSnapshot({
    ...snapshot,
    recordings: snapshot.recordings.filter((recording) => recording.id !== recordingId),
    errorMarkers: snapshot.errorMarkers.filter((marker) => marker.recordingId !== recordingId),
    takeSelections: removeRecordingReferencesFromTakeSelections({
      takeSelections: getNormalizedTakeSelections(snapshot),
      recordingIds: [recordingId],
      updatedAt: new Date().toISOString()
    }),
    recordingOrganization: removeRecordingOrganizations({
      organizations: getNormalizedRecordingOrganizations(snapshot),
      recordingIds: [recordingId]
    })
  });
}

export function deleteRecordingsFromSnapshot(
  snapshot: RecordingReviewSnapshot,
  recordingIds: ReadonlySet<string>
) {
  if (recordingIds.size === 0) {
    return snapshot;
  }

  return buildRecordingReviewSnapshot({
    ...snapshot,
    recordings: snapshot.recordings.filter(
      (recording) => !recordingIds.has(recording.id)
    ),
    errorMarkers: snapshot.errorMarkers.filter(
      (marker) => !recordingIds.has(marker.recordingId)
    ),
    takeSelections: removeRecordingReferencesFromTakeSelections({
      takeSelections: getNormalizedTakeSelections(snapshot),
      recordingIds,
      updatedAt: new Date().toISOString()
    }),
    recordingOrganization: removeRecordingOrganizations({
      organizations: getNormalizedRecordingOrganizations(snapshot),
      recordingIds
    })
  });
}

export function getArtifactCleanupRecordingIds({
  removedRecordingIds,
  snapshot
}: {
  removedRecordingIds: readonly string[];
  snapshot: RecordingReviewSnapshot;
}) {
  const retainedRecordingIds = new Set(
    snapshot.recordings.map((recording) => recording.id)
  );

  return [...new Set(removedRecordingIds)].filter(
    (recordingId) => !retainedRecordingIds.has(recordingId)
  );
}

export function omitPersistedAudioBody(recording: ReviewRecording): ReviewRecording {
  return {
    ...recording,
    audioDataUrl: null
  };
}

export function isSessionWithId(value: unknown): value is { id: string; sourceType?: unknown } {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as { id?: unknown }).id === "string"
  );
}

export function removeUnreferencedSessions({
  sessions,
  removedRecordings,
  retainedRecordings,
  sourceType,
  removeAnyUnreferencedSourceSession = false
}: {
  sessions: unknown[];
  removedRecordings: ReviewRecording[];
  retainedRecordings: ReviewRecording[];
  sourceType: "quick" | "sheet";
  removeAnyUnreferencedSourceSession?: boolean;
}) {
  const removedSessionIds = new Set(
    removedRecordings.map((recording) => recording.sessionId)
  );

  return sessions.filter((session) => {
    if (!isSessionWithId(session)) {
      return true;
    }

    const isSourceSession = session.sourceType === sourceType;
    const wasTargetSession =
      isSourceSession &&
      (removeAnyUnreferencedSourceSession || removedSessionIds.has(session.id));
    const retainedRecordingUsesSession = retainedRecordings.some(
      (recording) => recording.sessionId === session.id
    );

    if (!wasTargetSession || retainedRecordingUsesSession) {
      return true;
    }

    return session.sourceType !== sourceType;
  });
}
