import {
  createSessionHistorySegmentTargetKey,
  type SessionHistoryLookupResult,
  type SessionHistorySegmentTarget,
  type SessionHistorySheetTarget
} from "@/domain/practice/session-history-groups";
import type {
  PracticeSession,
  PracticeTimeSignature,
  SheetRecordingMetadata,
  SheetRecordingSegmentContext
} from "@/domain/practice/types";

export const DEFAULT_HOME_RECENT_ACTIVITY_LIMIT = 8;

export type HomeRecentActivityKind = "quick-session" | "sheet-session" | "sheet-recording" | "segment-session" | "segment-recording";
export type HomeRecentActivityTargetState = "valid" | "lookup-failed" | "missing-sheet" | "missing-segment" | "no-target" | "quick";

export type HomeRecentActivityItem = {
  id: string;
  kind: HomeRecentActivityKind;
  occurredAt: string;
  sortTimestamp: string | null;
  label: string;
  metadata: string[];
  targetState: HomeRecentActivityTargetState;
  sessionId: string | null;
  recordingId: string | null;
  sheetId: string | null;
  sheetName: string | null;
  segmentId: string | null;
  segmentName: string | null;
  durationMs: number | null;
  bpm: number | null;
  timeSignature: PracticeTimeSignature | null;
  disabledReason: string | null;
};

export type HomeRecentActivityResult = {
  items: HomeRecentActivityItem[];
  generatedAt: string;
  limit: number;
};

export type HomeRecentActivityOptions = { limit?: number };
export type HomeRecentActivityTargetResolution = {
  sheets?: Record<string, SessionHistoryLookupResult<SessionHistorySheetTarget>>;
  segments?: Record<string, SessionHistoryLookupResult<SessionHistorySegmentTarget>>;
};
export type HomeRecentActivitySourceInput = HomeRecentActivityOptions & {
  sessions: PracticeSession[];
  recordings: SheetRecordingMetadata[];
  targets?: HomeRecentActivityTargetResolution;
  generatedAt: string;
};

type TargetSource = {
  sourceType: PracticeSession["sourceType"];
  sheetId: string | null | undefined;
  segmentContext: SheetRecordingSegmentContext | null | undefined;
};
type ResolvedTarget = {
  targetState: HomeRecentActivityTargetState;
  sheetId: string | null;
  sheetName: string | null;
  segmentId: string | null;
  segmentName: string | null;
};
type ItemInput = {
  id: string;
  kind: HomeRecentActivityKind;
  occurredAt: string;
  target: ResolvedTarget;
  sessionId: string | null;
  recordingId: string | null;
  sheetNameFallback?: string | null;
  durationMs: number | null;
  bpm: number | null;
  timeSignature: PracticeTimeSignature | null;
  recordingCount?: number | null;
  segmentContext?: SheetRecordingSegmentContext | null;
};

const INVALID_SORT_VALUE = Number.NEGATIVE_INFINITY;
const KIND_PRIORITY: Record<HomeRecentActivityKind, number> = {
  "segment-recording": 0,
  "sheet-recording": 1,
  "segment-session": 2,
  "sheet-session": 3,
  "quick-session": 4
};

export function selectHomeRecentActivity({
  sessions,
  recordings,
  targets = {},
  generatedAt,
  limit
}: HomeRecentActivitySourceInput): HomeRecentActivityResult {
  const dedupedItems = new Map<string, HomeRecentActivityItem>();

  for (const item of [
    ...sessions.map((session) => createSessionItem(session, targets)),
    ...recordings.map((recording) => createRecordingItem(recording, targets))
  ]) {
    if (item && !dedupedItems.has(item.id)) {
      dedupedItems.set(item.id, item);
    }
  }

  const normalizedLimit = normalizeLimit(limit);

  return {
    items: Array.from(dedupedItems.values()).sort(compareItems).slice(0, normalizedLimit),
    generatedAt,
    limit: normalizedLimit
  };
}

