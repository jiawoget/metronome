import { describe, expect, it } from "vitest";

import {
  createMetronomeControlStateFromPreset,
  createSheetMetronomePresetSettingsSnapshot,
  parseSheetMetronomePreset,
  parseSheetMetronomePresetSettings,
  validateSheetMetronomePreset
} from "@/domain/practice";
import {
  buildSheetMetronomePreset,
  buildSheetMetronomePresetSettings
} from "./factories/sheet-metronome-presets";

describe("sheet metronome preset domain", () => {
  it("validates a complete sheet-wide preset and trims ids and name", () => {
    expect(
      validateSheetMetronomePreset(
        buildSheetMetronomePreset({
          id: "  preset-1  ",
          sheetId: "  sheet-alpha  ",
          segmentId: "   ",
          name: "  Default Practice  "
        })
      )
    ).toEqual(buildSheetMetronomePreset());
  });

  it("validates a complete segment-scoped preset", () => {
    expect(
      validateSheetMetronomePreset(
        buildSheetMetronomePreset({
          segmentId: "  segment-bridge  "
        })
      )
    ).toEqual(
      buildSheetMetronomePreset({
        segmentId: "segment-bridge"
      })
    );
  });

  it.each([
    {
      name: "blank preset id",
      preset: buildSheetMetronomePreset({ id: "   " })
    },
    {
      name: "blank sheet id",
      preset: buildSheetMetronomePreset({ sheetId: "   " })
    },
    {
      name: "blank preset name",
      preset: buildSheetMetronomePreset({ name: "   " })
    },
    {
      name: "invalid createdAt",
      preset: buildSheetMetronomePreset({ createdAt: "2026-02-30T00:00:00.000Z" })
    },
    {
      name: "invalid updatedAt",
      preset: buildSheetMetronomePreset({ updatedAt: "not-a-date" })
    },
    {
      name: "invalid bpm",
      preset: buildSheetMetronomePreset({
        settings: {
          bpm: 29
        }
      })
    },
    {
      name: "unsupported time signature",
      preset: buildSheetMetronomePreset({
        settings: {
          timeSignature: "5/4" as never
        }
      })
    },
    {
      name: "invalid subdivision",
      preset: buildSheetMetronomePreset({
        settings: {
          subdivision: "swing" as never
        }
      })
    },
    {
      name: "invalid accent",
      preset: buildSheetMetronomePreset({
        settings: {
          accent: "ghost" as never
        }
      })
    },
    {
      name: "invalid countdown beats",
      preset: buildSheetMetronomePreset({
        settings: {
          countdownBeats: 6
        }
      })
    },
    {
      name: "invalid bar-count-in bars",
      preset: buildSheetMetronomePreset({
        settings: {
          barCountIn: {
            enabled: true,
            bars: 3 as never
          }
        }
      })
    }
  ])("rejects $name", ({ preset }) => {
    expect(() => validateSheetMetronomePreset(preset)).toThrow();
  });

  it("creates a preset settings snapshot from current metronome settings and bar-count-in state", () => {
    expect(
      createSheetMetronomePresetSettingsSnapshot({
        settings: {
          bpm: 120.4,
          timeSignature: "4/4",
          subdivision: "eighth",
          accent: "every-beat",
          countdownBeats: 8
        },
        barCountIn: {
          enabled: true,
          bars: 2
        }
      })
    ).toEqual(
      buildSheetMetronomePresetSettings({
        bpm: 120,
        subdivision: "eighth",
        accent: "every-beat",
        countdownBeats: 8,
        barCountIn: {
          enabled: true,
          bars: 2
        }
      })
    );
  });

  it("converts preset settings back to metronome control state without mutating the input", () => {
    const presetSettings = buildSheetMetronomePresetSettings({
      bpm: 132,
      subdivision: "sixteenth",
      accent: "off",
      countdownBeats: 16,
      barCountIn: {
        enabled: true,
        bars: 2
      }
    });

    expect(createMetronomeControlStateFromPreset(presetSettings)).toEqual({
      settings: {
        bpm: 132,
        timeSignature: "4/4",
        subdivision: "sixteenth",
        accent: "off",
        countdownBeats: 16
      },
      barCountIn: {
        enabled: true,
        bars: 2
      }
    });
    expect(presetSettings).toEqual(
      buildSheetMetronomePresetSettings({
        bpm: 132,
        subdivision: "sixteenth",
        accent: "off",
        countdownBeats: 16,
        barCountIn: {
          enabled: true,
          bars: 2
        }
      })
    );
  });

  it("returns safe absence for malformed preset data", () => {
    expect(parseSheetMetronomePreset(null)).toBeNull();
    expect(parseSheetMetronomePreset("bad-row")).toBeNull();
    expect(parseSheetMetronomePreset([])).toBeNull();
    expect(
      parseSheetMetronomePreset({
        ...buildSheetMetronomePreset(),
        settings: {
          ...buildSheetMetronomePresetSettings(),
          countdownBeats: 12
        }
      })
    ).toBeNull();
    expect(
      parseSheetMetronomePresetSettings({
        ...buildSheetMetronomePresetSettings(),
        barCountIn: {
          enabled: true,
          bars: 4
        }
      })
    ).toBeNull();
  });
});
