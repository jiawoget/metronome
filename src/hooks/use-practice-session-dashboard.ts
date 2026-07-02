"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  DEFAULT_CONTINUE_PRACTICE_TARGET_LIMIT,
  DEFAULT_HOME_RECENT_ACTIVITY_LIMIT,
  DEFAULT_SESSION_COMPARISON_LIMIT,
  type ContinuePracticeTarget,
  type ContinuePracticeTargetsResult,
  type GoalCompletionEvaluation,
  type HomeDashboardAnalyticsSource,
  type HomePracticeStreaks,
  type HomeRecentActivityResult,
  type LocalPracticeGoal,
  type PracticeSession,
  type SessionComparisonCandidate,
  type SessionComparisonResult
} from "@/domain/practice";
import { browserPracticeSessionService } from "@/infrastructure/db/browser-practice-session-service";
import { practiceGoalService } from "@/services/practice-goals/browser-service";

export type PracticeSessionDashboardReadStatus = "idle" | "loading" | "loaded" | "error";
export type PracticeSessionDashboardContinueTargetsStatus = PracticeSessionDashboardReadStatus;
export type PracticeSessionDashboardRecentActivityStatus = PracticeSessionDashboardReadStatus;
export type PracticeSessionDashboardAnalyticsStatus = PracticeSessionDashboardReadStatus;
export type PracticeSessionDashboardStreaksStatus = PracticeSessionDashboardReadStatus;
export type PracticeSessionDashboardSessionComparisonStatus = PracticeSessionDashboardReadStatus;
export type PracticeGoalReadStatus = PracticeSessionDashboardReadStatus;
export type PracticeGoalEvaluationStatus = PracticeGoalReadStatus;
export type PracticeGoalMutationStatus = "idle" | "saving" | "deleting" | "error";

export type HomeSessionComparisonCandidate = {
  sessionId: string;
  label: string;
  sourceTypeLabel: string;
  startedText: string;
  updatedText: string;
  durationText: string;
  bpmText: string;
  timeSignatureText: string;
  recordingsText: string;
  sheetText: string;
  segmentText: string;
  goalContributionText: string;
  eventText: "Event details not available yet";
};

export type HomeSessionComparisonData = {
  generatedAt: string;
  candidates: HomeSessionComparisonCandidate[];
  limit: number;
  maxSelected: 3;
};

export type HomeGoalManagementState = {
  practiceGoals: LocalPracticeGoal[];
  practiceGoalEvaluations: GoalCompletionEvaluation[];
  practiceGoalsStatus: PracticeGoalReadStatus;
  practiceGoalProgressStatus: PracticeGoalEvaluationStatus;
  practiceGoalsErrorMessage: string | null;
  practiceGoalProgressErrorMessage: string | null;
  practiceGoalMutationStatus: PracticeGoalMutationStatus;
  practiceGoalMutationErrorMessage: string | null;
};

export type PracticeSessionDashboardState = {
  recentSession: PracticeSession | null;
  continueTarget: ContinuePracticeTarget | null;
  continueTargets: ContinuePracticeTargetsResult;
  continueTargetsStatus: PracticeSessionDashboardContinueTargetsStatus;
  continueTargetsErrorMessage: string | null;
  summary: {
    durationMs: number;
    minutesToday: number;
    sessionsToday: number;
    recordingsToday: number;
  };
  recentActivity: HomeRecentActivityResult;
  recentActivityStatus: PracticeSessionDashboardRecentActivityStatus;
  recentActivityErrorMessage: string | null;
  analytics: HomeDashboardAnalyticsSource;
  analyticsStatus: PracticeSessionDashboardAnalyticsStatus;
  analyticsErrorMessage: string | null;
  streaks: HomePracticeStreaks;
  streaksStatus: PracticeSessionDashboardStreaksStatus;
  streaksErrorMessage: string | null;
  sessionComparison: HomeSessionComparisonData;
  sessionComparisonStatus: PracticeSessionDashboardSessionComparisonStatus;
  sessionComparisonErrorMessage: string | null;
} & HomeGoalManagementState;

