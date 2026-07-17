import {
  createSheetRecordingSegmentContext,
  type PracticeSegment,
  type SheetRecordingSegmentContext
} from "@/domain/practice";
import type { ReviewRecording } from "@/lib/recordings-review/types";
import type {
  SheetPracticeRecordingWorkflowState,
  SheetPracticeRerecordSource,
  SheetPracticeRerecordUnavailableReason
} from "@/stores/sheet-practice-recording-workflow-store";

type RerecordInspectionResult<T> =
  | {
      kind: "valid";
      value: T;
    }
  | {
      kind: "invalid";
      reason: SheetPracticeRerecordUnavailableReason;
    };

type SegmentInspectionInput =
  | {
      kind: "hydration";
      segment: PracticeSegment | null;
      sourceContext: SheetRecordingSegmentContext;
    }
  | {
      kind: "pre-start";
      segment: PracticeSegment | null;
      sourceContext: SheetRecordingSegmentContext;
      sheetId: string;
    };

type PracticeAgainSourceInspectionResult =
  | {
      kind: "valid";
      recording: ReviewRecording;
      sourceContext: SheetRecordingSegmentContext;
    }
  | {
      kind: "missing-context";
      reason: "no-segment-context";
    }
  | {
      kind: "invalid";
      reason: SheetPracticeRerecordUnavailableReason;
    };

type RerecordSegmentInspectionResult =
  | {
      kind: "valid";
      value: SheetRecordingSegmentContext;
    }
  | {
      kind: "missing";
      reason: "source-segment-missing";
    }
  | {
      kind: "sheet-mismatch";
      reason: "sheet-mismatch";
    }
  | {
      kind: "invalid";
      reason: "source-segment-invalid";
    };

type ReadySourceSelectionInput = {
  kind: "mounted" | "pre-start";
  sheetId: string;
  workflowState: SheetPracticeRecordingWorkflowState;
};

function areSegmentContextsEqual(
  left: SheetRecordingSegmentContext,
  right: SheetRecordingSegmentContext
) {
  const fieldPairs = [
    [left.segmentId, right.segmentId],
    [left.segmentName, right.segmentName],
    [left.range.startMeasure, right.range.startMeasure],
    [left.range.endMeasure, right.range.endMeasure],
    [left.targetBpm, right.targetBpm],
    [left.measureGridVersion, right.measureGridVersion],
    [left.measureGridSnapshot.bpm, right.measureGridSnapshot.bpm],
    [
      left.measureGridSnapshot.timeSignature,
      right.measureGridSnapshot.timeSignature
    ],
    [left.measureGridSnapshot.pickupBeats, right.measureGridSnapshot.pickupBeats],
    [
      left.measureGridSnapshot.measureOneOffsetMs,
      right.measureGridSnapshot.measureOneOffsetMs
    ],
    [left.measureRangeMs.startMs, right.measureRangeMs.startMs],
    [left.measureRangeMs.endMs, right.measureRangeMs.endMs]
  ];

  return fieldPairs.every(([leftValue, rightValue]) => leftValue === rightValue);
}

function inspectSheetRecording({
  recording,
  sheetId
}: {
  recording: ReviewRecording | null;
  sheetId: string;
}): RerecordInspectionResult<ReviewRecording> {
  if (!recording) {
    return { kind: "invalid", reason: "source-recording-missing" };
  }

  if (recording.type !== "sheet") {
    return { kind: "invalid", reason: "source-not-sheet" };
  }

  if (recording.sheetId !== sheetId) {
    return { kind: "invalid", reason: "sheet-mismatch" };
  }

  return { kind: "valid", value: recording };
}

function isReturnSegmentSelectionValid(
  returnSegmentId: string | null,
  sourceSegmentId: string
) {
  const normalizedReturnSegmentId = returnSegmentId?.trim() ?? "";

  return ["", sourceSegmentId].includes(normalizedReturnSegmentId);
}

