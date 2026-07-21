import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HomeDashboard, type HomeDashboardData } from "@/components/home/home-dashboard";
import type {
  ContinuePracticeTargetIdentity,
  ContinuePracticeTargetsResult,
  GoalCompletionEvaluation,
  HomeDashboardAnalyticsSource,
  HomePracticeStreaks,
  HomeRecentActivityItem,
  HomeRecentActivityResult,
  LocalPracticeGoal,
  LocalPracticeGoalKind,
  LocalPracticeGoalPeriod,
  SessionComparisonResult
} from "@/domain/practice";
import type { HomeSessionComparisonData } from "@/hooks/use-practice-session-dashboard";

const serviceMocks = vi.hoisted(() => ({
  getRecentSession: vi.fn(),
  getContinuePracticeTarget: vi.fn(),
  getContinuePracticeTargets: vi.fn(),
  getTodaySummary: vi.fn(),
  getHomeRecentActivity: vi.fn(),
  getHomeDashboardAnalyticsSource: vi.fn(),
  getHomePracticeStreaks: vi.fn(),
  getSessionComparison: vi.fn(),
  subscribe: vi.fn()
}));

const goalServiceMocks = vi.hoisted(() => ({
  listPracticeGoals: vi.fn(),
  getPracticeGoal: vi.fn(),
  savePracticeGoal: vi.fn(),
  deletePracticeGoal: vi.fn(),
  getPracticeGoalEvaluations: vi.fn(),
  subscribe: vi.fn()
}));

vi.mock("@/services/practice-session/browser", () => ({
  browserPracticeSessionService: serviceMocks
}));

