import type { SheetRecordingSegmentContext } from "@/domain/practice";
import { createRecordingArtifactRef } from "@/lib/recordings-review/artifact-storage";
import type { ReviewRecording } from "@/lib/recordings-review/types";

export type MakeQuickReviewRecordingOverrides = Partial<
  Omit<ReviewRecording, "settings">
> & {
  settings?: Partial<ReviewRecording["settings"]>;
};

export type MakeSheetReviewRecordingOverrides = Partial<
  Omit<ReviewRecording, "segmentContext" | "settings">
> & {
  segmentContext?: unknown;
  settings?: Partial<ReviewRecording["settings"]>;
};

type ReviewRecordingFactoryOptions<TDefaults> = {
  defaults?: TDefaults;
  withArtifactRef?: boolean;
};

export function makeSheetRecordingSegmentContext(
  overrides: Partial<SheetRecordingSegmentContext> = {}
): SheetRecordingSegmentContext {
  return {
    segmentId: "segment-alpha",
    segmentName: "Bridge",
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
      endMs: 31_000
    },
    ...overrides
  };
}

export function makeQuickReviewRecording(
  overrides: MakeQuickReviewRecordingOverrides = {},
  options: ReviewRecordingFactoryOptions<MakeQuickReviewRecordingOverrides> = {}
): ReviewRecording {
  const { settings: defaultSettings, ...defaultOverrides } =
    options.defaults ?? {};
  const { settings, ...recordingOverrides } = overrides;
  const recording: ReviewRecording = {
    id: "quick-recording",
    type: "quick",
    name: "Quick take",
    sessionId: "session-quick",
    sheetId: null,
    createdAt: "2026-06-21T09:00:00.000Z",
    durationMs: 10_000,
    sizeBytes: 128,
    mimeType: "audio/wav",
    audioDataUrl: "data:audio/wav;base64,UklGRg==",
    ...defaultOverrides,
    ...recordingOverrides,
    settings: {
      bpm: 120,
      timeSignature: "4/4",
      ...defaultSettings,
      ...settings
    }
  } as ReviewRecording;

  return withDefaultArtifactRef(
    recording,
    recordingOverrides,
    options.withArtifactRef !== false
  );
}

export function makeSheetReviewRecording(
  overrides: MakeSheetReviewRecordingOverrides = {},
  options: ReviewRecordingFactoryOptions<MakeSheetReviewRecordingOverrides> = {}
): ReviewRecording {
  const defaults = options.defaults ?? {};
  const { settings: defaultSettings, segmentContext: defaultSegmentContext, ...defaultOverrides } =
    defaults;
  const { settings, segmentContext, ...recordingOverrides } = overrides;
  const hasDefaultSegmentContext = hasOwn(defaults, "segmentContext");
  const hasSegmentContextOverride = hasOwn(overrides, "segmentContext");
  const recording = {
    id: "sheet-recording",
    type: "sheet",
    name: "Sheet take",
    sessionId: "session-sheet",
    sheetId: "sheet-alpha",
    sheetName: "Alpha Etude",
    createdAt: "2026-06-21T12:00:00.000Z",
    durationMs: 12_000,
    sizeBytes: 256,
    mimeType: "audio/webm",
    audioDataUrl: "data:audio/webm;base64,UklGRg==",
    ...(hasDefaultSegmentContext
      ? { segmentContext: defaultSegmentContext }
      : {}),
    ...(hasSegmentContextOverride ? { segmentContext } : {}),
    ...defaultOverrides,
    ...recordingOverrides,
    settings: {
      bpm: 96,
      timeSignature: "4/4",
      ...defaultSettings,
      ...settings
    }
  } as ReviewRecording;

  return withDefaultArtifactRef(
    recording,
    recordingOverrides,
    options.withArtifactRef !== false
  );
}

function withDefaultArtifactRef(
  recording: ReviewRecording,
  overrides: object,
  shouldAttachArtifactRef: boolean
): ReviewRecording {
  if (!shouldAttachArtifactRef || hasOwn(overrides, "artifactRef")) {
    return recording;
  }

  return {
    ...recording,
    artifactRef: createRecordingArtifactRef(recording.id)
  };
}

function hasOwn(object: object, key: PropertyKey) {
  return Object.prototype.hasOwnProperty.call(object, key);
}
