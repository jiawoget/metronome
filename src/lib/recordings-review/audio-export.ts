import { getRecordingDisplayName } from "@/lib/recordings-review/history";
import { recordingHistoryRepository } from "@/lib/recordings-review/repository";
import type { ReviewRecording } from "@/lib/recordings-review/types";
import { browserAudioDownloadAdapter } from "@/lib/recordings-review/browser-audio-download-adapter";
import {
  getDataUrlMimeType,
  getKnownExportAudioMimeInfo,
  hasMatchingKnownExportAudioMime
} from "@/lib/recordings-review/audio-mime";

export type RecordingAudioExportRequest = {
  recordingId: string;
};

export type RecordingAudioExportUnavailableReason =
  | "missing-recording"
  | "missing-artifact"
  | "unsupported-mime"
  | "invalid-artifact"
  | "download-failed";

export type RecordingAudioExportResult =
  | {
      ok: true;
      recordingId: string;
      filename: string;
      mimeType: string;
      sizeBytes: number;
    }
  | {
      ok: false;
      recordingId: string;
      reason: RecordingAudioExportUnavailableReason;
      message: string;
    };

export type RecordingAudioDownloadAdapter = {
  downloadBlob(input: { blob: Blob; filename: string }): Promise<void> | void;
};

export type RecordingAudioExportRepository = {
  getRecording(recordingId: string): ReviewRecording | null;
};

export type RecordingAudioExportEligibility =
  | { available: true; extension: string; mimeType: string; message: null }
  | {
      available: false;
      reason: Extract<
        RecordingAudioExportUnavailableReason,
        "missing-artifact" | "unsupported-mime"
      >;
      message: string;
    };

const MAX_FILENAME_BASE_LENGTH = 140;

export function createRecordingAudioExportService({
  repository,
  downloadAdapter
}: {
  repository: RecordingAudioExportRepository;
  downloadAdapter: RecordingAudioDownloadAdapter;
}) {
  return {
    async exportRecordingAudio(
      request: RecordingAudioExportRequest
    ): Promise<RecordingAudioExportResult> {
      const recordingId = request.recordingId.trim();
      const recording = repository.getRecording(recordingId);

      if (!recording) {
        return unavailableResult({
          recordingId,
          reason: "missing-recording",
          message: "This recording is no longer available in local review history."
        });
      }

      const eligibility = getRecordingAudioExportEligibility(recording);

      if (!eligibility.available) {
        return unavailableResult({
          recordingId: recording.id,
          reason: eligibility.reason,
          message: eligibility.message
        });
      }

      const blob = dataUrlToBlob({
        dataUrl: recording.audioDataUrl ?? "",
        mimeType: eligibility.mimeType
      });

      if (!blob || blob.size <= 0) {
        return unavailableResult({
          recordingId: recording.id,
          reason: "invalid-artifact",
          message: "This recording artifact could not be prepared for export."
        });
      }

      const filename = buildRecordingAudioExportFilename(recording);

      try {
        await downloadAdapter.downloadBlob({ blob, filename });
      } catch {
        return unavailableResult({
          recordingId: recording.id,
          reason: "download-failed",
          message: "Audio export could not be started in this browser."
        });
      }

      return {
        ok: true,
        recordingId: recording.id,
        filename,
        mimeType: eligibility.mimeType,
        sizeBytes: blob.size
      };
    }
  };
}

export const recordingAudioExportService = createRecordingAudioExportService({
  repository: recordingHistoryRepository,
  downloadAdapter: browserAudioDownloadAdapter
});

export function getRecordingAudioExportEligibility(
  recording: Pick<ReviewRecording, "audioDataUrl" | "mimeType">
): RecordingAudioExportEligibility {
  if (!recording.audioDataUrl?.trim()) {
    return {
      available: false,
      reason: "missing-artifact",
      message: "This recording has no local audio artifact to export."
    };
  }

  const mimeInfo = getAudioExportMimeInfo(recording.mimeType);

  if (!mimeInfo) {
    return {
      available: false,
      reason: "unsupported-mime",
      message: "This recording artifact is not a supported audio file."
    };
  }

  return {
    available: true,
    extension: mimeInfo.extension,
    mimeType: mimeInfo.mimeType,
    message: null
  };
}

