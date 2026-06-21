import Dexie, { type Table } from "dexie";

import { sortSessionsByRecentActivity, type PracticeSession } from "@/domain/practice";
import type { PracticeSessionRepository } from "@/services/practice-session";

export const PRACTICE_SESSION_DB_NAME = "metronome-practice-v0-practice-sessions";
export const PRACTICE_SESSION_STORE_EVENT = "practice-session-change";

type PracticeSessionDatabaseSchema = {
  sessions: Table<PracticeSession, string>;
};

class PracticeSessionDexieDatabase extends Dexie implements PracticeSessionDatabaseSchema {
  sessions!: Table<PracticeSession, string>;

  constructor() {
    super(PRACTICE_SESSION_DB_NAME);

    this.version(1).stores({
      sessions: "id, sourceType, sheetId, startedAt, updatedAt",
      recordings: "id, sessionId, sheetId, createdAt"
    });
    this.version(2).stores({
      sessions: "id, sourceType, sheetId, startedAt, updatedAt",
      recordings: null
    });
  }
}

let database: PracticeSessionDexieDatabase | null = null;

function getDatabase() {
  database ??= new PracticeSessionDexieDatabase();

  return database;
}

function dispatchPracticeSessionChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(PRACTICE_SESSION_STORE_EVENT));
  }
}

export const practiceSessionRepository: PracticeSessionRepository = {
  async listSessions() {
    return sortSessionsByRecentActivity(await getDatabase().sessions.toArray());
  },

  async getSession(sessionId) {
    return (await getDatabase().sessions.get(sessionId)) ?? null;
  },

  async getRecentSession() {
    return sortSessionsByRecentActivity(await getDatabase().sessions.toArray())[0] ?? null;
  },

  async getRecentSheetSession(sheetId) {
    const sessions = await getDatabase().sessions.where("sheetId").equals(sheetId).toArray();

    return sortSessionsByRecentActivity(sessions)[0] ?? null;
  },

  async saveSession(session) {
    await getDatabase().sessions.put(session);
    dispatchPracticeSessionChange();
  },

  async clear() {
    const db = getDatabase();

    await db.transaction("rw", db.sessions, async () => {
      await db.sessions.clear();
    });
    dispatchPracticeSessionChange();
  },

  subscribe(listener) {
    if (typeof window === "undefined") {
      return () => undefined;
    }

    const handleChange = () => listener();

    window.addEventListener(PRACTICE_SESSION_STORE_EVENT, handleChange);
    window.addEventListener("storage", handleChange);

    return () => {
      window.removeEventListener(PRACTICE_SESSION_STORE_EVENT, handleChange);
      window.removeEventListener("storage", handleChange);
    };
  }
};

export async function clearPracticeSessionDatabaseForTests() {
  await getDatabase().delete();
  database = null;
}
