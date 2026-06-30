import { describe, expect, it } from "vitest";

import {
  calculatePracticeDurationMs,
  getTodayPracticeSummary,
  groupPracticeSessionsByHistory,
  withUpdatedPracticeSessionDuration,
  type PracticeSession,
  type SheetRecordingSegmentContext
} from "@/domain/practice";

function createSegmentContext(
  overrides: Partial<SheetRecordingSegmentContext> = {}
): SheetRecordingSegmentContext {
  return {
    segmentId: "segment-alpha",
    segmentName: "Bridge",
    range: {
      startMeasure: 5,
      endMeasure: 12
    },
    targetBpm: 96,
    measureGridVersion:
      "bpm:96|timeSignature:4/4|pickupBeats:0|measureOneOffsetMs:1000",
    measureGridSnapshot: {
      bpm: 96,
      timeSignature: "4/4",
      pickupBeats: 0,
      measureOneOffsetMs: 1_000
    },
    measureRangeMs: {
      startMs: 11_000,
      endMs: 31_000
    },
    ...overrides
  };
}

function createSession(overrides: Partial<PracticeSession> = {}): PracticeSession {
  return {
    id: "session-alpha",
    sourceType: "quick",
    sheetId: null,
    startedAt: "2026-06-21T12:00:00.000Z",
    endedAt: null,
    durationMs: 60_000,
    bpm: 96,
    timeSignature: "4/4",
    recordingCount: 1,
    latestRecordingId: "recording-alpha",
    updatedAt: "2026-06-21T12:01:00.000Z",
    segmentContext: null,
    ...overrides
  };
}

describe("practice session duration rules", () => {
  it("calculates active session duration from now and clamps future active timestamps", () => {
    expect(
      calculatePracticeDurationMs(
        {
          startedAt: "2026-06-21T12:00:00.000Z",
          endedAt: null
        },
        new Date("2026-06-21T12:00:04.400Z")
      )
    ).toBe(4_400);

    expect(
      calculatePracticeDurationMs(
        {
          startedAt: "2026-06-21T12:00:04.400Z",
          endedAt: null
        },
        new Date("2026-06-21T12:00:00.000Z")
      )
    ).toBe(0);
  });

  it("keeps ended session duration stable and ignores later clocks", () => {
    expect(
      calculatePracticeDurationMs(
        {
          startedAt: "2026-06-21T12:00:00.000Z",
          endedAt: "2026-06-21T12:00:04.400Z"
        },
        new Date("2026-06-21T13:00:00.000Z")
      )
    ).toBe(4_400);

    expect(
      calculatePracticeDurationMs(
        {
          startedAt: "2030-06-21T12:00:00.000Z",
          endedAt: "2030-06-21T12:01:00.000Z"
        },
        new Date("2026-06-21T12:00:00.000Z")
      )
    ).toBe(60_000);
  });

  it("returns zero for malformed, invalid, or backwards timestamp inputs", () => {
    expect(
      calculatePracticeDurationMs(
        {
          startedAt: "not-a-date",
          endedAt: null
        },
        new Date("2026-06-21T12:00:00.000Z")
      )
    ).toBe(0);

    expect(
      calculatePracticeDurationMs(
        {
          startedAt: "2026-06-21T12:00:00.000Z",
          endedAt: "not-a-date"
        },
        new Date("2026-06-21T12:00:10.000Z")
      )
    ).toBe(0);

    expect(
      calculatePracticeDurationMs(
        {
          startedAt: "2026-06-21T12:00:00.000Z",
          endedAt: null
        },
        new Date("not-a-date")
      )
    ).toBe(0);

    expect(
      calculatePracticeDurationMs(
        {
          startedAt: "2026-06-21T12:00:04.400Z",
          endedAt: "2026-06-21T12:00:00.000Z"
        },
        new Date("2026-06-21T12:00:10.000Z")
      )
    ).toBe(0);
  });

  it("updates duration and updatedAt together without reopening ended sessions", () => {
    const updated = withUpdatedPracticeSessionDuration(
      createSession({
        endedAt: "2026-06-21T12:00:04.400Z",
        durationMs: 1
      }),
      "2026-06-21T13:00:00.000Z"
    );

    expect(updated).toMatchObject({
      endedAt: "2026-06-21T12:00:04.400Z",
      durationMs: 4_400,
      updatedAt: "2026-06-21T13:00:00.000Z"
    });
  });

  it("uses the same timestamp semantics for quick, sheet, and segment-linked sessions", () => {
    const now = new Date("2026-06-21T12:00:04.400Z");
    const quick = createSession();
    const sheet = createSession({
      sourceType: "sheet",
      sheetId: "sheet-alpha"
    });
    const segmentLinked = createSession({
      sourceType: "sheet",
      sheetId: "sheet-alpha",
      segmentContext: createSegmentContext({
        measureRangeMs: {
          startMs: 1_000,
          endMs: 60_000
        }
      })
    });

    expect([
      calculatePracticeDurationMs(quick, now),
      calculatePracticeDurationMs(sheet, now),
      calculatePracticeDurationMs(segmentLinked, now)
    ]).toEqual([4_400, 4_400, 4_400]);
  });

  it("summarizes Today Summary from persisted durationMs values, including zero-duration sessions", () => {
    const summary = getTodayPracticeSummary(
      [
        createSession({
          id: "persisted-duration",
          startedAt: "2026-06-21T12:00:00.000Z",
          endedAt: "2026-06-21T13:00:00.000Z",
          durationMs: 1_234,
          recordingCount: 2
        }),
        createSession({
          id: "zero-duration",
          startedAt: "2026-06-21T14:00:00.000Z",
          endedAt: "2026-06-21T14:00:00.000Z",
          durationMs: 0,
          recordingCount: 0
        }),
        createSession({
          id: "other-day",
          startedAt: "2026-06-20T12:00:00.000Z",
          endedAt: "2026-06-20T12:01:00.000Z",
          durationMs: 999_999,
          recordingCount: 1
        })
      ],
      new Date("2026-06-21T15:00:00.000Z")
    );

    expect(summary).toEqual({
      durationMs: 1_234,
      minutesToday: 0,
      sessionsToday: 2,
      recordingsToday: 2
    });
  });

  it("summarizes history groups from persisted durationMs instead of segment metadata", () => {
    const groups = groupPracticeSessionsByHistory(
      [
        createSession({
          id: "segment-linked",
          sourceType: "sheet",
          sheetId: "sheet-alpha",
          durationMs: 7_000,
          recordingCount: 1,
          segmentContext: createSegmentContext({
            measureRangeMs: {
              startMs: 10_000,
              endMs: 60_000
            }
          })
        }),
        createSession({
          id: "zero-duration",
          sourceType: "sheet",
          sheetId: "sheet-alpha",
          durationMs: 0,
          recordingCount: 0,
          segmentContext: createSegmentContext()
        })
      ],
      "segment"
    );

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      durationMs: 7_000,
      sessionCount: 2,
      recordingCount: 1
    });
  });
});
