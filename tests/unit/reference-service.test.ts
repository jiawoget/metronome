import { beforeEach, describe, expect, it } from "vitest";

import {
  createBilibiliSearchResult,
  validateLocalAudioArtifact,
  validateSheetReference,
  type BilibiliSearchResult,
  type LocalAudioReferenceArtifact,
  type SheetReference
} from "@/domain/reference";
import {
  createReferenceService,
  type BilibiliSearchAdapter,
  type LocalAudioInspectionAdapter,
  type ReferenceRepository
} from "@/services/reference";

function createMemoryRepository(): ReferenceRepository {
  const references = new Map<string, SheetReference>();
  const artifacts = new Map<string, LocalAudioReferenceArtifact>();
  const listReferences = async (sheetId: string) =>
    Array.from(references.values())
      .filter((reference) => reference.sheetId === sheetId)
      .sort((first, second) => Number(second.isActive) - Number(first.isActive));

  return {
    listReferences,
    async countAllReferences() {
      return references.size;
    },
    async getActiveReference(sheetId) {
      return (await listReferences(sheetId)).find((reference) => reference.isActive) ?? null;
    },
    async getLocalAudioArtifact(referenceId) {
      return artifacts.get(referenceId) ?? null;
    },
    async saveReference(reference, artifact) {
      Array.from(references.values()).forEach((existingReference) => {
        if (existingReference.sheetId === reference.sheetId) {
          references.set(existingReference.id, validateSheetReference({ ...existingReference, isActive: false }));
        }
      });
      references.set(reference.id, validateSheetReference(reference));
      if (artifact) {
        artifacts.set(reference.id, validateLocalAudioArtifact(artifact));
      }
    },
    async clear() {
      references.clear();
      artifacts.clear();
    },
    subscribe() {
      return () => undefined;
    }
  };
}

function createInspectionAdapter(result: Awaited<ReturnType<LocalAudioInspectionAdapter["inspectFile"]>>) {
  return {
    async inspectFile() {
      return result;
    }
  } satisfies LocalAudioInspectionAdapter;
}

function createSearchAdapter(result: Awaited<ReturnType<BilibiliSearchAdapter["search"]>>) {
  return {
    async search() {
      return result;
    }
  } satisfies BilibiliSearchAdapter;
}

const bilibiliResult = createBilibiliSearchResult({
  title: "Fixture result",
  url: "https://www.bilibili.com/video/BV1ab411c7dE",
  author: "Fixture Artist",
  durationLabel: "03:42"
}) as BilibiliSearchResult;