export type PracticeSessionDashboardActions = {
  refreshPracticeGoals: () => Promise<void>;
  savePracticeGoal: (goal: LocalPracticeGoal) => Promise<void>;
  deletePracticeGoal: (goalId: string) => Promise<void>;
  onSavePracticeGoal: (goal: LocalPracticeGoal) => Promise<void>;
  onDeletePracticeGoal: (goalId: string) => Promise<void>;
};

export type PracticeSessionDashboardResult =
  PracticeSessionDashboardState &
  PracticeSessionDashboardActions;

const emptyContinueTargets: ContinuePracticeTargetsResult = {
  targets: [],
  generatedAt: "",
  limit: DEFAULT_CONTINUE_PRACTICE_TARGET_LIMIT,
  rejected: []
};

const emptyRecentActivity: HomeRecentActivityResult = {
  items: [],
  generatedAt: "",
  limit: DEFAULT_HOME_RECENT_ACTIVITY_LIMIT
};

const emptyAnalytics: HomeDashboardAnalyticsSource = {
  generatedAt: "",
  summary: {
    durationMs: 0,
    minutesToday: 0,
    sessionsToday: 0,
    recordingsToday: 0
  },
  totals: {
    durationMs: 0,
    sessions: 0,
    sheetTakes: 0,
    practicedSheets: 0,
    segmentSessions: 0
  },
  emptyState: {
    hasPracticeHistory: false,
    hasSheetPractice: false,
    hasSegmentPractice: false,
    hasRecordings: false,
    hasGoals: false
  }
};

const emptyStreaks: HomePracticeStreaks = {
  generatedAt: "",
  currentStreakDays: 0,
  longestStreakDays: 0,
  practicedToday: false,
  lastPracticedLocalDay: null,
  emptyState: {
    hasPracticeHistory: false
  }
};

const emptySessionComparison: HomeSessionComparisonData = {
  generatedAt: "",
  candidates: [],
  limit: DEFAULT_SESSION_COMPARISON_LIMIT,
  maxSelected: 3
};

const emptyPracticeGoals: HomeGoalManagementState = {
  practiceGoals: [],
  practiceGoalEvaluations: [],
  practiceGoalsStatus: "idle",
  practiceGoalProgressStatus: "idle",
  practiceGoalsErrorMessage: null,
  practiceGoalProgressErrorMessage: null,
  practiceGoalMutationStatus: "idle",
  practiceGoalMutationErrorMessage: null
};

const emptyState: PracticeSessionDashboardState = {
  recentSession: null,
  continueTarget: null,
  continueTargets: emptyContinueTargets,
  continueTargetsStatus: "loading",
  continueTargetsErrorMessage: null,
  summary: {
    durationMs: 0,
    minutesToday: 0,
    sessionsToday: 0,
    recordingsToday: 0
  },
  recentActivity: emptyRecentActivity,
  recentActivityStatus: "idle",
  recentActivityErrorMessage: null,
  analytics: emptyAnalytics,
  analyticsStatus: "idle",
  analyticsErrorMessage: null,
  streaks: emptyStreaks,
  streaksStatus: "idle",
  streaksErrorMessage: null,
  sessionComparison: emptySessionComparison,
  sessionComparisonStatus: "idle",
  sessionComparisonErrorMessage: null,
  ...emptyPracticeGoals
};

const continueTargetsErrorMessage = "Continue Practice targets could not be loaded.";
const recentActivityErrorMessage = "Recent activity could not be loaded.";
const analyticsErrorMessage = "Practice analytics could not be loaded.";
const streaksErrorMessage = "Practice streaks could not be loaded.";
const sessionComparisonErrorMessage = "Session comparison could not be loaded.";
const practiceGoalsErrorMessage = "Practice goals could not be loaded.";
const practiceGoalEvaluationsErrorMessage = "Goal progress could not be loaded.";
const practiceGoalSaveErrorMessage = "Practice goal could not be saved.";
const practiceGoalDeleteErrorMessage = "Practice goal could not be deleted.";

