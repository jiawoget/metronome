import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PracticeSession, SheetRecordingMetadata, SheetRecordingSegmentContext } from "@/domain/practice";
import {
  recordingHistoryRepository,
  RECORDINGS_STORAGE_KEY,
  seedRecordingHistoryForTests
} from "@/lib/recordings-review/repository";
import {
  BrowserSheetRecordingService,
  createSheetReviewRecording
} from "@/lib/sheet-practice/recording-service";
import type { RecordingArtifact } from "@/lib/quick-metronome/types";
import { recordingArtifactRepository } from "@/infrastructure/db/recording-artifact-repository";
import { installAudioContextMock } from "./fixtures/audio-context";

const settings = {
  bpm: 88,
  timeSignature: "3/4",
  subdivision: "quarter",
  accent: "downbeat",
  countdownBeats: 0
} as const;

const sheetRecordingAudioSamples = new Float32Array([
  0,
  0.25,
  -0.5,
  0.75,
  -0.35,
  0.2,
  -0.1,
  0.4
]);

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

function expectNoCaptureKind(
  captureSessionEvent: { mock: { calls: unknown[][] } },
  kind: string
) {
  expect(
    captureSessionEvent.mock.calls.filter(
      ([input]) =>
        typeof input === "object" &&
        input !== null &&
        "kind" in input &&
        input.kind === kind
    )
  ).toEqual([]);
}

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

function createPreparedSessionService({
  preparedMetadata = metadata,
  preparedSession = {
    ...previousSession,
    recordingCount: 1,
    latestRecordingId: preparedMetadata.id
  },
  previous = previousSession,
  onPrepare,
  onCommit
}: {
  preparedMetadata?: SheetRecordingMetadata;
  preparedSession?: PracticeSession;
  previous?: PracticeSession | null;
  onPrepare?: () => void;
  onCommit?: () => void;
} = {}) {
  return {
    prepareSheetRecordingMetadata: vi.fn(async () => {
      onPrepare?.();

      return {
        metadata: preparedMetadata,
        session: preparedSession
      };
    }),
    commitPreparedSheetRecordingSession: vi.fn(async () => {
      onCommit?.();
    }),
    captureSessionEvent: vi.fn(async () => null),
    getRecentSheetSession: vi.fn(async () => previous),
    deletePracticeSessionSnapshot: vi.fn(async (sessionId: string) => {
      void sessionId;
    }),
    restorePracticeSessionSnapshot: vi.fn(async (session: PracticeSession) => session)
  };
}

