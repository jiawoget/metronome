export type ToneMetronomeTrigger = {
  note: string;
  duration: number;
  time: number;
  velocity: number;
};

export type ToneScheduledCallback = (time: number) => void;

export type ToneMetronomeAdapter = {
  now: () => number;
  start: () => Promise<void>;
  scheduleRepeat: (callback: ToneScheduledCallback, intervalSeconds: number) => number;
  startTransport: (time?: string | number) => void;
  stopTransport: () => void;
  cancelTransport: () => void;
  clear: (eventId: number) => void;
  trigger: (trigger: ToneMetronomeTrigger) => void;
  dispose: () => void;
};

export type ToneMetronomeAdapterFactory = () => Promise<ToneMetronomeAdapter>;

export async function createToneMetronomeAdapter(): Promise<ToneMetronomeAdapter> {
  const Tone = await import("tone");
  const synth = new Tone.Synth({
    oscillator: { type: "square" },
    envelope: {
      attack: 0.001,
      decay: 0.035,
      sustain: 0,
      release: 0.015
    },
    volume: -12
  }).toDestination();
  const transport = Tone.getTransport();

  return {
    now: () => Tone.now(),
    start: async () => {
      await Tone.start();
    },
    scheduleRepeat: (callback, intervalSeconds) => transport.scheduleRepeat(callback, intervalSeconds),
    startTransport: (time = "+0.05") => {
      transport.start(time);
    },
    stopTransport: () => {
      transport.stop();
    },
    cancelTransport: () => {
      transport.cancel(0);
    },
    clear: (eventId) => {
      transport.clear(eventId);
    },
    trigger: ({ note, duration, time, velocity }) => {
      synth.triggerAttackRelease(note, duration, time, velocity);
    },
    dispose: () => {
      synth.dispose();
    }
  };
}
