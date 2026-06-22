"use client";

import { AlertTriangle, Pause, Play } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  loadRecordingArtifactDetails,
  RecordingArtifactError
} from "@/lib/recordings-review/artifact-service";
import type { RecordingArtifactDetails, ReviewRecording } from "@/lib/recordings-review/types";
import { RecordingWaveformPlaybackAdapter } from "@/lib/recordings-review/wavesurfer-adapter";

type ArtifactState =
  | { status: "idle"; details: null; message: null }
  | { status: "loading"; details: null; message: null }
  | { status: "ready"; details: RecordingArtifactDetails; message: null }
  | { status: "error"; details: null; message: string };

type RecordingArtifactReviewProps = {
  recording: ReviewRecording;
  actions?: ReactNode;
  adapterClassName: string;
  adapterTestId: string;
  derivedWaveformClassName: string;
  derivedWaveformTestId: string;
  errorTestId: string;
  peakHeightPx: number;
  playbackStatusTestId?: string;
  playAriaLabel: string;
  playText: string;
  pauseAriaLabel: string;
  pauseText: string;
  readyGapClassName?: string;
  sourceTestId: string;
  warningTestId: string;
  onPlaybackControlsChange?: (controls: RecordingPlaybackControls | null) => void;
  onPlaybackTimeChange?: (currentTimeMs: number) => void;
};

export type RecordingPlaybackControls = {
  recordingId: string;
  durationMs: number;
  getCurrentTimeMs: () => number;
  seekToMs: (timestampMs: number) => void;
};

export function RecordingArtifactReview({
  recording,
  actions = null,
  adapterClassName,
  adapterTestId,
  derivedWaveformClassName,
  derivedWaveformTestId,
  errorTestId,
  peakHeightPx,
  playbackStatusTestId,
  playAriaLabel,
  playText,
  pauseAriaLabel,
  pauseText,
  readyGapClassName = "grid gap-3",
  sourceTestId,
  warningTestId,
  onPlaybackControlsChange,
  onPlaybackTimeChange
}: RecordingArtifactReviewProps) {
  const adapter = useMemo(() => new RecordingWaveformPlaybackAdapter(), []);
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const [artifactState, setArtifactState] = useState<ArtifactState>({
    status: "idle",
    details: null,
    message: null
  });
  const [playbackState, setPlaybackState] = useState<"idle" | "playing">("idle");

  useEffect(() => {
    let cancelled = false;

    adapter.destroy();

    Promise.resolve()
      .then(() => {
        if (!cancelled) {
          setArtifactState({ status: "loading", details: null, message: null });
          setPlaybackState("idle");
        }

        return loadRecordingArtifactDetails(recording);
      })
      .then((details) => {
        if (!cancelled) {
          setArtifactState({ status: "ready", details, message: null });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setArtifactState({
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
    if (artifactState.status !== "ready" || !waveformRef.current || !recording.audioDataUrl) {
      onPlaybackControlsChange?.(null);
      return;
    }

    let cancelled = false;

    adapter
      .load(waveformRef.current, recording)
      .then(() => {
        if (!cancelled) {
          onPlaybackControlsChange?.({
            recordingId: recording.id,
            durationMs: recording.durationMs,
            getCurrentTimeMs: () => adapter.getCurrentTimeMs(),
            seekToMs: (timestampMs) => adapter.seekToMs(timestampMs)
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          onPlaybackControlsChange?.(null);
          setArtifactState({
            status: "error",
            details: null,
            message: "Waveform playback could not load this artifact."
          });
        }
      });

    return () => {
      cancelled = true;
      onPlaybackControlsChange?.(null);
    };
  }, [adapter, artifactState.status, onPlaybackControlsChange, recording]);

  useEffect(() => {
    if (!onPlaybackTimeChange) {
      return;
    }

    const handleTimeUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ recordingId?: string; currentTimeMs?: number }>).detail;

      if (detail?.recordingId === recording.id && typeof detail.currentTimeMs === "number") {
        onPlaybackTimeChange(detail.currentTimeMs);
      }
    };

    window.addEventListener("recordings-review:timeupdate", handleTimeUpdate);

    return () => {
      window.removeEventListener("recordings-review:timeupdate", handleTimeUpdate);
    };
  }, [onPlaybackTimeChange, recording.id]);

  async function togglePlayback() {
    if (playbackState === "playing") {
      adapter.pause();
      setPlaybackState("idle");
      return;
    }

    try {
      await adapter.play();
      setPlaybackState("playing");
    } catch (error) {
      setPlaybackState("idle");
      setArtifactState({
        status: "error",
        details: null,
        message: error instanceof Error ? error.message : "Playback failed."
      });
    }
  }

  return (
    <div className="grid gap-3">
      <div className="rounded-md border border-border bg-muted px-3 py-3">
        {artifactState.status === "loading" ? (
          <p role="status" className="text-sm font-medium">
            Loading recording artifact.
          </p>
        ) : null}
        {artifactState.status === "error" ? (
          <div role="alert" data-testid={errorTestId} className="flex items-start gap-2 text-sm font-medium text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{artifactState.message}</span>
          </div>
        ) : null}
        {artifactState.status === "ready" ? (
          <div className={readyGapClassName}>
            <div
              ref={waveformRef}
              data-testid={adapterTestId}
              className={adapterClassName}
            />
            <DerivedPeaks
              details={artifactState.details}
              maxHeightPx={peakHeightPx}
              testId={derivedWaveformTestId}
              className={derivedWaveformClassName}
            />
            <p data-testid={sourceTestId} className="text-xs font-medium text-muted-foreground">
              Waveform source: {artifactState.details.source === "decoded-audio" ? "decoded audio artifact" : "trusted peaks"}
            </p>
            {artifactState.details.durationWarning ? (
              <div
                role="status"
                data-testid={warningTestId}
                className="flex items-start gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-destructive"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{artifactState.details.durationWarning}</span>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          onClick={togglePlayback}
          disabled={artifactState.status !== "ready"}
          variant={playbackState === "playing" ? "secondary" : "default"}
          aria-label={playbackState === "playing" ? pauseAriaLabel : playAriaLabel}
        >
          {playbackState === "playing" ? (
            <Pause className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Play className="h-4 w-4" aria-hidden="true" />
          )}
          {playbackState === "playing" ? pauseText : playText}
        </Button>
        {actions}
      </div>
      {playbackState === "playing" && playbackStatusTestId ? (
        <p role="status" data-testid={playbackStatusTestId} className="text-sm font-medium">
          Playing recording.
        </p>
      ) : null}
    </div>
  );
}

function DerivedPeaks({
  details,
  maxHeightPx,
  testId,
  className
}: {
  details: RecordingArtifactDetails;
  maxHeightPx: number;
  testId: string;
  className: string;
}) {
  return (
    <div
      data-testid={testId}
      data-waveform-source={details.source}
      data-peak-count={details.peaks.length}
      className={className}
    >
      {details.peaks.map((peak, index) => (
        <span
          key={`${details.recordingId}-${index}`}
          className="w-full rounded-sm bg-accent"
          style={{ height: `${Math.max(8, peak * maxHeightPx)}px` }}
        />
      ))}
    </div>
  );
}