export function usePracticeSessionDashboard(): PracticeSessionDashboardResult {
  const [state, setState] = useState<PracticeSessionDashboardState>(emptyState);
  const isMountedRef = useRef(false);
  const latestDashboardRefreshIdRef = useRef(0);
  const latestPracticeGoalRefreshIdRef = useRef(0);
  const latestPracticeGoalEvaluationRefreshIdRef = useRef(0);

  const refreshDashboard = useCallback(async () => {
    if (typeof indexedDB === "undefined") {
      return;
    }

    const refreshId = latestDashboardRefreshIdRef.current + 1;
    latestDashboardRefreshIdRef.current = refreshId;

    if (isMountedRef.current) {
      setState((currentState) => ({
        ...currentState,
        continueTargetsStatus: "loading",
        continueTargetsErrorMessage: null,
        recentActivityStatus: "loading",
        recentActivityErrorMessage: null,
        analyticsStatus: "loading",
        analyticsErrorMessage: null,
        streaksStatus: "loading",
        streaksErrorMessage: null,
        sessionComparisonStatus: "loading",
        sessionComparisonErrorMessage: null
      }));
    }

    const [
      recentSession,
      continueTargetsRead,
      summary,
      recentActivityRead,
      analyticsRead,
      streaksRead,
      sessionComparisonRead
    ] = await Promise.all([
      browserPracticeSessionService.getRecentSession(),
      browserPracticeSessionService
        .getContinuePracticeTargets({ limit: DEFAULT_CONTINUE_PRACTICE_TARGET_LIMIT })
        .then((continueTargets) => ({ continueTargets, errorMessage: null }))
        .catch(() => ({ continueTargets: null, errorMessage: continueTargetsErrorMessage })),
      browserPracticeSessionService.getTodaySummary(),
      browserPracticeSessionService
        .getHomeRecentActivity()
        .then((recentActivity) => ({ recentActivity, errorMessage: null }))
        .catch(() => ({ recentActivity: null, errorMessage: recentActivityErrorMessage })),
      browserPracticeSessionService
        .getHomeDashboardAnalyticsSource()
        .then((analytics) => ({ analytics, errorMessage: null }))
        .catch(() => ({ analytics: null, errorMessage: analyticsErrorMessage })),
      browserPracticeSessionService
        .getHomePracticeStreaks()
        .then((streaks) => ({ streaks, errorMessage: null }))
        .catch(() => ({ streaks: null, errorMessage: streaksErrorMessage })),
      readHomeSessionComparison()
        .then((sessionComparison) => ({ sessionComparison, errorMessage: null }))
        .catch(() => ({ sessionComparison: null, errorMessage: sessionComparisonErrorMessage }))
    ]);

    if (!isMountedRef.current || refreshId !== latestDashboardRefreshIdRef.current) {
      return;
    }

    setState((currentState) => ({
      ...currentState,
      recentSession,
      continueTarget: null,
      continueTargets: continueTargetsRead.continueTargets ?? currentState.continueTargets,
      continueTargetsStatus: continueTargetsRead.errorMessage ? "error" : "loaded",
      continueTargetsErrorMessage: continueTargetsRead.errorMessage,
      summary,
      recentActivity: recentActivityRead.recentActivity ?? currentState.recentActivity,
      recentActivityStatus: recentActivityRead.errorMessage ? "error" : "loaded",
      recentActivityErrorMessage: recentActivityRead.errorMessage,
      analytics: analyticsRead.analytics ?? currentState.analytics,
      analyticsStatus: analyticsRead.errorMessage ? "error" : "loaded",
      analyticsErrorMessage: analyticsRead.errorMessage,
      streaks: streaksRead.streaks ?? currentState.streaks,
      streaksStatus: streaksRead.errorMessage ? "error" : "loaded",
      streaksErrorMessage: streaksRead.errorMessage,
      sessionComparison: sessionComparisonRead.sessionComparison ?? currentState.sessionComparison,
      sessionComparisonStatus: sessionComparisonRead.errorMessage ? "error" : "loaded",
      sessionComparisonErrorMessage: sessionComparisonRead.errorMessage
    }));
  }, []);

  const refreshPracticeGoalEvaluations = useCallback(async () => {
    const refreshId = latestPracticeGoalEvaluationRefreshIdRef.current + 1;
    latestPracticeGoalEvaluationRefreshIdRef.current = refreshId;

    if (isMountedRef.current) {
      setState((currentState) => ({
        ...currentState,
        practiceGoalProgressStatus: "loading",
        practiceGoalProgressErrorMessage: null
      }));
    }

    let evaluations: GoalCompletionEvaluation[] | null = null;
    let evaluationErrorMessage: string | null = null;

    try {
      evaluations = await practiceGoalService.getPracticeGoalEvaluations();
    } catch {
      evaluationErrorMessage = practiceGoalEvaluationsErrorMessage;
    }

    if (!isMountedRef.current || refreshId !== latestPracticeGoalEvaluationRefreshIdRef.current) {
      return;
    }

    setState((currentState) => ({
      ...currentState,
      practiceGoalEvaluations: evaluations ?? currentState.practiceGoalEvaluations,
      practiceGoalProgressStatus: evaluationErrorMessage ? "error" : "loaded",
      practiceGoalProgressErrorMessage: evaluationErrorMessage
    }));
  }, []);

  const refreshPracticeGoals = useCallback(async () => {
    const refreshId = latestPracticeGoalRefreshIdRef.current + 1;
    latestPracticeGoalRefreshIdRef.current = refreshId;
    const evaluationRefreshId = latestPracticeGoalEvaluationRefreshIdRef.current + 1;
    latestPracticeGoalEvaluationRefreshIdRef.current = evaluationRefreshId;

    if (isMountedRef.current) {
      setState((currentState) => ({
        ...currentState,
        practiceGoalsStatus: "loading",
        practiceGoalProgressStatus: "loading",
        practiceGoalsErrorMessage: null,
        practiceGoalProgressErrorMessage: null
      }));
    }

    let goals: LocalPracticeGoal[];

    try {
      goals = await practiceGoalService.listPracticeGoals();
    } catch {
      if (!isMountedRef.current || refreshId !== latestPracticeGoalRefreshIdRef.current) {
        return;
      }

      setState((currentState) => ({
        ...currentState,
        practiceGoalsStatus: "error",
        practiceGoalProgressStatus: evaluationRefreshId === latestPracticeGoalEvaluationRefreshIdRef.current
          ? currentState.practiceGoalEvaluations.length > 0
            ? "loaded"
            : "idle"
          : currentState.practiceGoalProgressStatus,
        practiceGoalsErrorMessage: practiceGoalsErrorMessage,
        practiceGoalProgressErrorMessage: evaluationRefreshId === latestPracticeGoalEvaluationRefreshIdRef.current
          ? null
          : currentState.practiceGoalProgressErrorMessage
      }));
      return;
    }

    let evaluations: GoalCompletionEvaluation[] | null = null;
    let evaluationErrorMessage: string | null = null;

    try {
      evaluations = await practiceGoalService.getPracticeGoalEvaluations();
    } catch {
      evaluationErrorMessage = practiceGoalEvaluationsErrorMessage;
    }

    if (!isMountedRef.current || refreshId !== latestPracticeGoalRefreshIdRef.current) {
      return;
    }

    const isLatestEvaluationRefresh =
      evaluationRefreshId === latestPracticeGoalEvaluationRefreshIdRef.current;

    setState((currentState) => ({
      ...currentState,
      practiceGoals: goals,
      practiceGoalEvaluations: isLatestEvaluationRefresh
        ? evaluations ?? currentState.practiceGoalEvaluations
        : currentState.practiceGoalEvaluations,
      practiceGoalsStatus: "loaded",
      practiceGoalProgressStatus: isLatestEvaluationRefresh
        ? evaluationErrorMessage ? "error" : "loaded"
        : currentState.practiceGoalProgressStatus,
      practiceGoalsErrorMessage: null,
      practiceGoalProgressErrorMessage: isLatestEvaluationRefresh
        ? evaluationErrorMessage
        : currentState.practiceGoalProgressErrorMessage
    }));
  }, []);

  const savePracticeGoal = useCallback(async (goal: LocalPracticeGoal) => {
    if (isMountedRef.current) {
      setState((currentState) => ({
        ...currentState,
        practiceGoalMutationStatus: "saving",
        practiceGoalMutationErrorMessage: null
      }));
    }

    try {
      await practiceGoalService.savePracticeGoal(goal);
    } catch {
      if (isMountedRef.current) {
        setState((currentState) => ({
          ...currentState,
          practiceGoalMutationStatus: "error",
          practiceGoalMutationErrorMessage: practiceGoalSaveErrorMessage
        }));
      }
      throw new Error(practiceGoalSaveErrorMessage);
    }

    if (!isMountedRef.current) {
      return;
    }

    setState((currentState) => ({
      ...currentState,
      practiceGoalMutationStatus: "idle",
      practiceGoalMutationErrorMessage: null
    }));
    void refreshPracticeGoals();
  }, [refreshPracticeGoals]);

  const deletePracticeGoal = useCallback(async (goalId: string) => {
    if (isMountedRef.current) {
      setState((currentState) => ({
        ...currentState,
        practiceGoalMutationStatus: "deleting",
        practiceGoalMutationErrorMessage: null
      }));
    }

    try {
      await practiceGoalService.deletePracticeGoal(goalId);
    } catch {
      if (isMountedRef.current) {
        setState((currentState) => ({
          ...currentState,
          practiceGoalMutationStatus: "error",
          practiceGoalMutationErrorMessage: practiceGoalDeleteErrorMessage
        }));
      }
      throw new Error(practiceGoalDeleteErrorMessage);
    }

    if (!isMountedRef.current) {
      return;
    }

    setState((currentState) => ({
      ...currentState,
      practiceGoalMutationStatus: "idle",
      practiceGoalMutationErrorMessage: null
    }));
    void refreshPracticeGoals();
  }, [refreshPracticeGoals]);

  useEffect(() => {
    isMountedRef.current = true;

    void refreshDashboard();
    void refreshPracticeGoals();

    const unsubscribePracticeSession = browserPracticeSessionService.subscribe(() => {
      void refreshDashboard();
      void refreshPracticeGoalEvaluations();
    });
    const unsubscribePracticeGoal = practiceGoalService.subscribe(() => {
      void refreshPracticeGoals();
    });

    return () => {
      isMountedRef.current = false;
      unsubscribePracticeSession();
      unsubscribePracticeGoal();
    };
  }, [refreshDashboard, refreshPracticeGoals, refreshPracticeGoalEvaluations]);

  return {
    ...state,
    refreshPracticeGoals,
    savePracticeGoal,
    deletePracticeGoal,
    onSavePracticeGoal: savePracticeGoal,
    onDeletePracticeGoal: deletePracticeGoal
  };
}

