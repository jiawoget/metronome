import { describe, expect, it } from "vitest";

import {
  getHomeCompatibleContinuePracticeTarget,
  selectContinuePracticeTargets,
  type HomeRecentActivityItem,
  type HomeRecentActivityKind,
  type HomeRecentActivityResult,
  type HomeRecentActivityTargetState
} from "@/domain/practice";

function createActivityItem(
  overrides: Partial<HomeRecentActivityItem> = {}
): HomeRecentActivityItem {
  const kind = overrides.kind ?? "sheet-session";
  const isQuick = kind === "quick-session";
  const isRecording = kind === "sheet-recording" || kind === "segment-recording";
  const isSegment = kind === "segment-session" || kind === "segment-recording";
  const occurredAt = overrides.occurredAt ?? "2026-06-21T12:00:00.000Z";

  return {
    id: `${isRecording ? "recording" : "session"}:${overrides.recordingId ?? overrides.sessionId ?? "alpha"}`,
    kind,
    occurredAt,
    sortTimestamp: overrides.sortTimestamp === undefined ? occurredAt : overrides.sortTimestamp,
    label: isQuick ? "Quick Practice" : isSegment ? "Bridge" : "Alpha Sheet",
    metadata: isSegment ? ["1m", "96 BPM", "4/4", "m5-12"] : ["1m", "96 BPM", "4/4"],
    targetState: isQuick ? "quick" : "valid",
    sessionId: isRecording ? "session-alpha" : "session-alpha",
    recordingId: isRecording ? "recording-alpha" : null,
    sheetId: isQuick ? null : "sheet-alpha",
    sheetName: isQuick ? null : "Alpha Sheet",
    segmentId: isSegment ? "segment-alpha" : null,
    segmentName: isSegment ? "Bridge" : null,
    durationMs: 60_000,
    bpm: 96,
    timeSignature: "4/4",
    disabledReason: null,
    ...overrides
  };
}

function createRecentActivity(items: HomeRecentActivityItem[]): HomeRecentActivityResult {
  return {
    items,
    generatedAt: "2026-06-21T12:30:00.000Z",
    limit: items.length
  };
}

