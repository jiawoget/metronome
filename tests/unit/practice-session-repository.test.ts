import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type {
  LocalPracticeGoal,
  PracticeSession,
  SheetRecordingMetadata,
  SheetRecordingSegmentContext
} from "@/domain/practice";
import {
  clearPracticeSessionDatabaseForTests,
  parsePersistedPracticeSessionRecord,
  practiceSessionRepository,
  resetPracticeSessionDatabaseConnectionForTests,
  seedPracticeSessionRecordForTests
} from "@/infrastructure/db/practice-session-repository";
import { recordingHistoryMetadataRepository } from "@/infrastructure/db/recording-history-metadata-repository";
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

function createSheetRecordingMetadata(
  overrides: Partial<SheetRecordingMetadata> = {}
): SheetRecordingMetadata {
  return {
    id: "recording-alpha",
    type: "sheet",
    sessionId: "sheet-alpha",
    sheetId: "sheet-alpha",
    sheetName: "Alpha Sheet Snapshot",
    createdAt: "2026-06-21T12:04:00.000Z",
    durationMs: 12_000,
    bpm: 96,
    timeSignature: "4/4",
    segmentContext: null,
    ...overrides
  };
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

function createRepositoryBackedRecentActivityService(nowIso: string) {
  return createPracticeSessionService({
    repository: practiceSessionRepository,
    recordingRepository: recordingHistoryMetadataRepository,
    sheetGateway,
    segmentGateway,
    now: () => new Date(nowIso),
    createId: (prefix) => `${prefix}-repository-test`
  });
}

function localIso(
  year: number,
  monthIndex: number,
  day: number,
  hour = 12,
  minute = 0
) {
  return new Date(year, monthIndex, day, hour, minute, 0).toISOString();
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
    window.localStorage.clear();
  });

  afterEach(() => {
    resetPracticeSessionDatabaseConnectionForTests();
    window.localStorage.clear();
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

  it("derives the same logical home recent activity after reopening persisted storage", async () => {
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
      latestRecordingId: "recording-segment",
      segmentContext: createSegmentContext()
    });
    const missingSegmentSession = createSheetSession({
      id: "missing-segment",
      updatedAt: "2026-06-21T12:07:00.000Z",
      durationMs: 45_000,
      recordingCount: 1,
      latestRecordingId: "recording-missing-segment",
      segmentContext: createSegmentContext({
        segmentId: "segment-missing",
        segmentName: "Deleted Segment Snapshot"
      })
    });
    const deletedSheetSession = createSheetSession({
      id: "deleted-sheet",
      sheetId: "sheet-deleted",
      updatedAt: "2026-06-21T12:08:00.000Z",
      durationMs: 15_000,
      recordingCount: 0
    });
    const missingSessionForRecording = createSheetSession({
      id: "missing-session",
      updatedAt: "2026-06-21T12:09:00.000Z"
    });

    await practiceSessionRepository.saveSession(quickSession);
    await practiceSessionRepository.saveSession(sheetNoSegmentSession);
    await practiceSessionRepository.saveSession(sheetSegmentSession);
    await practiceSessionRepository.saveSession(missingSegmentSession);
    await practiceSessionRepository.saveSession(deletedSheetSession);
    await recordingHistoryMetadataRepository.saveRecordingMetadata(
      createSheetRecordingMetadata({
        id: "recording-sheet",
        sessionId: sheetNoSegmentSession.id,
        createdAt: "2026-06-21T12:04:00.000Z",
        durationMs: 12_000
      }),
      sheetNoSegmentSession
    );
    await recordingHistoryMetadataRepository.saveRecordingMetadata(
      createSheetRecordingMetadata({
        id: "recording-segment",
        sessionId: sheetSegmentSession.id,
        createdAt: "2026-06-21T12:06:00.000Z",
        durationMs: 20_000,
        segmentContext: createSegmentContext()
      }),
      sheetSegmentSession
    );
    await recordingHistoryMetadataRepository.saveRecordingMetadata(
      createSheetRecordingMetadata({
        id: "recording-missing-session",
        sessionId: missingSessionForRecording.id,
        createdAt: "2026-06-21T12:09:00.000Z",
        durationMs: 9_000
      }),
      missingSessionForRecording
    );

    const beforeReload = await createRepositoryBackedRecentActivityService(
      "2026-06-21T12:30:00.000Z"
    ).getHomeRecentActivity({ limit: 10 });

    resetPracticeSessionDatabaseConnectionForTests();

    const afterReload = await createRepositoryBackedRecentActivityService(
      "2026-06-21T12:31:00.000Z"
    ).getHomeRecentActivity({ limit: 10 });
    const logicalItems = (items: typeof beforeReload.items) =>
      items.map((item) => ({
        id: item.id,
        kind: item.kind,
        targetState: item.targetState,
        label: item.label,
        durationMs: item.durationMs,
        sessionId: item.sessionId,
        recordingId: item.recordingId,
        sheetId: item.sheetId,
        segmentId: item.segmentId
      }));

    expect(logicalItems(afterReload.items)).toEqual(logicalItems(beforeReload.items));
    expect(afterReload.generatedAt).not.toBe(beforeReload.generatedAt);
    expect(Object.fromEntries(afterReload.items.map((item) => [item.id, item.targetState]))).toMatchObject({
      "session:quick-session": "quick",
      "session:sheet-no-segment": "valid",
      "recording:recording-sheet": "valid",
      "session:sheet-segment": "valid",
      "recording:recording-segment": "valid",
      "session:missing-segment": "missing-segment",
      "session:deleted-sheet": "missing-sheet",
      "recording:recording-missing-session": "valid"
    });
  });

  it("derives the same logical Continue Practice targets after reopening persisted storage", async () => {
    const quickSession = createQuickSession({
      id: "quick-session",
      updatedAt: "2026-06-21T12:01:00.000Z"
    });
    const sheetSession = createSheetSession({
      id: "sheet-session",
      updatedAt: "2026-06-21T12:02:00.000Z"
    });
    const segmentSession = createSheetSession({
      id: "segment-session",
      updatedAt: "2026-06-21T12:03:00.000Z",
      segmentContext: createSegmentContext()
    });
    const missingSegmentSession = createSheetSession({
      id: "missing-segment",
      updatedAt: "2026-06-21T12:06:00.000Z",
      segmentContext: createSegmentContext({
        segmentId: "segment-missing",
        segmentName: "Deleted Segment Snapshot"
      })
    });
    const deletedSheetSession = createSheetSession({
      id: "deleted-sheet",
      sheetId: "sheet-deleted",
      updatedAt: "2026-06-21T12:07:00.000Z"
    });

    await practiceSessionRepository.saveSession(quickSession);
    await practiceSessionRepository.saveSession(sheetSession);
    await practiceSessionRepository.saveSession(segmentSession);
    await practiceSessionRepository.saveSession(missingSegmentSession);
    await practiceSessionRepository.saveSession(deletedSheetSession);
    await recordingHistoryMetadataRepository.saveRecordingMetadata(
      createSheetRecordingMetadata({
        id: "sheet-recording",
        sessionId: sheetSession.id,
        createdAt: "2026-06-21T12:04:00.000Z"
      }),
      sheetSession
    );
    await recordingHistoryMetadataRepository.saveRecordingMetadata(
      createSheetRecordingMetadata({
        id: "segment-recording",
        sessionId: segmentSession.id,
        createdAt: "2026-06-21T12:05:00.000Z",
        segmentContext: createSegmentContext()
      }),
      segmentSession
    );

    const beforeReload = await createRepositoryBackedRecentActivityService(
      "2026-06-21T12:30:00.000Z"
    ).getContinuePracticeTargets({ limit: 10 });

    resetPracticeSessionDatabaseConnectionForTests();

    const afterReload = await createRepositoryBackedRecentActivityService(
      "2026-06-21T12:31:00.000Z"
    ).getContinuePracticeTargets({ limit: 10 });
    const logicalTargets = (targets: typeof beforeReload.targets) =>
      targets.map((target) => ({
        kind: target.kind,
        targetKey: target.targetKey,
        sessionId: target.sessionId,
        recordingId: target.recordingId,
        sheetId: target.sourceType === "sheet" ? target.sheetId : null,
        segmentId: target.kind === "segment" ? target.segmentId : null,
        label: target.label
      }));
    const logicalRejected = (targets: typeof beforeReload.rejected) =>
      targets.map((target) => ({
        id: target.id,
        reason: target.reason,
        sheetId: target.sheetId,
        segmentId: target.segmentId
      }));

    expect(logicalTargets(afterReload.targets)).toEqual(logicalTargets(beforeReload.targets));
    expect(logicalRejected(afterReload.rejected)).toEqual(logicalRejected(beforeReload.rejected));
    expect(afterReload.generatedAt).not.toBe(beforeReload.generatedAt);
    expect(afterReload.targets.map((target) => [target.kind, target.targetKey])).toEqual([
      ["segment", "segment:sheet-alpha:segment-alpha"],
      ["sheet", "sheet:sheet-alpha"],
      ["quick", "quick"]
    ]);
    expect(Object.fromEntries(afterReload.rejected.map((target) => [target.id, target.reason]))).toMatchObject({
      "session:missing-segment": "missing-segment",
      "session:deleted-sheet": "missing-sheet"
    });
  });

  it("derives the same goal completion evaluations after reopening persisted storage", async () => {
    const quickSession = createQuickSession({
      id: "quick-session",
      durationMs: 60_000,
      recordingCount: 10,
      updatedAt: "2026-06-21T12:01:00.000Z"
    });
    const sheetSession = createSheetSession({
      id: "sheet-session",
      durationMs: 90_000,
      recordingCount: 0,
      updatedAt: "2026-06-21T12:02:00.000Z"
    });
    const goals: LocalPracticeGoal[] = [
      {
        id: "minutes-goal",
        kind: "minutes",
        target: 2,
        period: "all-time",
        createdAt: "2026-06-21T08:00:00.000Z"
      },
      {
        id: "sessions-goal",
        kind: "sessions",
        target: 2,
        period: "all-time",
        createdAt: "2026-06-21T08:00:00.000Z"
      },
      {
        id: "takes-goal",
        kind: "takes",
        target: 1,
        period: "all-time",
        createdAt: "2026-06-21T08:00:00.000Z"
      }
    ];

    await practiceSessionRepository.saveSession(quickSession);
    await practiceSessionRepository.saveSession(sheetSession);
    await recordingHistoryMetadataRepository.saveRecordingMetadata(
      createSheetRecordingMetadata({
        id: "sheet-recording",
        sessionId: sheetSession.id,
        createdAt: "2026-06-21T12:04:00.000Z"
      }),
      sheetSession
    );

    const beforeReload = await createRepositoryBackedRecentActivityService(
      "2026-06-21T12:30:00.000Z"
    ).evaluateGoalCompletion(goals);

    resetPracticeSessionDatabaseConnectionForTests();

    const afterReload = await createRepositoryBackedRecentActivityService(
      "2026-06-21T12:30:00.000Z"
    ).evaluateGoalCompletion(goals);

    expect(afterReload).toEqual(beforeReload);
    expect(afterReload).toEqual([
      expect.objectContaining({
        goalId: "minutes-goal",
        status: "completed",
        progress: 2
      }),
      expect.objectContaining({
        goalId: "sessions-goal",
        status: "completed",
        progress: 2
      }),
      expect.objectContaining({
        goalId: "takes-goal",
        status: "completed",
        progress: 1
      })
    ]);
  });

  it("derives the same Home dashboard analytics after reopening persisted storage", async () => {
    const quickSession = createQuickSession({
      id: "quick-session",
      durationMs: 60_000,
      recordingCount: 2,
      updatedAt: "2026-06-21T12:01:00.000Z"
    });
    const sheetSession = createSheetSession({
      id: "sheet-session",
      durationMs: 90_000,
      recordingCount: 10,
      updatedAt: "2026-06-21T12:02:00.000Z"
    });
    const segmentSession = createSheetSession({
      id: "segment-session",
      sheetId: "sheet-beta",
      durationMs: 120_000,
      recordingCount: 0,
      updatedAt: "2026-06-20T12:03:00.000Z",
      startedAt: "2026-06-20T12:00:00.000Z",
      segmentContext: createSegmentContext({
        segmentId: "segment-beta"
      })
    });
    const metadataOnlySession = createSheetSession({
      id: "metadata-only-session",
      sheetId: "sheet-gamma",
      updatedAt: "2026-06-21T12:04:00.000Z"
    });

    await practiceSessionRepository.saveSession(quickSession);
    await practiceSessionRepository.saveSession(sheetSession);
    await practiceSessionRepository.saveSession(segmentSession);
    await recordingHistoryMetadataRepository.saveRecordingMetadata(
      createSheetRecordingMetadata({
        id: "sheet-recording",
        sessionId: sheetSession.id,
        createdAt: "2026-06-21T12:04:00.000Z"
      }),
      sheetSession
    );
    await recordingHistoryMetadataRepository.saveRecordingMetadata(
      createSheetRecordingMetadata({
        id: "metadata-only-recording",
        sessionId: metadataOnlySession.id,
        sheetId: metadataOnlySession.sheetId ?? "",
        createdAt: "2026-06-21T12:05:00.000Z",
        durationMs: 15_000
      }),
      metadataOnlySession
    );

    const beforeReload = await createRepositoryBackedRecentActivityService(
      "2026-06-21T12:30:00.000Z"
    ).getHomeDashboardAnalyticsSource();

    resetPracticeSessionDatabaseConnectionForTests();

    const afterReload = await createRepositoryBackedRecentActivityService(
      "2026-06-21T12:31:00.000Z"
    ).getHomeDashboardAnalyticsSource();

    expect({
      ...afterReload,
      generatedAt: beforeReload.generatedAt
    }).toEqual(beforeReload);
    expect(afterReload.generatedAt).not.toBe(beforeReload.generatedAt);
    expect(afterReload).toMatchObject({
      summary: {
        durationMs: 150_000,
        minutesToday: 3,
        sessionsToday: 2,
        recordingsToday: 12
      },
      totals: {
        durationMs: 270_000,
        sessions: 3,
        sheetTakes: 2,
        practicedSheets: 3,
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
  });

  it("derives the same library recent practice summaries after reopening persisted storage", async () => {
    const sheetSession = createSheetSession({
      id: "sheet-session",
      durationMs: 90_000,
      recordingCount: 1,
      latestRecordingId: "sheet-session-recording",
      updatedAt: "2026-06-21T12:02:00.000Z",
      segmentContext: createSegmentContext()
    });
    const deletedSheetSession = createSheetSession({
      id: "deleted-sheet-session",
      sheetId: "sheet-deleted",
      durationMs: 30_000,
      updatedAt: "2026-06-21T12:03:00.000Z"
    });
    const metadataOnlySession = createSheetSession({
      id: "metadata-only-session",
      sheetId: "sheet-gamma",
      updatedAt: "2026-06-21T12:05:00.000Z"
    });

    await practiceSessionRepository.saveSession(sheetSession);
    await practiceSessionRepository.saveSession(deletedSheetSession);
    await recordingHistoryMetadataRepository.saveRecordingMetadata(
      createSheetRecordingMetadata({
        id: "sheet-recording",
        sessionId: sheetSession.id,
        createdAt: "2026-06-21T12:04:00.000Z",
        segmentContext: createSegmentContext()
      }),
      sheetSession
    );
    await recordingHistoryMetadataRepository.saveRecordingMetadata(
      createSheetRecordingMetadata({
        id: "metadata-only-recording",
        sessionId: metadataOnlySession.id,
        sheetId: metadataOnlySession.sheetId ?? "",
        createdAt: "2026-06-21T12:05:00.000Z"
      }),
      metadataOnlySession
    );

    const beforeReload = await createRepositoryBackedRecentActivityService(
      "2026-06-21T12:30:00.000Z"
    ).getLibraryRecentPracticeSummaryBySheet({ limit: 10 });

    resetPracticeSessionDatabaseConnectionForTests();

    const afterReload = await createRepositoryBackedRecentActivityService(
      "2026-06-21T12:31:00.000Z"
    ).getLibraryRecentPracticeSummaryBySheet({ limit: 10 });

    expect({
      ...afterReload,
      generatedAt: beforeReload.generatedAt
    }).toEqual(beforeReload);
    expect(afterReload.generatedAt).not.toBe(beforeReload.generatedAt);
    expect(afterReload.items).toEqual([
      {
        sheetId: "sheet-gamma",
        lastPracticedAt: "2026-06-21T12:05:00.000Z",
        lastSessionId: null,
        latestRecordingId: "metadata-only-recording",
        sessionCount: 0,
        recordingCount: 1,
        durationMs: 0,
        segmentPracticeCount: 0
      },
      {
        sheetId: "sheet-alpha",
        lastPracticedAt: "2026-06-21T12:04:00.000Z",
        lastSessionId: "sheet-session",
        latestRecordingId: "sheet-recording",
        sessionCount: 1,
        recordingCount: 1,
        durationMs: 90_000,
        segmentPracticeCount: 2
      },
      {
        sheetId: "sheet-deleted",
        lastPracticedAt: "2026-06-21T12:03:00.000Z",
        lastSessionId: "deleted-sheet-session",
        latestRecordingId: null,
        sessionCount: 1,
        recordingCount: 0,
        durationMs: 30_000,
        segmentPracticeCount: 0
      }
    ]);
  });

  it("derives the same Home practice streaks after reopening persisted storage and clearing history", async () => {
    const todaySession = createQuickSession({
      id: "today-session",
      startedAt: localIso(2026, 5, 23, 9),
      updatedAt: localIso(2026, 5, 23, 9, 1)
    });
    const duplicateTodaySession = createSheetSession({
      id: "duplicate-today-session",
      startedAt: localIso(2026, 5, 23, 18),
      updatedAt: localIso(2026, 5, 23, 18, 1),
      durationMs: 0,
      recordingCount: 0
    });
    const yesterdaySession = createSheetSession({
      id: "yesterday-session",
      startedAt: localIso(2026, 5, 22, 12),
      updatedAt: localIso(2026, 5, 22, 12, 1)
    });
    const olderSession = createSheetSession({
      id: "older-session",
      startedAt: localIso(2026, 5, 18, 12),
      updatedAt: localIso(2026, 5, 18, 12, 1)
    });

    await practiceSessionRepository.saveSession(todaySession);
    await practiceSessionRepository.saveSession(duplicateTodaySession);
    await practiceSessionRepository.saveSession(yesterdaySession);
    await practiceSessionRepository.saveSession(olderSession);

    const beforeReload = await createRepositoryBackedRecentActivityService(
      localIso(2026, 5, 23, 20)
    ).getHomePracticeStreaks();

    resetPracticeSessionDatabaseConnectionForTests();

    const afterReload = await createRepositoryBackedRecentActivityService(
      localIso(2026, 5, 23, 20)
    ).getHomePracticeStreaks();

    expect(afterReload).toEqual(beforeReload);
    expect(afterReload).toMatchObject({
      currentStreakDays: 2,
      longestStreakDays: 2,
      practicedToday: true,
      lastPracticedLocalDay: "2026-06-23",
      emptyState: {
        hasPracticeHistory: true
      }
    });

    await createRepositoryBackedRecentActivityService(
      localIso(2026, 5, 23, 20)
    ).clear();
    resetPracticeSessionDatabaseConnectionForTests();

    await expect(
      createRepositoryBackedRecentActivityService(
        localIso(2026, 5, 23, 20)
      ).getHomePracticeStreaks()
    ).resolves.toMatchObject({
      currentStreakDays: 0,
      longestStreakDays: 0,
      practicedToday: false,
      lastPracticedLocalDay: null,
      emptyState: {
        hasPracticeHistory: false
      }
    });
  });

  it("derives incomplete goal evaluations after persisted activity is cleared and reopened", async () => {
    const quickSession = createQuickSession({
      id: "quick-session",
      durationMs: 60_000,
      recordingCount: 1,
      updatedAt: "2026-06-21T12:01:00.000Z"
    });
    const sheetSession = createSheetSession({
      id: "sheet-session",
      durationMs: 60_000,
      recordingCount: 0,
      updatedAt: "2026-06-21T12:02:00.000Z"
    });
    const goals: LocalPracticeGoal[] = [
      {
        id: "minutes-goal",
        kind: "minutes",
        target: 1,
        period: "all-time",
        status: "completed",
        completedAt: "2026-06-21T12:10:00.000Z",
        createdAt: "2026-06-21T08:00:00.000Z"
      },
      {
        id: "sessions-goal",
        kind: "sessions",
        target: 2,
        period: "all-time",
        status: "completed",
        completedAt: "2026-06-21T12:10:00.000Z",
        createdAt: "2026-06-21T08:00:00.000Z"
      },
      {
        id: "takes-goal",
        kind: "takes",
        target: 1,
        period: "all-time",
        status: "completed",
        completedAt: "2026-06-21T12:10:00.000Z",
        createdAt: "2026-06-21T08:00:00.000Z"
      }
    ];

    await practiceSessionRepository.saveSession(quickSession);
    await practiceSessionRepository.saveSession(sheetSession);
    await recordingHistoryMetadataRepository.saveRecordingMetadata(
      createSheetRecordingMetadata({
        id: "sheet-recording",
        sessionId: sheetSession.id,
        createdAt: "2026-06-21T12:04:00.000Z"
      }),
      sheetSession
    );

    const service = createRepositoryBackedRecentActivityService(
      "2026-06-21T12:30:00.000Z"
    );

    await expect(service.evaluateGoalCompletion(goals)).resolves.toEqual([
      expect.objectContaining({
        goalId: "minutes-goal",
        status: "completed",
        progress: 2,
        completedAt: "2026-06-21T12:10:00.000Z"
      }),
      expect.objectContaining({
        goalId: "sessions-goal",
        status: "completed",
        progress: 2,
        completedAt: "2026-06-21T12:10:00.000Z"
      }),
      expect.objectContaining({
        goalId: "takes-goal",
        status: "completed",
        progress: 1,
        completedAt: "2026-06-21T12:10:00.000Z"
      })
    ]);

    await service.clear();
    resetPracticeSessionDatabaseConnectionForTests();

    await expect(
      createRepositoryBackedRecentActivityService(
        "2026-06-21T12:30:00.000Z"
      ).evaluateGoalCompletion(goals)
    ).resolves.toEqual([
      expect.objectContaining({
        goalId: "minutes-goal",
        status: "not-started",
        progress: 0,
        completedAt: null
      }),
      expect.objectContaining({
        goalId: "sessions-goal",
        status: "not-started",
        progress: 0,
        completedAt: null
      }),
      expect.objectContaining({
        goalId: "takes-goal",
        status: "not-started",
        progress: 0,
        completedAt: null
      })
    ]);
  });
});
