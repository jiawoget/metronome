import { describe, expect, it } from "vitest";

import {
  filterSheets,
  formatPageCount,
  getSheetPracticeHref,
  normalizeSheetTag,
  normalizeSheetTags,
  resolveSheetOrganization,
  validateSheetMetadata,
  validateSheetOrganizationInput,
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
  tags: ["Warm Up"],
  favorite: false,
  artifactStatus: {
    readable: true,
    label: "PDF artifact parsed: 1 page"
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

  it("resolves safe organization defaults and normalizes malformed persisted values", () => {
    expect(resolveSheetOrganization({})).toEqual({
      tags: [],
      favorite: false
    });
    expect(
      resolveSheetOrganization({
        tags: [" Warm   Up ", "", "Focus", "focus", "bad,tag"] as never,
        favorite: "yes" as never
      })
    ).toEqual({
      tags: ["Warm Up", "Focus"],
      favorite: false
    });
    expect(normalizeSheetTag("  Slow   Hands  ")).toBe("Slow Hands");
    expect(normalizeSheetTag("bad,tag")).toBeNull();
    expect(normalizeSheetTag("bad\u007Ftag")).toBeNull();
    expect(normalizeSheetTag("bad\u2028tag")).toBeNull();
    expect(normalizeSheetTag("bad\u2029tag")).toBeNull();
    expect(
      normalizeSheetTags([
        " Warm   Up ",
        "focus",
        "Focus",
        "bad,tag",
        42
      ])
    ).toEqual(["Warm Up", "focus"]);
  });

  it("validates organization writes for empty, malformed, overlong, and over-count tags", () => {
    expect(
      validateSheetOrganizationInput({
        tags: [" Warm   Up ", "focus", "Focus"],
        favorite: true
      })
    ).toEqual({
      ok: true,
      value: {
        tags: ["Warm Up", "focus"],
        favorite: true
      }
    });

    expect(
      validateSheetOrganizationInput({
        tags: [""],
        favorite: false
      })
    ).toEqual({
      ok: false,
      errors: ["Tags cannot be empty."]
    });
    expect(
      validateSheetOrganizationInput({
        tags: ["bad,tag"],
        favorite: false
      })
    ).toEqual({
      ok: false,
      errors: ["Tags cannot contain commas, line breaks, or control characters."]
    });
    expect(
      validateSheetOrganizationInput({
        tags: ["bad\u007Ftag", "bad\u2028tag", "bad\u2029tag"],
        favorite: false
      })
    ).toEqual({
      ok: false,
      errors: ["Tags cannot contain commas, line breaks, or control characters."]
    });
    expect(
      validateSheetOrganizationInput({
        tags: ["x".repeat(25)],
        favorite: false
      })
    ).toEqual({
      ok: false,
      errors: ["Tags must be 24 characters or fewer."]
    });
    expect(
      validateSheetOrganizationInput({
        tags: Array.from({ length: 13 }, (_, index) => `Tag ${index}`),
        favorite: false
      })
    ).toEqual({
      ok: false,
      errors: ["Sheets can have at most 12 tags."]
    });
  });

  it("searches visible metadata and composes fixed category, favorite, and tag filters", () => {
    const song: SheetListItem = {
      ...baseSheet,
      id: "sheet-2",
      name: "Blue Song",
      category: "song",
      bpm: 120,
      timeSignature: "4/4",
      tags: ["Performance"],
      favorite: true
    };
    const scale: SheetListItem = {
      ...baseSheet,
      id: "sheet-3",
      name: "Arpeggio Ladder",
      category: "scale",
      bpm: 72,
      timeSignature: "3/4",
      tags: ["Focus"],
      favorite: true
    };

    expect(
      filterSheets([baseSheet, song, scale], { query: "warm up", category: "all" })
    ).toEqual([baseSheet]);
    expect(
      filterSheets([baseSheet, song, scale], { query: "song", category: "song" })
    ).toEqual([song]);
    expect(
      filterSheets([baseSheet, song, scale], {
        query: "6/8",
        category: "exercise",
        favorite: "all"
      })
    ).toEqual([
      baseSheet
    ]);
    expect(
      filterSheets([baseSheet, song, scale], {
        query: "",
        category: "all",
        favorite: "favorites"
      })
    ).toEqual([song, scale]);
    expect(
      filterSheets([baseSheet, song, scale], {
        query: "",
        category: "all",
        tag: "focus"
      })
    ).toEqual([scale]);
    expect(
      filterSheets([baseSheet, song, scale], {
        query: "72",
        category: "scale",
        favorite: "favorites",
        tag: "focus"
      })
    ).toEqual([scale]);
  });

  it("builds Sheet Practice route targets and page count labels", () => {
    expect(getSheetPracticeHref("sheet 1")).toBe("/sheet-practice/sheet%201");
    expect(formatPageCount(baseSheet)).toBe("1 page");
    expect(formatPageCount({ ...baseSheet, pageCount: null })).toBe("Unknown pages");
    expect(formatPageCount({ ...baseSheet, kind: "image", pageCount: 2, imageCount: 2 })).toBe(
      "2 images"
    );
  });
});
