import { getSheetPracticeHref } from "@/domain/sheet/routes";
import type {
  HomeRecentActivityItem,
  HomeRecentActivityKind,
  HomeRecentActivityResult,
  HomeRecentActivityTargetState
} from "@/domain/practice/recent-activity";
import type { ContinuePracticeTarget } from "@/domain/practice/types";

export const DEFAULT_CONTINUE_PRACTICE_TARGET_LIMIT = 5;

export type ContinuePracticeTargetKind = "quick" | "sheet" | "segment";
export type ContinuePracticeTargetActivitySource = "session" | "recording";
export type ContinuePracticeRejectedTargetReason =
  | "lookup-failed"
  | "missing-sheet"
  | "missing-segment"
  | "no-target";

type ContinuePracticeTargetBase = {
  kind: ContinuePracticeTargetKind;
  sourceType: "quick" | "sheet";
  activitySource: ContinuePracticeTargetActivitySource;
  label: string;
  sessionId: string | null;
  recordingId: string | null;
  occurredAt: string;
  sortTimestamp: string | null;
  targetKey: string;
};

export type ContinuePracticeTargetIdentity =
  | (ContinuePracticeTargetBase & {
      kind: "quick";
      sourceType: "quick";
      activitySource: "session";
      targetKey: "quick";
    })
  | (ContinuePracticeTargetBase & {
      kind: "sheet";
      sourceType: "sheet";
      sheetId: string;
      sheetName: string | null;
    })
  | (ContinuePracticeTargetBase & {
      kind: "segment";
      sourceType: "sheet";
      sheetId: string;
      sheetName: string | null;
      segmentId: string;
      segmentName: string | null;
      segmentRangeLabel: string | null;
    });

export type ContinuePracticeRejectedTarget = {
  id: string;
  kind: HomeRecentActivityKind;
  targetState: HomeRecentActivityTargetState;
  reason: ContinuePracticeRejectedTargetReason;
  sessionId: string | null;
  recordingId: string | null;
  sheetId: string | null;
  segmentId: string | null;
};

export type ContinuePracticeTargetsOptions = {
  limit?: number;
};

export type ContinuePracticeTargetsResult = {
  targets: ContinuePracticeTargetIdentity[];
  generatedAt: string;
  limit: number;
  rejected: ContinuePracticeRejectedTarget[];
};

type Candidate = {
  target: ContinuePracticeTargetIdentity;
  sourceIndex: number;
};

const INVALID_SORT_VALUE = Number.NEGATIVE_INFINITY;
const TARGET_SPECIFICITY: Record<ContinuePracticeTargetKind, number> = {
  segment: 0,
  sheet: 1,
  quick: 2
};
const ACTIVITY_SOURCE_PRIORITY: Record<ContinuePracticeTargetActivitySource, number> = {
  recording: 0,
  session: 1
};

export function selectContinuePracticeTargets(
  recentActivity: HomeRecentActivityResult,
  options: ContinuePracticeTargetsOptions = {}
): ContinuePracticeTargetsResult {
  const rejected: ContinuePracticeRejectedTarget[] = [];
  const candidates: Candidate[] = [];

  recentActivity.items.forEach((item, sourceIndex) => {
    const candidate = createTargetCandidate(item);

    if (candidate) {
      candidates.push({ target: candidate, sourceIndex });
      return;
    }

    rejected.push(createRejectedTarget(item));
  });

  const dedupedTargets = new Map<string, ContinuePracticeTargetIdentity>();

  for (const candidate of candidates.sort(compareCandidates)) {
    if (!dedupedTargets.has(candidate.target.targetKey)) {
      dedupedTargets.set(candidate.target.targetKey, candidate.target);
    }
  }

  const limit = normalizeLimit(options.limit);

  return {
    targets: Array.from(dedupedTargets.values()).slice(0, limit),
    generatedAt: recentActivity.generatedAt,
    limit,
    rejected
  };
}

export function getHomeCompatibleContinuePracticeTarget(
  targets: ContinuePracticeTargetIdentity[]
): ContinuePracticeTarget | null {
  for (const target of targets) {
    if (target.kind === "quick" && target.sessionId) {
      return {
        sourceType: "quick",
        href: "/quick-metronome",
        label: "Continue Quick Practice",
        sessionId: target.sessionId
      };
    }

    if (target.kind === "sheet" && target.sessionId) {
      return {
        sourceType: "sheet",
        href: getSheetPracticeHref(target.sheetId),
        label: "Continue Sheet Practice",
        sessionId: target.sessionId,
        sheetId: target.sheetId
      };
    }
  }

  return null;
}

