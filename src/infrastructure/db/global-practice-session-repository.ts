import {
  calculatePracticeDurationMs,
  parsePracticeSession,
  sortSessionsByRecentActivity,
  type PracticeSession
} from "@/domain/practice";
import { parseTimeSignature } from "@/lib/quick-metronome/control";
import type { TimeSignature } from "@/lib/quick-metronome/types";
import { recordingHistoryRepository } from "@/lib/recordings-review/repository";
import type { ReviewRecording } from "@/lib/recordings-review/types";
import type { PracticeSessionRepository } from "@/services/practice-session";

function hasStringId(value: unknown): value is { id: string } {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as { id?: unknown }).id === "string"
  );
}

function getSessionString(value: unknown, key: string) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const nextValue = (value as Record<string, unknown>)[key];

  return typeof nextValue === "string" ? nextValue : null;
}

function parseOptionalTimeSignature(value: unknown): TimeSignature | null {
  if (typeof value !== "string") {
    return null;
  }

  const parsed = parseTimeSignature(value);

  return parsed === value ? parsed : null;
}

function getLegacyRecordingTimeSignature(value: unknown) {
  return typeof value === "string" ? value : null;
}

function getQuickSessionSettings(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const settings = (value as { settings?: unknown }).settings;

  if (!settings || typeof settings !== "object") {
    return null;
  }

  const bpm = (settings as { bpm?: unknown }).bpm;
  const timeSignature = (settings as { timeSignature?: unknown }).timeSignature;

  return {
    bpm: typeof bpm === "number" ? bpm : null,
    timeSignature: parseOptionalTimeSignature(timeSignature)
  };
}

function getLatestRecordingForSession(
  recordings: ReviewRecording[],
  sessionId: string
) {
  return (
    recordings
      .filter((recording) => recording.sessionId === sessionId)
      .sort(
        (first, second) =>
          Date.parse(second.createdAt) - Date.parse(first.createdAt)
      )[0] ?? null
  );
}

function legacyQuickSessionToPracticeSession(
  value: unknown,
  recordings: ReviewRecording[]
) {
  if (!hasStringId(value)) {
    return null;
  }

  const sourceType = getSessionString(value, "sourceType");

  if (sourceType !== "quick") {
    return null;
  }

  const startedAt = getSessionString(value, "startedAt");

  if (!startedAt) {
    return null;
  }

  const endedAt = getSessionString(value, "endedAt");
  const latestRecording = getLatestRecordingForSession(recordings, value.id);
  const settings = getQuickSessionSettings(value);
  const updatedAt = latestRecording?.createdAt ?? endedAt ?? startedAt;
  const durationMs =
    latestRecording?.durationMs ??
    calculatePracticeDurationMs({ startedAt, endedAt }, new Date(updatedAt));

  return parsePracticeSession({
    id: value.id,
    sourceType: "quick",
    sheetId: null,
    startedAt,
    endedAt,
    durationMs: Math.max(0, Math.round(durationMs)),
    bpm: settings?.bpm ?? latestRecording?.settings.bpm ?? null,
    timeSignature:
      settings?.timeSignature ??
      getLegacyRecordingTimeSignature(latestRecording?.settings.timeSignature) ??
      null,
    recordingCount: recordings.filter(
      (recording) => recording.sessionId === value.id
    ).length,
    latestRecordingId: latestRecording?.id ?? null,
    updatedAt
  });
}

function listLegacyQuickPracticeSessions() {
  const snapshot = recordingHistoryRepository.getSnapshot();

  return snapshot.sessions
    .map((session) =>
      legacyQuickSessionToPracticeSession(session, snapshot.recordings)
    )
    .filter((session): session is PracticeSession => session !== null);
}

export function createGlobalPracticeSessionRepository(
  sheetRepository: PracticeSessionRepository
): PracticeSessionRepository {
  async function listSessions() {
    return sortSessionsByRecentActivity([
      ...(await sheetRepository.listSessions()),
      ...listLegacyQuickPracticeSessions()
    ]);
  }

  return {
    listSessions,

    async getSession(sessionId) {
      return (
        (await sheetRepository.getSession(sessionId)) ??
        listLegacyQuickPracticeSessions().find(
          (session) => session.id === sessionId
        ) ??
        null
      );
    },

    async getRecentSession() {
      return (await listSessions())[0] ?? null;
    },

    getRecentSheetSession(sheetId) {
      return sheetRepository.getRecentSheetSession(sheetId);
    },

    saveSession(session) {
      return sheetRepository.saveSession(session);
    },

    deleteSession(sessionId) {
      return sheetRepository.deleteSession(sessionId);
    },

    clear() {
      return sheetRepository.clear();
    },

    subscribe(listener) {
      const unsubscribeSheet =
        sheetRepository.subscribe?.(listener) ?? (() => undefined);
      const unsubscribeRecording =
        recordingHistoryRepository.subscribe(listener);

      return () => {
        unsubscribeSheet();
        unsubscribeRecording();
      };
    }
  };
}
