"use client";

import type { ImportedSheet, SheetArtifact, SheetImageDimensions } from "@/domain/sheet";
import type {
  SheetPageThumbnailBlob,
  SheetViewerAdapter,
  SheetViewerInspection,
  SheetViewerThumbnailGeneration
} from "@/services/sheet-viewer";

async function loadPdfDocument(blob: Blob) {
  const pdfjs = await import("pdfjs-dist");

  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const data = new Uint8Array(await blob.arrayBuffer());
  const loadingTask = pdfjs.getDocument({
    data,
    disableFontFace: true,
    useSystemFonts: false
  } as Parameters<typeof pdfjs.getDocument>[0]);

  return {
    loadingTask,
    document: await loadingTask.promise
  };
}

async function readPdfPageCount(blob: Blob) {
  const { loadingTask, document: pdfDocument } = await loadPdfDocument(blob);

  try {
    return pdfDocument.numPages;
  } finally {
    await loadingTask.destroy();
  }
}

async function decodeImage(blob: Blob): Promise<SheetImageDimensions> {
  const decoded = await decodeImageSource(blob);

  try {
    return {
      width: decoded.width,
      height: decoded.height
    };
  } finally {
    decoded.close();
  }
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Canvas conversion failed."));
      }
    }, "image/png");
  });
}

function getThumbnailSize(width: number, height: number, maxWidth = 120) {
  const sourceWidth = Math.max(width, 1);
  const sourceHeight = Math.max(height, 1);
  const scale = maxWidth / sourceWidth;

  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale))
  };
}

async function renderPdfThumbnail(
  pdfDocument: Awaited<ReturnType<typeof loadPdfDocument>>["document"],
  pageNumber: number,
  maxWidth: number
): Promise<SheetPageThumbnailBlob> {
  const page = await pdfDocument.getPage(pageNumber);
  const sourceViewport = page.getViewport({ scale: 1 });
  const targetSize = getThumbnailSize(sourceViewport.width, sourceViewport.height, maxWidth);
  const viewport = page.getViewport({ scale: targetSize.width / sourceViewport.width });
  const canvas = globalThis.document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas context unavailable.");
  }

  canvas.width = targetSize.width;
  canvas.height = targetSize.height;

  try {
    await page.render({ canvas, canvasContext: context, viewport }).promise;

    return {
      pageNumber,
      blob: await canvasToBlob(canvas),
      width: targetSize.width,
      height: targetSize.height
    };
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}

async function generatePdfThumbnails(
  artifact: SheetArtifact,
  maxWidth: number
): Promise<SheetViewerThumbnailGeneration> {
  const file = artifact.files[0];

  if (!file || file.blob.size === 0) {
    return {
      ok: false,
      code: "missing-artifact",
      message: "The saved PDF file is empty or unavailable."
    };
  }

  let loadingTask: Awaited<ReturnType<typeof loadPdfDocument>>["loadingTask"] | null = null;

  try {
    const loaded = await loadPdfDocument(file.blob);
    loadingTask = loaded.loadingTask;

    if (loaded.document.numPages < 1) {
      return {
        ok: false,
        code: "bad-pdf",
        message: "The saved PDF has no readable pages."
      };
    }

    const thumbnails: SheetPageThumbnailBlob[] = [];

    for (let pageNumber = 1; pageNumber <= loaded.document.numPages; pageNumber += 1) {
      thumbnails.push(await renderPdfThumbnail(loaded.document, pageNumber, maxWidth));
    }

    return {
      ok: true,
      thumbnails
    };
  } catch {
    return {
      ok: false,
      code: "bad-pdf",
      message: "The saved PDF artifact could not be rendered. Reimport a valid PDF sheet."
    };
  } finally {
    await loadingTask?.destroy();
  }
}

async function decodeImageSource(blob: Blob) {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(blob);

    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      close: () => bitmap.close()
    };
  }

  return new Promise<{
    source: HTMLImageElement;
    width: number;
    height: number;
    close: () => void;
  }>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(blob);

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        source: image,
        width: image.naturalWidth,
        height: image.naturalHeight,
        close: () => {}
      });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image decode failed."));
    };
    image.src = url;
  });
}

