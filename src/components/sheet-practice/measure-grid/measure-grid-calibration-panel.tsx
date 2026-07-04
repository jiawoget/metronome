"use client";

import { Crosshair, Save } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";

import {
  getTimeSignatureParts,
  validateMeasureGrid,
  type MeasureGrid
} from "@/domain/practice";
import {
  TIME_SIGNATURES,
  isQuickMetronomeTimeSignature
} from "@/lib/quick-metronome/control";
import type {
  MetronomeSettings,
  TimeSignature
} from "@/lib/quick-metronome/types";
import type { MeasureGridService } from "@/services/measure-grid";
import { browserMeasureGridService } from "@/services/measure-grid/browser";
import { Button } from "@/components/ui/button";

const MIN_GRID_BPM = 30;
const MAX_GRID_BPM = 300;

type MeasureGridDraft = {
  bpm: string;
  timeSignature: TimeSignature;
  pickupBeats: string;
  measureOneOffsetMs: string;
};

type DraftValidation = {
  grid: MeasureGrid | null;
  errors: Partial<Record<keyof MeasureGridDraft, string>>;
  hasOffset: boolean;
};

type CalibrationStatus = "Needs calibration" | "Calibrated" | "Unsaved changes";

export type MeasureGridCalibrationPanelProps = {
  sheetId: string;
  defaultBpm: number | null;
  defaultTimeSignature: string | null;
  fallbackSettings: Pick<MetronomeSettings, "bpm" | "timeSignature">;
  currentTimestampMs?: number | null;
  measureGridService?: MeasureGridService;
  onGridSaved?: (grid: MeasureGrid) => void;
};

function isSupportedTimeSignature(
  value: string | null
): value is TimeSignature {
  return isQuickMetronomeTimeSignature(value);
}

function isValidIntegerString(value: string) {
  return /^-?\d+$/.test(value.trim());
}

function parseIntegerDraft(value: string) {
  if (!isValidIntegerString(value)) {
    return null;
  }

  const parsed = Number(value.trim());

  return Number.isSafeInteger(parsed) ? parsed : null;
}

function formatOffset(value: number | null) {
  return value === null ? "Not set" : `${value} ms`;
}

function createDraftFromGrid(grid: MeasureGrid): MeasureGridDraft {
  return {
    bpm: String(grid.bpm),
    timeSignature: grid.timeSignature,
    pickupBeats: String(grid.pickupBeats),
    measureOneOffsetMs: String(grid.measureOneOffsetMs)
  };
}

function createDefaultDraft({
  defaultBpm,
  defaultTimeSignature,
  fallbackSettings
}: Pick<
  MeasureGridCalibrationPanelProps,
  "defaultBpm" | "defaultTimeSignature" | "fallbackSettings"
>): MeasureGridDraft {
  const bpm =
    typeof defaultBpm === "number" &&
    Number.isInteger(defaultBpm) &&
    defaultBpm >= MIN_GRID_BPM &&
    defaultBpm <= MAX_GRID_BPM
      ? defaultBpm
      : fallbackSettings.bpm;
  const timeSignature = isSupportedTimeSignature(defaultTimeSignature)
    ? defaultTimeSignature
    : fallbackSettings.timeSignature;

  return {
    bpm: String(bpm),
    timeSignature,
    pickupBeats: "0",
    measureOneOffsetMs: ""
  };
}

