import { beforeEach, describe, expect, it } from "vitest";

import type {
  ImportedSheet,
  SheetArtifact,
  SheetArtifactStatus
} from "@/domain/sheet";
import {
  createSheetLibraryService,
  type SheetImportAdapter,
  type SheetLibraryRepository
} from "@/services/sheet-library";

function createMemoryRepository(): SheetLibraryRepository {
  const sheets = new Map<string, ImportedSheet>();
  const artifacts = new Map<string, SheetArtifact>();

  return {
    async listSheets() {
      return Array.from(sheets.values());
    },
    async getSheet(sheetId) {
      return sheets.get(sheetId) ?? null;
    },
    async saveSheet(sheet, artifact) {
      sheets.set(sheet.id, sheet);
      artifacts.set(sheet.id, artifact);
    },
    async updateSheetMetadata(sheetId, metadata, updatedAt) {
      const sheet = sheets.get(sheetId);

      if (!sheet) {
        return null;
      }

      const updatedSheet = {
        ...sheet,
        ...metadata,
        updatedAt
      };

      sheets.set(sheetId, updatedSheet);

      return updatedSheet;
    },
    async updateSheetOrganization(sheetId, organization, updatedAt) {
      const sheet = sheets.get(sheetId);

      if (!sheet) {
        return null;
      }

      const updatedSheet = {
        ...sheet,
        ...organization,
        updatedAt
      };

      sheets.set(sheetId, updatedSheet);

      return updatedSheet;
    },
    async updateLastPracticedAt(sheetId, practicedAt) {
      const sheet = sheets.get(sheetId);

      if (sheet) {
        sheets.set(sheetId, {
          ...sheet,
          lastPracticedAt: practicedAt,
          updatedAt: practicedAt
        });
      }
    },
    async getArtifact(sheetId) {
      return artifacts.get(sheetId) ?? null;
    },
    async deleteSheet(sheetId) {
      sheets.delete(sheetId);
      artifacts.delete(sheetId);
    },
    async clear() {
      sheets.clear();
      artifacts.clear();
    }
  };
}

function createAdapter(
  result: Awaited<ReturnType<SheetImportAdapter["analyzeFiles"]>>,
  artifactStatus: SheetArtifactStatus = {
    readable: true,
    label: "PDF artifact parsed: 1 page"
  }
): SheetImportAdapter {
  return {
    async analyzeFiles() {
      return result;
    },
    async inspectArtifact() {
      return artifactStatus;
    }
  };
}

const pdfFile = new File(["%PDF-1.4"], "real-sheet.pdf", {
  type: "application/pdf"
});
const imageFile = new File(["png"], "real-sheet.png", { type: "image/png" });

