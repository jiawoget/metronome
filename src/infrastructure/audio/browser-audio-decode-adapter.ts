import {
  AudioDecodeError,
  type AudioDecodeAdapter
} from "@/services/audio-analysis";

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

function getAudioContextConstructor() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.AudioContext ?? window.webkitAudioContext ?? null;
}

export class BrowserAudioDecodeAdapter implements AudioDecodeAdapter {
  async decodeBlob(blob: Blob) {
    const AudioContextConstructor = getAudioContextConstructor();

    if (!AudioContextConstructor) {
      throw new AudioDecodeError(
        "Audio decoding is not available in this browser.",
        "unavailable"
      );
    }

    const audioContext = new AudioContextConstructor();

    try {
      const arrayBuffer = await blob.arrayBuffer();

      return await audioContext.decodeAudioData(arrayBuffer.slice(0));
    } catch (error) {
      throw new AudioDecodeError(
        "Audio blob could not be decoded.",
        "decode-failed",
        error
      );
    } finally {
      await audioContext.close().catch(() => undefined);
    }
  }
}

export function createBrowserAudioDecodeAdapter() {
  return new BrowserAudioDecodeAdapter();
}
