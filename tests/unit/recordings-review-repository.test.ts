import { beforeEach, describe, expect, it } from "vitest";

import {
  RECORDINGS_STORAGE_KEY,
  recordingHistoryRepository,
  seedRecordingHistoryForTests
} from "@/lib/recordings-review/repository";
import { recordingHistoryMetadataRepository } from "@/infrastructure/db/recording-history-metadata-repository";
import type { RecordingReviewSnapshot, ReviewRecording } from "@/lib/recordings-review/types";
import type { PracticeSession, SheetRecordingMetadata } from "@/domain/practice";
import {
  makeQuickReviewRecording,
  makeSheetRecordingSegmentContext as createSegmentContext,
  makeSheetReviewRecording,
  type MakeQuickReviewRecordingOverrides,
  type MakeSheetReviewRecordingOverrides
} from "./factories/recordings-review";

const snapshot: RecordingReviewSnapshot = {
  sessions: [{ id: "session-1" }],
  recordings: [
    {
      id: "recording-1",
      type: "quick",
      name: "Quick take",
      sessionId: "session-1",
      sheetId: null,
      createdAt: "2026-06-21T09:00:00.000Z",
      durationMs: 1_000,
      sizeBytes: 128,
      mimeType: "audio/wav",
      audioDataUrl: "data:audio/wav;base64,UklGRg==",
      settings: {
        bpm: 120,
        timeSignature: "4/4"
      },
      trustedPeaks: [1]
    }
  ],
  errorMarkers: [
    {
      id: "marker-1",
      recordingId: "recording-1",
      timestampMs: 500,
      note: "Missed accent"
    }
  ]
};

