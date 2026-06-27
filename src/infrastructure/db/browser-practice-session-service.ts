"use client";

import { createGlobalPracticeSessionRepository } from "@/infrastructure/db/global-practice-session-repository";
import { practiceSessionRepository } from "@/infrastructure/db/practice-session-repository";
import { recordingHistoryMetadataRepository } from "@/infrastructure/db/recording-history-metadata-repository";
import { browserSheetLibraryService } from "@/infrastructure/files/sheet-library-service";
import type { PracticeTimeSignature } from "@/domain/practice";
import { createPracticeSessionService, type PracticeSessionSheetGateway } from "@/services/practice-session";

function toPracticeTimeSignature(value: string): PracticeTimeSignature | null {
  return value === "2/4" || value === "3/4" || value === "4/4" || value === "6/8" || value === "12/8"
    ? value
    : null;
}

const sheetGateway: PracticeSessionSheetGateway = {
  async getSheetContext(sheetId) {
    const sheet = await browserSheetLibraryService.getSheet(sheetId);

    if (!sheet) {
      return null;
    }

    return {
      id: sheet.id,
      name: sheet.name,
      bpm: sheet.bpm,
      timeSignature: toPracticeTimeSignature(sheet.timeSignature)
    };
  },

  updateLastPracticedAt(sheetId, practicedAt) {
    return browserSheetLibraryService.updateLastPracticedAt(sheetId, practicedAt);
  }
};

export const browserPracticeSessionService = createPracticeSessionService({
  repository: createGlobalPracticeSessionRepository(practiceSessionRepository),
  recordingRepository: recordingHistoryMetadataRepository,
  sheetGateway
});
