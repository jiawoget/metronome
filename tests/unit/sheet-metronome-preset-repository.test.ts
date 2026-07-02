import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  browserSheetMetronomePresetRepository,
  clearSheetMetronomePresetDatabaseForTests,
  parsePersistedSheetMetronomePresetRecord,
  resetSheetMetronomePresetDatabaseConnectionForTests,
  seedSheetMetronomePresetRecordForTests,
  setSheetMetronomePresetMalformedRowListenerForTests
} from "@/infrastructure/db/browser-sheet-metronome-preset-service";
import { SHEET_METRONOME_PRESET_DB_NAME } from "@/infrastructure/storage/storage-contracts";
import {
  buildSheetMetronomePreset,
  buildSheetMetronomePresetSettings,
  TEST_PRESET_UPDATED_AT
} from "./factories/sheet-metronome-presets";

function sortPresetsForComparison<
  T extends {
    sheetId: string;
    id: string;
  }
>(presets: T[]) {
  return [...presets].sort((left, right) => {
    const sheetComparison = left.sheetId.localeCompare(right.sheetId);

    return sheetComparison !== 0
      ? sheetComparison
      : left.id.localeCompare(right.id);
  });
}

describe("sheet metronome preset persisted row parsing", () => {
  it("returns safe absence for malformed parser inputs", () => {
    expect(parsePersistedSheetMetronomePresetRecord(null)).toBeNull();
    expect(parsePersistedSheetMetronomePresetRecord("bad-row")).toBeNull();
    expect(parsePersistedSheetMetronomePresetRecord([])).toBeNull();
    expect(parsePersistedSheetMetronomePresetRecord({})).toBeNull();
    expect(
      parsePersistedSheetMetronomePresetRecord({
        sheetId: "sheet-alpha",
        presetId: "preset-1",
        preset: buildSheetMetronomePreset({
          sheetId: "sheet-bravo"
        })
      })
    ).toBeNull();
  });
});

