import {
  formatDuration,
  formatRecordingDate
} from "@/lib/recordings-review/format";
import { getRecordingDisplayName } from "@/lib/recordings-review/history";
import type {
  RecordingErrorMarker,
  RecordingTakeGroup,
  ResolvedRecordingTakeSelection,
  ReviewRecording
} from "@/lib/recordings-review/types";

export type TakeHistorySummaryFieldKey =
  | "count"
  | "latest"
  | "best"
  | "duration"
  | "bpm"
  | "timeSignature"
  | "markers";

export type TakeHistorySummaryField = {
  key: TakeHistorySummaryFieldKey;
  label: string;
  value: string;
};

export type TakeHistorySummary = {
  fields: TakeHistorySummaryField[];
  takeCountLabel: string;
  latestLabel: string;
  bestLabel: string;
  durationLabel: string;
  bpmLabel: string;
  timeSignatureLabel: string;
  markerLabel: string;
  markerCount: number | null;
};

export function createTakeHistorySummary({
  group,
  selection,
  markers
}: {
  group: RecordingTakeGroup;
  selection: ResolvedRecordingTakeSelection;
  markers?: readonly RecordingErrorMarker[] | null;
}): TakeHistorySummary {
  const latestRecording = group.latestRecording;
  const latestDateLabel = formatRecordingDate(group.latestRecordedAt);
  const latestName = getRecordingDisplayName(latestRecording);
  const takeCountLabel = `${group.takeCount} ${
    group.takeCount === 1 ? "take" : "takes"
  }`;
  const latestLabel =
    latestDateLabel === "Unknown date"
      ? `Latest unknown date, ${latestName}`
      : `${latestDateLabel}, ${latestName}`;
  const bestLabel = selection.bestRecording
    ? getRecordingDisplayName(selection.bestRecording)
    : "none";
  const durationLabel = createDurationLabel(latestRecording);
  const bpmLabel = createBpmLabel(group.recordings, latestRecording);
  const timeSignatureLabel = createTimeSignatureLabel(
    group.recordings,
    latestRecording
  );
  const markerSummary = createMarkerSummaryLabel({ group, markers });

  return {
    fields: [
      {
        key: "count",
        label: "Takes",
        value: takeCountLabel
      },
      {
        key: "latest",
        label: "Latest",
        value: latestLabel
      },
      {
        key: "best",
        label: "Best",
        value: bestLabel
      },
      {
        key: "duration",
        label: "Latest duration",
        value: durationLabel
      },
      {
        key: "bpm",
        label: "BPM",
        value: bpmLabel
      },
      {
        key: "timeSignature",
        label: "Time signature",
        value: timeSignatureLabel
      },
      {
        key: "markers",
        label: "Markers",
        value: markerSummary.label
      }
    ],
    takeCountLabel,
    latestLabel,
    bestLabel,
    durationLabel,
    bpmLabel,
    timeSignatureLabel,
    markerLabel: markerSummary.label,
    markerCount: markerSummary.count
  };
}

function createDurationLabel(recording: ReviewRecording) {
  return Number.isFinite(recording.durationMs) && recording.durationMs >= 0
    ? formatDuration(recording.durationMs)
    : "Duration unavailable";
}

function createBpmLabel(
  recordings: readonly ReviewRecording[],
  latestRecording: ReviewRecording
) {
  const latestBpm = latestRecording.settings.bpm;

  if (!isValidBpm(latestBpm)) {
    return "BPM unavailable";
  }

  const hasMixedBpm = recordings.some(
    (recording) => recording.settings.bpm !== latestBpm
  );

  return hasMixedBpm ? `Mixed BPM, latest ${latestBpm}` : `${latestBpm} BPM`;
}

function createTimeSignatureLabel(
  recordings: readonly ReviewRecording[],
  latestRecording: ReviewRecording
) {
  const latestTimeSignature = normalizeTimeSignature(
    latestRecording.settings.timeSignature
  );

  if (!latestTimeSignature) {
    return "Time signature unavailable";
  }

  const hasMixedTimeSignatures = recordings.some(
    (recording) =>
      normalizeTimeSignature(recording.settings.timeSignature) !==
      latestTimeSignature
  );

  return hasMixedTimeSignatures
    ? `Mixed time signatures, latest ${latestTimeSignature}`
    : latestTimeSignature;
}

function createMarkerSummaryLabel({
  group,
  markers
}: {
  group: RecordingTakeGroup;
  markers?: readonly RecordingErrorMarker[] | null;
}) {
  if (!Array.isArray(markers)) {
    return {
      label: "Markers unavailable",
      count: null
    };
  }

  const recordingIds = new Set(
    group.recordings.map((recording) => recording.id)
  );
  const markerCount = markers.filter((marker) =>
    recordingIds.has(marker.recordingId)
  ).length;

  if (markerCount === 0) {
    return {
      label: "No markers",
      count: markerCount
    };
  }

  return {
    label: `${markerCount} ${markerCount === 1 ? "marker" : "markers"}`,
    count: markerCount
  };
}

function isValidBpm(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function normalizeTimeSignature(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}
