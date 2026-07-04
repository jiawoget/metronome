import { act, fireEvent, render, renderHook, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

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
  type SheetMetronomePreset,
  type SheetMetronomePresetSettings,
  type SheetRecordingMetadata
} from "@/domain/practice";
import type { MeasureGridService } from "@/services/measure-grid";
import type { PracticeSegmentService } from "@/services/practice-segments";
import type {
  CreateSheetMetronomePresetInput,
  RenameSheetMetronomePresetInput,
  SheetMetronomePresetService
} from "@/services/sheet-metronome-presets";
import type {
  PracticeSessionEventCaptureInput,
  PracticeSessionService
} from "@/services/practice-session";
import {
  BrowserMetronomeService,
  METRONOME_TRACE_EVENT,
  type MetronomeTraceEventDetail
} from "@/lib/quick-metronome/metronome-service";
import { DEFAULT_METRONOME_SETTINGS } from "@/lib/quick-metronome/types";
import { useMetronomeTransport } from "@/lib/quick-metronome/use-metronome-transport";
import { createFakeToneAdapter } from "./fake-tone-metronome-adapter";
import {
  initialSheetPracticeRecordingWorkflowState,
  useSheetPracticeRecordingWorkflowStore
} from "@/stores/sheet-practice-recording-workflow-store";
import type {
  SheetPracticeControlsProps,
  SheetPracticeRecordingService
} from "@/components/sheet-practice/controls/types";
import type { PracticeSegmentSelectorPanelProps } from "@/components/sheet-practice/segments/practice-segment-selector-panel";
import type { ReviewRecording } from "@/lib/recordings-review/types";
import type {
  CountdownExecutor,
  CountdownExecutorOptions,
  CountdownExecutorTick
} from "@/services/metronome";

const practiceSegmentSelectorPanelMock = vi.hoisted(() => ({
  implementation: null as
    | ((props: PracticeSegmentSelectorPanelProps) => ReactElement)
    | null
}));

vi.mock("@/components/sheet-practice/segments/practice-segment-selector-panel", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/components/sheet-practice/segments/practice-segment-selector-panel")>();

  return {
    ...actual,
    PracticeSegmentSelectorPanel: (props: PracticeSegmentSelectorPanelProps) => {
      const MockImplementation = practiceSegmentSelectorPanelMock.implementation;

      if (MockImplementation) {
        return <MockImplementation {...props} />;
      }

      const ActualPracticeSegmentSelectorPanel = actual.PracticeSegmentSelectorPanel;

      return <ActualPracticeSegmentSelectorPanel {...props} />;
    }
  };
});

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

function createIdleSessionService() {
  return {
    captureSessionEvent: vi.fn(
      async (input: PracticeSessionEventCaptureInput) => {
        void input;

        return null;
      }
    ),
    ensureSheetSession: vi.fn(async () => null),
    restorePracticeSessionSnapshot: vi.fn(async (session: PracticeSession) => session),
    deletePracticeSessionSnapshot: vi.fn(async () => undefined),
    updateSheetSessionDuration: vi.fn(async () => null),
    endPracticeSession: vi.fn(async () => null),
    createSheetRecordingMetadata: vi.fn(async () => null),
    prepareSheetRecordingMetadata: vi.fn(async () => null),
    commitPreparedSheetRecordingSession: vi.fn(async () => undefined),
    getRecentSession: vi.fn(async () => null),
    getRecentSheetSession: vi.fn(async () => null),
    listRecordingMetadata: vi.fn(async () => []),
    subscribe: vi.fn(() => () => undefined)
  } satisfies Pick<
    PracticeSessionService,
    | "ensureSheetSession"
    | "captureSessionEvent"
    | "restorePracticeSessionSnapshot"
    | "deletePracticeSessionSnapshot"
    | "updateSheetSessionDuration"
    | "endPracticeSession"
    | "createSheetRecordingMetadata"
    | "prepareSheetRecordingMetadata"
    | "commitPreparedSheetRecordingSession"
    | "getRecentSession"
    | "getRecentSheetSession"
    | "listRecordingMetadata"
    | "subscribe"
  >;
}

function createSheetSession(overrides: Partial<PracticeSession> = {}): PracticeSession {
  const session: PracticeSession = {
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
    ...overrides,
    segmentContext: overrides.segmentContext ?? null
  };

  return session;
}

function createMeasureGridService(grid: MeasureGrid | null = null) {
  return {
    getGrid: vi.fn(async () => grid),
    saveGrid: vi.fn(async (_sheetId: string, nextGrid: MeasureGrid) => nextGrid),
    clearGrid: vi.fn(async () => undefined)
  } satisfies MeasureGridService;
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolver) => {
    resolve = resolver;
  });

  return { promise, resolve };
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

function createTestPreset(
  overrides: Partial<Omit<SheetMetronomePreset, "settings">> & {
    settings?: Partial<SheetMetronomePresetSettings> & {
      barCountIn?: Partial<SheetMetronomePresetSettings["barCountIn"]>;
    };
  } = {}
): SheetMetronomePreset {
  const { settings: settingsOverride, ...presetOverrides } = overrides;
  const baseSettings: SheetMetronomePresetSettings = {
    bpm: 96,
    timeSignature: "4/4",
    subdivision: "quarter",
    accent: "downbeat",
    countdownBeats: 0,
    barCountIn: {
      enabled: false,
      bars: 1
    }
  };
  const settings = {
    ...baseSettings,
    ...settingsOverride,
    barCountIn: {
      ...baseSettings.barCountIn,
      ...settingsOverride?.barCountIn
    }
  } satisfies SheetMetronomePresetSettings;

  return {
    id: "preset-alpha",
    sheetId: "sheet-alpha",
    segmentId: null,
    name: "Warmup",
    settings,
    createdAt: "2026-07-02T12:00:00.000Z",
    updatedAt: "2026-07-02T12:00:00.000Z",
    ...presetOverrides
  };
}

