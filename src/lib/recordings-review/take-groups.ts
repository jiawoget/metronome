import type {
  RecordingTakeGroup,
  RecordingTakeGroupKind,
  ReviewRecording,
  ReviewRecordingTakeGrouping
} from "@/lib/recordings-review/types";

type NormalizedSegmentGroup = {
  kind: RecordingTakeGroupKind;
  segmentId: string | null;
  segmentName: string | null;
};

const INVALID_CREATED_AT_SORT_VALUE = Number.NEGATIVE_INFINITY;

export function getCreatedAtSortValue(createdAt: string) {
  const timestamp = Date.parse(createdAt);

  return Number.isFinite(timestamp) ? timestamp : INVALID_CREATED_AT_SORT_VALUE;
}

export function compareReviewRecordingsByNewest(
  left: ReviewRecording,
  right: ReviewRecording
) {
  const timeDifference = compareSortValuesByNewest(
    getCreatedAtSortValue(left.createdAt),
    getCreatedAtSortValue(right.createdAt)
  );

  if (timeDifference !== 0) {
    return timeDifference;
  }

  return (
    compareStrings(left.id, right.id) ||
    compareNullableStrings(left.sheetId, right.sheetId) ||
    compareNullableStrings(
      getGroupingSegmentId(left),
      getGroupingSegmentId(right)
    ) ||
    compareStrings(left.sessionId, right.sessionId) ||
    compareStrings(left.type, right.type)
  );
}

export function sortReviewRecordingsByNewest(recordings: ReviewRecording[]) {
  return [...recordings].sort(compareReviewRecordingsByNewest);
}

export function groupRecordingsByTake(
  recordings: ReviewRecording[]
): ReviewRecordingTakeGrouping {
  const groupsById = new Map<string, ReviewRecording[]>();
  const groupOrder: string[] = [];
  const quickRecordings: ReviewRecording[] = [];
  const ungroupedRecordings: ReviewRecording[] = [];

  for (const recording of recordings) {
    if (recording.type === "quick") {
      quickRecordings.push(recording);
      continue;
    }

    const sheetId = normalizeRequiredString(recording.sheetId);

    if (!sheetId) {
      ungroupedRecordings.push(recording);
      continue;
    }

    const segmentGroup = getNormalizedSegmentGroup(recording);
    const groupId = createRecordingTakeGroupId({
      sheetId,
      segmentId: segmentGroup.segmentId
    });
    const existing = groupsById.get(groupId);

    if (existing) {
      existing.push(recording);
      continue;
    }

    groupsById.set(groupId, [recording]);
    groupOrder.push(groupId);
  }

  const takeGroups = groupOrder
    .map((groupId) => createTakeGroup(groupId, groupsById.get(groupId) ?? []))
    .filter((group): group is RecordingTakeGroup => group !== null)
    .sort(compareTakeGroupsByNewest);

  return {
    takeGroups,
    quickRecordings: sortReviewRecordingsByNewest(quickRecordings),
    ungroupedRecordings: sortReviewRecordingsByNewest(ungroupedRecordings)
  };
}

function createTakeGroup(
  groupId: string,
  recordings: ReviewRecording[]
): RecordingTakeGroup | null {
  if (recordings.length === 0) {
    return null;
  }

  const sortedRecordings = sortReviewRecordingsByNewest(recordings);
  const latestRecording = sortedRecordings[0];
  const sheetId = normalizeRequiredString(latestRecording.sheetId);

  if (!sheetId) {
    return null;
  }

  const segmentGroup = getNormalizedSegmentGroup(latestRecording);

  return {
    groupId,
    kind: segmentGroup.kind,
    sheetId,
    sheetName: normalizeOptionalDisplayString(latestRecording.sheetName),
    segmentId: segmentGroup.segmentId,
    segmentName: segmentGroup.segmentName,
    recordings: sortedRecordings,
    takeCount: sortedRecordings.length,
    latestRecording,
    latestRecordedAt: latestRecording.createdAt
  };
}

function compareTakeGroupsByNewest(
  left: RecordingTakeGroup,
  right: RecordingTakeGroup
) {
  const timeDifference = compareSortValuesByNewest(
    getCreatedAtSortValue(left.latestRecordedAt),
    getCreatedAtSortValue(right.latestRecordedAt)
  );

  if (timeDifference !== 0) {
    return timeDifference;
  }

  return (
    compareStrings(left.sheetId, right.sheetId) ||
    compareNullableStrings(left.segmentId, right.segmentId) ||
    compareStrings(left.groupId, right.groupId)
  );
}

function getNormalizedSegmentGroup(
  recording: ReviewRecording
): NormalizedSegmentGroup {
  if (recording.type !== "sheet") {
    return {
      kind: "sheet-no-segment",
      segmentId: null,
      segmentName: null
    };
  }

  const segmentContext = recording.segmentContext;

  if (!segmentContext || typeof segmentContext !== "object") {
    return {
      kind: "sheet-no-segment",
      segmentId: null,
      segmentName: null
    };
  }

  const segmentId = normalizeRequiredString(
    (segmentContext as { segmentId?: unknown }).segmentId
  );

  if (!segmentId) {
    return {
      kind: "sheet-no-segment",
      segmentId: null,
      segmentName: null
    };
  }

  return {
    kind: "sheet-segment",
    segmentId,
    segmentName: normalizeOptionalDisplayString(
      (segmentContext as { segmentName?: unknown }).segmentName
    )
  };
}

function getGroupingSegmentId(recording: ReviewRecording) {
  return getNormalizedSegmentGroup(recording).segmentId;
}

export function createRecordingTakeGroupId({
  sheetId,
  segmentId
}: {
  sheetId: string;
  segmentId: string | null;
}) {
  return `sheet:${encodeURIComponent(sheetId)}:segment:${
    segmentId === null ? "none" : `id:${encodeURIComponent(segmentId)}`
  }`;
}

function normalizeRequiredString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized.length > 0 ? normalized : null;
}

function normalizeOptionalDisplayString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized.length > 0 ? normalized : null;
}

function compareStrings(left: string, right: string) {
  return left.localeCompare(right);
}

function compareNullableStrings(
  left: string | null,
  right: string | null
) {
  return (left ?? "").localeCompare(right ?? "");
}

function compareSortValuesByNewest(left: number, right: number) {
  if (left === right) {
    return 0;
  }

  return right > left ? 1 : -1;
}
