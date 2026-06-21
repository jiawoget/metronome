import { formatPracticeDuration } from "@/domain/practice";

export function formatDuration(durationMs: number) {
  return formatPracticeDuration(durationMs);
}

export function formatTimestamp(timestampMs: number) {
  return formatDuration(timestampMs);
}

export function formatRecordingDate(isoDate: string) {
  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}
