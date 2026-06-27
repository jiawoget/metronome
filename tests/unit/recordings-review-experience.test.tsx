import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import type { SheetRecordingSegmentContext } from "@/domain/practice";
import { RecordingsReviewExperience } from "@/components/recordings-review/recordings-review-experience";
import { recordingHistoryRepository } from "@/lib/recordings-review/repository";
import type { RecordingReviewSnapshot, ReviewRecording } from "@/lib/recordings-review/types";

vi.mock("@/components/recordings-review/recording-artifact-review", () => ({
  RecordingArtifactReview: ({ actions }: { actions?: ReactNode }) => (
    <div data-testid="mock-recording-artifact-review">{actions}</div>
  )
}));

afterEach(() => {
  cleanup();
  recordingHistoryRepository.clear();
});

describe("RecordingsReviewExperience grouped take history", () => {
  it("renders sheet take groups, quick recordings, and ungrouped sheet recordings from the grouping read model", async () => {
    const user = userEvent.setup();

    recordingHistoryRepository.saveSnapshot(createMixedSnapshot());

    render(<RecordingsReviewExperience />);

    await expect(screen.findByTestId("recordings-list")).resolves.toBeVisible();

    const segmentGroup = screen.getByTestId(
      "take-group-sheet:sheet-alpha:segment:segment-bridge"
    );
    expect(segmentGroup).toHaveTextContent("Segment take history");
    expect(segmentGroup).toHaveTextContent("Alpha Etude");
    expect(segmentGroup).toHaveTextContent("Bridge");
    expect(segmentGroup).toHaveTextContent("2 takes");
    expect(
      within(segmentGroup).getByTestId("recording-row-sheet-bridge-new")
    ).toBeVisible();
    expect(
      within(segmentGroup).getByTestId("recording-row-sheet-bridge-old")
    ).toBeVisible();

    const noSegmentGroup = screen.getByTestId(
      "take-group-sheet:sheet-alpha:segment:none"
    );
    expect(noSegmentGroup).toHaveTextContent("Whole sheet / no segment");
    expect(noSegmentGroup).toHaveTextContent("2 takes");

    expect(screen.getByTestId("quick-recordings-section")).toHaveTextContent(
      "Quick recordings"
    );
    expect(screen.getByTestId("recording-row-quick-alpha")).toBeVisible();
    expect(screen.getByTestId("ungrouped-recordings-section")).toHaveTextContent(
      "Legacy recordings with missing sheet links"
    );
    expect(screen.getByTestId("recording-row-sheet-missing-link")).toBeVisible();

    expect(screen.getByTestId("recording-row-sheet-bridge-new")).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByTestId("recording-row-sheet-bridge-new")).toHaveAccessibleName(
      /Bridge take 2, Alpha Etude, Segment Bridge, recorded/
    );
    expect(screen.getByTestId("recording-row-sheet-whole-null")).toHaveAccessibleName(
      /Whole sheet explicit, Alpha Etude, Whole sheet \/ no segment, recorded/
    );
    expect(screen.getByTestId("recording-details")).toHaveAttribute(
      "data-recording-id",
      "sheet-bridge-new"
    );

    await user.click(screen.getByTestId("recording-row-quick-alpha"));

    expect(screen.getByTestId("recording-row-quick-alpha")).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByTestId("recording-details")).toHaveAttribute(
      "data-recording-id",
      "quick-alpha"
    );
    expect(screen.getByRole("link", { name: "Practice Again" })).toHaveAttribute(
      "href",
      "/quick-metronome?recordingId=quick-alpha"
    );
  });

  it("filters grouped recordings by saved segment metadata and keeps empty group shells hidden", async () => {
    const user = userEvent.setup();

    recordingHistoryRepository.saveSnapshot(createMixedSnapshot());

    render(<RecordingsReviewExperience />);

    await expect(screen.findByTestId("recordings-list")).resolves.toBeVisible();

    await user.type(screen.getByRole("textbox", { name: "Search recordings" }), "bridge");

    expect(
      screen.getByTestId("take-group-sheet:sheet-alpha:segment:segment-bridge")
    ).toBeVisible();
    expect(
      screen.queryByTestId("take-group-sheet:sheet-alpha:segment:none")
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("quick-recordings-section")).not.toBeInTheDocument();

    await user.clear(screen.getByRole("textbox", { name: "Search recordings" }));
    await user.selectOptions(screen.getByLabelText("Type filter"), "quick");

    expect(screen.getByTestId("quick-recordings-section")).toBeVisible();
    expect(
      screen.queryByTestId("take-group-sheet:sheet-alpha:segment:segment-bridge")
    ).not.toBeInTheDocument();

    await user.type(screen.getByRole("textbox", { name: "Search recordings" }), "no match");

    await waitFor(() => {
      expect(screen.getByTestId("recordings-filter-empty-state")).toHaveTextContent(
        "No recording groups match"
      );
    });
    expect(screen.queryByTestId("quick-recordings-section")).not.toBeInTheDocument();
  });

  it("falls back to the expected visible recording after deleting or filtering the selected take", async () => {
    const user = userEvent.setup();

    recordingHistoryRepository.saveSnapshot(createMixedSnapshot());

    render(<RecordingsReviewExperience />);

    await expect(screen.findByTestId("recordings-list")).resolves.toBeVisible();
    expect(screen.getByTestId("recording-details")).toHaveAttribute(
      "data-recording-id",
      "sheet-bridge-new"
    );

    await user.click(screen.getByRole("button", { name: "Delete Recording" }));
    await user.click(screen.getByRole("button", { name: "Confirm Delete" }));

    await waitFor(() => {
      expect(screen.getByTestId("recording-details")).toHaveAttribute(
        "data-recording-id",
        "sheet-whole-null"
      );
    });
    expect(screen.queryByTestId("recording-row-sheet-bridge-new")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("recording-row-quick-alpha"));
    expect(screen.getByTestId("recording-details")).toHaveAttribute(
      "data-recording-id",
      "quick-alpha"
    );

    await user.selectOptions(screen.getByLabelText("Type filter"), "sheet");

    expect(screen.getByTestId("recording-details")).toHaveAttribute(
      "data-recording-id",
      "sheet-whole-null"
    );
    expect(screen.queryByTestId("recording-row-quick-alpha")).not.toBeInTheDocument();
  });
});

