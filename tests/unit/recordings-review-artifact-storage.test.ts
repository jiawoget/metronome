import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  RECORDINGS_STORAGE_KEY,
  recordingHistoryRepository
} from "@/lib/recordings-review/repository";
import {
  createRecordingArtifactRef,
  migrateLegacyRecordingArtifacts,
  resolveRecordingArtifactBody
} from "@/lib/recordings-review/artifact-service";
import {
  recordingArtifactRepository,
  type LocalRecordingArtifact,
  type RecordingArtifactRepository
} from "@/infrastructure/db/recording-artifact-repository";
import type { RecordingReviewSnapshot, ReviewRecording } from "@/lib/recordings-review/types";
import { createRecordingsReviewService } from "@/services/recordings-review";
import { quickRecordingController } from "@/lib/quick-metronome/recording-controller";
import { recordingHistoryMetadataRepository } from "@/infrastructure/db/recording-history-metadata-repository";

function createRecording(overrides: Partial<ReviewRecording> = {}): ReviewRecording {
  return {
    id: "recording-1",
    type: "quick",
    origin: "user",
    sessionId: "session-1",
    sheetId: null,
    createdAt: "2026-06-22T06:00:00.000Z",
    durationMs: 800,
    sizeBytes: 4,
    mimeType: "audio/webm",
    audioDataUrl: "data:audio/webm;base64,YXVkaW8=",
    settings: {
      bpm: 96,
      timeSignature: "4/4"
    },
    ...overrides
  };
}

function createMemoryArtifactRepository({
  failSaves = false,
  failDeletes = false,
  onSave,
  onGet,
  onList
}: {
  failSaves?: boolean;
  failDeletes?: boolean;
  onSave?: (input: LocalRecordingArtifact) => void;
  onGet?: (artifactId: string) => void;
  onList?: (recordingIds: string[]) => void;
} = {}): RecordingArtifactRepository & { artifacts: Map<string, LocalRecordingArtifact> } {
  const artifacts = new Map<string, LocalRecordingArtifact>();

  return {
    artifacts,
    async saveArtifact(input) {
      if (failSaves) {
        throw new Error("IndexedDB unavailable");
      }

      onSave?.(input);
      artifacts.set(input.artifactId, input);

      return input;
    },
    async getArtifact(artifactId) {
      onGet?.(artifactId);

      return artifacts.get(artifactId) ?? null;
    },
    async deleteArtifact(artifactId) {
      if (failDeletes) {
        throw new Error("IndexedDB delete failed");
      }

      artifacts.delete(artifactId);
    },
    async deleteArtifacts(artifactIds) {
      if (failDeletes) {
        throw new Error("IndexedDB delete failed");
      }

      for (const artifactId of artifactIds) {
        artifacts.delete(artifactId);
      }
    },
    async listArtifactsForRecordings(recordingIds) {
      onList?.(recordingIds);
      const ids = new Set(recordingIds);

      return [...artifacts.values()].filter((artifact) => ids.has(artifact.recordingId));
    },
    async clear() {
      artifacts.clear();
    }
  };
}

