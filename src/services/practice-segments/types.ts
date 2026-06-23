import type { PracticeSegment } from "@/domain/practice";

export type PracticeSegmentRepository = {
  listSegments: (sheetId: string) => Promise<PracticeSegment[]>;
  getSegment: (sheetId: string, segmentId: string) => Promise<PracticeSegment | null>;
  saveSegment: (segment: PracticeSegment) => Promise<void>;
  deleteSegment: (sheetId: string, segmentId: string) => Promise<void>;
};

export type PracticeSegmentService = {
  listSegments: (sheetId: string) => Promise<PracticeSegment[]>;
  getSegment: (sheetId: string, segmentId: string) => Promise<PracticeSegment | null>;
  saveSegment: (segment: PracticeSegment) => Promise<PracticeSegment>;
  deleteSegment: (sheetId: string, segmentId: string) => Promise<void>;
};
