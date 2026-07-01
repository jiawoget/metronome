import { render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HomeDashboard, type HomeDashboardData } from "@/components/home/home-dashboard";
import type { HomeRecentActivityItem, HomeRecentActivityResult } from "@/domain/practice";

const serviceMocks = vi.hoisted(() => ({
  getRecentSession: vi.fn(),
  getContinuePracticeTarget: vi.fn(),
  getTodaySummary: vi.fn(),
  getHomeRecentActivity: vi.fn(),
  subscribe: vi.fn()
}));

vi.mock("@/infrastructure/db/browser-practice-session-service", () => ({
  browserPracticeSessionService: serviceMocks
}));

function createActivityItem(overrides: Partial<HomeRecentActivityItem> = {}): HomeRecentActivityItem {
  return {
    id: "session:quick-session",
    kind: "quick-session",
    occurredAt: "2026-06-21T12:00:00.000Z",
    sortTimestamp: "2026-06-21T12:00:00.000Z",
    label: "Quick Practice",
    metadata: ["1m", "96 BPM", "4/4"],
    targetState: "quick",
    sessionId: "quick-session",
    recordingId: null,
    sheetId: null,
    sheetName: null,
    segmentId: null,
    segmentName: null,
    durationMs: 60_000,
    bpm: 96,
    timeSignature: "4/4",
    disabledReason: null,
    ...overrides
  };
}

function createActivityResult(items: HomeRecentActivityItem[] = []): HomeRecentActivityResult {
  return {
    items,
    generatedAt: "2026-06-21T12:10:00.000Z",
    limit: 8
  };
}

function createDashboardData(overrides: Partial<HomeDashboardData> = {}): HomeDashboardData {
  return {
    summary: {
      durationMs: 0,
      minutesToday: 0,
      sessionsToday: 0,
      recordingsToday: 0
    },
    recentSession: null,
    continueTarget: null,
    recentActivity: createActivityResult(),
    recentActivityStatus: "loaded",
    recentActivityErrorMessage: null,
    recentSheets: [],
    recentRecordings: [],
    ...overrides
  };
}