describe("recording history repository", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("loads recordings and markers from the local data boundary", () => {
    window.localStorage.setItem(RECORDINGS_STORAGE_KEY, JSON.stringify(snapshot));

    expect(recordingHistoryRepository.getSnapshot().recordings).toHaveLength(1);
    expect(recordingHistoryRepository.getErrorMarkers("recording-1")).toHaveLength(1);
    expect(recordingHistoryRepository.getRecording("recording-1")?.audioDataUrl).toMatch(/^data:audio\/wav/);
  });

  it("deletes recording metadata and linked error markers together", () => {
    seedRecordingHistoryForTests(snapshot);
    recordingHistoryRepository.deleteRecording("recording-1");

    const persisted = JSON.parse(window.localStorage.getItem(RECORDINGS_STORAGE_KEY) ?? "{}");

    expect(persisted.recordings).toEqual([]);
    expect(persisted.errorMarkers).toEqual([]);
    expect(recordingHistoryRepository.getRecording("recording-1")).toBeNull();
  });

  it("creates sorted recording-scoped markers and persists deletion", () => {
    seedRecordingHistoryForTests({
      ...snapshot,
      errorMarkers: []
    });

    expect(() =>
      recordingHistoryRepository.createErrorMarker({
        recordingId: "",
        timestampMs: 100,
        note: null
      })
    ).toThrow("recording is required");

    const lateMarker = recordingHistoryRepository.createErrorMarker({
      id: "marker-late",
      recordingId: "recording-1",
      timestampMs: 900,
      note: "  late accent  "
    });
    const earlyMarker = recordingHistoryRepository.createErrorMarker({
      id: "marker-early",
      recordingId: "recording-1",
      timestampMs: 100,
      note: ""
    });

    expect(lateMarker.note).toBe("late accent");
    expect(earlyMarker.note).toBeNull();
    expect(recordingHistoryRepository.getErrorMarkers("recording-1").map((marker) => marker.id)).toEqual([
      "marker-early",
      "marker-late"
    ]);
    expect(recordingHistoryRepository.getErrorMarkers("other-recording")).toEqual([]);

    recordingHistoryRepository.deleteErrorMarker("marker-early");

    const persisted = JSON.parse(window.localStorage.getItem(RECORDINGS_STORAGE_KEY) ?? "{}");

    expect(recordingHistoryRepository.getErrorMarkers("recording-1").map((marker) => marker.id)).toEqual([
      "marker-late"
    ]);
    expect(persisted.errorMarkers.map((marker: { id: string }) => marker.id)).toEqual(["marker-late"]);
  });

  it("rejects marker timestamps outside the recording duration", () => {
    seedRecordingHistoryForTests(snapshot);

    expect(() =>
      recordingHistoryRepository.createErrorMarker({
        recordingId: "recording-1",
        timestampMs: 1_001,
        note: null
      })
    ).toThrow("within the recording");
  });

  it("sanitizes persisted invalid, orphaned, out-of-range, and untrimmed markers on read and write", () => {
    const invalidSnapshot = {
      ...snapshot,
      errorMarkers: [
        {
          id: "marker-trimmed",
          recordingId: "recording-1",
          timestampMs: 500,
          note: "  trimmed note  "
        },
        {
          id: "marker-orphan",
          recordingId: "missing-recording",
          timestampMs: 500,
          note: "orphan"
        },
        {
          id: "marker-negative",
          recordingId: "recording-1",
          timestampMs: -1,
          note: "negative"
        },
        {
          id: "marker-too-late",
          recordingId: "recording-1",
          timestampMs: 1_001,
          note: "too late"
        },
        {
          id: "marker-nan",
          recordingId: "recording-1",
          timestampMs: Number.NaN,
          note: "nan"
        },
        {
          id: "marker-long-note",
          recordingId: "recording-1",
          timestampMs: 700,
          note: "x".repeat(161)
        }
      ]
    } as RecordingReviewSnapshot;

    seedRecordingHistoryForTests(invalidSnapshot);

    expect(recordingHistoryRepository.getSnapshot().errorMarkers).toEqual([
      {
        id: "marker-trimmed",
        recordingId: "recording-1",
        timestampMs: 500,
        note: "trimmed note"
      }
    ]);
    expect(recordingHistoryRepository.getErrorMarkers("recording-1")).toEqual([
      {
        id: "marker-trimmed",
        recordingId: "recording-1",
        timestampMs: 500,
        note: "trimmed note"
      }
    ]);

    const persisted = JSON.parse(window.localStorage.getItem(RECORDINGS_STORAGE_KEY) ?? "{}");

    expect(persisted.errorMarkers).toEqual([
      {
        id: "marker-trimmed",
        recordingId: "recording-1",
        timestampMs: 500,
        note: "trimmed note"
      }
    ]);
  });

  it("filters invalid markers loaded from storage before they reach snapshots or marker lists", () => {
    window.localStorage.setItem(
      RECORDINGS_STORAGE_KEY,
      JSON.stringify({
        ...snapshot,
        errorMarkers: [
          {
            id: "marker-valid",
            recordingId: "recording-1",
            timestampMs: 250,
            note: "  valid loaded  "
          },
          {
            id: "marker-orphan",
            recordingId: "missing-recording",
            timestampMs: 250,
            note: "orphan"
          },
          {
            id: "marker-too-late",
            recordingId: "recording-1",
            timestampMs: 5_000,
            note: "too late"
          }
        ]
      })
    );

    const loadedSnapshot = recordingHistoryRepository.getSnapshot();

    expect(loadedSnapshot.errorMarkers).toEqual([
      {
        id: "marker-valid",
        recordingId: "recording-1",
        timestampMs: 250,
        note: "valid loaded"
      }
    ]);
    expect(recordingHistoryRepository.getErrorMarkers("recording-1")).toEqual(loadedSnapshot.errorMarkers);

    seedRecordingHistoryForTests(loadedSnapshot);

    const persisted = JSON.parse(window.localStorage.getItem(RECORDINGS_STORAGE_KEY) ?? "{}");

    expect(persisted.errorMarkers).toEqual(loadedSnapshot.errorMarkers);
  });

  it("stores and resolves separate best and active take metadata without changing latest-take ordering", () => {
    seedRecordingHistoryForTests(createTakeSelectionSnapshot());

    const [segmentGroup, noSegmentGroup] = recordingHistoryRepository.getTakeGroups().takeGroups;

    expect(segmentGroup.latestRecording.id).toBe("sheet-segment-new");

    recordingHistoryRepository.setBestTake(segmentGroup, "sheet-segment-old");
    recordingHistoryRepository.setActiveTake(segmentGroup, "sheet-segment-new");
    recordingHistoryRepository.setBestTake(noSegmentGroup, "sheet-whole-legacy");
    recordingHistoryRepository.setActiveTake(noSegmentGroup, "sheet-whole-legacy");

    expect(recordingHistoryRepository.resolveTakeSelection(segmentGroup)).toMatchObject({
      groupId: "sheet:sheet-alpha:segment:id:segment-alpha",
      bestRecordingId: "sheet-segment-old",
      activeRecordingId: "sheet-segment-new",
      bestRecording: {
        id: "sheet-segment-old"
      },
      activeRecording: {
        id: "sheet-segment-new"
      }
    });
    expect(recordingHistoryRepository.resolveTakeSelection(noSegmentGroup)).toMatchObject({
      groupId: "sheet:sheet-alpha:segment:none",
      bestRecordingId: "sheet-whole-legacy",
      activeRecordingId: "sheet-whole-legacy",
      bestRecording: {
        id: "sheet-whole-legacy"
      },
      activeRecording: {
        id: "sheet-whole-legacy"
      }
    });
    expect(recordingHistoryRepository.getTakeGroups().takeGroups[0].latestRecording.id).toBe(
      "sheet-segment-new"
    );

    const persisted = JSON.parse(window.localStorage.getItem(RECORDINGS_STORAGE_KEY) ?? "{}");

    expect(persisted.takeSelections).toHaveLength(2);
    expect(recordingHistoryRepository.getTakeSelections()).toHaveLength(2);
  });

  it("clears best and active independently and removes empty metadata records", () => {
    seedRecordingHistoryForTests(createTakeSelectionSnapshot());

    const [segmentGroup] = recordingHistoryRepository.getTakeGroups().takeGroups;

    recordingHistoryRepository.setBestTake(segmentGroup, "sheet-segment-old");
    recordingHistoryRepository.setActiveTake(segmentGroup, "sheet-segment-new");
    recordingHistoryRepository.setBestTake(segmentGroup, null);

    expect(recordingHistoryRepository.resolveTakeSelection(segmentGroup)).toMatchObject({
      bestRecordingId: null,
      activeRecordingId: "sheet-segment-new",
      bestRecording: null,
      activeRecording: {
        id: "sheet-segment-new"
      }
    });

    recordingHistoryRepository.setActiveTake(segmentGroup, null);

    expect(recordingHistoryRepository.getTakeSelection(segmentGroup.groupId)).toBeNull();
    expect(recordingHistoryRepository.resolveTakeSelection(segmentGroup)).toMatchObject({
      bestRecordingId: null,
      activeRecordingId: null,
      bestRecording: null,
      activeRecording: null,
      updatedAt: null
    });

    const persisted = JSON.parse(window.localStorage.getItem(RECORDINGS_STORAGE_KEY) ?? "{}");

    expect(persisted.takeSelections).toBeUndefined();
  });

  it("rejects take selections for recordings outside the target group and preserves stored state", () => {
    seedRecordingHistoryForTests(createTakeSelectionSnapshot());

    const [segmentGroup] = recordingHistoryRepository.getTakeGroups().takeGroups;

    expect(() =>
      recordingHistoryRepository.setBestTake(segmentGroup, "sheet-whole-null")
    ).toThrow("does not belong");
    expect(() =>
      recordingHistoryRepository.setActiveTake(segmentGroup, "quick-review-recording")
    ).toThrow("does not belong");

    expect(recordingHistoryRepository.getTakeSelections()).toEqual([]);
  });

  it("rejects stale group writes for deleted recordings and does not persist orphaned refs", () => {
    seedRecordingHistoryForTests(createTakeSelectionSnapshot());

    const [segmentGroup] = recordingHistoryRepository.getTakeGroups().takeGroups;

    recordingHistoryRepository.deleteRecording("sheet-segment-old");

    expect(() =>
      recordingHistoryRepository.setBestTake(segmentGroup, "sheet-segment-old")
    ).toThrow("does not belong");
    expect(() =>
      recordingHistoryRepository.setActiveTake(segmentGroup, "sheet-segment-old")
    ).toThrow("does not belong");
    expect(recordingHistoryRepository.getTakeSelections()).toEqual([]);

    const persisted = JSON.parse(
      window.localStorage.getItem(RECORDINGS_STORAGE_KEY) ?? "{}"
    );

    expect(persisted.takeSelections).toBeUndefined();
  });

  it("normalizes duplicate persisted metadata entries and resolves stale refs safely", () => {
    const seededSnapshot = createTakeSelectionSnapshot();
    const duplicateEntries = [
      {
        groupId: "sheet:sheet-alpha:segment:id:segment-alpha",
        sheetId: "sheet-alpha",
        segmentId: "segment-alpha",
        bestRecordingId: "sheet-segment-old",
        activeRecordingId: "sheet-segment-old",
        updatedAt: "2026-06-21T11:00:00.000Z"
      },
      {
        groupId: "sheet:sheet-alpha:segment:id:segment-alpha",
        sheetId: "sheet-alpha",
        segmentId: "segment-alpha",
        bestRecordingId: "missing-recording",
        activeRecordingId: "sheet-segment-new",
        updatedAt: "2026-06-21T12:00:00.000Z"
      },
      {
        groupId: "sheet:sheet-alpha:segment:none",
        sheetId: "sheet-alpha",
        segmentId: null,
        bestRecordingId: "missing-recording",
        activeRecordingId: null,
        updatedAt: "2026-06-21T10:00:00.000Z"
      },
      {
        groupId: "sheet:sheet-alpha:segment:wrong",
        sheetId: "sheet-alpha",
        segmentId: null,
        bestRecordingId: "sheet-whole-null",
        activeRecordingId: null,
        updatedAt: "2026-06-21T09:00:00.000Z"
      },
      {
        groupId: "sheet:sheet-alpha:segment:id:segment-alpha",
        sheetId: "sheet-alpha",
        segmentId: "segment-alpha",
        bestRecordingId: null,
        activeRecordingId: null,
        updatedAt: "2026-06-21T13:00:00.000Z"
      }
    ];

    window.localStorage.setItem(
      RECORDINGS_STORAGE_KEY,
      JSON.stringify({
        ...seededSnapshot,
        takeSelections: duplicateEntries
      })
    );

    const [segmentGroup, noSegmentGroup] = recordingHistoryRepository.getTakeGroups().takeGroups;

    expect(recordingHistoryRepository.getTakeSelections()).toEqual([
      {
        groupId: "sheet:sheet-alpha:segment:id:segment-alpha",
        sheetId: "sheet-alpha",
        segmentId: "segment-alpha",
        bestRecordingId: "missing-recording",
        activeRecordingId: "sheet-segment-new",
        updatedAt: "2026-06-21T12:00:00.000Z"
      },
      {
        groupId: "sheet:sheet-alpha:segment:none",
        sheetId: "sheet-alpha",
        segmentId: null,
        bestRecordingId: "missing-recording",
        activeRecordingId: null,
        updatedAt: "2026-06-21T10:00:00.000Z"
      }
    ]);
    expect(recordingHistoryRepository.resolveTakeSelection(segmentGroup)).toMatchObject({
      bestRecordingId: "missing-recording",
      activeRecordingId: "sheet-segment-new",
      bestRecording: null,
      activeRecording: {
        id: "sheet-segment-new"
      }
    });
    expect(recordingHistoryRepository.resolveTakeSelection(noSegmentGroup)).toMatchObject({
      bestRecordingId: "missing-recording",
      activeRecordingId: null,
      bestRecording: null,
      activeRecording: null
    });
  });

  it("clears deleted recording refs from take selections while preserving unrelated groups", () => {
    seedRecordingHistoryForTests(createTakeSelectionSnapshot());

    const [segmentGroup, noSegmentGroup] = recordingHistoryRepository.getTakeGroups().takeGroups;

    recordingHistoryRepository.setBestTake(segmentGroup, "sheet-segment-old");
    recordingHistoryRepository.setActiveTake(segmentGroup, "sheet-segment-new");
    recordingHistoryRepository.setBestTake(noSegmentGroup, "sheet-whole-legacy");
    recordingHistoryRepository.setActiveTake(noSegmentGroup, "sheet-whole-null");

    recordingHistoryRepository.deleteRecording("sheet-segment-old");

    expect(recordingHistoryRepository.resolveTakeSelection(segmentGroup)).toMatchObject({
      bestRecordingId: null,
      activeRecordingId: "sheet-segment-new",
      bestRecording: null,
      activeRecording: {
        id: "sheet-segment-new"
      }
    });
    expect(recordingHistoryRepository.resolveTakeSelection(noSegmentGroup)).toMatchObject({
      bestRecordingId: "sheet-whole-legacy",
      activeRecordingId: "sheet-whole-null"
    });

    recordingHistoryRepository.deleteRecording("sheet-segment-new");

    expect(recordingHistoryRepository.getTakeSelection(segmentGroup.groupId)).toBeNull();

    recordingHistoryRepository.deleteRecording("sheet-whole-legacy");

    expect(recordingHistoryRepository.resolveTakeSelection(noSegmentGroup)).toMatchObject({
      bestRecordingId: null,
      activeRecordingId: "sheet-whole-null",
      bestRecording: null,
      activeRecording: {
        id: "sheet-whole-null"
      }
    });

    recordingHistoryRepository.deleteRecording("sheet-whole-null");

    expect(recordingHistoryRepository.getTakeSelections()).toEqual([]);
  });

  it("leaves take selections unchanged when deleting an unselected recording", () => {
    seedRecordingHistoryForTests(createTakeSelectionSnapshot());

    const [segmentGroup, noSegmentGroup] =
      recordingHistoryRepository.getTakeGroups().takeGroups;

    recordingHistoryRepository.setBestTake(segmentGroup, "sheet-segment-old");
    recordingHistoryRepository.setActiveTake(segmentGroup, "sheet-segment-new");
    recordingHistoryRepository.setBestTake(noSegmentGroup, "sheet-whole-legacy");

    const persistedBefore = JSON.parse(
      window.localStorage.getItem(RECORDINGS_STORAGE_KEY) ?? "{}"
    );

    recordingHistoryRepository.deleteRecording("quick-review-recording");

    const persistedAfter = JSON.parse(
      window.localStorage.getItem(RECORDINGS_STORAGE_KEY) ?? "{}"
    );

    expect(persistedAfter.takeSelections).toEqual(persistedBefore.takeSelections);
    expect(JSON.stringify(persistedAfter.takeSelections)).toBe(
      JSON.stringify(persistedBefore.takeSelections)
    );
  });

  it("stores recording-level tags, favorites, and archive metadata separately from take selections", () => {
    seedRecordingHistoryForTests(createTakeSelectionSnapshot());

    const quickRecording = recordingHistoryRepository.getRecording(
      "quick-review-recording"
    );

    expect(quickRecording).not.toBeNull();
    expect(
      recordingHistoryRepository.resolveRecordingOrganization(quickRecording!)
    ).toEqual({
      recordingId: "quick-review-recording",
      tags: [],
      favorite: false,
      archived: false,
      updatedAt: null
    });

    recordingHistoryRepository.setRecordingTags("quick-review-recording", [
      "  Warmup  ",
      "Clean tone"
    ]);
    recordingHistoryRepository.setRecordingFavorite(
      "quick-review-recording",
      true
    );
    recordingHistoryRepository.setRecordingArchived(
      "quick-review-recording",
      true
    );
    recordingHistoryRepository.addRecordingTag(
      "quick-review-recording",
      "Review"
    );
    recordingHistoryRepository.removeRecordingTag(
      "quick-review-recording",
      "clean tone"
    );

    expect(
      recordingHistoryRepository.resolveRecordingOrganization(quickRecording!)
    ).toMatchObject({
      recordingId: "quick-review-recording",
      tags: ["Warmup", "Review"],
      favorite: true,
      archived: true
    });

    const persisted = JSON.parse(
      window.localStorage.getItem(RECORDINGS_STORAGE_KEY) ?? "{}"
    );

    expect(persisted.recordingOrganization).toEqual([
      expect.objectContaining({
        recordingId: "quick-review-recording",
        tags: ["Warmup", "Review"],
        favorite: true,
        archived: true
      })
    ]);
    expect(persisted.takeSelections).toBeUndefined();
  });

  it("rejects invalid tag writes atomically and omits empty organization metadata", () => {
    seedRecordingHistoryForTests(createTakeSelectionSnapshot());
    recordingHistoryRepository.setRecordingTags("quick-review-recording", [
      "Warmup"
    ]);

    const beforeInvalidWrite = JSON.parse(
      window.localStorage.getItem(RECORDINGS_STORAGE_KEY) ?? "{}"
    );

    expect(() =>
      recordingHistoryRepository.setRecordingTags("quick-review-recording", [
        "Warmup",
        "warmup"
      ])
    ).toThrow("duplicates");
    expect(() =>
      recordingHistoryRepository.addRecordingTag("quick-review-recording", "")
    ).toThrow("empty");
    expect(() =>
      recordingHistoryRepository.addRecordingTag(
        "quick-review-recording",
        "comma,tag"
      )
    ).toThrow("empty");
    expect(() =>
      recordingHistoryRepository.addRecordingTag(
        "quick-review-recording",
        "x".repeat(25)
      )
    ).toThrow("empty");
    expect(() =>
      recordingHistoryRepository.setRecordingTags("quick-review-recording", [
        "one",
        "two",
        "three",
        "four",
        "five",
        "six",
        "seven",
        "eight",
        "nine"
      ])
    ).toThrow("up to 8 tags");

    expect(
      JSON.parse(window.localStorage.getItem(RECORDINGS_STORAGE_KEY) ?? "{}")
        .recordingOrganization
    ).toEqual(beforeInvalidWrite.recordingOrganization);

    recordingHistoryRepository.setRecordingTags("quick-review-recording", []);

    const persisted = JSON.parse(
      window.localStorage.getItem(RECORDINGS_STORAGE_KEY) ?? "{}"
    );

    expect(persisted.recordingOrganization).toBeUndefined();
  });

  it("normalizes duplicate, invalid, and stale persisted recording organization metadata", () => {
    const seededSnapshot = createTakeSelectionSnapshot();

    window.localStorage.setItem(
      RECORDINGS_STORAGE_KEY,
      JSON.stringify({
        ...seededSnapshot,
        recordingOrganization: [
          {
            recordingId: "quick-review-recording",
            tags: ["Warmup", "warmup", "bad,tag", "  Clean   Tone  "],
            favorite: false,
            archived: false,
            updatedAt: "2026-06-21T10:00:00.000Z"
          },
          {
            recordingId: "quick-review-recording",
            tags: ["Keeper"],
            favorite: true,
            archived: true,
            updatedAt: "2026-06-21T12:00:00.000Z"
          },
          {
            recordingId: "missing-recording",
            tags: ["Ghost"],
            favorite: true,
            archived: true,
            updatedAt: "2026-06-21T13:00:00.000Z"
          },
          {
            recordingId: "sheet-segment-old",
            tags: ["Only invalid, really"],
            favorite: false,
            archived: false,
            updatedAt: "2026-06-21T11:00:00.000Z"
          }
        ]
      })
    );

    expect(recordingHistoryRepository.getRecordingOrganizations()).toEqual([
      {
        recordingId: "quick-review-recording",
        tags: ["Keeper"],
        favorite: true,
        archived: true,
        updatedAt: "2026-06-21T12:00:00.000Z"
      }
    ]);
  });

  it("removes recording organization metadata when deleting recordings", () => {
    seedRecordingHistoryForTests(createTakeSelectionSnapshot());

    recordingHistoryRepository.setRecordingTags("quick-review-recording", [
      "Warmup"
    ]);
    recordingHistoryRepository.setRecordingFavorite(
      "sheet-segment-old",
      true
    );

    recordingHistoryRepository.deleteRecording("quick-review-recording");

    expect(recordingHistoryRepository.getRecordingOrganization("quick-review-recording")).toBeNull();
    expect(recordingHistoryRepository.getRecordingOrganization("sheet-segment-old")).toMatchObject({
      recordingId: "sheet-segment-old",
      favorite: true
    });

    recordingHistoryRepository.deleteRecording("sheet-segment-old");

    expect(recordingHistoryRepository.getRecordingOrganizations()).toEqual([]);
  });

  it("stores 05e sheet recording metadata in the shared recording history boundary", async () => {
    const recording = createSheetRecording();

    await recordingHistoryMetadataRepository.saveRecordingMetadata(recording, createSheetSession());

    const snapshot = recordingHistoryRepository.getSnapshot();
    const reviewRecording = recordingHistoryRepository.getRecording("sheet-metadata-1");

    expect(snapshot.recordings).toEqual([]);
    expect(snapshot.sheetRecordingMetadata).toEqual([recording]);
    expect(reviewRecording).toBeNull();
    await expect(recordingHistoryMetadataRepository.listRecordingMetadataForSession("session-sheet-1")).resolves.toEqual([
      recording
    ]);
  });

  it("filters invalid persisted sheet metadata bucket rows before listing", async () => {
    window.localStorage.setItem(
      RECORDINGS_STORAGE_KEY,
      JSON.stringify({
        sessions: [],
        recordings: [],
        errorMarkers: [],
        sheetRecordingMetadata: [
          {
            id: "invalid-metadata-only",
            type: "sheet",
            sessionId: "",
            sheetId: "sheet-alpha",
            sheetName: "Alpha Sheet",
            createdAt: "not-a-date",
            durationMs: -1,
            bpm: 96,
            timeSignature: "4/4",
            segmentContext: null
          }
        ]
      })
    );

    expect(recordingHistoryRepository.getSnapshot().sheetRecordingMetadata).toBeUndefined();
    await expect(recordingHistoryMetadataRepository.listRecordingMetadata()).resolves.toEqual([]);
  });

  it("preserves 12/8 sheet recording metadata through the practice metadata boundary", async () => {
    await recordingHistoryMetadataRepository.saveRecordingMetadata(
      createSheetRecording({ timeSignature: "12/8" }),
      createSheetSession({ timeSignature: "12/8" })
    );

    expect(recordingHistoryRepository.getSnapshot().sheetRecordingMetadata?.[0].timeSignature).toBe("12/8");
    await expect(
      recordingHistoryMetadataRepository.listRecordingMetadataForSession(
        "session-sheet-1"
      )
    ).resolves.toEqual([
      expect.objectContaining({
        id: "sheet-metadata-1",
        timeSignature: "12/8"
      })
    ]);
  });

  it("preserves review metadata across sheet snapshot writes and clears sheet organization with sheet metadata cleanup", async () => {
    seedRecordingHistoryForTests(createTakeSelectionSnapshot());

    const [segmentGroup] = recordingHistoryRepository.getTakeGroups().takeGroups;

    recordingHistoryRepository.setBestTake(segmentGroup, "sheet-segment-old");
    recordingHistoryRepository.setActiveTake(segmentGroup, "sheet-segment-new");
    recordingHistoryRepository.setRecordingTags("sheet-segment-old", [
      "Bridge"
    ]);
    recordingHistoryRepository.setRecordingFavorite("quick-review-recording", true);
    recordingHistoryRepository.setRecordingArchived("quick-review-recording", true);

    await recordingHistoryMetadataRepository.saveRecordingMetadata(
      createSheetRecording({
        id: "sheet-metadata-1",
        segmentContext: createSegmentContext()
      }),
      createSheetSession()
    );

    expect(
      recordingHistoryRepository.getTakeSelection(segmentGroup.groupId)
    ).toMatchObject({
      bestRecordingId: "sheet-segment-old",
      activeRecordingId: "sheet-segment-new"
    });
    expect(recordingHistoryRepository.getRecordingOrganization("sheet-segment-old")).toMatchObject({
      tags: ["Bridge"]
    });
    expect(recordingHistoryRepository.getRecordingOrganization("quick-review-recording")).toMatchObject({
      favorite: true,
      archived: true
    });

    const persistedAfterMetadataWrite = JSON.parse(
      window.localStorage.getItem(RECORDINGS_STORAGE_KEY) ?? "{}"
    );

    expect(persistedAfterMetadataWrite.recordingOrganization).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          recordingId: "quick-review-recording",
          favorite: true,
          archived: true
        })
      ])
    );

    await recordingHistoryMetadataRepository.clear();

    expect(recordingHistoryRepository.getTakeSelections()).toEqual([]);
    expect(recordingHistoryRepository.getRecordingOrganization("sheet-segment-old")).toBeNull();
    expect(recordingHistoryRepository.getRecordingOrganization("quick-review-recording")).toMatchObject({
      favorite: true,
      archived: true
    });
  });

  it("preserves valid segment context through raw recording history snapshots", () => {
    const segmentContext = createSegmentContext();
    const sheetRecording = createReviewSheetRecording({ segmentContext });

    seedRecordingHistoryForTests({
      sessions: [],
      recordings: [sheetRecording],
      errorMarkers: []
    });

    const loaded = recordingHistoryRepository.getRecording("sheet-recording-with-segment");

    expect(loaded?.segmentContext).toEqual(segmentContext);

    seedRecordingHistoryForTests(recordingHistoryRepository.getSnapshot());

    const persisted = JSON.parse(window.localStorage.getItem(RECORDINGS_STORAGE_KEY) ?? "{}");

    expect(persisted.recordings[0].segmentContext).toEqual(segmentContext);
  });

  it("keeps legacy sheet recordings and normalizes malformed segment context to null", () => {
    window.localStorage.setItem(
      RECORDINGS_STORAGE_KEY,
      JSON.stringify({
        sessions: [],
        recordings: [
          createReviewSheetRecording({ id: "sheet-legacy" }),
          createReviewSheetRecording({
            id: "sheet-malformed-segment",
            segmentContext: {
              ...createSegmentContext(),
              measureRangeMs: {
                startMs: 9_000,
                endMs: 25_000
              }
            }
          })
        ],
        errorMarkers: []
      })
    );

    const loadedRecordings = recordingHistoryRepository.getSnapshot().recordings;

    expect(loadedRecordings.find((recording) => recording.id === "sheet-legacy")).not.toHaveProperty("segmentContext");
    expect(loadedRecordings.find((recording) => recording.id === "sheet-malformed-segment")).toMatchObject({
      id: "sheet-malformed-segment",
      segmentContext: null
    });
  });

  it("maps segment context through metadata-only and artifact-backed sheet recording records", async () => {
    const segmentContext = createSegmentContext({ targetBpm: null });
    const recording = createSheetRecording({ segmentContext });

    await recordingHistoryMetadataRepository.saveRecordingMetadata(recording, createSheetSession());
    await expect(recordingHistoryMetadataRepository.listRecordingMetadataForSession("session-sheet-1")).resolves.toEqual([
      recording
    ]);

    seedRecordingHistoryForTests({
      sessions: [],
      recordings: [
        createReviewSheetRecording({
          id: recording.id,
          sessionId: recording.sessionId,
          sheetId: recording.sheetId,
          sheetName: recording.sheetName,
          createdAt: recording.createdAt,
          durationMs: recording.durationMs,
          segmentContext
        })
      ],
      errorMarkers: []
    });

    await expect(recordingHistoryMetadataRepository.listRecordingMetadataForSession("session-sheet-1")).resolves.toEqual([
      recording
    ]);
  });

  it("removes same-id metadata-only rows when saving real sheet recordings", async () => {
    const recording = createSheetRecording({ segmentContext: createSegmentContext() });

    await recordingHistoryMetadataRepository.saveRecordingMetadata(recording, createSheetSession());
    recordingHistoryRepository.saveSheetRecordingMetadataWithSession({
      recording: createReviewSheetRecording({
        id: recording.id,
        sessionId: recording.sessionId,
        sheetId: recording.sheetId,
        sheetName: recording.sheetName,
        createdAt: recording.createdAt,
        durationMs: recording.durationMs,
        segmentContext: recording.segmentContext
      }),
      session: createSheetSession()
    });

    const snapshot = recordingHistoryRepository.getSnapshot();

    expect(snapshot.sheetRecordingMetadata).toBeUndefined();
    expect(snapshot.recordings.map((item) => item.id)).toEqual([recording.id]);
    await expect(recordingHistoryMetadataRepository.listRecordingMetadataForSession("session-sheet-1")).resolves.toEqual([
      recording
    ]);
  });

  it("rejects mismatched 05e sheet recording linkage before saving to shared history", async () => {
    await expect(
      recordingHistoryMetadataRepository.saveRecordingMetadata(
        {
          ...createSheetRecording(),
          sessionId: "other-session"
        },
        createSheetSession()
      )
    ).rejects.toThrow("sessionId must match");
    await expect(
      recordingHistoryMetadataRepository.saveRecordingMetadata(
        {
          ...createSheetRecording(),
          sheetId: "other-sheet"
        },
        createSheetSession()
      )
    ).rejects.toThrow("sheetId must match");
    await expect(
      recordingHistoryMetadataRepository.saveRecordingMetadata(createSheetRecording(), {
        ...createSheetSession(),
        sourceType: "quick",
        sheetId: null
      })
    ).rejects.toThrow("requires a sheet practice session");
    expect(recordingHistoryRepository.getSnapshot().recordings).toEqual([]);
  });
});

