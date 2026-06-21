import type { ImportedSheet, SheetArtifact, SheetArtifactFile, SheetArtifactStatus } from "@/domain/sheet";
import type { SheetImportAdapter, SheetImportResult } from "@/services/sheet-library";

const PDF_MIME_TYPES = new Set(["application/pdf"]);
const IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/jpg"]);

function getFileExtension(file: File) {
  return file.name.split(".").pop()?.toLowerCase() ?? "";
}

function isPdf(file: File) {
  return PDF_MIME_TYPES.has(file.type) || getFileExtension(file) === "pdf";
}

function isImage(file: File) {
  const extension = getFileExtension(file);

  return IMAGE_MIME_TYPES.has(file.type) || extension === "png" || extension === "jpg" || extension === "jpeg";
}

function unsupportedResult() {
  return {
    ok: false,
    message: "Unsupported file type. Upload one PDF or one or more PNG/JPG image files."
  } satisfies SheetImportResult;
}

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

async function decodeImage(blob: Blob) {
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

  return new Promise<{ width: number; height: number }>((resolve, reject) => {
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

function toArtifactFile(file: File, index: number, dimensions?: { width: number; height: number }): SheetArtifactFile {
  return {
    name: file.name,
    mimeType: file.type || (isPdf(file) ? "application/pdf" : "image/*"),
    sizeBytes: file.size,
    pageNumber: index + 1,
    blob: file,
    width: dimensions?.width ?? null,
    height: dimensions?.height ?? null
  };
}

function inaccessibleArtifactStatus(): SheetArtifactStatus {
  return {
    readable: false,
    label: "Artifact inaccessible"
  };
}

async function inspectPdfArtifact(sheet: ImportedSheet, artifact: SheetArtifact) {
  const file = artifact.files[0];

  if (!file || file.blob.size === 0) {
    return inaccessibleArtifactStatus();
  }

  try {
    const pageCount = await readPdfPageCount(file.blob);

    if (pageCount !== sheet.pageCount) {
      return {
        readable: false,
        label: "PDF artifact page count mismatch"
      };
    }

    return {
      readable: true,
      label: `PDF artifact parsed: ${pageCount} page${pageCount === 1 ? "" : "s"}`
    };
  } catch {
    return {
      readable: false,
      label: "PDF artifact inaccessible"
    };
  }
}

async function inspectImageArtifact(sheet: ImportedSheet, artifact: SheetArtifact) {
  if (artifact.files.length !== sheet.imageCount || artifact.files.some((file) => file.blob.size === 0)) {
    return inaccessibleArtifactStatus();
  }

  try {
    const dimensions = await Promise.all(artifact.files.map((file) => decodeImage(file.blob)));
    const dimensionsMatch = dimensions.every((dimension, index) => {
      const expected = sheet.imageDimensions[index];

      return !!expected && expected.width === dimension.width && expected.height === dimension.height;
    });

    if (!dimensionsMatch) {
      return {
        readable: false,
        label: "Image artifact dimensions mismatch"
      };
    }

    const firstDimension = dimensions[0];

    return {
      readable: true,
      label: firstDimension
        ? `Image artifact decoded: ${firstDimension.width} x ${firstDimension.height}`
        : "Image artifact decoded"
    };
  } catch {
    return {
      readable: false,
      label: "Image artifact inaccessible"
    };
  }
}

export const browserSheetImportAdapter: SheetImportAdapter = {
  async analyzeFiles(files) {
    if (files.length === 0) {
      return {
        ok: false,
        message: "Choose a PDF or image sheet before saving."
      };
    }

    const pdfFiles = files.filter(isPdf);
    const imageFiles = files.filter(isImage);

    if (pdfFiles.length === 1 && files.length === 1) {
      try {
        const pageCount = await readPdfPageCount(pdfFiles[0]);

        if (pageCount < 1) {
          return {
            ok: false,
            message: "The uploaded PDF has no readable pages."
          };
        }

        return {
          ok: true,
          preview: {
            kind: "pdf",
            pageCount,
            imageCount: 0,
            imageDimensions: [],
            mimeTypes: [pdfFiles[0].type || "application/pdf"],
            sizeBytes: pdfFiles[0].size,
            originalFileNames: [pdfFiles[0].name],
            files: [toArtifactFile(pdfFiles[0], 0)]
          }
        };
      } catch {
        return {
          ok: false,
          message: "The uploaded PDF could not be read. Choose a valid PDF file."
        };
      }
    }

    if (imageFiles.length === files.length) {
      try {
        const dimensions = await Promise.all(imageFiles.map(decodeImage));

        return {
          ok: true,
          preview: {
            kind: "image",
            pageCount: imageFiles.length,
            imageCount: imageFiles.length,
            imageDimensions: dimensions,
            mimeTypes: Array.from(new Set(imageFiles.map((file) => file.type || "image/*"))),
            sizeBytes: imageFiles.reduce((total, file) => total + file.size, 0),
            originalFileNames: imageFiles.map((file) => file.name),
            files: imageFiles.map((file, index) => toArtifactFile(file, index, dimensions[index]))
          }
        };
      } catch {
        return {
          ok: false,
          message: "The uploaded image could not be decoded. Choose a valid PNG or JPG file."
        };
      }
    }

    return unsupportedResult();
  },

  async inspectArtifact(sheet, artifact) {
    if (!artifact || artifact.files.length === 0) {
      return inaccessibleArtifactStatus();
    }

    if (artifact.kind !== sheet.kind || artifact.sheetId !== sheet.id) {
      return {
        readable: false,
        label: "Artifact metadata mismatch"
      };
    }

    if (sheet.kind === "pdf") {
      return inspectPdfArtifact(sheet, artifact);
    }

    return inspectImageArtifact(sheet, artifact);
  }
};
