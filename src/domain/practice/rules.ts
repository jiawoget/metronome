import type {
  ContinuePracticeTarget,
  PracticeActivityTrigger,
  PracticeSession,
  PracticeTransportState,
  TodayPracticeSummary
} from "@/domain/practice/types";
import { getSheetPracticeHref } from "@/domain/sheet/routes";

export function calculatePracticeDurationMs(session: Pick<PracticeSession, "startedAt" | "endedAt">, now = new Date()) {
  const startedAtMs = Date.parse(session.startedAt);
  const endMs = Date.parse(session.endedAt ?? now.toISOString());

  if (!Number.isFinite(startedAtMs) || !Number.isFinite(endMs)) {
    return 0;
  }

  return Math.max(0, Math.round(endMs - startedAtMs));
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
