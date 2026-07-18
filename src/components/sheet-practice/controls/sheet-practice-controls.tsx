"use client";

import { Timer } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  createSheetRecordingSegmentContext,
  getBarCountInPlan,
  getSegmentTempoApplyPolicy,
  type BarCountInReadyPlan,
  type PracticeSegment,
  type PracticeSession,
  type SheetRecordingMetadata,
  type SheetRecordingSegmentContext
} from "@/domain/practice";
import type { MetronomeTick } from "@/services/metronome";
import {
  createBrowserCountdownExecutor,
  createBrowserMetronomeService
} from "@/services/metronome/browser";
import { useMetronomeSettingsState } from "@/lib/quick-metronome/use-metronome-settings-state";
import type { MetronomeSettings } from "@/lib/quick-metronome/types";
import {
  useMetronomeTransport,
  type BarCountInCountdownTick
} from "@/lib/quick-metronome/use-metronome-transport";
import { useActiveRecordingNavigationGuard } from "@/lib/recording-navigation-guard";
import type { ReviewRecording } from "@/lib/recordings-review/types";
import { browserMeasureGridService } from "@/services/measure-grid/browser";
import { browserPracticeSessionService } from "@/services/practice-session/browser";
import { browserPracticeSegmentService } from "@/services/practice-segments/browser";
import { createBrowserSheetRecordingService } from "@/services/recording/browser";
import { browserSheetMetronomePresetService } from "@/services/sheet-metronome-presets/browser";
import { MeasureGridCalibrationPanel } from "@/components/sheet-practice/measure-grid/measure-grid-calibration-panel";
import {
  PracticeSegmentSelectorPanel,
  type PracticeSegmentSelection
} from "@/components/sheet-practice/segments/practice-segment-selector-panel";
import {
  BarCountInControl,
  type BarCountInBars
} from "@/components/sheet-practice/controls/bar-count-in-control";
import { MetronomeSettingsPanel } from "@/components/sheet-practice/controls/metronome-settings-panel";
import { SegmentTempoApplyControl } from "@/components/sheet-practice/controls/segment-tempo-apply-control";
import { SheetMetronomePresetControl } from "@/components/sheet-practice/controls/sheet-metronome-preset-control";
import {
  createSheetPracticeControlInitialState,
  formatUnsupportedTimeSignatureMessage
} from "@/components/sheet-practice/controls/practice-control-state";
import {
  inspectPracticeAgainSource,
  inspectReadyRerecordSourceRecording,
  inspectRerecordSourceSegment,
  selectReadyRerecordSource
} from "@/components/sheet-practice/controls/rerecord-source-validation";
import { PracticeStatusPanel } from "@/components/sheet-practice/controls/practice-status-panel";
import { TransportActionsPanel } from "@/components/sheet-practice/controls/transport-actions-panel";
import type {
  SheetPracticeBarCountInBlockReason,
  SheetPracticeBarCountInOptions,
  SheetPracticeControlsProps
} from "@/components/sheet-practice/controls/types";
import {
  type SheetPracticeRerecordUnavailableReason,
  useSheetPracticeRecordingWorkflowStore
} from "@/stores/sheet-practice-recording-workflow-store";

const SHEET_RECORDING_HARNESS_EVENT =
  "sheet-practice-controls:set-recording-harness-active";
const SHEET_BAR_COUNT_IN_PLAN_EVENT =
  "sheet-practice-controls:bar-count-in-plan";
const SHEET_BAR_COUNT_IN_BLOCKED_EVENT =
  "sheet-practice-controls:bar-count-in-blocked";
const SHEET_BAR_COUNT_IN_TICK_EVENT =
  "sheet-practice-controls:bar-count-in-tick";

type SheetPracticeControlsWindow = Window & {
  __sheetPracticeControlsTestHarness?: boolean;
  __sheetPracticeControlsBarCountIn?: {
    enabled?: boolean;
    countInMeasures?: number;
  };
};

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

type SheetRecordingStartMode = "normal" | "record-again";

function formatBarCountInTickDetail(tick: BarCountInCountdownTick | null) {
  if (!tick) {
    return null;
  }

  const sourceLabel = tick.isPreRoll
    ? "Pre-roll"
    : tick.sourceMeasureNumber !== null
      ? `Measure ${tick.sourceMeasureNumber}`
      : "Pre-roll";

  return `${sourceLabel} beat ${tick.beatNumber}`;
}

