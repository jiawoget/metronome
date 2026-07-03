"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { AlertTriangle, ChevronLeft, ChevronRight, FileImage, FileText, Images, Minus, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { SheetArtifactFile } from "@/domain/sheet";
import { SheetPracticeControls } from "@/components/sheet-practice/controls/sheet-practice-controls";
import { ReferencePanel } from "@/components/sheet-practice/reference/reference-panel";
import { SheetPageThumbnails } from "@/components/sheet-practice/viewer/sheet-page-thumbnails";
import { browserSheetViewerService } from "@/infrastructure/sheet-viewer/browser-sheet-viewer-service";
import { useBrowserSheetViewerObjectUrls } from "@/infrastructure/sheet-viewer/use-browser-sheet-viewer-object-urls";
import { useBrowserSheetViewerPageThumbnails } from "@/infrastructure/sheet-viewer/use-browser-sheet-viewer-page-thumbnails";
import {
  formatSheetViewerPageLabel,
  stepSheetViewerZoom,
  type SheetViewerLoadState
} from "@/services/sheet-viewer";
import { Button } from "@/components/ui/button";

const PdfSheetRenderer = dynamic(
  () => import("@/components/sheet-practice/viewer/pdf-sheet-renderer").then((module) => module.PdfSheetRenderer),
  {
    ssr: false,
    loading: () => <p className="p-5 text-sm text-muted-foreground">Preparing PDF renderer...</p>
  }
);

type SheetViewerExperienceProps = {
  sheetId: string | null;
  sourceRecordingId?: string | null;
  returnSegmentId?: string | null;
};

function useSheetViewer(sheetId: string | null) {
  const [state, setState] = useState<{
    sheetId: string | null;
    value: SheetViewerLoadState;
  } | null>(null);

  useEffect(() => {
    let isActive = true;

    void browserSheetViewerService.loadSheet(sheetId).then((nextState) => {
      if (isActive) {
        setState({
          sheetId,
          value: nextState
        });
      }
    });

    return () => {
      isActive = false;
    };
  }, [sheetId]);

  if (state?.sheetId !== sheetId) {
    return { status: "loading" } as const;
  }

  return state.value;
}

function getPageFile(files: SheetArtifactFile[], pageNumber: number) {
  return files.find((file) => file.pageNumber === pageNumber) ?? files[pageNumber - 1] ?? files[0] ?? null;
}

function SheetViewerError({ title, message }: { title: string; message: string }) {
  return (
    <section
      aria-labelledby="sheet-viewer-error-title"
      className="mx-auto flex w-full max-w-4xl flex-col gap-4 rounded-lg border border-destructive/30 bg-destructive/10 p-5 text-destructive"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div>
          <h1 id="sheet-viewer-error-title" className="text-xl font-semibold tracking-normal">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-6">{message}</p>
        </div>
      </div>
      <Button asChild variant="secondary" className="w-fit">
        <Link href="/sheet-library">Return to Sheet Library</Link>
      </Button>
    </section>
  );
}

function SheetViewerToolbar({
  kind,
  sheetName,
  currentPage,
  totalPages,
  zoom,
  onPrevious,
  onNext,
  onZoomOut,
  onZoomIn,
  thumbnailsOpen,
  onToggleThumbnails
}: {
  kind: "pdf" | "image";
  sheetName: string;
  currentPage: number;
  totalPages: number;
  zoom: number;
  onPrevious: () => void;
  onNext: () => void;
  onZoomOut: () => void;
  onZoomIn: () => void;
  thumbnailsOpen: boolean;
  onToggleThumbnails: () => void;
}) {
  const Icon = kind === "pdf" ? FileText : FileImage;

  return (
    <div className="flex flex-col gap-3 border-b border-border bg-card px-4 py-3 md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold tracking-normal">{sheetName}</h1>
          <p className="text-sm text-muted-foreground">{formatSheetViewerPageLabel(currentPage, totalPages)}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          className="lg:hidden"
          aria-label="Page thumbnails"
          aria-expanded={thumbnailsOpen}
          onClick={onToggleThumbnails}
        >
          <Images className="h-4 w-4" aria-hidden="true" />
          Pages
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label="Previous page"
          disabled={currentPage <= 1}
          onClick={onPrevious}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label="Next page"
          disabled={currentPage >= totalPages}
          onClick={onNext}
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
        <span className="min-w-20 text-center text-sm font-medium" aria-label="Zoom level">
          {Math.round(zoom * 100)}%
        </span>
        <Button type="button" variant="secondary" size="icon" aria-label="Zoom out" onClick={onZoomOut}>
          <Minus className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button type="button" variant="secondary" size="icon" aria-label="Zoom in" onClick={onZoomIn}>
          <Plus className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button asChild variant="ghost">
          <Link href="/sheet-library">Library</Link>
        </Button>
      </div>
    </div>
  );
}

