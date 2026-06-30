import type { Page } from "@playwright/test";

import type { WavArtifact } from "./audio";
import { RECORDING_ARTIFACT_DB_NAME } from "./storage";

type E2ERecordingType = "quick" | "sheet";
type E2ERecordingArtifact = Pick<WavArtifact, "dataUrl" | "durationMs" | "sizeBytes"> & {
  mimeType?: string;
};
type E2ERecordingArtifactRef = { kind: "indexeddb"; artifactId: string; storageVersion: 1 };
type E2ERecordingSettings = { bpm: number; timeSignature: string };
type E2ERecordingOverrides = Record<string, unknown> & {
  id: string;
  name: string;
  createdAt: string;
  sessionId?: string;
  artifact?: E2ERecordingArtifact;
  artifactRef?: E2ERecordingArtifactRef | null;
  audioDataUrl?: string | null;
  durationMs?: number;
  sizeBytes?: number;
  mimeType?: string;
  settings?: Partial<E2ERecordingSettings>;
};
type E2ESheetRecordingOverrides = E2ERecordingOverrides & {
  sheetId: string | null;
  sheetName?: string | null;
};
type E2EReviewRecording = Record<string, unknown> & {
  id: string;
  type: E2ERecordingType;
  createdAt: string;
  durationMs: number;
  sizeBytes: number;
  mimeType: string;
  audioDataUrl: string | null;
  artifactRef?: E2ERecordingArtifactRef | null;
  settings: E2ERecordingSettings;
};

export function createE2ESegmentContext({
  segmentId = "segment-bridge",
  segmentName = "Bridge"
}: {
  segmentId?: string;
  segmentName?: string;
} = {}) {
  return {
    segmentId,
    segmentName,
    range: { startMeasure: 5, endMeasure: 12 },
    targetBpm: 96,
    measureGridVersion:
      "bpm:96|timeSignature:4/4|pickupBeats:0|measureOneOffsetMs:1000",
    measureGridSnapshot: {
      bpm: 96,
      timeSignature: "4/4",
      pickupBeats: 0,
      measureOneOffsetMs: 1_000
    },
    measureRangeMs: { startMs: 11_000, endMs: 31_000 }
  };
}

export function createE2EQuickRecording({
  artifact,
  createdAt,
  id,
  name,
  settings,
  sessionId,
  ...overrides
}: E2ERecordingOverrides): E2EReviewRecording {
  return withArtifactDefaults(
    {
      id,
      type: "quick",
      origin: "user",
      name,
      sessionId: sessionId ?? "session-quick",
      sheetId: null,
      createdAt,
      durationMs: artifact?.durationMs ?? 1_000,
      sizeBytes: artifact?.sizeBytes ?? 0,
      mimeType: artifact?.mimeType ?? "audio/wav",
      audioDataUrl: artifact?.dataUrl ?? null,
      ...overrides,
      settings: { bpm: 120, timeSignature: "4/4", ...settings }
    },
    artifact,
    overrides
  );
}

export function createE2ESheetRecording({
  artifact,
  createdAt,
  id,
  name,
  settings,
  sessionId,
  sheetId,
  sheetName,
  ...overrides
}: E2ESheetRecordingOverrides): E2EReviewRecording {
  return withArtifactDefaults(
    {
      id,
      type: "sheet",
      origin: "user",
      name,
      sessionId: sessionId ?? "session-sheet",
      sheetId,
      sheetName,
      createdAt,
      durationMs: artifact?.durationMs ?? 1_000,
      sizeBytes: artifact?.sizeBytes ?? 0,
      mimeType: artifact?.mimeType ?? "audio/wav",
      audioDataUrl: artifact?.dataUrl ?? null,
      ...overrides,
      settings: { bpm: 96, timeSignature: "4/4", ...settings }
    },
    artifact,
    overrides
  );
}

export function createE2ERecordingOrganizationItem(
  overrides: Record<string, unknown> & {
    recordingId: string;
    updatedAt: string;
  }
) {
  return { tags: [], favorite: false, archived: false, ...overrides };
}

export async function seedE2ERecordingArtifacts(
  page: Page,
  recordings: E2EReviewRecording[]
) {
  const artifacts = recordings.flatMap((recording) => {
    if (
      recording.artifactRef?.kind !== "indexeddb" ||
      typeof recording.audioDataUrl !== "string"
    ) {
      return [];
    }

    return [
      {
        artifactId: recording.artifactRef.artifactId,
        recordingId: recording.id,
        recordingType: recording.type,
        mimeType: recording.mimeType,
        sizeBytes: recording.sizeBytes,
        dataUrl: recording.audioDataUrl,
        createdAt: recording.createdAt
      }
    ];
  });

  if (artifacts.length === 0) {
    return;
  }

  await page.evaluate(
    async ({ databaseName, artifactsToSeed }) => {
      const artifactsWithBlobs = await Promise.all(
        artifactsToSeed.map(async (artifact) => ({
          ...artifact,
          blob: await fetch(artifact.dataUrl).then((response) => response.blob())
        }))
      );
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(databaseName, 1);

        request.onupgradeneeded = () => {
          const upgradeDatabase = request.result;

          if (!upgradeDatabase.objectStoreNames.contains("recordingArtifacts")) {
            const store = upgradeDatabase.createObjectStore("recordingArtifacts", {
              keyPath: "artifactId"
            });

            for (const indexName of ["recordingId", "recordingType", "createdAt", "updatedAt"]) {
              store.createIndex(indexName, indexName);
            }
          }
        };
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
      });

      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction("recordingArtifacts", "readwrite");
        const store = transaction.objectStore("recordingArtifacts");

        transaction.oncomplete = () => {
          database.close();
          resolve();
        };
        transaction.onerror = () => {
          database.close();
          reject(transaction.error);
        };

        for (const artifact of artifactsWithBlobs) {
          store.put({
            artifactId: artifact.artifactId,
            recordingId: artifact.recordingId,
            recordingType: artifact.recordingType,
            mimeType: artifact.mimeType,
            sizeBytes: artifact.sizeBytes,
            blob: artifact.blob,
            createdAt: artifact.createdAt,
            updatedAt: artifact.createdAt
          });
        }
      });
    },
    {
      databaseName: RECORDING_ARTIFACT_DB_NAME,
      artifactsToSeed: artifacts
    }
  );
}

function withArtifactDefaults(
  recording: E2EReviewRecording,
  artifact: E2ERecordingArtifact | undefined,
  overrides: Record<string, unknown>
): E2EReviewRecording {
  if (!artifact || "artifactRef" in overrides) {
    return recording;
  }

  return {
    ...recording,
    artifactRef: {
      kind: "indexeddb",
      artifactId: recording.id,
      storageVersion: 1
    }
  };
}
