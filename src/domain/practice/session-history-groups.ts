import type { PracticeSession } from "@/domain/practice/types";

export type SessionHistoryGroupingMode = "date" | "sheet" | "segment";

export type SessionHistoryGroupTargetState =
  | "valid"
  | "lookup-failed"
  | "missing-sheet"
  | "missing-segment"
  | "no-segment"
  | "quick";

export type SessionHistoryLookupResult<TValue> =
  | { state: "valid"; value: TValue }
  | { state: "missing" }
  | { state: "lookup-failed" };

export type SessionHistorySheetTarget = {
  name: string | null;
};

export type SessionHistorySegmentTarget = {
  name: string | null;
};

export type SessionHistoryTargetResolution = {
  sheets?: Record<string, SessionHistoryLookupResult<SessionHistorySheetTarget>>;
  segments?: Record<string, SessionHistoryLookupResult<SessionHistorySegmentTarget>>;
};

export type SessionHistoryGroup = {
  id: string;
  mode: SessionHistoryGroupingMode;
  label: string;
  sortKey: string;
  targetState: SessionHistoryGroupTargetState;
  sheetId: string | null;
  sheetName: string | null;
  segmentId: string | null;
  segmentName: string | null;
  localDate: string | null;
  sessionCount: number;
  recordingCount: number;
  durationMs: number;
  latestUpdatedAt: string | null;
  sessions: PracticeSession[];
};

type MutableSessionHistoryGroup = Omit<
  SessionHistoryGroup,
  "sessionCount" | "recordingCount" | "durationMs" | "latestUpdatedAt"
>;
type SessionHistoryGroupSeed = Omit<MutableSessionHistoryGroup, "sessions">;

const INVALID_SORT_VALUE = Number.NEGATIVE_INFINITY;

export function getBrowserLocalDateKey(isoValue: string): string | null {
  const value = new Date(isoValue);

  if (!Number.isFinite(value.getTime())) {
    return null;
  }

  return [
    value.getFullYear().toString().padStart(4, "0"),
    (value.getMonth() + 1).toString().padStart(2, "0"),
    value.getDate().toString().padStart(2, "0")
  ].join("-");
}

export function groupPracticeSessionsByHistory(
  sessions: PracticeSession[],
  mode: SessionHistoryGroupingMode,
  targets: SessionHistoryTargetResolution = {}
): SessionHistoryGroup[] {
  const groups = new Map<string, MutableSessionHistoryGroup>();

  for (const session of sessions) {
    pushSessionToGroup(groups, getGroupSeed(session, mode, targets), session);
  }

  const finalizedGroups = Array.from(groups.values()).map(finalizeGroup);

  return finalizedGroups.sort(mode === "date" ? compareDateGroups : compareGroupsByNewest);
}

export function createSessionHistorySegmentTargetKey(sheetId: string, segmentId: string) {
  return `${encodeURIComponent(sheetId)}:${encodeURIComponent(segmentId)}`;
}

function getGroupSeed(
  session: PracticeSession,
  mode: SessionHistoryGroupingMode,
  targets: SessionHistoryTargetResolution
): SessionHistoryGroupSeed {
  if (mode === "date") {
    return getDateGroupSeed(session);
  }

  if (mode === "sheet") {
    return getSheetGroupSeed(session, targets);
  }

  return getSegmentGroupSeed(session, targets);
}

function getDateGroupSeed(session: PracticeSession): SessionHistoryGroupSeed {
  const localDate = getBrowserLocalDateKey(session.startedAt);

  return createGroupSeed({
    id: localDate ? `date:${localDate}` : "date:unknown",
    mode: "date",
    label: localDate ?? "Unknown date",
    sortKey: localDate ?? "unknown-date",
    targetState: "valid",
    localDate
  });
}

function getSheetGroupSeed(
  session: PracticeSession,
  targets: SessionHistoryTargetResolution
): SessionHistoryGroupSeed {
  if (session.sourceType === "quick") {
    return createGroupSeed({
      id: "sheet:quick",
      mode: "sheet",
      label: "Quick Practice",
      sortKey: "quick",
      targetState: "quick"
    });
  }

  const sheetId = normalizeRequiredString(session.sheetId);

  if (!sheetId) {
    return createGroupSeed({
      id: "sheet:missing",
      mode: "sheet",
      label: "Deleted sheet",
      sortKey: "missing-sheet",
      targetState: "missing-sheet"
    });
  }

  const sheetTarget = targets.sheets?.[sheetId];
  const targetState = getSheetTargetState(sheetTarget);
  const sheetName = sheetTarget?.state === "valid" ? normalizeRequiredString(sheetTarget.value.name) : null;

  return createGroupSeed({
    id: `sheet:id:${encodeURIComponent(sheetId)}`,
    mode: "sheet",
    label: targetState === "missing-sheet" ? "Deleted sheet" : sheetName ?? sheetId,
    sortKey: sheetId,
    targetState,
    sheetId,
    sheetName
  });
}

