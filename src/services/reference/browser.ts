import type {
  LocalAudioReference,
  LocalAudioReferenceArtifact
} from "@/domain/reference";
import { browserReferenceService } from "@/infrastructure/reference/browser-reference-service";
import { BrowserLocalReferenceAudioPlayer } from "@/infrastructure/reference/local-reference-audio-player";

export type LocalReferenceAudioPlayer = {
  load: (
    reference: LocalAudioReference,
    artifact: LocalAudioReferenceArtifact
  ) => void;
  play: () => Promise<void>;
  pause: () => void;
  setVolume: (value: number) => number;
  dispose: () => void;
};

export function createBrowserLocalReferenceAudioPlayer(): LocalReferenceAudioPlayer {
  return new BrowserLocalReferenceAudioPlayer();
}

export { browserReferenceService };
