import { z } from "zod";

const practiceSegmentSheetIdSchema = z.string().trim().min(1, "sheetId is required.");
const practiceSegmentIdSchema = z.string().trim().min(1, "segmentId is required.");

export const DUPLICATE_PRACTICE_SEGMENT_NAME_ERROR_MESSAGE = "Segment name already exists.";

export function normalizePracticeSegmentSheetId(sheetId: string) {
  return practiceSegmentSheetIdSchema.parse(sheetId);
}

export function normalizePracticeSegmentId(segmentId: string) {
  return practiceSegmentIdSchema.parse(segmentId);
}

export function normalizePracticeSegmentNameForComparison(name: string) {
  // Duplicate checks ignore surrounding whitespace and case; domain validation owns required and length rules.
  return name.trim().toLowerCase();
}
