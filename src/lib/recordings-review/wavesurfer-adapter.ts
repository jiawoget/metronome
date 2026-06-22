"use client";

import WaveSurfer from "wavesurfer.js";

import type { ReviewRecording } from "@/lib/recordings-review/types";

export class RecordingWaveformPlaybackAdapter {
  private waveSurfer: WaveSurfer | null = null;
  private recordingId: string | null = null;
  private unsubscribeTimeUpdate: (() => void) | null = null;

  async load(container: HTMLElement, recording: ReviewRecording) {
    this.destroy();

    if (!recording.audioDataUrl) {
      throw new Error("This recording has no accessible audio artifact.");
    }

    this.recordingId = recording.id;
    this.waveSurfer = WaveSurfer.create({
      container,
      url: recording.audioDataUrl,
      height: 96,
      barWidth: 2,
      barGap: 2,
      barRadius: 2,
      cursorWidth: 1,
      waveColor: "#c7b9d8",
      progressColor: "#8a5bd3",
      cursorColor: "#1f1a14",
      normalize: true,
      interact: false
    });
    this.unsubscribeTimeUpdate = this.waveSurfer.on("timeupdate", (currentTimeSeconds) => {
      this.dispatchTimeUpdate(currentTimeSeconds * 1_000);
    });

    await new Promise<void>((resolve, reject) => {
      const waveSurfer = this.waveSurfer;

      if (!waveSurfer) {
        reject(new Error("Waveform adapter was disposed before loading."));
        return;
      }

      waveSurfer.once("ready", () => resolve());
      waveSurfer.once("error", () => reject(new Error("Waveform playback could not load this artifact.")));
    });
  }

  async play() {
    if (!this.waveSurfer || !this.recordingId) {
      throw new Error("No recording is loaded for playback.");
    }

    await this.waveSurfer.play();
    this.dispatchPlaybackEvent("playing");
  }

  pause() {
    if (!this.waveSurfer) {
      return;
    }

    this.waveSurfer.pause();
    this.dispatchPlaybackEvent("paused");
  }

  seekToMs(timestampMs: number) {
    if (!this.waveSurfer || !this.recordingId) {
      throw new Error("No recording is loaded for playback.");
    }

    const timestampSeconds = Math.max(0, timestampMs / 1_000);

    this.waveSurfer.setTime(timestampSeconds);
    const currentTimeMs = this.getCurrentTimeMs();

    this.dispatchTimeUpdate(currentTimeMs);
    this.dispatchSeekEvent(timestampMs);

    return {
      targetTimeMs: timestampMs,
      currentTimeMs
    };
  }

  getCurrentTimeMs() {
    return Math.round((this.waveSurfer?.getCurrentTime() ?? 0) * 1_000);
  }

  destroy() {
    this.unsubscribeTimeUpdate?.();
    this.unsubscribeTimeUpdate = null;

    if (this.waveSurfer) {
      this.waveSurfer.destroy();
      this.waveSurfer = null;
      this.dispatchPlaybackEvent("stopped");
    }

    this.recordingId = null;
  }

  private dispatchPlaybackEvent(state: "playing" | "paused" | "stopped") {
    if (typeof window === "undefined" || !this.recordingId) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent("recordings-review:playback", {
        detail: {
          recordingId: this.recordingId,
          state
        }
      })
    );
  }

  private dispatchSeekEvent(timestampMs: number) {
    if (typeof window === "undefined" || !this.recordingId) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent("recordings-review:seek", {
        detail: {
          recordingId: this.recordingId,
          timestampMs,
          currentTimeMs: this.getCurrentTimeMs()
        }
      })
    );
  }

  private dispatchTimeUpdate(currentTimeMs: number) {
    if (typeof window === "undefined" || !this.recordingId) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent("recordings-review:timeupdate", {
        detail: {
          recordingId: this.recordingId,
          currentTimeMs: Math.round(currentTimeMs)
        }
      })
    );
  }
}