describe("reference service", () => {
  let idNumber: number;

  beforeEach(() => {
    idNumber = 0;
  });

  function createService(options?: {
    repository?: ReferenceRepository;
    inspectionAdapter?: LocalAudioInspectionAdapter;
    searchAdapter?: BilibiliSearchAdapter;
  }) {
    return createReferenceService({
      repository: options?.repository ?? createMemoryRepository(),
      localAudioInspectionAdapter:
        options?.inspectionAdapter ??
        createInspectionAdapter({
          ok: true,
          value: { durationMs: 1234 }
        }),
      bilibiliSearchAdapter:
        options?.searchAdapter ??
        createSearchAdapter({
          ok: true,
          value: [bilibiliResult]
        }),
      now: () => new Date("2026-06-22T00:00:00.000Z"),
      createId: (prefix) => `${prefix}-${++idNumber}`
    });
  }

  it("saves local audio metadata and artifact linked to sheetId", async () => {
    const repository = createMemoryRepository();
    const service = createService({ repository });
    const file = new File(["RIFF"], "practice-reference.wav", { type: "audio/wav" });

    const result = await service.addLocalAudioReference({
      sheetId: "sheet-alpha",
      file,
      title: "My reference"
    });

    expect(result).toMatchObject({
      ok: true,
      value: {
        id: "reference-1",
        sheetId: "sheet-alpha",
        kind: "local-audio",
        title: "My reference",
        fileName: "practice-reference.wav",
        durationMs: 1234,
        isActive: true
      }
    });
    expect(await service.getLocalAudioArtifact("reference-1")).toMatchObject({
      referenceId: "reference-1",
      sheetId: "sheet-alpha",
      mimeType: "audio/wav"
    });
    expect(await service.getActiveReference("sheet-alpha")).toMatchObject({ id: "reference-1" });
  });

  it("rejects bad local audio without saving a playable reference", async () => {
    const service = createService({
      inspectionAdapter: createInspectionAdapter({
        ok: false,
        message: "decode failed"
      })
    });

    await expect(
      service.addLocalAudioReference({
        sheetId: "sheet-alpha",
        file: new File(["bad"], "broken.wav", { type: "audio/wav" })
      })
    ).resolves.toEqual({
      ok: false,
      message: "decode failed"
    });
    await expect(service.listReferences("sheet-alpha")).resolves.toEqual([]);
  });

  it("searches Bilibili through the adapter and saves selected result metadata", async () => {
    const service = createService();
    const search = await service.searchBilibili("canon");

    expect(search).toEqual({
      ok: true,
      value: [bilibiliResult]
    });

    const saved = await service.saveBilibiliSearchResultReference({
      sheetId: "sheet-alpha",
      result: bilibiliResult
    });

    expect(saved).toMatchObject({
      ok: true,
      value: {
        id: "reference-1",
        sheetId: "sheet-alpha",
        kind: "bilibili",
        title: "Fixture result",
        bvid: "BV1ab411c7dE",
        embedUrl: "https://player.bilibili.com/player.html?bvid=BV1ab411c7dE"
      }
    });
    await expect(service.getActiveReference("sheet-alpha")).resolves.toMatchObject({
      kind: "bilibili",
      bvid: "BV1ab411c7dE"
    });
  });

  it("saves pasted Bilibili URLs and reports invalid URLs", async () => {
    const service = createService();

    await expect(
      service.saveBilibiliUrlReference({
        sheetId: "sheet-alpha",
        url: "https://www.bilibili.com/video/BV1XY411P7mn",
        title: "Pasted URL"
      })
    ).resolves.toMatchObject({
      ok: true,
      value: {
        kind: "bilibili",
        title: "Pasted URL",
        bvid: "BV1XY411P7mn"
      }
    });
    await expect(
      service.saveBilibiliUrlReference({
        sheetId: "sheet-alpha",
        url: "https://example.com/video/BV1XY411P7mn"
      })
    ).resolves.toEqual({
      ok: false,
      message: "Enter a Bilibili video URL like https://www.bilibili.com/video/BV..."
    });
  });

  it("keeps references scoped per sheet and marks the newest one active", async () => {
    const service = createService();

    await service.addLocalAudioReference({
      sheetId: "sheet-alpha",
      file: new File(["RIFF"], "alpha.wav", { type: "audio/wav" })
    });
    await service.saveBilibiliSearchResultReference({
      sheetId: "sheet-alpha",
      result: bilibiliResult
    });
    await service.addLocalAudioReference({
      sheetId: "sheet-beta",
      file: new File(["RIFF"], "beta.wav", { type: "audio/wav" })
    });

    await expect(service.listReferences("sheet-alpha")).resolves.toMatchObject([
      { id: "reference-2", isActive: true },
      { id: "reference-1", isActive: false }
    ]);
    await expect(service.listReferences("sheet-beta")).resolves.toMatchObject([
      { id: "reference-3", sheetId: "sheet-beta", isActive: true }
    ]);
  });

  it("returns clear search and missing sheet errors", async () => {
    const service = createService({
      searchAdapter: createSearchAdapter({
        ok: false,
        message: "Bilibili search failed. Keep your query and try again."
      })
    });

    await expect(service.searchBilibili("a")).resolves.toEqual({
      ok: false,
      message: "Enter at least two characters to search Bilibili references."
    });
    await expect(service.searchBilibili("canon")).resolves.toEqual({
      ok: false,
      message: "Bilibili search failed. Keep your query and try again."
    });
    await expect(
      service.addLocalAudioReference({
        sheetId: null,
        file: new File(["RIFF"], "alpha.wav", { type: "audio/wav" })
      })
    ).resolves.toEqual({
      ok: false,
      message: "Open a saved sheet before adding a reference."
    });
  });
});
