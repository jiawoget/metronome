import { render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HomeDashboard, type HomeDashboardData } from "@/components/home/home-dashboard";
import type {
  ContinuePracticeTargetIdentity,
  ContinuePracticeTargetsResult,
  HomeDashboardAnalyticsSource,
  HomeRecentActivityItem,
  HomeRecentActivityResult
} from "@/domain/practice";

const serviceMocks = vi.hoisted(() => ({
  getRecentSession: vi.fn(),
  getContinuePracticeTarget: vi.fn(),
  getContinuePracticeTargets: vi.fn(),
  getTodaySummary: vi.fn(),
  getHomeRecentActivity: vi.fn(),
  getHomeDashboardAnalyticsSource: vi.fn(),
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

type AnalyticsSourceOverrides = Omit<
  Partial<HomeDashboardAnalyticsSource>,
  "summary" | "totals" | "emptyState"
> & {
  summary?: Partial<HomeDashboardAnalyticsSource["summary"]>;
  totals?: Partial<HomeDashboardAnalyticsSource["totals"]>;
  emptyState?: Partial<HomeDashboardAnalyticsSource["emptyState"]>;
};

function createAnalyticsSource(overrides: AnalyticsSourceOverrides = {}): HomeDashboardAnalyticsSource {
  const base: HomeDashboardAnalyticsSource = {
    generatedAt: "2026-06-21T12:10:00.000Z",
    summary: {
      durationMs: 0,
      minutesToday: 0,
      sessionsToday: 0,
      recordingsToday: 0
    },
    totals: {
      durationMs: 0,
      sessions: 0,
      sheetTakes: 0,
      practicedSheets: 0,
      segmentSessions: 0
    },
    emptyState: {
      hasPracticeHistory: false,
      hasSheetPractice: false,
      hasSegmentPractice: false,
      hasRecordings: false,
      hasGoals: false
    }
  };

  return {
    ...base,
    ...overrides,
    summary: {
      ...base.summary,
      ...overrides.summary
    },
    totals: {
      ...base.totals,
      ...overrides.totals
    },
    emptyState: {
      ...base.emptyState,
      ...overrides.emptyState
    }
  };
}

function createContinueTarget(
  overrides: Partial<ContinuePracticeTargetIdentity> = {}
): ContinuePracticeTargetIdentity {
  const base: ContinuePracticeTargetIdentity = {
    kind: "quick",
    sourceType: "quick",
    activitySource: "session",
    label: "Quick Practice",
    sessionId: "quick-session",
    recordingId: null,
    occurredAt: "2026-06-21T12:00:00.000Z",
    sortTimestamp: "2026-06-21T12:00:00.000Z",
    targetKey: "quick"
  };

  return {
    ...base,
    ...overrides
  } as ContinuePracticeTargetIdentity;
}

function createContinueTargetsResult(
  targets: ContinuePracticeTargetIdentity[] = []
): ContinuePracticeTargetsResult {
  return {
    targets,
    generatedAt: "2026-06-21T12:10:00.000Z",
    limit: 5,
    rejected: []
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
    continueTargets: createContinueTargetsResult(),
    continueTargetsStatus: "loaded",
    continueTargetsErrorMessage: null,
    recentActivity: createActivityResult(),
    recentActivityStatus: "loaded",
    recentActivityErrorMessage: null,
    analytics: createAnalyticsSource(),
    analyticsStatus: "loaded",
    analyticsErrorMessage: null,
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
    serviceMocks.getContinuePracticeTargets.mockReset();
    serviceMocks.getTodaySummary.mockReset();
    serviceMocks.getHomeRecentActivity.mockReset();
    serviceMocks.getHomeDashboardAnalyticsSource.mockReset();
    serviceMocks.subscribe.mockReset();
    serviceMocks.getRecentSession.mockResolvedValue(null);
    serviceMocks.getContinuePracticeTarget.mockResolvedValue(null);
    serviceMocks.getContinuePracticeTargets.mockResolvedValue(createContinueTargetsResult());
    serviceMocks.getTodaySummary.mockResolvedValue({
      durationMs: 0,
      minutesToday: 0,
      sessionsToday: 0,
      recordingsToday: 0
    });
    serviceMocks.getHomeRecentActivity.mockResolvedValue(createActivityResult());
    serviceMocks.getHomeDashboardAnalyticsSource.mockResolvedValue(createAnalyticsSource());
    serviceMocks.subscribe.mockReturnValue(() => undefined);
  });

  it("renders zero summary values and loaded empty states without fake practice data", () => {
    render(<HomeDashboard data={createDashboardData()} />);

    expect(screen.getByRole("heading", { name: "Home" })).toBeVisible();
    expect(screen.getByText("Today Practice Summary")).toBeVisible();
    expect(screen.getByText("Minutes")).toBeVisible();
    expect(screen.getAllByText("Sessions").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Recordings")).toBeVisible();
    expect(screen.getByTestId("today-summary-minutes")).toHaveTextContent("0");
    expect(screen.getByTestId("today-summary-sessions")).toHaveTextContent("0");
    expect(screen.getByTestId("today-summary-recordings")).toHaveTextContent("0");
    expect(screen.getByRole("region", { name: "Practice Analytics" })).toBeVisible();
    expect(screen.getByText("No local practice analytics yet.")).toBeVisible();
    expect(screen.getByTestId("home-analytics-total-practice")).toHaveTextContent("0 min");
    expect(screen.getByTestId("home-analytics-sessions")).toHaveTextContent("0");
    expect(screen.getByTestId("home-analytics-sheet-takes")).toHaveTextContent("0");
    expect(screen.getByTestId("home-analytics-practiced-sheets")).toHaveTextContent("0");
    expect(screen.getByTestId("home-analytics-segment-sessions")).toHaveTextContent("0");
    expect(screen.getByRole("region", { name: "Continue Practice" })).toBeVisible();
    expect(screen.getByText("No recent practice targets yet.")).toBeVisible();
    expect(screen.getByRole("link", { name: "Start Quick Metronome" })).toHaveAttribute(
      "href",
      "/quick-metronome"
    );
    expect(screen.getByText(/No sheets imported yet/i)).toBeVisible();
    expect(screen.getByText(/Opens the Sheet Library import flow/i)).toBeVisible();
    expect(screen.getByText(/Quick takes appear after recording/i)).toBeVisible();
    expect(screen.getByRole("region", { name: "Recent Activity" })).toBeVisible();
    expect(screen.getByText("No local practice activity yet.")).toBeVisible();
    expect(screen.getByText(/No recording or playback active/i)).toBeVisible();
  });

  it("shows the Continue Practice loading row on initial live mount before targets resolve", () => {
    vi.stubGlobal("indexedDB", {});
    serviceMocks.getContinuePracticeTargets.mockReturnValue(new Promise(() => undefined));

    render(<HomeDashboard />);

    expect(screen.getByText("Loading Continue Practice targets.")).toBeVisible();
    expect(screen.queryByText("No recent practice targets yet.")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Quick Metronome" })).toHaveAttribute(
      "href",
      "/quick-metronome"
    );
  });

  it("renders populated practice analytics from injected source data", () => {
    render(
      <HomeDashboard
        data={createDashboardData({
          analytics: createAnalyticsSource({
            totals: {
              durationMs: 3_900_000,
              sessions: 4,
              sheetTakes: 2,
              practicedSheets: 2,
              segmentSessions: 1
            },
            emptyState: {
              hasPracticeHistory: true,
              hasSheetPractice: true,
              hasSegmentPractice: true,
              hasRecordings: true
            }
          })
        })}
      />
    );

    const panel = screen.getByRole("region", { name: "Practice Analytics" });

    expect(within(panel).queryByText("No local practice analytics yet.")).not.toBeInTheDocument();
    expect(within(panel).getByText("Total practice")).toBeVisible();
    expect(screen.getByTestId("home-analytics-total-practice")).toHaveTextContent("1 hr 5 min");
    expect(screen.getByTestId("home-analytics-sessions")).toHaveTextContent("4");
    expect(screen.getByTestId("home-analytics-sheet-takes")).toHaveTextContent("2");
    expect(screen.getByTestId("home-analytics-practiced-sheets")).toHaveTextContent("2");
    expect(screen.getByTestId("home-analytics-segment-sessions")).toHaveTextContent("1");
    expect(within(panel).getByText("Local history totals · Updated 2026-06-21 12:10 UTC")).toBeVisible();
  });

  it("formats analytics duration boundaries honestly", () => {
    const { rerender } = render(
      <HomeDashboard
        data={createDashboardData({
          analytics: createAnalyticsSource({
            totals: { durationMs: 30_000 },
            emptyState: { hasPracticeHistory: true }
          })
        })}
      />
    );

    expect(screen.getByTestId("home-analytics-total-practice")).toHaveTextContent("<1 min");

    rerender(
      <HomeDashboard
        data={createDashboardData({
          analytics: createAnalyticsSource({
            totals: { durationMs: 59 * 60_000 },
            emptyState: { hasPracticeHistory: true }
          })
        })}
      />
    );

    expect(screen.getByTestId("home-analytics-total-practice")).toHaveTextContent("59 min");

    rerender(
      <HomeDashboard
        data={createDashboardData({
          analytics: createAnalyticsSource({
            totals: { durationMs: 2 * 60 * 60_000 },
            emptyState: { hasPracticeHistory: true }
          })
        })}
      />
    );

    expect(screen.getByTestId("home-analytics-total-practice")).toHaveTextContent("2 hr");
  });

  it("shows contained loading and error states for practice analytics", () => {
    const { rerender } = render(
      <HomeDashboard
        data={createDashboardData({
          analyticsStatus: "loading",
          analytics: createAnalyticsSource({ generatedAt: "" })
        })}
      />
    );

    expect(screen.getByText("Loading practice analytics.")).toBeVisible();
    expect(screen.getByRole("link", { name: "Open Quick Metronome" })).toHaveAttribute(
      "href",
      "/quick-metronome"
    );

    rerender(
      <HomeDashboard
        data={createDashboardData({
          analyticsStatus: "error",
          analyticsErrorMessage: "Practice analytics could not be loaded."
        })}
      />
    );

    expect(screen.getByText("Practice analytics could not be loaded.")).toBeVisible();
    expect(screen.getByText("Today Practice Summary")).toBeVisible();
    expect(screen.getByRole("region", { name: "Continue Practice" })).toBeVisible();
    expect(screen.getByRole("region", { name: "Recent Activity" })).toBeVisible();
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

  it("renders compact Continue Practice target rows for quick, sheet, and segment navigation", () => {
    const data = createDashboardData({
      continueTargets: createContinueTargetsResult([
        createContinueTarget(),
        createContinueTarget({
          kind: "sheet",
          sourceType: "sheet",
          activitySource: "recording",
          label: "Alpha Sheet",
          sessionId: "sheet-session",
          recordingId: "sheet-recording",
          targetKey: "sheet:sheet-alpha",
          sheetId: "sheet-alpha",
          sheetName: "Alpha Sheet"
        }),
        createContinueTarget({
          kind: "segment",
          sourceType: "sheet",
          activitySource: "recording",
          label: "Bridge",
          sessionId: "segment-session",
          recordingId: "segment-recording",
          targetKey: "segment:sheet-alpha:segment-alpha",
          sheetId: "sheet-alpha",
          sheetName: "Alpha Sheet",
          segmentId: "segment-alpha",
          segmentName: "Bridge",
          segmentRangeLabel: "m5-12"
        })
      ])
    });

    render(<HomeDashboard data={data} />);

    const panel = screen.getByRole("region", { name: "Continue Practice" });

    expect(within(panel).getByRole("link", { name: "Continue quick practice" })).toHaveAttribute(
      "href",
      "/quick-metronome"
    );
    expect(
      within(panel).getByRole("link", { name: "Continue sheet practice Alpha Sheet" })
    ).toHaveAttribute("href", "/sheet-practice/sheet-alpha");
    expect(
      within(panel).getByRole("link", { name: "Continue segment Bridge m5-12 Alpha Sheet" })
    ).toHaveAttribute("href", "/sheet-practice?sheetId=sheet-alpha&segmentId=segment-alpha");
    expect(within(panel).getByText("Recent quick practice: 2026-06-21 12:00 UTC")).toBeVisible();
    expect(within(panel).getByText("Sheet: Alpha Sheet")).toBeVisible();
    expect(within(panel).getByText("m5-12 · Alpha Sheet")).toBeVisible();
    expect(within(panel).queryByRole("link", { name: "Continue Practice" })).not.toBeInTheDocument();
  });

  it("limits Continue Practice rows and renders malformed targets as static unavailable rows", () => {
    const malformedSegment = createContinueTarget({
      kind: "segment",
      sourceType: "sheet",
      activitySource: "recording",
      label: "Missing segment id",
      sessionId: "segment-session",
      recordingId: "segment-recording",
      targetKey: "segment:sheet-alpha:missing",
      sheetId: "sheet-alpha",
      sheetName: "Alpha Sheet",
      segmentId: " ",
      segmentName: "Missing segment id",
      segmentRangeLabel: "m5-12"
    });
    const data = createDashboardData({
      continueTargets: {
        ...createContinueTargetsResult([
          createContinueTarget({ sessionId: "quick-1", targetKey: "quick" }),
          createContinueTarget({
            kind: "sheet",
            sourceType: "sheet",
            targetKey: "sheet:sheet-alpha",
            sheetId: "sheet-alpha",
            sheetName: "Alpha Sheet"
          }),
          malformedSegment,
          createContinueTarget({
            kind: "sheet",
            sourceType: "sheet",
            targetKey: "sheet:sheet-bravo",
            sheetId: "sheet-bravo",
            sheetName: "Bravo Sheet"
          }),
          createContinueTarget({
            kind: "sheet",
            sourceType: "sheet",
            targetKey: "sheet:sheet-charlie",
            sheetId: "sheet-charlie",
            sheetName: "Charlie Sheet"
          }),
          createContinueTarget({
            kind: "sheet",
            sourceType: "sheet",
            targetKey: "sheet:sheet-delta",
            sheetId: "sheet-delta",
            sheetName: "Delta Sheet"
          })
        ]),
        limit: 5
      }
    });

    render(<HomeDashboard data={data} />);

    const panel = screen.getByRole("region", { name: "Continue Practice" });

    expect(within(panel).getAllByTestId("continue-practice-row-link")).toHaveLength(4);
    expect(within(panel).getByTestId("continue-practice-row-disabled")).toBeVisible();
    expect(within(panel).getByText("Target unavailable.")).toBeVisible();
    expect(
      within(panel).queryByRole("link", { name: /Missing segment id/i })
    ).not.toBeInTheDocument();
    expect(
      within(panel).queryByRole("link", { name: "Continue sheet practice Delta Sheet" })
    ).not.toBeInTheDocument();
  });

  it("does not render the legacy single Continue Practice link when compatibility data is present", () => {
    render(
      <HomeDashboard
        data={createDashboardData({
          continueTarget: {
            sourceType: "sheet",
            href: "/sheet-practice/legacy-sheet",
            label: "Continue Sheet Practice",
            sessionId: "legacy-session",
            sheetId: "legacy-sheet"
          },
          continueTargets: createContinueTargetsResult([
            createContinueTarget({
              kind: "sheet",
              sourceType: "sheet",
              targetKey: "sheet:sheet-alpha",
              sheetId: "sheet-alpha",
              sheetName: "Alpha Sheet"
            })
          ])
        })}
      />
    );

    const panel = screen.getByRole("region", { name: "Continue Practice" });

    expect(within(panel).getByRole("link", { name: "Continue sheet practice Alpha Sheet" })).toHaveAttribute(
      "href",
      "/sheet-practice/sheet-alpha"
    );
    expect(screen.queryByRole("link", { name: "Continue Practice" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Continue Sheet Practice" })).not.toBeInTheDocument();
  });

  it("shows Continue Practice loading and error states without hiding Quick Metronome", () => {
    const { rerender } = render(
      <HomeDashboard
        data={createDashboardData({
          continueTargetsStatus: "loading",
          continueTargets: createContinueTargetsResult()
        })}
      />
    );

    expect(screen.getByText("Loading Continue Practice targets.")).toBeVisible();
    expect(screen.getByRole("link", { name: "Open Quick Metronome" })).toHaveAttribute(
      "href",
      "/quick-metronome"
    );

    rerender(
      <HomeDashboard
        data={createDashboardData({
          continueTargetsStatus: "error",
          continueTargetsErrorMessage: "Continue Practice targets could not be loaded."
        })}
      />
    );

    expect(screen.getByText("Continue Practice targets could not be loaded.")).toBeVisible();
    expect(screen.getByRole("link", { name: "Open Quick Metronome" })).toHaveAttribute(
      "href",
      "/quick-metronome"
    );
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
    serviceMocks.getContinuePracticeTargets.mockResolvedValue(
      createContinueTargetsResult([createContinueTarget()])
    );
    serviceMocks.getHomeRecentActivity.mockResolvedValue(
      createActivityResult([
        createActivityItem({
          id: "session:service-activity",
          label: "Service Activity",
          targetState: "quick"
        })
      ])
    );
    serviceMocks.getHomeDashboardAnalyticsSource.mockResolvedValue(
      createAnalyticsSource({
        totals: {
          durationMs: 120_000,
          sessions: 1,
          sheetTakes: 0,
          practicedSheets: 0,
          segmentSessions: 0
        },
        emptyState: {
          hasPracticeHistory: true
        }
      })
    );

    const { unmount } = render(<HomeDashboard />);

    await waitFor(() =>
      expect(serviceMocks.getContinuePracticeTargets).toHaveBeenCalledWith({ limit: 5 })
    );
    await waitFor(() => expect(serviceMocks.getHomeRecentActivity).toHaveBeenCalled());
    await waitFor(() => expect(serviceMocks.getHomeDashboardAnalyticsSource).toHaveBeenCalled());
    expect(await screen.findByRole("link", { name: "Continue quick practice" })).toHaveAttribute(
      "href",
      "/quick-metronome"
    );
    expect(await screen.findByText("Service Activity")).toBeVisible();
    expect(screen.getByTestId("today-summary-sessions")).toHaveTextContent("1");
    expect(screen.getByTestId("home-analytics-total-practice")).toHaveTextContent("2 min");
    unmount();

    serviceMocks.getContinuePracticeTargets.mockRejectedValue(new Error("IndexedDB unavailable"));
    serviceMocks.getHomeRecentActivity.mockRejectedValue(new Error("IndexedDB unavailable"));
    serviceMocks.getHomeDashboardAnalyticsSource.mockRejectedValue(new Error("IndexedDB unavailable"));
    render(<HomeDashboard />);

    expect(await screen.findByText("Continue Practice targets could not be loaded.")).toBeVisible();
    expect(await screen.findByText("Recent activity could not be loaded.")).toBeVisible();
    expect(await screen.findByText("Practice analytics could not be loaded.")).toBeVisible();
    expect(screen.getByTestId("today-summary-sessions")).toHaveTextContent("1");
  });

  it("does not read practice analytics when IndexedDB is unavailable", async () => {
    render(<HomeDashboard />);

    await waitFor(() => expect(serviceMocks.getHomeDashboardAnalyticsSource).not.toHaveBeenCalled());
    expect(screen.getByRole("region", { name: "Practice Analytics" })).toBeVisible();
    expect(screen.getByText("No local practice analytics yet.")).toBeVisible();
    expect(screen.getByRole("link", { name: "Open Quick Metronome" })).toHaveAttribute(
      "href",
      "/quick-metronome"
    );
    expect(screen.getByText("Today Practice Summary")).toBeVisible();
    expect(screen.getByRole("region", { name: "Continue Practice" })).toBeVisible();
    expect(screen.getByRole("region", { name: "Recent Activity" })).toBeVisible();
  });

  it("keeps previous analytics visible when a subscription refresh analytics read fails", async () => {
    vi.stubGlobal("indexedDB", {});
    const subscription: { refresh: (() => void) | null } = { refresh: null };

    serviceMocks.subscribe.mockImplementation((listener: () => void) => {
      subscription.refresh = listener;

      return () => undefined;
    });
    serviceMocks.getHomeDashboardAnalyticsSource.mockResolvedValueOnce(
      createAnalyticsSource({
        totals: {
          durationMs: 3_900_000,
          sessions: 4,
          sheetTakes: 2,
          practicedSheets: 2,
          segmentSessions: 1
        },
        emptyState: {
          hasPracticeHistory: true,
          hasSheetPractice: true,
          hasSegmentPractice: true,
          hasRecordings: true
        }
      })
    );

    render(<HomeDashboard />);

    expect(await screen.findByTestId("home-analytics-total-practice")).toHaveTextContent("1 hr 5 min");

    const refresh = subscription.refresh;

    if (!refresh) {
      throw new Error("Dashboard subscription was not registered.");
    }

    serviceMocks.getHomeDashboardAnalyticsSource.mockRejectedValueOnce(
      new Error("analytics read failed")
    );
    refresh();

    expect(await screen.findByText("Practice analytics could not be loaded.")).toBeVisible();
    expect(screen.getByTestId("home-analytics-total-practice")).toHaveTextContent("1 hr 5 min");
    expect(screen.getByTestId("home-analytics-sessions")).toHaveTextContent("4");
    expect(screen.getByRole("region", { name: "Continue Practice" })).toBeVisible();
    expect(screen.getByRole("region", { name: "Recent Activity" })).toBeVisible();
  });
});
