import { formatDuration, formatRecordingDate } from "@/lib/recordings-review/format";
import type {
  RecordingErrorMarker,
  RecordingReviewType,
  ReviewRecording
} from "@/lib/recordings-review/types";

export type RecordingTypeFilter = "all" | RecordingReviewType;

export function getRecordingDisplayName(recording: ReviewRecording) {
  if (recording.name?.trim()) {
    return recording.name.trim();
  }

  return recording.type === "sheet" ? "Sheet practice recording" : "Quick metronome recording";
}

export function sortRecordingsByNewest(recordings: ReviewRecording[]) {
  return [...recordings].sort((left, right) => {
    const leftTime = new Date(left.createdAt).getTime();
    const rightTime = new Date(right.createdAt).getTime();

    return rightTime - leftTime;
  });
}

export function sortErrorMarkers(markers: RecordingErrorMarker[]) {
  return [...markers].sort((left, right) => left.timestampMs - right.timestampMs);
}

export function getContinuePracticeHref(recording: ReviewRecording) {
  if (recording.type === "sheet") {
    const params = new URLSearchParams({ recordingId: recording.id });

    if (recording.sheetId) {
      params.set("sheetId", recording.sheetId);
    }

    return `/sheet-practice?${params.toString()}`;
  }

  return `/quick-metronome?recordingId=${encodeURIComponent(recording.id)}`;
}

export function getVisibleMetadata(recording: ReviewRecording) {
  return [
    getRecordingDisplayName(recording),
    recording.type,
    recording.sheetName ?? "",
    recording.settings.bpm.toString(),
    `${recording.settings.bpm} BPM`,
    recording.settings.timeSignature,
    formatDuration(recording.durationMs),
    formatRecordingDate(recording.createdAt)
  ];
}

export function filterRecordings({
  recordings,
  query,
  type
}: {
  recordings: ReviewRecording[];
  query: string;
  type: RecordingTypeFilter;
}) {
  const normalizedQuery = query.trim().toLowerCase();

  return sortRecordingsByNewest(recordings).filter((recording) => {
    if (type !== "all" && recording.type !== type) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return getVisibleMetadata(recording).some((value) =>
      value.toLowerCase().includes(normalizedQuery)
    );
  });
}
