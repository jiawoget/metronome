"use client";

import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import {
  createPracticeSegmentGridAssociation,
  getPracticeSegmentGridStatus,
  type MeasureGrid,
  type PracticeSegment,
  type PracticeSegmentGridStatus
} from "@/domain/practice";
import type { PracticeSegmentService } from "@/services/practice-segments";
import { browserPracticeSegmentService } from "@/services/practice-segments/browser";
import type { MeasureGridService } from "@/services/measure-grid";
import { browserMeasureGridService } from "@/services/measure-grid/browser";
import { useSheetPracticeRecordingWorkflowStore } from "@/stores/sheet-practice-recording-workflow-store";
import { Button } from "@/components/ui/button";

export type PracticeSegmentSelection = {
  sheetId: string;
  segment: PracticeSegment | null;
};

export type PracticeSegmentSelectorPanelProps = {
  sheetId: string;
  initialSegmentId?: string | null;
  practiceSegmentService?: PracticeSegmentService;
  measureGridService?: MeasureGridService;
  measureGridRevision?: number;
  onSelectedSegmentChange?: (selection: PracticeSegmentSelection) => void;
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

type SegmentEditorState =
  | {
      mode: "create";
      segmentId: null;
      draft: SegmentDraft;
    }
  | {
      mode: "edit";
      segmentId: string;
      draft: SegmentDraft;
    };

type SegmentDraft = {
  name: string;
  startMeasure: string;
  endMeasure: string;
  targetBpm: string;
  notes: string;
};

type SegmentDraftValidation = {
  segmentFields: {
    name: string;
    range: {
      startMeasure: number;
      endMeasure: number;
    };
    targetBpm: number | null;
    notes: string | null;
  } | null;
  errors: Partial<Record<keyof SegmentDraft | "range", string>>;
};

const EMPTY_DRAFT: SegmentDraft = {
  name: "",
  startMeasure: "",
  endMeasure: "",
  targetBpm: "",
  notes: ""
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

function isValidIntegerString(value: string) {
  return /^\d+$/.test(value.trim());
}

function parsePositiveIntegerDraft(value: string) {
  if (!isValidIntegerString(value)) {
    return null;
  }

  const parsed = Number(value.trim());

  return Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : null;
}

function parseOptionalTargetBpmDraft(value: string) {
  if (value.trim().length === 0) {
    return null;
  }

  if (!isValidIntegerString(value)) {
    return Number.NaN;
  }

  const parsed = Number(value.trim());

  return Number.isSafeInteger(parsed) ? parsed : Number.NaN;
}

function createDraftFromSegment(segment: PracticeSegment): SegmentDraft {
  return {
    name: segment.name,
    startMeasure: String(segment.range.startMeasure),
    endMeasure: String(segment.range.endMeasure),
    targetBpm: segment.targetBpm === null ? "" : String(segment.targetBpm),
    notes: segment.notes ?? ""
  };
}

function validateSegmentDraft(draft: SegmentDraft): SegmentDraftValidation {
  const errors: SegmentDraftValidation["errors"] = {};
  const name = draft.name.trim();
  const startMeasure = parsePositiveIntegerDraft(draft.startMeasure);
  const endMeasure = parsePositiveIntegerDraft(draft.endMeasure);
  const targetBpm = parseOptionalTargetBpmDraft(draft.targetBpm);
  const notes = draft.notes.trim();

  if (name.length === 0) {
    errors.name = "Segment name is required.";
  } else if (name.length > 80) {
    errors.name = "Segment name must be 80 characters or fewer.";
  }

  if (startMeasure === null || endMeasure === null) {
    errors.range = "Measures must be whole numbers starting at 1.";
  } else if (endMeasure < startMeasure) {
    errors.range = "End measure must be greater than or equal to start measure.";
  }

  if (
    Number.isNaN(targetBpm) ||
    (targetBpm !== null && (targetBpm < 30 || targetBpm > 300))
  ) {
    errors.targetBpm = "Target BPM must be an integer from 30 to 300.";
  }

  if (notes.length > 1000) {
    errors.notes = "Notes must be 1000 characters or fewer.";
  }

  if (Object.keys(errors).length > 0 || startMeasure === null || endMeasure === null || Number.isNaN(targetBpm)) {
    return {
      segmentFields: null,
      errors
    };
  }

  return {
    segmentFields: {
      name,
      range: {
        startMeasure,
        endMeasure
      },
      targetBpm,
      notes: notes.length === 0 ? null : notes
    },
    errors
  };
}

function createSegmentId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `segment_${crypto.randomUUID()}`;
  }

  return `segment_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function getUnknownErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim().length > 0 ? error.message : fallback;
}

function normalizeOptionalSegmentId(value: string | null | undefined) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

export function PracticeSegmentSelectorPanel({
  sheetId,
  initialSegmentId = null,
  practiceSegmentService = browserPracticeSegmentService,
  measureGridService = browserMeasureGridService,
  measureGridRevision = 0,
  onSelectedSegmentChange
}: PracticeSegmentSelectorPanelProps) {
  const idPrefix = useId();
  const resetRecordingWorkflowForSheet = useSheetPracticeRecordingWorkflowStore(
    (state) => state.resetForSheet
  );
  const setActiveRecordingSegment = useSheetPracticeRecordingWorkflowStore(
    (state) => state.setActiveSegment
  );
  const invalidateRerecordSource = useSheetPracticeRecordingWorkflowStore(
    (state) => state.invalidateRerecordSource
  );
  const currentSheetIdRef = useRef(sheetId);
  const appliedInitialSegmentKeyRef = useRef<string | null>(null);
  const normalizedInitialSegmentId = useMemo(
    () => normalizeOptionalSegmentId(initialSegmentId),
    [initialSegmentId]
  );
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
  const [editor, setEditor] = useState<SegmentEditorState | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [mutationState, setMutationState] = useState<"idle" | "saving" | "deleting">("idle");
  const [mutationErrorMessage, setMutationErrorMessage] = useState<string | null>(null);
  const [returnSegmentMessage, setReturnSegmentMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    currentSheetIdRef.current = sheetId;
    resetRecordingWorkflowForSheet(sheetId);
    queueMicrotask(() => {
      if (!isActive || currentSheetIdRef.current !== sheetId) {
        return;
      }

      setEditor(null);
      setConfirmingDeleteId(null);
      setMutationState("idle");
      setMutationErrorMessage(null);
      setReturnSegmentMessage(null);
    });

    return () => {
      isActive = false;
    };
  }, [resetRecordingWorkflowForSheet, sheetId]);

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
      const initialSegmentKey = normalizedInitialSegmentId
        ? `${sheetId}:${normalizedInitialSegmentId}`
        : null;
      let initialSegmentSelection: SelectedSegmentKey | null | undefined;

      if (
        segmentResult.status === "fulfilled" &&
        initialSegmentKey &&
        appliedInitialSegmentKeyRef.current !== initialSegmentKey
      ) {
        const targetSegment = nextSegments.find(
          (segment) => segment.id === normalizedInitialSegmentId
        );

        appliedInitialSegmentKeyRef.current = initialSegmentKey;

        if (targetSegment?.sheetId === sheetId) {
          setActiveRecordingSegment(sheetId, targetSegment.id);
          setReturnSegmentMessage(null);
          initialSegmentSelection = {
            sheetId,
            segmentId: targetSegment.id
          };
        } else {
          setActiveRecordingSegment(sheetId, null);
          invalidateRerecordSource(
            sheetId,
            targetSegment ? "sheet-mismatch" : "source-segment-missing"
          );
          setReturnSegmentMessage(
            "Saved segment is no longer available. Sheet practice is ready without a selected segment."
          );
          initialSegmentSelection = null;
        }
      } else if (!initialSegmentKey) {
        appliedInitialSegmentKeyRef.current = null;
        setReturnSegmentMessage(null);
      }

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
        if (initialSegmentSelection !== undefined) {
          return initialSegmentSelection;
        }

        if (currentSelection?.sheetId !== sheetId) {
          return null;
        }

        if (nextSegments.some((segment) => segment.id === currentSelection.segmentId)) {
          return currentSelection;
        }

        setActiveRecordingSegment(sheetId, null);
        invalidateRerecordSource(sheetId, "source-segment-missing");
        if (currentSelection.segmentId === normalizedInitialSegmentId) {
          setReturnSegmentMessage(
            "Saved segment is no longer available. Sheet practice is ready without a selected segment."
          );
        }

        return null;
      });
    });

    return () => {
      isActive = false;
    };
  }, [
    invalidateRerecordSource,
    measureGridRevision,
    measureGridService,
    normalizedInitialSegmentId,
    practiceSegmentService,
    setActiveRecordingSegment,
    sheetId
  ]);

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
  const selectedSegmentForNotification =
    effectiveLoadState === "ready" && selectedSegment?.sheetId === sheetId
      ? selectedSegment
      : null;
  const hasCurrentGrid = effectiveLoadState === "ready" && effectiveGridLoadState === "ready" && effectiveGrid !== null;
  const isMutating = mutationState !== "idle";
  const canOpenCreate = effectiveLoadState === "ready" && hasCurrentGrid && !isMutating;
  const canEdit = hasCurrentGrid && !isMutating;
  const canDelete = effectiveLoadState === "ready" && !isMutating;
  const disabledCreateReasonId = `${idPrefix}-create-disabled-reason`;
  const editorNameErrorId = `${idPrefix}-segment-name-error`;
  const editorRangeErrorId = `${idPrefix}-segment-range-error`;
  const editorTargetBpmErrorId = `${idPrefix}-segment-target-bpm-error`;
  const editorNotesErrorId = `${idPrefix}-segment-notes-error`;
  const editorValidation = useMemo(
    () => (editor ? validateSegmentDraft(editor.draft) : null),
    [editor]
  );
  const canSaveEditor =
    editor !== null &&
    mutationState === "idle" &&
    hasCurrentGrid &&
    editorValidation?.segmentFields !== null;

  useEffect(() => {
    if (!onSelectedSegmentChange || currentSheetIdRef.current !== sheetId) {
      return;
    }

    onSelectedSegmentChange({
      sheetId,
      segment: selectedSegmentForNotification
    });
  }, [
    effectiveLoadState,
    effectiveSegments.length,
    isLoadedSheet,
    onSelectedSegmentChange,
    selectedSegmentForNotification,
    sheetId
  ]);

  async function refreshSegmentListAfterMutation(targetSheetId: string) {
    const nextSegments = await practiceSegmentService.listSegments(targetSheetId);

    if (currentSheetIdRef.current !== targetSheetId) {
      return nextSegments;
    }

    setLoadResult((currentResult) => {
      if (currentResult.sheetId !== targetSheetId) {
        return currentResult;
      }

      return {
        ...currentResult,
        segments: nextSegments,
        loadState: "ready",
        errorMessage: null
      };
    });
    setSelectedSegmentKey((currentSelection) => {
      if (currentSelection?.sheetId !== targetSheetId) {
        return null;
      }

      if (nextSegments.some((segment) => segment.id === currentSelection.segmentId)) {
        return currentSelection;
      }

      setActiveRecordingSegment(targetSheetId, null);
      invalidateRerecordSource(targetSheetId, "source-segment-missing");

      return null;
    });

    return nextSegments;
  }

  function updateEditorDraft(nextDraft: Partial<SegmentDraft>) {
    setEditor((currentEditor) =>
      currentEditor
        ? {
            ...currentEditor,
            draft: {
              ...currentEditor.draft,
              ...nextDraft
            }
          }
        : currentEditor
    );
    setMutationErrorMessage(null);
  }

  function openCreateEditor() {
    if (!canOpenCreate) {
      return;
    }

    setEditor({
      mode: "create",
      segmentId: null,
      draft: EMPTY_DRAFT
    });
    setConfirmingDeleteId(null);
    setMutationErrorMessage(null);
  }

  function openEditEditor(segment: PracticeSegment) {
    if (!canEdit) {
      return;
    }

    setEditor({
      mode: "edit",
      segmentId: segment.id,
      draft: createDraftFromSegment(segment)
    });
    setConfirmingDeleteId(null);
    setMutationErrorMessage(null);
  }

  async function saveEditor() {
    if (!editor || mutationState !== "idle" || !editorValidation?.segmentFields) {
      return;
    }

    if (!effectiveGrid || effectiveGridLoadState !== "ready") {
      setMutationErrorMessage("Save a measure grid before creating segments.");
      return;
    }

    const targetSheetId = sheetId;
    const targetSegmentId = editor.mode === "edit" ? editor.segmentId : createSegmentId();
    const shouldSelectCreatedSegment = editor.mode === "create";

    setMutationState("saving");
    setMutationErrorMessage(null);

    try {
      if (editor.mode === "edit") {
        const existingSegment = await practiceSegmentService.getSegment(targetSheetId, editor.segmentId);

        if (existingSegment === null) {
          await refreshSegmentListAfterMutation(targetSheetId);
          if (currentSheetIdRef.current === targetSheetId) {
            setEditor(null);
            setMutationErrorMessage("Segment no longer exists.");
          }
          return;
        }
      }

      const savedSegment = await practiceSegmentService.saveSegment({
        id: targetSegmentId,
        sheetId: targetSheetId,
        ...editorValidation.segmentFields,
        grid: createPracticeSegmentGridAssociation(effectiveGrid)
      });
      const nextSegments = await refreshSegmentListAfterMutation(targetSheetId);

      if (currentSheetIdRef.current !== targetSheetId) {
        return;
      }

      setEditor(null);
      if (shouldSelectCreatedSegment) {
        setSelectedSegmentKey({
          sheetId: targetSheetId,
          segmentId: savedSegment.id
        });
        setReturnSegmentMessage(null);
        setActiveRecordingSegment(targetSheetId, savedSegment.id);
      } else if (!nextSegments.some((segment) => segment.id === savedSegment.id)) {
        setSelectedSegmentKey((currentSelection) => {
          if (currentSelection?.sheetId === targetSheetId && currentSelection.segmentId === savedSegment.id) {
            setActiveRecordingSegment(targetSheetId, null);
            invalidateRerecordSource(targetSheetId, "source-segment-missing");

            return null;
          }

          return currentSelection;
        });
      }
    } catch (error) {
      if (currentSheetIdRef.current === targetSheetId) {
        setMutationErrorMessage(getUnknownErrorMessage(error, "Segment could not be saved."));
      }
    } finally {
      if (currentSheetIdRef.current === targetSheetId) {
        setMutationState("idle");
      }
    }
  }

  async function deleteSegment(segment: PracticeSegment) {
    const targetSheetId = sheetId;

    setMutationState("deleting");
    setMutationErrorMessage(null);

    try {
      await practiceSegmentService.deleteSegment(targetSheetId, segment.id);
      await refreshSegmentListAfterMutation(targetSheetId);

      if (currentSheetIdRef.current !== targetSheetId) {
        return;
      }

      setConfirmingDeleteId(null);
      setEditor((currentEditor) =>
        currentEditor?.mode === "edit" && currentEditor.segmentId === segment.id ? null : currentEditor
      );
      setSelectedSegmentKey((currentSelection) => {
        if (currentSelection?.sheetId === targetSheetId && currentSelection.segmentId === segment.id) {
          setActiveRecordingSegment(targetSheetId, null);
          invalidateRerecordSource(targetSheetId, "source-segment-missing");

          return null;
        }

        return currentSelection;
      });
    } catch (error) {
      if (currentSheetIdRef.current === targetSheetId) {
        setMutationErrorMessage(getUnknownErrorMessage(error, "Segment could not be deleted."));
      }
    } finally {
      if (currentSheetIdRef.current === targetSheetId) {
        setMutationState("idle");
      }
    }
  }

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
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={!canOpenCreate}
          aria-describedby={!canOpenCreate && effectiveLoadState !== "error" ? disabledCreateReasonId : undefined}
          onClick={openCreateEditor}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          New segment
        </Button>
        {effectiveLoadState === "ready" && !hasCurrentGrid ? (
          <p id={disabledCreateReasonId} className="text-muted-foreground text-xs">
            Save a measure grid before creating segments.
          </p>
        ) : null}
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

      {mutationErrorMessage ? (
        <p role="alert" data-testid="practice-segment-mutation-error" className="text-destructive mt-3 text-sm font-medium">
          {mutationErrorMessage}
        </p>
      ) : null}

      {returnSegmentMessage ? (
        <p
          role="status"
          data-testid="practice-segment-return-status"
          className="text-muted-foreground mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium"
        >
          {returnSegmentMessage}
        </p>
      ) : null}

      {editor ? (
        <form
          data-testid="practice-segment-editor"
          className="border-border bg-card mt-3 grid gap-3 rounded-md border p-3"
          onSubmit={(event) => {
            event.preventDefault();
            void saveEditor();
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">
              {editor.mode === "create" ? "New segment" : "Edit segment"}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Cancel segment edit"
              onClick={() => {
                setEditor(null);
                setMutationErrorMessage(null);
              }}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="min-w-0 md:col-span-2">
              <label htmlFor={`${idPrefix}-segment-name`} className="text-sm font-medium">
                Name
              </label>
              <input
                id={`${idPrefix}-segment-name`}
                aria-label="Segment name"
                aria-describedby={editorValidation?.errors.name ? editorNameErrorId : undefined}
                value={editor.draft.name}
                maxLength={120}
                onChange={(event) => updateEditorDraft({ name: event.target.value })}
                className="border-border bg-background focus-visible:ring-ring mt-2 h-10 w-full rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
              />
              {editorValidation?.errors.name ? (
                <p id={editorNameErrorId} role="alert" className="text-destructive mt-1 text-xs font-medium">
                  {editorValidation.errors.name}
                </p>
              ) : null}
            </div>

            <div className="min-w-0">
              <label htmlFor={`${idPrefix}-segment-start`} className="text-sm font-medium">
                Start measure
              </label>
              <input
                id={`${idPrefix}-segment-start`}
                aria-label="Start measure"
                aria-describedby={editorValidation?.errors.range ? editorRangeErrorId : undefined}
                type="number"
                min={1}
                step={1}
                value={editor.draft.startMeasure}
                onChange={(event) => updateEditorDraft({ startMeasure: event.target.value })}
                className="border-border bg-background focus-visible:ring-ring mt-2 h-10 w-full rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
              />
            </div>

            <div className="min-w-0">
              <label htmlFor={`${idPrefix}-segment-end`} className="text-sm font-medium">
                End measure
              </label>
              <input
                id={`${idPrefix}-segment-end`}
                aria-label="End measure"
                aria-describedby={editorValidation?.errors.range ? editorRangeErrorId : undefined}
                type="number"
                min={1}
                step={1}
                value={editor.draft.endMeasure}
                onChange={(event) => updateEditorDraft({ endMeasure: event.target.value })}
                className="border-border bg-background focus-visible:ring-ring mt-2 h-10 w-full rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
              />
            </div>
            {editorValidation?.errors.range ? (
              <p id={editorRangeErrorId} role="alert" className="text-destructive -mt-2 text-xs font-medium md:col-span-2">
                {editorValidation.errors.range}
              </p>
            ) : null}

            <div className="min-w-0">
              <label htmlFor={`${idPrefix}-segment-target-bpm`} className="text-sm font-medium">
                Target BPM
              </label>
              <input
                id={`${idPrefix}-segment-target-bpm`}
                aria-label="Target BPM"
                aria-describedby={editorValidation?.errors.targetBpm ? editorTargetBpmErrorId : undefined}
                type="number"
                min={30}
                max={300}
                step={1}
                value={editor.draft.targetBpm}
                onChange={(event) => updateEditorDraft({ targetBpm: event.target.value })}
                className="border-border bg-background focus-visible:ring-ring mt-2 h-10 w-full rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
              />
              {editorValidation?.errors.targetBpm ? (
                <p id={editorTargetBpmErrorId} role="alert" className="text-destructive mt-1 text-xs font-medium">
                  {editorValidation.errors.targetBpm}
                </p>
              ) : null}
            </div>

            <div className="min-w-0 md:col-span-2">
              <label htmlFor={`${idPrefix}-segment-notes`} className="text-sm font-medium">
                Notes
              </label>
              <textarea
                id={`${idPrefix}-segment-notes`}
                aria-label="Segment notes"
                aria-describedby={editorValidation?.errors.notes ? editorNotesErrorId : undefined}
                value={editor.draft.notes}
                rows={3}
                onChange={(event) => updateEditorDraft({ notes: event.target.value })}
                className="border-border bg-background focus-visible:ring-ring mt-2 w-full resize-y rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
              />
              {editorValidation?.errors.notes ? (
                <p id={editorNotesErrorId} role="alert" className="text-destructive mt-1 text-xs font-medium">
                  {editorValidation.errors.notes}
                </p>
              ) : null}
            </div>
          </div>

          {!hasCurrentGrid ? (
            <p role="alert" className="text-destructive text-sm font-medium">
              Save a measure grid before creating segments.
            </p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setEditor(null);
                setMutationErrorMessage(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSaveEditor}>
              <Save className="h-4 w-4" aria-hidden="true" />
              {mutationState === "saving" ? "Saving..." : "Save segment"}
            </Button>
          </div>
        </form>
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
              const isConfirmingDelete = confirmingDeleteId === segment.id;

              return (
                <div
                  key={segment.id}
                  className={`border-border focus-visible:ring-ring grid w-full min-w-0 gap-2 rounded-md border p-3 text-left text-sm transition focus-visible:ring-2 focus-visible:outline-none ${
                    selected ? "bg-primary/10 ring-primary/30 ring-1" : "bg-card hover:bg-muted/60"
                  }`}
                >
                  <button
                    type="button"
                    aria-pressed={selected}
                    data-testid={`practice-segment-row-${segment.id}`}
                    onClick={() => {
                      setSelectedSegmentKey({ sheetId, segmentId: segment.id });
                      setReturnSegmentMessage(null);
                      setActiveRecordingSegment(sheetId, segment.id);
                    }}
                    className="focus-visible:ring-ring min-w-0 rounded-sm text-left focus-visible:ring-2 focus-visible:outline-none"
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
                    <span className="text-muted-foreground mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                      <span>{formatMeasureRange(segment)}</span>
                      <span>{formatTargetBpm(segment)}</span>
                    </span>
                  </button>

                  <div className="flex flex-wrap items-center gap-2">
                    {isConfirmingDelete ? (
                      <>
                        <span className="text-muted-foreground min-w-0 flex-1 text-xs">
                          Delete {segment.name} ({formatMeasureRange(segment)})?
                        </span>
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={mutationState === "deleting"}
                          onClick={() => setConfirmingDeleteId(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          disabled={mutationState === "deleting"}
                          onClick={() => void deleteSegment(segment)}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                          {mutationState === "deleting" ? "Deleting..." : `Confirm delete ${segment.name}`}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={!canEdit}
                          onClick={() => openEditEditor(segment)}
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                          Edit {segment.name}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={!canDelete}
                          onClick={() => {
                            setConfirmingDeleteId(segment.id);
                            setMutationErrorMessage(null);
                          }}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                          Delete {segment.name}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
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
