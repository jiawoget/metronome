import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it, vi } from "vitest";

import type {
  LocalPracticeGoal,
  PracticeSession,
  SheetRecordingMetadata
} from "@/domain/practice";
import { createPracticeGoalService, type PracticeGoalRepository } from "@/services/practice-goals";

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
    sourceType: "quick",
    sheetId: null,
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

function localIso(
  year: number,
  monthIndex: number,
  day: number,
  hour = 12,
  minute = 0
) {
  return new Date(year, monthIndex, day, hour, minute, 0).toISOString();
}

function createMemoryGoalRepository(
  initialGoals: LocalPracticeGoal[] = []
): PracticeGoalRepository & {
  listGoals: ReturnType<typeof vi.fn<PracticeGoalRepository["listGoals"]>>;
  getGoal: ReturnType<typeof vi.fn<PracticeGoalRepository["getGoal"]>>;
  saveGoal: ReturnType<typeof vi.fn<PracticeGoalRepository["saveGoal"]>>;
  deleteGoal: ReturnType<typeof vi.fn<PracticeGoalRepository["deleteGoal"]>>;
} {
  const goals = new Map(initialGoals.map((goal) => [goal.id, structuredClone(goal)]));
  const listGoals = vi.fn<PracticeGoalRepository["listGoals"]>(async () =>
    Array.from(goals.values()).map((goal) => structuredClone(goal))
  );
  const getGoal = vi.fn<PracticeGoalRepository["getGoal"]>(async (goalId) =>
    goals.get(goalId.trim()) ? structuredClone(goals.get(goalId.trim())!) : null
  );
  const saveGoal = vi.fn<PracticeGoalRepository["saveGoal"]>(async (goal) => {
    goals.set(goal.id.trim(), structuredClone(goal));
  });
  const deleteGoal = vi.fn<PracticeGoalRepository["deleteGoal"]>(async (goalId) => {
    goals.delete(goalId.trim());
  });

  return {
    listGoals,
    getGoal,
    saveGoal,
    deleteGoal,
    clear: async () => {
      goals.clear();
    },
    subscribe: () => () => undefined
  };
}

