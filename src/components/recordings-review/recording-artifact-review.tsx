"use client";

import { AlertTriangle, Pause, Play } from "lucide-react";
import type { ReactNode } from "react";
import {
  useCallback,
  useEffect,
  useRef,
  type MouseEvent as ReactMouseEvent,
  type KeyboardEvent as ReactKeyboardEvent,
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
  const reviewState = controller.state;
  const { playbackState, isPlaybackReady, currentTimeMs } = controller;
  const ignoreNextClickRef = useRef(false);
  const canUsePlayback = reviewState.status === "ready" && isPlaybackReady;

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
      if (!canUsePlayback) {
        return;
      }

      const bounds = element.getBoundingClientRect();
      const ratio =
        bounds.width > 0 ? (clientX - bounds.left) / bounds.width : 0;
      controller.controls.seekToRatio(ratio);
    },
    [canUsePlayback, controller.controls]
  );

  const seekWaveformToRatio = useCallback(
    (ratio: number) => {
      if (!canUsePlayback) {
        return;
      }

      controller.controls.seekToRatio(ratio);
    },
    [canUsePlayback, controller.controls]
  );

  const setWaveformElement = useCallback(
    (element: HTMLDivElement | null) => {
      controller.setWaveformElement(element);
    },
    [controller]
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
    ignoreNextClickRef.current = true;
    seekWaveformToClientX(event.clientX, event.currentTarget);
  }

  function handleWaveformClick(event: ReactMouseEvent<HTMLElement>) {
    if (ignoreNextClickRef.current) {
      ignoreNextClickRef.current = false;
      return;
    }

    if (event.detail === 0) {
      return;
    }

    seekWaveformToClientX(event.clientX, event.currentTarget);
  }

  function handleWaveformKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    seekWaveformToRatio(0.5);
  }

  return (
    <div className="grid gap-3">
      <div className="border-border bg-muted rounded-md border px-3 py-3">
        {reviewState.status === "loading" ? (
          <p role="status" className="text-sm font-medium">
            Loading recording artifact.
          </p>
        ) : null}
        {reviewState.status === "error" ? (
          <div
            role="alert"
            data-testid={errorTestId}
            className="text-destructive flex items-start gap-2 text-sm font-medium"
          >
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            <span>{reviewState.message}</span>
          </div>
        ) : null}
        {reviewState.status === "ready" ? (
          <div className={readyGapClassName}>
            <div className="relative">
              <div
                ref={setWaveformElement}
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
                onClick={handleWaveformClick}
                onKeyDown={handleWaveformKeyDown}
              />
            </div>
            {!isPlaybackReady ? (
              <p role="status" className="text-sm font-medium">
                Preparing waveform playback.
              </p>
            ) : null}
            <DerivedPeaks
              details={reviewState.details}
              maxHeightPx={peakHeightPx}
              testId={derivedWaveformTestId}
              className={derivedWaveformClassName}
            />
            <p
              data-testid={sourceTestId}
              data-recording-id={reviewState.details.recordingId}
              className="text-muted-foreground text-xs font-medium"
            >
              Waveform source:{" "}
              {reviewState.details.source === "decoded-audio"
                ? "decoded audio artifact"
                : "trusted peaks"}
            </p>
            {reviewState.details.durationWarning ? (
              <div
                role="status"
                data-testid={warningTestId}
                className="border-border bg-background text-destructive flex items-start gap-2 rounded-md border px-3 py-2 text-sm font-medium"
              >
                <AlertTriangle
                  className="mt-0.5 h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
                <span>{reviewState.details.durationWarning}</span>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          onClick={togglePlayback}
          disabled={!canUsePlayback}
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
