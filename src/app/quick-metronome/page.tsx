import { Gauge } from "lucide-react";

import { RouteShell } from "@/components/app-shell/route-shell";

export default function QuickMetronomePage() {
  return (
    <RouteShell
      title="Quick Metronome"
      eyebrow="Top-level module"
      description="Fast practice entry route. Real metronome playback, tempo controls, and recording are assigned to the Quick Metronome module."
      icon={Gauge}
      details={[
        "Route is available from Home and navigation.",
        "No audio playback is active in this shell.",
        "No recording controls are exposed here yet.",
        "Future implementation owns metronome behavior."
      ]}
    />
  );
}
