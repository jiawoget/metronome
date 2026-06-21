export class BrowserRecordingPlaybackService {
  private audio: HTMLAudioElement | null = null;

  async play(audioDataUrl: string) {
    this.stop();

    if (typeof Audio === "undefined") {
      throw new Error("Audio playback is not available in this browser.");
    }

    this.audio = new Audio(audioDataUrl);
    await this.audio.play();
  }

  stop() {
    if (!this.audio) {
      return;
    }

    this.audio.pause();
    this.audio.currentTime = 0;
    this.audio = null;
  }
}

