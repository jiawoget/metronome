import { evaluatePracticeGoalCompletion } from "@/domain/practice";
import type {
  CreatePracticeGoalServiceOptions,
  PracticeGoalService
} from "@/services/practice-goals/types";

export function createPracticeGoalService({
  repository,
  sessionRepository,
  recordingRepository,
  now = () => new Date()
}: CreatePracticeGoalServiceOptions): PracticeGoalService {
  return {
    listPracticeGoals() {
      return repository.listGoals();
    },

    getPracticeGoal(goalId) {
      return repository.getGoal(goalId);
    },

    savePracticeGoal(goal) {
      return repository.saveGoal(goal);
    },

    deletePracticeGoal(goalId) {
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
