"use client";

import { useMemo, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  HomeSessionComparisonCandidate,
  HomeSessionComparisonData,
  PracticeSessionDashboardSessionComparisonStatus
} from "@/hooks/use-practice-session-dashboard";

type SessionComparisonMetric = {
  key: keyof Pick<
    HomeSessionComparisonCandidate,
    | "sourceTypeLabel"
    | "startedText"
    | "updatedText"
    | "durationText"
    | "bpmText"
    | "timeSignatureText"
    | "recordingsText"
    | "sheetText"
    | "segmentText"
    | "goalContributionText"
    | "eventText"
  >;
  label: string;
};

const metrics: SessionComparisonMetric[] = [
  { key: "sourceTypeLabel", label: "Session type" },
  { key: "startedText", label: "Started" },
  { key: "updatedText", label: "Last updated" },
  { key: "durationText", label: "Duration" },
  { key: "bpmText", label: "BPM" },
  { key: "timeSignatureText", label: "Time signature" },
  { key: "recordingsText", label: "Recordings" },
  { key: "sheetText", label: "Sheet" },
  { key: "segmentText", label: "Segment" },
  { key: "goalContributionText", label: "Goal contribution" },
  { key: "eventText", label: "Events" }
];

export function SessionComparisonPanel({
  comparison,
  status,
  errorMessage
}: {
  comparison: HomeSessionComparisonData;
  status: PracticeSessionDashboardSessionComparisonStatus;
  errorMessage: string | null;
}) {
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
  const candidatesById = useMemo(
    () => new Map(comparison.candidates.map((candidate) => [candidate.sessionId, candidate])),
    [comparison.candidates]
  );
  const validSelectedSessionIds = selectedSessionIds.filter((sessionId) => candidatesById.has(sessionId));
  const selectedCandidates = validSelectedSessionIds
    .map((sessionId) => candidatesById.get(sessionId))
    .filter((candidate): candidate is HomeSessionComparisonCandidate => Boolean(candidate));
  const isInitialLoading = status === "loading" && comparison.candidates.length === 0;
  const hasMaxSelected = validSelectedSessionIds.length >= comparison.maxSelected;

  function toggleCandidate(sessionId: string) {
    setSelectedSessionIds((currentIds) => {
      const currentValidIds = currentIds.filter((currentId) => candidatesById.has(currentId));

      if (currentValidIds.includes(sessionId)) {
        return currentIds.filter((currentId) => currentId !== sessionId);
      }

      if (currentValidIds.length >= comparison.maxSelected) {
        return currentValidIds;
      }

      return [...currentValidIds, sessionId];
    });
  }

  return (
    <Card role="region" aria-labelledby="session-comparison-title" data-testid="session-comparison-panel">
      <CardHeader>
        <CardTitle id="session-comparison-title">Session Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        {isInitialLoading ? (
          <div
            role="status"
            className="rounded-md border border-border bg-muted px-3 py-3 text-sm leading-6 text-muted-foreground"
          >
            Loading session comparison.
          </div>
        ) : status === "error" ? (
          <div
            role="status"
            className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-3 text-sm leading-6 text-destructive"
          >
            {errorMessage ?? "Session comparison could not be loaded."}
          </div>
        ) : comparison.candidates.length === 0 ? (
          <div className="rounded-md border border-border bg-muted px-3 py-3 text-sm leading-6 text-muted-foreground">
            No local sessions yet.
          </div>
        ) : (
          <div className="space-y-4">
            <fieldset>
              <legend className="text-sm font-semibold">Select sessions to compare</legend>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Up to 3 sessions can be compared.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {comparison.candidates.map((candidate) => {
                  const isSelected = validSelectedSessionIds.includes(candidate.sessionId);
                  const isDisabled = !isSelected && hasMaxSelected;

                  return (
                    <label
                      key={candidate.sessionId}
                      className={`flex min-w-0 items-start gap-3 rounded-md border px-3 py-2 text-sm leading-5 ${
                        isDisabled
                          ? "border-border bg-muted text-muted-foreground"
                          : "border-border bg-card text-foreground"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={isDisabled}
                        onChange={() => toggleCandidate(candidate.sessionId)}
                        aria-label={`Compare ${candidate.sourceTypeLabel} ${candidate.label}`}
                        className="mt-1 h-4 w-4 shrink-0 accent-primary"
                      />
                      <span className="min-w-0">
                        <span className="block break-words font-medium">{candidate.label}</span>
                        <span className="mt-1 block break-words text-xs text-muted-foreground">
                          {candidate.durationText} · {candidate.recordingsText}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {selectedCandidates.length === 0 ? (
              <p className="rounded-md border border-border bg-muted px-3 py-3 text-sm leading-6 text-muted-foreground">
                Select sessions to compare.
              </p>
            ) : selectedCandidates.length === 1 ? (
              <p className="rounded-md border border-border bg-muted px-3 py-3 text-sm leading-6 text-muted-foreground">
                Select another session to compare.
              </p>
            ) : (
              <div className="overflow-hidden rounded-md border border-border">
                <div className="grid gap-2 bg-muted px-3 py-3 md:grid-cols-[9rem_repeat(3,minmax(0,1fr))]">
                  <p className="text-xs font-semibold leading-5 text-muted-foreground">
                    Selected sessions
                  </p>
                  {selectedCandidates.map((candidate, candidateIndex) => (
                    <div key={candidate.sessionId} className="min-w-0">
                      <h3
                        id={getSelectedSessionHeadingId(candidateIndex)}
                        className="break-words text-sm font-semibold leading-6 text-foreground"
                      >
                        {candidate.label}
                      </h3>
                      <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">
                        {candidate.sourceTypeLabel}
                      </p>
                    </div>
                  ))}
                </div>
                <dl aria-label="Selected session metadata">
                {metrics.map((metric) => (
                  <div
                    key={metric.key}
                    className="grid gap-2 border-t border-border px-3 py-3 md:grid-cols-[9rem_repeat(3,minmax(0,1fr))]"
                  >
                    <dt
                      id={getMetricLabelId(metric.key)}
                      className="text-xs font-semibold leading-5 text-muted-foreground"
                    >
                      {metric.label}
                    </dt>
                    {selectedCandidates.map((candidate, candidateIndex) => (
                      <dd
                        key={`${candidate.sessionId}-${metric.key}`}
                        aria-labelledby={`${getSelectedSessionHeadingId(candidateIndex)} ${getMetricLabelId(metric.key)}`}
                        className="min-w-0 break-words text-sm leading-6 text-foreground"
                      >
                        {candidate[metric.key]}
                      </dd>
                    ))}
                  </div>
                ))}
              </dl>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getSelectedSessionHeadingId(index: number) {
  return `session-comparison-selected-${index}`;
}

function getMetricLabelId(key: SessionComparisonMetric["key"]) {
  return `session-comparison-metric-${key}`;
}
