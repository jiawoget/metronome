import { describe, expect, it, vi } from "vitest";

import {
  FetchBilibiliSearchAdapter,
  normalizeBilibiliApiResults
} from "@/infrastructure/bilibili/fetch-bilibili-search-adapter";

describe("fetch Bilibili search adapter", () => {
  it("normalizes Bilibili API video rows into reference search results", () => {
    expect(
      normalizeBilibiliApiResults([
        {
          title: '<em class="keyword">Canon</em> reference',
          arcurl: "https://www.bilibili.com/video/BV1ab411c7dE",
          author: " Practice Room ",
          duration: 222,
          pic: "//i0.hdslb.com/bfs/archive/canon.jpg"
        },
        {
          title: "BVID fallback",
          bvid: "BV1XY411P7mn",
          author: "Daily Etude",
          duration: "05:16",
          pic: "https://i0.hdslb.com/bfs/archive/etude.jpg"
        },
        {
          title: "Missing video URL"
        }
      ])
    ).toEqual([
      {
        id: "BV1ab411c7dE",
        title: "Canon reference",
        url: "https://www.bilibili.com/video/BV1ab411c7dE",
        bvid: "BV1ab411c7dE",
        author: "Practice Room",
        durationLabel: "3:42",
        thumbnailUrl: "https://i0.hdslb.com/bfs/archive/canon.jpg",
        embedUrl: "https://player.bilibili.com/player.html?bvid=BV1ab411c7dE"
      },
      {
        id: "BV1XY411P7mn",
        title: "BVID fallback",
        url: "https://www.bilibili.com/video/BV1XY411P7mn",
        bvid: "BV1XY411P7mn",
        author: "Daily Etude",
        durationLabel: "05:16",
        thumbnailUrl: "https://i0.hdslb.com/bfs/archive/etude.jpg",
        embedUrl: "https://player.bilibili.com/player.html?bvid=BV1XY411P7mn"
      }
    ]);
  });

  it("searches through fetch with Bilibili query parameters", async () => {
    let requestedUrl = "";
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      requestedUrl = String(input);

      return new Response(
        JSON.stringify({
          code: 0,
          data: {
            result: [
              {
                title: "Rhythm reference",
                arcurl: "https://www.bilibili.com/video/BV1Q5411Y7k9",
                author: "Rhythm Lab",
                duration: 178
              }
            ]
          }
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    });
    const adapter = new FetchBilibiliSearchAdapter({
      fetchImpl: fetchMock as unknown as typeof fetch,
      endpoint: "https://api.bilibili.test/search/type"
    });

    await expect(adapter.search("rhythm")).resolves.toEqual({
      ok: true,
      value: [
        {
          id: "BV1Q5411Y7k9",
          title: "Rhythm reference",
          url: "https://www.bilibili.com/video/BV1Q5411Y7k9",
          bvid: "BV1Q5411Y7k9",
          author: "Rhythm Lab",
          durationLabel: "2:58",
          thumbnailUrl: null,
          embedUrl: "https://player.bilibili.com/player.html?bvid=BV1Q5411Y7k9"
        }
      ]
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = new URL(requestedUrl);

    expect(calledUrl.searchParams.get("search_type")).toBe("video");
    expect(calledUrl.searchParams.get("keyword")).toBe("rhythm");
  });

  it("returns clear errors for network, API, unreadable, and empty-result failures", async () => {
    await expect(
      new FetchBilibiliSearchAdapter({
        fetchImpl: vi.fn(async () => {
          throw new Error("network down");
        })
      }).search("canon")
    ).resolves.toEqual({
      ok: false,
      message:
        "Live Bilibili API search is unavailable. Use Bilibili web search or paste a video URL."
    });

    await expect(
      new FetchBilibiliSearchAdapter({
        fetchImpl: vi.fn(
          async () =>
            new Response(JSON.stringify({ code: -1, message: "blocked" }), {
              status: 200
            })
        )
      }).search("canon")
    ).resolves.toEqual({
      ok: false,
      message: "Bilibili search failed: blocked"
    });

    await expect(
      new FetchBilibiliSearchAdapter({
        fetchImpl: vi.fn(async () => new Response("not json", { status: 200 }))
      }).search("canon")
    ).resolves.toEqual({
      ok: false,
      message: "Bilibili search returned an unreadable response."
    });

    await expect(
      new FetchBilibiliSearchAdapter({
        fetchImpl: vi.fn(
          async () =>
            new Response(JSON.stringify({ code: 0, data: { result: [] } }), {
              status: 200
            })
        )
      }).search("canon")
    ).resolves.toEqual({
      ok: false,
      message: "No playable Bilibili video results were found for that query."
    });
  });
});
