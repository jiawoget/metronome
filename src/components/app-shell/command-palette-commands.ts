import type { ContinuePracticeTargetIdentity } from "@/domain/practice";
import { topLevelNavItems, type TopLevelNavItem } from "@/lib/navigation";
import { getContinuePracticeTargetHref } from "@/components/home/continue-practice-navigation";

export type HomeCommandPaletteCommandKind = "route" | "continue-practice";

export type HomeCommandPaletteCommand = {
  id: string;
  kind: HomeCommandPaletteCommandKind;
  title: string;
  subtitle: string;
  href: string;
  keywords: string[];
  executionLabel: string;
};

export function buildHomeCommandPaletteCommands({
  routeItems = topLevelNavItems,
  continueTargets = []
}: {
  routeItems?: readonly TopLevelNavItem[];
  continueTargets?: readonly ContinuePracticeTargetIdentity[];
} = {}): HomeCommandPaletteCommand[] {
  return dedupeCommands([
    ...routeItems.map((item) => ({
      id: `route:${item.id}`,
      kind: "route" as const,
      title: item.label,
      subtitle: item.description,
      href: item.href,
      keywords: [
        item.id,
        item.label,
        item.shortLabel,
        item.description,
        item.href,
        "route",
        "navigation"
      ],
      executionLabel: `Open ${item.label}`
    })),
    ...continueTargets.flatMap((target) => {
      const href = getContinuePracticeTargetHref(target);

      if (!href) {
        return [];
      }

      return [buildContinuePracticeCommand(target, href)];
    })
  ]);
}

export function filterHomeCommandPaletteCommands(
  commands: readonly HomeCommandPaletteCommand[],
  query: string
) {
  const terms = normalizeSearchText(query).split(" ").filter(Boolean);

  if (terms.length === 0) {
    return [...commands];
  }

  return commands.filter((command) => {
    const haystack = normalizeSearchText([
      command.title,
      command.subtitle,
      command.kind,
      command.href,
      command.executionLabel,
      ...command.keywords
    ].join(" "));

    return terms.every((term) => haystack.includes(term));
  });
}

function buildContinuePracticeCommand(
  target: ContinuePracticeTargetIdentity,
  href: string
): HomeCommandPaletteCommand {
  switch (target.kind) {
    case "quick":
      return {
        id: `continue:${target.targetKey}`,
        kind: "continue-practice",
        title: "Quick practice",
        subtitle: "Continue quick practice",
        href,
        keywords: [
          target.label,
          target.targetKey,
          target.sessionId,
          target.kind,
          target.activitySource,
          "Continue quick practice",
          "continue",
          "quick",
          "metronome",
          "continue-practice"
        ].filter(isNonEmptyString),
        executionLabel: "Continue quick practice"
      };
    case "sheet": {
      const sheetName = normalizeLabel(target.sheetName) ?? "Sheet practice";

      return {
        id: `continue:${target.targetKey}`,
        kind: "continue-practice",
        title: sheetName,
        subtitle: "Continue sheet practice",
        href,
        keywords: [
          target.label,
          target.targetKey,
          target.kind,
          target.activitySource,
          target.sheetId,
          sheetName,
          target.sessionId,
          target.recordingId,
          "continue",
          "sheet",
          "sheet practice",
          "continue-practice"
        ].filter(isNonEmptyString),
        executionLabel: `Continue sheet practice: ${sheetName}`
      };
    }
    case "segment": {
      const segmentName = normalizeLabel(target.segmentName) ?? "Saved segment";
      const sheetName = normalizeLabel(target.sheetName);
      const rangeLabel = normalizeLabel(target.segmentRangeLabel);
      const subtitleParts = [sheetName ?? "Sheet practice", rangeLabel].filter(isNonEmptyString);

      return {
        id: `continue:${target.targetKey}`,
        kind: "continue-practice",
        title: segmentName,
        subtitle: subtitleParts.join(" - "),
        href,
        keywords: [
          target.label,
          target.targetKey,
          target.kind,
          target.activitySource,
          target.sheetId,
          target.sheetName,
          target.segmentId,
          target.segmentName,
          segmentName,
          sheetName,
          rangeLabel,
          target.sessionId,
          target.recordingId,
          "continue",
          "segment",
          "saved segment",
          "sheet practice",
          "continue-practice"
        ].filter(isNonEmptyString),
        executionLabel: `Continue segment practice: ${segmentName}`
      };
    }
  }
}

function dedupeCommands(commands: HomeCommandPaletteCommand[]) {
  const seenIds = new Set<string>();
  const deduped: HomeCommandPaletteCommand[] = [];

  for (const command of commands) {
    if (seenIds.has(command.id)) {
      continue;
    }

    seenIds.add(command.id);
    deduped.push(command);
  }

  return deduped;
}

function normalizeLabel(value: string | null) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeSearchText(value: string) {
  return value.toLocaleLowerCase().replace(/\s+/g, " ").trim();
}
