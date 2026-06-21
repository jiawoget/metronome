"use client";

import {
  Activity,
  ChevronDown,
  ChevronUp,
  Circle,
  Mic,
  Octagon,
  Play,
  Radio,
  Square,
  Timer
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { LatestQuickRecording } from "@/components/quick-metronome/latest-quick-recording";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ACCENT_MODES,
  COUNTDOWN_OPTIONS,
  SUBDIVISIONS,
  TIME_SIGNATURES,
  calculateTapTempo,
  clampBpm,
  commitBpmDraft,
  getTickIntervalMs,
  parseAccentMode,
  parseCountdownBeats,
  parseSubdivision,
  parseTimeSignature,
  stepBpm
} from "@/lib/quick-metronome/control";
import { BrowserMetronomeService, type MetronomeTick } from "@/lib/quick-metronome/metronome-service";
import { quickRecordingRepository } from "@/lib/quick-metronome/persistence";
import { BrowserRecordingService, RecordingPermissionError } from "@/lib/quick-metronome/recording-service";
import { createQuickPracticeSession, createQuickRecording } from "@/lib/quick-metronome/session";
import {
  DEFAULT_METRONOME_SETTINGS,
  MAX_BPM,
  MIN_BPM,
  type AccentMode,
  type MetronomeSettings,
  type PracticeSession,
  type Subdivision
} from "@/lib/quick-metronome/types";

type TransportState = "stopped" | "counting" | "playing";
type RecordingState = "idle" | "recording" | "saving";

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

