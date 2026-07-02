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

export const DEFAULT_SESSION_COMPARISON_LIMIT = 8;
export const SESSION_COMPARISON_MAX_SELECTED = 3 as const;

export type SessionComparisonTargetState =
  | "quick"
  | "valid"
  | "missing-sheet"
  | "missing-segment"
  | "lookup-failed"
  | "no-target";

export type SessionComparisonValueTone = "neutral" | "muted" | "warning";
export type SessionComparisonUnavailableKey = "events" | "goals" | "audio";

export type SessionComparisonCandidate = {
  sessionId: string;
  label: string;
  sourceType: PracticeSession["sourceType"];
  startedAt: string;
  endedAt: string | null;
  updatedAt: string;
  sortTimestamp: string | null;
  durationMs: number;
  bpm: number | null;
  timeSignature: PracticeTimeSignature | null;
  recordingCount: number;
  linkedRecordingMetadataCount: number;
  linkedRecordingDurationMs: number;
  latestRecordingId: string | null;
  sheetId: string | null;
  sheetName: string | null;
  segmentId: string | null;
  segmentName: string | null;
  segmentRangeLabel: string | null;
  targetState: SessionComparisonTargetState;
};

export type SessionComparisonMetric = {
  key: string;
  label: string;
  values: Array<{
    sessionId: string;
    text: string;
    tone: SessionComparisonValueTone;
  }>;
};

export type SessionComparisonUnavailable = {
  key: SessionComparisonUnavailableKey;
  label: string;
  reason: string;
};

export type SessionComparisonResult = {
  generatedAt: string;
  candidates: SessionComparisonCandidate[];
  selectedSessionIds: string[];
  comparedSessions: SessionComparisonCandidate[];
  metrics: SessionComparisonMetric[];
  unavailable: SessionComparisonUnavailable[];
  limit: number;
  maxSelected: typeof SESSION_COMPARISON_MAX_SELECTED;
};

export type SessionComparisonOptions = {
  selectedSessionIds?: readonly string[];
  limit?: number;
};

export type SessionComparisonTargetResolution = {
  sheets?: Record<string, SessionHistoryLookupResult<SessionHistorySheetTarget>>;
  segments?: Record<string, SessionHistoryLookupResult<SessionHistorySegmentTarget>>;
};

export type SessionComparisonSourceInput = SessionComparisonOptions & {
  sessions: readonly PracticeSession[];
  recordings: readonly SheetRecordingMetadata[];
  targets?: SessionComparisonTargetResolution;
  generatedAt: string;
};

type LinkedRecordingSummary = {
  count: number;
  durationMs: number;
};

type ResolvedTarget = {
  targetState: SessionComparisonTargetState;
  sheetId: string | null;
  sheetName: string | null;
  segmentId: string | null;
  segmentName: string | null;
  segmentRangeLabel: string | null;
};

const INVALID_SORT_VALUE = Number.NEGATIVE_INFINITY;

export function getSessionComparison({
  sessions,
  recordings,
  targets = {},
  generatedAt,
  selectedSessionIds,
  limit
}: SessionComparisonSourceInput): SessionComparisonResult {
  const linkedRecordings = summarizeLinkedRecordings(recordings);
  const candidates = sessions
    .map((session) => createCandidate(session, linkedRecordings.get(session.id), targets))
    .filter((candidate): candidate is SessionComparisonCandidate => candidate !== null)
    .sort(compareCandidates)
    .slice(0, normalizeLimit(limit));
  const candidateIds = new Set(candidates.map((candidate) => candidate.sessionId));
  const sanitizedSelectedSessionIds = sanitizeSelectedSessionIds(selectedSessionIds, candidateIds);
  const comparedSessions = sanitizedSelectedSessionIds
    .map((sessionId) => candidates.find((candidate) => candidate.sessionId === sessionId))
    .filter((candidate): candidate is SessionComparisonCandidate => candidate !== undefined);

  return {
    generatedAt,
    candidates,
    selectedSessionIds: sanitizedSelectedSessionIds,
    comparedSessions,
    metrics: comparedSessions.length >= 2 ? createMetrics(comparedSessions) : [],
    unavailable: createUnavailableEntries(),
    limit: normalizeLimit(limit),
    maxSelected: SESSION_COMPARISON_MAX_SELECTED
  };
}

