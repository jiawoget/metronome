import { afterEach, describe, expect, it, vi } from "vitest";

import { createQuickRecording } from "@/lib/quick-metronome/session";
import { DEFAULT_METRONOME_SETTINGS } from "@/lib/quick-metronome/types";

describe("quick metronome secure recording ids", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("prefers randomUUID when both secure ID APIs are available", () => {
    const randomUUID = vi.fn(() => "123e4567-e89b-42d3-a456-426614174000");
    const getRandomValues = vi.fn((bytes: Uint8Array) => bytes);

    vi.stubGlobal("crypto", { randomUUID, getRandomValues });

    const recording = createQuickRecording({
      artifact: {
        blob: new Blob(),
        durationMs: 0,
        mimeType: "audio/webm",
        sizeBytes: 0,
        analysis: null
      },
      session: { id: "session-secure-primary" },
      settings: DEFAULT_METRONOME_SETTINGS,
      createdAt: new Date("2026-06-21T08:01:00Z")
    });

    expect(recording.id).toBe("recording_123e4567-e89b-42d3-a456-426614174000");
    expect(recording.artifactRef.artifactId).toBe(recording.id);
    expect(randomUUID).toHaveBeenCalledOnce();
    expect(getRandomValues).not.toHaveBeenCalled();
  });

  it("uses secure random bytes when randomUUID is unavailable", () => {
    vi.stubGlobal("crypto", {
      getRandomValues: (bytes: Uint8Array) => {
        bytes.set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);

        return bytes;
      }
    });

    const recording = createQuickRecording({
      artifact: {
        blob: new Blob(),
        durationMs: 0,
        mimeType: "audio/webm",
        sizeBytes: 0,
        analysis: null
      },
      session: { id: "session-secure-fallback" },
      settings: DEFAULT_METRONOME_SETTINGS,
      createdAt: new Date("2026-06-21T08:01:00Z")
    });

    expect(recording.id).toBe("recording_000102030405060708090a0b0c0d0e0f");
    expect(recording.artifactRef.artifactId).toBe(recording.id);
  });

  it("fails closed when secure random number generation is unavailable", () => {
    vi.stubGlobal("crypto", {});

    expect(() =>
      createQuickRecording({
        artifact: {
          blob: new Blob(),
          durationMs: 0,
          mimeType: "audio/webm",
          sizeBytes: 0,
          analysis: null
        },
        session: { id: "session-no-secure-random" },
        settings: DEFAULT_METRONOME_SETTINGS
      })
    ).toThrow("Secure random number generation is unavailable");
  });
});
