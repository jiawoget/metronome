export type ToneScheduledCallback = (time: number) => void;

export type ToneMetronomeLoopInterval =
  | "4n"
  | "8n"
  | "8t"
  | "16n"
  | "16t"
  | "32n";

export type ToneMetronomeLoopHandle = {
  start: (time?: string | number) => ToneMetronomeLoopHandle;
  stop: (time?: string | number) => ToneMetronomeLoopHandle;
  cancel: (time?: string | number) => ToneMetronomeLoopHandle;
  dispose: () => void;
};

export type ToneMetronomeScheduledEventHandle = {
  cancel: () => void;
};

export type ToneMetronomeClick = {
  time: number;
  accented: boolean;
  beatTick: boolean;
};

export type ToneMetronomeAdapter = {
  now: () => number;
  start: () => Promise<void>;
  setBpm: (bpm: number) => void;
  createLoop: (
    callback: ToneScheduledCallback,
    interval: ToneMetronomeLoopInterval
  ) => ToneMetronomeLoopHandle;
  scheduleOnce: (
    callback: ToneScheduledCallback,
    time: string | number
  ) => ToneMetronomeScheduledEventHandle;
  draw: (callback: () => void, time: number) => void;
  startTransport: (time?: string | number) => void;
  stopTransport: () => void;
  cancelTransport: () => void;
  triggerClick: (click: ToneMetronomeClick) => void;
  dispose: () => void;
};

export type ToneMetronomeAdapterFactory = () => Promise<ToneMetronomeAdapter>;

const TRANSPORT_TIMELINE_START = 0;
const DEFAULT_TRANSPORT_START_OFFSET = "+0.05";
const CLICK_SYNTH_OSCILLATOR_TYPE = "square";
const CLICK_SYNTH_VOLUME_DB = -12;
const CLICK_SYNTH_ENVELOPE = {
  attack: 0.001,
  decay: 0.035,
  sustain: 0,
  release: 0.015
} as const;
const CLICK_DURATION_SECONDS = 0.06;
const CLICK_VOICES = {
  accented: { note: "E6", velocity: 0.9 },
  beat: { note: "B5", velocity: 0.55 },
  subdivision: { note: "E5", velocity: 0.55 }
} as const;

function getClickVoice({
  accented,
  beatTick
}: Pick<ToneMetronomeClick, "accented" | "beatTick">) {
  if (accented) {
    return CLICK_VOICES.accented;
  }

  return beatTick ? CLICK_VOICES.beat : CLICK_VOICES.subdivision;
}

type ToneLoopLifecycle = {
  start: (time?: string | number) => unknown;
  stop: (time?: string | number) => unknown;
  cancel: (time?: string | number) => unknown;
  dispose: () => unknown;
};

type ToneTransportScheduledEventLifecycle = {
  clear: (eventId: number) => unknown;
};

function createTrackedLoopHandle(
  loop: ToneLoopLifecycle,
  activeLoops: Set<ToneMetronomeLoopHandle>
): ToneMetronomeLoopHandle {
  let disposed = false;
  const handle: ToneMetronomeLoopHandle = {
    start: (time) => {
      loop.start(time);

      return handle;
    },
    stop: (time) => {
      loop.stop(time);

      return handle;
    },
    cancel: (time) => {
      loop.cancel(time);

      return handle;
    },
    dispose: () => {
      if (disposed) {
        return;
      }

      loop.stop(TRANSPORT_TIMELINE_START);
      loop.cancel(TRANSPORT_TIMELINE_START);
      loop.dispose();
      disposed = true;
      activeLoops.delete(handle);
    }
  };

  activeLoops.add(handle);

  return handle;
}

function createTrackedScheduledEventHandle(
  transport: ToneTransportScheduledEventLifecycle,
  eventId: number,
  activeEvents: Set<ToneMetronomeScheduledEventHandle>
): ToneMetronomeScheduledEventHandle {
  let cancelled = false;
  const handle: ToneMetronomeScheduledEventHandle = {
    cancel: () => {
      if (cancelled) {
        return;
      }

      transport.clear(eventId);
      cancelled = true;
      activeEvents.delete(handle);
    }
  };

  activeEvents.add(handle);

  return handle;
}

export async function createToneMetronomeAdapter(): Promise<ToneMetronomeAdapter> {
  const Tone = await import("tone");
  const synth = new Tone.Synth({
    oscillator: { type: CLICK_SYNTH_OSCILLATOR_TYPE },
    envelope: CLICK_SYNTH_ENVELOPE,
    volume: CLICK_SYNTH_VOLUME_DB
  }).toDestination();
  const transport = Tone.getTransport();
  const activeLoops = new Set<ToneMetronomeLoopHandle>();
  const activeEvents = new Set<ToneMetronomeScheduledEventHandle>();

  return {
    now: () => Tone.now(),
    start: async () => {
      await Tone.start();
    },
    setBpm: (bpm) => {
      transport.bpm.value = bpm;
    },
    createLoop: (callback, interval) => {
      const loop = new Tone.Loop(callback, interval).start(TRANSPORT_TIMELINE_START);

      return createTrackedLoopHandle(loop, activeLoops);
    },
    scheduleOnce: (callback, time) => {
      const eventId = transport.scheduleOnce(callback, time);

      return createTrackedScheduledEventHandle(transport, eventId, activeEvents);
    },
    draw: (callback, time) => {
      Tone.getDraw().schedule(callback, time);
    },
    startTransport: (time = DEFAULT_TRANSPORT_START_OFFSET) => {
      transport.start(time);
    },
    stopTransport: () => {
      transport.stop();
    },
    cancelTransport: () => {
      transport.cancel(TRANSPORT_TIMELINE_START);
    },
    triggerClick: ({ time, accented, beatTick }) => {
      const voice = getClickVoice({ accented, beatTick });

      synth.triggerAttackRelease(
        voice.note,
        CLICK_DURATION_SECONDS,
        time,
        voice.velocity
      );
    },
    dispose: () => {
      Array.from(activeEvents).forEach((event) => event.cancel());
      Array.from(activeLoops).forEach((loop) => loop.dispose());
      synth.dispose();
    }
  };
}
