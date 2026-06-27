import { beforeEach, describe, expect, it } from "vitest";

import type { SheetRecordingSegmentContext } from "@/domain/practice";
import {
  RECORDINGS_STORAGE_KEY,
  recordingHistoryRepository
} from "@/lib/recordings-review/repository";
import { groupRecordingsByTake } from "@/lib/recordings-review/take-groups";
import type { RecordingReviewSnapshot, ReviewRecording } from "@/lib/recordings-review/types";

describe("recordings review take grouping", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns empty collections for an empty input", () => {
    expect(groupRecordingsByTake([])).toEqual({
      takeGroups: [],
      quickRecordings: [],
      ungroupedRecordings: []
    });
  });

  it("preserves quick recordings without misclassifying them as sheet takes", () => {
    const grouping = groupRecordingsByTake([
      createQuickRecording({
        id: "quick-older",
        createdAt: "2026-06-21T09:00:00.000Z"
      }),
      createQuickRecording({
        id: "quick-newer",
        createdAt: "2026-06-21T11:00:00.000Z"
      })
    ]);

    expect(grouping.takeGroups).toEqual([]);
    expect(grouping.quickRecordings.map((recording) => recording.id)).toEqual([
      "quick-newer",
      "quick-older"
    ]);
    expect(grouping.ungroupedRecordings).toEqual([]);
  });

  it("groups sheet recordings by sheet and optional segment while using the latest snapshot fields", () => {
    const grouping = groupRecordingsByTake([
      createSheetRecording({
        id: "sheet-alpha-segment-old",
        sheetId: "sheet-alpha",
        sheetName: "Alpha Etude",
        createdAt: "2026-06-21T09:00:00.000Z",
        segmentContext: createSegmentContext({
          segmentId: "segment-a",
          segmentName: "Verse"
        })
      }),
      createSheetRecording({
        id: "sheet-alpha-segment-new",
        sheetId: "sheet-alpha",
        sheetName: "Alpha Etude Revised",
        createdAt: "2026-06-21T13:00:00.000Z",
        segmentContext: createSegmentContext({
          segmentId: "segment-a",
          segmentName: "Verse 2"
        })
      }),
      createSheetRecording({
        id: "sheet-alpha-none-legacy",
        sheetId: "sheet-alpha",
        sheetName: "Alpha Etude",
        createdAt: "2026-06-21T10:00:00.000Z"
      }),
      createSheetRecording({
        id: "sheet-alpha-none-null",
        sheetId: "sheet-alpha",
        sheetName: "Alpha Etude Latest",
        createdAt: "2026-06-21T12:00:00.000Z",
        segmentContext: null
      }),
      createSheetRecording({
        id: "sheet-beta-segment-a",
        sheetId: "sheet-beta",
        sheetName: "Beta Study",
        createdAt: "2026-06-21T11:00:00.000Z",
        segmentContext: createSegmentContext({
          segmentId: "segment-a",
          segmentName: "Verse"
        })
      }),
      createSheetRecording({
        id: "sheet-alpha-segment-b",
        sheetId: "sheet-alpha",
        sheetName: "Alpha Etude",
        createdAt: "2026-06-21T08:00:00.000Z",
        segmentContext: createSegmentContext({
          segmentId: "segment-b",
          segmentName: "Chorus"
        })
      })
    ]);

    expect(grouping.takeGroups.map((group) => group.groupId)).toEqual([
      "sheet:sheet-alpha:segment:segment-a",
      "sheet:sheet-alpha:segment:none",
      "sheet:sheet-beta:segment:segment-a",
      "sheet:sheet-alpha:segment:segment-b"
    ]);

    expect(grouping.takeGroups[0]).toMatchObject({
      kind: "sheet-segment",
      sheetId: "sheet-alpha",
      sheetName: "Alpha Etude Revised",
      segmentId: "segment-a",
      segmentName: "Verse 2",
      takeCount: 2,
      latestRecordedAt: "2026-06-21T13:00:00.000Z"
    });
    expect(grouping.takeGroups[0].recordings.map((recording) => recording.id)).toEqual([
      "sheet-alpha-segment-new",
      "sheet-alpha-segment-old"
    ]);

    expect(grouping.takeGroups[1]).toMatchObject({
      kind: "sheet-no-segment",
      sheetId: "sheet-alpha",
      sheetName: "Alpha Etude Latest",
      segmentId: null,
      segmentName: null,
      takeCount: 2,
      latestRecordedAt: "2026-06-21T12:00:00.000Z"
    });
    expect(grouping.takeGroups[1].recordings.map((recording) => recording.id)).toEqual([
      "sheet-alpha-none-null",
      "sheet-alpha-none-legacy"
    ]);
  });

  it("normalizes missing, null, malformed, and empty segment metadata into the no-segment bucket", () => {
    const grouping = groupRecordingsByTake([
      createSheetRecording({
        id: "legacy-missing-segment",
        createdAt: "2026-06-21T09:00:00.000Z"
      }),
      createSheetRecording({
        id: "explicit-null-segment",
        createdAt: "2026-06-21T10:00:00.000Z",
        segmentContext: null
      }),
      createSheetRecording({
        id: "empty-segment-id",
        createdAt: "2026-06-21T11:00:00.000Z",
        segmentContext: {
          ...createSegmentContext(),
          segmentId: "   "
        } as unknown as SheetRecordingSegmentContext
      }),
      createSheetRecording({
        id: "malformed-segment-context",
        createdAt: "2026-06-21T12:00:00.000Z",
        segmentContext: {
          segmentName: "Bridge"
        } as unknown as SheetRecordingSegmentContext
      })
    ]);

    expect(grouping.takeGroups).toHaveLength(1);
    expect(grouping.takeGroups[0]).toMatchObject({
      groupId: "sheet:sheet-alpha:segment:none",
      kind: "sheet-no-segment",
      segmentId: null,
      segmentName: null,
      takeCount: 4
    });
    expect(grouping.takeGroups[0].recordings.map((recording) => recording.id)).toEqual([
      "malformed-segment-context",
      "empty-segment-id",
      "explicit-null-segment",
      "legacy-missing-segment"
    ]);
  });

  it("keeps invalid sheet recordings out of take groups while preserving them separately", () => {
    const grouping = groupRecordingsByTake([
      createSheetRecording({
        id: "sheet-missing-id",
        sheetId: null,
        createdAt: "2026-06-21T10:00:00.000Z"
      }),
      createSheetRecording({
        id: "sheet-blank-id",
        sheetId: "   ",
        createdAt: "2026-06-21T11:00:00.000Z"
      }),
      createSheetRecording({
        id: "sheet-valid",
        sheetId: "sheet-alpha",
        createdAt: "2026-06-21T12:00:00.000Z",
        segmentContext: null
      })
    ]);

    expect(grouping.takeGroups).toHaveLength(1);
    expect(grouping.takeGroups[0].recordings.map((recording) => recording.id)).toEqual([
      "sheet-valid"
    ]);
    expect(grouping.ungroupedRecordings.map((recording) => recording.id)).toEqual([
      "sheet-blank-id",
      "sheet-missing-id"
    ]);
  });

  it("treats invalid timestamps as oldest without throwing", () => {
    const grouping = groupRecordingsByTake([
      createSheetRecording({
        id: "valid-newest",
        createdAt: "2026-06-21T12:00:00.000Z",
        segmentContext: createSegmentContext()
      }),
      createSheetRecording({
        id: "valid-older",
        createdAt: "2026-06-21T10:00:00.000Z",
        segmentContext: createSegmentContext()
      }),
      createSheetRecording({
        id: "invalid-created-at",
        createdAt: "not-a-date",
        segmentContext: createSegmentContext()
      })
    ]);

    expect(grouping.takeGroups[0].recordings.map((recording) => recording.id)).toEqual([
      "valid-newest",
      "valid-older",
      "invalid-created-at"
    ]);
    expect(grouping.takeGroups[0].latestRecording.id).toBe("valid-newest");
  });

  it("sorts recordings and groups deterministically when timestamps are equal", () => {
    const firstOrder = groupRecordingsByTake([
      createSheetRecording({
        id: "sheet-b-segment",
        sheetId: "sheet-b",
        createdAt: "2026-06-21T12:00:00.000Z",
        segmentContext: createSegmentContext({
          segmentId: "segment-a"
        })
      }),
      createSheetRecording({
        id: "sheet-a-segment-b",
        sheetId: "sheet-a",
        createdAt: "2026-06-21T12:00:00.000Z",
        segmentContext: createSegmentContext({
          segmentId: "segment-b"
        })
      }),
      createSheetRecording({
        id: "sheet-a-segment-a-2",
        sheetId: "sheet-a",
        createdAt: "2026-06-21T12:00:00.000Z",
        segmentContext: createSegmentContext({
          segmentId: "segment-a"
        })
      }),
      createSheetRecording({
        id: "sheet-a-segment-a-1",
        sheetId: "sheet-a",
        createdAt: "2026-06-21T12:00:00.000Z",
        segmentContext: createSegmentContext({
          segmentId: "segment-a"
        })
      })
    ]);
    const reversedOrder = groupRecordingsByTake([
      createSheetRecording({
        id: "sheet-a-segment-a-1",
        sheetId: "sheet-a",
        createdAt: "2026-06-21T12:00:00.000Z",
        segmentContext: createSegmentContext({
          segmentId: "segment-a"
        })
      }),
      createSheetRecording({
        id: "sheet-a-segment-a-2",
        sheetId: "sheet-a",
        createdAt: "2026-06-21T12:00:00.000Z",
        segmentContext: createSegmentContext({
          segmentId: "segment-a"
        })
      }),
      createSheetRecording({
        id: "sheet-a-segment-b",
        sheetId: "sheet-a",
        createdAt: "2026-06-21T12:00:00.000Z",
        segmentContext: createSegmentContext({
          segmentId: "segment-b"
        })
      }),
      createSheetRecording({
        id: "sheet-b-segment",
        sheetId: "sheet-b",
        createdAt: "2026-06-21T12:00:00.000Z",
        segmentContext: createSegmentContext({
          segmentId: "segment-a"
        })
      })
    ]);

    expect(firstOrder.takeGroups.map((group) => group.groupId)).toEqual([
      "sheet:sheet-a:segment:segment-a",
      "sheet:sheet-a:segment:segment-b",
      "sheet:sheet-b:segment:segment-a"
    ]);
    expect(firstOrder.takeGroups[0].recordings.map((recording) => recording.id)).toEqual([
      "sheet-a-segment-a-1",
      "sheet-a-segment-a-2"
    ]);

    expect(reversedOrder).toEqual(firstOrder);
  });

  it("falls through to deterministic tie-breakers when all timestamps are invalid", () => {
    const firstOrder = groupRecordingsByTake([
      createSheetRecording({
        id: "sheet-b-segment-invalid",
        sheetId: "sheet-b",
        createdAt: "not-a-date",
        segmentContext: createSegmentContext({
          segmentId: "segment-a"
        })
      }),
      createSheetRecording({
        id: "sheet-a-segment-b-invalid",
        sheetId: "sheet-a",
        createdAt: "not-a-date",
        segmentContext: createSegmentContext({
          segmentId: "segment-b"
        })
      }),
      createSheetRecording({
        id: "sheet-a-segment-a-invalid-2",
        sheetId: "sheet-a",
        createdAt: "not-a-date",
        segmentContext: createSegmentContext({
          segmentId: "segment-a"
        })
      }),
      createSheetRecording({
        id: "sheet-a-segment-a-invalid-1",
        sheetId: "sheet-a",
        createdAt: "not-a-date",
        segmentContext: createSegmentContext({
          segmentId: "segment-a"
        })
      })
    ]);
    const reversedOrder = groupRecordingsByTake([
      createSheetRecording({
        id: "sheet-a-segment-a-invalid-1",
        sheetId: "sheet-a",
        createdAt: "not-a-date",
        segmentContext: createSegmentContext({
          segmentId: "segment-a"
        })
      }),
      createSheetRecording({
        id: "sheet-a-segment-a-invalid-2",
        sheetId: "sheet-a",
        createdAt: "not-a-date",
        segmentContext: createSegmentContext({
          segmentId: "segment-a"
        })
      }),
      createSheetRecording({
        id: "sheet-a-segment-b-invalid",
        sheetId: "sheet-a",
        createdAt: "not-a-date",
        segmentContext: createSegmentContext({
          segmentId: "segment-b"
        })
      }),
      createSheetRecording({
        id: "sheet-b-segment-invalid",
        sheetId: "sheet-b",
        createdAt: "not-a-date",
        segmentContext: createSegmentContext({
          segmentId: "segment-a"
        })
      })
    ]);

    expect(firstOrder.takeGroups.map((group) => group.groupId)).toEqual([
      "sheet:sheet-a:segment:segment-a",
      "sheet:sheet-a:segment:segment-b",
      "sheet:sheet-b:segment:segment-a"
    ]);
    expect(firstOrder.takeGroups[0].recordings.map((recording) => recording.id)).toEqual([
      "sheet-a-segment-a-invalid-1",
      "sheet-a-segment-a-invalid-2"
    ]);

    expect(reversedOrder).toEqual(firstOrder);
  });

  it("returns new arrays without mutating caller input", () => {
    const recordings = [
      createSheetRecording({
        id: "older-recording",
        createdAt: "2026-06-21T09:00:00.000Z",
        segmentContext: null
      }),
      createSheetRecording({
        id: "newer-recording",
        createdAt: "2026-06-21T10:00:00.000Z",
        segmentContext: null
      }),
      createQuickRecording({
        id: "quick-recording",
        createdAt: "2026-06-21T11:00:00.000Z"
      })
    ];
    const originalOrder = recordings.map((recording) => recording.id);

    const grouping = groupRecordingsByTake(recordings);

    expect(recordings.map((recording) => recording.id)).toEqual(originalOrder);
    expect(grouping.takeGroups[0].recordings).not.toBe(recordings);
    expect(grouping.quickRecordings).not.toBe(recordings);
    expect(grouping.takeGroups[0].recordings.map((recording) => recording.id)).toEqual([
      "newer-recording",
      "older-recording"
    ]);
  });

  it("groups normalized repository snapshots through the service boundary", () => {
    const rawSnapshot: RecordingReviewSnapshot = {
      sessions: [],
      recordings: [
        createQuickRecording({
          id: "quick-newer",
          createdAt: "2026-06-21T13:00:00.000Z"
        }),
        createQuickRecording({
          id: "quick-older",
          createdAt: "2026-06-21T08:00:00.000Z"
        }),
        createSheetRecording({
          id: "legacy-sheet",
          sheetId: "sheet-alpha",
          createdAt: "2026-06-21T09:00:00.000Z"
        }),
        createSheetRecording({
          id: "null-segment-sheet",
          sheetId: "sheet-alpha",
          createdAt: "2026-06-21T10:00:00.000Z",
          segmentContext: null
        }),
        createSheetRecording({
          id: "malformed-segment-sheet",
          sheetId: "sheet-alpha",
          createdAt: "2026-06-21T11:00:00.000Z",
          segmentContext: {
            ...createSegmentContext(),
            measureRangeMs: {
              startMs: 9_000,
              endMs: 25_000
            }
          } as unknown as SheetRecordingSegmentContext
        })
      ],
      errorMarkers: []
    };

    window.localStorage.setItem(RECORDINGS_STORAGE_KEY, JSON.stringify(rawSnapshot));

    const grouping = recordingHistoryRepository.getTakeGroups();

    expect(grouping.quickRecordings.map((recording) => recording.id)).toEqual([
      "quick-newer",
      "quick-older"
    ]);
    expect(grouping.takeGroups).toHaveLength(1);
    expect(grouping.takeGroups[0]).toMatchObject({
      groupId: "sheet:sheet-alpha:segment:none",
      kind: "sheet-no-segment",
      takeCount: 3
    });
    expect(grouping.takeGroups[0].recordings.map((recording) => recording.id)).toEqual([
      "malformed-segment-sheet",
      "null-segment-sheet",
      "legacy-sheet"
    ]);
  });
});

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
    measureGridVersion: "bpm:96|timeSignature:4/4|pickupBeats:0|measureOneOffsetMs:1000",
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

