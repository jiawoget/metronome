import type { QuickMetronomeStoreSnapshot, QuickRecording } from "@/lib/quick-metronome/types";

const STORAGE_KEY = "metronome-practice:v0:quick-recordings";
const STORE_EVENT = "quick-metronome-recordings-change";

const emptySnapshot: QuickMetronomeStoreSnapshot = {
  sessions: [],
  recordings: [],
  errorMarkers: []
};
let cachedRawValue: string | null = null;
let cachedSnapshot: QuickMetronomeStoreSnapshot = emptySnapshot;

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

  const rawValue = storage.getItem(STORAGE_KEY);

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
      errorMarkers: Array.isArray(parsed.errorMarkers) ? parsed.errorMarkers : []
    };

    return cachedSnapshot;
  } catch {
    cachedRawValue = rawValue;
    cachedSnapshot = emptySnapshot;
    return emptySnapshot;
  }
}

function writeSnapshot(snapshot: QuickMetronomeStoreSnapshot) {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  storage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  window.dispatchEvent(new Event(STORE_EVENT));
}

function createRecordingId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `recording_${crypto.randomUUID()}`;
  }

  return `recording_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export const quickRecordingRepository = {
  getSnapshot() {
    return readSnapshot();
  },

  getLatestQuickRecording() {
    const snapshot = readSnapshot();

    return snapshot.recordings.find((recording) => recording.type === "quick") ?? null;
  },

  saveQuickRecording(recording: QuickRecording) {
    const snapshot = readSnapshot();
    const recordingToSave = snapshot.recordings.some((item) => item.id === recording.id)
      ? { ...recording, id: createRecordingId() }
      : recording;
    const recordings = [
      recordingToSave,
      ...snapshot.recordings.filter((item) => item.id !== recordingToSave.id)
    ];

    writeSnapshot({ sessions: snapshot.sessions, recordings, errorMarkers: snapshot.errorMarkers });

    return recordingToSave;
  },

  clear() {
    const storage = getStorage();

    if (storage) {
      storage.removeItem(STORAGE_KEY);
      window.dispatchEvent(new Event(STORE_EVENT));
    }
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
