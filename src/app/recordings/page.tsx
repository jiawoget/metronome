import { Mic2 } from "lucide-react";

import { RouteShell } from "@/components/app-shell/route-shell";

export default function RecordingsPage() {
  return (
    <RouteShell
      title="Recordings"
      eyebrow="Top-level module"
      description="Recording review entry route. Capture, playback, waveform rendering, and review workflows are assigned to later modules."
      icon={Mic2}
      details={[
        "Route is available from Home and navigation.",
        "No recording list is populated by this shell.",
        "No playback controls are enabled here yet.",
        "Future implementation owns review behavior."
      ]}
    />
  );
}
