import { afterEach, describe, expect, it, vi } from "vitest";

import {
  derivePeaksFromSamples,
  getDurationWarning,
  loadRecordingArtifactDetails,
  loadRecordingArtifactDetailsFromBody
} from "@/lib/recordings-review/artifact-details";
import { createRecordingArtifactRef } from "@/lib/recordings-review/artifact-storage";
import { formatDuration, formatTimestamp } from "@/lib/recordings-review/format";
import {
  filterRecordings,
  getErrorMarkerSeekTarget,
  getContinuePracticeHref,
  getRecordingTagOptions,
  getTakeGroupPracticeHref,
  sortErrorMarkers,
  sortRecordingsByNewest
} from "@/lib/recordings-review/history";
import { getSheetPracticeQueryHref } from "@/domain/sheet/routes";
import { groupRecordingsByTake } from "@/lib/recordings-review/take-groups";
import {
  createErrorMarker,
  MAX_ERROR_MARKER_NOTE_LENGTH,
  normalizeErrorMarkerNote,
  seekToErrorMarker,
  validateErrorMarkerInput
} from "@/lib/recordings-review/error-markers";
import type { RecordingErrorMarker, ReviewRecording } from "@/lib/recordings-review/types";

const quickRecording: ReviewRecording = {
  id: "quick-1",
  type: "quick",
  name: "Morning rhythm",
  sessionId: "session-quick",
  sheetId: null,
  createdAt: "2026-06-21T09:00:00.000Z",
  durationMs: 65_000,
  sizeBytes: 12_000,
  mimeType: "audio/wav",
  audioDataUrl: "data:audio/wav;base64,UklGRg==",
  settings: {
    bpm: 120,
    timeSignature: "4/4"
  },
  trustedPeaks: [0.1, 0.5, 1]
};

const sheetRecording: ReviewRecording = {
  id: "sheet-1",
  type: "sheet",
  name: "Etude take",
  sessionId: "session-sheet",
  sheetId: "sheet-42",
  sheetName: "Moonlight Etude",
  createdAt: "2026-06-21T10:00:00.000Z",
  durationMs: 125_000,
  sizeBytes: 24_000,
  mimeType: "audio/wav",
  audioDataUrl: "data:audio/wav;base64,UklGRg==",
  settings: {
    bpm: 96,
    timeSignature: "3/4"
  },
  trustedPeaks: [0.2, 0.8, 0.4]
};

const segmentSheetRecording: ReviewRecording = {
  ...sheetRecording,
  id: "sheet-segment-1",
  name: "Focused segment take",
  segmentContext: {
    segmentId: "segment-bridge",
    segmentName: "Bridge",
    range: {
      startMeasure: 5,
      endMeasure: 8
    },
    targetBpm: 96,
    measureGridVersion:
      "bpm:96|timeSignature:3/4|pickupBeats:0|measureOneOffsetMs:1000",
    measureGridSnapshot: {
      bpm: 96,
      timeSignature: "3/4",
      pickupBeats: 0,
      measureOneOffsetMs: 1_000
    },
    measureRangeMs: {
      startMs: 10_000,
      endMs: 25_000
    }
  }
};

