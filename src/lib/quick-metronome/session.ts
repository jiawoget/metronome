import type {
  MetronomeSettings,
  PracticeSession,
  QuickRecording,
  RecordingArtifact
} from "@/lib/quick-metronome/types";

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function createQuickPracticeSession(settings: MetronomeSettings, startedAt = new Date()) {
  return {
    id: createId("session"),
    sourceType: "quick",
    startedAt: startedAt.toISOString(),
    endedAt: null,
    settings
  } satisfies PracticeSession;
}

export function createQuickRecording({
  artifact,
  session,
  settings,
  createdAt = new Date()
}: {
  artifact: RecordingArtifact;
  session: PracticeSession;
  settings: MetronomeSettings;
  createdAt?: Date;
}) {
  return {
    id: createId("recording"),
    type: "quick",
    origin: "user",
    sessionId: session.id,
    sheetId: null,
    createdAt: createdAt.toISOString(),
    durationMs: Math.max(0, Math.round(artifact.durationMs)),
    sizeBytes: artifact.sizeBytes,
    mimeType: artifact.mimeType,
    audioDataUrl: artifact.dataUrl,
    artifactAnalysis: artifact.analysis,
    settings
  } satisfies QuickRecording;
}
