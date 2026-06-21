import type {
  ContinuePracticeTarget,
  PracticeActivityTrigger,
  PracticeSession,
  PracticeTransportState
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
