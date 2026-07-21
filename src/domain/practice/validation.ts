import { z } from "zod";
import {
  SUPPORTED_TIME_SIGNATURES,
  isSupportedTimeSignature
} from "@/domain/music/meter-policy";
import type {
  LocalPracticeGoal,
  PracticeSession,
  LocalPracticeGoalStatus,
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
  .refine((value) => {
    const parsedValue = new Date(value);

    return Number.isFinite(parsedValue.getTime()) && parsedValue.toISOString() === value;
  }, {
    message: "Expected a strict ISO datetime with a real calendar date."
  });

export function parsePracticeTimeSignature(value: unknown) {
  return isSupportedTimeSignature(value) ? value : null;
}

const practiceTimeSignatureSchema = z.enum(SUPPORTED_TIME_SIGNATURES);
const LOCAL_PRACTICE_GOAL_STATUSES = ["active", "completed", "invalid"] as const;
const localPracticeGoalKindSchema = z.enum(["minutes", "sessions", "takes"]);
const localPracticeGoalPeriodSchema = z.enum(["today", "all-time"]);
const localPracticeGoalStatusSchema = z.enum(LOCAL_PRACTICE_GOAL_STATUSES);
const practiceGoalTargetTextSchema = z.string().trim().regex(/^\d+$/u);
const practiceGoalSafeTargetSchema = z.number().int().positive();
const MAX_PRACTICE_GOAL_TARGET = 1_000_000;
const trimmedRequiredStringSchema = z.string().trim().min(1);
const segmentNameSchema = z.string().trim().min(1).max(80);
const targetBpmSchema = z.number().int().min(30).max(300).nullable();
const measureRangeMsSchema = z
  .object({
    startMs: z.number().int().nonnegative(),
    endMs: z.number().int().nonnegative()
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
    durationMs: z.number().int().nonnegative(),
    bpm: z.number().int().min(30).max(300).nullable(),
    timeSignature: practiceTimeSignatureSchema.nullable(),
    recordingCount: z.number().int().nonnegative(),
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
  durationMs: z.number().int().nonnegative(),
  bpm: z.number().int().min(30).max(300).nullable(),
  timeSignature: practiceTimeSignatureSchema.nullable(),
  segmentContext: sheetRecordingSegmentContextFieldSchema
});

const localPracticeGoalSchema = z.object({
  id: trimmedRequiredStringSchema,
  kind: localPracticeGoalKindSchema,
  target: z.number().int().positive(),
  period: localPracticeGoalPeriodSchema,
  createdAt: isoDateSchema,
  completedAt: isoDateSchema.nullable().optional().transform((value) => value ?? null),
  status: localPracticeGoalStatusSchema.optional().transform((value) => value ?? "active")
});

type PracticeGoalDraftInput = Record<"kind" | "period" | "targetText", unknown>;

export type PracticeGoalDraftErrorCode =
  | "unsupported-kind"
  | "unsupported-period"
  | "target-whole-number"
  | "target-safe-integer"
  | "target-too-large";

export type PracticeGoalDraftResult =
  | { success: true; goal: LocalPracticeGoal }
  | { success: false; error: { code: PracticeGoalDraftErrorCode } };

type PracticeGoalDraftOptions = {
  baseGoal?: LocalPracticeGoal | null;
  createId: () => string;
  now: () => Date;
};

function getPracticeGoalIdentity(
  baseGoal: LocalPracticeGoal | null,
  createId: () => string,
  now: () => Date
) {
  return baseGoal
    ? { id: baseGoal.id, createdAt: baseGoal.createdAt }
    : { id: createId(), createdAt: now().toISOString() };
}

export function parsePracticeGoalDraft(
  draft: PracticeGoalDraftInput,
  {
    baseGoal = null,
    createId,
    now
  }: PracticeGoalDraftOptions
): PracticeGoalDraftResult {
  const kindResult = localPracticeGoalKindSchema.safeParse(draft.kind);

  if (!kindResult.success) {
    return { success: false, error: { code: "unsupported-kind" } };
  }

  const periodResult = localPracticeGoalPeriodSchema.safeParse(draft.period);

  if (!periodResult.success) {
    return { success: false, error: { code: "unsupported-period" } };
  }

  const targetTextResult = practiceGoalTargetTextSchema.safeParse(draft.targetText);

  if (!targetTextResult.success) {
    return { success: false, error: { code: "target-whole-number" } };
  }

  const targetResult = practiceGoalSafeTargetSchema.safeParse(
    Number(targetTextResult.data)
  );

  if (!targetResult.success) {
    return { success: false, error: { code: "target-safe-integer" } };
  }

  if (targetResult.data > MAX_PRACTICE_GOAL_TARGET) {
    return { success: false, error: { code: "target-too-large" } };
  }

  const identity = getPracticeGoalIdentity(baseGoal, createId, now);

  return {
    success: true,
    goal: {
      id: identity.id,
      kind: kindResult.data,
      target: targetResult.data,
      period: periodResult.data,
      createdAt: identity.createdAt
    }
  };
}

export function parsePracticeSession(value: unknown): PracticeSession | null {
  const result = practiceSessionSchema.safeParse(value);

  return result.success ? result.data : null;
}

export function parseLocalPracticeGoal(value: unknown): LocalPracticeGoal | null {
  const result = localPracticeGoalSchema.safeParse(value);

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

export function validateLocalPracticeGoal(
  value: LocalPracticeGoal
): LocalPracticeGoal & {
  completedAt: string | null;
  status: LocalPracticeGoalStatus;
} {
  return localPracticeGoalSchema.parse(value);
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
