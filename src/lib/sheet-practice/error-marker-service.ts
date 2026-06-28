import type { CreateErrorMarkerInput } from "@/lib/recordings-review/error-markers";
import { recordingHistoryRepository } from "@/lib/recordings-review/repository";

export type SheetErrorMarkerService = {
  getErrorMarkers: typeof recordingHistoryRepository.getErrorMarkers;
  createErrorMarker: (
    input: Omit<CreateErrorMarkerInput, "durationMs"> & { durationMs?: number }
  ) => ReturnType<typeof recordingHistoryRepository.createErrorMarker>;
  deleteErrorMarker: typeof recordingHistoryRepository.deleteErrorMarker;
  subscribe: typeof recordingHistoryRepository.subscribe;
};

export const sheetErrorMarkerService: SheetErrorMarkerService = {
  getErrorMarkers(recordingId) {
    return recordingHistoryRepository.getErrorMarkers(recordingId);
  },
  createErrorMarker(input) {
    return recordingHistoryRepository.createErrorMarker(input);
  },
  deleteErrorMarker(markerId) {
    return recordingHistoryRepository.deleteErrorMarker(markerId);
  },
  subscribe(listener) {
    return recordingHistoryRepository.subscribe(listener);
  }
};
