import type { MeasureGrid } from "@/domain/practice";

export type MeasureGridRepository = {
  getGrid: (sheetId: string) => Promise<MeasureGrid | null>;
  saveGrid: (sheetId: string, grid: MeasureGrid) => Promise<void>;
  clearGrid: (sheetId: string) => Promise<void>;
};

export type MeasureGridService = {
  getGrid: (sheetId: string) => Promise<MeasureGrid | null>;
  saveGrid: (sheetId: string, grid: MeasureGrid) => Promise<MeasureGrid>;
  clearGrid: (sheetId: string) => Promise<void>;
};
