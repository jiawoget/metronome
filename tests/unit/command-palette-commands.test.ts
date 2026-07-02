import { describe, expect, it } from "vitest";
import { Home } from "lucide-react";

import {
  buildHomeCommandPaletteCommands,
  filterHomeCommandPaletteCommands
} from "@/components/app-shell/command-palette-commands";
import { selectContinuePracticeTargets, type ContinuePracticeTargetIdentity } from "@/domain/practice";
import { topLevelNavItems, type TopLevelNavItem } from "@/lib/navigation";

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

describe("home command palette commands", () => {
  it("builds route commands from the injected top-level navigation source", () => {
    const customRoutes: TopLevelNavItem[] = [
      {
        id: "home",
        label: "Custom Home",
        shortLabel: "Custom",
        href: "/custom-home",
        description: "Custom dashboard route",
        icon: Home
      }
    ];

    const commands = buildHomeCommandPaletteCommands({
      routeItems: customRoutes,
      continueTargets: []
    });

    expect(commands).toEqual([
      expect.objectContaining({
        id: "route:home",
        kind: "route",
        title: "Custom Home",
        subtitle: "Custom dashboard route",
        href: "/custom-home",
        keywords: expect.arrayContaining(["Custom Home", "Custom", "Custom dashboard route", "route"])
      })
    ]);
  });

  it("keeps the current route command snapshot aligned with topLevelNavItems", () => {
    const commands = buildHomeCommandPaletteCommands({
      routeItems: topLevelNavItems,
      continueTargets: []
    });

    expect(commands.map((command) => [command.id, command.title, command.href])).toEqual(
      topLevelNavItems.map((item) => [`route:${item.id}`, item.label, item.href])
    );
  });

  it("builds valid quick, sheet, and segment Continue Practice commands with hrefs from P3-09", () => {
    const commands = buildHomeCommandPaletteCommands({
      routeItems: [],
      continueTargets: [
        createTarget(),
        createTarget({
          kind: "sheet",
          sourceType: "sheet",
          targetKey: "sheet:alpha sheet",
          sheetId: "alpha sheet",
          sheetName: "Alpha Sheet"
        }),
        createTarget({
          kind: "segment",
          sourceType: "sheet",
          targetKey: "segment:alpha sheet:bridge segment",
          sheetId: "alpha sheet",
          sheetName: "Alpha Sheet",
          segmentId: "bridge segment",
          segmentName: "Bridge Focus",
          segmentRangeLabel: "m5-8"
        })
      ]
    });

    expect(commands).toEqual([
      expect.objectContaining({
        id: "continue:quick",
        kind: "continue-practice",
        title: "Quick practice",
        href: "/quick-metronome",
        keywords: expect.arrayContaining(["Continue quick practice", "quick"])
      }),
      expect.objectContaining({
        id: "continue:sheet:alpha sheet",
        kind: "continue-practice",
        title: "Alpha Sheet",
        href: "/sheet-practice/alpha%20sheet",
        keywords: expect.arrayContaining(["Alpha Sheet", "alpha sheet"])
      }),
      expect.objectContaining({
        id: "continue:segment:alpha sheet:bridge segment",
        kind: "continue-practice",
        title: "Bridge Focus",
        subtitle: expect.stringContaining("Alpha Sheet"),
        href: "/sheet-practice?sheetId=alpha+sheet&segmentId=bridge+segment",
        keywords: expect.arrayContaining(["Bridge Focus", "Alpha Sheet", "m5-8"])
      })
    ]);
  });

  it("omits targets without valid hrefs and does not downgrade malformed segments to sheet routes", () => {
    const commands = buildHomeCommandPaletteCommands({
      routeItems: [],
      continueTargets: [
        createTarget({
          kind: "sheet",
          sourceType: "sheet",
          targetKey: "sheet:missing-id",
          sheetId: " ",
          sheetName: "Missing Sheet"
        }),
        createTarget({
          kind: "segment",
          sourceType: "sheet",
          targetKey: "segment:missing-segment",
          sheetId: "alpha-sheet",
          sheetName: "Alpha Sheet",
          segmentId: " ",
          segmentName: "Bridge Focus",
          segmentRangeLabel: "m5-8"
        })
      ]
    });

    expect(commands).toEqual([]);
  });

  it("omits stale targets rejected by the Continue Practice selector", () => {
    const selected = selectContinuePracticeTargets({
      generatedAt: "2026-06-21T12:30:00.000Z",
      limit: 1,
      items: [
        {
          id: "session:missing-segment",
          kind: "segment-session",
          occurredAt: "2026-06-21T12:00:00.000Z",
          sortTimestamp: "2026-06-21T12:00:00.000Z",
          label: "Bridge Focus",
          metadata: ["m5-8"],
          targetState: "missing-segment",
          sessionId: "session-alpha",
          recordingId: null,
          sheetId: "alpha-sheet",
          sheetName: "Alpha Sheet",
          segmentId: "bridge-segment",
          segmentName: "Bridge Focus",
          durationMs: 60_000,
          bpm: 96,
          timeSignature: "4/4",
          disabledReason: "Segment no longer exists."
        }
      ]
    });

    const commands = buildHomeCommandPaletteCommands({
      routeItems: [],
      continueTargets: selected.targets
    });

    expect(selected.rejected).toHaveLength(1);
    expect(commands).toEqual([]);
  });

  it("namespaces command ids so route and target keys cannot collide", () => {
    const commands = buildHomeCommandPaletteCommands({
      routeItems: topLevelNavItems,
      continueTargets: [
        createTarget({
          kind: "sheet",
          sourceType: "sheet",
          targetKey: "route:settings",
          sheetId: "settings",
          sheetName: "Settings Etude"
        })
      ]
    });
    const ids = commands.map((command) => command.id);

    expect(ids).toContain("route:settings");
    expect(ids).toContain("continue:route:settings");
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("filters case-insensitively by route and target labels, descriptions, kinds, and metadata", () => {
    const commands = buildHomeCommandPaletteCommands({
      routeItems: topLevelNavItems,
      continueTargets: [
        createTarget({
          kind: "segment",
          sourceType: "sheet",
          targetKey: "segment:alpha:bridge",
          sheetId: "alpha",
          sheetName: "Alpha Sheet",
          segmentId: "bridge",
          segmentName: "Bridge Focus",
          segmentRangeLabel: "m5-8"
        })
      ]
    });

    expect(filterHomeCommandPaletteCommands(commands, "recording review").map((command) => command.id)).toEqual([
      "route:recordings"
    ]);
    expect(filterHomeCommandPaletteCommands(commands, "sheets").map((command) => command.id)).toContain(
      "route:sheet-library"
    );
    expect(filterHomeCommandPaletteCommands(commands, "continue-practice").map((command) => command.id)).toEqual([
      "continue:segment:alpha:bridge"
    ]);
    expect(filterHomeCommandPaletteCommands(commands, "alpha sheet").map((command) => command.id)).toEqual([
      "continue:segment:alpha:bridge"
    ]);
    expect(filterHomeCommandPaletteCommands(commands, "M5-8").map((command) => command.id)).toEqual([
      "continue:segment:alpha:bridge"
    ]);
  });

  it("returns route commands before Continue Practice commands for an empty query", () => {
    const commands = buildHomeCommandPaletteCommands({
      routeItems: topLevelNavItems.slice(0, 2),
      continueTargets: [createTarget()]
    });

    expect(filterHomeCommandPaletteCommands(commands, "").map((command) => command.id)).toEqual([
      "route:home",
      "route:quick-metronome",
      "continue:quick"
    ]);
  });
});
