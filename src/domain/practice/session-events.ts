import { z } from "zod";

export const PRACTICE_SESSION_EVENT_SCHEMA_VERSION = 1 as const;

export const PRACTICE_SESSION_LIFECYCLE_EVENT_KINDS = [
  "session_started",
  "session_resumed",
  "session_paused",
  "session_ended"
] as const;

export const PRACTICE_SESSION_METRONOME_EVENT_KINDS = [
  "metronome_started",
  "metronome_stopped"
] as const;

export const PRACTICE_SESSION_RECORDING_EVENT_KINDS = [
  "recording_started",
  "recording_stopped"
] as const;

export const PRACTICE_SESSION_REFERENCE_EVENT_KINDS = [
  "reference_started",
  "reference_stopped"
] as const;

export const PRACTICE_SESSION_EVENT_KINDS = [
  ...PRACTICE_SESSION_LIFECYCLE_EVENT_KINDS,
  ...PRACTICE_SESSION_METRONOME_EVENT_KINDS,
  ...PRACTICE_SESSION_RECORDING_EVENT_KINDS,
  ...PRACTICE_SESSION_REFERENCE_EVENT_KINDS
] as const;

export type PracticeSessionLifecycleEventKind =
  typeof PRACTICE_SESSION_LIFECYCLE_EVENT_KINDS[number];

export type PracticeSessionMetronomeEventKind =
  typeof PRACTICE_SESSION_METRONOME_EVENT_KINDS[number];

export type PracticeSessionRecordingEventKind =
  typeof PRACTICE_SESSION_RECORDING_EVENT_KINDS[number];

export type PracticeSessionReferenceEventKind =
  typeof PRACTICE_SESSION_REFERENCE_EVENT_KINDS[number];

export type PracticeSessionEventKind =
  typeof PRACTICE_SESSION_EVENT_KINDS[number];

export type PracticeSessionEventPayload = Record<string, never>;

const isoDateSchema = z.iso
  .datetime({ offset: true })
  .refine((value) => new Date(value).toISOString() === value, {
    message: "Expected a strict ISO datetime with a real calendar date."
  });

const trimmedRequiredStringSchema = z.string().trim().min(1);
const optionalContextIdSchema = trimmedRequiredStringSchema.optional();

export const practiceSessionEventKindSchema = z.enum(
  PRACTICE_SESSION_EVENT_KINDS
);

export const practiceSessionEventPayloadSchema: z.ZodType<PracticeSessionEventPayload> =
  z.record(z.string(), z.never());

const practiceSessionEventBaseFields = {
  id: trimmedRequiredStringSchema,
  sessionId: trimmedRequiredStringSchema,
  occurredAt: isoDateSchema,
  sheetId: optionalContextIdSchema,
  segmentId: optionalContextIdSchema,
  payload: practiceSessionEventPayloadSchema,
  schemaVersion: z.literal(PRACTICE_SESSION_EVENT_SCHEMA_VERSION)
} as const;

function createLifecyclePracticeSessionEventSchema(
  kind: PracticeSessionLifecycleEventKind
) {
  return z
    .object({
      ...practiceSessionEventBaseFields,
      kind: z.literal(kind)
    })
    .strict();
}

function createMetronomePracticeSessionEventSchema(
  kind: PracticeSessionMetronomeEventKind
) {
  return z
    .object({
      ...practiceSessionEventBaseFields,
      kind: z.literal(kind)
    })
    .strict();
}

function createRecordingPracticeSessionEventSchema(
  kind: PracticeSessionRecordingEventKind
) {
  return z
    .object({
      ...practiceSessionEventBaseFields,
      kind: z.literal(kind),
      recordingId: optionalContextIdSchema
    })
    .strict();
}

function createReferencePracticeSessionEventSchema(
  kind: PracticeSessionReferenceEventKind
) {
  return z
    .object({
      ...practiceSessionEventBaseFields,
      kind: z.literal(kind),
      referenceId: optionalContextIdSchema
    })
    .strict();
}

const sessionStartedEventSchema = createLifecyclePracticeSessionEventSchema(
  "session_started"
);
const sessionResumedEventSchema = createLifecyclePracticeSessionEventSchema(
  "session_resumed"
);
const sessionPausedEventSchema = createLifecyclePracticeSessionEventSchema(
  "session_paused"
);
const sessionEndedEventSchema = createLifecyclePracticeSessionEventSchema(
  "session_ended"
);
const metronomeStartedEventSchema =
  createMetronomePracticeSessionEventSchema("metronome_started");
const metronomeStoppedEventSchema =
  createMetronomePracticeSessionEventSchema("metronome_stopped");
const recordingStartedEventSchema =
  createRecordingPracticeSessionEventSchema("recording_started");
const recordingStoppedEventSchema =
  createRecordingPracticeSessionEventSchema("recording_stopped");
const referenceStartedEventSchema =
  createReferencePracticeSessionEventSchema("reference_started");
const referenceStoppedEventSchema =
  createReferencePracticeSessionEventSchema("reference_stopped");

export const practiceSessionEventSchema = z.discriminatedUnion("kind", [
  sessionStartedEventSchema,
  sessionResumedEventSchema,
  sessionPausedEventSchema,
  sessionEndedEventSchema,
  metronomeStartedEventSchema,
  metronomeStoppedEventSchema,
  recordingStartedEventSchema,
  recordingStoppedEventSchema,
  referenceStartedEventSchema,
  referenceStoppedEventSchema
]);

export type PracticeSessionEvent = z.infer<typeof practiceSessionEventSchema>;

export type PracticeSessionLifecycleEvent = Extract<
  PracticeSessionEvent,
  { kind: PracticeSessionLifecycleEventKind }
>;

export type PracticeSessionMetronomeEvent = Extract<
  PracticeSessionEvent,
  { kind: PracticeSessionMetronomeEventKind }
>;

export type PracticeSessionRecordingEvent = Extract<
  PracticeSessionEvent,
  { kind: PracticeSessionRecordingEventKind }
>;

export type PracticeSessionReferenceEvent = Extract<
  PracticeSessionEvent,
  { kind: PracticeSessionReferenceEventKind }
>;

export function parsePracticeSessionEventKind(
  value: unknown
): PracticeSessionEventKind | null {
  const result = practiceSessionEventKindSchema.safeParse(value);

  return result.success ? result.data : null;
}

export function validatePracticeSessionEventKind(
  value: PracticeSessionEventKind
): PracticeSessionEventKind {
  return practiceSessionEventKindSchema.parse(value);
}

export function parsePracticeSessionEvent(
  value: unknown
): PracticeSessionEvent | null {
  const result = practiceSessionEventSchema.safeParse(value);

  return result.success ? result.data : null;
}

export function validatePracticeSessionEvent(
  value: PracticeSessionEvent
): PracticeSessionEvent {
  return practiceSessionEventSchema.parse(value);
}