function validateDraft(draft: MeasureGridDraft): DraftValidation {
  const errors: DraftValidation["errors"] = {};
  const bpm = parseIntegerDraft(draft.bpm);
  const pickupBeats = parseIntegerDraft(draft.pickupBeats);
  const measureOneOffsetMs = parseIntegerDraft(draft.measureOneOffsetMs);
  const hasOffset = draft.measureOneOffsetMs.trim().length > 0;
  const { numerator } = getTimeSignatureParts(draft.timeSignature);

  if (bpm === null || bpm < MIN_GRID_BPM || bpm > MAX_GRID_BPM) {
    errors.bpm = "Grid BPM must be an integer from 30 to 300.";
  }

  if (pickupBeats === null || pickupBeats < 0 || pickupBeats >= numerator) {
    errors.pickupBeats = `Pickup beats must be an integer from 0 to ${numerator - 1}.`;
  }

  if (!hasOffset) {
    errors.measureOneOffsetMs =
      "Set or enter a measure 1 offset before saving.";
  } else if (measureOneOffsetMs === null || measureOneOffsetMs < 0) {
    errors.measureOneOffsetMs =
      "Measure 1 offset must be a non-negative integer in milliseconds.";
  }

  if (!isSupportedTimeSignature(draft.timeSignature)) {
    errors.timeSignature = "Choose a supported grid time signature.";
  }

  if (
    Object.keys(errors).length > 0 ||
    bpm === null ||
    pickupBeats === null ||
    measureOneOffsetMs === null
  ) {
    return { grid: null, errors, hasOffset };
  }

  try {
    return {
      grid: validateMeasureGrid({
        bpm,
        timeSignature: draft.timeSignature,
        pickupBeats,
        measureOneOffsetMs
      }),
      errors,
      hasOffset
    };
  } catch {
    return {
      grid: null,
      errors: {
        ...errors,
        measureOneOffsetMs:
          errors.measureOneOffsetMs ?? "Measure grid values are invalid."
      },
      hasOffset
    };
  }
}

function gridsEqual(left: MeasureGrid | null, right: MeasureGrid | null) {
  if (!left || !right) {
    return left === right;
  }

  return (
    left.bpm === right.bpm &&
    left.timeSignature === right.timeSignature &&
    left.pickupBeats === right.pickupBeats &&
    left.measureOneOffsetMs === right.measureOneOffsetMs
  );
}

function getStatus({
  savedGrid,
  validation
}: {
  savedGrid: MeasureGrid | null;
  validation: DraftValidation;
}): CalibrationStatus {
  if (!savedGrid && !validation.hasOffset) {
    return "Needs calibration";
  }

  if (savedGrid && validation.grid && gridsEqual(savedGrid, validation.grid)) {
    return "Calibrated";
  }

  return "Unsaved changes";
}

function getBadgeClassName(status: CalibrationStatus) {
  if (status === "Calibrated") {
    return "border-primary/40 bg-primary/15 text-foreground";
  }

  if (status === "Unsaved changes") {
    return "border-amber-300 bg-amber-50 text-amber-900";
  }

  return "border-muted-foreground/20 bg-muted text-muted-foreground";
}

