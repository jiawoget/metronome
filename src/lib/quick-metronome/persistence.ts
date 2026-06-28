import type {
  QuickMetronomeStoreSnapshot,
  QuickRecording,
  SharedRecordingHistoryEntry
} from "@/lib/quick-metronome/types";
import { RECORDING_HISTORY_STORAGE_KEY } from "@/infrastructure/storage/storage-contracts";
import { deleteOwnedRecordingArtifacts } from "@/lib/recordings-review/artifact-service";
import { recordingHistoryRepository } from "@/lib/recordings-review/repository";

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

function omitPersistedAudioBody(recording: QuickRecording): QuickRecording {
  return {
    ...recording,
    audioDataUrl: null
  };
}

function syncCacheFromStorage() {
  cachedRawValue = null;
  cachedSnapshot = readSnapshot();

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(STORE_EVENT));
  }
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
    const recordingToSave = omitPersistedAudioBody(recording);

    const nextSnapshot = recordingHistoryRepository.mutateSnapshot((snapshot) => {
      if (snapshot.recordings.some((item) => item.id === recordingToSave.id)) {
        throw new Error("Recording id collision prevented artifact metadata save.");
      }

      const recordings = [
        recordingToSave,
        ...snapshot.recordings.filter((item) => item.id !== recordingToSave.id)
      ];

      return {
        ...snapshot,
        recordings
      };
    });

    cachedSnapshot = {
      sessions: nextSnapshot.sessions,
      recordings: nextSnapshot.recordings,
      errorMarkers: nextSnapshot.errorMarkers,
      takeSelections: nextSnapshot.takeSelections,
      recordingOrganization: nextSnapshot.recordingOrganization
    };
    cachedRawValue = getStorage()?.getItem(RECORDING_HISTORY_STORAGE_KEY) ?? null;

    return recordingToSave;
  },

  async clear() {
    const writeSession = recordingHistoryRepository.beginSnapshotWrite();
    const snapshot = writeSession.snapshot;
    const removedQuickRecordingIds = new Set(
      snapshot.recordings
        .filter(isQuickRecording)
        .map((recording) => recording.id)
    );
    await deleteOwnedRecordingArtifacts([...removedQuickRecordingIds], undefined, {
      assertCurrent: () =>
        recordingHistoryRepository.assertSnapshotWriteIsCurrent(writeSession)
    });

    recordingHistoryRepository.commitSnapshotWrite(writeSession, (currentSnapshot) => {
      const retainedRecordings = snapshot.recordings.filter(
        (recording) => !removedQuickRecordingIds.has(recording.id)
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

      return {
        ...currentSnapshot,
        sessions: retainedSessions,
        recordings: retainedRecordings,
        errorMarkers: snapshot.errorMarkers.filter(
          (marker) => !removedQuickRecordingIds.has(String((marker as { recordingId?: unknown }).recordingId ?? ""))
        )
      };
    });

    syncCacheFromStorage();
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
