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
});
