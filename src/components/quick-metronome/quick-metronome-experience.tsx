"use client";

import { Mic, Octagon, Play, Radio, Square, Timer } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { LatestQuickRecording } from "@/components/quick-metronome/latest-quick-recording";
import { MetronomeSettingsPanel } from "@/components/sheet-practice/controls/metronome-settings-panel";
import { StatusTile } from "@/components/sheet-practice/controls/status-tile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PracticeSession } from "@/domain/practice";
import { useActiveRecordingNavigationGuard } from "@/lib/recording-navigation-guard";
import { calculateTapTempo } from "@/lib/quick-metronome/control";
import { quickRecordingController } from "@/lib/quick-metronome/recording-controller";
import { DEFAULT_METRONOME_SETTINGS } from "@/lib/quick-metronome/types";
import { useMetronomeSettingsState } from "@/lib/quick-metronome/use-metronome-settings-state";
import { useMetronomeTransport } from "@/lib/quick-metronome/use-metronome-transport";
import {
  createBrowserCountdownExecutor,
  createBrowserMetronomeService
} from "@/services/metronome/browser";
import type { MetronomeTick } from "@/services/metronome";
import type { PracticeSessionService } from "@/services/practice-session";
import { browserPracticeSessionService } from "@/services/practice-session/browser";
import { createBrowserRecordingCaptureService } from "@/services/recording/browser";
import { RecordingPermissionError } from "@/services/recording";

type RecordingState = "idle" | "recording" | "saving";

type QuickMetronomeSessionService = Pick<
  PracticeSessionService,
  | "captureSessionEvent"
  | "endPracticeSession"
  | "ensureQuickSession"
  | "updatePracticeSessionDuration"
  | "linkRecordingToSession"
  | "restorePracticeSessionSnapshot"
  | "deletePracticeSessionSnapshot"
>;

type QuickMetronomeExperienceProps = {
  sessionService?: QuickMetronomeSessionService;
};

function getSessionWriteFailureMessage(error: unknown) {
  return error instanceof Error && error.message.trim()
    ? error.message
    : "Practice session could not be saved after stopping.";
}

