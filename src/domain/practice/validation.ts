import { z } from "zod";

import type {
  PracticeSession,
  SheetRecordingMetadata
} from "@/domain/practice/types";
import { TIME_SIGNATURES } from "@/lib/quick-metronome/control";

const isoDateSchema = z.iso
  .datetime({ offset: true })
  .refine((value) => new Date(value).toISOString() === value, {
    message: "Expected a strict ISO datetime with a real calendar date."
  });

const practiceTimeSignatureSchema = z.enum(TIME_SIGNATURES);

const practiceSessionSchema = z
  .object({
    id: z.string().trim().min(1),
    sourceType: z.enum(["quick", "sheet"]),
    sheetId: z.string().trim().min(1).nullable(),
    startedAt: isoDateSchema,
    endedAt: isoDateSchema.nullable(),
    durationMs: z.number().finite().int().nonnegative(),
    bpm: z.number().finite().int().min(30).max(300).nullable(),
    timeSignature: practiceTimeSignatureSchema.nullable(),
    recordingCount: z.number().finite().int().nonnegative(),
    latestRecordingId: z.string().trim().min(1).nullable(),
    updatedAt: isoDateSchema
  })
  .superRefine((session, context) => {
    if (session.sourceType === "quick" && session.sheetId !== null) {
      context.addIssue({
        code: "custom",
        path: ["sheetId"],
        message: "Quick sessions must not have sheetId."
      });
    }

    if (session.sourceType === "sheet" && !session.sheetId) {
      context.addIssue({
        code: "custom",
        path: ["sheetId"],
        message: "Sheet sessions require sheetId."
      });
    }

    if (
      session.endedAt &&
      Date.parse(session.endedAt) < Date.parse(session.startedAt)
    ) {
      context.addIssue({
        code: "custom",
        path: ["endedAt"],
        message: "endedAt must be after startedAt."
      });
    }
  });

const sheetRecordingMetadataSchema = z.object({
  id: z.string().trim().min(1),
  type: z.literal("sheet"),
  sessionId: z.string().trim().min(1),
  sheetId: z.string().trim().min(1),
  sheetName: z.string().trim().min(1).nullable(),
  createdAt: isoDateSchema,
  durationMs: z.number().finite().int().nonnegative(),
  bpm: z.number().finite().int().min(30).max(300).nullable(),
  timeSignature: practiceTimeSignatureSchema.nullable()
});

export function parsePracticeSession(value: unknown): PracticeSession | null {
  const result = practiceSessionSchema.safeParse(value);

  return result.success ? result.data : null;
}

export function parseSheetRecordingMetadata(
  value: unknown
): SheetRecordingMetadata | null {
  const result = sheetRecordingMetadataSchema.safeParse(value);

  return result.success ? result.data : null;
}

export function validatePracticeSession(
  value: PracticeSession
): PracticeSession {
  return practiceSessionSchema.parse(value);
}

export function validateSheetRecordingMetadata(
  value: SheetRecordingMetadata
): SheetRecordingMetadata {
  return sheetRecordingMetadataSchema.parse(value);
}
