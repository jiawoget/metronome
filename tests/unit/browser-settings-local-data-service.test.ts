import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  browserSettingsRepository: {
    clearSettings: vi.fn()
  },
  browserSettingsService: {
    resetToDefaults: vi.fn()
  },
  practiceSessionRepository: {
    clear: vi.fn(),
    listSessions: vi.fn()
  },
  recordingArtifactRepository: {
    clear: vi.fn()
  },
  recordingHistoryRepository: {
    clear: vi.fn(),
    getSnapshot: vi.fn()
  },
  referenceRepository: {
    clear: vi.fn(),
    countAllReferences: vi.fn()
  },
  sheetLibraryRepository: {
    clear: vi.fn(),
    listSheets: vi.fn()
  }
}));

vi.mock("@/infrastructure/db/browser-settings-service", () => ({
  browserSettingsRepository: mocks.browserSettingsRepository,
  browserSettingsService: mocks.browserSettingsService
}));

vi.mock("@/infrastructure/db/practice-session-repository", () => ({
  practiceSessionRepository: mocks.practiceSessionRepository
}));

vi.mock("@/infrastructure/db/recording-artifact-repository", () => ({
  recordingArtifactRepository: mocks.recordingArtifactRepository
}));

vi.mock("@/infrastructure/files/sheet-library-repository", () => ({
  sheetLibraryRepository: mocks.sheetLibraryRepository
}));

vi.mock("@/infrastructure/reference/reference-repository", () => ({
  referenceRepository: mocks.referenceRepository
}));

vi.mock("@/lib/recordings-review/repository", () => ({
  recordingHistoryRepository: mocks.recordingHistoryRepository
}));

import { browserLocalDataCleanupService } from "@/infrastructure/db/browser-settings-local-data-service";

describe("browser local data cleanup service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.browserSettingsRepository.clearSettings.mockResolvedValue(undefined);
    mocks.browserSettingsService.resetToDefaults.mockResolvedValue(undefined);
    mocks.practiceSessionRepository.clear.mockResolvedValue(undefined);
    mocks.practiceSessionRepository.listSessions.mockResolvedValue([]);
    mocks.recordingArtifactRepository.clear.mockResolvedValue(undefined);
    mocks.recordingHistoryRepository.clear.mockReturnValue(undefined);
    mocks.recordingHistoryRepository.getSnapshot.mockReturnValue({
      sessions: [],
      recordings: [],
      errorMarkers: []
    });
    mocks.referenceRepository.clear.mockResolvedValue(undefined);
    mocks.referenceRepository.countAllReferences.mockResolvedValue(0);
    mocks.sheetLibraryRepository.clear.mockResolvedValue(undefined);
    mocks.sheetLibraryRepository.listSheets.mockResolvedValue([]);
  });

  it("does not clear recording artifacts when recording metadata clear fails", async () => {
    mocks.recordingHistoryRepository.clear.mockImplementationOnce(() => {
      throw new Error("metadata clear failed");
    });

    await expect(
      browserLocalDataCleanupService.clearAllLocalData()
    ).rejects.toThrow("metadata clear failed");

    expect(mocks.recordingArtifactRepository.clear).not.toHaveBeenCalled();
    expect(mocks.browserSettingsRepository.clearSettings).not.toHaveBeenCalled();
    expect(mocks.browserSettingsService.resetToDefaults).not.toHaveBeenCalled();
  });

  it("reports artifact cleanup failure after metadata clear succeeds", async () => {
    mocks.recordingArtifactRepository.clear.mockRejectedValueOnce(
      new Error("artifact clear failed")
    );

    await expect(
      browserLocalDataCleanupService.clearAllLocalData()
    ).rejects.toThrow("partial storage cleanup failures");

    expect(mocks.recordingHistoryRepository.clear).toHaveBeenCalledOnce();
    expect(mocks.recordingArtifactRepository.clear).toHaveBeenCalledOnce();
    expect(
      mocks.recordingHistoryRepository.clear.mock.invocationCallOrder[0]
    ).toBeLessThan(
      mocks.recordingArtifactRepository.clear.mock.invocationCallOrder[0]
    );
    expect(mocks.browserSettingsRepository.clearSettings).toHaveBeenCalledOnce();
    expect(mocks.browserSettingsService.resetToDefaults).toHaveBeenCalledOnce();
  });
});
