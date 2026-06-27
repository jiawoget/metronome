import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RecordingArtifactReview } from "@/components/recordings-review/recording-artifact-review";
import type { RecordingArtifactReviewController } from "@/lib/recordings-review/artifact-review-controller";
import type { ReviewRecording } from "@/lib/recordings-review/types";

describe("RecordingArtifactReview", () => {
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
});

function renderReview(controller: RecordingArtifactReviewController) {
  return render(
    <RecordingArtifactReview
      recording={createRecording()}
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
