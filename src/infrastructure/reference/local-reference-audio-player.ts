import { clampReferenceVolume, type LocalAudioReference, type LocalAudioReferenceArtifact } from "@/domain/reference";

type ReferenceAudioSnapshot = {
  referenceId: string | null;
  state: "idle" | "playing" | "paused" | "error";
  currentTime: number;
  volume: number;
  duration: number;
  message: string | null;
};

export class BrowserLocalReferenceAudioPlayer {
  private audio: HTMLAudioElement | null = null;
  private objectUrl: string | null = null;
  private referenceId: string | null = null;
  private state: ReferenceAudioSnapshot["state"] = "idle";
  private intervalId: number | null = null;

  load(reference: LocalAudioReference, artifact: LocalAudioReferenceArtifact) {
    this.dispose();
    this.referenceId = reference.id;
    this.objectUrl = URL.createObjectURL(artifact.blob);
    this.audio = new Audio(this.objectUrl);
    this.audio.preload = "auto";
    this.audio.volume = 1;
    this.audio.addEventListener("ended", () => {
      this.state = "paused";
      this.stopTicker();
      this.dispatch(null);
    });
    this.audio.addEventListener("error", () => {
      this.state = "error";
      this.stopTicker();
      this.dispatch("Local audio playback failed.");
    });
    this.dispatch(null);
  }

  async play() {
    if (!this.audio) {
      this.state = "error";
      this.dispatch("Load a local audio reference before playback.");

      return;
    }

    try {
      await this.audio.play();
      this.state = "playing";
      this.startTicker();
      this.dispatch(null);
    } catch {
      this.state = "error";
      this.dispatch("The browser blocked local audio playback.");
    }
  }

  pause() {
    if (!this.audio) {
      return;
    }

    this.audio.pause();
    this.state = "paused";
    this.stopTicker();
    this.dispatch(null);
  }

  setVolume(value: number) {
    if (!this.audio) {
      return clampReferenceVolume(value);
    }

    const volume = clampReferenceVolume(value);

    this.audio.volume = volume;
    this.dispatch(null);

    return volume;
  }

  getSnapshot(): ReferenceAudioSnapshot {
    return {
      referenceId: this.referenceId,
      state: this.state,
      currentTime: this.audio?.currentTime ?? 0,
      volume: this.audio?.volume ?? 1,
      duration: this.audio?.duration && Number.isFinite(this.audio.duration) ? this.audio.duration : 0,
      message: null
    };
  }

  dispose() {
    this.stopTicker();
    if (this.audio) {
      this.audio.pause();
      this.audio.removeAttribute("src");
      this.audio.load();
      this.audio = null;
    }
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
    this.referenceId = null;
    this.state = "idle";
    this.dispatch(null);
  }

  private startTicker() {
    this.stopTicker();
    this.intervalId = window.setInterval(() => {
      this.dispatch(null);
    }, 100);
  }

  private stopTicker() {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private dispatch(message: string | null) {
    if (typeof window === "undefined") {
      return;
    }

    window.dispatchEvent(
      new CustomEvent<ReferenceAudioSnapshot>("reference-audio:state-change", {
        detail: {
          ...this.getSnapshot(),
          message
        }
      })
    );
  }
}
