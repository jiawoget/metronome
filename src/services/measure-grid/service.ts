import { validateMeasureGrid } from "@/domain/practice";
import type { MeasureGridRepository, MeasureGridService } from "@/services/measure-grid/types";
import { normalizeMeasureGridSheetId } from "@/services/measure-grid/validation";

export function createMeasureGridService(repository: MeasureGridRepository): MeasureGridService {
  return {
    async getGrid(sheetId) {
      return repository.getGrid(normalizeMeasureGridSheetId(sheetId));
    },

    async saveGrid(sheetId, grid) {
      const normalizedSheetId = normalizeMeasureGridSheetId(sheetId);
      const validatedGrid = validateMeasureGrid(grid);

      await repository.saveGrid(normalizedSheetId, validatedGrid);

      return validatedGrid;
    },

    async clearGrid(sheetId) {
      return repository.clearGrid(normalizeMeasureGridSheetId(sheetId));
    }
  };
}