describe("continue practice targets", () => {
  it("returns an empty bounded target list for empty recent activity", () => {
    const result = selectContinuePracticeTargets(createRecentActivity([]));

    expect(result).toEqual({
      targets: [],
      generatedAt: "2026-06-21T12:30:00.000Z",
      limit: 5,
      rejected: []
    });
  });

  it("builds href-free quick, sheet, and segment target identities", () => {
    const result = selectContinuePracticeTargets(
      createRecentActivity([
        createActivityItem({
          kind: "quick-session",
          sessionId: "quick-session",
          occurredAt: "2026-06-21T12:01:00.000Z"
        }),
        createActivityItem({
          kind: "sheet-recording",
          sessionId: "sheet-session",
          recordingId: "sheet-recording",
          occurredAt: "2026-06-21T12:02:00.000Z"
        }),
        createActivityItem({
          kind: "segment-session",
          sessionId: "segment-session",
          occurredAt: "2026-06-21T12:03:00.000Z"
        })
      ])
    );

    expect(result.targets.map((target) => [target.kind, target.targetKey])).toEqual([
      ["segment", "segment:sheet-alpha:segment-alpha"],
      ["sheet", "sheet:sheet-alpha"],
      ["quick", "quick"]
    ]);
    expect(result.targets[0]).toMatchObject({
      kind: "segment",
      sourceType: "sheet",
      sessionId: "segment-session",
      recordingId: null,
      sheetId: "sheet-alpha",
      sheetName: "Alpha Sheet",
      segmentId: "segment-alpha",
      segmentName: "Bridge",
      segmentRangeLabel: "m5-12"
    });
    expect(result.targets[0]).not.toHaveProperty("href");
    expect(result.rejected).toEqual([]);
  });

  it("deduplicates by target key, sorts equal timestamps by specificity, and applies the target limit", () => {
    const result = selectContinuePracticeTargets(
      createRecentActivity([
        createActivityItem({
          kind: "sheet-session",
          sessionId: "older-sheet",
          occurredAt: "2026-06-21T12:00:00.000Z"
        }),
        createActivityItem({
          kind: "quick-session",
          sessionId: "quick-session",
          occurredAt: "2026-06-21T12:02:00.000Z"
        }),
        createActivityItem({
          kind: "sheet-recording",
          sessionId: "newer-sheet-session",
          recordingId: "newer-sheet-recording",
          occurredAt: "2026-06-21T12:02:00.000Z"
        }),
        createActivityItem({
          kind: "segment-recording",
          sessionId: "segment-session",
          recordingId: "segment-recording",
          occurredAt: "2026-06-21T12:02:00.000Z"
        })
      ]),
      { limit: 2 }
    );

    expect(result.targets.map((target) => [target.kind, target.sessionId, target.recordingId])).toEqual([
      ["segment", "segment-session", "segment-recording"],
      ["sheet", "newer-sheet-session", "newer-sheet-recording"]
    ]);
    expect(result.limit).toBe(2);
  });

  it("sorts malformed sortTimestamp values after valid timestamps deterministically", () => {
    const result = selectContinuePracticeTargets(
      createRecentActivity([
        createActivityItem({
          kind: "sheet-session",
          sheetId: "sheet-malformed",
          sheetName: "Malformed Timestamp Sheet",
          sessionId: "malformed-session",
          occurredAt: "2026-06-21T12:05:00.000Z",
          sortTimestamp: "not-a-date"
        }),
        createActivityItem({
          kind: "sheet-session",
          sheetId: "sheet-valid",
          sheetName: "Valid Timestamp Sheet",
          sessionId: "valid-session",
          occurredAt: "2026-06-21T12:00:00.000Z",
          sortTimestamp: "2026-06-21T12:00:00.000Z"
        }),
        createActivityItem({
          kind: "sheet-session",
          sheetId: "sheet-malformed-alpha",
          sheetName: "Malformed Alpha Sheet",
          sessionId: "malformed-alpha-session",
          occurredAt: "2026-06-21T12:04:00.000Z",
          sortTimestamp: "also-not-a-date"
        })
      ])
    );

    expect(result.targets.map((target) => target.targetKey)).toEqual([
      "sheet:sheet-valid",
      "sheet:sheet-malformed",
      "sheet:sheet-malformed-alpha"
    ]);
  });

  it("rejects stale and malformed rows without downgrading missing segments to sheets", () => {
    const rows: Array<{
      id: string;
      kind: HomeRecentActivityKind;
      targetState: HomeRecentActivityTargetState;
      sheetId?: string | null;
      segmentId?: string | null;
    }> = [
      { id: "session:no-target", kind: "sheet-session", targetState: "no-target", sheetId: null },
      { id: "session:deleted-sheet", kind: "sheet-session", targetState: "missing-sheet" },
      {
        id: "session:missing-segment",
        kind: "segment-session",
        targetState: "missing-segment",
        segmentId: "segment-alpha"
      },
      {
        id: "recording:lookup-failed",
        kind: "segment-recording",
        targetState: "lookup-failed",
        segmentId: "segment-alpha"
      }
    ];
    const result = selectContinuePracticeTargets(
      createRecentActivity(
        rows.map((row) =>
          createActivityItem({
            ...row,
            label: "Stale target",
            disabledReason: "Target unavailable."
          })
        )
      )
    );

    expect(result.targets).toEqual([]);
    expect(result.rejected.map((target) => [target.id, target.reason, target.sheetId, target.segmentId])).toEqual([
      ["session:no-target", "no-target", null, null],
      ["session:deleted-sheet", "missing-sheet", "sheet-alpha", null],
      ["session:missing-segment", "missing-segment", "sheet-alpha", "segment-alpha"],
      ["recording:lookup-failed", "lookup-failed", "sheet-alpha", "segment-alpha"]
    ]);
  });

  it("keeps the current Home wrapper limited to quick and sheet targets", () => {
    const result = selectContinuePracticeTargets(
      createRecentActivity([
        createActivityItem({
          kind: "segment-session",
          sessionId: "segment-session",
          occurredAt: "2026-06-21T12:03:00.000Z"
        }),
        createActivityItem({
          kind: "sheet-session",
          sessionId: "sheet-session",
          occurredAt: "2026-06-21T12:02:00.000Z"
        })
      ])
    );

    expect(getHomeCompatibleContinuePracticeTarget(result.targets)).toEqual({
      sourceType: "sheet",
      href: "/sheet-practice/sheet-alpha",
      label: "Continue Sheet Practice",
      sessionId: "sheet-session",
      sheetId: "sheet-alpha"
    });
    expect(
      getHomeCompatibleContinuePracticeTarget(result.targets.filter((target) => target.kind === "segment"))
    ).toBeNull();
  });
});
