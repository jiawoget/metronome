import { vi } from "vitest";

type InstallAudioContextMockOptions = {
  durationSeconds?: number;
  samples?: Float32Array;
  sampleRate?: number;
  reject?: boolean;
};

export function installAudioContextMock({
  durationSeconds = 1,
  samples = new Float32Array([0, 0.25, -0.5, 1]),
  sampleRate = 8_000,
  reject = false
}: InstallAudioContextMockOptions = {}) {
  class MockAudioContext {
    async decodeAudioData() {
      if (reject) {
        throw new Error("decode failed");
      }

      return {
        duration: durationSeconds,
        sampleRate,
        getChannelData: () => samples
      };
    }

    close() {
      return Promise.resolve();
    }
  }

  vi.stubGlobal("AudioContext", MockAudioContext);
  Object.defineProperty(window, "AudioContext", {
    configurable: true,
    value: MockAudioContext
  });
}
