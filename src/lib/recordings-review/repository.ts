import type {
  RecordingErrorMarker,
  RecordingReviewSnapshot,
  ReviewRecording
} from "@/lib/recordings-review/types";

export const RECORDINGS_STORAGE_KEY = "metronome-practice:v0:quick-recordings";
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
    typeof recording.sizeBytes === "number" &&
    typeof recording.mimeType === "string" &&
    !!recording.settings &&
    typeof recording.settings.bpm === "number" &&
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

function normalizeSnapshot(rawValue: string | null): RecordingReviewSnapshot {
  if (!rawValue) {
    return emptySnapshot;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<RecordingReviewSnapshot>;

    return {
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      recordings: Array.isArray(parsed.recordings) ? parsed.recordings.filter(isRecording) : [],
      errorMarkers: Array.isArray(parsed.errorMarkers)
        ? parsed.errorMarkers.filter(isErrorMarker).map((marker) => ({
            ...marker,
            note: marker.note ?? null
          }))
        : []
    };
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

  if (!storage) {
    return;
  }

  storage.setItem(RECORDINGS_STORAGE_KEY, JSON.stringify(snapshot));
  cachedRawValue = null;
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
    return readSnapshot().errorMarkers.filter((marker) => marker.recordingId === recordingId);
  },

  getArtifact(recordingId: string) {
    return this.getRecording(recordingId)?.audioDataUrl ?? null;
  },

  saveSnapshot(snapshot: RecordingReviewSnapshot) {
    writeSnapshot(snapshot);
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
