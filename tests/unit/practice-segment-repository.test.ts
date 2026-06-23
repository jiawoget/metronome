import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createPracticeSegmentGridAssociation,
  getPracticeSegmentGridStatus,
  type MeasureGrid,
  type PracticeSegment
} from "@/domain/practice";
import {
  browserPracticeSegmentRepository,
  clearPracticeSegmentDatabaseForTests,
  parsePersistedPracticeSegmentRecord,
  resetPracticeSegmentDatabaseConnectionForTests,
  seedPracticeSegmentRecordForTests
} from "@/infrastructure/db/browser-practice-segment-service";
import { createPracticeSegmentService, type PracticeSegmentRepository } from "@/services/practice-segments";

const baseGrid: MeasureGrid = {
  bpm: 96,
  timeSignature: "4/4",
  pickupBeats: 0,
  measureOneOffsetMs: 500
};

const staleGrid: MeasureGrid = {
  ...baseGrid,
  bpm: 108
};

function buildSegment(overrides: Partial<PracticeSegment> = {}): PracticeSegment {
  return {
    id: "segment-1",
    sheetId: "sheet-alpha",
    name: "Bridge",
    range: {
      startMeasure: 5,
      endMeasure: 12
    },
    targetBpm: 96,
    notes: "Focus on clean shifts",
    grid: createPracticeSegmentGridAssociation(baseGrid),
    ...overrides
  };
}

function createMemoryPracticeSegmentRepository(
  initialSegments: PracticeSegment[] = []
): PracticeSegmentRepository {
  const segments = new Map<string, Map<string, PracticeSegment>>();

  for (const segment of initialSegments) {
    const sheetSegments = segments.get(segment.sheetId) ?? new Map<string, PracticeSegment>();
    sheetSegments.set(segment.id, segment);
    segments.set(segment.sheetId, sheetSegments);
  }

  return {
    async listSegments(sheetId) {
      return Array.from(segments.get(sheetId)?.values() ?? []);
    },
    async getSegment(sheetId, segmentId) {
      return segments.get(sheetId)?.get(segmentId) ?? null;
    },
    async saveSegment(segment) {
      const sheetSegments = segments.get(segment.sheetId) ?? new Map<string, PracticeSegment>();
      sheetSegments.set(segment.id, segment);
      segments.set(segment.sheetId, sheetSegments);
    },
    async deleteSegment(sheetId, segmentId) {
      const sheetSegments = segments.get(sheetId);

      if (!sheetSegments) {
        return;
      }

      sheetSegments.delete(segmentId);

      if (sheetSegments.size === 0) {
        segments.delete(sheetId);
      }
    }
  };
}

