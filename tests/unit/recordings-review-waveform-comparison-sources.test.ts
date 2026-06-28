import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  recordingHistoryRepository,
  seedRecordingHistoryForTests
} from "@/lib/recordings-review/repository";
import {
  recordingArtifactRepository,
  type LocalRecordingArtifact
} from "@/infrastructure/db/recording-artifact-repository";
import { createRecordingArtifactRef } from "@/lib/recordings-review/artifact-storage";
import {
  loadWaveformComparisonSource,
  loadWaveformComparisonSources,
  loadWaveformComparisonSourcesForGroup,
  loadWaveformComparisonSourcesForRecordingIds
} from "@/lib/recordings-review/waveform-comparison-sources";
import type {
  RecordingReviewSnapshot,
  ReviewRecording
} from "@/lib/recordings-review/types";
import type { SheetRecordingSegmentContext } from "@/domain/practice";

let artifactBodies: Map<string, LocalRecordingArtifact>;

describe("waveform comparison source boundary", () => {
  beforeEach(() => {
    window.localStorage.clear();
    artifactBodies = new Map();
    vi.spyOn(recordingArtifactRepository, "getArtifact").mockImplementation(
      async (artifactId) => artifactBodies.get(artifactId) ?? null
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("returns ready decoded audio sources without scoring fields", async () => {
    installAudioContextMock({
      durationSeconds: 12,
      samples: new Float32Array([0, 0.25, -0.5, 1])
    });
    const recording = createSheetRecording({
      id: "sheet-decoded",
      trustedPeaks: undefined
    });

    await saveArtifactForRecording(recording);

    const result = await loadWaveformComparisonSources([
      recording,
      recording
    ]);

    expect(result).toMatchObject({
      allReady: true,
      readyCount: 2,
      requestedCount: 2
    });
    expect(result.sources.map((source) => source.recordingId)).toEqual([
      "sheet-decoded",
      "sheet-decoded"
    ]);
    expect(result.readySources[0]).toMatchObject({
      status: "ready",
      recordingId: "sheet-decoded",
      source: "decoded-audio",
      durationMs: 12_000,
      durationWarning: null
    });
    expect(result.readySources[0].peaks).toContain(1);
    expect(collectObjectKeys(result)).not.toEqual(
      expect.arrayContaining([
        "score",
        "accuracy",
        "correct",
        "mistakes",
        "recommended",
        "timingQuality",
        "rank",
        "ranking"
      ])
    );
  });

  it("returns ready trusted peaks only after the local artifact decodes", async () => {
    installAudioContextMock({
      durationSeconds: 12,
      samples: new Float32Array([0, 0.1, 0.2])
    });
    const recording = createSheetRecording({
      trustedPeaks: [0.25, 2, 0.5]
    });

    await saveArtifactForRecording(recording);

    const source = await loadWaveformComparisonSource(recording);

    expect(source).toMatchObject({
      status: "ready",
      source: "trusted-peaks",
      peaks: [0.25, 1, 0.5],
      durationMs: 12_000
    });
  });

  it("propagates artifact metadata facts through wrapper results", async () => {
    installAudioContextMock({
      durationSeconds: 12,
      samples: new Float32Array([0, 0.25, -0.5, 1])
    });
    const recording = createSheetRecording({
      id: "duration-mismatch",
      durationMs: 9_000
    });

    await saveArtifactForRecording(recording);

    const result = await loadWaveformComparisonSources([recording]);

    expect(result).toMatchObject({
      allReady: true,
      readyCount: 1,
      requestedCount: 1
    });
    expect(result.readySources[0]).toMatchObject({
      status: "ready",
      recordingId: "duration-mismatch",
      durationMs: 12_000,
      durationWarning:
        "Decoded audio duration (12.0s) differs from saved metadata (9.0s).",
      artifactDetails: {
        decodedDurationMs: 12_000,
        metadataDurationMs: 9_000,
        durationDifferenceMs: 3_000,
        durationWarning:
          "Decoded audio duration (12.0s) differs from saved metadata (9.0s)."
      }
    });
  });

  it.each([
    { trustedPeaks: [0, 0], label: "all-zero" },
    { trustedPeaks: [Number.NaN, 0.5], label: "NaN" },
    { trustedPeaks: [Number.POSITIVE_INFINITY, 0.5], label: "infinite" }
  ])("returns invalid-peaks for $label trusted peak data", async ({ trustedPeaks }) => {
    installAudioContextMock({
      durationSeconds: 12,
      samples: new Float32Array([0, 0.25, 0.5])
    });
    const recording = createSheetRecording({ trustedPeaks });

    await saveArtifactForRecording(recording);

    await expectUnavailableReason(
      loadWaveformComparisonSource(recording),
      "invalid-peaks"
    );
  });

  it("falls back to decoded audio when trusted peaks are empty", async () => {
    installAudioContextMock({
      durationSeconds: 12,
      samples: new Float32Array([0, 0.25, -0.5, 1])
    });
    const recording = createSheetRecording({
      trustedPeaks: []
    });

    await saveArtifactForRecording(recording);

    const source = await loadWaveformComparisonSource(recording);

    expect(source).toMatchObject({
      status: "ready",
      source: "decoded-audio",
      durationMs: 12_000
    });
    expect(source.status === "ready" ? source.peaks : []).toContain(1);
  });

  it("does not trust peaks without a local artifact and maps decode failures explicitly", async () => {
    await expectUnavailableReason(
      loadWaveformComparisonSource(
        createSheetRecording({
          artifactRef: null,
          audioDataUrl: null,
          trustedPeaks: [0.2, 0.8]
        })
      ),
      "missing-artifact"
    );

    installAudioContextMock({ reject: true });
    const decodeFailure = createSheetRecording({
      trustedPeaks: [0.2, 0.8]
    });

    await saveArtifactForRecording(decodeFailure);

    await expectUnavailableReason(
      loadWaveformComparisonSource(decodeFailure),
      "decode-failed"
    );
  });

  it("maps unsupported mime, blank artifacts, empty audio, and invalid duration to per-take states", async () => {
    for (const mimeType of [
      "metadata/session",
      "",
      "image/png",
      "application/pdf"
    ]) {
      await expectUnavailableReason(
        loadWaveformComparisonSource(createSheetRecording({ mimeType })),
        "unsupported-mime"
      );
    }

    await expectUnavailableReason(
      loadWaveformComparisonSource(
        createSheetRecording({
          artifactRef: null,
          audioDataUrl: "   "
        })
      ),
      "missing-artifact"
    );

    installAudioContextMock({
      durationSeconds: 12,
      samples: new Float32Array([0, 0, 0])
    });
    const emptyAudio = createSheetRecording({
      trustedPeaks: undefined
    });

    await saveArtifactForRecording(emptyAudio);

    await expectUnavailableReason(
      loadWaveformComparisonSource(emptyAudio),
      "empty-audio"
    );

    await expectUnavailableReason(
      loadWaveformComparisonSource(createSheetRecording({ durationMs: 0 })),
      "invalid-duration"
    );
    await expectUnavailableReason(
      loadWaveformComparisonSource(createSheetRecording({ durationMs: -1 })),
      "invalid-duration"
    );
    await expectUnavailableReason(
      loadWaveformComparisonSource(createSheetRecording({ durationMs: Number.NaN })),
      "invalid-duration"
    );
  });

  it("keeps quick and ungrouped sheet recordings unavailable without hiding valid no-segment takes", async () => {
    installAudioContextMock({ durationSeconds: 12 });
    const legacyNoSegmentRecording = createSheetRecording({
      id: "legacy-no-segment"
    });
    const explicitNoSegmentRecording = createSheetRecording({
      id: "explicit-no-segment",
      segmentContext: null
    });

    await saveArtifactsForRecordings([
      legacyNoSegmentRecording,
      explicitNoSegmentRecording
    ]);

    const legacyNoSegment = await loadWaveformComparisonSource(
      legacyNoSegmentRecording
    );
    const explicitNoSegment = await loadWaveformComparisonSource(
      explicitNoSegmentRecording
    );
    const quick = await loadWaveformComparisonSource(createQuickRecording());
    const missingSheetId = await loadWaveformComparisonSource(
      createSheetRecording({
        id: "missing-sheet-id",
        sheetId: " "
      })
    );

    expect(legacyNoSegment.status).toBe("ready");
    expect(explicitNoSegment.status).toBe("ready");
    expect(quick).toMatchObject({
      status: "unavailable",
      reason: "not-sheet-take"
    });
    expect(missingSheetId).toMatchObject({
      status: "unavailable",
      reason: "not-sheet-take"
    });
  });

  it("resolves current repository ids and reports missing or deleted recordings", async () => {
    installAudioContextMock({ durationSeconds: 12 });
    const sheetReady = createSheetRecording({ id: "sheet-ready" });

    await saveArtifactForRecording(sheetReady);
    seedRecordingHistoryForTests({
      sessions: [],
      recordings: [
        sheetReady,
        createSheetRecording({
          id: "sheet-missing-artifact",
          audioDataUrl: null
        }),
        createQuickRecording({ id: "quick-take" })
      ],
      errorMarkers: []
    });
    recordingHistoryRepository.deleteRecording("sheet-ready");

    const result = await loadWaveformComparisonSourcesForRecordingIds([
      "sheet-ready",
      "sheet-missing-artifact",
      "quick-take",
      "unknown-recording"
    ]);

    expect(result).toMatchObject({
      allReady: false,
      readyCount: 0,
      requestedCount: 4
    });
    expect(result.sources.map((source) => [source.recordingId, source.status])).toEqual([
      ["sheet-ready", "unavailable"],
      ["sheet-missing-artifact", "unavailable"],
      ["quick-take", "unavailable"],
      ["unknown-recording", "unavailable"]
    ]);
    expect(result.unavailableSources.map((source) => source.reason)).toEqual([
      "missing-recording",
      "missing-artifact",
      "not-sheet-take",
      "missing-recording"
    ]);
  });

  it("preserves duplicate repository ids as separate requested entries", async () => {
    installAudioContextMock({ durationSeconds: 12 });
    const sheetReady = createSheetRecording({ id: "sheet-ready" });

    await saveArtifactForRecording(sheetReady);
    seedRecordingHistoryForTests({
      sessions: [],
      recordings: [sheetReady],
      errorMarkers: []
    });

    const result = await loadWaveformComparisonSourcesForRecordingIds([
      "sheet-ready",
      "sheet-ready",
      "unknown-recording",
      "unknown-recording"
    ]);

    expect(result).toMatchObject({
      allReady: false,
      readyCount: 2,
      requestedCount: 4
    });
    expect(result.sources.map((source) => [source.recordingId, source.status])).toEqual([
      ["sheet-ready", "ready"],
      ["sheet-ready", "ready"],
      ["unknown-recording", "unavailable"],
      ["unknown-recording", "unavailable"]
    ]);
    expect(result.unavailableSources.map((source) => source.reason)).toEqual([
      "missing-recording",
      "missing-recording"
    ]);
  });

  it("uses current P2-01 take group membership for segment and no-segment groups", async () => {
    installAudioContextMock({ durationSeconds: 12 });
    const groupedSnapshot = createGroupedSnapshot();

    await saveArtifactsForRecordings(groupedSnapshot.recordings);
    seedRecordingHistoryForTests(groupedSnapshot);

    const [segmentGroup, noSegmentGroup] = recordingHistoryRepository.getTakeGroups().takeGroups;

    expect(segmentGroup.kind).toBe("sheet-segment");
    expect(noSegmentGroup.kind).toBe("sheet-no-segment");

    const segmentResult = await loadWaveformComparisonSourcesForGroup({
      group: segmentGroup,
      recordingIds: ["sheet-segment-new", "sheet-whole-null"]
    });

    expect(segmentResult).toMatchObject({
      groupId: "sheet:sheet-alpha:segment:id:segment-alpha",
      sheetId: "sheet-alpha",
      segmentId: "segment-alpha",
      readyCount: 1,
      requestedCount: 2
    });
    expect(segmentResult.sources.map((source) => source.status)).toEqual([
      "ready",
      "unavailable"
    ]);
    expect(segmentResult.unavailableSources[0]).toMatchObject({
      recordingId: "sheet-whole-null",
      recording: {
        id: "sheet-whole-null"
      },
      reason: "stale-group-membership"
    });

    const noSegmentResult = await loadWaveformComparisonSourcesForGroup({
      group: noSegmentGroup,
      recordingIds: ["sheet-whole-null", "sheet-whole-null", "sheet-whole-legacy"]
    });

    expect(noSegmentResult).toMatchObject({
      groupId: "sheet:sheet-alpha:segment:none",
      sheetId: "sheet-alpha",
      segmentId: null,
      allReady: true,
      readyCount: 3,
      requestedCount: 3
    });
    expect(noSegmentResult.sources.map((source) => source.recordingId)).toEqual([
      "sheet-whole-null",
      "sheet-whole-null",
      "sheet-whole-legacy"
    ]);
  });

  it("does not serve stale group recordings after local review history changes", async () => {
    installAudioContextMock({ durationSeconds: 12 });
    const groupedSnapshot = createGroupedSnapshot();

    await saveArtifactsForRecordings(groupedSnapshot.recordings);
    seedRecordingHistoryForTests(groupedSnapshot);

    const [segmentGroup] = recordingHistoryRepository.getTakeGroups().takeGroups;

    recordingHistoryRepository.deleteRecording("sheet-segment-old");

    const result = await loadWaveformComparisonSourcesForGroup({
      group: segmentGroup,
      recordingIds: ["sheet-segment-old", "sheet-segment-new"]
    });

    expect(result.sources.map((source) => [source.recordingId, source.status])).toEqual([
      ["sheet-segment-old", "unavailable"],
      ["sheet-segment-new", "ready"]
    ]);
    expect(result.unavailableSources[0]).toMatchObject({
      reason: "missing-recording",
      recording: null
    });
    expect(recordingHistoryRepository.getRecording("sheet-segment-old")).toBeNull();
  });
});

function installAudioContextMock({
  durationSeconds = 1,
  samples = new Float32Array([0, 0.25, -0.5, 1]),
  reject = false
}: {
  durationSeconds?: number;
  samples?: Float32Array;
  reject?: boolean;
} = {}) {
  class MockAudioContext {
    async decodeAudioData() {
      if (reject) {
        throw new Error("decode failed");
      }

      return {
        duration: durationSeconds,
        sampleRate: 8_000,
        getChannelData: () => samples
      };
    }

    close() {
      return Promise.resolve();
    }
  }

  vi.stubGlobal("AudioContext", MockAudioContext);
  Object.defineProperty(window, "AudioContext", {
    configurable: true,
    value: MockAudioContext
  });
}

async function expectUnavailableReason(
  sourcePromise: Promise<unknown>,
  reason: string
) {
  await expect(sourcePromise).resolves.toMatchObject({
    status: "unavailable",
    reason
  });
}

function collectObjectKeys(value: unknown): string[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap(collectObjectKeys);
  }

  return Object.entries(value).flatMap(([key, child]) => [
    key,
    ...collectObjectKeys(child)
  ]);
}

function createGroupedSnapshot(): RecordingReviewSnapshot {
  return {
    sessions: [],
    recordings: [
      createSheetRecording({
        id: "sheet-segment-old",
        createdAt: "2026-06-21T09:00:00.000Z",
        segmentContext: createSegmentContext()
      }),
      createSheetRecording({
        id: "sheet-segment-new",
        createdAt: "2026-06-21T12:00:00.000Z",
        segmentContext: createSegmentContext()
      }),
      createSheetRecording({
        id: "sheet-whole-legacy",
        createdAt: "2026-06-21T10:00:00.000Z"
      }),
      createSheetRecording({
        id: "sheet-whole-null",
        createdAt: "2026-06-21T11:00:00.000Z",
        segmentContext: null
      }),
      createQuickRecording()
    ],
    errorMarkers: []
  };
}

function createSegmentContext(
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
    measureGridVersion: "bpm:96|timeSignature:4/4|pickupBeats:0|measureOneOffsetMs:1000",
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

function createSheetRecording(
  overrides: Partial<Omit<ReviewRecording, "segmentContext">> & {
    segmentContext?: unknown;
  } = {}
): ReviewRecording {
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
    mimeType: "audio/wav",
    audioDataUrl: "data:audio/wav;base64,UklGRg==",
    settings: {
      bpm: 96,
      timeSignature: "4/4"
    },
    ...overrides
  } as ReviewRecording;

  return Object.prototype.hasOwnProperty.call(overrides, "artifactRef")
    ? recording
    : {
        ...recording,
        artifactRef: createRecordingArtifactRef(recording.id)
      };
}

function createQuickRecording(overrides: Partial<ReviewRecording> = {}): ReviewRecording {
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
    settings: {
      bpm: 120,
      timeSignature: "4/4"
    },
    ...overrides
  };

  return Object.prototype.hasOwnProperty.call(overrides, "artifactRef")
    ? recording
    : {
        ...recording,
        artifactRef: createRecordingArtifactRef(recording.id)
      };
}

async function saveArtifactsForRecordings(recordings: ReviewRecording[]) {
  await Promise.all(
    recordings
      .filter((recording) => recording.type === "sheet")
      .map((recording) => saveArtifactForRecording(recording))
  );
}

async function saveArtifactForRecording(recording: ReviewRecording) {
  if (!recording.artifactRef) {
    return;
  }

  artifactBodies.set(recording.id, {
    artifactId: recording.id,
    recordingId: recording.id,
    recordingType: recording.type,
    mimeType: recording.mimeType,
    sizeBytes: 5,
    blob: new Blob(["audio"], { type: recording.mimeType }),
    createdAt: recording.createdAt,
    updatedAt: recording.createdAt
  });
}
