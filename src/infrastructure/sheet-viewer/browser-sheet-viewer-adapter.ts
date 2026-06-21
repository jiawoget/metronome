"use client";

import type { ImportedSheet, SheetArtifact, SheetImageDimensions } from "@/domain/sheet";
import type { SheetViewerAdapter, SheetViewerInspection } from "@/services/sheet-viewer";

async function readPdfPageCount(blob: Blob) {
  const pdfjs = await import("pdfjs-dist/legacy/webpack.mjs");
  const data = new Uint8Array(await blob.arrayBuffer());
  const loadingTask = pdfjs.getDocument({
    data,
    disableFontFace: true,
    useSystemFonts: false
  } as Parameters<typeof pdfjs.getDocument>[0]);
  const document = await loadingTask.promise;

  try {
    return document.numPages;
  } finally {
    await loadingTask.destroy();
  }
}

async function decodeImage(blob: Blob): Promise<SheetImageDimensions> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(blob);

    try {
      return {
        width: bitmap.width,
        height: bitmap.height
      };
    } finally {
      bitmap.close();
    }
  }

  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(blob);

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight
      });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image decode failed."));
    };
    image.src = url;
  });
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

  createFileUrl(blob) {
    return URL.createObjectURL(blob);
  },

  revokeFileUrl(url) {
    URL.revokeObjectURL(url);
  }
};