function throwRecordAgainUnavailable(): never {
  throw new Error("Record again is not available for this segment.");
}

function formatRerecordUnavailableMessage(
  reason: SheetPracticeRerecordUnavailableReason
) {
  switch (reason) {
    case "no-source-recording":
      return "Practice Again source is unavailable.";
    case "no-segment-context":
      return "Practice Again opened the sheet, but this take is not linked to a segment.";
    case "source-not-sheet":
      return "Practice Again source is not a sheet recording.";
    case "sheet-mismatch":
      return "Practice Again source belongs to a different sheet.";
    case "selection-changed":
      return "Record Again is only available for the original segment.";
    case "source-recording-missing":
      return "Practice Again source recording was not found.";
    case "source-segment-missing":
      return "Practice Again source segment no longer exists.";
    case "source-segment-invalid":
      return "Practice Again source segment no longer matches this sheet.";
    case "recording-active":
      return "Record Again is unavailable while recording is active.";
  }
}

function getHarnessBarCountInOptions(): SheetPracticeBarCountInOptions | null {
  if (typeof window === "undefined") {
    return null;
  }

  const harnessWindow = window as SheetPracticeControlsWindow;
  const harnessOptions = harnessWindow.__sheetPracticeControlsBarCountIn;

  if (!harnessOptions) {
    return null;
  }

  return {
    enabled: Boolean(harnessOptions.enabled),
    countInMeasures: harnessOptions.countInMeasures
  };
}

function dispatchBarCountInHarnessEvent(name: string, detail: unknown) {
  if (typeof window === "undefined") {
    return;
  }

  const harnessWindow = window as SheetPracticeControlsWindow;

  if (harnessWindow.__sheetPracticeControlsTestHarness !== true) {
    return;
  }

  window.dispatchEvent(new CustomEvent(name, { detail }));
}

function getSessionWriteFailureMessage(error: unknown) {
  return error instanceof Error && error.message.trim()
    ? error.message
    : "Practice session could not be saved after stopping.";
}

