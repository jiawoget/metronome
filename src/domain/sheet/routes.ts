export function getSheetPracticeHref(sheetId: string) {
  return `/sheet-practice/${encodeURIComponent(sheetId)}`;
}

export function getSheetPracticeQueryHref({
  sheetId,
  recordingId
}: {
  sheetId?: string | null;
  recordingId?: string | null;
}) {
  const params = new URLSearchParams();

  if (recordingId) {
    params.set("recordingId", recordingId);
  }

  if (sheetId) {
    params.set("sheetId", sheetId);
  }

  const query = params.toString();

  return query ? `/sheet-practice?${query}` : "/sheet-practice";
}
