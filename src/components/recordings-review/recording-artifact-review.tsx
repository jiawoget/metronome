"use client";

import { AlertTriangle, Pause, Play } from "lucide-react";
import type { ReactNode } from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent
} from "react";

import { Button } from "@/components/ui/button";
import {
  loadRecordingArtifactDetails,
  RecordingArtifactError
} from "@/lib/recordings-review/artifact-service";
import type {
  RecordingArtifactDetails,
  ReviewRecording
} from "@/lib/recordings-review/types";
import { RecordingWaveformPlaybackAdapter } from "@/lib/recordings-review/wavesurfer-adapter";
import { cn } from "@/lib/utils";

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
  onPlaybackControlsChange?: (
    controls: RecordingPlaybackControls | null
  ) => void;
  onPlaybackTimeChange?: (currentTimeMs: number) => void;
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
  const [playbackState, setPlaybackState] = useState<"idle" | "playing">(
    "idle"
  );
  const [isPlaybackReady, setIsPlaybackReady] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);

  useEffect(() => {
    let cancelled = false;

    adapter.destroy();

    Promise.resolve()
      .then(() => {
        if (!cancelled) {
          setArtifactState({ status: "loading", details: null, message: null });
          setPlaybackState("idle");
          setIsPlaybackReady(false);
          setCurrentTimeMs(0);
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
    if (
      artifactState.status !== "ready" ||
      !waveformRef.current ||
      !recording.audioDataUrl
    ) {
      onPlaybackControlsChange?.(null);
      setIsPlaybackReady(false);
      return;
    }

    let cancelled = false;

    adapter
      .load(waveformRef.current, recording)
      .then(() => {
        if (!cancelled) {
          setIsPlaybackReady(true);
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
          setIsPlaybackReady(false);
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
      setIsPlaybackReady(false);
      onPlaybackControlsChange?.(null);
    };
  }, [adapter, artifactState.status, onPlaybackControlsChange, recording]);

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

  const seekWaveformToClientX = useCallback(
    (clientX: number, element: HTMLElement) => {
      if (artifactState.status !== "ready" || !isPlaybackReady) {
        return;
      }

      const bounds = element.getBoundingClientRect();
      const ratio =
        bounds.width > 0 ? (clientX - bounds.left) / bounds.width : 0;
      const targetTimeMs = Math.max(
        0,
        Math.min(recording.durationMs, Math.round(ratio * recording.durationMs))
      );

      try {
        const result = adapter.seekToMs(targetTimeMs);

        setCurrentTimeMs(result.currentTimeMs);
      } catch {
        onPlaybackControlsChange?.(null);
      }
    },
    [
      adapter,
      artifactState.status,
      isPlaybackReady,
      onPlaybackControlsChange,
      recording.durationMs
    ]
  );

  useEffect(() => {
    const element = waveformRef.current;

    if (!element || artifactState.status !== "ready" || !isPlaybackReady) {
      return;
    }

    const handleNativeWaveformPointerDown = (event: PointerEvent) => {
      seekWaveformToClientX(event.clientX, element);
    };

    const handleNativeWaveformClick = (event: MouseEvent) => {
      seekWaveformToClientX(event.clientX, element);
    };

    element.addEventListener(
      "pointerdown",
      handleNativeWaveformPointerDown,
      true
    );
    element.addEventListener("click", handleNativeWaveformClick, true);

    return () => {
      element.removeEventListener(
        "pointerdown",
        handleNativeWaveformPointerDown,
        true
      );
      element.removeEventListener("click", handleNativeWaveformClick, true);
    };
  }, [artifactState.status, isPlaybackReady, seekWaveformToClientX]);

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

  function handleWaveformClick(event: ReactMouseEvent<HTMLElement>) {
    seekWaveformToClientX(event.clientX, event.currentTarget);
  }

  function handleWaveformPointerDown(event: ReactPointerEvent<HTMLElement>) {
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
                ref={waveformRef}
                data-testid={adapterTestId}
                data-playback-ready={isPlaybackReady ? "true" : "false"}
                data-current-time-ms={currentTimeMs}
                className={cn(adapterClassName, "cursor-pointer")}
                onPointerDownCapture={handleWaveformPointerDown}
                onClickCapture={handleWaveformClick}
              />
              <button
                type="button"
                aria-label="Seek waveform playback"
                data-testid={`${adapterTestId}-seek-surface`}
                className="absolute inset-0 z-10 cursor-pointer rounded-md bg-transparent"
                onPointerDown={handleWaveformPointerDown}
                onClick={handleWaveformClick}
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
