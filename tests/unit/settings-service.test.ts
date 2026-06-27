import { describe, expect, it } from "vitest";

import {
  DEFAULT_USER_SETTINGS,
  formatStorageBytes,
  getClearLocalDataPlan,
  mapPermissionState,
  normalizeUserSettings,
  type UserSettings
} from "@/domain/settings";
import {
  createStorageSummaryService,
  createUserSettingsService,
  type SettingsRepository
} from "@/services/settings";

function createMemorySettingsRepository(initialSettings: UserSettings | null = null): SettingsRepository {
  let settings = initialSettings;

  return {
    async getSettings() {
      return settings;
    },
    async saveSettings(nextSettings) {
      settings = nextSettings;
    },
    async clearSettings() {
      settings = null;
    }
  };
}

describe("settings services", () => {
  it("normalizes settings boundaries and fallbacks", () => {
    expect(
      normalizeUserSettings({
        defaultBpm: 500,
        defaultTimeSignature: "3/4",
        defaultSubdivision: "triplet",
        metronomeVolume: -10,
        referenceDefaultVolume: 120
      })
    ).toEqual({
      defaultBpm: 240,
      defaultTimeSignature: "3/4",
      defaultSubdivision: "triplet",
      metronomeVolume: 0,
      referenceDefaultVolume: 100
    });

    expect(normalizeUserSettings({ defaultBpm: "fast" })).toEqual(DEFAULT_USER_SETTINGS);
  });

  it("persists updates and resets settings through the repository boundary", async () => {
    const repository = createMemorySettingsRepository();
    const service = createUserSettingsService(repository);

    expect(await service.getSettings()).toEqual(DEFAULT_USER_SETTINGS);

    await service.updateSettings({
      defaultBpm: 144,
      defaultTimeSignature: "6/8",
      metronomeVolume: 42
    });

    expect(await service.getSettings()).toMatchObject({
      defaultBpm: 144,
      defaultTimeSignature: "6/8",
      metronomeVolume: 42
    });

    await service.resetToDefaults();

    expect(await service.getSettings()).toEqual(DEFAULT_USER_SETTINGS);
  });

  it("formats storage state, permission state, and cleanup coverage", async () => {
    expect(formatStorageBytes(0)).toBe("0 B");
    expect(formatStorageBytes(1536)).toBe("1.5 KB");
    expect(formatStorageBytes(2 * 1024 * 1024)).toBe("2.0 MB");
    expect(mapPermissionState("granted")).toBe("granted");
    expect(mapPermissionState("blocked")).toBe("unknown");
    expect(getClearLocalDataPlan()).toEqual([
      "settings",
      "sheets",
      "sheet artifacts",
      "recordings",
      "recording artifacts",
      "references",
      "reference artifacts",
      "error markers",
      "practice sessions",
      "practice history"
    ]);

    const summaryService = createStorageSummaryService({
      async getCounts() {
        return {
          sheets: 1,
          recordings: 2,
          references: 3,
          errorMarkers: 4,
          practiceSessions: 5
        };
      },
      async getStorageEstimate() {
        return {
          supported: true,
          usageBytes: 2048,
          quotaBytes: 4096
        };
      }
    });

    await expect(summaryService.getSummary()).resolves.toMatchObject({
      counts: {
        sheets: 1,
        recordings: 2,
        references: 3,
        errorMarkers: 4,
        practiceSessions: 5
      },
      storageEstimate: {
        supported: true,
        usageBytes: 2048,
        quotaBytes: 4096
      }
    });
  });
});

