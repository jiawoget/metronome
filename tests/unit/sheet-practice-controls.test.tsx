import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createSheetPracticeControlInitialState,
  createSheetPracticeMetronomeSettings,
  formatUnsupportedTimeSignatureMessage
} from "@/components/sheet-practice/controls/practice-control-state";
import { SheetPracticeControls } from "@/components/sheet-practice/controls/sheet-practice-controls";
import {
  createSheetRecordingSegmentContext,
  createPracticeSegmentGridAssociation,
  type MeasureGrid,
  type PracticeSegment,
  type PracticeSession,
  type SheetRecordingMetadata
} from "@/domain/practice";
import type { MeasureGridService } from "@/services/measure-grid";
import type { PracticeSegmentService } from "@/services/practice-segments";
import type { PracticeSessionService } from "@/services/practice-session";
import {
  BrowserMetronomeService,
  METRONOME_TRACE_EVENT,
  type MetronomeTraceEventDetail,
  type ToneMetronomeAdapter,
  type ToneMetronomeTrigger,
  type ToneScheduledCallback
} from "@/lib/quick-metronome/metronome-service";
import { DEFAULT_METRONOME_SETTINGS } from "@/lib/quick-metronome/types";
import {
  initialSheetPracticeRecordingWorkflowState,
  useSheetPracticeRecordingWorkflowStore
} from "@/stores/sheet-practice-recording-workflow-store";
import type { SheetPracticeRecordingService } from "@/components/sheet-practice/controls/types";

function createFakeToneAdapter() {
  const callbacks: ToneScheduledCallback[] = [];
  const triggers: ToneMetronomeTrigger[] = [];
  const adapter: ToneMetronomeAdapter = {
    now: vi.fn(() => 0),
    start: vi.fn(async () => undefined),
    scheduleRepeat: vi.fn((callback) => {
      callbacks.push(callback);

      return callbacks.length;
    }),
    startTransport: vi.fn(),
    stopTransport: vi.fn(),
    cancelTransport: vi.fn(),
    clear: vi.fn(),
    trigger: vi.fn((trigger) => {
      triggers.push(trigger);
    }),
    dispose: vi.fn()
  };

  return { adapter, callbacks, triggers };
}

function createIdleSessionService() {
  return {
    ensureSheetSession: vi.fn(async () => null),
    restorePracticeSessionSnapshot: vi.fn(async (session: PracticeSession) => session),
    deletePracticeSessionSnapshot: vi.fn(async () => undefined),
    updateSheetSessionDuration: vi.fn(async () => null),
    endPracticeSession: vi.fn(async () => null),
    createSheetRecordingMetadata: vi.fn(async () => null),
    getRecentSession: vi.fn(async () => null),
    getRecentSheetSession: vi.fn(async () => null),
    listRecordingMetadata: vi.fn(async () => []),
    subscribe: vi.fn(() => () => undefined)
  } satisfies Pick<
    PracticeSessionService,
    | "ensureSheetSession"
    | "restorePracticeSessionSnapshot"
    | "deletePracticeSessionSnapshot"
    | "updateSheetSessionDuration"
    | "endPracticeSession"
    | "createSheetRecordingMetadata"
    | "getRecentSession"
    | "getRecentSheetSession"
    | "listRecordingMetadata"
    | "subscribe"
  >;
}

function createSheetSession(overrides: Partial<PracticeSession> = {}): PracticeSession {
  return {
    id: "session-alpha",
    sourceType: "sheet",
    sheetId: "sheet-alpha",
    startedAt: "2026-06-21T12:00:00.000Z",
    endedAt: null,
    durationMs: 0,
    bpm: 72,
    timeSignature: "4/4",
    recordingCount: 0,
    latestRecordingId: null,
    updatedAt: "2026-06-21T12:00:00.000Z",
    ...overrides
  };
}

function createMeasureGridService(grid: MeasureGrid | null = null) {
  return {
    getGrid: vi.fn(async () => grid),
    saveGrid: vi.fn(async (_sheetId: string, nextGrid: MeasureGrid) => nextGrid),
    clearGrid: vi.fn(async () => undefined)
  } satisfies MeasureGridService;
}

function createTestGrid(overrides: Partial<MeasureGrid> = {}): MeasureGrid {
  return {
    bpm: 96,
    timeSignature: "4/4",
    pickupBeats: 0,
    measureOneOffsetMs: 1_000,
    ...overrides
  };
}

function createTestSegment(
  overrides: Partial<Omit<PracticeSegment, "grid">> & { grid?: PracticeSegment["grid"] } = {}
): PracticeSegment {
  const grid = createTestGrid();

  return {
    id: "segment-alpha",
    sheetId: "sheet-alpha",
    name: "Opening phrase",
    range: {
      startMeasure: 5,
      endMeasure: 12
    },
    targetBpm: 96,
    notes: null,
    grid: createPracticeSegmentGridAssociation(grid),
    ...overrides
  };
}

function createPracticeSegmentService(segments: PracticeSegment[] = []) {
  const segmentsBySheet = new Map<string, Map<string, PracticeSegment>>();

  for (const segment of segments) {
    const sheetSegments = segmentsBySheet.get(segment.sheetId) ?? new Map<string, PracticeSegment>();
    sheetSegments.set(segment.id, segment);
    segmentsBySheet.set(segment.sheetId, sheetSegments);
  }

  return {
    listSegments: vi.fn(async (sheetId) => Array.from(segmentsBySheet.get(sheetId)?.values() ?? [])),
    getSegment: vi.fn(async (sheetId, segmentId) => segmentsBySheet.get(sheetId)?.get(segmentId) ?? null),
    saveSegment: vi.fn(async (segment: PracticeSegment) => {
      const sheetSegments = segmentsBySheet.get(segment.sheetId) ?? new Map<string, PracticeSegment>();
      sheetSegments.set(segment.id, segment);
      segmentsBySheet.set(segment.sheetId, sheetSegments);

      return segment;
    }),
    deleteSegment: vi.fn(async (sheetId, segmentId) => {
      segmentsBySheet.get(sheetId)?.delete(segmentId);
    })
  } satisfies PracticeSegmentService;
}

function resetRecordingWorkflowStore() {
  useSheetPracticeRecordingWorkflowStore.setState({
    ...initialSheetPracticeRecordingWorkflowState,
    rerecord: {
      ...initialSheetPracticeRecordingWorkflowState.rerecord
    }
  });
}

function createSavedRecordingMetadata(overrides: Partial<SheetRecordingMetadata> = {}): SheetRecordingMetadata {
  return {
    id: "recording-alpha",
    type: "sheet",
    sessionId: "session-alpha",
    sheetId: "sheet-alpha",
    sheetName: "Alpha",
    createdAt: "2026-06-21T12:01:00.000Z",
    durationMs: 800,
    bpm: 72,
    timeSignature: "4/4",
    segmentContext: null,
    ...overrides
  };
}

