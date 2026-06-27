import { beforeEach, describe, expect, it } from "vitest";

import type { SheetRecordingSegmentContext } from "@/domain/practice";
import {
  initialSheetPracticeRecordingWorkflowState,
  useSheetPracticeRecordingWorkflowStore
} from "@/stores/sheet-practice-recording-workflow-store";

const segmentContext: SheetRecordingSegmentContext = {
  segmentId: "segment-alpha",
  segmentName: "Opening phrase",
  range: {
    startMeasure: 5,
    endMeasure: 12
  },
  targetBpm: 96,
  measureGridVersion:
    "bpm:96|timeSignature:4/4|pickupBeats:0|measureOneOffsetMs:1000",
  measureGridSnapshot: {
    bpm: 96,
    timeSignature: "4/4",
    pickupBeats: 0,
    measureOneOffsetMs: 1_000
  },
  measureRangeMs: {
    startMs: 11_000,
    endMs: 27_000
  }
};

const laterSegmentContext: SheetRecordingSegmentContext = {
  ...segmentContext,
  segmentId: "segment-beta",
  segmentName: "Bridge",
  range: {
    startMeasure: 13,
    endMeasure: 16
  },
  measureRangeMs: {
    startMs: 27_000,
    endMs: 35_000
  }
};

function resetStore() {
  useSheetPracticeRecordingWorkflowStore.setState({
    ...initialSheetPracticeRecordingWorkflowState,
    rerecord: {
      ...initialSheetPracticeRecordingWorkflowState.rerecord
    }
  });
}

