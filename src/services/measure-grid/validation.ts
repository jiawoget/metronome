import { z } from "zod";

const measureGridSheetIdSchema = z.string().trim().min(1, "sheetId is required.");

export function normalizeMeasureGridSheetId(sheetId: string) {
  return measureGridSheetIdSchema.parse(sheetId);
}
