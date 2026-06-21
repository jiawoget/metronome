"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { topLevelNavItems } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

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

          <div
            aria-label="Global status"
            className="mt-5 rounded-md border border-border bg-background px-3 py-3 text-sm"
          >
            <p className="font-medium">Global Status</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">No recording or playback active.</p>
          </div>
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
              <div aria-label="Global status" className="rounded-md border border-border bg-card px-2.5 py-1.5 text-xs">
                Idle
              </div>
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
