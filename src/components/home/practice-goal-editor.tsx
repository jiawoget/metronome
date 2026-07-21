"use client";

import { X } from "lucide-react";
import { useState, type SyntheticEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  parsePracticeGoalDraft,
  type PracticeGoalDraftErrorCode,
  type LocalPracticeGoal
} from "@/domain/practice";
import type { PracticeSessionDashboardActions } from "@/hooks/use-practice-session-dashboard";

export type PracticeGoalFormMode =
  | { kind: "create" }
  | { kind: "edit"; goal: LocalPracticeGoal };

type PracticeGoalEditorProps = {
  mode: PracticeGoalFormMode;
  externallySaving: boolean;
  mutationErrorMessage: string | null;
  savePracticeGoal?: PracticeSessionDashboardActions["savePracticeGoal"];
  createPracticeGoalId?: () => string;
  onClose: () => void;
};

const practiceGoalDraftErrorMessages: Record<
  PracticeGoalDraftErrorCode,
  string
> = {
  "unsupported-kind": "Choose a supported goal kind.",
  "unsupported-period": "Choose a supported goal period.",
  "target-whole-number": "Enter a positive whole-number target.",
  "target-safe-integer": "Enter a positive safe-integer target.",
  "target-too-large": "Enter a target of 1000000 or less."
};

const defaultPracticeGoalFields = {
  kind: "minutes",
  period: "today",
  target: 20
} as const;

export function PracticeGoalEditor({
  mode,
  externallySaving,
  mutationErrorMessage,
  savePracticeGoal,
  createPracticeGoalId,
  onClose
}: PracticeGoalEditorProps) {
  const [targetError, setTargetError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();

    if (mode.kind === "create" && createPracticeGoalId === undefined) {
      setFormError("Practice goals could not be loaded.");
      return;
    }

    try {
      const formData = new FormData(event.currentTarget);
      const parsedDraft = parsePracticeGoalDraft({
        kind: formData.get("kind"),
        period: formData.get("period"),
        targetText: formData.get("target")
      }, {
        baseGoal: mode.kind === "edit" ? mode.goal : null,
        createId: createPracticeGoalId ?? missingPracticeGoalId,
        now: () => new Date()
      });

      if (!parsedDraft.success) {
        setTargetError(practiceGoalDraftErrorMessages[parsedDraft.error.code]);
        return;
      }

      if (savePracticeGoal === undefined) {
        setFormError("Practice goals could not be loaded.");
        return;
      }

      setIsSaving(true);
      setFormError(null);
      await savePracticeGoal(parsedDraft.goal);
      onClose();
    } catch {
      setFormError("Goal could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      aria-label={
        mode.kind === "create" ? "Create practice goal" : "Edit practice goal"
      }
      data-testid="practice-goal-form"
      className="grid gap-3 rounded-md border border-border bg-muted px-3 py-3"
      onSubmit={(event) => {
        void submit(event);
      }}
      onChange={() => {
        setTargetError(null);
        setFormError(null);
      }}
    >
      {renderPracticeGoalFields(mode, targetError)}
      {renderPracticeGoalFormStatusAndActions(
        mode,
        targetError,
        {
          visibleError: formError ?? mutationErrorMessage,
          isSavingGoal: externallySaving || isSaving
        },
        onClose
      )}
    </form>
  );
}

function renderPracticeGoalFields(
  mode: PracticeGoalFormMode,
  targetError: string | null
) {
  const hasTargetError = Boolean(targetError);
  const fields = mode.kind === "edit" ? mode.goal : defaultPracticeGoalFields;

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <label className="grid gap-1 text-xs font-medium text-muted-foreground">
        Goal kind
        <select
          name="kind"
          data-testid="practice-goal-kind"
          className="h-10 rounded-md border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          defaultValue={fields.kind}
        >
          <option value="minutes">Minutes</option>
          <option value="sessions">Sessions</option>
          <option value="takes">Sheet takes</option>
        </select>
      </label>
      <label className="grid gap-1 text-xs font-medium text-muted-foreground">
        Period
        <select
          name="period"
          data-testid="practice-goal-period"
          className="h-10 rounded-md border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          defaultValue={fields.period}
        >
          <option value="today">Today</option>
          <option value="all-time">All-time</option>
        </select>
      </label>
      <label className="grid gap-1 text-xs font-medium text-muted-foreground">
        Target
        <input
          name="target"
          data-testid="practice-goal-target"
          className="h-10 rounded-md border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          inputMode="numeric"
          defaultValue={fields.target}
          aria-invalid={hasTargetError}
          aria-describedby={
            hasTargetError ? "practice-goal-target-error" : undefined
          }
        />
      </label>
    </div>
  );
}

function renderPracticeGoalFormStatusAndActions(
  mode: PracticeGoalFormMode,
  targetError: string | null,
  status: { visibleError: string | null; isSavingGoal: boolean },
  onClose: () => void
) {
  const { visibleError, isSavingGoal } = status;
  const hasTargetError = Boolean(targetError);
  const hasVisibleError = Boolean(visibleError);

  return (
    <>
      {hasTargetError ? (
        <p
          id="practice-goal-target-error"
          className="text-xs leading-5 text-destructive"
        >
          {targetError}
        </p>
      ) : null}
      {hasVisibleError ? (
        <div
          role="status"
          className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-3 text-sm leading-6 text-destructive"
        >
          {visibleError}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="submit"
          disabled={isSavingGoal}
        >
          {isSavingGoal
            ? "Saving"
            : mode.kind === "create"
              ? "Create goal"
              : "Save goal"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
        >
          <X className="h-4 w-4" aria-hidden="true" />
          Cancel
        </Button>
      </div>
    </>
  );
}

function missingPracticeGoalId(): never {
  throw new Error("Practice goal ID provider is unavailable.");
}