function getSegmentGroupSeed(
  session: PracticeSession,
  targets: SessionHistoryTargetResolution
): SessionHistoryGroupSeed {
  if (session.sourceType === "quick") {
    return createGroupSeed({
      id: "segment:quick",
      mode: "segment",
      label: "Quick Practice",
      sortKey: "quick",
      targetState: "quick"
    });
  }

  const sheetId = normalizeRequiredString(session.sheetId);

  if (!sheetId) {
    return createGroupSeed({
      id: "segment:missing-sheet",
      mode: "segment",
      label: "Deleted sheet",
      sortKey: "missing-sheet",
      targetState: "missing-sheet"
    });
  }

  const sheetTarget = targets.sheets?.[sheetId];
  const sheetName = sheetTarget?.state === "valid" ? normalizeRequiredString(sheetTarget.value.name) : null;
  const segmentId = normalizeRequiredString(session.segmentContext?.segmentId ?? null);

  if (!segmentId) {
    return createGroupSeed({
      id: `segment:sheet:${encodeURIComponent(sheetId)}:none`,
      mode: "segment",
      label: `${sheetName ?? sheetId} - No segment`,
      sortKey: `${sheetId}:no-segment`,
      targetState: "no-segment",
      sheetId,
      sheetName
    });
  }

  const segmentTarget = targets.segments?.[createSessionHistorySegmentTargetKey(sheetId, segmentId)];
  const segmentName = normalizeRequiredString(session.segmentContext?.segmentName ?? null);

  return createGroupSeed({
    id: `segment:sheet:${encodeURIComponent(sheetId)}:id:${encodeURIComponent(segmentId)}`,
    mode: "segment",
    label: segmentName ?? "Deleted segment",
    sortKey: `${sheetId}:${segmentId}`,
    targetState: getSegmentTargetState(sheetTarget, segmentTarget),
    sheetId,
    sheetName,
    segmentId,
    segmentName
  });
}

function createGroupSeed(
  seed: Partial<SessionHistoryGroupSeed> &
    Pick<SessionHistoryGroupSeed, "id" | "mode" | "label" | "sortKey" | "targetState">
): SessionHistoryGroupSeed {
  return {
    sheetId: null,
    sheetName: null,
    segmentId: null,
    segmentName: null,
    localDate: null,
    ...seed
  };
}

function pushSessionToGroup(
  groups: Map<string, MutableSessionHistoryGroup>,
  seed: SessionHistoryGroupSeed,
  session: PracticeSession
) {
  const group = groups.get(seed.id) ?? { ...seed, sessions: [] };

  group.sessions.push(session);
  groups.set(seed.id, group);
}

function finalizeGroup(group: MutableSessionHistoryGroup): SessionHistoryGroup {
  const sessions = [...group.sessions].sort(compareSessionsByNewest);
  const latestSession = sessions.find((session) => getSessionSortValue(session) !== INVALID_SORT_VALUE) ?? null;

  return {
    ...group,
    sessions,
    sessionCount: sessions.length,
    recordingCount: sessions.reduce((total, session) => total + session.recordingCount, 0),
    durationMs: sessions.reduce((total, session) => total + session.durationMs, 0),
    latestUpdatedAt: latestSession ? getSessionActivityTimestamp(latestSession) : null
  };
}

function getSheetTargetState(
  sheetTarget: SessionHistoryLookupResult<SessionHistorySheetTarget> | undefined
): SessionHistoryGroupTargetState {
  if (!sheetTarget || sheetTarget.state === "valid") {
    return "valid";
  }

  return sheetTarget.state === "lookup-failed" ? "lookup-failed" : "missing-sheet";
}

function getSegmentTargetState(
  sheetTarget: SessionHistoryLookupResult<SessionHistorySheetTarget> | undefined,
  segmentTarget: SessionHistoryLookupResult<SessionHistorySegmentTarget> | undefined
): SessionHistoryGroupTargetState {
  if (sheetTarget?.state === "lookup-failed" || segmentTarget?.state === "lookup-failed") {
    return "lookup-failed";
  }

  if (sheetTarget?.state === "missing") {
    return "missing-sheet";
  }

  return segmentTarget?.state === "missing" ? "missing-segment" : "valid";
}

function compareDateGroups(left: SessionHistoryGroup, right: SessionHistoryGroup) {
  if (left.localDate && right.localDate && left.localDate !== right.localDate) {
    return right.localDate.localeCompare(left.localDate);
  }

  if (left.localDate !== right.localDate) {
    return left.localDate ? -1 : 1;
  }

  return compareGroupsByNewest(left, right);
}

function compareGroupsByNewest(left: SessionHistoryGroup, right: SessionHistoryGroup) {
  return (
    compareSortValuesByNewest(getGroupSortValue(left), getGroupSortValue(right)) ||
    compareStrings(left.id, right.id) ||
    compareNullableStrings(left.sheetId, right.sheetId) ||
    compareNullableStrings(left.segmentId, right.segmentId)
  );
}

function compareSessionsByNewest(left: PracticeSession, right: PracticeSession) {
  return (
    compareSortValuesByNewest(getSessionSortValue(left), getSessionSortValue(right)) ||
    compareStrings(left.id, right.id) ||
    compareStrings(left.sourceType, right.sourceType) ||
    compareNullableStrings(left.sheetId, right.sheetId) ||
    compareNullableStrings(left.segmentContext?.segmentId ?? null, right.segmentContext?.segmentId ?? null)
  );
}

function getGroupSortValue(group: SessionHistoryGroup) {
  return group.latestUpdatedAt ? getTimestampSortValue(group.latestUpdatedAt) : INVALID_SORT_VALUE;
}

function getSessionSortValue(session: PracticeSession) {
  return getTimestampSortValue(getSessionActivityTimestamp(session));
}

function getSessionActivityTimestamp(session: PracticeSession) {
  return session.updatedAt || session.startedAt;
}

function getTimestampSortValue(value: string) {
  const timestamp = Date.parse(value);

  return Number.isFinite(timestamp) ? timestamp : INVALID_SORT_VALUE;
}

function normalizeRequiredString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
}

function compareSortValuesByNewest(left: number, right: number) {
  if (left === right) {
    return 0;
  }

  return right > left ? 1 : -1;
}

function compareStrings(left: string, right: string) {
  return left.localeCompare(right);
}

function compareNullableStrings(left: string | null, right: string | null) {
  return (left ?? "").localeCompare(right ?? "");
}
