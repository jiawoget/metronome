import { describe, expect, expectTypeOf, it } from "vitest";

import {
  PRACTICE_SESSION_EVENT_SCHEMA_VERSION,
  PRACTICE_SESSION_LIFECYCLE_EVENT_KINDS,
  PRACTICE_SESSION_METRONOME_EVENT_KINDS,
  PRACTICE_SESSION_RECORDING_EVENT_KINDS,
  PRACTICE_SESSION_REFERENCE_EVENT_KINDS,
  parsePracticeSessionEvent,
  parsePracticeSessionEventKind,
  validatePracticeSessionEventKind,
  validatePracticeSessionEvent,
  type PracticeSessionEvent,
  type PracticeSessionEventKind,
  type PracticeSessionEventPayload
} from "@/domain/practice";

import { TEST_ISO_DATE } from "./factories/practice";

function buildEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "event-1",
    sessionId: "session-1",
    occurredAt: TEST_ISO_DATE,
    kind: "session_started",
    payload: {},
    schemaVersion: PRACTICE_SESSION_EVENT_SCHEMA_VERSION,
    ...overrides
  };
}

function buildEventForKind(
  kind: PracticeSessionEventKind,
  overrides: Record<string, unknown> = {}
) {
  return buildEvent({
    kind,
    ...overrides
  });
}

