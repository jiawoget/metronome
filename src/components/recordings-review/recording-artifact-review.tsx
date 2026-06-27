"use client";

/* eslint-disable react-hooks/refs */

import { AlertTriangle, Pause, Play } from "lucide-react";
import type { ReactNode } from "react";
import {
  useCallback,
  useEffect,
  type PointerEvent as ReactPointerEvent
} from "react";

import { Button } from "@/components/ui/button";
import {
  useRecordingArtifactReviewController,
  type RecordingArtifactReviewController
} from "@/lib/recordings-review/artifact-review-controller";
import type {
  RecordingArtifactDetails,
  ReviewRecording
} from "@/lib/recordings-review/types";
import { cn } from "@/lib/utils";

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
  onPlaybackControlsChange?: (
    controls: RecordingPlaybackControls | null
  ) => void;
  onPlaybackTimeChange?: (currentTimeMs: number) => void;
  controller?: RecordingArtifactReviewController;
};

export type RecordingPlaybackControls = {
  recordingId: string;
  durationMs: number;
  getCurrentTimeMs: () => number;
  seekToMs: (timestampMs: number) => RecordingSeekResult;
};

type RecordingSeekResult = {
  targetTimeMs: number;
  currentTimeMs: number;
};

export function RecordingArtifactReview(props: RecordingArtifactReviewProps) {
  if (props.controller) {
    return (
      <RecordingArtifactReviewContent
        {...props}
        controller={props.controller}
      />
    );
  }

  return <RecordingArtifactReviewWithDefaultController {...props} />;
}

function RecordingArtifactReviewWithDefaultController(
  props: RecordingArtifactReviewProps
) {
  const controller = useRecordingArtifactReviewController({
    recording: props.recording,
    onPlaybackTimeChange: props.onPlaybackTimeChange
  });

  return (
    <RecordingArtifactReviewContent
      {...props}
      controller={controller}
    />
  );
}

function RecordingArtifactReviewContent({
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
  controller
}: Omit<RecordingArtifactReviewProps, "controller"> & {
  controller: RecordingArtifactReviewController;
}) {
  const artifactState = controller.state;
  const { playbackState, isPlaybackReady, currentTimeMs } = controller;

  useEffect(() => {
    onPlaybackControlsChange?.(
      isPlaybackReady
        ? {
            recordingId: recording.id,
            durationMs: recording.durationMs,
            getCurrentTimeMs: controller.controls.getCurrentTimeMs,
            seekToMs: (timestampMs) => {
              const ratio =
                recording.durationMs > 0
                  ? timestampMs / recording.durationMs
                  : 0;

              controller.controls.seekToRatio(ratio);

              return {
                targetTimeMs: timestampMs,
                currentTimeMs: controller.controls.getCurrentTimeMs()
              };
            }
          }
        : null
    );

    return () => onPlaybackControlsChange?.(null);
  }, [
    controller.controls,
    isPlaybackReady,
    onPlaybackControlsChange,
    recording.durationMs,
    recording.id
  ]);

  const seekWaveformToClientX = useCallback(
    (clientX: number, element: HTMLElement) => {
      if (artifactState.status !== "ready" || !isPlaybackReady) {
        return;
      }

      const bounds = element.getBoundingClientRect();
      const ratio =
        bounds.width > 0 ? (clientX - bounds.left) / bounds.width : 0;
      controller.controls.seekToRatio(ratio);
    },
    [artifactState.status, controller.controls, isPlaybackReady]
  );

  async function togglePlayback() {
    if (playbackState === "playing") {
      controller.controls.pause();
      return;
    }

    await controller.controls.play();
  }

  function handleWaveformPointerDown(event: ReactPointerEvent<HTMLElement>) {
    event.preventDefault();
    seekWaveformToClientX(event.clientX, event.currentTarget);
  }

  return (
    <div className="grid gap-3">
      <div className="border-border bg-muted rounded-md border px-3 py-3">
        {artifactState.status === "loading" ? (
          <p role="status" className="text-sm font-medium">
            Loading recording artifact.
          </p>
        ) : null}
        {artifactState.status === "error" ? (
          <div
            role="alert"
            data-testid={errorTestId}
            className="text-destructive flex items-start gap-2 text-sm font-medium"
          >
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            <span>{artifactState.message}</span>
          </div>
        ) : null}
        {artifactState.status === "ready" ? (
          <div className={readyGapClassName}>
            <div className="relative">
              <div
                ref={controller.setWaveformElement}
                data-testid={adapterTestId}
                data-playback-ready={isPlaybackReady ? "true" : "false"}
                data-current-time-ms={currentTimeMs}
                className={cn(adapterClassName, "cursor-pointer")}
              />
              <button
                type="button"
                aria-label="Seek waveform playback"
                data-testid={`${adapterTestId}-seek-surface`}
                className="absolute inset-0 z-10 cursor-pointer rounded-md bg-transparent"
                onPointerDown={handleWaveformPointerDown}
              />
            </div>
            <DerivedPeaks
              details={artifactState.details}
              maxHeightPx={peakHeightPx}
              testId={derivedWaveformTestId}
              className={derivedWaveformClassName}
            />
            <p
              data-testid={sourceTestId}
              data-recording-id={artifactState.details.recordingId}
              className="text-muted-foreground text-xs font-medium"
            >
              Waveform source:{" "}
              {artifactState.details.source === "decoded-audio"
                ? "decoded audio artifact"
                : "trusted peaks"}
            </p>
            {artifactState.details.durationWarning ? (
              <div
                role="status"
                data-testid={warningTestId}
                className="border-border bg-background text-destructive flex items-start gap-2 rounded-md border px-3 py-2 text-sm font-medium"
              >
                <AlertTriangle
                  className="mt-0.5 h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
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
          aria-label={
            playbackState === "playing" ? pauseAriaLabel : playAriaLabel
          }
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
        <p
          role="status"
          data-testid={playbackStatusTestId}
          className="text-sm font-medium"
        >
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
      data-recording-id={details.recordingId}
      data-waveform-source={details.source}
      data-peak-count={details.peaks.length}
      className={className}
    >
      {details.peaks.map((peak, index) => (
        <span
          key={`${details.recordingId}-${index}`}
          className="bg-accent w-full rounded-sm"
          style={{ height: `${Math.max(8, peak * maxHeightPx)}px` }}
        />
      ))}
    </div>
  );
}