function createSheetRecording(overrides: Partial<SheetRecordingMetadata> = {}): SheetRecordingMetadata {
  return {
    id: "sheet-metadata-1",
    type: "sheet",
    sessionId: "session-sheet-1",
    sheetId: "sheet-alpha",
    sheetName: "Alpha Sheet",
    createdAt: "2026-06-21T12:00:00.000Z",
    durationMs: 12_000,
    bpm: 96,
    timeSignature: "4/4",
    segmentContext: null,
    ...overrides
  };
}

function createReviewSheetRecording(
  overrides: MakeSheetReviewRecordingOverrides = {}
): ReviewRecording {
  return makeSheetReviewRecording(overrides, {
    defaults: {
      id: "sheet-recording-with-segment",
      name: "Alpha Sheet take",
      sessionId: "session-sheet-1",
      sheetName: "Alpha Sheet"
    },
    withArtifactRef: false
  });
}

function createQuickReviewRecording(
  overrides: MakeQuickReviewRecordingOverrides = {}
): ReviewRecording {
  return makeQuickReviewRecording(overrides, {
    defaults: {
      id: "quick-review-recording",
      name: "Quick review take",
      sessionId: "session-quick-1",
      createdAt: "2026-06-21T08:00:00.000Z",
      durationMs: 9_000,
      sizeBytes: 64
    },
    withArtifactRef: false
  });
}

