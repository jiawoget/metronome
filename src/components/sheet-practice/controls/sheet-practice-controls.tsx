"use client";

import { Timer } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  type PracticeSession,
  type SheetRecordingMetadata
} from "@/domain/practice";
import { browserPracticeSessionService } from "@/infrastructure/db/browser-practice-session-service";
import {
  BrowserMetronomeService,
  type MetronomeTick
} from "@/lib/quick-metronome/metronome-service";
import { useMetronomeSettingsState } from "@/lib/quick-metronome/use-metronome-settings-state";
import { useMetronomeTransport } from "@/lib/quick-metronome/use-metronome-transport";
import { useActiveRecordingNavigationGuard } from "@/lib/recording-navigation-guard";
import type { ReviewRecording } from "@/lib/recordings-review/types";
import { BrowserSheetRecordingService } from "@/lib/sheet-practice/recording-service";
import { browserMeasureGridService } from "@/infrastructure/db/browser-measure-grid-service";
import { MeasureGridCalibrationPanel } from "@/components/sheet-practice/measure-grid/measure-grid-calibration-panel";
import { PracticeSegmentSelectorPanel } from "@/components/sheet-practice/segments/practice-segment-selector-panel";
import { MetronomeSettingsPanel } from "@/components/sheet-practice/controls/metronome-settings-panel";
import {
  createSheetPracticeControlInitialState,
  formatUnsupportedTimeSignatureMessage
} from "@/components/sheet-practice/controls/practice-control-state";
import { PracticeStatusPanel } from "@/components/sheet-practice/controls/practice-status-panel";
import { TransportActionsPanel } from "@/components/sheet-practice/controls/transport-actions-panel";
import type { SheetPracticeControlsProps } from "@/components/sheet-practice/controls/types";

const SHEET_RECORDING_HARNESS_EVENT =
  "sheet-practice-controls:set-recording-harness-active";

type SheetMetronomeStartContext = {
  session: PracticeSession;
  rollback:
    | {
        kind: "end-created-session";
      }
    | {
        kind: "restore-previous-session";
        previousSession: PracticeSession;
      }
    | {
        kind: "none";
      };
};

function createBrowserMetronomeService() {
  return new BrowserMetronomeService();
}

function createBrowserSheetRecordingService() {
  return new BrowserSheetRecordingService();
}

