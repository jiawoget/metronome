import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RecordingArtifactReview } from "@/components/recordings-review/recording-artifact-review";
import type { RecordingArtifactReviewController } from "@/lib/recordings-review/artifact-review-controller";
import type { ReviewRecording } from "@/lib/recordings-review/types";

const artifactReviewMocks = vi.hoisted(() => {
  const adapterLoad = vi.fn(async () => undefined);
  const resolveRecordingArtifactBody = vi.fn();
  const RecordingWaveformPlaybackAdapter = vi.fn(
    function RecordingWaveformPlaybackAdapter() {
      return {
        load: adapterLoad,
        destroy: vi.fn(),
        play: vi.fn(async () => undefined),
        pause: vi.fn(),
        seekToMs: vi.fn((targetTimeMs: number) => ({
          targetTimeMs,
          currentTimeMs: targetTimeMs
        })),
        getCurrentTimeMs: vi.fn(() => 0)
      };
    }
  );

  return {
    adapterLoad,
    resolveRecordingArtifactBody,
    RecordingWaveformPlaybackAdapter
  };
});

vi.mock("@/lib/recordings-review/artifact-storage", () => ({
  resolveRecordingArtifactBody: artifactReviewMocks.resolveRecordingArtifactBody
}));

vi.mock("@/lib/recordings-review/wavesurfer-adapter", () => ({
  RecordingWaveformPlaybackAdapter:
    artifactReviewMocks.RecordingWaveformPlaybackAdapter
}));

