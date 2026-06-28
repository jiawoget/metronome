import { quickRecordingRepository } from "@/lib/quick-metronome/persistence";
import type { QuickRecording } from "@/lib/quick-metronome/types";

export const quickRecordingController = {
  subscribe: quickRecordingRepository.subscribe,
  getLatestQuickRecording: quickRecordingRepository.getLatestQuickRecording,
  saveQuickRecording(recording: QuickRecording) {
    return quickRecordingRepository.saveQuickRecording(recording);
  }
};
