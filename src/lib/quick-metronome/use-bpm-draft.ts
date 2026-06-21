"use client";

import { useCallback, useState } from "react";

import { commitBpmDraft, stepBpm } from "@/lib/quick-metronome/control";

export type MetronomeBpmDraftController = {
  bpmDraft: string;
  setBpmDraft: (value: string) => void;
  commitBpmInput: () => void;
  stepBpmInput: (direction: -1 | 1) => void;
};

export function useMetronomeBpmDraft(
  bpm: number,
  onBpmChange: (nextBpm: number) => void
): MetronomeBpmDraftController {
  const [draftState, setDraftState] = useState({
    sourceBpm: bpm,
    value: String(bpm)
  });
  const bpmDraft = draftState.sourceBpm === bpm ? draftState.value : String(bpm);
  const setBpmDraft = useCallback(
    (value: string) => {
      setDraftState({ sourceBpm: bpm, value });
    },
    [bpm]
  );

  const commitBpmInput = useCallback(() => {
    const nextBpm = commitBpmDraft(bpmDraft, bpm);

    onBpmChange(nextBpm);
    setDraftState({ sourceBpm: nextBpm, value: String(nextBpm) });
  }, [bpm, bpmDraft, onBpmChange]);

  const stepBpmInput = useCallback(
    (direction: -1 | 1) => {
      const committedDraftBpm = commitBpmDraft(bpmDraft, bpm);
      const nextBpm = stepBpm(committedDraftBpm, direction);

      onBpmChange(nextBpm);
      setDraftState({ sourceBpm: nextBpm, value: String(nextBpm) });
    },
    [bpm, bpmDraft, onBpmChange]
  );

  return {
    bpmDraft,
    setBpmDraft,
    commitBpmInput,
    stepBpmInput
  };
}
