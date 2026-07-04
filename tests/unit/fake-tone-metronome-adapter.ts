import { vi } from "vitest";

import type {
  ToneMetronomeAdapter,
  ToneMetronomeClick,
  ToneMetronomeLoopHandle,
  ToneMetronomeLoopInterval,
  ToneScheduledCallback
} from "@/lib/quick-metronome/metronome-service";

function createLoopHandle(): ToneMetronomeLoopHandle {
  const handle: ToneMetronomeLoopHandle = {
    start: vi.fn(() => handle),
    stop: vi.fn(() => handle),
    cancel: vi.fn(() => handle),
    dispose: vi.fn()
  };

  return handle;
}

export function createFakeToneAdapter() {
  const scheduledCallbacks: ToneScheduledCallback[] = [];
  const clickIntents: ToneMetronomeClick[] = [];
  const loopHandles: ToneMetronomeLoopHandle[] = [];
  const loopIntervals: ToneMetronomeLoopInterval[] = [];
  const adapter: ToneMetronomeAdapter = {
    now: vi.fn(() => 0),
    start: vi.fn(async () => undefined),
    setBpm: vi.fn(),
    createLoop: vi.fn((callback, interval) => {
      const loopHandle = createLoopHandle();

      scheduledCallbacks.push(callback);
      loopIntervals.push(interval);
      loopHandles.push(loopHandle);

      return loopHandle;
    }),
    draw: vi.fn((callback) => {
      callback();
    }),
    startTransport: vi.fn(),
    stopTransport: vi.fn(),
    cancelTransport: vi.fn(),
    triggerClick: vi.fn((click) => {
      clickIntents.push(click);
    }),
    dispose: vi.fn()
  };

  return {
    adapter,
    clickIntents,
    emitScheduledTick: (time: number, loopIndex = 0) => {
      const callback = scheduledCallbacks[loopIndex];

      if (!callback) {
        throw new Error(`Tone loop ${loopIndex} was not created`);
      }

      callback(time);
    },
    get lastLoopInterval() {
      const interval = loopIntervals.at(-1);

      if (!interval) {
        throw new Error("Tone loop interval was not recorded");
      }

      return interval;
    },
    get loopHandle() {
      const [loopHandle] = loopHandles;

      if (!loopHandle) {
        throw new Error("Tone loop was not created");
      }

      return loopHandle;
    }
  };
}
