import type { ContinuePracticeTargetIdentity } from "@/domain/practice";
import {
  getSheetPracticeHref,
  getSheetPracticeQueryHref
} from "@/domain/sheet/routes";

export function getContinuePracticeTargetHref(
  target: ContinuePracticeTargetIdentity
): string | null {
  switch (target.kind) {
    case "quick":
      return "/quick-metronome";
    case "sheet": {
      const sheetId = getRequiredTargetId(
        (target as { sheetId?: unknown }).sheetId
      );

      return sheetId ? getSheetPracticeHref(sheetId) : null;
    }
    case "segment": {
      const sheetId = getRequiredTargetId(
        (target as { sheetId?: unknown }).sheetId
      );
      const segmentId = getRequiredTargetId(
        (target as { segmentId?: unknown }).segmentId
      );

      return sheetId && segmentId
        ? getSheetPracticeQueryHref({ sheetId, segmentId })
        : null;
    }
    default:
      return null;
  }
}

function getRequiredTargetId(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized.length > 0 ? normalized : null;
}
