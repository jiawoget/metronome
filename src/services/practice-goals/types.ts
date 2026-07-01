import type {
  GoalCompletionEvaluation,
  LocalPracticeGoal
} from "@/domain/practice";
import type {
  PracticeRecordingMetadataRepository,
  PracticeSessionRepository
} from "@/services/practice-session";

export type PracticeGoalRepository = {
  listGoals: () => Promise<LocalPracticeGoal[]>;
  getGoal: (goalId: string) => Promise<LocalPracticeGoal | null>;
  saveGoal: (goal: LocalPracticeGoal) => Promise<void>;
  deleteGoal: (goalId: string) => Promise<void>;
  clear: () => Promise<void>;
  subscribe?: (listener: () => void) => () => void;
};

export type PracticeGoalService = {
  listPracticeGoals: () => Promise<LocalPracticeGoal[]>;
  getPracticeGoal: (goalId: string) => Promise<LocalPracticeGoal | null>;
  savePracticeGoal: (goal: LocalPracticeGoal) => Promise<void>;
  deletePracticeGoal: (goalId: string) => Promise<void>;
  getPracticeGoalEvaluations: () => Promise<GoalCompletionEvaluation[]>;
  subscribe: (listener: () => void) => () => void;
};

export type CreatePracticeGoalServiceOptions = {
  repository: PracticeGoalRepository;
  sessionRepository: Pick<PracticeSessionRepository, "listSessions">;
  recordingRepository: Pick<PracticeRecordingMetadataRepository, "listRecordingMetadata">;
  now?: () => Date;
};
