import type { PracticeSession, SheetRecordingMetadata } from "@/domain/practice";
import {
  cleanupCommittedRecordingArtifactsOrThrow,
  createRecordingArtifactRef,
  saveCapturedRecordingArtifact
} from "@/lib/recordings-review/artifact-storage";
import { restoreOrDeletePracticeSessionSnapshot } from "@/services/practice-session/snapshot-rollback";
import {
  loadRecordingArtifactDetailsFromBody
} from "@/lib/recordings-review/artifact-details";
import { hasUsablePeaks } from "@/services/audio-analysis";
import { recordingHistoryRepository } from "@/lib/recordings-review/repository";
import type { RecordingArtifactDetails, ReviewRecording } from "@/lib/recordings-review/types";
import type { MetronomeSettings, RecordingArtifact } from "@/lib/quick-metronome/types";
import { createBrowserRecordingCaptureService } from "@/infrastructure/audio/browser-recording-capture";
import type {
  RecordingCaptureService,
  SaveSheetRecordingInput,
  SaveSheetRecordingResult,
  SheetRecordingService
} from "@/services/recording";

export type { SaveSheetRecordingInput, SaveSheetRecordingResult } from "@/services/recording";

function roundDuration(durationMs: number) {
  return Math.max(0, Math.round(durationMs));
}

export function createSheetReviewRecording({
  metadata,
  artifact,
  settings,
  trustedPeaks = []
}: {
  metadata: SheetRecordingMetadata;
  artifact: RecordingArtifact;
  settings: MetronomeSettings;
  trustedPeaks?: number[];
}): ReviewRecording {
  const durationMs = roundDuration(artifact.analysis?.decodedDurationMs ?? artifact.durationMs);

  return {
    id: metadata.id,
    type: "sheet",
    origin: "user",
    name: metadata.sheetName ? `${metadata.sheetName} take` : "Sheet practice take",
    sessionId: metadata.sessionId,
    sheetId: metadata.sheetId,
    sheetName: metadata.sheetName,
    createdAt: metadata.createdAt,
    durationMs,
    sizeBytes: artifact.sizeBytes,
    mimeType: artifact.mimeType,
    artifactRef: createRecordingArtifactRef(metadata.id),
    audioDataUrl: null,
    artifactAnalysis: artifact.analysis,
    trustedPeaks,
    segmentContext: metadata.segmentContext,
    settings: {
      bpm: metadata.bpm ?? settings.bpm,
      timeSignature: metadata.timeSignature ?? settings.timeSignature,
      subdivision: settings.subdivision,
      accent: settings.accent,
      countdownBeats: settings.countdownBeats
    }
  };
}

function saveSheetReviewRecordingWithSession({
  recording,
  session
}: {
  recording: ReviewRecording;
  session: PracticeSession;
}) {
  recordingHistoryRepository.saveSheetRecordingMetadataWithSession({
    recording,
    session
  });
}

async function rollbackSheetReviewRecordingMetadata(recording: {
  id: string;
  sessionId: string;
  createdAt: string;
  previousSession: PracticeSession | null;
}) {
  const result = recordingHistoryRepository.rollbackSheetRecordingMetadata({
    recordingId: recording.id,
    sessionId: recording.sessionId,
    createdAt: recording.createdAt,
    previousSession: recording.previousSession
  });
  await cleanupCommittedRecordingArtifactsOrThrow(
    [...result.artifactCleanupRecordingIds, recording.id]
  );
}

async function captureSheetRecordingStopped({
  sessionService,
  metadata
}: Pick<SaveSheetRecordingInput, "sessionService"> & {
  metadata: SheetRecordingMetadata;
}) {
  try {
    await sessionService.captureSessionEvent({
      sessionId: metadata.sessionId,
      kind: "recording_stopped",
      sheetId: metadata.sheetId,
      segmentId: metadata.segmentContext?.segmentId ?? null,
      recordingId: metadata.id
    });
  } catch {
    return null;
  }
}

export class BrowserSheetRecordingService implements SheetRecordingService {
  constructor(private readonly captureService: RecordingCaptureService = createBrowserRecordingCaptureService()) {}

  get isRecording() {
    return this.captureService.isRecording;
  }

  getRecording(recordingId: string) {
    return recordingHistoryRepository.getRecording(recordingId);
  }

