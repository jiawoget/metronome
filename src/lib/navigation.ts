import {
  Gauge,
  Home,
  LibraryBig,
  Mic2,
  Music2,
  Settings
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type TopLevelRouteId =
  | "home"
  | "quick-metronome"
  | "sheet-library"
  | "sheet-practice"
  | "recordings"
  | "settings";

export type TopLevelNavItem = {
  id: TopLevelRouteId;
  label: string;
  shortLabel: string;
  href: string;
  description: string;
  icon: LucideIcon;
};

export const topLevelNavItems: TopLevelNavItem[] = [
  {
    id: "home",
    label: "Home",
    shortLabel: "Home",
    href: "/",
    description: "Practice dashboard",
    icon: Home
  },
  {
    id: "quick-metronome",
    label: "Quick Metronome",
    shortLabel: "Quick",
    href: "/quick-metronome",
    description: "Fast metronome entry",
    icon: Gauge
  },
  {
    id: "sheet-library",
    label: "Sheet Library",
    shortLabel: "Sheets",
    href: "/sheet-library",
    description: "Sheet import and library entry",
    icon: LibraryBig
  },
  {
    id: "sheet-practice",
    label: "Sheet Practice",
    shortLabel: "Practice",
    href: "/sheet-practice",
    description: "Practice workspace entry",
    icon: Music2
  },
  {
    id: "recordings",
    label: "Recordings",
    shortLabel: "Takes",
    href: "/recordings",
    description: "Recording review entry",
    icon: Mic2
  },
  {
    id: "settings",
    label: "Settings",
    shortLabel: "Settings",
    href: "/settings",
    description: "App settings entry",
    icon: Settings
  }
];

export function getActiveNavItem(pathname: string) {
  const exactMatch = topLevelNavItems.find((item) => item.href === pathname);

  if (exactMatch) {
    return exactMatch;
  }

  return topLevelNavItems.find((item) => item.href !== "/" && pathname.startsWith(`${item.href}/`));
}
