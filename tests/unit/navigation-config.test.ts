import { describe, expect, it } from "vitest";

import { getActiveNavItem, topLevelNavItems } from "@/lib/navigation";

describe("topLevelNavItems", () => {
  it("contains every v0 top-level route", () => {
    expect(topLevelNavItems.map((item) => [item.label, item.href])).toEqual([
      ["Home", "/"],
      ["Quick Metronome", "/quick-metronome"],
      ["Sheet Library", "/sheet-library"],
      ["Sheet Practice", "/sheet-practice"],
      ["Recordings", "/recordings"],
      ["Settings", "/settings"]
    ]);
  });

  it("maps nested and exact paths to the highlighted navigation item", () => {
    expect(getActiveNavItem("/")?.id).toBe("home");
    expect(getActiveNavItem("/quick-metronome")?.id).toBe("quick-metronome");
    expect(getActiveNavItem("/sheet-practice/demo-sheet")?.id).toBe("sheet-practice");
    expect(getActiveNavItem("/settings")?.id).toBe("settings");
    expect(getActiveNavItem("/unknown")).toBeUndefined();
  });
});
