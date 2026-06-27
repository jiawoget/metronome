import { describe, expect, it, vi } from "vitest";

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

describe("BrowserMetronomeService Tone adapter", () => {
  it("uses Tone transport lifecycle and clears/disposes on stop", async () => {
    const fakeTone = createFakeToneAdapter();
    const service = new BrowserMetronomeService(async () => fakeTone.adapter);

    await service.start(DEFAULT_METRONOME_SETTINGS);

    expect(fakeTone.adapter.start).toHaveBeenCalledTimes(1);
    expect(fakeTone.adapter.stopTransport).toHaveBeenCalledTimes(1);
    expect(fakeTone.adapter.cancelTransport).toHaveBeenCalledTimes(1);
    expect(fakeTone.adapter.scheduleRepeat).toHaveBeenCalledWith(expect.any(Function), 0.625);
    expect(fakeTone.adapter.startTransport).toHaveBeenCalledWith("+0.05");

    service.stop();

    expect(fakeTone.adapter.clear).toHaveBeenCalledWith(1);
    expect(fakeTone.adapter.stopTransport).toHaveBeenCalledTimes(2);
    expect(fakeTone.adapter.cancelTransport).toHaveBeenCalledTimes(2);
    expect(fakeTone.adapter.dispose).toHaveBeenCalledTimes(1);
    expect(service.isPlaying).toBe(false);
  });

  it("triggers Tone instrument output and emits matching scheduled trace time", async () => {
    const fakeTone = createFakeToneAdapter();
    const service = new BrowserMetronomeService(async () => fakeTone.adapter);
    const traces: MetronomeTraceEventDetail[] = [];
    const ticks: { audioTime: number; accented: boolean }[] = [];

    window.addEventListener(METRONOME_TRACE_EVENT, (event) => {
      traces.push((event as CustomEvent<MetronomeTraceEventDetail>).detail);
    });
    service.onTick((tick) => ticks.push(tick));

    await service.start({ ...DEFAULT_METRONOME_SETTINGS, bpm: 120 });
    vi.mocked(fakeTone.adapter.now).mockReturnValue(12.5);
    fakeTone.callbacks[0]?.(12.5);

    expect(fakeTone.triggers).toHaveLength(1);
    expect(fakeTone.triggers[0]).toEqual({
      note: "E6",
      duration: 0.06,
      time: 12.5,
      velocity: 0.9
    });
    expect(traces[0]).toMatchObject({
      tickIndex: 0,
      audioTime: 12.5,
      accented: true,
      bpm: 120,
      expectedIntervalMs: 500
    });
    expect(fakeTone.triggers[0]?.time).toBe(traces[0]?.audioTime);

    await new Promise((resolve) => window.setTimeout(resolve, 0));
    expect(ticks[0]).toMatchObject({ audioTime: 12.5, accented: true });
  });

  it("keeps instrument trigger time monotonic when Tone repeats a scheduled time", async () => {
    const fakeTone = createFakeToneAdapter();
    const service = new BrowserMetronomeService(async () => fakeTone.adapter);
    const traces: MetronomeTraceEventDetail[] = [];

    window.addEventListener(METRONOME_TRACE_EVENT, (event) => {
      traces.push((event as CustomEvent<MetronomeTraceEventDetail>).detail);
    });

    await service.start({ ...DEFAULT_METRONOME_SETTINGS, bpm: 120 });
    fakeTone.callbacks[0]?.(3);
    fakeTone.callbacks[0]?.(3);

    expect(traces.map((trace) => trace.audioTime)).toEqual([3, 3]);
    expect(fakeTone.triggers.map((trigger) => trigger.time)).toEqual([3, 3.001]);
  });

  it("reschedules Tone transport when BPM changes while playing", async () => {
    const fakeTone = createFakeToneAdapter();
    const service = new BrowserMetronomeService(async () => fakeTone.adapter);

    await service.start({ ...DEFAULT_METRONOME_SETTINGS, bpm: 120 });
    service.update({ ...DEFAULT_METRONOME_SETTINGS, bpm: 180 });

    expect(fakeTone.adapter.clear).toHaveBeenCalledWith(1);
    expect(fakeTone.adapter.stopTransport).toHaveBeenCalledTimes(2);
    expect(fakeTone.adapter.cancelTransport).toHaveBeenCalledTimes(2);
    expect(fakeTone.adapter.scheduleRepeat).toHaveBeenLastCalledWith(expect.any(Function), 1 / 3);
    expect(fakeTone.adapter.startTransport).toHaveBeenLastCalledWith("+0.02");
  });

  it("schedules 6/8 with the shared denominator-aware meter timing policy", async () => {
    const fakeTone = createFakeToneAdapter();
    const service = new BrowserMetronomeService(async () => fakeTone.adapter);

    await service.start({
      ...DEFAULT_METRONOME_SETTINGS,
      bpm: 120,
      timeSignature: "6/8",
      subdivision: "quarter"
    });

    expect(fakeTone.adapter.scheduleRepeat).toHaveBeenCalledWith(expect.any(Function), 0.25);
  });

  it("schedules 12/8 through the service path with twelve eighth-note ticks per downbeat cycle", async () => {
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
      timeSignature: "12/8",
      subdivision: "quarter"
    });

    for (let index = 0; index < 13; index += 1) {
      fakeTone.callbacks[0]?.(20 + index * 0.25);
    }

    window.removeEventListener(METRONOME_TRACE_EVENT, listener);

    expect(fakeTone.adapter.scheduleRepeat).toHaveBeenCalledWith(expect.any(Function), 0.25);
    expect(traces).toHaveLength(13);
    expect(traces.map((trace) => trace.tickIndex)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12
    ]);
    expect(traces.map((trace) => trace.accented)).toEqual([
      true,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      true
    ]);
    expect(traces.every((trace) => trace.timeSignature === "12/8")).toBe(true);
    expect(traces.every((trace) => trace.expectedIntervalMs === 250)).toBe(true);
    expect(fakeTone.triggers.map((trigger) => trigger.note)).toEqual([
      "E6",
      "B5",
      "B5",
      "B5",
      "B5",
      "B5",
      "B5",
      "B5",
      "B5",
      "B5",
      "B5",
      "B5",
      "E6"
    ]);
  });
});
