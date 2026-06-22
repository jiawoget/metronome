import { beforeEach, describe, expect, it } from "vitest";

import {
  RECORDINGS_STORAGE_KEY,
  recordingHistoryRepository
} from "@/lib/recordings-review/repository";
import { recordingHistoryMetadataRepository } from "@/infrastructure/db/recording-history-metadata-repository";
import type { RecordingReviewSnapshot } from "@/lib/recordings-review/types";
import type { PracticeSession, SheetRecordingMetadata } from "@/domain/practice";

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

  it("creates sorted recording-scoped markers and persists deletion", () => {
    recordingHistoryRepository.saveSnapshot({
      ...snapshot,
      errorMarkers: []
    });

    expect(() =>
      recordingHistoryRepository.createErrorMarker({
        recordingId: "",
        timestampMs: 100,
        note: null
      })
    ).toThrow("recording is required");

    const lateMarker = recordingHistoryRepository.createErrorMarker({
      id: "marker-late",
      recordingId: "recording-1",
      timestampMs: 900,
      note: "  late accent  "
    });
    const earlyMarker = recordingHistoryRepository.createErrorMarker({
      id: "marker-early",
      recordingId: "recording-1",
      timestampMs: 100,
      note: ""
    });

    expect(lateMarker.note).toBe("late accent");
    expect(earlyMarker.note).toBeNull();
    expect(recordingHistoryRepository.getErrorMarkers("recording-1").map((marker) => marker.id)).toEqual([
      "marker-early",
      "marker-late"
    ]);
    expect(recordingHistoryRepository.getErrorMarkers("other-recording")).toEqual([]);

    recordingHistoryRepository.deleteErrorMarker("marker-early");

    const persisted = JSON.parse(window.localStorage.getItem(RECORDINGS_STORAGE_KEY) ?? "{}");

    expect(recordingHistoryRepository.getErrorMarkers("recording-1").map((marker) => marker.id)).toEqual([
      "marker-late"
    ]);
    expect(persisted.errorMarkers.map((marker: { id: string }) => marker.id)).toEqual(["marker-late"]);
  });

  it("rejects marker timestamps outside the recording duration", () => {
    recordingHistoryRepository.saveSnapshot(snapshot);

    expect(() =>
      recordingHistoryRepository.createErrorMarker({
        recordingId: "recording-1",
        timestampMs: 1_001,
        note: null
      })
    ).toThrow("within the recording");
  });

  it("sanitizes persisted invalid, orphaned, out-of-range, and untrimmed markers on read and write", () => {
    const invalidSnapshot = {
      ...snapshot,
      errorMarkers: [
        {
          id: "marker-trimmed",
          recordingId: "recording-1",
          timestampMs: 500,
          note: "  trimmed note  "
        },
        {
          id: "marker-orphan",
          recordingId: "missing-recording",
          timestampMs: 500,
          note: "orphan"
        },
        {
          id: "marker-negative",
          recordingId: "recording-1",
          timestampMs: -1,
          note: "negative"
        },
        {
          id: "marker-too-late",
          recordingId: "recording-1",
          timestampMs: 1_001,
          note: "too late"
        },
        {
          id: "marker-nan",
          recordingId: "recording-1",
          timestampMs: Number.NaN,
          note: "nan"
        },
        {
          id: "marker-long-note",
          recordingId: "recording-1",
          timestampMs: 700,
          note: "x".repeat(161)
        }
      ]
    } as RecordingReviewSnapshot;

    recordingHistoryRepository.saveSnapshot(invalidSnapshot);

    expect(recordingHistoryRepository.getSnapshot().errorMarkers).toEqual([
      {
        id: "marker-trimmed",
        recordingId: "recording-1",
        timestampMs: 500,
        note: "trimmed note"
      }
    ]);
    expect(recordingHistoryRepository.getErrorMarkers("recording-1")).toEqual([
      {
        id: "marker-trimmed",
        recordingId: "recording-1",
        timestampMs: 500,
        note: "trimmed note"
      }
    ]);

    const persisted = JSON.parse(window.localStorage.getItem(RECORDINGS_STORAGE_KEY) ?? "{}");

    expect(persisted.errorMarkers).toEqual([
      {
        id: "marker-trimmed",
        recordingId: "recording-1",
        timestampMs: 500,
        note: "trimmed note"
      }
    ]);
  });

  it("filters invalid markers loaded from storage before they reach snapshots or marker lists", () => {
    window.localStorage.setItem(
      RECORDINGS_STORAGE_KEY,
      JSON.stringify({
        ...snapshot,
        errorMarkers: [
          {
            id: "marker-valid",
            recordingId: "recording-1",
            timestampMs: 250,
            note: "  valid loaded  "
          },
          {
            id: "marker-orphan",
            recordingId: "missing-recording",
            timestampMs: 250,
            note: "orphan"
          },
          {
            id: "marker-too-late",
            recordingId: "recording-1",
            timestampMs: 5_000,
            note: "too late"
          }
        ]
      })
    );

    const loadedSnapshot = recordingHistoryRepository.getSnapshot();

    expect(loadedSnapshot.errorMarkers).toEqual([
      {
        id: "marker-valid",
        recordingId: "recording-1",
        timestampMs: 250,
        note: "valid loaded"
      }
    ]);
    expect(recordingHistoryRepository.getErrorMarkers("recording-1")).toEqual(loadedSnapshot.errorMarkers);

    recordingHistoryRepository.saveSnapshot(loadedSnapshot);

    const persisted = JSON.parse(window.localStorage.getItem(RECORDINGS_STORAGE_KEY) ?? "{}");

    expect(persisted.errorMarkers).toEqual(loadedSnapshot.errorMarkers);
  });

  it("stores 05e sheet recording metadata in the shared recording history boundary", async () => {
    await recordingHistoryMetadataRepository.saveRecordingMetadata(createSheetRecording(), createSheetSession());

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

  it("rejects mismatched 05e sheet recording linkage before saving to shared history", async () => {
    await expect(
      recordingHistoryMetadataRepository.saveRecordingMetadata(
        {
          ...createSheetRecording(),
          sessionId: "other-session"
        },
        createSheetSession()
      )
    ).rejects.toThrow("sessionId must match");
    await expect(
      recordingHistoryMetadataRepository.saveRecordingMetadata(
        {
          ...createSheetRecording(),
          sheetId: "other-sheet"
        },
        createSheetSession()
      )
    ).rejects.toThrow("sheetId must match");
    await expect(
      recordingHistoryMetadataRepository.saveRecordingMetadata(createSheetRecording(), {
        ...createSheetSession(),
        sourceType: "quick",
        sheetId: null
      })
    ).rejects.toThrow("requires a sheet practice session");
    expect(recordingHistoryRepository.getSnapshot().recordings).toEqual([]);
  });
});

function createSheetRecording(): SheetRecordingMetadata {
  return {
    id: "sheet-metadata-1",
    type: "sheet",
    sessionId: "session-sheet-1",
    sheetId: "sheet-alpha",
    sheetName: "Alpha Sheet",
    createdAt: "2026-06-21T12:00:00.000Z",
    durationMs: 12_000,
    bpm: 96,
    timeSignature: "4/4"
  };
}

function createSheetSession(): PracticeSession {
  return {
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
  };
}
