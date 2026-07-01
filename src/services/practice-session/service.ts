import {
  PRACTICE_SESSION_EVENT_SCHEMA_VERSION,
  createSessionHistorySegmentTargetKey,
  getContinuePracticeTarget,
  getTodayPracticeSummary,
  groupPracticeSessionsByHistory,
  isBrowserLocalDay,
  selectHomeRecentActivity,
  validatePracticeSessionEvent,
  validateSheetRecordingMetadata,
  withUpdatedPracticeSessionDuration,
  type PracticeSessionEvent,
  type SessionHistoryLookupResult,
  type SessionHistorySegmentTarget,
  type SessionHistorySheetTarget,
  type HomeRecentActivityTargetResolution,
  type PracticeSession,
  type SheetRecordingMetadata
} from "@/domain/practice";
import type {
  PracticeSessionEventCaptureInput,
  PracticeSessionEventSink,
  PracticeRecordingMetadataRepository,
  PracticeRecordingLinkInput,
  PracticeSessionRepository,
  PracticeSessionSegmentGateway,
  PracticeSessionService,
  PracticeSessionSheetGateway,
  PreparedSheetRecordingMetadata,
  QuickPracticeActivityInput,
  SheetPracticeActivityInput,
  SheetRecordingMetadataInput
} from "@/services/practice-session/types";

type CreatePracticeSessionServiceOptions = {
  repository: PracticeSessionRepository;
  recordingRepository: PracticeRecordingMetadataRepository;
  sheetGateway: PracticeSessionSheetGateway;
  segmentGateway?: PracticeSessionSegmentGateway;
  eventSink?: PracticeSessionEventSink;
  now?: () => Date;
  createId?: (prefix: string) => string;
};