describe("practice session event domain", () => {
  it("exposes an empty payload type at the TypeScript boundary", () => {
    expectTypeOf<PracticeSessionEventPayload>().toEqualTypeOf<
      Record<string, never>
    >();
    expectTypeOf<PracticeSessionEvent["payload"]>().toEqualTypeOf<
      Record<string, never>
    >();
  });

  it("parses and validates only the owned event kinds", () => {
    expect(parsePracticeSessionEventKind("session_started")).toBe(
      "session_started"
    );
    expect(parsePracticeSessionEventKind("reference_stopped")).toBe(
      "reference_stopped"
    );
    expect(parsePracticeSessionEventKind("note_added")).toBeNull();
    expect(parsePracticeSessionEventKind("session_reset")).toBeNull();

    expect(validatePracticeSessionEventKind("recording_started")).toBe(
      "recording_started"
    );
    expect(() =>
      validatePracticeSessionEventKind("note_added" as never)
    ).toThrow();
  });

  it("parses and validates minimal lifecycle events with the existing trimming convention", () => {
    const parsed = parsePracticeSessionEvent(
      buildEvent({
        id: "  event-start  ",
        sessionId: "  session-alpha  "
      })
    );

    expect(parsed).toEqual({
      id: "event-start",
      sessionId: "session-alpha",
      occurredAt: TEST_ISO_DATE,
      kind: "session_started",
      payload: {},
      schemaVersion: PRACTICE_SESSION_EVENT_SCHEMA_VERSION
    });
    expect(
      validatePracticeSessionEvent(buildEvent({ kind: "session_ended" }) as never)
    ).toEqual({
      id: "event-1",
      sessionId: "session-1",
      occurredAt: TEST_ISO_DATE,
      kind: "session_ended",
      payload: {},
      schemaVersion: PRACTICE_SESSION_EVENT_SCHEMA_VERSION
    });
  });

  it("accepts quick, sheet, recording-linked, and reference-linked records without transport coupling", () => {
    expect(
      parsePracticeSessionEvent(
        buildEvent({
          kind: "metronome_started"
        })
      )
    ).toEqual({
      id: "event-1",
      sessionId: "session-1",
      occurredAt: TEST_ISO_DATE,
      kind: "metronome_started",
      payload: {},
      schemaVersion: PRACTICE_SESSION_EVENT_SCHEMA_VERSION
    });

    expect(
      parsePracticeSessionEvent(
        buildEvent({
          kind: "session_paused",
          sheetId: "sheet-alpha",
          segmentId: "segment-bridge"
        })
      )
    ).toEqual({
      id: "event-1",
      sessionId: "session-1",
      occurredAt: TEST_ISO_DATE,
      kind: "session_paused",
      sheetId: "sheet-alpha",
      segmentId: "segment-bridge",
      payload: {},
      schemaVersion: PRACTICE_SESSION_EVENT_SCHEMA_VERSION
    });

    expect(
      parsePracticeSessionEvent(
        buildEvent({
          kind: "recording_started"
        })
      )
    ).toEqual({
      id: "event-1",
      sessionId: "session-1",
      occurredAt: TEST_ISO_DATE,
      kind: "recording_started",
      payload: {},
      schemaVersion: PRACTICE_SESSION_EVENT_SCHEMA_VERSION
    });

    expect(
      parsePracticeSessionEvent(
        buildEvent({
          kind: "recording_stopped",
          recordingId: "recording-1",
          sheetId: "sheet-alpha"
        })
      )
    ).toEqual({
      id: "event-1",
      sessionId: "session-1",
      occurredAt: TEST_ISO_DATE,
      kind: "recording_stopped",
      recordingId: "recording-1",
      sheetId: "sheet-alpha",
      payload: {},
      schemaVersion: PRACTICE_SESSION_EVENT_SCHEMA_VERSION
    });

    expect(
      parsePracticeSessionEvent(
        buildEvent({
          kind: "reference_started",
          referenceId: "reference-1",
          segmentId: "segment-bridge"
        })
      )
    ).toEqual({
      id: "event-1",
      sessionId: "session-1",
      occurredAt: TEST_ISO_DATE,
      kind: "reference_started",
      referenceId: "reference-1",
      segmentId: "segment-bridge",
      payload: {},
      schemaVersion: PRACTICE_SESSION_EVENT_SCHEMA_VERSION
    });
  });

  it("enforces the context field matrix across all owned event kind groups", () => {
    for (const kind of PRACTICE_SESSION_LIFECYCLE_EVENT_KINDS) {
      expect(
        parsePracticeSessionEvent(
          buildEventForKind(kind, {
            sheetId: "sheet-alpha",
            segmentId: "segment-1"
          })
        )
      ).toMatchObject({
        kind,
        sheetId: "sheet-alpha",
        segmentId: "segment-1"
      });
      expect(
        parsePracticeSessionEvent(
          buildEventForKind(kind, {
            recordingId: "recording-1"
          })
        )
      ).toBeNull();
      expect(
        parsePracticeSessionEvent(
          buildEventForKind(kind, {
            referenceId: "reference-1"
          })
        )
      ).toBeNull();
    }

    for (const kind of PRACTICE_SESSION_METRONOME_EVENT_KINDS) {
      expect(
        parsePracticeSessionEvent(
          buildEventForKind(kind, {
            sheetId: "sheet-alpha",
            segmentId: "segment-1"
          })
        )
      ).toMatchObject({
        kind,
        sheetId: "sheet-alpha",
        segmentId: "segment-1"
      });
      expect(
        parsePracticeSessionEvent(
          buildEventForKind(kind, {
            recordingId: "recording-1"
          })
        )
      ).toBeNull();
      expect(
        parsePracticeSessionEvent(
          buildEventForKind(kind, {
            referenceId: "reference-1"
          })
        )
      ).toBeNull();
    }

    for (const kind of PRACTICE_SESSION_RECORDING_EVENT_KINDS) {
      expect(parsePracticeSessionEvent(buildEventForKind(kind))).toMatchObject({
        kind
      });
      expect(
        parsePracticeSessionEvent(
          buildEventForKind(kind, {
            recordingId: "recording-1",
            sheetId: "sheet-alpha",
            segmentId: "segment-1"
          })
        )
      ).toMatchObject({
        kind,
        recordingId: "recording-1",
        sheetId: "sheet-alpha",
        segmentId: "segment-1"
      });
      expect(
        parsePracticeSessionEvent(
          buildEventForKind(kind, {
            referenceId: "reference-1"
          })
        )
      ).toBeNull();
    }

    for (const kind of PRACTICE_SESSION_REFERENCE_EVENT_KINDS) {
      expect(parsePracticeSessionEvent(buildEventForKind(kind))).toMatchObject({
        kind
      });
      expect(
        parsePracticeSessionEvent(
          buildEventForKind(kind, {
            referenceId: "reference-1",
            sheetId: "sheet-alpha",
            segmentId: "segment-1"
          })
        )
      ).toMatchObject({
        kind,
        referenceId: "reference-1",
        sheetId: "sheet-alpha",
        segmentId: "segment-1"
      });
      expect(
        parsePracticeSessionEvent(
          buildEventForKind(kind, {
            recordingId: "recording-1"
          })
        )
      ).toBeNull();
    }
  });

  it("rejects invalid ids, timestamps, kinds, payload details, schema drift, and unknown top-level fields", () => {
    const eventWithoutSchemaVersion = (({ schemaVersion, ...rest }) => {
      void schemaVersion;

      return rest;
    })(buildEvent());

    expect(
      parsePracticeSessionEvent({
        sessionId: "session-1",
        occurredAt: TEST_ISO_DATE,
        kind: "session_started",
        payload: {},
        schemaVersion: PRACTICE_SESSION_EVENT_SCHEMA_VERSION
      })
    ).toBeNull();
    expect(
      parsePracticeSessionEvent(buildEvent({ id: "   " }))
    ).toBeNull();
    expect(
      parsePracticeSessionEvent(buildEvent({ sessionId: "   " }))
    ).toBeNull();
    expect(
      parsePracticeSessionEvent(buildEvent({ kind: "session_reset" }))
    ).toBeNull();
    expect(parsePracticeSessionEvent(eventWithoutSchemaVersion)).toBeNull();
    expect(
      parsePracticeSessionEvent(
        buildEvent({ occurredAt: "2026-02-30T12:00:00.000Z" })
      )
    ).toBeNull();
    expect(
      parsePracticeSessionEvent(
        buildEvent({ occurredAt: "2026-06-21T12:00:00.000+08:00" })
      )
    ).toBeNull();
    expect(
      parsePracticeSessionEvent(
        buildEvent({
          kind: "metronome_started",
          payload: {
            durationMs: -1
          }
        })
      )
    ).toBeNull();
    expect(
      parsePracticeSessionEvent(
        buildEvent({
          kind: "reference_started",
          referenceId: "reference-1",
          payload: {
            bilibiliUrl: "https://www.bilibili.com/video/BV1ab411c7dE",
            localAudioArtifactId: "artifact-1",
            offsetMs: 1200,
            waveformPeaks: [0, 1],
            playbackSource: "bilibili"
          }
        })
      )
    ).toBeNull();
    expect(
      parsePracticeSessionEvent(buildEvent({ schemaVersion: 2 }))
    ).toBeNull();
    expect(
      parsePracticeSessionEvent(buildEvent({ source: "quick" }))
    ).toBeNull();
    expect(
      parsePracticeSessionEvent(buildEvent({ unknownField: true }))
    ).toBeNull();
    expect(() =>
      validatePracticeSessionEvent(
        buildEvent({
          kind: "reference_stopped",
          recordingId: "recording-1"
        }) as never
      )
    ).toThrow();
  });

  it("parses individual records without requiring prior events, sheet ids, or recording ids", () => {
    expect(
      parsePracticeSessionEvent(
        buildEvent({
          kind: "session_ended"
        })
      )
    ).toEqual({
      id: "event-1",
      sessionId: "session-1",
      occurredAt: TEST_ISO_DATE,
      kind: "session_ended",
      payload: {},
      schemaVersion: PRACTICE_SESSION_EVENT_SCHEMA_VERSION
    });
    expect(
      parsePracticeSessionEvent(
        buildEvent({
          kind: "recording_started"
        })
      )
    ).toMatchObject({
      kind: "recording_started"
    });
    expect(
      parsePracticeSessionEvent(
        buildEvent({
          kind: "session_resumed"
        })
      )
    ).toMatchObject({
      kind: "session_resumed"
    });
  });
});
