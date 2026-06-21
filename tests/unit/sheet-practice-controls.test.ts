import { describe, expect, it, vi } from "vitest";

import { createSheetPracticeMetronomeSettings } from "@/components/sheet-practice/controls/practice-control-state";
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