const noopPracticeSessionEventSink: PracticeSessionEventSink = {
  captureEvent() {
    return undefined;
  }
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
  segmentGateway,
  eventSink = noopPracticeSessionEventSink,
  now = () => new Date(),
  createId = createDefaultId
}: CreatePracticeSessionServiceOptions): PracticeSessionService {
  async function saveSession(session: PracticeSession) {
    await repository.saveSession(session);
  }

  function canReuseActiveSession(session: PracticeSession | null) {
    return !!session && session.endedAt === null && isBrowserLocalDay(session.startedAt, now());
  }

  function normalizeOptionalContextId(value: string | null | undefined) {
    const trimmed = value?.trim() ?? "";

    return trimmed.length > 0 ? trimmed : null;
  }

  function validateEventContext(
    input: PracticeSessionEventCaptureInput,
    session: PracticeSession
  ) {
    const requestedSheetId = normalizeOptionalContextId(input.sheetId);
    const segmentId = normalizeOptionalContextId(input.segmentId);
    const recordingId = normalizeOptionalContextId(input.recordingId);
    const referenceId = normalizeOptionalContextId(input.referenceId);
    let sheetId: string | null = null;

    if (session.sourceType === "sheet") {
      if (!session.sheetId) {
        return null;
      }

      if (requestedSheetId && requestedSheetId !== session.sheetId) {
        return null;
      }

      sheetId = session.sheetId;
    } else if (requestedSheetId || segmentId || input.kind.startsWith("reference_")) {
      return null;
    }

    switch (input.kind) {
      case "metronome_started":
      case "metronome_stopped":
        if (recordingId || referenceId) {
          return null;
        }
        break;
      case "recording_started":
        if (referenceId) {
          return null;
        }
        break;
      case "recording_stopped":
        if (!recordingId || referenceId) {
          return null;
        }
        break;
      case "reference_started":
      case "reference_stopped":
        if (!referenceId || recordingId || session.sourceType !== "sheet") {
          return null;
        }
        break;
      default:
        return null;
    }

    return {
      sheetId,
      segmentId,
      recordingId,
      referenceId
    };
  }

  async function captureSessionEvent(input: PracticeSessionEventCaptureInput) {
    try {
      const sessionId = normalizeOptionalContextId(input.sessionId);

      if (!sessionId) {
        return null;
      }

      const session = await repository.getSession(sessionId);

      if (!session) {
        return null;
      }

      const context = validateEventContext(input, session);

      if (!context) {
        return null;
      }

      const event = validatePracticeSessionEvent({
        id: createId("event"),
        sessionId: session.id,
        occurredAt: now().toISOString(),
        kind: input.kind,
        ...(context.sheetId ? { sheetId: context.sheetId } : {}),
        ...(context.segmentId ? { segmentId: context.segmentId } : {}),
        ...(context.recordingId ? { recordingId: context.recordingId } : {}),
        ...(context.referenceId ? { referenceId: context.referenceId } : {}),
        payload: {},
        schemaVersion: PRACTICE_SESSION_EVENT_SCHEMA_VERSION
      } as PracticeSessionEvent);

      await eventSink.captureEvent(event);

      return event;
    } catch {
      return null;
    }
  }

  async function resolveSessionHistorySheetTargets(sessions: PracticeSession[]) {
    const sheetTargets: Record<string, SessionHistoryLookupResult<SessionHistorySheetTarget>> = {};
    const sheetIds = Array.from(
      new Set(
        sessions
          .filter((session) => session.sourceType === "sheet")
          .map((session) => normalizeOptionalContextId(session.sheetId))
          .filter((sheetId): sheetId is string => sheetId !== null)
      )
    );

    await Promise.all(
      sheetIds.map(async (sheetId) => {
        try {
          const sheet = await sheetGateway.getSheetContext(sheetId);

          sheetTargets[sheetId] = sheet
            ? {
                state: "valid",
                value: {
                  name: sheet.name
                }
              }
            : {
                state: "missing"
              };
        } catch {
          sheetTargets[sheetId] = {
            state: "lookup-failed"
          };
        }
      })
    );

    return sheetTargets;
  }

  async function resolveSessionHistorySegmentTargets(
    sessions: PracticeSession[],
    sheetTargets: Record<string, SessionHistoryLookupResult<SessionHistorySheetTarget>>
  ) {
    const segmentTargets: Record<string, SessionHistoryLookupResult<SessionHistorySegmentTarget>> = {};

    if (!segmentGateway) {
      return segmentTargets;
    }

    const segmentKeys = new Map<string, { sheetId: string; segmentId: string }>();

    for (const session of sessions) {
      if (session.sourceType !== "sheet") {
        continue;
      }

      const sheetId = normalizeOptionalContextId(session.sheetId);
      const segmentId = normalizeOptionalContextId(session.segmentContext?.segmentId);

      if (!sheetId || !segmentId) {
        continue;
      }

      const sheetTarget = sheetTargets[sheetId];

      if (sheetTarget?.state === "lookup-failed" || sheetTarget?.state === "missing") {
        continue;
      }

      segmentKeys.set(createSessionHistorySegmentTargetKey(sheetId, segmentId), {
        sheetId,
        segmentId
      });
    }

    await Promise.all(
      Array.from(segmentKeys.entries()).map(async ([targetKey, target]) => {
        try {
          const segment = await segmentGateway.getSegmentContext(
            target.sheetId,
            target.segmentId
          );

          segmentTargets[targetKey] = segment
            ? {
                state: "valid",
                value: {
                  name: segment.name
                }
              }
            : {
                state: "missing"
              };
        } catch {
          segmentTargets[targetKey] = {
            state: "lookup-failed"
          };
        }
      })
    );

    return segmentTargets;
  }

  function getHomeRecentActivityTargetSources(
    sessions: PracticeSession[],
    recordings: SheetRecordingMetadata[]
  ) {
    return [
      ...sessions.map((session) => ({
        sourceType: session.sourceType,
        sheetId: session.sheetId,
        segmentContext: session.segmentContext
      })),
      ...recordings.map((recording) => ({
        sourceType: "sheet" as const,
        sheetId: recording.sheetId,
        segmentContext: recording.segmentContext
      }))
    ];
  }

  async function resolveHomeRecentActivitySheetTargets(
    sessions: PracticeSession[],
    recordings: SheetRecordingMetadata[]
  ) {
    const sheetTargets: NonNullable<HomeRecentActivityTargetResolution["sheets"]> = {};
    const sheetIds = Array.from(
      new Set(
        getHomeRecentActivityTargetSources(sessions, recordings)
          .filter((source) => source.sourceType === "sheet")
          .map((source) => normalizeOptionalContextId(source.sheetId))
          .filter((sheetId): sheetId is string => sheetId !== null)
      )
    );

    await Promise.all(
      sheetIds.map(async (sheetId) => {
        try {
          const sheet = await sheetGateway.getSheetContext(sheetId);

          sheetTargets[sheetId] = sheet
            ? {
                state: "valid",
                value: {
                  name: sheet.name
                }
              }
            : {
                state: "missing"
              };
        } catch {
          sheetTargets[sheetId] = {
            state: "lookup-failed"
          };
        }
      })
    );

    return sheetTargets;
  }

  async function resolveHomeRecentActivitySegmentTargets(
    sessions: PracticeSession[],
    recordings: SheetRecordingMetadata[],
    sheetTargets: NonNullable<HomeRecentActivityTargetResolution["sheets"]>
  ) {
    const segmentTargets: NonNullable<HomeRecentActivityTargetResolution["segments"]> = {};

    if (!segmentGateway) {
      return segmentTargets;
    }

    const segmentKeys = new Map<string, { sheetId: string; segmentId: string }>();

    for (const source of getHomeRecentActivityTargetSources(sessions, recordings)) {
      if (source.sourceType !== "sheet") {
        continue;
      }

      const sheetId = normalizeOptionalContextId(source.sheetId);
      const segmentId = normalizeOptionalContextId(source.segmentContext?.segmentId);

      if (!sheetId || !segmentId) {
        continue;
      }

      const sheetTarget = sheetTargets[sheetId];

      if (sheetTarget?.state === "lookup-failed" || sheetTarget?.state === "missing") {
        continue;
      }

      segmentKeys.set(createSessionHistorySegmentTargetKey(sheetId, segmentId), {
        sheetId,
        segmentId
      });
    }

    await Promise.all(
      Array.from(segmentKeys.entries()).map(async ([targetKey, target]) => {
        try {
          const segment = await segmentGateway.getSegmentContext(
            target.sheetId,
            target.segmentId
          );

          segmentTargets[targetKey] = segment
            ? {
                state: "valid",
                value: {
                  name: segment.name
                }
              }
            : {
                state: "missing"
              };
        } catch {
          segmentTargets[targetKey] = {
            state: "lookup-failed"
          };
        }
      })
    );

    return segmentTargets;
  }

  async function updateSessionDuration(session: PracticeSession) {
    const timestamp = now().toISOString();
    const nextSession = withUpdatedPracticeSessionDuration(session, timestamp);

    await saveSession(nextSession);

    if (nextSession.sourceType === "sheet" && nextSession.sheetId) {
      await sheetGateway.updateLastPracticedAt(nextSession.sheetId, timestamp);
    }

    return nextSession;
  }

  async function ensureQuickSession(input: QuickPracticeActivityInput) {
    const timestamp = now().toISOString();
    const recentQuickSession =
      (await repository.listSessions()).find((session) => session.sourceType === "quick") ?? null;
    const existingSession = input.forceNewSession || !canReuseActiveSession(recentQuickSession)
      ? null
      : recentQuickSession;
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
        updatedAt: timestamp,
        segmentContext: null
      };
    const nextSession = withUpdatedPracticeSessionDuration(
      {
        ...session,
        endedAt: null,
        bpm: input.bpm ?? session.bpm,
        timeSignature: input.timeSignature ?? session.timeSignature
      },
      timestamp
    );

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
    const recentSheetSession = await repository.getRecentSheetSession(sheet.id);
    const existingSession = input.forceNewSession || !canReuseActiveSession(recentSheetSession)
      ? null
      : recentSheetSession;
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
        updatedAt: timestamp,
        segmentContext: null
      };

    const nextSession = withUpdatedPracticeSessionDuration(
      {
        ...session,
        endedAt: null,
        bpm: input.bpm ?? session.bpm ?? sheet.bpm,
        timeSignature: input.timeSignature ?? session.timeSignature ?? sheet.timeSignature,
        segmentContext: session.segmentContext ?? null
      },
      timestamp
    );

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
    const nextSession = withUpdatedPracticeSessionDuration(
      {
        ...session,
        bpm: input.bpm ?? session.bpm ?? sheet.bpm,
        timeSignature: input.timeSignature ?? session.timeSignature ?? sheet.timeSignature
      },
      timestamp
    );

    return nextSession;
  }

  async function prepareSheetRecordingMetadata(
    input: SheetRecordingMetadataInput
  ): Promise<PreparedSheetRecordingMetadata | null> {
    const session = await getRecordingSession(input);

    if (!session || !session.sheetId) {
      return null;
    }

    const sheet = await sheetGateway.getSheetContext(session.sheetId);

    if (!sheet) {
      return null;
    }

    const timestamp = session.updatedAt;
    const metadata = validateSheetRecordingMetadata({
      id: createId("recording"),
      type: "sheet",
      sessionId: session.id,
      sheetId: session.sheetId,
      sheetName: sheet.name,
      createdAt: timestamp,
      durationMs: Math.max(0, Math.round(input.durationMs ?? 0)),
      bpm: session.bpm ?? sheet.bpm,
      timeSignature: session.timeSignature ?? sheet.timeSignature,
      segmentContext: input.segmentContext ?? null
    });

    return {
      metadata,
      session: {
        ...session,
        recordingCount: session.recordingCount + 1,
        latestRecordingId: metadata.id,
        segmentContext: metadata.segmentContext
      }
    };
  }

  async function commitPreparedSheetRecordingSession({
    metadata,
    session
  }: PreparedSheetRecordingMetadata) {
    if (
      session.sourceType !== "sheet" ||
      !session.sheetId ||
      metadata.sessionId !== session.id ||
      metadata.sheetId !== session.sheetId
    ) {
      throw new Error("Prepared sheet recording metadata does not match its session.");
    }

    await saveSession(session);
    await sheetGateway.updateLastPracticedAt(metadata.sheetId, metadata.createdAt);
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
    const nextSession = withUpdatedPracticeSessionDuration(
      {
        ...session,
        recordingCount: session.recordingCount + 1,
        latestRecordingId: recordingId
      },
      timestamp
    );

    await saveSession(nextSession);

    if (nextSession.sourceType === "sheet" && nextSession.sheetId) {
      await sheetGateway.updateLastPracticedAt(nextSession.sheetId, timestamp);
    }

    return nextSession;
  }

  return {
    ensureQuickSession,
    ensureSheetSession,
    captureSessionEvent,

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
      const nextSession = withUpdatedPracticeSessionDuration(
        {
          ...session,
          endedAt: timestamp
        },
        timestamp
      );

      await saveSession(nextSession);

      if (nextSession.sourceType === "sheet" && nextSession.sheetId) {
        await sheetGateway.updateLastPracticedAt(nextSession.sheetId, timestamp);
      }

      return nextSession;
    },

    linkRecordingToSession,
    prepareSheetRecordingMetadata,
    commitPreparedSheetRecordingSession,

    async createSheetRecordingMetadata(input: SheetRecordingMetadataInput) {
      const prepared = await prepareSheetRecordingMetadata(input);

      if (!prepared) {
        return null;
      }

      await recordingRepository.saveRecordingMetadata(
        prepared.metadata,
        prepared.session
      );
      await commitPreparedSheetRecordingSession(prepared);

      return prepared.metadata;
    },

    listSessions() {
      return repository.listSessions();
    },

    async getHomeRecentActivity(options) {
      const [sessions, recordings] = await Promise.all([
        repository.listSessions(),
        recordingRepository.listRecordingMetadata()
      ]);
      const sheets = await resolveHomeRecentActivitySheetTargets(
        sessions,
        recordings
      );
      const segments = await resolveHomeRecentActivitySegmentTargets(
        sessions,
        recordings,
        sheets
      );

      return selectHomeRecentActivity({
        sessions,
        recordings,
        targets: {
          sheets,
          segments
        },
        generatedAt: now().toISOString(),
        limit: options?.limit
      });
    },

    async getSessionHistoryGroups(mode) {
      const sessions = await repository.listSessions();

      if (mode === "date") {
        return groupPracticeSessionsByHistory(sessions, mode);
      }

      const sheets = await resolveSessionHistorySheetTargets(sessions);
      const segments = mode === "segment"
        ? await resolveSessionHistorySegmentTargets(sessions, sheets)
        : {};

      return groupPracticeSessionsByHistory(sessions, mode, {
        sheets,
        segments
      });
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
