"use client";

import { practiceGoalRepository } from "@/infrastructure/db/practice-goal-repository";
import { practiceSessionRepository } from "@/infrastructure/db/practice-session-repository";
import { recordingHistoryMetadataRepository } from "@/infrastructure/db/recording-history-metadata-repository";
import { createPracticeGoalService } from "@/services/practice-goals";

export const browserPracticeGoalService = createPracticeGoalService({
  repository: practiceGoalRepository,
  sessionRepository: practiceSessionRepository,
  recordingRepository: recordingHistoryMetadataRepository
});
