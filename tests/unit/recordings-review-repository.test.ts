import { beforeEach, describe, expect, it } from "vitest";

import {
  RECORDINGS_STORAGE_KEY,
  recordingHistoryRepository
} from "@/lib/recordings-review/repository";
import { recordingHistoryMetadataRepository } from "@/infrastructure/db/recording-history-metadata-repository";
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

  it("stores 05e sheet recording metadata in the shared recording history boundary", async () => {
    await recordingHistoryMetadataRepository.saveRecordingMetadata(
      {
        id: "sheet-metadata-1",
        type: "sheet",
        sessionId: "session-sheet-1",
        sheetId: "sheet-alpha",
        sheetName: "Alpha Sheet",
        createdAt: "2026-06-21T12:00:00.000Z",
        durationMs: 12_000,
        bpm: 96,
        timeSignature: "4/4"
      },
      {
        id: "session-sheet-1",
        sourceType: "sheet",
        sheetId: "sheet-alpha",
        startedAt: "2026-06-21T11:59:50.000Z",
        endedAt: null,
        durationMs: 12_000,
        bpm: 96,
        timeSignature: "4/4",
        recordingCount: 1,
        latestRecordingId: "sheet-metadata-1",
        updatedAt: "2026-06-21T12:00:00.000Z"
      }
    );

    const snapshot = recordingHistoryRepository.getSnapshot();
    const reviewRecording = recordingHistoryRepository.getRecording("sheet-metadata-1");

    expect(snapshot.recordings).toHaveLength(1);
    expect(reviewRecording).toMatchObject({
      id: "sheet-metadata-1",
      type: "sheet",
      name: "Sheet practice metadata",
      sessionId: "session-sheet-1",
      sheetId: "sheet-alpha",
      sheetName: "Alpha Sheet",
      sizeBytes: 0,
      mimeType: "metadata/session",
      audioDataUrl: null,
      settings: {
        bpm: 96,
        timeSignature: "4/4"
      }
    });
    expect(recordingHistoryRepository.getArtifact("sheet-metadata-1")).toBeNull();
    await expect(recordingHistoryMetadataRepository.listRecordingMetadataForSession("session-sheet-1")).resolves.toEqual([
      {
        id: "sheet-metadata-1",
        type: "sheet",
        sessionId: "session-sheet-1",
        sheetId: "sheet-alpha",
        sheetName: "Alpha Sheet",
        createdAt: "2026-06-21T12:00:00.000Z",
        durationMs: 12_000,
        bpm: 96,
        timeSignature: "4/4"
      }
    ]);
  });
});
