import type { MetronomeSettings } from "@/lib/quick-metronome/types";

export const METRONOME_TRACE_EVENT = "quick-metronome:scheduled-tick";

export type MetronomeTick = {
  tickIndex: number;
  audioTime: number;
  accented: boolean;
};

export type MetronomeTraceEventDetail = MetronomeTick & {
  bpm: number;
  expectedIntervalMs: number;
  subdivision: MetronomeSettings["subdivision"];
  timeSignature: MetronomeSettings["timeSignature"];
};

export type MetronomeTickHandler = (tick: MetronomeTick) => void;

export type MetronomeService = {
  readonly isPlaying?: boolean;
  onTick: (handler: MetronomeTickHandler) => () => void;
  start: (settings: MetronomeSettings) => Promise<void>;
  update: (settings: MetronomeSettings) => void;
  stop: () => void;
};
