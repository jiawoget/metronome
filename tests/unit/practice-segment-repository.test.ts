import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Dexie, { type Table } from "dexie";

import {
  getPracticeSegmentGridStatus,
  type MeasureGrid,
  type PracticeSegment
} from "@/domain/practice";
import {
  browserPracticeSegmentService,
  browserPracticeSegmentRepository,
  clearPracticeSegmentDatabaseForTests,
  parsePersistedPracticeSegmentRecord,
  resetPracticeSegmentDatabaseConnectionForTests,
  seedPracticeSegmentRecordForTests
} from "@/infrastructure/db/browser-practice-segment-service";
import { PRACTICE_SEGMENT_DB_NAME } from "@/infrastructure/storage/storage-contracts";
import { createPracticeSegmentService, type PracticeSegmentRepository } from "@/services/practice-segments";
import { buildMeasureGrid, buildPracticeSegment, TEST_ISO_DATE } from "./factories/practice";

const baseGrid = buildMeasureGrid();
const staleGrid: MeasureGrid = {
  ...buildMeasureGrid(),
  bpm: 108
};

function buildSegment(overrides: Partial<PracticeSegment> = {}): PracticeSegment {
  return buildPracticeSegment(overrides);
}

type LegacyPersistedPracticeSegmentRecord = {
  key: string;
  sheetId: string;
  segmentId: string;
  segment: PracticeSegment;
  updatedAt: string;
};

class LegacyPracticeSegmentDexieDatabase extends Dexie {
  segments!: Table<LegacyPersistedPracticeSegmentRecord, string>;

  constructor() {
    super(PRACTICE_SEGMENT_DB_NAME);

    this.version(1).stores({
      segments: "key, sheetId, segmentId, updatedAt"
    });
  }
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

  it("rejects duplicate segment names on the same sheet using trimmed case-insensitive comparison", async () => {
    const repository: PracticeSegmentRepository = {
      listSegments: vi.fn(async () => [buildSegment({ name: "Bridge" })]),
      getSegment: vi.fn(async () => null),
      saveSegment: vi.fn(async () => undefined),
      deleteSegment: vi.fn(async () => undefined)
    };
    const service = createPracticeSegmentService(repository);

    await expect(
      service.saveSegment(
        buildSegment({
          id: "segment-2",
          name: "  bridge  "
        })
      )
    ).rejects.toThrow("Segment name already exists.");

    expect(repository.listSegments).toHaveBeenCalledWith("sheet-alpha");
    expect(repository.saveSegment).not.toHaveBeenCalled();
  });

  it("allows editing an existing segment without changing its normalized name", async () => {
    const service = createPracticeSegmentService(
      createMemoryPracticeSegmentRepository([buildSegment({ name: "Bridge" })])
    );
    const updatedSegment = buildSegment({
      name: " bridge ",
      range: {
        startMeasure: 6,
        endMeasure: 9
      }
    });

    await expect(service.saveSegment(updatedSegment)).resolves.toEqual({
      ...updatedSegment,
      name: "bridge"
    });
    await expect(service.getSegment("sheet-alpha", "segment-1")).resolves.toEqual({
      ...updatedSegment,
      name: "bridge"
    });
  });

