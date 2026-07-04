export {
  METRONOME_TRACE_EVENT,
  type MetronomeService,
  type MetronomeTick,
  type MetronomeTickHandler,
  type MetronomeTraceEventDetail,
  type CountdownExecutor,
  type CountdownExecutorOptions,
  type CountdownExecutorRun,
  type CountdownExecutorTick
} from "@/services/metronome";
export { BrowserMetronomeService } from "@/services/metronome/browser-metronome-service";
export { BrowserCountdownExecutor } from "@/services/metronome/browser-countdown-executor";
export {
  type ToneMetronomeAdapter,
  type ToneMetronomeAdapterFactory,
  type ToneMetronomeClick,
  type ToneMetronomeLoopHandle,
  type ToneMetronomeLoopInterval,
  type ToneMetronomeScheduledEventHandle,
  type ToneScheduledCallback
} from "@/infrastructure/audio/tone-metronome-adapter";
