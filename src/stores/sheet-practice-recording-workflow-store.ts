import { create } from "zustand";

import type { SheetRecordingSegmentContext } from "@/domain/practice";

export type SheetPracticeRecordingWorkflowStatus = "idle" | "recording" | "saving" | "error";

export type SheetPracticeRerecordStatus = "unavailable" | "ready" | "invalid" | "error";

export type SheetPracticeRerecordUnavailableReason =
  | "no-source-recording"
  | "no-segment-context"
  | "source-not-sheet"
  | "sheet-mismatch"
  | "selection-changed"
  | "source-recording-missing"
  | "source-segment-missing"
  | "source-segment-invalid"
  | "recording-active";

export type SheetPracticeRerecordSource = {
  recordingId: string;
  sheetId: string;
  segmentContext: SheetRecordingSegmentContext;
};

export type SheetPracticeRerecordState = {
  status: SheetPracticeRerecordStatus;
  source: SheetPracticeRerecordSource | null;
  unavailableReason: SheetPracticeRerecordUnavailableReason | null;
  error: string | null;
};

export type SheetPracticeSavedRecordingForRerecord = {
  id: string;
  type: "quick" | "sheet";
  sheetId: string | null;
  segmentContext?: SheetRecordingSegmentContext | null;
};

export type SheetPracticeRecordingWorkflowState = {
  sheetId: string | null;
  activeSegmentId: string | null;
  status: SheetPracticeRecordingWorkflowStatus;
  error: string | null;
  rerecord: SheetPracticeRerecordState;
};

export type SheetPracticeRecordingWorkflowActions = {
  resetForSheet: (sheetId: string) => void;
  setActiveSegment: (sheetId: string, segmentId: string | null) => void;
  beginRecording: (sheetId: string, segmentId?: string | null) => void;
  beginSaving: (sheetId: string) => void;
  finishRecording: (
    sheetId: string,
    recording?: SheetPracticeSavedRecordingForRerecord | null
  ) => void;
  failRecording: (sheetId: string, error: string) => void;
  cancelRecording: (sheetId: string) => void;
  setRerecordReady: (sheetId: string, source: SheetPracticeRerecordSource) => void;
  clearRerecordSource: (
    sheetId: string,
    reason?: SheetPracticeRerecordUnavailableReason
  ) => void;
  invalidateRerecordSource: (
    sheetId: string,
    reason: SheetPracticeRerecordUnavailableReason
  ) => void;
  failRerecord: (sheetId: string, error: string) => void;
};

export type SheetPracticeRecordingWorkflowStore = SheetPracticeRecordingWorkflowState &
  SheetPracticeRecordingWorkflowActions;

const initialRerecordState: SheetPracticeRerecordState = {
  status: "unavailable",
  source: null,
  unavailableReason: "no-source-recording",
  error: null
};

export const initialSheetPracticeRecordingWorkflowState: SheetPracticeRecordingWorkflowState = {
  sheetId: null,
  activeSegmentId: null,
  status: "idle",
  error: null,
  rerecord: initialRerecordState
};

function scopedState(sheetId: string, state: SheetPracticeRecordingWorkflowState) {
  return state.sheetId === sheetId
    ? state
    : {
        ...initialSheetPracticeRecordingWorkflowState,
        sheetId
      };
}

function createUnavailableRerecordState(
  reason: SheetPracticeRerecordUnavailableReason = "no-source-recording"
): SheetPracticeRerecordState {
  return {
    status: "unavailable",
    source: null,
    unavailableReason: reason,
    error: null
  };
}

function createInvalidRerecordState(
  reason: SheetPracticeRerecordUnavailableReason
): SheetPracticeRerecordState {
  return {
    status: "invalid",
    source: null,
    unavailableReason: reason,
    error: null
  };
}

function createReadyRerecordState(source: SheetPracticeRerecordSource): SheetPracticeRerecordState {
  return {
    status: "ready",
    source,
    unavailableReason: null,
    error: null
  };
}

function createErrorRerecordState(error: string): SheetPracticeRerecordState {
  return {
    status: "error",
    source: null,
    unavailableReason: null,
    error
  };
}

function isInvalidationReason(reason: SheetPracticeRerecordUnavailableReason) {
  return (
    reason === "selection-changed" ||
    reason === "source-not-sheet" ||
    reason === "sheet-mismatch" ||
    reason === "source-recording-missing" ||
    reason === "source-segment-missing" ||
    reason === "source-segment-invalid"
  );
}

