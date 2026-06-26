import { create } from "zustand";

export type SheetPracticeRecordingWorkflowStatus = "idle" | "recording" | "saving" | "error";

export type SheetPracticeRerecordState = {
  readyRecordingId: string | null;
  error: string | null;
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
  finishRecording: (sheetId: string) => void;
  failRecording: (sheetId: string, error: string) => void;
  setRerecordReady: (sheetId: string, recordingId: string | null) => void;
  failRerecord: (sheetId: string, error: string) => void;
};

export type SheetPracticeRecordingWorkflowStore = SheetPracticeRecordingWorkflowState &
  SheetPracticeRecordingWorkflowActions;

const initialWorkflowState: SheetPracticeRecordingWorkflowState = {
  sheetId: null,
  activeSegmentId: null,
  status: "idle",
  error: null,
  rerecord: {
    readyRecordingId: null,
    error: null
  }
};

function scopedState(sheetId: string, state: SheetPracticeRecordingWorkflowState) {
  return state.sheetId === sheetId
    ? state
    : {
        ...initialWorkflowState,
        sheetId
      };
}

export const useSheetPracticeRecordingWorkflowStore = create<SheetPracticeRecordingWorkflowStore>()(
  (set) => ({
    ...initialWorkflowState,
    resetForSheet: (sheetId) =>
      set({
        ...initialWorkflowState,
        sheetId
      }),
    setActiveSegment: (sheetId, segmentId) =>
      set((state) => ({
        ...scopedState(sheetId, state),
        activeSegmentId: segmentId,
        error: null
      })),
    beginRecording: (sheetId, segmentId) =>
      set((state) => {
        const scoped = scopedState(sheetId, state);

        return {
          ...scoped,
          activeSegmentId: segmentId === undefined ? scoped.activeSegmentId : segmentId,
          status: "recording",
          error: null
        };
      }),
    beginSaving: (sheetId) =>
      set((state) => ({
        ...scopedState(sheetId, state),
        status: "saving",
        error: null
      })),
    finishRecording: (sheetId) =>
      set((state) => ({
        ...scopedState(sheetId, state),
        status: "idle",
        error: null
      })),
    failRecording: (sheetId, error) =>
      set((state) => ({
        ...scopedState(sheetId, state),
        status: "error",
        error
      })),
    setRerecordReady: (sheetId, recordingId) =>
      set((state) => ({
        ...scopedState(sheetId, state),
        rerecord: {
          readyRecordingId: recordingId,
          error: null
        }
      })),
    failRerecord: (sheetId, error) =>
      set((state) => ({
        ...scopedState(sheetId, state),
        rerecord: {
          readyRecordingId: null,
          error
        }
      }))
  })
);

export const selectSheetRecordingWorkflowStatus = (state: SheetPracticeRecordingWorkflowStore) =>
  state.status;

export const selectActiveSheetRecordingSegmentId = (state: SheetPracticeRecordingWorkflowStore) =>
  state.activeSegmentId;
