import { Settings } from "lucide-react";

import { RouteShell } from "@/components/app-shell/route-shell";

export default function SettingsPage() {
  return (
    <RouteShell
      title="Settings"
      eyebrow="Top-level module"
      description="Settings entry route. Editable preferences and persistence are assigned to the Settings module."
      icon={Settings}
      details={[
        "Route is reachable from Home and navigation.",
        "No preferences are editable in this shell.",
        "No settings are persisted by this module.",
        "Future implementation owns settings behavior."
      ]}
    />
  );
}