function clearRerecordForReason(reason: SheetPracticeRerecordUnavailableReason) {
  return isInvalidationReason(reason)
    ? createInvalidRerecordState(reason)
    : createUnavailableRerecordState(reason);
}

function getRerecordStateAfterSegmentChange(
  rerecord: SheetPracticeRerecordState,
  segmentId: string | null
) {
  if (segmentId === null) {
    return rerecord.source
      ? createInvalidRerecordState("selection-changed")
      : createUnavailableRerecordState("no-source-recording");
  }

  if (rerecord.source && rerecord.source.segmentContext.segmentId !== segmentId) {
    return createInvalidRerecordState("selection-changed");
  }

  return rerecord;
}

function getRerecordStateFromSavedRecording(
  sheetId: string,
  recording?: SheetPracticeSavedRecordingForRerecord | null
) {
  if (!recording) {
    return createUnavailableRerecordState("no-source-recording");
  }

  if (recording.type !== "sheet") {
    return createInvalidRerecordState("source-not-sheet");
  }

  if (recording.sheetId !== sheetId) {
    return createInvalidRerecordState("sheet-mismatch");
  }

  if (!recording.segmentContext) {
    return createUnavailableRerecordState("no-segment-context");
  }

  return createReadyRerecordState({
    recordingId: recording.id,
    sheetId,
    segmentContext: recording.segmentContext
  });
}

export const useSheetPracticeRecordingWorkflowStore = create<SheetPracticeRecordingWorkflowStore>()(
  (set) => ({
    ...initialSheetPracticeRecordingWorkflowState,
    resetForSheet: (sheetId) =>
      set({
        ...initialSheetPracticeRecordingWorkflowState,
        sheetId
      }),
    setActiveSegment: (sheetId, segmentId) =>
      set((state) => {
        const scoped = scopedState(sheetId, state);

        return {
          ...scoped,
          activeSegmentId: segmentId,
          error: null,
          rerecord: getRerecordStateAfterSegmentChange(scoped.rerecord, segmentId)
        };
      }),
    beginRecording: (sheetId, segmentId) =>
      set((state) => {
        const scoped = scopedState(sheetId, state);

        return {
          ...scoped,
          activeSegmentId: segmentId === undefined ? scoped.activeSegmentId : segmentId,
          status: "recording",
          error: null,
          rerecord: createUnavailableRerecordState("recording-active")
        };
      }),
    beginSaving: (sheetId) =>
      set((state) => ({
        ...scopedState(sheetId, state),
        status: "saving",
        error: null
      })),
    finishRecording: (sheetId, recording) =>
      set((state) => {
        const scoped = scopedState(sheetId, state);

        return {
          ...scoped,
          status: "idle",
          error: null,
          rerecord: getRerecordStateFromSavedRecording(sheetId, recording)
        };
      }),
    failRecording: (sheetId, error) =>
      set((state) => {
        const scoped = scopedState(sheetId, state);

        return {
          ...scoped,
          status: "error",
          error,
          rerecord:
            scoped.rerecord.status === "invalid"
              ? scoped.rerecord
              : createUnavailableRerecordState("no-source-recording")
        };
      }),
    cancelRecording: (sheetId) =>
      set((state) => ({
        ...scopedState(sheetId, state),
        status: "idle",
        error: null,
        rerecord: createUnavailableRerecordState("no-source-recording")
      })),
    setRerecordReady: (sheetId, source) =>
      set((state) => ({
        ...scopedState(sheetId, state),
        rerecord: createReadyRerecordState(source)
      })),
    clearRerecordSource: (sheetId, reason = "no-source-recording") =>
      set((state) => ({
        ...scopedState(sheetId, state),
        rerecord: createUnavailableRerecordState(reason)
      })),
    invalidateRerecordSource: (sheetId, reason) =>
      set((state) => ({
        ...scopedState(sheetId, state),
        rerecord: clearRerecordForReason(reason)
      })),
    failRerecord: (sheetId, error) =>
      set((state) => ({
        ...scopedState(sheetId, state),
        rerecord: createErrorRerecordState(error)
      }))
  })
);

export const selectSheetRecordingWorkflowStatus = (state: SheetPracticeRecordingWorkflowStore) =>
  state.status;

export const selectActiveSheetRecordingSegmentId = (state: SheetPracticeRecordingWorkflowStore) =>
  state.activeSegmentId;

export const selectSheetPracticeRerecordState = (state: SheetPracticeRecordingWorkflowStore) =>
  state.rerecord;

export const selectSheetPracticeRerecordSource = (state: SheetPracticeRecordingWorkflowStore) =>
  state.rerecord.source;
