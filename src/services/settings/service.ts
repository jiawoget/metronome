import { DEFAULT_USER_SETTINGS, normalizeSettingsPatch, normalizeUserSettings } from "@/domain/settings";
import type {
  LocalDataCleanupService,
  LocalDataCleanupSource,
  SettingsRepository,
  StorageSummaryService,
  StorageSummarySource,
  UserSettingsService
} from "@/services/settings/types";

export function createUserSettingsService(repository: SettingsRepository): UserSettingsService {
  let pendingUpdate = Promise.resolve();

  return {
    async getSettings() {
      return normalizeUserSettings((await repository.getSettings()) ?? DEFAULT_USER_SETTINGS);
    },

    async updateSettings(patch) {
      const update = pendingUpdate.then(async () => {
        const currentSettings = normalizeUserSettings((await repository.getSettings()) ?? DEFAULT_USER_SETTINGS);
        const nextSettings = normalizeSettingsPatch(currentSettings, patch);

        await repository.saveSettings(nextSettings);

        return nextSettings;
      });

      pendingUpdate = update.then(
        () => undefined,
        () => undefined
      );

      return update;
    },

    async resetToDefaults() {
      await pendingUpdate;
      await repository.saveSettings(DEFAULT_USER_SETTINGS);

      return DEFAULT_USER_SETTINGS;
    }
  };
}

export function createStorageSummaryService(source: StorageSummarySource): StorageSummaryService {
  return {
    async getSummary() {
      const [counts, storageEstimate] = await Promise.all([
        source.getCounts(),
        source.getStorageEstimate()
      ]);

      return {
        counts,
        storageEstimate
      };
    }
  };
}

export function createLocalDataCleanupService(source: LocalDataCleanupSource): LocalDataCleanupService {
  return {
    clearAllLocalData() {
      return source.clearLocalData();
    }
  };
}