function summarizeLinkedRecordings(recordings: readonly SheetRecordingMetadata[]) {
  const summaries = new Map<string, LinkedRecordingSummary>();

  for (const recording of recordings) {
    const sessionId = requiredString(recording.sessionId);

    if (!sessionId || recording.type !== "sheet") {
      continue;
    }

    const current = summaries.get(sessionId) ?? { count: 0, durationMs: 0 };

    summaries.set(sessionId, {
      count: current.count + 1,
      durationMs: current.durationMs + validDuration(recording.durationMs)
    });
  }

  return summaries;
}

function createCandidate(
  session: PracticeSession,
  linkedRecordingSummary: LinkedRecordingSummary | undefined,
  targets: SessionComparisonTargetResolution
) {
  const sessionId = requiredString(session.id);

  if (!sessionId) {
    return null;
  }

  const target = resolveTarget(session, targets);
  const linkedRecordingMetadataCount = linkedRecordingSummary?.count ?? 0;

  return {
    sessionId,
    label: createCandidateLabel(session, target),
    sourceType: session.sourceType,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    updatedAt: session.updatedAt,
    sortTimestamp: validTimestamp(session.updatedAt || session.startedAt),
    durationMs: validDuration(session.durationMs),
    bpm: validBpm(session.bpm),
    timeSignature: session.timeSignature ?? null,
    recordingCount: validCount(session.recordingCount),
    linkedRecordingMetadataCount,
    linkedRecordingDurationMs: linkedRecordingSummary?.durationMs ?? 0,
    latestRecordingId: requiredString(session.latestRecordingId),
    sheetId: target.sheetId,
    sheetName: target.sheetName,
    segmentId: target.segmentId,
    segmentName: target.segmentName,
    segmentRangeLabel: target.segmentRangeLabel,
    targetState: target.targetState
  } satisfies SessionComparisonCandidate;
}

function resolveTarget(
  session: PracticeSession,
  targets: SessionComparisonTargetResolution
): ResolvedTarget {
  if (session.sourceType === "quick") {
    return target("quick", null, null, null, null, null);
  }

  const sheetId = requiredString(session.sheetId);
  const segmentContext = session.segmentContext ?? null;
  const segmentId = requiredString(segmentContext?.segmentId);
  const snapshotSegmentName = requiredString(segmentContext?.segmentName);
  const segmentRangeLabel = formatSegmentRange(segmentContext);

  if (!sheetId || (segmentContext && !segmentId)) {
    return target("no-target", sheetId, null, segmentId, snapshotSegmentName, segmentRangeLabel);
  }

  const sheetTarget = targets.sheets?.[sheetId];
  const sheetName = sheetTarget?.state === "valid"
    ? requiredString(sheetTarget.value.name)
    : null;

  if (sheetTarget?.state === "lookup-failed") {
    return target("lookup-failed", sheetId, sheetName, segmentId, snapshotSegmentName, segmentRangeLabel);
  }

  if (sheetTarget?.state === "missing") {
    return target("missing-sheet", sheetId, sheetName, segmentId, snapshotSegmentName, segmentRangeLabel);
  }

  if (!segmentContext) {
    return target("valid", sheetId, sheetName, null, null, null);
  }

  if (!segmentId) {
    return target("no-target", sheetId, sheetName, null, snapshotSegmentName, segmentRangeLabel);
  }

  const segmentTarget = targets.segments?.[createSessionHistorySegmentTargetKey(sheetId, segmentId)];

  if (segmentTarget?.state === "lookup-failed") {
    return target("lookup-failed", sheetId, sheetName, segmentId, snapshotSegmentName, segmentRangeLabel);
  }

  if (segmentTarget?.state === "missing") {
    return target("missing-segment", sheetId, sheetName, segmentId, snapshotSegmentName, segmentRangeLabel);
  }

  return target("valid", sheetId, sheetName, segmentId, snapshotSegmentName, segmentRangeLabel);
}

