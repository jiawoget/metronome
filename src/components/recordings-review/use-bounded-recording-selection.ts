"use client";

import { useCallback, useMemo, useState } from "react";

type BoundedRecordingSelectionState = {
  recordingIds: string[];
  requestVersion: number;
};

export function useBoundedRecordingSelection({
  visibleRecordingIds,
  maxSelected
}: {
  visibleRecordingIds: readonly string[];
  maxSelected: number;
}) {
  const [selection, setSelection] = useState<BoundedRecordingSelectionState>({
    recordingIds: [],
    requestVersion: 0
  });
  const visibleRecordingIdSet = useMemo(
    () => new Set(visibleRecordingIds),
    [visibleRecordingIds]
  );
  const visibleSelectedIds = useMemo(
    () =>
      selection.recordingIds.filter((recordingId) =>
        visibleRecordingIdSet.has(recordingId)
      ),
    [selection.recordingIds, visibleRecordingIdSet]
  );
  const requestKey = visibleSelectedIds.join("|");
  const requestId = `${requestKey}:${selection.requestVersion}`;
  const toggleRecordingId = useCallback(
    (recordingId: string) => {
      setSelection((currentSelection) => {
        const currentVisibleIds = currentSelection.recordingIds.filter((id) =>
          visibleRecordingIdSet.has(id)
        );

        if (currentVisibleIds.includes(recordingId)) {
          return {
            recordingIds: currentVisibleIds.filter((id) => id !== recordingId),
            requestVersion: currentSelection.requestVersion + 1
          };
        }

        if (currentVisibleIds.length >= maxSelected) {
          if (currentVisibleIds.length === currentSelection.recordingIds.length) {
            return currentSelection;
          }

          return {
            recordingIds: currentVisibleIds,
            requestVersion: currentSelection.requestVersion + 1
          };
        }

        return {
          recordingIds: [...currentVisibleIds, recordingId],
          requestVersion: currentSelection.requestVersion + 1
        };
      });
    },
    [maxSelected, visibleRecordingIdSet]
  );
  const removeRecordingId = useCallback((recordingId: string) => {
    setSelection((currentSelection) => {
      if (!currentSelection.recordingIds.includes(recordingId)) {
        return currentSelection;
      }

      return {
        recordingIds: currentSelection.recordingIds.filter(
          (id) => id !== recordingId
        ),
        requestVersion: currentSelection.requestVersion + 1
      };
    });
  }, []);
  const isSelected = useCallback(
    (recordingId: string) => visibleSelectedIds.includes(recordingId),
    [visibleSelectedIds]
  );
  const isDisabled = useCallback(
    (recordingId: string) =>
      visibleSelectedIds.length >= maxSelected &&
      !visibleSelectedIds.includes(recordingId),
    [maxSelected, visibleSelectedIds]
  );

  return {
    visibleSelectedIds,
    requestId,
    selectedCount: visibleSelectedIds.length,
    toggleRecordingId,
    removeRecordingId,
    isSelected,
    isDisabled
  };
}
