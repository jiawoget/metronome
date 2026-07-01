"use client";

import { useEffect, useState } from "react";

import {
  DEFAULT_CONTINUE_PRACTICE_TARGET_LIMIT,
  DEFAULT_HOME_RECENT_ACTIVITY_LIMIT,
  type ContinuePracticeTarget,
  type ContinuePracticeTargetsResult,
  type HomeRecentActivityResult,
  type PracticeSession
} from "@/domain/practice";
import { browserPracticeSessionService } from "@/infrastructure/db/browser-practice-session-service";

export type PracticeSessionDashboardReadStatus = "idle" | "loading" | "loaded" | "error";
export type PracticeSessionDashboardContinueTargetsStatus = PracticeSessionDashboardReadStatus;
export type PracticeSessionDashboardRecentActivityStatus = PracticeSessionDashboardReadStatus;

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
  recentActivityErrorMessage: null
};

const continueTargetsErrorMessage = "Continue Practice targets could not be loaded.";
const recentActivityErrorMessage = "Recent activity could not be loaded.";

export function usePracticeSessionDashboard() {
  const [state, setState] = useState<PracticeSessionDashboardState>(emptyState);

  useEffect(() => {
    let isActive = true;

    async function refresh() {
      if (typeof indexedDB === "undefined") {
        return;
      }

      setState((currentState) => ({
        ...currentState,
        continueTargetsStatus: "loading",
        continueTargetsErrorMessage: null,
        recentActivityStatus: "loading",
        recentActivityErrorMessage: null
      }));

      const [recentSession, continueTargetsRead, summary, recentActivityRead] = await Promise.all([
        browserPracticeSessionService.getRecentSession(),
        browserPracticeSessionService
          .getContinuePracticeTargets({ limit: DEFAULT_CONTINUE_PRACTICE_TARGET_LIMIT })
          .then((continueTargets) => ({ continueTargets, errorMessage: null }))
          .catch(() => ({ continueTargets: null, errorMessage: continueTargetsErrorMessage })),
        browserPracticeSessionService.getTodaySummary(),
        browserPracticeSessionService
          .getHomeRecentActivity()
          .then((recentActivity) => ({ recentActivity, errorMessage: null }))
          .catch(() => ({ recentActivity: null, errorMessage: recentActivityErrorMessage }))
      ]);

      if (!isActive) {
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
        recentActivityErrorMessage: recentActivityRead.errorMessage
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