export function MeasureGridCalibrationPanel({
  sheetId,
  defaultBpm,
  defaultTimeSignature,
  fallbackSettings,
  currentTimestampMs = null,
  measureGridService = browserMeasureGridService,
  onGridSaved
}: MeasureGridCalibrationPanelProps) {
  const idPrefix = useId();
  const defaultDraft = useMemo(
    () =>
      createDefaultDraft({
        defaultBpm,
        defaultTimeSignature,
        fallbackSettings
      }),
    [defaultBpm, defaultTimeSignature, fallbackSettings]
  );
  const [draft, setDraft] = useState<MeasureGridDraft>(defaultDraft);
  const [savedGrid, setSavedGrid] = useState<MeasureGrid | null>(null);
  const [loadedSheetId, setLoadedSheetId] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [saveState, setSaveState] = useState<"idle" | "saving">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    void measureGridService
      .getGrid(sheetId)
      .then((grid) => {
        if (!isActive) {
          return;
        }

        setSavedGrid(grid);
        setDraft(grid ? createDraftFromGrid(grid) : defaultDraft);
        setLoadedSheetId(sheetId);
        setLoadState("ready");
        setErrorMessage(null);
      })
      .catch((error: unknown) => {
        if (!isActive) {
          return;
        }

        setSavedGrid(null);
        setDraft(defaultDraft);
        setLoadedSheetId(sheetId);
        setLoadState("error");
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Measure grid could not be loaded."
        );
      });

    return () => {
      isActive = false;
    };
  }, [defaultDraft, measureGridService, sheetId]);

  const effectiveLoadState = loadedSheetId === sheetId ? loadState : "loading";
  const effectiveDraft = loadedSheetId === sheetId ? draft : defaultDraft;
  const effectiveSavedGrid = loadedSheetId === sheetId ? savedGrid : null;
  const validation = useMemo(
    () => validateDraft(effectiveDraft),
    [effectiveDraft]
  );
  const status = getStatus({ savedGrid: effectiveSavedGrid, validation });
  const canUseCurrentTimestamp =
    typeof currentTimestampMs === "number" &&
    Number.isFinite(currentTimestampMs) &&
    currentTimestampMs >= 0;
  const canSave =
    effectiveLoadState !== "loading" &&
    saveState !== "saving" &&
    validation.grid !== null;
  const offsetValue =
    validation.grid?.measureOneOffsetMs ??
    parseIntegerDraft(effectiveDraft.measureOneOffsetMs);
  const timestampReasonId = `${idPrefix}-timestamp-reason`;
  const bpmErrorId = `${idPrefix}-bpm-error`;
  const pickupErrorId = `${idPrefix}-pickup-error`;
  const offsetErrorId = `${idPrefix}-offset-error`;

  function updateDraft(nextDraft: Partial<MeasureGridDraft>) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      ...nextDraft
    }));
    setErrorMessage(null);
  }

  async function saveGrid() {
    const nextValidation = validateDraft(effectiveDraft);

    if (!nextValidation.grid) {
      return;
    }

    setSaveState("saving");
    setErrorMessage(null);

    try {
      const nextSavedGrid = await measureGridService.saveGrid(
        sheetId,
        nextValidation.grid
      );

      setSavedGrid(nextSavedGrid);
      setDraft(createDraftFromGrid(nextSavedGrid));
      onGridSaved?.(nextSavedGrid);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Measure grid could not be saved."
      );
    } finally {
      setSaveState("idle");
    }
  }

  return (
    <section
      aria-labelledby="measure-grid-title"
      data-testid="measure-grid-calibration-panel"
      className="border-border bg-background rounded-md border p-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3
            id="measure-grid-title"
            className="text-sm font-semibold tracking-normal"
          >
            Measure grid
          </h3>
          <p className="text-muted-foreground mt-1 text-xs">
            Offset source:{" "}
            {canUseCurrentTimestamp
              ? "current playback timestamp"
              : "manual entry"}
          </p>
        </div>
        <span
          aria-live="polite"
          data-testid="measure-grid-status"
          className={`inline-flex min-w-[8.5rem] justify-center rounded-md border px-2.5 py-1 text-xs font-semibold ${getBadgeClassName(status)}`}
        >
          {effectiveLoadState === "loading" ? "Loading" : status}
        </span>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(7rem,0.7fr)_minmax(9rem,0.9fr)_minmax(7rem,0.65fr)_minmax(9rem,0.9fr)_auto] xl:items-start">
        <div className="min-w-0">
          <label htmlFor={`${idPrefix}-bpm`} className="text-sm font-medium">
            Grid BPM
          </label>
          <input
            id={`${idPrefix}-bpm`}
            aria-label="Grid BPM"
            aria-describedby={validation.errors.bpm ? bpmErrorId : undefined}
            type="number"
            min={MIN_GRID_BPM}
            max={MAX_GRID_BPM}
            step={1}
            value={effectiveDraft.bpm}
            onChange={(event) => updateDraft({ bpm: event.target.value })}
            className="border-border bg-background focus-visible:ring-ring mt-2 h-10 w-full rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
          />
          {validation.errors.bpm ? (
            <p
              id={bpmErrorId}
              role="alert"
              className="text-destructive mt-1 text-xs font-medium"
            >
              {validation.errors.bpm}
            </p>
          ) : null}
        </div>

        <div className="min-w-0">
          <label
            htmlFor={`${idPrefix}-time-signature`}
            className="text-sm font-medium"
          >
            Grid time signature
          </label>
          <select
            id={`${idPrefix}-time-signature`}
            aria-label="Grid time signature"
            value={effectiveDraft.timeSignature}
            onChange={(event) =>
              updateDraft({
                timeSignature: event.target.value as TimeSignature
              })
            }
            className="border-border bg-background focus-visible:ring-ring mt-2 h-10 w-full rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
          >
            {TIME_SIGNATURES.map((timeSignature) => (
              <option key={timeSignature} value={timeSignature}>
                {timeSignature}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-0">
          <label htmlFor={`${idPrefix}-pickup`} className="text-sm font-medium">
            Pickup beats
          </label>
          <input
            id={`${idPrefix}-pickup`}
            aria-label="Pickup beats"
            aria-describedby={
              validation.errors.pickupBeats ? pickupErrorId : undefined
            }
            type="number"
            min={0}
            step={1}
            value={effectiveDraft.pickupBeats}
            onChange={(event) =>
              updateDraft({ pickupBeats: event.target.value })
            }
            className="border-border bg-background focus-visible:ring-ring mt-2 h-10 w-full rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
          />
          {validation.errors.pickupBeats ? (
            <p
              id={pickupErrorId}
              role="alert"
              className="text-destructive mt-1 text-xs font-medium"
            >
              {validation.errors.pickupBeats}
            </p>
          ) : null}
        </div>

        <div className="min-w-0">
          <label htmlFor={`${idPrefix}-offset`} className="text-sm font-medium">
            Measure 1 offset
          </label>
          <input
            id={`${idPrefix}-offset`}
            aria-label="Measure 1 offset"
            aria-describedby={
              validation.errors.measureOneOffsetMs ? offsetErrorId : undefined
            }
            type="number"
            min={0}
            step={1}
            placeholder="ms"
            value={effectiveDraft.measureOneOffsetMs}
            onChange={(event) =>
              updateDraft({ measureOneOffsetMs: event.target.value })
            }
            className="border-border bg-background focus-visible:ring-ring mt-2 h-10 w-full rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
          />
          <p className="text-muted-foreground mt-1 text-xs">
            Current: {formatOffset(offsetValue)}
          </p>
          {validation.errors.measureOneOffsetMs ? (
            <p
              id={offsetErrorId}
              role="alert"
              className="text-destructive mt-1 text-xs font-medium"
            >
              {validation.errors.measureOneOffsetMs}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2 md:grid-cols-2 xl:min-w-[17rem] xl:grid-cols-1">
          <Button
            type="button"
            variant="secondary"
            disabled={!canUseCurrentTimestamp}
            aria-describedby={
              !canUseCurrentTimestamp ? timestampReasonId : undefined
            }
            onClick={() => {
              if (canUseCurrentTimestamp) {
                updateDraft({
                  measureOneOffsetMs: String(Math.round(currentTimestampMs))
                });
              }
            }}
          >
            <Crosshair className="h-4 w-4" aria-hidden="true" />
            Set measure 1 here
          </Button>
          <Button
            type="button"
            disabled={!canSave}
            onClick={() => void saveGrid()}
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            {saveState === "saving" ? "Saving..." : "Save grid"}
          </Button>
        </div>
      </div>

      {!canUseCurrentTimestamp ? (
        <p
          id={timestampReasonId}
          className="text-muted-foreground mt-2 text-xs"
        >
          No playback timestamp available.
        </p>
      ) : null}
      {effectiveLoadState === "error" && errorMessage ? (
        <p role="alert" className="text-destructive mt-2 text-sm font-medium">
          {errorMessage}
        </p>
      ) : null}
      {effectiveLoadState !== "error" && errorMessage ? (
        <p role="alert" className="text-destructive mt-2 text-sm font-medium">
          {errorMessage}
        </p>
      ) : null}
    </section>
  );
}
