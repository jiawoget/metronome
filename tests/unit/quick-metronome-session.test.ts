import { act, cleanup, render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RECORDING_HISTORY_STORAGE_KEY } from "@/infrastructure/storage/storage-contracts";
import {
  validatePracticeSession,
  type PracticeSession
} from "@/domain/practice";
import { QuickMetronomeExperience } from "@/components/quick-metronome/quick-metronome-experience";
import { recordingArtifactRepository } from "@/infrastructure/db/recording-artifact-repository";
import { getDemoQuickRecording } from "@/lib/quick-metronome/demo-recording";
import { quickRecordingController } from "@/lib/quick-metronome/recording-controller";
import { createQuickRecording } from "@/lib/quick-metronome/session";
import { DEFAULT_METRONOME_SETTINGS, type QuickRecording, type RecordingArtifact } from "@/lib/quick-metronome/types";
import { useMetronomeTransport } from "@/lib/quick-metronome/use-metronome-transport";
import { recordingHistoryRepository } from "@/lib/recordings-review/repository";
import {
  createPracticeSessionService,
  type PracticeRecordingMetadataRepository,
  type PracticeSessionRepository
} from "@/services/practice-session";

const quickExperienceMocks = vi.hoisted(() => ({
  metronomeService: {
    onTick: vi.fn(() => () => undefined),
    update: vi.fn(),
    start: vi.fn(),
    stop: vi.fn()
  },
  countdownExecutor: {
    run: vi.fn(() => ({
      cancel: vi.fn()
    }))
  },
  practiceSessionService: {
    ensureQuickSession: vi.fn(),
    linkRecordingToSession: vi.fn(),
    endPracticeSession: vi.fn(),
    restorePracticeSessionSnapshot: vi.fn(),
    deletePracticeSessionSnapshot: vi.fn(),
    updatePracticeSessionDuration: vi.fn(),
    captureSessionEvent: vi.fn()
  },
  recordingService: {
    start: vi.fn(),
    stop: vi.fn()
  }
}));

vi.mock("@/services/metronome/browser", () => ({
  createBrowserMetronomeService: () => quickExperienceMocks.metronomeService,
  createBrowserCountdownExecutor: () => quickExperienceMocks.countdownExecutor
}));

vi.mock("@/services/recording/browser", () => ({
  createBrowserRecordingCaptureService: () => quickExperienceMocks.recordingService
}));

vi.mock("@/services/practice-session/browser", () => ({
  browserPracticeSessionService: quickExperienceMocks.practiceSessionService
}));

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

function saveQuickRecordingForTest(recording: QuickRecording) {
  recordingHistoryRepository.saveQuickRecordingMetadata(recording);

  return {
    ...recording,
    audioDataUrl: null
  };
}

