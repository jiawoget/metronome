import { z } from "zod";

import type {
  PracticeSession,
  SheetRecordingSegmentContext,
  SheetRecordingMetadata
} from "@/domain/practice/types";
import {
  getMeasureRangeMs,
  measureGridSchema,
  measureRangeSchema
} from "@/domain/practice/measure-grid";

const isoDateSchema = z.iso
  .datetime({ offset: true })
  .refine((value) => new Date(value).toISOString() === value, {
    message: "Expected a strict ISO datetime with a real calendar date."
  });

const PRACTICE_TIME_SIGNATURES = ["2/4", "3/4", "4/4", "6/8", "12/8"] as const;

export function parsePracticeTimeSignature(value: unknown) {
  return typeof value === "string" &&
    (PRACTICE_TIME_SIGNATURES as readonly string[]).includes(value)
    ? value
    : null;
}

const practiceTimeSignatureSchema = z.enum(PRACTICE_TIME_SIGNATURES);
const trimmedRequiredStringSchema = z.string().trim().min(1);
const segmentNameSchema = z.string().trim().min(1).max(80);
const targetBpmSchema = z.number().finite().int().min(30).max(300).nullable();
const measureRangeMsSchema = z
  .object({
    startMs: z.number().finite().int().nonnegative(),
    endMs: z.number().finite().int().nonnegative()
  })
  .superRefine((range, context) => {
    if (range.endMs < range.startMs) {
      context.addIssue({
        code: "custom",
        path: ["endMs"],
        message: "endMs must be greater than or equal to startMs."
      });
    }
  });

const sheetRecordingSegmentContextSchema = z
  .object({
    segmentId: trimmedRequiredStringSchema,
    segmentName: segmentNameSchema,
    range: measureRangeSchema,
    targetBpm: targetBpmSchema,
    measureGridVersion: trimmedRequiredStringSchema,
    measureGridSnapshot: measureGridSchema,
    measureRangeMs: measureRangeMsSchema
  })
  .superRefine((segmentContext, context) => {
    let expectedMeasureRangeMs: ReturnType<typeof getMeasureRangeMs>;

    try {
      expectedMeasureRangeMs = getMeasureRangeMs(
        segmentContext.measureGridSnapshot,
        segmentContext.range
      );
    } catch {
      return;
    }

    if (
      segmentContext.measureRangeMs.startMs !== expectedMeasureRangeMs.startMs
    ) {
      context.addIssue({
        code: "custom",
        path: ["measureRangeMs", "startMs"],
        message: "startMs must match the measure range and grid snapshot."
      });
    }

    if (segmentContext.measureRangeMs.endMs !== expectedMeasureRangeMs.endMs) {
      context.addIssue({
        code: "custom",
        path: ["measureRangeMs", "endMs"],
        message: "endMs must match the measure range and grid snapshot."
      });
    }
  });

const sheetRecordingSegmentContextFieldSchema = sheetRecordingSegmentContextSchema
  .nullable()
  .optional()
  .transform((value) => value ?? null);

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
    updatedAt: isoDateSchema,
    segmentContext: sheetRecordingSegmentContextFieldSchema
  })
  .superRefine((session, context) => {
    if (session.sourceType === "quick" && session.sheetId !== null) {
      context.addIssue({
        code: "custom",
        path: ["sheetId"],
        message: "Quick sessions must not have sheetId."
      });
    }

    if (session.sourceType === "quick" && session.segmentContext !== null) {
      context.addIssue({
        code: "custom",
        path: ["segmentContext"],
        message: "Quick sessions must not have segment context."
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
  id: trimmedRequiredStringSchema,
  type: z.literal("sheet"),
  sessionId: trimmedRequiredStringSchema,
  sheetId: trimmedRequiredStringSchema,
  sheetName: z.string().trim().min(1).nullable(),
  createdAt: isoDateSchema,
  durationMs: z.number().finite().int().nonnegative(),
  bpm: z.number().finite().int().min(30).max(300).nullable(),
  timeSignature: practiceTimeSignatureSchema.nullable(),
  segmentContext: sheetRecordingSegmentContextFieldSchema
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

export function parseSheetRecordingSegmentContext(
  value: unknown
): SheetRecordingSegmentContext | null {
  const result = sheetRecordingSegmentContextSchema.safeParse(value);

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

export function validateSheetRecordingSegmentContext(
  value: SheetRecordingSegmentContext
): SheetRecordingSegmentContext {
  return sheetRecordingSegmentContextSchema.parse(value);
}
