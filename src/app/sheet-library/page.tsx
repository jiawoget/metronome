import { LibraryBig } from "lucide-react";

import { RouteShell } from "@/components/app-shell/route-shell";

export default function SheetLibraryPage() {
  return (
    <RouteShell
      title="Sheet Library"
      eyebrow="Top-level module"
      description="Sheet library entry route. Home can send future import intent here, but import, search, thumbnails, and file persistence are assigned to the Sheet Library module."
      icon={LibraryBig}
      details={[
        "Route is reachable from Home and navigation.",
        "No sheets are imported or listed by this shell.",
        "Import Sheet entry lands here, but the import workflow is not enabled yet.",
        "Future implementation owns sheet persistence."
      ]}
    />
  );
}
