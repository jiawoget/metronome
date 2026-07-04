import { BrowserCountdownExecutor } from "@/services/metronome/browser-countdown-executor";
import { BrowserMetronomeService } from "@/services/metronome/browser-metronome-service";

export function createBrowserMetronomeService() {
  return new BrowserMetronomeService();
}

export function createBrowserCountdownExecutor() {
  return new BrowserCountdownExecutor();
}

export { BrowserCountdownExecutor };
export { BrowserMetronomeService };
