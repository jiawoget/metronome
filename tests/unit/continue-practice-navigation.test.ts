import { describe, expect, it } from "vitest";

import { getContinuePracticeTargetHref } from "@/components/home/continue-practice-navigation";
import type { ContinuePracticeTargetIdentity } from "@/domain/practice";

function createTarget(
  overrides: Partial<ContinuePracticeTargetIdentity> = {}
): ContinuePracticeTargetIdentity {
  const base: ContinuePracticeTargetIdentity = {
    kind: "quick",
    sourceType: "quick",
    activitySource: "session",
    label: "Quick Practice",
    sessionId: "quick-session",
    recordingId: null,
    occurredAt: "2026-06-21T12:00:00.000Z",
    sortTimestamp: "2026-06-21T12:00:00.000Z",
    targetKey: "quick"
  };

  return {
    ...base,
    ...overrides
  } as ContinuePracticeTargetIdentity;
}

describe("continue practice navigation", () => {
  it("routes quick targets to Quick Metronome", () => {
    expect(getContinuePracticeTargetHref(createTarget())).toBe("/quick-metronome");
  });

  it("routes sheet targets with the existing Sheet Practice path helper", () => {
    expect(
      getContinuePracticeTargetHref(
        createTarget({
          kind: "sheet",
          sourceType: "sheet",
          targetKey: "sheet:sheet alpha",
          sheetId: "sheet alpha",
          sheetName: "Alpha Sheet"
        })
      )
    ).toBe("/sheet-practice/sheet%20alpha");
  });

  it("routes segment targets with the existing Sheet Practice query helper", () => {
    expect(
      getContinuePracticeTargetHref(
        createTarget({
          kind: "segment",
          sourceType: "sheet",
          targetKey: "segment:sheet/alpha:segment bridge",
          sheetId: "sheet/alpha",
          sheetName: "Alpha Sheet",
          segmentId: "segment bridge",
          segmentName: "Bridge",
          segmentRangeLabel: "m5-8"
        })
      )
    ).toBe("/sheet-practice?sheetId=sheet%2Falpha&segmentId=segment+bridge");
  });

  it("returns null for missing ids without downgrading segment targets to sheet routes", () => {
    expect(
      getContinuePracticeTargetHref(
        createTarget({
          kind: "sheet",
          sourceType: "sheet",
          targetKey: "sheet:missing",
          sheetId: " ",
          sheetName: null
        })
      )
    ).toBeNull();

    expect(
      getContinuePracticeTargetHref(
        createTarget({
          kind: "segment",
          sourceType: "sheet",
          targetKey: "segment:missing",
          sheetId: "sheet-alpha",
          sheetName: "Alpha Sheet",
          segmentId: " ",
          segmentName: "Bridge",
          segmentRangeLabel: "m5-8"
        })
      )
    ).toBeNull();
  });
});
