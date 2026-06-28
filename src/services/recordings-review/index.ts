import {
  getRecordingAudioExportEligibility,
  recordingAudioExportService,
  type RecordingAudioExportRequest,
  type RecordingAudioExportResult
} from "@/lib/recordings-review/audio-export";
import {
  deleteOwnedRecordingArtifact,
  migrateLegacyRecordingArtifacts
} from "@/lib/recordings-review/artifact-service";
import {
  recordingArtifactRepository,
  type RecordingArtifactRepository
} from "@/infrastructure/db/recording-artifact-repository";
import { recordingHistoryRepository } from "@/lib/recordings-review/repository";
import type {
  RecordingTakeGroup,
  ResolvedRecordingOrganization,
  ResolvedRecordingTakeSelection,
  ReviewRecording
} from "@/lib/recordings-review/types";
import {
  loadWaveformComparisonSourcesForGroup,
  loadWaveformComparisonSourcesForRecordingIds,
  type WaveformComparisonSourcesResult
} from "@/lib/recordings-review/waveform-comparison-sources";

export type RecordingsReviewService = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: typeof recordingHistoryRepository.getSnapshot;
  resolveRecordingOrganization: (
    recording: ReviewRecording
  ) => ResolvedRecordingOrganization;
  resolveTakeSelection: (
    group: RecordingTakeGroup
  ) => ResolvedRecordingTakeSelection;
  deleteRecording: (recordingId: string) => Promise<void>;
  setRecordingFavorite: (recordingId: string, favorite: boolean) => void;
  setRecordingArchived: (recordingId: string, archived: boolean) => void;
  addRecordingTag: (recordingId: string, tag: string) => void;
  removeRecordingTag: (recordingId: string, tag: string) => void;
  setBestTake: (group: RecordingTakeGroup, recordingId: string | null) => void;
  setActiveTake: (group: RecordingTakeGroup, recordingId: string | null) => void;
  loadWaveformComparisonSourcesForRecordingIds: (
    recordingIds: string[]
  ) => Promise<WaveformComparisonSourcesResult>;
  loadWaveformComparisonSourcesForGroup: (input: {
    group: RecordingTakeGroup;
    recordingIds: string[];
  }) => Promise<WaveformComparisonSourcesResult>;
  getRecordingAudioExportEligibility: typeof getRecordingAudioExportEligibility;
  exportRecordingAudio: (
    request: RecordingAudioExportRequest
  ) => Promise<RecordingAudioExportResult>;
  migrateLegacyArtifacts: () => Promise<void>;
};

type RecordingHistoryRepository = typeof recordingHistoryRepository;

export function createRecordingsReviewService({
  historyRepository = recordingHistoryRepository,
  artifactRepository = recordingArtifactRepository
}: {
  historyRepository?: RecordingHistoryRepository;
  artifactRepository?: RecordingArtifactRepository;
} = {}): RecordingsReviewService {
  return {
  subscribe: historyRepository.subscribe,
  getSnapshot: historyRepository.getSnapshot,
  resolveRecordingOrganization(recording) {
    return historyRepository.resolveRecordingOrganization(recording);
  },
  resolveTakeSelection(group) {
    return historyRepository.resolveTakeSelection(group);
  },
  async deleteRecording(recordingId) {
    const writeSession = historyRepository.beginSnapshotWrite();
    const recording =
      writeSession.snapshot.recordings.find((item) => item.id === recordingId) ??
      null;

    if (recording?.artifactRef?.kind === "indexeddb") {
      await deleteOwnedRecordingArtifact(recording.id, artifactRepository, {
        assertCurrent: () =>
          historyRepository.assertSnapshotWriteIsCurrent(writeSession)
      });
    }

    historyRepository.deleteRecordingFromWriteSession(writeSession, recordingId);
  },
  setRecordingFavorite(recordingId, favorite) {
    historyRepository.setRecordingFavorite(recordingId, favorite);
  },
  setRecordingArchived(recordingId, archived) {
    historyRepository.setRecordingArchived(recordingId, archived);
  },
  addRecordingTag(recordingId, tag) {
    historyRepository.addRecordingTag(recordingId, tag);
  },
  removeRecordingTag(recordingId, tag) {
    historyRepository.removeRecordingTag(recordingId, tag);
  },
  setBestTake(group, recordingId) {
    historyRepository.setBestTake(group, recordingId);
  },
  setActiveTake(group, recordingId) {
    historyRepository.setActiveTake(group, recordingId);
  },
  loadWaveformComparisonSourcesForRecordingIds,
  loadWaveformComparisonSourcesForGroup,
  getRecordingAudioExportEligibility,
  exportRecordingAudio(request) {
    return recordingAudioExportService.exportRecordingAudio(request);
  },
  async migrateLegacyArtifacts() {
    await migrateLegacyRecordingArtifacts(artifactRepository);
  }
};
}

export const recordingsReviewService: RecordingsReviewService =
  createRecordingsReviewService();
