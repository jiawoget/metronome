import {
  createBilibiliSearchResult,
  type BilibiliSearchResult
} from "@/domain/reference";
import type { BilibiliSearchAdapter, ReferenceResult } from "@/services/reference";

type BilibiliApiVideoResult = {
  title?: unknown;
  arcurl?: unknown;
  bvid?: unknown;
  author?: unknown;
  duration?: unknown;
  pic?: unknown;
};

type BilibiliApiResponse = {
  code?: unknown;
  message?: unknown;
  data?: {
    result?: unknown;
  };
};

type FetchBilibiliSearchAdapterOptions = {
  fetchImpl?: typeof fetch;
  endpoint?: string;
};

const defaultEndpoint = "https://api.bilibili.com/x/web-interface/search/type";

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function formatDuration(value: unknown) {
  if (typeof value === "string") {
    return value.trim() || null;
  }

  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }

  const totalSeconds = Math.round(value);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function normalizeThumbnail(value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  const thumbnail = value.trim();

  if (thumbnail.startsWith("//")) {
    return `https:${thumbnail}`;
  }

  return thumbnail;
}

function getResultUrl(result: BilibiliApiVideoResult) {
  if (typeof result.arcurl === "string" && result.arcurl.trim().length > 0) {
    return result.arcurl.trim();
  }

  if (typeof result.bvid === "string" && result.bvid.trim().length > 0) {
    return `https://www.bilibili.com/video/${result.bvid.trim()}`;
  }

  return null;
}

export function normalizeBilibiliApiResults(results: unknown): BilibiliSearchResult[] {
  if (!Array.isArray(results)) {
    return [];
  }

  return results
    .map((result): BilibiliSearchResult | null => {
      if (!result || typeof result !== "object") {
        return null;
      }

      const video = result as BilibiliApiVideoResult;
      const url = getResultUrl(video);
      const title = typeof video.title === "string" ? stripHtml(video.title) : "";

      if (!url || title.length === 0) {
        return null;
      }

      return createBilibiliSearchResult({
        title,
        url,
        author: typeof video.author === "string" ? stripHtml(video.author) : null,
        durationLabel: formatDuration(video.duration),
        thumbnailUrl: normalizeThumbnail(video.pic)
      });
    })
    .filter((result): result is BilibiliSearchResult => result !== null);
}

export class FetchBilibiliSearchAdapter implements BilibiliSearchAdapter {
  private readonly fetchImpl: typeof fetch;
  private readonly endpoint: string;

  constructor({ fetchImpl = fetch, endpoint = defaultEndpoint }: FetchBilibiliSearchAdapterOptions = {}) {
    this.fetchImpl = fetchImpl;
    this.endpoint = endpoint;
  }

  async search(query: string): Promise<ReferenceResult<BilibiliSearchResult[]>> {
    const url = new URL(this.endpoint);

    url.searchParams.set("search_type", "video");
    url.searchParams.set("keyword", query);

    let response: Response;

    try {
      response = await this.fetchImpl(url.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json"
        }
      });
    } catch {
      return {
        ok: false,
        message: "Bilibili search is unavailable. Check the network and try again."
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        message: "Bilibili search is unavailable. Check the network and try again."
      };
    }

    let payload: BilibiliApiResponse;

    try {
      payload = (await response.json()) as BilibiliApiResponse;
    } catch {
      return {
        ok: false,
        message: "Bilibili search returned an unreadable response."
      };
    }

    if (payload.code !== 0) {
      return {
        ok: false,
        message:
          typeof payload.message === "string" && payload.message.trim().length > 0
            ? `Bilibili search failed: ${payload.message.trim()}`
            : "Bilibili search failed. Keep your query and try again."
      };
    }

    const results = normalizeBilibiliApiResults(payload.data?.result);

    if (results.length === 0) {
      return {
        ok: false,
        message: "No playable Bilibili video results were found for that query."
      };
    }

    return {
      ok: true,
      value: results
    };
  }
}
