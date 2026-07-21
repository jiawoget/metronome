import { describe, expect, it } from "vitest";

import {
  createSessionHistorySegmentTargetKey,
  getSessionComparison,
  type PracticeSession,
  type SessionComparisonMetric,
  type SessionComparisonTargetResolution,
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

function createRecording(
  overrides: Partial<SheetRecordingMetadata> = {}
): SheetRecordingMetadata {
  return {
    id: "recording-alpha",
    type: "sheet",
    sessionId: "session-alpha",
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

function createTargets(): SessionComparisonTargetResolution {
  return {
    sheets: {
      "sheet-alpha": {
        state: "valid",
        value: {
          name: "Alpha Etude"
        }
      }
    },
    segments: {
      [createSessionHistorySegmentTargetKey("sheet-alpha", "segment-alpha")]: {
        state: "valid",
        value: {
          name: "Bridge"
        }
      }
    }
  };
}

function getMetric(metrics: SessionComparisonMetric[], key: string) {
  const metric = metrics.find((candidateMetric) => candidateMetric.key === key);

  if (!metric) {
    throw new Error(`Missing metric: ${key}`);
  }

  return metric;
}

describe("session comparison read model", () => {
  it("returns empty candidates with honest unavailable metadata states", () => {
    const result = getSessionComparison({
      sessions: [],
      recordings: [],
      generatedAt: "2026-06-21T12:00:00.000Z"
    });

    expect(result).toMatchObject({
      generatedAt: "2026-06-21T12:00:00.000Z",
      candidates: [],
      selectedSessionIds: [],
      comparedSessions: [],
      metrics: [],
      limit: 8,
      maxSelected: 3
    });
    expect(result.unavailable).toEqual([
      {
        key: "events",
        label: "Events",
        reason: "Event details are unavailable because no durable session event read source is exposed."
      },
      {
        key: "audio",
        label: "Audio",
        reason: "Audio and waveform comparison are outside this metadata-only read model."
      }
    ]);
  });

  it("sorts bounded candidates newest first with deterministic session id ties", () => {
    const result = getSessionComparison({
      sessions: [
        createSession({
          id: "same-time-b",
          updatedAt: "2026-06-21T12:02:00.000Z"
        }),
        createSession({
          id: "invalid-time",
          updatedAt: "not-a-date",
          startedAt: "also-not-a-date"
        } as Partial<PracticeSession>),
        createSession({
          id: "newest",
          updatedAt: "2026-06-21T12:03:00.000Z"
        }),
        createSession({
          id: "same-time-a",
          updatedAt: "2026-06-21T12:02:00.000Z"
        })
      ],
      recordings: [],
      generatedAt: "2026-06-21T12:00:00.000Z",
      limit: 3
    });

    expect(result.candidates.map((candidate) => candidate.sessionId)).toEqual([
      "newest",
      "same-time-a",
      "same-time-b"
    ]);
    expect(result.limit).toBe(3);
  });

  it("sanitizes selection ids and only compares two or three known sessions", () => {
    const result = getSessionComparison({
      sessions: [
        createSession({ id: "session-a" }),
        createSession({ id: "session-b" }),
        createSession({ id: "session-c" }),
        createSession({ id: "session-d" })
      ],
      recordings: [],
      generatedAt: "2026-06-21T12:00:00.000Z",
      selectedSessionIds: [
        "session-a",
        "missing-session",
        "session-a",
        "session-b",
        "session-c",
        "session-d"
      ]
    });

    expect(result.selectedSessionIds).toEqual(["session-a", "session-b", "session-c"]);
    expect(result.comparedSessions.map((candidate) => candidate.sessionId)).toEqual([
      "session-a",
      "session-b",
      "session-c"
    ]);
    expect(result.metrics.length).toBeGreaterThan(0);

    const oneSelected = getSessionComparison({
      sessions: [createSession({ id: "session-a" })],
      recordings: [],
      generatedAt: "2026-06-21T12:00:00.000Z",
      selectedSessionIds: ["session-a"]
    });

    expect(oneSelected.selectedSessionIds).toEqual(["session-a"]);
    expect(oneSelected.metrics).toEqual([]);
  });

  it("builds display-ready metadata metrics without scoring or recommendation claims", () => {
    const quickSession = createSession({
      id: "quick-session",
      sourceType: "quick",
      sheetId: null,
      durationMs: 65_000,
      recordingCount: 0,
      latestRecordingId: null,
      segmentContext: null
    });
    const sheetSession = createSheetSession({
      id: "sheet-session",
      durationMs: 125_000,
      recordingCount: 2,
      latestRecordingId: "recording-two",
      segmentContext: createSegmentContext()
    });
    const result = getSessionComparison({
      sessions: [quickSession, sheetSession],
      recordings: [
        createRecording({
          id: "recording-one",
          sessionId: "sheet-session",
          durationMs: 30_000
        }),
        createRecording({
          id: "recording-two",
          sessionId: "sheet-session",
          durationMs: 45_000
        }),
        createRecording({
          id: "orphan-recording",
          sessionId: "missing-session"
        })
      ],
      targets: createTargets(),
      generatedAt: "2026-06-21T12:00:00.000Z",
      selectedSessionIds: ["quick-session", "sheet-session"]
    });

    expect(result.candidates).toHaveLength(2);
    expect(result.candidates.find((candidate) => candidate.sessionId === "sheet-session")).toMatchObject({
      label: "Bridge - 2026-06-21 12:01 UTC",
      sheetName: "Alpha Etude",
      segmentName: "Bridge",
      segmentRangeLabel: "m5-12",
      linkedRecordingMetadataCount: 2,
      linkedRecordingDurationMs: 75_000,
      targetState: "valid"
    });
    expect(getMetric(result.metrics, "sessionType").values.map((entry) => entry.text)).toEqual([
      "Quick practice",
      "Sheet practice"
    ]);
    expect(getMetric(result.metrics, "duration").values.map((entry) => entry.text)).toEqual([
      "1m 5s",
      "2m 5s"
    ]);
    expect(getMetric(result.metrics, "recordings").values[1].text).toBe(
      "2 session recordings; 2 linked sheet takes; latest recording-two"
    );
    expect(getMetric(result.metrics, "sheet").values.map((entry) => entry.text)).toEqual([
      "Quick metronome",
      "Alpha Etude"
    ]);
    expect(getMetric(result.metrics, "segment").values.map((entry) => entry.text)).toEqual([
      "Quick metronome",
      "Bridge m5-12"
    ]);
    expect(getMetric(result.metrics, "goalContribution").values[1].text).toBe(
      "Counts as 1 session; adds 2 min; 2 sheet takes linked"
    );
    expect(getMetric(result.metrics, "events").values).toEqual([
      {
        sessionId: "quick-session",
        text: "Event details not available yet",
        tone: "muted"
      },
      {
        sessionId: "sheet-session",
        text: "Event details not available yet",
        tone: "muted"
      }
    ]);

    const renderedWords = JSON.stringify(result).toLowerCase();

    expect(renderedWords).not.toMatch(/\b(score|rank|recommend|better|worse|improved)\b/);
  });

  it("characterizes UTC-minute session-comparison timestamps without changing seconds-scale duration", () => {
    const result = getSessionComparison({
      sessions: [
        createSession({
          id: "offset-time",
          startedAt: "2026-06-21T23:59:59.999-05:00",
          updatedAt: "2026-06-21T23:59:59.999-05:00",
          durationMs: 65_000
        }),
        createSession({
          id: "empty-time",
          startedAt: "",
          updatedAt: "",
          durationMs: 0
        }),
        createSession({
          id: "invalid-time",
          startedAt: "not-a-date",
          updatedAt: "still-not-a-date",
          durationMs: 500
        })
      ],
      recordings: [],
      generatedAt: "2026-06-21T12:00:00.000Z",
      selectedSessionIds: ["offset-time", "empty-time", "invalid-time"]
    });

    expect(result.candidates.find((candidate) => candidate.sessionId === "offset-time")?.label).toBe(
      "Quick practice - 2026-06-22 04:59 UTC"
    );
    expect(result.candidates.find((candidate) => candidate.sessionId === "empty-time")?.label).toBe(
      "Quick practice - Unknown time"
    );
    expect(result.candidates.find((candidate) => candidate.sessionId === "invalid-time")?.label).toBe(
      "Quick practice - Unknown time"
    );
    expect(getMetric(result.metrics, "started").values.map((entry) => entry.text)).toEqual([
      "2026-06-22 04:59 UTC",
      "Unknown time",
      "Unknown time"
    ]);
    expect(getMetric(result.metrics, "updated").values.map((entry) => entry.text)).toEqual([
      "2026-06-22 04:59 UTC",
      "Unknown time",
      "Unknown time"
    ]);
    expect(getMetric(result.metrics, "duration").values.map((entry) => entry.text)).toEqual([
      "1m 5s",
      "0s",
      "<1s"
    ]);
  });

  it("represents missing, failed, and blank sheet or segment targets honestly", () => {
    const targets: SessionComparisonTargetResolution = {
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
      },
      segments: {
        [createSessionHistorySegmentTargetKey("sheet-alpha", "segment-missing")]: {
          state: "missing"
        },
        [createSessionHistorySegmentTargetKey("sheet-alpha", "segment-failed")]: {
          state: "lookup-failed"
        }
      }
    };
    const result = getSessionComparison({
      sessions: [
        createSheetSession({
          id: "deleted-sheet",
          sheetId: "sheet-deleted"
        }),
        createSheetSession({
          id: "failed-sheet",
          sheetId: "sheet-failed"
        }),
        createSheetSession({
          id: "missing-segment",
          segmentContext: createSegmentContext({
            segmentId: "segment-missing",
            segmentName: "Deleted Bridge"
          })
        }),
        createSheetSession({
          id: "failed-segment",
          segmentContext: createSegmentContext({
            segmentId: "segment-failed",
            segmentName: "Failed Bridge"
          })
        }),
        createSheetSession({
          id: "blank-sheet",
          sheetId: " "
        } as Partial<PracticeSession>)
      ],
      recordings: [],
      targets,
      generatedAt: "2026-06-21T12:00:00.000Z",
      selectedSessionIds: ["deleted-sheet", "missing-segment"]
    });
    const statesById = Object.fromEntries(
      result.candidates.map((candidate) => [candidate.sessionId, candidate.targetState])
    );

    expect(statesById).toMatchObject({
      "deleted-sheet": "missing-sheet",
      "failed-sheet": "lookup-failed",
      "missing-segment": "missing-segment",
      "failed-segment": "lookup-failed",
      "blank-sheet": "no-target"
    });
    expect(getMetric(result.metrics, "sheet").values[0]).toEqual({
      sessionId: "deleted-sheet",
      text: "Deleted sheet",
      tone: "warning"
    });
    expect(getMetric(result.metrics, "segment").values[1]).toEqual({
      sessionId: "missing-segment",
      text: "Deleted Bridge m5-12 (missing)",
      tone: "warning"
    });
  });
});
