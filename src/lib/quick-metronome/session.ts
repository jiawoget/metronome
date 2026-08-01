import type { PracticeSession } from "@/domain/practice";
import type {
  MetronomeSettings,
  QuickRecording,
  RecordingArtifact
} from "@/lib/quick-metronome/types";

function createId(prefix: string) {
  const secureCrypto = typeof crypto === "undefined" ? undefined : crypto;

  if (typeof secureCrypto?.randomUUID === "function") {
    return `${prefix}_${secureCrypto.randomUUID()}`;
  }

  if (typeof secureCrypto?.getRandomValues === "function") {
    const bytes = secureCrypto.getRandomValues(new Uint8Array(16));
    const randomId = Array.from(bytes, (byte) =>
      byte.toString(16).padStart(2, "0")
    ).join("");

    return `${prefix}_${randomId}`;
  }

  throw new Error("Secure random number generation is unavailable");
}

export function createQuickRecording({
  artifact,
  session,
  settings,
  createdAt = new Date()
}: {
  artifact: RecordingArtifact;
  session: Pick<PracticeSession, "id">;
  settings: MetronomeSettings;
  createdAt?: Date;
}) {
  const durationMs =
    artifact.analysis?.decodedDurationMs ?? artifact.durationMs;
  const recordingId = createId("recording");

  return {
    id: recordingId,
    type: "quick",
    origin: "user",
    sessionId: session.id,
    sheetId: null,
    createdAt: createdAt.toISOString(),
    durationMs: Math.max(0, Math.round(durationMs)),
    sizeBytes: artifact.sizeBytes,
    mimeType: artifact.mimeType,
    artifactRef: {
      kind: "indexeddb",
      artifactId: recordingId,
      storageVersion: 1
    },
    audioDataUrl: null,
    artifactAnalysis: artifact.analysis,
    settings
  } satisfies QuickRecording;
}
