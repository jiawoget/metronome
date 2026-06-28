import { createRecordingTakeGroupId, getCreatedAtSortValue } from "@/lib/recordings-review/take-groups";
import type {
  RecordingTakeGroup,
  RecordingTakeSelectionMetadata,
  ResolvedRecordingTakeSelection,
  ReviewRecording
} from "@/lib/recordings-review/types";

export function normalizeTakeSelectionMetadataEntries(
  values: unknown
): RecordingTakeSelectionMetadata[] {
  if (!Array.isArray(values)) {
    return [];
  }

  const selectionsByGroupId = new Map<string, RecordingTakeSelectionMetadata>();

  for (const value of values) {
    const selection = normalizeTakeSelectionMetadata(value);

    if (!selection) {
      continue;
    }

    const existing = selectionsByGroupId.get(selection.groupId);

    if (
      !existing ||
      compareTakeSelectionMetadataPriority(selection, existing) < 0
    ) {
      selectionsByGroupId.set(selection.groupId, selection);
    }
  }

  return Array.from(selectionsByGroupId.values()).sort(
    compareTakeSelectionMetadataByGroup
  );
}

export function resolveTakeSelectionForGroup({
  group,
  selection
}: {
  group: RecordingTakeGroup;
  selection: RecordingTakeSelectionMetadata | null;
}): ResolvedRecordingTakeSelection {
  const recordingsById = new Map(
    group.recordings.map((recording) => [recording.id, recording] as const)
  );

  return {
    groupId: group.groupId,
    sheetId: group.sheetId,
    segmentId: group.segmentId,
    bestRecordingId: selection?.bestRecordingId ?? null,
    activeRecordingId: selection?.activeRecordingId ?? null,
    updatedAt: selection?.updatedAt ?? null,
    bestRecording: getResolvedRecording(
      recordingsById,
      selection?.bestRecordingId ?? null
    ),
    activeRecording: getResolvedRecording(
      recordingsById,
      selection?.activeRecordingId ?? null
    )
  };
}

export function removeRecordingReferencesFromTakeSelections({
  takeSelections,
  recordingIds,
  updatedAt
}: {
  takeSelections: RecordingTakeSelectionMetadata[];
  recordingIds: Iterable<string>;
  updatedAt: string;
}) {
  const removedIds = new Set(
    Array.from(recordingIds)
      .map((recordingId) => normalizeOptionalString(recordingId))
      .filter((recordingId): recordingId is string => recordingId !== null)
  );

  if (removedIds.size === 0) {
    return takeSelections;
  }

  return takeSelections.flatMap((selection) => {
    const nextBestRecordingId = removedIds.has(selection.bestRecordingId ?? "")
      ? null
      : selection.bestRecordingId;
    const nextActiveRecordingId = removedIds.has(
      selection.activeRecordingId ?? ""
    )
      ? null
      : selection.activeRecordingId;
    const selectionChanged =
      nextBestRecordingId !== selection.bestRecordingId ||
      nextActiveRecordingId !== selection.activeRecordingId;

    if (!selectionChanged) {
      return [selection];
    }

    if (!nextBestRecordingId && !nextActiveRecordingId) {
      return [];
    }

    return [
      {
        ...selection,
        bestRecordingId: nextBestRecordingId,
        activeRecordingId: nextActiveRecordingId,
        updatedAt
      }
    ];
  });
}

export function createTakeSelectionMetadata({
  group,
  bestRecordingId,
  activeRecordingId,
  updatedAt
}: {
  group: RecordingTakeGroup;
  bestRecordingId: string | null;
  activeRecordingId: string | null;
  updatedAt: string;
}): RecordingTakeSelectionMetadata | null {
  if (!bestRecordingId && !activeRecordingId) {
    return null;
  }

  return {
    groupId: group.groupId,
    sheetId: group.sheetId,
    segmentId: group.segmentId,
    bestRecordingId,
    activeRecordingId,
    updatedAt
  };
}

function normalizeTakeSelectionMetadata(
  value: unknown
): RecordingTakeSelectionMetadata | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const selection = value as Partial<RecordingTakeSelectionMetadata>;
  const groupId = normalizeRequiredString(selection.groupId);
  const sheetId = normalizeRequiredString(selection.sheetId);
  const segmentId = normalizeOptionalString(selection.segmentId);
  const bestRecordingId = normalizeOptionalString(selection.bestRecordingId);
  const activeRecordingId = normalizeOptionalString(selection.activeRecordingId);
  const updatedAt = normalizeRequiredString(selection.updatedAt);

  if (!groupId || !sheetId || !updatedAt) {
    return null;
  }

  if (!bestRecordingId && !activeRecordingId) {
    return null;
  }

  if (
    groupId !==
    createRecordingTakeGroupId({
      sheetId,
      segmentId
    })
  ) {
    return null;
  }

  return {
    groupId,
    sheetId,
    segmentId,
    bestRecordingId,
    activeRecordingId,
    updatedAt
  };
}

function compareTakeSelectionMetadataPriority(
  left: RecordingTakeSelectionMetadata,
  right: RecordingTakeSelectionMetadata
) {
  const timeDifference = compareSortValuesByNewest(
    getCreatedAtSortValue(left.updatedAt),
    getCreatedAtSortValue(right.updatedAt)
  );

  if (timeDifference !== 0) {
    return timeDifference;
  }

  return (
    compareStrings(left.groupId, right.groupId) ||
    compareStrings(left.sheetId, right.sheetId) ||
    compareNullableStrings(left.segmentId, right.segmentId) ||
    compareNullableStrings(left.bestRecordingId, right.bestRecordingId) ||
    compareNullableStrings(left.activeRecordingId, right.activeRecordingId) ||
    compareStrings(left.updatedAt, right.updatedAt)
  );
}

function compareTakeSelectionMetadataByGroup(
  left: RecordingTakeSelectionMetadata,
  right: RecordingTakeSelectionMetadata
) {
  return (
    compareStrings(left.groupId, right.groupId) ||
    compareTakeSelectionMetadataPriority(left, right)
  );
}

function getResolvedRecording(
  recordingsById: Map<string, ReviewRecording>,
  recordingId: string | null
) {
  if (!recordingId) {
    return null;
  }

  return recordingsById.get(recordingId) ?? null;
}

function normalizeRequiredString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized.length > 0 ? normalized : null;
}

function normalizeOptionalString(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  return normalizeRequiredString(value);
}

function compareStrings(left: string, right: string) {
  return left.localeCompare(right);
}

function compareNullableStrings(left: string | null, right: string | null) {
  return (left ?? "").localeCompare(right ?? "");
}

function compareSortValuesByNewest(left: number, right: number) {
  if (left === right) {
    return 0;
  }

  return right > left ? 1 : -1;
}
