"use client";

import { DeterministicBilibiliSearchAdapter } from "@/infrastructure/bilibili/deterministic-bilibili-search-adapter";
import { BrowserLocalAudioInspectionAdapter } from "@/infrastructure/reference/local-audio-inspection-adapter";
import { referenceRepository } from "@/infrastructure/reference/reference-repository";
import { createReferenceService } from "@/services/reference";

export const browserReferenceService = createReferenceService({
  repository: referenceRepository,
  localAudioInspectionAdapter: new BrowserLocalAudioInspectionAdapter(),
  bilibiliSearchAdapter: new DeterministicBilibiliSearchAdapter()
});
