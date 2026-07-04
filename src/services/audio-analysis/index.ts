export {
  AudioDecodeError,
  type AudioDecodeAdapter,
  type AudioDecodeFailureReason,
  type RecordingArtifactAnalysis
} from "@/services/audio-analysis/types";
export { decodeAudioBlob } from "@/services/audio-analysis/decode";
export {
  DEFAULT_AUDIO_PEAK_COUNT,
  derivePeaksFromBuffer,
  derivePeaksFromSamples,
  hasUsablePeaks,
  normalizePeaks
} from "@/services/audio-analysis/peaks";
export {
  analyzeDecodedRecording,
  analyzeRecordingBlob
} from "@/services/audio-analysis/silence";
