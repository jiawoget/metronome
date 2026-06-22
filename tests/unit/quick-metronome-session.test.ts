import { describe, expect, it } from "vitest";

import { getDemoQuickRecording } from "@/lib/quick-metronome/demo-recording";
import { quickRecordingRepository } from "@/lib/quick-metronome/persistence";
import { createQuickRecording } from "@/lib/quick-metronome/session";
import { DEFAULT_METRONOME_SETTINGS, type RecordingArtifact } from "@/lib/quick-metronome/types";

describe("quick metronome recording metadata", () => {
  it("creates quick recording metadata linked to a session and not to a sheet", () => {
    const session = { id: "session-canonical-quick" };
    const artifact: RecordingArtifact = {
      blob: new Blob(["synthetic audio"]),
      dataUrl: "data:audio/webm;base64,c3ludGhldGlj",
      durationMs: 1_245.4,
      mimeType: "audio/webm",
      sizeBytes: 15,
      analysis: {
        decodedDurationMs: 1_230,
        sampleRate: 48_000,
        peakAmplitude: 0.2,
        rmsAmplitude: 0.12,
        estimatedFrequencyHz: 440,
        isSilent: false
      }
    };
    const recording = createQuickRecording({
      artifact,
      session,
      settings: DEFAULT_METRONOME_SETTINGS,
      createdAt: new Date("2026-06-21T08:01:00Z")
    });

    expect(recording.id).toMatch(/^recording_/);
    expect(recording.type).toBe("quick");
    expect(recording.origin).toBe("user");
    expect(recording.sessionId).toBe(session.id);
    expect(recording.sheetId).toBeNull();
    expect(recording.createdAt).toBe("2026-06-21T08:01:00.000Z");
    expect(recording.durationMs).toBe(1_230);
    expect(recording.sizeBytes).toBe(15);
    expect(recording.audioDataUrl).toContain("data:audio/webm");
    expect(recording.artifactAnalysis?.estimatedFrequencyHz).toBe(440);
    expect(recording.artifactAnalysis?.isSilent).toBe(false);
  });

  it("does not overwrite an existing recording when saving a continued take with a reused id", () => {
    quickRecordingRepository.clear();
    const session = { id: "session-canonical-quick" };
    const artifact: RecordingArtifact = {
      blob: new Blob(["synthetic audio"]),
      dataUrl: "data:audio/webm;base64,c3ludGhldGlj",
      durationMs: 1_245.4,
      mimeType: "audio/webm",
      sizeBytes: 15,
      analysis: {
        decodedDurationMs: 1_230,
        sampleRate: 48_000,
        peakAmplitude: 0.2,
        rmsAmplitude: 0.12,
        estimatedFrequencyHz: 440,
        isSilent: false
      }
    };
    const recording = createQuickRecording({ artifact, session, settings: DEFAULT_METRONOME_SETTINGS });
    const firstSave = quickRecordingRepository.saveQuickRecording(recording);
    const continuedSave = quickRecordingRepository.saveQuickRecording({
      ...recording,
      audioDataUrl: "data:audio/webm;base64,bmV3LXRha2U=",
      artifactAnalysis: {
        ...recording.artifactAnalysis!,
        decodedDurationMs: 900
      },
      durationMs: 900
    });
    const snapshot = quickRecordingRepository.getSnapshot();

    expect(firstSave.id).toBe(recording.id);
    expect(continuedSave.id).not.toBe(recording.id);
    expect(snapshot.recordings).toHaveLength(2);
    expect(snapshot.sessions).toEqual([]);
    expect(snapshot.recordings.find((item) => item.id === recording.id)?.audioDataUrl).toBe(
      recording.audioDataUrl
    );
    expect(snapshot.recordings.find((item) => item.id === continuedSave.id)?.durationMs).toBe(900);
  });

  it("provides a clearly marked playable demo recording without claiming it is a user take", () => {
    const demoRecording = getDemoQuickRecording();
    const base64Payload = demoRecording.audioDataUrl.replace(/^data:audio\/wav;base64,/, "");
    const wavBytes = Buffer.from(base64Payload, "base64");

    expect(demoRecording.type).toBe("quick");
    expect(demoRecording.origin).toBe("demo");
    expect(demoRecording.id).toContain("demo");
    expect(demoRecording.audioDataUrl).toMatch(/^data:audio\/wav;base64,/);
    expect(demoRecording.sizeBytes).toBeGreaterThan(1_000);
    expect(wavBytes.subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(wavBytes.subarray(8, 12).toString("ascii")).toBe("WAVE");
    expect(wavBytes.subarray(12, 16).toString("ascii")).toBe("fmt ");
    expect(wavBytes.readUInt16LE(20)).toBe(1);
    expect(wavBytes.readUInt16LE(22)).toBe(1);
    expect(wavBytes.readUInt32LE(24)).toBe(8_000);
    expect(wavBytes.subarray(36, 40).toString("ascii")).toBe("data");
    expect(wavBytes.readUInt32LE(40)).toBe(16_000);
    expect(demoRecording.artifactAnalysis?.estimatedFrequencyHz).toBe(440);
    expect(demoRecording.artifactAnalysis?.isSilent).toBe(false);
    expect(demoRecording.sheetId).toBeNull();
  });
});
