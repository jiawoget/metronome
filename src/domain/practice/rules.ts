import type {
  ContinuePracticeTarget,
  GoalCompletionEvaluation,
  LocalPracticeGoal,
  LocalPracticeGoalKind,
  LocalPracticeGoalPeriod,
  LocalPracticeGoalStatus,
  PracticeActivityTrigger,
  PracticeSession,
  PracticeTransportState,
  SheetRecordingMetadata,
  TodayPracticeSummary
} from "@/domain/practice/types";
import { getSheetPracticeHref } from "@/domain/sheet/routes";

export type PracticeSessionDurationInput = Pick<PracticeSession, "startedAt" | "endedAt">;

function parseFiniteTimestampMs(value: Date | string | null | undefined) {
  if (value instanceof Date) {
    const timestamp = value.getTime();

    return Number.isFinite(timestamp) ? timestamp : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const timestamp = Date.parse(value);

  return Number.isFinite(timestamp) ? timestamp : null;
}

export function calculatePracticeDurationMs(
  session: PracticeSessionDurationInput,
  now = new Date()
) {
  const startedAtMs = parseFiniteTimestampMs(session.startedAt);
  const endMs = parseFiniteTimestampMs(session.endedAt === null ? now : session.endedAt);

  if (startedAtMs === null || endMs === null) {
    return 0;
  }

  return Math.max(0, Math.round(endMs - startedAtMs));
}

export function withUpdatedPracticeSessionDuration(
  session: PracticeSession,
  updatedAt: string
): PracticeSession {
  return {
    ...session,
    durationMs: calculatePracticeDurationMs(session, new Date(updatedAt)),
    updatedAt
  };
}

export function sortSessionsByRecentActivity(sessions: PracticeSession[]) {
  return [...sessions].sort((first, second) => {
    const firstTime = Date.parse(first.updatedAt || first.startedAt);
    const secondTime = Date.parse(second.updatedAt || second.startedAt);

    return secondTime - firstTime;
  });
}

export function getContinuePracticeTarget(session: PracticeSession | null): ContinuePracticeTarget | null {
  if (!session) {
    return null;
  }

  if (session.sourceType === "quick") {
    return {
      sourceType: "quick",
      href: "/quick-metronome",
      label: "Continue Quick Practice",
      sessionId: session.id
    };
  }

  if (!session.sheetId) {
    return null;
  }

  return {
    sourceType: "sheet",
    href: getSheetPracticeHref(session.sheetId),
    label: "Continue Sheet Practice",
    sessionId: session.id,
    sheetId: session.sheetId
  };
}

export function isBrowserLocalDay(isoValue: string, now = new Date()) {
  const value = new Date(isoValue);

  if (!Number.isFinite(value.getTime())) {
    return false;
  }

  return (
    value.getFullYear() === now.getFullYear() &&
    value.getMonth() === now.getMonth() &&
    value.getDate() === now.getDate()
  );
}

export function getTodayPracticeSummary(
  sessions: PracticeSession[],
  now = new Date()
): TodayPracticeSummary {
  const todaySessions = sessions.filter((session) => isBrowserLocalDay(session.startedAt, now));
  const durationMs = todaySessions.reduce((total, session) => total + session.durationMs, 0);

  return {
    durationMs,
    minutesToday: Math.round(durationMs / 60_000),
    sessionsToday: todaySessions.length,
    recordingsToday: todaySessions.reduce((total, session) => total + session.recordingCount, 0)
  };
}

export type PracticeGoalEvaluationInput = {
  goals: readonly LocalPracticeGoal[];
  sessions: readonly PracticeSession[];
  recordings: readonly SheetRecordingMetadata[];
  now?: Date;
};

const LOCAL_PRACTICE_GOAL_KINDS = new Set<LocalPracticeGoalKind>(["minutes", "sessions", "takes"]);
const LOCAL_PRACTICE_GOAL_PERIODS = new Set<LocalPracticeGoalPeriod>(["today", "all-time"]);
const LOCAL_PRACTICE_GOAL_STATUSES = new Set<LocalPracticeGoalStatus>(["active", "completed", "invalid"]);

function isFiniteIsoDate(value: unknown) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function normalizeGoalId(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeGoalKind(value: unknown): LocalPracticeGoalKind | null {
  return typeof value === "string" && LOCAL_PRACTICE_GOAL_KINDS.has(value as LocalPracticeGoalKind)
    ? (value as LocalPracticeGoalKind)
    : null;
}

function normalizeGoalPeriod(value: unknown): LocalPracticeGoalPeriod | null {
  return typeof value === "string" && LOCAL_PRACTICE_GOAL_PERIODS.has(value as LocalPracticeGoalPeriod)
    ? (value as LocalPracticeGoalPeriod)
    : null;
}

function normalizeGoalStatus(value: unknown): LocalPracticeGoalStatus | null {
  if (value === undefined || value === null) {
    return "active";
  }

  return typeof value === "string" && LOCAL_PRACTICE_GOAL_STATUSES.has(value as LocalPracticeGoalStatus)
    ? (value as LocalPracticeGoalStatus)
    : null;
}

function normalizeGoalTarget(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value) && value > 0
    ? value
    : null;
}

function invalidGoalEvaluation(
  goalId: string,
  kind: LocalPracticeGoalKind | null,
  reason: string
): GoalCompletionEvaluation {
  return {
    goalId,
    kind,
    status: "invalid",
    progress: 0,
    target: null,
    progressRatio: 0,
    completedAt: null,
    reason
  };
}

function isInGoalPeriod(period: LocalPracticeGoalPeriod, isoValue: string, now: Date) {
  if (!isFiniteIsoDate(isoValue)) {
    return false;
  }

  return period === "all-time" || isBrowserLocalDay(isoValue, now);
}

function sumGoalDurationMs(
  sessions: readonly PracticeSession[],
  period: LocalPracticeGoalPeriod,
  now: Date
) {
  return sessions.reduce((total, session) => {
    if (!isInGoalPeriod(period, session.startedAt, now)) {
      return total;
    }

    return total + (Number.isFinite(session.durationMs) && session.durationMs > 0 ? session.durationMs : 0);
  }, 0);
}

function countGoalSessions(
  sessions: readonly PracticeSession[],
  period: LocalPracticeGoalPeriod,
  now: Date
) {
  return sessions.filter((session) => isInGoalPeriod(period, session.startedAt, now)).length;
}

function countGoalRecordings(
  recordings: readonly SheetRecordingMetadata[],
  period: LocalPracticeGoalPeriod,
  now: Date
) {
  return recordings.filter((recording) =>
    recording.type === "sheet" && isInGoalPeriod(period, recording.createdAt, now)
  ).length;
}

function clampGoalProgressRatio(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
}

function getValidCompletedAt(goal: LocalPracticeGoal) {
  return isFiniteIsoDate(goal.completedAt) ? goal.completedAt ?? null : null;
}

function createCompletedEvaluation(
  goal: LocalPracticeGoal,
  kind: LocalPracticeGoalKind,
  target: number,
  progress: number,
  progressRatio: number,
  now: Date,
  status: LocalPracticeGoalStatus
): GoalCompletionEvaluation {
  return {
    goalId: goal.id.trim(),
    kind,
    status: "completed",
    progress,
    target,
    progressRatio: clampGoalProgressRatio(progressRatio),
    completedAt: status === "completed" ? getValidCompletedAt(goal) ?? now.toISOString() : now.toISOString(),
    reason: null
  };
}

function createIncompleteEvaluation(
  goal: LocalPracticeGoal,
  kind: LocalPracticeGoalKind,
  target: number,
  progress: number,
  progressRatio: number,
  status: "not-started" | "in-progress" = progress > 0 ? "in-progress" : "not-started"
): GoalCompletionEvaluation {
  return {
    goalId: goal.id.trim(),
    kind,
    status,
    progress,
    target,
    progressRatio: clampGoalProgressRatio(progressRatio),
    completedAt: null,
    reason: null
  };
}

export function evaluatePracticeGoalCompletion({
  goals,
  sessions,
  recordings,
  now = new Date()
}: PracticeGoalEvaluationInput): GoalCompletionEvaluation[] {
  return goals.map((goal) => {
    const goalId = normalizeGoalId(goal.id);
    const kind = normalizeGoalKind(goal.kind);
    const period = normalizeGoalPeriod(goal.period);
    const status = normalizeGoalStatus(goal.status);
    const target = normalizeGoalTarget(goal.target);

    if (!goalId) {
      return invalidGoalEvaluation(goalId, kind, "missing-goal-id");
    }

    if (status === "invalid") {
      return invalidGoalEvaluation(goalId, kind, "goal-status-invalid");
    }

    if (!status) {
      return invalidGoalEvaluation(goalId, kind, "unknown-goal-status");
    }

    if (!kind) {
      return invalidGoalEvaluation(goalId, null, "unsupported-goal-kind");
    }

    if (target === null) {
      return invalidGoalEvaluation(goalId, kind, "invalid-goal-target");
    }

    if (!period) {
      return invalidGoalEvaluation(goalId, kind, "invalid-goal-period");
    }

    if (!isFiniteIsoDate(goal.createdAt)) {
      return invalidGoalEvaluation(goalId, kind, "invalid-goal-created-at");
    }

    if (kind === "minutes") {
      const durationMs = sumGoalDurationMs(sessions, period, now);
      const targetMs = target * 60_000;
      const progress = Math.floor(durationMs / 60_000);
      const progressRatio = durationMs / targetMs;

      return durationMs >= targetMs
        ? createCompletedEvaluation(goal, kind, target, progress, progressRatio, now, status)
        : createIncompleteEvaluation(
          goal,
          kind,
          target,
          progress,
          progressRatio,
          durationMs > 0 ? "in-progress" : "not-started"
        );
    }

    const progress = kind === "sessions"
      ? countGoalSessions(sessions, period, now)
      : countGoalRecordings(recordings, period, now);
    const progressRatio = progress / target;

    return progress >= target
      ? createCompletedEvaluation(goal, kind, target, progress, progressRatio, now, status)
      : createIncompleteEvaluation(goal, kind, target, progress, progressRatio);
  });
}

export function applyPracticeTrigger(
  state: PracticeTransportState,
  trigger: PracticeActivityTrigger,
  active: boolean
): PracticeTransportState {
  return {
    ...state,
    metronomeActive: trigger === "metronome" ? active : state.metronomeActive,
    recordingActive: trigger === "recording" ? active : state.recordingActive,
    referenceActive: trigger === "reference" ? active : state.referenceActive
  };
}
