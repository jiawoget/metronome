"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { EyeOff, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { topLevelNavItems } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [areDiagnosticsHidden, setAreDiagnosticsHidden] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px]">
        <aside
          aria-label="Primary sections"
          data-testid="desktop-sidebar"
          className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-border bg-card px-4 py-5 lg:flex lg:flex-col"
        >
          <Link href="/" className="mb-7 flex items-center gap-3 rounded-md px-2 py-1.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground">
              M
            </span>
            <span>
              <span className="block text-base font-semibold">Metronome</span>
              <span className="block text-xs font-medium text-muted-foreground">Practice v0</span>
            </span>
          </Link>

          <nav className="flex flex-1 flex-col gap-1">
            {topLevelNavItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === pathname || (item.href !== "/" && pathname.startsWith(`${item.href}/`));

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex min-h-12 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isActive && "bg-primary text-primary-foreground shadow-soft hover:bg-primary hover:text-primary-foreground"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <DiagnosticsPanel
            hidden={areDiagnosticsHidden}
            onHide={() => setAreDiagnosticsHidden(true)}
            onRestore={() => setAreDiagnosticsHidden(false)}
          />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-border bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <Link href="/" className="flex items-center gap-2 rounded-md">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  M
                </span>
                <span className="text-sm font-semibold">Metronome Practice</span>
              </Link>
              <MobileDiagnostics
                hidden={areDiagnosticsHidden}
                onHide={() => setAreDiagnosticsHidden(true)}
                onRestore={() => setAreDiagnosticsHidden(false)}
              />
            </div>
          </header>

          <main className="flex-1 px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-8 lg:pt-8">{children}</main>
        </div>
      </div>

      <nav
        aria-label="Mobile primary sections"
        data-testid="mobile-bottom-nav"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card px-1.5 py-2 shadow-soft lg:hidden"
      >
        <div className="mx-auto grid max-w-xl grid-cols-6 gap-1">
          {topLevelNavItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === pathname || (item.href !== "/" && pathname.startsWith(`${item.href}/`));

            return (
              <Link
                key={item.id}
                href={item.href}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 text-[11px] font-medium leading-none text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span className="max-w-full truncate">{item.shortLabel}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function DiagnosticsPanel({
  hidden,
  onHide,
  onRestore
}: {
  hidden: boolean;
  onHide: () => void;
  onRestore: () => void;
}) {
  if (hidden) {
    return (
      <div
        aria-label="Diagnostics hidden"
        data-testid="diagnostics-restore"
        className="mt-5 rounded-md border border-dashed border-border bg-background px-3 py-3 text-sm"
      >
        <p className="font-medium">Diagnostics hidden</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Devtools are hidden for this session. Restore them whenever needed.
        </p>
        <Button type="button" variant="secondary" className="mt-3 w-full" onClick={onRestore}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Restore diagnostics
        </Button>
      </div>
    );
  }

  return (
    <div
      aria-label="Global status diagnostics"
      data-testid="diagnostics-panel"
      className="mt-5 rounded-md border border-border bg-background px-3 py-3 text-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">Diagnostics</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">No recording or playback active.</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Hide devtools for this session"
          className="h-8 w-8 shrink-0"
          onClick={onHide}
        >
          <EyeOff className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

function MobileDiagnostics({
  hidden,
  onHide,
  onRestore
}: {
  hidden: boolean;
  onHide: () => void;
  onRestore: () => void;
}) {
  if (hidden) {
    return (
      <Button
        type="button"
        variant="secondary"
        className="h-9 px-2.5 text-xs"
        aria-label="Restore diagnostics"
        onClick={onRestore}
      >
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        Diagnostics
      </Button>
    );
  }

  return (
    <div
      aria-label="Global status diagnostics"
      className="flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs"
    >
      <span>Idle</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Hide devtools for this session"
        className="h-7 w-7"
        onClick={onHide}
      >
        <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
      </Button>
    </div>
  );
}
