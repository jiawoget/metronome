"use client";

import { AlertTriangle, Pause, Play } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  loadRecordingArtifactDetails,
  RecordingArtifactError
} from "@/lib/recordings-review/artifact-service";
import { formatDuration } from "@/lib/recordings-review/format";
import { getRecordingDisplayName } from "@/lib/recordings-review/history";
import type { RecordingArtifactDetails, ReviewRecording } from "@/lib/recordings-review/types";
import { RecordingWaveformPlaybackAdapter } from "@/lib/recordings-review/wavesurfer-adapter";

type ArtifactState =
  | { status: "idle"; details: null; message: null }
  | { status: "loading"; details: null; message: null }
  | { status: "ready"; details: RecordingArtifactDetails; message: null }
  | { status: "error"; details: null; message: string };

export function LatestSheetRecording({ recording }: { recording: ReviewRecording | null }) {
  if (!recording) {
    return (
      <div data-testid="sheet-latest-recording-empty" className="rounded-md border border-dashed border-border bg-muted px-3 py-3 text-sm text-muted-foreground">
        No sheet recording saved for this sheet yet.
      </div>
    );
  }

  return <LatestSheetRecordingLoaded key={recording.id} recording={recording} />;
}

function LatestSheetRecordingLoaded({ recording }: { recording: ReviewRecording }) {
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
    if (artifactState.status !== "ready" || !waveformRef.current || !recording?.audioDataUrl) {
      return;
    }

    let cancelled = false;

    adapter.load(waveformRef.current, recording).catch(() => {
      if (!cancelled) {
        setArtifactState({
          status: "error",
          details: null,
          message: "Waveform playback could not load this artifact."
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [adapter, artifactState.status, recording]);

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
    <div data-testid="sheet-latest-recording" className="grid gap-3 rounded-md border border-border bg-muted px-3 py-3">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
          Latest sheet take
        </p>
        <p data-testid="sheet-latest-recording-name" className="mt-1 truncate text-sm font-semibold">
          {getRecordingDisplayName(recording)}
        </p>
        <p data-testid="sheet-latest-recording-duration" className="text-xs text-muted-foreground">
          {formatDuration(recording.durationMs)} | {recording.settings.bpm} BPM | {recording.settings.timeSignature}
        </p>
      </div>

      {artifactState.status === "loading" ? (
        <p role="status" className="text-sm font-medium">
          Loading recording artifact.
        </p>
      ) : null}
      {artifactState.status === "error" ? (
        <div role="alert" data-testid="sheet-recording-artifact-error" className="flex items-start gap-2 text-sm font-medium text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{artifactState.message}</span>
        </div>
      ) : null}
      {artifactState.status === "ready" ? (
        <div className="grid gap-2">
          <div
            ref={waveformRef}
            data-testid="sheet-waveform-adapter"
            className="min-h-16 overflow-hidden rounded-md border border-border bg-card"
          />
          <DerivedPeaks details={artifactState.details} />
          <p data-testid="sheet-waveform-source" className="text-xs font-medium text-muted-foreground">
            Waveform source: {artifactState.details.source === "decoded-audio" ? "decoded audio artifact" : "trusted peaks"}
          </p>
        </div>
      ) : null}

      <Button
        type="button"
        onClick={togglePlayback}
        disabled={artifactState.status !== "ready"}
        variant={playbackState === "playing" ? "secondary" : "default"}
        aria-label={playbackState === "playing" ? "Pause latest sheet recording" : "Play latest sheet recording"}
      >
        {playbackState === "playing" ? (
          <Pause className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Play className="h-4 w-4" aria-hidden="true" />
        )}
        {playbackState === "playing" ? "Pause latest" : "Play latest"}
      </Button>
    </div>
  );
}

function DerivedPeaks({ details }: { details: RecordingArtifactDetails }) {
  return (
    <div
      data-testid="sheet-derived-waveform"
      data-waveform-source={details.source}
      data-peak-count={details.peaks.length}
      className="flex h-14 items-center gap-1 rounded-md border border-border bg-background px-2"
    >
      {details.peaks.map((peak, index) => (
        <span
          key={`${details.recordingId}-${index}`}
          className="w-full rounded-sm bg-accent"
          style={{ height: `${Math.max(8, peak * 48)}px` }}
        />
      ))}
    </div>
  );
}