function createTakeSelectionSnapshot(): RecordingReviewSnapshot {
  return {
    sessions: [],
    recordings: [
      createReviewSheetRecording({
        id: "sheet-segment-old",
        createdAt: "2026-06-21T09:00:00.000Z",
        segmentContext: createSegmentContext()
      }),
      createReviewSheetRecording({
        id: "sheet-segment-new",
        createdAt: "2026-06-21T12:00:00.000Z",
        segmentContext: createSegmentContext()
      }),
      createReviewSheetRecording({
        id: "sheet-whole-legacy",
        createdAt: "2026-06-21T10:00:00.000Z"
      }),
      createReviewSheetRecording({
        id: "sheet-whole-null",
        createdAt: "2026-06-21T11:00:00.000Z",
        segmentContext: null
      }),
      createQuickReviewRecording()
    ],
    errorMarkers: []
  };
}

function createSheetSession(overrides: Partial<PracticeSession> = {}): PracticeSession {
  const session: PracticeSession = {
    id: "session-sheet-1",
    sourceType: "sheet",
    sheetId: "sheet-alpha",
    startedAt: "2026-06-21T11:59:50.000Z",
    endedAt: null,
    durationMs: 12_000,
    bpm: 96,
    timeSignature: "4/4",
    recordingCount: 1,
    latestRecordingId: "sheet-metadata-1",
    updatedAt: "2026-06-21T12:00:00.000Z",
    ...overrides,
    segmentContext: overrides.segmentContext ?? null
  };

  return session;
}
