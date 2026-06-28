import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PracticeSession, SheetRecordingMetadata, SheetRecordingSegmentContext } from "@/domain/practice";
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
  timeSignature: "3/4",
  segmentContext: null
};

const previousSession: PracticeSession = {
  id: "session-new",
  sourceType: "sheet",
  sheetId: "sheet-alpha",
  startedAt: "2026-06-22T05:59:00.000Z",
  endedAt: null,
  durationMs: 0,
  bpm: 88,
  timeSignature: "3/4",
  recordingCount: 0,
  latestRecordingId: null,
  updatedAt: "2026-06-22T05:59:00.000Z"
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

function createSegmentContext(overrides: Partial<SheetRecordingSegmentContext> = {}): SheetRecordingSegmentContext {
  return {
    segmentId: "segment-alpha",
    segmentName: "Bridge",
    range: {
      startMeasure: 5,
      endMeasure: 12
    },
    targetBpm: 88,
    measureGridVersion: "bpm:88|timeSignature:3/4|pickupBeats:0|measureOneOffsetMs:1000",
    measureGridSnapshot: {
      bpm: 88,
      timeSignature: "3/4",
      pickupBeats: 0,
      measureOneOffsetMs: 1_000
    },
    measureRangeMs: {
      startMs: 9_180,
      endMs: 25_540
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
    const segmentContext = createSegmentContext();
    const recording = createSheetReviewRecording({
      metadata: {
        ...metadata,
        segmentContext
      },
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
      artifactRef: {
        kind: "indexeddb",
        artifactId: "recording-sheet-1",
        storageVersion: 1
      },
      audioDataUrl: null,
      trustedPeaks: [0.25, 1],
      segmentContext,
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
      getRecentSheetSession: vi.fn(async () => previousSession),
      deletePracticeSessionSnapshot: vi.fn(async () => undefined),
      restorePracticeSessionSnapshot: vi.fn(async (session: PracticeSession) => session)
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
      segmentContext: null,
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
      artifactRef: {
        kind: "indexeddb",
        artifactId: "recording-sheet-1",
        storageVersion: 1
      },
      audioDataUrl: null
    });
    expect(persisted?.trustedPeaks?.length).toBeGreaterThan(0);
  });

  it("preserves segment context returned by the session service on final artifact save", async () => {
    const segmentContext = createSegmentContext({ targetBpm: null });
    const metadataWithSegment = {
      ...metadata,
      segmentContext
    };
    const capture = createCaptureService();
    const sessionService = {
      createSheetRecordingMetadata: vi.fn(async () => metadataWithSegment),
      getRecentSheetSession: vi.fn(async () => previousSession),
      deletePracticeSessionSnapshot: vi.fn(async () => undefined),
      restorePracticeSessionSnapshot: vi.fn(async (session: PracticeSession) => session)
    };
    const service = new BrowserSheetRecordingService(capture.service);

    const result = await service.stopAndSave({
      sheetId: "sheet-alpha",
      sessionId: "session-new",
      settings,
      segmentContext,
      forceNewSession: false,
      sessionService
    });

    expect(sessionService.createSheetRecordingMetadata).toHaveBeenCalledWith({
      sheetId: "sheet-alpha",
      sessionId: "session-new",
      durationMs: 800,
      bpm: 88,
      timeSignature: "3/4",
      segmentContext,
      forceNewSession: false
    });
    expect(result.metadata.segmentContext).toEqual(segmentContext);
    expect(result.recording.segmentContext).toEqual(segmentContext);
    expect(recordingHistoryRepository.getRecording("recording-sheet-1")?.segmentContext).toEqual(segmentContext);
  });

  it("preserves review organization and take selection metadata when saving a new sheet recording", async () => {
    const existingRecording = createSheetReviewRecording({
      metadata: {
        ...metadata,
        id: "recording-sheet-existing",
        createdAt: "2026-06-22T05:58:00.000Z"
      },
      artifact: createArtifact(),
      settings
    });
    const takeSelections = [
      {
        groupId: "sheet:sheet-alpha:segment:none",
        sheetId: "sheet-alpha",
        segmentId: null,
        bestRecordingId: existingRecording.id,
        activeRecordingId: existingRecording.id,
        updatedAt: "2026-06-22T05:59:00.000Z"
      }
    ];
    const recordingOrganization = [
      {
        recordingId: existingRecording.id,
        tags: ["Warmup"],
        favorite: true,
        archived: true,
        updatedAt: "2026-06-22T05:59:00.000Z"
      }
    ];
    const capture = createCaptureService();
    const sessionService = {
      createSheetRecordingMetadata: vi.fn(async () => metadata),
      getRecentSheetSession: vi.fn(async () => previousSession),
      deletePracticeSessionSnapshot: vi.fn(async () => undefined),
      restorePracticeSessionSnapshot: vi.fn(async (session: PracticeSession) => session)
    };
    const service = new BrowserSheetRecordingService(capture.service);

    recordingHistoryRepository.saveSnapshot({
      sessions: [previousSession],
      recordings: [existingRecording],
      errorMarkers: [],
      takeSelections,
      recordingOrganization
    });

    await service.stopAndSave({
      sheetId: "sheet-alpha",
      sessionId: "session-new",
      settings,
      forceNewSession: false,
      sessionService
    });

    const snapshot = recordingHistoryRepository.getSnapshot();

    expect(snapshot.recordingOrganization).toEqual(recordingOrganization);
    expect(snapshot.takeSelections).toEqual(takeSelections);
    expect(snapshot.recordings.map((recording) => recording.id)).toEqual([
      "recording-sheet-1",
      existingRecording.id
    ]);
  });

  it("preserves concurrent recording history writes during final sheet save", async () => {
    const concurrentRecording = createSheetReviewRecording({
      metadata: {
        ...metadata,
        id: "recording-sheet-concurrent",
        sessionId: "session-concurrent",
        createdAt: "2026-06-22T05:57:00.000Z"
      },
      artifact: createArtifact(),
      settings
    });
    const capture = createCaptureService();
    const sessionService = {
      createSheetRecordingMetadata: vi.fn(async () => {
        recordingHistoryRepository.saveSnapshot({
          sessions: [{ ...previousSession, id: "session-concurrent" }],
          recordings: [concurrentRecording],
          errorMarkers: []
        });

        return metadata;
      }),
      getRecentSheetSession: vi.fn(async () => previousSession),
      deletePracticeSessionSnapshot: vi.fn(async () => undefined),
      restorePracticeSessionSnapshot: vi.fn(async (session: PracticeSession) => session)
    };
    const service = new BrowserSheetRecordingService(capture.service);

    await service.stopAndSave({
      sheetId: "sheet-alpha",
      sessionId: "session-new",
      settings,
      forceNewSession: false,
      sessionService
    });

    expect(recordingHistoryRepository.getSnapshot().recordings.map((recording) => recording.id)).toEqual([
      "recording-sheet-1",
      "recording-sheet-concurrent"
    ]);
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
      getRecentSheetSession: vi.fn(async () => previousSession),
      deletePracticeSessionSnapshot: vi.fn(async () => undefined),
      restorePracticeSessionSnapshot: vi.fn(async (session: PracticeSession) => session)
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
      getRecentSheetSession: vi.fn(async () => previousSession),
      deletePracticeSessionSnapshot: vi.fn(async () => undefined),
      restorePracticeSessionSnapshot: vi.fn(async (session: PracticeSession) => session)
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

  it("rolls back placeholder metadata and session latest recording when final history save fails", async () => {
    let storedSession: PracticeSession = previousSession;
    const capture = createCaptureService();
    const originalSaveSnapshot = recordingHistoryRepository.saveSnapshot;
    originalSaveSnapshot({
      sessions: [previousSession],
      recordings: [],
      errorMarkers: []
    });
    let saveCallCount = 0;
    const sessionService = {
      getRecentSheetSession: vi.fn(async () => storedSession),
      createSheetRecordingMetadata: vi.fn(async () => {
        const placeholderRecording = createSheetReviewRecording({
          metadata,
          artifact: createArtifact({ sizeBytes: 0, dataUrl: "" }),
          settings
        });

        storedSession = {
          ...previousSession,
          recordingCount: 1,
          latestRecordingId: metadata.id
        };
        originalSaveSnapshot({
          sessions: [storedSession],
          recordings: [placeholderRecording],
          errorMarkers: []
        });

        return metadata;
      }),
      deletePracticeSessionSnapshot: vi.fn(async () => undefined),
      restorePracticeSessionSnapshot: vi.fn(async (session: PracticeSession) => {
        storedSession = session;

        return session;
      })
    };
    const originalMutateSnapshot = recordingHistoryRepository.mutateSnapshot;
    const mutateSnapshotSpy = vi
      .spyOn(recordingHistoryRepository, "mutateSnapshot")
      .mockImplementation((mutate, options) => {
        saveCallCount += 1;

        if (saveCallCount === 1) {
          throw new Error("localStorage setItem failed");
        }

        return originalMutateSnapshot(mutate, options);
      });
    const service = new BrowserSheetRecordingService(capture.service);

    await expect(
      service.stopAndSave({
        sheetId: "sheet-alpha",
        sessionId: "session-new",
        settings,
        forceNewSession: false,
        sessionService
      })
    ).rejects.toThrow("localStorage setItem failed");

    expect(sessionService.createSheetRecordingMetadata).toHaveBeenCalledOnce();
    expect(sessionService.restorePracticeSessionSnapshot).toHaveBeenCalledWith(previousSession);
    expect(sessionService.deletePracticeSessionSnapshot).not.toHaveBeenCalled();
    expect(recordingHistoryRepository.getRecording(metadata.id)).toBeNull();
    expect(recordingHistoryRepository.getSnapshot().sessions).toEqual([previousSession]);
    expect(storedSession).toEqual(previousSession);
    mutateSnapshotSpy.mockRestore();
  });

  it("deletes a newly created session snapshot when final history save fails", async () => {
    let storedSession: PracticeSession | null = null;
    const capture = createCaptureService();
    const originalSaveSnapshot = recordingHistoryRepository.saveSnapshot;
    let saveCallCount = 0;
    const createdSession: PracticeSession = {
      ...previousSession,
      recordingCount: 1,
      latestRecordingId: metadata.id
    };
    const sessionService = {
      getRecentSheetSession: vi.fn(async () => storedSession),
      createSheetRecordingMetadata: vi.fn(async () => {
        const placeholderRecording = createSheetReviewRecording({
          metadata,
          artifact: createArtifact({ sizeBytes: 0, dataUrl: "" }),
          settings
        });

        storedSession = createdSession;
        originalSaveSnapshot({
          sessions: [createdSession],
          recordings: [placeholderRecording],
          errorMarkers: []
        });

        return metadata;
      }),
      deletePracticeSessionSnapshot: vi.fn(async (sessionId: string) => {
        if (storedSession?.id === sessionId) {
          storedSession = null;
        }
      }),
      restorePracticeSessionSnapshot: vi.fn(async (session: PracticeSession) => session)
    };
    const originalMutateSnapshot = recordingHistoryRepository.mutateSnapshot;
    const mutateSnapshotSpy = vi
      .spyOn(recordingHistoryRepository, "mutateSnapshot")
      .mockImplementation((mutate, options) => {
        saveCallCount += 1;

        if (saveCallCount === 1) {
          throw new Error("repository save failed");
        }

        return originalMutateSnapshot(mutate, options);
      });
    const service = new BrowserSheetRecordingService(capture.service);

    await expect(
      service.stopAndSave({
        sheetId: "sheet-alpha",
        sessionId: "session-new",
        settings,
        forceNewSession: false,
        sessionService
      })
    ).rejects.toThrow("repository save failed");

    expect(sessionService.restorePracticeSessionSnapshot).not.toHaveBeenCalled();
    expect(sessionService.deletePracticeSessionSnapshot).toHaveBeenCalledWith(metadata.sessionId);
    expect(recordingHistoryRepository.getSnapshot()).toEqual({
      sessions: [],
      recordings: [],
      errorMarkers: []
    });
    expect(storedSession).toBeNull();
    mutateSnapshotSpy.mockRestore();
  });
});