function createQuickRecording(
  overrides: Partial<ReviewRecording> = {}
): ReviewRecording {
  return {
    id: "quick-recording",
    type: "quick",
    name: "Quick take",
    sessionId: "session-quick",
    sheetId: null,
    createdAt: "2026-06-21T09:00:00.000Z",
    durationMs: 10_000,
    sizeBytes: 128,
    mimeType: "audio/wav",
    audioDataUrl: "data:audio/wav;base64,UklGRg==",
    settings: {
      bpm: 120,
      timeSignature: "4/4"
    },
    ...overrides
  };
}

function createSheetRecording(
  overrides: Partial<Omit<ReviewRecording, "segmentContext">> & { segmentContext?: unknown } = {}
): ReviewRecording {
  return {
    id: "sheet-recording",
    type: "sheet",
    name: "Sheet take",
    sessionId: "session-sheet",
    sheetId: "sheet-alpha",
    sheetName: "Alpha Etude",
    createdAt: "2026-06-21T12:00:00.000Z",
    durationMs: 12_000,
    sizeBytes: 256,
    mimeType: "audio/webm",
    audioDataUrl: "data:audio/webm;base64,UklGRg==",
    settings: {
      bpm: 96,
      timeSignature: "4/4"
    },
    ...overrides
  } as ReviewRecording;
}
