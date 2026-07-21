"use client";

import {
  ArrowRight,
  BarChart3,
  FileUp,
  Flame,
  Gauge,
  History,
  LibraryBig,
  Mic2,
  Music2,
  Settings
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatPracticeMinuteDuration,
  formatPracticeUtcMinuteTimestamp,
  type ContinuePracticeTarget,
  type ContinuePracticeTargetIdentity,
  type ContinuePracticeTargetsResult,
  type HomeDashboardAnalyticsSource,
  type HomePracticeStreaks,
  type HomeRecentActivityItem,
  type HomeRecentActivityResult,
  type HomeRecentActivityTargetState,
  type PracticeSession
} from "@/domain/practice";
import {
  emptyAnalytics,
  emptyContinueTargets,
  emptyRecentActivity,
  emptySessionComparison,
  emptyStreaks,
  usePracticeSessionDashboard,
  type PracticeSessionDashboardAnalyticsStatus,
  type PracticeSessionDashboardContinueTargetsStatus,
  type PracticeSessionDashboardRecentActivityStatus,
  type PracticeSessionDashboardSessionComparisonStatus,
  type PracticeSessionDashboardStreaksStatus,
  type HomeSessionComparisonData
} from "@/hooks/use-practice-session-dashboard";
import { getContinuePracticeTargetHref } from "@/components/home/continue-practice-navigation";
import {
  PracticeGoalsPanel,
  type HomeGoalManagementData
} from "@/components/home/practice-goals-panel";
import { SessionComparisonPanel } from "@/components/home/session-comparison-panel";

export type { HomeGoalManagementData } from "@/components/home/practice-goals-panel";

export type HomeDashboardData = HomeGoalManagementData & {
  summary: {
    durationMs: number;
    minutesToday: number;
    sessionsToday: number;
    recordingsToday: number;
  };
  recentSession: PracticeSession | null;
  continueTarget: ContinuePracticeTarget | null;
  continueTargets?: ContinuePracticeTargetsResult;
  continueTargetsStatus?: PracticeSessionDashboardContinueTargetsStatus;
  continueTargetsErrorMessage?: string | null;
  recentActivity?: HomeRecentActivityResult;
  recentActivityStatus?: PracticeSessionDashboardRecentActivityStatus;
  recentActivityErrorMessage?: string | null;
  analytics?: HomeDashboardAnalyticsSource;
  analyticsStatus?: PracticeSessionDashboardAnalyticsStatus;
  analyticsErrorMessage?: string | null;
  streaks?: HomePracticeStreaks;
  streaksStatus?: PracticeSessionDashboardStreaksStatus;
  streaksErrorMessage?: string | null;
  sessionComparison?: HomeSessionComparisonData;
  sessionComparisonStatus?: PracticeSessionDashboardSessionComparisonStatus;
  sessionComparisonErrorMessage?: string | null;
  recentSheets: [];
  recentRecordings: [];
};

