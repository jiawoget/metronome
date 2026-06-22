"use client";

import { useEffect, useState } from "react";

import type { ContinuePracticeTarget, PracticeSession } from "@/domain/practice";
import { browserPracticeSessionService } from "@/infrastructure/db/browser-practice-session-service";

export type PracticeSessionDashboardState = {
  recentSession: PracticeSession | null;
  continueTarget: ContinuePracticeTarget | null;
  summary: {
    durationMs: number;
    minutesToday: number;
    sessionsToday: number;
    recordingsToday: number;
  };
};

const emptyState: PracticeSessionDashboardState = {
  recentSession: null,
  continueTarget: null,
  summary: {
    durationMs: 0,
    minutesToday: 0,
    sessionsToday: 0,
    recordingsToday: 0
  }
};

export function usePracticeSessionDashboard() {
  const [state, setState] = useState<PracticeSessionDashboardState>(emptyState);

  useEffect(() => {
    let isActive = true;

    async function refresh() {
      if (typeof indexedDB === "undefined") {
        return;
      }

      const recentSession = await browserPracticeSessionService.getRecentSession();
      const continueTarget = await browserPracticeSessionService.getContinuePracticeTarget();
      const summary = await browserPracticeSessionService.getTodaySummary();

      if (!isActive) {
        return;
      }

      setState({
        recentSession,
        continueTarget,
        summary
      });
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
