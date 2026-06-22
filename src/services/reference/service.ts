import {
  createBilibiliSearchResult,
  isSupportedLocalAudioFile,
  normalizeReferenceTitle,
  parseBilibiliUrl,
  validateLocalAudioArtifact,
  validateSheetReference,
  type BilibiliReference,
  type BilibiliSearchResult,
  type LocalAudioReference
} from "@/domain/reference";
import type {
  BilibiliResultReferenceInput,
  BilibiliSearchAdapter,
  BilibiliUrlReferenceInput,
  LocalAudioInspectionAdapter,
  LocalAudioReferenceInput,
  ReferenceRepository,
  ReferenceResult,
  ReferenceService
} from "@/services/reference/types";

type CreateReferenceServiceOptions = {
  repository: ReferenceRepository;
  localAudioInspectionAdapter: LocalAudioInspectionAdapter;
  bilibiliSearchAdapter: BilibiliSearchAdapter;
  now?: () => Date;
  createId?: (prefix: string) => string;
};

function createDefaultId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function missingSheetResult<T>(): ReferenceResult<T> {
  return {
    ok: false,
    message: "Open a saved sheet before adding a reference."
  };
}

function createBilibiliReference(input: {
  id: string;
  sheetId: string;
  result: BilibiliSearchResult;
  timestamp: string;
}): BilibiliReference {
  return validateSheetReference({
    id: input.id,
    sheetId: input.sheetId,
    kind: "bilibili",
    title: input.result.title,
    url: input.result.url,
    bvid: input.result.bvid,
    author: input.result.author,
    durationLabel: input.result.durationLabel,
    thumbnailUrl: input.result.thumbnailUrl,
    embedUrl: input.result.embedUrl,
    createdAt: input.timestamp,
    updatedAt: input.timestamp,
    isActive: true
  }) as BilibiliReference;
}

export function createReferenceService({
  repository,
  localAudioInspectionAdapter,
  bilibiliSearchAdapter,
  now = () => new Date(),
  createId = createDefaultId
}: CreateReferenceServiceOptions): ReferenceService {
  return {
    listReferences(sheetId) {
      return repository.listReferences(sheetId);
    },

    countAllReferences() {
      return repository.countAllReferences();
    },

    getActiveReference(sheetId) {
      return repository.getActiveReference(sheetId);
    },

    getLocalAudioArtifact(referenceId) {
      return repository.getLocalAudioArtifact(referenceId);
    },

    async addLocalAudioReference(input: LocalAudioReferenceInput) {
      if (!input.sheetId) {
        return missingSheetResult();
      }

      if (!isSupportedLocalAudioFile(input.file)) {
        return {
          ok: false,
          message: "Choose a playable audio file such as WAV, MP3, OGG, AAC, M4A, or WebM."
        };
      }

      const inspection = await localAudioInspectionAdapter.inspectFile(input.file);

      if (!inspection.ok) {
        return inspection;
      }

      const timestamp = now().toISOString();
      const reference = validateSheetReference({
        id: createId("reference"),
        sheetId: input.sheetId,
        kind: "local-audio",
        title: normalizeReferenceTitle(input.title ?? "", input.file.name),
        fileName: input.file.name,
        mimeType: input.file.type || "audio/*",
        sizeBytes: input.file.size,
        durationMs: inspection.value.durationMs,
        createdAt: timestamp,
        updatedAt: timestamp,
        isActive: true
      }) as LocalAudioReference;

      const artifact = validateLocalAudioArtifact({
        referenceId: reference.id,
        sheetId: input.sheetId,
        blob: input.file,
        mimeType: reference.mimeType,
        sizeBytes: reference.sizeBytes,
        createdAt: timestamp
      });

      await repository.saveReference(reference, artifact);

      return {
        ok: true,
        value: reference
      };
    },

    async saveBilibiliUrlReference(input: BilibiliUrlReferenceInput) {
      if (!input.sheetId) {
        return missingSheetResult();
      }

      const metadata = parseBilibiliUrl(input.url);

      if (!metadata) {
        return {
          ok: false,
          message: "Enter a Bilibili video URL like https://www.bilibili.com/video/BV..."
        };
      }

      const result = createBilibiliSearchResult({
        title: input.title ?? `Bilibili ${metadata.bvid}`,
        url: metadata.url
      });

      if (!result) {
        return {
          ok: false,
          message: "The Bilibili URL could not be saved."
        };
      }

      const reference = createBilibiliReference({
        id: createId("reference"),
        sheetId: input.sheetId,
        result,
        timestamp: now().toISOString()
      });

      await repository.saveReference(reference, null);

      return {
        ok: true,
        value: reference
      };
    },

    async saveBilibiliSearchResultReference(input: BilibiliResultReferenceInput) {
      if (!input.sheetId) {
        return missingSheetResult();
      }

      const normalized = createBilibiliSearchResult(input.result);

      if (!normalized) {
        return {
          ok: false,
          message: "The selected Bilibili result is missing a valid video URL."
        };
      }

      const reference = createBilibiliReference({
        id: createId("reference"),
        sheetId: input.sheetId,
        result: normalized,
        timestamp: now().toISOString()
      });

      await repository.saveReference(reference, null);

      return {
        ok: true,
        value: reference
      };
    },

    async searchBilibili(query) {
      const normalizedQuery = query.trim();

      if (normalizedQuery.length < 2) {
        return {
          ok: false,
          message: "Enter at least two characters to search Bilibili references."
        };
      }

      return bilibiliSearchAdapter.search(normalizedQuery);
    },

    subscribe(listener) {
      return repository.subscribe(listener);
    }
  };
}
