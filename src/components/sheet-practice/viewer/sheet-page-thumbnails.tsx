"use client";

import type { SheetViewerPageThumbnailState } from "@/services/sheet-viewer/browser-hooks";
import { cn } from "@/lib/utils";

type SheetPageThumbnailsProps = {
  state: SheetViewerPageThumbnailState;
  sheetName: string;
  currentPage: number;
  totalPages: number;
  onSelectPage: (pageNumber: number) => void;
  className?: string;
  orientation?: "vertical" | "horizontal";
};

export function SheetPageThumbnails({
  state,
  sheetName,
  currentPage,
  totalPages,
  onSelectPage,
  className,
  orientation = "vertical"
}: SheetPageThumbnailsProps) {
  const listClassName =
    orientation === "horizontal"
      ? "flex gap-2 overflow-x-auto pb-1"
      : "flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1";

  return (
    <nav
      aria-label="Page thumbnails"
      className={cn("min-h-0 border-border bg-card/80 p-3", className)}
    >
      {state.status === "idle" || state.status === "loading" ? (
        <p role="status" className="text-sm text-muted-foreground">
          Loading thumbnails...
        </p>
      ) : null}

      {state.status === "error" ? (
        <p role="alert" className="text-sm text-destructive">
          Thumbnails unavailable
        </p>
      ) : null}

      {state.status === "ready" ? (
        <ThumbnailButtons
          state={state}
          sheetName={sheetName}
          currentPage={currentPage}
          totalPages={totalPages}
          onSelectPage={onSelectPage}
          listClassName={listClassName}
        />
      ) : null}
    </nav>
  );
}

function ThumbnailButtons({
  state,
  sheetName,
  currentPage,
  totalPages,
  onSelectPage,
  listClassName
}: {
  state: Extract<SheetViewerPageThumbnailState, { status: "ready" }>;
  sheetName: string;
  currentPage: number;
  totalPages: number;
  onSelectPage: (pageNumber: number) => void;
  listClassName: string;
}) {
  const thumbnails = state.thumbnails.filter(
    (thumbnail) => thumbnail.pageNumber >= 1 && thumbnail.pageNumber <= totalPages
  );

  if (thumbnails.length === 0) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        No thumbnails available
      </p>
    );
  }

  return (
    <div className={listClassName}>
      {thumbnails.map((thumbnail) => {
        const isCurrent = thumbnail.pageNumber === currentPage;

        return (
          <button
            key={`${thumbnail.sheetId}-${thumbnail.pageNumber}`}
            type="button"
            aria-label={`Go to page ${thumbnail.pageNumber}`}
            aria-current={isCurrent ? "page" : undefined}
            onClick={() => onSelectPage(Math.min(totalPages, Math.max(1, thumbnail.pageNumber)))}
            className={cn(
              "flex w-28 shrink-0 flex-col items-stretch gap-1 rounded-md border bg-white p-1.5 text-left text-xs font-medium text-foreground shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring",
              isCurrent ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/60"
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbnail.url}
              alt={`${sheetName} page ${thumbnail.pageNumber} thumbnail`}
              width={thumbnail.width}
              height={thumbnail.height}
              className="h-32 w-full rounded-sm border border-border bg-white object-contain"
            />
            <span className="truncate text-center">Page {thumbnail.pageNumber}</span>
          </button>
        );
      })}
    </div>
  );
}
