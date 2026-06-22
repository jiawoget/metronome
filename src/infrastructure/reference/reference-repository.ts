import Dexie, { type Table } from "dexie";

import {
  validateLocalAudioArtifact,
  validateSheetReference,
  type LocalAudioReferenceArtifact,
  type SheetReference
} from "@/domain/reference";
import type { ReferenceRepository } from "@/services/reference";

export const REFERENCE_DB_NAME = "metronome-practice-v0-references";
export const REFERENCE_STORE_EVENT = "reference-store-change";

type ReferenceDatabaseSchema = {
  references: Table<SheetReference, string>;
  artifacts: Table<LocalAudioReferenceArtifact, string>;
};

class ReferenceDexieDatabase extends Dexie implements ReferenceDatabaseSchema {
  references!: Table<SheetReference, string>;
  artifacts!: Table<LocalAudioReferenceArtifact, string>;

  constructor() {
    super(REFERENCE_DB_NAME);

    this.version(1).stores({
      references: "id, sheetId, kind, updatedAt, isActive",
      artifacts: "referenceId, sheetId, createdAt"
    });
  }
}

let database: ReferenceDexieDatabase | null = null;

function getDatabase() {
  database ??= new ReferenceDexieDatabase();

  return database;
}

function dispatchReferenceChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(REFERENCE_STORE_EVENT));
  }
}

function sortReferences(first: SheetReference, second: SheetReference) {
  if (first.isActive !== second.isActive) {
    return first.isActive ? -1 : 1;
  }

  return second.updatedAt.localeCompare(first.updatedAt);
}

async function listReferences(sheetId: string) {
    const rows = await getDatabase().references.where("sheetId").equals(sheetId).toArray();

    return rows.map(validateSheetReference).sort(sortReferences);
}

export const referenceRepository: ReferenceRepository = {
  listReferences,
  async getActiveReference(sheetId) {
    return (await listReferences(sheetId)).find((reference) => reference.isActive) ?? null;
  },

  async getLocalAudioArtifact(referenceId) {
    const artifact = await getDatabase().artifacts.get(referenceId);

    return artifact ? validateLocalAudioArtifact(artifact) : null;
  },

  async saveReference(reference, artifact = null) {
    const db = getDatabase();
    const persistedReference = validateSheetReference(reference);

    await db.transaction("rw", db.references, db.artifacts, async () => {
      const existingReferences = await db.references.where("sheetId").equals(persistedReference.sheetId).toArray();

      await Promise.all(
        existingReferences.map((existingReference) =>
          db.references.put({
            ...existingReference,
            isActive: existingReference.id === persistedReference.id,
            updatedAt:
              existingReference.id === persistedReference.id
                ? persistedReference.updatedAt
                : existingReference.updatedAt
          })
        )
      );
      await db.references.put(persistedReference);

      if (artifact) {
        await db.artifacts.put(validateLocalAudioArtifact(artifact), persistedReference.id);
      }
    });
    dispatchReferenceChange();
  },

  async clear() {
    const db = getDatabase();

    await db.transaction("rw", db.references, db.artifacts, async () => {
      await db.references.clear();
      await db.artifacts.clear();
    });
    dispatchReferenceChange();
  },

  subscribe(listener) {
    if (typeof window === "undefined") {
      return () => undefined;
    }

    const handleChange = () => listener();

    window.addEventListener(REFERENCE_STORE_EVENT, handleChange);
    window.addEventListener("storage", handleChange);

    return () => {
      window.removeEventListener(REFERENCE_STORE_EVENT, handleChange);
      window.removeEventListener("storage", handleChange);
    };
  }
};

export async function clearReferenceDatabaseForTests() {
  await getDatabase().delete();
  database = null;
}
