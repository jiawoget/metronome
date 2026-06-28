"use client";

import { Pause, Play, Radio } from "lucide-react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDemoQuickRecording } from "@/lib/quick-metronome/demo-recording";
import { BrowserRecordingPlaybackService } from "@/lib/quick-metronome/playback-service";
import { quickRecordingController } from "@/lib/quick-metronome/recording-controller";
import { resolveQuickRecordingArtifactBody } from "@/lib/quick-metronome/artifact-controller";

export function LatestQuickRecording({ compact = false }: { compact?: boolean }) {
  const playbackService = useMemo(() => new BrowserRecordingPlaybackService(), []);
  const storedRecording = useSyncExternalStore(
    quickRecordingController.subscribe,
    quickRecordingController.getLatestQuickRecording,
    () => null
  );
  const [playbackState, setPlaybackState] = useState<"idle" | "playing" | "error">("idle");
  const latestRecording = storedRecording ?? getDemoQuickRecording();
  const isDemoRecording = latestRecording.origin === "demo";

  useEffect(() => {
    return () => {
      playbackService.stop();
    };
  }, [playbackService]);

  const body = latestRecording ? (
    <div data-testid="latest-recording" className="flex flex-col gap-4">
      {isDemoRecording ? (
        <div
          data-testid="demo-recording-banner"
          className="rounded-md border border-dashed border-accent bg-muted px-3 py-3 text-sm"
        >
          <audio
            data-testid="demo-recording-audio"
            src={latestRecording.audioDataUrl ?? undefined}
            preload="metadata"
            className="hidden"
          />
          <p className="font-semibold">Demo synthetic recording</p>
          <p className="mt-1 leading-6 text-muted-foreground">
            This is a playable 440 Hz WAV sample for checking replay and the recordings outlet. It is not a saved user recording.
          </p>
        </div>
      ) : null}
      <div className="grid gap-3 text-sm sm:grid-cols-3">
        <div className="rounded-md border border-border bg-muted px-3 py-3">
          <p className="text-xs font-medium text-muted-foreground">Type</p>
          <p className="mt-1 font-semibold">{isDemoRecording ? "demo synthetic" : latestRecording.type}</p>
        </div>
        <div className="rounded-md border border-border bg-muted px-3 py-3">
          <p className="text-xs font-medium text-muted-foreground">Duration</p>
          <p className="mt-1 font-semibold">{Math.max(0.1, latestRecording.durationMs / 1_000).toFixed(1)}s</p>
        </div>
        <div className="rounded-md border border-border bg-muted px-3 py-3">
          <p className="text-xs font-medium text-muted-foreground">Size</p>
          <p className="mt-1 font-semibold">{Math.max(1, Math.round(latestRecording.sizeBytes / 1_024))} KB</p>
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm leading-6 text-muted-foreground">
          <p>{isDemoRecording ? "Demo sample, not saved." : `Session ${latestRecording.sessionId.slice(0, 16)}`}</p>
          <p>No sheet linked.</p>
        </div>
        <Button
          type="button"
          variant={playbackState === "playing" ? "secondary" : "default"}
          onClick={async () => {
            try {
              if (playbackState === "playing") {
                playbackService.stop();
                setPlaybackState("idle");
                return;
              }

              setPlaybackState("playing");
              if (isDemoRecording && latestRecording.audioDataUrl) {
                await playbackService.play(latestRecording.audioDataUrl);
              } else {
                const artifactBody = await resolveQuickRecordingArtifactBody(
                  latestRecording,
                  { createObjectUrl: true }
                );

                try {
                  await playbackService.play(artifactBody.objectUrl ?? "");
                } finally {
                  if (artifactBody.objectUrl) {
                    window.setTimeout(
                      () => URL.revokeObjectURL(artifactBody.objectUrl!),
                      latestRecording.durationMs + 1_000
                    );
                  }
                }
              }
              window.setTimeout(() => setPlaybackState("idle"), latestRecording.durationMs + 150);
            } catch {
              setPlaybackState("error");
            }
          }}
        >
          {playbackState === "playing" ? (
            <Pause className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Play className="h-4 w-4" aria-hidden="true" />
          )}
          {playbackState === "playing"
            ? "Stop Replay"
            : isDemoRecording
              ? "Replay Demo Recording"
              : "Replay Latest Recording"}
        </Button>
      </div>
      {playbackState === "playing" ? (
        <p role="status" className="text-sm font-medium text-foreground">
          Replaying latest recording.
        </p>
      ) : null}
      {playbackState === "error" ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          Replay failed in this browser.
        </p>
      ) : null}
    </div>
  ) : null;

  if (compact) {
    return body;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Radio className="h-5 w-5 text-accent" aria-hidden="true" />
          Latest Quick Recording
        </CardTitle>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}
