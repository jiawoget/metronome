import { getMeterTimeSignatureParts } from "@/domain/practice/meter-timing";
import {
  clampBpm,
  getSubdivisionMultiplier,
  getTickIntervalMs,
  isAccentTick
} from "@/lib/quick-metronome/control";
import { DEFAULT_METRONOME_SETTINGS, type MetronomeSettings } from "@/lib/quick-metronome/types";
import {
  createToneMetronomeAdapter,
  type ToneMetronomeAdapter,
  type ToneMetronomeAdapterFactory,
  type ToneMetronomeLoopHandle,
  type ToneMetronomeLoopInterval
} from "@/infrastructure/audio/tone-metronome-adapter";
import {
  METRONOME_TRACE_EVENT,
  type MetronomeService,
  type MetronomeTick,
  type MetronomeTickHandler,
  type MetronomeTraceEventDetail
} from "@/services/metronome";

const TRANSPORT_TIMELINE_START = 0;
const INITIAL_TRANSPORT_START_OFFSET = "+0.05";
const RESCHEDULE_TRANSPORT_START_OFFSET = "+0.02";
const MIN_TRIGGER_TIME_STEP_SECONDS = 0.001;

export class BrowserMetronomeService implements MetronomeService {
  private adapter: ToneMetronomeAdapter | null = null;
  private loop: ToneMetronomeLoopHandle | null = null;
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
    return this.loop !== null;
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
    this.adapter.setBpm(clampBpm(settings.bpm));
    this.scheduleCurrentSettings(this.scheduleToken);
    this.adapter.startTransport(INITIAL_TRANSPORT_START_OFFSET);
  }

  update(settings: MetronomeSettings) {
    this.settings = settings;

    if (this.isPlaying) {
      this.rescheduleCurrentSettings();
    }
  }

  stop() {
    if (!this.adapter) {
      this.loop = null;
      return;
    }

    this.clearLoop();
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

    this.adapter.stopTransport();
    this.adapter.cancelTransport();
    this.adapter.setBpm(clampBpm(this.settings.bpm));
    this.clearLoop();
    this.tickIndex = 0;
    this.lastTriggerTime = Number.NEGATIVE_INFINITY;
    this.scheduleToken += 1;
    this.scheduleCurrentSettings(this.scheduleToken);
    this.adapter.startTransport(RESCHEDULE_TRANSPORT_START_OFFSET);
  }

  private scheduleCurrentSettings(scheduleToken: number) {
    if (!this.adapter) {
      return;
    }

    this.loop = this.adapter.createLoop((time) => {
      if (scheduleToken === this.scheduleToken) {
        this.handleScheduledTick(time);
      }
    }, getToneLoopInterval(this.settings));
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
    const triggerTime =
      tick.audioTime <= this.lastTriggerTime
        ? this.lastTriggerTime + MIN_TRIGGER_TIME_STEP_SECONDS
        : tick.audioTime;

    this.lastTriggerTime = triggerTime;

    this.adapter.triggerClick({
      time: triggerTime,
      accented: tick.accented,
      beatTick: isBeatTick
    });
  }

  private emitTick(tick: MetronomeTick) {
    this.adapter?.draw(() => {
      this.tickHandlers.forEach((handler) => handler(tick));
    }, tick.audioTime);
  }

  private clearLoop() {
    this.loop
      ?.stop(TRANSPORT_TIMELINE_START)
      .cancel(TRANSPORT_TIMELINE_START)
      .dispose();
    this.loop = null;
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

function getToneLoopInterval(
  settings: Pick<MetronomeSettings, "timeSignature" | "subdivision">
): ToneMetronomeLoopInterval {
  const { denominator } = getMeterTimeSignatureParts(settings.timeSignature);

  if (denominator === 4) {
    switch (settings.subdivision) {
      case "quarter":
        return "4n";
      case "eighth":
        return "8n";
      case "triplet":
        return "8t";
      case "sixteenth":
        return "16n";
    }
  }

  if (denominator === 8) {
    switch (settings.subdivision) {
      case "quarter":
        return "8n";
      case "eighth":
        return "16n";
      case "triplet":
        return "16t";
      case "sixteenth":
        return "32n";
    }
  }

  throw new Error(`Unsupported metronome denominator: ${denominator}`);
}
