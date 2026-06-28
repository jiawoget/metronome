"use client";

import { useEffect, useMemo, useState } from "react";

import { loadRecordingArtifactDetails } from "@/lib/recordings-review/artifact-details";
import { RecordingArtifactError } from "@/lib/recordings-review/artifact-model";
import { resolveRecordingArtifactBody } from "@/lib/recordings-review/artifact-storage";
import type {
  RecordingArtifactDetails,
  ReviewRecording
} from "@/lib/recordings-review/types";
import { RecordingWaveformPlaybackAdapter } from "@/lib/recordings-review/wavesurfer-adapter";

export type ArtifactReviewState =
  | { status: "idle"; details: null; message: null }
  | { status: "loading"; details: null; message: null }
  | { status: "ready"; details: RecordingArtifactDetails; message: null }
  | { status: "error"; details: null; message: string };

export type RecordingArtifactReviewController = {
  state: ArtifactReviewState;
  playbackState: "idle" | "playing";
  isPlaybackReady: boolean;
  currentTimeMs: number;
  setWaveformElement: (element: HTMLDivElement | null) => void;
  controls: {
    play: () => Promise<void>;
    pause: () => void;
    seekToRatio: (ratio: number) => void;
    getCurrentTimeMs: () => number;
  };
};

export type UseRecordingArtifactReviewControllerInput = {
  recording: ReviewRecording;
  onPlaybackTimeChange?: (currentTimeMs: number) => void;
};

export type UseRecordingArtifactReviewController = (
  input: UseRecordingArtifactReviewControllerInput
) => RecordingArtifactReviewController;

export function useRecordingArtifactReviewController({
  recording,
  onPlaybackTimeChange
}: UseRecordingArtifactReviewControllerInput): RecordingArtifactReviewController {
  const adapter = useMemo(() => new RecordingWaveformPlaybackAdapter(), []);
  const [waveformElement, setWaveformElement] = useState<HTMLDivElement | null>(
    null
  );
  const [state, setState] = useState<ArtifactReviewState>({
    status: "idle",
    details: null,
    message: null
  });
  const [playbackState, setPlaybackState] = useState<"idle" | "playing">(
    "idle"
  );
  const [isPlaybackReady, setIsPlaybackReady] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [artifactBlob, setArtifactBlob] = useState<Blob | null>(null);

  useEffect(() => {
    let cancelled = false;

    adapter.destroy();

    Promise.resolve()
      .then(() => {
        if (!cancelled) {
          setArtifactBlob(null);
          setState({ status: "loading", details: null, message: null });
          setPlaybackState("idle");
          setIsPlaybackReady(false);
          setCurrentTimeMs(0);
        }

        return Promise.all([
          loadRecordingArtifactDetails(recording),
          resolveRecordingArtifactBody(recording)
        ]);
      })
      .then(([details, artifactBody]) => {
        if (!cancelled) {
          setArtifactBlob(artifactBody.blob);
          setState({ status: "ready", details, message: null });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setState({
            status: "error",
            details: null,
            message:
              error instanceof RecordingArtifactError || error instanceof Error
                ? error.message
                : "Recording artifact could not be loaded."
          });
        }
      });

    return () => {
      cancelled = true;
      adapter.destroy();
    };
  }, [adapter, recording]);

  useEffect(() => {
    if (state.status !== "ready" || !waveformElement || !artifactBlob) {
      return;
    }

    let cancelled = false;

    adapter
      .load(waveformElement, recording, artifactBlob)
      .then(() => {
        if (!cancelled) {
          setIsPlaybackReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsPlaybackReady(false);
          setState({
            status: "error",
            details: null,
            message: "Waveform playback could not load this artifact."
          });
        }
      });

    return () => {
      cancelled = true;
      setIsPlaybackReady(false);
    };
  }, [adapter, artifactBlob, recording, state.status, waveformElement]);

  useEffect(() => {
    const handleTimeUpdate = (event: Event) => {
      const detail = (
        event as CustomEvent<{ recordingId?: string; currentTimeMs?: number }>
      ).detail;

      if (
        detail?.recordingId === recording.id &&
        typeof detail.currentTimeMs === "number"
      ) {
        setCurrentTimeMs(detail.currentTimeMs);
        onPlaybackTimeChange?.(detail.currentTimeMs);
      }
    };

    window.addEventListener("recordings-review:timeupdate", handleTimeUpdate);

    return () => {
      window.removeEventListener(
        "recordings-review:timeupdate",
        handleTimeUpdate
      );
    };
  }, [onPlaybackTimeChange, recording.id]);

  const controls = useMemo(
    () => ({
      async play() {
        try {
          await adapter.play();
          setPlaybackState("playing");
        } catch (error) {
          setPlaybackState("idle");
          setState({
            status: "error",
            details: null,
            message: error instanceof Error ? error.message : "Playback failed."
          });
        }
      },
      pause() {
        adapter.pause();
        setPlaybackState("idle");
      },
      seekToRatio(ratio: number) {
        if (state.status !== "ready" || !isPlaybackReady) {
          return;
        }

        const clampedRatio = Math.max(0, Math.min(1, ratio));
        const targetTimeMs = Math.round(clampedRatio * recording.durationMs);

        try {
          const result = adapter.seekToMs(targetTimeMs);

          setCurrentTimeMs(result.currentTimeMs);
          onPlaybackTimeChange?.(result.currentTimeMs);
        } catch {
          setIsPlaybackReady(false);
        }
      },
      getCurrentTimeMs() {
        return adapter.getCurrentTimeMs();
      }
    }),
    [
      adapter,
      isPlaybackReady,
      onPlaybackTimeChange,
      recording.durationMs,
      state.status
    ]
  );

  return {
    state,
    playbackState,
    isPlaybackReady,
    currentTimeMs,
    setWaveformElement,
    controls
  };
}
