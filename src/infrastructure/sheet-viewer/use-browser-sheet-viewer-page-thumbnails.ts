"use client";

import { useEffect, useRef, useState } from "react";

import { browserSheetViewerService } from "@/infrastructure/sheet-viewer/browser-sheet-viewer-service";
import type { SheetPageThumbnailSet } from "@/services/sheet-viewer";

export type SheetViewerPageThumbnailState =
  | { status: "idle" }
  | { status: "loading" }
  | SheetPageThumbnailSet;

type ReadyThumbnailSet = Extract<SheetPageThumbnailSet, { status: "ready" }>;

export function useBrowserSheetViewerPageThumbnails(sheetId: string | null): SheetViewerPageThumbnailState {
  const [state, setState] = useState<{
    sheetId: string | null;
    value: SheetViewerPageThumbnailState;
  }>({
    sheetId: null,
    value: { status: "idle" }
  });
  const readySetRef = useRef<ReadyThumbnailSet | null>(null);

  useEffect(() => {
    let isActive = true;

    function revokeCurrentReadySet() {
      if (readySetRef.current) {
        browserSheetViewerService.revokePageThumbnails(readySetRef.current);
        readySetRef.current = null;
      }
    }

    if (!sheetId) {
      revokeCurrentReadySet();
      queueMicrotask(() => {
        if (isActive) {
          setState({
            sheetId: null,
            value: { status: "idle" }
          });
        }
      });

      return () => {
        isActive = false;
      };
    }

    queueMicrotask(() => {
      if (isActive) {
        setState({
          sheetId,
          value: { status: "loading" }
        });
      }
    });

    void browserSheetViewerService.loadPageThumbnails(sheetId).then((nextState) => {
      if (!isActive) {
        if (nextState.status === "ready") {
          browserSheetViewerService.revokePageThumbnails(nextState);
        }

        return;
      }

      revokeCurrentReadySet();

      if (nextState.status === "ready") {
        readySetRef.current = nextState;
      }

      setState({
        sheetId,
        value: nextState
      });
    });

    return () => {
      isActive = false;
      revokeCurrentReadySet();
    };
  }, [sheetId]);

  if (state.sheetId !== sheetId) {
    return sheetId ? { status: "loading" } : { status: "idle" };
  }

  return state.value;
}
