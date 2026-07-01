import Dexie, { type Table } from "dexie";

import {
  parseLocalPracticeGoal,
  validateLocalPracticeGoal,
  type LocalPracticeGoal,
  type LocalPracticeGoalStatus
} from "@/domain/practice";
import { PRACTICE_GOAL_DB_NAME } from "@/infrastructure/storage/storage-contracts";
import type { PracticeGoalRepository } from "@/services/practice-goals";

const PRACTICE_GOAL_STORE_EVENT = "practice-goal-change";

type PersistedPracticeGoal = LocalPracticeGoal & {
  completedAt: string | null;
  status: LocalPracticeGoalStatus;
};

type PracticeGoalDatabaseSchema = {
  goals: Table<PersistedPracticeGoal, string>;
};

class PracticeGoalDexieDatabase extends Dexie implements PracticeGoalDatabaseSchema {
  goals!: Table<PersistedPracticeGoal, string>;

  constructor() {
    super(PRACTICE_GOAL_DB_NAME);

    this.version(1).stores({
      goals: "id, kind, period, status, createdAt"
    });
  }
}

let database: PracticeGoalDexieDatabase | null = null;

function getDatabase() {
  database ??= new PracticeGoalDexieDatabase();

  return database;
}

function dispatchPracticeGoalChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(PRACTICE_GOAL_STORE_EVENT));
  }
}

function isPracticeGoal(goal: LocalPracticeGoal | null): goal is LocalPracticeGoal {
  return goal !== null;
}

function normalizeRequiredGoalId(goalId: string) {
  const normalizedGoalId = goalId.trim();

  if (!normalizedGoalId) {
    throw new Error("Practice goal id is required.");
  }

  return normalizedGoalId;
}

function sortGoalsByNewest(goals: readonly LocalPracticeGoal[]) {
  return [...goals].sort((first, second) => {
    const firstCreatedAtMs = Date.parse(first.createdAt);
    const secondCreatedAtMs = Date.parse(second.createdAt);

    if (firstCreatedAtMs !== secondCreatedAtMs) {
      return secondCreatedAtMs - firstCreatedAtMs;
    }

    return first.id.localeCompare(second.id);
  });
}

export function parsePersistedPracticeGoalRecord(value: unknown) {
  return parseLocalPracticeGoal(value);
}

export const practiceGoalRepository: PracticeGoalRepository = {
  async listGoals() {
    return sortGoalsByNewest(
      (await getDatabase().goals.toArray())
        .map(parsePersistedPracticeGoalRecord)
        .filter(isPracticeGoal)
    );
  },

  async getGoal(goalId) {
    const normalizedGoalId = normalizeRequiredGoalId(goalId);

    return parsePersistedPracticeGoalRecord(
      (await getDatabase().goals.get(normalizedGoalId)) ?? null
    );
  },

  async saveGoal(goal) {
    await getDatabase().goals.put(validateLocalPracticeGoal(goal));
    dispatchPracticeGoalChange();
  },

  async deleteGoal(goalId) {
    const normalizedGoalId = normalizeRequiredGoalId(goalId);
    const existingGoal = await getDatabase().goals.get(normalizedGoalId);

    if (typeof existingGoal === "undefined") {
      return;
    }

    await getDatabase().goals.delete(normalizedGoalId);
    dispatchPracticeGoalChange();
  },

  async clear() {
    const db = getDatabase();

    if ((await db.goals.count()) === 0) {
      return;
    }

    await db.transaction("rw", db.goals, async () => {
      await db.goals.clear();
    });
    dispatchPracticeGoalChange();
  },

  subscribe(listener) {
    if (typeof window === "undefined") {
      return () => undefined;
    }

    const handleChange = () => listener();

    window.addEventListener(PRACTICE_GOAL_STORE_EVENT, handleChange);
    window.addEventListener("storage", handleChange);

    return () => {
      window.removeEventListener(PRACTICE_GOAL_STORE_EVENT, handleChange);
      window.removeEventListener("storage", handleChange);
    };
  }
};

export async function seedPracticeGoalRecordForTests(goalId: string, value: unknown) {
  await getDatabase().goals.put({
    ...(value && typeof value === "object" && !Array.isArray(value)
      ? value
      : {}),
    id: goalId
  } as PersistedPracticeGoal);
}

export function resetPracticeGoalDatabaseConnectionForTests() {
  database?.close();
  database = null;
}

export async function clearPracticeGoalDatabaseForTests() {
  await getDatabase().delete();
  database = null;
}
