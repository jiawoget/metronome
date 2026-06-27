const AUDIO_EXTENSION_BY_BASE_TYPE = new Map<string, string>([
  ["audio/webm", "webm"],
  ["audio/ogg", "ogg"],
  ["audio/mp4", "mp4"],
  ["audio/mpeg", "mp3"],
  ["audio/wav", "wav"],
  ["audio/x-wav", "wav"],
  ["audio/aac", "aac"]
]);

export type SupportedRecordingAudioMimeInfo = {
  mimeType: string;
  baseMimeType: string;
  extension: string;
};

export function getSupportedRecordingAudioMimeInfo(
  mimeType: string
): SupportedRecordingAudioMimeInfo | null {
  const normalizedMimeType = normalizeMimeType(mimeType);
  const baseMimeType = getBaseMimeType(normalizedMimeType);
  const extension = AUDIO_EXTENSION_BY_BASE_TYPE.get(baseMimeType);

  if (!extension) {
    return null;
  }

  return {
    mimeType: normalizedMimeType,
    baseMimeType,
    extension
  };
}

export function isSupportedRecordingAudioMime(mimeType: string) {
  return getSupportedRecordingAudioMimeInfo(mimeType) !== null;
}

export function getDataUrlMimeType(dataUrlMetadata: string) {
  const metadataParts = dataUrlMetadata
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  const mimeType = metadataParts[0] ?? "";
  const mimeParameters = metadataParts
    .slice(1)
    .filter((part) => part.toLowerCase() !== "base64");

  return normalizeMimeType([mimeType, ...mimeParameters].join(";"));
}

export function hasMatchingSupportedRecordingAudioMime({
  expectedMimeType,
  actualMimeType
}: {
  expectedMimeType: string;
  actualMimeType: string;
}) {
  const expected = getSupportedRecordingAudioMimeInfo(expectedMimeType);
  const actual = getSupportedRecordingAudioMimeInfo(actualMimeType);

  return expected !== null && actual !== null && expected.baseMimeType === actual.baseMimeType;
}

function normalizeMimeType(mimeType: string) {
  return mimeType.trim().toLowerCase();
}

function getBaseMimeType(mimeType: string) {
  return mimeType.split(";")[0]?.trim() ?? "";
}