function createInspectableSheetRecordingService({
  recordingIds = ["recording-alpha"],
  startCapture
}: {
  recordingIds?: string[];
  startCapture?: () => Promise<void>;
} = {}) {
  let active = false;
  let saveIndex = 0;
  let latestRecording: ReturnType<SheetPracticeRecordingService["getLatestSheetRecording"]> = null;
  const baseRecording = {
    id: "recording-alpha",
    type: "sheet" as const,
    origin: "user" as const,
    name: "Alpha take",
    sessionId: "session-alpha",
    sheetId: "sheet-alpha",
    sheetName: "Alpha",
    createdAt: "2026-06-21T12:01:00.000Z",
    durationMs: 800,
    sizeBytes: 128,
    mimeType: "audio/webm",
    audioDataUrl: "data:audio/webm;base64,UklGRg==",
    trustedPeaks: [0.2, 0.8],
    settings: {
      bpm: 72,
      timeSignature: "4/4" as const
    }
  };
  const service: SheetPracticeRecordingService = {
    get isRecording() {
      return active;
    },
    startCapture: vi.fn(async () => {
      if (startCapture) {
        await startCapture();
      }
      active = true;
    }),
    discardCapture: vi.fn(async () => {
      active = false;
    }),
    stopAndSave: vi.fn(async (input) => {
      active = false;
      const recordingId =
        recordingIds[Math.min(saveIndex, recordingIds.length - 1)] ??
        `recording-${saveIndex + 1}`;
      saveIndex += 1;
      const metadata = createSavedRecordingMetadata({
        id: recordingId,
        segmentContext: input.segmentContext ?? null
      });
      latestRecording = {
        ...baseRecording,
        id: recordingId,
        segmentContext: input.segmentContext ?? null
      };

      return {
        metadata,
        recording: latestRecording,
        artifactDetails: {
          recordingId,
          decodedDurationMs: 800,
          metadataDurationMs: 800,
          durationDifferenceMs: 0,
          durationWarning: null,
          peaks: [0.2, 0.8],
          source: "trusted-peaks" as const
        }
      };
    }),
    getLatestSheetRecording: vi.fn(() => latestRecording),
    subscribe: vi.fn(() => () => undefined)
  };

  return { service, isActive: () => active };
}

