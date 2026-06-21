import { beforeEach, describe, expect, it } from "vitest";

import {
  RECORDINGS_STORAGE_KEY,
  recordingHistoryRepository
} from "@/lib/recordings-review/repository";
import type { RecordingReviewSnapshot } from "@/lib/recordings-review/types";

const snapshot: RecordingReviewSnapshot = {
  sessions: [{ id: "session-1" }],
  recordings: [
    {
      id: "recording-1",
      type: "quick",
      name: "Quick take",
      sessionId: "session-1",
      sheetId: null,
      createdAt: "2026-06-21T09:00:00.000Z",
      durationMs: 1_000,
      sizeBytes: 128,
      mimeType: "audio/wav",
      audioDataUrl: "data:audio/wav;base64,UklGRg==",
      settings: {
        bpm: 120,
        timeSignature: "4/4"
      },
      trustedPeaks: [1]
    }
  ],
  errorMarkers: [
    {
      id: "marker-1",
      recordingId: "recording-1",
      timestampMs: 500,
      note: "Missed accent"
    }
  ]
};

describe("recording history repository", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("loads recordings and markers from the local data boundary", () => {
    window.localStorage.setItem(RECORDINGS_STORAGE_KEY, JSON.stringify(snapshot));

    expect(recordingHistoryRepository.getSnapshot().recordings).toHaveLength(1);
    expect(recordingHistoryRepository.getErrorMarkers("recording-1")).toHaveLength(1);
    expect(recordingHistoryRepository.getArtifact("recording-1")).toMatch(/^data:audio\/wav/);
  });

  it("deletes recording metadata, artifact access, and linked error markers together", () => {
    recordingHistoryRepository.saveSnapshot(snapshot);
    recordingHistoryRepository.deleteRecording("recording-1");

    const persisted = JSON.parse(window.localStorage.getItem(RECORDINGS_STORAGE_KEY) ?? "{}");

    expect(persisted.recordings).toEqual([]);
    expect(persisted.errorMarkers).toEqual([]);
    expect(recordingHistoryRepository.getRecording("recording-1")).toBeNull();
    expect(recordingHistoryRepository.getArtifact("recording-1")).toBeNull();
  });
});
