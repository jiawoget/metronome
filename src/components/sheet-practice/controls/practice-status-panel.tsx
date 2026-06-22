import { formatPracticeDuration, type PracticeSession } from "@/domain/practice";

import { StatusTile } from "@/components/sheet-practice/controls/status-tile";

type PracticeStatusPanelProps = {
  sheetId: string;
  sheetName: string;
  session: PracticeSession | null;
  isCounting: boolean;
  isPlaying: boolean;
  countdownRemaining: number;
  recordingState: "idle" | "recording" | "saving";
  isRecordingActive: boolean;
};

export function PracticeStatusPanel({
  sheetId,
  sheetName,
  session,
  isCounting,
  isPlaying,
  countdownRemaining,
  recordingState,
  isRecordingActive
}: PracticeStatusPanelProps) {
  return (
    <div className="border-border bg-muted flex min-w-0 flex-col justify-between gap-3 rounded-md border p-3">
      <div>
        <h2
          id="sheet-practice-controls-title"
          className="text-lg font-semibold tracking-normal"
        >
          Practice Controls
        </h2>
        <p className="text-muted-foreground mt-1 truncate text-xs font-semibold tracking-[0.08em] uppercase">
          {sheetName}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <StatusTile
          label="Metronome"
          value={
            isCounting
              ? `Counting ${countdownRemaining}`
              : isPlaying
                ? "Playing"
                : "Stopped"
          }
          testId="sheet-metronome-state"
        />
        <StatusTile
          label="Recording"
          value={
            recordingState === "saving"
              ? "saving"
              : isRecordingActive
                ? "active"
                : "stopped"
          }
          testId="sheet-recording-state"
        />
        <StatusTile
          label="Session"
          value={session?.sourceType ?? "none"}
          testId="sheet-session-source"
        />
        <StatusTile
          label="Sheet"
          value={session?.sheetId ?? sheetId}
          testId="sheet-session-sheet-id"
        />
        <StatusTile
          label="Duration"
          value={session ? formatPracticeDuration(session.durationMs) : "0:00"}
          testId="sheet-session-duration"
        />
      </div>
    </div>
  );
}
