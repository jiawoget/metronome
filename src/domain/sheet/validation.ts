import { z } from "zod";

import {
  SHEET_CATEGORIES,
  type ImportedSheet,
  type SheetMetadataInput,
  type SheetOrganizationMetadata
} from "@/domain/sheet/types";

const SHEET_TAG_MAX_LENGTH = 24;
const SHEET_TAG_MAX_COUNT = 12;
const tagControlOrCommaPattern = /[,\u0000-\u001F\u007F\u2028\u2029]/;

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

const sheetOrganizationSchema = z.object({
  tags: z.array(z.string(), "Tags must be an array."),
  favorite: z.boolean("Favorite must be true or false.")
});

export type SheetOrganizationValidationResult =
  | {
      ok: true;
      value: SheetOrganizationMetadata;
    }
  | {
      ok: false;
      errors: string[];
    };

export function normalizeSheetTag(input: string): string | null {
  if (tagControlOrCommaPattern.test(input)) {
    return null;
  }

  const normalized = input.trim().replace(/\s+/g, " ");

  if (!normalized || normalized.length > SHEET_TAG_MAX_LENGTH) {
    return null;
  }

  return normalized;
}

export function normalizeSheetTags(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const normalizedTags: string[] = [];
  const seenTags = new Set<string>();

  for (const entry of input) {
    if (typeof entry !== "string") {
      continue;
    }

    const normalizedTag = normalizeSheetTag(entry);

    if (!normalizedTag) {
      continue;
    }

    const dedupeKey = normalizedTag.toLowerCase();

    if (seenTags.has(dedupeKey)) {
      continue;
    }

    seenTags.add(dedupeKey);
    normalizedTags.push(normalizedTag);

    if (normalizedTags.length === SHEET_TAG_MAX_COUNT) {
      break;
    }
  }

  return normalizedTags;
}

export function resolveSheetOrganization(
  sheet: Pick<ImportedSheet, "tags" | "favorite">
): SheetOrganizationMetadata {
  return {
    tags: normalizeSheetTags(sheet.tags),
    favorite: typeof sheet.favorite === "boolean" ? sheet.favorite : false
  };
}

export function validateSheetOrganizationInput(input: {
  tags: unknown;
  favorite: unknown;
}): SheetOrganizationValidationResult {
  const result = sheetOrganizationSchema.safeParse(input);

  if (!result.success) {
    return {
      ok: false,
      errors: result.error.issues.map((issue) => issue.message)
    };
  }

  const normalizedTags: string[] = [];
  const seenTags = new Set<string>();
  const errors = new Set<string>();

  for (const tag of result.data.tags) {
    if (!tag.trim()) {
      errors.add("Tags cannot be empty.");
      continue;
    }

    if (tagControlOrCommaPattern.test(tag)) {
      errors.add("Tags cannot contain commas, line breaks, or control characters.");
      continue;
    }

    const normalizedTag = normalizeSheetTag(tag);

    if (!normalizedTag) {
      errors.add(`Tags must be ${SHEET_TAG_MAX_LENGTH} characters or fewer.`);
      continue;
    }

    const dedupeKey = normalizedTag.toLowerCase();

    if (seenTags.has(dedupeKey)) {
      continue;
    }

    seenTags.add(dedupeKey);
    normalizedTags.push(normalizedTag);
  }

  if (normalizedTags.length > SHEET_TAG_MAX_COUNT) {
    errors.add(`Sheets can have at most ${SHEET_TAG_MAX_COUNT} tags.`);
  }

  if (errors.size > 0) {
    return {
      ok: false,
      errors: Array.from(errors)
    };
  }

  return {
    ok: true,
    value: {
      tags: normalizedTags,
      favorite: result.data.favorite
    }
  };
}
