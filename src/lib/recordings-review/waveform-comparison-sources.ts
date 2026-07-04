import { loadRecordingArtifactDetails } from "@/lib/recordings-review/artifact-details";
import { hasUsablePeaks } from "@/services/audio-analysis";
import { isPotentiallyDecodableAudioMime } from "@/lib/recordings-review/audio-mime";
import { recordingHistoryRepository } from "@/lib/recordings-review/repository";
import { normalizeRequiredString } from "@/lib/recordings-review/string-normalization";
import type {
  RecordingArtifactDetails,
  RecordingTakeGroup,
  ReviewRecording
} from "@/lib/recordings-review/types";

export type WaveformComparisonSourceKind = RecordingArtifactDetails["source"];

export type WaveformComparisonUnavailableReason =
  | "not-sheet-take"
  | "missing-recording"
  | "missing-artifact"
  | "unsupported-mime"
  | "decode-failed"
  | "empty-audio"
  | "invalid-peaks"
  | "invalid-duration"
  | "stale-group-membership";

export type WaveformComparisonReadySource = {
  status: "ready";
  recordingId: string;
  recording: ReviewRecording;
  artifactDetails: RecordingArtifactDetails;
  source: WaveformComparisonSourceKind;
  peaks: number[];
  durationMs: number;
  durationWarning: string | null;
};

export type WaveformComparisonUnavailableSource = {
  status: "unavailable";
  recordingId: string;
  recording: ReviewRecording | null;
  reason: WaveformComparisonUnavailableReason;
  message: string;
};

export type WaveformComparisonSourceState =
  | WaveformComparisonReadySource
  | WaveformComparisonUnavailableSource;

export type WaveformComparisonSourcesResult = {
  sources: WaveformComparisonSourceState[];
  readySources: WaveformComparisonReadySource[];
  unavailableSources: WaveformComparisonUnavailableSource[];
  allReady: boolean;
  readyCount: number;
  requestedCount: number;
  groupId?: string;
  sheetId?: string;
  segmentId?: string | null;
};

type WaveformComparisonContext = {
  groupId?: string;
  sheetId?: string;
  segmentId?: string | null;
};

const UNAVAILABLE_MESSAGES: Record<WaveformComparisonUnavailableReason, string> = {
  "not-sheet-take": "Only saved sheet takes can be used for waveform comparison.",
  "missing-recording": "This recording is no longer available in local review history.",
  "missing-artifact": "This recording has no accessible local audio artifact. This recording has no accessible audio artifact in local storage.",
  "unsupported-mime": "This recording artifact is not a supported audio type.",
  "decode-failed": "This recording artifact could not be decoded locally.",
  "empty-audio": "This recording artifact decoded as empty audio.",
  "invalid-peaks": "This recording has invalid waveform peak data.",
  "invalid-duration": "This recording has invalid duration metadata.",
  "stale-group-membership": "This recording is no longer part of the selected take group."
};

export function getWaveformComparisonEligibility(
  recording: ReviewRecording | null
): WaveformComparisonUnavailableSource | null {
  if (!recording) {
    return createUnavailableSource({
      recordingId: "",
      recording: null,
      reason: "missing-recording"
    });
  }

  if (recording.type !== "sheet" || !normalizeRequiredString(recording.sheetId)) {
    return createUnavailableSource({
      recordingId: recording.id,
      recording,
      reason: "not-sheet-take"
    });
  }

  if (!recording.artifactRef) {
    return createUnavailableSource({
      recordingId: recording.id,
      recording,
      reason: "missing-artifact"
    });
  }

  if (!isSupportedAudioMime(recording.mimeType)) {
    return createUnavailableSource({
      recordingId: recording.id,
      recording,
      reason: "unsupported-mime"
    });
  }

  if (!Number.isFinite(recording.durationMs) || recording.durationMs <= 0) {
    return createUnavailableSource({
      recordingId: recording.id,
      recording,
      reason: "invalid-duration"
    });
  }

  return null;
}

export async function loadWaveformComparisonSource(
  recording: ReviewRecording
): Promise<WaveformComparisonSourceState> {
  const unavailable = getWaveformComparisonEligibility(recording);

  if (unavailable) {
    return unavailable;
  }

  try {
    const artifactDetails = await loadRecordingArtifactDetails(recording);

    if (!hasUsablePeaks(artifactDetails.peaks)) {
      return createUnavailableSource({
        recordingId: recording.id,
        recording,
        reason: "invalid-peaks"
      });
    }

    if (
      !Number.isFinite(artifactDetails.decodedDurationMs) ||
      artifactDetails.decodedDurationMs <= 0 ||
      !Number.isFinite(artifactDetails.metadataDurationMs) ||
      artifactDetails.metadataDurationMs <= 0
    ) {
      return createUnavailableSource({
        recordingId: recording.id,
        recording,
        reason: "invalid-duration"
      });
    }

    return {
      status: "ready",
      recordingId: recording.id,
      recording,
      artifactDetails,
      source: artifactDetails.source,
      peaks: artifactDetails.peaks,
      durationMs: artifactDetails.decodedDurationMs,
      durationWarning: artifactDetails.durationWarning
    };
  } catch (error) {
    return createUnavailableSource({
      recordingId: recording.id,
      recording,
      reason: mapArtifactErrorToUnavailableReason(error)
    });
  }
}