describe("sheet practice controls segment recording context", () => {
  beforeEach(() => {
    resetRecordingWorkflowStore();
  });

  it("passes the selected segment context to recording save metadata", async () => {
    const user = userEvent.setup();
    const grid: MeasureGrid = {
      bpm: 96,
      timeSignature: "4/4",
      pickupBeats: 0,
      measureOneOffsetMs: 1_000
    };
    const segment: PracticeSegment = {
      id: "segment-alpha",
      sheetId: "sheet-alpha",
      name: "Opening phrase",
      range: {
        startMeasure: 5,
        endMeasure: 12
      },
      targetBpm: 96,
      notes: null,
      grid: createPracticeSegmentGridAssociation(grid)
    };
    const session = createSheetSession();
    const sessionService = {
      ...createIdleSessionService(),
      ensureSheetSession: vi.fn(async () => session),
      getRecentSheetSession: vi.fn(async () => session)
    };
    const segmentService = createPracticeSegmentService([segment]);
    const recordingService = createInspectableSheetRecordingService();

    render(
      <SheetPracticeControls
        sheetId="sheet-alpha"
        sheetName="Alpha"
        defaultBpm={72}
        defaultTimeSignature="4/4"
        createSheetRecordingService={() => recordingService.service}
        sessionService={sessionService}
        measureGridService={createMeasureGridService(grid)}
        practiceSegmentService={segmentService}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Opening phrase")).toBeVisible();
    });
    await user.click(screen.getByTestId("practice-segment-row-segment-alpha"));
    await user.click(screen.getByRole("button", { name: "Start recording" }));
    await waitFor(() => {
      expect(screen.getByTestId("sheet-recording-state")).toHaveTextContent("active");
    });
    await user.click(screen.getByRole("button", { name: "Stop recording" }));

    await waitFor(() => {
      expect(recordingService.service.stopAndSave).toHaveBeenCalledOnce();
    });
    expect(segmentService.getSegment).toHaveBeenCalledWith("sheet-alpha", "segment-alpha");
    expect(recordingService.service.stopAndSave).toHaveBeenCalledWith(
      expect.objectContaining({
        sheetId: "sheet-alpha",
        sessionId: "session-alpha",
        segmentContext: createSheetRecordingSegmentContext(segment)
      })
    );
    expect(screen.getByText("Recording saved for Opening phrase.")).toBeVisible();
    expect(useSheetPracticeRecordingWorkflowStore.getState()).toMatchObject({
      sheetId: "sheet-alpha",
      activeSegmentId: "segment-alpha",
      status: "idle",
      error: null,
      rerecord: {
        status: "ready",
        source: {
          recordingId: "recording-alpha",
          sheetId: "sheet-alpha",
          segmentContext: createSheetRecordingSegmentContext(segment)
        },
        unavailableReason: null,
        error: null
      }
    });
  });

  it("records again through the existing save path with the same segment context and a new recording id", async () => {
    const user = userEvent.setup();
    const grid = createTestGrid();
    const segment = createTestSegment();
    const expectedContext = createSheetRecordingSegmentContext(segment);
    const session = createSheetSession();
    const sessionService = {
      ...createIdleSessionService(),
      ensureSheetSession: vi.fn(async () => session),
      getRecentSheetSession: vi.fn(async () => session)
    };
    const segmentService = createPracticeSegmentService([segment]);
    const recordingService = createInspectableSheetRecordingService({
      recordingIds: ["recording-alpha", "recording-beta"]
    });

    render(
      <SheetPracticeControls
        sheetId="sheet-alpha"
        sheetName="Alpha"
        defaultBpm={72}
        defaultTimeSignature="4/4"
        createSheetRecordingService={() => recordingService.service}
        sessionService={sessionService}
        measureGridService={createMeasureGridService(grid)}
        practiceSegmentService={segmentService}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Opening phrase")).toBeVisible();
    });
    await user.click(screen.getByTestId("practice-segment-row-segment-alpha"));
    await user.click(screen.getByRole("button", { name: "Start recording" }));
    await waitFor(() => {
      expect(screen.getByTestId("sheet-recording-state")).toHaveTextContent("active");
    });
    await user.click(screen.getByRole("button", { name: "Stop recording" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Record again" })).toBeEnabled();
    });
    expect(useSheetPracticeRecordingWorkflowStore.getState().rerecord.source?.recordingId).toBe(
      "recording-alpha"
    );

    await user.click(screen.getByRole("button", { name: "Record again" }));

    await waitFor(() => {
      expect(screen.getByText("Recording again for Opening phrase.")).toBeVisible();
    });
    expect(screen.getByTestId("sheet-recording-state")).toHaveTextContent("active");
    expect(screen.queryByRole("button", { name: "Record again" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Stop recording" }));

    await waitFor(() => {
      expect(recordingService.service.stopAndSave).toHaveBeenCalledTimes(2);
    });
    expect(recordingService.service.stopAndSave).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        segmentContext: expectedContext
      })
    );
    expect(recordingService.service.stopAndSave).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        segmentContext: expectedContext
      })
    );
    expect(useSheetPracticeRecordingWorkflowStore.getState()).toMatchObject({
      sheetId: "sheet-alpha",
      activeSegmentId: "segment-alpha",
      status: "idle",
      rerecord: {
        status: "ready",
        source: {
          recordingId: "recording-beta",
          sheetId: "sheet-alpha",
          segmentContext: expectedContext
        }
      }
    });
    expect(recordingService.service.startCapture).toHaveBeenCalledTimes(2);
  });

  it("prevents rapid double-start for Record again", async () => {
    const user = userEvent.setup();
    const grid = createTestGrid();
    const segment = createTestSegment();
    const session = createSheetSession();
    const sessionService = {
      ...createIdleSessionService(),
      ensureSheetSession: vi.fn(async () => session),
      getRecentSheetSession: vi.fn(async () => session)
    };
    const segmentService = createPracticeSegmentService([segment]);
    let releaseRepeatStart: () => void = () => undefined;
    const repeatStartGate = new Promise<void>((resolve) => {
      releaseRepeatStart = resolve;
    });
    const gatedStartCapture = vi.fn(async () => {
      if (gatedStartCapture.mock.calls.length > 1) {
        await repeatStartGate;
      }
    });
    const recordingService = createInspectableSheetRecordingService({
      startCapture: gatedStartCapture
    });

    render(
      <SheetPracticeControls
        sheetId="sheet-alpha"
        sheetName="Alpha"
        defaultBpm={72}
        defaultTimeSignature="4/4"
        createSheetRecordingService={() => recordingService.service}
        sessionService={sessionService}
        measureGridService={createMeasureGridService(grid)}
        practiceSegmentService={segmentService}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Opening phrase")).toBeVisible();
    });
    await user.click(screen.getByTestId("practice-segment-row-segment-alpha"));
    await user.click(screen.getByRole("button", { name: "Start recording" }));
    await waitFor(() => {
      expect(screen.getByTestId("sheet-recording-state")).toHaveTextContent("active");
    });
    await user.click(screen.getByRole("button", { name: "Stop recording" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Record again" })).toBeEnabled();
    });

    const recordAgainButton = screen.getByRole("button", { name: "Record again" });
    void user.click(recordAgainButton);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Record again" })).toBeDisabled();
    });
    await user.click(recordAgainButton);

    expect(recordingService.service.startCapture).toHaveBeenCalledTimes(2);
    releaseRepeatStart();
    await waitFor(() => {
      expect(screen.getByTestId("sheet-recording-state")).toHaveTextContent("active");
    });
  });

  it("passes null context when no segment is selected", async () => {
    const user = userEvent.setup();
    const session = createSheetSession();
    const sessionService = {
      ...createIdleSessionService(),
      ensureSheetSession: vi.fn(async () => session),
      getRecentSheetSession: vi.fn(async () => session)
    };
    const segmentService = createPracticeSegmentService();
    const recordingService = createInspectableSheetRecordingService();

    render(
      <SheetPracticeControls
        sheetId="sheet-alpha"
        sheetName="Alpha"
        defaultBpm={72}
        defaultTimeSignature="4/4"
        createSheetRecordingService={() => recordingService.service}
        sessionService={sessionService}
        measureGridService={createMeasureGridService(null)}
        practiceSegmentService={segmentService}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("practice-segment-selector-status")).toHaveTextContent("0 saved");
    });
    await user.click(screen.getByRole("button", { name: "Start recording" }));
    await waitFor(() => {
      expect(screen.getByTestId("sheet-recording-state")).toHaveTextContent("active");
    });
    await user.click(screen.getByRole("button", { name: "Stop recording" }));

    await waitFor(() => {
      expect(recordingService.service.stopAndSave).toHaveBeenCalledOnce();
    });
    expect(segmentService.getSegment).not.toHaveBeenCalled();
    expect(recordingService.service.stopAndSave).toHaveBeenCalledWith(
      expect.objectContaining({
        segmentContext: null
      })
    );
    expect(screen.getByText("Recording saved.")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Record again" })).not.toBeInTheDocument();
    expect(useSheetPracticeRecordingWorkflowStore.getState()).toMatchObject({
      sheetId: "sheet-alpha",
      activeSegmentId: null,
      status: "idle",
      error: null,
      rerecord: {
        status: "unavailable",
        source: null,
        unavailableReason: "no-segment-context",
        error: null
      }
    });
  });

  it("invalidates Record again when selection changes and keeps normal recording available", async () => {
    const user = userEvent.setup();
    const grid = createTestGrid();
    const openingSegment = createTestSegment();
    const bridgeSegment = createTestSegment({
      id: "segment-beta",
      name: "Bridge",
      range: {
        startMeasure: 13,
        endMeasure: 16
      }
    });
    const session = createSheetSession();
    const sessionService = {
      ...createIdleSessionService(),
      ensureSheetSession: vi.fn(async () => session),
      getRecentSheetSession: vi.fn(async () => session)
    };
    const segmentService = createPracticeSegmentService([openingSegment, bridgeSegment]);
    const recordingService = createInspectableSheetRecordingService();

    render(
      <SheetPracticeControls
        sheetId="sheet-alpha"
        sheetName="Alpha"
        defaultBpm={72}
        defaultTimeSignature="4/4"
        createSheetRecordingService={() => recordingService.service}
        sessionService={sessionService}
        measureGridService={createMeasureGridService(grid)}
        practiceSegmentService={segmentService}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Opening phrase")).toBeVisible();
      expect(screen.getByText("Bridge")).toBeVisible();
    });
    await user.click(screen.getByTestId("practice-segment-row-segment-alpha"));
    await user.click(screen.getByRole("button", { name: "Start recording" }));
    await waitFor(() => {
      expect(screen.getByTestId("sheet-recording-state")).toHaveTextContent("active");
    });
    await user.click(screen.getByRole("button", { name: "Stop recording" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Record again" })).toBeEnabled();
    });

    await user.click(screen.getByTestId("practice-segment-row-segment-beta"));

    expect(screen.queryByRole("button", { name: "Record again" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start recording" })).toBeEnabled();
    expect(useSheetPracticeRecordingWorkflowStore.getState()).toMatchObject({
      activeSegmentId: "segment-beta",
      rerecord: {
        status: "invalid",
        source: null,
        unavailableReason: "selection-changed"
      }
    });
  });

  it("does not start Record again when the source segment is missing", async () => {
    const user = userEvent.setup();
    const grid = createTestGrid();
    const segment = createTestSegment();
    const session = createSheetSession();
    const sessionService = {
      ...createIdleSessionService(),
      ensureSheetSession: vi.fn(async () => session),
      getRecentSheetSession: vi.fn(async () => session)
    };
    const segmentService = createPracticeSegmentService([segment]);
    const recordingService = createInspectableSheetRecordingService();

    render(
      <SheetPracticeControls
        sheetId="sheet-alpha"
        sheetName="Alpha"
        defaultBpm={72}
        defaultTimeSignature="4/4"
        createSheetRecordingService={() => recordingService.service}
        sessionService={sessionService}
        measureGridService={createMeasureGridService(grid)}
        practiceSegmentService={segmentService}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Opening phrase")).toBeVisible();
    });
    await user.click(screen.getByTestId("practice-segment-row-segment-alpha"));
    await user.click(screen.getByRole("button", { name: "Start recording" }));
    await waitFor(() => {
      expect(screen.getByTestId("sheet-recording-state")).toHaveTextContent("active");
    });
    await user.click(screen.getByRole("button", { name: "Stop recording" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Record again" })).toBeEnabled();
    });

    vi.mocked(segmentService.getSegment).mockResolvedValueOnce(null);
    await user.click(screen.getByRole("button", { name: "Record again" }));

    await waitFor(() => {
      expect(screen.getByText("Record again is not available for this segment.")).toBeVisible();
    });
    expect(recordingService.service.startCapture).toHaveBeenCalledTimes(1);
    expect(useSheetPracticeRecordingWorkflowStore.getState()).toMatchObject({
      activeSegmentId: null,
      status: "error",
      rerecord: {
        status: "invalid",
        source: null,
        unavailableReason: "source-segment-missing"
      }
    });
  });

  it("handles Record again permission denial without stale ready or saving state", async () => {
    const user = userEvent.setup();
    const grid = createTestGrid();
    const segment = createTestSegment();
    const session = createSheetSession();
    const sessionService = {
      ...createIdleSessionService(),
      ensureSheetSession: vi.fn(async () => session),
      getRecentSheetSession: vi.fn(async () => session)
    };
    const segmentService = createPracticeSegmentService([segment]);
    const recordingService = createInspectableSheetRecordingService();

    render(
      <SheetPracticeControls
        sheetId="sheet-alpha"
        sheetName="Alpha"
        defaultBpm={72}
        defaultTimeSignature="4/4"
        createSheetRecordingService={() => recordingService.service}
        sessionService={sessionService}
        measureGridService={createMeasureGridService(grid)}
        practiceSegmentService={segmentService}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Opening phrase")).toBeVisible();
    });
    await user.click(screen.getByTestId("practice-segment-row-segment-alpha"));
    await user.click(screen.getByRole("button", { name: "Start recording" }));
    await waitFor(() => {
      expect(screen.getByTestId("sheet-recording-state")).toHaveTextContent("active");
    });
    await user.click(screen.getByRole("button", { name: "Stop recording" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Record again" })).toBeEnabled();
    });

    vi.mocked(recordingService.service.startCapture).mockRejectedValueOnce(
      new Error("Microphone access was denied.")
    );
    await user.click(screen.getByRole("button", { name: "Record again" }));

    await waitFor(() => {
      expect(screen.getByText("Microphone access was denied.")).toBeVisible();
    });
    expect(recordingService.service.stopAndSave).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("sheet-recording-state")).toHaveTextContent("stopped");
    expect(useSheetPracticeRecordingWorkflowStore.getState()).toMatchObject({
      activeSegmentId: "segment-alpha",
      status: "error",
      rerecord: {
        status: "unavailable",
        source: null,
        unavailableReason: "no-source-recording"
      }
    });
  });

  it("handles Record again save failure without marking a new source", async () => {
    const user = userEvent.setup();
    const grid = createTestGrid();
    const segment = createTestSegment();
    const session = createSheetSession();
    const sessionService = {
      ...createIdleSessionService(),
      ensureSheetSession: vi.fn(async () => session),
      getRecentSheetSession: vi.fn(async () => session)
    };
    const segmentService = createPracticeSegmentService([segment]);
    const recordingService = createInspectableSheetRecordingService({
      recordingIds: ["recording-alpha", "recording-beta"]
    });

    render(
      <SheetPracticeControls
        sheetId="sheet-alpha"
        sheetName="Alpha"
        defaultBpm={72}
        defaultTimeSignature="4/4"
        createSheetRecordingService={() => recordingService.service}
        sessionService={sessionService}
        measureGridService={createMeasureGridService(grid)}
        practiceSegmentService={segmentService}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Opening phrase")).toBeVisible();
    });
    await user.click(screen.getByTestId("practice-segment-row-segment-alpha"));
    await user.click(screen.getByRole("button", { name: "Start recording" }));
    await waitFor(() => {
      expect(screen.getByTestId("sheet-recording-state")).toHaveTextContent("active");
    });
    await user.click(screen.getByRole("button", { name: "Stop recording" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Record again" })).toBeEnabled();
    });

    vi.mocked(recordingService.service.stopAndSave).mockRejectedValueOnce(
      new Error("Repeat save failed.")
    );
    await user.click(screen.getByRole("button", { name: "Record again" }));
    await waitFor(() => {
      expect(screen.getByTestId("sheet-recording-state")).toHaveTextContent("active");
    });
    await user.click(screen.getByRole("button", { name: "Stop recording" }));

    await waitFor(() => {
      expect(screen.getByText("Repeat save failed.")).toBeVisible();
    });
    expect(useSheetPracticeRecordingWorkflowStore.getState()).toMatchObject({
      activeSegmentId: "segment-alpha",
      status: "error",
      rerecord: {
        status: "unavailable",
        source: null,
        unavailableReason: "no-source-recording"
      }
    });
  });

  it("preserves active segment and clears rerecord readiness when save fails", async () => {
    const user = userEvent.setup();
    const grid: MeasureGrid = {
      bpm: 96,
      timeSignature: "4/4",
      pickupBeats: 0,
      measureOneOffsetMs: 1_000
    };
    const segment: PracticeSegment = {
      id: "segment-alpha",
      sheetId: "sheet-alpha",
      name: "Opening phrase",
      range: {
        startMeasure: 5,
        endMeasure: 12
      },
      targetBpm: 96,
      notes: null,
      grid: createPracticeSegmentGridAssociation(grid)
    };
    const session = createSheetSession();
    const sessionService = {
      ...createIdleSessionService(),
      ensureSheetSession: vi.fn(async () => session),
      getRecentSheetSession: vi.fn(async () => session)
    };
    const segmentService = createPracticeSegmentService([segment]);
    const recordingService = createInspectableSheetRecordingService();

    vi.mocked(recordingService.service.stopAndSave).mockRejectedValueOnce(
      new Error("Recording write failed.")
    );

    render(
      <SheetPracticeControls
        sheetId="sheet-alpha"
        sheetName="Alpha"
        defaultBpm={72}
        defaultTimeSignature="4/4"
        createSheetRecordingService={() => recordingService.service}
        sessionService={sessionService}
        measureGridService={createMeasureGridService(grid)}
        practiceSegmentService={segmentService}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Opening phrase")).toBeVisible();
    });
    await user.click(screen.getByTestId("practice-segment-row-segment-alpha"));
    await user.click(screen.getByRole("button", { name: "Start recording" }));
    await waitFor(() => {
      expect(screen.getByTestId("sheet-recording-state")).toHaveTextContent("active");
    });
    await user.click(screen.getByRole("button", { name: "Stop recording" }));

    await waitFor(() => {
      expect(screen.getByText("Recording write failed.")).toBeVisible();
    });
    expect(recordingService.service.stopAndSave).toHaveBeenCalledWith(
      expect.objectContaining({
        segmentContext: createSheetRecordingSegmentContext(segment)
      })
    );
    expect(useSheetPracticeRecordingWorkflowStore.getState()).toMatchObject({
      sheetId: "sheet-alpha",
      activeSegmentId: "segment-alpha",
      status: "error",
      error: "Recording write failed.",
      rerecord: {
        status: "unavailable",
        source: null,
        unavailableReason: "no-source-recording"
      }
    });
  });

  it("blocks save without stopping capture when the selected segment context is invalid", async () => {
    const user = userEvent.setup();
    const grid: MeasureGrid = {
      bpm: 96,
      timeSignature: "4/4",
      pickupBeats: 0,
      measureOneOffsetMs: 1_000
    };
    const invalidSegment = {
      id: "segment-invalid",
      sheetId: "sheet-alpha",
      name: "Invalid timing",
      range: {
        startMeasure: 5,
        endMeasure: 12
      },
      targetBpm: 96,
      notes: null,
      grid: {
        measureGridVersion: "",
        measureGridSnapshot: grid
      }
    } as PracticeSegment;
    const session = createSheetSession();
    const sessionService = {
      ...createIdleSessionService(),
      ensureSheetSession: vi.fn(async () => session),
      getRecentSheetSession: vi.fn(async () => session)
    };
    const segmentService = createPracticeSegmentService([invalidSegment]);
    const recordingService = createInspectableSheetRecordingService();

    render(
      <SheetPracticeControls
        sheetId="sheet-alpha"
        sheetName="Alpha"
        defaultBpm={72}
        defaultTimeSignature="4/4"
        createSheetRecordingService={() => recordingService.service}
        sessionService={sessionService}
        measureGridService={createMeasureGridService(grid)}
        practiceSegmentService={segmentService}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Invalid timing")).toBeVisible();
    });
    await user.click(screen.getByTestId("practice-segment-row-segment-invalid"));
    await user.click(screen.getByRole("button", { name: "Start recording" }));
    await waitFor(() => {
      expect(screen.getByTestId("sheet-recording-state")).toHaveTextContent("active");
    });
    await user.click(screen.getByRole("button", { name: "Stop recording" }));

    await waitFor(() => {
      expect(screen.getByText("Selected segment timing is invalid. Recording was not saved.")).toBeVisible();
    });
    expect(recordingService.service.stopAndSave).not.toHaveBeenCalled();
    expect(recordingService.isActive()).toBe(true);
    expect(screen.getByTestId("sheet-recording-state")).toHaveTextContent("active");
  });

  it("blocks save safely when the selected segment no longer exists during stop", async () => {
    const user = userEvent.setup();
    const grid: MeasureGrid = {
      bpm: 96,
      timeSignature: "4/4",
      pickupBeats: 0,
      measureOneOffsetMs: 1_000
    };
    const segment: PracticeSegment = {
      id: "segment-alpha",
      sheetId: "sheet-alpha",
      name: "Opening phrase",
      range: {
        startMeasure: 5,
        endMeasure: 12
      },
      targetBpm: 96,
      notes: null,
      grid: createPracticeSegmentGridAssociation(grid)
    };
    const session = createSheetSession();
    const sessionService = {
      ...createIdleSessionService(),
      ensureSheetSession: vi.fn(async () => session),
      getRecentSheetSession: vi.fn(async () => session)
    };
    const segmentService = createPracticeSegmentService([segment]);
    const recordingService = createInspectableSheetRecordingService();

    render(
      <SheetPracticeControls
        sheetId="sheet-alpha"
        sheetName="Alpha"
        defaultBpm={72}
        defaultTimeSignature="4/4"
        createSheetRecordingService={() => recordingService.service}
        sessionService={sessionService}
        measureGridService={createMeasureGridService(grid)}
        practiceSegmentService={segmentService}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Opening phrase")).toBeVisible();
    });
    await user.click(screen.getByTestId("practice-segment-row-segment-alpha"));
    await user.click(screen.getByRole("button", { name: "Start recording" }));
    await waitFor(() => {
      expect(useSheetPracticeRecordingWorkflowStore.getState()).toMatchObject({
        sheetId: "sheet-alpha",
        activeSegmentId: "segment-alpha",
        status: "recording"
      });
    });

    vi.mocked(segmentService.getSegment).mockResolvedValueOnce(null);
    await user.click(screen.getByRole("button", { name: "Stop recording" }));

    await waitFor(() => {
      expect(screen.getByText("Selected segment no longer exists. Recording was not saved.")).toBeVisible();
    });
    expect(segmentService.getSegment).toHaveBeenCalledWith("sheet-alpha", "segment-alpha");
    expect(recordingService.service.stopAndSave).not.toHaveBeenCalled();
    expect(recordingService.isActive()).toBe(true);
    expect(screen.getByTestId("sheet-recording-state")).toHaveTextContent("active");
    expect(screen.getByRole("button", { name: "Stop recording" })).toBeEnabled();
    expect(useSheetPracticeRecordingWorkflowStore.getState()).toMatchObject({
      sheetId: "sheet-alpha",
      activeSegmentId: null,
      status: "error",
      error: "Selected segment no longer exists. Recording was not saved.",
      rerecord: {
        status: "invalid",
        source: null,
        unavailableReason: "source-segment-missing"
      }
    });
  });

  it("blocks save safely when the selected segment lookup throws during stop", async () => {
    const user = userEvent.setup();
    const grid: MeasureGrid = {
      bpm: 96,
      timeSignature: "4/4",
      pickupBeats: 0,
      measureOneOffsetMs: 1_000
    };
    const segment: PracticeSegment = {
      id: "segment-alpha",
      sheetId: "sheet-alpha",
      name: "Opening phrase",
      range: {
        startMeasure: 5,
        endMeasure: 12
      },
      targetBpm: 96,
      notes: null,
      grid: createPracticeSegmentGridAssociation(grid)
    };
    const session = createSheetSession();
    const sessionService = {
      ...createIdleSessionService(),
      ensureSheetSession: vi.fn(async () => session),
      getRecentSheetSession: vi.fn(async () => session)
    };
    const segmentService = createPracticeSegmentService([segment]);
    const recordingService = createInspectableSheetRecordingService();

    render(
      <SheetPracticeControls
        sheetId="sheet-alpha"
        sheetName="Alpha"
        defaultBpm={72}
        defaultTimeSignature="4/4"
        createSheetRecordingService={() => recordingService.service}
        sessionService={sessionService}
        measureGridService={createMeasureGridService(grid)}
        practiceSegmentService={segmentService}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Opening phrase")).toBeVisible();
    });
    await user.click(screen.getByTestId("practice-segment-row-segment-alpha"));
    await user.click(screen.getByRole("button", { name: "Start recording" }));
    await waitFor(() => {
      expect(useSheetPracticeRecordingWorkflowStore.getState()).toMatchObject({
        sheetId: "sheet-alpha",
        activeSegmentId: "segment-alpha",
        status: "recording"
      });
    });

    vi.mocked(segmentService.getSegment).mockRejectedValueOnce(new Error("IndexedDB unavailable"));
    await user.click(screen.getByRole("button", { name: "Stop recording" }));

    await waitFor(() => {
      expect(screen.getByText("Selected segment could not be loaded. Recording was not saved.")).toBeVisible();
    });
    expect(segmentService.getSegment).toHaveBeenCalledWith("sheet-alpha", "segment-alpha");
    expect(recordingService.service.stopAndSave).not.toHaveBeenCalled();
    expect(recordingService.isActive()).toBe(true);
    expect(screen.getByTestId("sheet-recording-state")).toHaveTextContent("active");
    expect(screen.getByRole("button", { name: "Stop recording" })).toBeEnabled();
    expect(useSheetPracticeRecordingWorkflowStore.getState()).toMatchObject({
      sheetId: "sheet-alpha",
      activeSegmentId: "segment-alpha",
      status: "error",
      error: "Selected segment could not be loaded. Recording was not saved.",
      rerecord: {
        status: "unavailable",
        source: null
      }
    });
  });
});