describe("recording artifact storage", () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await recordingArtifactRepository.clear().catch(() => undefined);
  });

  it("saves, loads, and deletes deterministic recording-owned artifacts", async () => {
    const artifact: LocalRecordingArtifact = {
      artifactId: "recording-1",
      recordingId: "recording-1",
      recordingType: "quick",
      mimeType: "audio/webm",
      sizeBytes: 5,
      blob: new Blob(["audio"], { type: "audio/webm" }),
      createdAt: "2026-06-22T06:00:00.000Z",
      updatedAt: "2026-06-22T06:00:00.000Z"
    };

    await recordingArtifactRepository.saveArtifact(artifact);

    const loaded = await recordingArtifactRepository.getArtifact("recording-1");

    expect(loaded).toMatchObject({
      artifactId: "recording-1",
      recordingId: "recording-1",
      recordingType: "quick",
      mimeType: "audio/webm",
      sizeBytes: 5
    });
    expect(loaded).not.toBeNull();

    await recordingArtifactRepository.deleteArtifact("recording-1");

    await expect(recordingArtifactRepository.getArtifact("recording-1")).resolves.toBeNull();
  });

  it("rejects artifact id ownership mismatches instead of cross-pointing metadata", async () => {
    await expect(
      recordingArtifactRepository.saveArtifact({
        artifactId: "artifact-other",
        recordingId: "recording-1",
        recordingType: "quick",
        mimeType: "audio/webm",
        sizeBytes: 5,
        blob: new Blob(["audio"], { type: "audio/webm" }),
        createdAt: "2026-06-22T06:00:00.000Z",
        updatedAt: "2026-06-22T06:00:00.000Z"
      })
    ).rejects.toThrow("must match");
  });

  it("migrates safe legacy rows, leaves bad rows intact, and preserves unknown fields", async () => {
    const repository = createMemoryArtifactRepository();
    const snapshot: RecordingReviewSnapshot = {
      sessions: [{ id: "session-1", sourceType: "quick" }],
      recordings: [
        createRecording({
          id: "safe-recording",
          futurePerRecordField: { keep: true }
        } as Partial<ReviewRecording>),
        createRecording({
          id: "bad-recording",
          audioDataUrl: "not-a-data-url"
        })
      ],
      errorMarkers: [],
      futureTopLevelField: { keep: true }
    };

    window.localStorage.setItem(RECORDINGS_STORAGE_KEY, JSON.stringify(snapshot));

    const result = await migrateLegacyRecordingArtifacts(repository);
    const persisted = JSON.parse(window.localStorage.getItem(RECORDINGS_STORAGE_KEY) ?? "{}");

    expect(result).toMatchObject({
      migrated: 1,
      failed: 1
    });
    expect(repository.artifacts.get("safe-recording")).toMatchObject({
      artifactId: "safe-recording",
      recordingId: "safe-recording",
      legacyMigratedFrom: "audioDataUrl"
    });
    expect(persisted.futureTopLevelField).toEqual({ keep: true });
    expect(persisted.recordings.find((recording: { id: string }) => recording.id === "safe-recording")).toMatchObject({
      id: "safe-recording",
      artifactRef: {
        kind: "indexeddb",
        artifactId: "safe-recording",
        storageVersion: 1
      },
      futurePerRecordField: { keep: true }
    });
    expect(
      persisted.recordings.find((recording: { id: string }) => recording.id === "safe-recording")
    ).not.toHaveProperty("audioDataUrl");
    expect(persisted.recordings.find((recording: { id: string }) => recording.id === "bad-recording").audioDataUrl).toBe(
      "not-a-data-url"
    );
  });

  it("preserves exact raw localStorage bytes when artifact storage is unavailable", async () => {
    const repository = createMemoryArtifactRepository({ failSaves: true });
    const rawSnapshot = JSON.stringify({
      sessions: [],
      recordings: [createRecording()],
      errorMarkers: [],
      futureTopLevelField: { keep: true }
    });

    window.localStorage.setItem(RECORDINGS_STORAGE_KEY, rawSnapshot);

    const result = await migrateLegacyRecordingArtifacts(repository);

    expect(result).toMatchObject({
      migrated: 0,
      failed: 1
    });
    expect(window.localStorage.getItem(RECORDINGS_STORAGE_KEY)).toBe(rawSnapshot);
  });

  it("cleans legacy audioDataUrl when a valid artifactRef body already exists even if legacy bytes are malformed", async () => {
    const repository = createMemoryArtifactRepository();
    const snapshot: RecordingReviewSnapshot = {
      sessions: [],
      recordings: [
        createRecording({
          id: "already-restored",
          artifactRef: createRecordingArtifactRef("already-restored"),
          audioDataUrl: "not-a-data-url"
        })
      ],
      errorMarkers: [],
      futureTopLevelField: { keep: true }
    };

    await repository.saveArtifact({
      artifactId: "already-restored",
      recordingId: "already-restored",
      recordingType: "quick",
      mimeType: "audio/webm",
      sizeBytes: 8,
      blob: new Blob(["restored"], { type: "audio/webm" }),
      createdAt: "2026-06-22T06:00:00.000Z",
      updatedAt: "2026-06-22T06:00:00.000Z"
    });
    window.localStorage.setItem(RECORDINGS_STORAGE_KEY, JSON.stringify(snapshot));

    const result = await migrateLegacyRecordingArtifacts(repository);
    const persisted = JSON.parse(window.localStorage.getItem(RECORDINGS_STORAGE_KEY) ?? "{}");

    expect(result).toMatchObject({
      migrated: 1,
      failed: 0
    });
    expect(persisted.futureTopLevelField).toEqual({ keep: true });
    expect(persisted.recordings[0]).toMatchObject({
      id: "already-restored",
      artifactRef: createRecordingArtifactRef("already-restored")
    });
    expect(persisted.recordings[0]).not.toHaveProperty("audioDataUrl");
    await expect(repository.artifacts.get("already-restored")?.blob.text()).resolves.toBe(
      "restored"
    );
  });

  it("preserves legacy bytes when artifactRef row is owned but body-invalid and legacy data is malformed", async () => {
    const repository = createMemoryArtifactRepository();
    const rawSnapshot = JSON.stringify({
      sessions: [],
      recordings: [
        createRecording({
          id: "corrupt-artifact",
          artifactRef: createRecordingArtifactRef("corrupt-artifact"),
          audioDataUrl: "not-a-data-url"
        })
      ],
      errorMarkers: [],
      futureTopLevelField: { keep: true }
    });

    repository.artifacts.set("corrupt-artifact", {
      artifactId: "corrupt-artifact",
      recordingId: "corrupt-artifact",
      recordingType: "quick",
      mimeType: "audio/webm",
      sizeBytes: 0,
      blob: new Blob([], { type: "audio/webm" }),
      createdAt: "2026-06-22T06:00:00.000Z",
      updatedAt: "2026-06-22T06:00:00.000Z"
    });
    window.localStorage.setItem(RECORDINGS_STORAGE_KEY, rawSnapshot);

    const result = await migrateLegacyRecordingArtifacts(repository);

    expect(result).toMatchObject({
      migrated: 0,
      failed: 1
    });
    expect(window.localStorage.getItem(RECORDINGS_STORAGE_KEY)).toBe(rawSnapshot);
  });

  it("retries migration from fresh raw bytes when the same recording changes concurrently", async () => {
    let saveCount = 0;
    const oldSnapshot: RecordingReviewSnapshot = {
      sessions: [],
      recordings: [
        createRecording({
          id: "same-recording",
          audioDataUrl: "data:audio/webm;base64,b2xkLWJ5dGVz"
        })
      ],
      errorMarkers: []
    };
    const newSnapshot: RecordingReviewSnapshot = {
      sessions: [],
      recordings: [
        createRecording({
          id: "same-recording",
          name: "Concurrent replacement",
          audioDataUrl: "data:audio/webm;base64,bmV3LWJ5dGVz"
        })
      ],
      errorMarkers: []
    };
    const repository = createMemoryArtifactRepository({
      onSave() {
        saveCount += 1;

        if (saveCount === 1) {
          window.localStorage.setItem(
            RECORDINGS_STORAGE_KEY,
            JSON.stringify(newSnapshot)
          );
        }
      }
    });

    window.localStorage.setItem(RECORDINGS_STORAGE_KEY, JSON.stringify(oldSnapshot));

    const result = await migrateLegacyRecordingArtifacts(repository);
    const persisted = JSON.parse(window.localStorage.getItem(RECORDINGS_STORAGE_KEY) ?? "{}");
    const savedArtifact = repository.artifacts.get("same-recording");

    expect(result).toMatchObject({
      migrated: 1,
      failed: 0,
      orphaned: 0
    });
    expect(saveCount).toBe(2);
    expect(persisted.recordings[0]).toMatchObject({
      id: "same-recording",
      name: "Concurrent replacement",
      artifactRef: createRecordingArtifactRef("same-recording")
    });
    expect(persisted.recordings[0]).not.toHaveProperty("audioDataUrl");
    await expect(savedArtifact?.blob.text()).resolves.toBe("new-bytes");
  });

  it("resolves artifact-ref bodies without reading audio bodies from metadata", async () => {
    const repository = createMemoryArtifactRepository();
    const recording = createRecording({
      audioDataUrl: null,
      artifactRef: {
        kind: "indexeddb",
        artifactId: "recording-1",
        storageVersion: 1
      }
    });

    await repository.saveArtifact({
      artifactId: "recording-1",
      recordingId: "recording-1",
      recordingType: "quick",
      mimeType: "audio/webm",
      sizeBytes: 5,
      blob: new Blob(["audio"], { type: "audio/webm" }),
      createdAt: recording.createdAt,
      updatedAt: recording.createdAt
    });

    const body = await resolveRecordingArtifactBody(recording, { repository });

    expect(body).toMatchObject({
      artifactId: "recording-1",
      recordingId: "recording-1",
      mimeType: "audio/webm",
      sizeBytes: 5
    });
    await expect(body.blob.text()).resolves.toBe("audio");
  });

  it("falls back to legacy audioDataUrl without saving an artifact by default", async () => {
    const repository = createMemoryArtifactRepository();
    const recording = createRecording({
      artifactRef: createRecordingArtifactRef("recording-1"),
      audioDataUrl: "data:audio/webm;base64,cmVjb3ZlcmVk"
    });

    const body = await resolveRecordingArtifactBody(recording, { repository });

    expect(body).toMatchObject({
      artifactId: "recording-1",
      recordingId: "recording-1",
      mimeType: "audio/webm"
    });
    await expect(body.blob.text()).resolves.toBe("recovered");
    expect(repository.artifacts.has("recording-1")).toBe(false);
  });

  it("requires explicit opt-in before legacy fallback saves an artifact", async () => {
    const repository = createMemoryArtifactRepository();
    const recording = createRecording({
      artifactRef: createRecordingArtifactRef("recording-1"),
      audioDataUrl: "data:audio/webm;base64,cmVjb3ZlcmVk"
    });

    const body = await resolveRecordingArtifactBody(recording, {
      repository,
      persistLegacyFallback: true
    });

    await expect(body.blob.text()).resolves.toBe("recovered");
    await expect(repository.artifacts.get("recording-1")?.blob.text()).resolves.toBe(
      "recovered"
    );
  });

  it("reports post-commit single-record artifact cleanup failure after metadata removal", async () => {
    const repository = createMemoryArtifactRepository({ failDeletes: true });
    const recording = createRecording({
      id: "delete-target",
      audioDataUrl: null,
      artifactRef: createRecordingArtifactRef("delete-target")
    });

    await repository.saveArtifact({
      artifactId: "delete-target",
      recordingId: "delete-target",
      recordingType: "quick",
      mimeType: "audio/webm",
      sizeBytes: 5,
      blob: new Blob(["audio"], { type: "audio/webm" }),
      createdAt: recording.createdAt,
      updatedAt: recording.createdAt
    });
    window.localStorage.setItem(
      RECORDINGS_STORAGE_KEY,
      JSON.stringify({
        sessions: [],
        recordings: [recording],
        errorMarkers: []
      })
    );

    const service = createRecordingsReviewService({
      artifactRepository: repository
    });

    await expect(service.deleteRecording("delete-target")).rejects.toThrow(
      "artifact cleanup failed"
    );
    expect(
      JSON.parse(window.localStorage.getItem(RECORDINGS_STORAGE_KEY) ?? "{}")
        .recordings
    ).toHaveLength(0);
    await expect(repository.artifacts.get("delete-target")?.blob.text()).resolves.toBe(
      "audio"
    );
  });

  it("deletes by owned recording id instead of corrupted artifactRef pointers", async () => {
    const repository = createMemoryArtifactRepository();
    const target = createRecording({
      id: "delete-target",
      audioDataUrl: null,
      artifactRef: createRecordingArtifactRef("retained-recording")
    });
    const retained = createRecording({
      id: "retained-recording",
      audioDataUrl: null,
      artifactRef: createRecordingArtifactRef("retained-recording")
    });

    await repository.saveArtifact({
      artifactId: "retained-recording",
      recordingId: "retained-recording",
      recordingType: "quick",
      mimeType: "audio/webm",
      sizeBytes: 8,
      blob: new Blob(["retained"], { type: "audio/webm" }),
      createdAt: retained.createdAt,
      updatedAt: retained.createdAt
    });
    window.localStorage.setItem(
      RECORDINGS_STORAGE_KEY,
      JSON.stringify({
        sessions: [],
        recordings: [target, retained],
        errorMarkers: []
      })
    );

    const service = createRecordingsReviewService({
      artifactRepository: repository
    });

    await service.deleteRecording("delete-target");

    const persisted = JSON.parse(window.localStorage.getItem(RECORDINGS_STORAGE_KEY) ?? "{}");

    expect(persisted.recordings.map((recording: { id: string }) => recording.id)).toEqual([
      "retained-recording"
    ]);
    await expect(repository.artifacts.get("retained-recording")?.blob.text()).resolves.toBe(
      "retained"
    );
  });

  it("skips post-commit single delete artifact cleanup when the same recording id changes before artifact delete", async () => {
    let listCount = 0;
    const oldRecording = createRecording({
      id: "same-id",
      name: "Old row",
      audioDataUrl: null,
      artifactRef: createRecordingArtifactRef("same-id")
    });
    const newRecording = createRecording({
      id: "same-id",
      name: "New row",
      audioDataUrl: null,
      artifactRef: createRecordingArtifactRef("same-id")
    });
    const repository = createMemoryArtifactRepository({
      onList(recordingIds) {
        listCount += 1;

        if (recordingIds.includes("same-id") && listCount === 1) {
          window.localStorage.setItem(
            RECORDINGS_STORAGE_KEY,
            JSON.stringify({
              sessions: [],
              recordings: [newRecording],
              errorMarkers: []
            })
          );
        }
      }
    });

    await repository.saveArtifact({
      artifactId: "same-id",
      recordingId: "same-id",
      recordingType: "quick",
      mimeType: "audio/webm",
      sizeBytes: 8,
      blob: new Blob(["retained"], { type: "audio/webm" }),
      createdAt: oldRecording.createdAt,
      updatedAt: oldRecording.createdAt
    });
    window.localStorage.setItem(
      RECORDINGS_STORAGE_KEY,
      JSON.stringify({
        sessions: [],
        recordings: [oldRecording],
        errorMarkers: []
      })
    );

    const service = createRecordingsReviewService({
      artifactRepository: repository
    });

    await expect(service.deleteRecording("same-id")).resolves.toBeUndefined();

    const persisted = JSON.parse(window.localStorage.getItem(RECORDINGS_STORAGE_KEY) ?? "{}");

    expect(persisted.recordings).toHaveLength(1);
    expect(persisted.recordings[0]).toMatchObject({
      id: "same-id",
      name: "New row"
    });
    await expect(repository.artifacts.get("same-id")?.blob.text()).resolves.toBe(
      "retained"
    );
  });

  it("quick clear preserves retained artifacts when a quick ref points at them", async () => {
    const retained = createRecording({
      id: "retained-sheet",
      type: "sheet",
      sheetId: "sheet-alpha",
      artifactRef: createRecordingArtifactRef("retained-sheet"),
      audioDataUrl: null
    });
    const corruptedQuick = createRecording({
      id: "quick-target",
      artifactRef: createRecordingArtifactRef("retained-sheet"),
      audioDataUrl: null
    });

    await recordingArtifactRepository.saveArtifact({
      artifactId: "retained-sheet",
      recordingId: "retained-sheet",
      recordingType: "sheet",
      mimeType: "audio/webm",
      sizeBytes: 8,
      blob: new Blob(["retained"], { type: "audio/webm" }),
      createdAt: retained.createdAt,
      updatedAt: retained.createdAt
    });
    window.localStorage.setItem(
      RECORDINGS_STORAGE_KEY,
      JSON.stringify({
        sessions: [],
        recordings: [corruptedQuick, retained],
        errorMarkers: []
      })
    );

    await quickRecordingController.clear();

    expect(await recordingArtifactRepository.getArtifact("retained-sheet")).toMatchObject({
      recordingId: "retained-sheet"
    });
  });

  it("reports quick clear artifact cleanup failure after metadata clear", async () => {
    const quick = createRecording({
      id: "quick-cleanup-target",
      audioDataUrl: null,
      artifactRef: createRecordingArtifactRef("quick-cleanup-target")
    });
    const deleteSpy = vi
      .spyOn(recordingArtifactRepository, "deleteArtifacts")
      .mockRejectedValueOnce(new Error("IndexedDB delete failed"));

    await recordingArtifactRepository.saveArtifact({
      artifactId: quick.id,
      recordingId: quick.id,
      recordingType: "quick",
      mimeType: "audio/webm",
      sizeBytes: 8,
      blob: new Blob(["orphan"], { type: "audio/webm" }),
      createdAt: quick.createdAt,
      updatedAt: quick.createdAt
    });
    window.localStorage.setItem(
      RECORDINGS_STORAGE_KEY,
      JSON.stringify({
        sessions: [],
        recordings: [quick],
        errorMarkers: []
      })
    );

    await expect(quickRecordingController.clear()).rejects.toThrow(
      "artifact cleanup failed"
    );
    expect(recordingHistoryRepository.getSnapshot().recordings).toEqual([]);
    await expect(recordingArtifactRepository.getArtifact(quick.id)).resolves.toMatchObject({
      recordingId: quick.id
    });
    deleteSpy.mockRestore();
  });

  it("skips post-commit quick clear artifact cleanup when recording history changes before artifact delete", async () => {
    const oldQuick = createRecording({
      id: "same-quick",
      name: "Old quick",
      audioDataUrl: null,
      artifactRef: createRecordingArtifactRef("same-quick")
    });
    const newQuick = createRecording({
      id: "same-quick",
      name: "New quick",
      audioDataUrl: null,
      artifactRef: createRecordingArtifactRef("same-quick")
    });
    const listSpy = vi
      .spyOn(recordingArtifactRepository, "listArtifactsForRecordings")
      .mockImplementationOnce(async () => {
        window.localStorage.setItem(
          RECORDINGS_STORAGE_KEY,
          JSON.stringify({
            sessions: [],
            recordings: [newQuick],
            errorMarkers: []
          })
        );

        return [
          {
            artifactId: "same-quick",
            recordingId: "same-quick",
            recordingType: "quick",
            mimeType: "audio/webm",
            sizeBytes: 8,
            blob: new Blob(["retained"], { type: "audio/webm" }),
            createdAt: oldQuick.createdAt,
            updatedAt: oldQuick.createdAt
          }
        ];
      });
    const deleteSpy = vi.spyOn(recordingArtifactRepository, "deleteArtifacts");

    await recordingArtifactRepository.saveArtifact({
      artifactId: "same-quick",
      recordingId: "same-quick",
      recordingType: "quick",
      mimeType: "audio/webm",
      sizeBytes: 8,
      blob: new Blob(["retained"], { type: "audio/webm" }),
      createdAt: oldQuick.createdAt,
      updatedAt: oldQuick.createdAt
    });
    window.localStorage.setItem(
      RECORDINGS_STORAGE_KEY,
      JSON.stringify({
        sessions: [],
        recordings: [oldQuick],
        errorMarkers: []
      })
    );

    await expect(quickRecordingController.clear()).resolves.toBeUndefined();

    const persisted = JSON.parse(window.localStorage.getItem(RECORDINGS_STORAGE_KEY) ?? "{}");

    expect(persisted.recordings[0]).toMatchObject({
      id: "same-quick",
      name: "New quick"
    });
    expect(deleteSpy).not.toHaveBeenCalled();
    expect(await recordingArtifactRepository.getArtifact("same-quick")).toMatchObject({
      recordingId: "same-quick"
    });
    listSpy.mockRestore();
    deleteSpy.mockRestore();
  });

  it("sheet clear preserves retained artifacts when a sheet ref points at them", async () => {
    const retained = createRecording({
      id: "retained-quick",
      artifactRef: createRecordingArtifactRef("retained-quick"),
      audioDataUrl: null
    });
    const corruptedSheet = createRecording({
      id: "sheet-target",
      type: "sheet",
      sheetId: "sheet-alpha",
      artifactRef: createRecordingArtifactRef("retained-quick"),
      audioDataUrl: null
    });

    await recordingArtifactRepository.saveArtifact({
      artifactId: "retained-quick",
      recordingId: "retained-quick",
      recordingType: "quick",
      mimeType: "audio/webm",
      sizeBytes: 8,
      blob: new Blob(["retained"], { type: "audio/webm" }),
      createdAt: retained.createdAt,
      updatedAt: retained.createdAt
    });
    window.localStorage.setItem(
      RECORDINGS_STORAGE_KEY,
      JSON.stringify({
        sessions: [],
        recordings: [corruptedSheet, retained],
        errorMarkers: []
      })
    );

    await recordingHistoryMetadataRepository.clear();

    expect(await recordingArtifactRepository.getArtifact("retained-quick")).toMatchObject({
      recordingId: "retained-quick"
    });
  });

  it("reports sheet clear artifact cleanup failure after metadata clear", async () => {
    const sheet = createRecording({
      id: "sheet-cleanup-target",
      type: "sheet",
      sheetId: "sheet-alpha",
      audioDataUrl: null,
      artifactRef: createRecordingArtifactRef("sheet-cleanup-target")
    });
    const deleteSpy = vi
      .spyOn(recordingArtifactRepository, "deleteArtifacts")
      .mockRejectedValueOnce(new Error("IndexedDB delete failed"));

    await recordingArtifactRepository.saveArtifact({
      artifactId: sheet.id,
      recordingId: sheet.id,
      recordingType: "sheet",
      mimeType: "audio/webm",
      sizeBytes: 8,
      blob: new Blob(["orphan"], { type: "audio/webm" }),
      createdAt: sheet.createdAt,
      updatedAt: sheet.createdAt
    });
    window.localStorage.setItem(
      RECORDINGS_STORAGE_KEY,
      JSON.stringify({
        sessions: [],
        recordings: [sheet],
        errorMarkers: []
      })
    );

    await expect(recordingHistoryMetadataRepository.clear()).rejects.toThrow(
      "artifact cleanup failed"
    );
    expect(recordingHistoryRepository.getSnapshot().recordings).toEqual([]);
    await expect(recordingArtifactRepository.getArtifact(sheet.id)).resolves.toMatchObject({
      recordingId: sheet.id
    });
    deleteSpy.mockRestore();
  });

  it("skips post-commit sheet clear artifact cleanup when recording history changes before artifact delete", async () => {
    const oldSheet = createRecording({
      id: "same-sheet",
      type: "sheet",
      name: "Old sheet",
      sheetId: "sheet-alpha",
      audioDataUrl: null,
      artifactRef: createRecordingArtifactRef("same-sheet")
    });
    const newSheet = createRecording({
      id: "same-sheet",
      type: "sheet",
      name: "New sheet",
      sheetId: "sheet-alpha",
      audioDataUrl: null,
      artifactRef: createRecordingArtifactRef("same-sheet")
    });
    const listSpy = vi
      .spyOn(recordingArtifactRepository, "listArtifactsForRecordings")
      .mockImplementationOnce(async () => {
        window.localStorage.setItem(
          RECORDINGS_STORAGE_KEY,
          JSON.stringify({
            sessions: [],
            recordings: [newSheet],
            errorMarkers: []
          })
        );

        return [
          {
            artifactId: "same-sheet",
            recordingId: "same-sheet",
            recordingType: "sheet",
            mimeType: "audio/webm",
            sizeBytes: 8,
            blob: new Blob(["retained"], { type: "audio/webm" }),
            createdAt: oldSheet.createdAt,
            updatedAt: oldSheet.createdAt
          }
        ];
      });
    const deleteSpy = vi.spyOn(recordingArtifactRepository, "deleteArtifacts");

    await recordingArtifactRepository.saveArtifact({
      artifactId: "same-sheet",
      recordingId: "same-sheet",
      recordingType: "sheet",
      mimeType: "audio/webm",
      sizeBytes: 8,
      blob: new Blob(["retained"], { type: "audio/webm" }),
      createdAt: oldSheet.createdAt,
      updatedAt: oldSheet.createdAt
    });
    window.localStorage.setItem(
      RECORDINGS_STORAGE_KEY,
      JSON.stringify({
        sessions: [],
        recordings: [oldSheet],
        errorMarkers: []
      })
    );

    await expect(recordingHistoryMetadataRepository.clear()).resolves.toBeUndefined();

    const persisted = JSON.parse(window.localStorage.getItem(RECORDINGS_STORAGE_KEY) ?? "{}");

    expect(persisted.recordings[0]).toMatchObject({
      id: "same-sheet",
      name: "New sheet"
    });
    expect(deleteSpy).not.toHaveBeenCalled();
    expect(await recordingArtifactRepository.getArtifact("same-sheet")).toMatchObject({
      recordingId: "same-sheet"
    });
    listSpy.mockRestore();
    deleteSpy.mockRestore();
  });
});
