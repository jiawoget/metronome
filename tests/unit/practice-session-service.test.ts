import { beforeEach, describe, expect, it } from "vitest";

import {
  applyPracticeTrigger,
  validatePracticeSession,
  validateSheetRecordingMetadata,
  type PracticeSession,
  type SheetRecordingMetadata
} from "@/domain/practice";
import { createGlobalPracticeSessionRepository } from "@/infrastructure/db/global-practice-session-repository";
import { RECORDINGS_STORAGE_KEY } from "@/lib/recordings-review/repository";
import {
  createPracticeSessionService,
  type PracticeRecordingMetadataRepository,
  type PracticeSessionRepository,
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

function createSheetGateway(validSheetIds = new Set(["sheet-alpha"])) {
  const lastPracticed = new Map<string, string>();
  const gateway: PracticeSessionSheetGateway = {
    async getSheetContext(sheetId) {
      if (!validSheetIds.has(sheetId)) {
        return null;
      }

      return {
        id: sheetId,
        name: "Alpha Sheet",
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

describe("practice session service", () => {
  let nowMs: number;

  beforeEach(() => {
    nowMs = Date.parse("2026-06-21T12:00:00.000Z");
    window.localStorage.clear();
  });

  function createService() {
    const repository = createMemorySessionRepository();
    const recordingRepository = createMemoryRecordingRepository();
    const validSheetIds = new Set(["sheet-alpha"]);
    const { gateway, lastPracticed } = createSheetGateway(validSheetIds);
    let idNumber = 0;
    const service = createPracticeSessionService({
      repository,
      recordingRepository,
      sheetGateway: gateway,
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
      latestRecordingId: null
    });
    expect(await service.listRecordingMetadata()).toEqual([]);
    expect(lastPracticed.get("sheet-alpha")).toBe("2026-06-21T12:00:00.000Z");
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
      latestRecordingId: null
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
      updatedAt: new Date(2026, 5, 21, 0, 33, 0).toISOString()
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
      updatedAt: new Date(2026, 5, 21, 23, 34, 0).toISOString()
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
      updatedAt: new Date(2026, 5, 21, 0, 1, 0).toISOString()
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
      timeSignature: "4/4"
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
      timeSignature: "3/4"
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

  it("does not return Continue Practice for a stale sheet session after the sheet is deleted", async () => {
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

    await expect(service.getContinuePracticeTarget()).resolves.toBeNull();
    await expect(repository.listSessions()).resolves.toHaveLength(2);
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
        updatedAt: "2026-06-21T12:00:00.000Z"
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
        updatedAt: "2026-06-21T12:00:00.000Z"
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
        updatedAt: "2026-02-30T12:00:00.000Z"
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
        updatedAt: "2026-06-21T12:00:00.000Z"
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
        updatedAt: "2026-06-21T12:00:00.000Z"
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
        timeSignature: "4/4"
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
      updatedAt: "2026-06-21T12:01:00.000Z"
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
      updatedAt: "2026-06-21T12:10:00.000Z"
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
