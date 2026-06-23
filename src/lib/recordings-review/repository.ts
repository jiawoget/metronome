import type {
  RecordingErrorMarker,
  RecordingReviewSnapshot,
  ReviewRecording
} from "@/lib/recordings-review/types";
import {
  createErrorMarker,
  normalizePersistedErrorMarker,
  sortErrorMarkers,
  type CreateErrorMarkerInput
} from "@/lib/recordings-review/error-markers";
import { RECORDING_HISTORY_STORAGE_KEY } from "@/infrastructure/storage/storage-contracts";

export const RECORDINGS_STORAGE_KEY = RECORDING_HISTORY_STORAGE_KEY;
const STORE_EVENT = "recordings-review-change";
const QUICK_STORE_EVENT = "quick-metronome-recordings-change";

const emptySnapshot: RecordingReviewSnapshot = {
  sessions: [],
  recordings: [],
  errorMarkers: []
};
let cachedRawValue: string | null = null;
let cachedSnapshot: RecordingReviewSnapshot = emptySnapshot;

function getStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

function isRecording(value: unknown): value is ReviewRecording {
  if (!value || typeof value !== "object") {
    return false;
  }

  const recording = value as Partial<ReviewRecording>;

  return (
    typeof recording.id === "string" &&
    (recording.type === "quick" || recording.type === "sheet") &&
    typeof recording.sessionId === "string" &&
    typeof recording.createdAt === "string" &&
    typeof recording.durationMs === "number" &&
    Number.isFinite(recording.durationMs) &&
    recording.durationMs >= 0 &&
    typeof recording.sizeBytes === "number" &&
    Number.isFinite(recording.sizeBytes) &&
    typeof recording.mimeType === "string" &&
    !!recording.settings &&
    typeof recording.settings.bpm === "number" &&
    Number.isFinite(recording.settings.bpm) &&
    typeof recording.settings.timeSignature === "string"
  );
}

function isErrorMarker(value: unknown): value is RecordingErrorMarker {
  if (!value || typeof value !== "object") {
    return false;
  }

  const marker = value as Partial<RecordingErrorMarker>;

  return (
    typeof marker.id === "string" &&
    typeof marker.recordingId === "string" &&
    typeof marker.timestampMs === "number" &&
    (typeof marker.note === "string" || marker.note === null || marker.note === undefined)
  );
}

function normalizeErrorMarkersForRecordings({
  markers,
  recordings
}: {
  markers: unknown[];
  recordings: ReviewRecording[];
}) {
  const recordingsById = new Map(recordings.map((recording) => [recording.id, recording]));
  const normalizedMarkers: RecordingErrorMarker[] = [];

  for (const value of markers) {
    if (!isErrorMarker(value)) {
      continue;
    }

    const recording = recordingsById.get(value.recordingId.trim());

    if (!recording) {
      continue;
    }

    try {
      normalizedMarkers.push(
        normalizePersistedErrorMarker({
          id: value.id,
          recordingId: value.recordingId,
          timestampMs: value.timestampMs,
          durationMs: recording.durationMs,
          note: value.note ?? null
        })
      );
    } catch {
      continue;
    }
  }

  return sortErrorMarkers(normalizedMarkers);
}

function normalizeSnapshotValue(value: Partial<RecordingReviewSnapshot> | RecordingReviewSnapshot): RecordingReviewSnapshot {
  const recordings = Array.isArray(value.recordings) ? value.recordings.filter(isRecording) : [];
  const markers = Array.isArray(value.errorMarkers) ? value.errorMarkers : [];

  return {
    sessions: Array.isArray(value.sessions) ? value.sessions : [],
    recordings,
    errorMarkers: normalizeErrorMarkersForRecordings({
      markers,
      recordings
    })
  };
}

function normalizeSnapshot(rawValue: string | null): RecordingReviewSnapshot {
  if (!rawValue) {
    return emptySnapshot;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<RecordingReviewSnapshot>;

    return normalizeSnapshotValue(parsed);
  } catch {
    return emptySnapshot;
  }
}

