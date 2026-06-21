"use client";

import { useEffect, useState } from "react";

import { browserSheetViewerService } from "@/infrastructure/sheet-viewer/browser-sheet-viewer-service";
import type { SheetViewerLoadState, SheetViewerObjectUrls } from "@/services/sheet-viewer";

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