describe("HomeDashboard", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.stubGlobal("indexedDB", undefined);
    serviceMocks.getRecentSession.mockReset();
    serviceMocks.getContinuePracticeTarget.mockReset();
    serviceMocks.getTodaySummary.mockReset();
    serviceMocks.getHomeRecentActivity.mockReset();
    serviceMocks.subscribe.mockReset();
    serviceMocks.getRecentSession.mockResolvedValue(null);
    serviceMocks.getContinuePracticeTarget.mockResolvedValue(null);
    serviceMocks.getTodaySummary.mockResolvedValue({
      durationMs: 0,
      minutesToday: 0,
      sessionsToday: 0,
      recordingsToday: 0
    });
    serviceMocks.getHomeRecentActivity.mockResolvedValue(createActivityResult());
    serviceMocks.subscribe.mockReturnValue(() => undefined);
  });

  it("renders zero summary values and empty states without fake practice data", () => {
    render(<HomeDashboard />);

    expect(screen.getByRole("heading", { name: "Home" })).toBeVisible();
    expect(screen.getByText("Today Practice Summary")).toBeVisible();
    expect(screen.getByText("Minutes")).toBeVisible();
    expect(screen.getByText("Sessions")).toBeVisible();
    expect(screen.getByText("Recordings")).toBeVisible();
    expect(screen.getAllByText("0")).toHaveLength(3);
    expect(screen.getByText(/No recent practice session yet/i)).toBeVisible();
    expect(screen.getByText(/No sheets imported yet/i)).toBeVisible();
    expect(screen.getByText(/Opens the Sheet Library import flow/i)).toBeVisible();
    expect(screen.getByText(/Quick takes appear after recording/i)).toBeVisible();
    expect(screen.getByRole("region", { name: "Recent Activity" })).toBeVisible();
    expect(screen.getByText("No local practice activity yet.")).toBeVisible();
    expect(screen.getByText(/No recording or playback active/i)).toBeVisible();
  });

  it("links primary and utility entries to route shells", () => {
    render(<HomeDashboard />);

    expect(screen.getByRole("link", { name: "Open Quick Metronome" })).toHaveAttribute(
      "href",
      "/quick-metronome"
    );
    expect(screen.getByRole("link", { name: "Open Sheet Library" })).toHaveAttribute("href", "/sheet-library");
    expect(screen.getByRole("link", { name: "Import Sheet" })).toHaveAttribute("href", "/sheet-library");
    expect(screen.getByRole("link", { name: "Open Recordings" })).toHaveAttribute("href", "/recordings");
    expect(screen.getByRole("link", { name: "Open Settings" })).toHaveAttribute("href", "/settings");
  });

  it("renders compact recent activity rows for quick, sheet, recording, and segment activity", () => {
    const longLabel = "Very Long Segment Name That Wraps Across The Recent Activity Row Without Title Disclosure";
    const longMetadata = "Very long metadata note that remains readable inline without a title attribute";
    const data = createDashboardData({
      recentActivity: createActivityResult([
        createActivityItem({
          id: "session:quick-session",
          kind: "quick-session",
          label: "Quick Practice",
          targetState: "quick",
          disabledReason: null
        }),
        createActivityItem({
          id: "session:sheet-session",
          kind: "sheet-session",
          label: "Alpha Sheet",
          targetState: "valid",
          sheetId: "sheet-alpha",
          sheetName: "Alpha Sheet",
          metadata: ["2m", "88 BPM"]
        }),
        createActivityItem({
          id: "recording:sheet-recording",
          kind: "sheet-recording",
          label: "Alpha Sheet",
          targetState: "valid",
          recordingId: "sheet-recording",
          sheetId: "sheet-alpha",
          sheetName: "Alpha Sheet",
          metadata: ["45s", "4/4"]
        }),
        createActivityItem({
          id: "session:segment-session",
          kind: "segment-session",
          label: longLabel,
          targetState: "valid",
          sheetId: "sheet-alpha",
          sheetName: "Alpha Sheet",
          segmentId: "segment-alpha",
          segmentName: longLabel,
          metadata: ["1m 30s", "m5-12", longMetadata]
        }),
        createActivityItem({
          id: "recording:segment-recording",
          kind: "segment-recording",
          label: "Bridge take",
          targetState: "valid",
          recordingId: "segment-recording",
          sheetId: "sheet-alpha",
          sheetName: "Alpha Sheet",
          segmentId: "segment-alpha",
          segmentName: "Bridge take",
          metadata: []
        })
      ])
    });

    render(<HomeDashboard data={data} />);

    const panel = screen.getByRole("region", { name: "Recent Activity" });

    expect(within(panel).getByText("Quick Practice")).toBeVisible();
    expect(within(panel).getByText("Quick practice · 2026-06-21 12:00 UTC")).toBeVisible();
    expect(within(panel).getAllByText("Alpha Sheet")).toHaveLength(2);
    expect(within(panel).getByText("Sheet recording · 2026-06-21 12:00 UTC")).toBeVisible();
    expect(within(panel).getByText("Bridge take")).toBeVisible();
    expect(within(panel).getByText(longLabel)).toBeVisible();
    expect(within(panel).getByText(longMetadata)).toBeVisible();
    expect(within(panel).getAllByText("Status: Ready")).toHaveLength(4);
    expect(within(panel).getByText("Status: Quick practice")).toBeVisible();

    const longRow = within(panel).getByText(longLabel).closest("[data-testid='recent-activity-row']");

    expect(longRow).not.toBeNull();
    expect(longRow).not.toHaveAttribute("title");
  });

  it("keeps stale recent activity states visible, accessible, and non-interactive", () => {
    const data = createDashboardData({
      recentActivity: createActivityResult([
        createActivityItem({
          id: "session:no-target",
          kind: "sheet-session",
          label: "Sheet practice",
          targetState: "no-target",
          disabledReason: "No target is available for this local activity."
        }),
        createActivityItem({
          id: "session:lookup-failed",
          kind: "sheet-session",
          label: "Lookup Sheet",
          targetState: "lookup-failed",
          disabledReason: "Target lookup failed."
        }),
        createActivityItem({
          id: "session:missing-sheet",
          kind: "sheet-session",
          label: "Deleted sheet",
          targetState: "missing-sheet",
          disabledReason: "Sheet no longer exists."
        }),
        createActivityItem({
          id: "session:missing-segment",
          kind: "segment-session",
          label: "Deleted Segment",
          targetState: "missing-segment",
          disabledReason: "Segment no longer exists."
        }),
        createActivityItem({
          id: "session:invalid-time",
          kind: "sheet-session",
          label: "Unknown Clock Sheet",
          sortTimestamp: null,
          targetState: "valid",
          disabledReason: null
        })
      ])
    });

    render(<HomeDashboard data={data} />);

    const panel = screen.getByRole("region", { name: "Recent Activity" });
    const rows = within(panel).getAllByTestId("recent-activity-row");

    expect(within(panel).getByText("Status: No target")).toBeVisible();
    expect(within(panel).getByText("Status: Lookup failed")).toBeVisible();
    expect(within(panel).getByText("Status: Missing sheet")).toBeVisible();
    expect(within(panel).getByText("Status: Missing segment")).toBeVisible();
    expect(within(panel).getByText("Stale: No target is available for this local activity.")).toBeVisible();
    expect(within(panel).getByText("Stale: Target lookup failed.")).toBeVisible();
    expect(within(panel).getByText("Stale: Sheet no longer exists.")).toBeVisible();
    expect(within(panel).getByText("Stale: Segment no longer exists.")).toBeVisible();
    expect(within(panel).getByText("Sheet practice · Unknown time")).toBeVisible();
    expect(within(panel).queryByText("Invalid Date")).not.toBeInTheDocument();

    for (const row of rows) {
      expect(within(row).queryByRole("link")).not.toBeInTheDocument();
      expect(within(row).queryByRole("button")).not.toBeInTheDocument();
      expect(row).not.toHaveAttribute("tabindex");
    }
  });

  it("shows contained loading and error states for recent activity", () => {
    const { rerender } = render(
      <HomeDashboard
        data={createDashboardData({
          recentActivityStatus: "loading",
          recentActivity: createActivityResult()
        })}
      />
    );

    expect(screen.getByText("Loading recent activity.")).toBeVisible();
    expect(screen.getByText("Today Practice Summary")).toBeVisible();

    rerender(
      <HomeDashboard
        data={createDashboardData({
          recentActivityStatus: "error",
          recentActivityErrorMessage: "Recent activity could not be loaded."
        })}
      />
    );

    expect(screen.getByText("Recent activity could not be loaded.")).toBeVisible();
    expect(screen.getByText("Today Practice Summary")).toBeVisible();
    expect(screen.getByRole("link", { name: "Open Quick Metronome" })).toHaveAttribute(
      "href",
      "/quick-metronome"
    );
  });

  it("loads recent activity through the browser practice-session service and contains read failures", async () => {
    vi.stubGlobal("indexedDB", {});
    serviceMocks.getTodaySummary.mockResolvedValue({
      durationMs: 120_000,
      minutesToday: 2,
      sessionsToday: 1,
      recordingsToday: 0
    });
    serviceMocks.getHomeRecentActivity.mockResolvedValue(
      createActivityResult([
        createActivityItem({
          id: "session:service-activity",
          label: "Service Activity",
          targetState: "quick"
        })
      ])
    );

    const { unmount } = render(<HomeDashboard />);

    await waitFor(() => expect(serviceMocks.getHomeRecentActivity).toHaveBeenCalled());
    expect(await screen.findByText("Service Activity")).toBeVisible();
    expect(screen.getByTestId("today-summary-sessions")).toHaveTextContent("1");
    unmount();

    serviceMocks.getHomeRecentActivity.mockRejectedValue(new Error("IndexedDB unavailable"));
    render(<HomeDashboard />);

    expect(await screen.findByText("Recent activity could not be loaded.")).toBeVisible();
    expect(screen.getByTestId("today-summary-sessions")).toHaveTextContent("1");
  });
});
