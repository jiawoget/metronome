import {
  getRecordingAudioExportEligibility,
  recordingAudioExportService,
  type RecordingAudioExportRequest,
  type RecordingAudioExportResult
} from "@/lib/recordings-review/audio-export";
import {
  assertRecordingArtifactCleanup,
  cleanupCommittedRecordingArtifacts
} from "@/lib/recordings-review/artifact-storage";
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
    const result = historyRepository.deleteRecording(recordingId);
    const cleanupResult = await cleanupCommittedRecordingArtifacts(
      result.artifactCleanupRecordingIds,
      artifactRepository
    );

    assertRecordingArtifactCleanup(cleanupResult);
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
  }
};
}

export const recordingsReviewService: RecordingsReviewService =
  createRecordingsReviewService();