describe("practice goal service", () => {
  it("delegates goal CRUD and list operations to the goal repository", async () => {
    const repository = createMemoryGoalRepository([createGoal()]);
    const sessionRepository = {
      listSessions: vi.fn(async () => [])
    };
    const recordingRepository = {
      listRecordingMetadata: vi.fn(async () => [])
    };
    const service = createPracticeGoalService({
      repository,
      sessionRepository,
      recordingRepository
    });
    const nextGoal = createGoal({
      id: "goal-bravo",
      kind: "sessions",
      target: 2,
      period: "all-time"
    });

    await expect(service.listPracticeGoals()).resolves.toEqual([createGoal()]);
    await expect(service.getPracticeGoal("goal-alpha")).resolves.toEqual(createGoal());
    await expect(service.savePracticeGoal(nextGoal)).resolves.toBeUndefined();
    await expect(service.deletePracticeGoal("goal-alpha")).resolves.toBeUndefined();

    expect(repository.listGoals).toHaveBeenCalledTimes(1);
    expect(repository.getGoal).toHaveBeenCalledWith("goal-alpha");
    expect(repository.saveGoal).toHaveBeenCalledWith(nextGoal);
    expect(repository.deleteGoal).toHaveBeenCalledWith("goal-alpha");
    expect(sessionRepository.listSessions).not.toHaveBeenCalled();
    expect(recordingRepository.listRecordingMetadata).not.toHaveBeenCalled();
  });

  it("reads stored goals, sessions, and recordings, then delegates evaluation without writes", async () => {
    const repository = createMemoryGoalRepository([
      createGoal({
        id: "minutes-goal",
        target: 1
      }),
      createGoal({
        id: "takes-goal",
        kind: "takes",
        target: 2
      })
    ]);
    const sessionRepository = {
      listSessions: vi.fn(async () => [
        createSession({
          id: "today-session",
          durationMs: 60_000
        }),
        createSession({
          id: "old-session",
          startedAt: "2026-06-20T12:00:00.000Z",
          updatedAt: "2026-06-20T12:01:00.000Z",
          durationMs: 600_000
        })
      ])
    };
    const recordingRepository = {
      listRecordingMetadata: vi.fn(async () => [
        createRecording({
          id: "today-recording-one"
        }),
        createRecording({
          id: "today-recording-two",
          createdAt: "2026-06-21T12:03:00.000Z"
        }),
        createRecording({
          id: "old-recording",
          createdAt: "2026-06-20T12:02:00.000Z"
        })
      ])
    };
    const service = createPracticeGoalService({
      repository,
      sessionRepository,
      recordingRepository,
      now: () => new Date("2026-06-21T15:00:00.000Z")
    });

    await expect(service.getPracticeGoalEvaluations()).resolves.toEqual([
      expect.objectContaining({
        goalId: "minutes-goal",
        status: "completed",
        progress: 1
      }),
      expect.objectContaining({
        goalId: "takes-goal",
        status: "completed",
        progress: 2
      })
    ]);
    expect(repository.listGoals).toHaveBeenCalledTimes(1);
    expect(sessionRepository.listSessions).toHaveBeenCalledTimes(1);
    expect(recordingRepository.listRecordingMetadata).toHaveBeenCalledTimes(1);
    expect(repository.saveGoal).not.toHaveBeenCalled();
    expect(repository.deleteGoal).not.toHaveBeenCalled();
  });

  it("uses the injected fixed clock for P3-10 today semantics and completion timestamps", async () => {
    const clock = vi.fn(() => new Date(2026, 5, 21, 15, 0, 0));
    const repository = createMemoryGoalRepository([
      createGoal({
        id: "today-minutes",
        target: 1
      }),
      createGoal({
        id: "today-sessions",
        kind: "sessions",
        target: 1
      }),
      createGoal({
        id: "today-takes",
        kind: "takes",
        target: 1
      })
    ]);
    const sessionRepository = {
      listSessions: vi.fn(async () => [
        createSession({
          id: "same-day-session",
          startedAt: localIso(2026, 5, 21, 0, 30),
          updatedAt: localIso(2026, 5, 21, 0, 31),
          durationMs: 60_000
        }),
        createSession({
          id: "previous-day-session",
          startedAt: localIso(2026, 5, 20, 23, 30),
          updatedAt: localIso(2026, 5, 20, 23, 31),
          durationMs: 600_000
        })
      ])
    };
    const recordingRepository = {
      listRecordingMetadata: vi.fn(async () => [
        createRecording({
          id: "same-day-recording",
          createdAt: localIso(2026, 5, 21, 1, 0)
        }),
        createRecording({
          id: "previous-day-recording",
          createdAt: localIso(2026, 5, 20, 22, 0)
        })
      ])
    };
    const service = createPracticeGoalService({
      repository,
      sessionRepository,
      recordingRepository,
      now: clock
    });

    await expect(service.getPracticeGoalEvaluations()).resolves.toEqual([
      expect.objectContaining({
        goalId: "today-minutes",
        status: "completed",
        progress: 1,
        completedAt: localIso(2026, 5, 21, 15, 0)
      }),
      expect.objectContaining({
        goalId: "today-sessions",
        status: "completed",
        progress: 1,
        completedAt: localIso(2026, 5, 21, 15, 0)
      }),
      expect.objectContaining({
        goalId: "today-takes",
        status: "completed",
        progress: 1,
        completedAt: localIso(2026, 5, 21, 15, 0)
      })
    ]);
    expect(clock).toHaveBeenCalledTimes(1);
  });

  it("returns an empty result when stored goal storage is empty", async () => {
    const service = createPracticeGoalService({
      repository: createMemoryGoalRepository(),
      sessionRepository: {
        listSessions: async () => [createSession()]
      },
      recordingRepository: {
        listRecordingMetadata: async () => [createRecording()]
      },
      now: () => new Date("2026-06-21T15:00:00.000Z")
    });

    await expect(service.getPracticeGoalEvaluations()).resolves.toEqual([]);
  });

  it("rejects stored-goal evaluation when goal, session, or recording reads fail", async () => {
    const goal = createGoal();

    await expect(
      createPracticeGoalService({
        repository: {
          ...createMemoryGoalRepository([goal]),
          listGoals: vi.fn(async () => {
            throw new Error("goal read failed");
          })
        },
        sessionRepository: {
          listSessions: async () => []
        },
        recordingRepository: {
          listRecordingMetadata: async () => []
        }
      }).getPracticeGoalEvaluations()
    ).rejects.toThrow("goal read failed");

    await expect(
      createPracticeGoalService({
        repository: createMemoryGoalRepository([goal]),
        sessionRepository: {
          listSessions: async () => {
            throw new Error("session read failed");
          }
        },
        recordingRepository: {
          listRecordingMetadata: async () => []
        }
      }).getPracticeGoalEvaluations()
    ).rejects.toThrow("session read failed");

    await expect(
      createPracticeGoalService({
        repository: createMemoryGoalRepository([goal]),
        sessionRepository: {
          listSessions: async () => []
        },
        recordingRepository: {
          listRecordingMetadata: async () => {
            throw new Error("recording read failed");
          }
        }
      }).getPracticeGoalEvaluations()
    ).rejects.toThrow("recording read failed");
  });

  it("does not write back completed goals when current progress falls below target", async () => {
    const completedGoal = createGoal({
      id: "completed-goal",
      target: 2,
      status: "completed",
      completedAt: "2026-06-21T12:10:00.000Z"
    });
    const repository = createMemoryGoalRepository([completedGoal]);
    const service = createPracticeGoalService({
      repository,
      sessionRepository: {
        listSessions: async () => [
          createSession({
            durationMs: 60_000
          })
        ]
      },
      recordingRepository: {
        listRecordingMetadata: async () => []
      },
      now: () => new Date("2026-06-21T15:00:00.000Z")
    });

    await expect(service.getPracticeGoalEvaluations()).resolves.toEqual([
      expect.objectContaining({
        goalId: "completed-goal",
        status: "in-progress",
        progress: 1,
        completedAt: null
      })
    ]);
    await expect(service.listPracticeGoals()).resolves.toEqual([completedGoal]);
    expect(repository.saveGoal).not.toHaveBeenCalled();
    expect(repository.deleteGoal).not.toHaveBeenCalled();
  });

  it("wires the browser goal service to the plain persisted session repository", () => {
    const browserGoalServiceSource = readFileSync(
      resolve(process.cwd(), "src/infrastructure/db/browser-practice-goal-service.ts"),
      "utf8"
    );

    expect(browserGoalServiceSource).toContain(
      "sessionRepository: practiceSessionRepository"
    );
    expect(browserGoalServiceSource).not.toContain(
      "createGlobalPracticeSessionRepository(practiceSessionRepository)"
    );
    expect(browserGoalServiceSource).not.toContain(
      "from \"@/infrastructure/db/global-practice-session-repository\""
    );
  });
});
