import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { MeasureGrid } from "@/domain/practice";
import {
  browserMeasureGridRepository,
  clearMeasureGridDatabaseForTests,
  parsePersistedMeasureGridRecord,
  resetMeasureGridDatabaseConnectionForTests,
  seedMeasureGridRecordForTests
} from "@/infrastructure/db/browser-measure-grid-service";
import { createMeasureGridService, type MeasureGridRepository } from "@/services/measure-grid";
import { buildMeasureGrid, TEST_ISO_DATE } from "./factories/practice";

const baseGrid: MeasureGrid = buildMeasureGrid({
  bpm: 120,
  measureOneOffsetMs: 0
});

function createMemoryMeasureGridRepository(initialEntries: Array<[string, MeasureGrid]> = []): MeasureGridRepository {
  const grids = new Map(initialEntries);

  return {
    async getGrid(sheetId) {
      return grids.get(sheetId) ?? null;
    },
    async saveGrid(sheetId, grid) {
      grids.set(sheetId, grid);
    },
    async clearGrid(sheetId) {
      grids.delete(sheetId);
    }
  };
}

describe("measure grid service", () => {
  it("returns null when a valid sheet has no persisted grid", async () => {
    const service = createMeasureGridService(createMemoryMeasureGridRepository());

    await expect(service.getGrid("sheet-alpha")).resolves.toBeNull();
  });

  it("returns the validated grid and trims the sheet id before saving", async () => {
    const repository: MeasureGridRepository = {
      getGrid: vi.fn(async () => null),
      saveGrid: vi.fn(async () => undefined),
      clearGrid: vi.fn(async () => undefined)
    };
    const service = createMeasureGridService(repository);

    await expect(service.saveGrid("  sheet-alpha  ", baseGrid)).resolves.toEqual(baseGrid);

    expect(repository.saveGrid).toHaveBeenCalledWith("sheet-alpha", baseGrid);
  });

  it("updates one active grid by replacing the previous grid for the same sheet and isolates other sheets", async () => {
    const service = createMeasureGridService(createMemoryMeasureGridRepository());
    const updatedGrid: MeasureGrid = {
      bpm: 96,
      timeSignature: "3/4",
      pickupBeats: 1,
      measureOneOffsetMs: 480
    };
    const otherSheetGrid: MeasureGrid = {
      bpm: 72,
      timeSignature: "6/8",
      pickupBeats: 0,
      measureOneOffsetMs: 120
    };

    await expect(service.saveGrid("sheet-alpha", baseGrid)).resolves.toEqual(baseGrid);
    await expect(service.saveGrid("sheet-bravo", otherSheetGrid)).resolves.toEqual(otherSheetGrid);
    await expect(service.saveGrid(" sheet-alpha ", updatedGrid)).resolves.toEqual(updatedGrid);

    await expect(service.getGrid("sheet-alpha")).resolves.toEqual(updatedGrid);
    await expect(service.getGrid(" sheet-bravo ")).resolves.toEqual(otherSheetGrid);
  });

  it("clears only the requested sheet grid and stays idempotent for a missing grid", async () => {
    const service = createMeasureGridService(
      createMemoryMeasureGridRepository([
        ["sheet-alpha", baseGrid],
        [
          "sheet-bravo",
          {
            bpm: 84,
            timeSignature: "6/8",
            pickupBeats: 0,
            measureOneOffsetMs: 900
          }
        ]
      ])
    );

    await expect(service.clearGrid(" sheet-alpha ")).resolves.toBeUndefined();
    await expect(service.clearGrid("sheet-missing")).resolves.toBeUndefined();

    await expect(service.getGrid("sheet-alpha")).resolves.toBeNull();
    await expect(service.getGrid("sheet-bravo")).resolves.toEqual({
      bpm: 84,
      timeSignature: "6/8",
      pickupBeats: 0,
      measureOneOffsetMs: 900
    });
  });

  it("rejects empty sheet ids for getGrid without touching the repository", async () => {
    const repository: MeasureGridRepository = {
      getGrid: vi.fn(async () => null),
      saveGrid: vi.fn(async () => undefined),
      clearGrid: vi.fn(async () => undefined)
    };
    const service = createMeasureGridService(repository);

    await expect(service.getGrid("   ")).rejects.toThrow("sheetId is required");
    expect(repository.getGrid).not.toHaveBeenCalled();
  });

  it("rejects empty sheet ids for saveGrid without mutating the repository", async () => {
    const repository: MeasureGridRepository = {
      getGrid: vi.fn(async () => null),
      saveGrid: vi.fn(async () => undefined),
      clearGrid: vi.fn(async () => undefined)
    };
    const service = createMeasureGridService(repository);

    await expect(service.saveGrid("   ", baseGrid)).rejects.toThrow("sheetId is required");
    expect(repository.saveGrid).not.toHaveBeenCalled();
  });

  it("rejects empty sheet ids for clearGrid without calling repository delete", async () => {
    const repository: MeasureGridRepository = {
      getGrid: vi.fn(async () => null),
      saveGrid: vi.fn(async () => undefined),
      clearGrid: vi.fn(async () => undefined)
    };
    const service = createMeasureGridService(repository);

    await expect(service.clearGrid("   ")).rejects.toThrow("sheetId is required");
    expect(repository.clearGrid).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: "invalid bpm",
      grid: { ...baseGrid, bpm: 301 }
    },
    {
      name: "unsupported time signature",
      grid: { ...baseGrid, timeSignature: "5/4" }
    },
    {
      name: "pickup equal to numerator",
      grid: { ...baseGrid, timeSignature: "3/4", pickupBeats: 3 }
    },
    {
      name: "negative offset",
      grid: { ...baseGrid, measureOneOffsetMs: -1 }
    },
    {
      name: "fractional offset",
      grid: { ...baseGrid, measureOneOffsetMs: 12.5 }
    },
    {
      name: "NaN offset",
      grid: { ...baseGrid, measureOneOffsetMs: Number.NaN }
    }
  ])("rejects $name saves and preserves the prior valid grid", async ({ grid }) => {
    const service = createMeasureGridService(
      createMemoryMeasureGridRepository([
        ["sheet-alpha", baseGrid]
      ])
    );

    await expect(service.saveGrid("sheet-alpha", grid as MeasureGrid)).rejects.toThrow();
    await expect(service.getGrid("sheet-alpha")).resolves.toEqual(baseGrid);
  });

  it("propagates repository storage failures from saveGrid", async () => {
    const repository: MeasureGridRepository = {
      getGrid: vi.fn(async () => null),
      saveGrid: vi.fn(async () => {
        throw new Error("write failed");
      }),
      clearGrid: vi.fn(async () => undefined)
    };
    const service = createMeasureGridService(repository);

    await expect(service.saveGrid("sheet-alpha", baseGrid)).rejects.toThrow("write failed");
  });
});

