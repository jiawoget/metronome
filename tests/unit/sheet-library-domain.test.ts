import { describe, expect, it } from "vitest";

import {
  filterSheets,
  formatPageCount,
  getSheetPracticeHref,
  validateSheetMetadata,
  type SheetListItem
} from "@/domain/sheet";

const baseSheet: SheetListItem = {
  id: "sheet-1",
  name: "Autumn Etude",
  category: "exercise",
  bpm: 96,
  timeSignature: "6/8",
  kind: "pdf",
  pageCount: 1,
  imageCount: 0,
  imageDimensions: [],
  mimeTypes: ["application/pdf"],
  sizeBytes: 512,
  originalFileNames: ["autumn-etude.pdf"],
  createdAt: "2026-06-21T10:00:00.000Z",
  updatedAt: "2026-06-21T10:00:00.000Z",
  lastPracticedAt: null,
  artifactStatus: {
    readable: true,
    label: "PDF artifact readable"
  }
};

describe("sheet library domain helpers", () => {
  it("validates category, BPM, and time signature metadata", () => {
    expect(
      validateSheetMetadata({
        name: "Scale warmup",
        category: "scale",
        bpm: 72,
        timeSignature: "4/4"
      }).ok
    ).toBe(true);

    const invalid = validateSheetMetadata({
      name: "",
      category: "song",
      bpm: 12,
      timeSignature: "4-4"
    });

    expect(invalid.ok).toBe(false);
    expect(invalid.ok ? [] : invalid.errors).toEqual([
      "Sheet name is required.",
      "BPM must be at least 30.",
      "Use a time signature like 4/4, 3/4, or 6/8."
    ]);
  });

  it("searches visible metadata and filters by fixed category", () => {
    const song: SheetListItem = {
      ...baseSheet,
      id: "sheet-2",
      name: "Blue Song",
      category: "song",
      bpm: 120,
      timeSignature: "4/4"
    };

    expect(filterSheets([baseSheet, song], { query: "96", category: "all" })).toEqual([baseSheet]);
    expect(filterSheets([baseSheet, song], { query: "song", category: "song" })).toEqual([song]);
    expect(filterSheets([baseSheet, song], { query: "6/8", category: "exercise" })).toEqual([
      baseSheet
    ]);
  });

  it("builds Sheet Practice route targets and page count labels", () => {
    expect(getSheetPracticeHref("sheet 1")).toBe("/sheet-practice?sheetId=sheet%201");
    expect(formatPageCount(baseSheet)).toBe("1 page");
    expect(formatPageCount({ ...baseSheet, pageCount: null })).toBe("Unknown pages");
    expect(formatPageCount({ ...baseSheet, kind: "image", pageCount: 2, imageCount: 2 })).toBe(
      "2 images"
    );
  });
});
