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
      within(segmentGroup).getByTestId("take-history-summary")
    ).toHaveTextContent("Takes: 2 takes");
    expect(
      within(segmentGroup).getByTestId("take-history-summary")
    ).toHaveTextContent(/Latest: .*Bridge take 2/);
    expect(
      within(segmentGroup).getByTestId("take-history-summary")
    ).toHaveTextContent("Best: none");
    expect(
      within(segmentGroup).getByTestId("take-history-summary")
    ).toHaveTextContent("Latest duration: 0:12");
    expect(
      within(segmentGroup).getByTestId("take-history-summary")
    ).toHaveTextContent("BPM: 96 BPM");
    expect(
      within(segmentGroup).getByTestId("take-history-summary")
    ).toHaveTextContent("Time signature: 4/4");
    expect(
      within(segmentGroup).getByTestId("take-history-summary")
    ).toHaveTextContent("Markers: 2 markers");
    expect(
      within(segmentGroup).getByTestId("recording-row-sheet-bridge-new")
    ).toBeVisible();
    expect(
      within(segmentGroup).getByTestId("recording-row-sheet-bridge-old")
    ).toBeVisible();
    expect(segmentGroup).toHaveTextContent("Best: none");
    expect(segmentGroup).toHaveTextContent("Active: none");
    expect(
      within(segmentGroup).getByTestId("best-take-control-sheet-bridge-new")
    ).toHaveAttribute("aria-pressed", "false");
    expect(
      within(segmentGroup).getByTestId("active-take-control-sheet-bridge-new")
    ).toHaveAttribute("aria-pressed", "false");

    const noSegmentGroup = screen.getByTestId(
      "take-group-sheet:sheet-alpha:segment:none"
    );
    expect(noSegmentGroup).toHaveTextContent("Whole sheet / no segment");
    expect(noSegmentGroup).toHaveTextContent("2 takes");
    expect(
      within(noSegmentGroup).getByTestId("take-history-summary")
    ).toHaveTextContent("Markers: No markers");

    expect(screen.getByTestId("quick-recordings-section")).toHaveTextContent(
      "Quick recordings"
    );
    expect(
      within(screen.getByTestId("quick-recordings-section")).queryByTestId(
        "take-history-summary"
      )
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("recording-row-quick-alpha")).toBeVisible();
    expect(screen.queryByTestId("best-take-control-quick-alpha")).not.toBeInTheDocument();
    expect(screen.queryByTestId("active-take-control-quick-alpha")).not.toBeInTheDocument();
    expect(screen.getByTestId("ungrouped-recordings-section")).toHaveTextContent(
      "Legacy recordings with missing sheet links"
    );
    expect(
      within(screen.getByTestId("ungrouped-recordings-section")).queryByTestId(
        "take-history-summary"
      )
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("recording-row-sheet-missing-link")).toBeVisible();
    expect(
      screen.queryByTestId("best-take-control-sheet-missing-link")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("active-take-control-sheet-missing-link")
    ).not.toBeInTheDocument();

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

  it("clears active-only take UI state after deleting the active recording", async () => {
    const user = userEvent.setup();

    recordingHistoryRepository.saveSnapshot(createMixedSnapshot());

    render(<RecordingsReviewExperience />);

    const segmentGroup = await screen.findByTestId(
      "take-group-sheet:sheet-alpha:segment:segment-bridge"
    );

    await user.click(
      within(segmentGroup).getByTestId("active-take-control-sheet-bridge-old")
    );

    await waitFor(() => {
      expect(segmentGroup).toHaveTextContent("Best: none");
      expect(segmentGroup).toHaveTextContent("Active: Bridge take 1");
    });

    await user.click(
      within(segmentGroup).getByTestId("recording-row-sheet-bridge-old")
    );
    await user.click(screen.getByRole("button", { name: "Delete Recording" }));
    await user.click(screen.getByRole("button", { name: "Confirm Delete" }));

    await waitFor(() => {
      expect(
        within(segmentGroup).queryByTestId("recording-row-sheet-bridge-old")
      ).not.toBeInTheDocument();
    });
    expect(segmentGroup).toHaveTextContent("1 take");
    expect(segmentGroup).toHaveTextContent("Best: none");
    expect(segmentGroup).toHaveTextContent("Active: none");
    expect(segmentGroup).toHaveTextContent("Markers: 1 marker");
    expect(
      within(segmentGroup).getByTestId("active-take-control-sheet-bridge-new")
    ).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByTestId("recording-details")).toHaveAttribute(
      "data-recording-id",
      "sheet-bridge-new"
    );
  });

  it("clears best and active UI state after deleting a recording marked as both", async () => {
    const user = userEvent.setup();

    recordingHistoryRepository.saveSnapshot(createMixedSnapshot());

    render(<RecordingsReviewExperience />);

    const segmentGroup = await screen.findByTestId(
      "take-group-sheet:sheet-alpha:segment:segment-bridge"
    );

    await user.click(
      within(segmentGroup).getByTestId("best-take-control-sheet-bridge-old")
    );
    await user.click(
      within(segmentGroup).getByTestId("active-take-control-sheet-bridge-old")
    );

    await waitFor(() => {
      expect(segmentGroup).toHaveTextContent("Best: Bridge take 1");
      expect(segmentGroup).toHaveTextContent("Active: Bridge take 1");
    });

    await user.click(
      within(segmentGroup).getByTestId("recording-row-sheet-bridge-old")
    );
    await user.click(screen.getByRole("button", { name: "Delete Recording" }));
    await user.click(screen.getByRole("button", { name: "Confirm Delete" }));

    await waitFor(() => {
      expect(
        within(segmentGroup).queryByTestId("recording-row-sheet-bridge-old")
      ).not.toBeInTheDocument();
    });
    expect(segmentGroup).toHaveTextContent("1 take");
    expect(segmentGroup).toHaveTextContent("Best: none");
    expect(segmentGroup).toHaveTextContent("Active: none");
    expect(
      within(segmentGroup).getByTestId("best-take-control-sheet-bridge-new")
    ).toHaveAttribute("aria-pressed", "false");
    expect(
      within(segmentGroup).getByTestId("active-take-control-sheet-bridge-new")
    ).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByTestId("recording-details")).toHaveAttribute(
      "data-recording-id",
      "sheet-bridge-new"
    );
  });

  it("marks, changes, and clears best and active takes independently", async () => {
    const user = userEvent.setup();

    recordingHistoryRepository.saveSnapshot(createMixedSnapshot());

    render(<RecordingsReviewExperience />);

    const segmentGroup = await screen.findByTestId(
      "take-group-sheet:sheet-alpha:segment:segment-bridge"
    );
    const oldBestControl = within(segmentGroup).getByTestId(
      "best-take-control-sheet-bridge-old"
    );
    const newBestControl = within(segmentGroup).getByTestId(
      "best-take-control-sheet-bridge-new"
    );
    const oldActiveControl = within(segmentGroup).getByTestId(
      "active-take-control-sheet-bridge-old"
    );
    const newActiveControl = within(segmentGroup).getByTestId(
      "active-take-control-sheet-bridge-new"
    );

    await user.click(oldBestControl);

    await waitFor(() => {
      expect(oldBestControl).toHaveAttribute("aria-pressed", "true");
    });
    expect(segmentGroup).toHaveTextContent("Best: Bridge take 1");
    expect(
      within(segmentGroup).getByTestId("take-history-summary")
    ).toHaveTextContent(/Latest: .*Bridge take 2/);
    expect(segmentGroup).toHaveTextContent("Active: none");
    expect(screen.getByTestId("recording-details")).toHaveAttribute(
      "data-recording-id",
      "sheet-bridge-new"
    );

    await user.click(newActiveControl);

    await waitFor(() => {
      expect(newActiveControl).toHaveAttribute("aria-pressed", "true");
    });
    expect(oldBestControl).toHaveAttribute("aria-pressed", "true");
    expect(segmentGroup).toHaveTextContent("Best: Bridge take 1");
    expect(segmentGroup).toHaveTextContent("Active: Bridge take 2");

    await user.click(newBestControl);

    await waitFor(() => {
      expect(newBestControl).toHaveAttribute("aria-pressed", "true");
    });
    expect(oldBestControl).toHaveAttribute("aria-pressed", "false");
    expect(newActiveControl).toHaveAttribute("aria-pressed", "true");
    expect(segmentGroup).toHaveTextContent("Best: Bridge take 2");
    expect(segmentGroup).toHaveTextContent("Active: Bridge take 2");

    await user.click(newBestControl);

    await waitFor(() => {
      expect(newBestControl).toHaveAttribute("aria-pressed", "false");
    });
    expect(newActiveControl).toHaveAttribute("aria-pressed", "true");
    expect(segmentGroup).toHaveTextContent("Best: none");
    expect(segmentGroup).toHaveTextContent("Active: Bridge take 2");

    await user.click(newActiveControl);

    await waitFor(() => {
      expect(newActiveControl).toHaveAttribute("aria-pressed", "false");
    });
    expect(oldActiveControl).toHaveAttribute("aria-pressed", "false");
    expect(segmentGroup).toHaveTextContent("Best: none");
    expect(segmentGroup).toHaveTextContent("Active: none");

    await user.click(screen.getByTestId("recording-row-sheet-bridge-old"));

    expect(screen.getByTestId("recording-details")).toHaveAttribute(
      "data-recording-id",
      "sheet-bridge-old"
    );
  });

  it("keeps persisted take selections through filters and shows stale refs as unselected", async () => {
    const user = userEvent.setup();

    recordingHistoryRepository.saveSnapshot({
      ...createMixedSnapshot(),
      takeSelections: [
        {
          groupId: "sheet:sheet-alpha:segment:segment-bridge",
          sheetId: "sheet-alpha",
          segmentId: "segment-bridge",
          bestRecordingId: "missing-best",
          activeRecordingId: "missing-active",
          updatedAt: "2026-06-22T00:00:00.000Z"
        }
      ]
    });

    render(<RecordingsReviewExperience />);

    const segmentGroup = await screen.findByTestId(
      "take-group-sheet:sheet-alpha:segment:segment-bridge"
    );

    expect(segmentGroup).toHaveTextContent("Best: none");
    expect(segmentGroup).toHaveTextContent("Active: none");
    expect(
      within(segmentGroup).getByTestId("best-take-control-sheet-bridge-old")
    ).toHaveAttribute("aria-pressed", "false");

    await user.click(
      within(segmentGroup).getByTestId("best-take-control-sheet-bridge-old")
    );
    await user.click(
      within(segmentGroup).getByTestId("active-take-control-sheet-bridge-new")
    );

    await waitFor(() => {
      expect(segmentGroup).toHaveTextContent("Best: Bridge take 1");
      expect(segmentGroup).toHaveTextContent("Active: Bridge take 2");
    });

    await user.selectOptions(screen.getByLabelText("Type filter"), "quick");

    expect(screen.getByTestId("quick-recordings-section")).toBeVisible();
    expect(
      screen.queryByTestId("take-group-sheet:sheet-alpha:segment:segment-bridge")
    ).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Type filter"), "sheet");

    const restoredSegmentGroup = await screen.findByTestId(
      "take-group-sheet:sheet-alpha:segment:segment-bridge"
    );

    expect(restoredSegmentGroup).toHaveTextContent("Best: Bridge take 1");
    expect(restoredSegmentGroup).toHaveTextContent("Active: Bridge take 2");
  });

  it("renders mixed summary fallbacks without evaluation claims", async () => {
    recordingHistoryRepository.saveSnapshot({
      sessions: [],
      recordings: [
        createSheetRecording({
          id: "mixed-old",
          name: "Mixed old",
          createdAt: "2026-06-21T09:00:00.000Z",
          segmentContext: null,
          settings: {
            bpm: 88,
            timeSignature: "3/4"
          }
        }),
        createSheetRecording({
          id: "mixed-latest",
          name: "Mixed latest",
          createdAt: "2026-06-21T12:00:00.000Z",
          segmentContext: null,
          settings: {
            bpm: 96,
            timeSignature: "4/4"
          }
        })
      ],
      errorMarkers: []
    });

    render(<RecordingsReviewExperience />);

    const group = await screen.findByTestId(
      "take-group-sheet:sheet-alpha:segment:none"
    );
    const summary = within(group).getByTestId("take-history-summary");
    const pageText = document.body.textContent?.toLowerCase() ?? "";

    expect(summary).toHaveTextContent("Mixed BPM, latest 96");
    expect(summary).toHaveTextContent("Mixed time signatures, latest 4/4");
    expect(pageText).not.toMatch(
      /score|accuracy|correct|best performance|cleanest|most accurate|recommended|improved|mistakes|timing quality/
    );
  });

  it("reports repository failures without crashing the review route", async () => {
    const user = userEvent.setup();
    const setBestSpy = vi
      .spyOn(recordingHistoryRepository, "setBestTake")
      .mockImplementation(() => {
        throw new Error("failed write");
      });

    recordingHistoryRepository.saveSnapshot(createMixedSnapshot());

    render(<RecordingsReviewExperience />);

    const segmentGroup = await screen.findByTestId(
      "take-group-sheet:sheet-alpha:segment:segment-bridge"
    );

    await user.click(
      within(segmentGroup).getByTestId("best-take-control-sheet-bridge-old")
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Best take could not be updated."
    );
    expect(screen.getByTestId("recording-details")).toHaveAttribute(
      "data-recording-id",
      "sheet-bridge-new"
    );

    setBestSpy.mockRestore();
  });

  it("reports active take repository failures without crashing the review route", async () => {
    const user = userEvent.setup();
    const setActiveSpy = vi
      .spyOn(recordingHistoryRepository, "setActiveTake")
      .mockImplementation(() => {
        throw new Error("failed active write");
      });

    recordingHistoryRepository.saveSnapshot(createMixedSnapshot());

    render(<RecordingsReviewExperience />);

    const segmentGroup = await screen.findByTestId(
      "take-group-sheet:sheet-alpha:segment:segment-bridge"
    );
    const activeControl = within(segmentGroup).getByTestId(
      "active-take-control-sheet-bridge-old"
    );

    await user.click(activeControl);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Active take could not be updated."
    );
    expect(activeControl).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByTestId("recording-details")).toHaveAttribute(
      "data-recording-id",
      "sheet-bridge-new"
    );

    setActiveSpy.mockRestore();
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
    errorMarkers: [
      {
        id: "marker-bridge-old",
        recordingId: "sheet-bridge-old",
        timestampMs: 1_000,
        note: "Old marker"
      },
      {
        id: "marker-bridge-new",
        recordingId: "sheet-bridge-new",
        timestampMs: 2_000,
        note: "New marker"
      },
      {
        id: "marker-quick",
        recordingId: "quick-alpha",
        timestampMs: 1_000,
        note: "Quick marker"
      }
    ]
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
  overrides: Partial<Omit<ReviewRecording, "segmentContext" | "settings">> & {
    segmentContext?: SheetRecordingSegmentContext | null;
    settings?: Partial<ReviewRecording["settings"]>;
  } = {}
): ReviewRecording {
  const { settings, ...recordingOverrides } = overrides;

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
      timeSignature: "4/4",
      ...settings
    },
    ...recordingOverrides
  };
}