describe("sheet practice recording service", () => {
  beforeEach(async () => {
    window.localStorage.removeItem(RECORDINGS_STORAGE_KEY);
    await recordingArtifactRepository.clear().catch(() => undefined);
    vi.unstubAllGlobals();
    installAudioContextMock({
      durationSeconds: 0.8,
      samples: sheetRecordingAudioSamples
    });
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
    const sessionService = createPreparedSessionService();
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
    expect(sessionService.prepareSheetRecordingMetadata).toHaveBeenCalledWith({
      sheetId: "sheet-alpha",
      sessionId: "session-new",
      durationMs: 800,
      bpm: 88,
      timeSignature: "3/4",
      segmentContext: null,
      forceNewSession: false
    });
    expect(sessionService.commitPreparedSheetRecordingSession).toHaveBeenCalledOnce();
    expect(sessionService.captureSessionEvent).toHaveBeenCalledWith({
      sessionId: "session-new",
      kind: "recording_stopped",
      sheetId: "sheet-alpha",
      segmentId: null,
      recordingId: "recording-sheet-1"
    });
    expect(sessionService.captureSessionEvent.mock.invocationCallOrder[0]).toBeGreaterThan(
      sessionService.commitPreparedSheetRecordingSession.mock.invocationCallOrder[0]
    );
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
    await expect(
      recordingArtifactRepository.getArtifact("sheet-recording-draft")
    ).resolves.toBeNull();
  });

  it("decodes sheet captures from the Blob without relying on artifact dataUrl", async () => {
    const capture = createCaptureService(
      createArtifact({
        dataUrl: "not-a-data-url"
      })
    );
    const sessionService = createPreparedSessionService();
    const service = new BrowserSheetRecordingService(capture.service);

    const result = await service.stopAndSave({
      sheetId: "sheet-alpha",
      sessionId: "session-new",
      settings,
      forceNewSession: false,
      sessionService
    });
    const persisted = recordingHistoryRepository.getRecording("recording-sheet-1");

    expect(result.artifactDetails.recordingId).toBe("recording-sheet-1");
    expect(result.artifactDetails.peaks.some((peak) => peak > 0)).toBe(true);
    expect(persisted).toMatchObject({
      artifactRef: {
        kind: "indexeddb",
        artifactId: "recording-sheet-1",
        storageVersion: 1
      },
      audioDataUrl: null
    });
  });

  it("does not fail a completed sheet save when event capture rejects", async () => {
    const capture = createCaptureService();
    const sessionService = createPreparedSessionService();
    sessionService.captureSessionEvent.mockRejectedValueOnce(
      new Error("event sink unavailable")
    );
    const service = new BrowserSheetRecordingService(capture.service);

    const result = await service.stopAndSave({
      sheetId: "sheet-alpha",
      sessionId: "session-new",
      settings,
      forceNewSession: false,
      sessionService
    });

    expect(result.metadata.id).toBe("recording-sheet-1");
    expect(sessionService.commitPreparedSheetRecordingSession).toHaveBeenCalledOnce();
    expect(sessionService.captureSessionEvent).toHaveBeenCalledOnce();
    expect(recordingHistoryRepository.getRecording("recording-sheet-1")).toMatchObject({
      id: "recording-sheet-1",
      sessionId: "session-new"
    });
  });

  it("preserves segment context returned by the session service on final artifact save", async () => {
    const segmentContext = createSegmentContext({ targetBpm: null });
    const metadataWithSegment = {
      ...metadata,
      segmentContext
    };
    const capture = createCaptureService();
    const sessionService = createPreparedSessionService({
      preparedMetadata: metadataWithSegment
    });
    const service = new BrowserSheetRecordingService(capture.service);

    const result = await service.stopAndSave({
      sheetId: "sheet-alpha",
      sessionId: "session-new",
      settings,
      segmentContext,
      forceNewSession: false,
      sessionService
    });

    expect(sessionService.prepareSheetRecordingMetadata).toHaveBeenCalledWith({
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
    expect(sessionService.captureSessionEvent).toHaveBeenCalledWith({
      sessionId: "session-new",
      kind: "recording_stopped",
      sheetId: "sheet-alpha",
      segmentId: "segment-alpha",
      recordingId: "recording-sheet-1"
    });
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
    const sessionService = createPreparedSessionService();
    const service = new BrowserSheetRecordingService(capture.service);

    seedRecordingHistoryForTests({
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
    const sessionService = createPreparedSessionService({
      onPrepare: () => {
        seedRecordingHistoryForTests({
          sessions: [{ ...previousSession, id: "session-concurrent" }],
          recordings: [concurrentRecording],
          errorMarkers: []
        });
      }
    });
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
    const sessionService = createPreparedSessionService();
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
    expect(sessionService.prepareSheetRecordingMetadata).not.toHaveBeenCalled();
    expectNoCaptureKind(sessionService.captureSessionEvent, "recording_stopped");
  });

  it("does not persist sheet metadata or recording history when post-capture decode fails", async () => {
    installAudioContextMock({
      durationSeconds: 0.8,
      samples: sheetRecordingAudioSamples,
      reject: true
    });

    const capture = createCaptureService();
    const sessionService = createPreparedSessionService();
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

    expect(sessionService.prepareSheetRecordingMetadata).not.toHaveBeenCalled();
    expectNoCaptureKind(sessionService.captureSessionEvent, "recording_stopped");
    expect(recordingHistoryRepository.getSnapshot().recordings).toEqual([]);
  });

  it("does not create sheet metadata when artifact save fails", async () => {
    const capture = createCaptureService();
    const sessionService = createPreparedSessionService();
    const saveArtifactSpy = vi
      .spyOn(recordingArtifactRepository, "saveArtifact")
      .mockRejectedValueOnce(new Error("IndexedDB unavailable"));
    const service = new BrowserSheetRecordingService(capture.service);

    await expect(
      service.stopAndSave({
        sheetId: "sheet-alpha",
        sessionId: "session-new",
        settings,
        forceNewSession: false,
        sessionService
      })
    ).rejects.toThrow("unavailable");

    expect(sessionService.prepareSheetRecordingMetadata).toHaveBeenCalledOnce();
    expect(sessionService.commitPreparedSheetRecordingSession).not.toHaveBeenCalled();
    expectNoCaptureKind(sessionService.captureSessionEvent, "recording_stopped");
    expect(recordingHistoryRepository.getRecording(metadata.id)).toBeNull();
    expect(recordingHistoryRepository.getSnapshot().recordings).toEqual([]);
    saveArtifactSpy.mockRestore();
  });

  it("rolls back artifact and session state when final history save fails", async () => {
    let storedSession: PracticeSession = previousSession;
    const capture = createCaptureService();
    const originalSaveSnapshot = seedRecordingHistoryForTests;
    originalSaveSnapshot({
      sessions: [previousSession],
      recordings: [],
      errorMarkers: []
    });
    let saveCallCount = 0;
    const sessionService = createPreparedSessionService({
      previous: storedSession,
      preparedSession: {
        ...previousSession,
        recordingCount: 1,
        latestRecordingId: metadata.id
      },
      onCommit: () => {
        storedSession = {
          ...previousSession,
          recordingCount: 1,
          latestRecordingId: metadata.id
        };
      }
    });
    sessionService.getRecentSheetSession.mockImplementation(async () => storedSession);
    sessionService.restorePracticeSessionSnapshot.mockImplementation(async (session: PracticeSession) => {
        storedSession = session;

        return session;
      });
    const originalSaveSheetRecordingMetadataWithSession =
      recordingHistoryRepository.saveSheetRecordingMetadataWithSession;
    const saveSheetRecordingMetadataWithSessionSpy = vi
      .spyOn(recordingHistoryRepository, "saveSheetRecordingMetadataWithSession")
      .mockImplementation((input) => {
        saveCallCount += 1;

        if (saveCallCount === 1) {
          throw new Error("localStorage setItem failed");
        }

        return originalSaveSheetRecordingMetadataWithSession(input);
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

    expect(sessionService.prepareSheetRecordingMetadata).toHaveBeenCalledOnce();
    expect(sessionService.commitPreparedSheetRecordingSession).not.toHaveBeenCalled();
    expectNoCaptureKind(sessionService.captureSessionEvent, "recording_stopped");
    expect(sessionService.restorePracticeSessionSnapshot).toHaveBeenCalledWith(previousSession);
    expect(sessionService.deletePracticeSessionSnapshot).not.toHaveBeenCalled();
    expect(recordingHistoryRepository.getRecording(metadata.id)).toBeNull();
    expect(recordingHistoryRepository.getSnapshot().sessions).toEqual([previousSession]);
    await expect(
      recordingArtifactRepository.getArtifact(metadata.id)
    ).resolves.toBeNull();
    expect(storedSession).toEqual(previousSession);
    saveSheetRecordingMetadataWithSessionSpy.mockRestore();
  });

  it("deletes a newly created session snapshot when final history save fails", async () => {
    let storedSession: PracticeSession | null = null;
    const capture = createCaptureService();
    let saveCallCount = 0;
    const createdSession: PracticeSession = {
      ...previousSession,
      recordingCount: 1,
      latestRecordingId: metadata.id
    };
    const sessionService = createPreparedSessionService({
      previous: storedSession,
      preparedSession: createdSession,
      onCommit: () => {
        storedSession = createdSession;
      }
    });
    sessionService.getRecentSheetSession.mockImplementation(async () => storedSession);
    sessionService.deletePracticeSessionSnapshot.mockImplementation(async (sessionId: string) => {
        if (storedSession?.id === sessionId) {
          storedSession = null;
        }
      });
    const originalSaveSheetRecordingMetadataWithSession =
      recordingHistoryRepository.saveSheetRecordingMetadataWithSession;
    const saveSheetRecordingMetadataWithSessionSpy = vi
      .spyOn(recordingHistoryRepository, "saveSheetRecordingMetadataWithSession")
      .mockImplementation((input) => {
        saveCallCount += 1;

        if (saveCallCount === 1) {
          throw new Error("repository save failed");
        }

        return originalSaveSheetRecordingMetadataWithSession(input);
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
    expectNoCaptureKind(sessionService.captureSessionEvent, "recording_stopped");
    expect(recordingHistoryRepository.getSnapshot()).toEqual({
      sessions: [],
      recordings: [],
      errorMarkers: []
    });
    await expect(
      recordingArtifactRepository.getArtifact(metadata.id)
    ).resolves.toBeNull();
    expect(storedSession).toBeNull();
    saveSheetRecordingMetadataWithSessionSpy.mockRestore();
  });

  it("cleans artifact and metadata when prepared session commit fails", async () => {
    const capture = createCaptureService();
    const sessionService = createPreparedSessionService({
      onCommit: () => {
        throw new Error("session commit failed");
      }
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
    ).rejects.toThrow("session commit failed");

    expect(recordingHistoryRepository.getRecording(metadata.id)).toBeNull();
    expectNoCaptureKind(sessionService.captureSessionEvent, "recording_stopped");
    await expect(
      recordingArtifactRepository.getArtifact(metadata.id)
    ).resolves.toBeNull();
    expect(sessionService.restorePracticeSessionSnapshot).toHaveBeenCalledWith(previousSession);
  });
});
