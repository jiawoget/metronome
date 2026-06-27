import type {
  RecordingErrorMarker,
  RecordingTakeGroup,
  RecordingTakeSelectionMetadata,
  RecordingReviewSnapshot,
  ResolvedRecordingTakeSelection,
  ReviewRecordingTakeGrouping,
  ReviewRecording
} from "@/lib/recordings-review/types";
import {
  parseSheetRecordingSegmentContext,
  type SheetRecordingSegmentContext
} from "@/domain/practice";
import { groupRecordingsByTake } from "@/lib/recordings-review/take-groups";
import {
  createTakeSelectionMetadata,
  normalizeTakeSelectionMetadataEntries,
  removeRecordingReferencesFromTakeSelections,
  resolveTakeSelectionForGroup
} from "@/lib/recordings-review/take-selection-metadata";
import {
  createErrorMarker,
  normalizePersistedErrorMarker,
  sortErrorMarkers,
  type CreateErrorMarkerInput
} from "@/lib/recordings-review/error-markers";
import { RECORDING_HISTORY_STORAGE_KEY } from "@/infrastructure/storage/storage-contracts";

export const RECORDINGS_STORAGE_KEY = RECORDING_HISTORY_STORAGE_KEY;
const STORE_EVENT = "recordings-review-change";
const QUICK_STORE_EVENT = "quick-metronome-recordings-change";

const emptySnapshot: RecordingReviewSnapshot = {
  sessions: [],
  recordings: [],
  errorMarkers: []
};
let cachedRawValue: string | null = null;
let cachedSnapshot: RecordingReviewSnapshot = emptySnapshot;

function getStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

function isRecording(value: unknown): value is ReviewRecording {
  if (!value || typeof value !== "object") {
    return false;
  }

  const recording = value as Partial<ReviewRecording>;

  return (
    typeof recording.id === "string" &&
    (recording.type === "quick" || recording.type === "sheet") &&
    typeof recording.sessionId === "string" &&
    typeof recording.createdAt === "string" &&
    typeof recording.durationMs === "number" &&
    Number.isFinite(recording.durationMs) &&
    recording.durationMs >= 0 &&
    typeof recording.sizeBytes === "number" &&
    Number.isFinite(recording.sizeBytes) &&
    typeof recording.mimeType === "string" &&
    !!recording.settings &&
    typeof recording.settings.bpm === "number" &&
    Number.isFinite(recording.settings.bpm) &&
    typeof recording.settings.timeSignature === "string"
  );
}

function normalizeRecording(value: unknown): ReviewRecording | null {
  if (!isRecording(value)) {
    return null;
  }

  const recording = value as ReviewRecording & { segmentContext?: unknown };
  const hasSegmentContext = Object.prototype.hasOwnProperty.call(recording, "segmentContext");

  if (recording.type !== "sheet" || !hasSegmentContext) {
    return recording;
  }

  const segmentContext: SheetRecordingSegmentContext | null =
    recording.segmentContext === null || recording.segmentContext === undefined
      ? null
      : parseSheetRecordingSegmentContext(recording.segmentContext);

  return {
    ...recording,
    segmentContext
  };
}

function isErrorMarker(value: unknown): value is RecordingErrorMarker {
  if (!value || typeof value !== "object") {
    return false;
  }

  const marker = value as Partial<RecordingErrorMarker>;

  return (
    typeof marker.id === "string" &&
    typeof marker.recordingId === "string" &&
    typeof marker.timestampMs === "number" &&
    (typeof marker.note === "string" || marker.note === null || marker.note === undefined)
  );
}

