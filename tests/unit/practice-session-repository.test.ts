import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type {
  PracticeSession,
  SheetRecordingSegmentContext
} from "@/domain/practice";
import {
  clearPracticeSessionDatabaseForTests,
  parsePersistedPracticeSessionRecord,
  practiceSessionRepository,
  resetPracticeSessionDatabaseConnectionForTests,
  seedPracticeSessionRecordForTests
} from "@/infrastructure/db/practice-session-repository";
import {
  createPracticeSessionService,
  type PracticeRecordingMetadataRepository,
  type PracticeSessionSegmentGateway,
  type PracticeSessionSheetGateway
} from "@/services/practice-session";

function createSegmentContext(
  overrides: Partial<SheetRecordingSegmentContext> = {}
): SheetRecordingSegmentContext {
  return {
    segmentId: "segment-alpha",
    segmentName: "Bridge",
    range: {
      startMeasure: 5,
      endMeasure: 12
    },
    targetBpm: 96,
    measureGridVersion:
      "bpm:96|timeSignature:4/4|pickupBeats:0|measureOneOffsetMs:1000",
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

function createSheetSession(
  overrides: Partial<PracticeSession> = {}
): PracticeSession {
  const session: PracticeSession = {
    id: "session-alpha",
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
    ...overrides,
    segmentContext: overrides.segmentContext ?? null
  };

  return session;
}

function createQuickSession(
  overrides: Partial<PracticeSession> = {}
): PracticeSession {
  const session: PracticeSession = {
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
    segmentContext: null,
    ...overrides
  };

  return session;
}

const emptyRecordingRepository: PracticeRecordingMetadataRepository = {
  async listRecordingMetadata() {
    return [];
  },
  async listRecordingMetadataForSession() {
    return [];
  },
  async saveRecordingMetadata() {
    return undefined;
  },
  async clear() {
    return undefined;
  }
};

const sheetGateway: PracticeSessionSheetGateway = {
  async getSheetContext(sheetId) {
    if (sheetId !== "sheet-alpha") {
      return null;
    }

    return {
      id: sheetId,
      name: "Alpha Sheet",
      bpm: 96,
      timeSignature: "4/4"
    };
  },
  async updateLastPracticedAt() {
    return undefined;
  }
};

const segmentGateway: PracticeSessionSegmentGateway = {
  async getSegmentContext(sheetId, segmentId) {
    if (sheetId === "sheet-alpha" && segmentId === "segment-alpha") {
      return {
        id: segmentId,
        name: "Live Bridge"
      };
    }

    return null;
  }
};

function createRepositoryBackedHistoryService() {
  return createPracticeSessionService({
    repository: practiceSessionRepository,
    recordingRepository: emptyRecordingRepository,
    sheetGateway,
    segmentGateway,
    now: () => new Date("2026-06-21T12:30:00.000Z"),
    createId: (prefix) => `${prefix}-repository-test`
  });
}

describe("practice session persisted row parsing", () => {
  it("normalizes missing segmentContext to null and rejects malformed non-null context", () => {
    expect(
      parsePersistedPracticeSessionRecord({
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

    expect(
      parsePersistedPracticeSessionRecord({
        ...createSheetSession({
          id: "sheet-bad-segment"
        }),
        segmentContext: {
          ...createSegmentContext(),
          segmentId: ""
        }
      })
    ).toBeNull();
  });
});

describe("practice session browser repository", () => {
  beforeEach(async () => {
    await clearPracticeSessionDatabaseForTests();
  });

  afterEach(() => {
    resetPracticeSessionDatabaseConnectionForTests();
  });

  it("persists a valid sheet session segmentContext across a Dexie reset and reload", async () => {
    const session = createSheetSession({
      segmentContext: createSegmentContext()
    });

    await practiceSessionRepository.saveSession(session);
    await expect(practiceSessionRepository.getSession(session.id)).resolves.toEqual(
      session
    );

    resetPracticeSessionDatabaseConnectionForTests();

    await expect(practiceSessionRepository.getSession(session.id)).resolves.toEqual(
      session
    );
  });

  it("reads a legacy row without segmentContext back as null after reopening Dexie", async () => {
    await seedPracticeSessionRecordForTests("legacy-sheet", {
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
    });

    resetPracticeSessionDatabaseConnectionForTests();

    await expect(practiceSessionRepository.getSession("legacy-sheet")).resolves.toMatchObject(
      {
        id: "legacy-sheet",
        sourceType: "sheet",
        segmentContext: null
      }
    );
  });

  it("filters malformed non-null segmentContext rows out of getSession and listSessions", async () => {
    const validSession = createSheetSession();

    await practiceSessionRepository.saveSession(validSession);
    await seedPracticeSessionRecordForTests("sheet-bad-segment", {
      ...createSheetSession({
        id: "sheet-bad-segment"
      }),
      segmentContext: {
        ...createSegmentContext(),
        segmentId: ""
      }
    });

    resetPracticeSessionDatabaseConnectionForTests();

    await expect(
      practiceSessionRepository.getSession("sheet-bad-segment")
    ).resolves.toBeNull();
    await expect(practiceSessionRepository.listSessions()).resolves.toEqual([
      validSession
    ]);
  });

  it("groups quick, sheet no-segment, and sheet segment sessions after reopening Dexie", async () => {
    const quickSession = createQuickSession({
      id: "quick-session",
      updatedAt: "2026-06-21T12:01:00.000Z"
    });
    const sheetNoSegmentSession = createSheetSession({
      id: "sheet-no-segment",
      updatedAt: "2026-06-21T12:03:00.000Z",
      durationMs: 30_000,
      recordingCount: 0
    });
    const sheetSegmentSession = createSheetSession({
      id: "sheet-segment",
      updatedAt: "2026-06-21T12:05:00.000Z",
      durationMs: 90_000,
      recordingCount: 2,
      latestRecordingId: "recording-alpha",
      segmentContext: createSegmentContext()
    });

    await practiceSessionRepository.saveSession(quickSession);
    await practiceSessionRepository.saveSession(sheetNoSegmentSession);
    await practiceSessionRepository.saveSession(sheetSegmentSession);
    await seedPracticeSessionRecordForTests("legacy-sheet-no-segment", {
      sourceType: "sheet",
      sheetId: "sheet-alpha",
      startedAt: "2026-06-21T12:06:00.000Z",
      endedAt: null,
      durationMs: 15_000,
      bpm: 96,
      timeSignature: "4/4",
      recordingCount: 0,
      latestRecordingId: null,
      updatedAt: "2026-06-21T12:07:00.000Z"
    });
    await seedPracticeSessionRecordForTests("malformed-segment-context", {
      ...createSheetSession({
        id: "malformed-segment-context",
        updatedAt: "2026-06-21T12:09:00.000Z"
      }),
      segmentContext: {
        ...createSegmentContext(),
        segmentId: ""
      }
    });

    resetPracticeSessionDatabaseConnectionForTests();

    const service = createRepositoryBackedHistoryService();

    await expect(service.getSessionHistoryGroups("date")).resolves.toEqual([
      expect.objectContaining({
        id: "date:2026-06-21",
        sessionCount: 4,
        durationMs: 195_000,
        recordingCount: 3
      })
    ]);

    await expect(service.getSessionHistoryGroups("sheet")).resolves.toEqual([
      expect.objectContaining({
        id: "sheet:id:sheet-alpha",
        targetState: "valid",
        sessionCount: 3,
        durationMs: 135_000,
        recordingCount: 2
      }),
      expect.objectContaining({
        id: "sheet:quick",
        targetState: "quick",
        sessionCount: 1
      })
    ]);

    await expect(service.getSessionHistoryGroups("segment")).resolves.toEqual([
      expect.objectContaining({
        id: "segment:sheet:sheet-alpha:none",
        targetState: "no-segment",
        sessionCount: 2
      }),
      expect.objectContaining({
        id: "segment:sheet:sheet-alpha:id:segment-alpha",
        targetState: "valid",
        sessionCount: 1
      }),
      expect.objectContaining({
        id: "segment:quick",
        targetState: "quick",
        sessionCount: 1
      })
    ]);

    const groupedSessionIds = (await service.getSessionHistoryGroups("segment"))
      .flatMap((group) => group.sessions)
      .map((session) => session.id);

    expect(groupedSessionIds).not.toContain("malformed-segment-context");
    expect(groupedSessionIds).toContain("legacy-sheet-no-segment");
  });
});
