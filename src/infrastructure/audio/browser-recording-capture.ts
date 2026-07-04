import {
  RecordingPermissionError,
  type RecordingArtifact,
  type RecordingCaptureService
} from "@/services/recording";
import { createBrowserAudioDecodeAdapter } from "@/infrastructure/audio/browser-audio-decode-adapter";
import {
  analyzeRecordingBlob,
  type AudioDecodeAdapter
} from "@/services/audio-analysis";

function getPreferredMimeType() {
  if (typeof MediaRecorder === "undefined" || !("isTypeSupported" in MediaRecorder)) {
    return "";
  }

  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];

  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? "";
}

export class BrowserRecordingService implements RecordingCaptureService {
  private chunks: Blob[] = [];
  private mediaRecorder: MediaRecorder | null = null;
  private startedAt = 0;
  private stream: MediaStream | null = null;

  constructor(
    private readonly decodeAdapter: AudioDecodeAdapter = createBrowserAudioDecodeAdapter()
  ) {}

  get isRecording() {
    return this.mediaRecorder?.state === "recording";
  }

  async start() {
    if (this.isRecording) {
      return;
    }

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      throw new RecordingPermissionError("Recording is not available in this browser.");
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
    } catch {
      throw new RecordingPermissionError();
    }

    const mimeType = getPreferredMimeType();
    this.chunks = [];
    this.startedAt = performance.now();
    this.mediaRecorder = mimeType ? new MediaRecorder(this.stream, { mimeType }) : new MediaRecorder(this.stream);

    this.mediaRecorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) {
        this.chunks.push(event.data);
      }
    });

    this.mediaRecorder.start(100);
  }

  async stop(): Promise<RecordingArtifact> {
    if (!this.mediaRecorder || this.mediaRecorder.state === "inactive") {
      throw new Error("No active recording to stop.");
    }

    const recorder = this.mediaRecorder;
    const mimeType = recorder.mimeType || getPreferredMimeType() || "audio/webm";
    const durationMs = performance.now() - this.startedAt;

    const stopped = new Promise<void>((resolve) => {
      recorder.addEventListener("stop", () => resolve(), { once: true });
    });

    recorder.stop();
    await stopped;

    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.mediaRecorder = null;

    const blob = new Blob(this.chunks, { type: mimeType });
    this.chunks = [];

    return {
      blob,
      durationMs,
      mimeType,
      sizeBytes: blob.size,
      analysis: await analyzeRecordingBlob(blob, this.decodeAdapter)
    };
  }
}

export function createBrowserRecordingCaptureService() {
  return new BrowserRecordingService();
}
