import { describe, expect, it } from "vitest";

import {
  BrowserMetronomeService,
  METRONOME_TRACE_EVENT,
  type MetronomeTraceEventDetail,
  type ToneMetronomeLoopInterval
} from "@/lib/quick-metronome/metronome-service";
import { DEFAULT_METRONOME_SETTINGS, type Subdivision } from "@/lib/quick-metronome/types";
import { createFakeToneAdapter } from "./fake-tone-metronome-adapter";

const TRANSPORT_TIMELINE_START = 0;
const INITIAL_TRANSPORT_START_OFFSET = "+0.05";
const RESCHEDULE_TRANSPORT_START_OFFSET = "+0.02";
const REPEATED_TICK_ADVANCE_SECONDS = 0.001;

describe("BrowserMetronomeService Tone adapter", () => {
  it("uses Tone transport lifecycle and disposes the active loop on stop", async () => {
    const fakeTone = createFakeToneAdapter();
    const service = new BrowserMetronomeService(async () => fakeTone.adapter);

    await service.start(DEFAULT_METRONOME_SETTINGS);

    expect(fakeTone.adapter.start).toHaveBeenCalledTimes(1);
    expect(fakeTone.adapter.stopTransport).toHaveBeenCalledTimes(1);
    expect(fakeTone.adapter.cancelTransport).toHaveBeenCalledTimes(1);
    expect(fakeTone.adapter.setBpm).toHaveBeenCalledWith(96);
    expect(fakeTone.lastLoopInterval).toBe("4n");
    expect(fakeTone.adapter.startTransport).toHaveBeenCalledWith(INITIAL_TRANSPORT_START_OFFSET);

    service.stop();

    expect(fakeTone.loopHandle.stop).toHaveBeenCalledWith(TRANSPORT_TIMELINE_START);
    expect(fakeTone.loopHandle.cancel).toHaveBeenCalledWith(TRANSPORT_TIMELINE_START);
    expect(fakeTone.loopHandle.dispose).toHaveBeenCalledTimes(1);
    expect(fakeTone.adapter.stopTransport).toHaveBeenCalledTimes(2);
    expect(fakeTone.adapter.cancelTransport).toHaveBeenCalledTimes(2);
    expect(fakeTone.adapter.dispose).toHaveBeenCalledTimes(1);
    expect(service.isPlaying).toBe(false);
  });

  it("triggers semantic click intent and emits matching scheduled trace time through Draw", async () => {
    const fakeTone = createFakeToneAdapter();
    const service = new BrowserMetronomeService(async () => fakeTone.adapter);
    const traces: MetronomeTraceEventDetail[] = [];
    const ticks: { audioTime: number; accented: boolean }[] = [];

    window.addEventListener(METRONOME_TRACE_EVENT, (event) => {
      traces.push((event as CustomEvent<MetronomeTraceEventDetail>).detail);
    });
    service.onTick((tick) => ticks.push(tick));

    await service.start({ ...DEFAULT_METRONOME_SETTINGS, bpm: 120 });
    fakeTone.emitScheduledTick(12.5);

    expect(fakeTone.clickIntents).toHaveLength(1);
    expect(fakeTone.clickIntents[0]).toEqual({
      time: 12.5,
      accented: true,
      beatTick: true
    });
    expect(traces[0]).toMatchObject({
      tickIndex: 0,
      audioTime: 12.5,
      accented: true,
      bpm: 120,
      expectedIntervalMs: 500
    });
    expect(fakeTone.clickIntents[0]?.time).toBe(traces[0]?.audioTime);
    expect(fakeTone.adapter.draw).toHaveBeenCalledWith(expect.any(Function), 12.5);
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
    fakeTone.emitScheduledTick(3);
    fakeTone.emitScheduledTick(3);

    expect(traces.map((trace) => trace.audioTime)).toEqual([3, 3]);
    expect(fakeTone.clickIntents.map((click) => click.time)).toEqual([
      3,
      3 + REPEATED_TICK_ADVANCE_SECONDS
    ]);
  });

  it("reschedules Tone transport when BPM changes while playing", async () => {
    const fakeTone = createFakeToneAdapter();
    const service = new BrowserMetronomeService(async () => fakeTone.adapter);

    await service.start({ ...DEFAULT_METRONOME_SETTINGS, bpm: 120 });
    const firstLoop = fakeTone.loopHandle;

    service.update({ ...DEFAULT_METRONOME_SETTINGS, bpm: 180 });

    expect(firstLoop.stop).toHaveBeenCalledWith(TRANSPORT_TIMELINE_START);
    expect(firstLoop.cancel).toHaveBeenCalledWith(TRANSPORT_TIMELINE_START);
    expect(firstLoop.dispose).toHaveBeenCalledTimes(1);
    expect(fakeTone.adapter.stopTransport).toHaveBeenCalledTimes(2);
    expect(fakeTone.adapter.cancelTransport).toHaveBeenCalledTimes(2);
    expect(fakeTone.adapter.setBpm).toHaveBeenLastCalledWith(180);
    expect(fakeTone.lastLoopInterval).toBe("4n");
    expect(fakeTone.adapter.startTransport).toHaveBeenLastCalledWith(RESCHEDULE_TRANSPORT_START_OFFSET);
  });

  it("maps 4/4 subdivisions to Tone notation", async () => {
    const expectedIntervals = new Map<Subdivision, ToneMetronomeLoopInterval>([
      ["quarter", "4n"],
      ["eighth", "8n"],
      ["triplet", "8t"],
      ["sixteenth", "16n"]
    ]);

    for (const [subdivision, interval] of expectedIntervals) {
      const fakeTone = createFakeToneAdapter();
      const service = new BrowserMetronomeService(async () => fakeTone.adapter);

      await service.start({
        ...DEFAULT_METRONOME_SETTINGS,
        timeSignature: "4/4",
        subdivision
      });

      expect(fakeTone.lastLoopInterval).toBe(interval);
    }
  });

  it("schedules 6/8 with denominator-aware Tone notation", async () => {
    const fakeTone = createFakeToneAdapter();
    const service = new BrowserMetronomeService(async () => fakeTone.adapter);

    await service.start({
      ...DEFAULT_METRONOME_SETTINGS,
      bpm: 120,
      timeSignature: "6/8",
      subdivision: "quarter"
    });

    expect(fakeTone.lastLoopInterval).toBe("8n");
  });

  it("maps 8-denominator subdivisions to Tone notation", async () => {
    const expectedIntervals = new Map<Subdivision, ToneMetronomeLoopInterval>([
      ["quarter", "8n"],
      ["eighth", "16n"],
      ["triplet", "16t"],
      ["sixteenth", "32n"]
    ]);

    for (const [subdivision, interval] of expectedIntervals) {
      const fakeTone = createFakeToneAdapter();
      const service = new BrowserMetronomeService(async () => fakeTone.adapter);

      await service.start({
        ...DEFAULT_METRONOME_SETTINGS,
        timeSignature: "12/8",
        subdivision
      });

      expect(fakeTone.lastLoopInterval).toBe(interval);
    }
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
      fakeTone.emitScheduledTick(20 + index * 0.25);
    }

    window.removeEventListener(METRONOME_TRACE_EVENT, listener);

    const downbeatTicks = new Set([0, 12]);
    const expectedTraceSummary = Array.from({ length: 13 }, (_, tickIndex) => ({
      tickIndex,
      accented: downbeatTicks.has(tickIndex),
      timeSignature: "12/8",
      expectedIntervalMs: 250
    }));
    const traceSummary = traces.map(
      ({ tickIndex, accented, timeSignature, expectedIntervalMs }) => ({
        tickIndex,
        accented,
        timeSignature,
        expectedIntervalMs
      })
    );
    const clickIntents = fakeTone.clickIntents.map(({ accented, beatTick }) => ({
      accented,
      beatTick
    }));
    const expectedClickIntents = expectedTraceSummary.map(({ accented }) => ({
      accented,
      beatTick: true
    }));

    expect(fakeTone.lastLoopInterval).toBe("8n");
    expect(traceSummary).toEqual(expectedTraceSummary);
    expect(clickIntents).toEqual(expectedClickIntents);
  });
});
