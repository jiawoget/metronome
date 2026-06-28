import type { PracticeSession } from "@/domain/practice";

export type PracticeSessionSnapshotRollbackPort = {
  restorePracticeSessionSnapshot: (
    session: PracticeSession
  ) => Promise<PracticeSession>;
  deletePracticeSessionSnapshot: (sessionId: string) => Promise<void>;
};

export async function restoreOrDeletePracticeSessionSnapshot({
  previousSession,
  createdSessionId,
  sessionService
}: {
  previousSession: PracticeSession | null;
  createdSessionId: string;
  sessionService: PracticeSessionSnapshotRollbackPort;
}) {
  if (previousSession) {
    await sessionService.restorePracticeSessionSnapshot(previousSession);
    return;
  }

  await sessionService.deletePracticeSessionSnapshot(createdSessionId);
}
