"use client";

import { useEffect } from "react";

export const ACTIVE_RECORDING_NAVIGATION_EVENT =
  "metronome:active-recording-navigation";

export type ActiveRecordingNavigationEventDetail = {
  sourceId: string;
  label: string;
  active: boolean;
};

export function useActiveRecordingNavigationGuard(
  sourceId: string,
  active: boolean,
  label: string
) {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.dispatchEvent(
      new CustomEvent<ActiveRecordingNavigationEventDetail>(
        ACTIVE_RECORDING_NAVIGATION_EVENT,
        {
          detail: {
            sourceId,
            label,
            active
          }
        }
      )
    );

    return () => {
      window.dispatchEvent(
        new CustomEvent<ActiveRecordingNavigationEventDetail>(
          ACTIVE_RECORDING_NAVIGATION_EVENT,
          {
            detail: {
              sourceId,
              label,
              active: false
            }
          }
        )
      );
    };
  }, [active, label, sourceId]);
}
