import {
  validateSheetMetadata,
  type ImportedSheet,
  type SheetArtifact,
  type SheetArtifactStatus,
  type SheetListItem
} from "@/domain/sheet";
import type {
  ImportSheetInput,
  SheetImportAdapter,
  SheetLibraryRepository,
  SheetLibraryService
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

function getArtifactStatus(sheet: ImportedSheet, artifact: SheetArtifact | null): SheetArtifactStatus {
  if (!artifact || artifact.files.length === 0) {
    return {
      readable: false,
      label: "Artifact inaccessible"
    };
  }

  if (artifact.kind !== sheet.kind || artifact.sheetId !== sheet.id) {
    return {
      readable: false,
      label: "Artifact metadata mismatch"
    };
  }

  const readableFiles = artifact.files.every((file) => file.blob.size > 0 && file.sizeBytes > 0);

  if (!readableFiles) {
    return {
      readable: false,
      label: "Artifact inaccessible"
    };
  }

  return {
    readable: true,
    label: sheet.kind === "pdf" ? "PDF artifact readable" : "Image artifact readable"
  };
}

export function createSheetLibraryService({
  repository,
  importAdapter,
  now = () => new Date(),
  createId = createSheetId
}: SheetLibraryServiceOptions): SheetLibraryService {
  async function toListItem(sheet: ImportedSheet): Promise<SheetListItem> {
    const artifact = await repository.getArtifact(sheet.id);

    return {
      ...sheet,
      artifactStatus: getArtifactStatus(sheet, artifact)
    };
  }

  return {
    async listSheets() {
      const sheets = await repository.listSheets();
      const items = await Promise.all(sheets.map(toListItem));

      return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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
        lastPracticedAt: null
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
        sheet: {
          ...sheet,
          artifactStatus: getArtifactStatus(sheet, artifact)
        }
      };
    },

    deleteSheet(sheetId) {
      return repository.deleteSheet(sheetId);
    },

    getArtifact(sheetId) {
      return repository.getArtifact(sheetId);
    }
  };
}
