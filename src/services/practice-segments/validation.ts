import { z } from "zod";

const practiceSegmentSheetIdSchema = z.string().trim().min(1, "sheetId is required.");
const practiceSegmentIdSchema = z.string().trim().min(1, "segmentId is required.");

export function normalizePracticeSegmentSheetId(sheetId: string) {
  return practiceSegmentSheetIdSchema.parse(sheetId);
}

export function normalizePracticeSegmentId(segmentId: string) {
  return practiceSegmentIdSchema.parse(segmentId);
}
