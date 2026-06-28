import { beforeEach, describe, expect, it } from "vitest";

import { RECORDING_HISTORY_STORAGE_KEY } from "@/infrastructure/storage/storage-contracts";
import { getDemoQuickRecording } from "@/lib/quick-metronome/demo-recording";
import { quickRecordingRepository } from "@/lib/quick-metronome/persistence";
import { createQuickRecording } from "@/lib/quick-metronome/session";
import { DEFAULT_METRONOME_SETTINGS, type QuickRecording, type RecordingArtifact } from "@/lib/quick-metronome/types";

describe("quick metronome recording metadata", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

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
    expect(recording.artifactRef).toEqual({
      kind: "indexeddb",
      artifactId: recording.id,
      storageVersion: 1
    });
    expect(recording.audioDataUrl).toBeNull();
    expect(recording.artifactAnalysis?.estimatedFrequencyHz).toBe(440);
    expect(recording.artifactAnalysis?.isSilent).toBe(false);
  });

  it("rejects a reused recording id instead of repointing artifact metadata", async () => {
    await quickRecordingRepository.clear();
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

    expect(() =>
      quickRecordingRepository.saveQuickRecording({
        ...recording,
        artifactAnalysis: {
          ...recording.artifactAnalysis!,
          decodedDurationMs: 900
        },
        durationMs: 900
      })
    ).toThrow("Recording id collision");

    const snapshot = quickRecordingRepository.getSnapshot();

    expect(firstSave.id).toBe(recording.id);
    expect(snapshot.recordings).toHaveLength(1);
    expect(snapshot.sessions).toEqual([]);
    expect(snapshot.recordings.find((item) => item.id === recording.id)?.artifactRef).toEqual(
      recording.artifactRef
    );
  });

  it("preserves review organization and take selection metadata when saving a new quick recording", async () => {
    await quickRecordingRepository.clear();
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
    const existingRecording = createQuickRecording({
      artifact,
      session: { id: "session-existing-quick" },
      settings: DEFAULT_METRONOME_SETTINGS,
      createdAt: new Date("2026-06-21T08:01:00Z")
    });
    const newRecording = createQuickRecording({
      artifact,
      session: { id: "session-new-quick" },
      settings: DEFAULT_METRONOME_SETTINGS,
      createdAt: new Date("2026-06-21T08:02:00Z")
    });
    const takeSelections = [
      {
        groupId: "sheet:sheet-alpha:segment:none",
        sheetId: "sheet-alpha",
        segmentId: null,
        bestRecordingId: "recording-sheet-best",
        activeRecordingId: "recording-sheet-active",
        updatedAt: "2026-06-21T08:00:00.000Z"
      }
    ];
    const recordingOrganization = [
      {
        recordingId: existingRecording.id,
        tags: ["Warmup"],
        favorite: true,
        archived: true,
        updatedAt: "2026-06-21T08:00:00.000Z"
      }
    ];

    window.localStorage.setItem(
      RECORDING_HISTORY_STORAGE_KEY,
      JSON.stringify({
        sessions: [],
        recordings: [existingRecording],
        errorMarkers: [],
        takeSelections,
        recordingOrganization,
        futureSnapshotField: { preserve: true }
      })
    );

    quickRecordingRepository.saveQuickRecording(newRecording);

    const persisted = JSON.parse(window.localStorage.getItem(RECORDING_HISTORY_STORAGE_KEY) ?? "{}");

    expect(persisted.recordingOrganization).toEqual(recordingOrganization);
    expect(persisted.takeSelections).toEqual(takeSelections);
    expect(persisted.futureSnapshotField).toEqual({ preserve: true });
    expect(persisted.recordings.map((recording: { id: string }) => recording.id)).toEqual([
      newRecording.id,
      existingRecording.id
    ]);
  });

  it("clears only quick recordings and explicitly quick unreferenced sessions", async () => {
    const quickRecording = createStoredQuickRecording({
      id: "quick-recording",
      sessionId: "quick-session"
    });
    const sheetRecording = {
      ...quickRecording,
      id: "sheet-recording",
      type: "sheet",
      sessionId: "sheet-session",
      sheetId: "sheet-alpha"
    };
    const ambiguousQuickRecording = createStoredQuickRecording({
      id: "ambiguous-linked-recording",
      sessionId: "ambiguous-session"
    });
    const takeSelections = [
      {
        groupId: "sheet:sheet-alpha:segment:none",
        sheetId: "sheet-alpha",
        segmentId: null,
        bestRecordingId: "sheet-recording",
        activeRecordingId: "sheet-recording",
        updatedAt: "2026-06-21T08:00:00.000Z"
      }
    ];
    const recordingOrganization = [
      {
        recordingId: "sheet-recording",
        tags: ["Keep"],
        favorite: true,
        archived: false,
        updatedAt: "2026-06-21T08:00:00.000Z"
      }
    ];

    window.localStorage.setItem(
      RECORDING_HISTORY_STORAGE_KEY,
      JSON.stringify({
        sessions: [
          { id: "quick-session", sourceType: "quick" },
          { id: "sheet-session", sourceType: "sheet", sheetId: "sheet-alpha" },
          { id: "ambiguous-session" },
          { id: "future-session", sourceType: "quick" }
        ],
        recordings: [quickRecording, sheetRecording, ambiguousQuickRecording],
        errorMarkers: [
          { id: "quick-marker", recordingId: "quick-recording", timestampMs: 10, note: null },
          { id: "sheet-marker", recordingId: "sheet-recording", timestampMs: 10, note: null }
        ],
        takeSelections,
        recordingOrganization,
        futureSnapshotField: { preserve: true }
      })
    );

    await quickRecordingRepository.clear();

    const persisted = JSON.parse(window.localStorage.getItem(RECORDING_HISTORY_STORAGE_KEY) ?? "{}");

    expect(persisted.recordings).toEqual([sheetRecording]);
    expect(persisted.sessions).toEqual([
      { id: "sheet-session", sourceType: "sheet", sheetId: "sheet-alpha" },
      { id: "ambiguous-session" }
    ]);
    expect(persisted.errorMarkers).toEqual([
      { id: "sheet-marker", recordingId: "sheet-recording", timestampMs: 10, note: null }
    ]);
    expect(persisted.takeSelections).toEqual(takeSelections);
    expect(persisted.recordingOrganization).toEqual(recordingOrganization);
    expect(persisted.futureSnapshotField).toEqual({ preserve: true });
  });

  it("provides a clearly marked playable demo recording without claiming it is a user take", () => {
    const demoRecording = getDemoQuickRecording();
    const base64Payload = demoRecording.audioDataUrl!.replace(/^data:audio\/wav;base64,/, "");
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

function createStoredQuickRecording(overrides: Partial<QuickRecording> = {}) {
  const artifact: RecordingArtifact = {
    blob: new Blob(["synthetic audio"]),
    dataUrl: "data:audio/webm;base64,c3ludGhldGlj",
    durationMs: 1_245.4,
    mimeType: "audio/webm",
    sizeBytes: 15,
    analysis: null
  };

  const recording = createQuickRecording({
    artifact,
    session: { id: "quick-session" },
    settings: DEFAULT_METRONOME_SETTINGS,
    createdAt: new Date("2026-06-21T08:01:00Z")
  });

  return {
    ...recording,
    ...overrides
  };
}