function createTargetCandidate(item: HomeRecentActivityItem): ContinuePracticeTargetIdentity | null {
  const activitySource = getActivitySource(item);

  if (!activitySource) {
    return null;
  }

  if (item.kind === "quick-session") {
    return item.targetState === "quick" && item.sessionId && !item.sheetId && !item.segmentId
      ? {
          kind: "quick",
          sourceType: "quick",
          activitySource: "session",
          label: item.label,
          sessionId: item.sessionId,
          recordingId: null,
          occurredAt: item.occurredAt,
          sortTimestamp: item.sortTimestamp,
          targetKey: "quick"
        }
      : null;
  }

  if (item.targetState !== "valid") {
    return null;
  }

  if ((item.kind === "sheet-session" || item.kind === "sheet-recording") && item.sheetId) {
    return {
      kind: "sheet",
      sourceType: "sheet",
      activitySource,
      label: item.label,
      sessionId: item.sessionId,
      recordingId: item.recordingId,
      occurredAt: item.occurredAt,
      sortTimestamp: item.sortTimestamp,
      targetKey: `sheet:${item.sheetId}`,
      sheetId: item.sheetId,
      sheetName: item.sheetName
    };
  }

  if (
    (item.kind === "segment-session" || item.kind === "segment-recording") &&
    item.sheetId &&
    item.segmentId
  ) {
    return {
      kind: "segment",
      sourceType: "sheet",
      activitySource,
      label: item.label,
      sessionId: item.sessionId,
      recordingId: item.recordingId,
      occurredAt: item.occurredAt,
      sortTimestamp: item.sortTimestamp,
      targetKey: `segment:${item.sheetId}:${item.segmentId}`,
      sheetId: item.sheetId,
      sheetName: item.sheetName,
      segmentId: item.segmentId,
      segmentName: item.segmentName,
      segmentRangeLabel: getSegmentRangeLabel(item)
    };
  }

  return null;
}

function createRejectedTarget(item: HomeRecentActivityItem): ContinuePracticeRejectedTarget {
  return {
    id: item.id,
    kind: item.kind,
    targetState: item.targetState,
    reason: getRejectedReason(item),
    sessionId: item.sessionId,
    recordingId: item.recordingId,
    sheetId: item.sheetId,
    segmentId: item.segmentId
  };
}

function getRejectedReason(item: HomeRecentActivityItem): ContinuePracticeRejectedTargetReason {
  switch (item.targetState) {
    case "lookup-failed":
      return "lookup-failed";
    case "missing-sheet":
      return "missing-sheet";
    case "missing-segment":
      return "missing-segment";
    case "no-target":
    case "quick":
    case "valid":
      return "no-target";
  }
}

function getActivitySource(item: HomeRecentActivityItem): ContinuePracticeTargetActivitySource | null {
  if (item.kind === "sheet-recording" || item.kind === "segment-recording") {
    return item.recordingId ? "recording" : null;
  }

  return item.sessionId ? "session" : null;
}

function getSegmentRangeLabel(item: HomeRecentActivityItem) {
  return item.metadata.find((entry) => /^m\d+(\.\d+)?-\d+(\.\d+)?$/.test(entry)) ?? null;
}

function compareCandidates(left: Candidate, right: Candidate) {
  return (
    compareSortValues(sortValue(left.target), sortValue(right.target)) ||
    TARGET_SPECIFICITY[left.target.kind] - TARGET_SPECIFICITY[right.target.kind] ||
    ACTIVITY_SOURCE_PRIORITY[left.target.activitySource] -
      ACTIVITY_SOURCE_PRIORITY[right.target.activitySource] ||
    left.target.targetKey.localeCompare(right.target.targetKey) ||
    left.sourceIndex - right.sourceIndex
  );
}

function sortValue(target: ContinuePracticeTargetIdentity) {
  if (!target.sortTimestamp) {
    return INVALID_SORT_VALUE;
  }

  const timestamp = Date.parse(target.sortTimestamp);

  return Number.isFinite(timestamp) ? timestamp : INVALID_SORT_VALUE;
}

function compareSortValues(left: number, right: number) {
  return left === right ? 0 : right > left ? 1 : -1;
}

function normalizeLimit(value: number | undefined) {
  return value === undefined || !Number.isFinite(value)
    ? DEFAULT_CONTINUE_PRACTICE_TARGET_LIMIT
    : Math.max(0, Math.floor(value));
}
