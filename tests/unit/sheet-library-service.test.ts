import { beforeEach, describe, expect, it } from "vitest";

import type { ImportedSheet, SheetArtifact, SheetArtifactStatus } from "@/domain/sheet";
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
    async getArtifact(sheetId) {
      return artifacts.get(sheetId) ?? null;
    },
    async deleteSheet(sheetId) {
      sheets.delete(sheetId);
      artifacts.delete(sheetId);
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

const pdfFile = new File(["%PDF-1.4"], "real-sheet.pdf", { type: "application/pdf" });
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
        message: "Unsupported file type. Upload one PDF or one or more PNG/JPG image files."
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
      message: "Unsupported file type. Upload one PDF or one or more PNG/JPG image files."
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
});
