"use client";

import { mapPermissionState, type BrowserStorageEstimate } from "@/domain/settings";
import { sheetLibraryRepository } from "@/infrastructure/files/sheet-library-repository";
import { practiceSessionRepository } from "@/infrastructure/db/practice-session-repository";
import { referenceRepository } from "@/infrastructure/reference/reference-repository";
import { recordingHistoryRepository } from "@/lib/recordings-review/repository";
import {
  browserSettingsRepository,
  browserSettingsService
} from "@/infrastructure/db/browser-settings-service";
import {
  createLocalDataCleanupService,
  createStorageSummaryService,
  type PermissionStatusService
} from "@/services/settings";

export const browserStorageSummaryService = createStorageSummaryService({
  async getCounts() {
    const [sheets, references, practiceSessions] = await Promise.all([
      sheetLibraryRepository.listSheets(),
      referenceRepository.countAllReferences(),
      practiceSessionRepository.listSessions()
    ]);
    const recordingSnapshot = recordingHistoryRepository.getSnapshot();

    return {
      sheets: sheets.length,
      recordings: recordingSnapshot.recordings.length,
      references,
      errorMarkers: recordingSnapshot.errorMarkers.length,
      practiceSessions: practiceSessions.length + recordingSnapshot.sessions.length
    };
  },

  async getStorageEstimate(): Promise<BrowserStorageEstimate> {
    if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
      return {
        supported: false,
        message: "Storage estimate is not available in this browser."
      };
    }

    const estimate = await navigator.storage.estimate();

    return {
      supported: true,
      usageBytes: Math.max(0, Math.round(estimate.usage ?? 0)),
      quotaBytes: typeof estimate.quota === "number" ? Math.max(0, Math.round(estimate.quota)) : null
    };
  }
});

export const browserLocalDataCleanupService = createLocalDataCleanupService({
  async clearLocalData() {
    await Promise.all([
      sheetLibraryRepository.clear(),
      referenceRepository.clear(),
      practiceSessionRepository.clear()
    ]);
    recordingHistoryRepository.clear();
    await browserSettingsRepository.clearSettings();
    await browserSettingsService.resetToDefaults();
  }
});

export const browserMicrophonePermissionService: PermissionStatusService = {
  async getMicrophonePermissionStatus() {
    if (typeof navigator === "undefined" || !navigator.permissions?.query) {
      return "unsupported";
    }

    try {
      const status = await navigator.permissions.query({ name: "microphone" as PermissionName });

      return mapPermissionState(status.state);
    } catch {
      return "unknown";
    }
  }
};

