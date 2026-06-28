import type {
  RecordingErrorMarker,
  RecordingTakeGroup,
  RecordingReviewSnapshot,
  ResolvedRecordingOrganization,
  ResolvedRecordingTakeSelection,
  ReviewRecordingTakeGrouping,
  ReviewRecording
} from "@/lib/recordings-review/types";
import {
  parseSheetRecordingMetadata,
  parseSheetRecordingSegmentContext,
  type SheetRecordingMetadata,
  type SheetRecordingSegmentContext
} from "@/domain/practice";
import { groupRecordingsByTake } from "@/lib/recordings-review/take-groups";
import {
  createTakeSelectionMetadata,
  normalizeTakeSelectionMetadataEntries,
  resolveTakeSelectionForGroup
} from "@/lib/recordings-review/take-selection-metadata";
import {
  createRecordingOrganizationMetadata,
  normalizeRecordingOrganizationEntries,
  normalizeRecordingTagForWrite,
  resolveRecordingOrganization as resolveRecordingOrganizationMetadata
} from "@/lib/recordings-review/recording-organization-metadata";
import {
  createErrorMarker,
  normalizePersistedErrorMarker,
  sortErrorMarkers,
  type CreateErrorMarkerInput
} from "@/lib/recordings-review/error-markers";
import { RECORDING_HISTORY_STORAGE_KEY } from "@/infrastructure/storage/storage-contracts";
import { createRecordingHistoryOperations } from "@/lib/recordings-review/recording-history-operations";
import {
  buildRecordingReviewSnapshot as buildSnapshot,
  getNormalizedRecordingOrganizations,
  getNormalizedTakeSelections
} from "@/lib/recordings-review/recording-history-snapshot";

export type { RecordingHistoryArtifactCleanupResult } from "@/lib/recordings-review/recording-history-operations";

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

type RawSnapshotObject = Record<string, unknown>;

export type RecordingHistoryWriteSession = {
  originalRawSnapshot: string | null;
  rawBase: RawSnapshotObject;
  snapshot: RecordingReviewSnapshot;
};

export class RecordingHistoryConcurrentWriteError extends Error {
  constructor() {
    super("Recording history changed before the metadata write could commit.");
    this.name = "RecordingHistoryConcurrentWriteError";
  }
}

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

function normalizeSheetRecordingMetadataEntries(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(parseSheetRecordingMetadata)
    .filter((recording): recording is SheetRecordingMetadata => recording !== null);
}

