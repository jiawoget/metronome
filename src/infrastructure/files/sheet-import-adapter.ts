import type { SheetArtifactFile } from "@/domain/sheet";
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

async function readPdfPageCount(file: File) {
  const pdfjs = await import("pdfjs-dist/legacy/webpack.mjs");
  const data = new Uint8Array(await file.arrayBuffer());
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

async function decodeImage(file: File) {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);

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
    const url = URL.createObjectURL(file);

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
  }
};
