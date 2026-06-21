import { describe, expect, it } from "vitest";

import { createQuickPracticeSession, createQuickRecording } from "@/lib/quick-metronome/session";
import { DEFAULT_METRONOME_SETTINGS, type RecordingArtifact } from "@/lib/quick-metronome/types";

describe("quick metronome session and recording metadata", () => {
  it("creates a quick practice session with settings metadata", () => {
    const session = createQuickPracticeSession(DEFAULT_METRONOME_SETTINGS, new Date("2026-06-21T08:00:00Z"));

    expect(session.id).toMatch(/^session_/);
    expect(session.sourceType).toBe("quick");
    expect(session.startedAt).toBe("2026-06-21T08:00:00.000Z");
    expect(session.endedAt).toBeNull();
    expect(session.settings).toEqual(DEFAULT_METRONOME_SETTINGS);
  });

  it("creates quick recording metadata linked to a session and not to a sheet", () => {
    const session = createQuickPracticeSession(DEFAULT_METRONOME_SETTINGS);
    const artifact: RecordingArtifact = {
      blob: new Blob(["synthetic audio"]),
      dataUrl: "data:audio/webm;base64,c3ludGhldGlj",
      durationMs: 1_245.4,
      mimeType: "audio/webm",
      sizeBytes: 15
    };
    const recording = createQuickRecording({
      artifact,
      session,
      settings: DEFAULT_METRONOME_SETTINGS,
      createdAt: new Date("2026-06-21T08:01:00Z")
    });

    expect(recording.id).toMatch(/^recording_/);
    expect(recording.type).toBe("quick");
    expect(recording.sessionId).toBe(session.id);
    expect(recording.sheetId).toBeNull();
    expect(recording.createdAt).toBe("2026-06-21T08:01:00.000Z");
    expect(recording.durationMs).toBe(1_245);
    expect(recording.sizeBytes).toBe(15);
    expect(recording.audioDataUrl).toContain("data:audio/webm");
  });
});

