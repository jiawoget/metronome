"use client";

import { useEffect, useMemo, useState } from "react";

import {
  getPracticeSegmentGridStatus,
  type MeasureGrid,
  type PracticeSegment,
  type PracticeSegmentGridStatus
} from "@/domain/practice";
import { browserPracticeSegmentService } from "@/infrastructure/db/browser-practice-segment-service";
import { browserMeasureGridService } from "@/infrastructure/db/browser-measure-grid-service";
import type { PracticeSegmentService } from "@/services/practice-segments";
import type { MeasureGridService } from "@/services/measure-grid";

export type PracticeSegmentSelectorPanelProps = {
  sheetId: string;
  practiceSegmentService?: PracticeSegmentService;
  measureGridService?: MeasureGridService;
};

type LoadState = "loading" | "ready" | "error";
type GridLoadState = "loading" | "ready" | "error";

const EMPTY_SEGMENTS: PracticeSegment[] = [];

type SegmentSelectorLoadResult = {
  sheetId: string | null;
  segments: PracticeSegment[];
  currentGrid: MeasureGrid | null;
  loadState: LoadState;
  gridLoadState: GridLoadState;
  errorMessage: string | null;
  gridErrorMessage: string | null;
};

type SelectedSegmentKey = {
  sheetId: string;
  segmentId: string;
};

function formatMeasureRange(segment: PracticeSegment) {
  return segment.range.startMeasure === segment.range.endMeasure
    ? `Measure ${segment.range.startMeasure}`
    : `Measures ${segment.range.startMeasure}-${segment.range.endMeasure}`;
}

function formatTargetBpm(segment: PracticeSegment) {
  return segment.targetBpm === null ? "No target BPM" : `Target ${segment.targetBpm} BPM`;
}

function getStatusLabel(status: PracticeSegmentGridStatus) {
  switch (status) {
    case "current":
      return "Ready";
    case "missing-grid":
      return "Needs calibration";
    case "stale":
      return "Grid changed";
    case "invalid-association":
      return "Needs review";
  }
}

function getStatusClassName(status: PracticeSegmentGridStatus, selected: boolean) {
  if (selected && status === "current") {
    return "border-primary/40 bg-primary/15 text-foreground";
  }

  if (status === "current") {
    return "border-emerald-300 bg-emerald-50 text-emerald-900";
  }

  if (status === "stale") {
    return "border-amber-300 bg-amber-50 text-amber-900";
  }

  if (status === "invalid-association") {
    return "border-destructive/30 bg-destructive/10 text-destructive";
  }

  return "border-muted-foreground/20 bg-muted text-muted-foreground";
}

function getSegmentStatus(segment: PracticeSegment, currentGrid: MeasureGrid | null, gridLoadState: GridLoadState) {
  if (gridLoadState === "loading") {
    return "missing-grid";
  }

  return getPracticeSegmentGridStatus(segment, currentGrid);
}

