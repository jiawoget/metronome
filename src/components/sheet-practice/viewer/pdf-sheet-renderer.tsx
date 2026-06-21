"use client";

import { Document, Page, pdfjs } from "react-pdf";

import { cn } from "@/lib/utils";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "react-pdf/node_modules/pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

type PdfSheetRendererProps = {
  file: string | Blob;
  pageNumber: number;
  width: number;
  renderError: string | null;
  onRenderReady: (numPages: number) => void;
  onRenderError: (error: Error) => void;
};

export function PdfSheetRenderer({
  file,
  pageNumber,
  width,
  renderError,
  onRenderReady,
  onRenderError
}: PdfSheetRendererProps) {
  return (
    <Document
      file={file}
      loading={<p className="p-5 text-sm text-muted-foreground">Rendering PDF...</p>}
      error={<p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">PDF cannot be rendered.</p>}
      onLoadSuccess={({ numPages }) => onRenderReady(numPages)}
      onLoadError={onRenderError}
      onSourceError={onRenderError}
    >
      <Page
        pageNumber={pageNumber}
        width={width}
        renderAnnotationLayer={false}
        renderTextLayer={false}
        onRenderError={onRenderError}
        canvasBackground="white"
        className={cn("overflow-hidden rounded-md bg-white shadow-soft", renderError && "hidden")}
      />
    </Document>
  );
}
