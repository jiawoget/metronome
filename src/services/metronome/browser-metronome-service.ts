import { getSubdivisionMultiplier, getTickIntervalMs, isAccentTick } from "@/lib/quick-metronome/control";
import { DEFAULT_METRONOME_SETTINGS, type MetronomeSettings } from "@/lib/quick-metronome/types";
import {
  createToneMetronomeAdapter,
  type ToneMetronomeAdapter,
  type ToneMetronomeAdapterFactory
} from "@/infrastructure/audio/tone-metronome-adapter";
import {
  METRONOME_TRACE_EVENT,
  type MetronomeService,
  type MetronomeTick,
  type MetronomeTickHandler,
  type MetronomeTraceEventDetail
} from "@/services/metronome";

export class BrowserMetronomeService implements MetronomeService {
  private adapter: ToneMetronomeAdapter | null = null;
  private eventId: number | null = null;
  private readonly createAdapter: ToneMetronomeAdapterFactory;
  private settings: MetronomeSettings = DEFAULT_METRONOME_SETTINGS;
  private scheduleToken = 0;
  private lastTriggerTime = Number.NEGATIVE_INFINITY;
  private tickIndex = 0;
  private readonly tickHandlers = new Set<MetronomeTickHandler>();

  constructor(createAdapter: ToneMetronomeAdapterFactory = createToneMetronomeAdapter) {
    this.createAdapter = createAdapter;
  }

  get isPlaying() {
    return this.eventId !== null;
  }

  onTick(handler: MetronomeTickHandler) {
    this.tickHandlers.add(handler);

    return () => {
      this.tickHandlers.delete(handler);
    };
  }

  async start(settings: MetronomeSettings) {
    if (this.isPlaying) {
      this.update(settings);
      return;
    }

    if (typeof window === "undefined") {
      throw new Error("Metronome playback is not available outside the browser.");
    }

    this.settings = settings;
    this.adapter = await this.createAdapter();
    await this.adapter.start();
    this.adapter.stopTransport();
    this.adapter.cancelTransport();
    this.tickIndex = 0;
    this.lastTriggerTime = Number.NEGATIVE_INFINITY;
    this.scheduleToken += 1;
    this.scheduleCurrentSettings(this.scheduleToken);
    this.adapter.startTransport("+0.05");
  }

  update(settings: MetronomeSettings) {
    this.settings = settings;

    if (this.isPlaying) {
      this.rescheduleCurrentSettings();
    }
  }

  stop() {
    if (!this.adapter) {
      this.eventId = null;
      return;
    }

    if (this.eventId !== null) {
      this.adapter.clear(this.eventId);
      this.eventId = null;
    }

    this.adapter.stopTransport();
    this.adapter.cancelTransport();
    this.adapter.dispose();
    this.adapter = null;
    this.scheduleToken += 1;
  }

  private rescheduleCurrentSettings() {
    if (!this.adapter) {
      return;
    }

    if (this.eventId !== null) {
      this.adapter.clear(this.eventId);
      this.eventId = null;
    }

    this.adapter.stopTransport();
    this.adapter.cancelTransport();
    this.tickIndex = 0;
    this.lastTriggerTime = Number.NEGATIVE_INFINITY;
    this.scheduleToken += 1;
    this.scheduleCurrentSettings(this.scheduleToken);
    this.adapter.startTransport("+0.02");
  }

  private scheduleCurrentSettings(scheduleToken: number) {
    if (!this.adapter) {
      return;
    }

    this.eventId = this.adapter.scheduleRepeat((time) => {
      if (scheduleToken === this.scheduleToken) {
        this.handleScheduledTick(time);
      }
    }, getTickIntervalMs(this.settings) / 1_000);
  }

  private handleScheduledTick(audioTime: number) {
    const accented = isAccentTick(this.tickIndex, this.settings);
    const tick: MetronomeTick = {
      tickIndex: this.tickIndex,
      audioTime,
      accented
    };

    this.triggerTick(tick);
    this.emitTrace(tick);
    this.emitTick(tick);
    this.tickIndex += 1;
  }

  private triggerTick(tick: MetronomeTick) {
    if (!this.adapter) {
      return;
    }

    const beatMultiplier = getSubdivisionMultiplier(this.settings.subdivision);
    const isBeatTick = tick.tickIndex % beatMultiplier === 0;
    const note = tick.accented ? "E6" : isBeatTick ? "B5" : "E5";
    const triggerTime = tick.audioTime <= this.lastTriggerTime ? this.lastTriggerTime + 0.001 : tick.audioTime;

    this.lastTriggerTime = triggerTime;

    this.adapter.trigger({
      note,
      duration: 0.06,
      time: triggerTime,
      velocity: tick.accented ? 0.9 : 0.55
    });
  }

  private emitTick(tick: MetronomeTick) {
    const now = this.adapter?.now() ?? tick.audioTime;
    const delayMs = Math.max(0, (tick.audioTime - now) * 1_000);

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
