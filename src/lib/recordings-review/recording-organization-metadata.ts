import { getCreatedAtSortValue } from "@/lib/recordings-review/take-groups";
import type {
  RecordingOrganizationMetadata,
  ResolvedRecordingOrganization,
  ReviewRecording
} from "@/lib/recordings-review/types";

export const MAX_RECORDING_TAGS = 8;
export const MAX_RECORDING_TAG_LENGTH = 24;

export function normalizeRecordingOrganizationEntries(
  values: unknown,
  recordingIds?: Iterable<string>
): RecordingOrganizationMetadata[] {
  if (!Array.isArray(values)) {
    return [];
  }

  const validRecordingIds = recordingIds ? new Set(recordingIds) : null;
  const entriesByRecordingId = new Map<string, RecordingOrganizationMetadata>();

  for (const value of values) {
    const entry = normalizeRecordingOrganizationEntry(value);

    if (!entry) {
      continue;
    }

    if (validRecordingIds && !validRecordingIds.has(entry.recordingId)) {
      continue;
    }

    const existing = entriesByRecordingId.get(entry.recordingId);

    if (
      !existing ||
      compareRecordingOrganizationPriority(entry, existing) < 0
    ) {
      entriesByRecordingId.set(entry.recordingId, entry);
    }
  }

  return Array.from(entriesByRecordingId.values()).sort(
    compareRecordingOrganizationByRecordingId
  );
}

export function createRecordingOrganizationMetadata({
  recordingId,
  tags,
  favorite,
  archived,
  updatedAt
}: {
  recordingId: string;
  tags: string[];
  favorite: boolean;
  archived: boolean;
  updatedAt: string;
}): RecordingOrganizationMetadata | null {
  const normalizedRecordingId = normalizeRequiredString(recordingId);
  const normalizedUpdatedAt = normalizeRequiredString(updatedAt);
  const normalizedTags = normalizeRecordingTagsForWrite(tags);

  if (!normalizedRecordingId || !normalizedUpdatedAt) {
    throw new Error("Recording organization requires a recording id and updated time.");
  }

  if (
    normalizedTags.length === 0 &&
    favorite === false &&
    archived === false
  ) {
    return null;
  }

  return {
    recordingId: normalizedRecordingId,
    tags: normalizedTags,
    favorite,
    archived,
    updatedAt: normalizedUpdatedAt
  };
}

export function resolveRecordingOrganization({
  recording,
  organization
}: {
  recording: ReviewRecording;
  organization: RecordingOrganizationMetadata | null;
}): ResolvedRecordingOrganization {
  return {
    recordingId: recording.id,
    tags: organization?.tags ?? [],
    favorite: organization?.favorite ?? false,
    archived: organization?.archived ?? false,
    updatedAt: organization?.updatedAt ?? null
  };
}

export function removeRecordingOrganizations({
  organizations,
  recordingIds
}: {
  organizations: RecordingOrganizationMetadata[];
  recordingIds: Iterable<string>;
}) {
  const removedIds = new Set(
    Array.from(recordingIds)
      .map((recordingId) => normalizeRequiredString(recordingId))
      .filter((recordingId): recordingId is string => recordingId !== null)
  );

  if (removedIds.size === 0) {
    return organizations;
  }

  return organizations.filter(
    (organization) => !removedIds.has(organization.recordingId)
  );
}

export function normalizeRecordingTagsForWrite(tags: unknown): string[] {
  if (!Array.isArray(tags)) {
    throw new Error("Recording tags must be a list of labels.");
  }

  const normalizedTags: string[] = [];
  const seenTags = new Set<string>();

  for (const tag of tags) {
    const normalizedTag = normalizeRecordingTagForWrite(tag);
    const key = normalizedTag.toLowerCase();

    if (seenTags.has(key)) {
      throw new Error("Recording tags must not contain duplicates.");
    }

    seenTags.add(key);
    normalizedTags.push(normalizedTag);
  }

  if (normalizedTags.length > MAX_RECORDING_TAGS) {
    throw new Error(`A recording can have up to ${MAX_RECORDING_TAGS} tags.`);
  }

  return normalizedTags;
}

export function normalizeRecordingTagForWrite(tag: unknown): string {
  const normalizedTag = normalizeRecordingTag(tag);

  if (!normalizedTag) {
    throw new Error("Recording tags cannot be empty.");
  }

  return normalizedTag;
}

function normalizeRecordingOrganizationEntry(
  value: unknown
): RecordingOrganizationMetadata | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const entry = value as Partial<RecordingOrganizationMetadata>;
  const recordingId = normalizeRequiredString(entry.recordingId);
  const updatedAt = normalizeRequiredString(entry.updatedAt);
  const favorite = entry.favorite === true;
  const archived = entry.archived === true;
  const tags = normalizePersistedTags(entry.tags);

  if (!recordingId || !updatedAt) {
    return null;
  }

  if (tags.length === 0 && !favorite && !archived) {
    return null;
  }

  return {
    recordingId,
    tags,
    favorite,
    archived,
    updatedAt
  };
}

function normalizePersistedTags(tags: unknown) {
  if (!Array.isArray(tags)) {
    return [];
  }

  const normalizedTags: string[] = [];
  const seenTags = new Set<string>();

  for (const tag of tags) {
    const normalizedTag = normalizeRecordingTag(tag);

    if (!normalizedTag) {
      continue;
    }

    const key = normalizedTag.toLowerCase();

    if (seenTags.has(key)) {
      continue;
    }

    seenTags.add(key);
    normalizedTags.push(normalizedTag);

    if (normalizedTags.length >= MAX_RECORDING_TAGS) {
      break;
    }
  }

  return normalizedTags;
}

function normalizeRecordingTag(tag: unknown) {
  if (typeof tag !== "string") {
    return null;
  }

  if (/[\u0000-\u001f\u007f,]/.test(tag)) {
    return null;
  }

  const normalizedTag = tag.trim().replace(/\s+/g, " ");

  if (normalizedTag.length === 0) {
    return null;
  }

  if (normalizedTag.length > MAX_RECORDING_TAG_LENGTH) {
    return null;
  }

  return normalizedTag;
}

function normalizeRequiredString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized.length > 0 ? normalized : null;
}

function compareRecordingOrganizationPriority(
  left: RecordingOrganizationMetadata,
  right: RecordingOrganizationMetadata
) {
  const timeDifference = compareSortValuesByNewest(
    getCreatedAtSortValue(left.updatedAt),
    getCreatedAtSortValue(right.updatedAt)
  );

  if (timeDifference !== 0) {
    return timeDifference;
  }

  return (
    compareStrings(left.recordingId, right.recordingId) ||
    compareStrings(left.tags.join("\u0001"), right.tags.join("\u0001")) ||
    compareBooleans(left.favorite, right.favorite) ||
    compareBooleans(left.archived, right.archived) ||
    compareStrings(left.updatedAt, right.updatedAt)
  );
}

function compareRecordingOrganizationByRecordingId(
  left: RecordingOrganizationMetadata,
  right: RecordingOrganizationMetadata
) {
  return (
    compareStrings(left.recordingId, right.recordingId) ||
    compareRecordingOrganizationPriority(left, right)
  );
}

function compareStrings(left: string, right: string) {
  return left.localeCompare(right);
}

function compareBooleans(left: boolean, right: boolean) {
  if (left === right) {
    return 0;
  }

  return left ? -1 : 1;
}

function compareSortValuesByNewest(left: number, right: number) {
  if (left === right) {
    return 0;
  }

  return right > left ? 1 : -1;
}
