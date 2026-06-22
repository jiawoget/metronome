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
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { RecordingArtifactReview } from "@/components/recordings-review/recording-artifact-review";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDuration, formatRecordingDate, formatTimestamp } from "@/lib/recordings-review/format";
import {
  filterRecordings,
  getContinuePracticeHref,
  getRecordingDisplayName,
  sortErrorMarkers,
  type RecordingTypeFilter
} from "@/lib/recordings-review/history";
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
  const [selectedRecordingId, setSelectedRecordingId] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const filteredRecordings = useMemo(
    () => filterRecordings({ recordings: snapshot.recordings, query: searchQuery, type: typeFilter }),
    [snapshot.recordings, searchQuery, typeFilter]
  );
  const selectedRecording =
    snapshot.recordings.find((recording) => recording.id === selectedRecordingId) ??
    filteredRecordings[0] ??
    null;
  const selectedMarkers = useMemo(
    () =>
      selectedRecording
        ? sortErrorMarkers(
            snapshot.errorMarkers.filter((marker) => marker.recordingId === selectedRecording.id)
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
      <section aria-labelledby="recordings-title" className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <RecordingsHeader />
        <Card>
          <CardContent className="pt-5">
            <div data-testid="recordings-empty-state" className="rounded-md border border-dashed border-border bg-muted px-5 py-8 text-center">
              <ListMusic className="mx-auto h-9 w-9 text-accent" aria-hidden="true" />
              <h2 className="mt-4 text-lg font-semibold">No saved takes yet</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                Record a quick take or sheet practice session to review playback, waveform, context, markers, and continuation here.
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
    <section aria-labelledby="recordings-title" className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <RecordingsHeader />

      <Card>
        <CardContent className="pt-5">
          <div className="grid gap-3 md:grid-cols-[1fr_13rem]">
            <label className="relative">
              <span className="sr-only">Search recordings</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input
                aria-label="Search recordings"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search recordings"
                className="h-10 w-full rounded-md border border-border bg-background pl-10 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <label className="relative">
              <span className="sr-only">Type filter</span>
              <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <select
                aria-label="Type filter"
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as RecordingTypeFilter)}
                className="h-10 w-full rounded-md border border-border bg-background pl-10 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
              <div data-testid="recordings-filter-empty-state" className="rounded-md border border-dashed border-border bg-muted px-4 py-6 text-sm text-muted-foreground">
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
                onConfirmDelete={() => deleteSelectedRecording(selectedRecording)}
              />
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">
                Select a recording to review its artifact, metadata, and markers.
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
    <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Practice History
        </p>
        <h1 id="recordings-title" className="text-3xl font-semibold tracking-normal sm:text-4xl">
          Recordings
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Review quick and sheet practice recordings in one history list.
        </p>
      </div>
      <div
        aria-label="Recordings status"
        className="flex min-h-12 items-center gap-3 rounded-md border border-border bg-card px-4 py-3 text-sm shadow-soft"
      >
        <AudioLines className="h-5 w-5 text-accent" aria-hidden="true" />
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
      className="w-full rounded-md border border-border bg-background px-3 py-3 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-pressed:border-accent aria-pressed:bg-muted"
    >
      <span className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <span className="min-w-0">
          <span className="block truncate font-semibold">{getRecordingDisplayName(recording)}</span>
          <span className="mt-1 block text-muted-foreground">{formatRecordingDate(recording.createdAt)}</span>
          {recording.sheetName ? (
            <span className="mt-1 block font-medium text-foreground">{recording.sheetName}</span>
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
  return (
    <div data-testid="recording-details" className="grid gap-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {recording.type} recording
        </p>
        <h2 className="mt-2 text-xl font-semibold">{getRecordingDisplayName(recording)}</h2>
        {recording.sheetName ? (
          <p className="mt-1 text-sm font-medium text-foreground">{recording.sheetName}</p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">No sheet linked.</p>
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
        <DetailTile label="Date" value={formatRecordingDate(recording.createdAt)} />
        <DetailTile label="Duration" value={formatDuration(recording.durationMs)} />
        <DetailTile label="BPM" value={String(recording.settings.bpm)} />
        <DetailTile label="Time signature" value={recording.settings.timeSignature} />
        <DetailTile label="Type" value={recording.type} />
        <DetailTile label="Artifact" value={`${Math.max(1, Math.round(recording.sizeBytes / 1_024))} KB ${recording.mimeType}`} />
      </div>

      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Clock3 className="h-4 w-4 text-accent" aria-hidden="true" />
          Error Markers
        </h3>
        {markers.length > 0 ? (
          <ul data-testid="error-marker-list" className="mt-3 grid gap-2 text-sm">
            {markers.map((marker) => (
              <li key={marker.id} className="rounded-md border border-border bg-muted px-3 py-2">
                <span className="font-semibold">{formatTimestamp(marker.timestampMs)}</span>
                <span
                  data-testid="error-marker-note"
                  className="block min-w-0 break-all text-muted-foreground sm:ml-2 sm:inline"
                >
                  {marker.note || "No note"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
            No manual error markers saved for this recording.
          </p>
        )}
      </div>

      <div className="rounded-md border border-border bg-background px-3 py-3">
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
    <span className="truncate rounded-md border border-border bg-muted px-2 py-1 font-medium">
      {value}
    </span>
  );
}

function DetailTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted px-3 py-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 break-words font-semibold">{value}</p>
    </div>
  );
}
