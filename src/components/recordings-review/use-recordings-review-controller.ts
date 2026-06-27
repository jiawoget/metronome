"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";

import {
  recordingsReviewService,
  type RecordingsReviewService
} from "@/services/recordings-review";
import type {
  RecordingReviewSnapshot,
  RecordingTakeGroup,
  ReviewRecording
} from "@/lib/recordings-review/types";
import type { WaveformComparisonSourcesResult } from "@/lib/recordings-review/waveform-comparison-sources";

const emptyClientSnapshot: RecordingReviewSnapshot = {
  sessions: [],
  recordings: [],
  errorMarkers: []
};

type WaveformComparisonState = {
  key: string;
  result: WaveformComparisonSourcesResult | null;
  errorMessage: string | null;
};

export function useRecordingsReviewController(
  service: RecordingsReviewService = recordingsReviewService
) {
  const liveSnapshot = useSyncExternalStore(
    service.subscribe,
    service.getSnapshot,
    () => emptyClientSnapshot
  );
  const [clientReady, setClientReady] = useState(false);
  const snapshot = clientReady ? liveSnapshot : emptyClientSnapshot;

  useEffect(() => {
    const timerId = window.setTimeout(() => setClientReady(true), 0);

    return () => window.clearTimeout(timerId);
  }, []);

  const actions = useMemo(
    () => ({
      service,
      deleteRecording(recording: ReviewRecording) {
        service.deleteRecording(recording.id);
      },
      toggleFavorite(recording: ReviewRecording, favorite: boolean) {
        service.setRecordingFavorite(recording.id, !favorite);
      },
      toggleBestTake({
        group,
        recording,
        isCurrentBest
      }: {
        group: RecordingTakeGroup;
        recording: ReviewRecording;
        isCurrentBest: boolean;
      }) {
        service.setBestTake(group, isCurrentBest ? null : recording.id);
      },
      toggleActiveTake({
        group,
        recording,
        isCurrentActive
      }: {
        group: RecordingTakeGroup;
        recording: ReviewRecording;
        isCurrentActive: boolean;
      }) {
        service.setActiveTake(group, isCurrentActive ? null : recording.id);
      }
    }),
    [service]
  );

  return {
    snapshot,
    ...actions
  };
}

export function useRecordingComparisonWaveformSources({
  service,
  recordingIds,
  requestId
}: {
  service: RecordingsReviewService;
  recordingIds: string[];
  requestId: string;
}) {
  return useWaveformComparisonSources({
    requestId,
    enabled: recordingIds.length > 1,
    loadSources: useCallback(
      () => service.loadWaveformComparisonSourcesForRecordingIds(recordingIds),
      [recordingIds, service]
    ),
    errorMessage: "Recording comparison waveform evidence could not be loaded."
  });
}

export function useTakeGroupWaveformSources({
  service,
  group,
  recordingIds,
  requestId
}: {
  service: RecordingsReviewService;
  group: RecordingTakeGroup;
  recordingIds: string[];
  requestId: string;
}) {
  return useWaveformComparisonSources({
    requestId,
    enabled: recordingIds.length > 0,
    loadSources: useCallback(
      () =>
        service.loadWaveformComparisonSourcesForGroup({
          group,
          recordingIds
        }),
      [group, recordingIds, service]
    ),
    errorMessage: "Waveform comparison sources could not be loaded."
  });
}

function useWaveformComparisonSources({
  requestId,
  enabled,
  loadSources,
  errorMessage
}: {
  requestId: string;
  enabled: boolean;
  loadSources: () => Promise<WaveformComparisonSourcesResult>;
  errorMessage: string;
}) {
  const [state, setState] = useState<WaveformComparisonState | null>(null);
  const result = enabled && state?.key === requestId ? state.result : null;
  const currentErrorMessage =
    enabled && state?.key === requestId ? state.errorMessage : null;
  const loading = enabled && !result && !currentErrorMessage;

  useEffect(() => {
    let cancelled = false;

    if (!enabled) {
      return () => {
        cancelled = true;
      };
    }

    loadSources()
      .then((nextResult) => {
        if (cancelled) {
          return;
        }

        setState({
          key: requestId,
          result: nextResult,
          errorMessage: null
        });
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setState({
          key: requestId,
          result: null,
          errorMessage
        });
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, errorMessage, loadSources, requestId]);

  return {
    result,
    errorMessage: currentErrorMessage,
    loading
  };
}
