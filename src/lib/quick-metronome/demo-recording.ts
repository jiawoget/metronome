import { DEFAULT_METRONOME_SETTINGS, type QuickRecording } from "@/lib/quick-metronome/types";

const DEMO_SAMPLE_RATE = 8_000;
const DEMO_DURATION_SECONDS = 1;
const DEMO_FREQUENCY_HZ = 440;
const DEMO_AMPLITUDE = 0.28;

function writeString(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function base64Encode(bytes: Uint8Array) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let output = "";

  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index] ?? 0;
    const second = bytes[index + 1] ?? 0;
    const third = bytes[index + 2] ?? 0;
    const combined = (first << 16) | (second << 8) | third;

    output += alphabet[(combined >> 18) & 63];
    output += alphabet[(combined >> 12) & 63];
    output += index + 1 < bytes.length ? alphabet[(combined >> 6) & 63] : "=";
    output += index + 2 < bytes.length ? alphabet[combined & 63] : "=";
  }

  return output;
}

function createDemoWav() {
  const sampleCount = DEMO_SAMPLE_RATE * DEMO_DURATION_SECONDS;
  const dataByteLength = sampleCount * 2;
  const bytes = new Uint8Array(44 + dataByteLength);
  const view = new DataView(bytes.buffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataByteLength, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, DEMO_SAMPLE_RATE, true);
  view.setUint32(28, DEMO_SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataByteLength, true);

  for (let index = 0; index < sampleCount; index += 1) {
    const envelope = Math.sin((Math.PI * index) / sampleCount);
    const sample = Math.round(
      DEMO_AMPLITUDE *
        envelope *
        Math.sin((2 * Math.PI * DEMO_FREQUENCY_HZ * index) / DEMO_SAMPLE_RATE) *
        32_767
    );

    view.setInt16(44 + index * 2, sample, true);
  }

  return bytes;
}

const demoWavBytes = createDemoWav();
const demoAudioDataUrl = `data:audio/wav;base64,${base64Encode(demoWavBytes)}`;

export function getDemoQuickRecording(): QuickRecording {
  return {
    id: "demo_recording_440hz_synthetic",
    type: "quick",
    origin: "demo",
    sessionId: "demo_session_synthetic_440hz",
    sheetId: null,
    createdAt: "2026-06-21T00:00:00.000Z",
    durationMs: DEMO_DURATION_SECONDS * 1_000,
    sizeBytes: demoWavBytes.byteLength,
    mimeType: "audio/wav",
    audioDataUrl: demoAudioDataUrl,
    artifactAnalysis: {
      decodedDurationMs: DEMO_DURATION_SECONDS * 1_000,
      sampleRate: DEMO_SAMPLE_RATE,
      peakAmplitude: DEMO_AMPLITUDE,
      rmsAmplitude: 0.14,
      estimatedFrequencyHz: DEMO_FREQUENCY_HZ,
      isSilent: false
    },
    settings: DEFAULT_METRONOME_SETTINGS
  };
}