export function buildRecordingAudioExportFilename(recording: ReviewRecording) {
  const mimeInfo = getAudioExportMimeInfo(recording.mimeType);
  const extension = mimeInfo?.extension ?? "webm";
  const labelParts =
    recording.type === "sheet"
      ? getSheetFilenameParts(recording)
      : [getRecordingDisplayName(recording)];
  const datePart = formatCompactLocalDateTime(recording.createdAt);
  const idSuffix = getRecordingIdSuffix(recording.id);
  const descriptiveBase = [
    "metronome",
    recording.type,
    ...labelParts,
    datePart
  ]
    .map(sanitizeFilenamePart)
    .filter((part) => part.length > 0)
    .join("-");
  const baseFilename = buildBoundedFilenameBase({
    descriptiveBase,
    idSuffix,
    fallback: `metronome-${recording.type}`
  });

  return `${baseFilename}.${extension}`;
}

export function getAudioExportExtension(mimeType: string) {
  return getAudioExportMimeInfo(mimeType)?.extension ?? null;
}

function unavailableResult({
  recordingId,
  reason,
  message
}: {
  recordingId: string;
  reason: RecordingAudioExportUnavailableReason;
  message: string;
}): RecordingAudioExportResult {
  return {
    ok: false,
    recordingId,
    reason,
    message
  };
}

export function getAudioExportMimeInfo(mimeType: string) {
  const mimeInfo = getKnownExportAudioMimeInfo(mimeType);

  return mimeInfo
    ? {
        mimeType: mimeInfo.mimeType,
        extension: mimeInfo.extension
      }
    : null;
}

function dataUrlToBlob({
  dataUrl,
  mimeType
}: {
  dataUrl: string;
  mimeType: string;
}) {
  const match = /^data:([^,]*),([\s\S]*)$/.exec(dataUrl.trim());

  if (!match) {
    return null;
  }

  const metadata = match[1] ?? "";
  const isBase64 = metadata
    .split(";")
    .some((part) => part.trim().toLowerCase() === "base64");
  const payload = match[2] ?? "";
  const dataUrlMimeType = getDataUrlMimeType(metadata);

  if (
    !hasMatchingKnownExportAudioMime({
      expectedMimeType: mimeType,
      actualMimeType: dataUrlMimeType
    })
  ) {
    return null;
  }

  try {
    const bytes = isBase64
      ? base64ToBytes(payload)
      : textToBytes(decodeURIComponent(payload));

    return new Blob([bytes], { type: mimeType });
  } catch {
    return null;
  }
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function textToBytes(value: string) {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(value);
  }

  const bytes = new Uint8Array(value.length);

  for (let index = 0; index < value.length; index += 1) {
    bytes[index] = value.charCodeAt(index);
  }

  return bytes;
}

function getSheetFilenameParts(recording: ReviewRecording) {
  const sheetLabel = recording.sheetName?.trim() || recording.sheetId?.trim();
  const segmentLabel =
    recording.segmentContext?.segmentName?.trim() ||
    recording.segmentContext?.segmentId?.trim();

  return [sheetLabel, segmentLabel || "whole-sheet"];
}

function formatCompactLocalDateTime(isoDate: string) {
  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return "unknown-date";
  }

  const pad = (value: number) => value.toString().padStart(2, "0");

  return [
    date.getFullYear().toString(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
  ].join("");
}

function getRecordingIdSuffix(recordingId: string) {
  const sanitizedId = sanitizeFilenamePart(recordingId);

  return sanitizedId.length > 32 ? sanitizedId.slice(-32) : sanitizedId;
}

function sanitizeFilenamePart(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/[._-]{2,}/g, "-")
    .replace(/^[.\s_-]+|[.\s_-]+$/g, "");
}

function trimFilenameBase(value: string) {
  return value
    .slice(0, MAX_FILENAME_BASE_LENGTH)
    .replace(/[.\s_-]+$/g, "");
}

function buildBoundedFilenameBase({
  descriptiveBase,
  idSuffix,
  fallback
}: {
  descriptiveBase: string;
  idSuffix: string;
  fallback: string;
}) {
  if (!idSuffix) {
    return trimFilenameBase(descriptiveBase) || fallback;
  }

  const suffix = `-${idSuffix}`;
  const maxDescriptiveLength = Math.max(
    0,
    MAX_FILENAME_BASE_LENGTH - suffix.length
  );
  const trimmedDescriptiveBase = descriptiveBase
    .slice(0, maxDescriptiveLength)
    .replace(/[.\s_-]+$/g, "");

  if (!trimmedDescriptiveBase) {
    return trimFilenameBase(idSuffix) || fallback;
  }

  return `${trimmedDescriptiveBase}${suffix}`;
}
