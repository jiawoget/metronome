import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  LocalPracticeGoal,
  PracticeSession,
  SheetRecordingMetadata
} from "@/domain/practice";
import {
  parseLocalPracticeGoal,
  parsePracticeGoalDraft,
  validateLocalPracticeGoal
} from "@/domain/practice/validation";
import {
  clearPracticeGoalDatabaseForTests,
  parsePersistedPracticeGoalRecord,
  practiceGoalRepository,
  resetPracticeGoalDatabaseConnectionForTests,
  seedPracticeGoalRecordForTests
} from "@/infrastructure/db/practice-goal-repository";
import {
  clearPracticeSessionDatabaseForTests,
  practiceSessionRepository,
  resetPracticeSessionDatabaseConnectionForTests
} from "@/infrastructure/db/practice-session-repository";
import { recordingHistoryMetadataRepository } from "@/infrastructure/db/recording-history-metadata-repository";
import { createPracticeGoalService } from "@/services/practice-goals";

function createGoal(overrides: Partial<LocalPracticeGoal> = {}): LocalPracticeGoal {
  return {
    id: "goal-alpha",
    kind: "minutes",
    target: 1,
    period: "today",
    createdAt: "2026-06-21T08:00:00.000Z",
    ...overrides
  };
}

function createSession(overrides: Partial<PracticeSession> = {}): PracticeSession {
  return {
    id: "session-alpha",
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
    segmentContext: null,
    ...overrides
  };
}

function createRecording(
  overrides: Partial<SheetRecordingMetadata> = {}
): SheetRecordingMetadata {
  return {
    id: "recording-alpha",
    type: "sheet",
    sessionId: "session-alpha",
    sheetId: "sheet-alpha",
    sheetName: "Alpha Sheet",
    createdAt: "2026-06-21T12:02:00.000Z",
    durationMs: 12_000,
    bpm: 96,
    timeSignature: "4/4",
    segmentContext: null,
    ...overrides
  };
}

function createRepositoryBackedGoalService(nowIso: string) {
  return createPracticeGoalService({
    repository: practiceGoalRepository,
    sessionRepository: practiceSessionRepository,
    recordingRepository: recordingHistoryMetadataRepository,
    now: () => new Date(nowIso)
  });
}

describe("practice goal validation", () => {
  it("normalizes persisted defaults without mutating the input object", () => {
    const input = {
      id: " goal-alpha ",
      kind: "minutes",
      target: 1,
      period: "today",
      createdAt: "2026-06-21T08:00:00.000Z"
    } satisfies LocalPracticeGoal;
    const snapshot = structuredClone(input);

    expect(validateLocalPracticeGoal(input)).toEqual({
      id: "goal-alpha",
      kind: "minutes",
      target: 1,
      period: "today",
      createdAt: "2026-06-21T08:00:00.000Z",
      completedAt: null,
      status: "active"
    });
    expect(input).toEqual(snapshot);
  });

  it("rejects malformed goal records through parsing", () => {
    expect(parseLocalPracticeGoal({ ...createGoal(), id: " ".repeat(3) })).toBeNull();
    expect(parseLocalPracticeGoal({ ...createGoal(), kind: "weekly" })).toBeNull();
    expect(parseLocalPracticeGoal({ ...createGoal(), period: "forever" })).toBeNull();
    expect(parseLocalPracticeGoal({ ...createGoal(), status: "paused" })).toBeNull();
    expect(parseLocalPracticeGoal({ ...createGoal(), target: 0 })).toBeNull();
    expect(parseLocalPracticeGoal({ ...createGoal(), target: 1.5 })).toBeNull();
    expect(parseLocalPracticeGoal({ ...createGoal(), target: NaN })).toBeNull();
    expect(parseLocalPracticeGoal({ ...createGoal(), target: Infinity })).toBeNull();
    expect(parseLocalPracticeGoal({ ...createGoal(), createdAt: "not-a-date" })).toBeNull();
    expect(parseLocalPracticeGoal({ ...createGoal(), completedAt: "not-a-date" })).toBeNull();
  });

  it.each([
    ["minutes", "today"],
    ["sessions", "all-time"],
    ["takes", "today"]
  ] as const)("builds a %s/%s goal from a valid draft", (kind, period) => {
    expect(
      parsePracticeGoalDraft(
        { kind, period, targetText: " 00042 " },
        {
          createId: () => "goal-created",
          now: () => new Date("2026-06-21T10:00:00.000Z")
        }
      )
    ).toEqual({
      success: true,
      goal: {
        id: "goal-created",
        kind,
        target: 42,
        period,
        createdAt: "2026-06-21T10:00:00.000Z"
      }
    });
  });

  it.each([
    [
      { kind: "weekly", period: "today", targetText: "1" },
      "unsupported-kind"
    ],
    [
      { kind: "minutes", period: "forever", targetText: "1" },
      "unsupported-period"
    ],
    [
      { kind: "minutes", period: "today", targetText: "1.5" },
      "target-whole-number"
    ],
    [
      { kind: "minutes", period: "today", targetText: "0" },
      "target-safe-integer"
    ],
    [
      {
        kind: "minutes",
        period: "today",
        targetText: String(Number.MAX_SAFE_INTEGER + 1)
      },
      "target-safe-integer"
    ],
    [
      { kind: "minutes", period: "today", targetText: "1000001" },
      "target-too-large"
    ]
  ] as const)("returns the stable %s draft error", (draft, errorCode) => {
    expect(
      parsePracticeGoalDraft(draft, {
        createId: () => "unused",
        now: () => new Date("2026-06-21T10:00:00.000Z")
      })
    ).toEqual({
      success: false,
      error: { code: errorCode }
    });
  });

  it("preserves the id and creation time when building an edited goal", () => {
    const baseGoal = createGoal({
      id: "goal-existing",
      createdAt: "2026-06-20T08:00:00.000Z",
      completedAt: "2026-06-21T09:00:00.000Z",
      status: "completed"
    });

    expect(
      parsePracticeGoalDraft(
        { kind: "takes", period: "all-time", targetText: "7" },
        {
          baseGoal,
          createId() {
            throw new Error("createId must not run while editing");
          },
          now() {
            throw new Error("now must not run while editing");
          }
        }
      )
    ).toEqual({
      success: true,
      goal: {
        id: "goal-existing",
        kind: "takes",
        target: 7,
        period: "all-time",
        createdAt: "2026-06-20T08:00:00.000Z"
      }
    });
  });
});

