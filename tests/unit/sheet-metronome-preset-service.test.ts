import { describe, expect, it, vi } from "vitest";

import type { SheetMetronomePreset } from "@/domain/practice";
import {
  createSheetMetronomePresetService,
  DUPLICATE_SHEET_METRONOME_PRESET_NAME_ERROR_MESSAGE,
  MISSING_SHEET_METRONOME_PRESET_ERROR_MESSAGE,
  type SheetMetronomePresetRepository
} from "@/services/sheet-metronome-presets";
import {
  buildSheetMetronomePreset,
  buildSheetMetronomePresetSettings,
  TEST_PRESET_CREATED_AT
} from "./factories/sheet-metronome-presets";

function createMemorySheetMetronomePresetRepository(
  initialPresets: SheetMetronomePreset[] = []
): SheetMetronomePresetRepository {
  const presets = new Map<string, Map<string, SheetMetronomePreset>>();

  for (const preset of initialPresets) {
    const sheetPresets =
      presets.get(preset.sheetId) ?? new Map<string, SheetMetronomePreset>();

    sheetPresets.set(preset.id, preset);
    presets.set(preset.sheetId, sheetPresets);
  }

  return {
    async listPresets(sheetId) {
      return Array.from(presets.get(sheetId)?.values() ?? []);
    },
    async getPreset(sheetId, presetId) {
      return presets.get(sheetId)?.get(presetId) ?? null;
    },
    async savePreset(preset) {
      const sheetPresets =
        presets.get(preset.sheetId) ?? new Map<string, SheetMetronomePreset>();

      sheetPresets.set(preset.id, preset);
      presets.set(preset.sheetId, sheetPresets);
    },
    async deletePreset(sheetId, presetId) {
      const sheetPresets = presets.get(sheetId);

      if (!sheetPresets) {
        return;
      }

      sheetPresets.delete(presetId);

      if (sheetPresets.size === 0) {
        presets.delete(sheetId);
      }
    }
  };
}