describe("RecordingArtifactReview", () => {
  beforeEach(() => {
    artifactReviewMocks.adapterLoad.mockClear();
    artifactReviewMocks.resolveRecordingArtifactBody.mockReset();
    artifactReviewMocks.RecordingWaveformPlaybackAdapter.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses an injected controller and seeks once for a pointer action", () => {
    const controller = createReadyController();
    const seekToRatio = controller.controls.seekToRatio;

    renderReview(controller);

    const seekSurface = screen.getByTestId("artifact-waveform-seek-surface");

    setSeekSurfaceBounds(seekSurface);

    fireEvent.pointerDown(seekSurface, { clientX: 50 });
    fireEvent.click(seekSurface, { clientX: 50, detail: 1 });

    expect(seekToRatio).toHaveBeenCalledTimes(1);
    expect(seekToRatio).toHaveBeenCalledWith(0.25);
  });

  it("supports click and keyboard seek paths when playback is ready", () => {
    const controller = createReadyController();
    const seekToRatio = controller.controls.seekToRatio;

    renderReview(controller);

    const seekSurface = screen.getByTestId("artifact-waveform-seek-surface");

    setSeekSurfaceBounds(seekSurface);

    fireEvent.click(seekSurface, { clientX: 150, detail: 1 });
    fireEvent.keyDown(seekSurface, { key: "Enter" });
    fireEvent.click(seekSurface, { clientX: 100, detail: 0 });
    fireEvent.keyDown(seekSurface, { key: " " });
    fireEvent.click(seekSurface, { clientX: 100, detail: 0 });

    expect(seekToRatio).toHaveBeenNthCalledWith(1, 0.75);
    expect(seekToRatio).toHaveBeenNthCalledWith(2, 0.5);
    expect(seekToRatio).toHaveBeenNthCalledWith(3, 0.5);
    expect(seekToRatio).toHaveBeenCalledTimes(3);
  });

  it("does not let a keyboard seek without generated click swallow the next mouse click", () => {
    const controller = createReadyController();
    const seekToRatio = controller.controls.seekToRatio;

    renderReview(controller);

    const seekSurface = screen.getByTestId("artifact-waveform-seek-surface");

    setSeekSurfaceBounds(seekSurface);

    fireEvent.keyDown(seekSurface, { key: "Enter" });
    fireEvent.click(seekSurface, { clientX: 40, detail: 1 });

    expect(seekToRatio).toHaveBeenNthCalledWith(1, 0.5);
    expect(seekToRatio).toHaveBeenNthCalledWith(2, 0.2);
    expect(seekToRatio).toHaveBeenCalledTimes(2);
  });

  it("keeps playback disabled until waveform playback is ready", () => {
    const play = vi.fn(async () => undefined);

    renderReview(
      createReadyController({
        isPlaybackReady: false,
        controls: {
          play
        }
      })
    );

    expect(screen.getByRole("button", { name: "Play recording" })).toBeDisabled();
    expect(screen.getByText("Preparing waveform playback.")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Play recording" }));

    expect(play).not.toHaveBeenCalled();
  });

  it("resolves one artifact body for default controller details and playback", async () => {
    installAudioContextMock({ durationSeconds: 1 });

    const artifactBlob = new Blob(["audio"], { type: "audio/webm" });
    const recording = createRecording({
      artifactRef: createRecordingArtifactRef("recording-alpha"),
      audioDataUrl: null,
      trustedPeaks: [0.2, 0.8]
    });

    artifactReviewMocks.resolveRecordingArtifactBody.mockResolvedValue({
      artifactId: "recording-alpha",
      recordingId: "recording-alpha",
      mimeType: "audio/webm",
      sizeBytes: artifactBlob.size,
      blob: artifactBlob
    });

    const { rerender } = renderDefaultReview(recording);

    await waitFor(() => {
      expect(screen.getByTestId("artifact-source")).toHaveAttribute(
        "data-recording-id",
        "recording-alpha"
      );
    });

    expect(screen.getByTestId("artifact-peaks")).toHaveAttribute(
      "data-waveform-source",
      "trusted-peaks"
    );
    expect(artifactReviewMocks.resolveRecordingArtifactBody).toHaveBeenCalledTimes(1);
    expect(artifactReviewMocks.resolveRecordingArtifactBody).toHaveBeenCalledWith(
      recording
    );
    expect(artifactReviewMocks.adapterLoad).toHaveBeenCalledWith(
      expect.any(HTMLDivElement),
      recording,
      artifactBlob
    );

    rerender(createDefaultReviewElement(recording));

    await waitFor(() => {
      expect(artifactReviewMocks.resolveRecordingArtifactBody).toHaveBeenCalledTimes(1);
    });
  });
});

function renderReview(controller: RecordingArtifactReviewController) {
  return render(createDefaultReviewElement(createRecording(), controller));
}

function renderDefaultReview(recording: ReviewRecording) {
  return render(createDefaultReviewElement(recording));
}

function createDefaultReviewElement(
  recording: ReviewRecording,
  controller?: RecordingArtifactReviewController
) {
  return (
    <RecordingArtifactReview
      recording={recording}
      adapterClassName="h-10"
      adapterTestId="artifact-waveform"
      derivedWaveformClassName="grid"
      derivedWaveformTestId="artifact-peaks"
      errorTestId="artifact-error"
      peakHeightPx={20}
      playAriaLabel="Play recording"
      playText="Play"
      pauseAriaLabel="Pause recording"
      pauseText="Pause"
      sourceTestId="artifact-source"
      warningTestId="artifact-warning"
      controller={controller}
    />
  );
}

function createReadyController(
  overrides: Partial<Omit<RecordingArtifactReviewController, "controls">> & {
    controls?: Partial<RecordingArtifactReviewController["controls"]>;
  } = {}
): RecordingArtifactReviewController {
  const controls = {
    play: vi.fn(async () => undefined),
    pause: vi.fn(),
    seekToRatio: vi.fn(),
    getCurrentTimeMs: vi.fn(() => 0),
    ...overrides.controls
  };

  return {
    state: {
      status: "ready",
      details: {
        recordingId: "recording-alpha",
        decodedDurationMs: 1_000,
        metadataDurationMs: 1_000,
        durationDifferenceMs: 0,
        durationWarning: null,
        peaks: [0.2, 0.8],
        source: "trusted-peaks"
      },
      message: null
    },
    playbackState: "idle",
    isPlaybackReady: true,
    currentTimeMs: 0,
    setWaveformElement: vi.fn(),
    ...overrides,
    controls
  };
}

function setSeekSurfaceBounds(seekSurface: HTMLElement) {
  seekSurface.getBoundingClientRect = () =>
    ({
      left: 0,
      width: 200,
      top: 0,
      right: 200,
      bottom: 20,
      height: 20,
      x: 0,
      y: 0,
      toJSON: () => ({})
    }) as DOMRect;
}

function createRecording(overrides: Partial<ReviewRecording> = {}): ReviewRecording {
  return {
    id: "recording-alpha",
    type: "sheet",
    name: "Alpha take",
    sessionId: "session-alpha",
    sheetId: "sheet-alpha",
    sheetName: "Alpha",
    createdAt: "2026-06-21T12:00:00.000Z",
    durationMs: 1_000,
    sizeBytes: 128,
    mimeType: "audio/webm",
    audioDataUrl: "data:audio/webm;base64,AQID",
    settings: {
      bpm: 96,
      timeSignature: "4/4"
    },
    ...overrides
  };
}

function createRecordingArtifactRef(recordingId: string) {
  return {
    kind: "indexeddb" as const,
    artifactId: recordingId,
    storageVersion: 1 as const
  };
}

function installAudioContextMock({
  durationSeconds = 1,
  samples = new Float32Array([0, 0.25, -0.5, 1])
}: {
  durationSeconds?: number;
  samples?: Float32Array;
} = {}) {
  class MockAudioContext {
    async decodeAudioData() {
      return {
        duration: durationSeconds,
        sampleRate: 8_000,
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
