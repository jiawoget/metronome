"use client";

import {
  AudioLines,
  Archive,
  CheckCircle2,
  Clock3,
  Download,
  Filter,
  ListMusic,
  RotateCcw,
  Search,
  Star,
  Tag,
  Trash2
} from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";

import {
  RecordingArtifactReview,
  type RecordingPlaybackControls
} from "@/components/recordings-review/recording-artifact-review";
import { useBoundedRecordingSelection } from "@/components/recordings-review/use-bounded-recording-selection";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RecordingAudioExportResult } from "@/lib/recordings-review/audio-export";
import {
  formatDuration,
  formatRecordingDate,
  formatTimestamp
} from "@/lib/recordings-review/format";
import {
  filterRecordings,
  getContinuePracticeHref,
  getRecordingDisplayName,
  getRecordingTagOptions,
  getTakeGroupPracticeHref,
  sortErrorMarkers,
  type RecordingArchiveFilter,
  type RecordingTypeFilter
} from "@/lib/recordings-review/history";
import {
  createTakeHistorySummary,
  type TakeHistorySummary
} from "@/lib/recordings-review/take-history-summary";
import {
  type WaveformComparisonSourceState,
  type WaveformComparisonSourcesResult
} from "@/lib/recordings-review/waveform-comparison-sources";
import { resolveRecordingOrganization } from "@/lib/recordings-review/recording-organization-metadata";
import { groupRecordingsByTake } from "@/lib/recordings-review/take-groups";
import { seekToErrorMarker } from "@/lib/recordings-review/error-markers";
import {
  useRecordingComparisonWaveformSources,
  useRecordingsReviewController,
  useTakeGroupWaveformSources
} from "@/components/recordings-review/use-recordings-review-controller";
import type { RecordingsReviewService } from "@/services/recordings-review";
import type {
  RecordingTakeGroup,
  RecordingErrorMarker,
  RecordingOrganizationMetadata,
  ResolvedRecordingOrganization,
  ResolvedRecordingTakeSelection,
  ReviewRecording
} from "@/lib/recordings-review/types";

const MAX_WAVEFORM_COMPARISON_TAKES = 4;
const MAX_RECORDING_COMPARISON_RECORDINGS = 4;

type RecordingComparisonTakeContext = {
  group: RecordingTakeGroup;
  selection: ResolvedRecordingTakeSelection;
  isLatest: boolean;
};

