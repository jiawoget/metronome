"use client";

import { Mic, Music2, Radio, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { formatPracticeDuration, type PracticeSession, type SheetRecordingMetadata } from "@/domain/practice";
import { browserPracticeSessionService } from "@/infrastructure/db/browser-practice-session-service";
import { Button } from "@/components/ui/button";

type SheetPracticeSessionHarnessProps = {
  sheetId: string;
};

export function SheetPracticeSessionHarness({ sheetId }: SheetPracticeSessionHarnessProps) {
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [recordings, setRecordings] = useState<SheetRecordingMetadata[]>([]);
  const [metronomeActive, setMetronomeActive] = useState(false);
  const [recordingActive, setRecordingActive] = useState(false);
  const [message, setMessage] = useState("Viewing only. No practice session has started.");
  const recordingStartedAtRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    const recentSession = await browserPracticeSessionService.getRecentSession();
    const allRecordings = await browserPracticeSessionService.listRecordingMetadata();

    setSession(recentSession?.sourceType === "sheet" && recentSession.sheetId === sheetId ? recentSession : null);
    setRecordings(allRecordings.filter((recording) => recording.sheetId === sheetId));
  }, [sheetId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refresh();
    }, 0);
    const unsubscribe = browserPracticeSessionService.subscribe(() => {
      void refresh();
    });

    return () => {
      window.clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [refresh]);

  async function startMetronomeTrigger() {
    const nextSession = await browserPracticeSessionService.ensureSheetSession({
      sheetId,
      trigger: "metronome"
    });

    if (!nextSession) {
      setMessage("No valid sheet context. Session was not created.");
      return;
    }

    setSession(nextSession);
    setMetronomeActive(true);
    setMessage(recordingActive ? "Metronome trigger started while recording stays active." : "Metronome trigger started.");
  }

  async function stopMetronomeTrigger() {
    if (session) {
      const nextSession = recordingActive
        ? await browserPracticeSessionService.updateSheetSessionDuration(session.id)
        : await browserPracticeSessionService.endPracticeSession(session.id);

      setSession(nextSession);
    }

    setMetronomeActive(false);
    setMessage(recordingActive ? "Metronome trigger stopped; recording stays active." : "Metronome trigger stopped.");
  }

  async function startRecordingTrigger() {
    const nextSession = await browserPracticeSessionService.ensureSheetSession({
      sheetId,
      trigger: "recording"
    });

    if (!nextSession) {
      setMessage("No valid sheet context. Session was not created.");
      return;
    }

    recordingStartedAtRef.current = performance.now();
    setSession(nextSession);
    setRecordingActive(true);
    setMessage(metronomeActive ? "Recording trigger started while metronome stays active." : "Recording trigger started.");
  }

  async function stopRecordingTrigger() {
    const durationMs =
      recordingStartedAtRef.current === null ? 0 : Math.max(0, performance.now() - recordingStartedAtRef.current);
    const recording = await browserPracticeSessionService.createSheetRecordingMetadata({
      sheetId,
      durationMs
    });

    recordingStartedAtRef.current = null;
    setRecordingActive(false);

    if (!recording) {
      setMessage("No valid sheet context. Recording metadata was not created.");
      return;
    }

    await refresh();

    if (!metronomeActive) {
      const recentSession = await browserPracticeSessionService.getRecentSession();

      if (recentSession?.sourceType === "sheet" && recentSession.sheetId === sheetId) {
        setSession(await browserPracticeSessionService.endPracticeSession(recentSession.id));
      }
    }

    setMessage(metronomeActive ? "Recording metadata saved; metronome stays active." : "Recording metadata saved.");
  }

  return (
    <section
      aria-labelledby="sheet-session-title"
      className="mx-auto mb-4 flex w-full max-w-7xl flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-soft"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            05e Session Integration
          </p>
          <h2 id="sheet-session-title" className="mt-1 text-lg font-semibold tracking-normal">
            Sheet Practice Session
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={startMetronomeTrigger} disabled={metronomeActive}>
            <Music2 className="h-4 w-4" aria-hidden="true" />
            Start metronome trigger
          </Button>
          <Button type="button" variant="secondary" onClick={stopMetronomeTrigger} disabled={!metronomeActive}>
            <Square className="h-4 w-4" aria-hidden="true" />
            Stop metronome trigger
          </Button>
          <Button type="button" variant="secondary" onClick={startRecordingTrigger} disabled={recordingActive}>
            <Mic className="h-4 w-4" aria-hidden="true" />
            Start recording trigger
          </Button>
          <Button type="button" variant="secondary" onClick={stopRecordingTrigger} disabled={!recordingActive}>
            <Square className="h-4 w-4" aria-hidden="true" />
            Stop recording trigger
          </Button>
        </div>
      </div>

      <div className="grid gap-3 text-sm md:grid-cols-4">
        <div className="rounded-md border border-border bg-muted px-3 py-2">
          <p className="text-xs font-medium text-muted-foreground">Session</p>
          <p data-testid="sheet-session-id" className="mt-1 font-medium">
            {session?.id ?? "none"}
          </p>
        </div>
        <div className="rounded-md border border-border bg-muted px-3 py-2">
          <p className="text-xs font-medium text-muted-foreground">Source</p>
          <p data-testid="sheet-session-source" className="mt-1 font-medium">
            {session?.sourceType ?? "none"}
          </p>
        </div>
        <div className="rounded-md border border-border bg-muted px-3 py-2">
          <p className="text-xs font-medium text-muted-foreground">Sheet</p>
          <p data-testid="sheet-session-sheet-id" className="mt-1 truncate font-medium">
            {session?.sheetId ?? sheetId}
          </p>
        </div>
        <div className="rounded-md border border-border bg-muted px-3 py-2">
          <p className="text-xs font-medium text-muted-foreground">Duration</p>
          <p data-testid="sheet-session-duration" className="mt-1 font-medium">
            {session ? formatPracticeDuration(session.durationMs) : "0:00"}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 text-sm md:flex-row md:items-center md:justify-between">
        <p aria-live="polite" className="text-muted-foreground">
          {message}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <span data-testid="sheet-metronome-state" className="inline-flex items-center gap-1 font-medium">
            <Radio className="h-4 w-4" aria-hidden="true" />
            Metronome {metronomeActive ? "active" : "stopped"}
          </span>
          <span data-testid="sheet-recording-state" className="inline-flex items-center gap-1 font-medium">
            <Mic className="h-4 w-4" aria-hidden="true" />
            Recording {recordingActive ? "active" : "stopped"}
          </span>
          <span data-testid="sheet-recording-count" className="font-medium">
            Recording metadata {recordings.length}
          </span>
        </div>
      </div>
    </section>
  );
}