describe("sheet metronome preset browser repository", () => {
  beforeEach(async () => {
    await clearSheetMetronomePresetDatabaseForTests();
  });

  afterEach(() => {
    setSheetMetronomePresetMalformedRowListenerForTests(null);
    resetSheetMetronomePresetDatabaseConnectionForTests();
  });

  it("uses a dedicated storage contract DB name", () => {
    expect(SHEET_METRONOME_PRESET_DB_NAME).toBe(
      "metronome-practice-v1-sheet-metronome-presets"
    );
  });

  it("returns an empty list and null get for missing rows", async () => {
    const malformedRowListener = vi.fn();

    setSheetMetronomePresetMalformedRowListenerForTests(malformedRowListener);

    await expect(browserSheetMetronomePresetRepository.listPresets("sheet-alpha")).resolves.toEqual([]);
    await expect(
      browserSheetMetronomePresetRepository.getPreset("sheet-alpha", "preset-1")
    ).resolves.toBeNull();
    expect(malformedRowListener).not.toHaveBeenCalled();
  });

  it("persists one valid preset by trimmed sheet id", async () => {
    await browserSheetMetronomePresetRepository.savePreset(
      buildSheetMetronomePreset({
        id: "  preset-1  ",
        sheetId: "  sheet-alpha  ",
        name: "  Warmup  "
      })
    );

    await expect(
      browserSheetMetronomePresetRepository.getPreset("sheet-alpha", "preset-1")
    ).resolves.toEqual(buildSheetMetronomePreset({ name: "Warmup" }));
    await expect(browserSheetMetronomePresetRepository.listPresets("sheet-alpha")).resolves.toEqual([
      buildSheetMetronomePreset({ name: "Warmup" })
    ]);
  });

  it("isolates two sheets with overlapping preset ids", async () => {
    const otherSheetPreset = buildSheetMetronomePreset({
      sheetId: "sheet-bravo",
      name: "Other Sheet"
    });

    await browserSheetMetronomePresetRepository.savePreset(buildSheetMetronomePreset());
    await browserSheetMetronomePresetRepository.savePreset(otherSheetPreset);

    await expect(
      browserSheetMetronomePresetRepository.getPreset("sheet-alpha", "preset-1")
    ).resolves.toEqual(buildSheetMetronomePreset());
    await expect(
      browserSheetMetronomePresetRepository.getPreset("sheet-bravo", "preset-1")
    ).resolves.toEqual(otherSheetPreset);
  });

  it("keeps delimiter-collision ids distinct across CRUD and delete", async () => {
    const firstPreset = buildSheetMetronomePreset({
      id: "c",
      sheetId: "a::b",
      name: "First Collision"
    });
    const secondPreset = buildSheetMetronomePreset({
      id: "b::c",
      sheetId: "a",
      name: "Second Collision"
    });

    await browserSheetMetronomePresetRepository.savePreset(firstPreset);
    await browserSheetMetronomePresetRepository.savePreset(secondPreset);

    await expect(
      browserSheetMetronomePresetRepository.getPreset("a::b", "c")
    ).resolves.toEqual(firstPreset);
    await expect(
      browserSheetMetronomePresetRepository.getPreset("a", "b::c")
    ).resolves.toEqual(secondPreset);

    await browserSheetMetronomePresetRepository.deletePreset("a::b", "c");

    await expect(
      browserSheetMetronomePresetRepository.getPreset("a::b", "c")
    ).resolves.toBeNull();
    await expect(
      browserSheetMetronomePresetRepository.getPreset("a", "b::c")
    ).resolves.toEqual(secondPreset);
  });

  it("updates and replaces the same sheet and preset row", async () => {
    const updatedPreset = buildSheetMetronomePreset({
      name: "Bridge Focus",
      segmentId: "segment-bridge",
      settings: {
        bpm: 132,
        barCountIn: {
          enabled: true,
          bars: 2
        }
      }
    });

    await browserSheetMetronomePresetRepository.savePreset(buildSheetMetronomePreset());
    await browserSheetMetronomePresetRepository.savePreset(
      buildSheetMetronomePreset({
        sheetId: "sheet-bravo",
        name: "Other Sheet"
      })
    );
    await browserSheetMetronomePresetRepository.savePreset(updatedPreset);

    await expect(
      browserSheetMetronomePresetRepository.getPreset("sheet-alpha", "preset-1")
    ).resolves.toEqual(updatedPreset);
    await expect(
      browserSheetMetronomePresetRepository.getPreset("sheet-bravo", "preset-1")
    ).resolves.toEqual(
      buildSheetMetronomePreset({
        sheetId: "sheet-bravo",
        name: "Other Sheet"
      })
    );
  });

  it("deletes only the requested row and stays idempotent for a missing row", async () => {
    const keptPreset = buildSheetMetronomePreset({
      id: "preset-2"
    });

    await browserSheetMetronomePresetRepository.savePreset(buildSheetMetronomePreset());
    await browserSheetMetronomePresetRepository.savePreset(keptPreset);
    await browserSheetMetronomePresetRepository.savePreset(
      buildSheetMetronomePreset({
        sheetId: "sheet-bravo"
      })
    );

    await expect(
      browserSheetMetronomePresetRepository.deletePreset("sheet-alpha", "preset-1")
    ).resolves.toBeUndefined();
    await expect(
      browserSheetMetronomePresetRepository.deletePreset("sheet-alpha", "preset-missing")
    ).resolves.toBeUndefined();

    const remainingAlphaPresets =
      await browserSheetMetronomePresetRepository.listPresets("sheet-alpha");

    expect(sortPresetsForComparison(remainingAlphaPresets)).toEqual(
      sortPresetsForComparison([keptPreset])
    );
    await expect(
      browserSheetMetronomePresetRepository.getPreset("sheet-bravo", "preset-1")
    ).resolves.toEqual(
      buildSheetMetronomePreset({
        sheetId: "sheet-bravo"
      })
    );
  });

  it("filters malformed persisted rows from get and list and reports them to the test listener", async () => {
    const validPreset = buildSheetMetronomePreset();
    const malformedRowListener = vi.fn();

    setSheetMetronomePresetMalformedRowListenerForTests(malformedRowListener);

    await browserSheetMetronomePresetRepository.savePreset(validPreset);
    await seedSheetMetronomePresetRecordForTests("sheet-alpha", "preset-bad-sheet", {
      preset: buildSheetMetronomePreset({
        id: "preset-bad-sheet",
        sheetId: "sheet-bravo"
      }),
      updatedAt: TEST_PRESET_UPDATED_AT
    });
    await seedSheetMetronomePresetRecordForTests("sheet-alpha", "preset-bad-segment", {
      segmentId: "segment-1",
      preset: buildSheetMetronomePreset({
        id: "preset-bad-segment",
        sheetId: "sheet-alpha",
        segmentId: null
      }),
      updatedAt: TEST_PRESET_UPDATED_AT
    });

    await expect(
      browserSheetMetronomePresetRepository.getPreset("sheet-alpha", "preset-bad-sheet")
    ).resolves.toBeNull();
    await expect(
      browserSheetMetronomePresetRepository.getPreset("sheet-alpha", "preset-bad-segment")
    ).resolves.toBeNull();

    const sheetPresets = await browserSheetMetronomePresetRepository.listPresets(
      "sheet-alpha"
    );

    expect(sortPresetsForComparison(sheetPresets)).toEqual(
      sortPresetsForComparison([validPreset])
    );
    expect(malformedRowListener).toHaveBeenCalledTimes(4);
    expect(malformedRowListener).toHaveBeenNthCalledWith(1, {
      operation: "getPreset",
      sheetId: "sheet-alpha",
      presetId: "preset-bad-sheet",
      row: expect.objectContaining({
        sheetId: "sheet-alpha",
        presetId: "preset-bad-sheet"
      })
    });
    expect(malformedRowListener).toHaveBeenNthCalledWith(2, {
      operation: "getPreset",
      sheetId: "sheet-alpha",
      presetId: "preset-bad-segment",
      row: expect.objectContaining({
        sheetId: "sheet-alpha",
        presetId: "preset-bad-segment"
      })
    });
    expect(malformedRowListener.mock.calls.slice(2)).toEqual(
      expect.arrayContaining([
        [
          {
            operation: "listPresets",
            sheetId: "sheet-alpha",
            presetId: null,
            row: expect.objectContaining({
              sheetId: "sheet-alpha",
              presetId: "preset-bad-sheet"
            })
          }
        ],
        [
          {
            operation: "listPresets",
            sheetId: "sheet-alpha",
            presetId: null,
            row: expect.objectContaining({
              sheetId: "sheet-alpha",
              presetId: "preset-bad-segment"
            })
          }
        ]
      ])
    );
  });

  it("survives a Dexie connection reset and reload with all valid presets intact", async () => {
    const secondPreset = buildSheetMetronomePreset({
      id: "preset-2",
      name: "Second"
    });
    const segmentPreset = buildSheetMetronomePreset({
      id: "preset-3",
      segmentId: "segment-bridge",
      name: "Segment"
    });

    await browserSheetMetronomePresetRepository.savePreset(buildSheetMetronomePreset());
    await browserSheetMetronomePresetRepository.savePreset(secondPreset);
    await browserSheetMetronomePresetRepository.savePreset(segmentPreset);

    resetSheetMetronomePresetDatabaseConnectionForTests();

    const reloadedPresets =
      await browserSheetMetronomePresetRepository.listPresets("sheet-alpha");

    expect(sortPresetsForComparison(reloadedPresets)).toEqual(
      sortPresetsForComparison([
        buildSheetMetronomePreset(),
        secondPreset,
        segmentPreset
      ])
    );
  });

  it("rejects invalid sheet ids or preset ids for get, list, save, and delete", async () => {
    await expect(
      browserSheetMetronomePresetRepository.listPresets("   ")
    ).rejects.toThrow("sheetId is required.");
    await expect(
      browserSheetMetronomePresetRepository.getPreset("   ", "preset-1")
    ).rejects.toThrow("sheetId is required.");
    await expect(
      browserSheetMetronomePresetRepository.getPreset("sheet-alpha", "   ")
    ).rejects.toThrow("presetId is required.");
    await expect(
      browserSheetMetronomePresetRepository.savePreset(
        buildSheetMetronomePreset({
          sheetId: "   "
        })
      )
    ).rejects.toThrow("sheetId is required.");
    await expect(
      browserSheetMetronomePresetRepository.deletePreset("   ", "preset-1")
    ).rejects.toThrow("sheetId is required.");
    await expect(
      browserSheetMetronomePresetRepository.deletePreset("sheet-alpha", "   ")
    ).rejects.toThrow("presetId is required.");
  });

  it("preserves the prior valid row when a later write fails validation", async () => {
    await browserSheetMetronomePresetRepository.savePreset(buildSheetMetronomePreset());

    await expect(
      browserSheetMetronomePresetRepository.savePreset(
        buildSheetMetronomePreset({
          settings: {
            ...buildSheetMetronomePresetSettings(),
            countdownBeats: 12
          }
        })
      )
    ).rejects.toThrow();

    await expect(
      browserSheetMetronomePresetRepository.getPreset("sheet-alpha", "preset-1")
    ).resolves.toEqual(buildSheetMetronomePreset());
  });
});
