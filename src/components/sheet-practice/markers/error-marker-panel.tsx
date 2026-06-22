"use client";

import { Trash2, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import type { RecordingPlaybackControls } from "@/components/recordings-review/recording-artifact-review";
import { formatTimestamp } from "@/lib/recordings-review/format";
import { getErrorMarkerSeekTarget } from "@/lib/recordings-review/history";
import { recordingHistoryRepository } from "@/lib/recordings-review/repository";
import type { RecordingErrorMarker, ReviewRecording } from "@/lib/recordings-review/types";

type ErrorMarkerPanelProps = {
  recording: ReviewRecording | null;
  playbackControls: RecordingPlaybackControls | null;
  currentTimeMs: number;
};

const SEEK_CONFIRMATION_TOLERANCE_MS = 80;

function formatSecondsInput(timestampMs: number) {
  return (Math.max(0, timestampMs) / 1_000).toFixed(1);
}

function parseSecondsInput(value: string) {
  if (!value.trim()) {
    return Number.NaN;
  }

  const seconds = Number(value);

  return Number.isFinite(seconds) ? Math.round(seconds * 1_000) : Number.NaN;
}

export function ErrorMarkerPanel({
  recording,
  playbackControls,
  currentTimeMs
}: ErrorMarkerPanelProps) {
  const [markers, setMarkers] = useState<RecordingErrorMarker[]>(() =>
    recording ? recordingHistoryRepository.getErrorMarkers(recording.id) : []
  );
  const [note, setNote] = useState("");
  const [timestampDraftOverride, setTimestampDraftOverride] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clampedCurrentTimeMs = useMemo(() => {
    if (!recording) {
      return 0;
    }

    return Math.min(recording.durationMs, Math.max(0, currentTimeMs));
  }, [currentTimeMs, recording]);

  useEffect(() => {
    if (!recording) {
      return;
    }

    const refreshMarkers = () => {
      setMarkers(recordingHistoryRepository.getErrorMarkers(recording.id));
    };

    return recordingHistoryRepository.subscribe(refreshMarkers);
  }, [recording]);

  const timestampDraft = timestampDraftOverride ?? formatSecondsInput(clampedCurrentTimeMs);

  if (!recording) {
    return (
      <div
        data-testid="sheet-error-marker-empty"
        className="rounded-md border border-dashed border-border bg-background px-3 py-3 text-sm text-muted-foreground"
      >
        Save a sheet recording before adding manual error markers.
      </div>
    );
  }

  const activeRecording = recording;

  function usePlaybackTime() {
    setTimestampDraftOverride(null);
    setMessage(`Marker time set to ${formatTimestamp(clampedCurrentTimeMs)}.`);
    setErrorMessage(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const marker = recordingHistoryRepository.createErrorMarker({
        recordingId: activeRecording.id,
        timestampMs: parseSecondsInput(timestampDraft),
        durationMs: activeRecording.durationMs,
        note
      });

      setNote("");
      setMessage(`Error marker saved at ${formatTimestamp(marker.timestampMs)}.`);
      setErrorMessage(null);
    } catch (error) {
      setMessage(null);
      setErrorMessage(error instanceof Error ? error.message : "Error marker could not be saved.");
    }
  }

  function seekToMarker(marker: RecordingErrorMarker) {
    if (!playbackControls || playbackControls.recordingId !== activeRecording.id) {
      setMessage(null);
      setErrorMessage("Recording playback is still loading.");
      return;
    }

    const seekTargetMs = getErrorMarkerSeekTarget(marker);

    try {
      const result = playbackControls.seekToMs(seekTargetMs);
      const seekDeltaMs = Math.abs(result.currentTimeMs - seekTargetMs);

      if (seekDeltaMs > SEEK_CONFIRMATION_TOLERANCE_MS) {
        throw new Error("Playback did not move to the selected marker.");
      }

      setTimestampDraftOverride(formatSecondsInput(seekTargetMs));
      setMessage(`Playback moved to ${formatTimestamp(seekTargetMs)}.`);
      setErrorMessage(null);
    } catch (error) {
      setMessage(null);
      setErrorMessage(error instanceof Error ? error.message : "Playback could not move to this marker.");
    }
  }

  function deleteMarker(marker: RecordingErrorMarker) {
    recordingHistoryRepository.deleteErrorMarker(marker.id);
    setMessage(`Deleted marker at ${formatTimestamp(marker.timestampMs)}.`);
    setErrorMessage(null);
  }

  const controlsReady = playbackControls?.recordingId === recording.id;

  return (
    <section
      aria-labelledby="sheet-error-markers-title"
      data-testid="sheet-error-marker-panel"
      className="grid gap-3 rounded-md border border-border bg-background px-3 py-3"
    >
      <div>
        <h3 id="sheet-error-markers-title" className="text-sm font-semibold tracking-normal">
          Error markers
        </h3>
        <p data-testid="sheet-error-marker-scope" className="mt-1 text-xs text-muted-foreground">
          Recording {activeRecording.id}
        </p>
      </div>

      <form className="grid gap-2" onSubmit={handleSubmit}>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,0.7fr)_auto]">
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            Marker time seconds
            <input
              aria-label="Marker time seconds"
              type="number"
              step={0.1}
              value={timestampDraft}
              onChange={(event) => {
                setTimestampDraftOverride(event.target.value);
              }}
              className="h-10 min-w-0 rounded-md border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <Button type="button" variant="secondary" onClick={usePlaybackTime} disabled={!controlsReady}>
            Use playback time
          </Button>
        </div>
        <label className="grid gap-1 text-xs font-medium text-muted-foreground">
          Marker note
          <input
            aria-label="Marker note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Optional note"
            className="h-10 min-w-0 rounded-md border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <Button type="submit">
          <TriangleAlert className="h-4 w-4" aria-hidden="true" />
          Mark Error
        </Button>
      </form>

      {errorMessage ? (
        <p role="alert" data-testid="sheet-error-marker-error" className="text-sm font-medium text-destructive">
          {errorMessage}
        </p>
      ) : null}
      {message ? (
        <p role="status" data-testid="sheet-error-marker-message" className="text-sm font-medium text-muted-foreground">
          {message}
        </p>
      ) : null}

      {markers.length > 0 ? (
        <ul data-testid="sheet-error-marker-list" className="grid gap-2">
          {markers.map((marker) => (
            <li
              key={marker.id}
              data-testid={`sheet-error-marker-${marker.id}`}
              className="grid gap-2 rounded-md border border-border bg-muted px-3 py-2 text-sm sm:grid-cols-[minmax(0,1fr)_auto]"
            >
              <button
                type="button"
                onClick={() => seekToMarker(marker)}
                className="min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Seek to marker ${formatTimestamp(marker.timestampMs)}`}
              >
                <span className="font-semibold">{formatTimestamp(marker.timestampMs)}</span>
                <span
                  data-testid="sheet-error-marker-note"
                  className="block min-w-0 break-all text-muted-foreground sm:ml-2 sm:inline"
                >
                  {marker.note || "No note"}
                </span>
              </button>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                aria-label={`Delete marker ${formatTimestamp(marker.timestampMs)}`}
                onClick={() => deleteMarker(marker)}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p data-testid="sheet-error-marker-list-empty" className="rounded-md border border-dashed border-border bg-muted px-3 py-3 text-sm text-muted-foreground">
          No manual error markers saved for this recording.
        </p>
      )}
    </section>
  );
}