function normalizeSnapshotValue(value: Partial<RecordingReviewSnapshot> | RecordingReviewSnapshot): RecordingReviewSnapshot {
  const recordings = Array.isArray(value.recordings)
    ? value.recordings
        .map(normalizeRecording)
        .filter((recording): recording is ReviewRecording => recording !== null)
    : [];
  const markers = Array.isArray(value.errorMarkers) ? value.errorMarkers : [];
  const takeSelections = normalizeTakeSelectionMetadataEntries(value.takeSelections);
  const recordingOrganization = normalizeRecordingOrganizationEntries(
    value.recordingOrganization,
    recordings.map((recording) => recording.id)
  );
  const sheetRecordingMetadata = normalizeSheetRecordingMetadataEntries(
    value.sheetRecordingMetadata
  );

  return buildSnapshot({
    ...(value && typeof value === "object" ? value : {}),
    sessions: Array.isArray(value.sessions) ? value.sessions : [],
    recordings,
    errorMarkers: normalizeErrorMarkersForRecordings({
      markers,
      recordings
    }),
    takeSelections,
    recordingOrganization,
    ...(sheetRecordingMetadata.length > 0 ? { sheetRecordingMetadata } : {})
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

function parseRawSnapshotObject(rawValue: string | null): RawSnapshotObject {
  if (!rawValue) {
    return {};
  }

  try {
    const parsed = JSON.parse(rawValue);

    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as RawSnapshotObject)
      : {};
  } catch {
    return {};
  }
}

function serializeSnapshotForWrite({
  snapshot,
  rawBase
}: {
  snapshot: RecordingReviewSnapshot;
  rawBase: RawSnapshotObject;
}) {
  const normalizedSnapshot = normalizeSnapshotValue(snapshot);
  const nextRaw: RawSnapshotObject = {
    ...rawBase,
    sessions: normalizedSnapshot.sessions,
    recordings: normalizedSnapshot.recordings,
    errorMarkers: normalizedSnapshot.errorMarkers
  };

  if (normalizedSnapshot.takeSelections && normalizedSnapshot.takeSelections.length > 0) {
    nextRaw.takeSelections = normalizedSnapshot.takeSelections;
  } else {
    delete nextRaw.takeSelections;
  }

  if (
    normalizedSnapshot.recordingOrganization &&
    normalizedSnapshot.recordingOrganization.length > 0
  ) {
    nextRaw.recordingOrganization = normalizedSnapshot.recordingOrganization;
  } else {
    delete nextRaw.recordingOrganization;
  }

  if (
    normalizedSnapshot.sheetRecordingMetadata &&
    normalizedSnapshot.sheetRecordingMetadata.length > 0
  ) {
    nextRaw.sheetRecordingMetadata = normalizedSnapshot.sheetRecordingMetadata;
  } else {
    delete nextRaw.sheetRecordingMetadata;
  }

  return {
    normalizedSnapshot: normalizeSnapshotValue(nextRaw),
    serializedSnapshot: JSON.stringify(nextRaw)
  };
}

function publishSnapshotWrite({
  serializedSnapshot,
  normalizedSnapshot
}: {
  serializedSnapshot: string;
  normalizedSnapshot: RecordingReviewSnapshot;
}) {
  cachedRawValue = serializedSnapshot;
  cachedSnapshot = normalizedSnapshot;
  window.dispatchEvent(new Event(STORE_EVENT));
  window.dispatchEvent(new Event(QUICK_STORE_EVENT));
}

function mutateSnapshotWithStaleWriteProtection(
  mutate: (snapshot: RecordingReviewSnapshot, rawBase: RawSnapshotObject) => RecordingReviewSnapshot,
  { maxAttempts = 3 }: { maxAttempts?: number } = {}
) {
  const storage = getStorage();

  if (!storage) {
    return normalizeSnapshotValue(mutate(emptySnapshot, {}));
  }

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const originalRawSnapshot = storage.getItem(RECORDINGS_STORAGE_KEY);
    const rawBase = parseRawSnapshotObject(originalRawSnapshot);
    const baseSnapshot = normalizeSnapshotValue(rawBase);
    const nextSnapshot = mutate(baseSnapshot, rawBase);
    const { normalizedSnapshot, serializedSnapshot } = serializeSnapshotForWrite({
      snapshot: nextSnapshot,
      rawBase
    });

    if (storage.getItem(RECORDINGS_STORAGE_KEY) !== originalRawSnapshot) {
      continue;
    }

    storage.setItem(RECORDINGS_STORAGE_KEY, serializedSnapshot);
    publishSnapshotWrite({ serializedSnapshot, normalizedSnapshot });

    return normalizedSnapshot;
  }

  throw new RecordingHistoryConcurrentWriteError();
}

function beginLegacyArtifactMigrationWrite(): RecordingHistoryWriteSession {
  const storage = getStorage();
  const originalRawSnapshot = storage?.getItem(RECORDINGS_STORAGE_KEY) ?? null;
  const rawBase = parseRawSnapshotObject(originalRawSnapshot);

  return {
    originalRawSnapshot,
    rawBase,
    snapshot: storage ? normalizeSnapshotValue(rawBase) : emptySnapshot
  };
}

function commitLegacyArtifactMigrationWrite(
  session: RecordingHistoryWriteSession,
  mutate: (snapshot: RecordingReviewSnapshot) => RecordingReviewSnapshot
) {
  const storage = getStorage();
  const nextSnapshot = mutate(session.snapshot);

  if (!storage) {
    return normalizeSnapshotValue(nextSnapshot);
  }

  if (storage.getItem(RECORDINGS_STORAGE_KEY) !== session.originalRawSnapshot) {
    throw new RecordingHistoryConcurrentWriteError();
  }

  const { normalizedSnapshot, serializedSnapshot } = serializeSnapshotForWrite({
    snapshot: nextSnapshot,
    rawBase: session.rawBase
  });

  storage.setItem(RECORDINGS_STORAGE_KEY, serializedSnapshot);
  publishSnapshotWrite({ serializedSnapshot, normalizedSnapshot });

  return normalizedSnapshot;
}

function writeSnapshot(snapshot: RecordingReviewSnapshot) {
  return mutateSnapshotWithStaleWriteProtection(() => snapshot);
}

function getRecordingOrganizationByRecordingId({
  snapshot,
  recordingId
}: {
  snapshot: RecordingReviewSnapshot;
  recordingId: string;
}) {
  const normalizedRecordingId = recordingId.trim();

  return getNormalizedRecordingOrganizations(snapshot).find(
    (organization) => organization.recordingId === normalizedRecordingId
  ) ?? null;
}

function requireCurrentRecording({
  snapshot,
  recordingId
}: {
  snapshot: RecordingReviewSnapshot;
  recordingId: string;
}) {
  const normalizedRecordingId = recordingId.trim();

  if (normalizedRecordingId.length === 0) {
    throw new Error("Recording organization requires a recording id.");
  }

  const recording = snapshot.recordings.find(
    (candidate) => candidate.id === normalizedRecordingId
  );

  if (!recording) {
    throw new Error(`Recording ${normalizedRecordingId} no longer exists.`);
  }

  return recording;
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
  groupId,
  bestRecordingId,
  activeRecordingId
}: {
  groupId: string;
  bestRecordingId: string | null;
  activeRecordingId: string | null;
}) {
  return mutateSnapshotWithStaleWriteProtection((snapshot) => {
    const currentGroup = getCurrentTakeGroup({
      snapshot,
      groupId
    });
    const group = requireCurrentTakeGroup(currentGroup, groupId);
    const takeSelections = getNormalizedTakeSelections(snapshot);
    const nextSelection =
      !bestRecordingId && !activeRecordingId
        ? null
        : createTakeSelectionMetadata({
            group,
            bestRecordingId: bestRecordingId
              ? assertRecordingBelongsToGroup({ group, recordingId: bestRecordingId })
              : null,
            activeRecordingId: activeRecordingId
              ? assertRecordingBelongsToGroup({ group, recordingId: activeRecordingId })
              : null,
            updatedAt: new Date().toISOString()
          });
    const nextTakeSelections = nextSelection
      ? [...takeSelections.filter((selection) => selection.groupId !== groupId), nextSelection]
      : takeSelections.filter((selection) => selection.groupId !== groupId);

    return buildSnapshot({
      ...snapshot,
      takeSelections: nextTakeSelections
    });
  });
}