function normalizeErrorMarkersForRecordings({
  markers,
  recordings
}: {
  markers: unknown[];
  recordings: ReviewRecording[];
}) {
  const recordingsById = new Map(recordings.map((recording) => [recording.id, recording]));
  const normalizedMarkers: RecordingErrorMarker[] = [];

  for (const value of markers) {
    if (!isErrorMarker(value)) {
      continue;
    }

    const recording = recordingsById.get(value.recordingId.trim());

    if (!recording) {
      continue;
    }

    try {
      normalizedMarkers.push(
        normalizePersistedErrorMarker({
          id: value.id,
          recordingId: value.recordingId,
          timestampMs: value.timestampMs,
          durationMs: recording.durationMs,
          note: value.note ?? null
        })
      );
    } catch {
      continue;
    }
  }

  return sortErrorMarkers(normalizedMarkers);
}

function normalizeSnapshotValue(value: Partial<RecordingReviewSnapshot> | RecordingReviewSnapshot): RecordingReviewSnapshot {
  const recordings = Array.isArray(value.recordings)
    ? value.recordings
        .map(normalizeRecording)
        .filter((recording): recording is ReviewRecording => recording !== null)
    : [];
  const markers = Array.isArray(value.errorMarkers) ? value.errorMarkers : [];
  const takeSelections = normalizeTakeSelectionMetadataEntries(value.takeSelections);

  return buildSnapshot({
    sessions: Array.isArray(value.sessions) ? value.sessions : [],
    recordings,
    errorMarkers: normalizeErrorMarkersForRecordings({
      markers,
      recordings
    }),
    takeSelections
  });
}

function normalizeSnapshot(rawValue: string | null): RecordingReviewSnapshot {
  if (!rawValue) {
    return emptySnapshot;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<RecordingReviewSnapshot>;

    return normalizeSnapshotValue(parsed);
  } catch {
    return emptySnapshot;
  }
}

function readSnapshot(): RecordingReviewSnapshot {
  const storage = getStorage();

  const rawValue = storage?.getItem(RECORDINGS_STORAGE_KEY) ?? null;

  if (rawValue === cachedRawValue) {
    return cachedSnapshot;
  }

  cachedRawValue = rawValue;
  cachedSnapshot = normalizeSnapshot(rawValue);

  return cachedSnapshot;
}

function writeSnapshot(snapshot: RecordingReviewSnapshot) {
  const storage = getStorage();
  const normalizedSnapshot = normalizeSnapshotValue(snapshot);

  if (!storage) {
    return;
  }

  const serializedSnapshot = JSON.stringify(normalizedSnapshot);

  storage.setItem(RECORDINGS_STORAGE_KEY, serializedSnapshot);
  cachedRawValue = serializedSnapshot;
  cachedSnapshot = normalizedSnapshot;
  window.dispatchEvent(new Event(STORE_EVENT));
  window.dispatchEvent(new Event(QUICK_STORE_EVENT));
}

function buildSnapshot({
  sessions,
  recordings,
  errorMarkers,
  takeSelections
}: RecordingReviewSnapshot & {
  takeSelections?: RecordingTakeSelectionMetadata[];
}): RecordingReviewSnapshot {
  if (!takeSelections || takeSelections.length === 0) {
    return {
      sessions,
      recordings,
      errorMarkers
    };
  }

  return {
    sessions,
    recordings,
    errorMarkers,
    takeSelections
  };
}

function getNormalizedTakeSelections(snapshot: RecordingReviewSnapshot) {
  return normalizeTakeSelectionMetadataEntries(snapshot.takeSelections);
}

function getTakeSelectionByGroupId({
  snapshot,
  groupId
}: {
  snapshot: RecordingReviewSnapshot;
  groupId: string;
}) {
  return getNormalizedTakeSelections(snapshot).find(
    (selection) => selection.groupId === groupId
  ) ?? null;
}

function getCurrentTakeGroup({
  snapshot,
  groupId
}: {
  snapshot: RecordingReviewSnapshot;
  groupId: string;
}) {
  return groupRecordingsByTake(snapshot.recordings).takeGroups.find(
    (candidate) => candidate.groupId === groupId
  ) ?? null;
}

