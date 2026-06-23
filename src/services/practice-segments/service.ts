import { validatePracticeSegment } from "@/domain/practice";
import type { PracticeSegmentRepository, PracticeSegmentService } from "@/services/practice-segments/types";
import {
  normalizePracticeSegmentId,
  normalizePracticeSegmentSheetId
} from "@/services/practice-segments/validation";

export function createPracticeSegmentService(repository: PracticeSegmentRepository): PracticeSegmentService {
  return {
    async listSegments(sheetId) {
      return repository.listSegments(normalizePracticeSegmentSheetId(sheetId));
    },

    async getSegment(sheetId, segmentId) {
      return repository.getSegment(
        normalizePracticeSegmentSheetId(sheetId),
        normalizePracticeSegmentId(segmentId)
      );
    },

    async saveSegment(segment) {
      const validatedSegment = validatePracticeSegment(segment);

      await repository.saveSegment(validatedSegment);

      return validatedSegment;
    },

    async deleteSegment(sheetId, segmentId) {
      return repository.deleteSegment(
        normalizePracticeSegmentSheetId(sheetId),
        normalizePracticeSegmentId(segmentId)
      );
    }
  };
}
