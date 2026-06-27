import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import type { SheetRecordingSegmentContext } from "@/domain/practice";
import { RecordingsReviewExperience } from "@/components/recordings-review/recordings-review-experience";
import { recordingHistoryRepository } from "@/lib/recordings-review/repository";
import type {
  RecordingArtifactDetails,
  RecordingReviewSnapshot,
  ReviewRecording
} from "@/lib/recordings-review/types";
import type {
  WaveformComparisonSourceState,
  WaveformComparisonSourcesResult
} from "@/lib/recordings-review/waveform-comparison-sources";

const loadWaveformComparisonSourcesForGroupMock = vi.hoisted(() => vi.fn());

vi.mock("@/components/recordings-review/recording-artifact-review", () => ({
  RecordingArtifactReview: ({ actions }: { actions?: ReactNode }) => (
    <div data-testid="mock-recording-artifact-review">{actions}</div>
  )
}));

vi.mock("@/lib/recordings-review/waveform-comparison-sources", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/recordings-review/waveform-comparison-sources")>();

  return {
    ...actual,
    loadWaveformComparisonSourcesForGroup:
      loadWaveformComparisonSourcesForGroupMock
  };
});

afterEach(() => {
  cleanup();
  loadWaveformComparisonSourcesForGroupMock.mockReset();
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
    expect(
      within(segmentGroup).getByRole("link", {
        name: "Return to practice for Bridge on Alpha Etude"
      })
    ).toHaveAttribute(
      "href",
      "/sheet-practice?recordingId=sheet-bridge-new&sheetId=sheet-alpha&segmentId=segment-bridge"
    );
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
    expect(
      within(noSegmentGroup).getByRole("link", {
        name: "Return to sheet practice for Alpha Etude"
      })
    ).toHaveAttribute(
      "href",
      "/sheet-practice?recordingId=sheet-whole-null&sheetId=sheet-alpha"
    );

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
    expect(
      screen.getByRole("link", {
        name: "Practice again for Bridge on Alpha Etude"
      })
    ).toHaveAttribute(
      "href",
      "/sheet-practice?recordingId=sheet-bridge-new&sheetId=sheet-alpha&segmentId=segment-bridge"
    );

    await user.click(screen.getByTestId("recording-row-sheet-whole-null"));

    expect(screen.getByTestId("recording-details")).toHaveAttribute(
      "data-recording-id",
      "sheet-whole-null"
    );
    expect(
      screen.getByRole("link", {
        name: "Practice again for whole-sheet practice on Alpha Etude"
      })
    ).toHaveAttribute(
      "href",
      "/sheet-practice?recordingId=sheet-whole-null&sheetId=sheet-alpha"
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
    expect(
      screen.getByRole("link", {
        name: "Practice again in Quick Metronome for Quick alpha"
      })
    ).toHaveAttribute("href", "/quick-metronome?recordingId=quick-alpha");

    await user.click(screen.getByTestId("recording-row-sheet-missing-link"));

    expect(screen.getByTestId("recording-details")).toHaveAttribute(
      "data-recording-id",
      "sheet-missing-link"
    );
    expect(
      screen.getByRole("link", {
        name:
          "Practice again for sheet recording Missing sheet link without a linked sheet"
      })
    ).toHaveAttribute("href", "/sheet-practice?recordingId=sheet-missing-link");
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

  it("renders explicit waveform comparison controls only for grouped sheet takes", async () => {
    recordingHistoryRepository.saveSnapshot(createMixedSnapshot());

    render(<RecordingsReviewExperience />);

    const segmentGroup = await screen.findByTestId(
      "take-group-sheet:sheet-alpha:segment:segment-bridge"
    );

    expect(
      within(segmentGroup).getByTestId("waveform-comparison-sheet:sheet-alpha:segment:segment-bridge")
    ).toHaveTextContent("Select takes to compare");
    expect(
      within(segmentGroup).getByTestId("compare-take-control-sheet-bridge-new")
    ).toHaveAccessibleName("Select Bridge take 2 for waveform comparison");
    expect(
      screen.queryByTestId("compare-take-control-quick-alpha")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("compare-take-control-sheet-missing-link")
    ).not.toBeInTheDocument();
    expect(loadWaveformComparisonSourcesForGroupMock).not.toHaveBeenCalled();
  });

  it("loads selected waveform comparison sources through the P2-07 group boundary", async () => {
    const user = userEvent.setup();
    const snapshot = createMixedSnapshot();

    recordingHistoryRepository.saveSnapshot(snapshot);
    loadWaveformComparisonSourcesForGroupMock.mockImplementation(
      async ({
        recordingIds
      }: {
        recordingIds: string[];
      }) =>
        createComparisonResult(
          recordingIds.map((recordingId) => {
            const recording =
              snapshot.recordings.find(
                (item) => item.id === recordingId
              ) ?? createSheetRecording({ id: recordingId });

            return createReadyComparisonSource(
              recording,
              recordingId === "sheet-bridge-new"
                ? {
                    durationWarning:
                      "Decoded duration differs from saved metadata."
                  }
                : {}
            );
          })
        )
    );

    render(<RecordingsReviewExperience />);

    const segmentGroup = await screen.findByTestId(
      "take-group-sheet:sheet-alpha:segment:segment-bridge"
    );

    await user.click(
      within(segmentGroup).getByTestId("compare-take-control-sheet-bridge-old")
    );

    await waitFor(() => {
      expect(loadWaveformComparisonSourcesForGroupMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          group: expect.objectContaining({
            groupId: "sheet:sheet-alpha:segment:segment-bridge"
          }),
          recordingIds: ["sheet-bridge-old"]
        })
      );
    });
    expect(segmentGroup).toHaveTextContent("Select another take to compare");

    await user.click(
      within(segmentGroup).getByTestId("compare-take-control-sheet-bridge-new")
    );

    await waitFor(() => {
      expect(
        within(segmentGroup).getByTestId(
          "waveform-comparison-row-sheet-bridge-old"
        )
      ).toHaveAttribute("data-waveform-state", "ready");
      expect(
        within(segmentGroup).getByTestId(
          "waveform-comparison-row-sheet-bridge-new"
        )
      ).toHaveAttribute("data-waveform-state", "ready");
    });
    expect(
      within(segmentGroup).getByTestId("comparison-waveform-sheet-bridge-old")
    ).toHaveAttribute("data-waveform-source", "decoded-audio");
    expect(
      within(segmentGroup).getByTestId("comparison-waveform-sheet-bridge-new")
    ).toHaveAttribute("data-peak-count", "4");
    expect(
      within(segmentGroup).getByTestId(
        "waveform-comparison-duration-warning-sheet-bridge-new"
      )
    ).toHaveTextContent("Decoded duration differs from saved metadata.");
    expect(segmentGroup).toHaveTextContent("Decoded audio");
    expect(segmentGroup).toHaveTextContent("Duration 0:12");
    expect(document.body.textContent?.toLowerCase() ?? "").not.toMatch(
      /score|accuracy|correct|recommended|improved|cleanest|most accurate|mistakes|timing quality/
    );
  });

  it("shows fresh loading on same-key waveform retry instead of the prior result", async () => {
    const user = userEvent.setup();
    const snapshot = createMixedSnapshot();
    const pendingRetry = createDeferred<WaveformComparisonSourcesResult>();
    let twoTakeRequestCount = 0;

    recordingHistoryRepository.saveSnapshot(snapshot);
    loadWaveformComparisonSourcesForGroupMock.mockImplementation(
      async ({
        recordingIds
      }: {
        recordingIds: string[];
      }) => {
        const sources = recordingIds.map((recordingId) =>
          createReadyComparisonSource(
            snapshot.recordings.find((recording) => recording.id === recordingId) ??
              createSheetRecording({ id: recordingId })
          )
        );

        if (recordingIds.length === 2) {
          twoTakeRequestCount += 1;

          if (twoTakeRequestCount === 2) {
            return pendingRetry.promise;
          }
        }

        return createComparisonResult(sources);
      }
    );

    render(<RecordingsReviewExperience />);

    const segmentGroup = await screen.findByTestId(
      "take-group-sheet:sheet-alpha:segment:segment-bridge"
    );
    const oldCompareControl = within(segmentGroup).getByTestId(
      "compare-take-control-sheet-bridge-old"
    );
    const newCompareControl = within(segmentGroup).getByTestId(
      "compare-take-control-sheet-bridge-new"
    );

    await user.click(oldCompareControl);
    await user.click(newCompareControl);

    await waitFor(() => {
      expect(
        within(segmentGroup).getByTestId(
          "waveform-comparison-row-sheet-bridge-old"
        )
      ).toBeVisible();
      expect(
        within(segmentGroup).getByTestId(
          "waveform-comparison-row-sheet-bridge-new"
        )
      ).toBeVisible();
    });

    await user.click(newCompareControl);
    await user.click(newCompareControl);

    expect(
      within(segmentGroup).getByTestId("waveform-comparison-loading")
    ).toHaveTextContent("Loading waveform comparison sources.");
    expect(
      within(segmentGroup).queryByTestId("waveform-comparison-results")
    ).not.toBeInTheDocument();
    expect(
      within(segmentGroup).queryByTestId(
        "waveform-comparison-row-sheet-bridge-new"
      )
    ).not.toBeInTheDocument();

    pendingRetry.resolve(
      createComparisonResult([
        createReadyComparisonSource(snapshot.recordings[0]),
        createReadyComparisonSource(snapshot.recordings[1], {
          peaks: [0.3, 0.9]
        })
      ])
    );

    await waitFor(() => {
      expect(
        within(segmentGroup).getByTestId(
          "waveform-comparison-row-sheet-bridge-new"
        )
      ).toHaveAttribute("data-waveform-state", "ready");
    });
    expect(
      within(segmentGroup).getByTestId("comparison-waveform-sheet-bridge-new")
    ).toHaveAttribute("data-peak-count", "2");
  });

  it("clears a prior same-key waveform success before retry failure", async () => {
    const user = userEvent.setup();
    const snapshot = createMixedSnapshot();
    const pendingRetry = createDeferred<WaveformComparisonSourcesResult>();
    let twoTakeRequestCount = 0;

    recordingHistoryRepository.saveSnapshot(snapshot);
    loadWaveformComparisonSourcesForGroupMock.mockImplementation(
      async ({
        recordingIds
      }: {
        recordingIds: string[];
      }) => {
        const sources = recordingIds.map((recordingId) =>
          createReadyComparisonSource(
            snapshot.recordings.find((recording) => recording.id === recordingId) ??
              createSheetRecording({ id: recordingId })
          )
        );

        if (recordingIds.length === 2) {
          twoTakeRequestCount += 1;

          if (twoTakeRequestCount === 2) {
            return pendingRetry.promise;
          }
        }

        return createComparisonResult(sources);
      }
    );

    render(<RecordingsReviewExperience />);

    const segmentGroup = await screen.findByTestId(
      "take-group-sheet:sheet-alpha:segment:segment-bridge"
    );
    const oldCompareControl = within(segmentGroup).getByTestId(
      "compare-take-control-sheet-bridge-old"
    );
    const newCompareControl = within(segmentGroup).getByTestId(
      "compare-take-control-sheet-bridge-new"
    );

    await user.click(oldCompareControl);
    await user.click(newCompareControl);

    await waitFor(() => {
      expect(
        within(segmentGroup).getByTestId(
          "waveform-comparison-row-sheet-bridge-old"
        )
      ).toBeVisible();
      expect(
        within(segmentGroup).getByTestId(
          "waveform-comparison-row-sheet-bridge-new"
        )
      ).toBeVisible();
    });

    await user.click(newCompareControl);
    await user.click(newCompareControl);

    expect(
      within(segmentGroup).getByTestId("waveform-comparison-loading")
    ).toHaveTextContent("Loading waveform comparison sources.");
    expect(
      within(segmentGroup).queryByTestId("waveform-comparison-results")
    ).not.toBeInTheDocument();
    expect(
      within(segmentGroup).queryByTestId(
        "waveform-comparison-row-sheet-bridge-new"
      )
    ).not.toBeInTheDocument();

    pendingRetry.reject(new Error("source lookup failed"));

    await waitFor(() => {
      expect(
        within(segmentGroup).getByTestId("waveform-comparison-error")
      ).toHaveTextContent("Waveform comparison sources could not be loaded.");
    });
    expect(
      within(segmentGroup).queryByTestId("waveform-comparison-results")
    ).not.toBeInTheDocument();
    expect(
      within(segmentGroup).queryByTestId(
        "waveform-comparison-row-sheet-bridge-old"
      )
    ).not.toBeInTheDocument();
  });

  it("clears a prior same-key waveform error before retry success", async () => {
    const user = userEvent.setup();
    const snapshot = createMixedSnapshot();
    const pendingRetry = createDeferred<WaveformComparisonSourcesResult>();

    recordingHistoryRepository.saveSnapshot(snapshot);
    loadWaveformComparisonSourcesForGroupMock
      .mockRejectedValueOnce(new Error("source lookup failed"))
      .mockImplementationOnce(() => pendingRetry.promise);

    render(<RecordingsReviewExperience />);

    const segmentGroup = await screen.findByTestId(
      "take-group-sheet:sheet-alpha:segment:segment-bridge"
    );
    const oldCompareControl = within(segmentGroup).getByTestId(
      "compare-take-control-sheet-bridge-old"
    );

    await user.click(oldCompareControl);

    await waitFor(() => {
      expect(
        within(segmentGroup).getByTestId("waveform-comparison-error")
      ).toHaveTextContent("Waveform comparison sources could not be loaded.");
    });

    await user.click(oldCompareControl);
    await user.click(oldCompareControl);

    expect(
      within(segmentGroup).getByTestId("waveform-comparison-loading")
    ).toBeVisible();
    expect(
      within(segmentGroup).queryByTestId("waveform-comparison-error")
    ).not.toBeInTheDocument();

    pendingRetry.resolve(
      createComparisonResult([
        createReadyComparisonSource(snapshot.recordings[0])
      ])
    );

    await waitFor(() => {
      expect(
        within(segmentGroup).getByTestId(
          "waveform-comparison-row-sheet-bridge-old"
        )
      ).toHaveAttribute("data-waveform-state", "ready");
    });
    expect(
      within(segmentGroup).queryByTestId("waveform-comparison-error")
    ).not.toBeInTheDocument();
  });

  it("renders unavailable comparison states without fake waveform bars", async () => {
    const user = userEvent.setup();
    const snapshot = createMixedSnapshot();

    recordingHistoryRepository.saveSnapshot(snapshot);
    loadWaveformComparisonSourcesForGroupMock.mockResolvedValue(
      createComparisonResult([
        createReadyComparisonSource(snapshot.recordings[0]),
        createUnavailableComparisonSource({
          recording: snapshot.recordings[1],
          reason: "missing-artifact",
          message: "This recording has no accessible local audio artifact."
        }),
        createUnavailableComparisonSource({
          recordingId: "deleted-take",
          recording: null,
          reason: "missing-recording",
          message: "This recording is no longer available in local review history."
        }),
        createUnavailableComparisonSource({
          recording: snapshot.recordings[1],
          reason: "unsupported-mime",
          message: "This recording artifact is not a supported audio type."
        }),
        createUnavailableComparisonSource({
          recording: snapshot.recordings[1],
          reason: "invalid-peaks",
          message: "This recording has invalid waveform peak data."
        }),
        createUnavailableComparisonSource({
          recording: snapshot.recordings[1],
          reason: "stale-group-membership",
          message: "This recording is no longer part of the selected take group."
        }),
        createUnavailableComparisonSource({
          recording: snapshot.recordings[1],
          reason: "decode-failed",
          message: "This recording artifact could not be decoded locally."
        }),
        createUnavailableComparisonSource({
          recording: snapshot.recordings[1],
          reason: "empty-audio",
          message: "This recording artifact decoded as empty audio."
        }),
        createUnavailableComparisonSource({
          recording: snapshot.recordings[1],
          reason: "invalid-duration",
          message: "This recording has invalid duration metadata."
        })
      ])
    );

    render(<RecordingsReviewExperience />);

    const segmentGroup = await screen.findByTestId(
      "take-group-sheet:sheet-alpha:segment:segment-bridge"
    );

    await user.click(
      within(segmentGroup).getByTestId("compare-take-control-sheet-bridge-old")
    );

    await waitFor(() => {
      expect(segmentGroup).toHaveTextContent(
        "This recording has no accessible local audio artifact."
      );
      expect(segmentGroup).toHaveTextContent(
        "This recording is no longer available in local review history."
      );
      expect(segmentGroup).toHaveTextContent(
        "This recording artifact is not a supported audio type."
      );
      expect(segmentGroup).toHaveTextContent(
        "This recording has invalid waveform peak data."
      );
      expect(segmentGroup).toHaveTextContent(
        "This recording is no longer part of the selected take group."
      );
      expect(segmentGroup).toHaveTextContent(
        "This recording artifact could not be decoded locally."
      );
      expect(segmentGroup).toHaveTextContent(
        "This recording artifact decoded as empty audio."
      );
      expect(segmentGroup).toHaveTextContent(
        "This recording has invalid duration metadata."
      );
    });
    expect(
      within(segmentGroup).getAllByTestId(/^comparison-waveform-/)
    ).toHaveLength(1);
    expect(
      within(segmentGroup).getByTestId("waveform-comparison-row-deleted-take")
    ).toHaveAttribute("data-unavailable-reason", "missing-recording");
  });

  it("keeps manual comparison selection separate from best and active take controls", async () => {
    const user = userEvent.setup();
    const snapshot = createMixedSnapshot();

    recordingHistoryRepository.saveSnapshot(snapshot);
    loadWaveformComparisonSourcesForGroupMock.mockImplementation(
      async ({
        recordingIds
      }: {
        recordingIds: string[];
      }) =>
        createComparisonResult(
          recordingIds.map((recordingId) =>
            createReadyComparisonSource(
              snapshot.recordings.find((recording) => recording.id === recordingId) ??
                createSheetRecording({ id: recordingId })
            )
          )
        )
    );

    render(<RecordingsReviewExperience />);

    const segmentGroup = await screen.findByTestId(
      "take-group-sheet:sheet-alpha:segment:segment-bridge"
    );
    const oldCompareControl = within(segmentGroup).getByTestId(
      "compare-take-control-sheet-bridge-old"
    );
    const newCompareControl = within(segmentGroup).getByTestId(
      "compare-take-control-sheet-bridge-new"
    );

    await user.click(oldCompareControl);
    await user.click(newCompareControl);

    await waitFor(() => {
      expect(oldCompareControl).toBeChecked();
      expect(newCompareControl).toBeChecked();
    });

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
    expect(oldCompareControl).toBeChecked();
    expect(newCompareControl).toBeChecked();
    expect(
      within(segmentGroup).getByTestId("waveform-comparison-results")
    ).toHaveTextContent("Bridge take 1");
  });

  it("prunes selected comparison takes after delete and resets transient selection on reload", async () => {
    const user = userEvent.setup();
    const snapshot = createMixedSnapshot();

    recordingHistoryRepository.saveSnapshot(snapshot);
    loadWaveformComparisonSourcesForGroupMock.mockImplementation(
      async ({
        recordingIds
      }: {
        recordingIds: string[];
      }) =>
        createComparisonResult(
          recordingIds.map((recordingId) =>
            createReadyComparisonSource(
              snapshot.recordings.find((recording) => recording.id === recordingId) ??
                createSheetRecording({ id: recordingId })
            )
          )
        )
    );

    const { unmount } = render(<RecordingsReviewExperience />);

    const segmentGroup = await screen.findByTestId(
      "take-group-sheet:sheet-alpha:segment:segment-bridge"
    );

    await user.click(
      within(segmentGroup).getByTestId("compare-take-control-sheet-bridge-old")
    );
    await user.click(
      within(segmentGroup).getByTestId("compare-take-control-sheet-bridge-new")
    );

    await waitFor(() => {
      expect(
        within(segmentGroup).getByTestId(
          "waveform-comparison-row-sheet-bridge-old"
        )
      ).toBeVisible();
      expect(
        within(segmentGroup).getByTestId(
          "waveform-comparison-row-sheet-bridge-new"
        )
      ).toBeVisible();
    });

    await user.click(
      within(segmentGroup).getByTestId("recording-row-sheet-bridge-old")
    );
    await user.click(screen.getByRole("button", { name: "Delete Recording" }));
    await user.click(screen.getByRole("button", { name: "Confirm Delete" }));

    await waitFor(() => {
      expect(
        within(segmentGroup).queryByTestId(
          "waveform-comparison-row-sheet-bridge-old"
        )
      ).not.toBeInTheDocument();
      expect(
        within(segmentGroup).getByTestId(
          "waveform-comparison-row-sheet-bridge-new"
        )
      ).toBeVisible();
    });

    unmount();
    render(<RecordingsReviewExperience />);

    const restoredSegmentGroup = await screen.findByTestId(
      "take-group-sheet:sheet-alpha:segment:segment-bridge"
    );

    expect(
      within(restoredSegmentGroup).getByTestId(
        "waveform-comparison-sheet:sheet-alpha:segment:segment-bridge"
      )
    ).toHaveTextContent("Select takes to compare");
    expect(
      within(restoredSegmentGroup).queryByTestId("waveform-comparison-results")
    ).not.toBeInTheDocument();
  });

  it("reports waveform comparison service failures without blocking the group", async () => {
    const user = userEvent.setup();

    recordingHistoryRepository.saveSnapshot(createMixedSnapshot());
    loadWaveformComparisonSourcesForGroupMock.mockRejectedValue(
      new Error("source lookup failed")
    );

    render(<RecordingsReviewExperience />);

    const segmentGroup = await screen.findByTestId(
      "take-group-sheet:sheet-alpha:segment:segment-bridge"
    );

    await user.click(
      within(segmentGroup).getByTestId("compare-take-control-sheet-bridge-old")
    );

    await waitFor(() => {
      expect(
        within(segmentGroup).getByTestId("waveform-comparison-error")
      ).toHaveTextContent(
        "Waveform comparison sources could not be loaded."
      );
    });
    expect(
      within(segmentGroup).getByTestId("recording-row-sheet-bridge-new")
    ).toBeVisible();
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

function createComparisonResult(
  sources: WaveformComparisonSourceState[]
): WaveformComparisonSourcesResult {
  const readySources = sources.filter(
    (
      source
    ): source is Extract<WaveformComparisonSourceState, { status: "ready" }> =>
      source.status === "ready"
  );
  const unavailableSources = sources.filter(
    (
      source
    ): source is Extract<
      WaveformComparisonSourceState,
      { status: "unavailable" }
    > => source.status === "unavailable"
  );

  return {
    sources,
    readySources,
    unavailableSources,
    allReady: sources.length > 0 && unavailableSources.length === 0,
    readyCount: readySources.length,
    requestedCount: sources.length,
    groupId: "sheet:sheet-alpha:segment:segment-bridge",
    sheetId: "sheet-alpha",
    segmentId: "segment-bridge"
  };
}

function createReadyComparisonSource(
  recording: ReviewRecording,
  overrides: Partial<Extract<WaveformComparisonSourceState, { status: "ready" }>> = {}
): Extract<WaveformComparisonSourceState, { status: "ready" }> {
  const artifactDetails: RecordingArtifactDetails = {
    recordingId: recording.id,
    decodedDurationMs: recording.durationMs,
    metadataDurationMs: recording.durationMs,
    durationDifferenceMs: 0,
    durationWarning: null,
    peaks: [0.2, 0.6, 1, 0.4],
    source: "decoded-audio"
  };

  return {
    status: "ready",
    recordingId: recording.id,
    recording,
    artifactDetails,
    source: artifactDetails.source,
    peaks: artifactDetails.peaks,
    durationMs: artifactDetails.decodedDurationMs,
    durationWarning: null,
    ...overrides
  };
}

function createUnavailableComparisonSource({
  recordingId,
  recording,
  reason,
  message
}: {
  recordingId?: string;
  recording: ReviewRecording | null;
  reason: Extract<
    WaveformComparisonSourceState,
    { status: "unavailable" }
  >["reason"];
  message: string;
}): Extract<WaveformComparisonSourceState, { status: "unavailable" }> {
  return {
    status: "unavailable",
    recordingId: recordingId ?? recording?.id ?? "missing-recording",
    recording,
    reason,
    message
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}