describe("sheet practice controls state", () => {
  beforeEach(() => {
    resetRecordingWorkflowStore();
  });

  it("initializes metronome settings from sheet defaults", () => {
    expect(createSheetPracticeMetronomeSettings({ bpm: 72, timeSignature: "3/4" })).toEqual({
      ...DEFAULT_METRONOME_SETTINGS,
      bpm: 72,
      timeSignature: "3/4"
    });
  });

  it("falls back to shared quick-metronome defaults for missing or invalid sheet defaults", () => {
    expect(createSheetPracticeMetronomeSettings({ bpm: null, timeSignature: null })).toEqual(
      DEFAULT_METRONOME_SETTINGS
    );
    expect(createSheetPracticeMetronomeSettings({ bpm: 12, timeSignature: "5/4" })).toEqual({
      ...DEFAULT_METRONOME_SETTINGS,
      bpm: 30
    });
    expect(createSheetPracticeMetronomeSettings({ bpm: 260, timeSignature: "4/4" })).toMatchObject({
      bpm: 240,
      timeSignature: "4/4"
    });
  });

  it("reports unsupported sheet meter fallback instead of silently discarding metadata", () => {
    const state = createSheetPracticeControlInitialState({ bpm: 84, timeSignature: "5/4" });

    expect(state.settings).toEqual({
      ...DEFAULT_METRONOME_SETTINGS,
      bpm: 84
    });
    expect(state.unsupportedTimeSignature).toBe("5/4");
    expect(formatUnsupportedTimeSignatureMessage("5/4")).toBe(
      "Sheet meter 5/4 is not supported by the v0 metronome; using 4/4."
    );
  });

  it("renders a recoverable unsupported meter fallback message", () => {
    render(
      <SheetPracticeControls
        sheetId="sheet-alpha"
        sheetName="Alpha"
        defaultBpm={84}
        defaultTimeSignature="5/4"
        sessionService={createIdleSessionService()}
      />
    );

    expect(
      screen.getByText("Sheet meter 5/4 is not supported by the v0 metronome; using 4/4.")
    ).toBeVisible();
    expect(screen.getByLabelText("Time signature")).toHaveValue("4/4");
  });

  it("composes the practice segment selector with injected services", async () => {
    const grid: MeasureGrid = {
      bpm: 96,
      timeSignature: "4/4",
      pickupBeats: 0,
      measureOneOffsetMs: 1_000
    };
    const segmentService = createPracticeSegmentService([
      {
        id: "segment-alpha",
        sheetId: "sheet-alpha",
        name: "Opening phrase",
        range: {
          startMeasure: 5,
          endMeasure: 12
        },
        targetBpm: 96,
        notes: null,
        grid: createPracticeSegmentGridAssociation(grid)
      }
    ]);
    const measureGridService = createMeasureGridService(grid);

    render(
      <SheetPracticeControls
        sheetId="sheet-alpha"
        sheetName="Alpha"
        defaultBpm={84}
        defaultTimeSignature="4/4"
        sessionService={createIdleSessionService()}
        measureGridService={measureGridService}
        practiceSegmentService={segmentService}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("practice-segment-selector-status")).toHaveTextContent("1 saved");
    });
    expect(screen.getByTestId("practice-segment-selector-panel")).toBeVisible();
    expect(screen.getByText("Opening phrase")).toBeVisible();
    expect(segmentService.listSegments).toHaveBeenCalledWith("sheet-alpha");
    expect(measureGridService.getGrid).toHaveBeenCalledWith("sheet-alpha");
  });

  it("refreshes segment grid status after saving a new measure grid without a reload", async () => {
    const user = userEvent.setup();
    let activeGrid: MeasureGrid = {
      bpm: 84,
      timeSignature: "3/4",
      pickupBeats: 1,
      measureOneOffsetMs: 500
    };
    const currentGrid: MeasureGrid = {
      bpm: 96,
      timeSignature: "4/4",
      pickupBeats: 0,
      measureOneOffsetMs: 1_000
    };
    const measureGridService: MeasureGridService = {
      getGrid: vi.fn(async () => activeGrid),
      saveGrid: vi.fn(async (_sheetId, nextGrid) => {
        activeGrid = nextGrid;

        return nextGrid;
      }),
      clearGrid: vi.fn(async () => undefined)
    };
    const segmentService = createPracticeSegmentService([
      {
        id: "segment-alpha",
        sheetId: "sheet-alpha",
        name: "Opening phrase",
        range: {
          startMeasure: 5,
          endMeasure: 12
        },
        targetBpm: 96,
        notes: null,
        grid: createPracticeSegmentGridAssociation(currentGrid)
      }
    ]);

    render(
      <SheetPracticeControls
        sheetId="sheet-alpha"
        sheetName="Alpha"
        defaultBpm={96}
        defaultTimeSignature="4/4"
        sessionService={createIdleSessionService()}
        measureGridService={measureGridService}
        practiceSegmentService={segmentService}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("practice-segment-status-segment-alpha")).toHaveTextContent("Grid changed");
    });

    await user.clear(screen.getByRole("spinbutton", { name: "Grid BPM" }));
    await user.type(screen.getByRole("spinbutton", { name: "Grid BPM" }), "96");
    await user.selectOptions(screen.getByLabelText("Grid time signature"), "4/4");
    await user.clear(screen.getByRole("spinbutton", { name: "Pickup beats" }));
    await user.type(screen.getByRole("spinbutton", { name: "Pickup beats" }), "0");
    await user.clear(screen.getByRole("spinbutton", { name: "Measure 1 offset" }));
    await user.type(screen.getByRole("spinbutton", { name: "Measure 1 offset" }), "1000");
    await user.click(screen.getByRole("button", { name: "Save grid" }));

    await waitFor(() => {
      expect(screen.getByTestId("practice-segment-status-segment-alpha")).toHaveTextContent("Ready");
    });
    expect(measureGridService.getGrid).toHaveBeenCalledWith("sheet-alpha");
    expect(measureGridService.saveGrid).toHaveBeenCalledWith("sheet-alpha", currentGrid);
  });

  it("passes the current measure-grid timestamp into calibration actions", async () => {
    const user = userEvent.setup();
    const measureGridService = createMeasureGridService(null);

    render(
      <SheetPracticeControls
        sheetId="sheet-alpha"
        sheetName="Alpha"
        defaultBpm={72}
        defaultTimeSignature="4/4"
        currentMeasureGridTimestampMs={2_432.6}
        sessionService={createIdleSessionService()}
        measureGridService={measureGridService}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("measure-grid-status")).toHaveTextContent("Needs calibration");
    });

    await user.click(screen.getByRole("button", { name: "Set measure 1 here" }));

    expect(screen.getByRole("spinbutton", { name: "Measure 1 offset" })).toHaveValue(2433);
    expect(screen.getByTestId("measure-grid-status")).toHaveTextContent("Unsaved changes");

    await user.click(screen.getByRole("button", { name: "Save grid" }));

    await waitFor(() => {
      expect(measureGridService.saveGrid).toHaveBeenCalledWith("sheet-alpha", {
        bpm: 72,
        timeSignature: "4/4",
        pickupBeats: 0,
        measureOneOffsetMs: 2433
      });
    });
  });

  it("keeps measure-grid timestamp calibration disabled when the timestamp is null", async () => {
    render(
      <SheetPracticeControls
        sheetId="sheet-alpha"
        sheetName="Alpha"
        defaultBpm={72}
        defaultTimeSignature="4/4"
        currentMeasureGridTimestampMs={null}
        sessionService={createIdleSessionService()}
        measureGridService={createMeasureGridService(null)}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("measure-grid-status")).toHaveTextContent("Needs calibration");
    });

    expect(screen.getByRole("button", { name: "Set measure 1 here" })).toBeDisabled();
    expect(screen.getByText("No playback timestamp available.")).toBeVisible();
  });
});

