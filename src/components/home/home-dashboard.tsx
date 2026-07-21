"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
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
  Pencil,
  Plus,
  Settings,
  Trash2,
  X
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DEFAULT_CONTINUE_PRACTICE_TARGET_LIMIT,
  DEFAULT_HOME_RECENT_ACTIVITY_LIMIT,
  formatPracticeMinuteDuration,
  formatPracticeUtcMinuteTimestamp,
  type ContinuePracticeTarget,
  type ContinuePracticeTargetIdentity,
  type ContinuePracticeTargetsResult,
  type GoalCompletionEvaluation,
  type HomeDashboardAnalyticsSource,
  type HomePracticeStreaks,
  type HomeRecentActivityItem,
  type HomeRecentActivityResult,
  type HomeRecentActivityTargetState,
  type LocalPracticeGoal,
  type LocalPracticeGoalKind,
  type LocalPracticeGoalPeriod,
  type PracticeSession
} from "@/domain/practice";
import {
  usePracticeSessionDashboard,
  type PracticeSessionDashboardAnalyticsStatus,
  type PracticeSessionDashboardContinueTargetsStatus,
  type PracticeSessionDashboardReadStatus,
  type PracticeSessionDashboardRecentActivityStatus,
  type PracticeSessionDashboardSessionComparisonStatus,
  type PracticeSessionDashboardStreaksStatus,
  type PracticeSessionDashboardState,
  type HomeSessionComparisonData
} from "@/hooks/use-practice-session-dashboard";
import { getContinuePracticeTargetHref } from "@/components/home/continue-practice-navigation";
import { SessionComparisonPanel } from "@/components/home/session-comparison-panel";

export type PracticeGoalManagementReadStatus = PracticeSessionDashboardReadStatus;
export type PracticeGoalManagementMutationStatus = "idle" | "saving" | "deleting" | "error";

export type HomeGoalManagementData = {
  practiceGoals?: LocalPracticeGoal[];
  practiceGoalEvaluations?: GoalCompletionEvaluation[];
  practiceGoalsStatus?: PracticeGoalManagementReadStatus;
  practiceGoalProgressStatus?: PracticeGoalManagementReadStatus;
  practiceGoalsErrorMessage?: string | null;
  practiceGoalProgressErrorMessage?: string | null;
  practiceGoalMutationStatus?: PracticeGoalManagementMutationStatus;
  practiceGoalMutationErrorMessage?: string | null;
  savePracticeGoal?: (goal: LocalPracticeGoal) => Promise<void | boolean> | void | boolean;
  deletePracticeGoal?: (goalId: string) => Promise<void | boolean> | void | boolean;
  onSavePracticeGoal?: (goal: LocalPracticeGoal) => Promise<void | boolean> | void | boolean;
  onDeletePracticeGoal?: (goalId: string) => Promise<void | boolean> | void | boolean;
  createPracticeGoalId?: () => string;
  getPracticeGoalNow?: () => Date;
};

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

type HomeDashboardRenderableData = (HomeDashboardData | PracticeSessionDashboardState) & Partial<HomeGoalManagementData>;

const practiceGoalKinds = ["minutes", "sessions", "takes"] as const;
const practiceGoalPeriods = ["today", "all-time"] as const;
const maxPracticeGoalTarget = 1_000_000;

const emptyContinuePracticeTargets: ContinuePracticeTargetsResult = {
  targets: [],
  generatedAt: "",
  limit: DEFAULT_CONTINUE_PRACTICE_TARGET_LIMIT,
  rejected: []
};

const emptyHomeRecentActivity: HomeRecentActivityResult = {
  items: [],
  generatedAt: "",
  limit: DEFAULT_HOME_RECENT_ACTIVITY_LIMIT
};

