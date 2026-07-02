"use client";

import { browserPracticeGoalService } from "@/infrastructure/db/browser-practice-goal-service";

// Public browser-facing P3-14 goal service boundary for UI/hooks.
export const practiceGoalService = browserPracticeGoalService;