describe("measure grid persisted row parsing", () => {
  it("returns safe absence for malformed parser inputs", () => {
    expect(parsePersistedMeasureGridRecord(null)).toBeNull();
    expect(parsePersistedMeasureGridRecord("bad-row")).toBeNull();
    expect(parsePersistedMeasureGridRecord([])).toBeNull();
    expect(parsePersistedMeasureGridRecord({})).toBeNull();
    expect(
      parsePersistedMeasureGridRecord({
        grid: {
          bpm: 120,
          timeSignature: "4/4",
          pickupBeats: 0
        }
      })
    ).toBeNull();
  });
});

describe("measure grid browser repository", () => {
  const savedGrid: MeasureGrid = {
    bpm: 110,
    timeSignature: "4/4",
    pickupBeats: 0,
    measureOneOffsetMs: 250
  };

  beforeEach(async () => {
    await clearMeasureGridDatabaseForTests();
  });

  afterEach(() => {
    resetMeasureGridDatabaseConnectionForTests();
  });

  it("returns null when a valid sheet has no grid", async () => {
    await expect(browserMeasureGridRepository.getGrid("sheet-alpha")).resolves.toBeNull();
  });

  it("persists a grid by trimmed sheet id", async () => {
    await browserMeasureGridRepository.saveGrid("  sheet-alpha  ", savedGrid);

    await expect(browserMeasureGridRepository.getGrid("sheet-alpha")).resolves.toEqual(savedGrid);
  });

  it("updates and replaces the same sheet row without affecting another sheet", async () => {
    await browserMeasureGridRepository.saveGrid("sheet-alpha", savedGrid);
    await browserMeasureGridRepository.saveGrid("sheet-bravo", {
      bpm: 88,
      timeSignature: "3/4",
      pickupBeats: 1,
      measureOneOffsetMs: 640
    });
    await browserMeasureGridRepository.saveGrid("sheet-alpha", {
      bpm: 95,
      timeSignature: "6/8",
      pickupBeats: 2,
      measureOneOffsetMs: 10
    });

    await expect(browserMeasureGridRepository.getGrid("sheet-alpha")).resolves.toEqual({
      bpm: 95,
      timeSignature: "6/8",
      pickupBeats: 2,
      measureOneOffsetMs: 10
    });
    await expect(browserMeasureGridRepository.getGrid("sheet-bravo")).resolves.toEqual({
      bpm: 88,
      timeSignature: "3/4",
      pickupBeats: 1,
      measureOneOffsetMs: 640
    });
  });

  it("clears only the requested sheet and stays idempotent for a missing sheet", async () => {
    await browserMeasureGridRepository.saveGrid("sheet-alpha", savedGrid);
    await browserMeasureGridRepository.saveGrid("sheet-bravo", {
      bpm: 88,
      timeSignature: "3/4",
      pickupBeats: 1,
      measureOneOffsetMs: 640
    });

    await expect(browserMeasureGridRepository.clearGrid("sheet-alpha")).resolves.toBeUndefined();
    await expect(browserMeasureGridRepository.clearGrid("sheet-missing")).resolves.toBeUndefined();

    await expect(browserMeasureGridRepository.getGrid("sheet-alpha")).resolves.toBeNull();
    await expect(browserMeasureGridRepository.getGrid("sheet-bravo")).resolves.toEqual({
      bpm: 88,
      timeSignature: "3/4",
      pickupBeats: 1,
      measureOneOffsetMs: 640
    });
  });

  it("survives a Dexie connection reset and reload", async () => {
    await browserMeasureGridRepository.saveGrid("sheet-alpha", savedGrid);
    await browserMeasureGridRepository.saveGrid("sheet-bravo", {
      bpm: 88,
      timeSignature: "3/4",
      pickupBeats: 1,
      measureOneOffsetMs: 640
    });

    resetMeasureGridDatabaseConnectionForTests();

    await expect(browserMeasureGridRepository.getGrid("sheet-alpha")).resolves.toEqual(savedGrid);
    await expect(browserMeasureGridRepository.getGrid("sheet-bravo")).resolves.toEqual({
      bpm: 88,
      timeSignature: "3/4",
      pickupBeats: 1,
      measureOneOffsetMs: 640
    });
  });

  it("rejects invalid sheet ids for get, save, and clear", async () => {
    await expect(browserMeasureGridRepository.getGrid("   ")).rejects.toThrow("sheetId is required");
    await expect(browserMeasureGridRepository.saveGrid("   ", savedGrid)).rejects.toThrow("sheetId is required");
    await expect(browserMeasureGridRepository.clearGrid("   ")).rejects.toThrow("sheetId is required");
  });

  it("validates before write and preserves the prior valid row when validation fails", async () => {
    await browserMeasureGridRepository.saveGrid("sheet-alpha", savedGrid);

    await expect(
      browserMeasureGridRepository.saveGrid("sheet-alpha", {
        ...savedGrid,
        bpm: 301
      })
    ).rejects.toThrow();

    await expect(browserMeasureGridRepository.getGrid("sheet-alpha")).resolves.toEqual(savedGrid);
  });

  it("returns safe absence for a true non-object persisted row", async () => {
    await seedMeasureGridRecordForTests("sheet-non-object", {
      grid: savedGrid,
      updatedAt: TEST_ISO_DATE
    });

    const originalGet = IDBObjectStore.prototype.get;
    const getSpy = vi
      .spyOn(IDBObjectStore.prototype, "get")
      .mockImplementation(function (this: IDBObjectStore, query: IDBValidKey | IDBKeyRange) {
        const request = originalGet.call(this, query);

        if (query === "sheet-non-object") {
          request.addEventListener(
            "success",
            () => {
              Object.defineProperty(request, "result", {
                configurable: true,
                value: "bad-row"
              });
            },
            { once: true }
          );
        }

        return request;
      });

    try {
      await expect(browserMeasureGridRepository.getGrid("sheet-non-object")).resolves.toBeNull();
    } finally {
      getSpy.mockRestore();
    }
  });

  it.each([
    {
      sheetId: "sheet-no-grid",
      value: { updatedAt: TEST_ISO_DATE }
    },
    {
      sheetId: "sheet-missing-offset",
      value: {
        grid: {
          bpm: 120,
          timeSignature: "4/4",
          pickupBeats: 0
        },
        updatedAt: TEST_ISO_DATE
      }
    },
    {
      sheetId: "sheet-bad-pickup",
      value: {
        grid: {
          ...baseGrid,
          timeSignature: "3/4",
          pickupBeats: 3
        },
        updatedAt: TEST_ISO_DATE
      }
    },
    {
      sheetId: "sheet-bad-offset",
      value: {
        grid: {
          ...baseGrid,
          measureOneOffsetMs: -1
        },
        updatedAt: TEST_ISO_DATE
      }
    }
  ])("returns safe absence for malformed persisted row $sheetId", async ({ sheetId, value }) => {
    await seedMeasureGridRecordForTests(sheetId, value);

    await expect(browserMeasureGridRepository.getGrid(sheetId)).resolves.toBeNull();
  });
});
