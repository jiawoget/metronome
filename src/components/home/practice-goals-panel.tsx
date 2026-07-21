"use client";

import { useState, type ReactNode } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  PracticeGoalEditor,
  type PracticeGoalFormMode
} from "@/components/home/practice-goal-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  GoalCompletionEvaluation,
  LocalPracticeGoal
} from "@/domain/practice";
import type {
  HomeGoalManagementState,
  PracticeSessionDashboardActions
} from "@/hooks/use-practice-session-dashboard";

export type HomeGoalManagementData = Partial<HomeGoalManagementState> &
  Partial<
    Pick<
      PracticeSessionDashboardActions,
      "savePracticeGoal" | "deletePracticeGoal" | "createPracticeGoalId"
    >
  >;

export function PracticeGoalsPanel({ data }: { data: HomeGoalManagementData }) {
  const props = normalizePracticeGoalsData(data);
  const editor = usePracticeGoalEditor();
  const deletion = usePracticeGoalDeletion(props);

  return (
    <Card
      role="region"
      aria-labelledby="practice-goals-title"
    >
      <CardHeader className="flex-row items-center justify-between gap-3">
        <CardTitle id="practice-goals-title">Practice Goals</CardTitle>
        <Button
          type="button"
          variant="secondary"
          size="default"
          className="shrink-0"
          onClick={() => {
            editor.open({ kind: "create" });
          }}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          New goal
        </Button>
      </CardHeader>
      <CardContent>
        {renderPracticeGoalsContent(props, editor, deletion)}
      </CardContent>
    </Card>
  );
}

function normalizePracticeGoalsData(data: HomeGoalManagementData) {
  return {
    goals: data.practiceGoals ?? [],
    evaluations: data.practiceGoalEvaluations ?? [],
    status: data.practiceGoalsStatus ?? "idle",
    progressStatus: data.practiceGoalProgressStatus ?? "idle",
    errorMessage: data.practiceGoalsErrorMessage ?? null,
    progressErrorMessage: data.practiceGoalProgressErrorMessage ?? null,
    mutationStatus: data.practiceGoalMutationStatus ?? "idle",
    mutationErrorMessage: data.practiceGoalMutationErrorMessage ?? null,
    savePracticeGoal: data.savePracticeGoal,
    deletePracticeGoal: data.deletePracticeGoal,
    createPracticeGoalId: data.createPracticeGoalId
  };
}

type PracticeGoalsPanelProps = ReturnType<typeof normalizePracticeGoalsData>;

function usePracticeGoalEditor() {
  const [formMode, setFormMode] = useState<PracticeGoalFormMode | null>(null);
  const [editorVersion, setEditorVersion] = useState(0);

  return {
    formMode,
    editorVersion,
    open(mode: PracticeGoalFormMode) {
      setFormMode(mode);
      setEditorVersion((currentVersion) => currentVersion + 1);
    },
    close() {
      setFormMode(null);
    }
  };
}

