"use client";

import { useEffect, useState } from "react";

import {
  DEFAULT_CONTINUE_PRACTICE_TARGET_LIMIT,
  DEFAULT_HOME_RECENT_ACTIVITY_LIMIT,
  type ContinuePracticeTarget,
  type ContinuePracticeTargetsResult,
  type HomeDashboardAnalyticsSource,
  type HomePracticeStreaks,
  type HomeRecentActivityResult,
  type PracticeSession
} from "@/domain/practice";
import { browserPracticeSessionService } from "@/infrastructure/db/browser-practice-session-service";

export type PracticeSessionDashboardReadStatus = "idle" | "loading" | "loaded" | "error";
export type PracticeSessionDashboardContinueTargetsStatus = PracticeSessionDashboardReadStatus;
export type PracticeSessionDashboardRecentActivityStatus = PracticeSessionDashboardReadStatus;
export type PracticeSessionDashboardAnalyticsStatus = PracticeSessionDashboardReadStatus;
export type PracticeSessionDashboardStreaksStatus = PracticeSessionDashboardReadStatus;

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
};

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
  streaksErrorMessage: null
};

const continueTargetsErrorMessage = "Continue Practice targets could not be loaded.";
const recentActivityErrorMessage = "Recent activity could not be loaded.";
const analyticsErrorMessage = "Practice analytics could not be loaded.";
const streaksErrorMessage = "Practice streaks could not be loaded.";

export function usePracticeSessionDashboard() {
  const [state, setState] = useState<PracticeSessionDashboardState>(emptyState);

  useEffect(() => {
    let isActive = true;
    let latestRefreshId = 0;

    async function refresh() {
      if (typeof indexedDB === "undefined") {
        return;
      }

      const refreshId = latestRefreshId + 1;
      latestRefreshId = refreshId;

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

      if (!isActive || refreshId !== latestRefreshId) {
        return;
      }

      setState((currentState) => ({
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
    }

    void refresh();
    const unsubscribe = browserPracticeSessionService.subscribe(() => {
      void refresh();
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, []);

  return state;
}
