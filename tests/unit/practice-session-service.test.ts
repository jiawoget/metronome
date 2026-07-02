import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  applyPracticeTrigger,
  parsePracticeSession,
  parseSheetRecordingMetadata,
  validatePracticeSession,
  validateSheetRecordingMetadata,
  type LocalPracticeGoal,
  type PracticeSession,
  type SheetRecordingSegmentContext,
  type SheetRecordingMetadata
} from "@/domain/practice";
import { createGlobalPracticeSessionRepository } from "@/infrastructure/db/global-practice-session-repository";
import { RECORDINGS_STORAGE_KEY } from "@/lib/recordings-review/repository";
import {
  createPracticeSessionService,
  type PracticeSessionEventSink,
  type PracticeRecordingMetadataRepository,
  type PracticeSessionRepository,
  type PracticeSessionSegmentGateway,
  type PracticeSessionSheetGateway
} from "@/services/practice-session";

function createMemorySessionRepository(): PracticeSessionRepository {
  const sessions = new Map<string, PracticeSession>();
  const listSessions = async () =>
    Array.from(sessions.values()).sort((first, second) => second.updatedAt.localeCompare(first.updatedAt));

  return {
    listSessions,
    async getSession(sessionId) {
      return sessions.get(sessionId) ?? null;
    },
    async getRecentSession() {
      return (await listSessions())[0] ?? null;
    },
    async getRecentSheetSession(sheetId) {
      return (await listSessions()).find((session) => session.sheetId === sheetId) ?? null;
    },
    async saveSession(session) {
      sessions.set(session.id, validatePracticeSession(session));
    },
    async deleteSession(sessionId) {
      sessions.delete(sessionId);
    },
    async clear() {
      sessions.clear();
    }
  };
}

function createMemoryRecordingRepository(): PracticeRecordingMetadataRepository {
  const recordings = new Map<string, SheetRecordingMetadata>();
  const listRecordingMetadata = async () =>
    Array.from(recordings.values()).sort((first, second) => second.createdAt.localeCompare(first.createdAt));

  return {
    listRecordingMetadata,
    async listRecordingMetadataForSession(sessionId) {
      return (await listRecordingMetadata()).filter((recording) => recording.sessionId === sessionId);
    },
    async saveRecordingMetadata(recording) {
      recordings.set(recording.id, validateSheetRecordingMetadata(recording));
    },
    async clear() {
      recordings.clear();
    }
  };
}

function createSheetGateway(
  validSheetIds = new Set(["sheet-alpha"]),
  {
    failingSheetIds = new Set<string>(),
    sheetNames = new Map<string, string>()
  }: {
    failingSheetIds?: Set<string>;
    sheetNames?: Map<string, string>;
  } = {}
) {
  const lastPracticed = new Map<string, string>();
  const gateway: PracticeSessionSheetGateway = {
    async getSheetContext(sheetId) {
      if (failingSheetIds.has(sheetId)) {
        throw new Error("sheet lookup failed");
      }

      if (!validSheetIds.has(sheetId)) {
        return null;
      }

      return {
        id: sheetId,
        name: sheetNames.get(sheetId) ?? "Alpha Sheet",
        bpm: 96,
        timeSignature: "4/4"
      };
    },
    async updateLastPracticedAt(sheetId, practicedAt) {
      lastPracticed.set(sheetId, practicedAt);
    }
  };

  return { gateway, lastPracticed };
}

function createSegmentContext(overrides: Partial<SheetRecordingSegmentContext> = {}): SheetRecordingSegmentContext {
  return {
    segmentId: "segment-alpha",
    segmentName: "Bridge",
    range: {
      startMeasure: 5,
      endMeasure: 12
    },
    targetBpm: 96,
    measureGridVersion: "bpm:96|timeSignature:4/4|pickupBeats:0|measureOneOffsetMs:1000",
    measureGridSnapshot: {
      bpm: 96,
      timeSignature: "4/4",
      pickupBeats: 0,
      measureOneOffsetMs: 1_000
    },
    measureRangeMs: {
      startMs: 11_000,
      endMs: 31_000
    },
    ...overrides
  };
}

function createPracticeSessionFixture(
  overrides: Partial<PracticeSession> = {}
): PracticeSession {
  return {
    id: "session-alpha",
    sourceType: "sheet",
    sheetId: "sheet-alpha",
    startedAt: "2026-06-21T12:00:00.000Z",
    endedAt: null,
    durationMs: 60_000,
    bpm: 96,
    timeSignature: "4/4",
    recordingCount: 1,
    latestRecordingId: "recording-alpha",
    updatedAt: "2026-06-21T12:01:00.000Z",
    segmentContext: null,
    ...overrides
  };
}

function createSheetRecordingMetadataFixture(
  overrides: Partial<SheetRecordingMetadata> = {}
): SheetRecordingMetadata {
  return {
    id: "recording-alpha",
    type: "sheet",
    sessionId: "session-alpha",
    sheetId: "sheet-alpha",
    sheetName: "Alpha Sheet Snapshot",
    createdAt: "2026-06-21T12:02:00.000Z",
    durationMs: 12_000,
    bpm: 96,
    timeSignature: "4/4",
    segmentContext: null,
    ...overrides
  };
}