function createSessionItem(session: PracticeSession, targets: HomeRecentActivityTargetResolution) {
  const sessionId = requiredString(session.id);

  if (!sessionId) {
    return null;
  }

  const segmentContext = session.sourceType === "quick" ? null : session.segmentContext;

  return createItem({
    id: `session:${encodeURIComponent(sessionId)}`,
    kind: session.sourceType === "quick" ? "quick-session" : segmentContext ? "segment-session" : "sheet-session",
    occurredAt: session.updatedAt || session.startedAt,
    target: resolveTarget({
      sourceType: session.sourceType,
      sheetId: session.sheetId,
      segmentContext: session.segmentContext
    }, targets),
    sessionId,
    recordingId: null,
    durationMs: validDuration(session.durationMs),
    bpm: validBpm(session.bpm),
    timeSignature: session.timeSignature ?? null,
    recordingCount: session.recordingCount,
    segmentContext
  });
}

function createRecordingItem(recording: SheetRecordingMetadata, targets: HomeRecentActivityTargetResolution) {
  const recordingId = requiredString(recording.id);

  if (!recordingId) {
    return null;
  }

  return createItem({
    id: `recording:${encodeURIComponent(recordingId)}`,
    kind: recording.segmentContext ? "segment-recording" : "sheet-recording",
    occurredAt: recording.createdAt,
    target: resolveTarget({
      sourceType: "sheet",
      sheetId: recording.sheetId,
      segmentContext: recording.segmentContext
    }, targets),
    sessionId: requiredString(recording.sessionId),
    recordingId,
    sheetNameFallback: recording.sheetName,
    durationMs: validDuration(recording.durationMs),
    bpm: validBpm(recording.bpm),
    timeSignature: recording.timeSignature ?? null,
    segmentContext: recording.segmentContext
  });
}

function createItem(input: ItemInput): HomeRecentActivityItem {
  const sheetName = input.target.sheetName ?? requiredString(input.sheetNameFallback);

  return {
    id: input.id,
    kind: input.kind,
    occurredAt: input.occurredAt,
    sortTimestamp: validTimestamp(input.occurredAt),
    label: labelFor(input.kind, input.target.targetState, input.target.sheetId, sheetName, input.target.segmentName),
    metadata: metadataFor(input),
    targetState: input.target.targetState,
    sessionId: input.sessionId,
    recordingId: input.recordingId,
    sheetId: input.target.sheetId,
    sheetName,
    segmentId: input.target.segmentId,
    segmentName: input.target.segmentName,
    durationMs: input.durationMs,
    bpm: input.bpm,
    timeSignature: input.timeSignature,
    disabledReason: disabledReasonFor(input.target.targetState)
  };
}

function resolveTarget(source: TargetSource, targets: HomeRecentActivityTargetResolution): ResolvedTarget {
  const sheetId = requiredString(source.sheetId);
  const segmentContext = source.segmentContext ?? null;
  const segmentId = requiredString(segmentContext?.segmentId);
  const segmentName = requiredString(segmentContext?.segmentName);

  if (source.sourceType === "quick") {
    return target(sheetId || segmentId ? "no-target" : "quick", null, null, null, null);
  }

  if (!sheetId || (segmentContext && !segmentId)) {
    return target("no-target", sheetId, null, segmentId, segmentName);
  }

  const sheetTarget = targets.sheets?.[sheetId];
  const sheetName = sheetTarget?.state === "valid" ? requiredString(sheetTarget.value.name) : null;

  if (sheetTarget?.state === "lookup-failed") {
    return target("lookup-failed", sheetId, sheetName, segmentId, segmentName);
  }

  if (sheetTarget?.state === "missing") {
    return target("missing-sheet", sheetId, sheetName, segmentId, segmentName);
  }

  if (!segmentContext) {
    return target("valid", sheetId, sheetName, null, null);
  }

  if (!segmentId) {
    return target("no-target", sheetId, sheetName, null, segmentName);
  }

  const segmentTarget = targets.segments?.[createSessionHistorySegmentTargetKey(sheetId, segmentId)];

  if (segmentTarget?.state === "lookup-failed") {
    return target("lookup-failed", sheetId, sheetName, segmentId, segmentName);
  }

  return target(segmentTarget?.state === "missing" ? "missing-segment" : "valid", sheetId, sheetName, segmentId, segmentName);
}

