"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  DEFAULT_CONTINUE_PRACTICE_TARGET_LIMIT,
  type ContinuePracticeTargetsResult
} from "@/domain/practice";
import { browserPracticeSessionService } from "@/infrastructure/db/browser-practice-session-service";

export type CommandPaletteContinueTargetsStatus =
  | "idle"
  | "loading"
  | "loaded"
  | "error";

type CommandPaletteContinueTargetsSnapshot = {
  continueTargets: ContinuePracticeTargetsResult;
  continueTargetsStatus: CommandPaletteContinueTargetsStatus;
  continueTargetsErrorMessage: string | null;
};

export type CommandPaletteContinueTargetsState = CommandPaletteContinueTargetsSnapshot & {
  refreshContinueTargets: (
    options?: CommandPaletteContinueTargetsRefreshOptions
  ) => Promise<void>;
};

export type CommandPaletteContinueTargetsRefreshOptions = {
  clearTargets?: boolean;
};

const emptyContinueTargets: ContinuePracticeTargetsResult = {
  targets: [],
  generatedAt: "",
  limit: DEFAULT_CONTINUE_PRACTICE_TARGET_LIMIT,
  rejected: []
};

const continueTargetsErrorMessage =
  "Continue Practice targets could not be loaded.";

export function useCommandPaletteContinueTargets(
  limit = DEFAULT_CONTINUE_PRACTICE_TARGET_LIMIT
): CommandPaletteContinueTargetsState {
  const [state, setState] = useState<CommandPaletteContinueTargetsSnapshot>({
    continueTargets: {
      ...emptyContinueTargets,
      limit
    },
    continueTargetsStatus: "loading",
    continueTargetsErrorMessage: null
  });
  const isMountedRef = useRef(false);
  const latestRefreshIdRef = useRef(0);

  const refreshContinueTargets = useCallback(async ({
    clearTargets = false
  }: CommandPaletteContinueTargetsRefreshOptions = {}) => {
    if (!isMountedRef.current) {
      return;
    }

    if (typeof indexedDB === "undefined") {
      setState({
        continueTargets: {
          ...emptyContinueTargets,
          limit
        },
        continueTargetsStatus: "loaded",
        continueTargetsErrorMessage: null
      });
      return;
    }

    const refreshId = latestRefreshIdRef.current + 1;
    latestRefreshIdRef.current = refreshId;

    if (isMountedRef.current) {
      setState((currentState) => ({
        ...currentState,
        continueTargets: clearTargets
          ? {
              ...emptyContinueTargets,
              limit
            }
          : currentState.continueTargets,
        continueTargetsStatus: "loading",
        continueTargetsErrorMessage: null
      }));
    }

    try {
      const continueTargets =
        await browserPracticeSessionService.getContinuePracticeTargets({
          limit
        });

      if (!isMountedRef.current || refreshId !== latestRefreshIdRef.current) {
        return;
      }

      setState({
        continueTargets,
        continueTargetsStatus: "loaded",
        continueTargetsErrorMessage: null
      });
    } catch {
      if (!isMountedRef.current || refreshId !== latestRefreshIdRef.current) {
        return;
      }

      setState((currentState) => ({
        ...currentState,
        continueTargets: {
          ...emptyContinueTargets,
          limit
        },
        continueTargetsStatus: "error",
        continueTargetsErrorMessage: continueTargetsErrorMessage
      }));
    }
  }, [limit]);

  useEffect(() => {
    isMountedRef.current = true;

    void Promise.resolve().then(() => refreshContinueTargets());

    const unsubscribe = browserPracticeSessionService.subscribe(() => {
      void refreshContinueTargets();
    });

    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, [refreshContinueTargets]);

  return {
    ...state,
    refreshContinueTargets
  };
}
