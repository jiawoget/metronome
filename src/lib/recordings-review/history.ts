import { formatDuration, formatRecordingDate } from "@/lib/recordings-review/format";
import { getSheetPracticeQueryHref } from "@/domain/sheet/routes";
export { getErrorMarkerSeekTarget, sortErrorMarkers } from "@/lib/recordings-review/error-markers";
import { sortReviewRecordingsByNewest } from "@/lib/recordings-review/take-groups";
import type {
  RecordingOrganizationMetadata,
  RecordingTakeGroup,
  RecordingReviewType,
  ReviewRecording
} from "@/lib/recordings-review/types";

export type RecordingTypeFilter = "all" | RecordingReviewType;
export type RecordingArchiveFilter = "active" | "archived" | "all";

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

function getVisibleMetadata(
  recording: ReviewRecording,
  organization: RecordingOrganizationMetadata | null
) {
  return [
    getRecordingDisplayName(recording),
    recording.type,
    ...getOrganizationSearchMetadata(organization),
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
  type,
  archiveMode = "active",
  favoritesOnly = false,
  tag = "all",
  recordingOrganization = []
}: {
  recordings: ReviewRecording[];
  query: string;
  type: RecordingTypeFilter;
  archiveMode?: RecordingArchiveFilter;
  favoritesOnly?: boolean;
  tag?: string;
  recordingOrganization?: RecordingOrganizationMetadata[];
}) {
  const normalizedQuery = query.trim().toLowerCase();
  const normalizedTag = tag.trim().toLowerCase();
  const organizationByRecordingId =
    createRecordingOrganizationMap(recordingOrganization);

  return sortRecordingsByNewest(recordings).filter((recording) => {
    if (type !== "all" && recording.type !== type) {
      return false;
    }

    const organization = organizationByRecordingId.get(recording.id) ?? null;
    const archived = organization?.archived ?? false;

    if (archiveMode === "active" && archived) {
      return false;
    }

    if (archiveMode === "archived" && !archived) {
      return false;
    }

    if (favoritesOnly && organization?.favorite !== true) {
      return false;
    }

    if (
      normalizedTag &&
      normalizedTag !== "all" &&
      !organization?.tags.some((candidate) => candidate.toLowerCase() === normalizedTag)
    ) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return getVisibleMetadata(recording, organization).some((value) =>
      value.toLowerCase().includes(normalizedQuery)
    );
  });
}

export function getRecordingTagOptions({
  recordings,
  recordingOrganization
}: {
  recordings: ReviewRecording[];
  recordingOrganization: RecordingOrganizationMetadata[];
}) {
  const recordingIds = new Set(recordings.map((recording) => recording.id));
  const tagsByKey = new Map<string, string>();

  for (const organization of recordingOrganization) {
    if (!recordingIds.has(organization.recordingId)) {
      continue;
    }

    for (const tag of organization.tags) {
      const key = tag.toLowerCase();

      if (!tagsByKey.has(key)) {
        tagsByKey.set(key, tag);
      }
    }
  }

  return Array.from(tagsByKey.values()).sort((left, right) =>
    left.localeCompare(right)
  );
}

function createRecordingOrganizationMap(
  recordingOrganization: RecordingOrganizationMetadata[]
) {
  return new Map(
    recordingOrganization.map(
      (organization) => [organization.recordingId, organization] as const
    )
  );
}

function getOrganizationSearchMetadata(
  organization: RecordingOrganizationMetadata | null
) {
  if (!organization) {
    return [];
  }

  return [
    ...organization.tags,
    organization.favorite ? "favorite" : "",
    organization.archived ? "archived" : ""
  ];
}
