import Dexie, { type Table } from "dexie";

import { RECORDING_ARTIFACT_DB_NAME } from "@/infrastructure/storage/storage-contracts";
import type { RecordingReviewType } from "@/lib/recordings-review/types";

export type LocalRecordingArtifact = {
  artifactId: string;
  recordingId: string;
  recordingType: RecordingReviewType;
  mimeType: string;
  sizeBytes: number;
  blob: Blob;
  createdAt: string;
  updatedAt: string;
};

export type RecordingArtifactRepository = {
  saveArtifact(input: LocalRecordingArtifact): Promise<LocalRecordingArtifact>;
  getArtifact(artifactId: string): Promise<LocalRecordingArtifact | null>;
  deleteArtifact(artifactId: string): Promise<void>;
  deleteArtifacts(artifactIds: string[]): Promise<void>;
  listArtifactsForRecordings(recordingIds: string[]): Promise<LocalRecordingArtifact[]>;
  clear(): Promise<void>;
};

class RecordingArtifactDexieDatabase extends Dexie {
  recordingArtifacts!: Table<LocalRecordingArtifact, string>;

  constructor() {
    super(RECORDING_ARTIFACT_DB_NAME);
    this.version(1).stores({
      recordingArtifacts: "artifactId, recordingId, recordingType, createdAt, updatedAt"
    });
  }
}

let database: RecordingArtifactDexieDatabase | null = null;

function getDatabase() {
  if (typeof indexedDB === "undefined" || typeof Blob === "undefined") {
    throw new Error("Local recording artifact storage is unavailable in this browser.");
  }

  database ??= new RecordingArtifactDexieDatabase();

  return database;
}

function normalizeRequiredString(value: string, label: string) {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  return normalized;
}

function validateArtifact(input: LocalRecordingArtifact): LocalRecordingArtifact {
  const artifactId = normalizeRequiredString(input.artifactId, "artifactId");
  const recordingId = normalizeRequiredString(input.recordingId, "recordingId");
  const mimeType = normalizeRequiredString(input.mimeType, "mimeType");

  if (artifactId !== recordingId) {
    throw new Error("Recording artifact id must match its recording id.");
  }

  if (input.recordingType !== "quick" && input.recordingType !== "sheet") {
    throw new Error("Recording artifact type must be quick or sheet.");
  }

  if (!(input.blob instanceof Blob) || input.blob.size <= 0) {
    throw new Error("Recording artifact blob must be non-empty.");
  }

  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0) {
    throw new Error("Recording artifact size must be positive.");
  }

  return {
    ...input,
    artifactId,
    recordingId,
    mimeType,
    sizeBytes: Math.round(input.sizeBytes)
  };
}

export const recordingArtifactRepository: RecordingArtifactRepository = {
  async saveArtifact(input) {
    const artifact = validateArtifact(input);

    await getDatabase().recordingArtifacts.put(artifact);

    return artifact;
  },

  async getArtifact(artifactId) {
    const normalizedArtifactId = artifactId.trim();

    if (!normalizedArtifactId) {
      return null;
    }

    return (await getDatabase().recordingArtifacts.get(normalizedArtifactId)) ?? null;
  },

  async deleteArtifact(artifactId) {
    const normalizedArtifactId = artifactId.trim();

    if (!normalizedArtifactId) {
      return;
    }

    await getDatabase().recordingArtifacts.delete(normalizedArtifactId);
  },

  async deleteArtifacts(artifactIds) {
    const normalizedArtifactIds = artifactIds
      .map((artifactId) => artifactId.trim())
      .filter((artifactId) => artifactId.length > 0);

    if (normalizedArtifactIds.length === 0) {
      return;
    }

    await getDatabase().recordingArtifacts.bulkDelete(normalizedArtifactIds);
  },

  async listArtifactsForRecordings(recordingIds) {
    const normalizedRecordingIds = new Set(
      recordingIds.map((recordingId) => recordingId.trim()).filter(Boolean)
    );

    if (normalizedRecordingIds.size === 0) {
      return [];
    }

    const artifacts = await getDatabase().recordingArtifacts.toArray();

    return artifacts.filter((artifact) => normalizedRecordingIds.has(artifact.recordingId));
  },

  async clear() {
    await getDatabase().recordingArtifacts.clear();
  }
};

export function resetRecordingArtifactRepositoryForTests() {
  database?.close();
  database = null;
}