export function QuickMetronomeExperience() {
  const metronomeService = useMemo(() => new BrowserMetronomeService(), []);
  const recordingService = useMemo(() => new BrowserRecordingService(), []);
  const [settings, setSettings] = useState<MetronomeSettings>(DEFAULT_METRONOME_SETTINGS);
  const [transportState, setTransportState] = useState<TransportState>("stopped");
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [currentSession, setCurrentSession] = useState<PracticeSession | null>(null);
  const [countdownRemaining, setCountdownRemaining] = useState(0);
  const [lastTick, setLastTick] = useState<MetronomeTick | null>(null);
  const [bpmDraft, setBpmDraft] = useState(String(DEFAULT_METRONOME_SETTINGS.bpm));
  const [tapTimes, setTapTimes] = useState<number[]>([]);
  const [message, setMessage] = useState("Ready.");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recordingVersion, setRecordingVersion] = useState(0);
  const countdownTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const unsubscribe = metronomeService.onTick((tick) => {
      setLastTick(tick);
    });

    return () => {
      unsubscribe();
    };
  }, [metronomeService]);

  useEffect(() => {
    metronomeService.update(settings);
  }, [metronomeService, settings]);

  useEffect(() => {
    return () => {
      if (countdownTimeoutRef.current !== null) {
        window.clearTimeout(countdownTimeoutRef.current);
      }

      metronomeService.stop();
    };
  }, [metronomeService]);

  const isPlaying = transportState === "playing";
  const isCounting = transportState === "counting";
  const isRecording = recordingState === "recording";
  const arePreRunSettingsLocked = isPlaying || isCounting;

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

  function commitBpmInput() {
    const nextBpm = commitBpmDraft(bpmDraft, settings.bpm);

    updateSettings({ bpm: nextBpm });
    setBpmDraft(String(nextBpm));
  }

  function stepBpmInput(direction: -1 | 1) {
    const committedDraftBpm = commitBpmDraft(bpmDraft, settings.bpm);
    const nextBpm = stepBpm(committedDraftBpm, direction);

    updateSettings({ bpm: nextBpm });
    setBpmDraft(String(nextBpm));
  }

  async function startMetronome() {
    setErrorMessage(null);

    if (settings.countdownBeats > 0) {
      setTransportState("counting");
      setCountdownRemaining(settings.countdownBeats);
      setMessage("Countdown running.");
      runCountdown(settings.countdownBeats);
      return;
    }

    await startPlaybackNow();
  }

  function runCountdown(remainingBeats: number) {
    if (countdownTimeoutRef.current !== null) {
      window.clearTimeout(countdownTimeoutRef.current);
    }

    if (remainingBeats <= 0) {
      void startPlaybackNow();
      return;
    }

    setCountdownRemaining(remainingBeats);
    countdownTimeoutRef.current = window.setTimeout(() => {
      runCountdown(remainingBeats - 1);
    }, 60_000 / settings.bpm);
  }

  async function startPlaybackNow() {
    try {
      await metronomeService.start(settings);
      setTransportState("playing");
      setCountdownRemaining(0);
      setMessage("Metronome playing.");
    } catch (error) {
      setTransportState("stopped");
      setErrorMessage(error instanceof Error ? error.message : "Metronome playback failed.");
    }
  }

  function stopMetronome() {
    if (countdownTimeoutRef.current !== null) {
      window.clearTimeout(countdownTimeoutRef.current);
      countdownTimeoutRef.current = null;
    }

    metronomeService.stop();
    setTransportState("stopped");
    setCountdownRemaining(0);
    setMessage(isRecording ? "Metronome stopped; recording is still active." : "Metronome stopped.");
  }

  async function startRecording() {
    setErrorMessage(null);

    try {
      await recordingService.start();
      const session = currentSession ?? createQuickPracticeSession(settings);

      setCurrentSession(session);
      setRecordingState("recording");
      setMessage(isPlaying ? "Recording while metronome plays." : "Recording without metronome.");
    } catch (error) {
      setRecordingState("idle");
      setErrorMessage(
        error instanceof RecordingPermissionError
          ? error.message
          : "Recording failed before it could start."
      );
    }
  }

  async function stopRecording() {
    setErrorMessage(null);
    setRecordingState("saving");

    try {
      const artifact = await recordingService.stop();

      if (artifact.sizeBytes <= 0) {
        throw new Error("Recording artifact was empty.");
      }

      if (artifact.analysis?.isSilent) {
        throw new Error("Recording artifact did not contain audible input.");
      }

      const session = currentSession ?? createQuickPracticeSession(settings);
      const recording = createQuickRecording({ artifact, session, settings });

      quickRecordingRepository.saveQuickRecording(session, recording);
      setCurrentSession(session);
      setRecordingState("idle");
      setRecordingVersion((version) => version + 1);
      setMessage(isPlaying ? "Recording saved; metronome is still playing." : "Recording saved.");
    } catch (error) {
      setRecordingState("idle");
      setErrorMessage(error instanceof Error ? error.message : "Recording could not be saved.");
    }
  }

  function handleTapTempo() {
    const now = performance.now();
    const recentTaps = [...tapTimes.filter((tapTime) => now - tapTime <= 2_000), now].slice(-5);
    const nextBpm = calculateTapTempo(recentTaps);

    setTapTimes(recentTaps);

    if (nextBpm !== null) {
      updateSettings({ bpm: nextBpm });
      setBpmDraft(String(nextBpm));
      setMessage(`Tap tempo set ${nextBpm} BPM.`);
    } else {
      setMessage("Tap again to set tempo.");
    }
  }

  return (
    <section aria-labelledby="quick-metronome-title" className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Quick Practice
          </p>
          <h1 id="quick-metronome-title" className="text-3xl font-semibold tracking-normal sm:text-4xl">
            Quick Metronome
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Start a timed metronome, capture a quick take, replay it, and keep it as an unlinked quick recording.
          </p>
        </div>
        <div
          aria-live="polite"
          className="flex min-h-12 items-center gap-3 rounded-md border border-border bg-card px-4 py-3 text-sm shadow-soft"
        >
          <span
            className={isPlaying ? "h-2.5 w-2.5 rounded-full bg-green-600" : "h-2.5 w-2.5 rounded-full bg-muted-foreground"}
            aria-hidden="true"
          />
          <span className="font-medium">
            {isCounting ? `Countdown ${countdownRemaining}` : isPlaying ? "Playing" : "Stopped"}
            {isRecording ? " + Recording" : ""}
          </span>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-accent" aria-hidden="true" />
              Tempo and Meter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-5">
              <div>
                <label htmlFor="bpm" className="text-sm font-medium">
                  BPM
                </label>
                <div className="mt-2 grid grid-cols-[2.75rem_1fr_2.75rem] gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    aria-label="Decrease BPM"
                    onClick={() => stepBpmInput(-1)}
                  >
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <input
                    id="bpm"
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
                    className="h-10 min-w-0 rounded-md border border-border bg-background px-3 text-center text-lg font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    aria-label="Increase BPM"
                    onClick={() => stepBpmInput(1)}
                  >
                    <ChevronUp className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Button type="button" variant="secondary" onClick={handleTapTempo}>
                    <Activity className="h-4 w-4" aria-hidden="true" />
                    Tap Tempo
                  </Button>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Tick interval {Math.round(getTickIntervalMs(settings))} ms.
                  </p>
                </div>
              </div>

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
                <p role="status" className="text-sm leading-6 text-muted-foreground">
                  Meter, subdivision, accent, and countdown are locked while the metronome is running. Stop playback to change them.
                </p>
              ) : null}

              <div>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-accent" aria-hidden="true" />
              Transport and Recording
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  onClick={startMetronome}
                  disabled={isPlaying || isCounting}
                  aria-label="Start metronome"
                >
                  <Play className="h-4 w-4" aria-hidden="true" />
                  Play
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={stopMetronome}
                  disabled={transportState === "stopped"}
                  aria-label="Stop metronome"
                >
                  <Square className="h-4 w-4" aria-hidden="true" />
                  Stop
                </Button>
                <Button
                  type="button"
                  variant={isRecording ? "secondary" : "default"}
                  onClick={startRecording}
                  disabled={isRecording || recordingState === "saving"}
                  aria-label="Start recording"
                >
                  <Mic className="h-4 w-4" aria-hidden="true" />
                  Record
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={stopRecording}
                  disabled={!isRecording}
                  aria-label="Stop recording"
                >
                  <Octagon className="h-4 w-4" aria-hidden="true" />
                  Stop Rec
                </Button>
              </div>

              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <StatusTile label="Metronome" value={isCounting ? "Counting" : isPlaying ? "Playing" : "Stopped"} />
                <StatusTile label="Recording" value={recordingState === "saving" ? "Saving" : isRecording ? "Recording" : "Idle"} />
                <StatusTile label="Last tick" value={lastTick ? `#${lastTick.tickIndex + 1}` : "None"} />
                <StatusTile label="Accent tick" value={lastTick?.accented ? "Yes" : "No"} />
              </div>

              <div aria-live="polite" className="rounded-md border border-border bg-muted px-3 py-3 text-sm">
                <p className="font-medium">{message}</p>
                {errorMessage ? (
                  <p role="alert" className="mt-2 font-medium text-destructive">
                    {errorMessage}
                  </p>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div key={recordingVersion}>
        <LatestQuickRecording />
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
  const id = label.toLowerCase().replaceAll(" ", "-");

  return (
    <div>
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

function StatusTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted px-3 py-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