function updateRecordingOrganization({
  snapshot,
  recordingId,
  tags,
  favorite,
  archived
}: {
  snapshot: RecordingReviewSnapshot;
  recordingId: string;
  tags: string[];
  favorite: boolean;
  archived: boolean;
}) {
  const nextOrganization = createRecordingOrganizationMetadata({
    recordingId,
    tags,
    favorite,
    archived,
    updatedAt: new Date().toISOString()
  });
  const recordingOrganization = getNormalizedRecordingOrganizations(snapshot);
  const nextRecordingOrganization = nextOrganization
    ? [
        ...recordingOrganization.filter(
          (organization) => organization.recordingId !== recordingId
        ),
        nextOrganization
      ]
    : recordingOrganization.filter(
        (organization) => organization.recordingId !== recordingId
      );
  const nextSnapshot = buildSnapshot({
    ...snapshot,
    recordingOrganization: nextRecordingOrganization
  });

  return writeSnapshot(nextSnapshot);
}

export function seedRecordingHistoryForTests(snapshot: RecordingReviewSnapshot) {
  return writeSnapshot(snapshot);
}

const recordingHistoryOperations = createRecordingHistoryOperations({
  mutateSnapshot: (mutate) =>
    mutateSnapshotWithStaleWriteProtection((snapshot) => mutate(snapshot))
});

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

  getRecordingOrganizations() {
    return getNormalizedRecordingOrganizations(readSnapshot());
  },

  getRecordingOrganization(recordingId: string) {
    return getRecordingOrganizationByRecordingId({
      snapshot: readSnapshot(),
      recordingId
    });
  },

  resolveRecordingOrganization(
    recording: ReviewRecording
  ): ResolvedRecordingOrganization {
    return resolveRecordingOrganizationMetadata({
      recording,
      organization: getRecordingOrganizationByRecordingId({
        snapshot: readSnapshot(),
        recordingId: recording.id
      })
    });
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

  saveQuickRecordingMetadata:
    recordingHistoryOperations.saveQuickRecordingMetadata,

  saveSheetRecordingMetadataWithSession:
    recordingHistoryOperations.saveSheetRecordingMetadataWithSession,

  saveSheetRecordingMetadataOnly:
    recordingHistoryOperations.saveSheetRecordingMetadataOnly,

  deleteQuickRecordingMetadataByIdentity:
    recordingHistoryOperations.deleteQuickRecordingMetadataByIdentity,

  rollbackSheetRecordingMetadata:
    recordingHistoryOperations.rollbackSheetRecordingMetadata,

  clearQuickRecordings: recordingHistoryOperations.clearQuickRecordings,

  clearSheetRecordings: recordingHistoryOperations.clearSheetRecordings,

  beginLegacyArtifactMigrationWrite,

  commitLegacyArtifactMigrationWrite,

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
      groupId: group.groupId,
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
      groupId: group.groupId,
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

    return writeSnapshot(nextSnapshot);
  },

  setRecordingTags(recordingId: string, tags: string[]) {
    const snapshot = readSnapshot();
    const recording = requireCurrentRecording({ snapshot, recordingId });
    const currentOrganization = getRecordingOrganizationByRecordingId({
      snapshot,
      recordingId: recording.id
    });

    return updateRecordingOrganization({
      snapshot,
      recordingId: recording.id,
      tags,
      favorite: currentOrganization?.favorite ?? false,
      archived: currentOrganization?.archived ?? false
    });
  },

  addRecordingTag(recordingId: string, tag: string) {
    const snapshot = readSnapshot();
    const recording = requireCurrentRecording({ snapshot, recordingId });
    const currentOrganization = getRecordingOrganizationByRecordingId({
      snapshot,
      recordingId: recording.id
    });
    const normalizedTag = normalizeRecordingTagForWrite(tag);
    const existingTags = currentOrganization?.tags ?? [];

    if (
      existingTags.some(
        (existingTag) => existingTag.toLowerCase() === normalizedTag.toLowerCase()
      )
    ) {
      throw new Error("Recording tags must not contain duplicates.");
    }

    return updateRecordingOrganization({
      snapshot,
      recordingId: recording.id,
      tags: [...existingTags, normalizedTag],
      favorite: currentOrganization?.favorite ?? false,
      archived: currentOrganization?.archived ?? false
    });
  },

  removeRecordingTag(recordingId: string, tag: string) {
    const snapshot = readSnapshot();
    const recording = requireCurrentRecording({ snapshot, recordingId });
    const currentOrganization = getRecordingOrganizationByRecordingId({
      snapshot,
      recordingId: recording.id
    });
    const normalizedTag = normalizeRecordingTagForWrite(tag);

    return updateRecordingOrganization({
      snapshot,
      recordingId: recording.id,
      tags: (currentOrganization?.tags ?? []).filter(
        (existingTag) => existingTag.toLowerCase() !== normalizedTag.toLowerCase()
      ),
      favorite: currentOrganization?.favorite ?? false,
      archived: currentOrganization?.archived ?? false
    });
  },

  setRecordingFavorite(recordingId: string, favorite: boolean) {
    const snapshot = readSnapshot();
    const recording = requireCurrentRecording({ snapshot, recordingId });
    const currentOrganization = getRecordingOrganizationByRecordingId({
      snapshot,
      recordingId: recording.id
    });

    return updateRecordingOrganization({
      snapshot,
      recordingId: recording.id,
      tags: currentOrganization?.tags ?? [],
      favorite,
      archived: currentOrganization?.archived ?? false
    });
  },

  setRecordingArchived(recordingId: string, archived: boolean) {
    const snapshot = readSnapshot();
    const recording = requireCurrentRecording({ snapshot, recordingId });
    const currentOrganization = getRecordingOrganizationByRecordingId({
      snapshot,
      recordingId: recording.id
    });

    return updateRecordingOrganization({
      snapshot,
      recordingId: recording.id,
      tags: currentOrganization?.tags ?? [],
      favorite: currentOrganization?.favorite ?? false,
      archived
    });
  },

  clearRecordingOrganization(recordingId: string) {
    const snapshot = readSnapshot();
    const recording = requireCurrentRecording({ snapshot, recordingId });
    const nextSnapshot = buildSnapshot({
      ...snapshot,
      recordingOrganization: getNormalizedRecordingOrganizations(snapshot).filter(
        (organization) => organization.recordingId !== recording.id
      )
    });

    return writeSnapshot(nextSnapshot);
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

    return writeSnapshot(nextSnapshot);
  },

  deleteRecording(recordingId: string) {
    return recordingHistoryOperations.deleteRecording(recordingId);
  },

  clear() {
    const storage = getStorage();

    if (!storage) {
      return;
    }

    const originalRawSnapshot = storage.getItem(RECORDINGS_STORAGE_KEY);
    const serializedSnapshot = JSON.stringify(emptySnapshot);

    if (storage.getItem(RECORDINGS_STORAGE_KEY) !== originalRawSnapshot) {
      throw new RecordingHistoryConcurrentWriteError();
    }

    storage.setItem(RECORDINGS_STORAGE_KEY, serializedSnapshot);
    publishSnapshotWrite({
      serializedSnapshot,
      normalizedSnapshot: emptySnapshot
    });
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