async function readHomeSessionComparison(): Promise<HomeSessionComparisonData> {
  const comparison = await browserPracticeSessionService.getSessionComparison({
    limit: DEFAULT_SESSION_COMPARISON_LIMIT
  });

  return createHomeSessionComparisonData(comparison);
}

function createHomeSessionComparisonData(comparison: SessionComparisonResult): HomeSessionComparisonData {
  return {
    generatedAt: comparison.generatedAt,
    candidates: comparison.candidates.map(createHomeSessionComparisonCandidate),
    limit: comparison.limit,
    maxSelected: comparison.maxSelected
  };
}

function createHomeSessionComparisonCandidate(
  candidate: SessionComparisonCandidate
): HomeSessionComparisonCandidate {
  const sourceTypeLabel = candidate.sourceType === "quick" ? "Quick practice" : "Sheet practice";

  return {
    sessionId: candidate.sessionId,
    label: candidate.label.replace(" - ", " · "),
    sourceTypeLabel,
    startedText: formatSessionComparisonTimestamp(candidate.startedAt),
    updatedText: formatSessionComparisonTimestamp(candidate.updatedAt),
    durationText: formatSessionComparisonDuration(candidate.durationMs),
    bpmText: candidate.bpm === null ? "Not set" : `${candidate.bpm} BPM`,
    timeSignatureText: candidate.timeSignature ?? "Not set",
    recordingsText: formatSessionComparisonRecordings(
      candidate.recordingCount,
      candidate.linkedRecordingMetadataCount
    ),
    sheetText: getSessionComparisonSheetText(candidate),
    segmentText: getSessionComparisonSegmentText(candidate),
    goalContributionText: formatSessionComparisonGoalContribution(
      candidate.durationMs,
      candidate.linkedRecordingMetadataCount
    ),
    eventText: "Event details not available yet"
  };
}

