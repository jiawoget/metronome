import { describe, expect, it } from "vitest";

import {
  createSessionHistorySegmentTargetKey,
  selectHomeRecentActivity,
  type HomeRecentActivityTargetResolution,
  type PracticeSession,
  type SheetRecordingMetadata,
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
    id: "quick-session",
    sourceType: "quick",
    sheetId: null,
    startedAt: "2026-06-21T12:00:00.000Z",
    endedAt: null,
    durationMs: 60_000,
    bpm: 120,
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
    bpm: 96,
    ...overrides
  });
}

function createRecording(
  overrides: Partial<SheetRecordingMetadata> = {}
): SheetRecordingMetadata {
  return {
    id: "recording-alpha",
    type: "sheet",
    sessionId: "sheet-session",
    sheetId: "sheet-alpha",
    sheetName: "Alpha Sheet Snapshot",
    createdAt: "2026-06-21T12:02:00.000Z",
    durationMs: 12_000,
    bpm: 96,
    timeSignature: "4/4",
    segmentContext: null,
    ...overrides
  };
}

const targets: HomeRecentActivityTargetResolution = {
  sheets: {
    "sheet-alpha": {
      state: "valid",
      value: {
        name: "Alpha Sheet"
      }
    },
    "sheet-beta": {
      state: "valid",
      value: {
        name: "Beta Sheet"
      }
    },
    "sheet-deleted": {
      state: "missing"
    },
    "sheet-failed": {
      state: "lookup-failed"
    }
  },
  segments: {
    [createSessionHistorySegmentTargetKey("sheet-alpha", "segment-alpha")]: {
      state: "valid",
      value: {
        name: "Live Bridge"
      }
    },
    [createSessionHistorySegmentTargetKey("sheet-alpha", "segment-missing")]: {
      state: "missing"
    },
    [createSessionHistorySegmentTargetKey("sheet-alpha", "segment-failed")]: {
      state: "lookup-failed"
    },
    [createSessionHistorySegmentTargetKey("sheet-alpha", "segment-shared")]: {
      state: "valid",
      value: {
        name: "Live Shared Alpha"
      }
    },
    [createSessionHistorySegmentTargetKey("sheet-beta", "segment-shared")]: {
      state: "valid",
      value: {
        name: "Live Shared Beta"
      }
    }
  }
};

