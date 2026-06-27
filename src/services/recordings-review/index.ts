import {
  getRecordingAudioExportEligibility,
  recordingAudioExportService,
  type RecordingAudioExportRequest,
  type RecordingAudioExportResult
} from "@/lib/recordings-review/audio-export";
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
  deleteRecording: (recordingId: string) => void;
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

export const recordingsReviewService: RecordingsReviewService = {
  subscribe: recordingHistoryRepository.subscribe,
  getSnapshot: recordingHistoryRepository.getSnapshot,
  resolveRecordingOrganization(recording) {
    return recordingHistoryRepository.resolveRecordingOrganization(recording);
  },
  resolveTakeSelection(group) {
    return recordingHistoryRepository.resolveTakeSelection(group);
  },
  deleteRecording(recordingId) {
    recordingHistoryRepository.deleteRecording(recordingId);
  },
  setRecordingFavorite(recordingId, favorite) {
    recordingHistoryRepository.setRecordingFavorite(recordingId, favorite);
  },
  setRecordingArchived(recordingId, archived) {
    recordingHistoryRepository.setRecordingArchived(recordingId, archived);
  },
  addRecordingTag(recordingId, tag) {
    recordingHistoryRepository.addRecordingTag(recordingId, tag);
  },
  removeRecordingTag(recordingId, tag) {
    recordingHistoryRepository.removeRecordingTag(recordingId, tag);
  },
  setBestTake(group, recordingId) {
    recordingHistoryRepository.setBestTake(group, recordingId);
  },
  setActiveTake(group, recordingId) {
    recordingHistoryRepository.setActiveTake(group, recordingId);
  },
  loadWaveformComparisonSourcesForRecordingIds,
  loadWaveformComparisonSourcesForGroup,
  getRecordingAudioExportEligibility,
  exportRecordingAudio(request) {
    return recordingAudioExportService.exportRecordingAudio(request);
  }
};
