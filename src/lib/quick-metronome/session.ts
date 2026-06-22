import type { PracticeSession } from "@/domain/practice";
import type { MetronomeSettings, QuickRecording, RecordingArtifact } from "@/lib/quick-metronome/types";

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
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
  const durationMs = artifact.analysis?.decodedDurationMs ?? artifact.durationMs;

  return {
    id: createId("recording"),
    type: "quick",
    origin: "user",
    sessionId: session.id,
    sheetId: null,
    createdAt: createdAt.toISOString(),
    durationMs: Math.max(0, Math.round(durationMs)),
    sizeBytes: artifact.sizeBytes,
    mimeType: artifact.mimeType,
    audioDataUrl: artifact.dataUrl,
    artifactAnalysis: artifact.analysis,
    settings
  } satisfies QuickRecording;
}
