import { Mic, Octagon, Play, Radio, Square } from "lucide-react";

import type { PracticeSession, SheetRecordingMetadata } from "@/domain/practice";
import type { MetronomeTick } from "@/services/metronome";
import type { ReviewRecording } from "@/lib/recordings-review/types";
import { LatestSheetRecording } from "@/components/sheet-practice/recording/latest-sheet-recording";
import { Button } from "@/components/ui/button";
import { StatusTile } from "@/components/sheet-practice/controls/status-tile";

type TransportActionsPanelProps = {
  lastTick: MetronomeTick | null;
  session: PracticeSession | null;
  recordings: SheetRecordingMetadata[];
  latestSheetRecording: ReviewRecording | null;
  message: string;
  errorMessage: string | null;
  transportState: "stopped" | "counting" | "playing";
  isPlaying: boolean;
  isCounting: boolean;
  isSheetRecording: boolean;
  recordingState: "idle" | "recording" | "saving";
  startMetronome: () => void;
  stopMetronome: () => void;
  startSheetRecording: () => void;
  stopSheetRecording: () => void;
};

export function TransportActionsPanel({
  lastTick,
  session,
  recordings,
  latestSheetRecording,
  message,
  errorMessage,
  transportState,
  isPlaying,
  isCounting,
  isSheetRecording,
  recordingState,
  startMetronome,
  stopMetronome,
  startSheetRecording,
  stopSheetRecording
}: TransportActionsPanelProps) {
  return (
    <div className="border-border bg-background flex min-w-0 flex-col justify-between gap-3 rounded-md border p-3">
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          onClick={startMetronome}
          disabled={isPlaying || isCounting}
          aria-label="Start metronome"
        >
          <Play className="h-4 w-4" aria-hidden="true" />
          Play
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={stopMetronome}
          disabled={transportState === "stopped"}
          aria-label="Stop metronome"
        >
          <Square className="h-4 w-4" aria-hidden="true" />
          Stop
        </Button>
        <Button
          type="button"
          variant={isSheetRecording ? "secondary" : "default"}
          onClick={startSheetRecording}
          disabled={isSheetRecording || recordingState === "saving"}
          aria-label="Start recording"
        >
          <Mic className="h-4 w-4" aria-hidden="true" />
          Record
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={stopSheetRecording}
          disabled={!isSheetRecording}
          aria-label="Stop recording"
        >
          <Octagon className="h-4 w-4" aria-hidden="true" />
          Stop Rec
        </Button>
      </div>

      <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <StatusTile
          label="Last tick"
          value={lastTick ? `#${lastTick.tickIndex + 1}` : "None"}
          testId="sheet-last-tick"
        />
        <StatusTile
          label="Accent tick"
          value={lastTick?.accented ? "Yes" : "No"}
          testId="sheet-accent-tick"
        />
        <StatusTile
          label="Session id"
          value={session?.id ?? "none"}
          testId="sheet-session-id"
        />
        <StatusTile
          label="Recordings"
          value={String(recordings.length)}
          testId="sheet-recording-count"
        />
      </div>

      <div
        aria-live="polite"
        className="border-border bg-muted rounded-md border px-3 py-2 text-sm"
      >
        <div className="flex items-start gap-2">
          <Radio
            className="text-accent mt-0.5 h-4 w-4 shrink-0"
            aria-hidden="true"
          />
          <p className="font-medium">{message}</p>
        </div>
        {errorMessage ? (
          <p role="alert" className="text-destructive mt-2 font-medium">
            {errorMessage}
          </p>
        ) : null}
      </div>
      <LatestSheetRecording recording={latestSheetRecording} />
    </div>
  );
}