function createFakeSheetMetronomePresetService(
  initialPresets: SheetMetronomePreset[] = []
) {
  let sequence = initialPresets.length + 1;
  let presets = [...initialPresets];
  const normalizeSegmentId = (segmentId: string | null | undefined) => {
    const trimmedSegmentId = segmentId?.trim() ?? "";

    return trimmedSegmentId.length > 0 ? trimmedSegmentId : null;
  };
  const hasDuplicateName = (
    candidate: Pick<SheetMetronomePreset, "id" | "sheetId" | "segmentId" | "name">
  ) =>
    presets.some(
      (preset) =>
        preset.id !== candidate.id &&
        preset.sheetId === candidate.sheetId &&
        preset.segmentId === candidate.segmentId &&
        preset.name.trim().toLowerCase() === candidate.name.trim().toLowerCase()
    );

  function createStoredPreset(input: CreateSheetMetronomePresetInput) {
    const id = input.id ?? `preset-${sequence}`;
    const existingPreset = presets.find(
      (preset) => preset.sheetId === input.sheetId && preset.id === id
    );
    const segmentId = normalizeSegmentId(input.segmentId);
    const name = input.name.trim();

    if (!name) {
      throw new Error("Preset name is required.");
    }

    const preset = createTestPreset({
      ...existingPreset,
      id,
      sheetId: input.sheetId,
      segmentId,
      name,
      settings: input.settings,
      createdAt: existingPreset?.createdAt ?? "2026-07-02T12:00:00.000Z",
      updatedAt: `2026-07-02T12:00:${String(sequence).padStart(2, "0")}.000Z`
    });

    if (hasDuplicateName(preset)) {
      throw new Error("Preset name already exists.");
    }

    sequence += 1;
    presets = [
      preset,
      ...presets.filter(
        (currentPreset) =>
          currentPreset.sheetId !== preset.sheetId || currentPreset.id !== preset.id
      )
    ];

    return preset;
  }

  const service: SheetMetronomePresetService = {
    listPresets: vi.fn(async (sheetId, options) => {
      let nextPresets = presets.filter((preset) => preset.sheetId === sheetId);

      if (options?.segmentId !== undefined) {
        nextPresets = nextPresets.filter(
          (preset) => preset.segmentId === normalizeSegmentId(options.segmentId)
        );
      }

      return [...nextPresets];
    }),
    getPreset: vi.fn(async (sheetId, presetId) =>
      presets.find((preset) => preset.sheetId === sheetId && preset.id === presetId) ?? null
    ),
    savePreset: vi.fn(async (input) => createStoredPreset(input)),
    renamePreset: vi.fn(async (input: RenameSheetMetronomePresetInput) => {
      const existingPreset = presets.find(
        (preset) => preset.sheetId === input.sheetId && preset.id === input.presetId
      );

      if (!existingPreset) {
        throw new Error("Preset was not found.");
      }

      const renamedPreset = {
        ...existingPreset,
        name: input.name.trim(),
        updatedAt: `2026-07-02T12:00:${String(sequence).padStart(2, "0")}.000Z`
      };

      if (!renamedPreset.name) {
        throw new Error("Preset name is required.");
      }

      if (hasDuplicateName(renamedPreset)) {
        throw new Error("Preset name already exists.");
      }

      sequence += 1;
      presets = presets.map((preset) =>
        preset.sheetId === renamedPreset.sheetId && preset.id === renamedPreset.id
          ? renamedPreset
          : preset
      );

      return renamedPreset;
    }),
    deletePreset: vi.fn(async (sheetId, presetId) => {
      presets = presets.filter(
        (preset) => preset.sheetId !== sheetId || preset.id !== presetId
      );
    }),
    loadPreset: vi.fn(async (sheetId, presetId) => {
      const preset =
        presets.find((item) => item.sheetId === sheetId && item.id === presetId) ?? null;

      return preset
        ? { status: "loaded" as const, preset, settings: preset.settings }
        : { status: "missing" as const };
    })
  };

  return {
    service,
    getPresets: () => [...presets],
    setPresets: (nextPresets: SheetMetronomePreset[]) => {
      presets = [...nextPresets];
    }
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

type SheetPracticeControlsHarnessWindow = Window & {
  __sheetPracticeControlsTestHarness?: boolean;
};

type BarCountInPlanHarnessDetail = {
  beatCount: number;
  totalDurationMs: number;
  status: string;
  scope: string;
  startMeasure: number;
  segmentId: string | null;
};

function createBarCountInHarnessCollector() {
  const harnessWindow = window as SheetPracticeControlsHarnessWindow;
  const previousHarnessValue = harnessWindow.__sheetPracticeControlsTestHarness;
  const plans: BarCountInPlanHarnessDetail[] = [];
  const handlePlan = (event: Event) => {
    plans.push((event as CustomEvent<BarCountInPlanHarnessDetail>).detail);
  };

  harnessWindow.__sheetPracticeControlsTestHarness = true;
  window.addEventListener("sheet-practice-controls:bar-count-in-plan", handlePlan);

  return {
    plans,
    cleanup: () => {
      window.removeEventListener("sheet-practice-controls:bar-count-in-plan", handlePlan);
      harnessWindow.__sheetPracticeControlsTestHarness = previousHarnessValue;
    }
  };
}

function createCountdownTick(
  options: CountdownExecutorOptions,
  beatIndex: number
): CountdownExecutorTick {
  const beat = options.plan.beats[beatIndex];
  const firstBeat = options.plan.beats[0];

  if (!beat || !firstBeat) {
    throw new Error("Countdown test tick is missing a planned beat.");
  }

  return {
    count: beat.count,
    beatNumber: beat.beatNumber,
    remainingBeats: options.plan.beats.length - beatIndex - 1,
    scheduledOffsetMs: beat.offsetMs,
    scheduledDelayMs: beat.offsetMs - firstBeat.offsetMs,
    audioTime: performance.now() / 1_000
  };
}

function createFirstTickCountdownExecutor(): CountdownExecutor {
  return {
    run: vi.fn((options: CountdownExecutorOptions) => {
      options.onTick?.(createCountdownTick(options, 0));

      return {
        cancel: vi.fn()
      };
    })
  };
}

function createTimerCountdownExecutor(): CountdownExecutor {
  return {
    run: vi.fn((options: CountdownExecutorOptions) => {
      const timerIds = options.plan.beats.map((beat, index) => {
        const firstBeat = options.plan.beats[0];

        if (!firstBeat) {
          throw new Error("Countdown test timer is missing a first beat.");
        }

        return window.setTimeout(() => {
          options.onTick?.(createCountdownTick(options, index));
        }, beat.offsetMs - firstBeat.offsetMs);
      });

      timerIds.push(window.setTimeout(options.onComplete, options.plan.totalDurationMs));

      return {
        cancel: () => {
          timerIds.forEach((timerId) => window.clearTimeout(timerId));
        }
      };
    })
  };
}

function getBarCountInToggle() {
  return screen.getByLabelText("Enable bar count-in");
}

function queryBarCountInBarsControl() {
  return screen.queryByLabelText("Bar count-in bars");
}

function getBarCountInBarsControl() {
  return screen.getByLabelText("Bar count-in bars");
}

function isToggleChecked(control: HTMLElement) {
  if (control instanceof HTMLInputElement && control.type === "checkbox") {
    return control.checked;
  }

  const ariaChecked = control.getAttribute("aria-checked");

  if (ariaChecked !== null) {
    return ariaChecked === "true";
  }

  return control.getAttribute("aria-pressed") === "true";
}

function expectBarCountInToggle(control: HTMLElement, checked: boolean) {
  if (control instanceof HTMLInputElement && control.type === "checkbox") {
    if (checked) {
      expect(control).toBeChecked();
    } else {
      expect(control).not.toBeChecked();
    }

    return;
  }

  expect(isToggleChecked(control)).toBe(checked);
}

function expectControlUnavailable(control: HTMLElement) {
  const isNativeDisabled =
    (control instanceof HTMLButtonElement ||
      control instanceof HTMLInputElement ||
      control instanceof HTMLSelectElement) &&
    control.disabled;

  expect(isNativeDisabled || control.getAttribute("aria-disabled") === "true").toBe(true);
}

function expectBarCountInBarsValue(control: HTMLElement, value: "1" | "2") {
  if (control instanceof HTMLSelectElement || control instanceof HTMLInputElement) {
    expect(control).toHaveValue(value);
    return;
  }

  const selectedOption =
    within(control).queryByRole("radio", { checked: true }) ??
    within(control).queryByRole("button", { pressed: true });

  expect(selectedOption).toHaveTextContent(value);
}

async function enableBarCountIn(user: ReturnType<typeof userEvent.setup>) {
  const toggle = getBarCountInToggle();

  if (!isToggleChecked(toggle)) {
    await user.click(toggle);
  }

  await waitFor(() => {
    const barsControl = getBarCountInBarsControl();
    expect(barsControl).toBeEnabled();
  });
}

async function selectBarCountInBars(
  user: ReturnType<typeof userEvent.setup>,
  value: "1" | "2"
) {
  const control = getBarCountInBarsControl();

  if (control instanceof HTMLSelectElement) {
    await user.selectOptions(control, value);
    return;
  }

  if (control instanceof HTMLInputElement) {
    await user.clear(control);
    await user.type(control, value);
    return;
  }

  const option =
    within(control).queryByRole("radio", { name: new RegExp(`^${value}\\b`) }) ??
    within(control).queryByRole("button", { name: new RegExp(`^${value}\\b`) });

  if (!option) {
    throw new Error(`Could not find Bar count-in bars option ${value}.`);
  }

  await user.click(option);
}

function createRejectingPracticeSegmentService(message = "Practice segments could not be loaded.") {
  return {
    listSegments: vi.fn(async () => {
      throw new Error(message);
    }),
    getSegment: vi.fn(async () => null),
    saveSegment: vi.fn(async (segment: PracticeSegment) => segment),
    deleteSegment: vi.fn(async () => undefined)
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

function createReviewRecordingForControls(overrides: Partial<ReviewRecording> = {}): ReviewRecording {
  return {
    id: "recording-alpha",
    type: "sheet",
    origin: "user",
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
      timeSignature: "4/4"
    },
    ...overrides
  };
}

function createInspectableSheetRecordingService({
  initialRecordings = [],
  latestRecordingId = null,
  recordingIds = ["recording-alpha"],
  startCapture
}: {
  initialRecordings?: NonNullable<ReturnType<SheetPracticeRecordingService["getLatestSheetRecording"]>>[];
  latestRecordingId?: string | null;
  recordingIds?: string[];
  startCapture?: () => Promise<void>;
} = {}) {
  let active = false;
  let saveIndex = 0;
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
  const recordingsById = new Map(
    initialRecordings.map((recording) => [recording.id, recording])
  );
  let latestRecording: ReturnType<SheetPracticeRecordingService["getLatestSheetRecording"]> =
    latestRecordingId ? recordingsById.get(latestRecordingId) ?? null : initialRecordings[0] ?? null;
  const service: SheetPracticeRecordingService = {
    get isRecording() {
      return active;
    },
    getRecording: vi.fn((recordingId) => recordingsById.get(recordingId) ?? null),
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
      recordingsById.set(recordingId, latestRecording);

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
    expect(sessionService.captureSessionEvent).toHaveBeenCalledWith({
      sessionId: "session-alpha",
      kind: "recording_started",
      segmentId: "segment-alpha"
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

  it("keeps Record again available for an older take when the source recording still exists", async () => {
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
      initialRecordings: [
        createReviewRecordingForControls({
          id: "recording-beta",
          createdAt: "2026-06-21T12:03:00.000Z",
          segmentContext: expectedContext
        }),
        createReviewRecordingForControls({
          id: "recording-alpha",
          createdAt: "2026-06-21T12:01:00.000Z",
          segmentContext: expectedContext
        })
      ],
      latestRecordingId: "recording-beta",
      recordingIds: ["recording-gamma"]
    });

    render(
      <SheetPracticeControls
        sheetId="sheet-alpha"
        sheetName="Alpha"
        defaultBpm={72}
        defaultTimeSignature="4/4"
        returnSegmentId="segment-alpha"
        createSheetRecordingService={() => recordingService.service}
        sessionService={sessionService}
        measureGridService={createMeasureGridService(grid)}
        practiceSegmentService={segmentService}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("practice-segment-row-segment-alpha")).toBeVisible();
    });
    useSheetPracticeRecordingWorkflowStore.setState({
      sheetId: "sheet-alpha",
      activeSegmentId: "segment-alpha",
      status: "idle",
      error: null,
      rerecord: {
        status: "ready",
        source: {
          recordingId: "recording-alpha",
          sheetId: "sheet-alpha",
          segmentContext: expectedContext
        },
        unavailableReason: null,
        error: null
      }
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Record again" })).toBeEnabled();
    });

    await user.click(screen.getByRole("button", { name: "Record again" }));

    await waitFor(() => {
      expect(screen.getByText("Recording again for Opening phrase.")).toBeVisible();
    });
    expect(recordingService.service.getLatestSheetRecording("sheet-alpha")?.id).toBe(
      "recording-beta"
    );
    expect(recordingService.service.getRecording).toHaveBeenCalledWith("recording-alpha");
    expect(recordingService.service.startCapture).toHaveBeenCalledOnce();
  });

  it("hydrates Practice Again from a validated source recording after client repositories are available", async () => {
    const grid = createTestGrid();
    const segment = createTestSegment();
    const expectedContext = createSheetRecordingSegmentContext(segment);
    const segmentService = createPracticeSegmentService([segment]);
    const recordingService = createInspectableSheetRecordingService({
      initialRecordings: [
        createReviewRecordingForControls({
          id: "source-recording",
          segmentContext: expectedContext
        })
      ],
      latestRecordingId: "source-recording"
    });

    render(
      <SheetPracticeControls
        sheetId="sheet-alpha"
        sheetName="Alpha"
        defaultBpm={72}
        defaultTimeSignature="4/4"
        sourceRecordingId="source-recording"
        returnSegmentId="segment-alpha"
        createSheetRecordingService={() => recordingService.service}
        sessionService={createIdleSessionService()}
        measureGridService={createMeasureGridService(grid)}
        practiceSegmentService={segmentService}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Practice Again ready for Opening phrase.")).toBeVisible();
    });
    expect(useSheetPracticeRecordingWorkflowStore.getState()).toMatchObject({
      sheetId: "sheet-alpha",
      activeSegmentId: "segment-alpha",
      rerecord: {
        status: "ready",
        source: {
          recordingId: "source-recording",
          sheetId: "sheet-alpha",
          segmentContext: expectedContext
        }
      }
    });
    expect(screen.getByRole("button", { name: "Record again" })).toBeEnabled();
  });

  it.each([
    {
      name: "missing source",
      sourceRecordingId: "source-recording",
      recordings: [],
      expectedStatus: "invalid",
      expectedReason: "source-recording-missing",
      expectedMessage: "Practice Again source recording was not found."
    },
    {
      name: "non-sheet quick source",
      sourceRecordingId: "source-recording",
      recordingOverrides: {
        type: "quick" as const,
        sheetId: null
      },
      expectedStatus: "invalid",
      expectedReason: "source-not-sheet",
      expectedMessage: "Practice Again source is not a sheet recording."
    },
    {
      name: "sheet mismatch",
      sourceRecordingId: "source-recording",
      recordingOverrides: {
        sheetId: "sheet-bravo"
      },
      expectedStatus: "invalid",
      expectedReason: "sheet-mismatch",
      expectedMessage: "Practice Again source belongs to a different sheet."
    },
    {
      name: "missing segment",
      sourceRecordingId: "source-recording",
      segments: [],
      expectedStatus: "invalid",
      expectedReason: "source-segment-missing",
      expectedMessage: "Practice Again source segment no longer exists."
    },
    {
      name: "no segment context",
      sourceRecordingId: "source-recording",
      recordingOverrides: {
        segmentContext: null
      },
      expectedStatus: "unavailable",
      expectedReason: "no-segment-context",
      expectedMessage: "Practice Again opened the sheet, but this take is not linked to a segment."
    },
    {
      name: "blank source id",
      sourceRecordingId: "   ",
      expectedStatus: "unavailable",
      expectedReason: "no-source-recording"
    },
    {
      name: "malformed source id",
      sourceRecordingId: "bad/id",
      recordings: [],
      expectedStatus: "invalid",
      expectedReason: "source-recording-missing",
      expectedMessage: "Practice Again source recording was not found."
    },
    {
      name: "return segment mismatch",
      sourceRecordingId: "source-recording",
      returnSegmentId: "segment-beta",
      segments: [
        createTestSegment(),
        createTestSegment({
          id: "segment-beta",
          name: "Bridge",
          range: {
            startMeasure: 13,
            endMeasure: 16
          }
        })
      ],
      expectedStatus: "invalid",
      expectedReason: "selection-changed",
      expectedMessage: "Record Again is only available for the original segment."
    },
    {
      name: "stored segment context mismatch",
      sourceRecordingId: "source-recording",
      liveSegmentOverrides: {
        range: {
          startMeasure: 6,
          endMeasure: 12
        }
      },
      expectedStatus: "invalid",
      expectedReason: "source-segment-invalid",
      expectedMessage: "Practice Again source segment no longer matches this sheet."
    }
  ])(
    "keeps Record again unavailable for Practice Again invalid source: $name",
    async ({
      sourceRecordingId,
      returnSegmentId,
      recordings,
      recordingOverrides,
      segments,
      liveSegmentOverrides,
      expectedStatus,
      expectedReason,
      expectedMessage
    }) => {
      const grid = createTestGrid();
      const sourceSegment = createTestSegment();
      const sourceContext = createSheetRecordingSegmentContext(sourceSegment);
      const liveSegment = createTestSegment(liveSegmentOverrides ?? {});
      const initialRecordings =
        recordings ??
        [
          createReviewRecordingForControls({
            id: "source-recording",
            segmentContext: sourceContext,
            ...recordingOverrides
          })
        ];
      const recordingService = createInspectableSheetRecordingService({
        initialRecordings
      });

      render(
        <SheetPracticeControls
          sheetId="sheet-alpha"
          sheetName="Alpha"
          defaultBpm={72}
          defaultTimeSignature="4/4"
          sourceRecordingId={sourceRecordingId}
          returnSegmentId={returnSegmentId ?? "segment-alpha"}
          createSheetRecordingService={() => recordingService.service}
          sessionService={createIdleSessionService()}
          measureGridService={createMeasureGridService(grid)}
          practiceSegmentService={createPracticeSegmentService(
            segments ?? [liveSegment]
          )}
        />
      );

      if (expectedMessage) {
        await waitFor(() => {
          expect(screen.getByText(expectedMessage)).toBeVisible();
        });
      }

      await waitFor(() => {
        expect(useSheetPracticeRecordingWorkflowStore.getState().rerecord).toMatchObject({
          status: expectedStatus,
          source: null,
          unavailableReason: expectedReason
        });
      });
      expect(screen.queryByRole("button", { name: "Record again" })).not.toBeInTheDocument();
    }
  );

  it("keeps Record again unavailable when Practice Again source segment context is invalid", async () => {
    const grid = createTestGrid();
    const sourceSegment = createTestSegment();
    const changedSegment = createTestSegment({
      range: {
        startMeasure: 6,
        endMeasure: 12
      }
    });
    const recordingService = createInspectableSheetRecordingService({
      initialRecordings: [
        createReviewRecordingForControls({
          id: "source-recording",
          segmentContext: createSheetRecordingSegmentContext(sourceSegment)
        })
      ]
    });

    render(
      <SheetPracticeControls
        sheetId="sheet-alpha"
        sheetName="Alpha"
        defaultBpm={72}
        defaultTimeSignature="4/4"
        sourceRecordingId="source-recording"
        returnSegmentId="segment-alpha"
        createSheetRecordingService={() => recordingService.service}
        sessionService={createIdleSessionService()}
        measureGridService={createMeasureGridService(grid)}
        practiceSegmentService={createPracticeSegmentService([changedSegment])}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Practice Again source segment no longer matches this sheet.")).toBeVisible();
    });
    expect(useSheetPracticeRecordingWorkflowStore.getState().rerecord).toMatchObject({
      status: "invalid",
      source: null,
      unavailableReason: "source-segment-invalid"
    });
    expect(screen.queryByRole("button", { name: "Record again" })).not.toBeInTheDocument();
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

  it("does not capture recording_started when sheet session creation fails after capture starts", async () => {
    const user = userEvent.setup();
    const sessionService = createIdleSessionService();
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
        practiceSegmentService={createPracticeSegmentService()}
      />
    );

    await user.click(screen.getByRole("button", { name: "Start recording" }));

    await waitFor(() => {
      expect(screen.getByText("No valid sheet context. Recording was stopped.")).toBeVisible();
    });
    expect(recordingService.service.startCapture).toHaveBeenCalledOnce();
    expect(recordingService.service.discardCapture).toHaveBeenCalled();
    expectNoCaptureKind(
      sessionService.captureSessionEvent,
      "recording_started"
    );
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

    sessionService.captureSessionEvent.mockClear();
    vi.mocked(recordingService.service.startCapture).mockRejectedValueOnce(
      new Error("Microphone access was denied.")
    );
    await user.click(screen.getByRole("button", { name: "Record again" }));

    await waitFor(() => {
      expect(screen.getByText("Microphone access was denied.")).toBeVisible();
    });
    expect(recordingService.service.stopAndSave).toHaveBeenCalledTimes(1);
    expectNoCaptureKind(
      sessionService.captureSessionEvent,
      "recording_started"
    );
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
    expectNoCaptureKind(
      sessionService.captureSessionEvent,
      "recording_stopped"
    );
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
    expectNoCaptureKind(
      sessionService.captureSessionEvent,
      "recording_stopped"
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

  it("discards capture and returns idle when the selected segment context is invalid", async () => {
    const user = userEvent.setup();
    const grid: MeasureGrid = {
      bpm: 96,
      timeSignature: "4/4",
      pickupBeats: 0,
      measureOneOffsetMs: 1_000
    };
    const validSegment = createTestSegment({
      id: "segment-invalid",
      name: "Invalid timing",
      targetBpm: 96,
      grid: createPracticeSegmentGridAssociation(grid)
    });
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
    const segmentService = {
      ...createPracticeSegmentService([validSegment]),
      getSegment: vi.fn(async () => invalidSegment)
    };
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
    expect(recordingService.service.discardCapture).toHaveBeenCalledOnce();
    expectNoCaptureKind(
      sessionService.captureSessionEvent,
      "recording_stopped"
    );
    expect(recordingService.isActive()).toBe(false);
    expect(screen.getByTestId("sheet-recording-state")).toHaveTextContent("stopped");
    expect(screen.getByRole("button", { name: "Start recording" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Stop recording" })).toBeDisabled();
    expect(useSheetPracticeRecordingWorkflowStore.getState()).toMatchObject({
      sheetId: "sheet-alpha",
      activeSegmentId: "segment-invalid",
      status: "error",
      error: "Selected segment timing is invalid. Recording was not saved."
    });
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

    await segmentService.deleteSegment("sheet-alpha", "segment-alpha");
    await user.click(screen.getByRole("button", { name: "Stop recording" }));

    await waitFor(() => {
      expect(screen.getByText("Selected segment no longer exists. Recording was not saved.")).toBeVisible();
    });
    expect(segmentService.getSegment).toHaveBeenCalledWith("sheet-alpha", "segment-alpha");
    expect(recordingService.service.stopAndSave).not.toHaveBeenCalled();
    expect(recordingService.service.discardCapture).toHaveBeenCalledOnce();
    expectNoCaptureKind(
      sessionService.captureSessionEvent,
      "recording_stopped"
    );
    expect(recordingService.isActive()).toBe(false);
    expect(screen.getByTestId("sheet-recording-state")).toHaveTextContent("stopped");
    expect(screen.getByRole("button", { name: "Start recording" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Stop recording" })).toBeDisabled();
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
    expect(recordingService.service.discardCapture).toHaveBeenCalledOnce();
    expectNoCaptureKind(
      sessionService.captureSessionEvent,
      "recording_stopped"
    );
    expect(recordingService.isActive()).toBe(false);
    expect(screen.getByTestId("sheet-recording-state")).toHaveTextContent("stopped");
    expect(screen.getByRole("button", { name: "Start recording" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Stop recording" })).toBeDisabled();
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
    practiceSegmentSelectorPanelMock.implementation = null;
    resetRecordingWorkflowStore();
  });

  describe("segment tempo apply UI", () => {
    function renderControls({
      defaultBpm = 72,
      practiceSegmentService = createPracticeSegmentService(),
      sessionService = createIdleSessionService(),
      returnSegmentId = null,
      sheetId = "sheet-alpha",
      onSelectedSegmentChange
    }: {
      defaultBpm?: number;
      practiceSegmentService?: PracticeSegmentService;
      sessionService?: ReturnType<typeof createIdleSessionService>;
      returnSegmentId?: string | null;
      sheetId?: string;
      onSelectedSegmentChange?: SheetPracticeControlsProps["onSelectedSegmentChange"];
    } = {}) {
      return render(
        <SheetPracticeControls
          sheetId={sheetId}
          sheetName="Alpha"
          defaultBpm={defaultBpm}
          defaultTimeSignature="4/4"
          returnSegmentId={returnSegmentId}
          sessionService={sessionService}
          measureGridService={createMeasureGridService(createTestGrid())}
          practiceSegmentService={practiceSegmentService}
          onSelectedSegmentChange={onSelectedSegmentChange}
        />
      );
    }

    async function selectSegment(segmentId: string) {
      await waitFor(() => {
        expect(screen.getByTestId(`practice-segment-row-${segmentId}`)).toBeVisible();
      });
      await userEvent.click(screen.getByTestId(`practice-segment-row-${segmentId}`));
    }

    function expectApplyTargetBpmUnavailable() {
      const applyButton = screen.queryByRole("button", {
        name: /Apply target BPM/i
      });

      if (applyButton) {
        expect(applyButton).toBeDisabled();
      } else {
        expect(applyButton).not.toBeInTheDocument();
      }
    }

    it("applies a selected target BPM through the existing settings path without creating a session", async () => {
      const user = userEvent.setup();
      const sessionService = createIdleSessionService();
      const segment = createTestSegment({
        id: "segment-target",
        name: "Target tempo",
        targetBpm: 96
      });

      renderControls({
        defaultBpm: 72,
        practiceSegmentService: createPracticeSegmentService([segment]),
        sessionService
      });

      await selectSegment("segment-target");
      expect(screen.getByRole("button", { name: /Apply target BPM/i })).toBeEnabled();

      await user.click(screen.getByRole("button", { name: /Apply target BPM/i }));

      await waitFor(() => {
        expect(screen.getByRole("spinbutton", { name: "BPM" })).toHaveValue(96);
      });
      expect(screen.getByText(/Tick interval 625 ms/i)).toBeVisible();
      expect(screen.getByText(/Target already applied/i)).toBeVisible();
      expect(screen.getByRole("button", { name: /Apply target BPM/i })).toBeDisabled();
      expect(sessionService.ensureSheetSession).not.toHaveBeenCalled();
      expect(sessionService.captureSessionEvent).not.toHaveBeenCalled();
    });

    it("keeps no-segment, no-target, and already-applied states neutral or disabled", async () => {
      const noTargetSegment = createTestSegment({
        id: "segment-no-target",
        name: "No target",
        targetBpm: null
      });
      const alreadyAppliedSegment = createTestSegment({
        id: "segment-already",
        name: "Already applied",
        targetBpm: 96
      });

      renderControls({
        defaultBpm: 96,
        practiceSegmentService: createPracticeSegmentService([
          noTargetSegment,
          alreadyAppliedSegment
        ])
      });

      await waitFor(() => {
        expect(screen.getByText(/Select a segment to use target BPM/i)).toBeVisible();
      });
      expectApplyTargetBpmUnavailable();

      await selectSegment("segment-no-target");
      expect(screen.getAllByText(/No target BPM/i)[0]).toBeVisible();
      expectApplyTargetBpmUnavailable();
      expect(screen.getByRole("spinbutton", { name: "BPM" })).toHaveValue(96);

      await selectSegment("segment-already");
      expect(screen.getByText(/Target already applied/i)).toBeVisible();
      expectApplyTargetBpmUnavailable();
      expect(screen.getByRole("spinbutton", { name: "BPM" })).toHaveValue(96);
    });

    it("uses the P4-01 clamp result for 300 BPM targets and treats 240 as already applied", async () => {
      const user = userEvent.setup();
      const highTargetSegment = createTestSegment({
        id: "segment-300",
        name: "Fast target",
        targetBpm: 300
      });

      renderControls({
        defaultBpm: 120,
        practiceSegmentService: createPracticeSegmentService([highTargetSegment])
      });

      await selectSegment("segment-300");
      await user.click(screen.getByRole("button", { name: /Apply target BPM/i }));

      await waitFor(() => {
        expect(screen.getByRole("spinbutton", { name: "BPM" })).toHaveValue(240);
      });
      expect(screen.getByText(/Target already applied/i)).toBeVisible();
      expect(screen.getByText(/Tick interval 250 ms/i)).toBeVisible();
    });

    it("does not enable apply for a 300 BPM target when committed BPM is already 240", async () => {
      const highTargetSegment = createTestSegment({
        id: "segment-300",
        name: "Fast target",
        targetBpm: 300
      });

      renderControls({
        defaultBpm: 240,
        practiceSegmentService: createPracticeSegmentService([highTargetSegment])
      });

      await selectSegment("segment-300");

      expect(screen.getByText(/Target already applied/i)).toBeVisible();
      expectApplyTargetBpmUnavailable();
      expect(screen.getByRole("spinbutton", { name: "BPM" })).toHaveValue(240);
    });

    it("updates target state when selection changes", async () => {
      const user = userEvent.setup();
      const opening = createTestSegment({
        id: "segment-opening",
        name: "Opening",
        targetBpm: 96
      });
      const bridge = createTestSegment({
        id: "segment-bridge",
        name: "Bridge",
        targetBpm: 108
      });

      renderControls({
        defaultBpm: 72,
        practiceSegmentService: createPracticeSegmentService([opening, bridge])
      });

      await selectSegment("segment-opening");
      expect(screen.getAllByText(/Target 96 BPM/i)[0]).toBeVisible();
      expect(screen.getByRole("button", { name: /Apply target BPM/i })).toBeEnabled();

      await selectSegment("segment-bridge");
      expect(screen.getAllByText(/Target 108 BPM/i)[0]).toBeVisible();
      expect(screen.getByRole("button", { name: /Apply target BPM/i })).toBeEnabled();

      await user.click(screen.getByRole("button", { name: /Apply target BPM/i }));
      await waitFor(() => {
        expect(screen.getByRole("spinbutton", { name: "BPM" })).toHaveValue(108);
      });
    });

    it("clears the apply state when the selected segment is deleted", async () => {
      const user = userEvent.setup();
      const segment = createTestSegment({
        id: "segment-delete",
        name: "Delete me",
        targetBpm: 96
      });

      renderControls({
        defaultBpm: 72,
        practiceSegmentService: createPracticeSegmentService([segment])
      });

      await selectSegment("segment-delete");
      expect(screen.getByRole("button", { name: /Apply target BPM/i })).toBeEnabled();

      await user.click(screen.getByRole("button", { name: "Delete Delete me" }));
      await user.click(screen.getByRole("button", { name: "Confirm delete Delete me" }));

      await waitFor(() => {
        expect(screen.getByTestId("practice-segment-empty-state")).toBeVisible();
      });
      expect(screen.getByText(/Select a segment to use target BPM/i)).toBeVisible();
      expectApplyTargetBpmUnavailable();
      expect(screen.queryByText(/Target 96 BPM/i)).not.toBeInTheDocument();
    });

    it("refreshes selected target BPM after editing without a reload", async () => {
      const user = userEvent.setup();
      const segment = createTestSegment({
        id: "segment-edit",
        name: "Editable target",
        targetBpm: 96
      });

      renderControls({
        defaultBpm: 72,
        practiceSegmentService: createPracticeSegmentService([segment])
      });

      await selectSegment("segment-edit");
      expect(screen.getAllByText(/Target 96 BPM/i)[0]).toBeVisible();

      await user.click(screen.getByRole("button", { name: "Edit Editable target" }));
      await user.clear(screen.getByLabelText("Target BPM"));
      await user.type(screen.getByLabelText("Target BPM"), "108");
      await user.click(screen.getByRole("button", { name: "Save segment" }));

      await waitFor(() => {
        expect(screen.getAllByText(/Target 108 BPM/i)[0]).toBeVisible();
      });
      expect(screen.getByRole("button", { name: /Apply target BPM/i })).toBeEnabled();

      await user.click(screen.getByRole("button", { name: /Apply target BPM/i }));
      await waitFor(() => {
        expect(screen.getByRole("spinbutton", { name: "BPM" })).toHaveValue(108);
      });
    });

    it("ignores stale or mismatched sheet selection and keeps the selector state honest", async () => {
      const foreignSegment = createTestSegment({
        id: "segment-foreign",
        sheetId: "sheet-beta",
        name: "Foreign segment",
        targetBpm: 96
      });

      renderControls({
        defaultBpm: 72,
        returnSegmentId: "segment-foreign",
        practiceSegmentService: createPracticeSegmentService([foreignSegment])
      });

      await waitFor(() => {
        expect(screen.getByTestId("practice-segment-return-status")).toHaveTextContent(
          "Saved segment is no longer available"
        );
      });
      expect(screen.getByText(/Select a segment to use target BPM/i)).toBeVisible();
      expectApplyTargetBpmUnavailable();
      expect(screen.getByRole("spinbutton", { name: "BPM" })).toHaveValue(72);
    });

    it("clears parent tempo state when the selector emits a stale previous-sheet callback", async () => {
      const user = userEvent.setup();
      const currentSheetSegment = createTestSegment({
        id: "segment-current",
        name: "Current selection",
        targetBpm: 96
      });
      const staleCallbackSegment = createTestSegment({
        id: "segment-stale",
        name: "Stale callback",
        targetBpm: 108
      });

      practiceSegmentSelectorPanelMock.implementation = ({
        sheetId,
        onSelectedSegmentChange
      }) => (
        <section data-testid="mock-practice-segment-selector">
          <button
            type="button"
            onClick={() =>
              onSelectedSegmentChange?.({
                sheetId,
                segment: currentSheetSegment
              })
            }
          >
            Emit current selection
          </button>
          <button
            type="button"
            onClick={() =>
              onSelectedSegmentChange?.({
                sheetId: "sheet-previous",
                segment: staleCallbackSegment
              })
            }
          >
            Emit stale sheet selection
          </button>
        </section>
      );

      renderControls({
        defaultBpm: 72,
        practiceSegmentService: createPracticeSegmentService([currentSheetSegment])
      });

      await user.click(screen.getByRole("button", { name: "Emit current selection" }));
      expect(screen.getByText(/Target 96 BPM/i)).toBeVisible();
      expect(screen.getByRole("button", { name: /Apply target BPM/i })).toBeEnabled();

      await user.click(screen.getByRole("button", { name: "Emit stale sheet selection" }));

      expect(screen.getByText(/Select a segment to use target BPM/i)).toBeVisible();
      expectApplyTargetBpmUnavailable();
      expect(screen.queryByText(/Target 108 BPM/i)).not.toBeInTheDocument();
      expect(screen.getByRole("spinbutton", { name: "BPM" })).toHaveValue(72);
    });

    it("reports selected segments to an optional parent callback", async () => {
      const onSelectedSegmentChange = vi.fn();
      const segment = createTestSegment({
        id: "segment-assisted",
        name: "Assisted turn",
        targetBpm: 96
      });

      renderControls({
        practiceSegmentService: createPracticeSegmentService([segment]),
        onSelectedSegmentChange
      });

      await selectSegment("segment-assisted");

      await waitFor(() => {
        expect(onSelectedSegmentChange).toHaveBeenLastCalledWith(segment);
      });
    });

    it("reports null to the optional parent callback for stale selector emissions", async () => {
      const user = userEvent.setup();
      const onSelectedSegmentChange = vi.fn();
      const staleCallbackSegment = createTestSegment({
        id: "segment-stale",
        name: "Stale callback",
        targetBpm: 108
      });

      practiceSegmentSelectorPanelMock.implementation = ({ onSelectedSegmentChange: notify }) => (
        <section data-testid="mock-practice-segment-selector">
          <button
            type="button"
            onClick={() =>
              notify?.({
                sheetId: "sheet-previous",
                segment: staleCallbackSegment
              })
            }
          >
            Emit stale sheet selection
          </button>
        </section>
      );

      renderControls({ onSelectedSegmentChange });

      await user.click(screen.getByRole("button", { name: "Emit stale sheet selection" }));

      expect(onSelectedSegmentChange).toHaveBeenLastCalledWith(null);
    });

    it("clears parent tempo state on segment load failure and empty reload while preserving selector UI", async () => {
      const segment = createTestSegment({
        id: "segment-clear",
        name: "Clearable target",
        targetBpm: 96
      });
      const { rerender } = renderControls({
        defaultBpm: 72,
        practiceSegmentService: createPracticeSegmentService([segment])
      });

      await selectSegment("segment-clear");
      expect(screen.getByRole("button", { name: /Apply target BPM/i })).toBeEnabled();

      rerender(
        <SheetPracticeControls
          sheetId="sheet-alpha"
          sheetName="Alpha"
          defaultBpm={72}
          defaultTimeSignature="4/4"
          sessionService={createIdleSessionService()}
          measureGridService={createMeasureGridService(createTestGrid())}
          practiceSegmentService={createRejectingPracticeSegmentService("Segments unavailable")}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("practice-segment-selector-status")).toHaveTextContent("Unavailable");
      });
      expect(screen.getByRole("alert")).toHaveTextContent("Segments unavailable");
      expect(screen.getByText(/Select a segment to use target BPM/i)).toBeVisible();
      expectApplyTargetBpmUnavailable();

      rerender(
        <SheetPracticeControls
          sheetId="sheet-alpha"
          sheetName="Alpha"
          defaultBpm={72}
          defaultTimeSignature="4/4"
          sessionService={createIdleSessionService()}
          measureGridService={createMeasureGridService(createTestGrid())}
          practiceSegmentService={createPracticeSegmentService()}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("practice-segment-empty-state")).toBeVisible();
      });
      expect(screen.getByTestId("practice-segment-selector-panel")).toBeVisible();
      expect(screen.getByText(/Select a segment to use target BPM/i)).toBeVisible();
      expectApplyTargetBpmUnavailable();
    });

    it("applies from committed BPM settings instead of an uncommitted BPM draft", async () => {
      const targetSegment = createTestSegment({
        id: "segment-draft",
        name: "Draft target",
        targetBpm: 240
      });

      renderControls({
        defaultBpm: 120,
        practiceSegmentService: createPracticeSegmentService([targetSegment])
      });

      await selectSegment("segment-draft");
      const bpmInput = screen.getByRole("spinbutton", { name: "BPM" });
      const blurListener = vi.fn();
      const keyDownListener = vi.fn();

      bpmInput.addEventListener("blur", blurListener);
      bpmInput.addEventListener("keydown", keyDownListener);

      fireEvent.change(bpmInput, { target: { value: "240" } });

      expect(bpmInput).toHaveValue(240);
      expect(screen.getByRole("button", { name: /Apply target BPM/i })).toBeEnabled();

      fireEvent.click(screen.getByRole("button", { name: /Apply target BPM/i }));

      await waitFor(() => {
        expect(screen.getByRole("spinbutton", { name: "BPM" })).toHaveValue(240);
      });
      expect(screen.getByText(/Target already applied/i)).toBeVisible();
      expect(screen.getByText(/Tick interval 250 ms/i)).toBeVisible();
      expect(blurListener).not.toHaveBeenCalled();
      expect(keyDownListener).not.toHaveBeenCalled();
    });
  });

  describe("per-sheet presets UI", () => {
    function createInspectableMetronomeService() {
      let playing = false;

      return {
        service: {
          onTick: vi.fn(() => () => undefined),
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

    function renderPresetControls({
      defaultBpm = 72,
      sheetId = "sheet-alpha",
      presetService = createFakeSheetMetronomePresetService(),
      practiceSegmentService = createPracticeSegmentService(),
      sessionService = createIdleSessionService(),
      measureGridService = createMeasureGridService(createTestGrid()),
      metronomeService = createInspectableMetronomeService()
    }: {
      defaultBpm?: number;
      sheetId?: string;
      presetService?: ReturnType<typeof createFakeSheetMetronomePresetService>;
      practiceSegmentService?: PracticeSegmentService;
      sessionService?: SheetPracticeControlsProps["sessionService"];
      measureGridService?: MeasureGridService;
      metronomeService?: ReturnType<typeof createInspectableMetronomeService>;
    } = {}) {
      return render(
        <SheetPracticeControls
          sheetId={sheetId}
          sheetName="Alpha"
          defaultBpm={defaultBpm}
          defaultTimeSignature="4/4"
          createMetronomeService={() => metronomeService.service}
          createCountdownExecutor={() => createFirstTickCountdownExecutor()}
          sessionService={sessionService}
          measureGridService={measureGridService}
          practiceSegmentService={practiceSegmentService}
          sheetMetronomePresetService={presetService.service}
        />
      );
    }

    async function waitForPresetManager() {
      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Metronome presets" })).toBeVisible();
      });
    }

    it("rejects a blank preset name before saving", async () => {
      const user = userEvent.setup();
      const presetService = createFakeSheetMetronomePresetService();

      renderPresetControls({ presetService });
      await waitForPresetManager();

      await user.click(screen.getByRole("button", { name: "Save preset" }));

      await waitFor(() => {
        expect(screen.getAllByText("Preset name is required.")[0]).toBeVisible();
      });
      expect(presetService.service.savePreset).not.toHaveBeenCalled();
    });

    it("surfaces list failures without crashing the preset manager", async () => {
      const presetService = createFakeSheetMetronomePresetService();

      vi.mocked(presetService.service.listPresets).mockRejectedValueOnce(
        new Error("List failed.")
      );

      renderPresetControls({ presetService });
      await waitForPresetManager();

      await waitFor(() => {
        expect(screen.getAllByText("List failed.")[0]).toBeVisible();
      });
      expect(screen.getByLabelText("Preset name")).toBeVisible();
    });

    it("renders an empty preset manager and saves a sheet-wide snapshot", async () => {
      const user = userEvent.setup();
      const presetService = createFakeSheetMetronomePresetService();

      renderPresetControls({ presetService, defaultBpm: 120 });
      await waitForPresetManager();
      expect(screen.getByText("No sheet-wide presets saved.")).toBeVisible();

      const bpmInput = screen.getByRole("spinbutton", { name: "BPM" });

      await user.clear(bpmInput);
      await user.type(bpmInput, "132");
      fireEvent.blur(bpmInput);
      await user.selectOptions(screen.getByLabelText("Time signature"), "3/4");
      await user.selectOptions(screen.getByLabelText("Subdivision"), "eighth");
      await user.selectOptions(screen.getByLabelText("Countdown"), "4");
      await user.click(screen.getByRole("button", { name: "Every beat" }));
      await user.type(screen.getByLabelText("Preset name"), "Warmup");
      await user.click(screen.getByRole("button", { name: "Save preset" }));

      await waitFor(() => {
        expect(presetService.service.savePreset).toHaveBeenCalledOnce();
      });
      expect(presetService.service.savePreset).toHaveBeenCalledWith(
        expect.objectContaining({
          sheetId: "sheet-alpha",
          segmentId: null,
          name: "Warmup",
          settings: {
            bpm: 132,
            timeSignature: "3/4",
            subdivision: "eighth",
            accent: "every-beat",
            countdownBeats: 4,
            barCountIn: {
              enabled: false,
              bars: 1
            }
          }
        })
      );
      await waitFor(() => {
        expect(screen.getByText("Warmup")).toBeVisible();
      });
      expect(presetService.service.listPresets).toHaveBeenCalledWith("sheet-alpha");
    });

    it("saves a selected-segment preset with bar count-in state and scope label", async () => {
      const user = userEvent.setup();
      const segment = createTestSegment();
      const presetService = createFakeSheetMetronomePresetService();

      renderPresetControls({
        presetService,
        practiceSegmentService: createPracticeSegmentService([segment])
      });

      await waitFor(() => {
        expect(screen.getByTestId("practice-segment-row-segment-alpha")).toBeVisible();
      });
      await user.click(screen.getByTestId("practice-segment-row-segment-alpha"));
      await enableBarCountIn(user);
      await selectBarCountInBars(user, "2");
      await user.type(screen.getByLabelText("Preset name"), "Segment focus");
      await user.click(screen.getByLabelText("Selected segment"));
      await user.click(screen.getByRole("button", { name: "Save preset" }));

      await waitFor(() => {
        expect(presetService.service.savePreset).toHaveBeenCalledOnce();
      });
      expect(presetService.service.savePreset).toHaveBeenCalledWith(
        expect.objectContaining({
          segmentId: "segment-alpha",
          settings: expect.objectContaining({
            barCountIn: {
              enabled: true,
              bars: 2
            }
          })
        })
      );
      await waitFor(() => {
        expect(screen.getByText("Selected segment presets")).toBeVisible();
      });
      expect(screen.getAllByText("Selected segment: Opening phrase")[0]).toBeVisible();
    });

    it("loads a preset into metronome and bar-count-in controls without side effects", async () => {
      const user = userEvent.setup();
      const presetService = createFakeSheetMetronomePresetService([
        createTestPreset({
          settings: {
            bpm: 144,
            timeSignature: "6/8",
            subdivision: "sixteenth",
            accent: "off",
            countdownBeats: 8,
            barCountIn: {
              enabled: true,
              bars: 2
            }
          }
        })
      ]);
      const sessionService = createIdleSessionService();
      const measureGridService = createMeasureGridService(createTestGrid());
      const recordingService = createInspectableSheetRecordingService();
      const metronomeService = createInspectableMetronomeService();

      render(
        <SheetPracticeControls
          sheetId="sheet-alpha"
          sheetName="Alpha"
          defaultBpm={72}
          defaultTimeSignature="4/4"
          createMetronomeService={() => metronomeService.service}
          createSheetRecordingService={() => recordingService.service}
          sessionService={sessionService}
          measureGridService={measureGridService}
          practiceSegmentService={createPracticeSegmentService()}
          sheetMetronomePresetService={presetService.service}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Warmup")).toBeVisible();
      });
      const gridReadCallsBeforeLoad = measureGridService.getGrid.mock.calls.length;

      await user.click(screen.getByRole("button", { name: "Load preset Warmup" }));

      await waitFor(() => {
        expect(screen.getByRole("spinbutton", { name: "BPM" })).toHaveValue(144);
      });
      expect(screen.getByLabelText("Time signature")).toHaveValue("6/8");
      expect(screen.getByLabelText("Subdivision")).toHaveValue("sixteenth");
      expect(screen.getByLabelText("Countdown")).toHaveValue("8");
      expect(screen.getByRole("button", { name: "Off" })).toHaveAttribute("aria-pressed", "true");
      expectBarCountInToggle(getBarCountInToggle(), true);
      expectBarCountInBarsValue(getBarCountInBarsControl(), "2");
      expect(metronomeService.service.start).not.toHaveBeenCalled();
      expect(metronomeService.service.stop).not.toHaveBeenCalled();
      expect(sessionService.ensureSheetSession).not.toHaveBeenCalled();
      expectNoCaptureKind(sessionService.captureSessionEvent, "metronome_started");
      expect(recordingService.service.startCapture).not.toHaveBeenCalled();
      expect(recordingService.service.stopAndSave).not.toHaveBeenCalled();
      expect(measureGridService.getGrid).toHaveBeenCalledTimes(gridReadCallsBeforeLoad);
    });

    it("surfaces save and load failures without changing the current controls", async () => {
      const user = userEvent.setup();
      const presetService = createFakeSheetMetronomePresetService([createTestPreset()]);

      vi.mocked(presetService.service.savePreset).mockRejectedValueOnce(
        new Error("Save failed.")
      );
      vi.mocked(presetService.service.loadPreset).mockRejectedValueOnce(
        new Error("Load failed.")
      );

      renderPresetControls({ presetService, defaultBpm: 72 });

      await waitFor(() => {
        expect(screen.getByText("Warmup")).toBeVisible();
      });

      const presetNameInput = screen.getByLabelText("Preset name");

      await user.type(presetNameInput, "Broken snapshot");
      await user.click(screen.getByRole("button", { name: "Save preset" }));

      await waitFor(() => {
        expect(screen.getAllByText("Save failed.")[0]).toBeVisible();
      });
      expect(presetNameInput).toHaveValue("Broken snapshot");
      expect(screen.queryByText("Broken snapshot")).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Load preset Warmup" }));

      await waitFor(() => {
        expect(screen.getAllByText("Load failed.")[0]).toBeVisible();
      });
      expect(screen.getByRole("spinbutton", { name: "BPM" })).toHaveValue(72);
    });

    it("disables preset load while the metronome is playing", async () => {
      const user = userEvent.setup();
      const presetService = createFakeSheetMetronomePresetService([createTestPreset()]);
      const sessionService = {
        ...createIdleSessionService(),
        ensureSheetSession: vi.fn(async () => createSheetSession())
      };
      const metronomeService = createInspectableMetronomeService();

      renderPresetControls({
        presetService,
        sessionService,
        metronomeService
      });
      await waitFor(() => {
        expect(screen.getByText("Warmup")).toBeVisible();
      });

      await user.click(screen.getByRole("button", { name: "Start metronome" }));
      await waitFor(() => {
        expect(screen.getByTestId("sheet-metronome-state")).toHaveTextContent("Playing");
      });

      const loadButton = screen.getByRole("button", { name: "Load preset Warmup" });

      expect(loadButton).toBeDisabled();
      expect(presetService.service.loadPreset).not.toHaveBeenCalled();
    });

    it("ignores a pending preset load after playback starts and stops before resolution", async () => {
      const user = userEvent.setup();
      const loadedPreset = createTestPreset({
        settings: {
          bpm: 180
        }
      });
      const staleLoad =
        createDeferred<Awaited<ReturnType<SheetMetronomePresetService["loadPreset"]>>>();
      const presetService = createFakeSheetMetronomePresetService([loadedPreset]);
      const sessionService = {
        ...createIdleSessionService(),
        ensureSheetSession: vi.fn(async () => createSheetSession())
      };

      vi.mocked(presetService.service.loadPreset).mockReturnValueOnce(staleLoad.promise);

      renderPresetControls({ presetService, sessionService, defaultBpm: 72 });

      await waitFor(() => {
        expect(screen.getByText("Warmup")).toBeVisible();
      });

      await user.click(screen.getByRole("button", { name: "Load preset Warmup" }));
      await user.selectOptions(screen.getByLabelText("Countdown"), "4");
      await user.click(screen.getByRole("button", { name: "Start metronome" }));

      await waitFor(() => {
        expect(screen.getByTestId("sheet-metronome-state")).toHaveTextContent("Counting");
      });

      await user.click(screen.getByRole("button", { name: "Stop metronome" }));
      await waitFor(() => {
        expect(screen.getByTestId("sheet-metronome-state")).toHaveTextContent("Stopped");
      });

      await act(async () => {
        staleLoad.resolve({
          status: "loaded",
          preset: loadedPreset,
          settings: loadedPreset.settings
        });
        await staleLoad.promise;
      });

      expect(screen.getByRole("spinbutton", { name: "BPM" })).toHaveValue(72);
      expect(screen.queryByText("Loaded preset Warmup.")).not.toBeInTheDocument();
    });

    it("renames and deletes presets only after explicit actions", async () => {
      const user = userEvent.setup();
      const presetService = createFakeSheetMetronomePresetService([
        createTestPreset()
      ]);

      renderPresetControls({ presetService });
      await waitFor(() => {
        expect(screen.getByText("Warmup")).toBeVisible();
      });

      await user.click(screen.getByRole("button", { name: "Rename preset Warmup" }));
      const renameInput = screen.getByLabelText("Rename preset Warmup name");

      await user.clear(renameInput);
      await user.type(renameInput, "Renamed warmup");
      await user.click(screen.getByRole("button", { name: "Save rename" }));

      await waitFor(() => {
        expect(screen.getByText("Renamed warmup")).toBeVisible();
      });
      expect(presetService.service.renamePreset).toHaveBeenCalledWith({
        sheetId: "sheet-alpha",
        presetId: "preset-alpha",
        name: "Renamed warmup"
      });

      await user.click(screen.getByRole("button", { name: "Delete preset Renamed warmup" }));
      expect(presetService.service.deletePreset).not.toHaveBeenCalled();
      await user.click(
        screen.getByRole("button", { name: "Confirm delete preset Renamed warmup" })
      );

      await waitFor(() => {
        expect(screen.queryByText("Renamed warmup")).not.toBeInTheDocument();
      });
      expect(presetService.service.deletePreset).toHaveBeenCalledWith(
        "sheet-alpha",
        "preset-alpha"
      );
    });

    it("surfaces delete failures without removing the preset", async () => {
      const user = userEvent.setup();
      const presetService = createFakeSheetMetronomePresetService([createTestPreset()]);

      vi.mocked(presetService.service.deletePreset).mockRejectedValueOnce(
        new Error("Delete failed.")
      );

      renderPresetControls({ presetService });
      await waitFor(() => {
        expect(screen.getByText("Warmup")).toBeVisible();
      });

      await user.click(screen.getByRole("button", { name: "Delete preset Warmup" }));
      await user.click(
        screen.getByRole("button", { name: "Confirm delete preset Warmup" })
      );

      await waitFor(() => {
        expect(screen.getAllByText("Delete failed.")[0]).toBeVisible();
      });
      expect(screen.getByText("Warmup")).toBeVisible();
      expect(presetService.getPresets()).toHaveLength(1);
    });

    it("surfaces duplicate-name and missing-load failures without changing controls", async () => {
      const user = userEvent.setup();
      const presetService = createFakeSheetMetronomePresetService([
        createTestPreset({ id: "preset-alpha", name: "Warmup" }),
        createTestPreset({ id: "preset-beta", name: "Duplicate" })
      ]);

      renderPresetControls({ presetService, defaultBpm: 72 });
      await waitFor(() => {
        expect(screen.getByText("Warmup")).toBeVisible();
      });

      await user.click(screen.getByRole("button", { name: "Rename preset Warmup" }));
      const renameInput = screen.getByLabelText("Rename preset Warmup name");

      await user.clear(renameInput);
      await user.type(renameInput, "Duplicate");
      await user.click(screen.getByRole("button", { name: "Save rename" }));

      await waitFor(() => {
        expect(screen.getAllByText("Preset name already exists.")[0]).toBeVisible();
      });
      expect(
        presetService.getPresets().find((preset) => preset.id === "preset-alpha")?.name
      ).toBe("Warmup");

      vi.mocked(presetService.service.loadPreset).mockResolvedValueOnce({
        status: "missing"
      });
      await user.click(screen.getByRole("button", { name: "Cancel rename" }));
      await user.click(screen.getByRole("button", { name: "Load preset Warmup" }));

      await waitFor(() => {
        expect(screen.getAllByText("Preset was not found.")[0]).toBeVisible();
      });
      expect(screen.getByRole("spinbutton", { name: "BPM" })).toHaveValue(72);
    });

    it("ignores stale preset list and load responses after the sheet changes", async () => {
      const user = userEvent.setup();
      const staleList = createDeferred<SheetMetronomePreset[]>();
      const nextList = createDeferred<SheetMetronomePreset[]>();
      const staleLoad =
        createDeferred<Awaited<ReturnType<SheetMetronomePresetService["loadPreset"]>>>();
      const presetService = createFakeSheetMetronomePresetService([
        createTestPreset()
      ]);

      vi.mocked(presetService.service.listPresets).mockImplementation((sheetId) =>
        sheetId === "sheet-alpha" ? staleList.promise : nextList.promise
      );
      const { rerender } = render(
        <SheetPracticeControls
          sheetId="sheet-alpha"
          sheetName="Alpha"
          defaultBpm={72}
          defaultTimeSignature="4/4"
          sessionService={createIdleSessionService()}
          measureGridService={createMeasureGridService(createTestGrid())}
          practiceSegmentService={createPracticeSegmentService()}
          sheetMetronomePresetService={presetService.service}
        />
      );

      rerender(
        <SheetPracticeControls
          sheetId="sheet-beta"
          sheetName="Beta"
          defaultBpm={72}
          defaultTimeSignature="4/4"
          sessionService={createIdleSessionService()}
          measureGridService={createMeasureGridService(createTestGrid())}
          practiceSegmentService={createPracticeSegmentService()}
          sheetMetronomePresetService={presetService.service}
        />
      );

      await act(async () => {
        staleList.resolve([
          createTestPreset({ sheetId: "sheet-alpha", name: "Stale Alpha" })
        ]);
        await staleList.promise;
      });
      expect(screen.queryByText("Stale Alpha")).not.toBeInTheDocument();

      await act(async () => {
        nextList.resolve([createTestPreset({ sheetId: "sheet-beta", name: "Beta preset" })]);
        await nextList.promise;
      });
      await waitFor(() => {
        expect(screen.getByText("Beta preset")).toBeVisible();
      });

      vi.mocked(presetService.service.loadPreset).mockReturnValueOnce(staleLoad.promise);
      await user.click(screen.getByRole("button", { name: "Load preset Beta preset" }));
      rerender(
        <SheetPracticeControls
          sheetId="sheet-gamma"
          sheetName="Gamma"
          defaultBpm={72}
          defaultTimeSignature="4/4"
          sessionService={createIdleSessionService()}
          measureGridService={createMeasureGridService(createTestGrid())}
          practiceSegmentService={createPracticeSegmentService()}
          sheetMetronomePresetService={presetService.service}
        />
      );

      await act(async () => {
        staleLoad.resolve({
          status: "loaded",
          preset: createTestPreset({ sheetId: "sheet-beta", name: "Beta preset" }),
          settings: createTestPreset({
            settings: {
              bpm: 180
            }
          }).settings
        });
        await staleLoad.promise;
      });

      expect(screen.getByRole("spinbutton", { name: "BPM" })).toHaveValue(72);
    });
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
      fakeTone.emitScheduledTick(10 + index * 0.25);
    }

    service.stop();
    window.removeEventListener(METRONOME_TRACE_EVENT, listener);

    const downbeatTicks = new Set([0, 6]);
    const beatTicks = new Set([0, 2, 4, 6]);
    const expectedTickIntents = Array.from({ length: 7 }, (_, tickIndex) => ({
      accented: downbeatTicks.has(tickIndex),
      beatTick: beatTicks.has(tickIndex)
    }));
    const traceSummary = traces.map(({ accented, subdivision, expectedIntervalMs }) => ({
      accented,
      subdivision,
      expectedIntervalMs
    }));
    const clickIntents = fakeTone.clickIntents.map(({ accented, beatTick }) => ({
      accented,
      beatTick
    }));

    expect(fakeTone.lastLoopInterval).toBe("8n");
    expect(traceSummary).toEqual(
      expectedTickIntents.map(({ accented }) => ({
        accented,
        subdivision: "eighth",
        expectedIntervalMs: 250
      }))
    );
    expect(clickIntents).toEqual(expectedTickIntents);
  });
});

describe("SheetPracticeControls failure handling", () => {
  beforeEach(() => {
    practiceSegmentSelectorPanelMock.implementation = null;
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

  it("renders bar count-in off by default and reveals one-bar selection when enabled", async () => {
    const user = userEvent.setup();

    render(
      <SheetPracticeControls
        sheetId="sheet-alpha"
        sheetName="Alpha"
        defaultBpm={120}
        defaultTimeSignature="4/4"
        sessionService={createIdleSessionService()}
        measureGridService={createMeasureGridService(createTestGrid())}
      />
    );

    const toggle = getBarCountInToggle();

    expectBarCountInToggle(toggle, false);
    const hiddenOrDisabledBars = queryBarCountInBarsControl();

    if (hiddenOrDisabledBars) {
      expectControlUnavailable(hiddenOrDisabledBars);
      expectBarCountInBarsValue(hiddenOrDisabledBars, "1");
    }

    await enableBarCountIn(user);

    const barsControl = getBarCountInBarsControl();

    expectBarCountInToggle(toggle, true);
    expect(barsControl).toBeEnabled();
    expectBarCountInBarsValue(barsControl, "1");
  });

  it("keeps bar count-in local to the mount and does not mutate legacy countdown settings", async () => {
    const user = userEvent.setup();
    const storageSetItem = vi.spyOn(Storage.prototype, "setItem");
    const measureGridService = createMeasureGridService(createTestGrid());

    try {
      const { unmount } = render(
        <SheetPracticeControls
          sheetId="sheet-alpha"
          sheetName="Alpha"
          defaultBpm={120}
          defaultTimeSignature="4/4"
          sessionService={createIdleSessionService()}
          measureGridService={measureGridService}
        />
      );

      const countdown = screen.getByLabelText("Countdown", { exact: true });

      await user.selectOptions(countdown, "4");
      await enableBarCountIn(user);
      await selectBarCountInBars(user, "2");

      expect(screen.getByLabelText("Countdown", { exact: true })).toHaveValue("4");
      expectBarCountInBarsValue(getBarCountInBarsControl(), "2");
      expect(measureGridService.saveGrid).not.toHaveBeenCalled();
      expect(measureGridService.clearGrid).not.toHaveBeenCalled();
      expect(storageSetItem).not.toHaveBeenCalled();

      unmount();

      render(
        <SheetPracticeControls
          sheetId="sheet-alpha"
          sheetName="Alpha"
          defaultBpm={120}
          defaultTimeSignature="4/4"
          sessionService={createIdleSessionService()}
          measureGridService={createMeasureGridService(createTestGrid())}
        />
      );

      expectBarCountInToggle(getBarCountInToggle(), false);
      const remountedBars = queryBarCountInBarsControl();

      if (remountedBars) {
        expectControlUnavailable(remountedBars);
        expectBarCountInBarsValue(remountedBars, "1");
      }
    } finally {
      storageSetItem.mockRestore();
    }
  });

  it("uses the visible two-bar selection when preparing a known 4/4 count-in plan", async () => {
    const user = userEvent.setup();
    const collector = createBarCountInHarnessCollector();
    const grid = createTestGrid({
      bpm: 120,
      measureOneOffsetMs: 0
    });

    try {
      render(
        <SheetPracticeControls
          sheetId="sheet-alpha"
          sheetName="Alpha"
          defaultBpm={120}
          defaultTimeSignature="4/4"
          sessionService={createIdleSessionService()}
          measureGridService={createMeasureGridService(grid)}
        />
      );

      await enableBarCountIn(user);
      await selectBarCountInBars(user, "2");
      await user.click(screen.getByRole("button", { name: "Start metronome" }));

      await waitFor(() => {
        expect(collector.plans).toHaveLength(1);
      });
      expect(collector.plans[0]).toMatchObject({
        status: "ready",
        scope: "whole-sheet",
        beatCount: 8,
        totalDurationMs: 4_000
      });
    } finally {
      collector.cleanup();
    }
  });

  it("lets bar count-in replace fixed countdown without loading a grid for disabled starts", async () => {
    const user = userEvent.setup();
    const collector = createBarCountInHarnessCollector();
    const grid = createTestGrid({
      bpm: 120,
      measureOneOffsetMs: 0
    });
    const disabledMeasureGridService = createMeasureGridService(grid);
    const disabledMetronome = createInspectableMetronomeService();

    try {
      const { unmount } = render(
        <SheetPracticeControls
          sheetId="sheet-alpha"
          sheetName="Alpha"
          defaultBpm={120}
          defaultTimeSignature="4/4"
          createMetronomeService={() => disabledMetronome.service}
          createCountdownExecutor={() => createFirstTickCountdownExecutor()}
          sessionService={createIdleSessionService()}
          measureGridService={disabledMeasureGridService}
        />
      );

      const gridLoadCallsBeforeStart = disabledMeasureGridService.getGrid.mock.calls.length;

      await user.selectOptions(screen.getByLabelText("Countdown", { exact: true }), "4");
      await user.click(screen.getByRole("button", { name: "Start metronome" }));

      await waitFor(() => {
        expect(screen.getByTestId("sheet-metronome-state")).toHaveTextContent("Counting");
      });
      expect(disabledMeasureGridService.getGrid).toHaveBeenCalledTimes(gridLoadCallsBeforeStart);
      expect(collector.plans).toEqual([]);
      expect(disabledMetronome.service.start).not.toHaveBeenCalled();

      unmount();

      const enabledMeasureGridService = createMeasureGridService(grid);
      const enabledMetronome = createInspectableMetronomeService();

      render(
        <SheetPracticeControls
          sheetId="sheet-alpha"
          sheetName="Alpha"
          defaultBpm={120}
          defaultTimeSignature="4/4"
          createMetronomeService={() => enabledMetronome.service}
          createCountdownExecutor={() => createFirstTickCountdownExecutor()}
          sessionService={createIdleSessionService()}
          measureGridService={enabledMeasureGridService}
        />
      );

      await user.selectOptions(screen.getByLabelText("Countdown", { exact: true }), "4");
      await enableBarCountIn(user);
      await user.click(screen.getByRole("button", { name: "Start metronome" }));

      await waitFor(() => {
        expect(collector.plans).toHaveLength(1);
      });
      expect(enabledMeasureGridService.getGrid).toHaveBeenCalledWith("sheet-alpha");
      expect(screen.getByTestId("sheet-metronome-state")).toHaveTextContent(
        /Counting|Pre-roll|Measure/
      );
      expect(enabledMetronome.service.start).not.toHaveBeenCalled();
    } finally {
      collector.cleanup();
    }
  });

  it("ignores a deferred grid result after visible bar count-in is turned off before prepare resolves", async () => {
    const user = userEvent.setup();
    const grid = createTestGrid({
      bpm: 120,
      measureOneOffsetMs: 0
    });
    const gridLoad = createDeferred<MeasureGrid | null>();
    const measureGridService = {
      getGrid: vi.fn(() => gridLoad.promise),
      saveGrid: vi.fn(async (_sheetId: string, nextGrid: MeasureGrid) => nextGrid),
      clearGrid: vi.fn(async () => undefined)
    } satisfies MeasureGridService;
    const sessionService = {
      ...createIdleSessionService(),
      ensureSheetSession: vi.fn(async () => createSheetSession())
    };
    const metronome = createInspectableMetronomeService();
    const collector = createBarCountInHarnessCollector();

    try {
      render(
        <SheetPracticeControls
          sheetId="sheet-alpha"
          sheetName="Alpha"
          defaultBpm={120}
          defaultTimeSignature="4/4"
          createMetronomeService={() => metronome.service}
          sessionService={sessionService}
          measureGridService={measureGridService}
        />
      );

      await enableBarCountIn(user);
      await selectBarCountInBars(user, "2");
      await user.click(screen.getByRole("button", { name: "Start metronome" }));

      expect(measureGridService.getGrid).toHaveBeenCalledWith("sheet-alpha");
      expect(collector.plans).toEqual([]);
      expect(metronome.service.start).not.toHaveBeenCalled();

      await user.click(getBarCountInToggle());
      await waitFor(() => {
        expectBarCountInToggle(getBarCountInToggle(), false);
      });

      const barsControl = getBarCountInBarsControl();

      expectControlUnavailable(barsControl);
      expectBarCountInBarsValue(barsControl, "2");

      gridLoad.resolve(grid);
      await act(async () => {
        await gridLoad.promise;
        await Promise.resolve();
      });

      await waitFor(() => {
        expectBarCountInToggle(getBarCountInToggle(), false);
      });
      expect(screen.getByTestId("sheet-metronome-state")).toHaveTextContent("Stopped");
      expect(collector.plans).toEqual([]);
      expect(metronome.service.start).not.toHaveBeenCalled();
      expect(sessionService.ensureSheetSession).not.toHaveBeenCalled();
      expectNoCaptureKind(
        sessionService.captureSessionEvent,
        "metronome_started"
      );
    } finally {
      collector.cleanup();
    }
  });

  it("shows active bar count-in detail for pre-roll and preceding-measure ticks", async () => {
    const user = userEvent.setup();
    const preRollGrid = createTestGrid({
      bpm: 120,
      measureOneOffsetMs: 0
    });
    const preRollMetronome = createInspectableMetronomeService();
    const { unmount } = render(
      <SheetPracticeControls
        sheetId="sheet-alpha"
        sheetName="Alpha"
        defaultBpm={120}
        defaultTimeSignature="4/4"
        createMetronomeService={() => preRollMetronome.service}
        createCountdownExecutor={() => createFirstTickCountdownExecutor()}
        sessionService={createIdleSessionService()}
        measureGridService={createMeasureGridService(preRollGrid)}
      />
    );

    await enableBarCountIn(user);
    await user.click(screen.getByRole("button", { name: "Start metronome" }));

    await waitFor(() => {
      expect(screen.getAllByText(/pre-roll beat/i)[0]).toBeVisible();
    });
    await user.click(screen.getByRole("button", { name: "Stop metronome" }));
    unmount();

    const segmentGrid = createTestGrid({
      bpm: 120,
      measureOneOffsetMs: 0
    });
    const segment = createTestSegment({
      grid: createPracticeSegmentGridAssociation(segmentGrid)
    });

    render(
      <SheetPracticeControls
        sheetId="sheet-alpha"
        sheetName="Alpha"
        defaultBpm={120}
        defaultTimeSignature="4/4"
        createCountdownExecutor={() => createFirstTickCountdownExecutor()}
        sessionService={createIdleSessionService()}
        measureGridService={createMeasureGridService(segmentGrid)}
        practiceSegmentService={createPracticeSegmentService([segment])}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("practice-segment-row-segment-alpha")).toBeVisible();
    });
    await user.click(screen.getByTestId("practice-segment-row-segment-alpha"));
    await enableBarCountIn(user);
    await user.click(screen.getByRole("button", { name: "Start metronome" }));

    await waitFor(() => {
      expect(screen.getAllByText(/measure 4 beat/i)[0]).toBeVisible();
    });
  });

  it("clears visible bar count-in detail and prevents late playback when stopped before playback starts", async () => {
    vi.useFakeTimers();

    const grid = createTestGrid({
      bpm: 120,
      measureOneOffsetMs: 0
    });
    const metronome = createInspectableMetronomeService();

    try {
      render(
        <SheetPracticeControls
          sheetId="sheet-alpha"
          sheetName="Alpha"
          defaultBpm={120}
          defaultTimeSignature="4/4"
          createMetronomeService={() => metronome.service}
          createCountdownExecutor={() => createTimerCountdownExecutor()}
          sessionService={createIdleSessionService()}
          measureGridService={createMeasureGridService(grid)}
        />
      );

      fireEvent.click(getBarCountInToggle());
      expectBarCountInToggle(getBarCountInToggle(), true);

      fireEvent.click(screen.getByRole("button", { name: "Start metronome" }));
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(screen.getByTestId("sheet-metronome-state")).toHaveTextContent("Counting 4");

      await act(async () => {
        await vi.advanceTimersToNextTimerAsync();
        await Promise.resolve();
      });

      expect(screen.getAllByText(/pre-roll beat/i)[0]).toBeVisible();

      fireEvent.click(screen.getByRole("button", { name: "Stop metronome" }));

      expect(screen.queryByText(/pre-roll beat/i)).not.toBeInTheDocument();
      expect(screen.getByTestId("sheet-metronome-state")).toHaveTextContent("Stopped");

      await act(async () => {
        await vi.advanceTimersByTimeAsync(5_000);
        await Promise.resolve();
      });

      expect(metronome.service.start).not.toHaveBeenCalled();
      expect(screen.getByTestId("sheet-metronome-state")).toHaveTextContent("Stopped");
    } finally {
      vi.useRealTimers();
    }
  });

  it("locks bar count-in controls while counting and leaves recording independent", async () => {
    const user = userEvent.setup();
    const grid = createTestGrid({
      bpm: 120,
      measureOneOffsetMs: 0
    });
    const recordingService = createInspectableSheetRecordingService();
    const sessionService = {
      ...createIdleSessionService(),
      ensureSheetSession: vi.fn(async () => createSheetSession())
    };

    render(
      <SheetPracticeControls
        sheetId="sheet-alpha"
        sheetName="Alpha"
        defaultBpm={120}
        defaultTimeSignature="4/4"
        createCountdownExecutor={() => createFirstTickCountdownExecutor()}
        sessionService={sessionService}
        createSheetRecordingService={() => recordingService.service}
        measureGridService={createMeasureGridService(grid)}
      />
    );

    expect(screen.getByRole("button", { name: "Start metronome" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Stop metronome" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Start recording" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Stop recording" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Start recording" }));
    await waitFor(() => {
      expect(screen.getByTestId("sheet-recording-state")).toHaveTextContent("active");
    });

    await enableBarCountIn(user);
    await user.click(screen.getByRole("button", { name: "Start metronome" }));

    await waitFor(() => {
      expect(screen.getByTestId("sheet-metronome-state")).toHaveTextContent(
        /Counting|Pre-roll|Measure/
      );
    });
    expectControlUnavailable(getBarCountInToggle());
    expectControlUnavailable(getBarCountInBarsControl());
    expect(screen.getByRole("button", { name: "Start metronome" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Stop metronome" })).toBeEnabled();
    expect(screen.getByTestId("sheet-recording-state")).toHaveTextContent("active");

    await user.click(screen.getByRole("button", { name: "Stop metronome" }));

    await waitFor(() => {
      expect(screen.getByTestId("sheet-metronome-state")).toHaveTextContent("Stopped");
    });
    expect(screen.getByTestId("sheet-recording-state")).toHaveTextContent("active");
  });

  it("keeps bar count-in keyboard accessible without renaming existing transport actions", async () => {
    const user = userEvent.setup();

    render(
      <SheetPracticeControls
        sheetId="sheet-alpha"
        sheetName="Alpha"
        defaultBpm={120}
        defaultTimeSignature="4/4"
        sessionService={createIdleSessionService()}
        measureGridService={createMeasureGridService(createTestGrid())}
      />
    );

    const toggle = getBarCountInToggle();

    for (let index = 0; index < 20 && document.activeElement !== toggle; index += 1) {
      await user.tab();
    }

    expect(document.activeElement).toBe(toggle);
    await user.keyboard("[Space]");

    await waitFor(() => {
      expectBarCountInToggle(toggle, true);
    });

    const barsControl = getBarCountInBarsControl();

    for (let index = 0; index < 20 && document.activeElement !== barsControl; index += 1) {
      await user.tab();
    }

    expect(document.activeElement).toBe(barsControl);
    await selectBarCountInBars(user, "2");
    expectBarCountInBarsValue(barsControl, "2");
    expect(screen.getByRole("button", { name: "Start metronome" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Stop metronome" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Start recording" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Stop recording" })).toBeVisible();
  });

  it("prepares a selected-segment bar count-in plan before handing off to transport", async () => {
    const user = userEvent.setup();
    const grid = createTestGrid({
      bpm: 120,
      measureOneOffsetMs: 0
    });
    const segment = createTestSegment({
      grid: createPracticeSegmentGridAssociation(grid)
    });
    const measureGridService = createMeasureGridService(grid);
    const sessionService = {
      ...createIdleSessionService(),
      ensureSheetSession: vi.fn(async () => createSheetSession())
    };
    const metronome = createInspectableMetronomeService();
    const onPlanPrepared = vi.fn();

    render(
      <SheetPracticeControls
        sheetId="sheet-alpha"
        sheetName="Alpha"
        defaultBpm={120}
        defaultTimeSignature="4/4"
        createMetronomeService={() => metronome.service}
        createCountdownExecutor={() => createFirstTickCountdownExecutor()}
        sessionService={sessionService}
        measureGridService={measureGridService}
        practiceSegmentService={createPracticeSegmentService([segment])}
        barCountIn={{
          enabled: true,
          countInMeasures: 1,
          onPlanPrepared
        }}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("practice-segment-row-segment-alpha")).toBeVisible();
    });
    await user.click(screen.getByTestId("practice-segment-row-segment-alpha"));
    await user.click(screen.getByRole("button", { name: "Start metronome" }));

    await waitFor(() => {
      expect(onPlanPrepared).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "ready",
          scope: "selected-segment",
          startMeasure: 5,
          segmentId: "segment-alpha",
          beatCount: 4,
          totalDurationMs: 2_000
        })
      );
    });

    expect(measureGridService.getGrid).toHaveBeenCalledWith("sheet-alpha");
    expect(screen.getByTestId("sheet-metronome-state")).toHaveTextContent(
      /Counting|Pre-roll|Measure/
    );
    expect(metronome.service.start).not.toHaveBeenCalled();
    expectNoCaptureKind(
      sessionService.captureSessionEvent,
      "metronome_started"
    );
  });

  it("ignores repeated bar count-in starts while measure-grid loading is pending", async () => {
    vi.useFakeTimers();

    const grid = createTestGrid({
      bpm: 120,
      measureOneOffsetMs: 0
    });
    const gridLoad = createDeferred<MeasureGrid | null>();
    const measureGridService = {
      getGrid: vi.fn(() => gridLoad.promise),
      saveGrid: vi.fn(async (_sheetId: string, nextGrid: MeasureGrid) => nextGrid),
      clearGrid: vi.fn(async () => undefined)
    } satisfies MeasureGridService;
    const sessionService = {
      ...createIdleSessionService(),
      ensureSheetSession: vi.fn(async () => createSheetSession())
    };
    const metronome = createInspectableMetronomeService();
    const onPlanPrepared = vi.fn();

    try {
      render(
        <SheetPracticeControls
          sheetId="sheet-alpha"
          sheetName="Alpha"
          defaultBpm={120}
          defaultTimeSignature="4/4"
          createMetronomeService={() => metronome.service}
          createCountdownExecutor={() => createTimerCountdownExecutor()}
          sessionService={sessionService}
          measureGridService={measureGridService}
          barCountIn={{
            enabled: true,
            countInMeasures: 1,
            onPlanPrepared
          }}
        />
      );

      const gridLoadCallsBeforeStart = measureGridService.getGrid.mock.calls.length;

      fireEvent.click(screen.getByRole("button", { name: "Start metronome" }));
      fireEvent.click(screen.getByRole("button", { name: "Start metronome" }));

      expect(measureGridService.getGrid).toHaveBeenCalledTimes(
        gridLoadCallsBeforeStart + 1
      );
      expect(onPlanPrepared).not.toHaveBeenCalled();

      await act(async () => {
        gridLoad.resolve(grid);
        await gridLoad.promise;
      });
      await act(async () => {
        await Promise.resolve();
      });

      expect(onPlanPrepared).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("sheet-metronome-state")).toHaveTextContent(
        /Counting|Pre-roll|Measure/
      );
      expect(metronome.service.start).not.toHaveBeenCalled();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(2_000);
        await Promise.resolve();
      });

      expect(metronome.service.start).toHaveBeenCalledTimes(1);
      expect(sessionService.ensureSheetSession).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("sheet-metronome-state")).toHaveTextContent("Playing");
    } finally {
      vi.useRealTimers();
    }
  });

  it("blocks bar count-in starts when the current measure grid is missing", async () => {
    const user = userEvent.setup();
    const measureGridService = createMeasureGridService(null);
    const sessionService = createIdleSessionService();
    const metronome = createInspectableMetronomeService();
    const onPlanBlocked = vi.fn();

    render(
      <SheetPracticeControls
        sheetId="sheet-alpha"
        sheetName="Alpha"
        defaultBpm={120}
        defaultTimeSignature="4/4"
        createMetronomeService={() => metronome.service}
        createCountdownExecutor={() => createFirstTickCountdownExecutor()}
        sessionService={sessionService}
        measureGridService={measureGridService}
        barCountIn={{
          enabled: true,
          countInMeasures: 1,
          onPlanBlocked
        }}
      />
    );

    await user.click(screen.getByRole("button", { name: "Start metronome" }));

    await waitFor(() => {
      expect(onPlanBlocked).toHaveBeenCalledWith({
        reason: "no-measure-grid",
        message: "Save a measure grid before starting bar count-in."
      });
    });

    expect(measureGridService.getGrid).toHaveBeenCalledWith("sheet-alpha");
    expect(metronome.service.start).not.toHaveBeenCalled();
    expect(screen.getByTestId("sheet-metronome-state")).toHaveTextContent("Stopped");
    expectNoCaptureKind(
      sessionService.captureSessionEvent,
      "metronome_started"
    );
  });

  it("blocks stale selected-segment bar count-in plans without falling back to playback", async () => {
    const user = userEvent.setup();
    const currentGrid = createTestGrid({
      bpm: 120,
      measureOneOffsetMs: 0
    });
    const staleSegment = createTestSegment({
      grid: createPracticeSegmentGridAssociation(
        createTestGrid({
          bpm: 96,
          measureOneOffsetMs: 0
        })
      )
    });
    const sessionService = {
      ...createIdleSessionService(),
      ensureSheetSession: vi.fn(async () => createSheetSession())
    };
    const metronome = createInspectableMetronomeService();
    const onPlanBlocked = vi.fn();

    render(
      <SheetPracticeControls
        sheetId="sheet-alpha"
        sheetName="Alpha"
        defaultBpm={120}
        defaultTimeSignature="4/4"
        createMetronomeService={() => metronome.service}
        sessionService={sessionService}
        measureGridService={createMeasureGridService(currentGrid)}
        practiceSegmentService={createPracticeSegmentService([staleSegment])}
        barCountIn={{
          enabled: true,
          countInMeasures: 1,
          onPlanBlocked
        }}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("practice-segment-row-segment-alpha")).toBeVisible();
    });
    await user.click(screen.getByTestId("practice-segment-row-segment-alpha"));
    await user.click(screen.getByRole("button", { name: "Start metronome" }));

    await waitFor(() => {
      expect(onPlanBlocked).toHaveBeenCalledWith({
        reason: "segment-grid-stale",
        message: "Selected segment grid changed. Metronome was stopped."
      });
    });

    expect(metronome.service.start).not.toHaveBeenCalled();
    expect(sessionService.ensureSheetSession).not.toHaveBeenCalled();
    expect(screen.getByTestId("sheet-metronome-state")).toHaveTextContent("Stopped");
    expectNoCaptureKind(
      sessionService.captureSessionEvent,
      "metronome_started"
    );
  });

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
    expect(sessionService.captureSessionEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ kind: "metronome_started" })
    );
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

  it("captures sheet metronome start and stop after successful transport transitions", async () => {
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
      updateSheetSessionDuration: vi.fn(async () => updatedSession)
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
    expect(sessionService.captureSessionEvent).toHaveBeenCalledWith({
      sessionId: "session-alpha",
      kind: "metronome_started"
    });

    await user.click(screen.getByRole("button", { name: "Stop metronome" }));

    await waitFor(() => {
      expect(sessionService.updateSheetSessionDuration).toHaveBeenCalledWith("session-alpha");
    });
    expect(sessionService.captureSessionEvent).toHaveBeenCalledWith({
      sessionId: "session-alpha",
      kind: "metronome_stopped"
    });
  });

  it("does not capture sheet metronome_stopped when the stop transition fails", async () => {
    const sessionService = createIdleSessionService();
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
        onStopped: () => {
          void sessionService.captureSessionEvent({
            sessionId: "session-alpha",
            kind: "metronome_stopped"
          });
        }
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

    expectNoCaptureKind(
      sessionService.captureSessionEvent,
      "metronome_stopped"
    );
    metronomeService.stop.mockImplementation((): void => undefined);
    unmount();
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