  getLatestSheetRecording(sheetId: string) {
    return recordingHistoryRepository
      .getSnapshot()
      .recordings.filter((recording) => recording.type === "sheet" && recording.sheetId === sheetId)
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))[0] ?? null;
  }

  subscribe(listener: () => void) {
    return recordingHistoryRepository.subscribe(listener);
  }

  async startCapture() {
    await this.captureService.start();
  }

  async discardCapture() {
    if (!this.isRecording) {
      return;
    }

    await this.captureService.stop().catch(() => undefined);
  }

  async stopAndSave(input: SaveSheetRecordingInput): Promise<SaveSheetRecordingResult> {
    const artifact = await this.captureService.stop();
    let metadata: SheetRecordingMetadata | null = null;
    let artifactSaved = false;
    const previousSession = await input.sessionService.getRecentSheetSession(input.sheetId);

    if (artifact.sizeBytes <= 0) {
      throw new Error("Recording artifact was empty.");
    }

    if (artifact.analysis?.isSilent) {
      throw new Error("Recording artifact did not contain audible input.");
    }

    const decodedDetails = await loadRecordingArtifactDetailsFromBody({
      recordingId: "pending-sheet-recording",
      blob: artifact.blob,
      metadataDurationMs: roundDuration(artifact.analysis?.decodedDurationMs ?? artifact.durationMs)
    });

    if (!hasUsablePeaks(decodedDetails.peaks)) {
      throw new Error("Recording waveform could not be derived from the saved audio.");
    }

    try {
      const prepared = await input.sessionService.prepareSheetRecordingMetadata({
        sheetId: input.sheetId,
        sessionId: input.sessionId,
        durationMs: roundDuration(decodedDetails.decodedDurationMs),
        bpm: input.settings.bpm,
        timeSignature: input.settings.timeSignature,
        segmentContext: input.segmentContext ?? null,
        forceNewSession: input.forceNewSession
      });

      if (!prepared) {
        throw new Error("No valid sheet context. Recording was not saved.");
      }

      metadata = prepared.metadata;

      const decodedRecording = createSheetReviewRecording({
        metadata,
        artifact,
        settings: input.settings
      });
      await saveCapturedRecordingArtifact({
        recordingId: decodedRecording.id,
        recordingType: "sheet",
        artifact,
        createdAt: decodedRecording.createdAt
      });
      artifactSaved = true;
      const recording = {
        ...decodedRecording,
        durationMs: roundDuration(decodedDetails.decodedDurationMs),
        trustedPeaks: decodedDetails.peaks,
        artifactAnalysis: decodedRecording.artifactAnalysis
          ? {
              ...decodedRecording.artifactAnalysis,
              decodedDurationMs: decodedDetails.decodedDurationMs
            }
          : decodedRecording.artifactAnalysis
      };
      const artifactDetails: RecordingArtifactDetails = {
        ...decodedDetails,
        recordingId: recording.id,
        metadataDurationMs: recording.durationMs,
        durationDifferenceMs: Math.abs(decodedDetails.decodedDurationMs - recording.durationMs),
        durationWarning: null,
        peaks: recording.trustedPeaks,
        source: "trusted-peaks"
      };

      saveSheetReviewRecordingWithSession({
        recording,
        session: prepared.session
      });
      await input.sessionService.commitPreparedSheetRecordingSession(prepared);
      await captureSheetRecordingStopped({
        sessionService: input.sessionService,
        metadata
      });

      return {
        metadata,
        recording,
        artifactDetails
      };
    } catch (error) {
      if (metadata) {
        const rollbackErrors: unknown[] = [];

        try {
          if (artifactSaved) {
            await rollbackSheetReviewRecordingMetadata({
              ...metadata,
              previousSession
            });
          } else {
            await cleanupCommittedRecordingArtifactsOrThrow([
              metadata.id
            ]);
          }
        } catch (rollbackError) {
          rollbackErrors.push(rollbackError);
        }

        if (artifactSaved) {
          try {
            await restoreOrDeletePracticeSessionSnapshot({
              previousSession,
              createdSessionId: metadata.sessionId,
              sessionService: input.sessionService
            });
          } catch (rollbackError) {
            rollbackErrors.push(rollbackError);
          }
        }

        if (rollbackErrors.length > 0) {
          throw new Error("Recording save failed, and rollback could not fully restore the previous session state.");
        }
      }

      throw error;
    }
  }
}
