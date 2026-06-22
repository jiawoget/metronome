import { z } from "zod";

import type {
  BilibiliSearchResult,
  BilibiliUrlMetadata,
  LocalAudioReferenceArtifact,
  SheetReference
} from "@/domain/reference/types";

const bvidPattern = /^BV[0-9A-Za-z]{10}$/;

const baseReferenceSchema = z.object({
  id: z.string().min(1),
  sheetId: z.string().min(1),
  title: z.string().min(1).max(180),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  isActive: z.boolean()
});

const localAudioReferenceSchema = baseReferenceSchema.extend({
  kind: z.literal("local-audio"),
  fileName: z.string().min(1).max(220),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
  durationMs: z.number().int().positive()
});

const bilibiliReferenceSchema = baseReferenceSchema.extend({
  kind: z.literal("bilibili"),
  url: z.string().url(),
  bvid: z.string().regex(bvidPattern),
  author: z.string().min(1).max(120).nullable(),
  durationLabel: z.string().min(1).max(32).nullable(),
  thumbnailUrl: z.string().url().nullable(),
  embedUrl: z.string().url().nullable()
});

const sheetReferenceSchema = z.discriminatedUnion("kind", [
  localAudioReferenceSchema,
  bilibiliReferenceSchema
]);

const localAudioArtifactSchema = z.object({
  referenceId: z.string().min(1),
  sheetId: z.string().min(1),
  blob: z.instanceof(Blob),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
  createdAt: z.string().datetime()
});

const bilibiliSearchResultSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(180),
  url: z.string().url(),
  bvid: z.string().regex(bvidPattern),
  author: z.string().min(1).max(120).nullable(),
  durationLabel: z.string().min(1).max(32).nullable(),
  thumbnailUrl: z.string().url().nullable(),
  embedUrl: z.string().url().nullable()
});

const supportedBilibiliHosts = new Set([
  "bilibili.com",
  "www.bilibili.com",
  "m.bilibili.com"
]);

export const supportedLocalAudioTypes = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/ogg",
  "audio/aac",
  "audio/mp4",
  "audio/webm"
]);

export function validateSheetReference(reference: SheetReference): SheetReference {
  return sheetReferenceSchema.parse(reference);
}

export function validateLocalAudioArtifact(artifact: LocalAudioReferenceArtifact): LocalAudioReferenceArtifact {
  return localAudioArtifactSchema.parse(artifact);
}

export function validateBilibiliSearchResult(result: BilibiliSearchResult): BilibiliSearchResult {
  return bilibiliSearchResultSchema.parse(result);
}

export function isSupportedLocalAudioFile(file: Pick<File, "type" | "name" | "size">) {
  const extension = file.name.toLowerCase().split(".").pop() ?? "";
  const knownExtension = ["mp3", "wav", "ogg", "aac", "m4a", "webm"].includes(extension);

  return file.size > 0 && (supportedLocalAudioTypes.has(file.type) || (file.type === "" && knownExtension));
}

export function normalizeReferenceTitle(value: string, fallback: string) {
  const normalized = value.trim().replace(/\s+/g, " ");

  return normalized.length > 0 ? normalized.slice(0, 180) : fallback.slice(0, 180);
}

export function clampReferenceVolume(value: number) {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(1, Math.max(0, value));
}

export function parseBilibiliUrl(input: string): BilibiliUrlMetadata | null {
  let parsed: URL;

  try {
    parsed = new URL(input.trim());
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return null;
  }

  if (!supportedBilibiliHosts.has(parsed.hostname.toLowerCase())) {
    return null;
  }

  const segments = parsed.pathname.split("/").filter(Boolean);
  const videoIndex = segments.findIndex((segment) => segment.toLowerCase() === "video");
  const bvid = videoIndex >= 0 ? segments[videoIndex + 1] : null;

  if (!bvid || !bvidPattern.test(bvid)) {
    return null;
  }

  const canonicalUrl = `https://www.bilibili.com/video/${bvid}`;

  return {
    url: canonicalUrl,
    bvid,
    embedUrl: `https://player.bilibili.com/player.html?bvid=${encodeURIComponent(bvid)}`
  };
}

export function createBilibiliSearchResult(input: {
  title: string;
  url: string;
  author?: string | null;
  durationLabel?: string | null;
  thumbnailUrl?: string | null;
}): BilibiliSearchResult | null {
  const metadata = parseBilibiliUrl(input.url);

  if (!metadata) {
    return null;
  }

  return validateBilibiliSearchResult({
    id: metadata.bvid,
    title: normalizeReferenceTitle(input.title, metadata.bvid),
    url: metadata.url,
    bvid: metadata.bvid,
    author: input.author?.trim() || null,
    durationLabel: input.durationLabel?.trim() || null,
    thumbnailUrl: input.thumbnailUrl?.trim() || null,
    embedUrl: metadata.embedUrl
  });
}