function readSnapshot(): RecordingReviewSnapshot {
  const storage = getStorage();

  const rawValue = storage?.getItem(RECORDINGS_STORAGE_KEY) ?? null;

  if (rawValue === cachedRawValue) {
    return cachedSnapshot;
  }

  cachedRawValue = rawValue;
  cachedSnapshot = normalizeSnapshot(rawValue);

  return cachedSnapshot;
}

function writeSnapshot(snapshot: RecordingReviewSnapshot) {
  const storage = getStorage();
  const normalizedSnapshot = normalizeSnapshotValue(snapshot);

  if (!storage) {
    return;
  }

  const serializedSnapshot = JSON.stringify(normalizedSnapshot);

  storage.setItem(RECORDINGS_STORAGE_KEY, serializedSnapshot);
  cachedRawValue = serializedSnapshot;
  cachedSnapshot = normalizedSnapshot;
  window.dispatchEvent(new Event(STORE_EVENT));
  window.dispatchEvent(new Event(QUICK_STORE_EVENT));
}

export const recordingHistoryRepository = {
  getSnapshot() {
    return readSnapshot();
  },

  getRecording(recordingId: string) {
    return readSnapshot().recordings.find((recording) => recording.id === recordingId) ?? null;
  },

  getErrorMarkers(recordingId: string) {
    return sortErrorMarkers(readSnapshot().errorMarkers.filter((marker) => marker.recordingId === recordingId));
  },

  getArtifact(recordingId: string) {
    return this.getRecording(recordingId)?.audioDataUrl ?? null;
  },

  saveSnapshot(snapshot: RecordingReviewSnapshot) {
    writeSnapshot(snapshot);
  },

  createErrorMarker(input: Omit<CreateErrorMarkerInput, "durationMs"> & { durationMs?: number }) {
    const snapshot = readSnapshot();
    const recordingId = input.recordingId ?? "";
    const recording = snapshot.recordings.find((item) => item.id === recordingId);

    if (!recording) {
      throw new Error("A recording is required before saving an error marker.");
    }

    const marker = createErrorMarker({
      ...input,
      recordingId: recording.id,
      durationMs: input.durationMs ?? recording.durationMs
    });
    const nextSnapshot: RecordingReviewSnapshot = {
      ...snapshot,
      errorMarkers: sortErrorMarkers([
        ...snapshot.errorMarkers.filter((item) => item.id !== marker.id),
        marker
      ])
    };

    writeSnapshot(nextSnapshot);

    return marker;
  },

  deleteErrorMarker(markerId: string) {
    const snapshot = readSnapshot();
    const nextSnapshot: RecordingReviewSnapshot = {
      ...snapshot,
      errorMarkers: snapshot.errorMarkers.filter((marker) => marker.id !== markerId)
    };

    writeSnapshot(nextSnapshot);

    return nextSnapshot;
  },

  deleteRecording(recordingId: string) {
    const snapshot = readSnapshot();
    const nextSnapshot: RecordingReviewSnapshot = {
      sessions: snapshot.sessions,
      recordings: snapshot.recordings.filter((recording) => recording.id !== recordingId),
      errorMarkers: snapshot.errorMarkers.filter((marker) => marker.recordingId !== recordingId)
    };

    writeSnapshot(nextSnapshot);

    return nextSnapshot;
  },

  clear() {
    writeSnapshot(emptySnapshot);
  },

  subscribe(listener: () => void) {
    if (typeof window === "undefined") {
      return () => undefined;
    }

    const handleChange = () => listener();

    window.addEventListener(STORE_EVENT, handleChange);
    window.addEventListener(QUICK_STORE_EVENT, handleChange);
    window.addEventListener("storage", handleChange);

    return () => {
      window.removeEventListener(STORE_EVENT, handleChange);
      window.removeEventListener(QUICK_STORE_EVENT, handleChange);
      window.removeEventListener("storage", handleChange);
    };
  }
};
