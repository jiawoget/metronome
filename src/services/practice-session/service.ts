import {
  calculatePracticeDurationMs,
  getContinuePracticeTarget,
  validateSheetRecordingMetadata,
  type PracticeSession,
  type SheetRecordingMetadata
} from "@/domain/practice";
import type {
  PracticeSessionRepository,
  PracticeRecordingMetadataRepository,
  PracticeSessionService,
  PracticeSessionSheetGateway,
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

  async function ensureSheetSession(input: SheetPracticeActivityInput) {
    if (!input.sheetId) {
      return null;
    }

    const sheet = await sheetGateway.getSheetContext(input.sheetId);

    if (!sheet) {
      return null;
    }

    const timestamp = now().toISOString();
    const existingSession = await repository.getRecentSheetSession(sheet.id);
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

  return {
    ensureSheetSession,

    async restorePracticeSessionSnapshot(session) {
      await saveSession(session);

      return session;
    },

    async updateSheetSessionDuration(sessionId) {
      const session = await repository.getSession(sessionId);

      if (!session || session.sourceType !== "sheet" || !session.sheetId) {
        return null;
      }

      const timestamp = now().toISOString();
      const nextSession = {
        ...session,
        durationMs: calculateActiveDuration(session),
        updatedAt: timestamp
      };

      await saveSession(nextSession);
      await sheetGateway.updateLastPracticedAt(session.sheetId, timestamp);

      return nextSession;
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

    async createSheetRecordingMetadata(input: SheetRecordingMetadataInput) {
      const session = await ensureSheetSession({
        sheetId: input.sheetId,
        trigger: "recording"
      });

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
