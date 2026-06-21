"use client";

import { Pause, Play, Radio } from "lucide-react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrowserRecordingPlaybackService } from "@/lib/quick-metronome/playback-service";
import { quickRecordingRepository } from "@/lib/quick-metronome/persistence";

export function LatestQuickRecording({ compact = false }: { compact?: boolean }) {
  const playbackService = useMemo(() => new BrowserRecordingPlaybackService(), []);
  const latestRecording = useSyncExternalStore(
    quickRecordingRepository.subscribe,
    quickRecordingRepository.getLatestQuickRecording,
    () => null
  );
  const [playbackState, setPlaybackState] = useState<"idle" | "playing" | "error">("idle");

  useEffect(() => {
    return () => {
      playbackService.stop();
    };
  }, [playbackService]);

  const body = latestRecording ? (
    <div data-testid="latest-recording" className="flex flex-col gap-4">
      <div className="grid gap-3 text-sm sm:grid-cols-3">
        <div className="rounded-md border border-border bg-muted px-3 py-3">
          <p className="text-xs font-medium text-muted-foreground">Type</p>
          <p className="mt-1 font-semibold">{latestRecording.type}</p>
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
          <p>Session {latestRecording.sessionId.slice(0, 16)}</p>
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
              await playbackService.play(latestRecording.audioDataUrl);
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
          {playbackState === "playing" ? "Stop Replay" : "Replay Latest Recording"}
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
  ) : (
    <p className="text-sm leading-6 text-muted-foreground">No quick recordings saved yet.</p>
  );

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