function assertRecordingBelongsToGroup({
  group,
  recordingId
}: {
  group: RecordingTakeGroup;
  recordingId: string;
}) {
  const normalizedRecordingId = recordingId.trim();

  if (normalizedRecordingId.length === 0) {
    throw new Error("Take selection recordingId must be a non-empty string.");
  }

  if (!group.recordings.some((recording) => recording.id === normalizedRecordingId)) {
    throw new Error(
      `Recording ${normalizedRecordingId} does not belong to take group ${group.groupId}.`
    );
  }

  return normalizedRecordingId;
}

function requireCurrentTakeGroup(
  group: RecordingTakeGroup | null,
  groupId: string
) {
  if (!group) {
    throw new Error(`Take group ${groupId} no longer exists.`);
  }

  return group;
}

function getPersistedRecordingIdForGroup({
  group,
  recordingId
}: {
  group: RecordingTakeGroup | null;
  recordingId: string | null;
}) {
  if (!group || !recordingId) {
    return null;
  }

  return group.recordings.some((recording) => recording.id === recordingId)
    ? recordingId
    : null;
}

function updateTakeSelection({
  snapshot,
  groupId,
  group,
  bestRecordingId,
  activeRecordingId
}: {
  snapshot: RecordingReviewSnapshot;
  groupId: string;
  group: RecordingTakeGroup;
  bestRecordingId: string | null;
  activeRecordingId: string | null;
}) {
  const takeSelections = getNormalizedTakeSelections(snapshot);
  const nextSelection =
    !bestRecordingId && !activeRecordingId
      ? null
      : createTakeSelectionMetadata({
          group,
          bestRecordingId,
          activeRecordingId,
          updatedAt: new Date().toISOString()
        });
  const nextTakeSelections = nextSelection
    ? [...takeSelections.filter((selection) => selection.groupId !== groupId), nextSelection]
    : takeSelections.filter((selection) => selection.groupId !== groupId);
  const nextSnapshot = buildSnapshot({
    ...snapshot,
    takeSelections: nextTakeSelections
  });

  writeSnapshot(nextSnapshot);

  return nextSnapshot;
}

