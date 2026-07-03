import {
  resolveSheetOrganization,
  validateSheetMetadata,
  validateSheetOrganizationInput,
  type ImportedSheet,
  type SheetArtifact,
  type SheetListItem
} from "@/domain/sheet";
import type {
  ImportSheetInput,
  SetSheetFavoriteInput,
  SetSheetTagsInput,
  SheetImportAdapter,
  SheetLibraryRepository,
  SheetLibraryService,
  UpdateSheetOrganizationInput,
  UpdateSheetMetadataInput
} from "@/services/sheet-library/types";

type SheetLibraryServiceOptions = {
  repository: SheetLibraryRepository;
  importAdapter: SheetImportAdapter;
  now?: () => Date;
  createId?: () => string;
};

function createSheetId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `sheet_${crypto.randomUUID()}`;
  }

  return `sheet_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function createSheetLibraryService({
  repository,
  importAdapter,
  now = () => new Date(),
  createId = createSheetId
}: SheetLibraryServiceOptions): SheetLibraryService {
  function normalizeOrganization(sheet: ImportedSheet): ImportedSheet {
    return {
      ...sheet,
      ...resolveSheetOrganization(sheet)
    };
  }

  async function toListItem(sheet: ImportedSheet): Promise<SheetListItem> {
    const normalizedSheet = normalizeOrganization(sheet);
    const artifact = await repository.getArtifact(normalizedSheet.id);
    const artifactStatus = await importAdapter.inspectArtifact(normalizedSheet, artifact);

    return {
      ...normalizedSheet,
      artifactStatus
    };
  }

  async function updateSheetOrganization({
    sheetId,
    tags,
    favorite
  }: UpdateSheetOrganizationInput) {
    const normalizedSheetId = sheetId.trim();

    if (!normalizedSheetId) {
      return {
        ok: false,
        message: "Sheet id is required."
      } as const;
    }

    if (tags === undefined && favorite === undefined) {
      return {
        ok: false,
        message: "Sheet organization update requires tags or favorite."
      } as const;
    }

    let currentSheet: ImportedSheet | null = null;

    if (tags === undefined || favorite === undefined) {
      currentSheet = await repository.getSheet(normalizedSheetId);

      if (!currentSheet) {
        return {
          ok: false,
          message:
            "Sheet organization could not be updated because the sheet was not found."
        } as const;
      }
    }

    const currentOrganization = currentSheet
      ? resolveSheetOrganization(currentSheet)
      : { tags: [], favorite: false };
    const organizationResult = validateSheetOrganizationInput({
      tags: tags ?? currentOrganization.tags,
      favorite: favorite ?? currentOrganization.favorite
    });

    if (!organizationResult.ok) {
      return {
        ok: false,
        message: organizationResult.errors.join(" ")
      } as const;
    }

    const updatedSheet = await repository.updateSheetOrganization(
      normalizedSheetId,
      organizationResult.value,
      now().toISOString()
    );

    if (!updatedSheet) {
      return {
        ok: false,
        message:
          "Sheet organization could not be updated because the sheet was not found."
      } as const;
    }

    return {
      ok: true,
      sheet: await toListItem(updatedSheet)
    } as const;
  }

  return {
    async listSheets() {
      const sheets = await repository.listSheets();
      const items = await Promise.all(sheets.map(toListItem));

      return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    async getSheet(sheetId) {
      const sheet = await repository.getSheet(sheetId);

      return sheet ? toListItem(sheet) : null;
    },

    previewImport(files) {
      return importAdapter.analyzeFiles(files);
    },

    async importSheet({ files, metadata }: ImportSheetInput) {
      const metadataResult = validateSheetMetadata(metadata);

      if (!metadataResult.ok) {
        return {
          ok: false,
          message: metadataResult.errors.join(" ")
        };
      }

      const previewResult = await importAdapter.analyzeFiles(files);

      if (!previewResult.ok) {
        return previewResult;
      }

      const createdAt = now().toISOString();
      const sheet: ImportedSheet = {
        id: createId(),
        ...metadataResult.value,
        kind: previewResult.preview.kind,
        pageCount: previewResult.preview.pageCount,
        imageCount: previewResult.preview.imageCount,
        imageDimensions: previewResult.preview.imageDimensions,
        mimeTypes: previewResult.preview.mimeTypes,
        sizeBytes: previewResult.preview.sizeBytes,
        originalFileNames: previewResult.preview.originalFileNames,
        createdAt,
        updatedAt: createdAt,
        lastPracticedAt: null,
        ...resolveSheetOrganization({})
      };
      const artifact: SheetArtifact = {
        sheetId: sheet.id,
        kind: sheet.kind,
        files: previewResult.preview.files,
        createdAt
      };

      await repository.saveSheet(sheet, artifact);

      return {
        ok: true,
        sheet: await toListItem(sheet)
      };
    },

    async updateSheetMetadata({ sheetId, metadata }: UpdateSheetMetadataInput) {
      const metadataResult = validateSheetMetadata(metadata);

      if (!metadataResult.ok) {
        return {
          ok: false,
          message: metadataResult.errors.join(" ")
        };
      }

      const updatedSheet = await repository.updateSheetMetadata(
        sheetId,
        metadataResult.value,
        now().toISOString()
      );

      if (!updatedSheet) {
        return {
          ok: false,
          message:
            "Sheet metadata could not be updated because the sheet was not found."
        };
      }

      return {
        ok: true,
        sheet: await toListItem(updatedSheet)
      };
    },

    updateSheetOrganization,

    setSheetTags(input: SetSheetTagsInput) {
      return updateSheetOrganization(input);
    },

    setSheetFavorite(input: SetSheetFavoriteInput) {
      return updateSheetOrganization(input);
    },

    updateLastPracticedAt(sheetId, practicedAt) {
      return repository.updateLastPracticedAt(sheetId, practicedAt);
    },

    deleteSheet(sheetId) {
      return repository.deleteSheet(sheetId);
    },

    getArtifact(sheetId) {
      return repository.getArtifact(sheetId);
    },

    clear() {
      return repository.clear();
    }
  };
}
