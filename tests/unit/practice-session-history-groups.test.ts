import { describe, expect, it } from "vitest";

import {
  createSessionHistorySegmentTargetKey,
  getBrowserLocalDateKey,
  groupPracticeSessionsByHistory,
  type PracticeSession,
  type SessionHistoryTargetResolution,
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

function createSheetSession(overrides: Partial<PracticeSession> = {}) {
  return createSession({
    sourceType: "sheet",
    sheetId: "sheet-alpha",
    ...overrides
  });
}

function getExpectedLocalDateKey(isoValue: string) {
  const value = new Date(isoValue);

  return [
    value.getFullYear().toString().padStart(4, "0"),
    (value.getMonth() + 1).toString().padStart(2, "0"),
    value.getDate().toString().padStart(2, "0")
  ].join("-");
}

describe("practice session history grouping", () => {
  it("returns no groups for empty history", () => {
    expect(groupPracticeSessionsByHistory([], "date")).toEqual([]);
    expect(groupPracticeSessionsByHistory([], "sheet")).toEqual([]);
    expect(groupPracticeSessionsByHistory([], "segment")).toEqual([]);
  });

  it("groups sessions by browser-local practice date and keeps invalid timestamps last", () => {
    const lateLocalSession = createSession({
      id: "late-local",
      startedAt: new Date(2026, 5, 21, 23, 59).toISOString(),
      updatedAt: new Date(2026, 5, 21, 23, 59).toISOString()
    });
    const nextLocalSession = createSession({
      id: "next-local",
      startedAt: new Date(2026, 5, 22, 0, 1).toISOString(),
      updatedAt: new Date(2026, 5, 22, 0, 1).toISOString()
    });
    const invalidSession = createSession({
      id: "invalid-start",
      startedAt: "not-a-date",
      updatedAt: "2026-06-20T12:00:00.000Z"
    } as Partial<PracticeSession>);

    const groups = groupPracticeSessionsByHistory(
      [lateLocalSession, invalidSession, nextLocalSession],
      "date"
    );

    expect(groups.map((group) => group.localDate)).toEqual([
      getBrowserLocalDateKey(nextLocalSession.startedAt),
      getBrowserLocalDateKey(lateLocalSession.startedAt),
      null
    ]);
    expect(groups[2]).toMatchObject({
      id: "date:unknown",
      label: "Unknown date",
      targetState: "valid"
    });
  });

  it("derives local date keys from Date calendar fields instead of UTC string slicing", () => {
    const candidates = [
      "2026-06-21T00:15:00+14:00",
      "2026-06-21T23:45:00-12:00"
    ];
    const divergentIso = candidates.find(
      (isoValue) => getExpectedLocalDateKey(isoValue) !== isoValue.slice(0, 10)
    );

    expect(divergentIso).toBeDefined();
    expect(getBrowserLocalDateKey(divergentIso!)).toBe(
      getExpectedLocalDateKey(divergentIso!)
    );
    expect(getBrowserLocalDateKey(divergentIso!)).not.toBe(
      divergentIso!.slice(0, 10)
    );
  });

  it("groups sheet history by quick, valid sheet, missing sheet, and lookup failure targets", () => {
    const sessions = [
      createSession({
        id: "quick-session",
        updatedAt: "2026-06-21T15:00:00.000Z"
      }),
      createSheetSession({
        id: "valid-sheet",
        sheetId: "sheet-alpha",
        durationMs: 30_000,
        recordingCount: 2,
        updatedAt: "2026-06-21T14:00:00.000Z"
      }),
      createSheetSession({
        id: "deleted-sheet",
        sheetId: "sheet-deleted",
        updatedAt: "2026-06-21T13:00:00.000Z"
      }),
      createSheetSession({
        id: "failed-sheet",
        sheetId: "sheet-failed",
        updatedAt: "2026-06-21T12:00:00.000Z"
      })
    ];
    const targets: SessionHistoryTargetResolution = {
      sheets: {
        "sheet-alpha": {
          state: "valid",
          value: {
            name: "Alpha Etude"
          }
        },
        "sheet-deleted": {
          state: "missing"
        },
        "sheet-failed": {
          state: "lookup-failed"
        }
      }
    };

    const groups = groupPracticeSessionsByHistory(sessions, "sheet", targets);

    expect(groups.map((group) => [group.id, group.targetState, group.label])).toEqual([
      ["sheet:quick", "quick", "Quick Practice"],
      ["sheet:id:sheet-alpha", "valid", "Alpha Etude"],
      ["sheet:id:sheet-deleted", "missing-sheet", "Deleted sheet"],
      ["sheet:id:sheet-failed", "lookup-failed", "sheet-failed"]
    ]);
    expect(groups[1]).toMatchObject({
      sessionCount: 1,
      recordingCount: 2,
      durationMs: 30_000,
      latestUpdatedAt: "2026-06-21T14:00:00.000Z"
    });
  });

  it("groups segment history with quick, no-segment, valid, missing, and per-sheet segment targets", () => {
    const sessions = [
      createSession({
        id: "quick-session",
        updatedAt: "2026-06-21T15:00:00.000Z"
      }),
      createSheetSession({
        id: "sheet-no-segment",
        sheetId: "sheet-alpha",
        segmentContext: null,
        updatedAt: "2026-06-21T14:00:00.000Z"
      }),
      createSheetSession({
        id: "alpha-segment",
        sheetId: "sheet-alpha",
        segmentContext: createSegmentContext({
          segmentId: "segment-shared",
          segmentName: "Historical Bridge"
        }),
        updatedAt: "2026-06-21T13:00:00.000Z"
      }),
      createSheetSession({
        id: "beta-segment",
        sheetId: "sheet-beta",
        segmentContext: createSegmentContext({
          segmentId: "segment-shared",
          segmentName: "Beta Bridge"
        }),
        updatedAt: "2026-06-21T12:00:00.000Z"
      }),
      createSheetSession({
        id: "missing-segment",
        sheetId: "sheet-alpha",
        segmentContext: createSegmentContext({
          segmentId: "segment-missing",
          segmentName: "Deleted Snapshot"
        }),
        updatedAt: "2026-06-21T11:00:00.000Z"
      })
    ];
    const targets: SessionHistoryTargetResolution = {
      sheets: {
        "sheet-alpha": {
          state: "valid",
          value: {
            name: "Alpha Etude"
          }
        },
        "sheet-beta": {
          state: "valid",
          value: {
            name: "Beta Study"
          }
        }
      },
      segments: {
        [createSessionHistorySegmentTargetKey("sheet-alpha", "segment-shared")]: {
          state: "valid",
          value: {
            name: "Live Renamed Bridge"
          }
        },
        [createSessionHistorySegmentTargetKey("sheet-beta", "segment-shared")]: {
          state: "valid",
          value: {
            name: "Live Beta Bridge"
          }
        },
        [createSessionHistorySegmentTargetKey("sheet-alpha", "segment-missing")]: {
          state: "missing"
        }
      }
    };

    const groups = groupPracticeSessionsByHistory(sessions, "segment", targets);

    expect(groups.map((group) => [group.id, group.targetState, group.label])).toEqual([
      ["segment:quick", "quick", "Quick Practice"],
      ["segment:sheet:sheet-alpha:none", "no-segment", "Alpha Etude - No segment"],
      ["segment:sheet:sheet-alpha:id:segment-shared", "valid", "Historical Bridge"],
      ["segment:sheet:sheet-beta:id:segment-shared", "valid", "Beta Bridge"],
      ["segment:sheet:sheet-alpha:id:segment-missing", "missing-segment", "Deleted Snapshot"]
    ]);
    expect(groups[2]).toMatchObject({
      sheetId: "sheet-alpha",
      sheetName: "Alpha Etude",
      segmentId: "segment-shared",
      segmentName: "Historical Bridge"
    });
  });

  it("sorts sessions in each group newest first with deterministic id tie-breakers", () => {
    const groups = groupPracticeSessionsByHistory(
      [
        createSheetSession({
          id: "same-time-b",
          updatedAt: "2026-06-21T12:00:00.000Z"
        }),
        createSheetSession({
          id: "older",
          updatedAt: "2026-06-21T11:00:00.000Z"
        }),
        createSheetSession({
          id: "same-time-a",
          updatedAt: "2026-06-21T12:00:00.000Z"
        })
      ],
      "sheet"
    );

    expect(groups).toHaveLength(1);
    expect(groups[0].sessions.map((session) => session.id)).toEqual([
      "same-time-a",
      "same-time-b",
      "older"
    ]);
  });
});