export function inspectPracticeAgainSource({
  recording,
  returnSegmentId,
  sheetId
}: {
  recording: ReviewRecording | null;
  returnSegmentId: string | null;
  sheetId: string;
}): PracticeAgainSourceInspectionResult {
  const recordingInspection = inspectSheetRecording({ recording, sheetId });

  if (recordingInspection.kind === "invalid") {
    return recordingInspection;
  }

  const sourceContext = recordingInspection.value.segmentContext;

  if (!sourceContext) {
    return { kind: "missing-context", reason: "no-segment-context" };
  }

  if (!isReturnSegmentSelectionValid(returnSegmentId, sourceContext.segmentId)) {
    return { kind: "invalid", reason: "selection-changed" };
  }

  return {
    kind: "valid",
    recording: recordingInspection.value,
    sourceContext
  };
}

export function inspectRerecordSourceSegment(
  input: SegmentInspectionInput
): RerecordSegmentInspectionResult {
  if (!input.segment) {
    return { kind: "missing", reason: "source-segment-missing" };
  }

  if (input.kind === "pre-start" && input.segment.sheetId !== input.sheetId) {
    return { kind: "sheet-mismatch", reason: "sheet-mismatch" };
  }

  let liveContext: SheetRecordingSegmentContext;

  try {
    liveContext = createSheetRecordingSegmentContext(input.segment);
  } catch {
    return { kind: "invalid", reason: "source-segment-invalid" };
  }

  if (!areSegmentContextsEqual(liveContext, input.sourceContext)) {
    return { kind: "invalid", reason: "source-segment-invalid" };
  }

  return { kind: "valid", value: liveContext };
}

function selectWorkflowReadySource({
  sheetId,
  workflowState
}: {
  sheetId: string;
  workflowState: SheetPracticeRecordingWorkflowState;
}): RerecordInspectionResult<SheetPracticeRerecordSource> {
  if (workflowState.sheetId !== sheetId) {
    return { kind: "invalid", reason: "selection-changed" };
  }

  if (workflowState.rerecord.status !== "ready") {
    return { kind: "invalid", reason: "selection-changed" };
  }

  if (workflowState.rerecord.source === null) {
    return { kind: "invalid", reason: "selection-changed" };
  }

  return { kind: "valid", value: workflowState.rerecord.source };
}

export function selectReadyRerecordSource({
  kind,
  sheetId,
  workflowState
}: ReadySourceSelectionInput): RerecordInspectionResult<SheetPracticeRerecordSource> {
  const selection = selectWorkflowReadySource({ sheetId, workflowState });

  if (selection.kind === "invalid") {
    return selection;
  }

  if (kind === "mounted") {
    if (selection.value.recordingId === "") {
      return { kind: "invalid", reason: "selection-changed" };
    }

    return selection;
  }

  if (selection.value.sheetId !== sheetId) {
    return { kind: "invalid", reason: "selection-changed" };
  }

  if (workflowState.activeSegmentId !== selection.value.segmentContext.segmentId) {
    return { kind: "invalid", reason: "selection-changed" };
  }

  return selection;
}

export function inspectReadyRerecordSourceRecording({
  recording,
  sheetId,
  source
}: {
  recording: ReviewRecording | null;
  sheetId: string;
  source: SheetPracticeRerecordSource;
}): RerecordInspectionResult<ReviewRecording> {
  const recordingInspection = inspectSheetRecording({ recording, sheetId });

  if (recordingInspection.kind === "invalid") {
    return recordingInspection;
  }

  if (recordingInspection.value.sheetId !== source.sheetId) {
    return { kind: "invalid", reason: "sheet-mismatch" };
  }

  if (
    !recordingInspection.value.segmentContext ||
    !areSegmentContextsEqual(
      recordingInspection.value.segmentContext,
      source.segmentContext
    )
  ) {
    return { kind: "invalid", reason: "source-segment-invalid" };
  }

  return recordingInspection;
}
