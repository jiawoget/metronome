import { beforeEach, describe, expect, it } from "vitest";

import { useSheetPracticeRecordingWorkflowStore } from "@/stores/sheet-practice-recording-workflow-store";

function resetStore() {
  useSheetPracticeRecordingWorkflowStore.setState({
    sheetId: null,
    activeSegmentId: null,
    status: "idle",
    error: null,
    rerecord: {
      readyRecordingId: null,
      error: null
    }
  });
}

describe("sheet practice recording workflow store", () => {
  beforeEach(() => {
    resetStore();
  });

  it("tracks active segment and lifecycle status for a sheet", () => {
    const store = useSheetPracticeRecordingWorkflowStore.getState();

    store.setActiveSegment("sheet-alpha", "segment-1");
    store.beginRecording("sheet-alpha");

    expect(useSheetPracticeRecordingWorkflowStore.getState()).toMatchObject({
      sheetId: "sheet-alpha",
      activeSegmentId: "segment-1",
      status: "recording",
      error: null
    });

    useSheetPracticeRecordingWorkflowStore.getState().beginSaving("sheet-alpha");
    expect(useSheetPracticeRecordingWorkflowStore.getState().status).toBe("saving");

    useSheetPracticeRecordingWorkflowStore.getState().finishRecording("sheet-alpha");
    expect(useSheetPracticeRecordingWorkflowStore.getState()).toMatchObject({
      sheetId: "sheet-alpha",
      activeSegmentId: "segment-1",
      status: "idle",
      error: null
    });
  });

  it("resets sheet-scoped workflow state when a different sheet is used", () => {
    const store = useSheetPracticeRecordingWorkflowStore.getState();

    store.setActiveSegment("sheet-alpha", "segment-1");
    store.beginRecording("sheet-alpha");
    store.setRerecordReady("sheet-alpha", "recording-1");
    store.beginRecording("sheet-beta", "segment-2");

    expect(useSheetPracticeRecordingWorkflowStore.getState()).toMatchObject({
      sheetId: "sheet-beta",
      activeSegmentId: "segment-2",
      status: "recording",
      error: null,
      rerecord: {
        readyRecordingId: null,
        error: null
      }
    });
  });

  it("records recoverable errors without changing persisted data", () => {
    const store = useSheetPracticeRecordingWorkflowStore.getState();

    store.failRecording("sheet-alpha", "Recording could not be saved.");
    expect(useSheetPracticeRecordingWorkflowStore.getState()).toMatchObject({
      sheetId: "sheet-alpha",
      status: "error",
      error: "Recording could not be saved."
    });

    useSheetPracticeRecordingWorkflowStore.getState().failRerecord("sheet-alpha", "Select a take first.");
    expect(useSheetPracticeRecordingWorkflowStore.getState().rerecord).toEqual({
      readyRecordingId: null,
      error: "Select a take first."
    });
  });
});