describe("practice session service", () => {
  let nowMs: number;

  beforeEach(() => {
    nowMs = Date.parse("2026-06-21T12:00:00.000Z");
    window.localStorage.clear();
  });

  function createService({
    eventSink,
    segmentGateway,
    sheetGateway
  }: {
    eventSink?: PracticeSessionEventSink;
    segmentGateway?: PracticeSessionSegmentGateway;
    sheetGateway?: PracticeSessionSheetGateway;
  } = {}) {
    const repository = createMemorySessionRepository();
    const recordingRepository = createMemoryRecordingRepository();
    const validSheetIds = new Set(["sheet-alpha"]);
    const { gateway, lastPracticed } = createSheetGateway(validSheetIds);
    let idNumber = 0;
    const service = createPracticeSessionService({
      repository,
      recordingRepository,
      sheetGateway: sheetGateway ?? gateway,
      segmentGateway,
      eventSink,
      now: () => new Date(nowMs),
      createId: (prefix) => `${prefix}-${++idNumber}`
    });

    return { service, repository, recordingRepository, lastPracticed, validSheetIds };
  }

  it("does not create a session for missing or unknown sheet context", async () => {
    const { service, repository } = createService();

    await expect(service.ensureSheetSession({ sheetId: null, trigger: "metronome" })).resolves.toBeNull();
    await expect(service.ensureSheetSession({ sheetId: "sheet-missing", trigger: "recording" })).resolves.toBeNull();
    await expect(repository.listSessions()).resolves.toEqual([]);
  });

  it("creates a sheet session on metronome trigger without recording metadata", async () => {
    const { service, lastPracticed } = createService();

    const session = await service.ensureSheetSession({ sheetId: "sheet-alpha", trigger: "metronome" });

    expect(session).toMatchObject({
      id: "session-1",
      sourceType: "sheet",
      sheetId: "sheet-alpha",
      durationMs: 0,
      bpm: 96,
      timeSignature: "4/4",
      recordingCount: 0,
      latestRecordingId: null,
      segmentContext: null
    });
    expect(await service.listRecordingMetadata()).toEqual([]);
    expect(lastPracticed.get("sheet-alpha")).toBe("2026-06-21T12:00:00.000Z");
  });

  it("normalizes legacy practice sessions without segmentContext to null", () => {
    expect(
      parsePracticeSession({
        id: "legacy-quick",
        sourceType: "quick",
        sheetId: null,
        startedAt: "2026-06-21T12:00:00.000Z",
        endedAt: null,
        durationMs: 0,
        bpm: 120,
        timeSignature: "4/4",
        recordingCount: 0,
        latestRecordingId: null,
        updatedAt: "2026-06-21T12:00:00.000Z"
      })
    ).toMatchObject({
      id: "legacy-quick",
      segmentContext: null
    });
    expect(
      parsePracticeSession({
        id: "legacy-sheet",
        sourceType: "sheet",
        sheetId: "sheet-alpha",
        startedAt: "2026-06-21T12:00:00.000Z",
        endedAt: null,
        durationMs: 0,
        bpm: 96,
        timeSignature: "4/4",
        recordingCount: 0,
        latestRecordingId: null,
        updatedAt: "2026-06-21T12:00:00.000Z"
      })
    ).toMatchObject({
      id: "legacy-sheet",
      segmentContext: null
    });
  });

  it("accepts valid sheet session segmentContext and rejects quick or malformed non-null context", () => {
    const segmentContext = createSegmentContext({ targetBpm: null });

    expect(
      validatePracticeSession({
        id: "sheet-with-segment",
        sourceType: "sheet",
        sheetId: "sheet-alpha",
        startedAt: "2026-06-21T12:00:00.000Z",
        endedAt: null,
        durationMs: 0,
        bpm: 96,
        timeSignature: "4/4",
        recordingCount: 0,
        latestRecordingId: null,
        updatedAt: "2026-06-21T12:00:00.000Z",
        segmentContext
      })
    ).toMatchObject({
      segmentContext
    });
    expect(() =>
      validatePracticeSession({
        id: "quick-with-segment",
        sourceType: "quick",
        sheetId: null,
        startedAt: "2026-06-21T12:00:00.000Z",
        endedAt: null,
        durationMs: 0,
        bpm: 120,
        timeSignature: "4/4",
        recordingCount: 0,
        latestRecordingId: null,
        updatedAt: "2026-06-21T12:00:00.000Z",
        segmentContext
      })
    ).toThrow();
    expect(
      parsePracticeSession({
        id: "sheet-bad-segment",
        sourceType: "sheet",
        sheetId: "sheet-alpha",
        startedAt: "2026-06-21T12:00:00.000Z",
        endedAt: null,
        durationMs: 0,
        bpm: 96,
        timeSignature: "4/4",
        recordingCount: 0,
        latestRecordingId: null,
        updatedAt: "2026-06-21T12:00:00.000Z",
        segmentContext: {
          ...createSegmentContext(),
          segmentId: ""
        }
      })
    ).toBeNull();
  });

  it("restores the existing sheet session, updates duration, and drives Continue Practice", async () => {
    const { service } = createService();

    const session = await service.ensureSheetSession({ sheetId: "sheet-alpha", trigger: "metronome" });
    nowMs += 65_000;
    const restored = await service.ensureSheetSession({ sheetId: "sheet-alpha", trigger: "recording" });

    expect(restored?.id).toBe(session?.id);
    expect(restored?.durationMs).toBe(65_000);
    expect(await service.getContinuePracticeTarget()).toEqual({
      sourceType: "sheet",
      href: "/sheet-practice/sheet-alpha",
      label: "Continue Sheet Practice",
      sessionId: "session-1",
      sheetId: "sheet-alpha"
    });
  });

  it("ignores generic sheet activity segmentContext extras and preserves committed recording context", async () => {
    const { service, repository } = createService();
    const segmentContext = createSegmentContext();

    const attemptedGenericWrite = {
      sheetId: "sheet-alpha",
      trigger: "recording",
      segmentContext
    } as const;
    const created = await service.ensureSheetSession(attemptedGenericWrite);

    expect(created).toMatchObject({
      id: "session-1",
      segmentContext: null
    });

    nowMs += 1_500;
    const prepared = await service.prepareSheetRecordingMetadata({
      sheetId: "sheet-alpha",
      sessionId: created?.id,
      durationMs: 1_500,
      segmentContext
    });
    await service.commitPreparedSheetRecordingSession(prepared!);
    await expect(repository.getSession(created?.id ?? "")).resolves.toMatchObject({
      segmentContext
    });

    nowMs += 30_000;
    const attemptedGenericClear = {
      sheetId: "sheet-alpha",
      trigger: "metronome",
      segmentContext: null
    } as const;
    const preserved = await service.ensureSheetSession({
      ...attemptedGenericClear,
      bpm: 100
    });

    expect(preserved).toMatchObject({
      id: "session-1",
      bpm: 100,
      segmentContext
    });
  });

  it("persists endedAt when metronome-only activity stops", async () => {
    const { service } = createService();

    const session = await service.ensureSheetSession({ sheetId: "sheet-alpha", trigger: "metronome" });
    nowMs += 5_000;
    const ended = await service.endPracticeSession(session?.id ?? "");

    expect(ended).toMatchObject({
      id: "session-1",
      endedAt: "2026-06-21T12:00:05.000Z",
      durationMs: 5_000
    });
  });

  it("creates quick sessions without sheetId and routes Continue Practice to Quick Metronome", async () => {
    const { service, repository } = createService();

    const session = await service.ensureQuickSession({
      trigger: "metronome",
      bpm: 120,
      timeSignature: "3/4"
    });

    expect(session).toMatchObject({
      id: "session-1",
      sourceType: "quick",
      sheetId: null,
      bpm: 120,
      timeSignature: "3/4",
      recordingCount: 0,
      latestRecordingId: null,
      segmentContext: null
    });

    nowMs += 4_000;
    await expect(service.updatePracticeSessionDuration(session.id)).resolves.toMatchObject({
      id: "session-1",
      durationMs: 4_000
    });
    await expect(service.endPracticeSession(session.id)).resolves.toMatchObject({
      id: "session-1",
      endedAt: "2026-06-21T12:00:04.000Z",
      durationMs: 4_000
    });
    await expect(repository.getSession(session.id)).resolves.toMatchObject({
      sourceType: "quick",
      sheetId: null,
      durationMs: 4_000
    });
    await expect(service.getContinuePracticeTarget()).resolves.toEqual({
      sourceType: "quick",
      href: "/quick-metronome",
      label: "Continue Quick Practice",
      sessionId: "session-1"
    });
  });

  it("creates new quick history entries after an old quick session ended or crossed a local day", async () => {
    const { service, repository } = createService();
    nowMs = new Date(2026, 5, 21, 10, 0, 0).getTime();

    const firstSession = await service.ensureQuickSession({
      trigger: "metronome",
      bpm: 100,
      timeSignature: "4/4"
    });

    nowMs = new Date(2026, 5, 21, 10, 5, 0).getTime();
    await service.endPracticeSession(firstSession.id);

    nowMs = new Date(2026, 5, 22, 9, 0, 0).getTime();
    const secondSession = await service.ensureQuickSession({
      trigger: "metronome",
      bpm: 110,
      timeSignature: "3/4"
    });

    expect(secondSession.id).toBe("session-2");
    expect(secondSession.id).not.toBe(firstSession.id);
    await expect(repository.listSessions()).resolves.toHaveLength(2);
    await expect(service.getTodaySummary()).resolves.toEqual({
      durationMs: 0,
      minutesToday: 0,
      sessionsToday: 1,
      recordingsToday: 0
    });
  });

  it("reuses only an active same-day quick session during one practice context", async () => {
    const { service, repository } = createService();
    nowMs = new Date(2026, 5, 21, 10, 0, 0).getTime();

    const firstSession = await service.ensureQuickSession({ trigger: "metronome", bpm: 96, timeSignature: "4/4" });

    nowMs = new Date(2026, 5, 21, 10, 1, 0).getTime();
    const sameContextSession = await service.ensureQuickSession({ trigger: "recording", bpm: 100, timeSignature: "3/4" });

    expect(sameContextSession.id).toBe(firstSession.id);
    expect(sameContextSession).toMatchObject({
      durationMs: 60_000,
      bpm: 100,
      timeSignature: "3/4"
    });
    await expect(repository.listSessions()).resolves.toHaveLength(1);
  });

  it("updates recording count and latest recording id for session-bound quick recordings", async () => {
    const { service, repository } = createService();
    const session = await service.ensureQuickSession({ trigger: "recording", bpm: 96, timeSignature: "4/4" });

    nowMs += 1_000;
    await expect(
      service.linkRecordingToSession({
        sessionId: session.id,
        recordingId: "quick-recording-1"
      })
    ).resolves.toMatchObject({
      id: session.id,
      recordingCount: 1,
      latestRecordingId: "quick-recording-1",
      durationMs: 1_000
    });

    nowMs += 2_000;
    await expect(
      service.linkRecordingToSession({
        sessionId: session.id,
        recordingId: "quick-recording-2"
      })
    ).resolves.toMatchObject({
      id: session.id,
      recordingCount: 2,
      latestRecordingId: "quick-recording-2",
      durationMs: 3_000
    });
    await expect(repository.getSession(session.id)).resolves.toMatchObject({
      recordingCount: 2,
      latestRecordingId: "quick-recording-2"
    });
  });

  it("keeps ended session durations stable when later update paths run", async () => {
    const { service, repository } = createService();
    const quickSession = await service.ensureQuickSession({
      trigger: "metronome",
      bpm: 96,
      timeSignature: "4/4"
    });

    nowMs += 4_000;
    await expect(service.endPracticeSession(quickSession.id)).resolves.toMatchObject({
      endedAt: "2026-06-21T12:00:04.000Z",
      durationMs: 4_000
    });

    nowMs += 60_000;
    await expect(service.updatePracticeSessionDuration(quickSession.id)).resolves.toMatchObject({
      endedAt: "2026-06-21T12:00:04.000Z",
      durationMs: 4_000,
      updatedAt: "2026-06-21T12:01:04.000Z"
    });
    await expect(service.endPracticeSession(quickSession.id)).resolves.toMatchObject({
      endedAt: "2026-06-21T12:00:04.000Z",
      durationMs: 4_000
    });

    const sheetSession = await service.ensureSheetSession({
      sheetId: "sheet-alpha",
      trigger: "metronome"
    });

    nowMs += 6_000;
    await service.endPracticeSession(sheetSession?.id ?? "");

    nowMs += 60_000;
    await expect(service.updateSheetSessionDuration(sheetSession?.id ?? "")).resolves.toMatchObject({
      endedAt: "2026-06-21T12:01:10.000Z",
      durationMs: 6_000,
      updatedAt: "2026-06-21T12:02:10.000Z"
    });
    await expect(repository.getSession(sheetSession?.id ?? "")).resolves.toMatchObject({
      endedAt: "2026-06-21T12:01:10.000Z",
      durationMs: 6_000
    });
  });

  it("does not reopen ended sessions when recording link or prepare paths update duration", async () => {
    const { service, repository } = createService();
    const quickSession = await service.ensureQuickSession({
      trigger: "recording",
      bpm: 96,
      timeSignature: "4/4"
    });

    nowMs += 2_000;
    await service.endPracticeSession(quickSession.id);

    nowMs += 60_000;
    await expect(
      service.linkRecordingToSession({
        sessionId: quickSession.id,
        recordingId: "quick-recording-after-end"
      })
    ).resolves.toMatchObject({
      endedAt: "2026-06-21T12:00:02.000Z",
      durationMs: 2_000,
      recordingCount: 1,
      latestRecordingId: "quick-recording-after-end",
      updatedAt: "2026-06-21T12:01:02.000Z"
    });

    const sheetSession = await service.ensureSheetSession({
      sheetId: "sheet-alpha",
      trigger: "recording"
    });

    nowMs += 3_000;
    await service.endPracticeSession(sheetSession?.id ?? "");

    nowMs += 60_000;
    const prepared = await service.prepareSheetRecordingMetadata({
      sheetId: "sheet-alpha",
      sessionId: sheetSession?.id,
      durationMs: 900
    });

    expect(prepared?.session).toMatchObject({
      endedAt: "2026-06-21T12:01:05.000Z",
      durationMs: 3_000,
      recordingCount: 1,
      updatedAt: "2026-06-21T12:02:05.000Z"
    });
    expect(prepared?.metadata).toMatchObject({
      createdAt: "2026-06-21T12:02:05.000Z",
      durationMs: 900
    });
    await expect(repository.getSession(sheetSession?.id ?? "")).resolves.toMatchObject({
      endedAt: "2026-06-21T12:01:05.000Z",
      durationMs: 3_000,
      recordingCount: 0
    });
  });

  it("aggregates Today Summary using the browser-local day boundary", async () => {
    const { service, repository } = createService();
    nowMs = new Date(2026, 5, 21, 12, 0, 0).getTime();

    await repository.saveSession({
      id: "today-quick",
      sourceType: "quick",
      sheetId: null,
      startedAt: new Date(2026, 5, 21, 0, 30, 0).toISOString(),
      endedAt: new Date(2026, 5, 21, 0, 33, 0).toISOString(),
      durationMs: 180_000,
      bpm: 120,
      timeSignature: "4/4",
      recordingCount: 1,
      latestRecordingId: "quick-recording",
      updatedAt: new Date(2026, 5, 21, 0, 33, 0).toISOString(),
      segmentContext: null
    });
    await repository.saveSession({
      id: "today-sheet",
      sourceType: "sheet",
      sheetId: "sheet-alpha",
      startedAt: new Date(2026, 5, 21, 23, 30, 0).toISOString(),
      endedAt: new Date(2026, 5, 21, 23, 34, 0).toISOString(),
      durationMs: 240_000,
      bpm: 96,
      timeSignature: "4/4",
      recordingCount: 0,
      latestRecordingId: null,
      updatedAt: new Date(2026, 5, 21, 23, 34, 0).toISOString(),
      segmentContext: null
    });
    await repository.saveSession({
      id: "previous-local-day",
      sourceType: "quick",
      sheetId: null,
      startedAt: new Date(2026, 5, 20, 23, 59, 0).toISOString(),
      endedAt: new Date(2026, 5, 21, 0, 1, 0).toISOString(),
      durationMs: 120_000,
      bpm: 96,
      timeSignature: "4/4",
      recordingCount: 1,
      latestRecordingId: "previous-recording",
      updatedAt: new Date(2026, 5, 21, 0, 1, 0).toISOString(),
      segmentContext: null
    });

    await expect(service.getTodaySummary()).resolves.toEqual({
      durationMs: 420_000,
      minutesToday: 7,
      sessionsToday: 2,
      recordingsToday: 1
    });
  });

  it("creates a new sheet history entry instead of reopening an ended sheet session", async () => {
    const { service, repository } = createService();

    const session = await service.ensureSheetSession({ sheetId: "sheet-alpha", trigger: "metronome" });
    nowMs += 5_000;
    const ended = await service.endPracticeSession(session?.id ?? "");

    expect(ended?.endedAt).toBe("2026-06-21T12:00:05.000Z");

    nowMs += 10_000;
    const nextSession = await service.ensureSheetSession({ sheetId: "sheet-alpha", trigger: "metronome" });

    expect(nextSession).toMatchObject({
      id: "session-2",
      endedAt: null,
      updatedAt: "2026-06-21T12:00:15.000Z"
    });
    expect(nextSession?.id).not.toBe(session?.id);
    await expect(repository.listSessions()).resolves.toHaveLength(2);

    const restored = await service.restorePracticeSessionSnapshot(ended as PracticeSession);

    expect(restored).toEqual(ended);
    await expect(repository.getSession(session?.id ?? "")).resolves.toEqual(ended);
  });

  it("creates sheet recording metadata linked to sessionId and sheetId without artifacts", async () => {
    const { service, repository } = createService();

    const session = await service.ensureSheetSession({ sheetId: "sheet-alpha", trigger: "recording" });
    nowMs += 12_500;
    const recording = await service.createSheetRecordingMetadata({
      sheetId: "sheet-alpha",
      sessionId: session?.id,
      durationMs: 12_300
    });
    const updatedSession = await repository.getSession(session?.id ?? "");

    expect(recording).toEqual({
      id: "recording-2",
      type: "sheet",
      sessionId: "session-1",
      sheetId: "sheet-alpha",
      sheetName: "Alpha Sheet",
      createdAt: "2026-06-21T12:00:12.500Z",
      durationMs: 12_300,
      bpm: 96,
      timeSignature: "4/4",
      segmentContext: null
    });
    expect(recording).not.toHaveProperty("audioDataUrl");
    expect(await service.listRecordingMetadata()).toEqual([recording]);
    expect(updatedSession).toMatchObject({
      recordingCount: 1,
      latestRecordingId: "recording-2",
      durationMs: 12_500
    });

    nowMs += 1_000;
    await expect(service.endPracticeSession(session?.id ?? "")).resolves.toMatchObject({
      endedAt: "2026-06-21T12:00:13.500Z",
      durationMs: 13_500
    });
  });

  it("evaluates goal completion from existing session and recording reads without writes", async () => {
    const { service, repository, recordingRepository } = createService();
    const session = createPracticeSessionFixture({
      id: "session-for-goals",
      durationMs: 60_000,
      recordingCount: 10
    });
    const recording = createSheetRecordingMetadataFixture({
      id: "recording-for-goals",
      sessionId: session.id
    });
    const goals: LocalPracticeGoal[] = [
      {
        id: "minutes-goal",
        kind: "minutes",
        target: 1,
        period: "today",
        createdAt: "2026-06-21T08:00:00.000Z"
      },
      {
        id: "takes-goal",
        kind: "takes",
        target: 1,
        period: "today",
        createdAt: "2026-06-21T08:00:00.000Z"
      }
    ];

    await repository.saveSession(session);
    await recordingRepository.saveRecordingMetadata(recording, session);

    const listSessionsSpy = vi.spyOn(repository, "listSessions");
    const listRecordingsSpy = vi.spyOn(recordingRepository, "listRecordingMetadata");
    const saveSessionSpy = vi.spyOn(repository, "saveSession");
    const deleteSessionSpy = vi.spyOn(repository, "deleteSession");
    const clearSessionsSpy = vi.spyOn(repository, "clear");
    const saveRecordingSpy = vi.spyOn(recordingRepository, "saveRecordingMetadata");
    const clearRecordingsSpy = vi.spyOn(recordingRepository, "clear");

    await expect(service.evaluateGoalCompletion(goals)).resolves.toEqual([
      expect.objectContaining({
        goalId: "minutes-goal",
        status: "completed",
        progress: 1
      }),
      expect.objectContaining({
        goalId: "takes-goal",
        status: "completed",
        progress: 1
      })
    ]);
    expect(listSessionsSpy).toHaveBeenCalledTimes(1);
    expect(listRecordingsSpy).toHaveBeenCalledTimes(1);
    expect(saveSessionSpy).not.toHaveBeenCalled();
    expect(deleteSessionSpy).not.toHaveBeenCalled();
    expect(clearSessionsSpy).not.toHaveBeenCalled();
    expect(saveRecordingSpy).not.toHaveBeenCalled();
    expect(clearRecordingsSpy).not.toHaveBeenCalled();
  });

  it("rejects goal completion evaluation when required reads fail", async () => {
    const goal: LocalPracticeGoal = {
      id: "minutes-goal",
      kind: "minutes",
      target: 1,
      period: "today",
      createdAt: "2026-06-21T08:00:00.000Z"
    };
    const { gateway } = createSheetGateway(new Set(["sheet-alpha"]));
    const sessionReadFailureRepository = createMemorySessionRepository();
    const recordingReadFailureRepository = createMemoryRecordingRepository();

    vi.spyOn(sessionReadFailureRepository, "listSessions").mockRejectedValue(
      new Error("session read failed")
    );
    vi.spyOn(recordingReadFailureRepository, "listRecordingMetadata").mockRejectedValue(
      new Error("recording read failed")
    );

    await expect(
      createPracticeSessionService({
        repository: sessionReadFailureRepository,
        recordingRepository: createMemoryRecordingRepository(),
        sheetGateway: gateway,
        now: () => new Date(nowMs)
      }).evaluateGoalCompletion([goal])
    ).rejects.toThrow("session read failed");

    await expect(
      createPracticeSessionService({
        repository: createMemorySessionRepository(),
        recordingRepository: recordingReadFailureRepository,
        sheetGateway: gateway,
        now: () => new Date(nowMs)
      }).evaluateGoalCompletion([goal])
    ).rejects.toThrow("recording read failed");
  });

  it("reads Home dashboard analytics from sessions and recording metadata without writes or gateway lookups", async () => {
    const session = createPracticeSessionFixture({
      id: "session-for-analytics",
      durationMs: 60_000,
      recordingCount: 99,
      segmentContext: createSegmentContext()
    });
    const recording = createSheetRecordingMetadataFixture({
      id: "recording-for-analytics",
      sessionId: session.id
    });
    const repository: PracticeSessionRepository = {
      listSessions: vi.fn(async () => [session]),
      getSession: vi.fn(async () => null),
      getRecentSession: vi.fn(async () => null),
      getRecentSheetSession: vi.fn(async () => null),
      saveSession: vi.fn(async () => undefined),
      deleteSession: vi.fn(async () => undefined),
      clear: vi.fn(async () => undefined)
    };
    const recordingRepository: PracticeRecordingMetadataRepository = {
      listRecordingMetadata: vi.fn(async () => [recording]),
      listRecordingMetadataForSession: vi.fn(async () => []),
      saveRecordingMetadata: vi.fn(async () => undefined),
      clear: vi.fn(async () => undefined)
    };
    const getSheetContext = vi.fn(async () => null);
    const updateLastPracticedAt = vi.fn(async () => undefined);
    const getSegmentContext = vi.fn(async () => null);
    const service = createPracticeSessionService({
      repository,
      recordingRepository,
      sheetGateway: {
        getSheetContext,
        updateLastPracticedAt
      },
      segmentGateway: {
        getSegmentContext
      },
      now: () => new Date(nowMs)
    });

    await expect(service.getHomeDashboardAnalyticsSource()).resolves.toEqual({
      generatedAt: "2026-06-21T12:00:00.000Z",
      summary: {
        durationMs: 60_000,
        minutesToday: 1,
        sessionsToday: 1,
        recordingsToday: 99
      },
      totals: {
        durationMs: 60_000,
        sessions: 1,
        sheetTakes: 1,
        practicedSheets: 1,
        segmentSessions: 1
      },
      emptyState: {
        hasPracticeHistory: true,
        hasSheetPractice: true,
        hasSegmentPractice: true,
        hasRecordings: true,
        hasGoals: false
      }
    });
    expect(repository.listSessions).toHaveBeenCalledTimes(1);
    expect(recordingRepository.listRecordingMetadata).toHaveBeenCalledTimes(1);
    expect(repository.saveSession).not.toHaveBeenCalled();
    expect(repository.deleteSession).not.toHaveBeenCalled();
    expect(repository.clear).not.toHaveBeenCalled();
    expect(recordingRepository.saveRecordingMetadata).not.toHaveBeenCalled();
    expect(recordingRepository.clear).not.toHaveBeenCalled();
    expect(getSheetContext).not.toHaveBeenCalled();
    expect(updateLastPracticedAt).not.toHaveBeenCalled();
    expect(getSegmentContext).not.toHaveBeenCalled();
  });

  it("rejects Home dashboard analytics when required reads fail", async () => {
    const { gateway } = createSheetGateway(new Set(["sheet-alpha"]));
    const sessionReadFailureRepository = createMemorySessionRepository();
    const recordingReadFailureRepository = createMemoryRecordingRepository();

    vi.spyOn(sessionReadFailureRepository, "listSessions").mockRejectedValue(
      new Error("session read failed")
    );
    vi.spyOn(recordingReadFailureRepository, "listRecordingMetadata").mockRejectedValue(
      new Error("recording read failed")
    );

    await expect(
      createPracticeSessionService({
        repository: sessionReadFailureRepository,
        recordingRepository: createMemoryRecordingRepository(),
        sheetGateway: gateway,
        now: () => new Date(nowMs)
      }).getHomeDashboardAnalyticsSource()
    ).rejects.toThrow("session read failed");

    await expect(
      createPracticeSessionService({
        repository: createMemorySessionRepository(),
        recordingRepository: recordingReadFailureRepository,
        sheetGateway: gateway,
        now: () => new Date(nowMs)
      }).getHomeDashboardAnalyticsSource()
    ).rejects.toThrow("recording read failed");
  });

  it("reads session comparison from sessions and recording metadata without writes", async () => {
    const quickSession = createPracticeSessionFixture({
      id: "quick-session",
      sourceType: "quick",
      sheetId: null,
      startedAt: "2026-06-21T11:00:00.000Z",
      updatedAt: "2026-06-21T11:03:00.000Z",
      durationMs: 180_000,
      bpm: 100,
      timeSignature: "3/4",
      recordingCount: 0,
      latestRecordingId: null,
      segmentContext: null
    });
    const segmentSession = createPracticeSessionFixture({
      id: "segment-session",
      startedAt: "2026-06-21T10:00:00.000Z",
      updatedAt: "2026-06-21T10:02:00.000Z",
      durationMs: 120_000,
      recordingCount: 2,
      latestRecordingId: "recording-two",
      segmentContext: createSegmentContext()
    });
    const recordings = [
      createSheetRecordingMetadataFixture({
        id: "recording-one",
        sessionId: "segment-session",
        durationMs: 30_000
      }),
      createSheetRecordingMetadataFixture({
        id: "recording-two",
        sessionId: "segment-session",
        durationMs: 45_000
      }),
      createSheetRecordingMetadataFixture({
        id: "recording-missing-session",
        sessionId: "missing-session"
      })
    ];
    const repository: PracticeSessionRepository = {
      listSessions: vi.fn(async () => [quickSession, segmentSession]),
      getSession: vi.fn(async () => null),
      getRecentSession: vi.fn(async () => null),
      getRecentSheetSession: vi.fn(async () => null),
      saveSession: vi.fn(async () => undefined),
      deleteSession: vi.fn(async () => undefined),
      clear: vi.fn(async () => undefined)
    };
    const recordingRepository: PracticeRecordingMetadataRepository = {
      listRecordingMetadata: vi.fn(async () => recordings),
      listRecordingMetadataForSession: vi.fn(async () => []),
      saveRecordingMetadata: vi.fn(async () => undefined),
      clear: vi.fn(async () => undefined)
    };
    const getSheetContext = vi.fn(async (sheetId: string) => ({
      id: sheetId,
      name: "Alpha Sheet",
      bpm: 96,
      timeSignature: "4/4" as const
    }));
    const updateLastPracticedAt = vi.fn(async () => undefined);
    const getSegmentContext = vi.fn(async (_sheetId: string, segmentId: string) => ({
      id: segmentId,
      name: "Live Bridge"
    }));
    const service = createPracticeSessionService({
      repository,
      recordingRepository,
      sheetGateway: {
        getSheetContext,
        updateLastPracticedAt
      },
      segmentGateway: {
        getSegmentContext
      },
      now: () => new Date(nowMs)
    });

    const result = await service.getSessionComparison({
      selectedSessionIds: ["quick-session", "segment-session"]
    });

    expect(result).toMatchObject({
      generatedAt: "2026-06-21T12:00:00.000Z",
      selectedSessionIds: ["quick-session", "segment-session"],
      maxSelected: 3
    });
    expect(result.candidates.map((candidate) => [candidate.sessionId, candidate.targetState])).toEqual([
      ["quick-session", "quick"],
      ["segment-session", "valid"]
    ]);
    expect(result.candidates[1]).toMatchObject({
      sheetName: "Alpha Sheet",
      segmentName: "Bridge",
      segmentRangeLabel: "m5-12",
      linkedRecordingMetadataCount: 2,
      linkedRecordingDurationMs: 75_000
    });
    expect(result.metrics.find((metric) => metric.key === "events")?.values).toEqual([
      {
        sessionId: "quick-session",
        text: "Event details not available yet",
        tone: "muted"
      },
      {
        sessionId: "segment-session",
        text: "Event details not available yet",
        tone: "muted"
      }
    ]);
    expect(result.metrics.find((metric) => metric.key === "goalContribution")?.values[1].text).toBe(
      "Counts as 1 session; adds 2 min; 2 sheet takes linked"
    );
    expect(result.unavailable.map((entry) => entry.key)).toEqual(["events", "audio"]);
    expect(repository.listSessions).toHaveBeenCalledTimes(1);
    expect(recordingRepository.listRecordingMetadata).toHaveBeenCalledTimes(1);
    expect(getSheetContext).toHaveBeenCalledWith("sheet-alpha");
    expect(getSegmentContext).toHaveBeenCalledWith("sheet-alpha", "segment-alpha");
    expect(repository.getSession).not.toHaveBeenCalled();
    expect(repository.getRecentSession).not.toHaveBeenCalled();
    expect(repository.getRecentSheetSession).not.toHaveBeenCalled();
    expect(repository.saveSession).not.toHaveBeenCalled();
    expect(repository.deleteSession).not.toHaveBeenCalled();
    expect(repository.clear).not.toHaveBeenCalled();
    expect(recordingRepository.saveRecordingMetadata).not.toHaveBeenCalled();
    expect(recordingRepository.clear).not.toHaveBeenCalled();
    expect(recordingRepository.listRecordingMetadataForSession).not.toHaveBeenCalled();
    expect(updateLastPracticedAt).not.toHaveBeenCalled();
  });

  it("contains session comparison sheet and segment lookup failures in target states", async () => {
    const sessions = [
      createPracticeSessionFixture({
        id: "deleted-sheet",
        sheetId: "sheet-deleted"
      }),
      createPracticeSessionFixture({
        id: "failed-sheet",
        sheetId: "sheet-failed"
      }),
      createPracticeSessionFixture({
        id: "missing-segment",
        segmentContext: createSegmentContext({
          segmentId: "segment-missing",
          segmentName: "Deleted Bridge"
        })
      }),
      createPracticeSessionFixture({
        id: "failed-segment",
        segmentContext: createSegmentContext({
          segmentId: "segment-failed",
          segmentName: "Failed Bridge"
        })
      })
    ];
    const repository: PracticeSessionRepository = {
      listSessions: vi.fn(async () => sessions),
      getSession: vi.fn(async () => null),
      getRecentSession: vi.fn(async () => null),
      getRecentSheetSession: vi.fn(async () => null),
      saveSession: vi.fn(async () => undefined),
      deleteSession: vi.fn(async () => undefined),
      clear: vi.fn(async () => undefined)
    };
    const recordingRepository: PracticeRecordingMetadataRepository = {
      listRecordingMetadata: vi.fn(async () => []),
      listRecordingMetadataForSession: vi.fn(async () => []),
      saveRecordingMetadata: vi.fn(async () => undefined),
      clear: vi.fn(async () => undefined)
    };
    const getSheetContext = vi.fn(async (sheetId: string) => {
      if (sheetId === "sheet-failed") {
        throw new Error("sheet lookup failed");
      }

      if (sheetId === "sheet-deleted") {
        return null;
      }

      return {
        id: sheetId,
        name: "Alpha Sheet",
        bpm: 96,
        timeSignature: "4/4" as const
      };
    });
    const getSegmentContext = vi.fn(async (_sheetId: string, segmentId: string) => {
      if (segmentId === "segment-failed") {
        throw new Error("segment lookup failed");
      }

      if (segmentId === "segment-missing") {
        return null;
      }

      return {
        id: segmentId,
        name: "Live Bridge"
      };
    });
    const updateLastPracticedAt = vi.fn(async () => undefined);
    const service = createPracticeSessionService({
      repository,
      recordingRepository,
      sheetGateway: {
        getSheetContext,
        updateLastPracticedAt
      },
      segmentGateway: {
        getSegmentContext
      },
      now: () => new Date(nowMs)
    });

    const result = await service.getSessionComparison({
      selectedSessionIds: ["deleted-sheet", "missing-segment"]
    });
    const statesById = Object.fromEntries(
      result.candidates.map((candidate) => [candidate.sessionId, candidate.targetState])
    );

    expect(statesById).toMatchObject({
      "deleted-sheet": "missing-sheet",
      "failed-sheet": "lookup-failed",
      "missing-segment": "missing-segment",
      "failed-segment": "lookup-failed"
    });
    expect(result.metrics.find((metric) => metric.key === "sheet")?.values[0]).toEqual({
      sessionId: "deleted-sheet",
      text: "Deleted sheet",
      tone: "warning"
    });
    expect(result.metrics.find((metric) => metric.key === "segment")?.values[1]).toEqual({
      sessionId: "missing-segment",
      text: "Deleted Bridge m5-12 (missing)",
      tone: "warning"
    });
    expect(repository.saveSession).not.toHaveBeenCalled();
    expect(recordingRepository.saveRecordingMetadata).not.toHaveBeenCalled();
    expect(updateLastPracticedAt).not.toHaveBeenCalled();
  });

  it("rejects session comparison when required repository reads fail", async () => {
    const { gateway } = createSheetGateway(new Set(["sheet-alpha"]));
    const sessionReadFailureRepository = createMemorySessionRepository();
    const recordingReadFailureRepository = createMemoryRecordingRepository();

    vi.spyOn(sessionReadFailureRepository, "listSessions").mockRejectedValue(
      new Error("session read failed")
    );
    vi.spyOn(recordingReadFailureRepository, "listRecordingMetadata").mockRejectedValue(
      new Error("recording read failed")
    );

    await expect(
      createPracticeSessionService({
        repository: sessionReadFailureRepository,
        recordingRepository: createMemoryRecordingRepository(),
        sheetGateway: gateway,
        now: () => new Date(nowMs)
      }).getSessionComparison()
    ).rejects.toThrow("session read failed");

    await expect(
      createPracticeSessionService({
        repository: createMemorySessionRepository(),
        recordingRepository: recordingReadFailureRepository,
        sheetGateway: gateway,
        now: () => new Date(nowMs)
      }).getSessionComparison()
    ).rejects.toThrow("recording read failed");
  });

  it("reads Home practice streaks from sessions only with one captured service clock", async () => {
    const todaySession = createPracticeSessionFixture({
      id: "today-practice",
      startedAt: "2026-06-21T09:00:00.000Z",
      updatedAt: "2026-06-21T09:01:00.000Z",
      durationMs: 0,
      recordingCount: 99
    });
    const yesterdaySession = createPracticeSessionFixture({
      id: "yesterday-practice",
      startedAt: "2026-06-20T09:00:00.000Z",
      updatedAt: "2026-06-20T09:01:00.000Z",
      segmentContext: createSegmentContext()
    });
    const repository: PracticeSessionRepository = {
      listSessions: vi.fn(async () => [yesterdaySession, todaySession]),
      getSession: vi.fn(async () => null),
      getRecentSession: vi.fn(async () => null),
      getRecentSheetSession: vi.fn(async () => null),
      saveSession: vi.fn(async () => undefined),
      deleteSession: vi.fn(async () => undefined),
      clear: vi.fn(async () => undefined)
    };
    const recordingRepository: PracticeRecordingMetadataRepository = {
      listRecordingMetadata: vi.fn(async () => []),
      listRecordingMetadataForSession: vi.fn(async () => []),
      saveRecordingMetadata: vi.fn(async () => undefined),
      clear: vi.fn(async () => undefined)
    };
    const getSheetContext = vi.fn();
    const updateLastPracticedAt = vi.fn(async () => undefined);
    const getSegmentContext = vi.fn();
    const clock = vi.fn()
      .mockReturnValueOnce(new Date("2026-06-21T12:00:00.000Z"))
      .mockReturnValueOnce(new Date("2030-01-01T00:00:00.000Z"));
    const service = createPracticeSessionService({
      repository,
      recordingRepository,
      sheetGateway: {
        getSheetContext,
        updateLastPracticedAt
      },
      segmentGateway: {
        getSegmentContext
      },
      now: clock
    });

    await expect(service.getHomePracticeStreaks()).resolves.toEqual({
      generatedAt: "2026-06-21T12:00:00.000Z",
      currentStreakDays: 2,
      longestStreakDays: 2,
      practicedToday: true,
      lastPracticedLocalDay: "2026-06-21",
      emptyState: {
        hasPracticeHistory: true
      }
    });
    expect(clock).toHaveBeenCalledTimes(1);
    expect(repository.listSessions).toHaveBeenCalledTimes(1);
    expect(recordingRepository.listRecordingMetadata).not.toHaveBeenCalled();
    expect(repository.getSession).not.toHaveBeenCalled();
    expect(repository.getRecentSession).not.toHaveBeenCalled();
    expect(repository.getRecentSheetSession).not.toHaveBeenCalled();
    expect(repository.saveSession).not.toHaveBeenCalled();
    expect(repository.deleteSession).not.toHaveBeenCalled();
    expect(repository.clear).not.toHaveBeenCalled();
    expect(recordingRepository.saveRecordingMetadata).not.toHaveBeenCalled();
    expect(recordingRepository.clear).not.toHaveBeenCalled();
    expect(getSheetContext).not.toHaveBeenCalled();
    expect(updateLastPracticedAt).not.toHaveBeenCalled();
    expect(getSegmentContext).not.toHaveBeenCalled();
  });

  it("rejects Home practice streaks when session reads fail", async () => {
    const { gateway } = createSheetGateway(new Set(["sheet-alpha"]));
    const sessionReadFailureRepository = createMemorySessionRepository();

    vi.spyOn(sessionReadFailureRepository, "listSessions").mockRejectedValue(
      new Error("session read failed")
    );

    await expect(
      createPracticeSessionService({
        repository: sessionReadFailureRepository,
        recordingRepository: createMemoryRecordingRepository(),
        sheetGateway: gateway,
        now: () => new Date(nowMs)
      }).getHomePracticeStreaks()
    ).rejects.toThrow("session read failed");
  });

  it("prepares sheet recording metadata without persisting recording metadata or session recording counts until commit", async () => {
    const { service, repository } = createService();

    const session = await service.ensureSheetSession({ sheetId: "sheet-alpha", trigger: "recording" });
    nowMs += 12_500;

    const prepared = await service.prepareSheetRecordingMetadata({
      sheetId: "sheet-alpha",
      sessionId: session?.id,
      durationMs: 12_300
    });

    expect(prepared?.metadata).toEqual({
      id: "recording-2",
      type: "sheet",
      sessionId: "session-1",
      sheetId: "sheet-alpha",
      sheetName: "Alpha Sheet",
      createdAt: "2026-06-21T12:00:12.500Z",
      durationMs: 12_300,
      bpm: 96,
      timeSignature: "4/4",
      segmentContext: null
    });
    expect(prepared?.session).toMatchObject({
      id: "session-1",
      recordingCount: 1,
      latestRecordingId: "recording-2",
      updatedAt: "2026-06-21T12:00:12.500Z",
      segmentContext: null
    });
    await expect(service.listRecordingMetadata()).resolves.toEqual([]);
    await expect(repository.getSession(session?.id ?? "")).resolves.toMatchObject({
      recordingCount: 0,
      latestRecordingId: null,
      updatedAt: "2026-06-21T12:00:00.000Z",
      segmentContext: null
    });

    await service.commitPreparedSheetRecordingSession(prepared!);

    await expect(service.listRecordingMetadata()).resolves.toEqual([]);
    await expect(repository.getSession(session?.id ?? "")).resolves.toMatchObject({
      recordingCount: 1,
      latestRecordingId: "recording-2",
      updatedAt: "2026-06-21T12:00:12.500Z",
      segmentContext: null
    });
  });

  it("normalizes legacy and explicit null sheet recording segment context", () => {
    const legacyMetadata = {
      id: "recording-legacy",
      type: "sheet",
      sessionId: "session-1",
      sheetId: "sheet-alpha",
      sheetName: "Alpha Sheet",
      createdAt: "2026-06-21T12:00:00.000Z",
      durationMs: 1_000,
      bpm: 96,
      timeSignature: "4/4"
    };

    expect(parseSheetRecordingMetadata(legacyMetadata)).toEqual({
      ...legacyMetadata,
      segmentContext: null
    });
    expect(
      validateSheetRecordingMetadata({
        ...legacyMetadata,
        segmentContext: null
      } as SheetRecordingMetadata)
    ).toMatchObject({
      segmentContext: null
    });
  });

  it("creates sheet recording metadata with a valid segment context snapshot", async () => {
    const { service } = createService();
    const session = await service.ensureSheetSession({ sheetId: "sheet-alpha", trigger: "recording" });
    const segmentContext = createSegmentContext();

    nowMs += 1_500;
    const recording = await service.createSheetRecordingMetadata({
      sheetId: "sheet-alpha",
      sessionId: session?.id,
      durationMs: 1_500,
      segmentContext
    });

    expect(recording?.segmentContext).toEqual(segmentContext);
    await expect(service.listRecordingMetadata()).resolves.toEqual([recording]);
  });

  it("copies validated recording segmentContext onto the prepared session and persists it on commit", async () => {
    const { service, repository } = createService();
    const session = await service.ensureSheetSession({
      sheetId: "sheet-alpha",
      trigger: "recording"
    });
    const segmentContext = createSegmentContext({ targetBpm: null });

    nowMs += 1_500;
    const prepared = await service.prepareSheetRecordingMetadata({
      sheetId: "sheet-alpha",
      sessionId: session?.id,
      durationMs: 1_500,
      segmentContext
    });

    expect(prepared?.metadata.segmentContext).toEqual(segmentContext);
    expect(prepared?.session.segmentContext).toEqual(segmentContext);
    await expect(repository.getSession(session?.id ?? "")).resolves.toMatchObject({
      recordingCount: 0,
      latestRecordingId: null,
      segmentContext: null
    });

    await service.commitPreparedSheetRecordingSession(prepared!);

    await expect(repository.getSession(session?.id ?? "")).resolves.toMatchObject({
      recordingCount: 1,
      latestRecordingId: prepared?.metadata.id,
      segmentContext
    });
  });

  it("clears a prior sheet session segmentContext when a no-segment recording commit succeeds", async () => {
    const { service, repository } = createService();
    const session = await service.ensureSheetSession({
      sheetId: "sheet-alpha",
      trigger: "recording"
    });
    const segmentContext = createSegmentContext();
    const preparedWithSegment = await service.prepareSheetRecordingMetadata({
      sheetId: "sheet-alpha",
      sessionId: session?.id,
      durationMs: 1_000,
      segmentContext
    });
    await service.commitPreparedSheetRecordingSession(preparedWithSegment!);
    await expect(repository.getSession(session?.id ?? "")).resolves.toMatchObject({
      segmentContext
    });

    nowMs += 1_500;
    const prepared = await service.prepareSheetRecordingMetadata({
      sheetId: "sheet-alpha",
      sessionId: session?.id,
      durationMs: 1_500,
      segmentContext: null
    });

    expect(prepared?.session.segmentContext).toBeNull();

    await service.commitPreparedSheetRecordingSession(prepared!);

    await expect(repository.getSession(session?.id ?? "")).resolves.toMatchObject({
      recordingCount: 2,
      latestRecordingId: prepared?.metadata.id,
      segmentContext: null
    });
  });

  it("rejects invalid sheet recording segment context before saving metadata or session counts", async () => {
    const { service, repository } = createService();
    const priorContext = createSegmentContext();
    const session = await service.ensureSheetSession({
      sheetId: "sheet-alpha",
      trigger: "recording"
    });
    const priorPrepared = await service.prepareSheetRecordingMetadata({
      sheetId: "sheet-alpha",
      sessionId: session?.id,
      durationMs: 500,
      segmentContext: priorContext
    });
    await service.commitPreparedSheetRecordingSession(priorPrepared!);

    await expect(
      service.createSheetRecordingMetadata({
        sheetId: "sheet-alpha",
        sessionId: session?.id,
        durationMs: 1_500,
        segmentContext: {
          ...createSegmentContext(),
          segmentId: ""
        }
      })
    ).rejects.toThrow();

    await expect(service.listRecordingMetadata()).resolves.toEqual([]);
    await expect(repository.getSession(session?.id ?? "")).resolves.toMatchObject({
      recordingCount: 1,
      latestRecordingId: priorPrepared?.metadata.id,
      segmentContext: priorContext
    });
    expect(
      parseSheetRecordingMetadata({
        id: "recording-invalid-segment",
        type: "sheet",
        sessionId: "session-1",
        sheetId: "sheet-alpha",
        sheetName: "Alpha Sheet",
        createdAt: "2026-06-21T12:00:00.000Z",
        durationMs: 1_000,
        bpm: 96,
        timeSignature: "4/4",
        segmentContext: {
          ...createSegmentContext(),
          segmentId: ""
        }
      })
    ).toBeNull();
  });

  it("validates segment context range, bpm, grid snapshot, and timestamp bounds", () => {
    expect(validateSheetRecordingMetadata({
      id: "recording-valid-segment",
      type: "sheet",
      sessionId: "session-1",
      sheetId: "sheet-alpha",
      sheetName: "Alpha Sheet",
      createdAt: "2026-06-21T12:00:00.000Z",
      durationMs: 1_000,
      bpm: 96,
      timeSignature: "4/4",
      segmentContext: createSegmentContext({ targetBpm: null })
    })).toMatchObject({
      segmentContext: {
        targetBpm: null,
        measureRangeMs: {
          startMs: 11_000,
          endMs: 31_000
        }
      }
    });

    for (const segmentContext of [
      createSegmentContext({ segmentName: "" }),
      createSegmentContext({ range: { startMeasure: 12, endMeasure: 5 } }),
      createSegmentContext({ targetBpm: 301 }),
      createSegmentContext({ measureGridSnapshot: { bpm: 0, timeSignature: "4/4", pickupBeats: 0, measureOneOffsetMs: 0 } }),
      createSegmentContext({ measureRangeMs: { startMs: 25_000, endMs: 9_000 } }),
      createSegmentContext({ measureRangeMs: { startMs: 9_000, endMs: 25_000 } }),
      createSegmentContext({ measureRangeMs: { startMs: Number.NaN, endMs: 9_000 } })
    ]) {
      expect(() =>
        validateSheetRecordingMetadata({
          id: "recording-invalid-segment",
          type: "sheet",
          sessionId: "session-1",
          sheetId: "sheet-alpha",
          sheetName: "Alpha Sheet",
          createdAt: "2026-06-21T12:00:00.000Z",
          durationMs: 1_000,
          bpm: 96,
          timeSignature: "4/4",
          segmentContext
        })
      ).toThrow();
    }
  });

  it("rejects segment context measureRangeMs that does not match the range and grid snapshot", () => {
    const inconsistentMetadata: SheetRecordingMetadata = {
      id: "recording-inconsistent-range-ms",
      type: "sheet",
      sessionId: "session-1",
      sheetId: "sheet-alpha",
      sheetName: "Alpha Sheet",
      createdAt: "2026-06-21T12:00:00.000Z",
      durationMs: 1_000,
      bpm: 96,
      timeSignature: "4/4",
      segmentContext: createSegmentContext({
        measureRangeMs: {
          startMs: 9_000,
          endMs: 25_000
        }
      })
    };

    expect(() => validateSheetRecordingMetadata(inconsistentMetadata)).toThrow();
    expect(parseSheetRecordingMetadata(inconsistentMetadata)).toBeNull();
    expect(
      validateSheetRecordingMetadata({
        ...inconsistentMetadata,
        segmentContext: createSegmentContext()
      }).segmentContext?.measureRangeMs
    ).toEqual({
      startMs: 11_000,
      endMs: 31_000
    });
  });

  it("rejects recording metadata without an existing sessionId", async () => {
    const { service, repository } = createService();

    await service.ensureSheetSession({ sheetId: "sheet-alpha", trigger: "recording" });
    await expect(
      service.createSheetRecordingMetadata({
        sheetId: "sheet-alpha",
        sessionId: "session-missing",
        durationMs: 500
      })
    ).resolves.toBeNull();
    await expect(
      service.createSheetRecordingMetadata({
        sheetId: "sheet-alpha",
        durationMs: 500
      })
    ).resolves.toBeNull();
    await expect(service.linkRecordingToSession({ sessionId: null, recordingId: "recording-missing-session" })).resolves.toBeNull();
    await expect(repository.listSessions()).resolves.toHaveLength(1);
    await expect(service.listRecordingMetadata()).resolves.toEqual([]);
  });

  it("creates a fresh sheet session for Practice Again recording instead of mutating the source session", async () => {
    const { service, repository } = createService();

    const sourceSession = await service.ensureSheetSession({ sheetId: "sheet-alpha", trigger: "metronome" });
    nowMs += 2_000;
    await service.endPracticeSession(sourceSession?.id ?? "");

    nowMs += 8_000;
    const freshSession = await service.ensureSheetSession({
      sheetId: "sheet-alpha",
      trigger: "recording",
      bpm: 88,
      timeSignature: "3/4",
      forceNewSession: true
    });

    expect(freshSession).toMatchObject({
      id: "session-2",
      sourceType: "sheet",
      sheetId: "sheet-alpha",
      bpm: 88,
      timeSignature: "3/4",
      recordingCount: 0,
      latestRecordingId: null
    });
    expect(freshSession?.id).not.toBe(sourceSession?.id);

    nowMs += 900;
    const recording = await service.createSheetRecordingMetadata({
      sheetId: "sheet-alpha",
      sessionId: freshSession?.id,
      durationMs: 900,
      bpm: 88,
      timeSignature: "3/4",
      segmentContext: null
    });

    expect(recording).toMatchObject({
      id: "recording-3",
      type: "sheet",
      sessionId: "session-2",
      sheetId: "sheet-alpha",
      durationMs: 900,
      bpm: 88,
      timeSignature: "3/4"
    });
    await expect(repository.getSession(sourceSession?.id ?? "")).resolves.toMatchObject({
      id: "session-1",
      latestRecordingId: null,
      recordingCount: 0
    });
    await expect(repository.getSession(freshSession?.id ?? "")).resolves.toMatchObject({
      id: "session-2",
      latestRecordingId: "recording-3",
      recordingCount: 1
    });
  });

  it("rejects a stale latest sheet session while preserving an older valid quick target", async () => {
    const { service, repository, validSheetIds } = createService();

    await service.ensureQuickSession({ trigger: "metronome", bpm: 120, timeSignature: "4/4" });
    expect(await service.getContinuePracticeTarget()).toEqual({
      sourceType: "quick",
      href: "/quick-metronome",
      label: "Continue Quick Practice",
      sessionId: "session-1"
    });
    nowMs += 1_000;
    await service.ensureSheetSession({ sheetId: "sheet-alpha", trigger: "metronome" });
    expect(await service.getContinuePracticeTarget()).toEqual({
      sourceType: "sheet",
      href: "/sheet-practice/sheet-alpha",
      label: "Continue Sheet Practice",
      sessionId: "session-2",
      sheetId: "sheet-alpha"
    });

    validSheetIds.delete("sheet-alpha");

    await expect(service.getContinuePracticeTargets()).resolves.toMatchObject({
      targets: [
        {
          kind: "quick",
          sourceType: "quick",
          targetKey: "quick",
          sessionId: "session-1"
        }
      ],
      rejected: [
        {
          id: "session:session-2",
          reason: "missing-sheet",
          sheetId: "sheet-alpha"
        }
      ]
    });
    await expect(service.getContinuePracticeTarget()).resolves.toEqual({
      sourceType: "quick",
      href: "/quick-metronome",
      label: "Continue Quick Practice",
      sessionId: "session-1"
    });
    await expect(repository.listSessions()).resolves.toHaveLength(2);
  });

  it("keeps the Home Continue Practice wrapper from returning segment-specific navigation", async () => {
    const { service, repository } = createService({
      segmentGateway: {
        async getSegmentContext(_sheetId, segmentId) {
          return {
            id: segmentId,
            name: "Live Bridge"
          };
        }
      }
    });

    await repository.saveSession(
      createPracticeSessionFixture({
        id: "sheet-session",
        updatedAt: "2026-06-21T12:02:00.000Z"
      })
    );
    await repository.saveSession(
      createPracticeSessionFixture({
        id: "segment-session",
        updatedAt: "2026-06-21T12:03:00.000Z",
        segmentContext: createSegmentContext()
      })
    );

    const targets = await service.getContinuePracticeTargets();

    expect(targets.targets.map((target) => [target.kind, target.targetKey])).toEqual([
      ["segment", "segment:sheet-alpha:segment-alpha"],
      ["sheet", "sheet:sheet-alpha"]
    ]);
    expect(targets.targets[0]).not.toHaveProperty("href");
    await expect(service.getContinuePracticeTarget()).resolves.toEqual({
      sourceType: "sheet",
      href: "/sheet-practice/sheet-alpha",
      label: "Continue Sheet Practice",
      sessionId: "sheet-session",
      sheetId: "sheet-alpha"
    });
  });

  it("rejects invalid session and recording metadata at validation boundaries", () => {
    expect(() =>
      validatePracticeSession({
        id: "bad-quick",
        sourceType: "quick",
        sheetId: "sheet-alpha",
        startedAt: "2026-06-21T12:00:00.000Z",
        endedAt: null,
        durationMs: 0,
        bpm: 96,
        timeSignature: "4/4",
        recordingCount: 0,
        latestRecordingId: null,
        updatedAt: "2026-06-21T12:00:00.000Z",
        segmentContext: null
      })
    ).toThrow();
    expect(() =>
      validatePracticeSession({
        id: "bad-non-iso",
        sourceType: "sheet",
        sheetId: "sheet-alpha",
        startedAt: "2026-06-21 12:00:00",
        endedAt: null,
        durationMs: 0,
        bpm: 96,
        timeSignature: "4/4",
        recordingCount: 0,
        latestRecordingId: null,
        updatedAt: "2026-06-21T12:00:00.000Z",
        segmentContext: null
      })
    ).toThrow();
    expect(() =>
      validatePracticeSession({
        id: "bad-impossible-date",
        sourceType: "sheet",
        sheetId: "sheet-alpha",
        startedAt: "2026-02-30T12:00:00.000Z",
        endedAt: null,
        durationMs: 0,
        bpm: 96,
        timeSignature: "4/4",
        recordingCount: 0,
        latestRecordingId: null,
        updatedAt: "2026-02-30T12:00:00.000Z",
        segmentContext: null
      })
    ).toThrow();
    expect(() =>
      validatePracticeSession({
        id: "bad-timezone",
        sourceType: "sheet",
        sheetId: "sheet-alpha",
        startedAt: "2026-06-21T12:00:00.000+99:99",
        endedAt: null,
        durationMs: 0,
        bpm: 96,
        timeSignature: "4/4",
        recordingCount: 0,
        latestRecordingId: null,
        updatedAt: "2026-06-21T12:00:00.000Z",
        segmentContext: null
      })
    ).toThrow();
    expect(() =>
      validatePracticeSession({
        id: "bad-date",
        sourceType: "sheet",
        sheetId: "sheet-alpha",
        startedAt: "not-a-date",
        endedAt: null,
        durationMs: -1,
        bpm: 96,
        timeSignature: "4/4",
        recordingCount: 0,
        latestRecordingId: null,
        updatedAt: "2026-06-21T12:00:00.000Z",
        segmentContext: null
      })
    ).toThrow();
    expect(() =>
      validateSheetRecordingMetadata({
        id: "bad-recording",
        type: "sheet",
        sessionId: "session-1",
        sheetId: "",
        sheetName: "Alpha Sheet",
        createdAt: "2026-06-21T12:00:00.000Z",
        durationMs: 0,
        bpm: 96,
        timeSignature: "4/4",
        segmentContext: null
      })
    ).toThrow();
  });

  it("calculates global recent session across existing quick history and sheet sessions", async () => {
    const sheetRepository = createMemorySessionRepository();
    const recordingRepository = createMemoryRecordingRepository();
    const { gateway } = createSheetGateway();
    const globalRepository = createGlobalPracticeSessionRepository(sheetRepository);
    const service = createPracticeSessionService({
      repository: globalRepository,
      recordingRepository,
      sheetGateway: gateway,
      now: () => new Date(nowMs),
      createId: (prefix) => `${prefix}-global`
    });

    await sheetRepository.saveSession({
      id: "sheet-session",
      sourceType: "sheet",
      sheetId: "sheet-alpha",
      startedAt: "2026-06-21T12:00:00.000Z",
      endedAt: "2026-06-21T12:01:00.000Z",
      durationMs: 60_000,
      bpm: 96,
      timeSignature: "4/4",
      recordingCount: 0,
      latestRecordingId: null,
      updatedAt: "2026-06-21T12:01:00.000Z",
      segmentContext: null
    });
    window.localStorage.setItem(
      RECORDINGS_STORAGE_KEY,
      JSON.stringify({
        sessions: [
          {
            id: "quick-session",
            sourceType: "quick",
            startedAt: "2026-06-21T12:05:00.000Z",
            endedAt: "2026-06-21T12:06:00.000Z",
            settings: {
              bpm: 120,
              timeSignature: "4/4"
            }
          }
        ],
        recordings: [],
        errorMarkers: []
      })
    );

    await expect(service.getContinuePracticeTarget()).resolves.toEqual({
      sourceType: "quick",
      href: "/quick-metronome",
      label: "Continue Quick Practice",
      sessionId: "quick-session"
    });

    await sheetRepository.saveSession({
      id: "sheet-session",
      sourceType: "sheet",
      sheetId: "sheet-alpha",
      startedAt: "2026-06-21T12:00:00.000Z",
      endedAt: "2026-06-21T12:10:00.000Z",
      durationMs: 600_000,
      bpm: 96,
      timeSignature: "4/4",
      recordingCount: 0,
      latestRecordingId: null,
      updatedAt: "2026-06-21T12:10:00.000Z",
      segmentContext: null
    });

    await expect(service.getContinuePracticeTarget()).resolves.toEqual({
      sourceType: "sheet",
      href: "/sheet-practice/sheet-alpha",
      label: "Continue Sheet Practice",
      sessionId: "sheet-session",
      sheetId: "sheet-alpha"
    });
  });

  it("filters legacy quick sessions that inherit an unsupported recording meter", async () => {
    const sheetRepository = createMemorySessionRepository();
    const globalRepository = createGlobalPracticeSessionRepository(sheetRepository);

    window.localStorage.setItem(
      RECORDINGS_STORAGE_KEY,
      JSON.stringify({
        sessions: [
          {
            id: "legacy-quick-session",
            sourceType: "quick",
            startedAt: "2026-06-21T12:05:00.000Z",
            endedAt: "2026-06-21T12:06:00.000Z"
          }
        ],
        recordings: [
          {
            id: "legacy-quick-recording",
            type: "quick",
            sessionId: "legacy-quick-session",
            sheetId: null,
            createdAt: "2026-06-21T12:06:00.000Z",
            durationMs: 60_000,
            sizeBytes: 1024,
            mimeType: "audio/webm",
            settings: {
              bpm: 120,
              timeSignature: "5/4"
            }
          }
        ],
        errorMarkers: []
      })
    );

    await expect(globalRepository.listSessions()).resolves.toEqual([]);
    await expect(
      globalRepository.getSession("legacy-quick-session")
    ).resolves.toBeNull();
  });

  it("normalizes legacy quick sessions from recording history to segmentContext null", async () => {
    const sheetRepository = createMemorySessionRepository();
    const globalRepository = createGlobalPracticeSessionRepository(sheetRepository);

    window.localStorage.setItem(
      RECORDINGS_STORAGE_KEY,
      JSON.stringify({
        sessions: [
          {
            id: "legacy-quick-session",
            sourceType: "quick",
            startedAt: "2026-06-21T12:05:00.000Z",
            endedAt: "2026-06-21T12:06:00.000Z",
            settings: {
              bpm: 120,
              timeSignature: "4/4"
            }
          }
        ],
        recordings: [],
        errorMarkers: []
      })
    );

    await expect(globalRepository.getSession("legacy-quick-session")).resolves.toMatchObject({
      id: "legacy-quick-session",
      sourceType: "quick",
      durationMs: 60_000,
      segmentContext: null
    });
    await expect(globalRepository.listSessions()).resolves.toEqual([
      expect.objectContaining({
        id: "legacy-quick-session",
        sourceType: "quick",
        durationMs: 60_000,
        segmentContext: null
      })
    ]);
  });

  it("keeps latest recording duration as the legacy quick-session conversion source of truth", async () => {
    const sheetRepository = createMemorySessionRepository();
    const globalRepository = createGlobalPracticeSessionRepository(sheetRepository);

    window.localStorage.setItem(
      RECORDINGS_STORAGE_KEY,
      JSON.stringify({
        sessions: [
          {
            id: "legacy-quick-session",
            sourceType: "quick",
            startedAt: "2026-06-21T12:05:00.000Z",
            endedAt: "2026-06-21T12:06:00.000Z",
            settings: {
              bpm: 120,
              timeSignature: "4/4"
            }
          }
        ],
        recordings: [
          {
            id: "legacy-quick-recording-old",
            type: "quick",
            sessionId: "legacy-quick-session",
            sheetId: null,
            createdAt: "2026-06-21T12:05:30.000Z",
            durationMs: 12_300,
            sizeBytes: 1024,
            mimeType: "audio/webm",
            settings: {
              bpm: 120,
              timeSignature: "4/4"
            }
          },
          {
            id: "legacy-quick-recording-latest",
            type: "quick",
            sessionId: "legacy-quick-session",
            sheetId: null,
            createdAt: "2026-06-21T12:07:00.000Z",
            durationMs: 45_600,
            sizeBytes: 1024,
            mimeType: "audio/webm",
            settings: {
              bpm: 120,
              timeSignature: "4/4"
            }
          }
        ],
        errorMarkers: []
      })
    );

    await expect(globalRepository.getSession("legacy-quick-session")).resolves.toMatchObject({
      id: "legacy-quick-session",
      durationMs: 45_600,
      recordingCount: 2,
      latestRecordingId: "legacy-quick-recording-latest",
      updatedAt: "2026-06-21T12:07:00.000Z"
    });
  });

  it("builds history groups from listSessions without mutating repository rows", async () => {
    const listSessions = vi.fn(async () => [
      {
        id: "quick-session",
        sourceType: "quick" as const,
        sheetId: null,
        startedAt: "2026-06-21T12:00:00.000Z",
        endedAt: null,
        durationMs: 60_000,
        bpm: 120,
        timeSignature: "4/4" as const,
        recordingCount: 1,
        latestRecordingId: "quick-recording",
        updatedAt: "2026-06-21T12:01:00.000Z",
        segmentContext: null
      }
    ]);
    const repository: PracticeSessionRepository = {
      listSessions,
      getSession: vi.fn(async () => null),
      getRecentSession: vi.fn(async () => null),
      getRecentSheetSession: vi.fn(async () => null),
      saveSession: vi.fn(async () => undefined),
      deleteSession: vi.fn(async () => undefined),
      clear: vi.fn(async () => undefined)
    };
    const { gateway } = createSheetGateway();
    const service = createPracticeSessionService({
      repository,
      recordingRepository: createMemoryRecordingRepository(),
      sheetGateway: gateway,
      now: () => new Date(nowMs),
      createId: (prefix) => `${prefix}-history`
    });

    await expect(service.getSessionHistoryGroups("date")).resolves.toMatchObject([
      {
        id: "date:2026-06-21",
        sessionCount: 1,
        durationMs: 60_000
      }
    ]);
    expect(repository.listSessions).toHaveBeenCalledTimes(1);
    expect(repository.getSession).not.toHaveBeenCalled();
    expect(repository.getRecentSession).not.toHaveBeenCalled();
    expect(repository.getRecentSheetSession).not.toHaveBeenCalled();
    expect(repository.saveSession).not.toHaveBeenCalled();
    expect(repository.deleteSession).not.toHaveBeenCalled();
    expect(repository.clear).not.toHaveBeenCalled();
  });

  it("returns grouped session history with quick, valid, missing, no-segment, and segment target states", async () => {
    const segmentContext = createSegmentContext({
      segmentId: "segment-alpha",
      segmentName: "Historical Bridge"
    });
    const missingSegmentContext = createSegmentContext({
      segmentId: "segment-missing",
      segmentName: "Deleted Segment Snapshot"
    });
    const segmentGateway: PracticeSessionSegmentGateway = {
      async getSegmentContext(_sheetId, segmentId) {
        if (segmentId === "segment-alpha") {
          return {
            id: segmentId,
            name: "Live Renamed Bridge"
          };
        }

        return null;
      }
    };
    const { service, repository, validSheetIds } = createService({
      segmentGateway
    });

    validSheetIds.add("sheet-bravo");
    await repository.saveSession({
      id: "quick-session",
      sourceType: "quick",
      sheetId: null,
      startedAt: "2026-06-21T12:00:00.000Z",
      endedAt: null,
      durationMs: 60_000,
      bpm: 120,
      timeSignature: "4/4",
      recordingCount: 1,
      latestRecordingId: "quick-recording",
      updatedAt: "2026-06-21T12:01:00.000Z",
      segmentContext: null
    });
    await repository.saveSession({
      id: "sheet-no-segment",
      sourceType: "sheet",
      sheetId: "sheet-alpha",
      startedAt: "2026-06-21T12:02:00.000Z",
      endedAt: null,
      durationMs: 30_000,
      bpm: 96,
      timeSignature: "4/4",
      recordingCount: 0,
      latestRecordingId: null,
      updatedAt: "2026-06-21T12:03:00.000Z",
      segmentContext: null
    });
    await repository.saveSession({
      id: "sheet-segment",
      sourceType: "sheet",
      sheetId: "sheet-alpha",
      startedAt: "2026-06-21T12:04:00.000Z",
      endedAt: null,
      durationMs: 90_000,
      bpm: 96,
      timeSignature: "4/4",
      recordingCount: 2,
      latestRecordingId: "recording-alpha",
      updatedAt: "2026-06-21T12:05:00.000Z",
      segmentContext
    });
    await repository.saveSession({
      id: "missing-segment",
      sourceType: "sheet",
      sheetId: "sheet-bravo",
      startedAt: "2026-06-21T12:06:00.000Z",
      endedAt: null,
      durationMs: 45_000,
      bpm: 96,
      timeSignature: "4/4",
      recordingCount: 1,
      latestRecordingId: "recording-bravo",
      updatedAt: "2026-06-21T12:07:00.000Z",
      segmentContext: missingSegmentContext
    });
    await repository.saveSession({
      id: "deleted-sheet",
      sourceType: "sheet",
      sheetId: "sheet-deleted",
      startedAt: "2026-06-21T12:08:00.000Z",
      endedAt: null,
      durationMs: 15_000,
      bpm: 96,
      timeSignature: "4/4",
      recordingCount: 0,
      latestRecordingId: null,
      updatedAt: "2026-06-21T12:09:00.000Z",
      segmentContext: null
    });

    await expect(service.getSessionHistoryGroups("sheet")).resolves.toEqual([
      expect.objectContaining({
        id: "sheet:id:sheet-deleted",
        targetState: "missing-sheet"
      }),
      expect.objectContaining({
        id: "sheet:id:sheet-bravo",
        targetState: "valid"
      }),
      expect.objectContaining({
        id: "sheet:id:sheet-alpha",
        targetState: "valid",
        sessionCount: 2,
        recordingCount: 2,
        durationMs: 120_000
      }),
      expect.objectContaining({
        id: "sheet:quick",
        targetState: "quick"
      })
    ]);

    await expect(service.getSessionHistoryGroups("segment")).resolves.toEqual([
      expect.objectContaining({
        id: "segment:sheet:sheet-deleted:none",
        targetState: "no-segment"
      }),
      expect.objectContaining({
        id: "segment:sheet:sheet-bravo:id:segment-missing",
        targetState: "missing-segment",
        label: "Deleted Segment Snapshot"
      }),
      expect.objectContaining({
        id: "segment:sheet:sheet-alpha:id:segment-alpha",
        targetState: "valid",
        label: "Historical Bridge"
      }),
      expect.objectContaining({
        id: "segment:sheet:sheet-alpha:none",
        targetState: "no-segment"
      }),
      expect.objectContaining({
        id: "segment:quick",
        targetState: "quick"
      })
    ]);
  });

  it("contains history target lookup failures as lookup-failed groups", async () => {
    const failingSheetIds = new Set(["sheet-alpha"]);
    const { gateway: failingSheetGateway } = createSheetGateway(
      new Set(["sheet-alpha"]),
      {
        failingSheetIds
      }
    );
    const sheetFailure = createService({
      sheetGateway: failingSheetGateway
    });

    await sheetFailure.repository.saveSession({
      id: "sheet-session",
      sourceType: "sheet",
      sheetId: "sheet-alpha",
      startedAt: "2026-06-21T12:00:00.000Z",
      endedAt: null,
      durationMs: 60_000,
      bpm: 96,
      timeSignature: "4/4",
      recordingCount: 0,
      latestRecordingId: null,
      updatedAt: "2026-06-21T12:01:00.000Z",
      segmentContext: null
    });

    await expect(sheetFailure.service.getSessionHistoryGroups("sheet")).resolves.toEqual([
      expect.objectContaining({
        id: "sheet:id:sheet-alpha",
        targetState: "lookup-failed"
      })
    ]);

    const segmentFailure = createService({
      segmentGateway: {
        async getSegmentContext() {
          throw new Error("segment lookup failed");
        }
      }
    });
    await segmentFailure.repository.saveSession({
      id: "segment-session",
      sourceType: "sheet",
      sheetId: "sheet-alpha",
      startedAt: "2026-06-21T12:00:00.000Z",
      endedAt: null,
      durationMs: 60_000,
      bpm: 96,
      timeSignature: "4/4",
      recordingCount: 0,
      latestRecordingId: null,
      updatedAt: "2026-06-21T12:01:00.000Z",
      segmentContext: createSegmentContext()
    });

    await expect(segmentFailure.service.getSessionHistoryGroups("segment")).resolves.toEqual([
      expect.objectContaining({
        id: "segment:sheet:sheet-alpha:id:segment-alpha",
        targetState: "lookup-failed"
      })
    ]);
  });

  it("returns home recent activity from sessions and recordings without repository writes", async () => {
    const sessions = [
      createPracticeSessionFixture({
        id: "latest-missing-recording",
        latestRecordingId: "deleted-recording",
        durationMs: 15_000,
        updatedAt: "2026-06-21T12:03:00.000Z"
      })
    ];
    const recordings = [
      createSheetRecordingMetadataFixture({
        id: "recording-missing-session",
        sessionId: "missing-session",
        createdAt: "2026-06-21T12:04:00.000Z",
        durationMs: 22_000
      })
    ];
    const repository: PracticeSessionRepository = {
      listSessions: vi.fn(async () => sessions),
      getSession: vi.fn(async () => null),
      getRecentSession: vi.fn(async () => null),
      getRecentSheetSession: vi.fn(async () => null),
      saveSession: vi.fn(async () => undefined),
      deleteSession: vi.fn(async () => undefined),
      clear: vi.fn(async () => undefined)
    };
    const recordingRepository: PracticeRecordingMetadataRepository = {
      listRecordingMetadata: vi.fn(async () => recordings),
      listRecordingMetadataForSession: vi.fn(async () => []),
      saveRecordingMetadata: vi.fn(async () => undefined),
      clear: vi.fn(async () => undefined)
    };
    const updateLastPracticedAt = vi.fn(async () => undefined);
    const service = createPracticeSessionService({
      repository,
      recordingRepository,
      sheetGateway: {
        async getSheetContext(sheetId) {
          return {
            id: sheetId,
            name: "Alpha Sheet",
            bpm: 96,
            timeSignature: "4/4"
          };
        },
        updateLastPracticedAt
      },
      now: () => new Date(nowMs)
    });

    const result = await service.getHomeRecentActivity({ limit: 6 });

    expect(result).toMatchObject({
      generatedAt: "2026-06-21T12:00:00.000Z",
      limit: 6
    });
    expect(result.items.map((item) => [item.id, item.kind, item.targetState])).toEqual([
      ["recording:recording-missing-session", "sheet-recording", "valid"],
      ["session:latest-missing-recording", "sheet-session", "valid"]
    ]);
    expect(result.items[0]).toMatchObject({
      sessionId: "missing-session",
      durationMs: 22_000
    });
    expect(result.items[1]).toMatchObject({
      sessionId: "latest-missing-recording",
      durationMs: 15_000
    });
    expect(repository.listSessions).toHaveBeenCalledTimes(1);
    expect(recordingRepository.listRecordingMetadata).toHaveBeenCalledTimes(1);
    expect(repository.saveSession).not.toHaveBeenCalled();
    expect(repository.deleteSession).not.toHaveBeenCalled();
    expect(repository.clear).not.toHaveBeenCalled();
    expect(recordingRepository.saveRecordingMetadata).not.toHaveBeenCalled();
    expect(recordingRepository.clear).not.toHaveBeenCalled();
    expect(updateLastPracticedAt).not.toHaveBeenCalled();
  });

  it("maps home recent activity target states with no-target priority and contained lookup failures", async () => {
    const sessions = [
      createPracticeSessionFixture({
        id: "blank-sheet",
        sheetId: "",
        updatedAt: "2026-06-21T12:07:00.000Z"
      }),
      createPracticeSessionFixture({
        id: "blank-segment",
        updatedAt: "2026-06-21T12:06:00.000Z",
        segmentContext: createSegmentContext({ segmentId: "" })
      }),
      createPracticeSessionFixture({
        id: "failed-sheet",
        sheetId: "sheet-failed",
        updatedAt: "2026-06-21T12:05:00.000Z"
      }),
      createPracticeSessionFixture({
        id: "deleted-sheet",
        sheetId: "sheet-deleted",
        updatedAt: "2026-06-21T12:04:00.000Z"
      })
    ];
    const recordings = [
      createSheetRecordingMetadataFixture({
        id: "blank-recording-sheet",
        sheetId: "",
        createdAt: "2026-06-21T12:03:00.000Z"
      }),
      createSheetRecordingMetadataFixture({
        id: "failed-segment",
        createdAt: "2026-06-21T12:02:00.000Z",
        segmentContext: createSegmentContext({
          segmentId: "segment-failed",
          segmentName: "Failed Segment"
        })
      }),
      createSheetRecordingMetadataFixture({
        id: "missing-segment",
        createdAt: "2026-06-21T12:01:00.000Z",
        segmentContext: createSegmentContext({
          segmentId: "segment-missing",
          segmentName: "Deleted Segment"
        })
      })
    ];
    const repository: PracticeSessionRepository = {
      listSessions: vi.fn(async () => sessions),
      getSession: vi.fn(async () => null),
      getRecentSession: vi.fn(async () => null),
      getRecentSheetSession: vi.fn(async () => null),
      saveSession: vi.fn(async () => undefined),
      deleteSession: vi.fn(async () => undefined),
      clear: vi.fn(async () => undefined)
    };
    const recordingRepository: PracticeRecordingMetadataRepository = {
      listRecordingMetadata: vi.fn(async () => recordings),
      listRecordingMetadataForSession: vi.fn(async () => []),
      saveRecordingMetadata: vi.fn(async () => undefined),
      clear: vi.fn(async () => undefined)
    };
    const getSheetContext = vi.fn(async (sheetId: string) => {
      if (sheetId === "sheet-failed") {
        throw new Error("sheet lookup failed");
      }

      if (sheetId === "sheet-deleted") {
        return null;
      }

      return {
        id: sheetId,
        name: "Alpha Sheet",
        bpm: 96,
        timeSignature: "4/4" as const
      };
    });
    const getSegmentContext = vi.fn(async (_sheetId: string, segmentId: string) => {
      if (segmentId === "segment-failed") {
        throw new Error("segment lookup failed");
      }

      if (segmentId === "segment-missing") {
        return null;
      }

      return {
        id: segmentId,
        name: "Live Segment"
      };
    });
    const service = createPracticeSessionService({
      repository,
      recordingRepository,
      sheetGateway: {
        getSheetContext,
        async updateLastPracticedAt() {
          return undefined;
        }
      },
      segmentGateway: {
        getSegmentContext
      },
      now: () => new Date(nowMs)
    });
    const result = await service.getHomeRecentActivity({ limit: 10 });
    const statesById = Object.fromEntries(
      result.items.map((item) => [item.id, item.targetState])
    );

    expect(statesById).toMatchObject({
      "session:blank-sheet": "no-target",
      "session:blank-segment": "no-target",
      "session:failed-sheet": "lookup-failed",
      "session:deleted-sheet": "missing-sheet",
      "recording:blank-recording-sheet": "no-target",
      "recording:failed-segment": "lookup-failed",
      "recording:missing-segment": "missing-segment"
    });
    expect(getSheetContext).not.toHaveBeenCalledWith("");
    expect(getSegmentContext).not.toHaveBeenCalledWith("sheet-alpha", "");
    expect(repository.saveSession).not.toHaveBeenCalled();
    expect(recordingRepository.saveRecordingMetadata).not.toHaveBeenCalled();
  });

  it("reads bounded Continue Practice targets from valid sessions and recordings without writes", async () => {
    const sessions = [
      createPracticeSessionFixture({
        id: "quick-session",
        sourceType: "quick",
        sheetId: null,
        updatedAt: "2026-06-21T12:01:00.000Z",
        segmentContext: null
      }),
      createPracticeSessionFixture({
        id: "sheet-session",
        updatedAt: "2026-06-21T12:02:00.000Z"
      }),
      createPracticeSessionFixture({
        id: "segment-session",
        updatedAt: "2026-06-21T12:05:00.000Z",
        segmentContext: createSegmentContext()
      }),
      createPracticeSessionFixture({
        id: "missing-segment",
        updatedAt: "2026-06-21T12:06:00.000Z",
        segmentContext: createSegmentContext({
          segmentId: "segment-missing",
          segmentName: "Deleted Segment"
        })
      }),
      createPracticeSessionFixture({
        id: "failed-sheet",
        sheetId: "sheet-failed",
        updatedAt: "2026-06-21T12:07:00.000Z"
      })
    ];
    const recordings = [
      createSheetRecordingMetadataFixture({
        id: "sheet-recording",
        sessionId: "missing-linked-session",
        createdAt: "2026-06-21T12:04:00.000Z"
      }),
      createSheetRecordingMetadataFixture({
        id: "segment-recording",
        sessionId: "segment-session",
        createdAt: "2026-06-21T12:08:00.000Z",
        segmentContext: createSegmentContext()
      })
    ];
    const repository: PracticeSessionRepository = {
      listSessions: vi.fn(async () => sessions),
      getSession: vi.fn(async () => null),
      getRecentSession: vi.fn(async () => null),
      getRecentSheetSession: vi.fn(async () => null),
      saveSession: vi.fn(async () => undefined),
      deleteSession: vi.fn(async () => undefined),
      clear: vi.fn(async () => undefined)
    };
    const recordingRepository: PracticeRecordingMetadataRepository = {
      listRecordingMetadata: vi.fn(async () => recordings),
      listRecordingMetadataForSession: vi.fn(async () => []),
      saveRecordingMetadata: vi.fn(async () => undefined),
      clear: vi.fn(async () => undefined)
    };
    const updateLastPracticedAt = vi.fn(async () => undefined);
    const getSheetContext = vi.fn(async (sheetId: string) => {
      if (sheetId === "sheet-failed") {
        throw new Error("sheet lookup failed");
      }

      return {
        id: sheetId,
        name: "Alpha Sheet",
        bpm: 96,
        timeSignature: "4/4" as const
      };
    });
    const getSegmentContext = vi.fn(async (_sheetId: string, segmentId: string) => {
      if (segmentId === "segment-missing") {
        return null;
      }

      return {
        id: segmentId,
        name: "Live Bridge"
      };
    });
    const service = createPracticeSessionService({
      repository,
      recordingRepository,
      sheetGateway: {
        getSheetContext,
        updateLastPracticedAt
      },
      segmentGateway: {
        getSegmentContext
      },
      now: () => new Date(nowMs)
    });

    const result = await service.getContinuePracticeTargets({ limit: 3 });

    expect(result).toMatchObject({
      generatedAt: "2026-06-21T12:00:00.000Z",
      limit: 3
    });
    expect(result.targets.map((target) => [target.kind, target.targetKey, target.sessionId, target.recordingId])).toEqual([
      ["segment", "segment:sheet-alpha:segment-alpha", "segment-session", "segment-recording"],
      ["sheet", "sheet:sheet-alpha", "missing-linked-session", "sheet-recording"],
      ["quick", "quick", "quick-session", null]
    ]);
    expect(result.targets[0]).toMatchObject({
      kind: "segment",
      sourceType: "sheet",
      sheetId: "sheet-alpha",
      segmentId: "segment-alpha",
      segmentRangeLabel: "m5-12"
    });
    expect(result.targets[0]).not.toHaveProperty("href");
    expect(Object.fromEntries(result.rejected.map((target) => [target.id, target.reason]))).toMatchObject({
      "session:missing-segment": "missing-segment",
      "session:failed-sheet": "lookup-failed"
    });
    expect(repository.listSessions).toHaveBeenCalledTimes(1);
    expect(recordingRepository.listRecordingMetadata).toHaveBeenCalledTimes(1);
    expect(repository.saveSession).not.toHaveBeenCalled();
    expect(repository.deleteSession).not.toHaveBeenCalled();
    expect(repository.clear).not.toHaveBeenCalled();
    expect(recordingRepository.saveRecordingMetadata).not.toHaveBeenCalled();
    expect(recordingRepository.clear).not.toHaveBeenCalled();
    expect(updateLastPracticedAt).not.toHaveBeenCalled();
  });

  it("captures validated quick and sheet transport events through the event sink", async () => {
    const captured: Parameters<PracticeSessionEventSink["captureEvent"]>[0][] = [];
    const { service } = createService({
      eventSink: {
        captureEvent(event) {
          captured.push(event);
        }
      }
    });
    const quickSession = await service.ensureQuickSession({
      trigger: "metronome",
      bpm: 120,
      timeSignature: "4/4"
    });

    nowMs += 1_000;
    const quickEvent = await service.captureSessionEvent({
      sessionId: quickSession.id,
      kind: "metronome_started"
    });

    expect(quickEvent).toMatchObject({
      sessionId: quickSession.id,
      kind: "metronome_started",
      occurredAt: "2026-06-21T12:00:01.000Z",
      payload: {},
      schemaVersion: 1
    });
    expect(quickEvent?.id).toMatch(/^event-/);
    expect(quickEvent).not.toHaveProperty("sheetId");

    const sheetSession = await service.ensureSheetSession({
      sheetId: "sheet-alpha",
      trigger: "reference"
    });

    nowMs += 1_000;
    const referenceEvent = await service.captureSessionEvent({
      sessionId: sheetSession?.id,
      kind: "reference_started",
      referenceId: " reference-alpha "
    });

    expect(referenceEvent).toMatchObject({
      sessionId: sheetSession?.id,
      kind: "reference_started",
      sheetId: "sheet-alpha",
      referenceId: "reference-alpha",
      payload: {},
      schemaVersion: 1
    });
    expect(captured).toEqual([quickEvent, referenceEvent]);
  });

  it("rejects invalid capture contexts and normalizes optional ids before validation", async () => {
    const captured: Parameters<PracticeSessionEventSink["captureEvent"]>[0][] = [];
    const { service } = createService({
      eventSink: {
        captureEvent(event) {
          captured.push(event);
        }
      }
    });
    const quickSession = await service.ensureQuickSession({
      trigger: "recording",
      bpm: 96,
      timeSignature: "4/4"
    });
    const sheetSession = await service.ensureSheetSession({
      sheetId: "sheet-alpha",
      trigger: "recording"
    });

    await expect(
      service.captureSessionEvent({ sessionId: null, kind: "metronome_started" })
    ).resolves.toBeNull();
    await expect(
      service.captureSessionEvent({ sessionId: "   ", kind: "metronome_started" })
    ).resolves.toBeNull();
    await expect(
      service.captureSessionEvent({ sessionId: "session-missing", kind: "metronome_started" })
    ).resolves.toBeNull();
    await expect(
      service.captureSessionEvent({
        sessionId: quickSession.id,
        kind: "metronome_started",
        sheetId: "sheet-alpha"
      })
    ).resolves.toBeNull();
    await expect(
      service.captureSessionEvent({
        sessionId: quickSession.id,
        kind: "reference_started",
        referenceId: "reference-alpha"
      })
    ).resolves.toBeNull();
    await expect(
      service.captureSessionEvent({
        sessionId: sheetSession?.id,
        kind: "metronome_started",
        sheetId: "sheet-bravo"
      })
    ).resolves.toBeNull();
    await expect(
      service.captureSessionEvent({
        sessionId: sheetSession?.id,
        kind: "metronome_started",
        recordingId: "recording-alpha"
      })
    ).resolves.toBeNull();
    await expect(
      service.captureSessionEvent({
        sessionId: sheetSession?.id,
        kind: "recording_started",
        referenceId: "reference-alpha"
      })
    ).resolves.toBeNull();
    await expect(
      service.captureSessionEvent({
        sessionId: sheetSession?.id,
        kind: "recording_stopped",
        recordingId: "   "
      })
    ).resolves.toBeNull();
    await expect(
      service.captureSessionEvent({
        sessionId: sheetSession?.id,
        kind: "reference_stopped",
        referenceId: null
      })
    ).resolves.toBeNull();
    expect(captured).toEqual([]);

    await expect(
      service.captureSessionEvent({
        sessionId: sheetSession?.id,
        kind: "recording_stopped",
        sheetId: " sheet-alpha ",
        segmentId: " segment-alpha ",
        recordingId: " recording-alpha "
      })
    ).resolves.toMatchObject({
      sheetId: "sheet-alpha",
      segmentId: "segment-alpha",
      recordingId: "recording-alpha"
    });
    expect(captured).toHaveLength(1);
  });

  it("contains capture sink and lookup failures without mutating session summaries", async () => {
    const { service, repository } = createService({
      eventSink: {
        captureEvent() {
          throw new Error("event sink unavailable");
        }
      }
    });
    const session = await service.ensureQuickSession({
      trigger: "metronome",
      bpm: 96,
      timeSignature: "4/4"
    });
    const summaryBefore = await service.getTodaySummary();
    const sessionBefore = await repository.getSession(session.id);

    nowMs += 5_000;

    await expect(
      service.captureSessionEvent({
        sessionId: session.id,
        kind: "metronome_started"
      })
    ).resolves.toBeNull();
    await expect(service.getTodaySummary()).resolves.toEqual(summaryBefore);
    await expect(repository.getSession(session.id)).resolves.toEqual(sessionBefore);

    const failingRepository: PracticeSessionRepository = {
      ...createMemorySessionRepository(),
      getSession: vi.fn(async () => {
        throw new Error("lookup failed");
      })
    };
    const { gateway } = createSheetGateway();
    const lookupFailureService = createPracticeSessionService({
      repository: failingRepository,
      recordingRepository: createMemoryRecordingRepository(),
      sheetGateway: gateway,
      eventSink: {
        captureEvent() {
          throw new Error("should not be reached");
        }
      }
    });

    await expect(
      lookupFailureService.captureSessionEvent({
        sessionId: "session-alpha",
        kind: "metronome_started"
      })
    ).resolves.toBeNull();
  });

  it("does not let captureSessionEvent mutate persisted session segmentContext", async () => {
    const { service, repository } = createService();
    const originalContext = createSegmentContext();
    const session = await service.ensureSheetSession({
      sheetId: "sheet-alpha",
      trigger: "recording"
    });
    const prepared = await service.prepareSheetRecordingMetadata({
      sheetId: "sheet-alpha",
      sessionId: session?.id,
      durationMs: 500,
      segmentContext: originalContext
    });
    await service.commitPreparedSheetRecordingSession(prepared!);

    await expect(
      service.captureSessionEvent({
        sessionId: session?.id,
        kind: "recording_stopped",
        recordingId: "recording-alpha",
        segmentId: "segment-other"
      })
    ).resolves.toMatchObject({
      sessionId: session?.id,
      kind: "recording_stopped",
      segmentId: "segment-other"
    });
    await expect(repository.getSession(session?.id ?? "")).resolves.toMatchObject({
      segmentContext: originalContext,
      recordingCount: 1,
      latestRecordingId: prepared?.metadata.id
    });
  });

  it("keeps metronome, recording, and future reference trigger states independent", () => {
    const stopped = {
      metronomeActive: false,
      recordingActive: false,
      referenceActive: false
    };
    const recordingOnly = applyPracticeTrigger(stopped, "recording", true);
    const both = applyPracticeTrigger(recordingOnly, "metronome", true);
    const recordingStillActive = applyPracticeTrigger(both, "metronome", false);
    const referenceCanJoinLater = applyPracticeTrigger(recordingStillActive, "reference", true);

    expect(recordingOnly).toEqual({
      metronomeActive: false,
      recordingActive: true,
      referenceActive: false
    });
    expect(both).toEqual({
      metronomeActive: true,
      recordingActive: true,
      referenceActive: false
    });
    expect(recordingStillActive).toEqual({
      metronomeActive: false,
      recordingActive: true,
      referenceActive: false
    });
    expect(referenceCanJoinLater).toEqual({
      metronomeActive: false,
      recordingActive: true,
      referenceActive: true
    });
  });
});
