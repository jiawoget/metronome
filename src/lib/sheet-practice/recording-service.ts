import type { SheetRecordingMetadata } from "@/domain/practice";
import { hasUsablePeaks, loadRecordingArtifactDetails } from "@/lib/recordings-review/artifact-service";
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
    audioDataUrl: artifact.dataUrl,
    artifactAnalysis: artifact.analysis,
    trustedPeaks,
    settings: {
      bpm: metadata.bpm ?? settings.bpm,
      timeSignature: metadata.timeSignature ?? settings.timeSignature,
      subdivision: settings.subdivision,
      accent: settings.accent,
      countdownBeats: settings.countdownBeats
    }
  };
}

function createDraftSheetReviewRecording({
  artifact,
  sheetId,
  sessionId,
  settings
}: {
  artifact: RecordingArtifact;
  sheetId: string;
  sessionId: string | null;
  settings: MetronomeSettings;
}): ReviewRecording {
  const durationMs = roundDuration(artifact.analysis?.decodedDurationMs ?? artifact.durationMs);

  return {
    id: "sheet-recording-draft",
    type: "sheet",
    origin: "user",
    name: "Sheet practice take",
    sessionId: sessionId ?? "pending-sheet-session",
    sheetId,
    sheetName: null,
    createdAt: new Date(0).toISOString(),
    durationMs,
    sizeBytes: artifact.sizeBytes,
    mimeType: artifact.mimeType,
    audioDataUrl: artifact.dataUrl,
    artifactAnalysis: artifact.analysis,
    settings: {
      bpm: settings.bpm,
      timeSignature: settings.timeSignature,
      subdivision: settings.subdivision,
      accent: settings.accent,
      countdownBeats: settings.countdownBeats
    }
  };
}

function saveSheetReviewRecording(recording: ReviewRecording) {
  const snapshot = recordingHistoryRepository.getSnapshot();

  recordingHistoryRepository.saveSnapshot({
    sessions: snapshot.sessions,
    recordings: [
      recording,
      ...snapshot.recordings.filter((item) => item.id !== recording.id)
    ],
    errorMarkers: snapshot.errorMarkers
  });
}

export class BrowserSheetRecordingService implements SheetRecordingService {
  constructor(private readonly captureService: RecordingCaptureService = createBrowserRecordingCaptureService()) {}

  get isRecording() {
    return this.captureService.isRecording;
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
    const previousHistorySnapshot = recordingHistoryRepository.getSnapshot();
    const previousSession = await input.sessionService.getRecentSheetSession(input.sheetId);

    if (artifact.sizeBytes <= 0) {
      throw new Error("Recording artifact was empty.");
    }

    if (artifact.analysis?.isSilent) {
      throw new Error("Recording artifact did not contain audible input.");
    }

    const decodedDetails = await loadRecordingArtifactDetails(
      createDraftSheetReviewRecording({
        artifact,
        sheetId: input.sheetId,
        sessionId: input.sessionId,
        settings: input.settings
      })
    );

    if (!hasUsablePeaks(decodedDetails.peaks)) {
      throw new Error("Recording waveform could not be derived from the saved audio.");
    }

    try {
      metadata = await input.sessionService.createSheetRecordingMetadata({
        sheetId: input.sheetId,
        sessionId: input.sessionId,
        durationMs: roundDuration(decodedDetails.decodedDurationMs),
        bpm: input.settings.bpm,
        timeSignature: input.settings.timeSignature,
        forceNewSession: input.forceNewSession
      });

      if (!metadata) {
        throw new Error("No valid sheet context. Recording was not saved.");
      }

      const decodedRecording = createSheetReviewRecording({
        metadata,
        artifact,
        settings: input.settings
      });
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
        metadataDurationMs: recording.durationMs,
        durationDifferenceMs: Math.abs(decodedDetails.decodedDurationMs - recording.durationMs),
        durationWarning: null,
        peaks: recording.trustedPeaks,
        source: "trusted-peaks"
      };

      saveSheetReviewRecording(recording);

      return {
        metadata,
        recording,
        artifactDetails
      };
    } catch (error) {
      if (metadata) {
        const rollbackErrors: unknown[] = [];

        try {
          recordingHistoryRepository.saveSnapshot(previousHistorySnapshot);
        } catch (rollbackError) {
          rollbackErrors.push(rollbackError);
        }

        try {
          if (previousSession) {
            await input.sessionService.restorePracticeSessionSnapshot(previousSession);
          } else {
            await input.sessionService.deletePracticeSessionSnapshot(metadata.sessionId);
          }
        } catch (rollbackError) {
          rollbackErrors.push(rollbackError);
        }

        if (rollbackErrors.length > 0) {
          throw new Error("Recording save failed, and rollback could not fully restore the previous session state.");
        }
      }

      throw error;
    }
  }
}