function getSessionComparisonSheetText(candidate: SessionComparisonCandidate) {
  if (candidate.sourceType === "quick") {
    return "Quick metronome";
  }

  if (candidate.targetState === "missing-sheet") {
    return "Deleted sheet";
  }

  if (candidate.targetState === "lookup-failed") {
    return candidate.sheetId ? `${candidate.sheetId} (lookup failed)` : "Sheet lookup failed";
  }

  if (candidate.targetState === "no-target") {
    return "Sheet not set";
  }

  return candidate.sheetName ?? candidate.sheetId ?? "Sheet practice";
}

function getSessionComparisonSegmentText(candidate: SessionComparisonCandidate) {
  if (candidate.sourceType === "quick") {
    return "Quick metronome";
  }

  if (!candidate.segmentId) {
    return "Whole sheet / no segment";
  }

  const segmentText = [candidate.segmentName ?? "Saved segment", candidate.segmentRangeLabel]
    .filter(Boolean)
    .join(" ");

  if (candidate.targetState === "missing-segment") {
    return `${segmentText} (missing)`;
  }

  if (candidate.targetState === "lookup-failed") {
    return `${segmentText} (lookup failed)`;
  }

  return segmentText;
}

function formatSessionComparisonRecordings(sessionRecordingCount: number, linkedSheetTakes: number) {
  const safeSessionRecordingCount = Math.max(0, Math.floor(Number.isFinite(sessionRecordingCount) ? sessionRecordingCount : 0));
  const recordingLabel = safeSessionRecordingCount === 1 ? "1 recording" : `${safeSessionRecordingCount} recordings`;

  if (linkedSheetTakes <= 0 || linkedSheetTakes === safeSessionRecordingCount) {
    return recordingLabel;
  }

  return `${recordingLabel}; ${linkedSheetTakes} linked sheet ${linkedSheetTakes === 1 ? "take" : "takes"}`;
}

function formatSessionComparisonGoalContribution(durationMs: number, linkedSheetTakes: number) {
  const minutes = formatSessionComparisonMinutes(durationMs);
  const takeLabel = linkedSheetTakes === 1 ? "1 sheet take linked" : `${linkedSheetTakes} sheet takes linked`;

  return `Counts as 1 session; adds ${minutes}; ${takeLabel}`;
}

function formatSessionComparisonDuration(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0 min";
  }

  if (value < 60_000) {
    return "<1 min";
  }

  const totalMinutes = Math.floor(value / 60_000);

  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return minutes > 0 ? `${hours} hr ${minutes} min` : `${hours} hr`;
}

function formatSessionComparisonMinutes(value: number) {
  const durationText = formatSessionComparisonDuration(value);

  return durationText === "<1 min" ? "<1 min" : durationText;
}

function formatSessionComparisonTimestamp(value: string | null) {
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
