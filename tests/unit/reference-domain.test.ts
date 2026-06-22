import { describe, expect, it } from "vitest";

import {
  clampReferenceVolume,
  createBilibiliSearchResult,
  isSupportedLocalAudioFile,
  parseBilibiliUrl,
  validateSheetReference
} from "@/domain/reference";

describe("reference domain", () => {
  it("parses supported Bilibili video URLs with URL semantics", () => {
    expect(parseBilibiliUrl("https://www.bilibili.com/video/BV1ab411c7dE/?spm_id_from=333")).toEqual({
      url: "https://www.bilibili.com/video/BV1ab411c7dE",
      bvid: "BV1ab411c7dE",
      embedUrl: "https://player.bilibili.com/player.html?bvid=BV1ab411c7dE"
    });
    expect(parseBilibiliUrl("https://example.com/video/BV1ab411c7dE")).toBeNull();
    expect(parseBilibiliUrl("https://www.bilibili.com/audio/BV1ab411c7dE")).toBeNull();
    expect(parseBilibiliUrl("not a url")).toBeNull();
  });

  it("normalizes Bilibili search results and rejects missing metadata", () => {
    expect(
      createBilibiliSearchResult({
        title: "  Canon   reference  ",
        url: "https://m.bilibili.com/video/BV1XY411P7mn",
        author: "  Player  ",
        durationLabel: "03:12"
      })
    ).toMatchObject({
      id: "BV1XY411P7mn",
      title: "Canon reference",
      bvid: "BV1XY411P7mn",
      author: "Player",
      durationLabel: "03:12"
    });
    expect(createBilibiliSearchResult({ title: "Bad", url: "https://www.bilibili.com/" })).toBeNull();
  });

  it("validates local audio type and clamps volume", () => {
    expect(isSupportedLocalAudioFile(new File(["wav"], "reference.wav", { type: "audio/wav" }))).toBe(true);
    expect(isSupportedLocalAudioFile(new File(["mp3"], "reference.mp3", { type: "" }))).toBe(true);
    expect(isSupportedLocalAudioFile(new File(["txt"], "notes.txt", { type: "text/plain" }))).toBe(false);

    expect(clampReferenceVolume(-1)).toBe(0);
    expect(clampReferenceVolume(0.45)).toBe(0.45);
    expect(clampReferenceVolume(2)).toBe(1);
    expect(clampReferenceVolume(Number.NaN)).toBe(1);
  });

  it("requires references to stay bound to a sheet id", () => {
    expect(() =>
      validateSheetReference({
        id: "reference-1",
        sheetId: "",
        kind: "local-audio",
        title: "Bad",
        fileName: "bad.wav",
        mimeType: "audio/wav",
        sizeBytes: 10,
        durationMs: 1000,
        createdAt: "2026-06-22T00:00:00.000Z",
        updatedAt: "2026-06-22T00:00:00.000Z",
        isActive: true
      })
    ).toThrow();
  });
});
