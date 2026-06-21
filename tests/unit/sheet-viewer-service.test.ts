import { describe, expect, it } from "vitest";

import type { SheetArtifact, SheetListItem } from "@/domain/sheet";
import {
  clampSheetViewerZoom,
  createSheetViewerService,
  formatSheetViewerPageLabel,
  stepSheetViewerZoom,
  type SheetViewerAdapter,
  type SheetViewerLibraryReader
} from "@/services/sheet-viewer";

const baseSheet: SheetListItem = {
  id: "sheet-pdf",
  name: "Autumn Etude",
  category: "exercise",
  bpm: 96,
  timeSignature: "6/8",
  kind: "pdf",
  pageCount: 2,
  imageCount: 0,
  imageDimensions: [],
  mimeTypes: ["application/pdf"],
  sizeBytes: 1024,
  originalFileNames: ["autumn-etude.pdf"],
  createdAt: "2026-06-21T10:00:00.000Z",
  updatedAt: "2026-06-21T10:00:00.000Z",
  lastPracticedAt: null,
  artifactStatus: {
    readable: true,
    label: "PDF artifact parsed: 2 pages"
  }
};

const pdfArtifact: SheetArtifact = {
  sheetId: "sheet-pdf",
  kind: "pdf",
  createdAt: "2026-06-21T10:00:00.000Z",
  files: [
    {
      name: "autumn-etude.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1024,
      pageNumber: 1,
      blob: new Blob(["%PDF-1.4"], { type: "application/pdf" }),
      width: null,
      height: null
    }
  ]
};

function createReader({
  sheet = baseSheet,
  artifact = pdfArtifact
}: {
  sheet?: SheetListItem | null;
  artifact?: SheetArtifact | null;
} = {}): SheetViewerLibraryReader {
  return {
    async getSheet() {
      return sheet;
    },
    async getArtifact() {
      return artifact;
    }
  };
}

function createAdapter(
  result: Awaited<ReturnType<SheetViewerAdapter["inspectArtifact"]>> = {
    ok: true,
    pageCount: 2,
    imageDimensions: []
  }
): SheetViewerAdapter {
  return {
    async inspectArtifact() {
      return result;
    },
    createFileUrl() {
      return "blob:sheet";
    },
    revokeFileUrl() {}
  };
}

describe("sheet viewer service", () => {
  it("maps missing sheetId, unknown sheet, and missing artifact to explicit errors", async () => {
    const service = createSheetViewerService({
      sheetLibrary: createReader(),
      viewerAdapter: createAdapter()
    });

    await expect(service.loadSheet("")).resolves.toMatchObject({
      status: "error",
      code: "missing-sheet-id"
    });

    await expect(
      createSheetViewerService({
        sheetLibrary: createReader({ sheet: null }),
        viewerAdapter: createAdapter()
      }).loadSheet("missing")
    ).resolves.toMatchObject({
      status: "error",
      code: "sheet-not-found"
    });

    await expect(
      createSheetViewerService({
        sheetLibrary: createReader({ artifact: null }),
        viewerAdapter: createAdapter()
      }).loadSheet("sheet-pdf")
    ).resolves.toMatchObject({
      status: "error",
      code: "missing-artifact"
    });
  });

  it("loads real metadata plus artifact only through service and adapter boundaries", async () => {
    const service = createSheetViewerService({
      sheetLibrary: createReader(),
      viewerAdapter: createAdapter()
    });

    await expect(service.loadSheet("sheet-pdf")).resolves.toMatchObject({
      status: "ready",
      sheet: {
        id: "sheet-pdf",
        name: "Autumn Etude"
      },
      artifact: {
        sheetId: "sheet-pdf",
        kind: "pdf"
      },
      pageCount: 2
    });
  });

  it("creates and revokes artifact object URLs through the viewer service boundary", () => {
    const createdBlobSizes: number[] = [];
    const revokedUrls: string[] = [];
    const service = createSheetViewerService({
      sheetLibrary: createReader(),
      viewerAdapter: {
        ...createAdapter(),
        createFileUrl(blob) {
          createdBlobSizes.push(blob.size);

          return `blob:sheet-${createdBlobSizes.length}`;
        },
        revokeFileUrl(url) {
          revokedUrls.push(url);
        }
      }
    });

    const objectUrls = service.createArtifactObjectUrls(pdfArtifact);

    expect(objectUrls).toEqual({
      sheetId: "sheet-pdf",
      urls: ["blob:sheet-1"]
    });
    expect(createdBlobSizes).toEqual([pdfArtifact.files[0].blob.size]);

    service.revokeArtifactObjectUrls(objectUrls);

    expect(revokedUrls).toEqual(["blob:sheet-1"]);
  });

  it("rejects artifact mismatches and bad PDF or image adapter results", async () => {
    const mismatchArtifact: SheetArtifact = {
      ...pdfArtifact,
      sheetId: "other-sheet"
    };

    await expect(
      createSheetViewerService({
        sheetLibrary: createReader({ artifact: mismatchArtifact }),
        viewerAdapter: createAdapter()
      }).loadSheet("sheet-pdf")
    ).resolves.toMatchObject({
      status: "error",
      code: "artifact-mismatch"
    });

    await expect(
      createSheetViewerService({
        sheetLibrary: createReader(),
        viewerAdapter: createAdapter({
          ok: false,
          code: "bad-pdf",
          message: "The saved PDF artifact could not be parsed."
        })
      }).loadSheet("sheet-pdf")
    ).resolves.toMatchObject({
      status: "error",
      code: "bad-pdf"
    });

    const imageSheet: SheetListItem = {
      ...baseSheet,
      id: "sheet-image",
      kind: "image",
      pageCount: 1,
      imageCount: 1,
      imageDimensions: [{ width: 2, height: 2 }],
      originalFileNames: ["scale.png"]
    };
    const imageArtifact: SheetArtifact = {
      ...pdfArtifact,
      sheetId: "sheet-image",
      kind: "image",
      files: [
        {
          ...pdfArtifact.files[0],
          name: "scale.png",
          mimeType: "image/png",
          width: 2,
          height: 2
        }
      ]
    };

    await expect(
      createSheetViewerService({
        sheetLibrary: createReader({ sheet: imageSheet, artifact: imageArtifact }),
        viewerAdapter: createAdapter({
          ok: false,
          code: "bad-image",
          message: "The saved image artifact could not be decoded."
        })
      }).loadSheet("sheet-image")
    ).resolves.toMatchObject({
      status: "error",
      code: "bad-image"
    });
  });

  it("formats page labels and clamps zoom by fixed steps", () => {
    expect(formatSheetViewerPageLabel(1, 2)).toBe("Page 1 of 2");
    expect(stepSheetViewerZoom(1, "in")).toBe(1.25);
    expect(stepSheetViewerZoom(1, "out")).toBe(0.75);
    expect(clampSheetViewerZoom(0.1)).toBe(0.5);
    expect(clampSheetViewerZoom(3)).toBe(2);
  });
});