function createMixedSnapshot(): RecordingReviewSnapshot {
  return {
    sessions: [],
    recordings: [
      createSheetRecording({
        id: "sheet-bridge-old",
        name: "Bridge take 1",
        createdAt: "2026-06-21T09:00:00.000Z",
        segmentContext: createSegmentContext({
          segmentId: "segment-bridge",
          segmentName: "Bridge"
        })
      }),
      createSheetRecording({
        id: "sheet-bridge-new",
        name: "Bridge take 2",
        createdAt: "2026-06-21T13:00:00.000Z",
        segmentContext: createSegmentContext({
          segmentId: "segment-bridge",
          segmentName: "Bridge"
        })
      }),
      createSheetRecording({
        id: "sheet-whole-legacy",
        name: "Whole sheet legacy",
        createdAt: "2026-06-21T10:00:00.000Z"
      }),
      createSheetRecording({
        id: "sheet-whole-null",
        name: "Whole sheet explicit",
        createdAt: "2026-06-21T11:00:00.000Z",
        segmentContext: null
      }),
      createQuickRecording({
        id: "quick-alpha",
        name: "Quick alpha",
        createdAt: "2026-06-21T14:00:00.000Z"
      }),
      createSheetRecording({
        id: "sheet-missing-link",
        name: "Missing sheet link",
        sheetId: null,
        sheetName: null,
        createdAt: "2026-06-21T12:00:00.000Z",
        segmentContext: null
      })
    ],
    errorMarkers: []
  };
}

function createSegmentContext(
  overrides: Partial<SheetRecordingSegmentContext> = {}
): SheetRecordingSegmentContext {
  return {
    segmentId: "segment-alpha",
    segmentName: "Bridge",
    range: {
      startMeasure: 5,
      endMeasure: 12
    },
    targetBpm: 96,
    measureGridVersion:
      "bpm:96|timeSignature:4/4|pickupBeats:0|measureOneOffsetMs:1000",
    measureGridSnapshot: {
      bpm: 96,
      timeSignature: "4/4",
      pickupBeats: 0,
      measureOneOffsetMs: 1_000
    },
    measureRangeMs: {
      startMs: 11_000,
      endMs: 31_000
    },
    ...overrides
  };
}

function createQuickRecording(
  overrides: Partial<ReviewRecording> = {}
): ReviewRecording {
  return {
    id: "quick-recording",
    type: "quick",
    name: "Quick take",
    sessionId: "session-quick",
    sheetId: null,
    createdAt: "2026-06-21T09:00:00.000Z",
    durationMs: 10_000,
    sizeBytes: 128,
    mimeType: "audio/wav",
    audioDataUrl: "data:audio/wav;base64,UklGRg==",
    settings: {
      bpm: 120,
      timeSignature: "4/4"
    },
    ...overrides
  };
}

function createSheetRecording(
  overrides: Partial<Omit<ReviewRecording, "segmentContext">> & {
    segmentContext?: SheetRecordingSegmentContext | null;
  } = {}
): ReviewRecording {
  return {
    id: "sheet-recording",
    type: "sheet",
    name: "Sheet take",
    sessionId: "session-sheet",
    sheetId: "sheet-alpha",
    sheetName: "Alpha Etude",
    createdAt: "2026-06-21T12:00:00.000Z",
    durationMs: 12_000,
    sizeBytes: 256,
    mimeType: "audio/webm",
    audioDataUrl: "data:audio/webm;base64,UklGRg==",
    settings: {
      bpm: 96,
      timeSignature: "4/4"
    },
    ...overrides
  };
}
