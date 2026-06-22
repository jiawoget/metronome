"use client";

import {
  ArrowRight,
  FileUp,
  Gauge,
  LibraryBig,
  Mic2,
  Music2,
  Settings
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePracticeSessionDashboard, type PracticeSessionDashboardState } from "@/hooks/use-practice-session-dashboard";

export type HomeDashboardData = {
  summary: {
    durationMs: number;
    minutesToday: number;
    sessionsToday: number;
    recordingsToday: number;
  };
  recentSession: null;
  continueTarget: null;
  recentSheets: [];
  recentRecordings: [];
};

export const emptyHomeDashboardData: HomeDashboardData = {
  summary: {
    durationMs: 0,
    minutesToday: 0,
    sessionsToday: 0,
    recordingsToday: 0
  },
  recentSession: null,
  continueTarget: null,
  recentSheets: [],
  recentRecordings: []
};

export function HomeDashboard({ data = emptyHomeDashboardData }: { data?: HomeDashboardData }) {
  const liveData = usePracticeSessionDashboard();
  const dashboardData: HomeDashboardData | PracticeSessionDashboardState = data === emptyHomeDashboardData ? liveData : data;

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

              {dashboardData.continueTarget ? (
                <Link
                  href={dashboardData.continueTarget.href}
                  aria-label="Continue Practice"
                  className="group rounded-md border border-border bg-card px-4 py-4 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-start justify-between gap-3">
                    <Music2 className="h-6 w-6 text-accent" aria-hidden="true" />
                    <ArrowRight className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </div>
                  <h2 className="mt-5 text-lg font-semibold">Continue Practice</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {dashboardData.continueTarget.sourceType === "sheet"
                      ? "Resume the most recent sheet practice session."
                      : "Resume the most recent quick practice session."}
                  </p>
                </Link>
              ) : (
                <div className="rounded-md border border-border bg-muted px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <Music2 className="h-6 w-6 text-accent" aria-hidden="true" />
                    <span className="rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-muted-foreground">
                      Empty
                    </span>
                  </div>
                  <h2 className="mt-5 text-lg font-semibold">Continue Practice</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    No recent practice session yet. Resume controls will appear after session data exists.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

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
