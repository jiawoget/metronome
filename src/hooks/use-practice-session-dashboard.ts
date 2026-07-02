"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  DEFAULT_CONTINUE_PRACTICE_TARGET_LIMIT,
  DEFAULT_HOME_RECENT_ACTIVITY_LIMIT,
  type ContinuePracticeTarget,
  type ContinuePracticeTargetsResult,
  type GoalCompletionEvaluation,
  type HomeDashboardAnalyticsSource,
  type HomePracticeStreaks,
  type HomeRecentActivityResult,
  type LocalPracticeGoal,
  type PracticeSession
} from "@/domain/practice";
import { browserPracticeSessionService } from "@/infrastructure/db/browser-practice-session-service";
import { practiceGoalService } from "@/services/practice-goals/browser-service";

export type PracticeSessionDashboardReadStatus = "idle" | "loading" | "loaded" | "error";
export type PracticeSessionDashboardContinueTargetsStatus = PracticeSessionDashboardReadStatus;
export type PracticeSessionDashboardRecentActivityStatus = PracticeSessionDashboardReadStatus;
export type PracticeSessionDashboardAnalyticsStatus = PracticeSessionDashboardReadStatus;
export type PracticeSessionDashboardStreaksStatus = PracticeSessionDashboardReadStatus;
export type PracticeGoalReadStatus = PracticeSessionDashboardReadStatus;
export type PracticeGoalEvaluationStatus = PracticeGoalReadStatus;
export type PracticeGoalMutationStatus = "idle" | "saving" | "deleting" | "error";

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
  ...emptyPracticeGoals
};

const continueTargetsErrorMessage = "Continue Practice targets could not be loaded.";
const recentActivityErrorMessage = "Recent activity could not be loaded.";
const analyticsErrorMessage = "Practice analytics could not be loaded.";
const streaksErrorMessage = "Practice streaks could not be loaded.";
const practiceGoalsErrorMessage = "Practice goals could not be loaded.";
const practiceGoalEvaluationsErrorMessage = "Goal progress could not be loaded.";
const practiceGoalSaveErrorMessage = "Practice goal could not be saved.";
const practiceGoalDeleteErrorMessage = "Practice goal could not be deleted.";

export function usePracticeSessionDashboard(): PracticeSessionDashboardResult {
  const [state, setState] = useState<PracticeSessionDashboardState>(emptyState);
  const isMountedRef = useRef(false);
  const latestDashboardRefreshIdRef = useRef(0);
  const latestPracticeGoalRefreshIdRef = useRef(0);

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
        streaksErrorMessage: null
      }));
    }

    const [recentSession, continueTargetsRead, summary, recentActivityRead, analyticsRead, streaksRead] = await Promise.all([
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
        .catch(() => ({ streaks: null, errorMessage: streaksErrorMessage }))
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
      streaksErrorMessage: streaksRead.errorMessage
    }));
  }, []);

  const refreshPracticeGoals = useCallback(async () => {
    const refreshId = latestPracticeGoalRefreshIdRef.current + 1;
    latestPracticeGoalRefreshIdRef.current = refreshId;

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
        practiceGoalProgressStatus: currentState.practiceGoalEvaluations.length > 0
          ? "loaded"
          : "idle",
        practiceGoalsErrorMessage: practiceGoalsErrorMessage
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

    setState((currentState) => ({
      ...currentState,
      practiceGoals: goals,
      practiceGoalEvaluations: evaluations ?? currentState.practiceGoalEvaluations,
      practiceGoalsStatus: "loaded",
      practiceGoalProgressStatus: evaluationErrorMessage ? "error" : "loaded",
      practiceGoalsErrorMessage: null,
      practiceGoalProgressErrorMessage: evaluationErrorMessage
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
    });
    const unsubscribePracticeGoal = practiceGoalService.subscribe(() => {
      void refreshPracticeGoals();
    });

    return () => {
      isMountedRef.current = false;
      unsubscribePracticeSession();
      unsubscribePracticeGoal();
    };
  }, [refreshDashboard, refreshPracticeGoals]);

  return {
    ...state,
    refreshPracticeGoals,
    savePracticeGoal,
    deletePracticeGoal,
    onSavePracticeGoal: savePracticeGoal,
    onDeletePracticeGoal: deletePracticeGoal
  };
}