describe("sheet metronome preset service", () => {
  it("returns empty list, null get, and missing load for a valid sheet with no presets", async () => {
    const service = createSheetMetronomePresetService({
      repository: createMemorySheetMetronomePresetRepository()
    });

    await expect(service.listPresets("sheet-alpha")).resolves.toEqual([]);
    await expect(service.getPreset("sheet-alpha", "preset-1")).resolves.toBeNull();
    await expect(service.loadPreset("sheet-alpha", "preset-1")).resolves.toEqual({
      status: "missing"
    });
  });

  it("saves and returns a validated preset with generated id and timestamps when id is omitted", async () => {
    const service = createSheetMetronomePresetService({
      repository: createMemorySheetMetronomePresetRepository(),
      now: () => new Date(TEST_PRESET_CREATED_AT),
      createId: () => "preset-generated"
    });

    await expect(
      service.savePreset({
        sheetId: "  sheet-alpha  ",
        segmentId: "   ",
        name: "  Warmup  ",
        settings: buildSheetMetronomePresetSettings()
      })
    ).resolves.toEqual(
      buildSheetMetronomePreset({
        id: "preset-generated",
        name: "Warmup",
        createdAt: TEST_PRESET_CREATED_AT,
        updatedAt: TEST_PRESET_CREATED_AT
      })
    );
  });

  it("replaces an existing preset for the same sheet and id while preserving createdAt and updating updatedAt", async () => {
    const repository = createMemorySheetMetronomePresetRepository([
      buildSheetMetronomePreset({
        createdAt: TEST_PRESET_CREATED_AT,
        updatedAt: TEST_PRESET_CREATED_AT
      })
    ]);
    const service = createSheetMetronomePresetService({
      repository,
      now: () => new Date("2026-07-02T09:45:00.000Z")
    });

    await expect(
      service.savePreset({
        id: "preset-1",
        sheetId: "sheet-alpha",
        segmentId: "segment-bridge",
        name: "Bridge Focus",
        settings: buildSheetMetronomePresetSettings({
          bpm: 132,
          barCountIn: {
            enabled: true,
            bars: 2
          }
        })
      })
    ).resolves.toEqual(
      buildSheetMetronomePreset({
        segmentId: "segment-bridge",
        name: "Bridge Focus",
        settings: buildSheetMetronomePresetSettings({
          bpm: 132,
          barCountIn: {
            enabled: true,
            bars: 2
          }
        }),
        createdAt: TEST_PRESET_CREATED_AT,
        updatedAt: "2026-07-02T09:45:00.000Z"
      })
    );
  });

  it("renames an existing preset and rejects rename of a missing preset", async () => {
    const service = createSheetMetronomePresetService({
      repository: createMemorySheetMetronomePresetRepository([
        buildSheetMetronomePreset()
      ]),
      now: () => new Date("2026-07-02T10:00:00.000Z")
    });

    await expect(
      service.renamePreset({
        sheetId: "sheet-alpha",
        presetId: "preset-1",
        name: "  Session Ready  "
      })
    ).resolves.toEqual(
      buildSheetMetronomePreset({
        name: "Session Ready",
        updatedAt: "2026-07-02T10:00:00.000Z"
      })
    );
    await expect(
      service.renamePreset({
        sheetId: "sheet-alpha",
        presetId: "preset-missing",
        name: "Missing"
      })
    ).rejects.toThrow(MISSING_SHEET_METRONOME_PRESET_ERROR_MESSAGE);
  });

  it("filters list results by all presets, sheet-wide only, and a specific segment, then sorts by updatedAt descending and name ascending", async () => {
    const service = createSheetMetronomePresetService({
      repository: createMemorySheetMetronomePresetRepository([
        buildSheetMetronomePreset({
          id: "preset-c",
          name: "Zeta",
          updatedAt: "2026-07-02T10:00:00.000Z"
        }),
        buildSheetMetronomePreset({
          id: "preset-a",
          name: "Alpha",
          segmentId: "segment-bridge",
          updatedAt: "2026-07-02T11:00:00.000Z"
        }),
        buildSheetMetronomePreset({
          id: "preset-b",
          name: "Bravo",
          updatedAt: "2026-07-02T11:00:00.000Z"
        }),
        buildSheetMetronomePreset({
          id: "preset-d",
          sheetId: "sheet-bravo",
          name: "Other Sheet"
        })
      ])
    });

    await expect(service.listPresets("sheet-alpha")).resolves.toEqual([
      buildSheetMetronomePreset({
        id: "preset-a",
        name: "Alpha",
        segmentId: "segment-bridge",
        updatedAt: "2026-07-02T11:00:00.000Z"
      }),
      buildSheetMetronomePreset({
        id: "preset-b",
        name: "Bravo",
        updatedAt: "2026-07-02T11:00:00.000Z"
      }),
      buildSheetMetronomePreset({
        id: "preset-c",
        name: "Zeta",
        updatedAt: "2026-07-02T10:00:00.000Z"
      })
    ]);
    await expect(
      service.listPresets("sheet-alpha", { segmentId: null })
    ).resolves.toEqual([
      buildSheetMetronomePreset({
        id: "preset-b",
        name: "Bravo",
        updatedAt: "2026-07-02T11:00:00.000Z"
      }),
      buildSheetMetronomePreset({
        id: "preset-c",
        name: "Zeta",
        updatedAt: "2026-07-02T10:00:00.000Z"
      })
    ]);
    await expect(
      service.listPresets("sheet-alpha", { segmentId: "segment-bridge" })
    ).resolves.toEqual([
      buildSheetMetronomePreset({
        id: "preset-a",
        name: "Alpha",
        segmentId: "segment-bridge",
        updatedAt: "2026-07-02T11:00:00.000Z"
      })
    ]);
  });

  it("rejects duplicate names within the same sheet and segment scope", async () => {
    const service = createSheetMetronomePresetService({
      repository: createMemorySheetMetronomePresetRepository([
        buildSheetMetronomePreset({ name: "Bridge", segmentId: "segment-1" })
      ]),
      now: () => new Date("2026-07-02T11:00:00.000Z")
    });

    await expect(
      service.savePreset({
        id: "preset-2",
        sheetId: "sheet-alpha",
        segmentId: "segment-1",
        name: "  bridge  ",
        settings: buildSheetMetronomePresetSettings()
      })
    ).rejects.toThrow(DUPLICATE_SHEET_METRONOME_PRESET_NAME_ERROR_MESSAGE);
    await expect(
      service.renamePreset({
        sheetId: "sheet-alpha",
        presetId: "preset-1",
        name: " bridge "
      })
    ).resolves.toEqual(
      buildSheetMetronomePreset({
        name: "bridge",
        segmentId: "segment-1",
        updatedAt: "2026-07-02T11:00:00.000Z"
      })
    );
  });

  it("allows duplicate names across sheets, across segments, and between sheet-wide and segment-specific scopes", async () => {
    const service = createSheetMetronomePresetService({
      repository: createMemorySheetMetronomePresetRepository([
        buildSheetMetronomePreset({ name: "Bridge", segmentId: null })
      ]),
      now: () => new Date("2026-07-02T11:30:00.000Z")
    });

    await expect(
      service.savePreset({
        id: "preset-2",
        sheetId: "sheet-alpha",
        segmentId: "segment-1",
        name: "bridge",
        settings: buildSheetMetronomePresetSettings()
      })
    ).resolves.toEqual(
      buildSheetMetronomePreset({
        id: "preset-2",
        name: "bridge",
        segmentId: "segment-1",
        createdAt: "2026-07-02T11:30:00.000Z",
        updatedAt: "2026-07-02T11:30:00.000Z"
      })
    );
    await expect(
      service.savePreset({
        id: "preset-3",
        sheetId: "sheet-bravo",
        segmentId: null,
        name: "bridge",
        settings: buildSheetMetronomePresetSettings()
      })
    ).resolves.toEqual(
      buildSheetMetronomePreset({
        id: "preset-3",
        sheetId: "sheet-bravo",
        name: "bridge",
        createdAt: "2026-07-02T11:30:00.000Z",
        updatedAt: "2026-07-02T11:30:00.000Z"
      })
    );
    await expect(
      service.savePreset({
        id: "preset-4",
        sheetId: "sheet-alpha",
        segmentId: "segment-2",
        name: "bridge",
        settings: buildSheetMetronomePresetSettings()
      })
    ).resolves.toEqual(
      buildSheetMetronomePreset({
        id: "preset-4",
        name: "bridge",
        segmentId: "segment-2",
        createdAt: "2026-07-02T11:30:00.000Z",
        updatedAt: "2026-07-02T11:30:00.000Z"
      })
    );
  });

  it("rejects invalid ids before touching the repository", async () => {
    const repository: SheetMetronomePresetRepository = {
      listPresets: vi.fn(async () => []),
      getPreset: vi.fn(async () => null),
      savePreset: vi.fn(async () => undefined),
      deletePreset: vi.fn(async () => undefined)
    };
    const service = createSheetMetronomePresetService({
      repository
    });

    await expect(service.listPresets("   ")).rejects.toThrow("sheetId is required.");
    await expect(service.getPreset("sheet-alpha", "   ")).rejects.toThrow(
      "presetId is required."
    );
    await expect(service.deletePreset("sheet-alpha", "   ")).rejects.toThrow(
      "presetId is required."
    );
    expect(repository.listPresets).not.toHaveBeenCalled();
    expect(repository.getPreset).not.toHaveBeenCalled();
    expect(repository.deletePreset).not.toHaveBeenCalled();
  });

  it("rejects blank save names before touching the repository", async () => {
    const repository: SheetMetronomePresetRepository = {
      listPresets: vi.fn(async () => []),
      getPreset: vi.fn(async () => null),
      savePreset: vi.fn(async () => undefined),
      deletePreset: vi.fn(async () => undefined)
    };
    const service = createSheetMetronomePresetService({
      repository
    });

    await expect(
      service.savePreset({
        id: "preset-1",
        sheetId: "sheet-alpha",
        name: "   ",
        settings: buildSheetMetronomePresetSettings()
      })
    ).rejects.toThrow("Preset name is required.");
    expect(repository.getPreset).not.toHaveBeenCalled();
    expect(repository.listPresets).not.toHaveBeenCalled();
    expect(repository.savePreset).not.toHaveBeenCalled();
  });

  it("rejects invalid save settings before touching the repository", async () => {
    const repository: SheetMetronomePresetRepository = {
      listPresets: vi.fn(async () => []),
      getPreset: vi.fn(async () => null),
      savePreset: vi.fn(async () => undefined),
      deletePreset: vi.fn(async () => undefined)
    };
    const service = createSheetMetronomePresetService({
      repository
    });

    await expect(
      service.savePreset({
        id: "preset-1",
        sheetId: "sheet-alpha",
        name: "Warmup",
        settings: buildSheetMetronomePresetSettings({
          countdownBeats: 12
        })
      })
    ).rejects.toThrow();
    expect(repository.getPreset).not.toHaveBeenCalled();
    expect(repository.listPresets).not.toHaveBeenCalled();
    expect(repository.savePreset).not.toHaveBeenCalled();
  });

  it("rejects blank rename names before touching repository reads", async () => {
    const repository: SheetMetronomePresetRepository = {
      listPresets: vi.fn(async () => []),
      getPreset: vi.fn(async () => buildSheetMetronomePreset()),
      savePreset: vi.fn(async () => undefined),
      deletePreset: vi.fn(async () => undefined)
    };
    const service = createSheetMetronomePresetService({
      repository
    });

    await expect(
      service.renamePreset({
        sheetId: "sheet-alpha",
        presetId: "preset-1",
        name: "   "
      })
    ).rejects.toThrow("Preset name is required.");
    expect(repository.getPreset).not.toHaveBeenCalled();
    expect(repository.listPresets).not.toHaveBeenCalled();
    expect(repository.savePreset).not.toHaveBeenCalled();
  });

  it("propagates repository storage failures", async () => {
    const service = createSheetMetronomePresetService({
      repository: {
        listPresets: vi.fn(async () => []),
        getPreset: vi.fn(async () => null),
        savePreset: vi.fn(async () => {
          throw new Error("write failed");
        }),
        deletePreset: vi.fn(async () => undefined)
      }
    });

    await expect(
      service.savePreset({
        id: "preset-1",
        sheetId: "sheet-alpha",
        name: "Warmup",
        settings: buildSheetMetronomePresetSettings()
      })
    ).rejects.toThrow("write failed");
  });

  it("returns a typed load result for an existing preset without applying UI state", async () => {
    const preset = buildSheetMetronomePreset({
      settings: buildSheetMetronomePresetSettings({
        bpm: 144,
        subdivision: "triplet",
        accent: "every-beat",
        barCountIn: {
          enabled: true,
          bars: 2
        }
      })
    });
    const service = createSheetMetronomePresetService({
      repository: createMemorySheetMetronomePresetRepository([preset])
    });

    await expect(service.loadPreset("sheet-alpha", "preset-1")).resolves.toEqual({
      status: "loaded",
      preset,
      settings: preset.settings
    });
  });
});