async function renderImageThumbnail(
  file: SheetArtifact["files"][number],
  fallbackPageNumber: number,
  maxWidth: number
): Promise<SheetPageThumbnailBlob> {
  const decoded = await decodeImageSource(file.blob);
  const targetSize = getThumbnailSize(decoded.width, decoded.height, maxWidth);
  const canvas = globalThis.document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    decoded.close();
    throw new Error("Canvas context unavailable.");
  }

  canvas.width = targetSize.width;
  canvas.height = targetSize.height;

  try {
    context.drawImage(decoded.source, 0, 0, targetSize.width, targetSize.height);

    return {
      pageNumber: file.pageNumber || fallbackPageNumber,
      blob: await canvasToBlob(canvas),
      width: targetSize.width,
      height: targetSize.height
    };
  } finally {
    decoded.close();
    canvas.width = 0;
    canvas.height = 0;
  }
}

async function generateImageThumbnails(
  sheet: ImportedSheet,
  artifact: SheetArtifact,
  maxWidth: number
): Promise<SheetViewerThumbnailGeneration> {
  const expectedImageCount = sheet.imageCount || sheet.pageCount || artifact.files.length;

  if (
    artifact.files.length === 0 ||
    artifact.files.length !== expectedImageCount ||
    artifact.files.some((file) => file.blob.size === 0)
  ) {
    return {
      ok: false,
      code: "missing-artifact",
      message: "The saved image file is empty or unavailable."
    };
  }

  try {
    const thumbnails = await Promise.all(
      artifact.files.map((file, index) => renderImageThumbnail(file, index + 1, maxWidth))
    );

    return {
      ok: true,
      thumbnails
    };
  } catch {
    return {
      ok: false,
      code: "bad-image",
      message: "The saved image artifact could not be decoded. Reimport a valid PNG or JPG sheet."
    };
  }
}

function missingArtifact(message: string): SheetViewerInspection {
  return {
    ok: false,
    code: "missing-artifact",
    message
  };
}

async function inspectPdf(sheet: ImportedSheet, artifact: SheetArtifact): Promise<SheetViewerInspection> {
  const file = artifact.files[0];

  if (!file || file.blob.size === 0) {
    return missingArtifact("The saved PDF file is empty or unavailable.");
  }

  try {
    const pageCount = await readPdfPageCount(file.blob);

    if (pageCount < 1) {
      return {
        ok: false,
        code: "bad-pdf",
        message: "The saved PDF has no readable pages."
      };
    }

    return {
      ok: true,
      pageCount,
      imageDimensions: []
    };
  } catch {
    return {
      ok: false,
      code: "bad-pdf",
      message: "The saved PDF artifact could not be parsed. Reimport a valid PDF sheet."
    };
  }
}

async function inspectImages(sheet: ImportedSheet, artifact: SheetArtifact): Promise<SheetViewerInspection> {
  const files = artifact.files.filter((file) => file.blob.size > 0);

  if (files.length === 0) {
    return missingArtifact("The saved image file is empty or unavailable.");
  }

  try {
    const dimensions = await Promise.all(files.map((file) => decodeImage(file.blob)));

    return {
      ok: true,
      pageCount: dimensions.length,
      imageDimensions: dimensions
    };
  } catch {
    return {
      ok: false,
      code: "bad-image",
      message: "The saved image artifact could not be decoded. Reimport a valid PNG or JPG sheet."
    };
  }
}

export const browserSheetViewerAdapter: SheetViewerAdapter = {
  inspectArtifact(sheet, artifact) {
    if (artifact.sheetId !== sheet.id || artifact.kind !== sheet.kind) {
      return Promise.resolve({
        ok: false,
        code: "artifact-mismatch",
        message: "The saved artifact metadata does not match the selected sheet."
      });
    }

    if (sheet.kind === "pdf") {
      return inspectPdf(sheet, artifact);
    }

    return inspectImages(sheet, artifact);
  },

  generatePageThumbnails(sheet, artifact, options) {
    if (artifact.sheetId !== sheet.id || artifact.kind !== sheet.kind) {
      return Promise.resolve({
        ok: false,
        code: "artifact-mismatch",
        message: "The saved artifact metadata does not match the selected sheet."
      });
    }

    if (sheet.kind === "pdf") {
      return generatePdfThumbnails(artifact, options?.maxWidth ?? 120);
    }

    return generateImageThumbnails(sheet, artifact, options?.maxWidth ?? 120);
  },

  createFileUrl(blob) {
    return URL.createObjectURL(blob);
  },

  revokeFileUrl(url) {
    URL.revokeObjectURL(url);
  }
};
