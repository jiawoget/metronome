import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { ImportedSheet, SheetArtifact } from "@/domain/sheet";
import {
  clearSheetLibraryDatabaseForTests,
  resetSheetLibraryDatabaseConnectionForTests,
  seedSheetRowForTests,
  sheetLibraryRepository
} from "@/infrastructure/files/sheet-library-repository";
import { createSheetLibraryService } from "@/services/sheet-library";

function createSheet(overrides: Partial<ImportedSheet> = {}): ImportedSheet {
  return {
    id: "sheet-alpha",
    name: "Autumn Etude",
    category: "exercise",
    bpm: 96,
    timeSignature: "6/8",
    kind: "pdf",
    pageCount: 1,
    imageCount: 0,
    imageDimensions: [],
    mimeTypes: ["application/pdf"],
    sizeBytes: 512,
    originalFileNames: ["autumn-etude.pdf"],
    createdAt: "2026-06-21T10:00:00.000Z",
    updatedAt: "2026-06-21T10:00:00.000Z",
    lastPracticedAt: null,
    tags: [],
    favorite: false,
    ...overrides
  };
}

function createArtifact(sheetId: string): SheetArtifact {
  const file = new File(["%PDF-1.4"], "autumn-etude.pdf", {
    type: "application/pdf"
  });

  return {
    sheetId,
    kind: "pdf",
    createdAt: "2026-06-21T10:00:00.000Z",
    files: [
      {
        name: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        pageNumber: 1,
        blob: file,
        width: null,
        height: null
      }
    ]
  };
}

function createRepositoryBackedService() {
  return createSheetLibraryService({
    repository: sheetLibraryRepository,
    importAdapter: {
      async analyzeFiles() {
        return {
          ok: false,
          message: "Not used in repository tests."
        } as const;
      },
      async inspectArtifact() {
        return {
          readable: true,
          label: "artifact ok"
        };
      }
    }
  });
}

describe("sheet library repository", () => {
  beforeEach(async () => {
    await clearSheetLibraryDatabaseForTests();
  });

  afterEach(() => {
    resetSheetLibraryDatabaseConnectionForTests();
  });

  it("persists tags and favorite metadata across a Dexie reset and reload", async () => {
    const sheet = createSheet({
      id: "sheet-persisted",
      tags: ["Focus", "Warm Up"],
      favorite: true
    });

    await sheetLibraryRepository.saveSheet(sheet, createArtifact(sheet.id));

    resetSheetLibraryDatabaseConnectionForTests();

    await expect(sheetLibraryRepository.getSheet("sheet-persisted")).resolves.toMatchObject({
      id: "sheet-persisted",
      tags: ["Focus", "Warm Up"],
      favorite: true
    });
    await expect(sheetLibraryRepository.listSheets()).resolves.toEqual([
      expect.objectContaining({
        id: "sheet-persisted",
        tags: ["Focus", "Warm Up"],
        favorite: true
      })
    ]);
  });

  it("updates organization metadata without replacing artifacts or unrelated fields", async () => {
    const sheet = createSheet({
      id: "sheet-update-org",
      name: "Original Name",
      lastPracticedAt: "2026-06-21T09:00:00.000Z"
    });
    const artifact = createArtifact(sheet.id);

    await sheetLibraryRepository.saveSheet(sheet, artifact);

    await expect(
      sheetLibraryRepository.updateSheetOrganization(
        "sheet-update-org",
        {
          tags: ["Warm Up", "Focus"],
          favorite: true
        },
        "2026-06-21T10:05:00.000Z"
      )
    ).resolves.toMatchObject({
      id: "sheet-update-org",
      name: "Original Name",
      lastPracticedAt: "2026-06-21T09:00:00.000Z",
      tags: ["Warm Up", "Focus"],
      favorite: true,
      updatedAt: "2026-06-21T10:05:00.000Z"
    });

    await expect(sheetLibraryRepository.getArtifact("sheet-update-org")).resolves.toMatchObject({
      sheetId: artifact.sheetId,
      kind: artifact.kind,
      createdAt: artifact.createdAt,
      files: [
        {
          name: artifact.files[0]?.name,
          mimeType: artifact.files[0]?.mimeType,
          sizeBytes: artifact.files[0]?.sizeBytes,
          pageNumber: artifact.files[0]?.pageNumber,
          width: artifact.files[0]?.width,
          height: artifact.files[0]?.height
        }
      ]
    });

    await expect(
      sheetLibraryRepository.updateSheetOrganization(
        "sheet-missing",
        {
          tags: ["Focus"],
          favorite: true
        },
        "2026-06-21T10:06:00.000Z"
      )
    ).resolves.toBeNull();
  });

  it("reads legacy and malformed persisted organization fields back through the service boundary", async () => {
    await seedSheetRowForTests("sheet-legacy", {
      name: "Legacy Sheet",
      category: "song",
      bpm: 120,
      timeSignature: "4/4",
      kind: "pdf",
      pageCount: 1,
      imageCount: 0,
      imageDimensions: [],
      mimeTypes: ["application/pdf"],
      sizeBytes: 256,
      originalFileNames: ["legacy.pdf"],
      createdAt: "2026-06-21T10:00:00.000Z",
      updatedAt: "2026-06-21T10:00:00.000Z",
      lastPracticedAt: null
    });
    await seedSheetRowForTests("sheet-malformed", {
      name: "Malformed Sheet",
      category: "exercise",
      bpm: 88,
      timeSignature: "3/4",
      kind: "pdf",
      pageCount: 1,
      imageCount: 0,
      imageDimensions: [],
      mimeTypes: ["application/pdf"],
      sizeBytes: 384,
      originalFileNames: ["malformed.pdf"],
      createdAt: "2026-06-21T11:00:00.000Z",
      updatedAt: "2026-06-21T11:00:00.000Z",
      lastPracticedAt: null,
      tags: [" Warm   Up ", "", "Focus", "focus", "bad,tag"],
      favorite: "yes"
    });

    resetSheetLibraryDatabaseConnectionForTests();

    const service = createRepositoryBackedService();

    await expect(service.getSheet("sheet-legacy")).resolves.toMatchObject({
      id: "sheet-legacy",
      tags: [],
      favorite: false
    });
    await expect(service.getSheet("sheet-malformed")).resolves.toMatchObject({
      id: "sheet-malformed",
      tags: ["Warm Up", "Focus"],
      favorite: false
    });
    await expect(service.listSheets()).resolves.toEqual([
      expect.objectContaining({
        id: "sheet-malformed",
        tags: ["Warm Up", "Focus"],
        favorite: false
      }),
      expect.objectContaining({
        id: "sheet-legacy",
        tags: [],
        favorite: false
      })
    ]);
  });
});