function usePracticeGoalDeletion(props: PracticeGoalsPanelProps) {
  const [goalId, setGoalId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleDelete(goal: LocalPracticeGoal) {
    if (!props.deletePracticeGoal) {
      setErrorMessage("Practice goals could not be loaded.");
      return;
    }

    try {
      setErrorMessage(null);
      setIsPending(true);
      await props.deletePracticeGoal(goal.id);
      setGoalId(null);
    } catch {
      setErrorMessage("Goal could not be deleted.");
    } finally {
      setIsPending(false);
    }
  }

  return {
    confirmDeleteGoalId: goalId,
    deletionErrorMessage: errorMessage,
    isDeleting: props.mutationStatus === "deleting" || isPending,
    request(nextGoalId: string) {
      setGoalId(nextGoalId);
      setErrorMessage(null);
      setIsPending(false);
    },
    cancel() {
      setGoalId(null);
      setErrorMessage(null);
      setIsPending(false);
    },
    confirm: handleDelete
  };
}

type PracticeGoalEditorController = ReturnType<typeof usePracticeGoalEditor>;
type PracticeGoalDeletionController = ReturnType<typeof usePracticeGoalDeletion>;
const practiceGoalUnits = {
  minutes: ["min", "min"],
  sessions: ["session", "sessions"],
  takes: ["sheet take", "sheet takes"]
} as const;

function renderPracticeGoalsContent(
  props: PracticeGoalsPanelProps,
  editor: PracticeGoalEditorController,
  deletion: PracticeGoalDeletionController
) {
  const surface = getGoalSurfaceState(props);

  return (
    <div className="grid gap-3">
      {renderGoalStatusNotices(
        props,
        surface.isInitialLoading,
        surface.isUnavailable,
        editor.formMode !== null
      )}
      {editor.formMode ? (
        <PracticeGoalEditor
          key={
          editor.formMode.kind === "create"
            ? `create-${editor.editorVersion}`
            : `edit-${editor.formMode.goal.id}-${editor.editorVersion}`
          }
          mode={editor.formMode}
          externallySaving={props.mutationStatus === "saving"}
          mutationErrorMessage={props.mutationErrorMessage}
          savePracticeGoal={props.savePracticeGoal}
          createPracticeGoalId={props.createPracticeGoalId}
          onClose={editor.close}
        />
      ) : null}
      {surface.isEmpty ? (
        <div
          className="rounded-md border border-border bg-muted px-3 py-3 text-sm leading-6 text-muted-foreground"
        >
          No local goals yet.
        </div>
      ) : null}
      {renderPracticeGoalsList(props, editor, deletion)}
    </div>
  );
}

function getGoalSurfaceState(props: PracticeGoalsPanelProps) {
  const isInitialLoading = props.status === "loading" && props.goals.length === 0;
  const isUnavailable = ![
    props.status !== "idle",
    props.goals.length > 0,
    props.evaluations.length > 0,
    Boolean(props.savePracticeGoal),
    Boolean(props.deletePracticeGoal)
  ].some(Boolean);

  return {
    isInitialLoading,
    isUnavailable,
    isEmpty: props.goals.length === 0 &&
    !isInitialLoading &&
    !isUnavailable &&
    props.status !== "error"
  };
}

function renderGoalStatusNotices(
  props: PracticeGoalsPanelProps,
  isInitialLoading: boolean,
  isUnavailable: boolean,
  isEditorOpen: boolean
) {
  return (
    <>
      {renderGoalReadNotice(props, isInitialLoading, isUnavailable)}
      {props.progressStatus === "error" && props.goals.length > 0 ? (
        renderGoalNotice(
          props.progressErrorMessage ?? "Goal progress could not be loaded.",
          true,
          "practice-goals-progress-error"
        )
      ) : null}
      {(props.mutationErrorMessage ?? "") === "" || isEditorOpen ? null : (
        renderGoalNotice(
          props.mutationErrorMessage,
          true,
          "practice-goals-mutation-error"
        )
      )}
    </>
  );
}

function renderGoalReadNotice(
  props: PracticeGoalsPanelProps,
  isInitialLoading: boolean,
  isUnavailable: boolean
) {
  if (isInitialLoading) {
    return renderGoalNotice("Loading practice goals.");
  }

  if (props.status === "error" || isUnavailable) {
    return renderGoalNotice(
      props.errorMessage ?? "Practice goals could not be loaded.",
      true
    );
  }

  return props.status === "loading"
    ? renderGoalNotice("Refreshing practice goals.")
    : null;
}

function renderPracticeGoalsList(
  props: PracticeGoalsPanelProps,
  editor: PracticeGoalEditorController,
  deletion: PracticeGoalDeletionController
) {
  if (props.goals.length === 0) {
    return null;
  }

  const evaluationsByGoalId = new Map(
    props.evaluations.map((evaluation) => [evaluation.goalId, evaluation])
  );

  return (
    <ul className="divide-y divide-border" aria-label="Local practice goals">
      {props.goals.map((goal) =>
        renderPracticeGoalRow(
          goal,
          evaluationsByGoalId.get(goal.id) ?? null,
          editor,
          deletion
        )
      )}
    </ul>
  );
}

function renderGoalNotice(
  children: ReactNode,
  isError = false,
  testId?: string
) {
  return (
    <div
      role="status"
      data-testid={testId}
      className={
        isError
          ? "rounded-md border border-destructive/30 bg-destructive/5 px-3 py-3 text-sm leading-6 text-destructive"
          : "rounded-md border border-border bg-muted px-3 py-3 text-sm leading-6 text-muted-foreground"
      }
    >
      {children}
    </div>
  );
}

function renderPracticeGoalRow(
  goal: LocalPracticeGoal,
  evaluation: GoalCompletionEvaluation | null,
  editor: PracticeGoalEditorController,
  deletion: PracticeGoalDeletionController
) {
  const isConfirmingDelete = deletion.confirmDeleteGoalId === goal.id;

  return (
    <li
      key={goal.id}
      data-testid="practice-goal-row"
      className="grid gap-3 py-3 first:pt-0 last:pb-0"
    >
      {renderPracticeGoalSummary(goal, evaluation, editor, deletion)}
      {isConfirmingDelete ? (
        renderPracticeGoalDeleteConfirmation(goal, deletion)
      ) : null}
    </li>
  );
}

function renderPracticeGoalSummary(
  goal: LocalPracticeGoal,
  evaluation: GoalCompletionEvaluation | null,
  editor: PracticeGoalEditorController,
  deletion: PracticeGoalDeletionController
) {
  const status = getGoalEvaluationStatus(evaluation);
  const progressRatio = evaluation
    ? clampGoalProgressRatio(evaluation.progressRatio)
    : 0;

  return (
    <div className="flex min-w-0 items-start gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <p className="min-w-0 break-words text-sm font-semibold leading-5">
            {getPracticeGoalLabel(goal)}
          </p>
          <span
            className={`rounded-md border px-2 py-0.5 text-xs font-medium leading-5 ${status.className}`}
          >
            {status.label}
          </span>
        </div>
        <p
          data-testid="practice-goal-progress"
          className="mt-1 break-words text-xs leading-5 text-muted-foreground"
        >
          {formatPracticeGoalProgress(goal, evaluation)}
        </p>
        <div
          className="mt-2 h-2 overflow-hidden rounded-md bg-muted"
          aria-hidden="true"
        >
          <div
            className="h-full bg-primary"
            style={{ width: `${progressRatio * 100}%` }}
          />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="Edit goal"
          aria-label="Edit goal"
          onClick={() => {
            editor.open({ kind: "edit", goal });
          }}
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="Delete goal"
          aria-label="Delete goal"
          onClick={() => {
            deletion.request(goal.id);
          }}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

function renderPracticeGoalDeleteConfirmation(
  goal: LocalPracticeGoal,
  deletion: PracticeGoalDeletionController
) {
  const errorMessage = deletion.deletionErrorMessage;

  return (
    <div
      role="group"
      aria-label={`Confirm delete ${getPracticeGoalLabel(goal)}`}
      data-testid="practice-goal-delete-confirm"
      className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-3"
    >
      <p className="text-sm leading-6 text-destructive">Delete this goal?</p>
      {errorMessage === null || errorMessage === "" ? null : (
        <p className="mt-1 text-xs leading-5 text-destructive">
          {errorMessage}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={deletion.isDeleting}
          onClick={deletion.cancel}
        >
          Cancel
        </Button>
        <Button
          type="button"
          disabled={deletion.isDeleting}
          data-testid="practice-goal-delete-confirm-button"
          aria-label="Confirm delete goal"
          onClick={() => {
            deletion.confirm(goal).catch(() => undefined);
          }}
        >
          {deletion.isDeleting ? "Deleting" : "Delete goal"}
        </Button>
      </div>
    </div>
  );
}

function getPracticeGoalLabel(goal: LocalPracticeGoal) {
  const period = goal.period === "today" ? "Today" : "All-time";
  const kind = goal.kind === "minutes"
    ? "practice minutes"
    : goal.kind === "sessions"
      ? "sessions"
      : "sheet takes";

  return `${period} ${kind}`;
}

function getGoalEvaluationStatus(evaluation: GoalCompletionEvaluation | null) {
  const status = evaluation?.status ?? "unavailable";
  const label = status === "not-started" ? "Not started"
    : status === "in-progress" ? "In progress"
      : status.charAt(0).toUpperCase() + status.slice(1);
  const className = status === "invalid"
    ? "border-destructive/30 bg-destructive/5 text-destructive"
    : status === "completed"
      ? "border-border bg-primary/20 text-foreground"
      : status === "in-progress"
        ? "border-border bg-muted text-foreground"
        : "border-border bg-muted text-muted-foreground";

  return { label, className };
}

function formatPracticeGoalProgress(
  goal: LocalPracticeGoal,
  evaluation: GoalCompletionEvaluation | null
) {
  if (!evaluation) {
    return "Progress unavailable.";
  }

  if (evaluation.status === "invalid") {
    return "Progress unavailable.";
  }

  if (evaluation.target === null) {
    return "Progress unavailable.";
  }

  const plurality = evaluation.target === 1 ? 0 : 1;
  const unit = practiceGoalUnits[goal.kind][plurality];
  const progress = Number.isFinite(evaluation.progress)
    ? Math.max(0, Math.floor(evaluation.progress))
    : 0;

  return `${progress} / ${evaluation.target} ${unit}`;
}

function clampGoalProgressRatio(value: number) {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}
