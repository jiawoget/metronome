import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SettingsExperience } from "@/components/settings/settings-experience";
import {
  DEFAULT_USER_SETTINGS,
  type LocalDataSummary,
  type MicrophonePermissionStatus,
  type UserSettings
} from "@/domain/settings";
import { createUserSettingsService, type SettingsRepository } from "@/services/settings";

function createMemorySettingsRepository(initialSettings: UserSettings): SettingsRepository {
  let settings: UserSettings | null = initialSettings;

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

function createSummary(counts: LocalDataSummary["counts"]): LocalDataSummary {
  return {
    counts,
    storageEstimate: {
      supported: false,
      message: "Storage estimate is not available in this browser."
    }
  };
}

const seededSummary = createSummary({
  sheets: 2,
  recordings: 3,
  references: 4,
  errorMarkers: 5,
  practiceSessions: 6
});

const emptySummary = createSummary({
  sheets: 0,
  recordings: 0,
  references: 0,
  errorMarkers: 0,
  practiceSessions: 0
});

afterEach(() => {
  cleanup();
});

describe("SettingsExperience", () => {
  it("renders persisted settings, saves edits, and shows local data summary", async () => {
    const settingsService = createUserSettingsService(
      createMemorySettingsRepository({
        defaultBpm: 132,
        defaultTimeSignature: "3/4",
        defaultSubdivision: "eighth",
        metronomeVolume: 64,
        referenceDefaultVolume: 72
      })
    );
    const storageSummaryService = {
      getSummary: vi.fn(async () => seededSummary)
    };

    render(
      <SettingsExperience
        settingsService={settingsService}
        storageSummaryService={storageSummaryService}
        cleanupService={{ clearAllLocalData: vi.fn() }}
        permissionService={{
          getMicrophonePermissionStatus: vi.fn(async (): Promise<MicrophonePermissionStatus> => "denied")
        }}
      />
    );

    await expect(screen.findByDisplayValue("132")).resolves.toBeVisible();
    expect(screen.getByTestId("settings-time-signature")).toHaveValue("3/4");
    expect(screen.getByTestId("settings-subdivision")).toHaveValue("eighth");
    expect(screen.getByTestId("settings-metronome-volume")).toHaveTextContent("64");
    expect(screen.getByTestId("settings-reference-volume")).toHaveTextContent("72");
    expect(screen.getByTestId("settings-microphone-status")).toHaveTextContent("denied");
    expect(screen.getByTestId("settings-count-sheets")).toHaveTextContent("2");
    expect(screen.getByTestId("settings-count-recordings")).toHaveTextContent("3");
    expect(screen.getByTestId("settings-count-references")).toHaveTextContent("4");
    expect(screen.getByTestId("settings-count-markers")).toHaveTextContent("5");
    expect(screen.getByTestId("settings-count-sessions")).toHaveTextContent("6");
    expect(screen.getByTestId("settings-storage-estimate")).toHaveTextContent("not available");

    const bpmInput = screen.getByTestId("settings-default-bpm");

    fireEvent.change(bpmInput, { target: { value: "144" } });
    fireEvent.blur(bpmInput);
    await waitFor(() => expect(screen.getByDisplayValue("144")).toBeVisible());

    await userEvent.selectOptions(screen.getByTestId("settings-time-signature"), "6/8");
    await userEvent.selectOptions(screen.getByTestId("settings-subdivision"), "triplet");
    fireEvent.change(screen.getByLabelText("Metronome volume"), { target: { value: "55" } });
    fireEvent.change(screen.getByLabelText("Reference default volume"), { target: { value: "45" } });

    await waitFor(async () => {
      await expect(settingsService.getSettings()).resolves.toMatchObject({
        defaultBpm: 144,
        defaultTimeSignature: "6/8",
        defaultSubdivision: "triplet",
        metronomeVolume: 55,
        referenceDefaultVolume: 45
      });
    });
  });

  it("cancels cleanup without side effects and confirms cleanup with default reset", async () => {
    const user = userEvent.setup();
    let summary = seededSummary;
    const settingsService = createUserSettingsService(
      createMemorySettingsRepository({
        defaultBpm: 150,
        defaultTimeSignature: "6/8",
        defaultSubdivision: "sixteenth",
        metronomeVolume: 35,
        referenceDefaultVolume: 40
      })
    );
    const clearAllLocalData = vi.fn(async () => {
      summary = emptySummary;
      await settingsService.resetToDefaults();
    });

    render(
      <SettingsExperience
        settingsService={settingsService}
        storageSummaryService={{ getSummary: vi.fn(async () => summary) }}
        cleanupService={{ clearAllLocalData }}
        permissionService={{
          getMicrophonePermissionStatus: vi.fn(async (): Promise<MicrophonePermissionStatus> => "prompt")
        }}
      />
    );

    await expect(screen.findByDisplayValue("150")).resolves.toBeVisible();

    await user.click(screen.getByRole("button", { name: "Clear All Local Data" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(clearAllLocalData).not.toHaveBeenCalled();
    expect(screen.getByTestId("settings-count-sheets")).toHaveTextContent("2");

    await user.click(screen.getByRole("button", { name: "Clear All Local Data" }));
    await user.click(screen.getByRole("button", { name: "Confirm clear local data" }));

    await waitFor(() => expect(clearAllLocalData).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByTestId("settings-count-sheets")).toHaveTextContent("0"));
    expect(screen.getByDisplayValue(String(DEFAULT_USER_SETTINGS.defaultBpm))).toBeVisible();
    await expect(settingsService.getSettings()).resolves.toEqual(DEFAULT_USER_SETTINGS);
  });

  it("shows cleanup failure without hiding the error state", async () => {
    const user = userEvent.setup();

    render(
      <SettingsExperience
        settingsService={createUserSettingsService(createMemorySettingsRepository(DEFAULT_USER_SETTINGS))}
        storageSummaryService={{ getSummary: vi.fn(async () => emptySummary) }}
        cleanupService={{
          clearAllLocalData: vi.fn(async () => {
            throw new Error("failed");
          })
        }}
        permissionService={{
          getMicrophonePermissionStatus: vi.fn(async (): Promise<MicrophonePermissionStatus> => "unknown")
        }}
      />
    );

    await expect(screen.findByDisplayValue(String(DEFAULT_USER_SETTINGS.defaultBpm))).resolves.toBeVisible();
    await user.click(screen.getByRole("button", { name: "Clear All Local Data" }));
    await user.click(screen.getByRole("button", { name: "Confirm clear local data" }));

    expect(await screen.findByTestId("settings-cleanup-error")).toHaveTextContent("cleanup failed");
  });
});
