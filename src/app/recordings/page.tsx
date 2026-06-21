import { Mic2 } from "lucide-react";

import { RouteShell } from "@/components/app-shell/route-shell";
import { LatestQuickRecording } from "@/components/quick-metronome/latest-quick-recording";

export default function RecordingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <RouteShell
        title="Recordings"
        eyebrow="Top-level module"
        description="Recording review entry route. Full library review is assigned to the Recordings module; quick recordings expose the latest take here for v0 continuity."
        icon={Mic2}
        details={[
          "Route is available from Home and navigation.",
          "Latest quick recording appears after a quick take is saved.",
          "Full recording search and waveform review are not enabled yet.",
          "Quick recordings remain unlinked from sheets."
        ]}
      />
      <LatestQuickRecording />
    </div>
  );
}
