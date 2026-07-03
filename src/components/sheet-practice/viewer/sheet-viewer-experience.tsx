"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  FileImage,
  FileText,
  Images,
  Minus,
  Plus,
  RotateCcw,
  TimerReset,
  X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { SheetArtifactFile } from "@/domain/sheet";
import type { PracticeSegment } from "@/domain/practice";
import type { PointerEvent } from "react";
import { SheetPracticeControls } from "@/components/sheet-practice/controls/sheet-practice-controls";
import { ReferencePanel } from "@/components/sheet-practice/reference/reference-panel";
import { SheetPageJump } from "@/components/sheet-practice/viewer/sheet-page-jump";
import { SheetPageThumbnails } from "@/components/sheet-practice/viewer/sheet-page-thumbnails";
import { browserSheetViewerService } from "@/infrastructure/sheet-viewer/browser-sheet-viewer-service";
import { useBrowserSheetViewerObjectUrls } from "@/infrastructure/sheet-viewer/use-browser-sheet-viewer-object-urls";
import { useBrowserSheetViewerPageThumbnails } from "@/infrastructure/sheet-viewer/use-browser-sheet-viewer-page-thumbnails";
import {
  clampSheetViewerTransform,
  formatSheetViewerPageLabel,
  getSheetViewerAssistedPageTurnDelayMs,
  panSheetViewerTransform,
  resetSheetViewerTransform,
  resetSheetViewerTransformForPageChange,
  setSheetViewerTransformScale,
  stepSheetViewerZoom,
  type SheetViewerLoadState,
  type SheetViewerTransform,
  type SheetViewerTransformBounds
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

const PDF_BASE_WIDTH = 760;

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

function isSameTransform(first: SheetViewerTransform, second: SheetViewerTransform) {
  return (
    first.scale === second.scale &&
    first.translateX === second.translateX &&
    first.translateY === second.translateY
  );
}

function hasMeasuredPanOverflow(bounds: SheetViewerTransformBounds | undefined, scale: number) {
  if (!bounds || scale <= 1) {
    return false;
  }

  return (
    bounds.content.width * scale > bounds.viewport.width ||
    bounds.content.height * scale > bounds.viewport.height
  );
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
  onJumpToPage,
  onZoomOut,
  onZoomIn,
  onResetZoom,
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
  onJumpToPage: (pageNumber: number) => void;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onResetZoom: () => void;
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
        <SheetPageJump currentPage={currentPage} totalPages={totalPages} onJumpToPage={onJumpToPage} />
        <span className="min-w-20 text-center text-sm font-medium" aria-label="Zoom level">
          {Math.round(zoom * 100)}%
        </span>
        <Button type="button" variant="secondary" size="icon" aria-label="Zoom out" onClick={onZoomOut}>
          <Minus className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button type="button" variant="secondary" size="icon" aria-label="Zoom in" onClick={onZoomIn}>
          <Plus className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button type="button" variant="secondary" size="icon" aria-label="Reset zoom" onClick={onResetZoom}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button asChild variant="ghost">
          <Link href="/sheet-library">Library</Link>
        </Button>
      </div>
    </div>
  );
}

function formatAssistedPageTurnDelay(delayMs: number | null) {
  if (delayMs === null) {
    return null;
  }

  return delayMs >= 1000
    ? `${Math.round(delayMs / 1000)}s`
    : `${Math.round(delayMs)}ms`;
}