function target(
  targetState: SessionComparisonTargetState,
  sheetId: string | null,
  sheetName: string | null,
  segmentId: string | null,
  segmentName: string | null,
  segmentRangeLabel: string | null
): ResolvedTarget {
  return {
    targetState,
    sheetId,
    sheetName,
    segmentId,
    segmentName,
    segmentRangeLabel
  };
}

function createCandidateLabel(session: PracticeSession, target: ResolvedTarget) {
  const timestamp = formatTimestamp(validTimestamp(session.updatedAt || session.startedAt));

  if (session.sourceType === "quick") {
    return `Quick practice - ${timestamp}`;
  }

  if (target.targetState === "missing-sheet") {
    return `Deleted sheet - ${timestamp}`;
  }

  if (target.segmentName) {
    return `${target.segmentName} - ${timestamp}`;
  }

  return `${target.sheetName ?? target.sheetId ?? "Sheet practice"} - ${timestamp}`;
}

function sanitizeSelectedSessionIds(
  selectedSessionIds: readonly string[] | undefined,
  candidateIds: ReadonlySet<string>
) {
  const sanitized: string[] = [];

  for (const selectedSessionId of selectedSessionIds ?? []) {
    const sessionId = requiredString(selectedSessionId);

    if (
      sessionId &&
      candidateIds.has(sessionId) &&
      !sanitized.includes(sessionId) &&
      sanitized.length < SESSION_COMPARISON_MAX_SELECTED
    ) {
      sanitized.push(sessionId);
    }
  }

  return sanitized;
}

function createMetrics(comparedSessions: SessionComparisonCandidate[]): SessionComparisonMetric[] {
  return [
    metric("sessionType", "Session type", comparedSessions, (session) =>
      value(session.sourceType === "quick" ? "Quick practice" : "Sheet practice")),
    metric("started", "Started", comparedSessions, (session) =>
      timestampValue(session.startedAt)),
    metric("updated", "Last updated", comparedSessions, (session) =>
      timestampValue(session.updatedAt)),
    metric("duration", "Duration", comparedSessions, (session) =>
      value(formatDuration(session.durationMs))),
    metric("bpm", "BPM", comparedSessions, (session) =>
      session.bpm === null ? value("Not set", "muted") : value(`${session.bpm} BPM`)),
    metric("timeSignature", "Time signature", comparedSessions, (session) =>
      session.timeSignature ? value(session.timeSignature) : value("Not set", "muted")),
    metric("recordings", "Recordings", comparedSessions, (session) =>
      value(formatRecordingSummary(session))),
    metric("sheet", "Sheet", comparedSessions, (session) =>
      targetValue(session, formatSheetLabel(session))),
    metric("segment", "Segment", comparedSessions, (session) =>
      targetValue(session, formatSegmentLabel(session))),
    metric("goalContribution", "Goal contribution", comparedSessions, (session) =>
      value(formatGoalContribution(session))),
    metric("events", "Events", comparedSessions, () =>
      value("Event details not available yet", "muted"))
  ];
}

function metric(
  key: string,
  label: string,
  sessions: SessionComparisonCandidate[],
  getValue: (session: SessionComparisonCandidate) => { text: string; tone: SessionComparisonValueTone }
): SessionComparisonMetric {
  return {
    key,
    label,
    values: sessions.map((session) => ({
      sessionId: session.sessionId,
      ...getValue(session)
    }))
  };
}

function value(text: string, tone: SessionComparisonValueTone = "neutral") {
  return { text, tone };
}

function timestampValue(timestamp: string) {
  const formattedTimestamp = formatTimestamp(validTimestamp(timestamp));

  return value(formattedTimestamp, formattedTimestamp === "Unknown time" ? "muted" : "neutral");
}

function targetValue(
  session: SessionComparisonCandidate,
  text: string
) {
  return value(
    text,
    session.targetState === "missing-sheet" ||
      session.targetState === "missing-segment" ||
      session.targetState === "lookup-failed" ||
      session.targetState === "no-target"
      ? "warning"
      : "neutral"
  );
}

