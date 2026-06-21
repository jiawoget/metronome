"use client";

import {
  ChevronDown,
  ChevronUp,
  Circle,
  Play,
  Radio,
  Square,
  Timer
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { formatPracticeDuration, type PracticeSession, type SheetRecordingMetadata } from "@/domain/practice";
import { browserPracticeSessionService } from "@/infrastructure/db/browser-practice-session-service";
import {
  ACCENT_MODES,
  COUNTDOWN_OPTIONS,
  SUBDIVISIONS,
  TIME_SIGNATURES,
  clampBpm,
  getTickIntervalMs,
  parseAccentMode,
  parseCountdownBeats,
  parseSubdivision,
  parseTimeSignature
} from "@/lib/quick-metronome/control";
import { BrowserMetronomeService, type MetronomeTick } from "@/lib/quick-metronome/metronome-service";
import {
  MAX_BPM,
  MIN_BPM,
  type AccentMode,
  type MetronomeSettings,
  type Subdivision
} from "@/lib/quick-metronome/types";
import { useMetronomeBpmDraft } from "@/lib/quick-metronome/use-bpm-draft";
import { useMetronomeTransport } from "@/lib/quick-metronome/use-metronome-transport";
import type { PracticeSessionService } from "@/services/practice-session";
import { Button } from "@/components/ui/button";
import {
  createSheetPracticeControlInitialState,
  formatUnsupportedTimeSignatureMessage
} from "@/components/sheet-practice/controls/practice-control-state";

export const SHEET_RECORDING_HARNESS_EVENT = "sheet-practice-controls:set-recording-harness-active";

type SheetPracticeMetronomeService = Pick<BrowserMetronomeService, "onTick" | "update" | "start" | "stop">;

type SheetPracticeSessionService = Pick<
  PracticeSessionService,
  | "ensureSheetSession"
  | "updateSheetSessionDuration"
  | "endPracticeSession"
  | "getRecentSession"
  | "getRecentSheetSession"
  | "listRecordingMetadata"
  | "subscribe"
>;

type SheetMetronomeStartContext = {
  session: PracticeSession;
  ownsMetronomeOnlySession: boolean;
};

type SheetPracticeControlsProps = {
  sheetId: string;
  sheetName: string;
  defaultBpm: number | null;
  defaultTimeSignature: string | null;
  createMetronomeService?: () => SheetPracticeMetronomeService;
  sessionService?: SheetPracticeSessionService;
};

const subdivisionLabels: Record<Subdivision, string> = {
  quarter: "Quarter",
  eighth: "Eighth",
  triplet: "Triplet",
  sixteenth: "Sixteenth"
};

const accentLabels: Record<AccentMode, string> = {
  downbeat: "Downbeat",
  "every-beat": "Every beat",
  off: "Off"
};

function createBrowserMetronomeService() {
  return new BrowserMetronomeService();
}

export function SheetPracticeControls({
  sheetId,
  sheetName,
  defaultBpm,
  defaultTimeSignature,
  createMetronomeService = createBrowserMetronomeService,
  sessionService = browserPracticeSessionService
}: SheetPracticeControlsProps) {
  const initialState = useMemo(
    () =>
      createSheetPracticeControlInitialState({
        bpm: defaultBpm,
        timeSignature: defaultTimeSignature
      }),
    [defaultBpm, defaultTimeSignature]
  );
  const metronomeService = useMemo(() => createMetronomeService(), [createMetronomeService]);
  const [settings, setSettings] = useState<MetronomeSettings>(initialState.settings);
  const [recordingHarnessActive, setRecordingHarnessActive] = useState(false);
  const [lastTick, setLastTick] = useState<MetronomeTick | null>(null);
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [recordings, setRecordings] = useState<SheetRecordingMetadata[]>([]);
  const [message, setMessage] = useState("Ready. Viewing the sheet has not started practice.");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const unsupportedTimeSignatureMessage = initialState.unsupportedTimeSignature
    ? formatUnsupportedTimeSignatureMessage(initialState.unsupportedTimeSignature)
    : null;

  const refreshSession = useCallback(async () => {
    const recentSession = await sessionService.getRecentSession();
    const allRecordings = await sessionService.listRecordingMetadata();

    setSession(recentSession?.sourceType === "sheet" && recentSession.sheetId === sheetId ? recentSession : null);
    setRecordings(allRecordings.filter((recording) => recording.sheetId === sheetId));
  }, [sessionService, sheetId]);

  useEffect(() => {
    const unsubscribe = metronomeService.onTick((tick) => {
      setLastTick(tick);
    });

    return () => {
      unsubscribe();
    };
  }, [metronomeService]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshSession();
    }, 0);
    const unsubscribe = sessionService.subscribe(() => {
      void refreshSession();
    });

    return () => {
      window.clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [refreshSession, sessionService]);

  function updateSettings(nextSettings: Partial<MetronomeSettings>) {
    setSettings((currentSettings) => ({
      ...currentSettings,
      ...nextSettings,
      bpm:
        nextSettings.bpm === undefined
          ? currentSettings.bpm
          : clampBpm(nextSettings.bpm)
    }));
  }

  const { bpmDraft, setBpmDraft, commitBpmInput, stepBpmInput } = useMetronomeBpmDraft(
    settings.bpm,
    (nextBpm) => updateSettings({ bpm: nextBpm })
  );

  const ensureMetronomeSession = useCallback(async (): Promise<SheetMetronomeStartContext | null> => {
    const existingSheetSession = await sessionService.getRecentSheetSession(sheetId);
    const nextSession = await sessionService.ensureSheetSession({
        sheetId,
        trigger: "metronome",
        bpm: settings.bpm,
        timeSignature: settings.timeSignature
      });

    if (!nextSession) {
      return null;
    }

    return {
      session: nextSession,
      ownsMetronomeOnlySession: existingSheetSession === null
    };
  }, [sessionService, settings.bpm, settings.timeSignature, sheetId]);
  const handleCountdownStarted = useCallback(() => {
    setMessage("Countdown running.");
  }, []);
  const handleStartBlocked = useCallback(() => {
    setMessage("No valid sheet context. Metronome was stopped.");
  }, []);
  const handleStarted = useCallback(
    (context: SheetMetronomeStartContext | null) => {
      setSession(context?.session ?? null);
      setMessage(recordingHarnessActive ? "Metronome playing; recording harness stays active." : "Metronome playing.");
    },
    [recordingHarnessActive]
  );
  const handleStartFailed = useCallback(
    async (error: unknown, context: SheetMetronomeStartContext | null) => {
      if (context?.ownsMetronomeOnlySession) {
        const endedSession = await sessionService.endPracticeSession(context.session.id);

        setSession(endedSession);
      } else if (context?.session) {
        setSession(context.session);
      }

      setErrorMessage(error instanceof Error ? error.message : "Metronome playback failed.");
    },
    [sessionService]
  );
  const handleStopped = useCallback(async () => {
    if (session) {
      const nextSession = recordingHarnessActive
        ? await sessionService.updateSheetSessionDuration(session.id)
        : await sessionService.endPracticeSession(session.id);

      setSession(nextSession);
    }

    setMessage(
      recordingHarnessActive
        ? "Metronome stopped; recording harness stays active."
        : "Metronome stopped."
    );
  }, [recordingHarnessActive, session, sessionService]);
  const {
    transportState,
    countdownRemaining,
    isPlaying,
    isCounting,
    startMetronome,
    stopMetronome
  } = useMetronomeTransport({
    settings,
    metronomeService,
    beforeStart: ensureMetronomeSession,
    onCountdownStarted: handleCountdownStarted,
    onStartBlocked: handleStartBlocked,
    onStarted: handleStarted,
    onStartFailed: handleStartFailed,
    onStopped: handleStopped
  });
  const handleStartMetronome = useCallback(() => {
    setErrorMessage(null);
    void startMetronome();
  }, [startMetronome]);
  const arePreRunSettingsLocked = isPlaying || isCounting;

  useEffect(() => {
    const harnessWindow = window as Window & {
      __sheetPracticeControlsTestHarness?: boolean;
    };

    if (harnessWindow.__sheetPracticeControlsTestHarness !== true) {
      return;
    }

    const handleRecordingHarnessEvent = (event: Event) => {
      const active = Boolean((event as CustomEvent<{ active?: boolean }>).detail?.active);

      setRecordingHarnessActive(active);
      setMessage(
        active
          ? transportState === "playing"
            ? "Recording harness active while metronome plays."
            : "Recording harness active."
          : transportState === "playing"
            ? "Recording harness stopped; metronome keeps playing."
            : "Recording harness stopped."
      );

      if (!active && transportState !== "playing" && session) {
        void sessionService.endPracticeSession(session.id).then((nextSession) => {
          setSession(nextSession);
        });
      }
    };

    window.addEventListener(SHEET_RECORDING_HARNESS_EVENT, handleRecordingHarnessEvent);

    return () => {
      window.removeEventListener(SHEET_RECORDING_HARNESS_EVENT, handleRecordingHarnessEvent);
    };
  }, [session, sessionService, transportState]);

  return (
    <section
      aria-labelledby="sheet-practice-controls-title"
      data-testid="sheet-practice-controls"
      className="shrink-0 rounded-lg border border-border bg-card shadow-soft"
    >
      <div className="grid gap-3 p-3 lg:grid-cols-[minmax(16rem,0.9fr)_minmax(22rem,1.35fr)_minmax(16rem,0.9fr)] lg:items-stretch">
        <div className="flex min-w-0 flex-col justify-between gap-3 rounded-md border border-border bg-muted p-3">
          <div>
            <h2 id="sheet-practice-controls-title" className="text-lg font-semibold tracking-normal">
              Practice Controls
            </h2>
            <p className="mt-1 truncate text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {sheetName}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <StatusTile label="Metronome" value={isCounting ? `Counting ${countdownRemaining}` : isPlaying ? "Playing" : "Stopped"} testId="sheet-metronome-state" />
            <StatusTile label="Recording" value={recordingHarnessActive ? "active" : "stopped"} testId="sheet-recording-state" />
            <StatusTile label="Session" value={session?.sourceType ?? "none"} testId="sheet-session-source" />
            <StatusTile label="Sheet" value={session?.sheetId ?? sheetId} testId="sheet-session-sheet-id" />
            <StatusTile label="Duration" value={session ? formatPracticeDuration(session.durationMs) : "0:00"} testId="sheet-session-duration" />
          </div>
        </div>

        <div className="grid gap-3 rounded-md border border-border bg-background p-3 md:grid-cols-[minmax(13rem,0.85fr)_1fr]">
          <div>
            <label htmlFor="sheet-bpm" className="text-sm font-medium">
              BPM
            </label>
            <div className="mt-2 grid grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] gap-2">
              <Button type="button" variant="secondary" size="icon" aria-label="Decrease BPM" onClick={() => stepBpmInput(-1)}>
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              </Button>
              <input
                id="sheet-bpm"
                aria-label="BPM"
                type="number"
                min={MIN_BPM}
                max={MAX_BPM}
                step={1}
                value={bpmDraft}
                onChange={(event) => setBpmDraft(event.target.value)}
                onBlur={commitBpmInput}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    commitBpmInput();
                    event.currentTarget.blur();
                  }
                }}
                className="h-10 min-w-0 rounded-md border border-border bg-background px-2 text-center text-lg font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button type="button" variant="secondary" size="icon" aria-label="Increase BPM" onClick={() => stepBpmInput(1)}>
                <ChevronUp className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Tick interval {Math.round(getTickIntervalMs(settings))} ms.
            </p>
          </div>

          {unsupportedTimeSignatureMessage ? (
            <p
              role="status"
              className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 md:col-span-2"
            >
              {unsupportedTimeSignatureMessage}
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-3">
            <LabeledSelect
              label="Time signature"
              value={settings.timeSignature}
              disabled={arePreRunSettingsLocked}
              onChange={(value) => updateSettings({ timeSignature: parseTimeSignature(value) })}
              options={TIME_SIGNATURES.map((timeSignature) => ({
                value: timeSignature,
                label: timeSignature
              }))}
            />
            <LabeledSelect
              label="Subdivision"
              value={settings.subdivision}
              disabled={arePreRunSettingsLocked}
              onChange={(value) => updateSettings({ subdivision: parseSubdivision(value) })}
              options={SUBDIVISIONS.map((subdivision) => ({
                value: subdivision,
                label: subdivisionLabels[subdivision]
              }))}
            />
            <LabeledSelect
              label="Countdown"
              value={String(settings.countdownBeats)}
              disabled={arePreRunSettingsLocked}
              onChange={(value) => updateSettings({ countdownBeats: parseCountdownBeats(value) })}
              options={COUNTDOWN_OPTIONS.map((beats) => ({
                value: String(beats),
                label: beats === 0 ? "Off" : `${beats} beats`
              }))}
            />
          </div>

          {arePreRunSettingsLocked ? (
            <p role="status" className="text-sm leading-6 text-muted-foreground md:col-span-2">
              Meter, subdivision, accent, and countdown are locked while the metronome is running. Stop playback to change them.
            </p>
          ) : null}

          <div className="md:col-span-2">
            <p className="text-sm font-medium">Accent</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {ACCENT_MODES.map((accentMode) => (
                <Button
                  key={accentMode}
                  type="button"
                  variant={settings.accent === accentMode ? "default" : "secondary"}
                  aria-pressed={settings.accent === accentMode}
                  disabled={arePreRunSettingsLocked}
                  onClick={() => updateSettings({ accent: parseAccentMode(accentMode) })}
                >
                  <Circle className="h-4 w-4" aria-hidden="true" />
                  {accentLabels[accentMode]}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-col justify-between gap-3 rounded-md border border-border bg-background p-3">
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" onClick={handleStartMetronome} disabled={isPlaying || isCounting} aria-label="Start metronome">
              <Play className="h-4 w-4" aria-hidden="true" />
              Play
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void stopMetronome()}
              disabled={transportState === "stopped"}
              aria-label="Stop metronome"
            >
              <Square className="h-4 w-4" aria-hidden="true" />
              Stop
            </Button>
          </div>

          <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <StatusTile label="Last tick" value={lastTick ? `#${lastTick.tickIndex + 1}` : "None"} testId="sheet-last-tick" />
            <StatusTile label="Accent tick" value={lastTick?.accented ? "Yes" : "No"} testId="sheet-accent-tick" />
            <StatusTile label="Session id" value={session?.id ?? "none"} testId="sheet-session-id" />
            <StatusTile label="Recordings" value={String(recordings.length)} testId="sheet-recording-count" />
          </div>

          <div aria-live="polite" className="rounded-md border border-border bg-muted px-3 py-2 text-sm">
            <div className="flex items-start gap-2">
              <Radio className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              <p className="font-medium">{message}</p>
            </div>
            {errorMessage ? (
              <p role="alert" className="mt-2 font-medium text-destructive">
                {errorMessage}
              </p>
            ) : null}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-border px-3 py-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Timer className="h-3.5 w-3.5" aria-hidden="true" />
          Defaults: {initialState.settings.bpm} BPM, {initialState.settings.timeSignature}
        </span>
      </div>
    </section>
  );
}

function LabeledSelect({
  label,
  value,
  onChange,
  options,
  disabled = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  const id = `sheet-${label.toLowerCase().replaceAll(" ", "-")}`;

  return (
    <div className="min-w-0">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <select
        id={id}
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function StatusTile({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <div className="min-w-0 rounded-md border border-border bg-muted px-3 py-2">
      <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-semibold" data-testid={testId}>
        {value}
      </p>
    </div>
  );
}
