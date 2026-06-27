import { MetadataPill } from "@/components/recordings-review/metadata-pill";
import { WaveformComparisonEvidence } from "@/components/recordings-review/waveform-comparison-panel";
import {
  formatDuration,
  formatRecordingDate
} from "@/lib/recordings-review/format";
import {
  getRecordingDisplayName
} from "@/lib/recordings-review/history";
import { resolveRecordingOrganization } from "@/lib/recordings-review/recording-organization-metadata";
import type {
  RecordingErrorMarker,
  RecordingOrganizationMetadata,
  RecordingTakeGroup,
  ResolvedRecordingOrganization,
  ResolvedRecordingTakeSelection,
  ReviewRecording
} from "@/lib/recordings-review/types";
import type { WaveformComparisonSourcesResult } from "@/lib/recordings-review/waveform-comparison-sources";

export type RecordingComparisonTakeContext = {
  group: RecordingTakeGroup;
  selection: ResolvedRecordingTakeSelection;
  isLatest: boolean;
};

export function RecordingComparisonPanel({
  selectedRecordings,
  selectedRecordingIds,
  organizationByRecordingId,
  markers,
  takeContextByRecordingId,
  maxSelected,
  loading,
  result,
  errorMessage
}: {
  selectedRecordings: ReviewRecording[];
  selectedRecordingIds: string[];
  organizationByRecordingId: Map<string, RecordingOrganizationMetadata>;
  markers: RecordingErrorMarker[];
  takeContextByRecordingId: Map<string, RecordingComparisonTakeContext>;
  maxSelected: number;
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
    selectedCount >= maxSelected
      ? `Up to ${maxSelected} recordings can be compared at once.`
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
        <MetadataPill value={`${selectedCount}/${maxSelected} selected`} wrap />
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

      <WaveformComparisonEvidence
        loading={loading}
        result={result}
        errorMessage={errorMessage}
        loadingText="Loading recording comparison waveform evidence."
        loadingTestId="recording-comparison-loading"
        errorTestId="recording-comparison-error"
        containerTestId="recording-comparison-waveform"
        resultsTestId="recording-comparison-waveform-results"
        title="Waveform evidence"
      />
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

function resolveRecordingOrganizationForRecord(
  recording: ReviewRecording,
  organizationByRecordingId: Map<string, RecordingOrganizationMetadata>
): ResolvedRecordingOrganization {
  return resolveRecordingOrganization({
    recording,
    organization: organizationByRecordingId.get(recording.id) ?? null
  });
}