function SheetViewerReady({
  state,
  sourceRecordingId,
  returnSegmentId
}: {
  state: Extract<SheetViewerLoadState, { status: "ready" }>;
  sourceRecordingId: string | null;
  returnSegmentId: string | null;
}) {
  const objectUrls = useBrowserSheetViewerObjectUrls(state);
  const thumbnailState = useBrowserSheetViewerPageThumbnails(state.sheet.id);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [thumbnailsOpen, setThumbnailsOpen] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [referencePlaybackTimestampMs, setReferencePlaybackTimestampMs] =
    useState<number | null>(null);

  const pageUrl = useMemo(() => {
    if (!objectUrls) {
      return null;
    }

    if (state.artifact.kind === "pdf") {
      return objectUrls.urls[0] ?? null;
    }

    return objectUrls.urls[currentPage - 1] ?? objectUrls.urls[0] ?? null;
  }, [currentPage, objectUrls, state]);

  if (!pageUrl) {
    return (
      <SheetViewerError
        title="Sheet file unavailable"
        message="The sheet artifact could not be prepared for rendering. Return to Sheet Library and reimport it."
      />
    );
  }

  const totalPages = state.pageCount;
  const activeImageFile = getPageFile(state.artifact.files, currentPage);
  const imageBaseWidth = Math.max(activeImageFile?.width ?? 0, 360);
  const pdfWidth = Math.round(760 * zoom);
  const imageWidth = Math.round(imageBaseWidth * zoom);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-3">
      <div className="grid gap-3 lg:h-[calc(100vh-18rem)] lg:min-h-[520px] lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section
          aria-labelledby="sheet-viewer-title"
          className="flex min-h-[360px] flex-col overflow-hidden rounded-lg border border-border bg-card shadow-soft"
        >
          <span id="sheet-viewer-title" className="sr-only">
            Sheet viewer
          </span>
          <SheetViewerToolbar
            kind={state.sheet.kind}
            sheetName={state.sheet.name}
            currentPage={currentPage}
            totalPages={totalPages}
            zoom={zoom}
            onPrevious={() => setCurrentPage((page) => Math.max(1, page - 1))}
            onNext={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            onZoomOut={() => setZoom((current) => stepSheetViewerZoom(current, "out"))}
            onZoomIn={() => setZoom((current) => stepSheetViewerZoom(current, "in"))}
            thumbnailsOpen={thumbnailsOpen}
            onToggleThumbnails={() => setThumbnailsOpen((open) => !open)}
          />

          {thumbnailsOpen ? (
            <SheetPageThumbnails
              state={thumbnailState}
              sheetName={state.sheet.name}
              currentPage={currentPage}
              totalPages={totalPages}
              orientation="horizontal"
              className="border-b lg:hidden"
              onSelectPage={(pageNumber) => {
                setCurrentPage(pageNumber);
                setThumbnailsOpen(false);
              }}
            />
          ) : null}

          <div className="grid min-h-0 flex-1 lg:grid-cols-[9rem_minmax(0,1fr)]">
            <SheetPageThumbnails
              state={thumbnailState}
              sheetName={state.sheet.name}
              currentPage={currentPage}
              totalPages={totalPages}
              className="hidden border-r lg:flex lg:flex-col"
              onSelectPage={setCurrentPage}
            />
            <div
              data-testid="sheet-viewer-scroll"
              className="min-h-0 overflow-auto bg-muted p-4 md:p-6"
            >
              <div className="mx-auto flex min-h-full w-fit min-w-full items-start justify-center">
                {state.sheet.kind === "pdf" ? (
                  <PdfSheetRenderer
                    file={state.artifact.files[0]?.blob ?? pageUrl}
                    pageNumber={currentPage}
                    width={pdfWidth}
                    renderError={renderError}
                    onRenderReady={(numPages) => {
                      setRenderError(null);
                      if (numPages > 0 && currentPage > numPages) {
                        setCurrentPage(numPages);
                      }
                    }}
                    onRenderError={(error) => setRenderError(`PDF cannot be rendered: ${error.message}`)}
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={pageUrl}
                    alt={`${state.sheet.name} page ${currentPage}`}
                    width={imageWidth}
                    className="max-w-none rounded-md bg-white shadow-soft [image-rendering:auto]"
                    onError={() => setRenderError("Image cannot be rendered")}
                    onLoad={() => setRenderError(null)}
                  />
                )}
              </div>
              {renderError ? (
                <p role="alert" className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {renderError}. Reimport the sheet from Sheet Library.
                </p>
              ) : null}
            </div>
          </div>
        </section>
        <ReferencePanel
          sheetId={state.sheet.id}
          onPlaybackTimestampChange={setReferencePlaybackTimestampMs}
        />
      </div>
      <SheetPracticeControls
        sheetId={state.sheet.id}
        sheetName={state.sheet.name}
        defaultBpm={state.sheet.bpm}
        defaultTimeSignature={state.sheet.timeSignature}
        sourceRecordingId={sourceRecordingId}
        returnSegmentId={returnSegmentId}
        currentMeasureGridTimestampMs={referencePlaybackTimestampMs}
      />
    </div>
  );
}

export function SheetViewerExperience({
  sheetId,
  sourceRecordingId = null,
  returnSegmentId = null
}: SheetViewerExperienceProps) {
  const state = useSheetViewer(sheetId);

  if (state.status === "loading") {
    return (
      <section aria-label="Sheet viewer loading" className="mx-auto w-full max-w-6xl rounded-lg border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">Loading selected sheet...</p>
      </section>
    );
  }

  if (state.status === "error") {
    return <SheetViewerError title={state.title} message={state.message} />;
  }

  return (
    <SheetViewerReady
      key={state.sheet.id}
      state={state}
      sourceRecordingId={sourceRecordingId}
      returnSegmentId={returnSegmentId}
    />
  );
}
