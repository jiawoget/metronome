import { z } from "zod";

import { formatTimestamp } from "@/lib/recordings-review/format";
import type { RecordingErrorMarker } from "@/lib/recordings-review/types";

export const MAX_ERROR_MARKER_NOTE_LENGTH = 160;
export const ERROR_MARKER_SEEK_TOLERANCE_MS = 80;

export type ErrorMarkerValidationInput = {
  recordingId: string | null | undefined;
  timestampMs: number;
  durationMs: number;
  note?: string | null;
};

export type CreateErrorMarkerInput = ErrorMarkerValidationInput & {
  id?: string;
};

export type PersistedErrorMarkerInput = ErrorMarkerValidationInput & {
  id: string;
};

export type ErrorMarkerPlaybackControls = {
  recordingId: string;
  seekToMs: (timestampMs: number) => {
    targetTimeMs: number;
    currentTimeMs: number;
  };
};

export type ErrorMarkerSeekResult =
  | {
      ok: true;
      seekTargetMs: number;
      currentTimeMs: number;
      message: string;
    }
  | {
      ok: false;
      seekTargetMs: number | null;
      message: string;
    };

const markerInputSchema = z.object({
  recordingId: z.string().trim().min(1, "A recording is required before saving an error marker."),
  timestampMs: z.number().finite("Choose a valid recording timestamp.").min(0, "Marker time must be within the recording."),
  durationMs: z.number().finite("Recording duration is unavailable.").nonnegative("Recording duration is unavailable."),
  note: z.string().max(MAX_ERROR_MARKER_NOTE_LENGTH, `Marker note must be ${MAX_ERROR_MARKER_NOTE_LENGTH} characters or less.`).nullable()
});

function createMarkerId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `marker_${crypto.randomUUID()}`;
  }

  return `marker_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function normalizeErrorMarkerNote(note: string | null | undefined) {
  const trimmed = note?.trim() ?? "";

  return trimmed.length > 0 ? trimmed : null;
}

export function validateErrorMarkerInput(input: ErrorMarkerValidationInput) {
  if (!Number.isFinite(input.timestampMs)) {
    throw new Error("Choose a valid recording timestamp.");
  }

  if (input.timestampMs < 0) {
    throw new Error("Marker time must be within the recording.");
  }

  if (!Number.isFinite(input.durationMs) || input.durationMs <= 0) {
    throw new Error("Recording duration is unavailable.");
  }

  if (input.timestampMs > input.durationMs) {
    throw new Error("Marker time must be within the recording.");
  }

  const timestampMs = Math.round(input.timestampMs);
  const durationMs = Math.round(input.durationMs);

  const result = markerInputSchema.safeParse({
    recordingId: input.recordingId ?? "",
    timestampMs,
    durationMs,
    note: normalizeErrorMarkerNote(input.note)
  });

  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Error marker is invalid.");
  }

  const normalized = result.data;

  return normalized;
}

export function createErrorMarker(input: CreateErrorMarkerInput): RecordingErrorMarker {
  const normalized = validateErrorMarkerInput(input);

  return {
    id: input.id ?? createMarkerId(),
    recordingId: normalized.recordingId,
    timestampMs: normalized.timestampMs,
    note: normalized.note
  };
}

export function normalizePersistedErrorMarker(input: PersistedErrorMarkerInput) {
  if (!input.id.trim()) {
    throw new Error("Error marker id is required.");
  }

  return createErrorMarker({
    ...input,
    id: input.id.trim()
  });
}

export function sortErrorMarkers(markers: RecordingErrorMarker[]) {
  return [...markers].sort((left, right) => left.timestampMs - right.timestampMs);
}

export function getErrorMarkerSeekTarget(marker: Pick<RecordingErrorMarker, "timestampMs">) {
  return marker.timestampMs;
}

export function seekToErrorMarker({
  marker,
  activeRecordingId,
  playbackControls,
  toleranceMs = ERROR_MARKER_SEEK_TOLERANCE_MS
}: {
  marker: Pick<RecordingErrorMarker, "timestampMs">;
  activeRecordingId: string;
  playbackControls: ErrorMarkerPlaybackControls | null;
  toleranceMs?: number;
}): ErrorMarkerSeekResult {
  if (!playbackControls || playbackControls.recordingId !== activeRecordingId) {
    return {
      ok: false,
      seekTargetMs: null,
      message: "Recording playback is still loading."
    };
  }

  const seekTargetMs = getErrorMarkerSeekTarget(marker);

  try {
    const result = playbackControls.seekToMs(seekTargetMs);
    const seekDeltaMs = Math.abs(result.currentTimeMs - seekTargetMs);

    if (seekDeltaMs > toleranceMs) {
      throw new Error("Playback did not move to the selected marker.");
    }

    return {
      ok: true,
      seekTargetMs,
      currentTimeMs: result.currentTimeMs,
      message: `Playback moved to ${formatTimestamp(seekTargetMs)}.`
    };
  } catch (error) {
    return {
      ok: false,
      seekTargetMs,
      message: error instanceof Error ? error.message : "Playback could not move to this marker."
    };
  }
}
