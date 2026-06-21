import {
  getSubdivisionMultiplier,
  getTickIntervalMs,
  isAccentTick
} from "@/lib/quick-metronome/control";
import { DEFAULT_METRONOME_SETTINGS, type MetronomeSettings } from "@/lib/quick-metronome/types";

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

type MetronomeTickHandler = (tick: MetronomeTick) => void;

export class BrowserMetronomeService {
  private audioContext: AudioContext | null = null;
  private gain: GainNode | null = null;
  private intervalId: number | null = null;
  private nextTickTime = 0;
  private settings: MetronomeSettings = DEFAULT_METRONOME_SETTINGS;
  private tickIndex = 0;
  private readonly tickHandlers = new Set<MetronomeTickHandler>();

  get isPlaying() {
    return this.intervalId !== null;
  }

  onTick(handler: MetronomeTickHandler) {
    this.tickHandlers.add(handler);

    return () => this.tickHandlers.delete(handler);
  }

  async start(settings: MetronomeSettings) {
    if (this.isPlaying) {
      this.update(settings);
      return;
    }

    if (typeof window === "undefined") {
      throw new Error("Metronome playback is not available outside the browser.");
    }

    const audioWindow = window as Window &
      typeof globalThis & { webkitAudioContext?: typeof AudioContext };
    const AudioContextConstructor = audioWindow.AudioContext || audioWindow.webkitAudioContext;

    if (!AudioContextConstructor) {
      throw new Error("Web Audio is not available in this browser.");
    }

    this.settings = settings;
    this.audioContext = new AudioContextConstructor();
    this.gain = this.audioContext.createGain();
    this.gain.gain.value = 0.45;
    this.gain.connect(this.audioContext.destination);
    await this.audioContext.resume();
    this.tickIndex = 0;
    this.nextTickTime = this.audioContext.currentTime + 0.05;
    this.intervalId = window.setInterval(() => this.scheduler(), 25);
    this.scheduler();
  }

  update(settings: MetronomeSettings) {
    this.settings = settings;
  }

  stop() {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }

    void this.audioContext?.close();
    this.audioContext = null;
    this.gain = null;
  }

  private scheduler() {
    if (!this.audioContext || !this.gain) {
      return;
    }

    while (this.nextTickTime < this.audioContext.currentTime + 0.12) {
      const accented = isAccentTick(this.tickIndex, this.settings);
      const tick: MetronomeTick = {
        tickIndex: this.tickIndex,
        audioTime: this.nextTickTime,
        accented
      };

      this.scheduleTick(tick);
      this.emitTrace(tick);
      this.emitTick(tick);
      this.tickIndex += 1;
      this.nextTickTime += getTickIntervalMs(this.settings) / 1_000;
    }
  }

  private scheduleTick(tick: MetronomeTick) {
    if (!this.audioContext || !this.gain) {
      return;
    }

    const oscillator = this.audioContext.createOscillator();
    const envelope = this.audioContext.createGain();
    const beatMultiplier = getSubdivisionMultiplier(this.settings.subdivision);
    const isBeatTick = tick.tickIndex % beatMultiplier === 0;

    oscillator.frequency.value = tick.accented ? 1_320 : isBeatTick ? 990 : 660;
    envelope.gain.setValueAtTime(0.0001, tick.audioTime);
    envelope.gain.exponentialRampToValueAtTime(tick.accented ? 0.7 : 0.35, tick.audioTime + 0.005);
    envelope.gain.exponentialRampToValueAtTime(0.0001, tick.audioTime + 0.055);
    oscillator.connect(envelope);
    envelope.connect(this.gain);
    oscillator.start(tick.audioTime);
    oscillator.stop(tick.audioTime + 0.06);
  }

  private emitTick(tick: MetronomeTick) {
    if (!this.audioContext) {
      return;
    }

    const delayMs = Math.max(0, (tick.audioTime - this.audioContext.currentTime) * 1_000);

    window.setTimeout(() => {
      this.tickHandlers.forEach((handler) => handler(tick));
    }, delayMs);
  }

  private emitTrace(tick: MetronomeTick) {
    if (typeof window === "undefined") {
      return;
    }

    const detail: MetronomeTraceEventDetail = {
      ...tick,
      bpm: this.settings.bpm,
      expectedIntervalMs: getTickIntervalMs(this.settings),
      subdivision: this.settings.subdivision,
      timeSignature: this.settings.timeSignature
    };

    window.dispatchEvent(new CustomEvent<MetronomeTraceEventDetail>(METRONOME_TRACE_EVENT, { detail }));
  }
}
