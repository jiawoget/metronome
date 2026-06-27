import { validatePracticeSegment } from "@/domain/practice";
import type { PracticeSegmentRepository, PracticeSegmentService } from "@/services/practice-segments/types";
import {
  DUPLICATE_PRACTICE_SEGMENT_NAME_ERROR_MESSAGE,
  normalizePracticeSegmentId,
  normalizePracticeSegmentNameForComparison,
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
      const normalizedName = normalizePracticeSegmentNameForComparison(validatedSegment.name);

      if (repository.saveSegmentIfNoDuplicateName) {
        const didSave = await repository.saveSegmentIfNoDuplicateName(validatedSegment, normalizedName);

        if (!didSave) {
          throw new Error(DUPLICATE_PRACTICE_SEGMENT_NAME_ERROR_MESSAGE);
        }

        return validatedSegment;
      }

      // Generic repositories are single-writer only here; browser persistence uses the optional transactional guard.
      const sameSheetSegments = await repository.listSegments(validatedSegment.sheetId);
      const duplicateSegment = sameSheetSegments.find(
        (existingSegment) =>
          existingSegment.id !== validatedSegment.id &&
          normalizePracticeSegmentNameForComparison(existingSegment.name) === normalizedName
      );

      if (duplicateSegment) {
        throw new Error(DUPLICATE_PRACTICE_SEGMENT_NAME_ERROR_MESSAGE);
      }

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
