"use client";

import { useEffect, useRef, useState } from "react";

import { browserSheetViewerService } from "@/infrastructure/sheet-viewer/browser-sheet-viewer-service";
import type {
  SheetPageThumbnailSet,
  SheetViewerLoadState,
  SheetViewerObjectUrls
} from "@/services/sheet-viewer/types";

export type SheetViewerPageThumbnailState =
  | { status: "idle" }
  | { status: "loading" }
  | SheetPageThumbnailSet;

type ReadyThumbnailSet = Extract<SheetPageThumbnailSet, { status: "ready" }>;

function sheetViewerLoadFailedState(): SheetViewerLoadState {
  return {
    status: "error",
    code: "load-failed",
    title: "Sheet viewer unavailable",
    message: "The sheet could not be loaded. Return to Sheet Library and try again."
  };
}

function thumbnailLoadFailedState(): SheetPageThumbnailSet {
  return {
    status: "error",
    code: "load-failed",
    title: "Thumbnails unavailable",
    message: "Sheet thumbnails could not be loaded."
  };
}

export function useBrowserSheetViewer(sheetId: string | null): SheetViewerLoadState | { status: "loading" } {
  const [state, setState] = useState<{
    sheetId: string | null;
    value: SheetViewerLoadState;
  } | null>(null);

  useEffect(() => {
    let isActive = true;

    void browserSheetViewerService
      .loadSheet(sheetId)
      .then((nextState) => {
        if (!isActive) {
          return;
        }

        setState({
          sheetId,
          value: nextState
        });
      })
      .catch(() => {
        if (!isActive) {
          return;
        }

        setState({
          sheetId,
          value: sheetViewerLoadFailedState()
        });
      });

    return () => {
      isActive = false;
    };
  }, [sheetId]);

  if (state?.sheetId !== sheetId) {
    return { status: "loading" };
  }

  return state.value;
}

export function useBrowserSheetViewerObjectUrls(
  state: SheetViewerLoadState | { status: "loading" }
): SheetViewerObjectUrls | null {
  const [objectUrls, setObjectUrls] = useState<SheetViewerObjectUrls | null>(null);

  useEffect(() => {
    if (state.status !== "ready") {
      return;
    }

    const nextObjectUrls = browserSheetViewerService.createArtifactObjectUrls(state.artifact);
    let isActive = true;

    queueMicrotask(() => {
      if (isActive) {
        setObjectUrls(nextObjectUrls);
      }
    });

    return () => {
      isActive = false;
      browserSheetViewerService.revokeArtifactObjectUrls(nextObjectUrls);
    };
  }, [state]);

  if (state.status !== "ready" || objectUrls?.sheetId !== state.sheet.id) {
    return null;
  }

  return objectUrls;
}

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

    void browserSheetViewerService
      .loadPageThumbnails(sheetId)
      .then((nextState) => {
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
      })
      .catch(() => {
        if (!isActive) {
          return;
        }

        revokeCurrentReadySet();
        setState({
          sheetId,
          value: thumbnailLoadFailedState()
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