describe("practice goal browser repository", () => {
  beforeEach(async () => {
    await clearPracticeGoalDatabaseForTests();
    await clearPracticeSessionDatabaseForTests();
    localStorage.clear();
  });

  afterEach(() => {
    resetPracticeGoalDatabaseConnectionForTests();
    resetPracticeSessionDatabaseConnectionForTests();
    localStorage.clear();
  });

  it("saves a valid goal, trims its id, and reads it back by trimmed lookup", async () => {
    await practiceGoalRepository.saveGoal(
      createGoal({
        id: " goal-alpha "
      })
    );

    await expect(practiceGoalRepository.getGoal("goal-alpha")).resolves.toEqual({
      id: "goal-alpha",
      kind: "minutes",
      target: 1,
      period: "today",
      createdAt: "2026-06-21T08:00:00.000Z",
      completedAt: null,
      status: "active"
    });
    await expect(practiceGoalRepository.getGoal(" goal-alpha ")).resolves.toEqual({
      id: "goal-alpha",
      kind: "minutes",
      target: 1,
      period: "today",
      createdAt: "2026-06-21T08:00:00.000Z",
      completedAt: null,
      status: "active"
    });
  });

  it("lists goals newest first with a deterministic id tie-breaker and updates existing ids", async () => {
    await practiceGoalRepository.saveGoal(
      createGoal({
        id: "goal-bravo",
        createdAt: "2026-06-21T08:00:00.000Z"
      })
    );
    await practiceGoalRepository.saveGoal(
      createGoal({
        id: "goal-alpha",
        createdAt: "2026-06-21T08:00:00.000Z"
      })
    );
    await practiceGoalRepository.saveGoal(
      createGoal({
        id: "goal-charlie",
        kind: "sessions",
        target: 2,
        period: "all-time",
        createdAt: "2026-06-21T09:00:00.000Z"
      })
    );

    await expect(practiceGoalRepository.listGoals()).resolves.toEqual([
      expect.objectContaining({
        id: "goal-charlie"
      }),
      expect.objectContaining({
        id: "goal-alpha"
      }),
      expect.objectContaining({
        id: "goal-bravo"
      })
    ]);

    await practiceGoalRepository.saveGoal(
      createGoal({
        id: "goal-alpha",
        target: 3,
        period: "all-time"
      })
    );

    await expect(practiceGoalRepository.getGoal("goal-alpha")).resolves.toEqual({
      id: "goal-alpha",
      kind: "minutes",
      target: 3,
      period: "all-time",
      createdAt: "2026-06-21T08:00:00.000Z",
      completedAt: null,
      status: "active"
    });
  });

  it("rejects invalid writes without leaving a partial row behind", async () => {
    await expect(
      practiceGoalRepository.saveGoal(
        createGoal({
          id: "invalid-goal",
          target: 0
        })
      )
    ).rejects.toThrow();
    await expect(practiceGoalRepository.getGoal("invalid-goal")).resolves.toBeNull();
    await expect(practiceGoalRepository.listGoals()).resolves.toEqual([]);
  });

  it("filters malformed persisted rows from getGoal and listGoals", async () => {
    await practiceGoalRepository.saveGoal(createGoal());
    await seedPracticeGoalRecordForTests("invalid-goal", {
      kind: "minutes",
      target: -1,
      period: "today",
      createdAt: "2026-06-21T08:00:00.000Z",
      completedAt: null,
      status: "active"
    });
    resetPracticeGoalDatabaseConnectionForTests();

    await expect(practiceGoalRepository.getGoal("invalid-goal")).resolves.toBeNull();
    await expect(practiceGoalRepository.listGoals()).resolves.toEqual([
      expect.objectContaining({
        id: "goal-alpha"
      })
    ]);
    expect(
      parsePersistedPracticeGoalRecord({
        id: "invalid-goal",
        kind: "minutes",
        target: -1,
        period: "today",
        createdAt: "2026-06-21T08:00:00.000Z",
        completedAt: null,
        status: "active"
      })
    ).toBeNull();
  });

  it("rejects blank getGoal and deleteGoal ids and ignores missing non-blank deletes", async () => {
    await practiceGoalRepository.saveGoal(createGoal());

    await expect(practiceGoalRepository.getGoal(" ".repeat(3))).rejects.toThrow(
      "Practice goal id is required."
    );
    await expect(practiceGoalRepository.deleteGoal(" ".repeat(3))).rejects.toThrow(
      "Practice goal id is required."
    );
    await expect(practiceGoalRepository.deleteGoal("missing-goal")).resolves.toBeUndefined();
    await expect(practiceGoalRepository.listGoals()).resolves.toHaveLength(1);
  });

  it("fires subscriptions only for save, delete of an existing goal, and clear with changed state", async () => {
    let notifications = 0;
    const unsubscribe = practiceGoalRepository.subscribe?.(() => {
      notifications += 1;
    }) ?? (() => undefined);

    await practiceGoalRepository.saveGoal(createGoal());
    expect(notifications).toBe(1);

    await practiceGoalRepository.listGoals();
    await practiceGoalRepository.getGoal("goal-alpha");
    await practiceGoalRepository.getGoal("missing-goal");
    expect(notifications).toBe(1);

    await expect(
      practiceGoalRepository.saveGoal(
        createGoal({
          id: "invalid-goal",
          target: 0
        })
      )
    ).rejects.toThrow();
    await expect(practiceGoalRepository.getGoal(" ".repeat(3))).rejects.toThrow();
    await expect(practiceGoalRepository.deleteGoal(" ".repeat(3))).rejects.toThrow();
    await practiceGoalRepository.deleteGoal("missing-goal");
    expect(notifications).toBe(1);

    await practiceGoalRepository.deleteGoal("goal-alpha");
    expect(notifications).toBe(2);

    await practiceGoalRepository.clear();
    expect(notifications).toBe(2);

    await practiceGoalRepository.saveGoal(createGoal({ id: "goal-bravo" }));
    expect(notifications).toBe(3);

    await practiceGoalRepository.clear();
    expect(notifications).toBe(4);

    await practiceGoalRepository.clear();
    expect(notifications).toBe(4);

    unsubscribe();
  });

  it("returns a noop unsubscribe when window is unavailable", () => {
    vi.stubGlobal("window", undefined);

    try {
      const unsubscribe = practiceGoalRepository.subscribe?.(() => undefined);

      expect(unsubscribe).toEqual(expect.any(Function));
      expect(() => unsubscribe?.()).not.toThrow();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("persists stored goals across a Dexie reset and reopen", async () => {
    await practiceGoalRepository.saveGoal(
      createGoal({
        id: "goal-persisted",
        kind: "sessions",
        target: 2,
        period: "all-time",
        status: "completed",
        completedAt: "2026-06-21T12:10:00.000Z"
      })
    );
    resetPracticeGoalDatabaseConnectionForTests();

    await expect(practiceGoalRepository.getGoal("goal-persisted")).resolves.toEqual({
      id: "goal-persisted",
      kind: "sessions",
      target: 2,
      period: "all-time",
      createdAt: "2026-06-21T08:00:00.000Z",
      completedAt: "2026-06-21T12:10:00.000Z",
      status: "completed"
    });
  });

  it("keeps goal storage separate from sessions and recordings during clear operations", async () => {
    const session = createSession();

    await practiceGoalRepository.saveGoal(createGoal({ id: "goal-before-goal-clear" }));
    await practiceSessionRepository.saveSession(session);
    await recordingHistoryMetadataRepository.saveRecordingMetadata(
      createRecording({
        sessionId: session.id
      }),
      session
    );

    await practiceGoalRepository.clear();

    await expect(practiceGoalRepository.listGoals()).resolves.toEqual([]);
    await expect(practiceSessionRepository.listSessions()).resolves.toEqual([session]);
    await expect(recordingHistoryMetadataRepository.listRecordingMetadata()).resolves.toEqual([
      expect.objectContaining({
        id: "recording-alpha"
      })
    ]);

    await practiceGoalRepository.saveGoal(createGoal({ id: "goal-before-session-clear" }));
    await practiceSessionRepository.clear();

    await expect(practiceGoalRepository.listGoals()).resolves.toEqual([
      expect.objectContaining({
        id: "goal-before-session-clear"
      })
    ]);
    await expect(practiceSessionRepository.listSessions()).resolves.toEqual([]);
  });

  it("derives the same stored-goal evaluations after persisted goals and activity reload", async () => {
    const session = createSession({
      id: "session-minutes",
      durationMs: 60_000
    });

    await practiceGoalRepository.saveGoal(
      createGoal({
        id: "minutes-goal",
        target: 1
      })
    );
    await practiceGoalRepository.saveGoal(
      createGoal({
        id: "takes-goal",
        kind: "takes",
        target: 1,
        period: "all-time"
      })
    );
    await practiceSessionRepository.saveSession(session);
    await recordingHistoryMetadataRepository.saveRecordingMetadata(
      createRecording({
        id: "recording-reload",
        sessionId: session.id
      }),
      session
    );

    const beforeReload = await createRepositoryBackedGoalService(
      "2026-06-21T15:00:00.000Z"
    ).getPracticeGoalEvaluations();

    resetPracticeGoalDatabaseConnectionForTests();
    resetPracticeSessionDatabaseConnectionForTests();

    const afterReload = await createRepositoryBackedGoalService(
      "2026-06-21T15:00:00.000Z"
    ).getPracticeGoalEvaluations();

    expect(afterReload).toEqual(beforeReload);
    expect(afterReload).toEqual([
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
  });

  it("keeps goals after activity clear and reevaluates below target without mutating stored goals", async () => {
    const session = createSession({
      id: "session-completed",
      durationMs: 120_000
    });
    const storedGoal = createGoal({
      id: "completed-goal",
      target: 2,
      period: "all-time",
      status: "completed",
      completedAt: "2026-06-21T12:10:00.000Z"
    });

    await practiceGoalRepository.saveGoal(storedGoal);
    await practiceSessionRepository.saveSession(session);

    await expect(
      createRepositoryBackedGoalService("2026-06-21T15:00:00.000Z").getPracticeGoalEvaluations()
    ).resolves.toEqual([
      expect.objectContaining({
        goalId: "completed-goal",
        status: "completed",
        progress: 2,
        completedAt: "2026-06-21T12:10:00.000Z"
      })
    ]);

    await practiceSessionRepository.clear();
    localStorage.clear();
    resetPracticeGoalDatabaseConnectionForTests();
    resetPracticeSessionDatabaseConnectionForTests();

    await expect(practiceGoalRepository.listGoals()).resolves.toEqual([
      {
        ...storedGoal,
        id: "completed-goal",
        completedAt: "2026-06-21T12:10:00.000Z",
        status: "completed"
      }
    ]);
    await expect(
      createRepositoryBackedGoalService("2026-06-21T15:00:00.000Z").getPracticeGoalEvaluations()
    ).resolves.toEqual([
      expect.objectContaining({
        goalId: "completed-goal",
        status: "not-started",
        progress: 0,
        completedAt: null
      })
    ]);
  });
});