export function RecordingsReviewExperience() {
  const {
    snapshot,
    service: reviewService,
    deleteRecording,
    toggleFavorite: toggleRecordingFavoriteAction
  } = useRecordingsReviewController();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<RecordingTypeFilter>("all");
  const [archiveFilter, setArchiveFilter] =
    useState<RecordingArchiveFilter>("active");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [tagFilter, setTagFilter] = useState("all");
  const [selectedRecordingId, setSelectedRecordingId] = useState<string | null>(
    null
  );
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(
    null
  );

  const recordingOrganization = useMemo(
    () => snapshot.recordingOrganization ?? [],
    [snapshot.recordingOrganization]
  );
  const recordingOrganizationById = useMemo(
    () =>
      new Map(
        recordingOrganization.map(
          (organization) => [organization.recordingId, organization] as const
        )
      ),
    [recordingOrganization]
  );
  const tagOptions = useMemo(
    () =>
      getRecordingTagOptions({
        recordings: snapshot.recordings,
        recordingOrganization
      }),
    [recordingOrganization, snapshot.recordings]
  );
  const filteredRecordings = useMemo(
    () =>
      filterRecordings({
        recordings: snapshot.recordings,
        query: searchQuery,
        type: typeFilter,
        archiveMode: archiveFilter,
        favoritesOnly,
        tag: tagFilter,
        recordingOrganization
      }),
    [
      archiveFilter,
      favoritesOnly,
      recordingOrganization,
      searchQuery,
      snapshot.recordings,
      tagFilter,
      typeFilter
    ]
  );
  const groupedRecordings = useMemo(
    () => groupRecordingsByTake(filteredRecordings),
    [filteredRecordings]
  );
  const visibleRecordings = useMemo(
    () => [
      ...groupedRecordings.takeGroups.flatMap((group) => group.recordings),
      ...groupedRecordings.quickRecordings,
      ...groupedRecordings.ungroupedRecordings
    ],
    [groupedRecordings]
  );
  const visibleRecordingIds = useMemo(
    () => visibleRecordings.map((recording) => recording.id),
    [visibleRecordings]
  );
  const recordingComparisonSelection = useBoundedRecordingSelection({
    visibleRecordingIds,
    maxSelected: MAX_RECORDING_COMPARISON_RECORDINGS
  });
  const visibleRecordingById = useMemo(
    () =>
      new Map(
        visibleRecordings.map((recording) => [recording.id, recording] as const)
      ),
    [visibleRecordings]
  );
  const selectedComparisonRecordings = useMemo(
    () =>
      recordingComparisonSelection.visibleSelectedIds
        .map((recordingId) => visibleRecordingById.get(recordingId))
        .filter((recording): recording is ReviewRecording => Boolean(recording)),
    [recordingComparisonSelection.visibleSelectedIds, visibleRecordingById]
  );
  const comparisonTakeContextByRecordingId = useMemo(() => {
    const contextById = new Map<string, RecordingComparisonTakeContext>();

    for (const group of groupedRecordings.takeGroups) {
      const selection = reviewService.resolveTakeSelection(group);

      for (const recording of group.recordings) {
        contextById.set(recording.id, {
          group,
          selection,
          isLatest: group.latestRecording.id === recording.id
        });
      }
    }

    return contextById;
  }, [groupedRecordings, reviewService]);
  const recordingComparisonRequestId = recordingComparisonSelection.requestId;
  const recordingComparisonSources = useRecordingComparisonWaveformSources({
    service: reviewService,
    recordingIds: recordingComparisonSelection.visibleSelectedIds,
    requestId: recordingComparisonRequestId
  });
  const selectedRecording =
    visibleRecordings.find(
      (recording) => recording.id === selectedRecordingId
    ) ??
    visibleRecordings[0] ??
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
  const selectedRecordingOrganization = selectedRecording
    ? resolveRecordingOrganizationForRecord(
        selectedRecording,
        recordingOrganizationById
      )
    : null;

  function deleteSelectedRecording(recording: ReviewRecording) {
    deleteRecording(recording);
    setSelectedRecordingId(null);
    setConfirmingDeleteId(null);
    recordingComparisonSelection.removeRecordingId(recording.id);
  }

  function toggleFavorite(recording: ReviewRecording) {
    const organization = resolveRecordingOrganizationForRecord(
      recording,
      recordingOrganizationById
    );

    toggleRecordingFavoriteAction(recording, organization.favorite);
  }

  function toggleRecordingComparison(recording: ReviewRecording) {
    recordingComparisonSelection.toggleRecordingId(recording.id);
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
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_13rem_13rem] xl:grid-cols-[minmax(0,1fr)_13rem_13rem_12rem_auto]">
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
            <label className="relative">
              <span className="sr-only">Archive filter</span>
              <Archive
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
                aria-hidden="true"
              />
              <select
                aria-label="Archive filter"
                value={archiveFilter}
                onChange={(event) =>
                  setArchiveFilter(event.target.value as RecordingArchiveFilter)
                }
                className="border-border bg-background focus-visible:ring-ring h-10 w-full rounded-md border pr-3 pl-10 text-sm focus-visible:ring-2 focus-visible:outline-none"
              >
                <option value="active">Active recordings</option>
                <option value="archived">Archived recordings</option>
                <option value="all">All including archived</option>
              </select>
            </label>
            <label className="relative">
              <span className="sr-only">Tag filter</span>
              <Tag
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
                aria-hidden="true"
              />
              <select
                aria-label="Tag filter"
                value={tagFilter}
                onChange={(event) => setTagFilter(event.target.value)}
                className="border-border bg-background focus-visible:ring-ring h-10 w-full rounded-md border pr-3 pl-10 text-sm focus-visible:ring-2 focus-visible:outline-none"
              >
                <option value="all">All tags</option>
                {tagOptions.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              aria-label="Show favorites only"
              aria-pressed={favoritesOnly}
              onClick={() => setFavoritesOnly((current) => !current)}
              className="border-border bg-background hover:bg-muted focus-visible:ring-ring aria-pressed:border-accent aria-pressed:bg-accent/20 inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <Star className="h-4 w-4" aria-hidden="true" />
              Favorites
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <RecordingComparisonPanel
            selectedRecordings={selectedComparisonRecordings}
            selectedRecordingIds={recordingComparisonSelection.visibleSelectedIds}
            organizationByRecordingId={recordingOrganizationById}
            markers={snapshot.errorMarkers}
            takeContextByRecordingId={comparisonTakeContextByRecordingId}
            loading={recordingComparisonSources.loading}
            result={recordingComparisonSources.result}
            errorMessage={recordingComparisonSources.errorMessage}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Take History</CardTitle>
          </CardHeader>
          <CardContent>
            {visibleRecordings.length === 0 ? (
              <div
                data-testid="recordings-filter-empty-state"
                className="border-border bg-muted text-muted-foreground rounded-md border border-dashed px-4 py-6 text-sm"
              >
                No recordings match the current filters.
              </div>
            ) : (
              <div data-testid="recordings-list" className="grid gap-4">
                <GroupedRecordingList
                  grouping={groupedRecordings}
                  markers={snapshot.errorMarkers}
                  organizationByRecordingId={recordingOrganizationById}
                  reviewService={reviewService}
                  selectedRecordingId={selectedRecording?.id ?? null}
                  recordingComparisonSelectedIds={
                    recordingComparisonSelection.visibleSelectedIds
                  }
                  onSelectRecording={(recordingId) => {
                    setSelectedRecordingId(recordingId);
                    setConfirmingDeleteId(null);
                  }}
                  onToggleFavorite={toggleFavorite}
                  onToggleRecordingComparison={toggleRecordingComparison}
                />
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
                key={selectedRecording.id}
                recording={selectedRecording}
                organization={selectedRecordingOrganization}
                reviewService={reviewService}
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
          Review quick recordings and sheet take histories in one focused
          workspace.
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

function resolveRecordingOrganizationForRecord(
  recording: ReviewRecording,
  organizationByRecordingId: Map<string, RecordingOrganizationMetadata>
): ResolvedRecordingOrganization {
  return resolveRecordingOrganization({
    recording,
    organization: organizationByRecordingId.get(recording.id) ?? null
  });
}

function GroupedRecordingList({
  grouping,
  markers,
  organizationByRecordingId,
  reviewService,
  selectedRecordingId,
  recordingComparisonSelectedIds,
  onSelectRecording,
  onToggleFavorite,
  onToggleRecordingComparison
}: {
  grouping: ReturnType<typeof groupRecordingsByTake>;
  markers: RecordingErrorMarker[];
  organizationByRecordingId: Map<string, RecordingOrganizationMetadata>;
  reviewService: RecordingsReviewService;
  selectedRecordingId: string | null;
  recordingComparisonSelectedIds: string[];
  onSelectRecording: (recordingId: string) => void;
  onToggleFavorite: (recording: ReviewRecording) => void;
  onToggleRecordingComparison: (recording: ReviewRecording) => void;
}) {
  return (
    <>
      {grouping.takeGroups.map((group) => (
        <TakeGroupSection
          key={group.groupId}
          group={group}
          markers={markers}
          organizationByRecordingId={organizationByRecordingId}
          reviewService={reviewService}
          selectedRecordingId={selectedRecordingId}
          recordingComparisonSelectedIds={recordingComparisonSelectedIds}
          onSelectRecording={onSelectRecording}
          onToggleFavorite={onToggleFavorite}
          onToggleRecordingComparison={onToggleRecordingComparison}
        />
      ))}

      {grouping.quickRecordings.length > 0 ? (
        <RecordingSection
          testId="quick-recordings-section"
          title="Quick recordings"
          description="Quick metronome takes"
        >
          <div className="divide-border divide-y overflow-hidden rounded-md border">
            {grouping.quickRecordings.map((recording) => (
              <RecordingListItem
                key={recording.id}
                recording={recording}
                organization={resolveRecordingOrganizationForRecord(
                  recording,
                  organizationByRecordingId
                )}
                contextLabel="Quick metronome"
                selected={selectedRecordingId === recording.id}
                onSelect={() => onSelectRecording(recording.id)}
                onToggleFavorite={() => onToggleFavorite(recording)}
                recordingComparisonSelected={recordingComparisonSelectedIds.includes(
                  recording.id
                )}
                recordingComparisonDisabled={
                  recordingComparisonSelectedIds.length >=
                    MAX_RECORDING_COMPARISON_RECORDINGS &&
                  !recordingComparisonSelectedIds.includes(recording.id)
                }
                onToggleRecordingComparison={() =>
                  onToggleRecordingComparison(recording)
                }
              />
            ))}
          </div>
        </RecordingSection>
      ) : null}

      {grouping.ungroupedRecordings.length > 0 ? (
        <RecordingSection
          testId="ungrouped-recordings-section"
          title="Legacy recordings with missing sheet links"
          description="Sheet recordings kept visible without a usable sheet id"
        >
          <div className="divide-border divide-y overflow-hidden rounded-md border">
            {grouping.ungroupedRecordings.map((recording) => (
              <RecordingListItem
                key={recording.id}
                recording={recording}
                organization={resolveRecordingOrganizationForRecord(
                  recording,
                  organizationByRecordingId
                )}
                contextLabel="Missing sheet link"
                selected={selectedRecordingId === recording.id}
                onSelect={() => onSelectRecording(recording.id)}
                onToggleFavorite={() => onToggleFavorite(recording)}
                recordingComparisonSelected={recordingComparisonSelectedIds.includes(
                  recording.id
                )}
                recordingComparisonDisabled={
                  recordingComparisonSelectedIds.length >=
                    MAX_RECORDING_COMPARISON_RECORDINGS &&
                  !recordingComparisonSelectedIds.includes(recording.id)
                }
                onToggleRecordingComparison={() =>
                  onToggleRecordingComparison(recording)
                }
              />
            ))}
          </div>
        </RecordingSection>
      ) : null}
    </>
  );
}

function TakeGroupSection({
  group,
  markers,
  organizationByRecordingId,
  reviewService,
  selectedRecordingId,
  recordingComparisonSelectedIds,
  onSelectRecording,
  onToggleFavorite,
  onToggleRecordingComparison
}: {
  group: RecordingTakeGroup;
  markers: RecordingErrorMarker[];
  organizationByRecordingId: Map<string, RecordingOrganizationMetadata>;
  reviewService: RecordingsReviewService;
  selectedRecordingId: string | null;
  recordingComparisonSelectedIds: string[];
  onSelectRecording: (recordingId: string) => void;
  onToggleFavorite: (recording: ReviewRecording) => void;
  onToggleRecordingComparison: (recording: ReviewRecording) => void;
}) {
  const titleId = `take-group-title-${group.groupId}`;
  const sheetLabel = group.sheetName ?? group.sheetId;
  const contextLabel =
    group.kind === "sheet-segment"
      ? group.segmentName ?? group.segmentId ?? "Saved segment"
      : "Whole sheet / no segment";
  const ariaContextLabel =
    group.kind === "sheet-segment"
      ? `${sheetLabel}, Segment ${contextLabel}`
      : `${sheetLabel}, ${contextLabel}`;
  const eyebrow =
    group.kind === "sheet-segment"
      ? "Segment take history"
      : "Sheet take history";
  const [selectionErrorMessage, setSelectionErrorMessage] = useState<
    string | null
  >(null);
  const resolvedSelection = reviewService.resolveTakeSelection(group);
  const takeHistorySummary = createTakeHistorySummary({
    group,
    selection: resolvedSelection,
    markers
  });
  const activeTakeLabel = resolvedSelection.activeRecording
    ? getRecordingDisplayName(resolvedSelection.activeRecording)
    : "none";
  const groupPracticeHref = getTakeGroupPracticeHref(group);
  const groupPracticeLabel =
    group.kind === "sheet-segment" ? "Practice segment" : "Practice sheet";
  const groupPracticeAriaLabel =
    group.kind === "sheet-segment"
      ? `Return to practice for ${contextLabel} on ${sheetLabel}`
      : `Return to sheet practice for ${sheetLabel}`;
  const groupRecordingIds = useMemo(
    () => group.recordings.map((recording) => recording.id),
    [group.recordings]
  );
  const comparisonSelection = useBoundedRecordingSelection({
    visibleRecordingIds: groupRecordingIds,
    maxSelected: MAX_WAVEFORM_COMPARISON_TAKES
  });
  const visibleComparisonRecordingIds = comparisonSelection.visibleSelectedIds;
  const comparisonRequestId = comparisonSelection.requestId;
  const comparisonSources = useTakeGroupWaveformSources({
    service: reviewService,
    group,
    recordingIds: visibleComparisonRecordingIds,
    requestId: comparisonRequestId
  });

  function updateBestTake(recording: ReviewRecording) {
    try {
      const isCurrentBest = resolvedSelection.bestRecording?.id === recording.id;

      reviewService.setBestTake(group, isCurrentBest ? null : recording.id);
      setSelectionErrorMessage(null);
    } catch {
      setSelectionErrorMessage("Best take could not be updated.");
    }
  }

  function updateActiveTake(recording: ReviewRecording) {
    try {
      const isCurrentActive =
        resolvedSelection.activeRecording?.id === recording.id;

      reviewService.setActiveTake(group, isCurrentActive ? null : recording.id);
      setSelectionErrorMessage(null);
    } catch {
      setSelectionErrorMessage("Active take could not be updated.");
    }
  }

  function toggleWaveformComparison(recording: ReviewRecording) {
    comparisonSelection.toggleRecordingId(recording.id);
  }

  return (
    <section
      aria-labelledby={titleId}
      data-testid={`take-group-${group.groupId}`}
      className="border-border bg-background overflow-hidden rounded-md border"
    >
      <div className="border-border bg-muted/60 border-b px-3 py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs font-semibold tracking-[0.08em] uppercase">
              {eyebrow}
            </p>
            <h3 id={titleId} className="mt-1 text-sm font-semibold break-words">
              {sheetLabel}
            </h3>
            <p className="text-muted-foreground mt-1 text-sm break-words">
              {contextLabel}
            </p>
          </div>
          <div className="flex max-w-full flex-col gap-2 sm:items-end">
            <Button asChild variant="secondary" className="h-9 w-fit px-3 text-xs">
              <Link
                href={groupPracticeHref}
                aria-label={groupPracticeAriaLabel}
                data-testid={`take-group-practice-${group.groupId}`}
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                {groupPracticeLabel}
              </Link>
            </Button>
            <div className="flex max-w-full flex-wrap gap-2 text-xs sm:justify-end">
              <TakeHistorySummaryChips summary={takeHistorySummary} />
              <MetadataPill value={`Active: ${activeTakeLabel}`} wrap />
            </div>
          </div>
        </div>
        {selectionErrorMessage ? (
          <p
            role="alert"
            className="text-destructive mt-3 text-sm font-medium"
          >
            {selectionErrorMessage}
          </p>
        ) : null}
      </div>
      <WaveformComparisonPanel
        group={group}
        titleId={`${titleId}-waveform-comparison`}
        selectedRecordingIds={visibleComparisonRecordingIds}
        loading={comparisonSources.loading}
        result={comparisonSources.result}
        errorMessage={comparisonSources.errorMessage}
      />
      <div className="divide-border divide-y">
        {group.recordings.map((recording) => (
          <RecordingListItem
            key={recording.id}
            recording={recording}
            organization={resolveRecordingOrganizationForRecord(
              recording,
              organizationByRecordingId
            )}
            contextLabel={contextLabel}
            ariaContextLabel={ariaContextLabel}
            selected={selectedRecordingId === recording.id}
            onSelect={() => onSelectRecording(recording.id)}
            onToggleFavorite={() => onToggleFavorite(recording)}
            recordingComparisonSelected={recordingComparisonSelectedIds.includes(
              recording.id
            )}
            recordingComparisonDisabled={
              recordingComparisonSelectedIds.length >=
                MAX_RECORDING_COMPARISON_RECORDINGS &&
              !recordingComparisonSelectedIds.includes(recording.id)
            }
            onToggleRecordingComparison={() =>
              onToggleRecordingComparison(recording)
            }
            takeSelection={resolvedSelection}
            onToggleBest={() => updateBestTake(recording)}
            onToggleActive={() => updateActiveTake(recording)}
            comparisonSelected={visibleComparisonRecordingIds.includes(recording.id)}
            comparisonDisabled={
              visibleComparisonRecordingIds.length >=
                MAX_WAVEFORM_COMPARISON_TAKES &&
              !visibleComparisonRecordingIds.includes(recording.id)
            }
            onToggleComparison={() => toggleWaveformComparison(recording)}
          />
        ))}
      </div>
    </section>
  );
}

function TakeHistorySummaryChips({
  summary
}: {
  summary: TakeHistorySummary;
}) {
  return (
    <div
      data-testid="take-history-summary"
      aria-label="Take history summary"
      className="contents"
    >
      {summary.fields.map((field) => (
        <MetadataPill
          key={field.key}
          value={`${field.label}: ${field.value}`}
          wrap
        />
      ))}
    </div>
  );
}

function RecordingSection({
  testId,
  title,
  description,
  children
}: {
  testId: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const titleId = `${testId}-title`;

  return (
    <section aria-labelledby={titleId} data-testid={testId} className="grid gap-2">
      <div>
        <h3 id={titleId} className="text-sm font-semibold">
          {title}
        </h3>
        <p className="text-muted-foreground mt-1 text-xs">{description}</p>
      </div>
      {children}
    </section>
  );
}

function RecordingListItem({
  recording,
  organization,
  contextLabel,
  ariaContextLabel = contextLabel,
  selected,
  onSelect,
  onToggleFavorite,
  recordingComparisonSelected,
  recordingComparisonDisabled = false,
  onToggleRecordingComparison,
  takeSelection,
  onToggleBest,
  onToggleActive,
  comparisonSelected,
  comparisonDisabled = false,
  onToggleComparison
}: {
  recording: ReviewRecording;
  organization: ResolvedRecordingOrganization;
  contextLabel: string;
  ariaContextLabel?: string;
  selected: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
  recordingComparisonSelected?: boolean;
  recordingComparisonDisabled?: boolean;
  onToggleRecordingComparison?: () => void;
  takeSelection?: ResolvedRecordingTakeSelection;
  onToggleBest?: () => void;
  onToggleActive?: () => void;
  comparisonSelected?: boolean;
  comparisonDisabled?: boolean;
  onToggleComparison?: () => void;
}) {
  const displayName = getRecordingDisplayName(recording);
  const recordedDate = formatRecordingDate(recording.createdAt);
  const isBest = takeSelection?.bestRecording?.id === recording.id;
  const isActive = takeSelection?.activeRecording?.id === recording.id;
  const showTakeControls = !!takeSelection && !!onToggleBest && !!onToggleActive;
  const showRecordingComparisonControl = !!onToggleRecordingComparison;
  const showComparisonControl = !!onToggleComparison;
  const favoriteLabel = organization.favorite
    ? `Remove favorite from ${displayName}`
    : `Mark ${displayName} as favorite`;

  return (
    <div className="bg-background grid gap-2 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
      <button
        type="button"
        data-testid={`recording-row-${recording.id}`}
        aria-pressed={selected}
        aria-label={`${displayName}, ${ariaContextLabel}, recorded ${recordedDate}`}
        onClick={onSelect}
        className="hover:bg-muted focus-visible:ring-ring aria-pressed:bg-muted aria-pressed:ring-accent -m-2 rounded-md p-2 text-left text-sm transition-colors aria-pressed:ring-2 aria-pressed:ring-inset focus-visible:ring-2 focus-visible:outline-none"
      >
        <span className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <span className="min-w-0">
            <span className="block truncate font-semibold">{displayName}</span>
            <span className="text-muted-foreground mt-1 block break-words">
              {contextLabel}
            </span>
            <span className="text-muted-foreground mt-1 block">
              {recordedDate}
            </span>
            {recording.sheetName && recording.sheetName !== contextLabel ? (
              <span className="text-foreground mt-1 block font-medium">
                {recording.sheetName}
              </span>
            ) : null}
            {organization.tags.length > 0 || organization.archived ? (
              <span className="mt-2 flex flex-wrap gap-1 text-xs">
                {organization.archived ? (
                  <MetadataPill value="Archived" wrap />
                ) : null}
                {organization.tags.map((tag) => (
                  <MetadataPill key={tag} value={tag} wrap />
                ))}
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
      <div
        aria-label={`${displayName} recording controls`}
        className="flex flex-wrap gap-2 sm:justify-end"
      >
        <button
          type="button"
          data-testid={`favorite-recording-control-${recording.id}`}
          aria-label={favoriteLabel}
          aria-pressed={organization.favorite}
          onClick={onToggleFavorite}
          className="border-border bg-background hover:bg-muted focus-visible:ring-ring aria-pressed:border-accent aria-pressed:bg-accent/20 inline-flex h-9 min-w-24 items-center justify-center gap-1 rounded-md border px-3 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <Star className="h-4 w-4" aria-hidden="true" />
          <span>{organization.favorite ? "Favorited" : "Favorite"}</span>
        </button>
        {showRecordingComparisonControl ? (
          <ComparisonCheckbox
            recordingId={recording.id}
            checked={!!recordingComparisonSelected}
            disabled={recordingComparisonDisabled}
            testIdPrefix="compare-recording-control"
            ariaLabel={`Select ${displayName} for recording comparison`}
            label="Review"
            onChange={onToggleRecordingComparison}
          />
        ) : null}
        {showComparisonControl ? (
          <ComparisonCheckbox
            recordingId={recording.id}
            checked={!!comparisonSelected}
            disabled={comparisonDisabled}
            testIdPrefix="compare-take-control"
            ariaLabel={`Select ${displayName} for waveform comparison`}
            label="Compare"
            onChange={onToggleComparison}
          />
        ) : null}
        {showTakeControls ? (
          <>
            <TakeSelectionButton
              icon={<Star className="h-4 w-4" aria-hidden="true" />}
              label={isBest ? "Best set" : "Best"}
              pressed={isBest}
              ariaLabel={
                isBest
                  ? `Clear best take for ${displayName}`
                  : `Mark ${displayName} as best take`
              }
              testId={`best-take-control-${recording.id}`}
              onClick={onToggleBest}
            />
            <TakeSelectionButton
              icon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
              label={isActive ? "Active set" : "Active"}
              pressed={isActive}
              ariaLabel={
                isActive
                  ? `Clear active take for ${displayName}`
                  : `Mark ${displayName} as active take`
              }
              testId={`active-take-control-${recording.id}`}
              onClick={onToggleActive}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}

function ComparisonCheckbox({
  recordingId,
  checked,
  disabled,
  testIdPrefix,
  ariaLabel,
  label,
  onChange
}: {
  recordingId: string;
  checked: boolean;
  disabled: boolean;
  testIdPrefix: string;
  ariaLabel: string;
  label: string;
  onChange: () => void;
}) {
  return (
    <label
      className={`border-border bg-background focus-within:ring-ring inline-flex h-9 min-w-28 items-center justify-center gap-2 rounded-md border px-3 text-xs font-semibold transition-colors focus-within:ring-2 ${
        checked ? "border-accent bg-accent/20" : "hover:bg-muted"
      } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
    >
      <input
        type="checkbox"
        data-testid={`${testIdPrefix}-${recordingId}`}
        aria-label={ariaLabel}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="accent-accent h-4 w-4"
      />
      <span>{label}</span>
    </label>
  );
}

function RecordingComparisonPanel({
  selectedRecordings,
  selectedRecordingIds,
  organizationByRecordingId,
  markers,
  takeContextByRecordingId,
  loading,
  result,
  errorMessage
}: {
  selectedRecordings: ReviewRecording[];
  selectedRecordingIds: string[];
  organizationByRecordingId: Map<string, RecordingOrganizationMetadata>;
  markers: RecordingErrorMarker[];
  takeContextByRecordingId: Map<string, RecordingComparisonTakeContext>;
  loading: boolean;
  result: WaveformComparisonSourcesResult | null;
  errorMessage: string | null;
}) {
  const selectedCount = selectedRecordingIds.length;
  const statusText =
    selectedCount === 0
      ? "Select recordings to compare"
      : selectedCount === 1
        ? "Select another recording to compare"
        : `${selectedCount} selected recordings`;
  const limitText =
    selectedCount >= MAX_RECORDING_COMPARISON_RECORDINGS
      ? `Up to ${MAX_RECORDING_COMPARISON_RECORDINGS} recordings can be compared at once.`
      : null;

  return (
    <section
      aria-labelledby="recording-comparison-title"
      data-testid="recording-comparison"
      className="grid gap-4"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 id="recording-comparison-title" className="text-base font-semibold">
            Recording comparison
          </h2>
          <p
            data-testid="recording-comparison-status"
            className="text-muted-foreground mt-1 text-sm break-words"
          >
            {statusText}
          </p>
        </div>
        <MetadataPill
          value={`${selectedCount}/${MAX_RECORDING_COMPARISON_RECORDINGS} selected`}
          wrap
        />
      </div>

      {limitText ? (
        <p
          role="status"
          data-testid="recording-comparison-limit"
          className="text-muted-foreground text-xs font-medium"
        >
          {limitText}
        </p>
      ) : null}

      {selectedRecordings.length > 0 ? (
        <div
          data-testid="recording-comparison-metadata"
          className="grid gap-3 xl:grid-cols-2"
        >
          {selectedRecordings.map((recording) => (
            <RecordingComparisonMetadataCard
              key={recording.id}
              recording={recording}
              organization={resolveRecordingOrganizationForRecord(
                recording,
                organizationByRecordingId
              )}
              markerCount={
                markers.filter((marker) => marker.recordingId === recording.id)
                  .length
              }
              takeContext={takeContextByRecordingId.get(recording.id) ?? null}
            />
          ))}
        </div>
      ) : null}

      {loading ? (
        <p
          role="status"
          data-testid="recording-comparison-loading"
          className="text-muted-foreground text-sm font-medium"
        >
          Loading recording comparison waveform evidence.
        </p>
      ) : null}

      {errorMessage ? (
        <p
          role="alert"
          data-testid="recording-comparison-error"
          className="text-destructive text-sm font-medium"
        >
          {errorMessage}
        </p>
      ) : null}

      {result ? (
        <div data-testid="recording-comparison-waveform" className="grid gap-2">
          <h3 className="text-sm font-semibold">Waveform evidence</h3>
          <div
            data-testid="recording-comparison-waveform-results"
            className="grid gap-2"
          >
            {result.sources.map((source) => (
              <WaveformComparisonRow
                key={`recording-${source.recordingId}-${source.status}`}
                source={source}
              />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function RecordingComparisonMetadataCard({
  recording,
  organization,
  markerCount,
  takeContext
}: {
  recording: ReviewRecording;
  organization: ResolvedRecordingOrganization;
  markerCount: number;
  takeContext: RecordingComparisonTakeContext | null;
}) {
  const displayName = getRecordingDisplayName(recording);
  const fields = getRecordingComparisonMetadataFields({
    recording,
    organization,
    markerCount,
    takeContext
  });

  return (
    <section
      data-testid={`recording-comparison-metadata-${recording.id}`}
      aria-label={`${displayName} comparison metadata`}
      className="border-border bg-muted/40 min-w-0 rounded-md border px-3 py-3"
    >
      <h3 className="text-sm font-semibold break-words">{displayName}</h3>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        {fields.map((field) => (
          <div
            key={field.label}
            className="border-border bg-background rounded-md border px-2 py-2"
          >
            <dt className="text-muted-foreground text-xs font-medium">
              {field.label}
            </dt>
            <dd className="mt-1 font-semibold break-words">{field.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function getRecordingComparisonMetadataFields({
  recording,
  organization,
  markerCount,
  takeContext
}: {
  recording: ReviewRecording;
  organization: ResolvedRecordingOrganization;
  markerCount: number;
  takeContext: RecordingComparisonTakeContext | null;
}) {
  const sheetLabel = recording.sheetName?.trim() || recording.sheetId?.trim();
  const segmentLabel =
    recording.segmentContext?.segmentName?.trim() ||
    recording.segmentContext?.segmentId?.trim();
  const artifactSizeKb = Math.max(1, Math.round(recording.sizeBytes / 1_024));

  return [
    {
      label: "Type",
      value: recording.type === "sheet" ? "Sheet recording" : "Quick recording"
    },
    { label: "Recorded", value: formatRecordingDate(recording.createdAt) },
    { label: "Duration", value: formatDuration(recording.durationMs) },
    { label: "BPM", value: `${recording.settings.bpm} BPM` },
    { label: "Time signature", value: recording.settings.timeSignature },
    {
      label: "Sheet",
      value:
        recording.type === "sheet"
          ? sheetLabel || "No sheet linked"
          : "Quick metronome"
    },
    {
      label: "Segment",
      value:
        recording.type === "quick"
          ? "Quick metronome"
          : segmentLabel || "Whole sheet / no segment"
    },
    {
      label: "Artifact",
      value: `${artifactSizeKb} KB ${recording.mimeType || "unknown type"}`
    },
    {
      label: "Tags",
      value: organization.tags.length > 0 ? organization.tags.join(", ") : "No tags"
    },
    {
      label: "Organization",
      value: getRecordingOrganizationSummary(organization)
    },
    {
      label: "Take state",
      value: getRecordingTakeStateSummary(recording, takeContext)
    },
    {
      label: "Markers",
      value:
        markerCount === 1 ? "1 manual marker" : `${markerCount} manual markers`
    }
  ];
}

function getRecordingOrganizationSummary(
  organization: ResolvedRecordingOrganization
) {
  const states = [
    organization.favorite ? "Favorite" : null,
    organization.archived ? "Archived" : null
  ].filter((state): state is string => Boolean(state));

  return states.length > 0 ? states.join(", ") : "Not favorite, active view";
}

function getRecordingTakeStateSummary(
  recording: ReviewRecording,
  takeContext: RecordingComparisonTakeContext | null
) {
  if (!takeContext) {
    return recording.type === "sheet" ? "No grouped take state" : "Quick take";
  }

  const states = [
    takeContext.isLatest ? "Latest" : null,
    takeContext.selection.bestRecording?.id === recording.id ? "Best" : null,
    takeContext.selection.activeRecording?.id === recording.id ? "Active" : null
  ].filter((state): state is string => Boolean(state));

  return states.length > 0 ? states.join(", ") : "Take in history";
}

function WaveformComparisonPanel({
  group,
  titleId,
  selectedRecordingIds,
  loading,
  result,
  errorMessage
}: {
  group: RecordingTakeGroup;
  titleId: string;
  selectedRecordingIds: string[];
  loading: boolean;
  result: WaveformComparisonSourcesResult | null;
  errorMessage: string | null;
}) {
  const groupLabel =
    group.kind === "sheet-segment"
      ? `${group.sheetName ?? group.sheetId}, ${group.segmentName ?? group.segmentId ?? "saved segment"}`
      : `${group.sheetName ?? group.sheetId}, whole sheet`;
  const selectedCount = selectedRecordingIds.length;
  const statusText =
    selectedCount === 0
      ? "Select takes to compare"
      : selectedCount === 1
        ? "Select another take to compare"
        : `${selectedCount} selected takes`;
  const limitText =
    selectedCount >= MAX_WAVEFORM_COMPARISON_TAKES
      ? `Up to ${MAX_WAVEFORM_COMPARISON_TAKES} takes can be compared at once.`
      : null;

  return (
    <div
      data-testid={`waveform-comparison-${group.groupId}`}
      aria-labelledby={titleId}
      className="border-border bg-background border-b px-3 py-3"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h4 id={titleId} className="text-sm font-semibold break-words">
            Waveform comparison for {groupLabel}
          </h4>
          <p className="text-muted-foreground mt-1 text-xs break-words">
            {statusText}
          </p>
        </div>
        <MetadataPill
          value={`${selectedCount}/${MAX_WAVEFORM_COMPARISON_TAKES} selected`}
          wrap
        />
      </div>

      {limitText ? (
        <p
          role="status"
          data-testid="waveform-comparison-limit"
          className="text-muted-foreground mt-3 text-xs font-medium"
        >
          {limitText}
        </p>
      ) : null}

      {loading ? (
        <p
          role="status"
          data-testid="waveform-comparison-loading"
          className="text-muted-foreground mt-3 text-sm font-medium"
        >
          Loading waveform comparison sources.
        </p>
      ) : null}

      {errorMessage ? (
        <p
          role="alert"
          data-testid="waveform-comparison-error"
          className="text-destructive mt-3 text-sm font-medium"
        >
          {errorMessage}
        </p>
      ) : null}

      {result ? (
        <div
          data-testid="waveform-comparison-results"
          className="mt-3 grid gap-2"
        >
          {result.sources.map((source) => (
            <WaveformComparisonRow
              key={`${source.recordingId}-${source.status}`}
              source={source}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function WaveformComparisonRow({
  source
}: {
  source: WaveformComparisonSourceState;
}) {
  const displayName = source.recording
    ? getRecordingDisplayName(source.recording)
    : source.recordingId;

  if (source.status === "unavailable") {
    return (
      <div
        data-testid={`waveform-comparison-row-${source.recordingId}`}
        data-waveform-state="unavailable"
        data-unavailable-reason={source.reason}
        className="border-border bg-muted/50 rounded-md border px-3 py-3"
      >
        <div className="flex flex-col gap-1 text-sm">
          <span className="font-semibold break-words">{displayName}</span>
          <span className="text-muted-foreground break-words">
            {source.message}
          </span>
        </div>
      </div>
    );
  }

  const sourceLabel =
    source.source === "trusted-peaks" ? "Trusted peaks" : "Decoded audio";
  const durationLabel = formatDuration(source.durationMs);

  return (
    <div
      data-testid={`waveform-comparison-row-${source.recordingId}`}
      data-waveform-state="ready"
      className="border-border bg-muted/50 rounded-md border px-3 py-3"
    >
      <div className="grid gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold break-words">{displayName}</p>
            <p className="text-muted-foreground mt-1 text-xs break-words">
              {sourceLabel} · Duration {durationLabel}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs sm:justify-end">
            <MetadataPill value={sourceLabel} wrap />
            <MetadataPill value={durationLabel} wrap />
          </div>
        </div>
        <PeakWaveform
          recordingName={displayName}
          peaks={source.peaks}
          source={source.source}
          recordingId={source.recordingId}
        />
        {source.durationWarning ? (
          <p
            data-testid={`waveform-comparison-duration-warning-${source.recordingId}`}
            className="text-muted-foreground text-xs font-medium break-words"
          >
            {source.durationWarning}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function PeakWaveform({
  recordingName,
  peaks,
  source,
  recordingId
}: {
  recordingName: string;
  peaks: number[];
  source: string;
  recordingId: string;
}) {
  const usablePeaks = peaks.filter((peak) => Number.isFinite(peak) && peak >= 0);
  const maxPeak = Math.max(...usablePeaks, 0);

  return (
    <div
      role="img"
      aria-label={`${recordingName} waveform from ${source === "trusted-peaks" ? "trusted peaks" : "decoded audio"}`}
      data-testid={`comparison-waveform-${recordingId}`}
      data-waveform-source={source}
      data-peak-count={String(usablePeaks.length)}
      className="border-border bg-background flex h-14 w-full min-w-0 items-center gap-1 overflow-hidden rounded-md border px-2"
    >
      {usablePeaks.map((peak, index) => {
        const normalizedPeak = maxPeak > 0 ? peak / maxPeak : 0;
        const heightPercent = Math.max(10, Math.min(100, normalizedPeak * 100));

        return (
          <span
            key={`${recordingId}-peak-${index}`}
            aria-hidden="true"
            className="bg-accent min-w-1 flex-1 rounded-full"
            style={{ height: `${heightPercent}%` }}
          />
        );
      })}
    </div>
  );
}

function TakeSelectionButton({
  icon,
  label,
  pressed,
  ariaLabel,
  testId,
  onClick
}: {
  icon: ReactNode;
  label: string;
  pressed: boolean;
  ariaLabel: string;
  testId: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      aria-label={ariaLabel}
      aria-pressed={pressed}
      onClick={onClick}
      className="border-border bg-background hover:bg-muted focus-visible:ring-ring aria-pressed:border-accent aria-pressed:bg-accent/20 inline-flex h-9 min-w-24 items-center justify-center gap-1 rounded-md border px-3 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function RecordingDetails({
  recording,
  organization,
  reviewService,
  markers,
  confirmingDelete,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete
}: {
  recording: ReviewRecording;
  organization: ResolvedRecordingOrganization | null;
  reviewService: RecordingsReviewService;
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
  const [tagInput, setTagInput] = useState("");
  const [organizationErrorMessage, setOrganizationErrorMessage] = useState<
    string | null
  >(null);
  const [audioExportState, setAudioExportState] = useState<
    | { status: "idle"; message: null }
    | { status: "exporting"; message: string }
    | { status: "success"; message: string }
    | { status: "error"; message: string }
  >({ status: "idle", message: null });
  const resolvedOrganization =
    organization ?? resolveRecordingOrganization({ recording, organization: null });
  const audioExportEligibility =
    reviewService.getRecordingAudioExportEligibility(recording);
  const handlePlaybackControlsChange = useCallback(
    (controls: RecordingPlaybackControls | null) => {
      setPlaybackControls(controls);
    },
    []
  );
  const practiceAgainAccessibleName =
    getPracticeAgainAccessibleName(recording);
  const exportAudioAccessibleName = `Export audio for ${getRecordingDisplayName(
    recording
  )}`;
  const exportUnavailableMessage = audioExportEligibility.available
    ? null
    : audioExportEligibility.message;
  const exportButtonDisabled =
    audioExportState.status === "exporting" || !audioExportEligibility.available;

  async function exportRecordingAudio() {
    setAudioExportState({
      status: "exporting",
      message: "Preparing audio export."
    });

    let result: RecordingAudioExportResult;

    try {
      result = await reviewService.exportRecordingAudio({
        recordingId: recording.id
      });
    } catch {
      setAudioExportState({
        status: "error",
        message: "Audio export could not be started in this browser."
      });
      return;
    }

    if (result.ok) {
      setAudioExportState({
        status: "success",
        message: "Audio export started."
      });
      return;
    }

    setAudioExportState({
      status: "error",
      message: result.message
    });
  }

  function toggleRecordingFavorite() {
    try {
      reviewService.setRecordingFavorite(
        recording.id,
        !resolvedOrganization.favorite
      );
      setOrganizationErrorMessage(null);
    } catch {
      setOrganizationErrorMessage("Favorite state could not be updated.");
    }
  }

  function toggleRecordingArchive() {
    try {
      reviewService.setRecordingArchived(
        recording.id,
        !resolvedOrganization.archived
      );
      setOrganizationErrorMessage(null);
    } catch {
      setOrganizationErrorMessage("Archive state could not be updated.");
    }
  }

  function addRecordingTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      reviewService.addRecordingTag(recording.id, tagInput);
      setTagInput("");
      setOrganizationErrorMessage(null);
    } catch (error) {
      setOrganizationErrorMessage(
        error instanceof Error ? error.message : "Tag could not be added."
      );
    }
  }

  function removeRecordingTag(tag: string) {
    try {
      reviewService.removeRecordingTag(recording.id, tag);
      setOrganizationErrorMessage(null);
    } catch {
      setOrganizationErrorMessage("Tag could not be removed.");
    }
  }

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
          <>
            <Button
              type="button"
              variant="secondary"
              data-testid={`export-audio-control-${recording.id}`}
              aria-label={exportAudioAccessibleName}
              aria-describedby={
                exportUnavailableMessage
                  ? `recording-audio-export-unavailable-${recording.id}`
                  : undefined
              }
              disabled={exportButtonDisabled}
              onClick={exportRecordingAudio}
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              {audioExportState.status === "exporting"
                ? "Exporting"
                : "Export Audio"}
            </Button>
            <Button asChild variant="secondary">
              <Link
                href={getContinuePracticeHref(recording)}
                aria-label={practiceAgainAccessibleName}
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Practice Again
              </Link>
            </Button>
          </>
        }
      />

      {exportUnavailableMessage ? (
        <p
          id={`recording-audio-export-unavailable-${recording.id}`}
          data-testid="recording-audio-export-unavailable"
          className="text-muted-foreground text-sm font-medium"
        >
          {exportUnavailableMessage}
        </p>
      ) : null}
      {audioExportState.status === "exporting" ||
      audioExportState.status === "success" ? (
        <p
          role="status"
          data-testid="recording-audio-export-status"
          className="text-muted-foreground text-sm font-medium"
        >
          {audioExportState.message}
        </p>
      ) : null}
      {audioExportState.status === "error" ? (
        <p
          role="alert"
          data-testid="recording-audio-export-error"
          className="text-destructive text-sm font-medium"
        >
          {audioExportState.message}
        </p>
      ) : null}

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

      <div className="border-border bg-background rounded-md border px-3 py-3">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Tag className="text-accent h-4 w-4" aria-hidden="true" />
              Organization
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                data-testid={`details-favorite-control-${recording.id}`}
                aria-label={
                  resolvedOrganization.favorite
                    ? `Remove favorite from ${getRecordingDisplayName(recording)}`
                    : `Mark ${getRecordingDisplayName(recording)} as favorite`
                }
                aria-pressed={resolvedOrganization.favorite}
                onClick={toggleRecordingFavorite}
                className="border-border bg-background hover:bg-muted focus-visible:ring-ring aria-pressed:border-accent aria-pressed:bg-accent/20 inline-flex h-9 items-center justify-center gap-1 rounded-md border px-3 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                <Star className="h-4 w-4" aria-hidden="true" />
                {resolvedOrganization.favorite ? "Favorited" : "Favorite"}
              </button>
              <button
                type="button"
                data-testid={`details-archive-control-${recording.id}`}
                aria-label={
                  resolvedOrganization.archived
                    ? `Unarchive ${getRecordingDisplayName(recording)}`
                    : `Archive ${getRecordingDisplayName(recording)}`
                }
                aria-pressed={resolvedOrganization.archived}
                onClick={toggleRecordingArchive}
                className="border-border bg-background hover:bg-muted focus-visible:ring-ring aria-pressed:border-accent aria-pressed:bg-accent/20 inline-flex h-9 items-center justify-center gap-1 rounded-md border px-3 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                <Archive className="h-4 w-4" aria-hidden="true" />
                {resolvedOrganization.archived ? "Unarchive" : "Archive"}
              </button>
            </div>
          </div>

          {organizationErrorMessage ? (
            <p
              role="alert"
              data-testid="recording-organization-error"
              className="text-destructive text-sm font-medium"
            >
              {organizationErrorMessage}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {resolvedOrganization.archived ? (
              <MetadataPill value="Archived" wrap />
            ) : null}
            {resolvedOrganization.tags.map((tag) => (
              <span
                key={tag}
                className="border-border bg-muted inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium"
              >
                <span className="break-words">{tag}</span>
                <button
                  type="button"
                  aria-label={`Remove tag ${tag}`}
                  data-testid={`remove-recording-tag-${tag}`}
                  onClick={() => removeRecordingTag(tag)}
                  className="hover:bg-background focus-visible:ring-ring rounded-sm px-1 focus-visible:ring-2 focus-visible:outline-none"
                >
                  Remove
                </button>
              </span>
            ))}
            {resolvedOrganization.tags.length === 0 &&
            !resolvedOrganization.archived ? (
              <span className="text-muted-foreground text-sm">
                No tags saved for this recording.
              </span>
            ) : null}
          </div>

          <form
            onSubmit={addRecordingTag}
            className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"
          >
            <label className="grid gap-1">
              <span className="text-muted-foreground text-xs font-medium">
                Add tag
              </span>
              <input
                aria-label="Add recording tag"
                value={tagInput}
                onChange={(event) => setTagInput(event.target.value)}
                placeholder="Warmup"
                className="border-border bg-background focus-visible:ring-ring h-10 rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
              />
            </label>
            <Button type="submit" variant="secondary" className="self-end">
              <Tag className="h-4 w-4" aria-hidden="true" />
              Add Tag
            </Button>
          </form>
        </div>
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

function getPracticeAgainAccessibleName(recording: ReviewRecording) {
  const displayName = getRecordingDisplayName(recording);

  if (recording.type === "quick") {
    return `Practice again in Quick Metronome for ${displayName}`;
  }

  const sheetLabel = recording.sheetName?.trim() || recording.sheetId?.trim();
  const segmentLabel =
    recording.segmentContext?.segmentName?.trim() ||
    recording.segmentContext?.segmentId?.trim();

  if (sheetLabel && segmentLabel) {
    return `Practice again for ${segmentLabel} on ${sheetLabel}`;
  }

  if (sheetLabel) {
    return `Practice again for whole-sheet practice on ${sheetLabel}`;
  }

  return `Practice again for sheet recording ${displayName} without a linked sheet`;
}

function MetadataPill({
  value,
  wrap = false
}: {
  value: string;
  wrap?: boolean;
}) {
  return (
    <span
      className={`border-border bg-muted inline-block max-w-full rounded-md border px-2 py-1 font-medium ${
        wrap ? "whitespace-normal break-words" : "truncate"
      }`}
    >
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
