"use client";

import { useEffect, useState } from "react";

import {
  DEFAULT_HOME_RECENT_ACTIVITY_LIMIT,
  type ContinuePracticeTarget,
  type HomeRecentActivityResult,
  type PracticeSession
} from "@/domain/practice";
import { browserPracticeSessionService } from "@/infrastructure/db/browser-practice-session-service";

export type PracticeSessionDashboardRecentActivityStatus = "idle" | "loading" | "loaded" | "error";

export type PracticeSessionDashboardState = {
  recentSession: PracticeSession | null;
  continueTarget: ContinuePracticeTarget | null;
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

const emptyRecentActivity: HomeRecentActivityResult = {
  items: [],
  generatedAt: "",
  limit: DEFAULT_HOME_RECENT_ACTIVITY_LIMIT
};

const emptyState: PracticeSessionDashboardState = {
  recentSession: null,
  continueTarget: null,
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
        recentActivityStatus: "loading",
        recentActivityErrorMessage: null
      }));

      const [recentSession, continueTarget, summary, recentActivityRead] = await Promise.all([
        browserPracticeSessionService.getRecentSession(),
        browserPracticeSessionService.getContinuePracticeTarget(),
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
        continueTarget,
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
