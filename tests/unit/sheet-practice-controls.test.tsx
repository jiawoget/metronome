import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  createSheetPracticeControlInitialState,
  createSheetPracticeMetronomeSettings,
  formatUnsupportedTimeSignatureMessage
} from "@/components/sheet-practice/controls/practice-control-state";
import { SheetPracticeControls } from "@/components/sheet-practice/controls/sheet-practice-controls";
import type { PracticeSession } from "@/domain/practice";
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
    updateSheetSessionDuration: vi.fn(async () => null),
    endPracticeSession: vi.fn(async () => null),
    getRecentSession: vi.fn(async () => null),
    listRecordingMetadata: vi.fn(async () => []),
    subscribe: vi.fn(() => () => undefined)
  } satisfies Pick<
    PracticeSessionService,
    | "ensureSheetSession"
    | "updateSheetSessionDuration"
    | "endPracticeSession"
    | "getRecentSession"
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

describe("sheet practice controls state", () => {
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
      timeSignature: "4/4"
    });
    expect(metronome.service.start).not.toHaveBeenCalled();
    expect(metronome.service.stop).toHaveBeenCalled();
    expect(metronome.isPlaying()).toBe(false);
    expect(screen.getByTestId("sheet-metronome-state")).toHaveTextContent("Stopped");
  });

  it("ends a metronome-only session when Tone start rejects after session creation", async () => {
    const user = userEvent.setup();
    const session = createSheetSession();
    const endedSession = { ...session, endedAt: "2026-06-21T12:00:01.000Z", durationMs: 1_000 };
    const sessionService = {
      ...createIdleSessionService(),
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
    expect(metronome.service.start).toHaveBeenCalled();
    expect(metronome.service.stop).toHaveBeenCalled();
    expect(sessionService.endPracticeSession).toHaveBeenCalledWith("session-alpha");
    expect(metronome.isPlaying()).toBe(false);
    expect(screen.getByTestId("sheet-metronome-state")).toHaveTextContent("Stopped");
    expect(screen.getByTestId("sheet-session-id")).toHaveTextContent("session-alpha");
  });

  it("does not end an existing recording-linked session when Tone start rejects", async () => {
    const user = userEvent.setup();
    const session = createSheetSession({
      recordingCount: 1,
      latestRecordingId: "recording-alpha"
    });
    const sessionService = {
      ...createIdleSessionService(),
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
    expect(sessionService.ensureSheetSession).toHaveBeenCalled();
    expect(metronome.service.start).toHaveBeenCalled();
    expect(metronome.service.stop).toHaveBeenCalled();
    expect(sessionService.endPracticeSession).not.toHaveBeenCalled();
    expect(metronome.isPlaying()).toBe(false);
    expect(screen.getByTestId("sheet-metronome-state")).toHaveTextContent("Stopped");
  });
});
