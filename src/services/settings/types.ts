import type {
  BrowserStorageEstimate,
  LocalDataCounts,
  LocalDataSummary,
  MicrophonePermissionStatus,
  UserSettings
} from "@/domain/settings";

export type SettingsRepository = {
  getSettings: () => Promise<UserSettings | null>;
  saveSettings: (settings: UserSettings) => Promise<void>;
  clearSettings: () => Promise<void>;
};

export type UserSettingsService = {
  getSettings: () => Promise<UserSettings>;
  updateSettings: (patch: Partial<UserSettings>) => Promise<UserSettings>;
  resetToDefaults: () => Promise<UserSettings>;
};

export type PermissionStatusService = {
  getMicrophonePermissionStatus: () => Promise<MicrophonePermissionStatus>;
};

export type StorageSummarySource = {
  getCounts: () => Promise<LocalDataCounts>;
  getStorageEstimate: () => Promise<BrowserStorageEstimate>;
};

export type StorageSummaryService = {
  getSummary: () => Promise<LocalDataSummary>;
};

export type LocalDataCleanupSource = {
  clearLocalData: () => Promise<void>;
};

export type LocalDataCleanupService = {
  clearAllLocalData: () => Promise<void>;
};

