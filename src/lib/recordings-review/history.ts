import { formatDuration, formatRecordingDate } from "@/lib/recordings-review/format";
import { getSheetPracticeQueryHref } from "@/domain/sheet/routes";
export { getErrorMarkerSeekTarget, sortErrorMarkers } from "@/lib/recordings-review/error-markers";
import { sortReviewRecordingsByNewest } from "@/lib/recordings-review/take-groups";
import type {
  RecordingTakeGroup,
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
  return sortReviewRecordingsByNewest(recordings);
}

export function getContinuePracticeHref(recording: ReviewRecording) {
  if (recording.type === "sheet") {
    const sheetId = normalizeOptionalRouteValue(recording.sheetId);

    return getSheetPracticeQueryHref({
      recordingId: recording.id,
      sheetId,
      segmentId: sheetId ? recording.segmentContext?.segmentId : null
    });
  }

  return `/quick-metronome?recordingId=${encodeURIComponent(recording.id)}`;
}

export function getTakeGroupPracticeHref(group: RecordingTakeGroup) {
  return getSheetPracticeQueryHref({
    recordingId: group.latestRecording.id,
    sheetId: group.sheetId,
    segmentId: group.kind === "sheet-segment" ? group.segmentId : null
  });
}

function normalizeOptionalRouteValue(value: string | null | undefined) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

function getVisibleMetadata(recording: ReviewRecording) {
  return [
    getRecordingDisplayName(recording),
    recording.type,
    recording.sheetName ?? "",
    recording.segmentContext?.segmentName ?? "",
    recording.segmentContext?.segmentId ?? "",
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
