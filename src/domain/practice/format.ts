export function formatPracticeDuration(durationMs: number) {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return "0:00";
  }

  const totalSeconds = Math.round(durationMs / 1_000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
