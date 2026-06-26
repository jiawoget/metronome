"use client";

import {
  AudioLines,
  Clock3,
  Filter,
  ListMusic,
  RotateCcw,
  Search,
  Trash2
} from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore
} from "react";

import {
  RecordingArtifactReview,
  type RecordingPlaybackControls
} from "@/components/recordings-review/recording-artifact-review";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatDuration,
  formatRecordingDate,
  formatTimestamp
} from "@/lib/recordings-review/format";
import {
  filterRecordings,
  getContinuePracticeHref,
  getRecordingDisplayName,
  sortErrorMarkers,
  type RecordingTypeFilter
} from "@/lib/recordings-review/history";
import { seekToErrorMarker } from "@/lib/recordings-review/error-markers";
import { recordingHistoryRepository } from "@/lib/recordings-review/repository";
import type {
  RecordingErrorMarker,
  ReviewRecording
} from "@/lib/recordings-review/types";

const emptyClientSnapshot = {
  sessions: [],
  recordings: [],
  errorMarkers: []
};

export function RecordingsReviewExperience() {
  const liveSnapshot = useSyncExternalStore(
    recordingHistoryRepository.subscribe,
    recordingHistoryRepository.getSnapshot,
    () => emptyClientSnapshot
  );
  const [clientReady, setClientReady] = useState(false);
  const snapshot = clientReady ? liveSnapshot : emptyClientSnapshot;
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<RecordingTypeFilter>("all");
  const [selectedRecordingId, setSelectedRecordingId] = useState<string | null>(
    null
  );
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(
    null
  );

  const filteredRecordings = useMemo(
    () =>
      filterRecordings({
        recordings: snapshot.recordings,
        query: searchQuery,
        type: typeFilter
      }),
    [snapshot.recordings, searchQuery, typeFilter]
  );
  const selectedRecording =
    snapshot.recordings.find(
      (recording) => recording.id === selectedRecordingId
    ) ??
    filteredRecordings[0] ??
    null;
  const selectedMarkers = useMemo(
    () =>
      selectedRecording
        ? sortErrorMarkers(
            snapshot.errorMarkers.filter(
              (marker) => marker.recordingId === selectedRecording.id
            )
          )
        : [],
    [snapshot.errorMarkers, selectedRecording]
  );

  useEffect(() => {
    const timerId = window.setTimeout(() => setClientReady(true), 0);

    return () => window.clearTimeout(timerId);
  }, []);

  function deleteSelectedRecording(recording: ReviewRecording) {
    recordingHistoryRepository.deleteRecording(recording.id);
    setSelectedRecordingId(null);
    setConfirmingDeleteId(null);
  }

  if (snapshot.recordings.length === 0) {
    return (
      <section
        aria-labelledby="recordings-title"
        className="mx-auto flex w-full max-w-6xl flex-col gap-5"
      >
        <RecordingsHeader />
        <Card>
          <CardContent className="pt-5">
            <div
              data-testid="recordings-empty-state"
              className="border-border bg-muted rounded-md border border-dashed px-5 py-8 text-center"
            >
              <ListMusic
                className="text-accent mx-auto h-9 w-9"
                aria-hidden="true"
              />
              <h2 className="mt-4 text-lg font-semibold">No saved takes yet</h2>
              <p className="text-muted-foreground mx-auto mt-2 max-w-xl text-sm leading-6">
                Record a quick take or sheet practice session to review
                playback, waveform, context, markers, and continuation here.
              </p>
              <Button asChild className="mt-5">
                <Link href="/quick-metronome">Open Quick Metronome</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="recordings-title"
      className="mx-auto flex w-full max-w-6xl flex-col gap-5"
    >
      <RecordingsHeader />

      <Card>
        <CardContent className="pt-5">
          <div className="grid gap-3 md:grid-cols-[1fr_13rem]">
            <label className="relative">
              <span className="sr-only">Search recordings</span>
              <Search
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
                aria-hidden="true"
              />
              <input
                aria-label="Search recordings"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search recordings"
                className="border-border bg-background focus-visible:ring-ring h-10 w-full rounded-md border pr-3 pl-10 text-sm focus-visible:ring-2 focus-visible:outline-none"
              />
            </label>
            <label className="relative">
              <span className="sr-only">Type filter</span>
              <Filter
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
                aria-hidden="true"
              />
              <select
                aria-label="Type filter"
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(event.target.value as RecordingTypeFilter)
                }
                className="border-border bg-background focus-visible:ring-ring h-10 w-full rounded-md border pr-3 pl-10 text-sm focus-visible:ring-2 focus-visible:outline-none"
              >
                <option value="all">All recordings</option>
                <option value="quick">Quick</option>
                <option value="sheet">Sheet</option>
              </select>
            </label>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Unified List</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredRecordings.length === 0 ? (
              <div
                data-testid="recordings-filter-empty-state"
                className="border-border bg-muted text-muted-foreground rounded-md border border-dashed px-4 py-6 text-sm"
              >
                No recordings match the current search and filter.
              </div>
            ) : (
              <div data-testid="recordings-list" className="grid gap-2">
                {filteredRecordings.map((recording) => (
                  <RecordingListItem
                    key={recording.id}
                    recording={recording}
                    selected={selectedRecording?.id === recording.id}
                    onSelect={() => {
                      setSelectedRecordingId(recording.id);
                      setConfirmingDeleteId(null);
                    }}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recording Details</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedRecording ? (
              <RecordingDetails
                recording={selectedRecording}
                markers={selectedMarkers}
                confirmingDelete={confirmingDeleteId === selectedRecording.id}
                onAskDelete={() => setConfirmingDeleteId(selectedRecording.id)}
                onCancelDelete={() => setConfirmingDeleteId(null)}
                onConfirmDelete={() =>
                  deleteSelectedRecording(selectedRecording)
                }
              />
            ) : (
              <p className="text-muted-foreground text-sm leading-6">
                Select a recording to review its artifact, metadata, and
                markers.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function RecordingsHeader() {
  return (
    <header className="border-border flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-[0.08em] uppercase">
          Practice History
        </p>
        <h1
          id="recordings-title"
          className="text-3xl font-semibold tracking-normal sm:text-4xl"
        >
          Recordings
        </h1>
        <p className="text-muted-foreground mt-3 max-w-2xl text-sm leading-6">
          Review quick and sheet practice recordings in one history list.
        </p>
      </div>
      <div
        aria-label="Recordings status"
        className="border-border bg-card shadow-soft flex min-h-12 items-center gap-3 rounded-md border px-4 py-3 text-sm"
      >
        <AudioLines className="text-accent h-5 w-5" aria-hidden="true" />
        <span className="font-medium">Local recordings</span>
      </div>
    </header>
  );
}

function RecordingListItem({
  recording,
  selected,
  onSelect
}: {
  recording: ReviewRecording;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      data-testid={`recording-row-${recording.id}`}
      aria-pressed={selected}
      onClick={onSelect}
      className="border-border bg-background hover:bg-muted focus-visible:ring-ring aria-pressed:border-accent aria-pressed:bg-muted w-full rounded-md border px-3 py-3 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      <span className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <span className="min-w-0">
          <span className="block truncate font-semibold">
            {getRecordingDisplayName(recording)}
          </span>
          <span className="text-muted-foreground mt-1 block">
            {formatRecordingDate(recording.createdAt)}
          </span>
          {recording.sheetName ? (
            <span className="text-foreground mt-1 block font-medium">
              {recording.sheetName}
            </span>
          ) : null}
        </span>
        <span className="grid grid-cols-2 gap-2 text-xs sm:w-44">
          <MetadataPill value={recording.type} />
          <MetadataPill value={formatDuration(recording.durationMs)} />
          <MetadataPill value={`${recording.settings.bpm} BPM`} />
          <MetadataPill value={recording.settings.timeSignature} />
        </span>
      </span>
    </button>
  );
}

function RecordingDetails({
  recording,
  markers,
  confirmingDelete,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete
}: {
  recording: ReviewRecording;
  markers: RecordingErrorMarker[];
  confirmingDelete: boolean;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}) {
  const [playbackControls, setPlaybackControls] =
    useState<RecordingPlaybackControls | null>(null);
  const [markerMessage, setMarkerMessage] = useState<string | null>(null);
  const [markerErrorMessage, setMarkerErrorMessage] = useState<string | null>(
    null
  );
  const handlePlaybackControlsChange = useCallback(
    (controls: RecordingPlaybackControls | null) => {
      setPlaybackControls(controls);
    },
    []
  );

  function seekToMarker(marker: RecordingErrorMarker) {
    const result = seekToErrorMarker({
      marker,
      activeRecordingId: recording.id,
      playbackControls
    });

    if (result.ok) {
      setMarkerMessage(result.message);
      setMarkerErrorMessage(null);
      return;
    }

    setMarkerMessage(null);
    setMarkerErrorMessage(result.message);
  }

  return (
    <div
      data-testid="recording-details"
      data-recording-id={recording.id}
      className="grid gap-5"
    >
      <div>
        <p className="text-muted-foreground text-xs font-semibold tracking-[0.08em] uppercase">
          {recording.type} recording
        </p>
        <h2 className="mt-2 text-xl font-semibold">
          {getRecordingDisplayName(recording)}
        </h2>
        {recording.sheetName ? (
          <p className="text-foreground mt-1 text-sm font-medium">
            {recording.sheetName}
          </p>
        ) : (
          <p className="text-muted-foreground mt-1 text-sm">No sheet linked.</p>
        )}
      </div>

      <RecordingArtifactReview
        recording={recording}
        adapterClassName="min-h-24 overflow-hidden rounded-md border border-border bg-card"
        adapterTestId="waveform-adapter"
        derivedWaveformClassName="flex h-16 items-center gap-1 rounded-md border border-border bg-background px-2"
        derivedWaveformTestId="derived-waveform"
        errorTestId="recording-artifact-error"
        peakHeightPx={56}
        playbackStatusTestId="recording-playback-status"
        playAriaLabel="Play Recording"
        playText="Play Recording"
        pauseAriaLabel="Pause Recording"
        pauseText="Pause Recording"
        sourceTestId="waveform-source"
        warningTestId="recording-duration-warning"
        onPlaybackControlsChange={handlePlaybackControlsChange}
        actions={
          <Button asChild variant="secondary">
            <Link href={getContinuePracticeHref(recording)}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Practice Again
            </Link>
          </Button>
        }
      />

      <div className="grid gap-2 text-sm sm:grid-cols-2">
        <DetailTile
          label="Date"
          value={formatRecordingDate(recording.createdAt)}
        />
        <DetailTile
          label="Duration"
          value={formatDuration(recording.durationMs)}
        />
        <DetailTile label="BPM" value={String(recording.settings.bpm)} />
        <DetailTile
          label="Time signature"
          value={recording.settings.timeSignature}
        />
        <DetailTile label="Type" value={recording.type} />
        <DetailTile
          label="Artifact"
          value={`${Math.max(1, Math.round(recording.sizeBytes / 1_024))} KB ${recording.mimeType}`}
        />
      </div>

      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Clock3 className="text-accent h-4 w-4" aria-hidden="true" />
          Error Markers
        </h3>
        {markerErrorMessage ? (
          <p
            role="alert"
            data-testid="recording-error-marker-error"
            className="text-destructive mt-3 text-sm font-medium"
          >
            {markerErrorMessage}
          </p>
        ) : null}
        {markerMessage ? (
          <p
            role="status"
            data-testid="recording-error-marker-message"
            className="text-muted-foreground mt-3 text-sm font-medium"
          >
            {markerMessage}
          </p>
        ) : null}
        {markers.length > 0 ? (
          <ul
            data-testid="error-marker-list"
            className="mt-3 grid gap-2 text-sm"
          >
            {markers.map((marker) => (
              <li
                key={marker.id}
                className="border-border bg-muted rounded-md border px-3 py-2"
              >
                <button
                  type="button"
                  onClick={() => seekToMarker(marker)}
                  aria-label={`Seek to marker ${formatTimestamp(marker.timestampMs)}`}
                  className="focus-visible:ring-ring min-w-0 text-left focus-visible:ring-2 focus-visible:outline-none"
                >
                  <span className="font-semibold">
                    {formatTimestamp(marker.timestampMs)}
                  </span>
                  <span
                    data-testid="error-marker-note"
                    className="text-muted-foreground block min-w-0 break-all sm:ml-2 sm:inline"
                  >
                    {marker.note || "No note"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="border-border bg-muted text-muted-foreground mt-3 rounded-md border px-3 py-2 text-sm">
            No manual error markers saved for this recording.
          </p>
        )}
      </div>

      <div className="border-border bg-background rounded-md border px-3 py-3">
        {confirmingDelete ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="secondary" onClick={onCancelDelete}>
              Cancel
            </Button>
            <Button type="button" onClick={onConfirmDelete}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Confirm Delete
            </Button>
          </div>
        ) : (
          <Button type="button" variant="secondary" onClick={onAskDelete}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Delete Recording
          </Button>
        )}
      </div>
    </div>
  );
}

function MetadataPill({ value }: { value: string }) {
  return (
    <span className="border-border bg-muted truncate rounded-md border px-2 py-1 font-medium">
      {value}
    </span>
  );
}

function DetailTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-border bg-muted rounded-md border px-3 py-3">
      <p className="text-muted-foreground text-xs font-medium">{label}</p>
      <p className="mt-1 font-semibold break-words">{value}</p>
    </div>
  );
}
