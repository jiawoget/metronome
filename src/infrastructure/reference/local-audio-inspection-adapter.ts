import type { LocalAudioInspectionAdapter, ReferenceResult } from "@/services/reference";

function getAudioContextConstructor() {
  return window.AudioContext ?? window.webkitAudioContext;
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

export class BrowserLocalAudioInspectionAdapter implements LocalAudioInspectionAdapter {
  async inspectFile(file: File): Promise<ReferenceResult<{ durationMs: number }>> {
    if (typeof window === "undefined") {
      return {
        ok: false,
        message: "Audio validation is available only in the browser."
      };
    }

    const AudioContextConstructor = getAudioContextConstructor();

    if (!AudioContextConstructor) {
      return {
        ok: false,
        message: "This browser cannot decode local audio references."
      };
    }

    const audioContext = new AudioContextConstructor();

    try {
      const buffer = await file.arrayBuffer();
      const decoded = await audioContext.decodeAudioData(buffer.slice(0));
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
    } catch {
      return {
        ok: false,
        message: "The selected audio file could not be decoded."
      };
    } finally {
      await audioContext.close().catch(() => undefined);
    }
  }
}
