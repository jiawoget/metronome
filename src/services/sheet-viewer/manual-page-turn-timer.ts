import { createSheetRecordingSegmentContext, type PracticeSegment } from "@/domain/practice";

export type ManualSegmentPageTurnTimerApi = {
  setTimeout: (handler: () => void, timeoutMs: number) => number;
  clearTimeout: (timerId: number) => void;
};

export type ManualSegmentPageTurnTimer = {
  cancel: () => void;
};

export function getManualSegmentPageTurnDelayMs(segment: PracticeSegment | null | undefined) {
  if (!segment) {
    return null;
  }

  try {
    const { measureRangeMs } = createSheetRecordingSegmentContext(segment);
    const delayMs = measureRangeMs.endMs - measureRangeMs.startMs;

    return Number.isFinite(delayMs) && delayMs > 0 ? delayMs : null;
  } catch {
    return null;
  }
}

export const getSheetViewerAssistedPageTurnDelayMs = getManualSegmentPageTurnDelayMs;

export function armManualSegmentPageTurnTimer({
  delayMs,
  onElapsed,
  timerApi
}: {
  delayMs: number;
  onElapsed: () => void;
  timerApi: ManualSegmentPageTurnTimerApi;
}): ManualSegmentPageTurnTimer | null {
  if (!Number.isFinite(delayMs) || delayMs <= 0) {
    return null;
  }

  // PACK_F_APPROVED_RUNTIME_TIMER_EXCEPTION: manual segment page-turn UI delay, not audio/countdown scheduling.
  const timerId = timerApi.setTimeout(onElapsed, delayMs);
  let active = true;

  return {
    cancel() {
      if (!active) {
        return;
      }

      active = false;
      timerApi.clearTimeout(timerId);
    }
  };
}
