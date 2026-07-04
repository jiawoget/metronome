import type { LocalAudioInspectionAdapter, ReferenceResult } from "@/services/reference";
import { createBrowserAudioDecodeAdapter } from "@/infrastructure/audio/browser-audio-decode-adapter";
import { AudioDecodeError, type AudioDecodeAdapter } from "@/services/audio-analysis";

export class BrowserLocalAudioInspectionAdapter implements LocalAudioInspectionAdapter {
  constructor(
    private readonly decodeAdapter: AudioDecodeAdapter = createBrowserAudioDecodeAdapter()
  ) {}

  async inspectFile(file: File): Promise<ReferenceResult<{ durationMs: number }>> {
    if (typeof window === "undefined") {
      return {
        ok: false,
        message: "Audio validation is available only in the browser."
      };
    }

    try {
      const decoded = await this.decodeAdapter.decodeBlob(file);
      const durationMs = Math.round(decoded.duration * 1_000);

      if (!Number.isFinite(durationMs) || durationMs <= 0) {
        return {
          ok: false,
          message: "The selected audio file decoded with no playable duration."
        };
      }

      return {
        ok: true,
        value: {
          durationMs
        }
      };
    } catch (error) {
      if (error instanceof AudioDecodeError && error.reason === "unavailable") {
        return {
          ok: false,
          message: "This browser cannot decode local audio references."
        };
      }

      return {
        ok: false,
        message: "The selected audio file could not be decoded."
      };
    }
  }
}
