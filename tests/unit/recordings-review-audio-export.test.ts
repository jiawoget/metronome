import { describe, expect, it, vi } from "vitest";

import {
  buildRecordingAudioExportFilename,
  createRecordingAudioExportService,
  getAudioExportExtension,
  getAudioExportMimeInfo,
  getRecordingAudioExportEligibility
} from "@/lib/recordings-review/audio-export";
import type { ReviewRecording } from "@/lib/recordings-review/types";

describe("recordings review audio export", () => {
  it("exports a supported quick recording artifact through the injected adapter once", async () => {
    const recording = createQuickRecording({
      id: "quick-alpha",
      name: "Quick Alpha",
      createdAt: "2026-06-21T09:08:07",
      mimeType: "audio/webm;codecs=opus",
      audioDataUrl: "data:audio/webm;codecs=opus;base64,AQID"
    });
    const downloadBlob = vi.fn();
    const service = createRecordingAudioExportService({
      repository: createRepository([recording]),
      downloadAdapter: { downloadBlob }
    });

    const result = await service.exportRecordingAudio({
      recordingId: "quick-alpha"
    });

    expect(result).toMatchObject({
      ok: true,
      recordingId: "quick-alpha",
      filename:
        "metronome-quick-quick-alpha-20260621-090807-quick-alpha.webm",
      mimeType: "audio/webm;codecs=opus",
      sizeBytes: 3
    });
    expect(downloadBlob).toHaveBeenCalledTimes(1);
    expect(downloadBlob.mock.calls[0]?.[0]).toMatchObject({
      filename:
        "metronome-quick-quick-alpha-20260621-090807-quick-alpha.webm"
    });
    expect(downloadBlob.mock.calls[0]?.[0].blob).toBeInstanceOf(Blob);
    expect(downloadBlob.mock.calls[0]?.[0].blob.size).toBe(3);
  });

  it("builds a safe sheet segment filename with label sanitization and the MIME extension", () => {
    const filename = buildRecordingAudioExportFilename(
      createSheetRecording({
        id: "take:sheet/bridge?new",
        sheetName: "Alpha / Etude: No. 1",
        segmentContext: {
          segmentId: "segment-bridge",
          segmentName: "Bridge <A>",
          range: { startMeasure: 1, endMeasure: 4 },
          targetBpm: 96,
          measureGridVersion: "grid",
          measureGridSnapshot: {
            bpm: 96,
            timeSignature: "4/4",
            pickupBeats: 0,
            measureOneOffsetMs: 0
          },
          measureRangeMs: { startMs: 0, endMs: 4_000 }
        },
        createdAt: "2026-06-21T13:05:09",
        mimeType: "audio/ogg;codecs=opus"
      })
    );

    expect(filename).toBe(
      "metronome-sheet-alpha-etude-no-1-bridge-a-20260621-130509-take-sheet-bridge-new.ogg"
    );
    expect(filename).not.toContain("undefined");
    expect(filename).not.toMatch(/[<>:"\\|?*]/);
    expect(filename.slice(0, -4)).not.toContain("/");
  });

  it("builds whole-sheet and missing-sheet filenames without empty label artifacts", () => {
    expect(
      buildRecordingAudioExportFilename(
        createSheetRecording({
          id: "sheet-whole",
          sheetName: "Moonlight Etude",
          segmentContext: null,
          mimeType: "audio/wav"
        })
      )
    ).toMatch(
      /^metronome-sheet-moonlight-etude-whole-sheet-\d{8}-\d{6}-sheet-whole\.wav$/
    );
    expect(
      buildRecordingAudioExportFilename(
        createSheetRecording({
          id: "sheet-missing",
          sheetId: null,
          sheetName: null,
          segmentContext: null,
          mimeType: "audio/webm"
        })
      )
    ).toMatch(/^metronome-sheet-whole-sheet-\d{8}-\d{6}-sheet-missing\.webm$/);
  });

  it("preserves the recording id suffix when an overlong label is truncated", () => {
    const overlongName = "Long descriptive export label ".repeat(12).trim();
    const alphaFilename = buildRecordingAudioExportFilename(
      createQuickRecording({
        id: "recording-alpha",
        name: overlongName
      })
    );
    const betaFilename = buildRecordingAudioExportFilename(
      createQuickRecording({
        id: "recording-beta",
        name: overlongName
      })
    );

    expect(alphaFilename).toMatch(/-recording-alpha\.webm$/);
    expect(betaFilename).toMatch(/-recording-beta\.webm$/);
    expect(alphaFilename).not.toBe(betaFilename);
    expect(alphaFilename.length).toBeLessThanOrEqual(145);
    expect(betaFilename.length).toBeLessThanOrEqual(145);
  });

  it("maps only supported audio MIME types while rejecting unknown audio and non-audio MIME types", () => {
    expect(getAudioExportExtension("audio/webm")).toBe("webm");
    expect(getAudioExportExtension("audio/webm;codecs=opus")).toBe("webm");
    expect(getAudioExportExtension("audio/ogg;codecs=opus")).toBe("ogg");
    expect(getAudioExportExtension("audio/mp4")).toBe("mp4");
    expect(getAudioExportExtension("audio/mpeg")).toBe("mp3");
    expect(getAudioExportExtension("audio/wav")).toBe("wav");
    expect(getAudioExportExtension("audio/x-custom")).toBeNull();
    expect(getAudioExportExtension("application/octet-stream")).toBeNull();
    expect(getAudioExportMimeInfo("audio/webm;codecs=opus")).toEqual({
      mimeType: "audio/webm;codecs=opus",
      extension: "webm"
    });
    expect(getAudioExportMimeInfo("audio/x-custom;codecs=opus")).toBeNull();
  });

  it("returns clear unavailable results without attempting a download", async () => {
    const missingArtifact = createQuickRecording({
      id: "missing-artifact",
      audioDataUrl: null
    });
    const unsupported = createQuickRecording({
      id: "unsupported",
      mimeType: "audio/x-custom"
    });
    const malformed = createQuickRecording({
      id: "malformed",
      audioDataUrl: "not-a-data-url"
    });
    const empty = createQuickRecording({
      id: "empty",
      audioDataUrl: "data:audio/webm;base64,"
    });
    const mismatchedMime = createQuickRecording({
      id: "mismatched-mime",
      mimeType: "audio/wav",
      audioDataUrl: "data:audio/webm;base64,AQID"
    });
    const downloadBlob = vi.fn();
    const service = createRecordingAudioExportService({
      repository: createRepository([
        missingArtifact,
        unsupported,
        malformed,
        empty,
        mismatchedMime
      ]),
      downloadAdapter: { downloadBlob }
    });

    await expect(
      service.exportRecordingAudio({ recordingId: "deleted" })
    ).resolves.toMatchObject({
      ok: false,
      reason: "missing-recording"
    });
    await expect(
      service.exportRecordingAudio({ recordingId: "missing-artifact" })
    ).resolves.toMatchObject({
      ok: false,
      reason: "missing-artifact",
      message: "This recording has no local audio artifact to export."
    });
    await expect(
      service.exportRecordingAudio({ recordingId: "unsupported" })
    ).resolves.toMatchObject({
      ok: false,
      reason: "unsupported-mime",
      message: "This recording artifact is not a supported audio file."
    });
    await expect(
      service.exportRecordingAudio({ recordingId: "malformed" })
    ).resolves.toMatchObject({
      ok: false,
      reason: "invalid-artifact"
    });
    await expect(
      service.exportRecordingAudio({ recordingId: "empty" })
    ).resolves.toMatchObject({
      ok: false,
      reason: "invalid-artifact"
    });
    await expect(
      service.exportRecordingAudio({ recordingId: "mismatched-mime" })
    ).resolves.toMatchObject({
      ok: false,
      reason: "invalid-artifact"
    });
    expect(downloadBlob).not.toHaveBeenCalled();
  });

  it("reports adapter failures as browser download failures", async () => {
    const service = createRecordingAudioExportService({
      repository: createRepository([createQuickRecording()]),
      downloadAdapter: {
        downloadBlob: vi.fn(() => {
          throw new Error("blocked");
        })
      }
    });

    await expect(
      service.exportRecordingAudio({ recordingId: "quick-recording" })
    ).resolves.toMatchObject({
      ok: false,
      reason: "download-failed",
      message: "Audio export could not be started in this browser."
    });
  });

  it("exposes quick eligibility for audio artifacts and disables missing or non-audio artifacts", () => {
    expect(
      getRecordingAudioExportEligibility(
        createQuickRecording({ mimeType: "audio/webm" })
      )
    ).toMatchObject({ available: true, extension: "webm" });
    expect(
      getRecordingAudioExportEligibility(
        createQuickRecording({ mimeType: "audio/webm;codecs=opus" })
      )
    ).toMatchObject({
      available: true,
      extension: "webm",
      mimeType: "audio/webm;codecs=opus"
    });
    expect(
      getRecordingAudioExportEligibility(
        createQuickRecording({ audioDataUrl: "" })
      )
    ).toMatchObject({ available: false, reason: "missing-artifact" });
    expect(
      getRecordingAudioExportEligibility(
        createQuickRecording({ mimeType: "audio/x-custom" })
      )
    ).toMatchObject({ available: false, reason: "unsupported-mime" });
    expect(
      getRecordingAudioExportEligibility(
        createQuickRecording({ mimeType: "text/plain" })
      )
    ).toMatchObject({ available: false, reason: "unsupported-mime" });
  });
});

function createRepository(recordings: ReviewRecording[]) {
  return {
    getRecording(recordingId: string) {
      return (
        recordings.find((recording) => recording.id === recordingId) ?? null
      );
    }
  };
}

function createQuickRecording(
  overrides: Partial<ReviewRecording> = {}
): ReviewRecording {
  return {
    id: "quick-recording",
    type: "quick",
    name: "Quick take",
    sessionId: "session-quick",
    sheetId: null,
    createdAt: "2026-06-21T09:00:00",
    durationMs: 10_000,
    sizeBytes: 128,
    mimeType: "audio/webm",
    audioDataUrl: "data:audio/webm;base64,AQID",
    settings: {
      bpm: 120,
      timeSignature: "4/4"
    },
    ...overrides
  };
}

function createSheetRecording(
  overrides: Partial<ReviewRecording> = {}
): ReviewRecording {
  return {
    id: "sheet-recording",
    type: "sheet",
    name: "Sheet take",
    sessionId: "session-sheet",
    sheetId: "sheet-alpha",
    sheetName: "Alpha Etude",
    createdAt: "2026-06-21T12:00:00",
    durationMs: 12_000,
    sizeBytes: 256,
    mimeType: "audio/webm",
    audioDataUrl: "data:audio/webm;base64,AQID",
    settings: {
      bpm: 96,
      timeSignature: "4/4"
    },
    ...overrides
  };
}