describe("sheet library service", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("imports PDF metadata and artifact through repository boundaries", async () => {
    const repository = createMemoryRepository();
    const service = createSheetLibraryService({
      repository,
      importAdapter: createAdapter({
        ok: true,
        preview: {
          kind: "pdf",
          pageCount: 1,
          imageCount: 0,
          imageDimensions: [],
          mimeTypes: ["application/pdf"],
          sizeBytes: pdfFile.size,
          originalFileNames: [pdfFile.name],
          files: [
            {
              name: pdfFile.name,
              mimeType: pdfFile.type,
              sizeBytes: pdfFile.size,
              pageNumber: 1,
              blob: pdfFile,
              width: null,
              height: null
            }
          ]
        }
      }),
      now: () => new Date("2026-06-21T10:00:00.000Z"),
      createId: () => "sheet-pdf"
    });

    const result = await service.importSheet({
      files: [pdfFile],
      metadata: {
        name: "Autumn Etude",
        category: "exercise",
        bpm: 96,
        timeSignature: "6/8"
      }
    });

    expect(result.ok).toBe(true);
    expect((await service.listSheets())[0]).toMatchObject({
      id: "sheet-pdf",
      name: "Autumn Etude",
      category: "exercise",
      pageCount: 1,
      tags: [],
      favorite: false,
      artifactStatus: {
        readable: true,
        label: "PDF artifact parsed: 1 page"
      }
    });
    expect(await service.getArtifact("sheet-pdf")).toMatchObject({
      sheetId: "sheet-pdf",
      kind: "pdf"
    });
  });

  it("imports image metadata and deletes metadata plus artifact together", async () => {
    const repository = createMemoryRepository();
    const service = createSheetLibraryService({
      repository,
      importAdapter: createAdapter(
        {
          ok: true,
          preview: {
            kind: "image",
            pageCount: 1,
            imageCount: 1,
            imageDimensions: [{ width: 2, height: 2 }],
            mimeTypes: ["image/png"],
            sizeBytes: imageFile.size,
            originalFileNames: [imageFile.name],
            files: [
              {
                name: imageFile.name,
                mimeType: imageFile.type,
                sizeBytes: imageFile.size,
                pageNumber: 1,
                blob: imageFile,
                width: 2,
                height: 2
              }
            ]
          }
        },
        {
          readable: true,
          label: "Image artifact decoded: 2 x 2"
        }
      ),
      createId: () => "sheet-image"
    });

    await service.importSheet({
      files: [imageFile],
      metadata: {
        name: "Pixel Scale",
        category: "scale",
        bpm: 72,
        timeSignature: "4/4"
      }
    });
    await service.deleteSheet("sheet-image");

    expect(await service.listSheets()).toEqual([]);
    expect(await service.getArtifact("sheet-image")).toBeNull();
    expect(await repository.getArtifact("sheet-image")).toBeNull();
  });

  it("returns import errors without creating fake sheet rows", async () => {
    const service = createSheetLibraryService({
      repository: createMemoryRepository(),
      importAdapter: createAdapter({
        ok: false,
        message:
          "Unsupported file type. Upload one PDF or one or more PNG/JPG image files."
      })
    });

    const result = await service.importSheet({
      files: [new File(["text"], "notes.txt", { type: "text/plain" })],
      metadata: {
        name: "Notes",
        category: "song",
        bpm: 120,
        timeSignature: "4/4"
      }
    });

    expect(result).toEqual({
      ok: false,
      message:
        "Unsupported file type. Upload one PDF or one or more PNG/JPG image files."
    });
    expect(await service.listSheets()).toEqual([]);
  });

  it("uses artifact inspection status from the adapter instead of blob size alone", async () => {
    const service = createSheetLibraryService({
      repository: createMemoryRepository(),
      importAdapter: createAdapter(
        {
          ok: true,
          preview: {
            kind: "pdf",
            pageCount: 1,
            imageCount: 0,
            imageDimensions: [],
            mimeTypes: ["application/pdf"],
            sizeBytes: pdfFile.size,
            originalFileNames: [pdfFile.name],
            files: [
              {
                name: pdfFile.name,
                mimeType: pdfFile.type,
                sizeBytes: pdfFile.size,
                pageNumber: 1,
                blob: pdfFile,
                width: null,
                height: null
              }
            ]
          }
        },
        {
          readable: false,
          label: "PDF artifact page count mismatch"
        }
      ),
      createId: () => "sheet-inspected"
    });

    await service.importSheet({
      files: [pdfFile],
      metadata: {
        name: "Inspected PDF",
        category: "song",
        bpm: 120,
        timeSignature: "4/4"
      }
    });

    expect((await service.listSheets())[0].artifactStatus).toEqual({
      readable: false,
      label: "PDF artifact page count mismatch"
    });
  });

  it("updates sheet metadata through validation and repository boundaries without replacing artifacts", async () => {
    const repository = createMemoryRepository();
    const service = createSheetLibraryService({
      repository,
      importAdapter: createAdapter({
        ok: true,
        preview: {
          kind: "pdf",
          pageCount: 1,
          imageCount: 0,
          imageDimensions: [],
          mimeTypes: ["application/pdf"],
          sizeBytes: pdfFile.size,
          originalFileNames: [pdfFile.name],
          files: [
            {
              name: pdfFile.name,
              mimeType: pdfFile.type,
              sizeBytes: pdfFile.size,
              pageNumber: 1,
              blob: pdfFile,
              width: null,
              height: null
            }
          ]
        }
      }),
      now: () => new Date("2026-06-21T10:00:00.000Z"),
      createId: () => "sheet-edit"
    });

    await service.importSheet({
      files: [pdfFile],
      metadata: {
        name: "Original",
        category: "song",
        bpm: 120,
        timeSignature: "4/4"
      }
    });

    const result = await service.updateSheetMetadata({
      sheetId: "sheet-edit",
      metadata: {
        name: "Edited Etude",
        category: "scale",
        bpm: 144,
        timeSignature: "7/8"
      }
    });

    expect(result).toMatchObject({
      ok: true,
      sheet: {
        id: "sheet-edit",
        name: "Edited Etude",
        category: "scale",
        bpm: 144,
        timeSignature: "7/8",
        updatedAt: "2026-06-21T10:00:00.000Z"
      }
    });
    expect(await service.getArtifact("sheet-edit")).toMatchObject({
      sheetId: "sheet-edit",
      kind: "pdf"
    });
  });

  it("updates sheet tags with normalized organization metadata and preserves the artifact", async () => {
    const repository = createMemoryRepository();
    let currentTime = "2026-06-21T10:00:00.000Z";
    const service = createSheetLibraryService({
      repository,
      importAdapter: createAdapter({
        ok: true,
        preview: {
          kind: "pdf",
          pageCount: 1,
          imageCount: 0,
          imageDimensions: [],
          mimeTypes: ["application/pdf"],
          sizeBytes: pdfFile.size,
          originalFileNames: [pdfFile.name],
          files: [
            {
              name: pdfFile.name,
              mimeType: pdfFile.type,
              sizeBytes: pdfFile.size,
              pageNumber: 1,
              blob: pdfFile,
              width: null,
              height: null
            }
          ]
        }
      }),
      now: () => new Date(currentTime),
      createId: () => "sheet-tags"
    });

    await service.importSheet({
      files: [pdfFile],
      metadata: {
        name: "Tagged",
        category: "song",
        bpm: 120,
        timeSignature: "4/4"
      }
    });

    currentTime = "2026-06-21T10:05:00.000Z";

    await expect(
      service.setSheetTags({
        sheetId: "sheet-tags",
        tags: [" Warm   Up ", "Focus", "warm up"]
      })
    ).resolves.toMatchObject({
      ok: true,
      sheet: {
        id: "sheet-tags",
        tags: ["Warm Up", "Focus"],
        favorite: false,
        updatedAt: "2026-06-21T10:05:00.000Z"
      }
    });
    expect(await service.getArtifact("sheet-tags")).toMatchObject({
      sheetId: "sheet-tags",
      kind: "pdf"
    });
  });

  it("rejects invalid tag updates without changing the saved organization metadata", async () => {
    const repository = createMemoryRepository();
    const service = createSheetLibraryService({
      repository,
      importAdapter: createAdapter({
        ok: true,
        preview: {
          kind: "image",
          pageCount: 1,
          imageCount: 1,
          imageDimensions: [{ width: 2, height: 2 }],
          mimeTypes: ["image/png"],
          sizeBytes: imageFile.size,
          originalFileNames: [imageFile.name],
          files: [
            {
              name: imageFile.name,
              mimeType: imageFile.type,
              sizeBytes: imageFile.size,
              pageNumber: 1,
              blob: imageFile,
              width: 2,
              height: 2
            }
          ]
        }
      }),
      createId: () => "sheet-invalid-tags"
    });

    await service.importSheet({
      files: [imageFile],
      metadata: {
        name: "Valid Tags",
        category: "song",
        bpm: 100,
        timeSignature: "4/4"
      }
    });

    await expect(
      service.setSheetTags({
        sheetId: "sheet-invalid-tags",
        tags: ["bad,tag"]
      })
    ).resolves.toEqual({
      ok: false,
      message: "Tags cannot contain commas, line breaks, or control characters."
    });
    expect(await service.getSheet("sheet-invalid-tags")).toMatchObject({
      tags: [],
      favorite: false
    });
  });

  it("rejects empty or malformed organization updates without persisting changes", async () => {
    const repository = createMemoryRepository();
    let currentTime = "2026-06-21T10:00:00.000Z";
    const service = createSheetLibraryService({
      repository,
      importAdapter: createAdapter({
        ok: true,
        preview: {
          kind: "pdf",
          pageCount: 1,
          imageCount: 0,
          imageDimensions: [],
          mimeTypes: ["application/pdf"],
          sizeBytes: pdfFile.size,
          originalFileNames: [pdfFile.name],
          files: [
            {
              name: pdfFile.name,
              mimeType: pdfFile.type,
              sizeBytes: pdfFile.size,
              pageNumber: 1,
              blob: pdfFile,
              width: null,
              height: null
            }
          ]
        }
      }),
      now: () => new Date(currentTime),
      createId: () => "sheet-empty-org"
    });

    await service.importSheet({
      files: [pdfFile],
      metadata: {
        name: "Organization Guard",
        category: "song",
        bpm: 120,
        timeSignature: "4/4"
      }
    });

    currentTime = "2026-06-21T10:10:00.000Z";

    await expect(
      service.updateSheetOrganization({ sheetId: "sheet-empty-org" } as never)
    ).resolves.toEqual({
      ok: false,
      message: "Sheet organization update requires tags or favorite."
    });
    await expect(
      service.updateSheetOrganization({
        sheetId: "sheet-empty-org",
        tags: "Warm Up"
      } as never)
    ).resolves.toEqual({
      ok: false,
      message: "Tags must be an array."
    });
    await expect(
      service.updateSheetOrganization({
        sheetId: "sheet-empty-org",
        favorite: "yes"
      } as never)
    ).resolves.toEqual({
      ok: false,
      message: "Favorite must be true or false."
    });
    expect(await service.getSheet("sheet-empty-org")).toMatchObject({
      tags: [],
      favorite: false,
      updatedAt: "2026-06-21T10:00:00.000Z"
    });
  });

  it("toggles favorite state and returns not-found errors for missing organization updates", async () => {
    const repository = createMemoryRepository();
    let currentTime = "2026-06-21T10:00:00.000Z";
    const service = createSheetLibraryService({
      repository,
      importAdapter: createAdapter({
        ok: true,
        preview: {
          kind: "pdf",
          pageCount: 1,
          imageCount: 0,
          imageDimensions: [],
          mimeTypes: ["application/pdf"],
          sizeBytes: pdfFile.size,
          originalFileNames: [pdfFile.name],
          files: [
            {
              name: pdfFile.name,
              mimeType: pdfFile.type,
              sizeBytes: pdfFile.size,
              pageNumber: 1,
              blob: pdfFile,
              width: null,
              height: null
            }
          ]
        }
      }),
      now: () => new Date(currentTime),
      createId: () => "sheet-favorite"
    });

    await service.importSheet({
      files: [pdfFile],
      metadata: {
        name: "Favorite Me",
        category: "exercise",
        bpm: 96,
        timeSignature: "6/8"
      }
    });

    currentTime = "2026-06-21T10:03:00.000Z";
    await expect(
      service.setSheetFavorite({
        sheetId: "sheet-favorite",
        favorite: true
      })
    ).resolves.toMatchObject({
      ok: true,
      sheet: {
        favorite: true,
        updatedAt: "2026-06-21T10:03:00.000Z"
      }
    });

    currentTime = "2026-06-21T10:04:00.000Z";
    await expect(
      service.setSheetFavorite({
        sheetId: "sheet-favorite",
        favorite: false
      })
    ).resolves.toMatchObject({
      ok: true,
      sheet: {
        favorite: false,
        updatedAt: "2026-06-21T10:04:00.000Z"
      }
    });

    await expect(
      service.setSheetFavorite({
        sheetId: "sheet-missing",
        favorite: true
      })
    ).resolves.toEqual({
      ok: false,
      message: "Sheet organization could not be updated because the sheet was not found."
    });
  });

  it("preserves organization metadata when editing sheet metadata or last practiced time", async () => {
    const repository = createMemoryRepository();
    let currentTime = "2026-06-21T10:00:00.000Z";
    const service = createSheetLibraryService({
      repository,
      importAdapter: createAdapter({
        ok: true,
        preview: {
          kind: "pdf",
          pageCount: 1,
          imageCount: 0,
          imageDimensions: [],
          mimeTypes: ["application/pdf"],
          sizeBytes: pdfFile.size,
          originalFileNames: [pdfFile.name],
          files: [
            {
              name: pdfFile.name,
              mimeType: pdfFile.type,
              sizeBytes: pdfFile.size,
              pageNumber: 1,
              blob: pdfFile,
              width: null,
              height: null
            }
          ]
        }
      }),
      now: () => new Date(currentTime),
      createId: () => "sheet-preserve-org"
    });

    await service.importSheet({
      files: [pdfFile],
      metadata: {
        name: "Original",
        category: "song",
        bpm: 120,
        timeSignature: "4/4"
      }
    });

    currentTime = "2026-06-21T10:02:00.000Z";
    await service.updateSheetOrganization({
      sheetId: "sheet-preserve-org",
      tags: ["Focus"],
      favorite: true
    });

    currentTime = "2026-06-21T10:03:00.000Z";
    await service.updateSheetMetadata({
      sheetId: "sheet-preserve-org",
      metadata: {
        name: "Edited",
        category: "scale",
        bpm: 144,
        timeSignature: "7/8"
      }
    });

    await service.updateLastPracticedAt(
      "sheet-preserve-org",
      "2026-06-21T10:04:00.000Z"
    );

    expect(await service.getSheet("sheet-preserve-org")).toMatchObject({
      name: "Edited",
      category: "scale",
      bpm: 144,
      timeSignature: "7/8",
      tags: ["Focus"],
      favorite: true,
      lastPracticedAt: "2026-06-21T10:04:00.000Z",
      updatedAt: "2026-06-21T10:04:00.000Z"
    });
  });

  it("rejects invalid metadata edits without changing the saved sheet", async () => {
    const repository = createMemoryRepository();
    const service = createSheetLibraryService({
      repository,
      importAdapter: createAdapter({
        ok: true,
        preview: {
          kind: "image",
          pageCount: 1,
          imageCount: 1,
          imageDimensions: [{ width: 2, height: 2 }],
          mimeTypes: ["image/png"],
          sizeBytes: imageFile.size,
          originalFileNames: [imageFile.name],
          files: [
            {
              name: imageFile.name,
              mimeType: imageFile.type,
              sizeBytes: imageFile.size,
              pageNumber: 1,
              blob: imageFile,
              width: 2,
              height: 2
            }
          ]
        }
      }),
      createId: () => "sheet-invalid-edit"
    });

    await service.importSheet({
      files: [imageFile],
      metadata: {
        name: "Valid",
        category: "song",
        bpm: 100,
        timeSignature: "4/4"
      }
    });

    await expect(
      service.updateSheetMetadata({
        sheetId: "sheet-invalid-edit",
        metadata: {
          name: "",
          category: "song",
          bpm: 12,
          timeSignature: "bad"
        }
      })
    ).resolves.toEqual({
      ok: false,
      message:
        "Sheet name is required. BPM must be at least 30. Use a time signature like 4/4, 3/4, or 6/8."
    });
    expect(await service.getSheet("sheet-invalid-edit")).toMatchObject({
      name: "Valid",
      bpm: 100,
      timeSignature: "4/4"
    });
  });
});
