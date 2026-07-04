import { clampBpm } from "@/lib/quick-metronome/control";
import {
  createToneMetronomeAdapter,
  type ToneMetronomeAdapter,
  type ToneMetronomeAdapterFactory,
  type ToneMetronomeScheduledEventHandle
} from "@/infrastructure/audio/tone-metronome-adapter";
import {
  assertSchedulableCountdownPlan,
  type CountdownExecutor,
  type CountdownExecutorOptions
} from "@/services/metronome/countdown-executor";

const COUNTDOWN_TRANSPORT_START_OFFSET = "+0.05";

function millisecondsToSeconds(milliseconds: number) {
  return Math.max(0, milliseconds) / 1_000;
}

export class BrowserCountdownExecutor implements CountdownExecutor {
  private readonly createAdapter: ToneMetronomeAdapterFactory;

  constructor(createAdapter: ToneMetronomeAdapterFactory = createToneMetronomeAdapter) {
    this.createAdapter = createAdapter;
  }

  run({
    plan,
    bpm,
    onTick,
    onComplete,
    onError
  }: CountdownExecutorOptions) {
    assertSchedulableCountdownPlan(plan);

    let adapter: ToneMetronomeAdapter | null = null;
    let cancelled = false;
    let completed = false;
    const eventHandles: ToneMetronomeScheduledEventHandle[] = [];
    const cleanup = () => {
      for (const eventHandle of eventHandles.splice(0)) {
        eventHandle.cancel();
      }

      if (!adapter) {
        return;
      }

      adapter.stopTransport();
      adapter.cancelTransport();
      adapter.dispose();
      adapter = null;
    };
    const fail = (error: unknown) => {
      if (cancelled) {
        return;
      }

      cancelled = true;
      cleanup();
      onError?.(error);
    };

    void this.arm({
      plan,
      bpm,
      onTick,
      onComplete: () => {
        if (cancelled || completed) {
          return;
        }

        completed = true;
        cleanup();
        onComplete();
      },
      onAdapterReady: (nextAdapter) => {
        adapter = nextAdapter;
      },
      isCancelled: () => cancelled,
      eventHandles
    }).catch(fail);

    return {
      cancel: () => {
        if (cancelled) {
          return;
        }

        cancelled = true;
        cleanup();
      }
    };
  }

  private async arm({
    plan,
    bpm,
    onTick,
    onComplete,
    onAdapterReady,
    isCancelled,
    eventHandles
  }: {
    plan: CountdownExecutorOptions["plan"];
    bpm: number;
    onTick: CountdownExecutorOptions["onTick"];
    onComplete: () => void;
    onAdapterReady: (adapter: ToneMetronomeAdapter) => void;
    isCancelled: () => boolean;
    eventHandles: ToneMetronomeScheduledEventHandle[];
  }) {
    if (typeof window === "undefined") {
      throw new Error("Countdown playback is not available outside the browser.");
    }

    const adapter = await this.createAdapter();

    if (isCancelled()) {
      adapter.dispose();
      return;
    }

    onAdapterReady(adapter);
    await adapter.start();

    if (isCancelled()) {
      return;
    }

    adapter.stopTransport();
    adapter.cancelTransport();
    adapter.setBpm(clampBpm(bpm));

    const firstOffsetMs = plan.beats[0].offsetMs;

    plan.beats.forEach((beat, index) => {
      const scheduledDelayMs = beat.offsetMs - firstOffsetMs;
      const eventHandle = adapter.scheduleOnce((audioTime) => {
        if (isCancelled()) {
          return;
        }

        adapter.draw(() => {
          if (isCancelled()) {
            return;
          }

          onTick?.({
            count: beat.count,
            beatNumber: beat.beatNumber,
            remainingBeats: plan.beats.length - index - 1,
            scheduledOffsetMs: beat.offsetMs,
            scheduledDelayMs,
            audioTime
          });
        }, audioTime);
      }, millisecondsToSeconds(scheduledDelayMs));

      eventHandles.push(eventHandle);
    });

    eventHandles.push(
      adapter.scheduleOnce((audioTime) => {
        if (isCancelled()) {
          return;
        }

        adapter.draw(onComplete, audioTime);
      }, millisecondsToSeconds(plan.totalDurationMs))
    );
    adapter.startTransport(COUNTDOWN_TRANSPORT_START_OFFSET);
  }
}

export function createBrowserCountdownExecutor() {
  return new BrowserCountdownExecutor();
}
