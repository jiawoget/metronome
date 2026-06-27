import { useCallback, useState } from "react";

import { clampBpm } from "@/lib/quick-metronome/control";
import type { MetronomeSettings } from "@/lib/quick-metronome/types";
import { useMetronomeBpmDraft } from "@/lib/quick-metronome/use-bpm-draft";

export function useMetronomeSettingsState(
  initialSettings: MetronomeSettings
) {
  const [settings, setSettings] =
    useState<MetronomeSettings>(initialSettings);
  const updateSettings = useCallback(
    (nextSettings: Partial<MetronomeSettings>) => {
      setSettings((currentSettings) => ({
        ...currentSettings,
        ...nextSettings,
        bpm:
          nextSettings.bpm === undefined
            ? currentSettings.bpm
            : clampBpm(nextSettings.bpm)
      }));
    },
    []
  );
  const { bpmDraft, setBpmDraft, commitBpmInput, stepBpmInput } =
    useMetronomeBpmDraft(settings.bpm, (nextBpm) =>
      updateSettings({ bpm: nextBpm })
    );

  return {
    settings,
    bpmDraft,
    setBpmDraft,
    commitBpmInput,
    stepBpmInput,
    updateSettings
  };
}