export function HomeDashboard({ data }: { data?: HomeDashboardData }) {
  const liveData = usePracticeSessionDashboard();
  const dashboardData = data ?? liveData;
  const continueTargets = dashboardData.continueTargets ?? emptyContinueTargets;
  const continueTargetsStatus = dashboardData.continueTargetsStatus ?? "idle";
  const continueTargetsErrorMessage = dashboardData.continueTargetsErrorMessage ?? null;
  const recentActivity = dashboardData.recentActivity ?? emptyRecentActivity;
  const recentActivityStatus = dashboardData.recentActivityStatus ?? "idle";
  const recentActivityErrorMessage = dashboardData.recentActivityErrorMessage ?? null;
  const analytics = dashboardData.analytics ?? emptyAnalytics;
  const analyticsStatus = dashboardData.analyticsStatus ?? "idle";
  const analyticsErrorMessage = dashboardData.analyticsErrorMessage ?? null;
  const streaks = dashboardData.streaks ?? emptyStreaks;
  const streaksStatus = dashboardData.streaksStatus ?? "idle";
  const streaksErrorMessage = dashboardData.streaksErrorMessage ?? null;
  const sessionComparison = dashboardData.sessionComparison ?? emptySessionComparison;
  const sessionComparisonStatus = dashboardData.sessionComparisonStatus ?? "idle";
  const sessionComparisonErrorMessage = dashboardData.sessionComparisonErrorMessage ?? null;

  return (
    <section aria-labelledby="home-title" className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Practice Dashboard
          </p>
          <h1 id="home-title" className="text-3xl font-semibold tracking-normal sm:text-4xl">
            Home
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Start from a module entry, or return here as practice history becomes available.
          </p>
        </div>
        <div
          aria-label="Global status"
          className="flex min-h-12 items-center gap-3 rounded-md border border-border bg-card px-4 py-3 text-sm shadow-soft"
        >
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground" aria-hidden="true" />
          <span className="font-medium">No recording or playback active.</span>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Primary Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                href="/quick-metronome"
                aria-label="Open Quick Metronome"
                className="group rounded-md border border-border bg-primary px-4 py-4 text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-start justify-between gap-3">
                  <Gauge className="h-6 w-6 shrink-0" aria-hidden="true" />
                  <ArrowRight className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </div>
                <h2 className="mt-5 text-lg font-semibold">Quick Metronome</h2>
                <p className="mt-2 text-sm leading-6">
                  Start timed playback, record a quick take, and replay the latest quick recording.
                </p>
              </Link>

              <ContinuePracticePanel
                continueTargets={continueTargets}
                status={continueTargetsStatus}
                errorMessage={continueTargetsErrorMessage}
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Today Practice Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-3 gap-3">
                <div className="rounded-md border border-border bg-muted px-3 py-3">
                  <dt className="text-xs font-medium text-muted-foreground">Minutes</dt>
                  <dd data-testid="today-summary-minutes" className="mt-2 text-2xl font-semibold">{dashboardData.summary.minutesToday}</dd>
                </div>
                <div className="rounded-md border border-border bg-muted px-3 py-3">
                  <dt className="text-xs font-medium text-muted-foreground">Sessions</dt>
                  <dd data-testid="today-summary-sessions" className="mt-2 text-2xl font-semibold">{dashboardData.summary.sessionsToday}</dd>
                </div>
                <div className="rounded-md border border-border bg-muted px-3 py-3">
                  <dt className="text-xs font-medium text-muted-foreground">Recordings</dt>
                  <dd data-testid="today-summary-recordings" className="mt-2 text-2xl font-semibold">{dashboardData.summary.recordingsToday}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <PracticeAnalyticsPanel
            analytics={analytics}
            status={analyticsStatus}
            errorMessage={analyticsErrorMessage}
          />

          <PracticeStreaksPanel
            streaks={streaks}
            status={streaksStatus}
            errorMessage={streaksErrorMessage}
          />

          <PracticeGoalsPanel data={dashboardData} />

          <SessionComparisonPanel
            comparison={sessionComparison}
            status={sessionComparisonStatus}
            errorMessage={sessionComparisonErrorMessage}
          />

          <RecentActivityPanel
            recentActivity={recentActivity}
            status={recentActivityStatus}
            errorMessage={recentActivityErrorMessage}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LibraryBig className="h-5 w-5 text-accent" aria-hidden="true" />
              Recent Sheets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted-foreground">
              No sheets imported yet. Open Sheet Library to import PDF or image practice sheets.
            </p>
            <Button asChild variant="secondary" className="mt-4 w-full">
              <Link href="/sheet-library">Open Sheet Library</Link>
            </Button>
            <Button asChild variant="secondary" className="mt-3 w-full">
              <Link href="/sheet-library" aria-label="Import Sheet">
                <FileUp className="h-4 w-4" aria-hidden="true" />
                Import Sheet
              </Link>
            </Button>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Opens the Sheet Library import flow for PDF and image sheets.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic2 className="h-5 w-5 text-accent" aria-hidden="true" />
              Recent Recordings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted-foreground">
              Quick takes appear after recording from the Quick Metronome.
            </p>
            <Button asChild variant="secondary" className="mt-4 w-full">
              <Link href="/recordings">Open Recordings</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-accent" aria-hidden="true" />
              Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted-foreground">
              Settings has a top-level route shell. Preferences are not editable in this module.
            </p>
            <Button asChild variant="secondary" className="mt-4 w-full">
              <Link href="/settings">Open Settings</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function PracticeStreaksPanel({
  streaks,
  status,
  errorMessage
}: {
  streaks: HomePracticeStreaks;
  status: PracticeSessionDashboardStreaksStatus;
  errorMessage: string | null;
}) {
  const hasHistory = streaks.emptyState.hasPracticeHistory;
  const hasGeneratedAt = streaks.generatedAt.trim().length > 0;
  const isInitialLoading = status === "loading" && !hasGeneratedAt && !hasHistory;
  const isUnavailable = status === "idle" && !hasGeneratedAt && !hasHistory;
  const canShowDerivedStreaks = hasGeneratedAt || hasHistory;
  const todayStatus = canShowDerivedStreaks ? getPracticeStreakTodayStatus(streaks) : null;

  return (
    <Card role="region" aria-labelledby="practice-streaks-title" data-testid="practice-streaks-panel">
      <CardHeader>
        <CardTitle id="practice-streaks-title" className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-accent" aria-hidden="true" />
          Practice Streaks
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isInitialLoading ? (
          <div
            role="status"
            className="rounded-md border border-border bg-muted px-3 py-3 text-sm leading-6 text-muted-foreground"
          >
            Loading practice streaks.
          </div>
        ) : (
          <div className="grid gap-3">
            {status === "error" ? (
              <div
                role="status"
                className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-3 text-sm leading-6 text-destructive"
              >
                {errorMessage ?? "Practice streaks could not be loaded."}
              </div>
            ) : status === "loading" ? (
              <div
                role="status"
                className="rounded-md border border-border bg-muted px-3 py-3 text-sm leading-6 text-muted-foreground"
              >
                Refreshing practice streaks.
              </div>
            ) : isUnavailable ? (
              <div className="rounded-md border border-border bg-muted px-3 py-3 text-sm leading-6 text-muted-foreground">
                Practice streaks are unavailable in this browser.
              </div>
            ) : !hasHistory ? (
              <div className="rounded-md border border-border bg-muted px-3 py-3 text-sm leading-6 text-muted-foreground">
                No local practice streak yet.
              </div>
            ) : null}

            {canShowDerivedStreaks ? (
              <dl className="grid grid-cols-2 gap-3">
                <AnalyticsMetric
                  label="Current streak"
                  value={formatStreakDays(streaks.currentStreakDays)}
                  testId="home-streak-current"
                />
                <AnalyticsMetric
                  label="Longest streak"
                  value={formatStreakDays(streaks.longestStreakDays)}
                  testId="home-streak-longest"
                />
              </dl>
            ) : null}

            {todayStatus ? (
              <p data-testid="home-streak-today-status" className="text-sm leading-6 text-muted-foreground">
                {todayStatus}
              </p>
            ) : null}
            {streaks.lastPracticedLocalDay ? (
              <p className="text-xs leading-5 text-muted-foreground">
                Last practiced {streaks.lastPracticedLocalDay}
              </p>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getPracticeStreakTodayStatus(streaks: HomePracticeStreaks) {
  if (!streaks.emptyState.hasPracticeHistory) {
    return "No practice logged yet.";
  }

  if (streaks.practicedToday) {
    return "Practiced today.";
  }

  if (streaks.currentStreakDays > 0) {
    return "Streak is waiting on today's practice.";
  }

  return "No practice logged today.";
}

function formatStreakDays(value: number) {
  const days = Number.isFinite(value) && value > 0 ? Math.round(value) : 0;

  return days === 1 ? "1 day" : `${days} days`;
}

function PracticeAnalyticsPanel({
  analytics,
  status,
  errorMessage
}: {
  analytics: HomeDashboardAnalyticsSource;
  status: PracticeSessionDashboardAnalyticsStatus;
  errorMessage: string | null;
}) {
  const hasHistory = analytics.emptyState.hasPracticeHistory;
  const hasGeneratedAt = analytics.generatedAt.trim().length > 0;
  const isInitialLoading = status === "loading" && !hasGeneratedAt && !hasHistory;

  return (
    <Card role="region" aria-labelledby="practice-analytics-title" data-testid="practice-analytics-panel">
      <CardHeader>
        <CardTitle id="practice-analytics-title" className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-accent" aria-hidden="true" />
          Practice Analytics
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isInitialLoading ? (
          <div
            role="status"
            className="rounded-md border border-border bg-muted px-3 py-3 text-sm leading-6 text-muted-foreground"
          >
            Loading practice analytics.
          </div>
        ) : (
          <div className="grid gap-3">
            {status === "error" ? (
              <div
                role="status"
                className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-3 text-sm leading-6 text-destructive"
              >
                {errorMessage ?? "Practice analytics could not be loaded."}
              </div>
            ) : status === "loading" ? (
              <div
                role="status"
                className="rounded-md border border-border bg-muted px-3 py-3 text-sm leading-6 text-muted-foreground"
              >
                Refreshing practice analytics.
              </div>
            ) : null}

            {!hasHistory ? (
              <div className="rounded-md border border-border bg-muted px-3 py-3 text-sm leading-6 text-muted-foreground">
                No local practice analytics yet.
              </div>
            ) : null}

            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <AnalyticsMetric
                label="Total practice"
                value={formatPracticeMinuteDuration(analytics.totals.durationMs)}
                testId="home-analytics-total-practice"
              />
              <AnalyticsMetric
                label="Sessions"
                value={String(analytics.totals.sessions)}
                testId="home-analytics-sessions"
              />
              <AnalyticsMetric
                label="Sheet takes"
                value={String(analytics.totals.sheetTakes)}
                testId="home-analytics-sheet-takes"
              />
              <AnalyticsMetric
                label="Practiced sheets"
                value={String(analytics.totals.practicedSheets)}
                testId="home-analytics-practiced-sheets"
              />
              <AnalyticsMetric
                label="Segment sessions"
                value={String(analytics.totals.segmentSessions)}
                testId="home-analytics-segment-sessions"
              />
            </dl>

            <p className="text-xs leading-5 text-muted-foreground">
              Local history totals{hasGeneratedAt ? ` · Updated ${formatPracticeUtcMinuteTimestamp(analytics.generatedAt, "Unknown update time")}` : ""}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AnalyticsMetric({
  label,
  value,
  testId
}: {
  label: string;
  value: string;
  testId: string;
}) {
  return (
    <div className="min-h-20 rounded-md border border-border bg-muted px-3 py-3">
      <dt className="break-words text-xs font-medium leading-5 text-muted-foreground">
        {label}
      </dt>
      <dd data-testid={testId} className="mt-2 break-words text-2xl font-semibold leading-8">
        {value}
      </dd>
    </div>
  );
}

function ContinuePracticePanel({
  continueTargets,
  status,
  errorMessage
}: {
  continueTargets: ContinuePracticeTargetsResult;
  status: PracticeSessionDashboardContinueTargetsStatus;
  errorMessage: string | null;
}) {
  const targets = continueTargets.targets.slice(0, continueTargets.limit);
  const isInitialLoading = status === "loading" && targets.length === 0;

  return (
    <div
      role="region"
      aria-labelledby="continue-practice-title"
      data-testid="continue-practice-panel"
      className="rounded-md border border-border bg-card px-4 py-4"
    >
      <div className="flex items-start justify-between gap-3">
        <Music2 className="h-6 w-6 text-accent" aria-hidden="true" />
        <span className="rounded-md border border-border bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
          {targets.length > 0 ? `${targets.length} ready` : "Ready"}
        </span>
      </div>
      <h2 id="continue-practice-title" className="mt-5 text-lg font-semibold">
        Continue Practice
      </h2>

      {isInitialLoading ? (
        <div
          role="status"
          className="mt-3 rounded-md border border-border bg-muted px-3 py-3 text-sm leading-6 text-muted-foreground"
        >
          Loading Continue Practice targets.
        </div>
      ) : status === "error" ? (
        <div
          role="status"
          className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-3 text-sm leading-6 text-destructive"
        >
          {errorMessage ?? "Continue Practice targets could not be loaded."}
        </div>
      ) : targets.length === 0 ? (
        <div className="mt-3 rounded-md border border-border bg-muted px-3 py-3">
          <p className="text-sm leading-6 text-muted-foreground">
            No recent practice targets yet.
          </p>
          <Button asChild variant="secondary" className="mt-3">
            <Link href="/quick-metronome">
              Start Quick Metronome
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-border" aria-label="Continue Practice recommendations">
          {targets.map((target, index) => (
            <ContinuePracticeTargetRow key={`${target.targetKey}-${index}`} target={target} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ContinuePracticeTargetRow({ target }: { target: ContinuePracticeTargetIdentity }) {
  const row = getContinuePracticeRowContent(target);

  if (!row) {
    return null;
  }

  const href = safelyGetContinuePracticeHref(target);

  if (!href) {
    return (
      <li
        data-testid="continue-practice-row-disabled"
        className="flex min-w-0 gap-3 py-3 first:pt-0 last:pb-0 text-muted-foreground"
      >
        <ContinuePracticeKindIcon kind={target.kind} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <p className="min-w-0 break-words text-sm font-semibold leading-5">
              {row.title}
            </p>
            <span className="rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-medium leading-5">
              {row.typeLabel}
            </span>
            <span className="rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-medium leading-5">
              Unavailable
            </span>
          </div>
          <p className="mt-1 break-words text-xs leading-5">
            {row.metadata}
          </p>
          <p className="mt-2 break-words text-xs leading-5">
            Target unavailable.
          </p>
        </div>
      </li>
    );
  }

  return (
    <li className="first:pt-0 last:pb-0">
      <Link
        href={href}
        aria-label={row.accessibleName}
        data-testid="continue-practice-row-link"
        className="group flex min-w-0 gap-3 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ContinuePracticeKindIcon kind={target.kind} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <p className="min-w-0 break-words text-sm font-semibold leading-5 text-foreground">
              {row.title}
            </p>
            <span className="rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-medium leading-5 text-muted-foreground">
              {row.typeLabel}
            </span>
          </div>
          <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">
            {row.metadata}
          </p>
        </div>
        <ArrowRight
          className="mt-2 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </Link>
    </li>
  );
}

function ContinuePracticeKindIcon({
  kind
}: {
  kind: ContinuePracticeTargetIdentity["kind"];
}) {
  const className = "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-accent";

  if (kind === "quick") {
    return (
      <span className={className} aria-hidden="true">
        <Gauge className="h-4 w-4" />
      </span>
    );
  }

  return (
    <span className={className} aria-hidden="true">
      <Music2 className="h-4 w-4" />
    </span>
  );
}

function getContinuePracticeRowContent(target: ContinuePracticeTargetIdentity) {
  switch (target.kind) {
    case "quick":
      return {
        title: "Quick practice",
        typeLabel: "Quick",
        metadata: `Recent quick practice: ${formatPracticeUtcMinuteTimestamp(target.sortTimestamp ?? target.occurredAt)}`,
        accessibleName: "Continue quick practice"
      };
    case "sheet": {
      const sheetLabel = target.sheetName ?? target.sheetId;

      return {
        title: "Sheet practice",
        typeLabel: "Sheet",
        metadata: `Sheet: ${sheetLabel}`,
        accessibleName: `Continue sheet practice ${sheetLabel}`
      };
    }
    case "segment": {
      const title = target.segmentName ?? "Saved segment";
      const sheetLabel = target.sheetName ?? target.sheetId;
      const metadata = [target.segmentRangeLabel, sheetLabel].filter(Boolean).join(" · ");

      return {
        title,
        typeLabel: "Segment",
        metadata,
        accessibleName: ["Continue segment", title, target.segmentRangeLabel, sheetLabel]
          .filter(Boolean)
          .join(" ")
      };
    }
    default:
      return null;
  }
}

function safelyGetContinuePracticeHref(target: ContinuePracticeTargetIdentity) {
  try {
    const href = getContinuePracticeTargetHref(target);

    return href && href.trim().length > 0 ? href : null;
  } catch {
    return null;
  }
}

function RecentActivityPanel({
  recentActivity,
  status,
  errorMessage
}: {
  recentActivity: HomeRecentActivityResult;
  status: PracticeSessionDashboardRecentActivityStatus;
  errorMessage: string | null;
}) {
  const items = recentActivity.items;
  const isInitialLoading = status === "loading" && items.length === 0;

  return (
    <Card role="region" aria-labelledby="recent-activity-title" data-testid="recent-activity-panel">
      <CardHeader>
        <CardTitle id="recent-activity-title" className="flex items-center gap-2">
          <History className="h-5 w-5 text-accent" aria-hidden="true" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isInitialLoading ? (
          <div className="rounded-md border border-border bg-muted px-3 py-3 text-sm leading-6 text-muted-foreground">
            Loading recent activity.
          </div>
        ) : status === "error" ? (
          <div
            role="status"
            className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-3 text-sm leading-6 text-destructive"
          >
            {errorMessage ?? "Recent activity could not be loaded."}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-md border border-border bg-muted px-3 py-3 text-sm leading-6 text-muted-foreground">
            No local practice activity yet.
          </div>
        ) : (
          <ul className="divide-y divide-border" aria-label="Recent practice activity">
            {items.map((item) => (
              <RecentActivityRow key={item.id} item={item} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function RecentActivityRow({ item }: { item: HomeRecentActivityItem }) {
  const status = getActivityStatus(item.targetState);
  const timestamp = formatPracticeUtcMinuteTimestamp(item.sortTimestamp);
  const isStale = item.targetState !== "valid" && item.targetState !== "quick";

  return (
    <li
      data-testid="recent-activity-row"
      data-activity-state={item.targetState}
      className={`flex min-w-0 gap-3 py-3 first:pt-0 last:pb-0 ${isStale ? "text-muted-foreground" : ""}`}
    >
      <span
        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border ${
          isStale ? "bg-muted" : "bg-card"
        }`}
        aria-hidden="true"
      >
        <ActivityKindIcon kind={item.kind} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <p className="min-w-0 break-words text-sm font-semibold leading-5 text-foreground">
            {item.label}
          </p>
          <span
            className={`rounded-md border px-2 py-0.5 text-xs font-medium leading-5 ${status.className}`}
          >
            Status: {status.label}
          </span>
        </div>
        <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">
          {getActivityKindLabel(item.kind)} · {timestamp}
        </p>
        {item.metadata.length > 0 ? (
          <ul className="mt-2 flex min-w-0 flex-wrap gap-1.5" aria-label={`Metadata for ${item.label}`}>
            {item.metadata.map((metadata) => (
              <li
                key={metadata}
                className="max-w-full break-words rounded-md border border-border bg-muted px-2 py-0.5 text-xs leading-5 text-muted-foreground"
              >
                {metadata}
              </li>
            ))}
          </ul>
        ) : null}
        {item.disabledReason ? (
          <p className="mt-2 break-words text-xs leading-5 text-muted-foreground">
            Stale: {item.disabledReason}
          </p>
        ) : null}
      </div>
    </li>
  );
}

function ActivityKindIcon({ kind }: { kind: HomeRecentActivityItem["kind"] }) {
  if (kind === "quick-session") {
    return <Gauge className="h-4 w-4" />;
  }

  if (kind === "sheet-recording" || kind === "segment-recording") {
    return <Mic2 className="h-4 w-4" />;
  }

  return <Music2 className="h-4 w-4" />;
}

function getActivityKindLabel(kind: HomeRecentActivityItem["kind"]) {
  switch (kind) {
    case "quick-session":
      return "Quick practice";
    case "sheet-session":
      return "Sheet practice";
    case "sheet-recording":
      return "Sheet recording";
    case "segment-session":
      return "Segment practice";
    case "segment-recording":
      return "Segment recording";
  }
}

function getActivityStatus(targetState: HomeRecentActivityTargetState) {
  switch (targetState) {
    case "valid":
      return {
        label: "Ready",
        className: "border-border bg-muted text-foreground"
      };
    case "quick":
      return {
        label: "Quick practice",
        className: "border-border bg-muted text-foreground"
      };
    case "lookup-failed":
      return {
        label: "Lookup failed",
        className: "border-destructive/30 bg-destructive/5 text-destructive"
      };
    case "missing-sheet":
      return {
        label: "Missing sheet",
        className: "border-border bg-muted text-muted-foreground"
      };
    case "missing-segment":
      return {
        label: "Missing segment",
        className: "border-border bg-muted text-muted-foreground"
      };
    case "no-target":
      return {
        label: "No target",
        className: "border-border bg-muted text-muted-foreground"
      };
  }
}