function formatRecordingSummary(session: SessionComparisonCandidate) {
  if (session.recordingCount === 0 && session.linkedRecordingMetadataCount === 0) {
    return "No recordings";
  }

  const parts = [
    `${session.recordingCount} session recording${session.recordingCount === 1 ? "" : "s"}`,
    `${session.linkedRecordingMetadataCount} linked sheet take${session.linkedRecordingMetadataCount === 1 ? "" : "s"}`
  ];

  if (session.latestRecordingId) {
    parts.push(`latest ${session.latestRecordingId}`);
  }

  return parts.join("; ");
}

function formatSheetLabel(session: SessionComparisonCandidate) {
  if (session.sourceType === "quick") {
    return "Quick metronome";
  }

  if (session.targetState === "missing-sheet") {
    return "Deleted sheet";
  }

  if (session.targetState === "lookup-failed") {
    return session.sheetId ? `${session.sheetId} (lookup failed)` : "Sheet lookup failed";
  }

  if (session.targetState === "no-target") {
    return "No sheet target";
  }

  return session.sheetName ?? session.sheetId ?? "Sheet practice";
}

function formatSegmentLabel(session: SessionComparisonCandidate) {
  if (session.sourceType === "quick") {
    return "Quick metronome";
  }

  if (!session.segmentId) {
    return "Whole sheet / no segment";
  }

  const label = [
    session.segmentName ?? (
      session.targetState === "missing-segment" ? "Deleted segment" : "Saved segment"
    ),
    session.segmentRangeLabel
  ].filter(Boolean).join(" ");

  if (session.targetState === "missing-segment") {
    return `${label} (missing)`;
  }

  if (session.targetState === "lookup-failed") {
    return `${label} (lookup failed)`;
  }

  return label;
}

function formatGoalContribution(session: SessionComparisonCandidate) {
  const minutes = Math.floor(session.durationMs / 60_000);

  return [
    "Counts as 1 session",
    `adds ${minutes} min`,
    `${session.linkedRecordingMetadataCount} sheet take${session.linkedRecordingMetadataCount === 1 ? "" : "s"} linked`
  ].join("; ");
}

function createUnavailableEntries(): SessionComparisonUnavailable[] {
  return [
    {
      key: "events",
      label: "Events",
      reason: "Event details are unavailable because no durable session event read source is exposed."
    },
    {
      key: "audio",
      label: "Audio",
      reason: "Audio and waveform comparison are outside this metadata-only read model."
    }
  ];
}

function compareCandidates(left: SessionComparisonCandidate, right: SessionComparisonCandidate) {
  return (
    compareSortValues(getSortValue(left), getSortValue(right)) ||
    left.sessionId.localeCompare(right.sessionId) ||
    left.sourceType.localeCompare(right.sourceType) ||
    (left.sheetId ?? "").localeCompare(right.sheetId ?? "") ||
    (left.segmentId ?? "").localeCompare(right.segmentId ?? "")
  );
}

function getSortValue(candidate: SessionComparisonCandidate) {
  return candidate.sortTimestamp ? Date.parse(candidate.sortTimestamp) : INVALID_SORT_VALUE;
}

function compareSortValues(left: number, right: number) {
  return left === right ? 0 : right > left ? 1 : -1;
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Unknown time";
  }

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "Unknown time";
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes} UTC`;
}

function formatDuration(durationMs: number) {
  if (durationMs <= 0) {
    return "0s";
  }

  if (durationMs < 1_000) {
    return "<1s";
  }

  const seconds = Math.round(durationMs / 1_000);
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;

  return minutes > 0
    ? remainder > 0 ? `${minutes}m ${remainder}s` : `${minutes}m`
    : `${seconds}s`;
}

function formatSegmentRange(segmentContext: SheetRecordingSegmentContext | null | undefined) {
  const range = segmentContext?.range;

  return range && Number.isFinite(range.startMeasure) && Number.isFinite(range.endMeasure)
    ? `m${range.startMeasure}-${range.endMeasure}`
    : null;
}

function validTimestamp(value: string) {
  return Number.isFinite(Date.parse(value)) ? value : null;
}

function validDuration(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

function validCount(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 0;
}

function validBpm(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.round(value)
    : null;
}

function normalizeLimit(value: number | undefined) {
  return value === undefined || !Number.isFinite(value)
    ? DEFAULT_SESSION_COMPARISON_LIMIT
    : Math.max(0, Math.floor(value));
}

function requiredString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
}
