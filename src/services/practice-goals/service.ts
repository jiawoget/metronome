import { evaluatePracticeGoalCompletion } from "@/domain/practice";
import type {
  CreatePracticeGoalServiceOptions,
  PracticeGoalService
} from "@/services/practice-goals/types";

export function createPracticeGoalId() {
  if (typeof globalThis.crypto?.randomUUID !== "function") {
    throw new TypeError("Practice goal IDs require crypto.randomUUID().");
  }

  return crypto.randomUUID();
}

export function createPracticeGoalService({
  repository,
  sessionRepository,
  recordingRepository,
  now = () => new Date()
}: CreatePracticeGoalServiceOptions): PracticeGoalService {
  return {
    async listPracticeGoals() {
      return repository.listGoals();
    },

    async getPracticeGoal(goalId) {
      return repository.getGoal(goalId);
    },

    async savePracticeGoal(goal) {
      return repository.saveGoal(goal);
    },

    async deletePracticeGoal(goalId) {
      return repository.deleteGoal(goalId);
    },

    async getPracticeGoalEvaluations() {
      const evaluationNow = now();
      const [goals, sessions, recordings] = await Promise.all([
        repository.listGoals(),
        sessionRepository.listSessions(),
        recordingRepository.listRecordingMetadata()
      ]);

      return evaluatePracticeGoalCompletion({
        goals,
        sessions,
        recordings,
        now: evaluationNow
      });
    },

    subscribe(listener) {
      return repository.subscribe?.(listener) ?? (() => undefined);
    }
  };
}