const emptyHomeAnalytics: HomeDashboardAnalyticsSource = {
  generatedAt: "",
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

const emptyHomeStreaks: HomePracticeStreaks = {
  generatedAt: "",
  currentStreakDays: 0,
  longestStreakDays: 0,
  practicedToday: false,
  lastPracticedLocalDay: null,
  emptyState: {
    hasPracticeHistory: false
  }
};

const emptyHomeSessionComparison: HomeSessionComparisonData = {
  generatedAt: "",
  candidates: [],
  limit: 8,
  maxSelected: 3
};

const emptyHomeDashboardData: HomeDashboardData = {
  summary: {
    durationMs: 0,
    minutesToday: 0,
    sessionsToday: 0,
    recordingsToday: 0
  },
  recentSession: null,
  continueTarget: null,
  continueTargets: emptyContinuePracticeTargets,
  continueTargetsStatus: "idle",
  continueTargetsErrorMessage: null,
  recentActivity: emptyHomeRecentActivity,
  recentActivityStatus: "idle",
  recentActivityErrorMessage: null,
  analytics: emptyHomeAnalytics,
  analyticsStatus: "idle",
  analyticsErrorMessage: null,
  streaks: emptyHomeStreaks,
  streaksStatus: "idle",
  streaksErrorMessage: null,
  sessionComparison: emptyHomeSessionComparison,
  sessionComparisonStatus: "idle",
  sessionComparisonErrorMessage: null,
  practiceGoals: [],
  practiceGoalEvaluations: [],
  practiceGoalsStatus: "loaded",
  practiceGoalProgressStatus: "loaded",
  practiceGoalsErrorMessage: null,
  practiceGoalProgressErrorMessage: null,
  practiceGoalMutationStatus: "idle",
  practiceGoalMutationErrorMessage: null,
  recentSheets: [],
  recentRecordings: []
};

export function HomeDashboard({ data = emptyHomeDashboardData }: { data?: HomeDashboardData }) {
  const liveData = usePracticeSessionDashboard();
  const dashboardData = (data === emptyHomeDashboardData ? liveData : data) as HomeDashboardRenderableData;
  const continueTargets = dashboardData.continueTargets ?? emptyContinuePracticeTargets;
  const continueTargetsStatus = dashboardData.continueTargetsStatus ?? "idle";
  const continueTargetsErrorMessage = dashboardData.continueTargetsErrorMessage ?? null;
  const recentActivity = dashboardData.recentActivity ?? emptyHomeRecentActivity;
  const recentActivityStatus = dashboardData.recentActivityStatus ?? "idle";
  const recentActivityErrorMessage = dashboardData.recentActivityErrorMessage ?? null;
  const analytics = dashboardData.analytics ?? emptyHomeAnalytics;
  const analyticsStatus = dashboardData.analyticsStatus ?? "idle";
  const analyticsErrorMessage = dashboardData.analyticsErrorMessage ?? null;
  const streaks = dashboardData.streaks ?? emptyHomeStreaks;
  const streaksStatus = dashboardData.streaksStatus ?? "idle";
  const streaksErrorMessage = dashboardData.streaksErrorMessage ?? null;
  const sessionComparison = dashboardData.sessionComparison ?? emptyHomeSessionComparison;
  const sessionComparisonStatus = dashboardData.sessionComparisonStatus ?? "idle";
  const sessionComparisonErrorMessage = dashboardData.sessionComparisonErrorMessage ?? null;
  const practiceGoals = dashboardData.practiceGoals ?? [];
  const practiceGoalEvaluations = dashboardData.practiceGoalEvaluations ?? [];
  const practiceGoalsStatus = dashboardData.practiceGoalsStatus ?? "idle";
  const practiceGoalProgressStatus = dashboardData.practiceGoalProgressStatus ?? "idle";
  const practiceGoalsErrorMessage = dashboardData.practiceGoalsErrorMessage ?? null;
  const practiceGoalProgressErrorMessage = dashboardData.practiceGoalProgressErrorMessage ?? null;
  const practiceGoalMutationStatus = dashboardData.practiceGoalMutationStatus ?? "idle";
  const practiceGoalMutationErrorMessage = dashboardData.practiceGoalMutationErrorMessage ?? null;

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

          <PracticeGoalsPanel
            goals={practiceGoals}
            evaluations={practiceGoalEvaluations}
            status={practiceGoalsStatus}
            progressStatus={practiceGoalProgressStatus}
            errorMessage={practiceGoalsErrorMessage}
            progressErrorMessage={practiceGoalProgressErrorMessage}
            mutationStatus={practiceGoalMutationStatus}
            mutationErrorMessage={practiceGoalMutationErrorMessage}
            onSavePracticeGoal={dashboardData.onSavePracticeGoal ?? dashboardData.savePracticeGoal}
            onDeletePracticeGoal={dashboardData.onDeletePracticeGoal ?? dashboardData.deletePracticeGoal}
            createPracticeGoalId={dashboardData.createPracticeGoalId}
            getPracticeGoalNow={dashboardData.getPracticeGoalNow}
          />

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

type PracticeGoalDraft = {
  kind: LocalPracticeGoalKind;
  period: LocalPracticeGoalPeriod;
  targetText: string;
};

type PracticeGoalFormMode =
  | {
      kind: "create";
    }
  | {
      kind: "edit";
      goal: LocalPracticeGoal;
    };

function PracticeGoalsPanel({
  goals,
  evaluations,
  status,
  progressStatus,
  errorMessage,
  progressErrorMessage,
  mutationStatus,
  mutationErrorMessage,
  onSavePracticeGoal,
  onDeletePracticeGoal,
  createPracticeGoalId = createDefaultPracticeGoalId,
  getPracticeGoalNow = () => new Date()
}: {
  goals: LocalPracticeGoal[];
  evaluations: GoalCompletionEvaluation[];
  status: PracticeGoalManagementReadStatus;
  progressStatus: PracticeGoalManagementReadStatus;
  errorMessage: string | null;
  progressErrorMessage: string | null;
  mutationStatus: PracticeGoalManagementMutationStatus;
  mutationErrorMessage: string | null;
  onSavePracticeGoal?: (goal: LocalPracticeGoal) => Promise<void | boolean> | void | boolean;
  onDeletePracticeGoal?: (goalId: string) => Promise<void | boolean> | void | boolean;
  createPracticeGoalId?: () => string;
  getPracticeGoalNow?: () => Date;
}) {
  const isMountedRef = useRef(false);
  const [formMode, setFormMode] = useState<PracticeGoalFormMode | null>(null);
  const [draft, setDraft] = useState<PracticeGoalDraft>(createDefaultPracticeGoalDraft());
  const [targetError, setTargetError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDeleteGoalId, setConfirmDeleteGoalId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [localMutationStatus, setLocalMutationStatus] = useState<PracticeGoalManagementMutationStatus>("idle");
  const evaluationsByGoalId = new Map(evaluations.map((evaluation) => [evaluation.goalId, evaluation]));
  const hasGoalSurface =
    status !== "idle" ||
    goals.length > 0 ||
    evaluations.length > 0 ||
    Boolean(onSavePracticeGoal) ||
    Boolean(onDeletePracticeGoal);
  const isInitialLoading = status === "loading" && goals.length === 0;
  const isUnavailable = !hasGoalSurface;
  const isSaving = mutationStatus === "saving" || localMutationStatus === "saving";
  const isDeleting = mutationStatus === "deleting" || localMutationStatus === "deleting";
  const visibleMutationError = formError ?? mutationErrorMessage;

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  function openCreateForm() {
    setDraft(createDefaultPracticeGoalDraft());
    setTargetError(null);
    setFormError(null);
    setFormMode({ kind: "create" });
  }

  function openEditForm(goal: LocalPracticeGoal) {
    setDraft({
      kind: goal.kind,
      period: goal.period,
      targetText: String(goal.target)
    });
    setTargetError(null);
    setFormError(null);
    setFormMode({ kind: "edit", goal });
  }

  function closeForm() {
    setFormMode(null);
    setTargetError(null);
    setFormError(null);
  }

  function updateDraft(field: keyof PracticeGoalDraft, value: string) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      [field]: value
    }));
    setTargetError(null);
    setFormError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validatePracticeGoalDraft(draft);

    if (!validation.valid) {
      setTargetError(validation.message);
      return;
    }

    if (!onSavePracticeGoal) {
      setFormError("Practice goals could not be loaded.");
      return;
    }

    const goal = buildLocalPracticeGoalFromDraft({
      draft,
      target: validation.target,
      baseGoal: formMode?.kind === "edit" ? formMode.goal : null,
      createGoalId: createPracticeGoalId,
      now: getPracticeGoalNow
    });

    try {
      setLocalMutationStatus("saving");
      setFormError(null);
      const result = await Promise.resolve(onSavePracticeGoal(goal));

      if (!isMountedRef.current) {
        return;
      }

      if (result === false) {
        setFormError("Goal could not be saved.");
        return;
      }

      closeForm();
    } catch {
      if (isMountedRef.current) {
        setFormError("Goal could not be saved.");
      }
    } finally {
      if (isMountedRef.current) {
        setLocalMutationStatus("idle");
      }
    }
  }

  async function handleDelete(goal: LocalPracticeGoal) {
    if (!onDeletePracticeGoal) {
      setDeleteError("Practice goals could not be loaded.");
      return;
    }

    try {
      setLocalMutationStatus("deleting");
      setDeleteError(null);
      const result = await Promise.resolve(onDeletePracticeGoal(goal.id));

      if (!isMountedRef.current) {
        return;
      }

      if (result === false) {
        setDeleteError("Goal could not be deleted.");
        return;
      }

      setConfirmDeleteGoalId(null);
    } catch {
      if (isMountedRef.current) {
        setDeleteError("Goal could not be deleted.");
      }
    } finally {
      if (isMountedRef.current) {
        setLocalMutationStatus("idle");
      }
    }
  }

  return (
    <Card role="region" aria-labelledby="practice-goals-title" data-testid="practice-goals-panel">
      <CardHeader className="flex-row items-center justify-between gap-3">
        <CardTitle id="practice-goals-title">Practice Goals</CardTitle>
        <Button
          type="button"
          variant="secondary"
          size="default"
          className="shrink-0"
          data-testid="practice-goals-new"
          onClick={openCreateForm}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          New goal
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {isInitialLoading ? (
            <div
              role="status"
              className="rounded-md border border-border bg-muted px-3 py-3 text-sm leading-6 text-muted-foreground"
            >
              Loading practice goals.
            </div>
          ) : status === "error" || isUnavailable ? (
            <div
              role="status"
              className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-3 text-sm leading-6 text-destructive"
            >
              {errorMessage ?? "Practice goals could not be loaded."}
            </div>
          ) : status === "loading" ? (
            <div
              role="status"
              className="rounded-md border border-border bg-muted px-3 py-3 text-sm leading-6 text-muted-foreground"
            >
              Refreshing practice goals.
            </div>
          ) : null}

          {progressStatus === "error" && goals.length > 0 ? (
            <div
              role="status"
              data-testid="practice-goals-progress-error"
              className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-3 text-sm leading-6 text-destructive"
            >
              {progressErrorMessage ?? "Goal progress could not be loaded."}
            </div>
          ) : null}

          {visibleMutationError ? (
            <div
              role="status"
              data-testid="practice-goals-mutation-error"
              className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-3 text-sm leading-6 text-destructive"
            >
              {visibleMutationError}
            </div>
          ) : null}

          {formMode ? (
            <form
              aria-label={formMode.kind === "create" ? "Create practice goal" : "Edit practice goal"}
              data-testid="practice-goal-form"
              className="grid gap-3 rounded-md border border-border bg-muted px-3 py-3"
              onSubmit={handleSubmit}
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                  Goal kind
                  <select
                    data-testid="practice-goal-kind"
                    className="h-10 rounded-md border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={draft.kind}
                    onChange={(event: ChangeEvent<HTMLSelectElement>) => updateDraft("kind", event.target.value)}
                  >
                    <option value="minutes">Minutes</option>
                    <option value="sessions">Sessions</option>
                    <option value="takes">Sheet takes</option>
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                  Period
                  <select
                    data-testid="practice-goal-period"
                    className="h-10 rounded-md border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={draft.period}
                    onChange={(event: ChangeEvent<HTMLSelectElement>) => updateDraft("period", event.target.value)}
                  >
                    <option value="today">Today</option>
                    <option value="all-time">All-time</option>
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                  Target
                  <input
                    data-testid="practice-goal-target"
                    className="h-10 rounded-md border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    inputMode="numeric"
                    value={draft.targetText}
                    aria-invalid={targetError ? "true" : "false"}
                    aria-describedby={targetError ? "practice-goal-target-error" : undefined}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => updateDraft("targetText", event.target.value)}
                  />
                </label>
              </div>
              {targetError ? (
                <p id="practice-goal-target-error" className="text-xs leading-5 text-destructive">
                  {targetError}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-2">
                <Button type="submit" disabled={isSaving} data-testid="practice-goal-save">
                  {isSaving ? "Saving" : formMode.kind === "create" ? "Create goal" : "Save goal"}
                </Button>
                <Button type="button" variant="ghost" onClick={closeForm} data-testid="practice-goal-cancel">
                  <X className="h-4 w-4" aria-hidden="true" />
                  Cancel
                </Button>
              </div>
            </form>
          ) : null}

          {goals.length === 0 && !isInitialLoading && !isUnavailable && status !== "error" ? (
            <div
              data-testid="practice-goals-empty"
              className="rounded-md border border-border bg-muted px-3 py-3 text-sm leading-6 text-muted-foreground"
            >
              No local goals yet.
            </div>
          ) : null}

          {goals.length > 0 ? (
            <ul className="divide-y divide-border" aria-label="Local practice goals">
              {goals.map((goal) => (
                <PracticeGoalRow
                  key={goal.id}
                  goal={goal}
                  evaluation={evaluationsByGoalId.get(goal.id) ?? null}
                  isDeleting={isDeleting && confirmDeleteGoalId === goal.id}
                  isConfirmingDelete={confirmDeleteGoalId === goal.id}
                  deleteError={confirmDeleteGoalId === goal.id ? deleteError : null}
                  onEdit={() => openEditForm(goal)}
                  onRequestDelete={() => {
                    setDeleteError(null);
                    setConfirmDeleteGoalId(goal.id);
                  }}
                  onCancelDelete={() => {
                    setDeleteError(null);
                    setConfirmDeleteGoalId(null);
                  }}
                  onConfirmDelete={() => void handleDelete(goal)}
                />
              ))}
            </ul>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function PracticeGoalRow({
  goal,
  evaluation,
  isDeleting,
  isConfirmingDelete,
  deleteError,
  onEdit,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete
}: {
  goal: LocalPracticeGoal;
  evaluation: GoalCompletionEvaluation | null;
  isDeleting: boolean;
  isConfirmingDelete: boolean;
  deleteError: string | null;
  onEdit: () => void;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}) {
  const status = getGoalEvaluationStatus(evaluation);
  const progressRatio = evaluation ? clampGoalProgressRatio(evaluation.progressRatio) : 0;

  return (
    <li data-testid="practice-goal-row" data-goal-id={goal.id} className="grid gap-3 py-3 first:pt-0 last:pb-0">
      <div className="flex min-w-0 items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <p className="min-w-0 break-words text-sm font-semibold leading-5">
              {getPracticeGoalLabel(goal)}
            </p>
            <span
              data-goal-id={goal.id}
              className={`rounded-md border px-2 py-0.5 text-xs font-medium leading-5 ${status.className}`}
            >
              {status.label}
            </span>
          </div>
          <p
            data-testid="practice-goal-progress"
            data-goal-id={goal.id}
            className="mt-1 break-words text-xs leading-5 text-muted-foreground"
          >
            {formatPracticeGoalProgress(goal, evaluation)}
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-md bg-muted" aria-hidden="true">
            <div className="h-full bg-primary" style={{ width: `${progressRatio * 100}%` }} />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button type="button" variant="ghost" size="icon" title="Edit goal" aria-label="Edit goal" onClick={onEdit}>
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            title="Delete goal"
            aria-label="Delete goal"
            onClick={onRequestDelete}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {isConfirmingDelete ? (
        <div
          role="group"
          aria-label={`Confirm delete ${getPracticeGoalLabel(goal)}`}
          data-testid="practice-goal-delete-confirm"
          className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-3"
        >
          <p className="text-sm leading-6 text-destructive">Delete this goal?</p>
          {deleteError ? (
            <p className="mt-1 text-xs leading-5 text-destructive">{deleteError}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" variant="secondary" disabled={isDeleting} onClick={onCancelDelete}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isDeleting}
              data-testid="practice-goal-delete-confirm-button"
              aria-label="Confirm delete goal"
              onClick={onConfirmDelete}
            >
              {isDeleting ? "Deleting" : "Delete goal"}
            </Button>
          </div>
        </div>
      ) : null}
    </li>
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

function createDefaultPracticeGoalDraft(): PracticeGoalDraft {
  return {
    kind: "minutes",
    period: "today",
    targetText: "20"
  };
}

function createDefaultPracticeGoalId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `local-goal-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function buildLocalPracticeGoalFromDraft({
  draft,
  target,
  baseGoal,
  createGoalId,
  now
}: {
  draft: PracticeGoalDraft;
  target: number;
  baseGoal: LocalPracticeGoal | null;
  createGoalId: () => string;
  now: () => Date;
}): LocalPracticeGoal {
  return {
    id: baseGoal?.id ?? createGoalId(),
    kind: draft.kind,
    target,
    period: draft.period,
    createdAt: baseGoal?.createdAt ?? now().toISOString()
  };
}

function validatePracticeGoalDraft(draft: PracticeGoalDraft):
  | {
      valid: true;
      target: number;
    }
  | {
      valid: false;
      message: string;
    } {
  if (!isPracticeGoalKind(draft.kind)) {
    return { valid: false, message: "Choose a supported goal kind." };
  }

  if (!isPracticeGoalPeriod(draft.period)) {
    return { valid: false, message: "Choose a supported goal period." };
  }

  const targetText = draft.targetText.trim();

  if (targetText.length === 0) {
    return { valid: false, message: "Enter a positive whole-number target." };
  }

  if (!/^\d+$/.test(targetText)) {
    return { valid: false, message: "Enter a positive whole-number target." };
  }

  const target = Number(targetText);

  if (!Number.isSafeInteger(target) || target <= 0) {
    return { valid: false, message: "Enter a positive safe-integer target." };
  }

  if (target > maxPracticeGoalTarget) {
    return { valid: false, message: `Enter a target of ${maxPracticeGoalTarget} or less.` };
  }

  return { valid: true, target };
}

function isPracticeGoalKind(value: string): value is LocalPracticeGoalKind {
  return practiceGoalKinds.includes(value as LocalPracticeGoalKind);
}

function isPracticeGoalPeriod(value: string): value is LocalPracticeGoalPeriod {
  return practiceGoalPeriods.includes(value as LocalPracticeGoalPeriod);
}

function getPracticeGoalLabel(goal: LocalPracticeGoal) {
  const period = goal.period === "today" ? "Today" : "All-time";

  switch (goal.kind) {
    case "minutes":
      return `${period} practice minutes`;
    case "sessions":
      return `${period} sessions`;
    case "takes":
      return `${period} sheet takes`;
  }
}

function getGoalEvaluationStatus(evaluation: GoalCompletionEvaluation | null) {
  if (!evaluation) {
    return {
      label: "Unavailable",
      className: "border-border bg-muted text-muted-foreground"
    };
  }

  switch (evaluation.status) {
    case "not-started":
      return {
        label: "Not started",
        className: "border-border bg-muted text-muted-foreground"
      };
    case "in-progress":
      return {
        label: "In progress",
        className: "border-border bg-muted text-foreground"
      };
    case "completed":
      return {
        label: "Completed",
        className: "border-border bg-primary/20 text-foreground"
      };
    case "invalid":
      return {
        label: "Invalid",
        className: "border-destructive/30 bg-destructive/5 text-destructive"
      };
  }
}

function formatPracticeGoalProgress(goal: LocalPracticeGoal, evaluation: GoalCompletionEvaluation | null) {
  if (!evaluation || evaluation.status === "invalid" || evaluation.target === null) {
    return "Progress unavailable.";
  }

  const unit = getPracticeGoalUnit(goal.kind, evaluation.target);

  return `${formatPracticeGoalProgressValue(evaluation.progress)} / ${evaluation.target} ${unit}`;
}

function getPracticeGoalUnit(kind: LocalPracticeGoalKind, target: number) {
  if (kind === "minutes") {
    return "min";
  }

  if (kind === "sessions") {
    return target === 1 ? "session" : "sessions";
  }

  return target === 1 ? "sheet take" : "sheet takes";
}

function formatPracticeGoalProgressValue(value: number) {
  if (!Number.isFinite(value)) {
    return "0";
  }

  return String(Math.max(0, Math.floor(value)));
}

function clampGoalProgressRatio(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
}
