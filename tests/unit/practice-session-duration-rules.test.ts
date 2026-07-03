import { describe, expect, it } from "vitest";

import {
  calculatePracticeDurationMs,
  evaluatePracticeGoalCompletion,
  getHomeDashboardAnalyticsSource,
  getHomePracticeStreaks,
  getLibraryRecentPracticeSummaryBySheet,
  getTodayPracticeSummary,
  groupPracticeSessionsByHistory,
  withUpdatedPracticeSessionDuration,
  type LocalPracticeGoal,
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

function createRecording(overrides: Partial<SheetRecordingMetadata> = {}): SheetRecordingMetadata {
  return {
    id: "recording-alpha",
    type: "sheet",
    sessionId: "session-alpha",
    sheetId: "sheet-alpha",
    sheetName: "Alpha Sheet",
    createdAt: "2026-06-21T12:02:00.000Z",
    durationMs: 12_000,
    bpm: 96,
    timeSignature: "4/4",
    segmentContext: null,
    ...overrides
  };
}

function createGoal(overrides: Partial<LocalPracticeGoal> = {}): LocalPracticeGoal {
  return {
    id: "goal-alpha",
    kind: "minutes",
    target: 1,
    period: "today",
    createdAt: "2026-06-21T08:00:00.000Z",
    ...overrides
  };
}

function localIso(
  year: number,
  monthIndex: number,
  day: number,
  hour = 12,
  minute = 0
) {
  return new Date(year, monthIndex, day, hour, minute, 0).toISOString();
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

  it("derives Home dashboard analytics from persisted sessions and sheet recording metadata", () => {
    const analytics = getHomeDashboardAnalyticsSource({
      generatedAt: "2026-06-21T15:00:00.000Z",
      now: new Date("2026-06-21T15:00:00.000Z"),
      sessions: [
        createSession({
          id: "today-quick",
          sourceType: "quick",
          sheetId: null,
          durationMs: 60_000,
          recordingCount: 3
        }),
        createSession({
          id: "today-sheet",
          sourceType: "sheet",
          sheetId: " sheet-alpha ",
          durationMs: 30_000,
          recordingCount: 10,
          segmentContext: createSegmentContext({
            segmentId: " "
          })
        } as PracticeSession),
        createSession({
          id: "old-segment-session",
          sourceType: "sheet",
          sheetId: "sheet-beta",
          startedAt: "2026-06-20T12:00:00.000Z",
          durationMs: 120_000,
          recordingCount: 2,
          segmentContext: createSegmentContext({
            segmentId: "segment-beta"
          })
        })
      ],
      recordings: [
        createRecording({
          id: "take-alpha",
          sheetId: "sheet-alpha"
        }),
        createRecording({
          id: "take-bravo",
          sheetId: " sheet-bravo "
        } as SheetRecordingMetadata),
        createRecording({
          id: "take-without-sheet-id",
          sheetId: " "
        } as SheetRecordingMetadata)
      ]
    });

    expect(analytics).toEqual({
      generatedAt: "2026-06-21T15:00:00.000Z",
      summary: {
        durationMs: 90_000,
        minutesToday: 2,
        sessionsToday: 2,
        recordingsToday: 13
      },
      totals: {
        durationMs: 210_000,
        sessions: 3,
        sheetTakes: 3,
        practicedSheets: 3,
        segmentSessions: 1
      },
      emptyState: {
        hasPracticeHistory: true,
        hasSheetPractice: true,
        hasSegmentPractice: true,
        hasRecordings: true,
        hasGoals: false
      }
    });
  });

  it("returns honest empty Home dashboard analytics", () => {
    expect(
      getHomeDashboardAnalyticsSource({
        generatedAt: "2026-06-21T15:00:00.000Z",
        now: new Date("2026-06-21T15:00:00.000Z"),
        sessions: [],
        recordings: []
      })
    ).toEqual({
      generatedAt: "2026-06-21T15:00:00.000Z",
      summary: {
        durationMs: 0,
        minutesToday: 0,
        sessionsToday: 0,
        recordingsToday: 0
      },
      totals: {
        durationMs: 0,
        sessions: 0,
        sheetTakes: 0,
        practicedSheets: 0,
        segmentSessions: 0
      },
      emptyState: {
        hasPracticeHistory: false,
        hasSheetPractice: false,
        hasSegmentPractice: false,
        hasRecordings: false,
        hasGoals: false
      }
    });
  });

  it("derives recent library practice summaries by sheet from sessions and metadata", () => {
    const summaries = getLibraryRecentPracticeSummaryBySheet({
      generatedAt: "2026-06-21T15:00:00.000Z",
      limit: 10,
      sessions: [
        createSession({
          id: "quick-session",
          sourceType: "quick",
          sheetId: null,
          updatedAt: "2026-06-21T12:10:00.000Z",
          durationMs: 999_999
        }),
        createSession({
          id: "alpha-session",
          sourceType: "sheet",
          sheetId: " sheet-alpha ",
          updatedAt: "2026-06-21T12:01:00.000Z",
          durationMs: 60_000,
          latestRecordingId: "alpha-session-recording",
          segmentContext: createSegmentContext()
        }),
        createSession({
          id: "alpha-bad-duration",
          sourceType: "sheet",
          sheetId: "sheet-alpha",
          updatedAt: "not-a-date",
          durationMs: Number.NaN,
          latestRecordingId: "ignored-invalid-time-recording"
        }),
        createSession({
          id: "beta-session",
          sourceType: "sheet",
          sheetId: "sheet-beta",
          startedAt: "2026-06-21T11:50:00.000Z",
          updatedAt: "not-a-date",
          durationMs: -1,
          latestRecordingId: "beta-session-recording"
        }),
        createSession({
          id: "blank-sheet",
          sourceType: "sheet",
          sheetId: " "
        } as PracticeSession)
      ],
      recordings: [
        createRecording({
          id: "alpha-recording",
          sheetId: "sheet-alpha",
          createdAt: "2026-06-21T12:03:00.000Z",
          segmentContext: createSegmentContext({ segmentId: "segment-recording" })
        }),
        createRecording({
          id: "alpha-invalid-time-recording",
          sheetId: "sheet-alpha",
          createdAt: "not-a-date"
        }),
        createRecording({
          id: "gamma-recording",
          sheetId: "sheet-gamma",
          createdAt: "2026-06-21T12:04:00.000Z"
        }),
        createRecording({
          id: "blank-sheet-recording",
          sheetId: " "
        } as SheetRecordingMetadata)
      ]
    });

    expect(summaries).toEqual({
      generatedAt: "2026-06-21T15:00:00.000Z",
      limit: 10,
      items: [
        {
          sheetId: "sheet-gamma",
          lastPracticedAt: "2026-06-21T12:04:00.000Z",
          lastSessionId: null,
          latestRecordingId: "gamma-recording",
          sessionCount: 0,
          recordingCount: 1,
          durationMs: 0,
          segmentPracticeCount: 0
        },
        {
          sheetId: "sheet-alpha",
          lastPracticedAt: "2026-06-21T12:03:00.000Z",
          lastSessionId: "alpha-session",
          latestRecordingId: "alpha-recording",
          sessionCount: 2,
          recordingCount: 2,
          durationMs: 60_000,
          segmentPracticeCount: 2
        },
        {
          sheetId: "sheet-beta",
          lastPracticedAt: "2026-06-21T11:50:00.000Z",
          lastSessionId: "beta-session",
          latestRecordingId: "beta-session-recording",
          sessionCount: 1,
          recordingCount: 0,
          durationMs: 0,
          segmentPracticeCount: 0
        }
      ]
    });
  });

  it("keeps library summary limits deterministic and does not mutate inputs", () => {
    const sessions = [
      createSession({
        id: "bravo",
        sourceType: "sheet",
        sheetId: "sheet-bravo",
        updatedAt: "2026-06-21T12:00:00.000Z"
      }),
      createSession({
        id: "alpha",
        sourceType: "sheet",
        sheetId: "sheet-alpha",
        updatedAt: "2026-06-21T12:00:00.000Z"
      })
    ];
    const originalSessions = structuredClone(sessions);

    expect(
      getLibraryRecentPracticeSummaryBySheet({
        generatedAt: "2026-06-21T15:00:00.000Z",
        sessions,
        recordings: [],
        limit: 1
      })
    ).toMatchObject({
      limit: 1,
      items: [
        {
          sheetId: "sheet-alpha"
        }
      ]
    });
    expect(
      getLibraryRecentPracticeSummaryBySheet({
        generatedAt: "2026-06-21T15:00:00.000Z",
        sessions,
        recordings: [],
        limit: 0
      })
    ).toMatchObject({
      limit: 0,
      items: []
    });
    expect(sessions).toEqual(originalSessions);
  });

  it("returns an empty library summary source with the default limit", () => {
    expect(
      getLibraryRecentPracticeSummaryBySheet({
        generatedAt: "2026-06-21T15:00:00.000Z",
        sessions: [],
        recordings: []
      })
    ).toEqual({
      generatedAt: "2026-06-21T15:00:00.000Z",
      limit: 20,
      items: []
    });
  });

  it("derives honest empty Home practice streaks from no valid local practice days", () => {
    expect(
      getHomePracticeStreaks({
        generatedAt: "2026-06-21T15:00:00.000Z",
        now: new Date(2026, 5, 21, 15, 0, 0),
        sessions: [
          createSession({
            id: "invalid-started-at",
            startedAt: "not-a-date"
          })
        ]
      })
    ).toEqual({
      generatedAt: "2026-06-21T15:00:00.000Z",
      currentStreakDays: 0,
      longestStreakDays: 0,
      practicedToday: false,
      lastPracticedLocalDay: null,
      emptyState: {
        hasPracticeHistory: false
      }
    });
  });

  it("counts duplicate sessions on one local day once and keeps a streak through today", () => {
    const now = new Date(2026, 5, 21, 15, 0, 0);
    const streaks = getHomePracticeStreaks({
      generatedAt: "2026-06-21T15:00:00.000Z",
      now,
      sessions: [
        createSession({
          id: "today-late",
          sourceType: "sheet",
          sheetId: "sheet-alpha",
          startedAt: localIso(2026, 5, 21, 23, 30),
          durationMs: 0,
          recordingCount: 99,
          segmentContext: createSegmentContext()
        }),
        createSession({
          id: "today-early",
          sourceType: "quick",
          sheetId: null,
          startedAt: localIso(2026, 5, 21, 0, 30),
          durationMs: 9_999_999,
          recordingCount: 0,
          segmentContext: null
        }),
        createSession({
          id: "yesterday",
          startedAt: localIso(2026, 5, 20, 12, 0)
        }),
        createSession({
          id: "two-days-ago",
          startedAt: localIso(2026, 5, 19, 12, 0)
        })
      ]
    });

    expect(streaks).toMatchObject({
      currentStreakDays: 3,
      longestStreakDays: 3,
      practicedToday: true,
      lastPracticedLocalDay: "2026-06-21",
      emptyState: {
        hasPracticeHistory: true
      }
    });
  });

  it("keeps current streak through yesterday before today's practice", () => {
    expect(
      getHomePracticeStreaks({
        generatedAt: "2026-06-21T15:00:00.000Z",
        now: new Date(2026, 5, 21, 15, 0, 0),
        sessions: [
          createSession({
            id: "yesterday",
            startedAt: localIso(2026, 5, 20)
          }),
          createSession({
            id: "two-days-ago",
            startedAt: localIso(2026, 5, 19)
          })
        ]
      })
    ).toMatchObject({
      currentStreakDays: 2,
      longestStreakDays: 2,
      practicedToday: false,
      lastPracticedLocalDay: "2026-06-20"
    });
  });

  it("returns zero current streak when today and yesterday are both unpracticed", () => {
    expect(
      getHomePracticeStreaks({
        generatedAt: "2026-06-21T15:00:00.000Z",
        now: new Date(2026, 5, 21, 15, 0, 0),
        sessions: [
          createSession({
            id: "older-practice",
            startedAt: localIso(2026, 5, 18)
          })
        ]
      })
    ).toMatchObject({
      currentStreakDays: 0,
      longestStreakDays: 1,
      practicedToday: false,
      lastPracticedLocalDay: "2026-06-18"
    });
  });

  it("preserves the longest streak when the current streak is shorter", () => {
    expect(
      getHomePracticeStreaks({
        generatedAt: "2026-06-21T15:00:00.000Z",
        now: new Date(2026, 5, 21, 15, 0, 0),
        sessions: [
          createSession({ id: "today", startedAt: localIso(2026, 5, 21) }),
          createSession({ id: "old-one", startedAt: localIso(2026, 5, 17) }),
          createSession({ id: "old-two", startedAt: localIso(2026, 5, 16) }),
          createSession({ id: "old-three", startedAt: localIso(2026, 5, 15) })
        ]
      })
    ).toMatchObject({
      currentStreakDays: 1,
      longestStreakDays: 3,
      practicedToday: true,
      lastPracticedLocalDay: "2026-06-21"
    });
  });

  it("computes streaks consistently from unordered local-day input near midnight", () => {
    const unorderedSessions = [
      createSession({
        id: "today-late",
        startedAt: localIso(2026, 5, 21, 23, 59)
      }),
      createSession({
        id: "older",
        startedAt: localIso(2026, 5, 17, 0, 1)
      }),
      createSession({
        id: "yesterday-early",
        startedAt: localIso(2026, 5, 20, 0, 1)
      }),
      createSession({
        id: "two-days-ago",
        startedAt: localIso(2026, 5, 19, 23, 59)
      })
    ];
    const sortedSessions = [...unorderedSessions].sort((first, second) =>
      first.startedAt.localeCompare(second.startedAt)
    );

    const unordered = getHomePracticeStreaks({
      generatedAt: "2026-06-21T15:00:00.000Z",
      now: new Date(2026, 5, 21, 15, 0, 0),
      sessions: unorderedSessions
    });
    const sorted = getHomePracticeStreaks({
      generatedAt: "2026-06-21T15:00:00.000Z",
      now: new Date(2026, 5, 21, 15, 0, 0),
      sessions: sortedSessions
    });

    expect(unordered).toEqual(sorted);
    expect(unordered).toMatchObject({
      currentStreakDays: 3,
      longestStreakDays: 3,
      lastPracticedLocalDay: "2026-06-21"
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

  it("evaluates minutes goals from raw persisted durationMs boundaries", () => {
    const now = new Date("2026-06-21T15:00:00.000Z");
    const evaluateMinutes = (durationMs: number, target: number) =>
      evaluatePracticeGoalCompletion({
        goals: [createGoal({ target })],
        sessions: [createSession({ durationMs })],
        recordings: [],
        now
      })[0];
    const underOneMinute = evaluateMinutes(59_900, 1);
    const atOneMinute = evaluateMinutes(60_000, 1);
    const underTwoMinutes = evaluateMinutes(119_900, 2);

    expect(underOneMinute).toEqual(
      expect.objectContaining({
        status: "in-progress",
        progress: 0,
        target: 1,
        completedAt: null
      })
    );
    expect(atOneMinute).toEqual(
      expect.objectContaining({
        status: "completed",
        progress: 1,
        target: 1,
        progressRatio: 1,
        completedAt: now.toISOString()
      })
    );
    expect(underTwoMinutes).toEqual(
      expect.objectContaining({
        status: "in-progress",
        progress: 1,
        target: 2,
        completedAt: null
      })
    );
    expect(underOneMinute.progressRatio).toBeCloseTo(59_900 / 60_000);
    expect(underTwoMinutes.progressRatio).toBeCloseTo(119_900 / 120_000);
  });

  it("evaluates sessions and takes from existing activity rows without recordingCount fallback", () => {
    const evaluations = evaluatePracticeGoalCompletion({
      goals: [
        createGoal({
          id: "sessions-goal",
          kind: "sessions",
          target: 2,
          period: "today"
        }),
        createGoal({
          id: "takes-goal",
          kind: "takes",
          target: 2,
          period: "today"
        })
      ],
      sessions: [
        createSession({
          id: "quick-session",
          sourceType: "quick",
          recordingCount: 10
        }),
        createSession({
          id: "sheet-session",
          sourceType: "sheet",
          sheetId: "sheet-alpha",
          recordingCount: 0
        }),
        createSession({
          id: "other-day-session",
          startedAt: "2026-06-20T12:00:00.000Z",
          recordingCount: 10
        })
      ],
      recordings: [
        createRecording({ id: "recording-one" }),
        createRecording({ id: "recording-two" }),
        createRecording({
          id: "old-recording",
          createdAt: "2026-06-20T12:00:00.000Z"
        })
      ],
      now: new Date("2026-06-21T15:00:00.000Z")
    });

    expect(evaluations).toEqual([
      expect.objectContaining({
        goalId: "sessions-goal",
        kind: "sessions",
        status: "completed",
        progress: 2,
        target: 2
      }),
      expect.objectContaining({
        goalId: "takes-goal",
        kind: "takes",
        status: "completed",
        progress: 2,
        target: 2
      })
    ]);
  });

  it("normalizes goal status and invalid goal definitions without mutating inputs", () => {
    const now = new Date("2026-06-21T15:00:00.000Z");
    const goals = [
      createGoal({
        id: "completed-still-complete",
        target: 1,
        status: "completed",
        completedAt: "2026-06-21T12:30:00.000Z"
      }),
      createGoal({
        id: "completed-cleared-data",
        target: 2,
        status: "completed",
        completedAt: "2026-06-21T12:30:00.000Z"
      }),
      createGoal({
        id: "explicit-invalid",
        status: "invalid"
      }),
      createGoal({
        id: "unknown-status",
        status: "paused" as unknown as LocalPracticeGoal["status"]
      }),
      createGoal({
        id: "",
        target: Number.NaN
      }),
      {
        ...createGoal({ id: "unknown-kind" }),
        kind: "streaks"
      } as unknown as LocalPracticeGoal
    ];
    const originalGoals = structuredClone(goals);
    const sessions = [
      createSession({
        id: "one-minute",
        durationMs: 60_000
      })
    ];
    const originalSessions = structuredClone(sessions);

    const evaluations = evaluatePracticeGoalCompletion({
      goals,
      sessions,
      recordings: [],
      now
    });

    expect(evaluations).toEqual([
      expect.objectContaining({
        goalId: "completed-still-complete",
        status: "completed",
        completedAt: "2026-06-21T12:30:00.000Z"
      }),
      expect.objectContaining({
        goalId: "completed-cleared-data",
        status: "in-progress",
        progress: 1,
        completedAt: null
      }),
      expect.objectContaining({
        goalId: "explicit-invalid",
        status: "invalid",
        reason: "goal-status-invalid"
      }),
      expect.objectContaining({
        goalId: "unknown-status",
        status: "invalid",
        reason: "unknown-goal-status"
      }),
      expect.objectContaining({
        goalId: "",
        status: "invalid",
        reason: "missing-goal-id"
      }),
      expect.objectContaining({
        goalId: "unknown-kind",
        kind: null,
        status: "invalid",
        reason: "unsupported-goal-kind"
      })
    ]);
    expect(goals).toEqual(originalGoals);
    expect(sessions).toEqual(originalSessions);
  });

  it("rejects invalid goal target, period, and createdAt variants", () => {
    const evaluations = evaluatePracticeGoalCompletion({
      goals: [
        createGoal({
          id: "zero-target",
          target: 0
        }),
        createGoal({
          id: "negative-target",
          target: -1
        }),
        createGoal({
          id: "fractional-target",
          target: 1.5
        }),
        createGoal({
          id: "infinite-target",
          target: Infinity
        }),
        createGoal({
          id: "invalid-period",
          period: "weekly" as LocalPracticeGoal["period"]
        }),
        createGoal({
          id: "invalid-created-at",
          createdAt: "not-a-date"
        })
      ],
      sessions: [createSession()],
      recordings: [],
      now: new Date("2026-06-21T15:00:00.000Z")
    });

    expect(evaluations).toEqual([
      expect.objectContaining({
        goalId: "zero-target",
        status: "invalid",
        reason: "invalid-goal-target"
      }),
      expect.objectContaining({
        goalId: "negative-target",
        status: "invalid",
        reason: "invalid-goal-target"
      }),
      expect.objectContaining({
        goalId: "fractional-target",
        status: "invalid",
        reason: "invalid-goal-target"
      }),
      expect.objectContaining({
        goalId: "infinite-target",
        status: "invalid",
        reason: "invalid-goal-target"
      }),
      expect.objectContaining({
        goalId: "invalid-period",
        status: "invalid",
        reason: "invalid-goal-period"
      }),
      expect.objectContaining({
        goalId: "invalid-created-at",
        status: "invalid",
        reason: "invalid-goal-created-at"
      })
    ]);
  });
});