  it("allows duplicate normalized names on different sheets", async () => {
    const service = createPracticeSegmentService(
      createMemoryPracticeSegmentRepository([buildSegment({ name: "Bridge" })])
    );
    const otherSheetSegment = buildSegment({
      id: "segment-2",
      sheetId: "sheet-bravo",
      name: "  bridge  "
    });

    await expect(service.saveSegment(otherSheetSegment)).resolves.toEqual({
      ...otherSheetSegment,
      name: "bridge"
    });
    await expect(service.listSegments("sheet-alpha")).resolves.toEqual([buildSegment({ name: "Bridge" })]);
    await expect(service.listSegments("sheet-bravo")).resolves.toEqual([
      {
        ...otherSheetSegment,
        name: "bridge"
      }
    ]);
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

  it("rejects duplicate names through the browser service before persistence", async () => {
    await browserPracticeSegmentService.saveSegment(buildSegment({ name: "Bridge" }));

    await expect(
      browserPracticeSegmentService.saveSegment(
        buildSegment({
          id: "segment-2",
          name: " bridge "
        })
      )
    ).rejects.toThrow("Segment name already exists.");

    await expect(browserPracticeSegmentService.listSegments("sheet-alpha")).resolves.toEqual([
      buildSegment({ name: "Bridge" })
    ]);
  });

  it("serializes concurrent duplicate-name saves through the browser service transaction", async () => {
    const results = await Promise.allSettled([
      browserPracticeSegmentService.saveSegment(buildSegment({ id: "segment-1", name: "Bridge" })),
      browserPracticeSegmentService.saveSegment(buildSegment({ id: "segment-2", name: " bridge " }))
    ]);
    const fulfilledResults = results.filter((result) => result.status === "fulfilled");
    const rejectedResults = results.filter((result) => result.status === "rejected");

    expect(fulfilledResults).toHaveLength(1);
    expect(rejectedResults).toHaveLength(1);
    expect((rejectedResults[0] as PromiseRejectedResult).reason).toBeInstanceOf(Error);
    expect((rejectedResults[0] as PromiseRejectedResult).reason.message).toBe("Segment name already exists.");

    const savedSegments = await browserPracticeSegmentService.listSegments("sheet-alpha");

    expect(savedSegments).toHaveLength(1);
    expect(["segment-1", "segment-2"]).toContain(savedSegments[0]?.id);
    expect(savedSegments[0]?.name.toLowerCase()).toBe("bridge");
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

  it("migrates legacy v1 key-path rows into the compound-key segments store", async () => {
    const legacyDatabase = new LegacyPracticeSegmentDexieDatabase();
    const legacySegment = buildSegment();

    await legacyDatabase.segments.bulkPut([
      {
        key: JSON.stringify([legacySegment.sheetId, legacySegment.id]),
        sheetId: legacySegment.sheetId,
        segmentId: legacySegment.id,
        segment: legacySegment,
        updatedAt: TEST_ISO_DATE
      },
      {
        key: JSON.stringify(["sheet-alpha", "segment-corrupt"]),
        sheetId: "sheet-alpha",
        segmentId: "segment-corrupt",
        segment: buildSegment({
          id: "segment-corrupt",
          sheetId: "sheet-bravo"
        }),
        updatedAt: TEST_ISO_DATE
      }
    ]);
    legacyDatabase.close();
    resetPracticeSegmentDatabaseConnectionForTests();

    await expect(browserPracticeSegmentRepository.listSegments("sheet-alpha")).resolves.toEqual([legacySegment]);
    await expect(browserPracticeSegmentRepository.getSegment("sheet-alpha", "segment-1")).resolves.toEqual(
      legacySegment
    );
    await expect(browserPracticeSegmentRepository.getSegment("sheet-alpha", "segment-corrupt")).resolves.toBeNull();

    const updatedSegment = buildSegment({
      name: "Migrated Segment Updated",
      notes: "Saved after migration"
    });

    await expect(browserPracticeSegmentRepository.saveSegment(updatedSegment)).resolves.toBeUndefined();
    await expect(browserPracticeSegmentRepository.getSegment("sheet-alpha", "segment-1")).resolves.toEqual(
      updatedSegment
    );
    await expect(browserPracticeSegmentRepository.deleteSegment("sheet-alpha", "segment-1")).resolves.toBeUndefined();
    await expect(browserPracticeSegmentRepository.listSegments("sheet-alpha")).resolves.toEqual([]);
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
        updatedAt: TEST_ISO_DATE
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
        updatedAt: TEST_ISO_DATE
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
        updatedAt: TEST_ISO_DATE
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
        updatedAt: TEST_ISO_DATE
      }
    },
    {
      name: "invalid grid association",
      sheetId: "sheet-alpha",
      segmentId: "segment-grid-invalid",
      value: {
        segment: {
          ...buildSegment({
            id: "segment-grid-invalid"
          }),
          grid: {
            measureGridVersion: " ",
            measureGridSnapshot: {
              bpm: 96,
              timeSignature: "4/4",
              pickupBeats: 0,
              measureOneOffsetMs: 500
            }
          }
        },
        updatedAt: TEST_ISO_DATE
      }
    },
    {
      name: "invalid segment payload",
      sheetId: "sheet-alpha",
      segmentId: "segment-invalid-payload",
      value: {
        segment: buildSegment({
          id: "segment-invalid-payload",
          name: " "
        }),
        updatedAt: TEST_ISO_DATE
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
      segment: buildSegment({
        id: "segment-bad",
        sheetId: "sheet-bravo"
      }),
      updatedAt: TEST_ISO_DATE
    });

    await expect(browserPracticeSegmentRepository.listSegments("sheet-alpha")).resolves.toEqual([validSegment]);
  });
});
