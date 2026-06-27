import { z } from "zod";

import { SHEET_CATEGORIES, type SheetMetadataInput } from "@/domain/sheet/types";

const sheetMetadataSchema = z.object({
  name: z.string().trim().min(1, "Sheet name is required.").max(120, "Sheet name is too long."),
  category: z.enum(SHEET_CATEGORIES),
  bpm: z.coerce
    .number()
    .int("BPM must be a whole number.")
    .min(30, "BPM must be at least 30.")
    .max(300, "BPM must be 300 or lower."),
  timeSignature: z
    .string()
    .trim()
    .regex(/^[1-9][0-9]?\/(?:2|4|8|16)$/, "Use a time signature like 4/4, 3/4, or 6/8.")
});

export type SheetValidationResult =
  | {
      ok: true;
      value: SheetMetadataInput;
    }
  | {
      ok: false;
      errors: string[];
    };

export function validateSheetMetadata(input: SheetMetadataInput): SheetValidationResult {
  const result = sheetMetadataSchema.safeParse(input);

  if (!result.success) {
    return {
      ok: false,
      errors: result.error.issues.map((issue) => issue.message)
    };
  }

  return {
    ok: true,
    value: result.data
  };
}
