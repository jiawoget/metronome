export function getSheetPracticeHref(sheetId: string) {
  return `/sheet-practice/${encodeURIComponent(sheetId)}`;
}

export function getSheetPracticeQueryHref({
  sheetId,
  recordingId,
  segmentId
}: {
  sheetId?: string | null;
  recordingId?: string | null;
  segmentId?: string | null;
}) {
  const params = new URLSearchParams();

  setOptionalQueryParam(params, "recordingId", recordingId);
  setOptionalQueryParam(params, "sheetId", sheetId);
  setOptionalQueryParam(params, "segmentId", segmentId);

  const query = params.toString();

  return query ? `/sheet-practice?${query}` : "/sheet-practice";
}

function setOptionalQueryParam(
  params: URLSearchParams,
  key: string,
  value?: string | null
) {
  const normalized = value?.trim();

  if (normalized) {
    params.set(key, normalized);
  }
}
