"use client";

import Dexie, { type Table } from "dexie";

import { normalizeUserSettings, type UserSettings } from "@/domain/settings";
import { SETTINGS_DB_NAME } from "@/infrastructure/storage/storage-contracts";
import { createUserSettingsService, type SettingsRepository } from "@/services/settings";

type PersistedSettingsRecord = {
  id: "user-settings";
  value: UserSettings;
  updatedAt: string;
};

type SettingsDatabaseSchema = {
  settings: Table<PersistedSettingsRecord, string>;
};

class SettingsDexieDatabase extends Dexie implements SettingsDatabaseSchema {
  settings!: Table<PersistedSettingsRecord, string>;

  constructor() {
    super(SETTINGS_DB_NAME);

    this.version(1).stores({
      settings: "id, updatedAt"
    });
  }
}

let database: SettingsDexieDatabase | null = null;

function getDatabase() {
  database ??= new SettingsDexieDatabase();

  return database;
}

export const browserSettingsRepository: SettingsRepository = {
  async getSettings() {
    const record = await getDatabase().settings.get("user-settings");

    return record ? normalizeUserSettings(record.value) : null;
  },

  async saveSettings(settings) {
    await getDatabase().settings.put({
      id: "user-settings",
      value: normalizeUserSettings(settings),
      updatedAt: new Date().toISOString()
    });
  },

  async clearSettings() {
    await getDatabase().settings.clear();
  }
};

export const browserSettingsService = createUserSettingsService(browserSettingsRepository);

