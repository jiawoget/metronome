import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RecordingArtifactReview } from "@/components/recordings-review/recording-artifact-review";
import type { RecordingArtifactReviewController } from "@/lib/recordings-review/artifact-review-controller";
import type { ReviewRecording } from "@/lib/recordings-review/types";

describe("RecordingArtifactReview", () => {
  it("uses an injected controller and seeks once for a pointer action", () => {
    const seekToRatio = vi.fn();
    const controller: RecordingArtifactReviewController = {
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
      controls: {
        play: vi.fn(async () => undefined),
        pause: vi.fn(),
        seekToRatio,
        getCurrentTimeMs: vi.fn(() => 0)
      }
    };

    render(
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

    const seekSurface = screen.getByTestId("artifact-waveform-seek-surface");

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

    fireEvent.pointerDown(seekSurface, { clientX: 50 });
    fireEvent.click(seekSurface, { clientX: 50 });

    expect(seekToRatio).toHaveBeenCalledTimes(1);
    expect(seekToRatio).toHaveBeenCalledWith(0.25);
  });
});

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
