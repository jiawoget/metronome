"use client";

import { DeterministicBilibiliSearchAdapter } from "@/infrastructure/bilibili/deterministic-bilibili-search-adapter";
import { FetchBilibiliSearchAdapter } from "@/infrastructure/bilibili/fetch-bilibili-search-adapter";
import { BrowserLocalAudioInspectionAdapter } from "@/infrastructure/reference/local-audio-inspection-adapter";
import { referenceRepository } from "@/infrastructure/reference/reference-repository";
import { createReferenceService } from "@/services/reference";

declare global {
  interface Window {
    __referenceSystemUseFixtureSearch?: boolean;
  }
}

function createBilibiliSearchAdapter() {
  if (typeof window !== "undefined" && window.__referenceSystemUseFixtureSearch === true) {
    return new DeterministicBilibiliSearchAdapter();
  }

  return new FetchBilibiliSearchAdapter();
}

export const browserReferenceService = createReferenceService({
  repository: referenceRepository,
  localAudioInspectionAdapter: new BrowserLocalAudioInspectionAdapter(),
  bilibiliSearchAdapter: createBilibiliSearchAdapter()
});