export function SheetPracticeControls({
  sheetId,
  sheetName,
  defaultBpm,
  defaultTimeSignature,
  sourceRecordingId = null,
  returnSegmentId = null,
  createMetronomeService = createBrowserMetronomeService,
  createCountdownExecutor = createBrowserCountdownExecutor,
  createSheetRecordingService = createBrowserSheetRecordingService,
  sessionService = browserPracticeSessionService,
  measureGridService = browserMeasureGridService,
  practiceSegmentService = browserPracticeSegmentService,
  sheetMetronomePresetService = browserSheetMetronomePresetService,
  currentMeasureGridTimestampMs = null,
  onSelectedSegmentChange,
  barCountIn = undefined
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
  const countdownExecutor = useMemo(
    () => createCountdownExecutor(),
    [createCountdownExecutor]
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
  const [isStartingRecordAgain, setIsStartingRecordAgain] = useState(false);
  const isStartingRecordingRef = useRef(false);
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
  const [selectedTempoSegment, setSelectedTempoSegment] =
    useState<PracticeSegment | null>(null);
  const [isBarCountInEnabled, setIsBarCountInEnabled] = useState(false);
  const [barCountInMeasures, setBarCountInMeasures] =
    useState<BarCountInBars>(1);
  const [activeBarCountInPlan, setActiveBarCountInPlan] =
    useState<BarCountInReadyPlan | null>(null);
  const [activeBarCountInTick, setActiveBarCountInTick] =
    useState<BarCountInCountdownTick | null>(null);
  const pendingBarCountInStartRef = useRef(false);
  const barCountInPrepareRunIdRef = useRef(0);
  const isPreparingBarCountInRef = useRef(false);
  const [message, setMessage] = useState(
    "Ready. Viewing the sheet has not started practice."
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const activeRecordingWorkflowSheetId = useSheetPracticeRecordingWorkflowStore(
    (state) => state.sheetId
  );
  const activeRecordingWorkflowSegmentId = useSheetPracticeRecordingWorkflowStore(
    (state) => state.activeSegmentId
  );
  const setActiveRecordingSegment = useSheetPracticeRecordingWorkflowStore(
    (state) => state.setActiveSegment
  );
  const beginWorkflowRecording = useSheetPracticeRecordingWorkflowStore(
    (state) => state.beginRecording
  );
  const beginWorkflowSaving = useSheetPracticeRecordingWorkflowStore(
    (state) => state.beginSaving
  );
  const finishWorkflowRecording = useSheetPracticeRecordingWorkflowStore(
    (state) => state.finishRecording
  );
  const failWorkflowRecording = useSheetPracticeRecordingWorkflowStore(
    (state) => state.failRecording
  );
  const invalidateRerecordSource = useSheetPracticeRecordingWorkflowStore(
    (state) => state.invalidateRerecordSource
  );
  const clearRerecordSource = useSheetPracticeRecordingWorkflowStore(
    (state) => state.clearRerecordSource
  );
  const setRerecordReady = useSheetPracticeRecordingWorkflowStore(
    (state) => state.setRerecordReady
  );
  const rerecordStatus = useSheetPracticeRecordingWorkflowStore(
    (state) => state.rerecord.status
  );
  const rerecordSource = useSheetPracticeRecordingWorkflowStore(
    (state) => state.rerecord.source
  );
  const isSheetRecording = recordingState === "recording";
  const isRecordingActive = isSheetRecording || recordingHarnessActive;
  const selectedRecordingSegmentId =
    activeRecordingWorkflowSheetId === sheetId
      ? activeRecordingWorkflowSegmentId
      : null;

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
  const scopedSelectedTempoSegment =
    selectedTempoSegment?.sheetId === sheetId ? selectedTempoSegment : null;
  const segmentTempoPolicy = useMemo(
    () =>
      getSegmentTempoApplyPolicy({
        currentBpm: settings.bpm,
        segment: scopedSelectedTempoSegment
      }),
    [scopedSelectedTempoSegment, settings.bpm]
  );

  const handleSelectedSegmentChange = useCallback(
    (selection: PracticeSegmentSelection) => {
      if (
        selection.sheetId !== sheetId ||
        (selection.segment !== null && selection.segment.sheetId !== sheetId)
      ) {
        setSelectedTempoSegment(null);
        onSelectedSegmentChange?.(null);
        return;
      }

      setSelectedTempoSegment(selection.segment);
      onSelectedSegmentChange?.(selection.segment);
    },
    [onSelectedSegmentChange, sheetId]
  );

  const handleApplySegmentTempo = useCallback(() => {
    const policy = getSegmentTempoApplyPolicy({
      currentBpm: settings.bpm,
      segment: scopedSelectedTempoSegment
    });

    if (policy.status !== "applied") {
      return;
    }

    updateSettings({ bpm: policy.nextBpm });
  }, [scopedSelectedTempoSegment, settings.bpm, updateSettings]);

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

  useEffect(() => {
    let cancelled = false;
    const normalizedSourceRecordingId = sourceRecordingId?.trim();

    async function hydratePracticeAgainSource() {
      if (!normalizedSourceRecordingId) {
        clearRerecordSource(sheetId, "no-source-recording");
        return;
      }

      const sourceRecording = sheetRecordingService.getRecording(
        normalizedSourceRecordingId
      );

      const sourceInspection = inspectPracticeAgainSource({
        recording: sourceRecording,
        returnSegmentId,
        sheetId
      });

      if (sourceInspection.kind === "missing-context") {
        clearRerecordSource(sheetId, sourceInspection.reason);
        setMessage(formatRerecordUnavailableMessage(sourceInspection.reason));
        return;
      }

      if (sourceInspection.kind === "invalid") {
        invalidateRerecordSource(sheetId, sourceInspection.reason);
        setMessage(formatRerecordUnavailableMessage(sourceInspection.reason));
        return;
      }

      const { recording, sourceContext: sourceSegmentContext } = sourceInspection;

      const liveSegment = await practiceSegmentService.getSegment(
        sheetId,
        sourceSegmentContext.segmentId
      );

      if (cancelled) {
        return;
      }

      const segmentInspection = inspectRerecordSourceSegment({
        kind: "hydration",
        segment: liveSegment,
        sourceContext: sourceSegmentContext
      });

      if (segmentInspection.kind === "missing") {
        setActiveRecordingSegment(sheetId, null);
      }

      if (segmentInspection.kind !== "valid") {
        invalidateRerecordSource(sheetId, segmentInspection.reason);
        setMessage(formatRerecordUnavailableMessage(segmentInspection.reason));
        return;
      }

      setActiveRecordingSegment(sheetId, sourceSegmentContext.segmentId);
      setRerecordReady(sheetId, {
        recordingId: recording.id,
        sheetId,
        segmentContext: sourceSegmentContext
      });
      setMessage(
        `Practice Again ready for ${sourceSegmentContext.segmentName}.`
      );
    }

    void hydratePracticeAgainSource().catch((error) => {
      if (!cancelled) {
        const message =
          error instanceof Error
            ? error.message
            : "Practice Again source could not be loaded.";

        useSheetPracticeRecordingWorkflowStore
          .getState()
          .failRerecord(sheetId, message);
        setErrorMessage(message);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    clearRerecordSource,
    invalidateRerecordSource,
    practiceSegmentService,
    returnSegmentId,
    setActiveRecordingSegment,
    setRerecordReady,
    sheetId,
    sheetRecordingService,
    sourceRecordingId
  ]);

  useEffect(() => {
    const sourceSelection = selectReadyRerecordSource({
      kind: "mounted",
      sheetId,
      workflowState: useSheetPracticeRecordingWorkflowStore.getState()
    });

    if (sourceSelection.kind === "invalid") {
      return;
    }

    const sourceRecording = sheetRecordingService.getRecording(
      sourceSelection.value.recordingId
    );
    const recordingInspection = inspectReadyRerecordSourceRecording({
      recording: sourceRecording,
      sheetId,
      source: sourceSelection.value
    });

    if (recordingInspection.kind === "valid") {
      return;
    }

    invalidateRerecordSource(sheetId, recordingInspection.reason);
  }, [
    activeRecordingWorkflowSheetId,
    invalidateRerecordSource,
    rerecordSource,
    rerecordStatus,
    sheetRecordingService,
    sheetId
  ]);

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
  const getEffectiveBarCountInOptions = useCallback(() => {
    const harnessBarCountIn = getHarnessBarCountInOptions();

    return (
      barCountIn ??
      harnessBarCountIn ?? {
        enabled: isBarCountInEnabled,
        countInMeasures: barCountInMeasures
      }
    );
  }, [barCountIn, barCountInMeasures, isBarCountInEnabled]);
  const invalidateBarCountInPrepare = useCallback(() => {
    barCountInPrepareRunIdRef.current += 1;
    isPreparingBarCountInRef.current = false;
    pendingBarCountInStartRef.current = false;
  }, []);
  const blockBarCountInStart = useCallback(
    (
      options: SheetPracticeBarCountInOptions,
      reason: SheetPracticeBarCountInBlockReason,
      message: string
    ) => {
      invalidateBarCountInPrepare();
      setActiveBarCountInPlan(null);
      setActiveBarCountInTick(null);
      setMessage(message);
      options.onPlanBlocked?.({ reason, message });
      dispatchBarCountInHarnessEvent(SHEET_BAR_COUNT_IN_BLOCKED_EVENT, {
        reason,
        message
      });
    },
    [invalidateBarCountInPrepare]
  );
  const prepareBarCountInPlan = useCallback(
    async (
      options: SheetPracticeBarCountInOptions,
      prepareRunId: number
    ): Promise<BarCountInReadyPlan | null> => {
      let measureGrid: Awaited<ReturnType<typeof measureGridService.getGrid>>;

      try {
        measureGrid = await measureGridService.getGrid(sheetId);
      } catch (error) {
        if (barCountInPrepareRunIdRef.current !== prepareRunId) {
          return null;
        }

        const message =
          error instanceof Error
            ? error.message
            : "Measure grid could not be loaded. Metronome was stopped.";

        setErrorMessage(message);
        blockBarCountInStart(options, "invalid-plan", message);

        return null;
      }

      if (barCountInPrepareRunIdRef.current !== prepareRunId) {
        return null;
      }

      if (measureGrid === null) {
        blockBarCountInStart(
          options,
          "no-measure-grid",
          "Save a measure grid before starting bar count-in."
        );

        return null;
      }

      try {
        const plan = getBarCountInPlan({
          measureGrid,
          selectedSegment: scopedSelectedTempoSegment,
          countInMeasures: options.countInMeasures
        });

        if (barCountInPrepareRunIdRef.current !== prepareRunId) {
          return null;
        }

        if (plan.status !== "ready") {
          blockBarCountInStart(
            options,
            "segment-grid-stale",
            "Selected segment grid changed. Metronome was stopped."
          );

          return null;
        }

        options.onPlanPrepared?.(plan);
        dispatchBarCountInHarnessEvent(SHEET_BAR_COUNT_IN_PLAN_EVENT, plan);

        return plan;
      } catch (error) {
        if (barCountInPrepareRunIdRef.current !== prepareRunId) {
          return null;
        }

        const message =
          error instanceof Error
            ? error.message
            : "Bar count-in could not be prepared. Metronome was stopped.";

        setErrorMessage(message);
        blockBarCountInStart(options, "invalid-plan", message);

        return null;
      }
    },
    [
      blockBarCountInStart,
      measureGridService,
      scopedSelectedTempoSegment,
      sheetId
    ]
  );
  useEffect(() => {
    return () => {
      invalidateBarCountInPrepare();
    };
  }, [invalidateBarCountInPrepare]);
  const handleBarCountInTick = useCallback(
    (tick: BarCountInCountdownTick) => {
      setActiveBarCountInTick(tick);
      getEffectiveBarCountInOptions()?.onTick?.(tick);
      dispatchBarCountInHarnessEvent(SHEET_BAR_COUNT_IN_TICK_EVENT, tick);
    },
    [getEffectiveBarCountInOptions]
  );
  const handleCountdownStarted = useCallback(() => {
    if (activeBarCountInPlan) {
      setMessage("Bar count-in running.");
      return;
    }

    setActiveBarCountInTick(null);
    setMessage("Countdown running.");
  }, [activeBarCountInPlan]);
  const handleStartBlocked = useCallback(() => {
    setMessage("No valid sheet context. Metronome was stopped.");
  }, []);
  const handleStarted = useCallback(
    (context: SheetMetronomeStartContext | null) => {
      invalidateBarCountInPrepare();
      setActiveBarCountInPlan(null);
      setActiveBarCountInTick(null);
      setSession(context?.session ?? null);
      if (context?.session && shouldCreatePracticeAgainSession) {
        setConsumedSourceRecordingId(sourceRecordingId);
      }
      if (context?.session) {
        void sessionService.captureSessionEvent({
          sessionId: context.session.id,
          kind: "metronome_started"
        });
      }
      setMessage(
        isRecordingActive
          ? "Metronome playing; recording stays active."
          : "Metronome playing."
      );
    },
    [
      isRecordingActive,
      invalidateBarCountInPrepare,
      sessionService,
      shouldCreatePracticeAgainSession,
      sourceRecordingId
    ]
  );
  const handleStartFailed = useCallback(
    async (error: unknown, context: SheetMetronomeStartContext | null) => {
      invalidateBarCountInPrepare();
      setActiveBarCountInPlan(null);
      setActiveBarCountInTick(null);

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
    [invalidateBarCountInPrepare, sessionService]
  );
  const handleStopped = useCallback(async () => {
    invalidateBarCountInPrepare();
    setActiveBarCountInPlan(null);
    setActiveBarCountInTick(null);
    setErrorMessage(null);

    if (session) {
      void Promise.resolve()
        .then(() =>
          sessionService.captureSessionEvent({
            sessionId: session.id,
            kind: "metronome_stopped"
          })
        )
        .catch(() => undefined);

      try {
        const nextSession = await sessionService.updateSheetSessionDuration(
          session.id
        );

        setSession(nextSession);
      } catch (error) {
        setErrorMessage(getSessionWriteFailureMessage(error));
      }
    }

    setMessage(
      isRecordingActive
        ? "Metronome stopped; recording stays active."
        : "Metronome stopped."
    );
  }, [invalidateBarCountInPrepare, isRecordingActive, session, sessionService]);
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
    barCountIn: {
      enabled: activeBarCountInPlan !== null,
      plan: activeBarCountInPlan,
      onTick: handleBarCountInTick
    },
    beforeStart: ensureMetronomeSession,
    onCountdownStarted: handleCountdownStarted,
    onStartBlocked: handleStartBlocked,
    onStarted: handleStarted,
    onStartFailed: handleStartFailed,
    onStopped: handleStopped
  });
  useEffect(() => {
    if (!pendingBarCountInStartRef.current || activeBarCountInPlan === null) {
      return;
    }

    pendingBarCountInStartRef.current = false;
    void startMetronome();
  }, [activeBarCountInPlan, startMetronome]);
  const handleStartMetronome = useCallback(() => {
    setErrorMessage(null);
    setActiveBarCountInTick(null);
    const barCountInOptions = getEffectiveBarCountInOptions();

    if (barCountInOptions?.enabled) {
      if (
        isPreparingBarCountInRef.current ||
        pendingBarCountInStartRef.current
      ) {
        return;
      }

      const prepareRunId = barCountInPrepareRunIdRef.current + 1;

      barCountInPrepareRunIdRef.current = prepareRunId;
      isPreparingBarCountInRef.current = true;
      setActiveBarCountInPlan(null);
      setActiveBarCountInTick(null);

      void prepareBarCountInPlan(barCountInOptions, prepareRunId).then((plan) => {
        if (barCountInPrepareRunIdRef.current !== prepareRunId) {
          return;
        }

        isPreparingBarCountInRef.current = false;

        if (plan === null) {
          return;
        }

        pendingBarCountInStartRef.current = true;
        setActiveBarCountInPlan(plan);
      });

      return;
    }

    invalidateBarCountInPrepare();
    setActiveBarCountInPlan(null);
    setActiveBarCountInTick(null);
    void startMetronome();
  }, [
    getEffectiveBarCountInOptions,
    invalidateBarCountInPrepare,
    prepareBarCountInPlan,
    startMetronome
  ]);
  const handleStopMetronome = useCallback(() => {
    invalidateBarCountInPrepare();
    setActiveBarCountInPlan(null);
    setActiveBarCountInTick(null);
    void stopMetronome();
  }, [invalidateBarCountInPrepare, stopMetronome]);
  const arePreRunSettingsLocked = isPlaying || isCounting;
  const activeBarCountInTickDetail = useMemo(
    () => formatBarCountInTickDetail(activeBarCountInTick),
    [activeBarCountInTick]
  );
  const handleBarCountInEnabledChange = useCallback((enabled: boolean) => {
    invalidateBarCountInPrepare();
    setActiveBarCountInPlan(null);
    setIsBarCountInEnabled(enabled);
    setActiveBarCountInTick(null);
  }, [invalidateBarCountInPrepare]);
  const handleBarCountInMeasuresChange = useCallback(
    (measures: BarCountInBars) => {
      invalidateBarCountInPrepare();
      setActiveBarCountInPlan(null);
      setBarCountInMeasures(measures);
      setActiveBarCountInTick(null);
    },
    [invalidateBarCountInPrepare]
  );
  const handlePresetLoaded = useCallback(
    (state: {
      settings: MetronomeSettings;
      barCountIn: { enabled: boolean; bars: BarCountInBars };
    }) => {
      if (arePreRunSettingsLocked) {
        return;
      }

      invalidateBarCountInPrepare();
      setActiveBarCountInPlan(null);
      setActiveBarCountInTick(null);
      updateSettings(state.settings);
      setIsBarCountInEnabled(state.barCountIn.enabled);
      setBarCountInMeasures(state.barCountIn.bars);
    },
    [arePreRunSettingsLocked, invalidateBarCountInPrepare, updateSettings]
  );
  const showRecordAgain =
    activeRecordingWorkflowSheetId === sheetId &&
    rerecordStatus === "ready" &&
    rerecordSource !== null &&
    rerecordSource.sheetId === sheetId &&
    selectedRecordingSegmentId === rerecordSource.segmentContext.segmentId;
  const canRecordAgain =
    showRecordAgain &&
    recordingState === "idle" &&
    !recordingHarnessActive &&
    !sheetRecordingService.isRecording &&
    !isCounting &&
    !isStartingRecordAgain;

  async function validateRecordAgainSource() {
    const workflowState = useSheetPracticeRecordingWorkflowStore.getState();
    const sourceSelection = selectReadyRerecordSource({
      kind: "pre-start",
      sheetId,
      workflowState
    });

    if (sourceSelection.kind === "invalid") {
      invalidateRerecordSource(sheetId, "selection-changed");
      throwRecordAgainUnavailable();
    }

    const source = sourceSelection.value;
    const sourceRecording = sheetRecordingService.getRecording(source.recordingId);
    const recordingInspection = inspectReadyRerecordSourceRecording({
      recording: sourceRecording,
      sheetId,
      source
    });

    if (recordingInspection.kind === "invalid") {
      invalidateRerecordSource(sheetId, recordingInspection.reason);
      throwRecordAgainUnavailable();
    }

    const selectedSegment = await practiceSegmentService.getSegment(
      sheetId,
      source.segmentContext.segmentId
    );

    const segmentInspection = inspectRerecordSourceSegment({
      kind: "pre-start",
      segment: selectedSegment,
      sheetId,
      sourceContext: source.segmentContext
    });

    if (
      segmentInspection.kind === "missing" ||
      segmentInspection.kind === "sheet-mismatch"
    ) {
      setActiveRecordingSegment(sheetId, null);
    }

    if (segmentInspection.kind !== "valid") {
      invalidateRerecordSource(sheetId, segmentInspection.reason);
      throwRecordAgainUnavailable();
    }

    return source.segmentContext;
  }

  async function startSheetRecording(mode: SheetRecordingStartMode = "normal") {
    if (
      isStartingRecordingRef.current ||
      recordingState !== "idle" ||
      recordingHarnessActive ||
      sheetRecordingService.isRecording ||
      (mode === "record-again" && isCounting)
    ) {
      return;
    }

    isStartingRecordingRef.current = true;
    if (mode === "record-again") {
      setIsStartingRecordAgain(true);
    }

    setErrorMessage(null);
    let captureStarted = false;

    try {
      const recordAgainContext =
        mode === "record-again" ? await validateRecordAgainSource() : null;

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

      const recordingSegmentId =
        recordAgainContext?.segmentId ?? selectedRecordingSegmentId;

      setSession(nextSession);
      setConsumedSourceRecordingId(sourceRecordingId);
      await sessionService.captureSessionEvent({
        sessionId: nextSession.id,
        kind: "recording_started",
        segmentId: recordingSegmentId
      });
      setRecordingState("recording");
      beginWorkflowRecording(
        sheetId,
        recordingSegmentId
      );
      setMessage(
        recordAgainContext
          ? `Recording again for ${recordAgainContext.segmentName}.`
          : isPlaying
            ? "Recording while metronome plays."
            : "Recording without metronome."
      );
    } catch (error) {
      if (captureStarted) {
        await sheetRecordingService.discardCapture();
      }

      setRecordingState("idle");
      failWorkflowRecording(
        sheetId,
        error instanceof Error
          ? error.message
          : "Recording failed before it could start."
      );
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Recording failed before it could start."
      );
    } finally {
      isStartingRecordingRef.current = false;
      if (mode === "record-again") {
        setIsStartingRecordAgain(false);
      }
    }
  }

  async function resolveSelectedSegmentContext(): Promise<SheetRecordingSegmentContext | null> {
    if (!selectedRecordingSegmentId) {
      return null;
    }

    let selectedSegment: Awaited<ReturnType<typeof practiceSegmentService.getSegment>>;

    try {
      selectedSegment = await practiceSegmentService.getSegment(
        sheetId,
        selectedRecordingSegmentId
      );
    } catch {
      throw new Error("Selected segment could not be loaded. Recording was not saved.");
    }

    if (selectedSegment === null) {
      setActiveRecordingSegment(sheetId, null);
      invalidateRerecordSource(sheetId, "source-segment-missing");
      throw new Error("Selected segment no longer exists. Recording was not saved.");
    }

    if (selectedSegment.sheetId !== sheetId) {
      setActiveRecordingSegment(sheetId, null);
      invalidateRerecordSource(sheetId, "sheet-mismatch");
      throw new Error("Selected segment belongs to a different sheet. Recording was not saved.");
    }

    try {
      return createSheetRecordingSegmentContext(selectedSegment);
    } catch {
      throw new Error("Selected segment timing is invalid. Recording was not saved.");
    }
  }

  async function stopSheetRecording() {
    setErrorMessage(null);

    let segmentContext: SheetRecordingSegmentContext | null;

    try {
      segmentContext = await resolveSelectedSegmentContext();
    } catch (error) {
      const nextMessage =
        error instanceof Error
          ? error.message
          : "Selected segment could not be prepared. Recording was not saved.";

      await sheetRecordingService.discardCapture();
      setRecordingState("idle");
      failWorkflowRecording(sheetId, nextMessage);
      setErrorMessage(nextMessage);

      return;
    }

    setRecordingState("saving");
    beginWorkflowSaving(sheetId);

    try {
      const result = await sheetRecordingService.stopAndSave({
        sheetId,
        sessionId: session?.id ?? null,
        settings,
        segmentContext,
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
      finishWorkflowRecording(sheetId, result.recording);
      setMessage(
        isPlaying
          ? "Recording saved; metronome is still playing."
          : segmentContext
            ? `Recording saved for ${segmentContext.segmentName}.`
            : "Recording saved."
      );
    } catch (error) {
      setRecordingState("idle");
      failWorkflowRecording(
        sheetId,
        error instanceof Error ? error.message : "Recording could not be saved."
      );
      setErrorMessage(
        error instanceof Error ? error.message : "Recording could not be saved."
      );
    }
  }

  useEffect(() => {
    const harnessWindow = window as SheetPracticeControlsWindow;

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
          })
          .catch((error) => {
            setErrorMessage(getSessionWriteFailureMessage(error));
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
          activeBarCountInTickDetail={activeBarCountInTickDetail}
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
          bpmAccessory={
            <SegmentTempoApplyControl
              policy={segmentTempoPolicy}
              onApply={handleApplySegmentTempo}
            />
          }
          barCountInControl={
            <BarCountInControl
              enabled={isBarCountInEnabled}
              bars={barCountInMeasures}
              disabled={arePreRunSettingsLocked}
              activeTick={activeBarCountInTick}
              onEnabledChange={handleBarCountInEnabledChange}
              onBarsChange={handleBarCountInMeasuresChange}
            />
          }
          presetControl={
            <SheetMetronomePresetControl
              key={sheetId}
              sheetId={sheetId}
              selectedSegment={
                scopedSelectedTempoSegment
                  ? {
                      id: scopedSelectedTempoSegment.id,
                      name: scopedSelectedTempoSegment.name
                    }
                  : null
              }
              service={sheetMetronomePresetService}
              settings={settings}
              barCountIn={{
                enabled: isBarCountInEnabled,
                bars: barCountInMeasures
              }}
              disabled={arePreRunSettingsLocked}
              onPresetLoaded={handlePresetLoaded}
              onStatusMessage={setMessage}
              onErrorMessage={setErrorMessage}
            />
          }
          isCountdownReplacedByBarCountIn={isBarCountInEnabled}
          countdownReplacementText="Beat countdown is replaced by bar count-in for Sheet Practice."
        />

        <TransportActionsPanel
          lastTick={lastTick}
          session={session}
          recordings={recordings}
          latestSheetRecording={latestSheetRecording}
          message={message}
          errorMessage={errorMessage}
          activeBarCountInTickDetail={activeBarCountInTickDetail}
          transportState={transportState}
          isPlaying={isPlaying}
          isCounting={isCounting}
          isSheetRecording={isSheetRecording}
          recordingState={recordingState}
          startMetronome={handleStartMetronome}
          stopMetronome={handleStopMetronome}
          startSheetRecording={() => void startSheetRecording()}
          stopSheetRecording={() => void stopSheetRecording()}
          showRecordAgain={showRecordAgain}
          canRecordAgain={canRecordAgain}
          isStartingRecordAgain={isStartingRecordAgain}
          startRecordAgain={() => void startSheetRecording("record-again")}
        />
      </div>
      <div className="border-border grid gap-3 border-t px-3 py-3 xl:grid-cols-[minmax(18rem,0.85fr)_minmax(24rem,1.15fr)]">
        <PracticeSegmentSelectorPanel
          sheetId={sheetId}
          initialSegmentId={returnSegmentId}
          practiceSegmentService={practiceSegmentService}
          measureGridService={measureGridService}
          measureGridRevision={measureGridRevision}
          onSelectedSegmentChange={handleSelectedSegmentChange}
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
