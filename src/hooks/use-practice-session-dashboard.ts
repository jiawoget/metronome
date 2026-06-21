"use client";

import { useEffect, useState } from "react";

import type { ContinuePracticeTarget, PracticeSession } from "@/domain/practice";
import { browserPracticeSessionService } from "@/infrastructure/db/browser-practice-session-service";

export type PracticeSessionDashboardState = {
  recentSession: PracticeSession | null;
  continueTarget: ContinuePracticeTarget | null;
  summary: {
    minutesToday: number;
    sessionsToday: number;
    recordingsToday: number;
  };
};

const emptyState: PracticeSessionDashboardState = {
  recentSession: null,
  continueTarget: null,
  summary: {
    minutesToday: 0,
    sessionsToday: 0,
    recordingsToday: 0
  }
};

function isBrowserLocalToday(isoValue: string, now = new Date()) {
  const value = new Date(isoValue);

  return (
    value.getFullYear() === now.getFullYear() &&
    value.getMonth() === now.getMonth() &&
    value.getDate() === now.getDate()
  );
}

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
      const sessions = recentSession ? [recentSession] : [];
      const todaySessions = sessions.filter((session) => isBrowserLocalToday(session.startedAt));

      if (!isActive) {
        return;
      }

      setState({
        recentSession,
        continueTarget,
        summary: {
          minutesToday: Math.round(
            todaySessions.reduce((total, session) => total + session.durationMs, 0) / 60_000
          ),
          sessionsToday: todaySessions.length,
          recordingsToday: todaySessions.reduce((total, session) => total + session.recordingCount, 0)
        }
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
