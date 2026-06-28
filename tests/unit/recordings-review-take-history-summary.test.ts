import { describe, expect, it } from "vitest";

import { createTakeHistorySummary } from "@/lib/recordings-review/take-history-summary";
import { groupRecordingsByTake } from "@/lib/recordings-review/take-groups";
import type {
  RecordingErrorMarker,
  RecordingTakeGroup,
  ResolvedRecordingTakeSelection,
  ReviewRecording
} from "@/lib/recordings-review/types";
import {
  makeSheetRecordingSegmentContext as createSegmentContext,
  makeSheetReviewRecording,
  type MakeSheetReviewRecordingOverrides
} from "./factories/recordings-review";

describe("createTakeHistorySummary", () => {
  it("uses take grouping for latest values and resolved metadata for best", () => {
    const group = createGroup([
      createSheetRecording({
        id: "older-best",
        name: "Older chosen take",
        createdAt: "2026-06-21T09:00:00.000Z",
        durationMs: 61_000
      }),
      createSheetRecording({
        id: "newer-latest",
        name: "Newest take",
        createdAt: "2026-06-21T12:00:00.000Z",
        durationMs: 12_000
      })
    ]);
    const summary = createTakeHistorySummary({
      group,
      selection: createResolvedSelection({
        group,
        bestRecording: group.recordings.find(
          (recording) => recording.id === "older-best"
        ) ?? null
      }),
      markers: [
        createMarker({ id: "marker-1", recordingId: "older-best" }),
        createMarker({ id: "marker-2", recordingId: "outside-group" })
      ]
    });

    expect(summary.takeCountLabel).toBe("2 takes");
    expect(summary.latestLabel).toContain("Newest take");
    expect(summary.bestLabel).toBe("Older chosen take");
    expect(summary.durationLabel).toBe("0:12");
    expect(summary.bpmLabel).toBe("96 BPM");
    expect(summary.timeSignatureLabel).toBe("4/4");
    expect(summary.markerLabel).toBe("1 marker");
    expect(summary.markerCount).toBe(1);
  });

  it("reports no best, no markers, and stale resolved metadata without inferring a take", () => {
    const group = createGroup([
      createSheetRecording({
        id: "latest",
        name: "Latest only",
        createdAt: "2026-06-21T12:00:00.000Z"
      })
    ]);
    const summary = createTakeHistorySummary({
      group,
      selection: createResolvedSelection({
        group,
        bestRecordingId: "missing-best",
        bestRecording: null
      }),
      markers: []
    });

    expect(summary.takeCountLabel).toBe("1 take");
    expect(summary.bestLabel).toBe("none");
    expect(summary.markerLabel).toBe("No markers");
  });

  it("uses the unknown latest date fallback when the latest recording has no valid createdAt", () => {
    const group = createGroup([
      createSheetRecording({
        id: "missing-date",
        name: "Undated take",
        createdAt: undefined as unknown as string
      })
    ]);
    const summary = createTakeHistorySummary({
      group,
      selection: createResolvedSelection({ group }),
      markers: []
    });

    expect(group.latestRecording.id).toBe("missing-date");
    expect(summary.latestLabel).toBe("Latest unknown date, Undated take");
    expect(summary.fields).toContainEqual({
      key: "latest",
      label: "Latest",
      value: "Latest unknown date, Undated take"
    });
  });

  it("shows mixed BPM and time signature labels based on the latest recording", () => {
    const group = createGroup([
      createSheetRecording({
        id: "older",
        createdAt: "2026-06-21T09:00:00.000Z",
        settings: {
          bpm: 88,
          timeSignature: "3/4"
        }
      }),
      createSheetRecording({
        id: "latest",
        createdAt: "2026-06-21T12:00:00.000Z",
        settings: {
          bpm: 96,
          timeSignature: "4/4"
        }
      })
    ]);
    const summary = createTakeHistorySummary({
      group,
      selection: createResolvedSelection({ group }),
      markers: []
    });

    expect(summary.bpmLabel).toBe("Mixed BPM, latest 96");
    expect(summary.timeSignatureLabel).toBe(
      "Mixed time signatures, latest 4/4"
    );
  });

  it("uses unavailable fallbacks for invalid latest metadata and missing marker data", () => {
    const group = createGroup([
      createSheetRecording({
        id: "invalid-latest",
        createdAt: "2026-06-21T12:00:00.000Z",
        durationMs: -1,
        settings: {
          bpm: Number.NaN,
          timeSignature:
            "   " as ReviewRecording["settings"]["timeSignature"]
        }
      })
    ]);
    const summary = createTakeHistorySummary({
      group,
      selection: createResolvedSelection({ group }),
      markers: null
    });

    expect(summary.durationLabel).toBe("Duration unavailable");
    expect(summary.bpmLabel).toBe("BPM unavailable");
    expect(summary.timeSignatureLabel).toBe("Time signature unavailable");
    expect(summary.markerLabel).toBe("Markers unavailable");
    expect(summary.markerCount).toBeNull();
  });

  it("does not generate scoring or correctness language", () => {
    const group = createGroup([
      createSheetRecording({
        id: "latest",
        createdAt: "2026-06-21T12:00:00.000Z"
      })
    ]);
    const summary = createTakeHistorySummary({
      group,
      selection: createResolvedSelection({ group }),
      markers: []
    });
    const generatedCopy = summary.fields
      .map((field) => `${field.label} ${field.value}`)
      .join(" ")
      .toLowerCase();

    expect(generatedCopy).not.toMatch(
      /score|accuracy|correct|best performance|cleanest|most accurate|recommended|improved|mistakes|timing quality/
    );
  });
});

function createGroup(recordings: ReviewRecording[]): RecordingTakeGroup {
  const group = groupRecordingsByTake(recordings).takeGroups[0];

  if (!group) {
    throw new Error("Expected a sheet take group.");
  }

  return group;
}

function createResolvedSelection({
  group,
  bestRecordingId = null,
  activeRecordingId = null,
  bestRecording = null,
  activeRecording = null
}: {
  group: RecordingTakeGroup;
  bestRecordingId?: string | null;
  activeRecordingId?: string | null;
  bestRecording?: ReviewRecording | null;
  activeRecording?: ReviewRecording | null;
}): ResolvedRecordingTakeSelection {
  return {
    groupId: group.groupId,
    sheetId: group.sheetId,
    segmentId: group.segmentId,
    bestRecordingId,
    activeRecordingId,
    updatedAt: null,
    bestRecording,
    activeRecording
  };
}

function createMarker({
  id,
  recordingId
}: {
  id: string;
  recordingId: string;
}): RecordingErrorMarker {
  return {
    id,
    recordingId,
    timestampMs: 1_000,
    note: null
  };
}

function createSheetRecording(
  overrides: MakeSheetReviewRecordingOverrides = {}
) {
  return makeSheetReviewRecording(overrides, {
    defaults: {
      segmentContext: createSegmentContext()
    },
    withArtifactRef: false
  });
}