describe("practice segment service", () => {
  it("returns an empty array when a valid sheet has no persisted segments", async () => {
    const service = createPracticeSegmentService(createMemoryPracticeSegmentRepository());

    await expect(service.listSegments("sheet-alpha")).resolves.toEqual([]);
    await expect(service.getSegment("sheet-alpha", "segment-1")).resolves.toBeNull();
  });

  it("returns the validated segment and trims id, sheetId, name, and notes before saving", async () => {
    const repository: PracticeSegmentRepository = {
      listSegments: vi.fn(async () => []),
      getSegment: vi.fn(async () => null),
      saveSegment: vi.fn(async () => undefined),
      deleteSegment: vi.fn(async () => undefined)
    };
    const service = createPracticeSegmentService(repository);

    await expect(
      service.saveSegment({
        ...buildSegment(),
        id: "  segment-1  ",
        sheetId: "  sheet-alpha  ",
        name: "  Bridge  ",
        notes: "  Focus on clean shifts  "
      })
    ).resolves.toEqual(buildSegment());

    expect(repository.saveSegment).toHaveBeenCalledWith(buildSegment());
  });

  it("returns only segments for the requested sheet and scopes get by both sheet id and segment id", async () => {
    const segmentAlpha = buildSegment();
    const segmentBravo = buildSegment({
      id: "segment-2",
      sheetId: "sheet-bravo",
      name: "Verse"
    });
    const service = createPracticeSegmentService(
      createMemoryPracticeSegmentRepository([segmentAlpha, segmentBravo])
    );

    await expect(service.listSegments("sheet-alpha")).resolves.toEqual([segmentAlpha]);
    await expect(service.listSegments("sheet-bravo")).resolves.toEqual([segmentBravo]);
    await expect(service.getSegment("sheet-alpha", "segment-1")).resolves.toEqual(segmentAlpha);
    await expect(service.getSegment("sheet-alpha", "segment-2")).resolves.toBeNull();
  });

  it("replaces the full segment payload for the same sheet and id", async () => {
    const service = createPracticeSegmentService(
      createMemoryPracticeSegmentRepository([buildSegment()])
    );
    const updatedSegment = buildSegment({
      name: "Bridge Rework",
      targetBpm: null,
      notes: null,
      range: {
        startMeasure: 6,
        endMeasure: 9
      }
    });

    await expect(service.saveSegment(updatedSegment)).resolves.toEqual(updatedSegment);
    await expect(service.getSegment("sheet-alpha", "segment-1")).resolves.toEqual(updatedSegment);
  });

  it("keeps overlapping segment ids isolated by sheet", async () => {
    const service = createPracticeSegmentService(createMemoryPracticeSegmentRepository());
    const firstSheetSegment = buildSegment();
    const secondSheetSegment = buildSegment({
      sheetId: "sheet-bravo",
      name: "Second Sheet"
    });

    await expect(service.saveSegment(firstSheetSegment)).resolves.toEqual(firstSheetSegment);
    await expect(service.saveSegment(secondSheetSegment)).resolves.toEqual(secondSheetSegment);

    await expect(service.getSegment("sheet-alpha", "segment-1")).resolves.toEqual(firstSheetSegment);
    await expect(service.getSegment("sheet-bravo", "segment-1")).resolves.toEqual(secondSheetSegment);
  });

  it("deletes only the requested segment and stays idempotent for a missing segment", async () => {
    const keptSegment = buildSegment({
      id: "segment-2"
    });
    const service = createPracticeSegmentService(
      createMemoryPracticeSegmentRepository([
        buildSegment(),
        keptSegment,
        buildSegment({
          sheetId: "sheet-bravo"
        })
      ])
    );

    await expect(service.deleteSegment("sheet-alpha", "segment-1")).resolves.toBeUndefined();
    await expect(service.deleteSegment("sheet-alpha", "segment-missing")).resolves.toBeUndefined();

    await expect(service.getSegment("sheet-alpha", "segment-1")).resolves.toBeNull();
    await expect(service.listSegments("sheet-alpha")).resolves.toEqual([keptSegment]);
    await expect(service.getSegment("sheet-bravo", "segment-1")).resolves.toEqual(
      buildSegment({
        sheetId: "sheet-bravo"
      })
    );
  });

  it("rejects empty sheet ids for listSegments without touching the repository", async () => {
    const repository: PracticeSegmentRepository = {
      listSegments: vi.fn(async () => []),
      getSegment: vi.fn(async () => null),
      saveSegment: vi.fn(async () => undefined),
      deleteSegment: vi.fn(async () => undefined)
    };
    const service = createPracticeSegmentService(repository);

    await expect(service.listSegments("   ")).rejects.toThrow("sheetId is required");
    expect(repository.listSegments).not.toHaveBeenCalled();
  });

  it("rejects empty sheet ids or segment ids for getSegment without touching the repository", async () => {
    const repository: PracticeSegmentRepository = {
      listSegments: vi.fn(async () => []),
      getSegment: vi.fn(async () => null),
      saveSegment: vi.fn(async () => undefined),
      deleteSegment: vi.fn(async () => undefined)
    };
    const service = createPracticeSegmentService(repository);

    await expect(service.getSegment("   ", "segment-1")).rejects.toThrow("sheetId is required");
    await expect(service.getSegment("sheet-alpha", "   ")).rejects.toThrow("segmentId is required");
    expect(repository.getSegment).not.toHaveBeenCalled();
  });

  it("rejects empty sheet ids or segment ids for deleteSegment without touching the repository", async () => {
    const repository: PracticeSegmentRepository = {
      listSegments: vi.fn(async () => []),
      getSegment: vi.fn(async () => null),
      saveSegment: vi.fn(async () => undefined),
      deleteSegment: vi.fn(async () => undefined)
    };
    const service = createPracticeSegmentService(repository);

    await expect(service.deleteSegment("   ", "segment-1")).rejects.toThrow("sheetId is required");
    await expect(service.deleteSegment("sheet-alpha", "   ")).rejects.toThrow("segmentId is required");
    expect(repository.deleteSegment).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: "blank id",
      segment: buildSegment({ id: "   " })
    },
    {
      name: "blank sheet id",
      segment: buildSegment({ sheetId: "   " })
    },
    {
      name: "blank name",
      segment: buildSegment({ name: "   " })
    },
    {
      name: "invalid range",
      segment: buildSegment({
        range: {
          startMeasure: 8,
          endMeasure: 7
        }
      })
    },
    {
      name: "invalid target bpm",
      segment: buildSegment({ targetBpm: 29 })
    },
    {
      name: "invalid notes",
      segment: buildSegment({ notes: "n".repeat(1001) })
    },
    {
      name: "invalid grid association",
      segment: buildSegment({
        grid: {
          measureGridVersion: "",
          measureGridSnapshot: baseGrid
        }
      })
    }
  ])("rejects $name saves and does not call the repository", async ({ segment }) => {
    const repository: PracticeSegmentRepository = {
      listSegments: vi.fn(async () => []),
      getSegment: vi.fn(async () => null),
      saveSegment: vi.fn(async () => undefined),
      deleteSegment: vi.fn(async () => undefined)
    };
    const service = createPracticeSegmentService(repository);

    await expect(service.saveSegment(segment as PracticeSegment)).rejects.toThrow();
    expect(repository.saveSegment).not.toHaveBeenCalled();
  });

  it("preserves prior valid data when a later save fails validation", async () => {
    const service = createPracticeSegmentService(
      createMemoryPracticeSegmentRepository([buildSegment()])
    );

    await expect(
      service.saveSegment(
        buildSegment({
          targetBpm: 301
        })
      )
    ).rejects.toThrow();

    await expect(service.getSegment("sheet-alpha", "segment-1")).resolves.toEqual(buildSegment());
  });

  it("propagates repository storage failures", async () => {
    const repository: PracticeSegmentRepository = {
      listSegments: vi.fn(async () => []),
      getSegment: vi.fn(async () => null),
      saveSegment: vi.fn(async () => {
        throw new Error("write failed");
      }),
      deleteSegment: vi.fn(async () => undefined)
    };
    const service = createPracticeSegmentService(repository);

    await expect(service.saveSegment(buildSegment())).rejects.toThrow("write failed");
  });
});

