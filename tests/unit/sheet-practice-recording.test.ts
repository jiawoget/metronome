import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SheetRecordingMetadata } from "@/domain/practice";
import { recordingHistoryRepository, RECORDINGS_STORAGE_KEY } from "@/lib/recordings-review/repository";
import {
  BrowserSheetRecordingService,
  createSheetReviewRecording
} from "@/lib/sheet-practice/recording-service";
import type { RecordingArtifact } from "@/lib/quick-metronome/types";

const settings = {
  bpm: 88,
  timeSignature: "3/4",
  subdivision: "quarter",
  accent: "downbeat",
  countdownBeats: 0
} as const;

const metadata: SheetRecordingMetadata = {
  id: "recording-sheet-1",
  type: "sheet",
  sessionId: "session-new",
  sheetId: "sheet-alpha",
  sheetName: "Alpha Sheet",
  createdAt: "2026-06-22T06:00:00.000Z",
  durationMs: 800,
  bpm: 88,
  timeSignature: "3/4"
};

function createArtifact(overrides: Partial<RecordingArtifact> = {}): RecordingArtifact {
  return {
    blob: new Blob(["audio"], { type: "audio/webm" }),
    dataUrl: "data:audio/webm;base64,UklGRg==",
    durationMs: 812,
    mimeType: "audio/webm",
    sizeBytes: 128,
    analysis: {
      decodedDurationMs: 800,
      sampleRate: 8_000,
      peakAmplitude: 0.75,
      rmsAmplitude: 0.32,
      estimatedFrequencyHz: 440,
      isSilent: false
    },
    ...overrides
  };
}

function installAudioContextMock({ reject = false } = {}) {
  class MockAudioContext {
    async decodeAudioData() {
      if (reject) {
        throw new Error("decode failed");
      }

      return {
        duration: 0.8,
        sampleRate: 8_000,
        getChannelData: () => new Float32Array([0, 0.25, -0.5, 0.75, -0.35, 0.2, -0.1, 0.4])
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

function createCaptureService(artifact = createArtifact()) {
  let active = false;

  return {
    service: {
      get isRecording() {
        return active;
      },
      start: vi.fn(async () => {
        active = true;
      }),
      stop: vi.fn(async () => {
        active = false;
        return artifact;
      })
    },
    isActive: () => active
  };
}

describe("sheet practice recording service", () => {
  beforeEach(() => {
    window.localStorage.removeItem(RECORDINGS_STORAGE_KEY);
    vi.unstubAllGlobals();
    installAudioContextMock();
  });

  it("builds sheet review metadata around a real capture artifact", () => {
    const recording = createSheetReviewRecording({
      metadata,
      artifact: createArtifact(),
      settings,
      trustedPeaks: [0.25, 1]
    });

    expect(recording).toMatchObject({
      id: "recording-sheet-1",
      type: "sheet",
      origin: "user",
      name: "Alpha Sheet take",
      sessionId: "session-new",
      sheetId: "sheet-alpha",
      durationMs: 800,
      sizeBytes: 128,
      mimeType: "audio/webm",
      audioDataUrl: "data:audio/webm;base64,UklGRg==",
      trustedPeaks: [0.25, 1],
      settings: {
        bpm: 88,
        timeSignature: "3/4"
      }
    });
  });

  it("saves a decoded sheet artifact with non-empty trusted peaks and matching metadata duration", async () => {
    const capture = createCaptureService();
    const sessionService = {
      createSheetRecordingMetadata: vi.fn(async () => metadata),
      getRecentSheetSession: vi.fn(async () => null)
    };
    const service = new BrowserSheetRecordingService(capture.service);

    await service.startCapture();
    expect(capture.isActive()).toBe(true);

    const result = await service.stopAndSave({
      sheetId: "sheet-alpha",
      sessionId: "session-new",
      settings,
      forceNewSession: false,
      sessionService
    });

    expect(capture.isActive()).toBe(false);
    expect(sessionService.createSheetRecordingMetadata).toHaveBeenCalledWith({
      sheetId: "sheet-alpha",
      sessionId: "session-new",
      durationMs: 800,
      bpm: 88,
      timeSignature: "3/4",
      forceNewSession: false
    });
    expect(result.artifactDetails.peaks.length).toBeGreaterThan(0);
    expect(result.artifactDetails.peaks.some((peak) => peak > 0)).toBe(true);
    expect(result.recording.durationMs).toBe(800);
    expect(result.recording.trustedPeaks).toEqual(result.artifactDetails.peaks);

    const persisted = recordingHistoryRepository.getRecording("recording-sheet-1");

    expect(persisted).toMatchObject({
      id: "recording-sheet-1",
      type: "sheet",
      sessionId: "session-new",
      sheetId: "sheet-alpha",
      durationMs: 800,
      audioDataUrl: "data:audio/webm;base64,UklGRg=="
    });
    expect(persisted?.trustedPeaks?.length).toBeGreaterThan(0);
  });

  it("rejects silent captures before creating sheet metadata", async () => {
    const capture = createCaptureService(
      createArtifact({
        analysis: {
          decodedDurationMs: 800,
          sampleRate: 8_000,
          peakAmplitude: 0,
          rmsAmplitude: 0,
          estimatedFrequencyHz: null,
          isSilent: true
        }
      })
    );
    const sessionService = {
      createSheetRecordingMetadata: vi.fn(async () => metadata),
      getRecentSheetSession: vi.fn(async () => null)
    };
    const service = new BrowserSheetRecordingService(capture.service);

    await expect(
      service.stopAndSave({
        sheetId: "sheet-alpha",
        sessionId: "session-new",
        settings,
        forceNewSession: false,
        sessionService
      })
    ).rejects.toThrow("audible input");
    expect(sessionService.createSheetRecordingMetadata).not.toHaveBeenCalled();
  });

  it("does not persist sheet metadata or recording history when post-capture decode fails", async () => {
    installAudioContextMock({ reject: true });

    const capture = createCaptureService();
    const sessionService = {
      createSheetRecordingMetadata: vi.fn(async () => metadata),
      getRecentSheetSession: vi.fn(async () => null)
    };
    const service = new BrowserSheetRecordingService(capture.service);

    await expect(
      service.stopAndSave({
        sheetId: "sheet-alpha",
        sessionId: "session-new",
        settings,
        forceNewSession: false,
        sessionService
      })
    ).rejects.toThrow("cannot be decoded");

    expect(sessionService.createSheetRecordingMetadata).not.toHaveBeenCalled();
    expect(recordingHistoryRepository.getSnapshot().recordings).toEqual([]);
  });
});