describe("home recent activity source", () => {
  it("returns an empty bounded result for empty local activity", () => {
    expect(
      selectHomeRecentActivity({
        sessions: [],
        recordings: [],
        generatedAt: "2026-06-21T12:00:00.000Z"
      })
    ).toEqual({
      items: [],
      generatedAt: "2026-06-21T12:00:00.000Z",
      limit: 8
    });
  });

  it("maps quick, sheet, recording, and segment sources into flat recent rows", () => {
    const segmentContext = createSegmentContext({
      segmentName: "Historical Bridge"
    });
    const result = selectHomeRecentActivity({
      sessions: [
        createSession({
          id: "quick-session",
          updatedAt: "2026-06-21T12:05:00.000Z"
        }),
        createSheetSession({
          id: "sheet-session",
          updatedAt: "2026-06-21T12:04:00.000Z",
          durationMs: 30_000,
          recordingCount: 0
        }),
        createSheetSession({
          id: "segment-session",
          updatedAt: "2026-06-21T12:03:00.000Z",
          durationMs: 90_000,
          recordingCount: 2,
          segmentContext
        })
      ],
      recordings: [
        createRecording({
          id: "sheet-recording",
          createdAt: "2026-06-21T12:02:00.000Z",
          durationMs: 45_000
        }),
        createRecording({
          id: "segment-recording",
          createdAt: "2026-06-21T12:01:00.000Z",
          durationMs: 20_000,
          segmentContext
        })
      ],
      targets,
      generatedAt: "2026-06-21T12:06:00.000Z"
    });

    expect(result.items.map((item) => [item.id, item.kind, item.targetState, item.label])).toEqual([
      ["session:quick-session", "quick-session", "quick", "Quick Practice"],
      ["session:sheet-session", "sheet-session", "valid", "Alpha Sheet"],
      ["session:segment-session", "segment-session", "valid", "Historical Bridge"],
      ["recording:sheet-recording", "sheet-recording", "valid", "Alpha Sheet"],
      ["recording:segment-recording", "segment-recording", "valid", "Historical Bridge"]
    ]);
    expect(result.items[2]).toMatchObject({
      sheetId: "sheet-alpha",
      sheetName: "Alpha Sheet",
      segmentId: "segment-alpha",
      segmentName: "Historical Bridge",
      metadata: expect.arrayContaining(["1m 30s", "2 recordings", "m5-12"])
    });
  });

  it("keeps malformed quick sessions with sheet ids disabled and targetless", () => {
    const result = selectHomeRecentActivity({
      sessions: [
        createSession({
          id: "quick-with-sheet",
          sheetId: "sheet-alpha"
        })
      ],
      recordings: [],
      targets,
      generatedAt: "2026-06-21T12:08:00.000Z"
    });

    expect(result.items).toEqual([
      expect.objectContaining({
        id: "session:quick-with-sheet",
        kind: "quick-session",
        targetState: "no-target",
        label: "Quick Practice",
        sheetId: null,
        sheetName: null,
        segmentId: null,
        segmentName: null,
        disabledReason: "No target is available for this local activity."
      })
    ]);
  });

  it("keeps malformed quick sessions with segment context disabled and not segment activity", () => {
    const result = selectHomeRecentActivity({
      sessions: [
        createSession({
          id: "quick-with-segment",
          segmentContext: createSegmentContext()
        })
      ],
      recordings: [],
      targets,
      generatedAt: "2026-06-21T12:08:00.000Z"
    });
    const item = result.items[0];

    expect(item).toMatchObject({
      id: "session:quick-with-segment",
      kind: "quick-session",
      targetState: "no-target",
      sheetId: null,
      segmentId: null,
      segmentName: null
    });
    expect(item.metadata).not.toContain("m5-12");
  });

  it("applies explicit target-state priority for no-target, missing, and lookup-failed rows", () => {
    const result = selectHomeRecentActivity({
      sessions: [
        createSheetSession({
          id: "blank-sheet",
          sheetId: "",
          updatedAt: "2026-06-21T12:07:00.000Z"
        }),
        createSheetSession({
          id: "blank-segment",
          updatedAt: "2026-06-21T12:06:00.000Z",
          segmentContext: createSegmentContext({ segmentId: "" })
        }),
        createSheetSession({
          id: "failed-sheet",
          sheetId: "sheet-failed",
          updatedAt: "2026-06-21T12:05:00.000Z"
        }),
        createSheetSession({
          id: "deleted-sheet",
          sheetId: "sheet-deleted",
          updatedAt: "2026-06-21T12:04:00.000Z"
        })
      ],
      recordings: [
        createRecording({
          id: "blank-recording-sheet",
          sheetId: "",
          createdAt: "2026-06-21T12:03:00.000Z"
        }),
        createRecording({
          id: "failed-segment",
          createdAt: "2026-06-21T12:02:00.000Z",
          segmentContext: createSegmentContext({
            segmentId: "segment-failed",
            segmentName: "Failed Segment"
          })
        }),
        createRecording({
          id: "missing-segment",
          createdAt: "2026-06-21T12:01:00.000Z",
          segmentContext: createSegmentContext({
            segmentId: "segment-missing",
            segmentName: "Deleted Segment"
          })
        })
      ],
      targets,
      generatedAt: "2026-06-21T12:08:00.000Z"
    });
    const statesById = Object.fromEntries(
      result.items.map((item) => [item.id, item.targetState])
    );

    expect(statesById).toMatchObject({
      "session:blank-sheet": "no-target",
      "session:blank-segment": "no-target",
      "session:failed-sheet": "lookup-failed",
      "session:deleted-sheet": "missing-sheet",
      "recording:blank-recording-sheet": "no-target",
      "recording:failed-segment": "lookup-failed",
      "recording:missing-segment": "missing-segment"
    });
    expect(result.items.find((item) => item.id === "session:blank-sheet")).toMatchObject({
      kind: "sheet-session",
      label: "Sheet practice",
      disabledReason: "No target is available for this local activity."
    });
  });

  it("orders newest first, applies deterministic tie-breakers, and sorts invalid timestamps last", () => {
    const result = selectHomeRecentActivity({
      sessions: [
        createSession({
          id: "quick-same-time",
          updatedAt: "2026-06-21T12:00:00.000Z"
        }),
        createSheetSession({
          id: "invalid-time",
          updatedAt: "not-a-date"
        } as Partial<PracticeSession>)
      ],
      recordings: [
        createRecording({
          id: "newest-recording",
          createdAt: "2026-06-21T12:01:00.000Z"
        }),
        createRecording({
          id: "recording-same-time",
          createdAt: "2026-06-21T12:00:00.000Z"
        })
      ],
      targets,
      generatedAt: "2026-06-21T12:02:00.000Z"
    });
    const limited = selectHomeRecentActivity({
      sessions: result.items
        .filter((item) => item.kind.endsWith("session"))
        .map((item) => createSession({ id: item.sessionId ?? "missing" })),
      recordings: [
        createRecording({
          id: "newest-recording",
          createdAt: "2026-06-21T12:01:00.000Z"
        }),
        createRecording({
          id: "recording-same-time",
          createdAt: "2026-06-21T12:00:00.000Z"
        })
      ],
      targets,
      generatedAt: "2026-06-21T12:02:00.000Z",
      limit: 2
    });

    expect(result.items.map((item) => item.id)).toEqual([
      "recording:newest-recording",
      "recording:recording-same-time",
      "session:quick-same-time",
      "session:invalid-time"
    ]);
    expect(result.items.at(-1)).toMatchObject({
      id: "session:invalid-time",
      sortTimestamp: null
    });
    expect(limited.items).toHaveLength(2);
    expect(limited.limit).toBe(2);
  });

  it("uses persisted duration fields only and sanitizes malformed duration metadata", () => {
    const result = selectHomeRecentActivity({
      sessions: [
        createSession({
          id: "persisted-duration",
          startedAt: "2026-06-21T12:00:00.000Z",
          updatedAt: "2026-06-21T12:10:00.000Z",
          durationMs: 5_000
        }),
        createSheetSession({
          id: "bad-session-duration",
          durationMs: Number.POSITIVE_INFINITY
        } as Partial<PracticeSession>)
      ],
      recordings: [
        createRecording({
          id: "bad-recording-duration",
          durationMs: Number.NaN
        } as Partial<SheetRecordingMetadata>)
      ],
      targets,
      generatedAt: "2026-06-21T12:11:00.000Z"
    });
    const byId = new Map(result.items.map((item) => [item.id, item]));

    expect(byId.get("session:persisted-duration")).toMatchObject({
      durationMs: 5_000,
      metadata: expect.arrayContaining(["5s"])
    });
    expect(byId.get("session:persisted-duration")?.durationMs).not.toBe(600_000);
    expect(byId.get("session:bad-session-duration")).toMatchObject({
      durationMs: null
    });
    expect(byId.get("recording:bad-recording-duration")).toMatchObject({
      durationMs: null
    });
    expect(byId.get("recording:bad-recording-duration")?.metadata.join(" ")).not.toContain("NaN");
  });

  it("dedupes source identities and upgrades segment context without parallel sheet rows", () => {
    const segmentContext = createSegmentContext({
      segmentName: "Segment Snapshot"
    });
    const result = selectHomeRecentActivity({
      sessions: [
        createSheetSession({
          id: "same-session",
          segmentContext
        }),
        createSheetSession({
          id: "same-session",
          segmentContext
        })
      ],
      recordings: [
        createRecording({
          id: "same-recording",
          segmentContext
        }),
        createRecording({
          id: "same-recording",
          segmentContext
        })
      ],
      targets,
      generatedAt: "2026-06-21T12:00:00.000Z"
    });

    expect(result.items.map((item) => [item.id, item.kind])).toEqual([
      ["recording:same-recording", "segment-recording"],
      ["session:same-session", "segment-session"]
    ]);
  });

  it("keeps the same segment id under different sheets distinct", () => {
    const result = selectHomeRecentActivity({
      sessions: [
        createSheetSession({
          id: "alpha-shared",
          sheetId: "sheet-alpha",
          segmentContext: createSegmentContext({
            segmentId: "segment-shared",
            segmentName: "Alpha Shared"
          })
        }),
        createSheetSession({
          id: "beta-shared",
          sheetId: "sheet-beta",
          segmentContext: createSegmentContext({
            segmentId: "segment-shared",
            segmentName: "Beta Shared"
          })
        })
      ],
      recordings: [],
      targets,
      generatedAt: "2026-06-21T12:00:00.000Z"
    });

    expect(result.items.map((item) => [item.id, item.sheetId, item.segmentId, item.targetState])).toEqual([
      ["session:alpha-shared", "sheet-alpha", "segment-shared", "valid"],
      ["session:beta-shared", "sheet-beta", "segment-shared", "valid"]
    ]);
  });
});
