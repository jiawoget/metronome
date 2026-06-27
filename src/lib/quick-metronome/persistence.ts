import type {
  QuickMetronomeStoreSnapshot,
  QuickRecording,
  SharedRecordingHistoryEntry
} from "@/lib/quick-metronome/types";
import { RECORDING_HISTORY_STORAGE_KEY } from "@/infrastructure/storage/storage-contracts";

const STORE_EVENT = "quick-metronome-recordings-change";

const emptySnapshot: QuickMetronomeStoreSnapshot = {
  sessions: [],
  recordings: [],
  errorMarkers: []
};
let cachedRawValue: string | null = null;
let cachedSnapshot: QuickMetronomeStoreSnapshot = emptySnapshot;

type RawSnapshotObject = Record<string, unknown>;

function getStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

function readSnapshot(): QuickMetronomeStoreSnapshot {
  const storage = getStorage();

  if (!storage) {
    return emptySnapshot;
  }

  const rawValue = storage.getItem(RECORDING_HISTORY_STORAGE_KEY);

  if (!rawValue) {
    cachedRawValue = null;
    cachedSnapshot = emptySnapshot;
    return emptySnapshot;
  }

  if (rawValue === cachedRawValue) {
    return cachedSnapshot;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<QuickMetronomeStoreSnapshot>;

    cachedRawValue = rawValue;
    cachedSnapshot = {
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      recordings: Array.isArray(parsed.recordings) ? parsed.recordings : [],
      errorMarkers: Array.isArray(parsed.errorMarkers) ? parsed.errorMarkers : [],
      ...(Array.isArray(parsed.takeSelections) ? { takeSelections: parsed.takeSelections } : {}),
      ...(Array.isArray(parsed.recordingOrganization)
        ? { recordingOrganization: parsed.recordingOrganization }
        : {})
    };

    return cachedSnapshot;
  } catch {
    cachedRawValue = rawValue;
    cachedSnapshot = emptySnapshot;
    return emptySnapshot;
  }
}

function readRawSnapshotObject(): RawSnapshotObject {
  const storage = getStorage();

  if (!storage) {
    return {};
  }

  const rawValue = storage.getItem(RECORDING_HISTORY_STORAGE_KEY);

  if (!rawValue) {
    return {};
  }

  try {
    const parsed = JSON.parse(rawValue);

    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as RawSnapshotObject)
      : {};
  } catch {
    return {};
  }
}

function writeSnapshot(snapshot: QuickMetronomeStoreSnapshot, rawBase: RawSnapshotObject = {}) {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  const nextSnapshot = {
    ...rawBase,
    sessions: snapshot.sessions,
    recordings: snapshot.recordings,
    errorMarkers: snapshot.errorMarkers,
    ...(snapshot.takeSelections ? { takeSelections: snapshot.takeSelections } : {}),
    ...(snapshot.recordingOrganization
      ? { recordingOrganization: snapshot.recordingOrganization }
      : {})
  };
  const serializedSnapshot = JSON.stringify(nextSnapshot);

  storage.setItem(RECORDING_HISTORY_STORAGE_KEY, serializedSnapshot);
  cachedRawValue = serializedSnapshot;
  cachedSnapshot = snapshot;
  window.dispatchEvent(new Event(STORE_EVENT));
}

function createRecordingId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `recording_${crypto.randomUUID()}`;
  }

  return `recording_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function isQuickRecording(
  recording: SharedRecordingHistoryEntry
): recording is QuickRecording {
  return recording.type === "quick";
}

export const quickRecordingRepository = {
  getSnapshot() {
    return readSnapshot();
  },

  getLatestQuickRecording() {
    const snapshot = readSnapshot();

    return snapshot.recordings.find(isQuickRecording) ?? null;
  },

  saveQuickRecording(recording: QuickRecording) {
    const rawBase = readRawSnapshotObject();
    const snapshot = readSnapshot();
    const recordingToSave = snapshot.recordings.some((item) => item.id === recording.id)
      ? { ...recording, id: createRecordingId() }
      : recording;
    const recordings = [
      recordingToSave,
      ...snapshot.recordings.filter((item) => item.id !== recordingToSave.id)
    ];

    writeSnapshot({
      sessions: snapshot.sessions,
      recordings,
      errorMarkers: snapshot.errorMarkers,
      ...(snapshot.takeSelections ? { takeSelections: snapshot.takeSelections } : {}),
      ...(snapshot.recordingOrganization
        ? { recordingOrganization: snapshot.recordingOrganization }
        : {})
    }, rawBase);

    return recordingToSave;
  },

  clear() {
    const rawBase = readRawSnapshotObject();
    const snapshot = readSnapshot();
    const removedQuickRecordingIds = new Set(
      snapshot.recordings
        .filter(isQuickRecording)
        .map((recording) => recording.id)
    );
    const retainedRecordings = snapshot.recordings.filter(
      (recording) => recording.type !== "quick"
    );
    const retainedSessionIds = new Set(
      retainedRecordings.map((recording) => recording.sessionId)
    );
    const retainedSessions = snapshot.sessions.filter((session) => {
      if (!session || typeof session !== "object") {
        return true;
      }

      const maybeSession = session as { id?: unknown; sourceType?: unknown };

      return !(
        maybeSession.sourceType === "quick" &&
        typeof maybeSession.id === "string" &&
        !retainedSessionIds.has(maybeSession.id)
      );
    });

    writeSnapshot({
      sessions: retainedSessions,
      recordings: retainedRecordings,
      errorMarkers: snapshot.errorMarkers.filter(
        (marker) => !removedQuickRecordingIds.has(String((marker as { recordingId?: unknown }).recordingId ?? ""))
      ),
      ...(snapshot.takeSelections ? { takeSelections: snapshot.takeSelections } : {}),
      ...(snapshot.recordingOrganization
        ? { recordingOrganization: snapshot.recordingOrganization }
        : {})
    }, rawBase);
  },

  subscribe(listener: () => void) {
    if (typeof window === "undefined") {
      return () => undefined;
    }

    const handleChange = () => listener();

    window.addEventListener(STORE_EVENT, handleChange);
    window.addEventListener("storage", handleChange);

    return () => {
      window.removeEventListener(STORE_EVENT, handleChange);
      window.removeEventListener("storage", handleChange);
    };
  }
};
