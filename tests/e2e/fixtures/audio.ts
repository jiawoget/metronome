import { type Page } from "@playwright/test";

import {
  RECORDING_ARTIFACT_DB_NAME,
  RECORDING_HISTORY_STORAGE_KEY
} from "./storage";

export type WavArtifact = {
  dataUrl: string;
  sizeBytes: number;
  durationMs: number;
};

export type DecodedAudioEvidence = {
  decodedDurationMs: number;
  peakAmplitude: number;
  rmsAmplitude: number;
  estimatedFrequencyHz: number | null;
};

export async function installSyntheticMicrophone(
  page: Page,
  frequencyHz = 440,
  gainValue = 0.22
) {
  await page.addInitScript(
    ({ frequency, gainLevel }: { frequency: number; gainLevel: number }) => {
      const e2eWindow = window as Window & {
        __syntheticAudioNodes?: unknown[];
      };

      e2eWindow.__syntheticAudioNodes = [];
      Object.defineProperty(navigator, "mediaDevices", {
        configurable: true,
        value: {
          getUserMedia: async () => {
            const audioWindow = window as Window &
              typeof globalThis & { webkitAudioContext?: typeof AudioContext };
            const AudioContextConstructor =
              audioWindow.AudioContext || audioWindow.webkitAudioContext;

            if (!AudioContextConstructor) {
              throw new Error("Web Audio is not available in this browser.");
            }

            const audioContext = new AudioContextConstructor();
            const destination = audioContext.createMediaStreamDestination();
            const oscillator = audioContext.createOscillator();
            const gain = audioContext.createGain();

            oscillator.frequency.value = frequency;
            gain.gain.value = gainLevel;
            oscillator.connect(gain);
            gain.connect(destination);
            oscillator.start();
            e2eWindow.__syntheticAudioNodes?.push({
              audioContext,
              oscillator,
              gain
            });

            return destination.stream;
          }
        }
      });
    },
    { frequency: frequencyHz, gainLevel: gainValue }
  );
}

export async function createWavDataUrl(
  page: Page,
  frequencyHz: number,
  durationSeconds: number
) {
  return page.evaluate(
    ({
      frequency,
      duration
    }: {
      frequency: number;
      duration: number;
    }): WavArtifact => {
      const sampleRate = 8_000;
      const sampleCount = Math.round(sampleRate * duration);
      const dataSize = sampleCount * 2;
      const buffer = new ArrayBuffer(44 + dataSize);
      const view = new DataView(buffer);

      function writeString(offset: number, value: string) {
        for (let index = 0; index < value.length; index += 1) {
          view.setUint8(offset + index, value.charCodeAt(index));
        }
      }

      writeString(0, "RIFF");
      view.setUint32(4, 36 + dataSize, true);
      writeString(8, "WAVE");
      writeString(12, "fmt ");
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, 1, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * 2, true);
      view.setUint16(32, 2, true);
      view.setUint16(34, 16, true);
      writeString(36, "data");
      view.setUint32(40, dataSize, true);

      for (let index = 0; index < sampleCount; index += 1) {
        const sample =
          Math.sin((2 * Math.PI * frequency * index) / sampleRate) * 0.35;

        view.setInt16(
          44 + index * 2,
          Math.max(-1, Math.min(1, sample)) * 0x7fff,
          true
        );
      }

      let binary = "";
      const bytes = new Uint8Array(buffer);

      for (let index = 0; index < bytes.length; index += 1) {
        binary += String.fromCharCode(bytes[index]);
      }

      return {
        dataUrl: `data:audio/wav;base64,${window.btoa(binary)}`,
        sizeBytes: bytes.length,
        durationMs: duration * 1_000
      };
    },
    { frequency: frequencyHz, duration: durationSeconds }
  );
}

export async function decodeRecordingHistoryAudio(
  page: Page,
  recordingId: string,
  storageKey = RECORDING_HISTORY_STORAGE_KEY
) {
  return page.evaluate(
    async ({
      id,
      key,
      artifactDatabaseName
    }: {
      id: string;
      key: string;
      artifactDatabaseName: string;
    }): Promise<DecodedAudioEvidence> => {
      const rawValue = window.localStorage.getItem(key);
      const parsed = rawValue ? JSON.parse(rawValue) : { recordings: [] };
      const recording = parsed.recordings.find(
        (item: { id: string }) => item.id === id
      );
      const audioWindow = window as Window &
        typeof globalThis & { webkitAudioContext?: typeof AudioContext };
      const AudioContextConstructor =
        audioWindow.AudioContext || audioWindow.webkitAudioContext;

      if (!recording || !AudioContextConstructor) {
        throw new Error(`Cannot decode ${id}.`);
      }

      let arrayBuffer: ArrayBuffer | null = null;

      if (recording.artifactRef?.artifactId) {
        arrayBuffer = await new Promise<ArrayBuffer | null>((resolve, reject) => {
          const openRequest = indexedDB.open(artifactDatabaseName);

          openRequest.onerror = () => reject(openRequest.error);
          openRequest.onsuccess = () => {
            const database = openRequest.result;
            const transaction = database.transaction("recordingArtifacts", "readonly");
            const store = transaction.objectStore("recordingArtifacts");
            const getRequest = store.get(recording.artifactRef.artifactId);

            getRequest.onerror = () => reject(getRequest.error);
            getRequest.onsuccess = () => {
              const artifact = getRequest.result as { blob?: Blob } | undefined;

              if (!artifact?.blob) {
                resolve(null);
                return;
              }

              artifact.blob.arrayBuffer().then(resolve, reject);
            };
          };
        });
      }

      if (!arrayBuffer && recording.audioDataUrl) {
        const response = await fetch(recording.audioDataUrl);

        arrayBuffer = await response.arrayBuffer();
      }

      if (!arrayBuffer) {
        throw new Error(`Cannot decode ${id}.`);
      }

      const audioContext = new AudioContextConstructor();
      const audioBuffer = await audioContext.decodeAudioData(
        arrayBuffer.slice(0)
      );
      const samples = audioBuffer.getChannelData(0);
      let peakAmplitude = 0;
      let sumSquares = 0;
      let positiveZeroCrossings = 0;
      let previousSample = samples[0] ?? 0;

      for (let index = 0; index < samples.length; index += 1) {
        const sample = samples[index] ?? 0;

        peakAmplitude = Math.max(peakAmplitude, Math.abs(sample));
        sumSquares += sample * sample;

        if (previousSample < 0 && sample >= 0) {
          positiveZeroCrossings += 1;
        }

        previousSample = sample;
      }

      await audioContext.close();

      const decodedDurationMs = audioBuffer.duration * 1_000;

      return {
        decodedDurationMs,
        peakAmplitude,
        rmsAmplitude: Math.sqrt(sumSquares / Math.max(1, samples.length)),
        estimatedFrequencyHz:
          decodedDurationMs > 0
            ? positiveZeroCrossings / (decodedDurationMs / 1_000)
            : null
      };
    },
    {
      id: recordingId,
      key: storageKey,
      artifactDatabaseName: RECORDING_ARTIFACT_DB_NAME
    }
  );
}