vi.mock("@/infrastructure/db/browser-practice-goal-service", () => ({
  browserPracticeGoalService: goalServiceMocks
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

function createPracticeStreaks(overrides: Partial<HomePracticeStreaks> = {}): HomePracticeStreaks {
  const base: HomePracticeStreaks = {
    generatedAt: "2026-06-21T12:10:00.000Z",
    currentStreakDays: 0,
    longestStreakDays: 0,
    practicedToday: false,
    lastPracticedLocalDay: null,
    emptyState: {
      hasPracticeHistory: false
    }
  };

  return {
    ...base,
    ...overrides,
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

function createSessionComparisonCandidate(
  overrides: Partial<HomeSessionComparisonData["candidates"][number]> = {}
): HomeSessionComparisonData["candidates"][number] {
  return {
    sessionId: "quick-session",
    label: "Quick practice · 2026-06-21 12:01 UTC",
    sourceTypeLabel: "Quick practice",
    startedText: "2026-06-21 12:00 UTC",
    updatedText: "2026-06-21 12:01 UTC",
    durationText: "1 min",
    bpmText: "96 BPM",
    timeSignatureText: "4/4",
    recordingsText: "0 recordings",
    sheetText: "Quick metronome",
    segmentText: "Quick metronome",
    goalContributionText: "Counts as 1 session; adds 1 min; 0 sheet takes linked",
    eventText: "Event details not available yet",
    ...overrides
  };
}

function createSessionComparisonData(
  candidates: HomeSessionComparisonData["candidates"] = []
): HomeSessionComparisonData {
  return {
    generatedAt: "2026-06-21T12:10:00.000Z",
    candidates,
    limit: 8,
    maxSelected: 3
  };
}

function createServiceSessionComparisonResult(
  overrides: Partial<SessionComparisonResult> = {}
): SessionComparisonResult {
  return {
    generatedAt: "2026-06-21T12:10:00.000Z",
    candidates: [],
    selectedSessionIds: [],
    comparedSessions: [],
    metrics: [],
    unavailable: [
      {
        key: "events",
        label: "Events",
        reason: "Event details are unavailable because no durable session event read source is exposed."
      }
    ],
    limit: 8,
    maxSelected: 3,
    ...overrides
  };
}

function createServiceSessionComparisonCandidate(
  overrides: Partial<SessionComparisonResult["candidates"][number]> = {}
): SessionComparisonResult["candidates"][number] {
  return {
    sessionId: "quick-session",
    label: "Quick practice - 2026-06-21 12:01 UTC",
    sourceType: "quick",
    startedAt: "2026-06-21T12:00:00.000Z",
    endedAt: null,
    updatedAt: "2026-06-21T12:01:00.000Z",
    sortTimestamp: "2026-06-21T12:01:00.000Z",
    durationMs: 60_000,
    bpm: null,
    timeSignature: null,
    recordingCount: 0,
    linkedRecordingMetadataCount: 0,
    linkedRecordingDurationMs: 0,
    latestRecordingId: null,
    sheetId: null,
    sheetName: null,
    segmentId: null,
    segmentName: null,
    segmentRangeLabel: null,
    targetState: "quick",
    ...overrides
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
    streaks: createPracticeStreaks(),
    streaksStatus: "loaded",
    streaksErrorMessage: null,
    sessionComparison: createSessionComparisonData(),
    sessionComparisonStatus: "loaded",
    sessionComparisonErrorMessage: null,
    recentSheets: [],
    recentRecordings: [],
    ...overrides
  };
}

function createGoal(overrides: Partial<LocalPracticeGoal> = {}): LocalPracticeGoal {
  return {
    id: "goal-minutes",
    kind: "minutes",
    target: 20,
    period: "today",
    createdAt: "2026-06-21T11:00:00.000Z",
    completedAt: null,
    status: "active",
    ...overrides
  };
}

function createGoalEvaluation(
  overrides: Partial<GoalCompletionEvaluation> = {}
): GoalCompletionEvaluation {
  return {
    goalId: "goal-minutes",
    kind: "minutes",
    status: "in-progress",
    progress: 12,
    target: 20,
    progressRatio: 0.6,
    completedAt: null,
    reason: null,
    ...overrides
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}

async function chooseGoalOption(
  user: ReturnType<typeof userEvent.setup>,
  label: string,
  value: LocalPracticeGoalKind | LocalPracticeGoalPeriod,
  optionName: RegExp
) {
  const field = screen.getByLabelText(label);

  if (field instanceof HTMLSelectElement) {
    await user.selectOptions(field, value);
    return;
  }

  await user.click(field);
  await user.click(screen.getByRole("option", { name: optionName }));
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
    serviceMocks.getHomePracticeStreaks.mockReset();
    serviceMocks.getSessionComparison.mockReset();
    serviceMocks.subscribe.mockReset();
    goalServiceMocks.listPracticeGoals.mockReset();
    goalServiceMocks.getPracticeGoal.mockReset();
    goalServiceMocks.savePracticeGoal.mockReset();
    goalServiceMocks.deletePracticeGoal.mockReset();
    goalServiceMocks.getPracticeGoalEvaluations.mockReset();
    goalServiceMocks.subscribe.mockReset();
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
    serviceMocks.getHomePracticeStreaks.mockResolvedValue(createPracticeStreaks());
    serviceMocks.getSessionComparison.mockResolvedValue(createServiceSessionComparisonResult());
    serviceMocks.subscribe.mockReturnValue(() => undefined);
    goalServiceMocks.listPracticeGoals.mockResolvedValue([]);
    goalServiceMocks.getPracticeGoal.mockResolvedValue(null);
    goalServiceMocks.savePracticeGoal.mockResolvedValue(undefined);
    goalServiceMocks.deletePracticeGoal.mockResolvedValue(undefined);
    goalServiceMocks.getPracticeGoalEvaluations.mockResolvedValue([]);
    goalServiceMocks.subscribe.mockReturnValue(() => undefined);
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
    expect(screen.getByRole("region", { name: "Practice Streaks" })).toBeVisible();
    expect(screen.getByText("No local practice streak yet.")).toBeVisible();
    expect(screen.getByTestId("home-streak-current")).toHaveTextContent("0 days");
    expect(screen.getByTestId("home-streak-longest")).toHaveTextContent("0 days");
    expect(screen.getByTestId("home-streak-today-status")).toHaveTextContent("No practice logged yet.");
    expect(screen.getByRole("region", { name: "Session Comparison" })).toBeVisible();
    expect(screen.getByText("No local sessions yet.")).toBeVisible();
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

  it("compares two or three selected sessions without score or recommendation copy", async () => {
    const user = userEvent.setup();
    const candidates = [
      createSessionComparisonCandidate({
        sessionId: "quick-session",
        label: "Quick practice · 2026-06-21 12:01 UTC",
        sourceTypeLabel: "Quick practice",
        durationText: "1 min",
        recordingsText: "0 recordings",
        sheetText: "Quick metronome",
        segmentText: "Quick metronome"
      }),
      createSessionComparisonCandidate({
        sessionId: "sheet-session",
        label: "Sheet practice · 2026-06-21 12:04 UTC",
        sourceTypeLabel: "Sheet practice",
        startedText: "2026-06-21 12:02 UTC",
        updatedText: "2026-06-21 12:04 UTC",
        durationText: "2 min",
        bpmText: "84 BPM",
        timeSignatureText: "3/4",
        recordingsText: "1 recording",
        sheetText: "Alpha Etude",
        segmentText: "Whole sheet / no segment",
        goalContributionText: "Counts as 1 session; adds 2 min; 1 sheet take linked"
      }),
      createSessionComparisonCandidate({
        sessionId: "segment-session",
        label: "Sheet practice · 2026-06-21 12:08 UTC",
        sourceTypeLabel: "Sheet practice",
        durationText: "3 min",
        recordingsText: "2 recordings",
        sheetText: "Alpha Etude",
        segmentText: "Bridge (m5-12)",
        goalContributionText: "Counts as 1 session; adds 3 min; 2 sheet takes linked"
      }),
      createSessionComparisonCandidate({
        sessionId: "fourth-session",
        label: "Quick practice · 2026-06-21 12:09 UTC",
        sourceTypeLabel: "Quick practice"
      })
    ];

    render(
      <HomeDashboard
        data={createDashboardData({
          sessionComparison: createSessionComparisonData(candidates)
        })}
      />
    );

    const panel = screen.getByRole("region", { name: "Session Comparison" });

    expect(within(panel).getByText("Select sessions to compare")).toBeVisible();
    expect(within(panel).getByText("Up to 3 sessions can be compared.")).toBeVisible();
    expect(within(panel).getByText("Select sessions to compare.")).toBeVisible();

    await user.click(within(panel).getByRole("checkbox", { name: /Compare Quick practice .*12:01/ }));
    expect(within(panel).getByText("Select another session to compare.")).toBeVisible();

    await user.click(within(panel).getByRole("checkbox", { name: /Compare Sheet practice .*12:04/ }));
    expect(within(panel).getByText("Selected sessions")).toBeVisible();
    expect(within(panel).getByRole("heading", {
      level: 3,
      name: "Quick practice · 2026-06-21 12:01 UTC"
    })).toBeVisible();
    expect(within(panel).getByRole("heading", {
      level: 3,
      name: "Sheet practice · 2026-06-21 12:04 UTC"
    })).toBeVisible();
    expect(within(panel).getByText("Session type")).toBeVisible();
    expect(within(panel).getAllByText("Quick metronome").length).toBeGreaterThanOrEqual(2);
    expect(within(panel).getByText("Alpha Etude")).toBeVisible();
    expect(within(panel).getByText("Whole sheet / no segment")).toBeVisible();
    expect(within(panel).getAllByText("Event details not available yet")).toHaveLength(2);
    expect(within(panel).getByText("Counts as 1 session; adds 2 min; 1 sheet take linked")).toBeVisible();

    await user.click(within(panel).getByRole("checkbox", { name: /Compare Sheet practice .*12:08/ }));
    expect(within(panel).getByRole("heading", {
      level: 3,
      name: "Sheet practice · 2026-06-21 12:08 UTC"
    })).toBeVisible();
    expect(within(panel).getByText("Bridge (m5-12)")).toBeVisible();
    expect(within(panel).getByRole("checkbox", { name: /fourth-session|12:09/i })).toBeDisabled();
    expect(panel).not.toHaveTextContent(/score|rank|improv|recommend/i);
  });

  it("shows contained loading and error states for session comparison", () => {
    const { rerender } = render(
      <HomeDashboard
        data={createDashboardData({
          sessionComparisonStatus: "loading",
          sessionComparison: createSessionComparisonData()
        })}
      />
    );

    expect(screen.getByText("Loading session comparison.")).toBeVisible();
    expect(screen.getByRole("link", { name: "Open Quick Metronome" })).toHaveAttribute(
      "href",
      "/quick-metronome"
    );

    rerender(
      <HomeDashboard
        data={createDashboardData({
          sessionComparisonStatus: "error",
          sessionComparisonErrorMessage: "Session comparison could not be loaded."
        })}
      />
    );

    expect(screen.getByText("Session comparison could not be loaded.")).toBeVisible();
    expect(screen.getByText("Today Practice Summary")).toBeVisible();
    expect(screen.getByRole("region", { name: "Continue Practice" })).toBeVisible();
    expect(screen.getByRole("region", { name: "Recent Activity" })).toBeVisible();
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

  it("renders populated practice streaks from injected source data", () => {
    render(
      <HomeDashboard
        data={createDashboardData({
          streaks: createPracticeStreaks({
            currentStreakDays: 4,
            longestStreakDays: 9,
            practicedToday: true,
            lastPracticedLocalDay: "2026-06-21",
            emptyState: {
              hasPracticeHistory: true
            }
          })
        })}
      />
    );

    const panel = screen.getByRole("region", { name: "Practice Streaks" });

    expect(within(panel).queryByText("No local practice streak yet.")).not.toBeInTheDocument();
    expect(screen.getByTestId("home-streak-current")).toHaveTextContent("4 days");
    expect(screen.getByTestId("home-streak-longest")).toHaveTextContent("9 days");
    expect(screen.getByTestId("home-streak-today-status")).toHaveTextContent("Practiced today.");
    expect(within(panel).getByText("Last practiced 2026-06-21")).toBeVisible();
  });

  it("shows a restrained today status when a streak is waiting on today's practice", () => {
    render(
      <HomeDashboard
        data={createDashboardData({
          streaks: createPracticeStreaks({
            currentStreakDays: 3,
            longestStreakDays: 5,
            practicedToday: false,
            lastPracticedLocalDay: "2026-06-20",
            emptyState: {
              hasPracticeHistory: true
            }
          })
        })}
      />
    );

    expect(screen.getByTestId("home-streak-current")).toHaveTextContent("3 days");
    expect(screen.getByTestId("home-streak-today-status")).toHaveTextContent(
      "Streak is waiting on today's practice."
    );
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

  it("shows contained loading and first-load error states for practice streaks", () => {
    const { rerender } = render(
      <HomeDashboard
        data={createDashboardData({
          streaksStatus: "loading",
          streaks: createPracticeStreaks({ generatedAt: "" })
        })}
      />
    );

    expect(screen.getByText("Loading practice streaks.")).toBeVisible();
    expect(screen.queryByTestId("home-streak-current")).not.toBeInTheDocument();
    expect(screen.queryByTestId("home-streak-longest")).not.toBeInTheDocument();
    expect(screen.queryByTestId("home-streak-today-status")).not.toBeInTheDocument();
    expect(screen.queryByText("No practice logged yet.")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Quick Metronome" })).toHaveAttribute(
      "href",
      "/quick-metronome"
    );

    rerender(
      <HomeDashboard
        data={createDashboardData({
          streaksStatus: "error",
          streaksErrorMessage: "Practice streaks could not be loaded.",
          streaks: createPracticeStreaks({ generatedAt: "" })
        })}
      />
    );

    const panel = screen.getByRole("region", { name: "Practice Streaks" });

    expect(within(panel).getByText("Practice streaks could not be loaded.")).toBeVisible();
    expect(within(panel).queryByText("No local practice streak yet.")).not.toBeInTheDocument();
    expect(within(panel).queryByTestId("home-streak-current")).not.toBeInTheDocument();
    expect(within(panel).queryByTestId("home-streak-longest")).not.toBeInTheDocument();
    expect(within(panel).queryByTestId("home-streak-today-status")).not.toBeInTheDocument();
    expect(within(panel).queryByText("No practice logged yet.")).not.toBeInTheDocument();
    expect(screen.getByText("Today Practice Summary")).toBeVisible();
    expect(screen.getByRole("region", { name: "Practice Analytics" })).toBeVisible();
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
    serviceMocks.getHomePracticeStreaks.mockResolvedValue(
      createPracticeStreaks({
        currentStreakDays: 2,
        longestStreakDays: 5,
        practicedToday: false,
        lastPracticedLocalDay: "2026-06-20",
        emptyState: {
          hasPracticeHistory: true
        }
      })
    );
    serviceMocks.getSessionComparison.mockResolvedValue(
      createServiceSessionComparisonResult({
        candidates: [
          {
            sessionId: "sheet-session",
            label: "Alpha Etude - 2026-06-21 12:04 UTC",
            sourceType: "sheet",
            startedAt: "2026-06-21T12:02:00.000Z",
            endedAt: null,
            updatedAt: "2026-06-21T12:04:00.000Z",
            sortTimestamp: "2026-06-21T12:04:00.000Z",
            durationMs: 120_000,
            bpm: 84,
            timeSignature: "3/4",
            recordingCount: 1,
            linkedRecordingMetadataCount: 1,
            linkedRecordingDurationMs: 30_000,
            latestRecordingId: "sheet-take",
            sheetId: "sheet-alpha",
            sheetName: "Alpha Etude",
            segmentId: null,
            segmentName: null,
            segmentRangeLabel: null,
            targetState: "valid"
          }
        ]
      })
    );

    const { unmount } = render(<HomeDashboard />);

    await waitFor(() =>
      expect(serviceMocks.getContinuePracticeTargets).toHaveBeenCalledWith({ limit: 5 })
    );
    await waitFor(() => expect(serviceMocks.getHomeRecentActivity).toHaveBeenCalled());
    await waitFor(() => expect(serviceMocks.getHomeDashboardAnalyticsSource).toHaveBeenCalled());
    await waitFor(() => expect(serviceMocks.getHomePracticeStreaks).toHaveBeenCalled());
    await waitFor(() =>
      expect(serviceMocks.getSessionComparison).toHaveBeenCalledWith({ limit: 8 })
    );
    expect(await screen.findByRole("link", { name: "Continue quick practice" })).toHaveAttribute(
      "href",
      "/quick-metronome"
    );
    expect(await screen.findByText("Service Activity")).toBeVisible();
    expect(screen.getByTestId("today-summary-sessions")).toHaveTextContent("1");
    expect(screen.getByTestId("home-analytics-total-practice")).toHaveTextContent("2 min");
    expect(screen.getByTestId("home-streak-current")).toHaveTextContent("2 days");
    expect(screen.getByText("Alpha Etude · 2026-06-21 12:04 UTC")).toBeVisible();
    expect(screen.getByText("2 min · 1 recording")).toBeVisible();
    expect(screen.getByText("Streak is waiting on today's practice.")).toBeVisible();
    unmount();

    serviceMocks.getContinuePracticeTargets.mockRejectedValue(new Error("IndexedDB unavailable"));
    serviceMocks.getHomeRecentActivity.mockRejectedValue(new Error("IndexedDB unavailable"));
    serviceMocks.getHomeDashboardAnalyticsSource.mockRejectedValue(new Error("IndexedDB unavailable"));
    serviceMocks.getHomePracticeStreaks.mockRejectedValue(new Error("IndexedDB unavailable"));
    serviceMocks.getSessionComparison.mockRejectedValue(new Error("IndexedDB unavailable"));
    render(<HomeDashboard />);

    expect(await screen.findByText("Continue Practice targets could not be loaded.")).toBeVisible();
    expect(await screen.findByText("Recent activity could not be loaded.")).toBeVisible();
    expect(await screen.findByText("Practice analytics could not be loaded.")).toBeVisible();
    expect(await screen.findByText("Practice streaks could not be loaded.")).toBeVisible();
    expect(await screen.findByText("Session comparison could not be loaded.")).toBeVisible();
    expect(screen.queryByTestId("home-streak-current")).not.toBeInTheDocument();
    expect(screen.queryByTestId("home-streak-longest")).not.toBeInTheDocument();
    expect(screen.queryByTestId("home-streak-today-status")).not.toBeInTheDocument();
    expect(screen.queryByText("No practice logged yet.")).not.toBeInTheDocument();
    expect(screen.getByTestId("today-summary-sessions")).toHaveTextContent("1");
  });

  it("does not read practice analytics or streaks when IndexedDB is unavailable", async () => {
    render(<HomeDashboard />);

    await waitFor(() => expect(serviceMocks.getHomeDashboardAnalyticsSource).not.toHaveBeenCalled());
    await waitFor(() => expect(serviceMocks.getHomePracticeStreaks).not.toHaveBeenCalled());
    await waitFor(() => expect(serviceMocks.getSessionComparison).not.toHaveBeenCalled());
    expect(screen.getByRole("region", { name: "Practice Analytics" })).toBeVisible();
    expect(screen.getByText("No local practice analytics yet.")).toBeVisible();
    expect(screen.getByRole("region", { name: "Practice Streaks" })).toBeVisible();
    expect(screen.getByText("Practice streaks are unavailable in this browser.")).toBeVisible();
    expect(screen.queryByText("No local practice streak yet.")).not.toBeInTheDocument();
    expect(screen.queryByText("No practice logged yet.")).not.toBeInTheDocument();
    expect(screen.queryByTestId("home-streak-current")).not.toBeInTheDocument();
    expect(screen.queryByTestId("home-streak-longest")).not.toBeInTheDocument();
    expect(screen.queryByTestId("home-streak-today-status")).not.toBeInTheDocument();
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

  it("keeps previous streaks visible when a subscription refresh streak read fails", async () => {
    vi.stubGlobal("indexedDB", {});
    const subscription: { refresh: (() => void) | null } = { refresh: null };

    serviceMocks.subscribe.mockImplementation((listener: () => void) => {
      subscription.refresh = listener;

      return () => undefined;
    });
    serviceMocks.getHomePracticeStreaks.mockResolvedValueOnce(
      createPracticeStreaks({
        currentStreakDays: 4,
        longestStreakDays: 8,
        practicedToday: true,
        lastPracticedLocalDay: "2026-06-21",
        emptyState: {
          hasPracticeHistory: true
        }
      })
    );

    render(<HomeDashboard />);

    expect(await screen.findByTestId("home-streak-current")).toHaveTextContent("4 days");

    const refresh = subscription.refresh;

    if (!refresh) {
      throw new Error("Dashboard subscription was not registered.");
    }

    serviceMocks.getHomePracticeStreaks.mockRejectedValueOnce(
      new Error("streak read failed")
    );
    refresh();

    expect(await screen.findByText("Practice streaks could not be loaded.")).toBeVisible();
    expect(screen.getByTestId("home-streak-current")).toHaveTextContent("4 days");
    expect(screen.getByTestId("home-streak-longest")).toHaveTextContent("8 days");
    expect(screen.getByRole("region", { name: "Practice Analytics" })).toBeVisible();
    expect(screen.getByRole("region", { name: "Continue Practice" })).toBeVisible();
    expect(screen.getByRole("region", { name: "Recent Activity" })).toBeVisible();
  });

  it("ignores older overlapping refreshes that resolve after newer analytics", async () => {
    vi.stubGlobal("indexedDB", {});
    const subscription: { refresh: (() => void) | null } = { refresh: null };
    function createDeferredAnalyticsRead() {
      let resolveAnalytics!: (analytics: HomeDashboardAnalyticsSource) => void;
      const promise = new Promise<HomeDashboardAnalyticsSource>((resolve) => {
        resolveAnalytics = resolve;
      });

      return { promise, resolve: resolveAnalytics };
    }

    const olderAnalyticsRead = createDeferredAnalyticsRead();
    const newerAnalyticsRead = createDeferredAnalyticsRead();
    const olderAnalytics = createAnalyticsSource({
      generatedAt: "2026-06-21T12:00:00.000Z",
      totals: {
        durationMs: 60_000,
        sessions: 1,
        sheetTakes: 0,
        practicedSheets: 0,
        segmentSessions: 0
      },
      emptyState: {
        hasPracticeHistory: true
      }
    });
    const newerAnalytics = createAnalyticsSource({
      generatedAt: "2026-06-21T12:10:00.000Z",
      totals: {
        durationMs: 7_200_000,
        sessions: 6,
        sheetTakes: 3,
        practicedSheets: 2,
        segmentSessions: 2
      },
      emptyState: {
        hasPracticeHistory: true,
        hasSheetPractice: true,
        hasSegmentPractice: true
      }
    });

    serviceMocks.subscribe.mockImplementation((listener: () => void) => {
      subscription.refresh = listener;

      return () => undefined;
    });
    serviceMocks.getHomeDashboardAnalyticsSource
      .mockReturnValueOnce(olderAnalyticsRead.promise)
      .mockReturnValueOnce(newerAnalyticsRead.promise);

    render(<HomeDashboard />);

    await waitFor(() => expect(serviceMocks.getHomeDashboardAnalyticsSource).toHaveBeenCalledTimes(1));

    const refresh = subscription.refresh;

    if (!refresh) {
      throw new Error("Dashboard subscription was not registered.");
    }

    refresh();
    await waitFor(() => expect(serviceMocks.getHomeDashboardAnalyticsSource).toHaveBeenCalledTimes(2));

    newerAnalyticsRead.resolve(newerAnalytics);

    expect(await screen.findByTestId("home-analytics-total-practice")).toHaveTextContent("2 hr");
    expect(screen.getByTestId("home-analytics-sessions")).toHaveTextContent("6");
    expect(screen.queryByText("Loading practice analytics.")).not.toBeInTheDocument();

    olderAnalyticsRead.resolve(olderAnalytics);

    await waitFor(() => expect(screen.getByTestId("home-analytics-sessions")).toHaveTextContent("6"));
    expect(screen.getByTestId("home-analytics-total-practice")).toHaveTextContent("2 hr");
    expect(screen.getByText("Local history totals · Updated 2026-06-21 12:10 UTC")).toBeVisible();
    expect(screen.queryByText("Local history totals · Updated 2026-06-21 12:00 UTC")).not.toBeInTheDocument();
  });

  it("ignores older overlapping refreshes that resolve after newer streaks", async () => {
    vi.stubGlobal("indexedDB", {});
    const subscription: { refresh: (() => void) | null } = { refresh: null };
    function createDeferredStreakRead() {
      let resolveStreaks!: (streaks: HomePracticeStreaks) => void;
      const promise = new Promise<HomePracticeStreaks>((resolve) => {
        resolveStreaks = resolve;
      });

      return { promise, resolve: resolveStreaks };
    }

    const olderStreakRead = createDeferredStreakRead();
    const newerStreakRead = createDeferredStreakRead();
    const olderStreaks = createPracticeStreaks({
      generatedAt: "2026-06-21T12:00:00.000Z",
      currentStreakDays: 1,
      longestStreakDays: 1,
      practicedToday: true,
      lastPracticedLocalDay: "2026-06-21",
      emptyState: {
        hasPracticeHistory: true
      }
    });
    const newerStreaks = createPracticeStreaks({
      generatedAt: "2026-06-21T12:10:00.000Z",
      currentStreakDays: 5,
      longestStreakDays: 7,
      practicedToday: true,
      lastPracticedLocalDay: "2026-06-21",
      emptyState: {
        hasPracticeHistory: true
      }
    });

    serviceMocks.subscribe.mockImplementation((listener: () => void) => {
      subscription.refresh = listener;

      return () => undefined;
    });
    serviceMocks.getHomePracticeStreaks
      .mockReturnValueOnce(olderStreakRead.promise)
      .mockReturnValueOnce(newerStreakRead.promise);

    render(<HomeDashboard />);

    await waitFor(() => expect(serviceMocks.getHomePracticeStreaks).toHaveBeenCalledTimes(1));

    const refresh = subscription.refresh;

    if (!refresh) {
      throw new Error("Dashboard subscription was not registered.");
    }

    refresh();
    await waitFor(() => expect(serviceMocks.getHomePracticeStreaks).toHaveBeenCalledTimes(2));

    newerStreakRead.resolve(newerStreaks);

    expect(await screen.findByTestId("home-streak-current")).toHaveTextContent("5 days");
    expect(screen.getByTestId("home-streak-longest")).toHaveTextContent("7 days");
    expect(screen.queryByText("Loading practice streaks.")).not.toBeInTheDocument();

    olderStreakRead.resolve(olderStreaks);

    await waitFor(() => expect(screen.getByTestId("home-streak-current")).toHaveTextContent("5 days"));
    expect(screen.getByTestId("home-streak-longest")).toHaveTextContent("7 days");
    expect(screen.queryByText("1 day")).not.toBeInTheDocument();
  });

  it("ignores older overlapping streak failures after newer streaks load", async () => {
    vi.stubGlobal("indexedDB", {});
    const subscription: { refresh: (() => void) | null } = { refresh: null };
    function createDeferredRejectedStreakRead() {
      let rejectStreaks!: (error: Error) => void;
      const promise = new Promise<HomePracticeStreaks>((_resolve, reject) => {
        rejectStreaks = reject;
      });

      return { promise, reject: rejectStreaks };
    }
    function createDeferredResolvedStreakRead() {
      let resolveStreaks!: (streaks: HomePracticeStreaks) => void;
      const promise = new Promise<HomePracticeStreaks>((resolve) => {
        resolveStreaks = resolve;
      });

      return { promise, resolve: resolveStreaks };
    }

    const olderStreakRead = createDeferredRejectedStreakRead();
    const newerStreakRead = createDeferredResolvedStreakRead();
    const newerStreaks = createPracticeStreaks({
      generatedAt: "2026-06-21T12:10:00.000Z",
      currentStreakDays: 6,
      longestStreakDays: 6,
      practicedToday: true,
      lastPracticedLocalDay: "2026-06-21",
      emptyState: {
        hasPracticeHistory: true
      }
    });

    serviceMocks.subscribe.mockImplementation((listener: () => void) => {
      subscription.refresh = listener;

      return () => undefined;
    });
    serviceMocks.getHomePracticeStreaks
      .mockReturnValueOnce(olderStreakRead.promise)
      .mockReturnValueOnce(newerStreakRead.promise);

    render(<HomeDashboard />);

    await waitFor(() => expect(serviceMocks.getHomePracticeStreaks).toHaveBeenCalledTimes(1));

    const refresh = subscription.refresh;

    if (!refresh) {
      throw new Error("Dashboard subscription was not registered.");
    }

    refresh();
    await waitFor(() => expect(serviceMocks.getHomePracticeStreaks).toHaveBeenCalledTimes(2));

    newerStreakRead.resolve(newerStreaks);

    expect(await screen.findByTestId("home-streak-current")).toHaveTextContent("6 days");

    olderStreakRead.reject(new Error("older streak read failed"));

    await waitFor(() => expect(screen.getByTestId("home-streak-current")).toHaveTextContent("6 days"));
    expect(screen.queryByText("Practice streaks could not be loaded.")).not.toBeInTheDocument();
  });

  describe("P3-15 Practice Goals", () => {
    it("renders empty and populated local goals from stored-goal evaluations", () => {
      const goals = [
        createGoal({
          id: "goal-minutes",
          kind: "minutes",
          period: "today",
          target: 20
        }),
        createGoal({
          id: "goal-sessions",
          kind: "sessions",
          period: "all-time",
          target: 5,
          createdAt: "2026-06-21T10:00:00.000Z"
        }),
        createGoal({
          id: "goal-takes",
          kind: "takes",
          period: "today",
          target: 3,
          createdAt: "2026-06-21T09:00:00.000Z"
        })
      ];
      const evaluations = [
        createGoalEvaluation({
          goalId: "goal-minutes",
          kind: "minutes",
          status: "in-progress",
          progress: 12,
          target: 20,
          progressRatio: 0.6
        }),
        createGoalEvaluation({
          goalId: "goal-sessions",
          kind: "sessions",
          status: "completed",
          progress: 5,
          target: 5,
          progressRatio: 1,
          completedAt: "2026-06-21T12:00:00.000Z"
        }),
        createGoalEvaluation({
          goalId: "goal-takes",
          kind: "takes",
          status: "not-started",
          progress: 0,
          target: 3,
          progressRatio: 0
        })
      ];

      const { rerender } = render(
        <HomeDashboard
          data={createDashboardData({
            practiceGoals: [],
            practiceGoalEvaluations: [],
            practiceGoalsStatus: "loaded",
            practiceGoalProgressStatus: "loaded",
            onSavePracticeGoal: vi.fn(),
            onDeletePracticeGoal: vi.fn()
          })}
        />
      );

      const emptyPanel = screen.getByRole("region", { name: "Practice Goals" });

      expect(within(emptyPanel).getByText("No local goals yet.")).toBeVisible();

      rerender(
        <HomeDashboard
          data={createDashboardData({
            practiceGoals: goals,
            practiceGoalEvaluations: evaluations,
            practiceGoalsStatus: "loaded",
            practiceGoalProgressStatus: "loaded",
            onSavePracticeGoal: vi.fn(),
            onDeletePracticeGoal: vi.fn()
          })}
        />
      );

      const panel = screen.getByRole("region", { name: "Practice Goals" });
      const rows = within(panel).getAllByTestId("practice-goal-row");
      const progressRows = within(panel).getAllByTestId("practice-goal-progress");

      expect(within(panel).queryByText("No local goals yet.")).not.toBeInTheDocument();
      expect(rows).toHaveLength(3);
      expect(rows[0]).toHaveTextContent("Today practice minutes");
      expect(rows[0]).toHaveTextContent("In progress");
      expect(progressRows[0]).toHaveTextContent("12 / 20 min");
      expect(rows[1]).toHaveTextContent("All-time sessions");
      expect(rows[1]).toHaveTextContent("Completed");
      expect(progressRows[1]).toHaveTextContent("5 / 5 sessions");
      expect(rows[2]).toHaveTextContent(/Today .*takes/i);
      expect(rows[2]).toHaveTextContent("Not started");
      expect(progressRows[2]).toHaveTextContent("0 / 3 sheet takes");
      expect(screen.getByText("Today Practice Summary")).toBeVisible();
      expect(screen.getByRole("region", { name: "Continue Practice" })).toBeVisible();
      expect(screen.getByRole("region", { name: "Recent Activity" })).toBeVisible();
    });

    it("renders invalid, missing-evaluation, and cleared completed-goal states from evaluations", () => {
      render(
        <HomeDashboard
          data={createDashboardData({
            practiceGoals: [
              createGoal({
                id: "goal-cleared-completed",
                target: 20,
                status: "completed",
                completedAt: "2026-06-21T12:00:00.000Z"
              }),
              createGoal({
                id: "goal-invalid",
                kind: "takes",
                target: 3,
                createdAt: "2026-06-21T10:00:00.000Z"
              }),
              createGoal({
                id: "goal-missing-evaluation",
                kind: "sessions",
                target: 2,
                createdAt: "2026-06-21T09:00:00.000Z"
              })
            ],
            practiceGoalEvaluations: [
              createGoalEvaluation({
                goalId: "goal-cleared-completed",
                status: "not-started",
                progress: 0,
                target: 20,
                progressRatio: 0,
                completedAt: null
              }),
              createGoalEvaluation({
                goalId: "goal-invalid",
                kind: "takes",
                status: "invalid",
                progress: 0,
                target: null,
                progressRatio: 0,
                reason: "goal-status-invalid"
              })
            ],
            practiceGoalsStatus: "loaded",
            practiceGoalProgressStatus: "loaded",
            onSavePracticeGoal: vi.fn(),
            onDeletePracticeGoal: vi.fn()
          })}
        />
      );

      const panel = screen.getByRole("region", { name: "Practice Goals" });
      const rows = within(panel).getAllByTestId("practice-goal-row");
      const progressRows = within(panel).getAllByTestId("practice-goal-progress");

      expect(rows[0]).toHaveTextContent("Not started");
      expect(rows[0]).not.toHaveTextContent("Completed");
      expect(progressRows[0]).toHaveTextContent("0 / 20 min");
      expect(rows[1]).toHaveTextContent("Invalid");
      expect(progressRows[1]).toHaveTextContent("Progress unavailable.");
      expect(rows[2]).toHaveTextContent("Unavailable");
      expect(progressRows[2]).toHaveTextContent("Progress unavailable.");
    });

    it("validates create targets and keeps failed saves contained in the form", async () => {
      const user = userEvent.setup();
      const savePracticeGoal = vi.fn().mockRejectedValue(new Error("save failed"));

      render(
        <HomeDashboard
          data={createDashboardData({
            practiceGoals: [],
            practiceGoalEvaluations: [],
            practiceGoalsStatus: "loaded",
            practiceGoalProgressStatus: "loaded",
            onSavePracticeGoal: savePracticeGoal,
            onDeletePracticeGoal: vi.fn(),
            createPracticeGoalId: () => "goal-test-1",
            getPracticeGoalNow: () => new Date("2026-06-21T12:00:00.000Z")
          })}
        />
      );

      const panel = screen.getByRole("region", { name: "Practice Goals" });
      await user.click(within(panel).getByRole("button", { name: "New goal" }));

      for (const [invalidTarget, message] of [
        ["", "Enter a positive whole-number target."],
        ["0", "Enter a positive safe-integer target."],
        ["-1", "Enter a positive whole-number target."],
        ["1.5", "Enter a positive whole-number target."],
        ["abc", "Enter a positive whole-number target."],
        ["1e309", "Enter a positive whole-number target."],
        ["9007199254740992", "Enter a positive safe-integer target."],
        ["1000001", "Enter a target of 1000000 or less."]
      ] as const) {
        const targetField = screen.getByLabelText("Target");
        fireEvent.change(targetField, { target: { value: invalidTarget } });
        await user.click(screen.getByRole("button", { name: "Create goal" }));
        expect(await screen.findByText(message)).toBeVisible();
      }

      expect(savePracticeGoal).not.toHaveBeenCalled();

      await chooseGoalOption(user, "Goal kind", "sessions", /sessions/i);
      await chooseGoalOption(user, "Period", "all-time", /all-time/i);
      await user.clear(screen.getByLabelText("Target"));
      await user.type(screen.getByLabelText("Target"), "5");
      await user.click(screen.getByRole("button", { name: "Create goal" }));

      await waitFor(() =>
        expect(savePracticeGoal).toHaveBeenCalledWith({
          id: "goal-test-1",
          kind: "sessions",
          period: "all-time",
          target: 5,
          createdAt: "2026-06-21T12:00:00.000Z"
        })
      );
      expect(savePracticeGoal.mock.calls[0]?.[0]).not.toHaveProperty("status");
      expect(savePracticeGoal.mock.calls[0]?.[0]).not.toHaveProperty("completedAt");
      expect(screen.getByText("Goal could not be saved.")).toBeVisible();
      expect(screen.getByRole("form", { name: "Create practice goal" })).toBeVisible();
      expect(within(panel).queryByText("All-time sessions")).not.toBeInTheDocument();
    });

    it("edits goals with preserved identity and confirms deletes before service mutation", async () => {
      const user = userEvent.setup();
      const savePracticeGoal = vi.fn().mockResolvedValue(undefined);
      const deletePracticeGoal = vi.fn().mockResolvedValue(undefined);
      const existingGoal = createGoal({
        id: "goal-edit",
        kind: "minutes",
        period: "today",
        target: 20,
        createdAt: "2026-06-21T08:00:00.000Z"
      });

      render(
        <HomeDashboard
          data={createDashboardData({
            practiceGoals: [existingGoal],
            practiceGoalEvaluations: [
              createGoalEvaluation({
                goalId: "goal-edit",
                progress: 10,
                target: 20,
                progressRatio: 0.5
              })
            ],
            practiceGoalsStatus: "loaded",
            practiceGoalProgressStatus: "loaded",
            onSavePracticeGoal: savePracticeGoal,
            onDeletePracticeGoal: deletePracticeGoal
          })}
        />
      );

      const panel = screen.getByRole("region", { name: "Practice Goals" });
      await user.click(within(panel).getByRole("button", { name: "Edit goal" }));
      await chooseGoalOption(user, "Goal kind", "takes", /takes/i);
      await chooseGoalOption(user, "Period", "all-time", /all-time/i);
      await user.clear(screen.getByLabelText("Target"));
      await user.type(screen.getByLabelText("Target"), "7");
      await user.click(screen.getByRole("button", { name: "Save goal" }));

      await waitFor(() =>
        expect(savePracticeGoal).toHaveBeenCalledWith({
          id: "goal-edit",
          kind: "takes",
          period: "all-time",
          target: 7,
          createdAt: "2026-06-21T08:00:00.000Z"
        })
      );
      expect(savePracticeGoal.mock.calls[0]?.[0]).not.toHaveProperty("status");
      expect(savePracticeGoal.mock.calls[0]?.[0]).not.toHaveProperty("completedAt");

      await user.click(within(panel).getByRole("button", { name: "Delete goal" }));
      expect(deletePracticeGoal).not.toHaveBeenCalled();
      await user.click(screen.getByTestId("practice-goal-delete-confirm-button"));

      await waitFor(() =>
        expect(deletePracticeGoal).toHaveBeenCalledWith("goal-edit")
      );
    });

    it("edits a completed goal without preserving stale completion metadata", async () => {
      const user = userEvent.setup();
      const savePracticeGoal = vi.fn().mockResolvedValue(undefined);
      const completedGoal = createGoal({
        id: "goal-completed-edit",
        kind: "minutes",
        period: "today",
        target: 20,
        createdAt: "2026-06-21T08:00:00.000Z",
        completedAt: "2026-06-21T09:00:00.000Z",
        status: "completed"
      });

      render(
        <HomeDashboard
          data={createDashboardData({
            practiceGoals: [completedGoal],
            practiceGoalEvaluations: [
              createGoalEvaluation({
                goalId: "goal-completed-edit",
                status: "completed",
                progress: 20,
                target: 20,
                progressRatio: 1,
                completedAt: "2026-06-21T09:00:00.000Z"
              })
            ],
            practiceGoalsStatus: "loaded",
            practiceGoalProgressStatus: "loaded",
            onSavePracticeGoal: savePracticeGoal,
            onDeletePracticeGoal: vi.fn()
          })}
        />
      );

      const panel = screen.getByRole("region", { name: "Practice Goals" });

      await user.click(within(panel).getByRole("button", { name: "Edit goal" }));
      await chooseGoalOption(user, "Goal kind", "sessions", /sessions/i);
      await chooseGoalOption(user, "Period", "all-time", /all-time/i);
      await user.clear(screen.getByLabelText("Target"));
      await user.type(screen.getByLabelText("Target"), "7");
      await user.click(screen.getByRole("button", { name: "Save goal" }));

      await waitFor(() => expect(savePracticeGoal).toHaveBeenCalledTimes(1));

      const savedGoal = savePracticeGoal.mock.calls[0]?.[0] as LocalPracticeGoal;

      expect(savedGoal).toEqual({
        id: "goal-completed-edit",
        kind: "sessions",
        period: "all-time",
        target: 7,
        createdAt: "2026-06-21T08:00:00.000Z"
      });
      expect(savedGoal).not.toHaveProperty("status");
      expect(savedGoal).not.toHaveProperty("completedAt");
    });

    it("contains goal read, progress read, and mutation failures without hiding Home panels", async () => {
      const user = userEvent.setup();
      const existingGoal = createGoal({ id: "goal-progress-error" });
      const deletePracticeGoal = vi.fn().mockRejectedValue(new Error("delete failed"));

      const { rerender } = render(
        <HomeDashboard
          data={createDashboardData({
            practiceGoals: [],
            practiceGoalEvaluations: [],
            practiceGoalsStatus: "error",
            practiceGoalsErrorMessage: "Practice goals could not be loaded.",
            onSavePracticeGoal: vi.fn(),
            onDeletePracticeGoal: vi.fn()
          })}
        />
      );

      expect(screen.getByText("Practice goals could not be loaded.")).toBeVisible();
      expect(screen.getByRole("link", { name: "Open Quick Metronome" })).toHaveAttribute(
        "href",
        "/quick-metronome"
      );
      expect(screen.getByRole("region", { name: "Practice Analytics" })).toBeVisible();

      rerender(
        <HomeDashboard
          data={createDashboardData({
            practiceGoals: [existingGoal],
            practiceGoalEvaluations: [],
            practiceGoalsStatus: "loaded",
            practiceGoalProgressStatus: "error",
            practiceGoalProgressErrorMessage: "Goal progress could not be loaded.",
            onSavePracticeGoal: vi.fn(),
            onDeletePracticeGoal: deletePracticeGoal
          })}
        />
      );

      const panel = screen.getByRole("region", { name: "Practice Goals" });

      expect(within(panel).getByTestId("practice-goal-row")).toBeVisible();
      expect(within(panel).getByText("Goal progress could not be loaded.")).toBeVisible();

      await user.click(within(panel).getByRole("button", { name: "Delete goal" }));
      await user.click(screen.getByTestId("practice-goal-delete-confirm-button"));

      expect(await screen.findByText("Goal could not be deleted.")).toBeVisible();
      expect(within(panel).getByTestId("practice-goal-row")).toBeVisible();
    });

    it("refreshes goal progress when practice-session subscriptions fire", async () => {
      vi.stubGlobal("indexedDB", {});
      const subscription: { refresh: (() => void) | null } = { refresh: null };
      const goal = createGoal({
        id: "goal-session-progress",
        kind: "minutes",
        period: "today",
        target: 20
      });

      serviceMocks.subscribe.mockImplementation((listener: () => void) => {
        subscription.refresh = listener;

        return () => undefined;
      });
      goalServiceMocks.listPracticeGoals.mockResolvedValue([goal]);
      goalServiceMocks.getPracticeGoalEvaluations
        .mockResolvedValueOnce([
          createGoalEvaluation({
            goalId: "goal-session-progress",
            status: "in-progress",
            progress: 12,
            target: 20,
            progressRatio: 0.6
          })
        ])
        .mockResolvedValueOnce([
          createGoalEvaluation({
            goalId: "goal-session-progress",
            status: "completed",
            progress: 20,
            target: 20,
            progressRatio: 1,
            completedAt: "2026-06-21T12:20:00.000Z"
          })
        ]);

      render(<HomeDashboard />);

      const panel = await screen.findByRole("region", { name: "Practice Goals" });
      const refresh = subscription.refresh;

      if (!refresh) {
        throw new Error("Dashboard subscription was not registered.");
      }

      await waitFor(() =>
        expect(goalServiceMocks.getPracticeGoalEvaluations).toHaveBeenCalledTimes(1)
      );
      expect(within(panel).getByTestId("practice-goal-row")).toHaveTextContent("In progress");
      expect(within(panel).getByTestId("practice-goal-progress")).toHaveTextContent("12 / 20 min");

      refresh();

      await waitFor(() =>
        expect(goalServiceMocks.getPracticeGoalEvaluations).toHaveBeenCalledTimes(2)
      );
      expect(within(panel).getByTestId("practice-goal-row")).toHaveTextContent("Completed");
      expect(within(panel).getByTestId("practice-goal-progress")).toHaveTextContent("20 / 20 min");
    });

    it("subscribes once, unsubscribes on unmount, and ignores stale goal refreshes", async () => {
      vi.stubGlobal("indexedDB", {});
      const initialRead = createDeferred<LocalPracticeGoal[]>();
      const newerRead = createDeferred<LocalPracticeGoal[]>();
      const unsubscribe = vi.fn();
      const subscription: { refresh: (() => void) | null } = { refresh: null };

      goalServiceMocks.subscribe.mockImplementation((listener: () => void) => {
        subscription.refresh = listener;

        return unsubscribe;
      });
      goalServiceMocks.listPracticeGoals
        .mockReturnValueOnce(initialRead.promise)
        .mockReturnValueOnce(newerRead.promise);
      goalServiceMocks.getPracticeGoalEvaluations.mockResolvedValue([]);

      const { unmount } = render(<HomeDashboard />);

      await waitFor(() => expect(goalServiceMocks.subscribe).toHaveBeenCalledTimes(1));

      const refresh = subscription.refresh;

      if (!refresh) {
        throw new Error("Goal subscription was not registered.");
      }

      refresh();
      await waitFor(() => expect(goalServiceMocks.listPracticeGoals).toHaveBeenCalledTimes(2));

      newerRead.resolve([
        createGoal({
          id: "goal-newer",
          kind: "sessions",
          target: 8,
          createdAt: "2026-06-21T12:10:00.000Z"
        })
      ]);

      const panel = await screen.findByRole("region", { name: "Practice Goals" });

      expect(within(panel).getByText("Today sessions")).toBeVisible();

      initialRead.resolve([
        createGoal({
          id: "goal-older",
          kind: "takes",
          target: 2,
          createdAt: "2026-06-21T12:00:00.000Z"
        })
      ]);

      await waitFor(() =>
        expect(within(panel).queryByText("Today sheet takes")).not.toBeInTheDocument()
      );
      expect(within(panel).getByText("Today sessions")).toBeVisible();

      unmount();

      expect(unsubscribe).toHaveBeenCalledTimes(1);
    });
  });

  it("characterizes selected Home timestamp and minute-duration formatting", () => {
    const timestampActivities = [
      createActivityItem({
        id: "session:null-timestamp",
        label: "Null timestamp activity",
        sortTimestamp: null,
        targetState: "quick"
      }),
      createActivityItem({
        id: "session:empty-timestamp",
        label: "Empty timestamp activity",
        sortTimestamp: "",
        targetState: "quick"
      }),
      createActivityItem({
        id: "session:invalid-timestamp",
        label: "Invalid timestamp activity",
        sortTimestamp: "not-a-date",
        targetState: "quick"
      }),
      createActivityItem({
        id: "session:offset-timestamp",
        label: "Offset timestamp activity",
        sortTimestamp: "2026-06-21T23:04:59.999-05:00",
        targetState: "quick"
      })
    ];
    const whitespaceTimestamp = " ".repeat(3);
    const { rerender } = render(
      <HomeDashboard
        data={createDashboardData({
          recentActivity: createActivityResult(timestampActivities),
          analytics: createAnalyticsSource({
            generatedAt: whitespaceTimestamp,
            totals: { durationMs: NaN },
            emptyState: { hasPracticeHistory: true }
          })
        })}
      />
    );

    for (const label of [
      "Null timestamp activity",
      "Empty timestamp activity",
      "Invalid timestamp activity"
    ]) {
      expect(screen.getByText(label).closest("[data-testid='recent-activity-row']")).toHaveTextContent(
        "Quick practice · Unknown time"
      );
    }

    expect(
      screen.getByText("Offset timestamp activity").closest("[data-testid='recent-activity-row']")
    ).toHaveTextContent("Quick practice · 2026-06-22 04:04 UTC");

    const analyticsPanel = screen.getByRole("region", { name: "Practice Analytics" });

    expect(within(analyticsPanel).getByText("Local history totals")).toBeVisible();
    expect(analyticsPanel).not.toHaveTextContent("Updated");

    const durationCases = [
      [NaN, "0 min"],
      [Infinity, "0 min"],
      [-Infinity, "0 min"],
      [-1, "0 min"],
      [0, "0 min"],
      [1, "<1 min"],
      [59_999, "<1 min"],
      [60_000, "1 min"],
      [119_999, "1 min"],
      [3_599_999, "59 min"],
      [3_600_000, "1 hr"],
      [3_660_000, "1 hr 1 min"],
      [90_060_000, "25 hr 1 min"]
    ] as const;

    for (const [durationMs, expected] of durationCases) {
      rerender(
        <HomeDashboard
          data={createDashboardData({
            analytics: createAnalyticsSource({
              generatedAt: whitespaceTimestamp,
              totals: { durationMs },
              emptyState: { hasPracticeHistory: true }
            })
          })}
        />
      );
      expect(screen.getByTestId("home-analytics-total-practice")).toHaveTextContent(expected);
    }

    rerender(
      <HomeDashboard
        data={createDashboardData({
          analytics: createAnalyticsSource({
            generatedAt: "not-a-date",
            emptyState: { hasPracticeHistory: true }
          })
        })}
      />
    );
    expect(screen.getByText("Local history totals · Updated Unknown update time")).toBeVisible();

    rerender(
      <HomeDashboard
        data={createDashboardData({
          analytics: createAnalyticsSource({
            generatedAt: "2026-06-21T23:04:59.999-05:00",
            emptyState: { hasPracticeHistory: true }
          })
        })}
      />
    );
    expect(screen.getByText("Local history totals · Updated 2026-06-22 04:04 UTC")).toBeVisible();
  });

  it("characterizes dashboard-hook comparison timestamps, durations, and goal wording", async () => {
    vi.stubGlobal("indexedDB", {});
    serviceMocks.getSessionComparison.mockResolvedValue(
      createServiceSessionComparisonResult({
        candidates: [
          createServiceSessionComparisonCandidate({
            sessionId: "invalid-time",
            label: "Quick practice - Unknown time",
            startedAt: "not-a-date",
            updatedAt: "still-not-a-date",
            sortTimestamp: null,
            durationMs: 30_000
          }),
          createServiceSessionComparisonCandidate({
            sessionId: "offset-time",
            label: "Quick practice - 2026-06-22 04:59 UTC",
            startedAt: "2026-06-21T23:59:59.999-05:00",
            updatedAt: "2026-06-21T23:59:59.999-05:00",
            sortTimestamp: "2026-06-21T23:59:59.999-05:00",
            durationMs: 119_999,
            bpm: 84,
            timeSignature: "3/4",
            linkedRecordingMetadataCount: 1
          }),
          createServiceSessionComparisonCandidate({
            sessionId: "hour-time",
            label: "Quick practice - 2026-06-21 12:02 UTC",
            startedAt: "2026-06-21T12:01:00.000Z",
            endedAt: "2026-06-21T13:02:00.000Z",
            updatedAt: "2026-06-21T12:02:00.000Z",
            sortTimestamp: "2026-06-21T12:02:00.000Z",
            durationMs: 3_660_000,
            bpm: 96,
            timeSignature: "4/4",
            linkedRecordingMetadataCount: 2
          })
        ]
      })
    );
    const user = userEvent.setup();

    render(<HomeDashboard />);

    const panel = await screen.findByRole("region", { name: "Session Comparison" });

    await user.click(
      within(panel).getByRole("checkbox", {
        name: "Compare Quick practice Quick practice · Unknown time"
      })
    );
    await user.click(
      within(panel).getByRole("checkbox", {
        name: "Compare Quick practice Quick practice · 2026-06-22 04:59 UTC"
      })
    );
    await user.click(
      within(panel).getByRole("checkbox", {
        name: "Compare Quick practice Quick practice · 2026-06-21 12:02 UTC"
      })
    );

    expect(within(panel).getAllByText("Unknown time").length).toBeGreaterThanOrEqual(2);
    expect(within(panel).getAllByText("2026-06-22 04:59 UTC").length).toBeGreaterThanOrEqual(2);
    expect(within(panel).getByText("<1 min")).toBeVisible();
    expect(within(panel).getByText("1 min")).toBeVisible();
    expect(within(panel).getByText("1 hr 1 min")).toBeVisible();
    expect(
      within(panel).getByText("Counts as 1 session; adds <1 min; 0 sheet takes linked")
    ).toBeVisible();
    expect(
      within(panel).getByText("Counts as 1 session; adds 1 min; 1 sheet take linked")
    ).toBeVisible();
    expect(
      within(panel).getByText("Counts as 1 session; adds 1 hr 1 min; 2 sheet takes linked")
    ).toBeVisible();
  });
});