describe("practice segment persisted row parsing", () => {
  it("returns safe absence for malformed parser inputs", () => {
    expect(parsePersistedPracticeSegmentRecord(null)).toBeNull();
    expect(parsePersistedPracticeSegmentRecord("bad-row")).toBeNull();
    expect(parsePersistedPracticeSegmentRecord([])).toBeNull();
    expect(parsePersistedPracticeSegmentRecord({})).toBeNull();
    expect(
      parsePersistedPracticeSegmentRecord({
        sheetId: "sheet-alpha",
        segmentId: "segment-1"
      })
    ).toBeNull();
    expect(
      parsePersistedPracticeSegmentRecord({
        sheetId: "sheet-alpha",
        segmentId: "segment-1",
        segment: buildSegment({
          sheetId: "sheet-bravo"
        })
      })
    ).toBeNull();
  });
});

describe("practice segment browser repository", () => {
  beforeEach(async () => {
    await clearPracticeSegmentDatabaseForTests();
  });

  afterEach(() => {
    resetPracticeSegmentDatabaseConnectionForTests();
  });

  it("returns an empty list and null get for missing rows", async () => {
    await expect(browserPracticeSegmentRepository.listSegments("sheet-alpha")).resolves.toEqual([]);
    await expect(browserPracticeSegmentRepository.getSegment("sheet-alpha", "segment-1")).resolves.toBeNull();
  });

  it("persists one valid segment by trimmed sheet id", async () => {
    await browserPracticeSegmentRepository.saveSegment(
      buildSegment({
        id: "  segment-1  ",
        sheetId: "  sheet-alpha  ",
        name: "  Bridge  ",
        notes: "  Focus on clean shifts  "
      })
    );

    await expect(browserPracticeSegmentRepository.listSegments("sheet-alpha")).resolves.toEqual([buildSegment()]);
    await expect(browserPracticeSegmentRepository.getSegment("sheet-alpha", "segment-1")).resolves.toEqual(
      buildSegment()
    );
  });

  it("persists multiple segments for the same sheet", async () => {
    const secondSegment = buildSegment({
      id: "segment-2",
      name: "Coda",
      range: {
        startMeasure: 13,
        endMeasure: 16
      }
    });

    await browserPracticeSegmentRepository.saveSegment(buildSegment());
    await browserPracticeSegmentRepository.saveSegment(secondSegment);

    await expect(browserPracticeSegmentRepository.listSegments("sheet-alpha")).resolves.toEqual([
      buildSegment(),
      secondSegment
    ]);
  });

  it("isolates two sheets with overlapping segment ids", async () => {
    const secondSheetSegment = buildSegment({
      sheetId: "sheet-bravo",
      name: "Other Sheet"
    });

    await browserPracticeSegmentRepository.saveSegment(buildSegment());
    await browserPracticeSegmentRepository.saveSegment(secondSheetSegment);

    await expect(browserPracticeSegmentRepository.listSegments("sheet-alpha")).resolves.toEqual([buildSegment()]);
    await expect(browserPracticeSegmentRepository.listSegments("sheet-bravo")).resolves.toEqual([
      secondSheetSegment
    ]);
    await expect(browserPracticeSegmentRepository.getSegment("sheet-alpha", "segment-1")).resolves.toEqual(
      buildSegment()
    );
    await expect(browserPracticeSegmentRepository.getSegment("sheet-bravo", "segment-1")).resolves.toEqual(
      secondSheetSegment
    );
  });

  it("keeps delimiter-collision ids distinct across CRUD and delete", async () => {
    const firstSegment = buildSegment({
      id: "c",
      sheetId: "a::b",
      name: "First Collision"
    });
    const secondSegment = buildSegment({
      id: "b::c",
      sheetId: "a",
      name: "Second Collision"
    });
    const updatedFirstSegment = buildSegment({
      ...firstSegment,
      name: "First Collision Updated",
      notes: "Updated"
    });

    await browserPracticeSegmentRepository.saveSegment(firstSegment);
    await browserPracticeSegmentRepository.saveSegment(secondSegment);

    await expect(browserPracticeSegmentRepository.getSegment("a::b", "c")).resolves.toEqual(firstSegment);
    await expect(browserPracticeSegmentRepository.getSegment("a", "b::c")).resolves.toEqual(secondSegment);

    await browserPracticeSegmentRepository.saveSegment(updatedFirstSegment);

    await expect(browserPracticeSegmentRepository.getSegment("a::b", "c")).resolves.toEqual(updatedFirstSegment);
    await expect(browserPracticeSegmentRepository.getSegment("a", "b::c")).resolves.toEqual(secondSegment);

    await browserPracticeSegmentRepository.deleteSegment("a::b", "c");

    await expect(browserPracticeSegmentRepository.getSegment("a::b", "c")).resolves.toBeNull();
    await expect(browserPracticeSegmentRepository.getSegment("a", "b::c")).resolves.toEqual(secondSegment);
    await expect(browserPracticeSegmentRepository.listSegments("a")).resolves.toEqual([secondSegment]);
  });

  it("reads legacy separator-key rows and replaces them with the structured key on save", async () => {
    const legacySegment = buildSegment({
      id: "segment-legacy"
    });
    const updatedSegment = buildSegment({
      id: "segment-legacy",
      name: "Legacy Updated"
    });

    await seedPracticeSegmentRecordForTests("sheet-alpha", "segment-legacy", {
      key: "sheet-alpha::segment-legacy",
      segment: legacySegment,
      updatedAt: "2026-06-23T10:00:00.000Z"
    });

    await expect(browserPracticeSegmentRepository.getSegment("sheet-alpha", "segment-legacy")).resolves.toEqual(
      legacySegment
    );
    await expect(browserPracticeSegmentRepository.listSegments("sheet-alpha")).resolves.toEqual([legacySegment]);

    await browserPracticeSegmentRepository.saveSegment(updatedSegment);

    await expect(browserPracticeSegmentRepository.getSegment("sheet-alpha", "segment-legacy")).resolves.toEqual(
      updatedSegment
    );
    await expect(browserPracticeSegmentRepository.listSegments("sheet-alpha")).resolves.toEqual([updatedSegment]);
  });

  it("updates and replaces the same sheet and segment row", async () => {
    const updatedSegment = buildSegment({
      name: "Bridge Rework",
      targetBpm: null,
      notes: null,
      range: {
        startMeasure: 6,
        endMeasure: 9
      }
    });

    await browserPracticeSegmentRepository.saveSegment(buildSegment());
    await browserPracticeSegmentRepository.saveSegment(
      buildSegment({
        sheetId: "sheet-bravo",
        name: "Other Sheet"
      })
    );
    await browserPracticeSegmentRepository.saveSegment(updatedSegment);

    await expect(browserPracticeSegmentRepository.getSegment("sheet-alpha", "segment-1")).resolves.toEqual(
      updatedSegment
    );
    await expect(browserPracticeSegmentRepository.listSegments("sheet-alpha")).resolves.toEqual([updatedSegment]);
    await expect(browserPracticeSegmentRepository.getSegment("sheet-bravo", "segment-1")).resolves.toEqual(
      buildSegment({
        sheetId: "sheet-bravo",
        name: "Other Sheet"
      })
    );
  });

  it("deletes only the requested row and stays idempotent for a missing row", async () => {
    const keptSegment = buildSegment({
      id: "segment-2"
    });
    const otherSheetSegment = buildSegment({
      sheetId: "sheet-bravo"
    });

    await browserPracticeSegmentRepository.saveSegment(buildSegment());
    await browserPracticeSegmentRepository.saveSegment(keptSegment);
    await browserPracticeSegmentRepository.saveSegment(otherSheetSegment);

    await expect(browserPracticeSegmentRepository.deleteSegment("sheet-alpha", "segment-1")).resolves.toBeUndefined();
    await expect(
      browserPracticeSegmentRepository.deleteSegment("sheet-alpha", "segment-missing")
    ).resolves.toBeUndefined();

    await expect(browserPracticeSegmentRepository.listSegments("sheet-alpha")).resolves.toEqual([keptSegment]);
    await expect(browserPracticeSegmentRepository.getSegment("sheet-alpha", "segment-1")).resolves.toBeNull();
    await expect(browserPracticeSegmentRepository.getSegment("sheet-bravo", "segment-1")).resolves.toEqual(
      otherSheetSegment
    );
  });

  it("validates before write and preserves the prior valid row when validation fails", async () => {
    await browserPracticeSegmentRepository.saveSegment(buildSegment());

    await expect(
      browserPracticeSegmentRepository.saveSegment(
        buildSegment({
          targetBpm: 301
        })
      )
    ).rejects.toThrow();

    await expect(browserPracticeSegmentRepository.getSegment("sheet-alpha", "segment-1")).resolves.toEqual(
      buildSegment()
    );
  });

  it("survives a Dexie connection reset and reload with all valid segments intact", async () => {
    const secondSegment = buildSegment({
      id: "segment-2",
      name: "Coda"
    });
    const otherSheetSegment = buildSegment({
      sheetId: "sheet-bravo"
    });

    await browserPracticeSegmentRepository.saveSegment(buildSegment());
    await browserPracticeSegmentRepository.saveSegment(secondSegment);
    await browserPracticeSegmentRepository.saveSegment(otherSheetSegment);

    resetPracticeSegmentDatabaseConnectionForTests();

    await expect(browserPracticeSegmentRepository.listSegments("sheet-alpha")).resolves.toEqual([
      buildSegment(),
      secondSegment
    ]);
    await expect(browserPracticeSegmentRepository.listSegments("sheet-bravo")).resolves.toEqual([
      otherSheetSegment
    ]);
  });

  it("reads a valid segment with a stale grid association without requiring a current grid lookup", async () => {
    const segment = buildSegment();

    await browserPracticeSegmentRepository.saveSegment(segment);

    const savedSegment = await browserPracticeSegmentRepository.getSegment("sheet-alpha", "segment-1");

    expect(savedSegment).toEqual(segment);
    expect(getPracticeSegmentGridStatus(savedSegment, staleGrid)).toBe("stale");
    expect(getPracticeSegmentGridStatus(savedSegment, null)).toBe("missing-grid");
  });

  it("rejects invalid sheet ids or segment ids for get, list, save, and delete", async () => {
    await expect(browserPracticeSegmentRepository.listSegments("   ")).rejects.toThrow("sheetId is required");
    await expect(browserPracticeSegmentRepository.getSegment("   ", "segment-1")).rejects.toThrow(
      "sheetId is required"
    );
    await expect(browserPracticeSegmentRepository.getSegment("sheet-alpha", "   ")).rejects.toThrow(
      "segmentId is required"
    );
    await expect(browserPracticeSegmentRepository.saveSegment(buildSegment({ sheetId: "   " }))).rejects.toThrow();
    await expect(browserPracticeSegmentRepository.deleteSegment("   ", "segment-1")).rejects.toThrow(
      "sheetId is required"
    );
    await expect(browserPracticeSegmentRepository.deleteSegment("sheet-alpha", "   ")).rejects.toThrow(
      "segmentId is required"
    );
  });

  it("returns safe absence for a true non-object persisted row", async () => {
    await seedPracticeSegmentRecordForTests("sheet-alpha", "segment-1", {
      segment: buildSegment(),
      updatedAt: "2026-06-23T10:00:00.000Z"
    });

    const originalGet = IDBObjectStore.prototype.get;
    const getSpy = vi
      .spyOn(IDBObjectStore.prototype, "get")
      .mockImplementation(function (this: IDBObjectStore, query: IDBValidKey | IDBKeyRange) {
        const request = originalGet.call(this, query);

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

        return request;
      });

    try {
      await expect(browserPracticeSegmentRepository.getSegment("sheet-alpha", "segment-1")).resolves.toBeNull();
    } finally {
      getSpy.mockRestore();
    }
  });

  it.each([
    {
      name: "row with no segment",
      sheetId: "sheet-alpha",
      segmentId: "segment-no-segment",
      value: {
        updatedAt: "2026-06-23T10:00:00.000Z"
      }
    },
    {
      name: "row with mismatched persisted key",
      sheetId: "sheet-alpha",
      segmentId: "segment-bad-key",
      value: {
        key: JSON.stringify(["sheet-alpha", "segment-other"]),
        segment: buildSegment({
          id: "segment-bad-key"
        }),
        updatedAt: "2026-06-23T10:00:00.000Z"
      }
    },
    {
      name: "row with mismatched embedded sheet id",
      sheetId: "sheet-alpha",
      segmentId: "segment-bad-sheet",
      value: {
        segment: buildSegment({
          id: "segment-bad-sheet",
          sheetId: "sheet-bravo"
        }),
        updatedAt: "2026-06-23T10:00:00.000Z"
      }
    },
    {
      name: "row with mismatched embedded segment id",
      sheetId: "sheet-alpha",
      segmentId: "segment-bad-id",
      value: {
        segment: buildSegment({
          id: "segment-other"
        }),
        updatedAt: "2026-06-23T10:00:00.000Z"
      }
    },
    {
      name: "segment missing id",
      sheetId: "sheet-alpha",
      segmentId: "segment-missing-id",
      value: {
        segment: {
          ...buildSegment({
            id: "segment-missing-id"
          }),
          id: ""
        },
        updatedAt: "2026-06-23T10:00:00.000Z"
      }
    },
    {
      name: "segment missing sheet id",
      sheetId: "sheet-alpha",
      segmentId: "segment-missing-sheet",
      value: {
        segment: {
          ...buildSegment({
            id: "segment-missing-sheet"
          }),
          sheetId: ""
        },
        updatedAt: "2026-06-23T10:00:00.000Z"
      }
    },
    {
      name: "empty name",
      sheetId: "sheet-alpha",
      segmentId: "segment-empty-name",
      value: {
        segment: buildSegment({
          id: "segment-empty-name",
          name: "   "
        }),
        updatedAt: "2026-06-23T10:00:00.000Z"
      }
    },
    {
      name: "range start 0",
      sheetId: "sheet-alpha",
      segmentId: "segment-start-zero",
      value: {
        segment: buildSegment({
          id: "segment-start-zero",
          range: {
            startMeasure: 0,
            endMeasure: 12
          }
        }),
        updatedAt: "2026-06-23T10:00:00.000Z"
      }
    },
    {
      name: "fractional range start",
      sheetId: "sheet-alpha",
      segmentId: "segment-start-fractional",
      value: {
        segment: buildSegment({
          id: "segment-start-fractional",
          range: {
            startMeasure: 1.5,
            endMeasure: 12
          }
        }),
        updatedAt: "2026-06-23T10:00:00.000Z"
      }
    },
    {
      name: "range end before start",
      sheetId: "sheet-alpha",
      segmentId: "segment-end-before-start",
      value: {
        segment: buildSegment({
          id: "segment-end-before-start",
          range: {
            startMeasure: 12,
            endMeasure: 5
          }
        }),
        updatedAt: "2026-06-23T10:00:00.000Z"
      }
    },
    {
      name: "target bpm below minimum",
      sheetId: "sheet-alpha",
      segmentId: "segment-bpm-low",
      value: {
        segment: buildSegment({
          id: "segment-bpm-low",
          targetBpm: 29
        }),
        updatedAt: "2026-06-23T10:00:00.000Z"
      }
    },
    {
      name: "target bpm above maximum",
      sheetId: "sheet-alpha",
      segmentId: "segment-bpm-high",
      value: {
        segment: buildSegment({
          id: "segment-bpm-high",
          targetBpm: 301
        }),
        updatedAt: "2026-06-23T10:00:00.000Z"
      }
    },
    {
      name: "fractional target bpm",
      sheetId: "sheet-alpha",
      segmentId: "segment-bpm-fractional",
      value: {
        segment: buildSegment({
          id: "segment-bpm-fractional",
          targetBpm: 96.5
        }),
        updatedAt: "2026-06-23T10:00:00.000Z"
      }
    },
    {
      name: "string target bpm",
      sheetId: "sheet-alpha",
      segmentId: "segment-bpm-string",
      value: {
        segment: {
          ...buildSegment({
            id: "segment-bpm-string"
          }),
          targetBpm: "96"
        },
        updatedAt: "2026-06-23T10:00:00.000Z"
      }
    },
    {
      name: "NaN target bpm",
      sheetId: "sheet-alpha",
      segmentId: "segment-bpm-nan",
      value: {
        segment: {
          ...buildSegment({
            id: "segment-bpm-nan"
          }),
          targetBpm: Number.NaN
        },
        updatedAt: "2026-06-23T10:00:00.000Z"
      }
    },
    {
      name: "notes over max length",
      sheetId: "sheet-alpha",
      segmentId: "segment-notes-long",
      value: {
        segment: buildSegment({
          id: "segment-notes-long",
          notes: "n".repeat(1001)
        }),
        updatedAt: "2026-06-23T10:00:00.000Z"
      }
    },
    {
      name: "non-string notes",
      sheetId: "sheet-alpha",
      segmentId: "segment-notes-number",
      value: {
        segment: {
          ...buildSegment({
            id: "segment-notes-number"
          }),
          notes: 42
        },
        updatedAt: "2026-06-23T10:00:00.000Z"
      }
    },
    {
      name: "missing grid association",
      sheetId: "sheet-alpha",
      segmentId: "segment-grid-missing",
      value: {
        segment: {
          ...buildSegment({
            id: "segment-grid-missing"
          }),
          grid: null
        },
        updatedAt: "2026-06-23T10:00:00.000Z"
      }
    },
    {
      name: "empty measure grid version",
      sheetId: "sheet-alpha",
      segmentId: "segment-grid-version-empty",
      value: {
        segment: buildSegment({
          id: "segment-grid-version-empty",
          grid: {
            measureGridVersion: " ",
            measureGridSnapshot: baseGrid
          }
        }),
        updatedAt: "2026-06-23T10:00:00.000Z"
      }
    },
    {
      name: "grid snapshot missing offset",
      sheetId: "sheet-alpha",
      segmentId: "segment-grid-missing-offset",
      value: {
        segment: {
          ...buildSegment({
            id: "segment-grid-missing-offset"
          }),
          grid: {
            measureGridVersion: buildSegment().grid.measureGridVersion,
            measureGridSnapshot: {
              bpm: 96,
              timeSignature: "4/4",
              pickupBeats: 0
            }
          }
        },
        updatedAt: "2026-06-23T10:00:00.000Z"
      }
    },
    {
      name: "unsupported time signature",
      sheetId: "sheet-alpha",
      segmentId: "segment-grid-bad-signature",
      value: {
        segment: {
          ...buildSegment({
            id: "segment-grid-bad-signature"
          }),
          grid: {
            measureGridVersion: buildSegment().grid.measureGridVersion,
            measureGridSnapshot: {
              bpm: 96,
              timeSignature: "5/4",
              pickupBeats: 0,
              measureOneOffsetMs: 500
            }
          }
        },
        updatedAt: "2026-06-23T10:00:00.000Z"
      }
    },
    {
      name: "invalid pickup beats",
      sheetId: "sheet-alpha",
      segmentId: "segment-grid-bad-pickup",
      value: {
        segment: {
          ...buildSegment({
            id: "segment-grid-bad-pickup"
          }),
          grid: {
            measureGridVersion: buildSegment().grid.measureGridVersion,
            measureGridSnapshot: {
              bpm: 96,
              timeSignature: "3/4",
              pickupBeats: 3,
              measureOneOffsetMs: 500
            }
          }
        },
        updatedAt: "2026-06-23T10:00:00.000Z"
      }
    },
    {
      name: "invalid grid bpm",
      sheetId: "sheet-alpha",
      segmentId: "segment-grid-bad-bpm",
      value: {
        segment: {
          ...buildSegment({
            id: "segment-grid-bad-bpm"
          }),
          grid: {
            measureGridVersion: buildSegment().grid.measureGridVersion,
            measureGridSnapshot: {
              bpm: 29,
              timeSignature: "4/4",
              pickupBeats: 0,
              measureOneOffsetMs: 500
            }
          }
        },
        updatedAt: "2026-06-23T10:00:00.000Z"
      }
    }
  ])("returns safe absence for malformed persisted row: $name", async ({ sheetId, segmentId, value }) => {
    await seedPracticeSegmentRecordForTests(sheetId, segmentId, value);

    await expect(browserPracticeSegmentRepository.getSegment(sheetId, segmentId)).resolves.toBeNull();
  });

  it("filters malformed persisted rows out of listSegments", async () => {
    const validSegment = buildSegment();

    await browserPracticeSegmentRepository.saveSegment(validSegment);
    await seedPracticeSegmentRecordForTests("sheet-alpha", "segment-bad", {
      key: JSON.stringify(["sheet-alpha", "segment-other"]),
      segment: buildSegment({
        id: "segment-bad"
      }),
      updatedAt: "2026-06-23T10:00:00.000Z"
    });

    await expect(browserPracticeSegmentRepository.listSegments("sheet-alpha")).resolves.toEqual([validSegment]);
  });
});