function target(
  targetState: HomeRecentActivityTargetState,
  sheetId: string | null,
  sheetName: string | null,
  segmentId: string | null,
  segmentName: string | null
): ResolvedTarget {
  return { targetState, sheetId, sheetName, segmentId, segmentName };
}

function labelFor(
  kind: HomeRecentActivityKind,
  targetState: HomeRecentActivityTargetState,
  sheetId: string | null,
  sheetName: string | null,
  segmentName: string | null
) {
  if (kind === "quick-session") {
    return "Quick Practice";
  }

  if (kind === "segment-session" || kind === "segment-recording") {
    return segmentName ?? (targetState === "missing-sheet" ? "Deleted sheet" : sheetName ?? sheetId ?? "Segment practice");
  }

  return targetState === "missing-sheet" ? sheetName ?? "Deleted sheet" : sheetName ?? sheetId ?? "Sheet practice";
}

function metadataFor({
  durationMs,
  bpm,
  timeSignature,
  recordingCount,
  segmentContext
}: Pick<ItemInput, "durationMs" | "bpm" | "timeSignature" | "recordingCount" | "segmentContext">) {
  return [
    formatDuration(durationMs),
    bpm === null ? null : `${bpm} BPM`,
    timeSignature,
    formatRecordingCount(recordingCount),
    formatRange(segmentContext)
  ].filter((value): value is string => value !== null);
}

function formatDuration(durationMs: number | null) {
  if (durationMs === null) {
    return null;
  }

  if (durationMs === 0) {
    return "0s";
  }

  if (durationMs < 1_000) {
    return `${Math.round(durationMs)}ms`;
  }

  const seconds = Math.round(durationMs / 1_000);
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;

  return minutes > 0
    ? remainder > 0 ? `${minutes}m ${remainder}s` : `${minutes}m`
    : `${seconds}s`;
}

function formatRecordingCount(recordingCount: number | null | undefined) {
  if (typeof recordingCount !== "number" || !Number.isFinite(recordingCount) || recordingCount <= 0) {
    return null;
  }

  const count = Math.round(recordingCount);

  return `${count} recording${count === 1 ? "" : "s"}`;
}

function formatRange(segmentContext: SheetRecordingSegmentContext | null | undefined) {
  const range = segmentContext?.range;

  return range && Number.isFinite(range.startMeasure) && Number.isFinite(range.endMeasure)
    ? `m${range.startMeasure}-${range.endMeasure}`
    : null;
}

function disabledReasonFor(targetState: HomeRecentActivityTargetState) {
  switch (targetState) {
    case "lookup-failed":
      return "Target lookup failed.";
    case "missing-sheet":
      return "Sheet no longer exists.";
    case "missing-segment":
      return "Segment no longer exists.";
    case "no-target":
      return "No target is available for this local activity.";
    case "quick":
    case "valid":
      return null;
  }
}

function compareItems(left: HomeRecentActivityItem, right: HomeRecentActivityItem) {
  return (
    compareSortValues(sortValue(left), sortValue(right)) ||
    KIND_PRIORITY[left.kind] - KIND_PRIORITY[right.kind] ||
    left.id.localeCompare(right.id)
  );
}

function sortValue(item: HomeRecentActivityItem) {
  return item.sortTimestamp ? Date.parse(item.sortTimestamp) : INVALID_SORT_VALUE;
}

function compareSortValues(left: number, right: number) {
  return left === right ? 0 : right > left ? 1 : -1;
}

function validTimestamp(value: string) {
  return Number.isFinite(Date.parse(value)) ? value : null;
}

function validDuration(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function validBpm(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function normalizeLimit(value: number | undefined) {
  return value === undefined || !Number.isFinite(value)
    ? DEFAULT_HOME_RECENT_ACTIVITY_LIMIT
    : Math.max(0, Math.floor(value));
}

function requiredString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
}
