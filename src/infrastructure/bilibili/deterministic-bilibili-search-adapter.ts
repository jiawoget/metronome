import {
  createBilibiliSearchResult,
  type BilibiliSearchResult
} from "@/domain/reference";
import type { BilibiliSearchAdapter, ReferenceResult } from "@/services/reference";

const fixtureRows = [
  {
    title: "Canon in D guitar practice reference",
    url: "https://www.bilibili.com/video/BV1ab411c7dE",
    author: "Practice Room",
    durationLabel: "03:42",
    thumbnailUrl: "https://i0.hdslb.com/bfs/archive/reference-canon.jpg"
  },
  {
    title: "Slow metronome violin etude reference",
    url: "https://www.bilibili.com/video/BV1XY411P7mn",
    author: "Daily Etude",
    durationLabel: "05:16",
    thumbnailUrl: "https://i0.hdslb.com/bfs/archive/reference-etude.jpg"
  },
  {
    title: "Left hand rhythm warmup play along",
    url: "https://www.bilibili.com/video/BV1Q5411Y7k9",
    author: "Rhythm Lab",
    durationLabel: "02:58",
    thumbnailUrl: "https://i0.hdslb.com/bfs/archive/reference-rhythm.jpg"
  }
];

const fixtureResults = fixtureRows
  .map(createBilibiliSearchResult)
  .filter((result): result is BilibiliSearchResult => result !== null);

export class DeterministicBilibiliSearchAdapter implements BilibiliSearchAdapter {
  async search(query: string): Promise<ReferenceResult<BilibiliSearchResult[]>> {
    const normalizedQuery = query.trim().toLowerCase();

    if (normalizedQuery.includes("fail") || normalizedQuery.includes("error")) {
      return {
        ok: false,
        message: "Bilibili search failed. Keep your query and try again."
      };
    }

    const matches = fixtureResults.filter((result) =>
      [result.title, result.author ?? "", result.bvid].some((value) => value.toLowerCase().includes(normalizedQuery))
    );

    return {
      ok: true,
      value: matches.length > 0 ? matches : fixtureResults
    };
  }
}
