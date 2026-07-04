import type { AudioDecodeAdapter } from "@/services/audio-analysis/types";

export function decodeAudioBlob(
  blob: Blob,
  adapter: AudioDecodeAdapter
) {
  return adapter.decodeBlob(blob);
}