export function PracticeSegmentSelectorPanel({
  sheetId,
  practiceSegmentService = browserPracticeSegmentService,
  measureGridService = browserMeasureGridService
}: PracticeSegmentSelectorPanelProps) {
  const [loadResult, setLoadResult] = useState<SegmentSelectorLoadResult>({
    sheetId: null,
    segments: EMPTY_SEGMENTS,
    currentGrid: null,
    loadState: "loading",
    gridLoadState: "loading",
    errorMessage: null,
    gridErrorMessage: null
  });
  const [selectedSegmentKey, setSelectedSegmentKey] = useState<SelectedSegmentKey | null>(null);

  useEffect(() => {
    let isActive = true;

    void Promise.allSettled([
      practiceSegmentService.listSegments(sheetId),
      measureGridService.getGrid(sheetId)
    ]).then(([segmentResult, gridResult]) => {
      if (!isActive) {
        return;
      }

      const nextSegments = segmentResult.status === "fulfilled" ? segmentResult.value : EMPTY_SEGMENTS;

      setLoadResult({
        sheetId,
        segments: nextSegments,
        currentGrid: gridResult.status === "fulfilled" ? gridResult.value : null,
        loadState: segmentResult.status === "fulfilled" ? "ready" : "error",
        gridLoadState: gridResult.status === "fulfilled" ? "ready" : "error",
        errorMessage:
          segmentResult.status === "rejected"
            ? segmentResult.reason instanceof Error
              ? segmentResult.reason.message
              : "Practice segments could not be loaded."
            : null,
        gridErrorMessage:
          gridResult.status === "rejected"
            ? gridResult.reason instanceof Error
              ? gridResult.reason.message
              : "Measure grid status could not be loaded."
            : null
      });

      setSelectedSegmentKey((currentSelection) => {
        if (currentSelection?.sheetId !== sheetId) {
          return null;
        }

        return nextSegments.some((segment) => segment.id === currentSelection.segmentId)
          ? currentSelection
          : null;
      });
    });

    return () => {
      isActive = false;
    };
  }, [measureGridService, practiceSegmentService, sheetId]);

  const isLoadedSheet = loadResult.sheetId === sheetId;
  const effectiveLoadState = isLoadedSheet ? loadResult.loadState : "loading";
  const effectiveGridLoadState = isLoadedSheet ? loadResult.gridLoadState : "loading";
  const effectiveSegments = isLoadedSheet ? loadResult.segments : EMPTY_SEGMENTS;
  const effectiveGrid = isLoadedSheet ? loadResult.currentGrid : null;
  const errorMessage = isLoadedSheet ? loadResult.errorMessage : null;
  const gridErrorMessage = isLoadedSheet ? loadResult.gridErrorMessage : null;
  const selectedSegmentId = selectedSegmentKey?.sheetId === sheetId ? selectedSegmentKey.segmentId : null;
  const selectedSegment = useMemo(
    () => effectiveSegments.find((segment) => segment.id === selectedSegmentId) ?? null,
    [effectiveSegments, selectedSegmentId]
  );

  return (
    <section
      aria-labelledby="practice-segment-selector-title"
      data-testid="practice-segment-selector-panel"
      className="border-border bg-background rounded-md border p-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 id="practice-segment-selector-title" className="text-sm font-semibold tracking-normal">
            Practice segments
          </h3>
          <p className="text-muted-foreground mt-1 text-xs">Saved ranges for this sheet.</p>
        </div>
        <span
          aria-live="polite"
          data-testid="practice-segment-selector-status"
          className="border-muted-foreground/20 bg-muted text-muted-foreground inline-flex min-w-[8.5rem] justify-center rounded-md border px-2.5 py-1 text-xs font-semibold"
        >
          {effectiveLoadState === "loading"
            ? "Loading"
            : effectiveLoadState === "error"
              ? "Unavailable"
              : `${effectiveSegments.length} saved`}
        </span>
      </div>

      {effectiveLoadState === "error" ? (
        <p role="alert" className="text-destructive mt-3 text-sm font-medium">
          {errorMessage ?? "Practice segments could not be loaded."}
        </p>
      ) : null}

      {effectiveLoadState !== "error" && effectiveGridLoadState === "error" ? (
        <p role="status" className="text-muted-foreground mt-3 text-xs">
          {gridErrorMessage ?? "Measure grid status could not be loaded."} Segment timing is marked needs
          calibration.
        </p>
      ) : null}

      {effectiveLoadState === "ready" && effectiveSegments.length === 0 ? (
        <div data-testid="practice-segment-empty-state" className="mt-3 rounded-md border border-dashed p-3">
          <p className="text-sm font-medium">No saved segments yet.</p>
          <p className="text-muted-foreground mt-1 text-xs">Sheet Practice is ready without a selected segment.</p>
        </div>
      ) : null}

      {effectiveLoadState === "ready" && effectiveSegments.length > 0 ? (
        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(13rem,0.8fr)]">
          <div role="list" aria-label="Saved practice segments" className="grid gap-2">
            {effectiveSegments.map((segment) => {
              const selected = selectedSegmentId === segment.id;
              const status = getSegmentStatus(segment, effectiveGrid, effectiveGridLoadState);

              return (
                <button
                  key={segment.id}
                  type="button"
                  aria-pressed={selected}
                  data-testid={`practice-segment-row-${segment.id}`}
                  onClick={() => setSelectedSegmentKey({ sheetId, segmentId: segment.id })}
                  className={`border-border focus-visible:ring-ring grid w-full min-w-0 gap-2 rounded-md border p-3 text-left text-sm transition focus-visible:ring-2 focus-visible:outline-none ${
                    selected ? "bg-primary/10 ring-primary/30 ring-1" : "bg-card hover:bg-muted/60"
                  }`}
                >
                  <span className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="min-w-0 break-words font-semibold">{segment.name}</span>
                    {selected ? (
                      <span className="border-primary/40 bg-primary/15 inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold text-foreground">
                        Active
                      </span>
                    ) : null}
                    <span
                      data-testid={`practice-segment-status-${segment.id}`}
                      className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${getStatusClassName(status, selected)}`}
                    >
                      {getStatusLabel(status)}
                    </span>
                  </span>
                  <span className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 text-xs">
                    <span>{formatMeasureRange(segment)}</span>
                    <span>{formatTargetBpm(segment)}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div
            data-testid="practice-segment-active-summary"
            className="border-border bg-card min-w-0 rounded-md border p-3"
          >
            {selectedSegment ? (
              <>
                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-normal">Active segment</p>
                <p className="mt-2 break-words text-sm font-semibold">{selectedSegment.name}</p>
                <div className="text-muted-foreground mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                  <span>{formatMeasureRange(selectedSegment)}</span>
                  <span>{formatTargetBpm(selectedSegment)}</span>
                </div>
                <span
                  data-testid="practice-segment-active-status"
                  className={`mt-3 inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${getStatusClassName(
                    getSegmentStatus(selectedSegment, effectiveGrid, effectiveGridLoadState),
                    true
                  )}`}
                >
                  {getStatusLabel(getSegmentStatus(selectedSegment, effectiveGrid, effectiveGridLoadState))}
                </span>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold">Choose a segment</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Select one saved range to make it active for this practice view.
                </p>
              </>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
