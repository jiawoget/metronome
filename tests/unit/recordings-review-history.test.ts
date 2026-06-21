import { afterEach, describe, expect, it, vi } from "vitest";

import {
  derivePeaksFromSamples,
  getDurationWarning,
  loadRecordingArtifactDetails
} from "@/lib/recordings-review/artifact-service";
import { formatDuration, formatTimestamp } from "@/lib/recordings-review/format";
import {
  filterRecordings,
  getContinuePracticeHref,
  sortErrorMarkers,
  sortRecordingsByNewest
} from "@/lib/recordings-review/history";
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
  });

  it("sorts error markers by timestamp", () => {
    const markers: RecordingErrorMarker[] = [
      { id: "late", recordingId: "sheet-1", timestampMs: 4_000, note: "Late" },
      { id: "early", recordingId: "sheet-1", timestampMs: 1_000, note: "Early" }
    ];

    expect(sortErrorMarkers(markers).map((marker) => marker.id)).toEqual(["early", "late"]);
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

    const details = await loadRecordingArtifactDetails(sheetRecording);

    expect(details.recordingId).toBe("sheet-1");
    expect(details.source).toBe("trusted-peaks");
    expect(details.peaks).toEqual([0.2, 0.8, 0.4]);
    expect(details.decodedDurationMs).toBe(125_000);
    expect(details.durationWarning).toBeNull();
  });

  it("rejects trusted peaks with missing audio", async () => {
    await expect(
      loadRecordingArtifactDetails({
        ...sheetRecording,
        audioDataUrl: null
      })
    ).rejects.toThrow("no accessible audio artifact");
  });

  it("rejects trusted peaks when the audio cannot be decoded", async () => {
    installAudioContextMock({ reject: true });

    await expect(loadRecordingArtifactDetails(sheetRecording)).rejects.toThrow("cannot be decoded");
  });

  it("rejects missing audio without trusted peaks", async () => {
    await expect(
      loadRecordingArtifactDetails({
        ...quickRecording,
        audioDataUrl: null,
        trustedPeaks: undefined
      })
    ).rejects.toThrow("no accessible audio artifact");
  });

  it("surfaces duration mismatch beyond tolerance", async () => {
    installAudioContextMock({ durationSeconds: 2 });

    const details = await loadRecordingArtifactDetails({
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