describe("recordings review history helpers", () => {
  it("filters by visible metadata, type, and combined search", () => {
    expect(filterRecordings({ recordings: [quickRecording, sheetRecording], query: "moonlight", type: "all" })).toEqual([
      sheetRecording
    ]);
    expect(filterRecordings({ recordings: [quickRecording, sheetRecording], query: "", type: "quick" })).toEqual([
      quickRecording
    ]);
    expect(filterRecordings({ recordings: [quickRecording, sheetRecording], query: "96 bpm", type: "sheet" })).toEqual([
      sheetRecording
    ]);
    expect(filterRecordings({ recordings: [quickRecording, sheetRecording], query: "moonlight", type: "quick" })).toEqual([]);
  });

  it("filters sheet recordings by saved segment metadata", () => {
    expect(
      filterRecordings({
        recordings: [quickRecording, sheetRecording, segmentSheetRecording],
        query: "bridge",
        type: "sheet"
      })
    ).toEqual([segmentSheetRecording]);
    expect(
      filterRecordings({
        recordings: [quickRecording, sheetRecording, segmentSheetRecording],
        query: "segment-bridge",
        type: "all"
      })
    ).toEqual([segmentSheetRecording]);
  });

  it("combines type, archive, favorite, tag, and tag-search filters before grouping", () => {
    const recordingOrganization = [
      {
        recordingId: "quick-1",
        tags: ["Warmup"],
        favorite: true,
        archived: false,
        updatedAt: "2026-06-21T11:00:00.000Z"
      },
      {
        recordingId: "sheet-1",
        tags: ["Keeper", "Bridge"],
        favorite: true,
        archived: true,
        updatedAt: "2026-06-21T12:00:00.000Z"
      },
      {
        recordingId: "sheet-segment-1",
        tags: ["Bridge"],
        favorite: false,
        archived: false,
        updatedAt: "2026-06-21T13:00:00.000Z"
      }
    ];
    const recordings = [quickRecording, sheetRecording, segmentSheetRecording];

    expect(
      filterRecordings({
        recordings,
        query: "",
        type: "all",
        recordingOrganization
      }).map((recording) => recording.id)
    ).toEqual(["sheet-segment-1", "quick-1"]);
    expect(
      filterRecordings({
        recordings,
        query: "",
        type: "sheet",
        archiveMode: "archived",
        favoritesOnly: true,
        tag: "keeper",
        recordingOrganization
      })
    ).toEqual([sheetRecording]);
    expect(
      filterRecordings({
        recordings,
        query: "",
        type: "all",
        archiveMode: "all",
        tag: "bridge",
        recordingOrganization
      }).map((recording) => recording.id)
    ).toEqual(["sheet-1", "sheet-segment-1"]);
    expect(
      filterRecordings({
        recordings,
        query: "warmup",
        type: "quick",
        recordingOrganization
      })
    ).toEqual([quickRecording]);
    expect(
      getRecordingTagOptions({
        recordings,
        recordingOrganization: [
          ...recordingOrganization,
          {
            recordingId: "missing-recording",
            tags: ["Ghost"],
            favorite: true,
            archived: true,
            updatedAt: "2026-06-21T14:00:00.000Z"
          }
        ]
      })
    ).toEqual(["Bridge", "Keeper", "Warmup"]);
  });

  it("sorts recordings by newest first", () => {
    expect(sortRecordingsByNewest([quickRecording, sheetRecording])).toEqual([
      sheetRecording,
      quickRecording
    ]);
  });

  it("formats durations and marker timestamps", () => {
    expect(formatDuration(65_000)).toBe("1:05");
    expect(formatDuration(0)).toBe("0:00");
    expect(formatTimestamp(5_200)).toBe("0:05");
  });

  it("calculates practice again targets", () => {
    expect(getContinuePracticeHref(quickRecording)).toBe("/quick-metronome?recordingId=quick-1");
    expect(getContinuePracticeHref(sheetRecording)).toBe(
      "/sheet-practice?recordingId=sheet-1&sheetId=sheet-42"
    );
    expect(getContinuePracticeHref(segmentSheetRecording)).toBe(
      "/sheet-practice?recordingId=sheet-segment-1&sheetId=sheet-42&segmentId=segment-bridge"
    );
    expect(
      getContinuePracticeHref({
        ...segmentSheetRecording,
        sheetId: " "
      })
    ).toBe("/sheet-practice?recordingId=sheet-segment-1");
  });

  it("builds narrow sheet practice query hrefs", () => {
    expect(
      getSheetPracticeQueryHref({
        recordingId: "take 1",
        sheetId: "sheet/42",
        segmentId: "segment bridge"
      })
    ).toBe(
      "/sheet-practice?recordingId=take+1&sheetId=sheet%2F42&segmentId=segment+bridge"
    );
    expect(
      getSheetPracticeQueryHref({
        recordingId: " take-1 ",
        sheetId: "",
        segmentId: " "
      })
    ).toBe("/sheet-practice?recordingId=take-1");
  });

  it("calculates group-level return targets from the latest grouped take", () => {
    const grouping = groupRecordingsByTake([
      sheetRecording,
      segmentSheetRecording,
      {
        ...segmentSheetRecording,
        id: "sheet-segment-2",
        name: "Focused segment take 2",
        createdAt: "2026-06-21T11:00:00.000Z"
      }
    ]);
    const segmentGroup = grouping.takeGroups.find(
      (group) => group.kind === "sheet-segment"
    );
    const noSegmentGroup = grouping.takeGroups.find(
      (group) => group.kind === "sheet-no-segment"
    );

    expect(segmentGroup).toBeDefined();
    expect(noSegmentGroup).toBeDefined();
    expect(getTakeGroupPracticeHref(segmentGroup!)).toBe(
      "/sheet-practice?recordingId=sheet-segment-2&sheetId=sheet-42&segmentId=segment-bridge"
    );
    expect(getTakeGroupPracticeHref(noSegmentGroup!)).toBe(
      "/sheet-practice?recordingId=sheet-1&sheetId=sheet-42"
    );
  });

  it("sorts error markers by timestamp", () => {
    const markers: RecordingErrorMarker[] = [
      { id: "late", recordingId: "sheet-1", timestampMs: 4_000, note: "Late" },
      { id: "early", recordingId: "sheet-1", timestampMs: 1_000, note: "Early" }
    ];

    expect(sortErrorMarkers(markers).map((marker) => marker.id)).toEqual(["early", "late"]);
  });

  it("validates marker recordingId, timestamp duration range, and note trimming", () => {
    expect(() =>
      validateErrorMarkerInput({
        recordingId: "",
        timestampMs: 100,
        durationMs: 1_000,
        note: null
      })
    ).toThrow("recording is required");
    expect(() =>
      validateErrorMarkerInput({
        recordingId: "sheet-1",
        timestampMs: -1,
        durationMs: 1_000,
        note: null
      })
    ).toThrow("within the recording");
    expect(() =>
      validateErrorMarkerInput({
        recordingId: "sheet-1",
        timestampMs: -0.4,
        durationMs: 1_000,
        note: null
      })
    ).toThrow("within the recording");
    expect(() =>
      validateErrorMarkerInput({
        recordingId: "sheet-1",
        timestampMs: 1_001,
        durationMs: 1_000,
        note: null
      })
    ).toThrow("within the recording");
    expect(() =>
      validateErrorMarkerInput({
        recordingId: "sheet-1",
        timestampMs: Number.NaN,
        durationMs: 1_000,
        note: null
      })
    ).toThrow("valid recording timestamp");
    expect(() =>
      validateErrorMarkerInput({
        recordingId: "sheet-1",
        timestampMs: Number.POSITIVE_INFINITY,
        durationMs: 1_000,
        note: null
      })
    ).toThrow("valid recording timestamp");
    expect(() =>
      validateErrorMarkerInput({
        recordingId: "sheet-1",
        timestampMs: 100,
        durationMs: Number.NaN,
        note: null
      })
    ).toThrow("Recording duration is unavailable");
    expect(() =>
      validateErrorMarkerInput({
        recordingId: "sheet-1",
        timestampMs: 100,
        durationMs: 1_000,
        note: "x".repeat(MAX_ERROR_MARKER_NOTE_LENGTH + 1)
      })
    ).toThrow("160 characters");
    expect(() =>
      validateErrorMarkerInput({
        recordingId: "sheet-1",
        timestampMs: 100,
        durationMs: 1_000,
        note: "x".repeat(MAX_ERROR_MARKER_NOTE_LENGTH)
      })
    ).not.toThrow();

    expect(normalizeErrorMarkerNote("  missed shift  ")).toBe("missed shift");
    expect(normalizeErrorMarkerNote("   ")).toBeNull();
    expect(
      createErrorMarker({
        id: "marker-fractional-start",
        recordingId: "sheet-1",
        timestampMs: 0.4,
        durationMs: 2_000,
        note: null
      })
    ).toEqual({
      id: "marker-fractional-start",
      recordingId: "sheet-1",
      timestampMs: 0,
      note: null
    });
    expect(
      createErrorMarker({
        id: "marker-created",
        recordingId: "sheet-1",
        timestampMs: 1_234.4,
        durationMs: 2_000,
        note: "  missed shift  "
      })
    ).toEqual({
      id: "marker-created",
      recordingId: "sheet-1",
      timestampMs: 1_234,
      note: "missed shift"
    });
  });

  it("calculates marker seek targets through the playback service contract value", () => {
    expect(getErrorMarkerSeekTarget({ timestampMs: 1_200 })).toBe(1_200);
  });

  it("seeks error markers through the shared playback helper", () => {
    const seekToMs = vi.fn((timestampMs: number) => ({
      targetTimeMs: timestampMs,
      currentTimeMs: timestampMs + 20
    }));

    expect(
      seekToErrorMarker({
        marker: { timestampMs: 1_200 },
        activeRecordingId: "recording-1",
        playbackControls: {
          recordingId: "recording-1",
          seekToMs
        }
      })
    ).toEqual({
      ok: true,
      seekTargetMs: 1_200,
      currentTimeMs: 1_220,
      message: "Playback moved to 0:01."
    });
    expect(seekToMs).toHaveBeenCalledWith(1_200);
  });

  it("reports shared marker seek readiness and tolerance failures", () => {
    expect(
      seekToErrorMarker({
        marker: { timestampMs: 1_200 },
        activeRecordingId: "recording-1",
        playbackControls: null
      })
    ).toEqual({
      ok: false,
      seekTargetMs: null,
      message: "Recording playback is still loading."
    });
    expect(
      seekToErrorMarker({
        marker: { timestampMs: 1_200 },
        activeRecordingId: "recording-1",
        playbackControls: {
          recordingId: "recording-1",
          seekToMs: (timestampMs) => ({
            targetTimeMs: timestampMs,
            currentTimeMs: timestampMs + 120
          })
        }
      })
    ).toEqual({
      ok: false,
      seekTargetMs: 1_200,
      message: "Playback did not move to the selected marker."
    });
  });
});

