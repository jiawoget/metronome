"use client";

import { RecordingArtifactReview } from "@/components/recordings-review/recording-artifact-review";
import { formatDuration } from "@/lib/recordings-review/format";
import { getRecordingDisplayName } from "@/lib/recordings-review/history";
import type { ReviewRecording } from "@/lib/recordings-review/types";

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

      <RecordingArtifactReview
        recording={recording}
        adapterClassName="min-h-16 overflow-hidden rounded-md border border-border bg-card"
        adapterTestId="sheet-waveform-adapter"
        derivedWaveformClassName="flex h-14 items-center gap-1 rounded-md border border-border bg-background px-2"
        derivedWaveformTestId="sheet-derived-waveform"
        errorTestId="sheet-recording-artifact-error"
        peakHeightPx={48}
        playAriaLabel="Play latest sheet recording"
        playText="Play latest"
        pauseAriaLabel="Pause latest sheet recording"
        pauseText="Pause latest"
        readyGapClassName="grid gap-2"
        sourceTestId="sheet-waveform-source"
        warningTestId="sheet-recording-duration-warning"
      />
    </div>
  );
}