export const recordingHistoryRepository = {
  getSnapshot() {
    return readSnapshot();
  },

  getTakeGroups(): ReviewRecordingTakeGrouping {
    return groupRecordingsByTake(readSnapshot().recordings);
  },

  getTakeSelections() {
    return getNormalizedTakeSelections(readSnapshot());
  },

  getTakeSelection(groupId: string) {
    return getTakeSelectionByGroupId({
      snapshot: readSnapshot(),
      groupId
    });
  },

  resolveTakeSelection(group: RecordingTakeGroup): ResolvedRecordingTakeSelection {
    return resolveTakeSelectionForGroup({
      group,
      selection: getTakeSelectionByGroupId({
        snapshot: readSnapshot(),
        groupId: group.groupId
      })
    });
  },

  getRecording(recordingId: string) {
    return readSnapshot().recordings.find((recording) => recording.id === recordingId) ?? null;
  },

  getErrorMarkers(recordingId: string) {
    return sortErrorMarkers(readSnapshot().errorMarkers.filter((marker) => marker.recordingId === recordingId));
  },

  getArtifact(recordingId: string) {
    return this.getRecording(recordingId)?.audioDataUrl ?? null;
  },

  saveSnapshot(snapshot: RecordingReviewSnapshot) {
    writeSnapshot(snapshot);
  },

  setBestTake(group: RecordingTakeGroup, recordingId: string | null) {
    const snapshot = readSnapshot();
    const currentSelection = getTakeSelectionByGroupId({
      snapshot,
      groupId: group.groupId
    });
    const currentGroup = getCurrentTakeGroup({
      snapshot,
      groupId: group.groupId
    });
    const nextBestRecordingId =
      recordingId === null
        ? null
        : assertRecordingBelongsToGroup({
            group: requireCurrentTakeGroup(currentGroup, group.groupId),
            recordingId
          });
    const nextActiveRecordingId = getPersistedRecordingIdForGroup({
      group: currentGroup,
      recordingId: currentSelection?.activeRecordingId ?? null
    });

    return updateTakeSelection({
      snapshot,
      groupId: group.groupId,
      group: currentGroup ?? group,
      bestRecordingId: nextBestRecordingId,
      activeRecordingId: nextActiveRecordingId
    });
  },

  setActiveTake(group: RecordingTakeGroup, recordingId: string | null) {
    const snapshot = readSnapshot();
    const currentSelection = getTakeSelectionByGroupId({
      snapshot,
      groupId: group.groupId
    });
    const currentGroup = getCurrentTakeGroup({
      snapshot,
      groupId: group.groupId
    });
    const nextActiveRecordingId =
      recordingId === null
        ? null
        : assertRecordingBelongsToGroup({
            group: requireCurrentTakeGroup(currentGroup, group.groupId),
            recordingId
          });
    const nextBestRecordingId = getPersistedRecordingIdForGroup({
      group: currentGroup,
      recordingId: currentSelection?.bestRecordingId ?? null
    });

    return updateTakeSelection({
      snapshot,
      groupId: group.groupId,
      group: currentGroup ?? group,
      bestRecordingId: nextBestRecordingId,
      activeRecordingId: nextActiveRecordingId
    });
  },

  clearTakeSelection(groupId: string) {
    const snapshot = readSnapshot();
    const nextSnapshot = buildSnapshot({
      ...snapshot,
      takeSelections: getNormalizedTakeSelections(snapshot).filter(
        (selection) => selection.groupId !== groupId
      )
    });

    writeSnapshot(nextSnapshot);

    return nextSnapshot;
  },

  createErrorMarker(input: Omit<CreateErrorMarkerInput, "durationMs"> & { durationMs?: number }) {
    const snapshot = readSnapshot();
    const recordingId = input.recordingId ?? "";
    const recording = snapshot.recordings.find((item) => item.id === recordingId);

    if (!recording) {
      throw new Error("A recording is required before saving an error marker.");
    }

    const marker = createErrorMarker({
      ...input,
      recordingId: recording.id,
      durationMs: input.durationMs ?? recording.durationMs
    });
    const nextSnapshot: RecordingReviewSnapshot = {
      ...snapshot,
      errorMarkers: sortErrorMarkers([
        ...snapshot.errorMarkers.filter((item) => item.id !== marker.id),
        marker
      ])
    };

    writeSnapshot(nextSnapshot);

    return marker;
  },

  deleteErrorMarker(markerId: string) {
    const snapshot = readSnapshot();
    const nextSnapshot: RecordingReviewSnapshot = {
      ...snapshot,
      errorMarkers: snapshot.errorMarkers.filter((marker) => marker.id !== markerId)
    };

    writeSnapshot(nextSnapshot);

    return nextSnapshot;
  },

  deleteRecording(recordingId: string) {
    const snapshot = readSnapshot();
    const nextSnapshot = buildSnapshot({
      sessions: snapshot.sessions,
      recordings: snapshot.recordings.filter((recording) => recording.id !== recordingId),
      errorMarkers: snapshot.errorMarkers.filter((marker) => marker.recordingId !== recordingId),
      takeSelections: removeRecordingReferencesFromTakeSelections({
        takeSelections: getNormalizedTakeSelections(snapshot),
        recordingIds: [recordingId],
        updatedAt: new Date().toISOString()
      })
    });

    writeSnapshot(nextSnapshot);

    return nextSnapshot;
  },

  clear() {
    writeSnapshot(emptySnapshot);
  },

  subscribe(listener: () => void) {
    if (typeof window === "undefined") {
      return () => undefined;
    }

    const handleChange = () => listener();

    window.addEventListener(STORE_EVENT, handleChange);
    window.addEventListener(QUICK_STORE_EVENT, handleChange);
    window.addEventListener("storage", handleChange);

    return () => {
      window.removeEventListener(STORE_EVENT, handleChange);
      window.removeEventListener(QUICK_STORE_EVENT, handleChange);
      window.removeEventListener("storage", handleChange);
    };
  }
};