export async function loadWaveformComparisonSources(
  recordings: ReviewRecording[]
): Promise<WaveformComparisonSourcesResult> {
  const sources = await Promise.all(recordings.map(loadWaveformComparisonSource));

  return createSourcesResult(sources);
}

export async function loadWaveformComparisonSourcesForRecordingIds(
  recordingIds: string[]
): Promise<WaveformComparisonSourcesResult> {
  const recordings = recordingHistoryRepository.getSnapshot().recordings;
  const sources = await Promise.all(
    recordingIds.map(async (recordingId) => {
      const recording = recordings.find((candidate) => candidate.id === recordingId) ?? null;

      if (!recording) {
        return createUnavailableSource({
          recordingId,
          recording: null,
          reason: "missing-recording"
        });
      }

      return loadWaveformComparisonSource(recording);
    })
  );

  return createSourcesResult(sources);
}

export async function loadWaveformComparisonSourcesForGroup({
  group,
  recordingIds
}: {
  group: RecordingTakeGroup;
  recordingIds: string[];
}): Promise<WaveformComparisonSourcesResult> {
  const recordings = recordingHistoryRepository.getSnapshot().recordings;
  const currentGroup =
    recordingHistoryRepository
      .getTakeGroups()
      .takeGroups.find((candidate) => candidate.groupId === group.groupId) ?? null;
  const sources = await Promise.all(
    recordingIds.map(async (recordingId) => {
      const recording = recordings.find((candidate) => candidate.id === recordingId) ?? null;

      if (!recording) {
        return createUnavailableSource({
          recordingId,
          recording: null,
          reason: "missing-recording"
        });
      }

      const groupRecording =
        currentGroup?.recordings.find((candidate) => candidate.id === recordingId) ?? null;

      if (!groupRecording) {
        return createUnavailableSource({
          recordingId,
          recording,
          reason: "stale-group-membership"
        });
      }

      return loadWaveformComparisonSource(groupRecording);
    })
  );

  return createSourcesResult(sources, {
    groupId: group.groupId,
    sheetId: group.sheetId,
    segmentId: group.segmentId
  });
}

function createSourcesResult(
  sources: WaveformComparisonSourceState[],
  context: WaveformComparisonContext = {}
): WaveformComparisonSourcesResult {
  const readySources = sources.filter(
    (source): source is WaveformComparisonReadySource => source.status === "ready"
  );
  const unavailableSources = sources.filter(
    (source): source is WaveformComparisonUnavailableSource => source.status === "unavailable"
  );

  return {
    sources,
    readySources,
    unavailableSources,
    allReady: sources.length > 0 && unavailableSources.length === 0,
    readyCount: readySources.length,
    requestedCount: sources.length,
    ...context
  };
}

function createUnavailableSource({
  recordingId,
  recording,
  reason
}: {
  recordingId: string;
  recording: ReviewRecording | null;
  reason: WaveformComparisonUnavailableReason;
}): WaveformComparisonUnavailableSource {
  return {
    status: "unavailable",
    recordingId,
    recording,
    reason,
    message: UNAVAILABLE_MESSAGES[reason]
  };
}

function isSupportedAudioMime(mimeType: string) {
  return isPotentiallyDecodableAudioMime(mimeType);
}

function mapArtifactErrorToUnavailableReason(
  error: unknown
): WaveformComparisonUnavailableReason {
  if (error instanceof Error && "reason" in error) {
    const reason = (error as { reason?: string }).reason;

    if (reason === "missing-artifact-ref" || reason === "missing-artifact-body") {
      return "missing-artifact";
    }

    if (reason === "unsupported-mime") {
      return "unsupported-mime";
    }

    if (reason === "empty-audio") {
      return "empty-audio";
    }
  }

  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  if (message.includes("no accessible audio artifact")) {
    return "missing-artifact";
  }

  if (message.includes("empty audio")) {
    return "empty-audio";
  }

  if (message.includes("invalid waveform peak data")) {
    return "invalid-peaks";
  }

  return "decode-failed";
}
