import { describe, expect, it } from "vitest";

import type { SheetArtifact, SheetListItem } from "@/domain/sheet";
import { browserSheetViewerAdapter } from "@/infrastructure/sheet-viewer/browser-sheet-viewer-adapter";
import {
  clampSheetViewerZoom,
  clampSheetViewerTransform,
  createSheetViewerTransform,
  createSheetViewerService,
  formatSheetViewerPageLabel,
  getSheetViewerAssistedPageTurnDelayMs,
  panSheetViewerTransform,
  resetSheetViewerTransform,
  resetSheetViewerTransformForPageChange,
  setSheetViewerTransformScale,
  SHEET_VIEWER_TRANSFORM_LIMITS,
  stepSheetViewerZoom,
  type SheetViewerAdapter,
  type SheetViewerTransformBounds,
  type SheetViewerThumbnailGeneration,
  type SheetViewerLibraryReader
} from "@/services/sheet-viewer";
import { buildMeasureGrid, buildPracticeSegment } from "./factories/practice";

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
  },
  thumbnailResult: SheetViewerThumbnailGeneration = {
    ok: true,
    thumbnails: [
      {
        pageNumber: 1,
        blob: new Blob(["thumbnail-1"], { type: "image/png" }),
        width: 120,
        height: 160
      },
      {
        pageNumber: 2,
        blob: new Blob(["thumbnail-2"], { type: "image/png" }),
        width: 120,
        height: 160
      }
    ]
  }
): SheetViewerAdapter {
  return {
    async inspectArtifact() {
      return result;
    },
    async generatePageThumbnails() {
      return thumbnailResult;
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

  it("loads page thumbnails as fresh blob URLs from cached thumbnail blobs", async () => {
    const createdBlobText: string[] = [];
    let generateCalls = 0;
    const service = createSheetViewerService({
      sheetLibrary: createReader(),
      viewerAdapter: {
        ...createAdapter(),
        async generatePageThumbnails() {
          generateCalls += 1;

          return {
            ok: true,
            thumbnails: [
              {
                pageNumber: 1,
                blob: new Blob(["thumbnail-1"], { type: "image/png" }),
                width: 120,
                height: 160
              },
              {
                pageNumber: 2,
                blob: new Blob(["thumbnail-2"], { type: "image/png" }),
                width: 120,
                height: 160
              }
            ]
          };
        },
        createFileUrl(blob) {
          createdBlobText.push(String(blob.size));

          return `blob:thumbnail-${createdBlobText.length}`;
        }
      }
    });

    await expect(service.loadPageThumbnails("sheet-pdf")).resolves.toEqual({
      status: "ready",
      sheetId: "sheet-pdf",
      pageCount: 2,
      thumbnails: [
        {
          sheetId: "sheet-pdf",
          pageNumber: 1,
          width: 120,
          height: 160,
          url: "blob:thumbnail-1"
        },
        {
          sheetId: "sheet-pdf",
          pageNumber: 2,
          width: 120,
          height: 160,
          url: "blob:thumbnail-2"
        }
      ]
    });
    await expect(service.loadPageThumbnails("sheet-pdf")).resolves.toMatchObject({
      status: "ready",
      thumbnails: [
        { url: "blob:thumbnail-3" },
        { url: "blob:thumbnail-4" }
      ]
    });
    expect(generateCalls).toBe(1);
    expect(createdBlobText).toEqual(["11", "11", "11", "11"]);
  });

  it("reuses sheet loading errors for thumbnail loading", async () => {
    await expect(
      createSheetViewerService({
        sheetLibrary: createReader(),
        viewerAdapter: createAdapter()
      }).loadPageThumbnails(" ")
    ).resolves.toMatchObject({
      status: "error",
      code: "missing-sheet-id"
    });

    await expect(
      createSheetViewerService({
        sheetLibrary: createReader({ artifact: null }),
        viewerAdapter: createAdapter()
      }).loadPageThumbnails("sheet-pdf")
    ).resolves.toMatchObject({
      status: "error",
      code: "missing-artifact"
    });
  });

  it("revokes only thumbnail URLs returned by the thumbnail call", async () => {
    const revokedUrls: string[] = [];
    let createdCount = 0;
    const service = createSheetViewerService({
      sheetLibrary: createReader(),
      viewerAdapter: {
        ...createAdapter(),
        createFileUrl() {
          createdCount += 1;

          return `blob:thumbnail-${createdCount}`;
        },
        revokeFileUrl(url) {
          revokedUrls.push(url);
        }
      }
    });
    const result = await service.loadPageThumbnails("sheet-pdf");

    service.revokePageThumbnails(result);

    expect(revokedUrls).toEqual(["blob:thumbnail-1", "blob:thumbnail-2"]);
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

  it("maps thumbnail generation failures to viewer errors", async () => {
    await expect(
      createSheetViewerService({
        sheetLibrary: createReader(),
        viewerAdapter: createAdapter(
          {
            ok: true,
            pageCount: 2,
            imageDimensions: []
          },
          {
            ok: false,
            code: "bad-pdf",
            message: "The saved PDF artifact could not be rendered."
          }
        )
      }).loadPageThumbnails("sheet-pdf")
    ).resolves.toMatchObject({
      status: "error",
      code: "bad-pdf",
      title: "PDF cannot be rendered"
    });
  });

  it("fails thumbnail loading for partial multi-image artifacts instead of returning a subset", async () => {
    const imageSheet: SheetListItem = {
      ...baseSheet,
      id: "sheet-image-partial",
      kind: "image",
      pageCount: 2,
      imageCount: 2,
      imageDimensions: [
        { width: 2, height: 2 },
        { width: 2, height: 2 }
      ],
      originalFileNames: ["page-1.png", "page-2.png"]
    };
    const partialArtifact: SheetArtifact = {
      sheetId: imageSheet.id,
      kind: "image",
      createdAt: "2026-06-21T10:00:00.000Z",
      files: [
        {
          name: "page-1.png",
          mimeType: "image/png",
          sizeBytes: 8,
          pageNumber: 1,
          blob: new Blob(["not-empty"], { type: "image/png" }),
          width: 2,
          height: 2
        },
        {
          name: "page-2.png",
          mimeType: "image/png",
          sizeBytes: 0,
          pageNumber: 2,
          blob: new Blob([], { type: "image/png" }),
          width: 2,
          height: 2
        }
      ]
    };

    await expect(
      createSheetViewerService({
        sheetLibrary: createReader({ sheet: imageSheet, artifact: partialArtifact }),
        viewerAdapter: {
          ...createAdapter({
            ok: true,
            pageCount: 2,
            imageDimensions: imageSheet.imageDimensions
          }),
          generatePageThumbnails: browserSheetViewerAdapter.generatePageThumbnails
        }
      }).loadPageThumbnails(imageSheet.id)
    ).resolves.toMatchObject({
      status: "error",
      code: "missing-artifact"
    });
  });

  it("fails thumbnail loading when a multi-image artifact is missing an expected file", async () => {
    const imageSheet: SheetListItem = {
      ...baseSheet,
      id: "sheet-image-missing-page",
      kind: "image",
      pageCount: 2,
      imageCount: 2,
      imageDimensions: [
        { width: 2, height: 2 },
        { width: 2, height: 2 }
      ],
      originalFileNames: ["page-1.png", "page-2.png"]
    };
    const missingPageArtifact: SheetArtifact = {
      sheetId: imageSheet.id,
      kind: "image",
      createdAt: "2026-06-21T10:00:00.000Z",
      files: [
        {
          name: "page-1.png",
          mimeType: "image/png",
          sizeBytes: 8,
          pageNumber: 1,
          blob: new Blob(["not-empty"], { type: "image/png" }),
          width: 2,
          height: 2
        }
      ]
    };

    await expect(
      createSheetViewerService({
        sheetLibrary: createReader({ sheet: imageSheet, artifact: missingPageArtifact }),
        viewerAdapter: {
          ...createAdapter({
            ok: true,
            pageCount: 1,
            imageDimensions: [imageSheet.imageDimensions[0]]
          }),
          generatePageThumbnails: browserSheetViewerAdapter.generatePageThumbnails
        }
      }).loadPageThumbnails(imageSheet.id)
    ).resolves.toMatchObject({
      status: "error",
      code: "missing-artifact"
    });
  });

  it("formats page labels and clamps zoom by fixed steps", () => {
    expect(formatSheetViewerPageLabel(1, 2)).toBe("Page 1 of 2");
    expect(SHEET_VIEWER_TRANSFORM_LIMITS).toEqual({
      minScale: 0.5,
      maxScale: 2,
      scaleStep: 0.25
    });
    expect(stepSheetViewerZoom(1, "in")).toBe(1.25);
    expect(stepSheetViewerZoom(1, "out")).toBe(0.75);
    expect(stepSheetViewerZoom(Number.NaN, "in")).toBe(1.25);
    expect(stepSheetViewerZoom(Infinity, "out")).toBe(0.75);
    expect(stepSheetViewerZoom(0.5, "out")).toBe(0.5);
    expect(stepSheetViewerZoom(2, "in")).toBe(2);
    expect(clampSheetViewerZoom(0.1)).toBe(0.5);
    expect(clampSheetViewerZoom(3)).toBe(2);
    expect(clampSheetViewerZoom(1.234)).toBe(1.234);
    expect(clampSheetViewerZoom(Number.NaN)).toBe(1);
    expect(clampSheetViewerZoom(Infinity)).toBe(1);
    expect(clampSheetViewerZoom(-Infinity)).toBe(1);
  });

  it("creates and resets sheet viewer transforms with safe defaults", () => {
    const defaultTransform = {
      scale: 1,
      translateX: 0,
      translateY: 0
    };

    expect(createSheetViewerTransform()).toEqual(defaultTransform);
    expect(createSheetViewerTransform({ translateX: 10 })).toEqual({
      scale: 1,
      translateX: 10,
      translateY: 0
    });
    expect(
      createSheetViewerTransform({
        scale: Number.NaN,
        translateX: Infinity,
        translateY: Number.NaN
      })
    ).toEqual(defaultTransform);
    expect(resetSheetViewerTransform()).toEqual(defaultTransform);
    expect(resetSheetViewerTransformForPageChange()).toEqual(defaultTransform);
  });

  it("sets transform scale with rounding, clamping, and omitted-bounds reset behavior", () => {
    const transform = {
      scale: 1,
      translateX: 24,
      translateY: -24
    };

    expect(setSheetViewerTransformScale(transform, 1.236)).toEqual({
      scale: 1.24,
      translateX: 0,
      translateY: 0
    });
    expect(setSheetViewerTransformScale(transform, 0.1).scale).toBe(0.5);
    expect(setSheetViewerTransformScale(transform, 3).scale).toBe(2);
    expect(setSheetViewerTransformScale(transform, Number.NaN).scale).toBe(1);
    expect(setSheetViewerTransformScale(transform, Infinity).scale).toBe(1);
  });

  it("clamps transform translation from viewport and content bounds", () => {
    const bounds = {
      viewport: { width: 100, height: 100 },
      content: { width: 100, height: 100 }
    };

    expect(
      panSheetViewerTransform(
        { scale: 2, translateX: 0, translateY: 0 },
        { x: 25, y: -30 },
        bounds
      )
    ).toEqual({
      scale: 2,
      translateX: 25,
      translateY: -30
    });
    expect(
      panSheetViewerTransform(
        { scale: 2, translateX: 0, translateY: 0 },
        { x: 200, y: -200 },
        bounds
      )
    ).toEqual({
      scale: 2,
      translateX: 50,
      translateY: -50
    });
    expect(
      clampSheetViewerTransform(
        { scale: 2, translateX: 40, translateY: 40 },
        { viewport: { width: 300, height: 100 }, content: { width: 100, height: 100 } }
      )
    ).toEqual({
      scale: 2,
      translateX: 0,
      translateY: 40
    });
  });

  it("resets pan when bounds are omitted or invalid", () => {
    const transform = {
      scale: 3,
      translateX: 10,
      translateY: -10
    };

    expect(clampSheetViewerTransform(transform)).toEqual({
      scale: 2,
      translateX: 0,
      translateY: 0
    });
    expect(panSheetViewerTransform({ scale: 1.234, translateX: 10, translateY: 10 }, { x: 10, y: 10 })).toEqual({
      scale: 1.234,
      translateX: 0,
      translateY: 0
    });
    expect(
      clampSheetViewerTransform(
        { scale: 1.5, translateX: 10, translateY: 10 },
        { viewport: { width: 0, height: 100 }, content: { width: 100, height: 100 } }
      )
    ).toEqual({
      scale: 1.5,
      translateX: 0,
      translateY: 0
    });
    expect(
      clampSheetViewerTransform(
        { scale: 1.5, translateX: 10, translateY: 10 },
        { viewport: { width: 100, height: 100 }, content: { width: Number.NaN, height: 100 } }
      )
    ).toEqual({
      scale: 1.5,
      translateX: 0,
      translateY: 0
    });

    const malformedBounds = [
      { viewport: { width: 100, height: 100 } },
      { content: { width: 100, height: 100 } },
      { viewport: undefined, content: { width: 100, height: 100 } },
      { viewport: { width: 100, height: 100 }, content: undefined }
    ] as unknown as SheetViewerTransformBounds[];

    for (const bounds of malformedBounds) {
      expect(clampSheetViewerTransform(transform, bounds)).toEqual({
        scale: 2,
        translateX: 0,
        translateY: 0
      });
    }
  });

  it("normalizes non-finite translation and pan deltas", () => {
    const bounds = {
      viewport: { width: 100, height: 100 },
      content: { width: 100, height: 100 }
    };

    expect(clampSheetViewerTransform({ scale: 2, translateX: Infinity, translateY: Number.NaN }, bounds)).toEqual({
      scale: 2,
      translateX: 0,
      translateY: 0
    });
    expect(
      panSheetViewerTransform(
        { scale: 2, translateX: 10, translateY: -10 },
        { x: Infinity, y: Number.NaN },
        bounds
      )
    ).toEqual({
      scale: 2,
      translateX: 10,
      translateY: -10
    });
  });

  it("reclamps existing translation when scale changes", () => {
    const bounds = {
      viewport: { width: 100, height: 100 },
      content: { width: 100, height: 100 }
    };

    expect(
      setSheetViewerTransformScale(
        { scale: 2, translateX: 25, translateY: -25 },
        1.5,
        bounds
      )
    ).toEqual({
      scale: 1.5,
      translateX: 25,
      translateY: -25
    });
    expect(
      setSheetViewerTransformScale(
        { scale: 2, translateX: 25, translateY: -25 },
        1,
        bounds
      )
    ).toEqual({
      scale: 1,
      translateX: 0,
      translateY: 0
    });
  });

  it("derives assisted page turn delay from selected segment measure timing", () => {
    const segment = buildPracticeSegment({
      range: {
        startMeasure: 2,
        endMeasure: 3
      }
    });

    expect(getSheetViewerAssistedPageTurnDelayMs(segment)).toBe(5_000);
    expect(getSheetViewerAssistedPageTurnDelayMs(null)).toBeNull();
    expect(getSheetViewerAssistedPageTurnDelayMs(undefined)).toBeNull();
  });

  it("returns null for assisted page turn segments without usable timing", () => {
    expect(
      getSheetViewerAssistedPageTurnDelayMs({
        ...buildPracticeSegment(),
        grid: {
          measureGridVersion: "bad-grid",
          measureGridSnapshot: {
            ...buildMeasureGrid(),
            bpm: Number.NaN
          }
        }
      })
    ).toBeNull();
    expect(
      getSheetViewerAssistedPageTurnDelayMs({
        ...buildPracticeSegment(),
        range: {
          startMeasure: 3,
          endMeasure: 2
        }
      })
    ).toBeNull();
  });
});