describe("recordings review artifact helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
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

  it("derives normalized peaks from decoded samples", () => {
    const peaks = derivePeaksFromSamples(new Float32Array([0, 0.5, -1, 0.25]), 2);

    expect(peaks).toEqual([0.5, 1]);
  });

  it("accepts trusted peaks only after the sheet artifact decodes", async () => {
    installAudioContextMock({ durationSeconds: 125 });

    const details = await loadTestArtifactDetails(sheetRecording);

    expect(details.recordingId).toBe("sheet-1");
    expect(details.source).toBe("trusted-peaks");
    expect(details.peaks).toEqual([0.2, 0.8, 0.4]);
    expect(details.decodedDurationMs).toBe(125_000);
    expect(details.durationWarning).toBeNull();
  });

  it("rejects invalid trusted peaks after the artifact decodes", async () => {
    installAudioContextMock({ durationSeconds: 125 });

    await expect(
      loadTestArtifactDetails({
        ...sheetRecording,
        trustedPeaks: [0, 0]
      })
    ).rejects.toThrow("invalid waveform peak data");

    await expect(
      loadTestArtifactDetails({
        ...sheetRecording,
        trustedPeaks: [Number.NaN, 0.5]
      })
    ).rejects.toThrow("invalid waveform peak data");

    await expect(
      loadTestArtifactDetails({
        ...sheetRecording,
        trustedPeaks: [Number.POSITIVE_INFINITY, 0.5]
      })
    ).rejects.toThrow("invalid waveform peak data");
  });

  it("derives peaks from decoded audio when trusted peaks are missing", async () => {
    installAudioContextMock({
      durationSeconds: 1,
      samples: new Float32Array([0, 0.5, -1, 0.25])
    });

    const missingDetails = await loadTestArtifactDetails({
      ...sheetRecording,
      durationMs: 1_000,
      trustedPeaks: undefined
    });
    const emptyDetails = await loadTestArtifactDetails({
      ...sheetRecording,
      durationMs: 1_000,
      trustedPeaks: []
    });

    expect(missingDetails.source).toBe("decoded-audio");
    expect(missingDetails.peaks).toContain(1);
    expect(missingDetails.durationWarning).toBeNull();
    expect(emptyDetails.source).toBe("decoded-audio");
    expect(emptyDetails.peaks).toContain(1);
    expect(emptyDetails.durationWarning).toBeNull();
  });

  it("rejects trusted peaks with missing audio", async () => {
    await expect(
      loadRecordingArtifactDetails({
        ...sheetRecording,
        artifactRef: null,
        audioDataUrl: null
      })
    ).rejects.toThrow("no accessible audio artifact");
  });

  it("does not fall back to legacy audioDataUrl when an artifact body is missing", async () => {
    await expect(
      loadRecordingArtifactDetails({
        ...sheetRecording,
        artifactRef: createRecordingArtifactRef(sheetRecording.id),
        audioDataUrl: "data:audio/wav;base64,UklGRg=="
      })
    ).rejects.toThrow("local audio artifact is missing");
  });

  it("rejects trusted peaks when the audio cannot be decoded", async () => {
    installAudioContextMock({ reject: true });

    await expect(loadTestArtifactDetails(sheetRecording)).rejects.toThrow("cannot be decoded");
  });

  it("rejects missing audio without trusted peaks", async () => {
    await expect(
      loadRecordingArtifactDetails({
        ...quickRecording,
        artifactRef: null,
        audioDataUrl: null,
        trustedPeaks: undefined
      })
    ).rejects.toThrow("no accessible audio artifact");
  });

  it("surfaces duration mismatch beyond tolerance", async () => {
    installAudioContextMock({ durationSeconds: 2 });

    const details = await loadTestArtifactDetails({
      ...quickRecording,
      durationMs: 1_000,
      trustedPeaks: undefined
    });

    expect(details.durationDifferenceMs).toBe(1_000);
    expect(details.durationWarning).toContain("differs from saved metadata");
  });

  it("does not warn when decoded and metadata duration are within tolerance", () => {
    expect(getDurationWarning({ decodedDurationMs: 1_200, metadataDurationMs: 1_000 })).toBeNull();
    expect(getDurationWarning({ decodedDurationMs: 1_400, metadataDurationMs: 1_000 })).toContain(
      "differs from saved metadata"
    );
  });
});

function loadTestArtifactDetails(recording: ReviewRecording) {
  return loadRecordingArtifactDetailsFromBody({
    recordingId: recording.id,
    blob: new Blob(["audio"], { type: recording.mimeType }),
    metadataDurationMs: recording.durationMs,
    trustedPeaks: recording.trustedPeaks
  });
}