export function QuickMetronomeExperience({
  sessionService = browserPracticeSessionService
}: QuickMetronomeExperienceProps = {}) {
  const metronomeService = useMemo(() => createBrowserMetronomeService(), []);
  const countdownExecutor = useMemo(() => createBrowserCountdownExecutor(), []);
  const recordingService = useMemo(() => createBrowserRecordingCaptureService(), []);
  const {
    settings,
    bpmDraft,
    setBpmDraft,
    commitBpmInput,
    stepBpmInput,
    updateSettings
  } = useMetronomeSettingsState(DEFAULT_METRONOME_SETTINGS);
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [currentSession, setCurrentSession] = useState<PracticeSession | null>(
    null
  );
  const [lastTick, setLastTick] = useState<MetronomeTick | null>(null);
  const [tapTimes, setTapTimes] = useState<number[]>([]);
  const [message, setMessage] = useState("Ready.");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recordingVersion, setRecordingVersion] = useState(0);

  useEffect(() => {
    const unsubscribe = metronomeService.onTick((tick) => {
      setLastTick(tick);
    });

    return () => {
      unsubscribe();
    };
  }, [metronomeService]);

  const isRecording = recordingState === "recording";

  const handleCountdownStarted = useCallback(() => {
    setMessage("Countdown running.");
  }, []);
  const ensureMetronomeSession = useCallback(() => {
    return sessionService.ensureQuickSession({
      trigger: "metronome",
      bpm: settings.bpm,
      timeSignature: settings.timeSignature
    });
  }, [sessionService, settings.bpm, settings.timeSignature]);
  const handleStarted = useCallback((session: PracticeSession | null) => {
    setCurrentSession(session);
    if (session) {
      void sessionService.captureSessionEvent({
        sessionId: session.id,
        kind: "metronome_started"
      });
    }
    setMessage("Metronome playing.");
  }, [sessionService]);
  const handleStartFailed = useCallback(
    async (error: unknown, session: PracticeSession | null) => {
      if (session) {
        await sessionService.endPracticeSession(session.id);
      }

      setErrorMessage(
        error instanceof Error ? error.message : "Metronome playback failed."
      );
    },
    [sessionService]
  );
  const handleStopped = useCallback(async () => {
    setErrorMessage(null);

    if (currentSession) {
      await sessionService.captureSessionEvent({
        sessionId: currentSession.id,
        kind: "metronome_stopped"
      });

      try {
        const nextSession = isRecording
          ? await sessionService.updatePracticeSessionDuration(
              currentSession.id
            )
          : await sessionService.endPracticeSession(
              currentSession.id
            );

        setCurrentSession(nextSession);
      } catch (error) {
        setErrorMessage(getSessionWriteFailureMessage(error));
      }
    }

    setMessage(
      isRecording
        ? "Metronome stopped; recording is still active."
        : "Metronome stopped."
    );
  }, [currentSession, isRecording, sessionService]);
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
    countdownExecutor,
    beforeStart: ensureMetronomeSession,
    onCountdownStarted: handleCountdownStarted,
    onStarted: handleStarted,
    onStartFailed: handleStartFailed,
    onStopped: handleStopped
  });
  const arePreRunSettingsLocked = isPlaying || isCounting;
  useActiveRecordingNavigationGuard(
    "quick-metronome-recording",
    recordingState !== "idle",
    recordingState === "saving" ? "quick recording save" : "quick recording"
  );
  const handleStartMetronome = useCallback(() => {
    setErrorMessage(null);
    void startMetronome();
  }, [startMetronome]);

  async function startRecording() {
    setErrorMessage(null);

    try {
      await recordingService.start();
      const session =
        currentSession ??
        (await sessionService.ensureQuickSession({
          trigger: "recording",
          bpm: settings.bpm,
          timeSignature: settings.timeSignature
        }));

      setCurrentSession(session);
      await sessionService.captureSessionEvent({
        sessionId: session.id,
        kind: "recording_started"
      });
      setRecordingState("recording");
      setMessage(
        isPlaying
          ? "Recording while metronome plays."
          : "Recording without metronome."
      );
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
      const result = await quickRecordingController.saveCapturedQuickRecording({
        artifact,
        session: currentSession,
        settings,
        isPlaying,
        sessionService
      });

      setCurrentSession(result.session);
      setRecordingState("idle");
      setRecordingVersion((version) => version + 1);
      setMessage(
        isPlaying
          ? "Recording saved; metronome is still playing."
          : "Recording saved."
      );
    } catch (error) {
      setRecordingState("idle");
      setErrorMessage(
        error instanceof Error ? error.message : "Recording could not be saved."
      );
    }
  }

  function handleTapTempo() {
    const now = performance.now();
    const recentTaps = [
      ...tapTimes.filter((tapTime) => now - tapTime <= 2_000),
      now
    ].slice(-5);
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
    <section
      aria-labelledby="quick-metronome-title"
      className="mx-auto flex w-full max-w-6xl flex-col gap-5"
    >
      <header className="border-border flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-[0.08em] uppercase">
            Quick Practice
          </p>
          <h1
            id="quick-metronome-title"
            className="text-3xl font-semibold tracking-normal sm:text-4xl"
          >
            Quick Metronome
          </h1>
          <p className="text-muted-foreground mt-3 max-w-2xl text-sm leading-6">
            Start a timed metronome, capture a quick take, replay it, and keep
            it as an unlinked quick recording.
          </p>
        </div>
        <div
          aria-live="polite"
          className="border-border bg-card shadow-soft flex min-h-12 items-center gap-3 rounded-md border px-4 py-3 text-sm"
        >
          <span
            className={
              isPlaying
                ? "h-2.5 w-2.5 rounded-full bg-green-600"
                : "bg-muted-foreground h-2.5 w-2.5 rounded-full"
            }
            aria-hidden="true"
          />
          <span className="font-medium">
            {isCounting
              ? `Countdown ${countdownRemaining}`
              : isPlaying
                ? "Playing"
                : "Stopped"}
            {isRecording ? " + Recording" : ""}
          </span>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="text-accent h-5 w-5" aria-hidden="true" />
              Tempo and Meter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MetronomeSettingsPanel
              settings={settings}
              bpmDraft={bpmDraft}
              unsupportedTimeSignatureMessage={null}
              arePreRunSettingsLocked={arePreRunSettingsLocked}
              bpmInputId="bpm"
              className="border-0 bg-transparent p-0"
              layout="stacked"
              onTapTempo={handleTapTempo}
              setBpmDraft={setBpmDraft}
              commitBpmInput={commitBpmInput}
              stepBpmInput={stepBpmInput}
              updateSettings={updateSettings}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radio className="text-accent h-5 w-5" aria-hidden="true" />
              Transport and Recording
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  onClick={handleStartMetronome}
                  disabled={isPlaying || isCounting}
                  aria-label="Start metronome"
                >
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
                <StatusTile
                  label="Metronome"
                  className="py-3"
                  value={
                    isCounting ? "Counting" : isPlaying ? "Playing" : "Stopped"
                  }
                />
                <StatusTile
                  label="Recording"
                  className="py-3"
                  value={
                    recordingState === "saving"
                      ? "Saving"
                      : isRecording
                        ? "Recording"
                        : "Idle"
                  }
                />
                <StatusTile
                  label="Last tick"
                  className="py-3"
                  value={lastTick ? `#${lastTick.tickIndex + 1}` : "None"}
                />
                <StatusTile
                  label="Accent tick"
                  className="py-3"
                  value={lastTick?.accented ? "Yes" : "No"}
                />
              </div>

              <div
                aria-live="polite"
                className="border-border bg-muted rounded-md border px-3 py-3 text-sm"
              >
                <p className="font-medium">{message}</p>
                {errorMessage ? (
                  <p role="alert" className="text-destructive mt-2 font-medium">
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
