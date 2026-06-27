const AUDIO_EXTENSION_BY_BASE_TYPE = new Map<string, string>([
  ["audio/webm", "webm"],
  ["audio/ogg", "ogg"],
  ["audio/mp4", "mp4"],
  ["audio/mpeg", "mp3"],
  ["audio/wav", "wav"],
  ["audio/x-wav", "wav"],
  ["audio/aac", "aac"]
]);

export type ExportAudioMimeInfo = {
  mimeType: string;
  baseMimeType: string;
  canonicalBaseMimeType: string;
  extension: string;
};

export function getKnownExportAudioMimeInfo(
  mimeType: string
): ExportAudioMimeInfo | null {
  const normalizedMimeType = normalizeMimeType(mimeType);
  const baseMimeType = getBaseMimeType(normalizedMimeType);
  const canonicalBaseMimeType = getCanonicalBaseMimeType(baseMimeType);
  const extension = AUDIO_EXTENSION_BY_BASE_TYPE.get(baseMimeType);

  if (!extension) {
    return null;
  }

  return {
    mimeType: normalizedMimeType,
    baseMimeType,
    canonicalBaseMimeType,
    extension
  };
}

export function isKnownExportAudioMime(mimeType: string) {
  return getKnownExportAudioMimeInfo(mimeType) !== null;
}

export function isPotentiallyDecodableAudioMime(mimeType: string) {
  const normalizedMimeType = normalizeMimeType(mimeType);
  const baseMimeType = getBaseMimeType(normalizedMimeType);

  return isAudioMimeType(baseMimeType);
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

export function hasMatchingKnownExportAudioMime({
  expectedMimeType,
  actualMimeType
}: {
  expectedMimeType: string;
  actualMimeType: string;
}) {
  const expected = getKnownExportAudioMimeInfo(expectedMimeType);
  const actual = getKnownExportAudioMimeInfo(actualMimeType);

  return (
    expected !== null &&
    actual !== null &&
    expected.canonicalBaseMimeType === actual.canonicalBaseMimeType
  );
}

function normalizeMimeType(mimeType: string) {
  return mimeType.trim().toLowerCase();
}

function getBaseMimeType(mimeType: string) {
  return mimeType.split(";")[0]?.trim() ?? "";
}

function getCanonicalBaseMimeType(baseMimeType: string) {
  return baseMimeType === "audio/x-wav" ? "audio/wav" : baseMimeType;
}

function isAudioMimeType(baseMimeType: string) {
  const [type, subtype] = baseMimeType.split("/");

  return type === "audio" && Boolean(subtype?.trim());
}
