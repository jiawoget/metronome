import {
  getDataUrlMimeType,
  hasMatchingKnownExportAudioMime,
  isPotentiallyDecodableAudioMime
} from "@/lib/recordings-review/audio-mime";
import { RecordingArtifactError } from "@/lib/recordings-review/artifact-model";

export function dataUrlToRecordingArtifactBlob({
  dataUrl,
  expectedMimeType
}: {
  dataUrl: string;
  expectedMimeType?: string;
}) {
  const match = /^data:([^,]*),([\s\S]*)$/.exec(dataUrl.trim());

  if (!match) {
    throw new RecordingArtifactError(
      "This recording legacy artifact is malformed.",
      "legacy-artifact-malformed"
    );
  }

  const metadata = match[1] ?? "";
  const isBase64 = metadata
    .split(";")
    .some((part) => part.trim().toLowerCase() === "base64");
  const payload = match[2] ?? "";
  const mimeType = getDataUrlMimeType(metadata);

  if (!isPotentiallyDecodableAudioMime(mimeType)) {
    throw new RecordingArtifactError(
      "This recording artifact is not a supported audio type.",
      "unsupported-mime"
    );
  }

  if (
    expectedMimeType &&
    !hasMatchingKnownExportAudioMime({
      expectedMimeType,
      actualMimeType: mimeType
    })
  ) {
    throw new RecordingArtifactError(
      "This recording legacy artifact MIME does not match its metadata.",
      "unsupported-mime"
    );
  }

  try {
    const bytes = isBase64
      ? base64ToBytes(payload)
      : textToBytes(decodeURIComponent(payload));
    const blob = new Blob([bytes], { type: expectedMimeType ?? mimeType });

    if (blob.size <= 0) {
      throw new RecordingArtifactError(
        "This recording artifact decoded as empty audio.",
        "empty-audio"
      );
    }

    return {
      blob,
      mimeType
    };
  } catch (error) {
    if (error instanceof RecordingArtifactError) {
      throw error;
    }

    throw new RecordingArtifactError(
      "This recording legacy artifact is malformed.",
      "legacy-artifact-malformed"
    );
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