function SheetAssistedPageTurnControl({
  enabled,
  armed,
  delayMs,
  unavailableMessage,
  onEnabledChange,
  onArm,
  onCancel
}: {
  enabled: boolean;
  armed: boolean;
  delayMs: number | null;
  unavailableMessage: string | null;
  onEnabledChange: (enabled: boolean) => void;
  onArm: () => void;
  onCancel: () => void;
}) {
  const delayLabel = formatAssistedPageTurnDelay(delayMs);
  const statusMessage = armed
    ? "Assisted page turn armed."
    : enabled
      ? unavailableMessage ?? (delayLabel ? `Ready: ${delayLabel}.` : "Ready.")
      : "Manual segment timer";

  return (
    <div className="border-b border-border bg-card px-4 py-2">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label className="flex items-center gap-2 font-medium">
          <input
            type="checkbox"
            className="h-4 w-4 accent-primary"
            checked={enabled}
            onChange={(event) => onEnabledChange(event.currentTarget.checked)}
          />
          Assisted page turning
        </label>
        <Button
          type="button"
          variant={armed ? "ghost" : "secondary"}
          className="h-8 px-3 text-xs"
          disabled={!armed && (!enabled || unavailableMessage !== null)}
          onClick={armed ? onCancel : onArm}
        >
          {armed ? (
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <TimerReset className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {armed ? "Cancel assisted page turn" : "Arm assisted page turn"}
        </Button>
        <span role="status" className="text-muted-foreground text-xs">
          {statusMessage}
        </span>
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
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const transformContentRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const assistedPageTurnTimeoutRef = useRef<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [transform, setTransform] = useState(() => resetSheetViewerTransform());
  const [canPan, setCanPan] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [thumbnailsOpen, setThumbnailsOpen] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [assistedPageTurnEnabled, setAssistedPageTurnEnabled] = useState(false);
  const [assistedPageTurnSegment, setAssistedPageTurnSegment] =
    useState<PracticeSegment | null>(null);
  const [armedAssistedPageTurnSegmentId, setArmedAssistedPageTurnSegmentId] =
    useState<string | null>(null);
  const [referencePlaybackTimestampMs, setReferencePlaybackTimestampMs] =
    useState<number | null>(null);
  const totalPages = state.pageCount;
  const activeImageFile = getPageFile(state.artifact.files, currentPage);
  const imageBaseWidth = Math.max(activeImageFile?.width ?? 0, 360);
  const contentBaseWidth = state.sheet.kind === "pdf" ? PDF_BASE_WIDTH : imageBaseWidth;
  const selectedAssistedPageTurnSegment =
    assistedPageTurnSegment?.sheetId === state.sheet.id ? assistedPageTurnSegment : null;
  const assistedPageTurnDelayMs = useMemo(
    () => getSheetViewerAssistedPageTurnDelayMs(selectedAssistedPageTurnSegment),
    [selectedAssistedPageTurnSegment]
  );
  const isAssistedPageTurnArmed = armedAssistedPageTurnSegmentId !== null;

  const pageUrl = useMemo(() => {
    if (!objectUrls) {
      return null;
    }

    if (state.artifact.kind === "pdf") {
      return objectUrls.urls[0] ?? null;
    }

    return objectUrls.urls[currentPage - 1] ?? objectUrls.urls[0] ?? null;
  }, [currentPage, objectUrls, state]);

  const getTransformBounds = useCallback((scale = transform.scale): SheetViewerTransformBounds | undefined => {
    const viewportElement = viewportRef.current;
    const contentElement = transformContentRef.current;

    if (!viewportElement || !contentElement) {
      return undefined;
    }

    const contentRect = contentElement.getBoundingClientRect();
    const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;

    return {
      viewport: {
        width: viewportElement.clientWidth,
        height: viewportElement.clientHeight
      },
      content: {
        width: contentBaseWidth,
        height: contentRect.height / safeScale
      }
    };
  }, [contentBaseWidth, transform.scale]);

  const clampToMeasuredBounds = useCallback(() => {
    const bounds = getTransformBounds();

    setCanPan(hasMeasuredPanOverflow(bounds, transform.scale));
    setTransform((current) => {
      const next = clampSheetViewerTransform(current, bounds);

      return isSameTransform(current, next) ? current : next;
    });
  }, [getTransformBounds, transform.scale]);

  useEffect(() => {
    const viewportElement = viewportRef.current;
    const contentElement = transformContentRef.current;

    const frameId = requestAnimationFrame(() => clampToMeasuredBounds());

    if (!viewportElement || !contentElement || typeof ResizeObserver === "undefined") {
      return () => cancelAnimationFrame(frameId);
    }

    const observer = new ResizeObserver(() => clampToMeasuredBounds());

    observer.observe(viewportElement);
    observer.observe(contentElement);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [clampToMeasuredBounds]);

  useEffect(() => () => {
    dragRef.current = null;
  }, []);

  useEffect(() => () => {
    if (assistedPageTurnTimeoutRef.current !== null) {
      window.clearTimeout(assistedPageTurnTimeoutRef.current);
      assistedPageTurnTimeoutRef.current = null;
    }
  }, []);

  const clearAssistedPageTurn = useCallback(() => {
    if (assistedPageTurnTimeoutRef.current !== null) {
      window.clearTimeout(assistedPageTurnTimeoutRef.current);
      assistedPageTurnTimeoutRef.current = null;
    }

    setArmedAssistedPageTurnSegmentId(null);
  }, []);

  const goToPage = useCallback((pageNumber: number) => {
    clearAssistedPageTurn();
    setCurrentPage(pageNumber);
    setTransform(resetSheetViewerTransformForPageChange());
    setIsDragging(false);
    dragRef.current = null;
  }, [clearAssistedPageTurn]);

  const assistedPageTurnUnavailableMessage = useMemo(() => {
    if (!assistedPageTurnEnabled) {
      return "Enable assisted page turning to arm a manual timer.";
    }

    if (totalPages <= 1) {
      return "Assisted page turning needs a multi-page sheet.";
    }

    if (currentPage >= totalPages) {
      return "Already on the last page.";
    }

    if (!selectedAssistedPageTurnSegment) {
      return "Select a segment to arm a timed page turn.";
    }

    if (assistedPageTurnDelayMs === null) {
      return "Selected segment needs timing before assisted turning.";
    }

    return null;
  }, [
    assistedPageTurnDelayMs,
    assistedPageTurnEnabled,
    currentPage,
    selectedAssistedPageTurnSegment,
    totalPages
  ]);

  const handleAssistedPageTurnEnabledChange = useCallback((enabled: boolean) => {
    setAssistedPageTurnEnabled(enabled);

    if (!enabled) {
      clearAssistedPageTurn();
    }
  }, [clearAssistedPageTurn]);

  const handleAssistedSegmentChange = useCallback((segment: PracticeSegment | null) => {
    clearAssistedPageTurn();
    setAssistedPageTurnSegment(segment);
  }, [clearAssistedPageTurn]);

  function armAssistedPageTurn() {
    if (
      assistedPageTurnUnavailableMessage !== null ||
      !selectedAssistedPageTurnSegment ||
      assistedPageTurnDelayMs === null
    ) {
      return;
    }

    clearAssistedPageTurn();
    setArmedAssistedPageTurnSegmentId(selectedAssistedPageTurnSegment.id);
    assistedPageTurnTimeoutRef.current = window.setTimeout(() => {
      assistedPageTurnTimeoutRef.current = null;
      setArmedAssistedPageTurnSegmentId(null);
      goToPage(Math.min(totalPages, currentPage + 1));
    }, assistedPageTurnDelayMs);
  }

  function updateScale(direction: "in" | "out") {
    setTransform((current) => setSheetViewerTransformScale(
      current,
      stepSheetViewerZoom(current.scale, direction),
      getTransformBounds(current.scale)
    ));
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || event.button !== 0) {
      return;
    }

    const bounds = getTransformBounds(transform.scale);

    if (!hasMeasuredPanOverflow(bounds, transform.scale)) {
      return;
    }

    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
    setIsDragging(true);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const delta = {
      x: event.clientX - drag.x,
      y: event.clientY - drag.y
    };

    dragRef.current = {
      pointerId: drag.pointerId,
      x: event.clientX,
      y: event.clientY
    };
    event.preventDefault();
    setTransform((current) => panSheetViewerTransform(current, delta, getTransformBounds(current.scale)));
  }

  function endPointerDrag(event: PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) {
      return;
    }

    dragRef.current = null;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  if (!pageUrl) {
    return (
      <SheetViewerError
        title="Sheet file unavailable"
        message="The sheet artifact could not be prepared for rendering. Return to Sheet Library and reimport it."
      />
    );
  }

  const pdfWidth = Math.round(PDF_BASE_WIDTH * transform.scale);
  const imageWidth = Math.round(imageBaseWidth * transform.scale);

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
            zoom={transform.scale}
            onPrevious={() => goToPage(Math.max(1, currentPage - 1))}
            onNext={() => goToPage(Math.min(totalPages, currentPage + 1))}
            onJumpToPage={goToPage}
            onZoomOut={() => updateScale("out")}
            onZoomIn={() => updateScale("in")}
            onResetZoom={() => setTransform(resetSheetViewerTransform())}
            thumbnailsOpen={thumbnailsOpen}
            onToggleThumbnails={() => setThumbnailsOpen((open) => !open)}
          />
          <SheetAssistedPageTurnControl
            enabled={assistedPageTurnEnabled}
            armed={isAssistedPageTurnArmed}
            delayMs={assistedPageTurnDelayMs}
            unavailableMessage={assistedPageTurnUnavailableMessage}
            onEnabledChange={handleAssistedPageTurnEnabledChange}
            onArm={armAssistedPageTurn}
            onCancel={clearAssistedPageTurn}
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
                goToPage(pageNumber);
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
              onSelectPage={goToPage}
            />
            <div
              ref={viewportRef}
              data-testid="sheet-viewer-scroll"
              className="min-h-0 overflow-auto bg-muted p-4 md:p-6"
            >
              <div className="mx-auto flex min-h-full w-fit min-w-full items-start justify-center">
                <div
                  ref={transformContentRef}
                  data-testid="sheet-viewer-transform-content"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={endPointerDrag}
                  onPointerCancel={endPointerDrag}
                  onLostPointerCapture={endPointerDrag}
                  style={{
                    cursor: canPan ? (isDragging ? "grabbing" : "grab") : undefined,
                    transform: `translate3d(${transform.translateX}px, ${transform.translateY}px, 0)`
                  }}
                >
                  {state.sheet.kind === "pdf" ? (
                    <PdfSheetRenderer
                      file={state.artifact.files[0]?.blob ?? pageUrl}
                      pageNumber={currentPage}
                      width={pdfWidth}
                      renderError={renderError}
                      onRenderReady={(numPages) => {
                        setRenderError(null);
                        clampToMeasuredBounds();
                        if (numPages > 0 && currentPage > numPages) {
                          goToPage(numPages);
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
                      onLoad={() => {
                        setRenderError(null);
                        clampToMeasuredBounds();
                      }}
                    />
                  )}
                </div>
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
        onSelectedSegmentChange={handleAssistedSegmentChange}
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
