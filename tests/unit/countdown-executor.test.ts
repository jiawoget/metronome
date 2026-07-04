import { describe, expect, it, vi } from "vitest";

import type { PreStartCountdownPlan } from "@/lib/quick-metronome/pre-start-countdown";
import { BrowserCountdownExecutor } from "@/services/metronome/browser-countdown-executor";
import { assertSchedulableCountdownPlan } from "@/services/metronome/countdown-executor";
import { createFakeToneAdapter } from "./fake-tone-metronome-adapter";

function createPlan(overrides: Partial<PreStartCountdownPlan> = {}): PreStartCountdownPlan {
  return {
    beatCount: 3,
    totalDurationMs: 7.25,
    beats: [
      {
        count: 1,
        beatNumber: 1,
        offsetMs: -12.75
      },
      {
        count: 2,
        beatNumber: 2,
        offsetMs: -12.25
      },
      {
        count: 3,
        beatNumber: 3,
        offsetMs: -10
      }
    ],
    ...overrides
  };
}

async function flushCountdownExecutor() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe("countdown executor", () => {
  it("schedules finite countdown events through Tone transport and Draw", async () => {
    const fakeTone = createFakeToneAdapter();
    const executor = new BrowserCountdownExecutor(async () => fakeTone.adapter);
    const onTick = vi.fn();
    const onComplete = vi.fn();

    executor.run({
      plan: createPlan(),
      bpm: 120,
      timeSignature: "4/4",
      onTick,
      onComplete
    });
    await flushCountdownExecutor();

    expect(fakeTone.adapter.start).toHaveBeenCalledTimes(1);
    expect(fakeTone.adapter.stopTransport).toHaveBeenCalledTimes(1);
    expect(fakeTone.adapter.cancelTransport).toHaveBeenCalledTimes(1);
    expect(fakeTone.adapter.setBpm).toHaveBeenCalledWith(120);
    expect(fakeTone.scheduledOnceTimes).toEqual([0, 0.0005, 0.00275, 0.00725]);
    expect(fakeTone.adapter.startTransport).toHaveBeenCalledWith("+0.05");

    fakeTone.emitScheduledOnce(12.5, 0);

    expect(fakeTone.adapter.draw).toHaveBeenCalledWith(expect.any(Function), 12.5);
    expect(onTick).toHaveBeenCalledWith({
      count: 1,
      beatNumber: 1,
      remainingBeats: 2,
      scheduledOffsetMs: -12.75,
      scheduledDelayMs: 0,
      audioTime: 12.5
    });

    fakeTone.emitScheduledOnce(14.25, 3);

    expect(onComplete).toHaveBeenCalledOnce();
    expect(fakeTone.adapter.stopTransport).toHaveBeenCalledTimes(2);
    expect(fakeTone.adapter.cancelTransport).toHaveBeenCalledTimes(2);
    expect(fakeTone.adapter.dispose).toHaveBeenCalledTimes(1);
  });

  it("cancel clears scheduled events and prevents future callbacks", async () => {
    const fakeTone = createFakeToneAdapter();
    const executor = new BrowserCountdownExecutor(async () => fakeTone.adapter);
    const onTick = vi.fn();
    const onComplete = vi.fn();
    const run = executor.run({
      plan: createPlan(),
      bpm: 120,
      timeSignature: "4/4",
      onTick,
      onComplete
    });

    await flushCountdownExecutor();
    fakeTone.emitScheduledOnce(1, 0);
    run.cancel();
    fakeTone.emitScheduledOnce(2, 1);
    fakeTone.emitScheduledOnce(3, 3);

    expect(onTick).toHaveBeenCalledOnce();
    expect(onComplete).not.toHaveBeenCalled();
    expect(fakeTone.scheduledOnceHandles.every((handle) =>
      vi.mocked(handle.cancel).mock.calls.length === 1
    )).toBe(true);
    expect(fakeTone.adapter.stopTransport).toHaveBeenCalledTimes(2);
    expect(fakeTone.adapter.cancelTransport).toHaveBeenCalledTimes(2);
    expect(fakeTone.adapter.dispose).toHaveBeenCalledTimes(1);
  });

  it("reports adapter startup failures through onError", async () => {
    const error = new Error("Tone unavailable");
    const onError = vi.fn();
    const executor = new BrowserCountdownExecutor(async () => {
      throw error;
    });

    executor.run({
      plan: createPlan(),
      bpm: 120,
      timeSignature: "4/4",
      onComplete: vi.fn(),
      onError
    });
    await flushCountdownExecutor();

    expect(onError).toHaveBeenCalledWith(error);
  });

  it("rejects invalid countdown plans", () => {
    expect(() => assertSchedulableCountdownPlan(createPlan({ beats: [] }))).toThrow(/without beats/);
    expect(() => assertSchedulableCountdownPlan(createPlan({ beatCount: 0 }))).toThrow(/positive beat count/);
    expect(() =>
      assertSchedulableCountdownPlan(createPlan({ totalDurationMs: Number.POSITIVE_INFINITY }))
    ).toThrow(/positive duration/);
  });
});
