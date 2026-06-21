import {
  calculatePracticeDurationMs,
  getContinuePracticeTarget,
  type PracticeSession,
  type SheetRecordingMetadata
} from "@/domain/practice";
import type {
  PracticeSessionRepository,
  PracticeSessionService,
  PracticeSessionSheetGateway,
  SheetPracticeActivityInput,
  SheetRecordingMetadataInput
} from "@/services/practice-session/types";

type CreatePracticeSessionServiceOptions = {
  repository: PracticeSessionRepository;
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
  sheetGateway,
  now = () => new Date(),
  createId = createDefaultId
}: CreatePracticeSessionServiceOptions): PracticeSessionService {
  async function saveSession(session: PracticeSession) {
    await repository.saveSession(session);
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
      durationMs: calculatePracticeDurationMs(session, now()),
      updatedAt: timestamp
    };

    await saveSession(nextSession);
    await sheetGateway.updateLastPracticedAt(sheet.id, timestamp);

    return nextSession;
  }

  return {
    ensureSheetSession,

    async updateSheetSessionDuration(sessionId) {
      const session = await repository.getSession(sessionId);

      if (!session || session.sourceType !== "sheet" || !session.sheetId) {
        return null;
      }

      const timestamp = now().toISOString();
      const nextSession = {
        ...session,
        durationMs: calculatePracticeDurationMs(session, now()),
        updatedAt: timestamp
      };

      await saveSession(nextSession);
      await sheetGateway.updateLastPracticedAt(session.sheetId, timestamp);

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

      const timestamp = now().toISOString();
      const recording: SheetRecordingMetadata = {
        id: createId("recording"),
        type: "sheet",
        sessionId: session.id,
        sheetId: session.sheetId,
        createdAt: timestamp,
        durationMs: Math.max(0, Math.round(input.durationMs ?? 0))
      };
      const nextSession = {
        ...session,
        durationMs: calculatePracticeDurationMs(session, now()),
        recordingCount: session.recordingCount + 1,
        latestRecordingId: recording.id,
        updatedAt: timestamp
      };

      await repository.saveRecordingMetadata(recording);
      await saveSession(nextSession);
      await sheetGateway.updateLastPracticedAt(session.sheetId, timestamp);

      return recording;
    },

    getRecentSession() {
      return repository.getRecentSession();
    },

    async getContinuePracticeTarget() {
      return getContinuePracticeTarget(await repository.getRecentSession());
    },

    listRecordingMetadata() {
      return repository.listRecordingMetadata();
    },

    clear() {
      return repository.clear();
    },

    subscribe(listener) {
      return repository.subscribe?.(listener) ?? (() => undefined);
    }
  };
}
