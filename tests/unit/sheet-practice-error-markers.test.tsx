import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { RecordingPlaybackControls } from "@/components/recordings-review/recording-artifact-review";
import { ErrorMarkerPanel } from "@/components/sheet-practice/markers/error-marker-panel";
import {
  RECORDINGS_STORAGE_KEY,
  recordingHistoryRepository
} from "@/lib/recordings-review/repository";
import type { ReviewRecording } from "@/lib/recordings-review/types";

const recording: ReviewRecording = {
  id: "recording-1",
  type: "sheet",
  name: "Sheet take",
  sessionId: "session-1",
  sheetId: "sheet-1",
  createdAt: "2026-06-22T08:00:00.000Z",
  durationMs: 2_000,
  sizeBytes: 256,
  mimeType: "audio/wav",
  audioDataUrl: "data:audio/wav;base64,UklGRg==",
  settings: {
    bpm: 96,
    timeSignature: "4/4"
  }
};

function seedMarker() {
  recordingHistoryRepository.saveSnapshot({
    sessions: [{ id: "session-1" }],
    recordings: [recording],
    errorMarkers: [
      {
        id: "marker-1",
        recordingId: recording.id,
        timestampMs: 1_200,
        note: "Missed left hand"
      }
    ]
  });
}

function createPlaybackControls(
  overrides: Partial<RecordingPlaybackControls> = {}
): RecordingPlaybackControls {
  return {
    recordingId: recording.id,
    durationMs: recording.durationMs,
    getCurrentTimeMs: vi.fn(() => 0),
    seekToMs: vi.fn((timestampMs: number) => ({
      targetTimeMs: timestampMs,
      currentTimeMs: timestampMs
    })),
    ...overrides
  };
}

describe("ErrorMarkerPanel", () => {
  beforeEach(() => {
    window.localStorage.removeItem(RECORDINGS_STORAGE_KEY);
  });

  it("shows a recoverable error when playback seek throws instead of fake success", async () => {
    const user = userEvent.setup();
    const playbackControls = createPlaybackControls({
      seekToMs: vi.fn(() => {
        throw new Error("Adapter seek failed.");
      })
    });

    seedMarker();
    render(
      <ErrorMarkerPanel
        recording={recording}
        playbackControls={playbackControls}
        currentTimeMs={0}
      />
    );

    await user.click(screen.getByRole("button", { name: /Seek to marker 0:01/ }));

    expect(screen.getByRole("alert")).toHaveTextContent("Adapter seek failed.");
    expect(screen.queryByText(/Playback moved/)).not.toBeInTheDocument();
  });

  it("shows a recoverable error when the playback boundary does not confirm current time", async () => {
    const user = userEvent.setup();
    const playbackControls = createPlaybackControls({
      seekToMs: vi.fn((timestampMs: number) => ({
        targetTimeMs: timestampMs,
        currentTimeMs: 0
      }))
    });

    seedMarker();
    render(
      <ErrorMarkerPanel
        recording={recording}
        playbackControls={playbackControls}
        currentTimeMs={0}
      />
    );

    await user.click(screen.getByRole("button", { name: /Seek to marker 0:01/ }));

    expect(screen.getByRole("alert")).toHaveTextContent("Playback did not move to the selected marker.");
    expect(screen.queryByText(/Playback moved/)).not.toBeInTheDocument();
  });

  it("shows success only after the playback boundary confirms the seek target", async () => {
    const user = userEvent.setup();
    const playbackControls = createPlaybackControls();

    seedMarker();
    render(
      <ErrorMarkerPanel
        recording={recording}
        playbackControls={playbackControls}
        currentTimeMs={0}
      />
    );

    await user.click(screen.getByRole("button", { name: /Seek to marker 0:01/ }));

    expect(playbackControls.seekToMs).toHaveBeenCalledWith(1_200);
    expect(screen.getByRole("status")).toHaveTextContent("Playback moved to 0:01.");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