describe("quick metronome recording metadata", () => {
  beforeEach(async () => {
    cleanup();
    vi.clearAllMocks();
    window.localStorage.clear();
    await recordingArtifactRepository.clear().catch(() => undefined);
  });

  it("creates quick recording metadata linked to a session and not to a sheet", () => {
    const session = { id: "session-canonical-quick" };
    const artifact: RecordingArtifact = {
      blob: new Blob(["synthetic audio"]),
      durationMs: 1_245.4,
      mimeType: "audio/webm",
      sizeBytes: 15,
      analysis: {
        decodedDurationMs: 1_230,
        sampleRate: 48_000,
        peakAmplitude: 0.2,
        rmsAmplitude: 0.12,
        estimatedFrequencyHz: 440,
        isSilent: false
      }
    };
    const recording = createQuickRecording({
      artifact,
      session,
      settings: DEFAULT_METRONOME_SETTINGS,
      createdAt: new Date("2026-06-21T08:01:00Z")
    });

    expect(recording.id).toMatch(/^recording_/);
    expect(recording.type).toBe("quick");
    expect(recording.origin).toBe("user");
    expect(recording.sessionId).toBe(session.id);
    expect(recording.sheetId).toBeNull();
    expect(recording.createdAt).toBe("2026-06-21T08:01:00.000Z");
    expect(recording.durationMs).toBe(1_230);
    expect(recording.sizeBytes).toBe(15);
    expect(recording.artifactRef).toEqual({
      kind: "indexeddb",
      artifactId: recording.id,
      storageVersion: 1
    });
    expect(recording.audioDataUrl).toBeNull();
    expect(recording.artifactAnalysis?.estimatedFrequencyHz).toBe(440);
    expect(recording.artifactAnalysis?.isSilent).toBe(false);
  });

  it("rejects a reused recording id instead of repointing artifact metadata", async () => {
    await quickRecordingController.clear();
    const session = { id: "session-canonical-quick" };
    const artifact: RecordingArtifact = {
      blob: new Blob(["synthetic audio"]),
      durationMs: 1_245.4,
      mimeType: "audio/webm",
      sizeBytes: 15,
      analysis: {
        decodedDurationMs: 1_230,
        sampleRate: 48_000,
        peakAmplitude: 0.2,
        rmsAmplitude: 0.12,
        estimatedFrequencyHz: 440,
        isSilent: false
      }
    };
    const recording = createQuickRecording({ artifact, session, settings: DEFAULT_METRONOME_SETTINGS });
    const firstSave = saveQuickRecordingForTest(recording);

    expect(() =>
      saveQuickRecordingForTest({
        ...recording,
        artifactAnalysis: {
          ...recording.artifactAnalysis!,
          decodedDurationMs: 900
        },
        durationMs: 900
      })
    ).toThrow("Recording id collision");

    const snapshot = recordingHistoryRepository.getSnapshot();

    expect(firstSave.id).toBe(recording.id);
    expect(snapshot.recordings).toHaveLength(1);
    expect(snapshot.sessions).toEqual([]);
    expect(snapshot.recordings.find((item) => item.id === recording.id)?.artifactRef).toEqual(
      recording.artifactRef
    );
  });

  it("preserves review organization and take selection metadata when saving a new quick recording", async () => {
    await quickRecordingController.clear();
    const artifact: RecordingArtifact = {
      blob: new Blob(["synthetic audio"]),
      durationMs: 1_245.4,
      mimeType: "audio/webm",
      sizeBytes: 15,
      analysis: {
        decodedDurationMs: 1_230,
        sampleRate: 48_000,
        peakAmplitude: 0.2,
        rmsAmplitude: 0.12,
        estimatedFrequencyHz: 440,
        isSilent: false
      }
    };
    const existingRecording = createQuickRecording({
      artifact,
      session: { id: "session-existing-quick" },
      settings: DEFAULT_METRONOME_SETTINGS,
      createdAt: new Date("2026-06-21T08:01:00Z")
    });
    const newRecording = createQuickRecording({
      artifact,
      session: { id: "session-new-quick" },
      settings: DEFAULT_METRONOME_SETTINGS,
      createdAt: new Date("2026-06-21T08:02:00Z")
    });
    const takeSelections = [
      {
        groupId: "sheet:sheet-alpha:segment:none",
        sheetId: "sheet-alpha",
        segmentId: null,
        bestRecordingId: "recording-sheet-best",
        activeRecordingId: "recording-sheet-active",
        updatedAt: "2026-06-21T08:00:00.000Z"
      }
    ];
    const recordingOrganization = [
      {
        recordingId: existingRecording.id,
        tags: ["Warmup"],
        favorite: true,
        archived: true,
        updatedAt: "2026-06-21T08:00:00.000Z"
      }
    ];

    window.localStorage.setItem(
      RECORDING_HISTORY_STORAGE_KEY,
      JSON.stringify({
        sessions: [],
        recordings: [existingRecording],
        errorMarkers: [],
        takeSelections,
        recordingOrganization,
        futureSnapshotField: { preserve: true }
      })
    );

    saveQuickRecordingForTest(newRecording);

    const persisted = JSON.parse(window.localStorage.getItem(RECORDING_HISTORY_STORAGE_KEY) ?? "{}");

    expect(persisted.recordingOrganization).toEqual(recordingOrganization);
    expect(persisted.takeSelections).toEqual(takeSelections);
    expect(persisted.futureSnapshotField).toEqual({ preserve: true });
    expect(persisted.recordings.map((recording: { id: string }) => recording.id)).toEqual([
      newRecording.id,
      existingRecording.id
    ]);
  });

  it("rolls back quick metadata written before a session link failure without restoring stale snapshots", async () => {
    await quickRecordingController.clear();
    const artifact: RecordingArtifact = {
      blob: new Blob(["synthetic audio"]),
      durationMs: 1_245.4,
      mimeType: "audio/webm",
      sizeBytes: 15,
      analysis: null
    };
    const recording = createQuickRecording({
      artifact,
      session: { id: "session-new-quick" },
      settings: DEFAULT_METRONOME_SETTINGS,
      createdAt: new Date("2026-06-21T08:02:00Z")
    });

    saveQuickRecordingForTest(recording);
    window.localStorage.setItem(
      RECORDING_HISTORY_STORAGE_KEY,
      JSON.stringify({
        sessions: [],
        recordings: [
          ...recordingHistoryRepository
            .getSnapshot()
            .recordings.filter((item) => item.id !== recording.id),
          recordingHistoryRepository.getSnapshot().recordings.find(
            (item) => item.id === recording.id
          ),
          createStoredQuickRecording({
            id: "concurrent-quick",
            sessionId: "session-concurrent"
          })
        ].filter(Boolean),
        errorMarkers: [],
        futureSnapshotField: { preserve: true }
      })
    );

    recordingHistoryRepository.deleteQuickRecordingMetadataByIdentity({
      recordingId: recording.id,
      sessionId: recording.sessionId,
      createdAt: recording.createdAt
    });

    const persisted = JSON.parse(window.localStorage.getItem(RECORDING_HISTORY_STORAGE_KEY) ?? "{}");

    expect(persisted.recordings.map((item: { id: string }) => item.id)).toEqual([
      "concurrent-quick"
    ]);
    expect(persisted.futureSnapshotField).toEqual({ preserve: true });
  });

  it("restores practice-session metadata when failure happens after quick session link", async () => {
    await quickRecordingController.clear();
    const sessions = new Map<string, PracticeSession>();
    const captureSessionEvent = vi.fn(async () => null);
    const repository: PracticeSessionRepository = {
      async listSessions() {
        return [...sessions.values()];
      },
      async getSession(sessionId) {
        return sessions.get(sessionId) ?? null;
      },
      async getRecentSession() {
        return [...sessions.values()][0] ?? null;
      },
      async getRecentSheetSession() {
        return null;
      },
      async saveSession(session) {
        sessions.set(session.id, validatePracticeSession(session));
      },
      async deleteSession(sessionId) {
        sessions.delete(sessionId);
      },
      async clear() {
        sessions.clear();
      }
    };
    const recordingRepository: PracticeRecordingMetadataRepository = {
      async listRecordingMetadata() {
        return [];
      },
      async listRecordingMetadataForSession() {
        return [];
      },
      async saveRecordingMetadata() {
        return undefined;
      },
      async clear() {
        return undefined;
      }
    };
    const sessionService = createPracticeSessionService({
      repository,
      recordingRepository,
      sheetGateway: {
        async getSheetContext() {
          return null;
        },
        async updateLastPracticedAt() {
          return undefined;
        }
      },
      now: () => new Date("2026-06-21T08:03:00.000Z"),
      createId: () => "session-quick"
    });
    const previousSession = await sessionService.ensureQuickSession({
      trigger: "recording",
      bpm: 96,
      timeSignature: "4/4"
    });
    const artifact: RecordingArtifact = {
      blob: new Blob(["synthetic audio"]),
      durationMs: 1_245.4,
      mimeType: "audio/webm",
      sizeBytes: 15,
      analysis: null
    };
    await expect(
      quickRecordingController.saveCapturedQuickRecording({
        artifact,
        session: previousSession,
        settings: DEFAULT_METRONOME_SETTINGS,
        isPlaying: false,
        sessionService: {
          linkRecordingToSession: sessionService.linkRecordingToSession,
          endPracticeSession: async () => {
            throw new Error("end failed");
          },
          restorePracticeSessionSnapshot:
            sessionService.restorePracticeSessionSnapshot,
          deletePracticeSessionSnapshot:
            sessionService.deletePracticeSessionSnapshot,
          captureSessionEvent
        }
      })
    ).rejects.toThrow("end failed");

    expect(captureSessionEvent).not.toHaveBeenCalled();
    expect(recordingHistoryRepository.getSnapshot().recordings).toEqual([]);
    await expect(sessionService.getRecentSession()).resolves.toMatchObject({
      id: previousSession.id,
      recordingCount: 0,
      latestRecordingId: null
    });
  });

  it("rolls back recording metadata, artifact, and linked session through the UI stop flow when ending the session fails", async () => {
    const user = userEvent.setup();
    const previousSession: PracticeSession = {
      id: "session-ui-quick",
      sourceType: "quick",
      sheetId: null,
      startedAt: "2026-06-21T08:00:00.000Z",
      endedAt: null,
      durationMs: 0,
      bpm: 96,
      timeSignature: "4/4",
      recordingCount: 0,
      latestRecordingId: null,
      updatedAt: "2026-06-21T08:00:00.000Z",
      segmentContext: null
    };
    const artifact: RecordingArtifact = {
      blob: new Blob(["synthetic audio"], { type: "audio/webm" }),
      durationMs: 1_245.4,
      mimeType: "audio/webm",
      sizeBytes: 15,
      analysis: {
        decodedDurationMs: 1_230,
        sampleRate: 48_000,
        peakAmplitude: 0.2,
        rmsAmplitude: 0.12,
        estimatedFrequencyHz: 440,
        isSilent: false
      }
    };
    let storedSession = previousSession;
    let linkedRecordingId: string | null = null;

    quickExperienceMocks.recordingService.start.mockResolvedValue(undefined);
    quickExperienceMocks.recordingService.stop.mockResolvedValue(artifact);
    quickExperienceMocks.practiceSessionService.ensureQuickSession.mockResolvedValue(
      previousSession
    );
    quickExperienceMocks.practiceSessionService.linkRecordingToSession.mockImplementation(
      async ({ recordingId }: { recordingId?: string | null }) => {
        if (!recordingId) {
          return null;
        }

        linkedRecordingId = recordingId;
        storedSession = {
          ...previousSession,
          recordingCount: 1,
          latestRecordingId: recordingId,
          updatedAt: "2026-06-21T08:01:00.000Z"
        };

        return storedSession;
      }
    );
    quickExperienceMocks.practiceSessionService.endPracticeSession.mockRejectedValue(
      new Error("end failed")
    );
    quickExperienceMocks.practiceSessionService.restorePracticeSessionSnapshot.mockImplementation(
      async (session: PracticeSession) => {
        storedSession = session;

        return session;
      }
    );
    quickExperienceMocks.practiceSessionService.deletePracticeSessionSnapshot.mockResolvedValue(
      undefined
    );

    render(createElement(QuickMetronomeExperience));

    await user.click(screen.getByRole("button", { name: "Start recording" }));
    await waitFor(() => {
      expect(quickExperienceMocks.recordingService.start).toHaveBeenCalledOnce();
    });

    const stopRecordingButton = screen.getByRole("button", {
      name: "Stop recording"
    });

    await waitFor(() => {
      expect(stopRecordingButton).toBeEnabled();
    });
    await user.click(stopRecordingButton);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("end failed");
    });

    expect(linkedRecordingId).toMatch(/^recording_/);
    expect(quickExperienceMocks.practiceSessionService.linkRecordingToSession).toHaveBeenCalledWith({
      sessionId: previousSession.id,
      recordingId: linkedRecordingId
    });
    expect(quickExperienceMocks.practiceSessionService.endPracticeSession).toHaveBeenCalledWith(
      previousSession.id
    );
    expect(
      quickExperienceMocks.practiceSessionService.restorePracticeSessionSnapshot
    ).toHaveBeenCalledWith(previousSession);
    expectNoCaptureKind(
      quickExperienceMocks.practiceSessionService.captureSessionEvent,
      "recording_stopped"
    );
    expect(storedSession).toEqual(previousSession);
    expect(recordingHistoryRepository.getSnapshot().recordings).toEqual([]);
    await expect(
      recordingArtifactRepository.getArtifact(linkedRecordingId!)
    ).resolves.toBeNull();
  });

  it("captures quick metronome events only after successful start and stop transitions", async () => {
    const user = userEvent.setup();
    const session: PracticeSession = {
      id: "session-quick",
      sourceType: "quick",
      sheetId: null,
      startedAt: "2026-06-21T08:00:00.000Z",
      endedAt: null,
      durationMs: 0,
      bpm: 96,
      timeSignature: "4/4",
      recordingCount: 0,
      latestRecordingId: null,
      updatedAt: "2026-06-21T08:00:00.000Z",
      segmentContext: null
    };

    quickExperienceMocks.practiceSessionService.ensureQuickSession.mockResolvedValue(session);
    quickExperienceMocks.practiceSessionService.endPracticeSession.mockResolvedValue({
      ...session,
      endedAt: "2026-06-21T08:00:05.000Z",
      durationMs: 5_000
    });

    render(createElement(QuickMetronomeExperience));

    await user.click(screen.getByRole("button", { name: "Start metronome" }));
    await waitFor(() => {
      expect(screen.getByText("Metronome playing.")).toBeVisible();
    });
    expect(quickExperienceMocks.practiceSessionService.captureSessionEvent).toHaveBeenCalledWith({
      sessionId: "session-quick",
      kind: "metronome_started"
    });

    await user.click(screen.getByRole("button", { name: "Stop metronome" }));

    await waitFor(() => {
      expect(quickExperienceMocks.practiceSessionService.endPracticeSession).toHaveBeenCalledWith(
        "session-quick"
      );
    });
    expect(quickExperienceMocks.practiceSessionService.captureSessionEvent).toHaveBeenCalledWith({
      sessionId: "session-quick",
      kind: "metronome_stopped"
    });
  });

  it("settles visible stop state when ending the quick session rejects", async () => {
    const user = userEvent.setup();
    const session: PracticeSession = {
      id: "session-quick-end-fail",
      sourceType: "quick",
      sheetId: null,
      startedAt: "2026-06-21T08:00:00.000Z",
      endedAt: null,
      durationMs: 0,
      bpm: 96,
      timeSignature: "4/4",
      recordingCount: 0,
      latestRecordingId: null,
      updatedAt: "2026-06-21T08:00:00.000Z",
      segmentContext: null
    };

    quickExperienceMocks.practiceSessionService.ensureQuickSession.mockResolvedValue(session);
    quickExperienceMocks.practiceSessionService.endPracticeSession.mockRejectedValueOnce(
      new Error("end unavailable")
    );

    render(createElement(QuickMetronomeExperience));

    await user.click(screen.getByRole("button", { name: "Start metronome" }));
    await waitFor(() => {
      expect(screen.getByText("Metronome playing.")).toBeVisible();
    });

    await user.click(screen.getByRole("button", { name: "Stop metronome" }));

    await waitFor(() => {
      expect(screen.getByText("Metronome stopped.")).toBeVisible();
    });
    expect(screen.getByRole("alert")).toHaveTextContent("end unavailable");
    expect(quickExperienceMocks.practiceSessionService.endPracticeSession).toHaveBeenCalledWith(
      "session-quick-end-fail"
    );
    expect(quickExperienceMocks.practiceSessionService.captureSessionEvent).toHaveBeenCalledWith({
      sessionId: "session-quick-end-fail",
      kind: "metronome_stopped"
    });
  });

  it("keeps recording-active stop state settled when quick duration update rejects", async () => {
    const user = userEvent.setup();
    const session: PracticeSession = {
      id: "session-quick-duration-fail",
      sourceType: "quick",
      sheetId: null,
      startedAt: "2026-06-21T08:00:00.000Z",
      endedAt: null,
      durationMs: 0,
      bpm: 96,
      timeSignature: "4/4",
      recordingCount: 0,
      latestRecordingId: null,
      updatedAt: "2026-06-21T08:00:00.000Z",
      segmentContext: null
    };

    quickExperienceMocks.recordingService.start.mockResolvedValue(undefined);
    quickExperienceMocks.practiceSessionService.ensureQuickSession.mockResolvedValue(session);
    quickExperienceMocks.practiceSessionService.updatePracticeSessionDuration.mockRejectedValueOnce(
      new Error("duration unavailable")
    );

    render(createElement(QuickMetronomeExperience));

    await user.click(screen.getByRole("button", { name: "Start recording" }));
    await waitFor(() => {
      expect(screen.getByText("Recording without metronome.")).toBeVisible();
    });

    await user.click(screen.getByRole("button", { name: "Start metronome" }));
    await waitFor(() => {
      expect(screen.getByText("Metronome playing.")).toBeVisible();
    });

    await user.click(screen.getByRole("button", { name: "Stop metronome" }));

    await waitFor(() => {
      expect(
        screen.getByText("Metronome stopped; recording is still active.")
      ).toBeVisible();
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "duration unavailable"
    );
    expect(
      quickExperienceMocks.practiceSessionService.updatePracticeSessionDuration
    ).toHaveBeenCalledWith("session-quick-duration-fail");
    expect(quickExperienceMocks.practiceSessionService.endPracticeSession).not.toHaveBeenCalled();
  });

  it("does not capture quick metronome start when playback start fails", async () => {
    const user = userEvent.setup();
    const session: PracticeSession = {
      id: "session-quick",
      sourceType: "quick",
      sheetId: null,
      startedAt: "2026-06-21T08:00:00.000Z",
      endedAt: null,
      durationMs: 0,
      bpm: 96,
      timeSignature: "4/4",
      recordingCount: 0,
      latestRecordingId: null,
      updatedAt: "2026-06-21T08:00:00.000Z",
      segmentContext: null
    };

    quickExperienceMocks.practiceSessionService.ensureQuickSession.mockResolvedValue(session);
    quickExperienceMocks.metronomeService.start.mockRejectedValueOnce(
      new Error("Tone unavailable")
    );

    render(createElement(QuickMetronomeExperience));

    await user.click(screen.getByRole("button", { name: "Start metronome" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Tone unavailable");
    });
    expect(
      quickExperienceMocks.practiceSessionService.captureSessionEvent
    ).not.toHaveBeenCalledWith(
      expect.objectContaining({ kind: "metronome_started" })
    );
  });

  it("does not capture quick metronome_stopped when the stop transition fails", async () => {
    const captureSessionEvent = vi.fn(
      async (input: { sessionId: string; kind: string }) => {
        void input;
      }
    );
    const metronomeService = {
      update: vi.fn(),
      start: vi.fn(async () => undefined),
      stop: vi.fn((): void => {
        throw new Error("Tone stop unavailable");
      })
    };
    const { result, unmount } = renderHook(() =>
      useMetronomeTransport({
        settings: DEFAULT_METRONOME_SETTINGS,
        metronomeService,
        onStopped: () =>
          captureSessionEvent({
            sessionId: "session-quick",
            kind: "metronome_stopped"
          })
      })
    );

    await act(async () => {
      await result.current.startMetronome();
    });
    await act(async () => {
      await expect(result.current.stopMetronome()).rejects.toThrow(
        "Tone stop unavailable"
      );
    });

    expectNoCaptureKind(captureSessionEvent, "metronome_stopped");
    metronomeService.stop.mockImplementation((): void => undefined);
    unmount();
  });

  it("captures recording start after microphone capture starts and a quick session exists", async () => {
    const user = userEvent.setup();
    const session: PracticeSession = {
      id: "session-recording",
      sourceType: "quick",
      sheetId: null,
      startedAt: "2026-06-21T08:00:00.000Z",
      endedAt: null,
      durationMs: 0,
      bpm: 96,
      timeSignature: "4/4",
      recordingCount: 0,
      latestRecordingId: null,
      updatedAt: "2026-06-21T08:00:00.000Z",
      segmentContext: null
    };

    quickExperienceMocks.recordingService.start.mockResolvedValue(undefined);
    quickExperienceMocks.practiceSessionService.ensureQuickSession.mockResolvedValue(session);

    render(createElement(QuickMetronomeExperience));

    await user.click(screen.getByRole("button", { name: "Start recording" }));

    await waitFor(() => {
      expect(screen.getByText("Recording without metronome.")).toBeVisible();
    });
    expect(quickExperienceMocks.practiceSessionService.captureSessionEvent).toHaveBeenCalledWith({
      sessionId: "session-recording",
      kind: "recording_started"
    });

    cleanup();
    vi.clearAllMocks();
    quickExperienceMocks.recordingService.start.mockRejectedValueOnce(
      new Error("microphone unavailable")
    );

    render(createElement(QuickMetronomeExperience));
    await user.click(screen.getByRole("button", { name: "Start recording" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Recording failed before it could start."
      );
    });
    expect(
      quickExperienceMocks.practiceSessionService.captureSessionEvent
    ).not.toHaveBeenCalledWith(
      expect.objectContaining({ kind: "recording_started" })
    );
  });

  it("captures recording_stopped after a quick recording save and session close succeed", async () => {
    await quickRecordingController.clear();
    const artifact: RecordingArtifact = {
      blob: new Blob(["synthetic audio"]),
      durationMs: 1_245.4,
      mimeType: "audio/webm",
      sizeBytes: 15,
      analysis: null
    };
    const session: PracticeSession = {
      id: "session-quick-save",
      sourceType: "quick",
      sheetId: null,
      startedAt: "2026-06-21T08:00:00.000Z",
      endedAt: null,
      durationMs: 0,
      bpm: 96,
      timeSignature: "4/4",
      recordingCount: 0,
      latestRecordingId: null,
      updatedAt: "2026-06-21T08:00:00.000Z",
      segmentContext: null
    };
    let savedRecordingId: string | null = null;
    const linkRecordingToSession = vi.fn(async ({ recordingId }: { recordingId?: string | null }) => {
      savedRecordingId = recordingId ?? null;

      return {
        ...session,
        recordingCount: 1,
        latestRecordingId: savedRecordingId,
        updatedAt: "2026-06-21T08:00:02.000Z"
      };
    });
    const endPracticeSession = vi.fn(async () => ({
      ...session,
      endedAt: "2026-06-21T08:00:03.000Z",
      durationMs: 3_000,
      recordingCount: 1,
      latestRecordingId: savedRecordingId,
      updatedAt: "2026-06-21T08:00:03.000Z"
    }));
    const captureSessionEvent = vi.fn(async () => null);

    const result = await quickRecordingController.saveCapturedQuickRecording({
      artifact,
      session,
      settings: DEFAULT_METRONOME_SETTINGS,
      isPlaying: false,
      sessionService: {
        linkRecordingToSession,
        endPracticeSession,
        restorePracticeSessionSnapshot: vi.fn(async (value: PracticeSession) => value),
        deletePracticeSessionSnapshot: vi.fn(async () => undefined),
        captureSessionEvent
      }
    });

    expect(result.recording.id).toBe(savedRecordingId);
    expect(linkRecordingToSession).toHaveBeenCalledWith({
      sessionId: "session-quick-save",
      recordingId: savedRecordingId
    });
    expect(endPracticeSession).toHaveBeenCalledWith("session-quick-save");
    expect(captureSessionEvent).toHaveBeenCalledWith({
      sessionId: "session-quick-save",
      kind: "recording_stopped",
      recordingId: savedRecordingId
    });
    expect(captureSessionEvent.mock.invocationCallOrder[0]).toBeGreaterThan(
      endPracticeSession.mock.invocationCallOrder[0]
    );
  });

  it("clears only quick recordings and explicitly quick unreferenced sessions", async () => {
    const quickRecording = createStoredQuickRecording({
      id: "quick-recording",
      sessionId: "quick-session"
    });
    const sheetRecording = {
      ...quickRecording,
      id: "sheet-recording",
      type: "sheet",
      sessionId: "sheet-session",
      sheetId: "sheet-alpha"
    };
    const ambiguousQuickRecording = createStoredQuickRecording({
      id: "ambiguous-linked-recording",
      sessionId: "ambiguous-session"
    });
    const takeSelections = [
      {
        groupId: "sheet:sheet-alpha:segment:none",
        sheetId: "sheet-alpha",
        segmentId: null,
        bestRecordingId: "sheet-recording",
        activeRecordingId: "sheet-recording",
        updatedAt: "2026-06-21T08:00:00.000Z"
      }
    ];
    const recordingOrganization = [
      {
        recordingId: "sheet-recording",
        tags: ["Keep"],
        favorite: true,
        archived: false,
        updatedAt: "2026-06-21T08:00:00.000Z"
      }
    ];

    window.localStorage.setItem(
      RECORDING_HISTORY_STORAGE_KEY,
      JSON.stringify({
        sessions: [
          { id: "quick-session", sourceType: "quick" },
          { id: "sheet-session", sourceType: "sheet", sheetId: "sheet-alpha" },
          { id: "ambiguous-session" },
          { id: "future-session", sourceType: "quick" }
        ],
        recordings: [quickRecording, sheetRecording, ambiguousQuickRecording],
        errorMarkers: [
          { id: "quick-marker", recordingId: "quick-recording", timestampMs: 10, note: null },
          { id: "sheet-marker", recordingId: "sheet-recording", timestampMs: 10, note: null }
        ],
        takeSelections,
        recordingOrganization,
        futureSnapshotField: { preserve: true }
      })
    );

    await quickRecordingController.clear();

    const persisted = JSON.parse(window.localStorage.getItem(RECORDING_HISTORY_STORAGE_KEY) ?? "{}");

    expect(persisted.recordings).toEqual([sheetRecording]);
    expect(persisted.sessions).toEqual([
      { id: "sheet-session", sourceType: "sheet", sheetId: "sheet-alpha" },
      { id: "ambiguous-session" }
    ]);
    expect(persisted.errorMarkers).toEqual([
      { id: "sheet-marker", recordingId: "sheet-recording", timestampMs: 10, note: null }
    ]);
    expect(persisted.takeSelections).toEqual(takeSelections);
    expect(persisted.recordingOrganization).toEqual(recordingOrganization);
    expect(persisted.futureSnapshotField).toEqual({ preserve: true });
  });

  it("provides a clearly marked playable demo recording without claiming it is a user take", () => {
    const demoRecording = getDemoQuickRecording();
    const base64Payload = demoRecording.audioDataUrl!.replace(/^data:audio\/wav;base64,/, "");
    const wavBytes = Buffer.from(base64Payload, "base64");

    expect(demoRecording.type).toBe("quick");
    expect(demoRecording.origin).toBe("demo");
    expect(demoRecording.id).toContain("demo");
    expect(demoRecording.audioDataUrl).toMatch(/^data:audio\/wav;base64,/);
    expect(demoRecording.sizeBytes).toBeGreaterThan(1_000);
    expect(wavBytes.subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(wavBytes.subarray(8, 12).toString("ascii")).toBe("WAVE");
    expect(wavBytes.subarray(12, 16).toString("ascii")).toBe("fmt ");
    expect(wavBytes.readUInt16LE(20)).toBe(1);
    expect(wavBytes.readUInt16LE(22)).toBe(1);
    expect(wavBytes.readUInt32LE(24)).toBe(8_000);
    expect(wavBytes.subarray(36, 40).toString("ascii")).toBe("data");
    expect(wavBytes.readUInt32LE(40)).toBe(16_000);
    expect(demoRecording.artifactAnalysis?.estimatedFrequencyHz).toBe(440);
    expect(demoRecording.artifactAnalysis?.isSilent).toBe(false);
    expect(demoRecording.sheetId).toBeNull();
  });
});

function createStoredQuickRecording(overrides: Partial<QuickRecording> = {}) {
  const artifact: RecordingArtifact = {
    blob: new Blob(["synthetic audio"]),
    durationMs: 1_245.4,
    mimeType: "audio/webm",
    sizeBytes: 15,
    analysis: null
  };

  const recording = createQuickRecording({
    artifact,
    session: { id: "quick-session" },
    settings: DEFAULT_METRONOME_SETTINGS,
    createdAt: new Date("2026-06-21T08:01:00Z")
  });

  return {
    ...recording,
    ...overrides
  };
}