export function SheetPracticeControls({
  sheetId,
  sheetName,
  defaultBpm,
  defaultTimeSignature,
  sourceRecordingId = null,
  createMetronomeService = createBrowserMetronomeService,
  createSheetRecordingService = createBrowserSheetRecordingService,
  sessionService = browserPracticeSessionService,
  measureGridService = browserMeasureGridService,
  practiceSegmentService,
  currentMeasureGridTimestampMs = null
}: SheetPracticeControlsProps) {
  const initialState = useMemo(
    () =>
      createSheetPracticeControlInitialState({
        bpm: defaultBpm,
        timeSignature: defaultTimeSignature
      }),
    [defaultBpm, defaultTimeSignature]
  );
  const metronomeService = useMemo(
    () => createMetronomeService(),
    [createMetronomeService]
  );
  const sheetRecordingService = useMemo(
    () => createSheetRecordingService(),
    [createSheetRecordingService]
  );
  const {
    settings,
    bpmDraft,
    setBpmDraft,
    commitBpmInput,
    stepBpmInput,
    updateSettings
  } = useMetronomeSettingsState(initialState.settings);
  const [recordingHarnessActive, setRecordingHarnessActive] = useState(false);
  const [recordingState, setRecordingState] = useState<
    "idle" | "recording" | "saving"
  >("idle");
  const [consumedSourceRecordingId, setConsumedSourceRecordingId] = useState<
    string | null
  >(null);
  const [lastTick, setLastTick] = useState<MetronomeTick | null>(null);
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [recordings, setRecordings] = useState<SheetRecordingMetadata[]>([]);
  const [latestSheetRecording, setLatestSheetRecording] =
    useState<ReviewRecording | null>(null);
  const [measureGridRevision, setMeasureGridRevision] = useState(0);
  const [message, setMessage] = useState(
    "Ready. Viewing the sheet has not started practice."
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isSheetRecording = recordingState === "recording";
  const isRecordingActive = isSheetRecording || recordingHarnessActive;

  useActiveRecordingNavigationGuard(
    `sheet-practice-recording-${sheetId}`,
    recordingState !== "idle",
    recordingState === "saving" ? "sheet recording save" : "sheet recording"
  );

  const unsupportedTimeSignatureMessage = initialState.unsupportedTimeSignature
    ? formatUnsupportedTimeSignatureMessage(
        initialState.unsupportedTimeSignature
      )
    : null;

  const refreshSession = useCallback(async () => {
    const recentSession = await sessionService.getRecentSheetSession(sheetId);
    const allRecordings = await sessionService.listRecordingMetadata();

    setSession(recentSession);
    setRecordings(
      allRecordings.filter((recording) => recording.sheetId === sheetId)
    );
    setLatestSheetRecording(
      sheetRecordingService.getLatestSheetRecording(sheetId)
    );
  }, [sessionService, sheetId, sheetRecordingService]);

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
    const unsubscribeRecordings = sheetRecordingService.subscribe(() => {
      void refreshSession();
    });

    return () => {
      window.clearTimeout(timeoutId);
      unsubscribe();
      unsubscribeRecordings();
    };
  }, [refreshSession, sessionService, sheetRecordingService]);

  const shouldCreatePracticeAgainSession =
    Boolean(sourceRecordingId) &&
    consumedSourceRecordingId !== sourceRecordingId;

  const ensureMetronomeSession =
    useCallback(async (): Promise<SheetMetronomeStartContext | null> => {
      const existingSheetSession = shouldCreatePracticeAgainSession
        ? null
        : await sessionService.getRecentSheetSession(sheetId);
      const nextSession = await sessionService.ensureSheetSession({
        sheetId,
        trigger: "metronome",
        bpm: settings.bpm,
        timeSignature: settings.timeSignature,
        forceNewSession: shouldCreatePracticeAgainSession
      });

      if (!nextSession) {
        return null;
      }

      return {
        session: nextSession,
        rollback:
          existingSheetSession === null ||
          nextSession.id !== existingSheetSession.id
            ? { kind: "end-created-session" }
            : existingSheetSession.endedAt
              ? {
                  kind: "restore-previous-session",
                  previousSession: existingSheetSession
                }
              : { kind: "none" }
      };
    }, [
      sessionService,
      settings.bpm,
      settings.timeSignature,
      sheetId,
      shouldCreatePracticeAgainSession
    ]);
  const handleCountdownStarted = useCallback(() => {
    setMessage("Countdown running.");
  }, []);
  const handleStartBlocked = useCallback(() => {
    setMessage("No valid sheet context. Metronome was stopped.");
  }, []);
  const handleStarted = useCallback(
    (context: SheetMetronomeStartContext | null) => {
      setSession(context?.session ?? null);
      if (context?.session && shouldCreatePracticeAgainSession) {
        setConsumedSourceRecordingId(sourceRecordingId);
      }
      setMessage(
        isRecordingActive
          ? "Metronome playing; recording stays active."
          : "Metronome playing."
      );
    },
    [isRecordingActive, shouldCreatePracticeAgainSession, sourceRecordingId]
  );
  const handleStartFailed = useCallback(
    async (error: unknown, context: SheetMetronomeStartContext | null) => {
      if (context?.rollback.kind === "end-created-session") {
        const endedSession = await sessionService.endPracticeSession(
          context.session.id
        );

        setSession(endedSession);
      } else if (context?.rollback.kind === "restore-previous-session") {
        const restoredSession =
          await sessionService.restorePracticeSessionSnapshot(
            context.rollback.previousSession
          );

        setSession(restoredSession);
      } else if (context?.session) {
        setSession(context.session);
      }

      setErrorMessage(
        error instanceof Error ? error.message : "Metronome playback failed."
      );
    },
    [sessionService]
  );
  const handleStopped = useCallback(async () => {
    if (session) {
      const nextSession = await sessionService.updateSheetSessionDuration(
        session.id
      );

      setSession(nextSession);
    }

    setMessage(
      isRecordingActive
        ? "Metronome stopped; recording stays active."
        : "Metronome stopped."
    );
  }, [isRecordingActive, session, sessionService]);
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
  const handleStopMetronome = useCallback(() => {
    void stopMetronome();
  }, [stopMetronome]);
  const arePreRunSettingsLocked = isPlaying || isCounting;

  async function startSheetRecording() {
    setErrorMessage(null);
    let captureStarted = false;

    try {
      await sheetRecordingService.startCapture();
      captureStarted = true;

      const nextSession = await sessionService.ensureSheetSession({
        sheetId,
        trigger: "recording",
        bpm: settings.bpm,
        timeSignature: settings.timeSignature,
        forceNewSession: shouldCreatePracticeAgainSession
      });

      if (!nextSession) {
        await sheetRecordingService.discardCapture();
        throw new Error("No valid sheet context. Recording was stopped.");
      }

      setSession(nextSession);
      setConsumedSourceRecordingId(sourceRecordingId);
      setRecordingState("recording");
      setMessage(
        isPlaying
          ? "Recording while metronome plays."
          : "Recording without metronome."
      );
    } catch (error) {
      if (captureStarted) {
        await sheetRecordingService.discardCapture();
      }

      setRecordingState("idle");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Recording failed before it could start."
      );
    }
  }

  async function stopSheetRecording() {
    setErrorMessage(null);
    setRecordingState("saving");

    try {
      const result = await sheetRecordingService.stopAndSave({
        sheetId,
        sessionId: session?.id ?? null,
        settings,
        forceNewSession: false,
        sessionService
      });
      const nextSession = await sessionService.getRecentSheetSession(sheetId);
      const allRecordings = await sessionService.listRecordingMetadata();

      setSession(nextSession);
      setRecordings(
        allRecordings.filter((recording) => recording.sheetId === sheetId)
      );
      setLatestSheetRecording(result.recording);
      setRecordingState("idle");
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

  useEffect(() => {
    const harnessWindow = window as Window & {
      __sheetPracticeControlsTestHarness?: boolean;
    };

    if (harnessWindow.__sheetPracticeControlsTestHarness !== true) {
      return;
    }

    const handleRecordingHarnessEvent = (event: Event) => {
      const active = Boolean(
        (event as CustomEvent<{ active?: boolean }>).detail?.active
      );

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

      if (
        !active &&
        !isSheetRecording &&
        transportState !== "playing" &&
        session
      ) {
        void sessionService
          .updateSheetSessionDuration(session.id)
          .then((nextSession) => {
            setSession(nextSession);
          });
      }
    };

    window.addEventListener(
      SHEET_RECORDING_HARNESS_EVENT,
      handleRecordingHarnessEvent
    );

    return () => {
      window.removeEventListener(
        SHEET_RECORDING_HARNESS_EVENT,
        handleRecordingHarnessEvent
      );
    };
  }, [isSheetRecording, session, sessionService, transportState]);

  return (
    <section
      aria-labelledby="sheet-practice-controls-title"
      data-testid="sheet-practice-controls"
      className="border-border bg-card shadow-soft shrink-0 rounded-lg border"
    >
      <div className="grid gap-3 p-3 lg:grid-cols-[minmax(16rem,0.9fr)_minmax(22rem,1.35fr)_minmax(16rem,0.9fr)] lg:items-stretch">
        <PracticeStatusPanel
          sheetId={sheetId}
          sheetName={sheetName}
          session={session}
          isCounting={isCounting}
          isPlaying={isPlaying}
          countdownRemaining={countdownRemaining}
          recordingState={recordingState}
          isRecordingActive={isRecordingActive}
        />

        <MetronomeSettingsPanel
          settings={settings}
          bpmDraft={bpmDraft}
          unsupportedTimeSignatureMessage={unsupportedTimeSignatureMessage}
          arePreRunSettingsLocked={arePreRunSettingsLocked}
          setBpmDraft={setBpmDraft}
          commitBpmInput={commitBpmInput}
          stepBpmInput={stepBpmInput}
          updateSettings={updateSettings}
        />

        <TransportActionsPanel
          lastTick={lastTick}
          session={session}
          recordings={recordings}
          latestSheetRecording={latestSheetRecording}
          message={message}
          errorMessage={errorMessage}
          transportState={transportState}
          isPlaying={isPlaying}
          isCounting={isCounting}
          isSheetRecording={isSheetRecording}
          recordingState={recordingState}
          startMetronome={handleStartMetronome}
          stopMetronome={handleStopMetronome}
          startSheetRecording={() => void startSheetRecording()}
          stopSheetRecording={() => void stopSheetRecording()}
        />
      </div>
      <div className="border-border grid gap-3 border-t px-3 py-3 xl:grid-cols-[minmax(18rem,0.85fr)_minmax(24rem,1.15fr)]">
        <PracticeSegmentSelectorPanel
          sheetId={sheetId}
          practiceSegmentService={practiceSegmentService}
          measureGridService={measureGridService}
          measureGridRevision={measureGridRevision}
        />
        <MeasureGridCalibrationPanel
          sheetId={sheetId}
          defaultBpm={defaultBpm}
          defaultTimeSignature={defaultTimeSignature}
          fallbackSettings={initialState.settings}
          currentTimestampMs={currentMeasureGridTimestampMs}
          measureGridService={measureGridService}
          onGridSaved={() => setMeasureGridRevision((revision) => revision + 1)}
        />
      </div>
      <div className="border-border text-muted-foreground flex flex-wrap items-center gap-3 border-t px-3 py-2 text-xs">
        <span className="inline-flex items-center gap-1">
          <Timer className="h-3.5 w-3.5" aria-hidden="true" />
          Defaults: {initialState.settings.bpm} BPM,{" "}
          {initialState.settings.timeSignature}
        </span>
      </div>
    </section>
  );
}
