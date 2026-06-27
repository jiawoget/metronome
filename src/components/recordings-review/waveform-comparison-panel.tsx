import { formatDuration } from "@/lib/recordings-review/format";
import { getRecordingDisplayName } from "@/lib/recordings-review/history";
import type {
  WaveformComparisonSourceState,
  WaveformComparisonSourcesResult
} from "@/lib/recordings-review/waveform-comparison-sources";
import type { RecordingTakeGroup } from "@/lib/recordings-review/types";
import { MetadataPill } from "@/components/recordings-review/metadata-pill";

type WaveformComparisonEvidenceProps = {
  loading: boolean;
  result: WaveformComparisonSourcesResult | null;
  errorMessage: string | null;
  loadingText: string;
  loadingTestId: string;
  errorTestId: string;
  resultsTestId: string;
  containerTestId?: string;
  title?: string;
  className?: string;
};

export function WaveformComparisonEvidence({
  loading,
  result,
  errorMessage,
  loadingText,
  loadingTestId,
  errorTestId,
  resultsTestId,
  containerTestId,
  title,
  className = "grid gap-2"
}: WaveformComparisonEvidenceProps) {
  return (
    <>
      {loading ? (
        <p
          role="status"
          data-testid={loadingTestId}
          className="text-muted-foreground text-sm font-medium"
        >
          {loadingText}
        </p>
      ) : null}

      {errorMessage ? (
        <p
          role="alert"
          data-testid={errorTestId}
          className="text-destructive text-sm font-medium"
        >
          {errorMessage}
        </p>
      ) : null}

      {result ? (
        <div data-testid={containerTestId} className={className}>
          {title ? <h3 className="text-sm font-semibold">{title}</h3> : null}
          <div data-testid={resultsTestId} className="grid gap-2">
            {result.sources.map((source) => (
              <WaveformComparisonRow
                key={`${source.recordingId}-${source.status}`}
                source={source}
              />
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}

export function WaveformComparisonPanel({
  group,
  titleId,
  selectedRecordingIds,
  maxSelected,
  loading,
  result,
  errorMessage
}: {
  group: RecordingTakeGroup;
  titleId: string;
  selectedRecordingIds: string[];
  maxSelected: number;
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
    selectedCount >= maxSelected
      ? `Up to ${maxSelected} takes can be compared at once.`
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
        <MetadataPill value={`${selectedCount}/${maxSelected} selected`} wrap />
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

      <div className="mt-3">
        <WaveformComparisonEvidence
          loading={loading}
          result={result}
          errorMessage={errorMessage}
          loadingText="Loading waveform comparison sources."
          loadingTestId="waveform-comparison-loading"
          errorTestId="waveform-comparison-error"
          resultsTestId="waveform-comparison-results"
          className="grid gap-2"
        />
      </div>
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
      aria-label={`${recordingName} waveform from ${
        source === "trusted-peaks" ? "trusted peaks" : "decoded audio"
      }`}
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
