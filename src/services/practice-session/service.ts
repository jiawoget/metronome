import {
  calculatePracticeDurationMs,
  getContinuePracticeTarget,
  getTodayPracticeSummary,
  validateSheetRecordingMetadata,
  type PracticeSession,
  type SheetRecordingMetadata
} from "@/domain/practice";
import type {
  PracticeRecordingMetadataRepository,
  PracticeRecordingLinkInput,
  PracticeSessionRepository,
  PracticeSessionService,
  PracticeSessionSheetGateway,
  QuickPracticeActivityInput,
  SheetPracticeActivityInput,
  SheetRecordingMetadataInput
} from "@/services/practice-session/types";

type CreatePracticeSessionServiceOptions = {
  repository: PracticeSessionRepository;
  recordingRepository: PracticeRecordingMetadataRepository;
  sheetGateway: PracticeSessionSheetGateway;
  now?: () => Date;
  createId?: (prefix: string) => string;
};

function createDefaultId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function createPracticeSessionService({
  repository,
  recordingRepository,
  sheetGateway,
  now = () => new Date(),
  createId = createDefaultId
}: CreatePracticeSessionServiceOptions): PracticeSessionService {
  async function saveSession(session: PracticeSession) {
    await repository.saveSession(session);
  }

  function calculateActiveDuration(session: Pick<PracticeSession, "startedAt">) {
    return calculatePracticeDurationMs({ ...session, endedAt: null }, now());
  }

  async function updateSessionDuration(session: PracticeSession) {
    const timestamp = now().toISOString();
    const nextSession = {
      ...session,
      durationMs: calculateActiveDuration(session),
      updatedAt: timestamp
    };

    await saveSession(nextSession);

    if (nextSession.sourceType === "sheet" && nextSession.sheetId) {
      await sheetGateway.updateLastPracticedAt(nextSession.sheetId, timestamp);
    }

    return nextSession;
  }

  async function ensureQuickSession(input: QuickPracticeActivityInput) {
    const timestamp = now().toISOString();
    const existingSession = input.forceNewSession
      ? null
      : (await repository.listSessions()).find((session) => session.sourceType === "quick") ?? null;
    const session: PracticeSession =
      existingSession ??
      {
        id: createId("session"),
        sourceType: "quick",
        sheetId: null,
        startedAt: timestamp,
        endedAt: null,
        durationMs: 0,
        bpm: input.bpm ?? null,
        timeSignature: input.timeSignature ?? null,
        recordingCount: 0,
        latestRecordingId: null,
        updatedAt: timestamp
      };
    const nextSession = {
      ...session,
      endedAt: null,
      bpm: input.bpm ?? session.bpm,
      timeSignature: input.timeSignature ?? session.timeSignature,
      durationMs: calculateActiveDuration(session),
      updatedAt: timestamp
    };

    await saveSession(nextSession);

    return nextSession;
  }

  async function ensureSheetSession(input: SheetPracticeActivityInput) {
    if (!input.sheetId) {
      return null;
    }

    const sheet = await sheetGateway.getSheetContext(input.sheetId);

    if (!sheet) {
      return null;
    }

    const timestamp = now().toISOString();
    const existingSession = input.forceNewSession ? null : await repository.getRecentSheetSession(sheet.id);
    const session: PracticeSession =
      existingSession ??
      {
        id: createId("session"),
        sourceType: "sheet",
        sheetId: sheet.id,
        startedAt: timestamp,
        endedAt: null,
        durationMs: 0,
        bpm: input.bpm ?? sheet.bpm,
        timeSignature: input.timeSignature ?? sheet.timeSignature,
        recordingCount: 0,
        latestRecordingId: null,
        updatedAt: timestamp
      };

    const nextSession = {
      ...session,
      endedAt: null,
      bpm: input.bpm ?? session.bpm ?? sheet.bpm,
      timeSignature: input.timeSignature ?? session.timeSignature ?? sheet.timeSignature,
      durationMs: calculateActiveDuration(session),
      updatedAt: timestamp
    };

    await saveSession(nextSession);
    await sheetGateway.updateLastPracticedAt(sheet.id, timestamp);

    return nextSession;
  }

  async function getRecordingSession(input: SheetRecordingMetadataInput) {
    if (!input.sessionId) {
      return null;
    }

    const session = await repository.getSession(input.sessionId);

    if (!session || session.sourceType !== "sheet" || !session.sheetId) {
      return null;
    }

    const sheet = await sheetGateway.getSheetContext(session.sheetId);

    if (!sheet || (input.sheetId && input.sheetId !== session.sheetId)) {
      return null;
    }

    const timestamp = now().toISOString();
    const nextSession = {
      ...session,
      endedAt: null,
      bpm: input.bpm ?? session.bpm ?? sheet.bpm,
      timeSignature: input.timeSignature ?? session.timeSignature ?? sheet.timeSignature,
      durationMs: calculateActiveDuration(session),
      updatedAt: timestamp
    };

    await saveSession(nextSession);
    await sheetGateway.updateLastPracticedAt(session.sheetId, timestamp);

    return nextSession;
  }

  async function linkRecordingToSession(input: PracticeRecordingLinkInput) {
    const sessionId = input.sessionId?.trim();
    const recordingId = input.recordingId?.trim();

    if (!sessionId || !recordingId) {
      return null;
    }

    const session = await repository.getSession(sessionId);

    if (!session) {
      return null;
    }

    const timestamp = now().toISOString();
    const nextSession = {
      ...session,
      endedAt: null,
      durationMs: calculateActiveDuration(session),
      recordingCount: session.recordingCount + 1,
      latestRecordingId: recordingId,
      updatedAt: timestamp
    };

    await saveSession(nextSession);

    if (nextSession.sourceType === "sheet" && nextSession.sheetId) {
      await sheetGateway.updateLastPracticedAt(nextSession.sheetId, timestamp);
    }

    return nextSession;
  }

  return {
    ensureQuickSession,
    ensureSheetSession,

    async restorePracticeSessionSnapshot(session) {
      await saveSession(session);

      return session;
    },

    deletePracticeSessionSnapshot(sessionId) {
      return repository.deleteSession(sessionId);
    },

    async updatePracticeSessionDuration(sessionId) {
      const session = await repository.getSession(sessionId);

      if (!session) {
        return null;
      }

      return updateSessionDuration(session);
    },

    async updateSheetSessionDuration(sessionId) {
      const session = await repository.getSession(sessionId);

      if (!session || session.sourceType !== "sheet" || !session.sheetId) {
        return null;
      }

      return updateSessionDuration(session);
    },

    async endPracticeSession(sessionId) {
      const session = await repository.getSession(sessionId);

      if (!session || session.endedAt) {
        return session;
      }

      const timestamp = now().toISOString();
      const nextSession = {
        ...session,
        endedAt: timestamp,
        durationMs: calculatePracticeDurationMs({ ...session, endedAt: timestamp }, now()),
        updatedAt: timestamp
      };

      await saveSession(nextSession);

      if (nextSession.sourceType === "sheet" && nextSession.sheetId) {
        await sheetGateway.updateLastPracticedAt(nextSession.sheetId, timestamp);
      }

      return nextSession;
    },

    linkRecordingToSession,

    async createSheetRecordingMetadata(input: SheetRecordingMetadataInput) {
      const session = await getRecordingSession(input);

      if (!session || !session.sheetId) {
        return null;
      }

      const sheet = await sheetGateway.getSheetContext(session.sheetId);

      if (!sheet) {
        return null;
      }

      const timestamp = now().toISOString();
      const recording: SheetRecordingMetadata = {
        id: createId("recording"),
        type: "sheet",
        sessionId: session.id,
        sheetId: session.sheetId,
        sheetName: sheet.name,
        createdAt: timestamp,
        durationMs: Math.max(0, Math.round(input.durationMs ?? 0)),
        bpm: session.bpm ?? sheet.bpm,
        timeSignature: session.timeSignature ?? sheet.timeSignature
      };
      const nextSession = {
        ...session,
        durationMs: calculateActiveDuration(session),
        recordingCount: session.recordingCount + 1,
        latestRecordingId: recording.id,
        updatedAt: timestamp
      };

      await recordingRepository.saveRecordingMetadata(validateSheetRecordingMetadata(recording), nextSession);
      await saveSession(nextSession);
      await sheetGateway.updateLastPracticedAt(session.sheetId, timestamp);

      return recording;
    },

    listSessions() {
      return repository.listSessions();
    },

    async getTodaySummary() {
      return getTodayPracticeSummary(await repository.listSessions(), now());
    },

    getRecentSession() {
      return repository.getRecentSession();
    },

    getRecentSheetSession(sheetId) {
      return repository.getRecentSheetSession(sheetId);
    },

    async getContinuePracticeTarget() {
      const recentSession = await repository.getRecentSession();

      if (recentSession?.sourceType === "sheet") {
        if (!recentSession.sheetId) {
          return null;
        }

        const sheet = await sheetGateway.getSheetContext(recentSession.sheetId);

        if (!sheet) {
          return null;
        }
      }

      return getContinuePracticeTarget(recentSession);
    },

    listRecordingMetadata() {
      return recordingRepository.listRecordingMetadata();
    },

    async clear() {
      await repository.clear();
      await recordingRepository.clear();
    },

    subscribe(listener) {
      const unsubscribeSession = repository.subscribe?.(listener) ?? (() => undefined);
      const unsubscribeRecording = recordingRepository.subscribe?.(listener) ?? (() => undefined);

      return () => {
        unsubscribeSession();
        unsubscribeRecording();
      };
    }
  };
}
