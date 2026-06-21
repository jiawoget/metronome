import { Music2 } from "lucide-react";

import { RouteShell } from "@/components/app-shell/route-shell";

export default function SheetPracticePage() {
  return (
    <RouteShell
      title="Sheet Practice"
      eyebrow="Top-level module"
      description="Practice workspace entry route. Sheet rendering, metronome integration, recording, markers, and references are assigned to later modules."
      icon={Music2}
      details={[
        "Route is ready for top-level navigation.",
        "No sheet viewer is rendered in this shell.",
        "No practice controls are enabled here yet.",
        "Future modules own workspace behavior."
      ]}
    />
  );
}