describe("sheet practice controls metronome reuse", () => {
  it("uses the shared metronome trace for accent cycle and subdivision density", async () => {
    const fakeTone = createFakeToneAdapter();
    const service = new BrowserMetronomeService(async () => fakeTone.adapter);
    const traces: MetronomeTraceEventDetail[] = [];
    const listener = (event: Event) => {
      traces.push((event as CustomEvent<MetronomeTraceEventDetail>).detail);
    };

    window.addEventListener(METRONOME_TRACE_EVENT, listener);

    await service.start({
      ...DEFAULT_METRONOME_SETTINGS,
      bpm: 120,
      timeSignature: "3/4",
      subdivision: "eighth",
      accent: "downbeat"
    });

    for (let index = 0; index < 7; index += 1) {
      fakeTone.callbacks[0]?.(10 + index * 0.25);
    }

    service.stop();
    window.removeEventListener(METRONOME_TRACE_EVENT, listener);

    expect(fakeTone.adapter.scheduleRepeat).toHaveBeenCalledWith(expect.any(Function), 0.25);
    expect(traces.map((trace) => trace.accented)).toEqual([true, false, false, false, false, false, true]);
    expect(traces.every((trace) => trace.subdivision === "eighth")).toBe(true);
    expect(traces.every((trace) => trace.expectedIntervalMs === 250)).toBe(true);
    expect(fakeTone.triggers.map((trigger) => trigger.note)).toEqual([
      "E6",
      "E5",
      "B5",
      "E5",
      "B5",
      "E5",
      "E6"
    ]);
  });
});

