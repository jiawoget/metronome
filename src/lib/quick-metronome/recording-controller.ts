import type { PracticeSession } from "@/domain/practice";
import type { PracticeSessionService } from "@/services/practice-session";
import { createQuickRecording } from "@/lib/quick-metronome/session";
import {
  assertRecordingArtifactCleanup,
  cleanupCommittedRecordingArtifacts,
  saveCapturedRecordingArtifact
} from "@/lib/recordings-review/artifact-service";
import { recordingHistoryRepository } from "@/lib/recordings-review/repository";
import type {
  MetronomeSettings,
  QuickRecording,
  RecordingArtifact
} from "@/lib/quick-metronome/types";

async function restoreLinkedQuickPracticeSession({
  previousSession,
  linkedSession,
  sessionService
}: {
  previousSession: PracticeSession | null;
  linkedSession: PracticeSession | null;
  sessionService: Pick<
    PracticeSessionService,
    "restorePracticeSessionSnapshot" | "deletePracticeSessionSnapshot"
  >;
}) {
  if (!linkedSession) {
    return;
  }

  if (previousSession) {
    await sessionService.restorePracticeSessionSnapshot(previousSession);
    return;
  }

  await sessionService.deletePracticeSessionSnapshot(linkedSession.id);
}

function isQuickRecording(recording: { type: string }): recording is QuickRecording {
  return recording.type === "quick";
}

function getLatestQuickRecording() {
  return recordingHistoryRepository
    .getSnapshot()
    .recordings.find(isQuickRecording) ?? null;
}

function saveQuickRecordingMetadata(recording: QuickRecording) {
  recordingHistoryRepository.saveQuickRecordingMetadata(recording);

  return {
    ...recording,
    audioDataUrl: null
  };
}

function deleteQuickRecordingMetadataByIdentity(recording: QuickRecording) {
  return recordingHistoryRepository.deleteQuickRecordingMetadataByIdentity({
    recordingId: recording.id,
    sessionId: recording.sessionId,
    createdAt: recording.createdAt
  });
}

export const quickRecordingController = {
  subscribe: recordingHistoryRepository.subscribe,
  getLatestQuickRecording,
  async clear() {
    const result = recordingHistoryRepository.clearQuickRecordings();
    const cleanupResult = await cleanupCommittedRecordingArtifacts(
      result.artifactCleanupRecordingIds
    );

    assertRecordingArtifactCleanup(cleanupResult);
  },
  async saveCapturedQuickRecording({
    artifact,
    session,
    settings,
    isPlaying,
    sessionService
  }: {
    artifact: RecordingArtifact;
    session: PracticeSession | null;
    settings: MetronomeSettings;
    isPlaying: boolean;
    sessionService: Pick<
      PracticeSessionService,
      | "linkRecordingToSession"
      | "endPracticeSession"
      | "restorePracticeSessionSnapshot"
      | "deletePracticeSessionSnapshot"
    >;
  }) {
    if (artifact.sizeBytes <= 0) {
      throw new Error("Recording artifact was empty.");
    }

    if (artifact.analysis?.isSilent) {
      throw new Error("Recording artifact did not contain audible input.");
    }

    if (!session) {
      throw new Error("Recording requires an active practice session.");
    }

    const recording = createQuickRecording({ artifact, session, settings });
    let artifactSaved = false;
    let metadataSaved: QuickRecording | null = null;
    let linkedSession: PracticeSession | null = null;

    try {
      // Body first, then session link, then metadata; rollback cleanup stays best-effort.
      await saveCapturedRecordingArtifact({
        recordingId: recording.id,
        recordingType: "quick",
        artifact,
        createdAt: recording.createdAt
      });
      artifactSaved = true;

      linkedSession = await sessionService.linkRecordingToSession({
        sessionId: session.id,
        recordingId: recording.id
      });

      if (!linkedSession) {
        throw new Error("Recording requires an active practice session.");
      }

      metadataSaved = saveQuickRecordingMetadata(recording);
      const nextSession = isPlaying
        ? linkedSession
        : await sessionService.endPracticeSession(linkedSession.id);

      return {
        recording: metadataSaved,
        session: nextSession
      };
    } catch (error) {
      const rollbackErrors: unknown[] = [];

      if (metadataSaved) {
        try {
          const result =
            deleteQuickRecordingMetadataByIdentity(metadataSaved);
          const cleanupResult = await cleanupCommittedRecordingArtifacts(
            result.artifactCleanupRecordingIds
          );

          assertRecordingArtifactCleanup(cleanupResult);
        } catch (rollbackError) {
          rollbackErrors.push(rollbackError);
        }
      } else if (artifactSaved) {
        try {
          const cleanupResult = await cleanupCommittedRecordingArtifacts([recording.id]);

          assertRecordingArtifactCleanup(cleanupResult);
        } catch (rollbackError) {
          rollbackErrors.push(rollbackError);
        }
      }

      await restoreLinkedQuickPracticeSession({
        previousSession: session,
        linkedSession,
        sessionService
      }).catch((rollbackError) => {
        rollbackErrors.push(rollbackError);
      });

      if (rollbackErrors.length > 0) {
        throw new Error("Recording save failed, and rollback cleanup could not fully restore local state.");
      }

      throw error;
    }
  }
};