describe("sheet practice recording workflow store", () => {
  beforeEach(() => {
    resetStore();
  });

  it("initializes rerecord state as unavailable without a source", () => {
    expect(useSheetPracticeRecordingWorkflowStore.getState()).toMatchObject({
      sheetId: null,
      activeSegmentId: null,
      status: "idle",
      error: null,
      rerecord: {
        status: "unavailable",
        source: null,
        unavailableReason: "no-source-recording",
        error: null
      }
    });
  });

  it("stores a ready source recording id, sheet id, and immutable segment context", () => {
    const store = useSheetPracticeRecordingWorkflowStore.getState();

    store.setRerecordReady("sheet-alpha", {
      recordingId: "recording-alpha",
      sheetId: "sheet-alpha",
      segmentContext
    });

    expect(useSheetPracticeRecordingWorkflowStore.getState().rerecord).toEqual({
      status: "ready",
      source: {
        recordingId: "recording-alpha",
        sheetId: "sheet-alpha",
        segmentContext
      },
      unavailableReason: null,
      error: null
    });
  });

  it("resets sheet-scoped workflow state when a different sheet is used", () => {
    const store = useSheetPracticeRecordingWorkflowStore.getState();

    store.setActiveSegment("sheet-alpha", "segment-alpha");
    store.setRerecordReady("sheet-alpha", {
      recordingId: "recording-alpha",
      sheetId: "sheet-alpha",
      segmentContext
    });
    store.beginRecording("sheet-beta", "segment-beta");

    expect(useSheetPracticeRecordingWorkflowStore.getState()).toMatchObject({
      sheetId: "sheet-beta",
      activeSegmentId: "segment-beta",
      status: "recording",
      error: null,
      rerecord: {
        status: "unavailable",
        source: null,
        unavailableReason: "recording-active",
        error: null
      }
    });
  });

  it("preserves active segment and marks ready after a segment-linked save finishes", () => {
    const store = useSheetPracticeRecordingWorkflowStore.getState();

    store.setActiveSegment("sheet-alpha", "segment-alpha");
    store.beginRecording("sheet-alpha");
    store.beginSaving("sheet-alpha");
    store.finishRecording("sheet-alpha", {
      id: "recording-alpha",
      type: "sheet",
      sheetId: "sheet-alpha",
      segmentContext
    });

    expect(useSheetPracticeRecordingWorkflowStore.getState()).toMatchObject({
      sheetId: "sheet-alpha",
      activeSegmentId: "segment-alpha",
      status: "idle",
      error: null,
      rerecord: {
        status: "ready",
        source: {
          recordingId: "recording-alpha",
          sheetId: "sheet-alpha",
          segmentContext
        },
        unavailableReason: null,
        error: null
      }
    });
  });

  it("clears rerecord source after a no-segment or legacy save", () => {
    const store = useSheetPracticeRecordingWorkflowStore.getState();

    store.setActiveSegment("sheet-alpha", "segment-alpha");
    store.setRerecordReady("sheet-alpha", {
      recordingId: "recording-alpha",
      sheetId: "sheet-alpha",
      segmentContext
    });
    store.finishRecording("sheet-alpha", {
      id: "recording-legacy",
      type: "sheet",
      sheetId: "sheet-alpha",
      segmentContext: null
    });

    expect(useSheetPracticeRecordingWorkflowStore.getState()).toMatchObject({
      activeSegmentId: "segment-alpha",
      status: "idle",
      rerecord: {
        status: "unavailable",
        source: null,
        unavailableReason: "no-segment-context",
        error: null
      }
    });
  });

  it("does not mark quick or cross-sheet recordings as eligible", () => {
    const store = useSheetPracticeRecordingWorkflowStore.getState();

    store.finishRecording("sheet-alpha", {
      id: "recording-quick",
      type: "quick",
      sheetId: null,
      segmentContext
    });

    expect(useSheetPracticeRecordingWorkflowStore.getState().rerecord).toMatchObject({
      status: "invalid",
      source: null,
      unavailableReason: "source-not-sheet"
    });

    store.finishRecording("sheet-alpha", {
      id: "recording-bravo",
      type: "sheet",
      sheetId: "sheet-bravo",
      segmentContext
    });

    expect(useSheetPracticeRecordingWorkflowStore.getState().rerecord).toMatchObject({
      status: "invalid",
      source: null,
      unavailableReason: "sheet-mismatch"
    });
  });

  it("preserves active segment and clears readiness on recording failure or cancel", () => {
    const store = useSheetPracticeRecordingWorkflowStore.getState();

    store.setActiveSegment("sheet-alpha", "segment-alpha");
    store.setRerecordReady("sheet-alpha", {
      recordingId: "recording-alpha",
      sheetId: "sheet-alpha",
      segmentContext
    });
    store.failRecording("sheet-alpha", "Recording could not be saved.");

    expect(useSheetPracticeRecordingWorkflowStore.getState()).toMatchObject({
      activeSegmentId: "segment-alpha",
      status: "error",
      error: "Recording could not be saved.",
      rerecord: {
        status: "unavailable",
        source: null,
        unavailableReason: "no-source-recording"
      }
    });

    useSheetPracticeRecordingWorkflowStore.getState().cancelRecording("sheet-alpha");

    expect(useSheetPracticeRecordingWorkflowStore.getState()).toMatchObject({
      activeSegmentId: "segment-alpha",
      status: "idle",
      error: null,
      rerecord: {
        status: "unavailable",
        source: null,
        unavailableReason: "no-source-recording"
      }
    });
  });

  it("makes rerecord unavailable while recording is active", () => {
    const store = useSheetPracticeRecordingWorkflowStore.getState();

    store.setActiveSegment("sheet-alpha", "segment-alpha");
    store.setRerecordReady("sheet-alpha", {
      recordingId: "recording-alpha",
      sheetId: "sheet-alpha",
      segmentContext
    });
    store.beginRecording("sheet-alpha");

    expect(useSheetPracticeRecordingWorkflowStore.getState()).toMatchObject({
      activeSegmentId: "segment-alpha",
      status: "recording",
      rerecord: {
        status: "unavailable",
        source: null,
        unavailableReason: "recording-active"
      }
    });
  });

  it("invalidates readiness when selection changes and clears it when selection is removed", () => {
    const store = useSheetPracticeRecordingWorkflowStore.getState();

    store.setActiveSegment("sheet-alpha", "segment-alpha");
    store.setRerecordReady("sheet-alpha", {
      recordingId: "recording-alpha",
      sheetId: "sheet-alpha",
      segmentContext
    });
    store.setActiveSegment("sheet-alpha", "segment-beta");

    expect(useSheetPracticeRecordingWorkflowStore.getState()).toMatchObject({
      activeSegmentId: "segment-beta",
      rerecord: {
        status: "invalid",
        source: null,
        unavailableReason: "selection-changed",
        error: null
      }
    });

    store.setRerecordReady("sheet-alpha", {
      recordingId: "recording-alpha",
      sheetId: "sheet-alpha",
      segmentContext
    });
    store.setActiveSegment("sheet-alpha", null);

    expect(useSheetPracticeRecordingWorkflowStore.getState()).toMatchObject({
      activeSegmentId: null,
      rerecord: {
        status: "invalid",
        source: null,
        unavailableReason: "selection-changed"
      }
    });
  });

  it("keeps ready state when the selected segment still matches the source", () => {
    const store = useSheetPracticeRecordingWorkflowStore.getState();

    store.setRerecordReady("sheet-alpha", {
      recordingId: "recording-alpha",
      sheetId: "sheet-alpha",
      segmentContext
    });
    store.setActiveSegment("sheet-alpha", "segment-alpha");

    expect(useSheetPracticeRecordingWorkflowStore.getState().rerecord).toMatchObject({
      status: "ready",
      source: {
        recordingId: "recording-alpha",
        segmentContext
      }
    });
  });

  it("resets active segment, workflow error, and rerecord source for a sheet switch", () => {
    const store = useSheetPracticeRecordingWorkflowStore.getState();

    store.setActiveSegment("sheet-alpha", "segment-alpha");
    store.failRecording("sheet-alpha", "failed");
    store.setRerecordReady("sheet-alpha", {
      recordingId: "recording-alpha",
      sheetId: "sheet-alpha",
      segmentContext
    });
    store.resetForSheet("sheet-bravo");

    expect(useSheetPracticeRecordingWorkflowStore.getState()).toMatchObject({
      sheetId: "sheet-bravo",
      activeSegmentId: null,
      status: "idle",
      error: null,
      rerecord: {
        status: "unavailable",
        source: null,
        unavailableReason: "no-source-recording",
        error: null
      }
    });
  });

  it("records invalidation and rerecord errors without persisting history", () => {
    const store = useSheetPracticeRecordingWorkflowStore.getState();

    store.setRerecordReady("sheet-alpha", {
      recordingId: "recording-alpha",
      sheetId: "sheet-alpha",
      segmentContext
    });
    store.invalidateRerecordSource("sheet-alpha", "source-recording-missing");

    expect(useSheetPracticeRecordingWorkflowStore.getState().rerecord).toEqual({
      status: "invalid",
      source: null,
      unavailableReason: "source-recording-missing",
      error: null
    });

    store.invalidateRerecordSource("sheet-alpha", "source-segment-missing");
    expect(useSheetPracticeRecordingWorkflowStore.getState().rerecord).toMatchObject({
      status: "invalid",
      unavailableReason: "source-segment-missing"
    });

    store.failRerecord("sheet-alpha", "Select a take first.");
    expect(useSheetPracticeRecordingWorkflowStore.getState().rerecord).toEqual({
      status: "error",
      source: null,
      unavailableReason: null,
      error: "Select a take first."
    });
  });

  it("replaces the current source with the latest successful segmented save", () => {
    const store = useSheetPracticeRecordingWorkflowStore.getState();

    store.finishRecording("sheet-alpha", {
      id: "recording-alpha",
      type: "sheet",
      sheetId: "sheet-alpha",
      segmentContext
    });
    store.finishRecording("sheet-alpha", {
      id: "recording-beta",
      type: "sheet",
      sheetId: "sheet-alpha",
      segmentContext: laterSegmentContext
    });

    expect(useSheetPracticeRecordingWorkflowStore.getState().rerecord).toEqual({
      status: "ready",
      source: {
        recordingId: "recording-beta",
        sheetId: "sheet-alpha",
        segmentContext: laterSegmentContext
      },
      unavailableReason: null,
      error: null
    });
  });

  it("updates rerecord source to a second recording id while preserving the same segment context", () => {
    const store = useSheetPracticeRecordingWorkflowStore.getState();

    store.setActiveSegment("sheet-alpha", "segment-alpha");
    store.finishRecording("sheet-alpha", {
      id: "recording-alpha",
      type: "sheet",
      sheetId: "sheet-alpha",
      segmentContext
    });
    store.beginRecording("sheet-alpha", "segment-alpha");
    store.beginSaving("sheet-alpha");
    store.finishRecording("sheet-alpha", {
      id: "recording-beta",
      type: "sheet",
      sheetId: "sheet-alpha",
      segmentContext
    });

    expect(useSheetPracticeRecordingWorkflowStore.getState()).toMatchObject({
      activeSegmentId: "segment-alpha",
      status: "idle",
      rerecord: {
        status: "ready",
        source: {
          recordingId: "recording-beta",
          sheetId: "sheet-alpha",
          segmentContext
        }
      }
    });
  });
});