describe("SheetPracticeControls failure handling", () => {
  beforeEach(() => {
    resetRecordingWorkflowStore();
  });

  function createRejectingSessionService() {
    return {
      ...createIdleSessionService(),
      ensureSheetSession: vi.fn(async () => {
        throw new Error("Session unavailable");
      })
    };
  }

  function createInspectableMetronomeService() {
    let playing = false;

    return {
      service: {
        onTick: vi.fn(() => () => false),
        update: vi.fn(),
        start: vi.fn(async () => {
          playing = true;
        }),
        stop: vi.fn(() => {
          playing = false;
        })
      },
      isPlaying: () => playing
    };
  }

  function createRejectingMetronomeService() {
    let playing = false;

    return {
      service: {
        onTick: vi.fn(() => () => false),
        update: vi.fn(),
        start: vi.fn(async () => {
          playing = true;
          throw new Error("Tone unavailable");
        }),
        stop: vi.fn(() => {
          playing = false;
        })
      },
      isPlaying: () => playing
    };
  }

  it("does not leave metronome playback running when session creation rejects", async () => {
    const user = userEvent.setup();
    const sessionService = createRejectingSessionService();
    const metronome = createInspectableMetronomeService();

    render(
      <SheetPracticeControls
        sheetId="sheet-alpha"
        sheetName="Alpha"
        defaultBpm={72}
        defaultTimeSignature="4/4"
        createMetronomeService={() => metronome.service}
        sessionService={sessionService}
      />
    );

    await user.click(screen.getByRole("button", { name: "Start metronome" }));

    await waitFor(() => {
      expect(screen.getByText("Session unavailable")).toBeVisible();
    });
    expect(sessionService.ensureSheetSession).toHaveBeenCalledWith({
      sheetId: "sheet-alpha",
      trigger: "metronome",
      bpm: 72,
      timeSignature: "4/4",
      forceNewSession: false
    });
    expect(metronome.service.start).not.toHaveBeenCalled();
    expect(metronome.service.stop).toHaveBeenCalled();
    expect(metronome.isPlaying()).toBe(false);
    expect(screen.getByTestId("sheet-metronome-state")).toHaveTextContent("Stopped");
  });

  it("rolls back only a session created for this metronome start when Tone start rejects", async () => {
    const user = userEvent.setup();
    const session = createSheetSession();
    const endedSession = { ...session, endedAt: "2026-06-21T12:00:01.000Z", durationMs: 1_000 };
    const sessionService = {
      ...createIdleSessionService(),
      getRecentSheetSession: vi.fn(async () => null),
      ensureSheetSession: vi.fn(async () => session),
      endPracticeSession: vi.fn(async () => endedSession)
    };
    const metronome = createRejectingMetronomeService();

    render(
      <SheetPracticeControls
        sheetId="sheet-alpha"
        sheetName="Alpha"
        defaultBpm={72}
        defaultTimeSignature="4/4"
        createMetronomeService={() => metronome.service}
        sessionService={sessionService}
      />
    );

    await user.click(screen.getByRole("button", { name: "Start metronome" }));

    await waitFor(() => {
      expect(screen.getByText("Tone unavailable")).toBeVisible();
    });
    expect(sessionService.ensureSheetSession).toHaveBeenCalled();
    expect(sessionService.getRecentSheetSession).toHaveBeenCalledWith("sheet-alpha");
    expect(metronome.service.start).toHaveBeenCalled();
    expect(metronome.service.stop).toHaveBeenCalled();
    expect(sessionService.endPracticeSession).toHaveBeenCalledWith("session-alpha");
    expect(metronome.isPlaying()).toBe(false);
    expect(screen.getByTestId("sheet-metronome-state")).toHaveTextContent("Stopped");
    expect(screen.getByTestId("sheet-session-id")).toHaveTextContent("session-alpha");
  });

  it("does not end an existing session when Tone start rejects", async () => {
    const user = userEvent.setup();
    const session = createSheetSession();
    const sessionService = {
      ...createIdleSessionService(),
      getRecentSheetSession: vi.fn(async () => session),
      ensureSheetSession: vi.fn(async () => session),
      endPracticeSession: vi.fn(async () => session)
    };
    const metronome = createRejectingMetronomeService();

    render(
      <SheetPracticeControls
        sheetId="sheet-alpha"
        sheetName="Alpha"
        defaultBpm={72}
        defaultTimeSignature="4/4"
        createMetronomeService={() => metronome.service}
        sessionService={sessionService}
      />
    );

    await user.click(screen.getByRole("button", { name: "Start metronome" }));

    await waitFor(() => {
      expect(screen.getByText("Tone unavailable")).toBeVisible();
    });
    expect(sessionService.getRecentSheetSession).toHaveBeenCalledWith("sheet-alpha");
    expect(sessionService.ensureSheetSession).toHaveBeenCalled();
    expect(metronome.service.start).toHaveBeenCalled();
    expect(metronome.service.stop).toHaveBeenCalled();
    expect(sessionService.endPracticeSession).not.toHaveBeenCalled();
    expect(metronome.isPlaying()).toBe(false);
    expect(screen.getByTestId("sheet-metronome-state")).toHaveTextContent("Stopped");
  });

  it("updates duration instead of ending the session when stopping within the same sheet context", async () => {
    const user = userEvent.setup();
    const session = createSheetSession();
    const updatedSession = {
      ...session,
      durationMs: 2_000,
      updatedAt: "2026-06-21T12:00:02.000Z"
    };
    const sessionService = {
      ...createIdleSessionService(),
      getRecentSheetSession: vi.fn(async () => null),
      ensureSheetSession: vi.fn(async () => session),
      updateSheetSessionDuration: vi.fn(async () => updatedSession),
      endPracticeSession: vi.fn(async () => ({ ...updatedSession, endedAt: updatedSession.updatedAt }))
    };
    const metronome = createInspectableMetronomeService();

    render(
      <SheetPracticeControls
        sheetId="sheet-alpha"
        sheetName="Alpha"
        defaultBpm={72}
        defaultTimeSignature="4/4"
        createMetronomeService={() => metronome.service}
        sessionService={sessionService}
      />
    );

    await user.click(screen.getByRole("button", { name: "Start metronome" }));
    await waitFor(() => {
      expect(screen.getByTestId("sheet-metronome-state")).toHaveTextContent("Playing");
    });

    await user.click(screen.getByRole("button", { name: "Stop metronome" }));

    await waitFor(() => {
      expect(screen.getByTestId("sheet-session-duration")).toHaveTextContent("0:02");
    });
    expect(sessionService.updateSheetSessionDuration).toHaveBeenCalledWith("session-alpha");
    expect(sessionService.endPracticeSession).not.toHaveBeenCalled();
    expect(screen.getByTestId("sheet-session-id")).toHaveTextContent("session-alpha");
  });

  it("ends only a newly created replacement session when Tone start rejects after a previous session ended", async () => {
    const user = userEvent.setup();
    const previousEndedSession = createSheetSession({
      endedAt: "2026-06-21T12:03:00.000Z",
      durationMs: 180_000
    });
    const replacementSession = createSheetSession({
      id: "session-beta",
      endedAt: null,
      durationMs: 0,
      updatedAt: "2026-06-21T12:05:00.000Z"
    });
    const sessionService = {
      ...createIdleSessionService(),
      getRecentSheetSession: vi.fn(async () => previousEndedSession),
      ensureSheetSession: vi.fn(async () => replacementSession),
      restorePracticeSessionSnapshot: vi.fn(async (session: PracticeSession) => session),
      endPracticeSession: vi.fn(async () => ({
        ...replacementSession,
        endedAt: "2026-06-21T12:05:01.000Z",
        durationMs: 1_000
      }))
    };
    const metronome = createRejectingMetronomeService();

    render(
      <SheetPracticeControls
        sheetId="sheet-alpha"
        sheetName="Alpha"
        defaultBpm={72}
        defaultTimeSignature="4/4"
        createMetronomeService={() => metronome.service}
        sessionService={sessionService}
      />
    );

    await user.click(screen.getByRole("button", { name: "Start metronome" }));

    await waitFor(() => {
      expect(screen.getByText("Tone unavailable")).toBeVisible();
    });
    expect(sessionService.getRecentSheetSession).toHaveBeenCalledWith("sheet-alpha");
    expect(sessionService.ensureSheetSession).toHaveBeenCalled();
    expect(metronome.service.start).toHaveBeenCalled();
    expect(metronome.service.stop).toHaveBeenCalled();
    expect(sessionService.restorePracticeSessionSnapshot).not.toHaveBeenCalled();
    expect(sessionService.endPracticeSession).toHaveBeenCalledWith("session-beta");
    expect(metronome.isPlaying()).toBe(false);
    expect(screen.getByTestId("sheet-metronome-state")).toHaveTextContent("Stopped");
    expect(screen.getByTestId("sheet-session-id")).toHaveTextContent("session-beta");
  });

  it("does not end an active recording session before recording metadata exists when Tone start rejects", async () => {
    const user = userEvent.setup();
    const session = createSheetSession({
      recordingCount: 0,
      latestRecordingId: null
    });
    const sessionService = {
      ...createIdleSessionService(),
      getRecentSheetSession: vi.fn(async () => session),
      ensureSheetSession: vi.fn(async () => session),
      endPracticeSession: vi.fn(async () => session)
    };
    const metronome = createRejectingMetronomeService();

    render(
      <SheetPracticeControls
        sheetId="sheet-alpha"
        sheetName="Alpha"
        defaultBpm={72}
        defaultTimeSignature="4/4"
        createMetronomeService={() => metronome.service}
        sessionService={sessionService}
      />
    );

    await user.click(screen.getByRole("button", { name: "Start metronome" }));

    await waitFor(() => {
      expect(screen.getByText("Tone unavailable")).toBeVisible();
    });
    expect(sessionService.getRecentSheetSession).toHaveBeenCalledWith("sheet-alpha");
    expect(sessionService.ensureSheetSession).toHaveBeenCalled();
    expect(metronome.service.start).toHaveBeenCalled();
    expect(metronome.service.stop).toHaveBeenCalled();
    expect(sessionService.endPracticeSession).not.toHaveBeenCalled();
    expect(metronome.isPlaying()).toBe(false);
    expect(screen.getByTestId("sheet-metronome-state")).toHaveTextContent("Stopped");
  });
});
