"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { EyeOff, RotateCcw } from "lucide-react";
import type { MouseEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  ACTIVE_RECORDING_NAVIGATION_EVENT,
  type ActiveRecordingNavigationEventDetail
} from "@/lib/recording-navigation-guard";
import { topLevelNavItems } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [areDiagnosticsHidden, setAreDiagnosticsHidden] = useState(false);
  const [activeRecordings, setActiveRecordings] = useState<
    Record<string, string>
  >({});
  const [navigationGuardMessage, setNavigationGuardMessage] = useState<
    string | null
  >(null);
  const guardedHrefRef = useRef<string | null>(null);
  const activeRecordingLabels = useMemo(
    () => Object.values(activeRecordings),
    [activeRecordings]
  );
  const hasActiveRecording = activeRecordingLabels.length > 0;
  const activeRecordingLabel = activeRecordingLabels[0] ?? "a recording";
  const recordingNavigationBlockedMessage = `Navigation blocked while ${activeRecordingLabel} is active. Stop and save the recording before changing pages.`;

  useEffect(() => {
    const handleActiveRecordingChange = (event: Event) => {
      const detail = (
        event as CustomEvent<ActiveRecordingNavigationEventDetail>
      ).detail;

      if (!detail?.sourceId) {
        return;
      }

      setActiveRecordings((current) => {
        const next = { ...current };

        if (detail.active) {
          next[detail.sourceId] = detail.label;
        } else {
          delete next[detail.sourceId];
        }

        return next;
      });

      if (!detail.active) {
        setNavigationGuardMessage(null);
      }
    };

    window.addEventListener(
      ACTIVE_RECORDING_NAVIGATION_EVENT,
      handleActiveRecordingChange
    );

    return () => {
      window.removeEventListener(
        ACTIVE_RECORDING_NAVIGATION_EVENT,
        handleActiveRecordingChange
      );
    };
  }, []);

  useEffect(() => {
    if (!hasActiveRecording) {
      guardedHrefRef.current = null;
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasActiveRecording]);

  useEffect(() => {
    if (!hasActiveRecording) {
      guardedHrefRef.current = null;
      return;
    }

    const guardedHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const originalPushState = window.history.pushState.bind(window.history);
    const originalReplaceState = window.history.replaceState.bind(window.history);

    guardedHrefRef.current = guardedHref;
    originalPushState(
      {
        ...(typeof window.history.state === "object" && window.history.state !== null
          ? window.history.state
          : {}),
        __activeRecordingGuard: true
      },
      "",
      guardedHref
    );

    const resolveHref = (url: string | URL | null | undefined) => {
      if (url === null || url === undefined) {
        return `${window.location.pathname}${window.location.search}${window.location.hash}`;
      }

      const resolved = new URL(url, window.location.href);

      return `${resolved.pathname}${resolved.search}${resolved.hash}`;
    };
    const blockHistoryChange = () => {
      setNavigationGuardMessage(recordingNavigationBlockedMessage);
    };

    window.history.pushState = function guardedPushState(data, unused, url) {
      if (resolveHref(url) !== guardedHrefRef.current) {
        blockHistoryChange();
        return;
      }

      return originalPushState(data, unused, url);
    };
    window.history.replaceState = function guardedReplaceState(data, unused, url) {
      if (resolveHref(url) !== guardedHrefRef.current) {
        blockHistoryChange();
        return;
      }

      return originalReplaceState(data, unused, url);
    };

    const handlePopState = () => {
      const currentHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;

      if (currentHref === guardedHrefRef.current) {
        originalPushState(
          {
            ...(typeof window.history.state === "object" && window.history.state !== null
              ? window.history.state
              : {}),
            __activeRecordingGuard: true
          },
          "",
          guardedHrefRef.current
        );
        blockHistoryChange();
        return;
      }

      originalPushState(
        {
          ...(typeof window.history.state === "object" && window.history.state !== null
            ? window.history.state
            : {}),
          __activeRecordingGuard: true
        },
        "",
        guardedHrefRef.current ?? guardedHref
      );
      blockHistoryChange();
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener("popstate", handlePopState);
      guardedHrefRef.current = null;
    };
  }, [hasActiveRecording, recordingNavigationBlockedMessage]);

  function handleNavigationClickCapture(event: MouseEvent<HTMLDivElement>) {
    if (
      !hasActiveRecording ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const target = event.target;
    const anchor = target instanceof Element ? target.closest("a[href]") : null;

    if (!anchor) {
      return;
    }

    const href = anchor.getAttribute("href");

    if (!href || href.startsWith("#")) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setNavigationGuardMessage(recordingNavigationBlockedMessage);
  }

  return (
    <div
      className="bg-background text-foreground min-h-screen"
      onClickCapture={handleNavigationClickCapture}
    >
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px]">
        <aside
          aria-label="Primary sections"
          data-testid="desktop-sidebar"
          className="border-border bg-card sticky top-0 hidden h-screen w-64 shrink-0 border-r px-4 py-5 lg:flex lg:flex-col"
        >
          <Link
            href="/"
            className="mb-7 flex items-center gap-3 rounded-md px-2 py-1.5"
          >
            <span className="bg-primary text-primary-foreground flex h-10 w-10 items-center justify-center rounded-full text-base font-bold">
              M
            </span>
            <span>
              <span className="block text-base font-semibold">Metronome</span>
              <span className="text-muted-foreground block text-xs font-medium">
                Practice v0
              </span>
            </span>
          </Link>

          <nav className="flex flex-1 flex-col gap-1">
            {topLevelNavItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === pathname ||
                (item.href !== "/" && pathname.startsWith(`${item.href}/`));

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring flex min-h-12 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none",
                    isActive &&
                      "bg-primary text-primary-foreground shadow-soft hover:bg-primary hover:text-primary-foreground"
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
          <header className="border-border bg-background/95 sticky top-0 z-20 border-b px-4 py-3 backdrop-blur lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <Link href="/" className="flex items-center gap-2 rounded-md">
                <span className="bg-primary text-primary-foreground flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold">
                  M
                </span>
                <span className="text-sm font-semibold">
                  Metronome Practice
                </span>
              </Link>
              <MobileDiagnostics
                hidden={areDiagnosticsHidden}
                onHide={() => setAreDiagnosticsHidden(true)}
                onRestore={() => setAreDiagnosticsHidden(false)}
              />
            </div>
          </header>

          <main className="flex-1 px-4 pt-5 pb-28 sm:px-6 lg:px-8 lg:pt-8 lg:pb-8">
            {children}
          </main>
        </div>
      </div>

      {navigationGuardMessage ? (
        <div
          role="alert"
          data-testid="active-recording-navigation-guard"
          className="border-destructive/30 bg-destructive/10 text-destructive shadow-soft fixed right-4 bottom-24 left-4 z-40 rounded-md border px-4 py-3 text-sm font-medium lg:right-4 lg:bottom-4 lg:left-auto lg:max-w-md"
        >
          {navigationGuardMessage}
        </div>
      ) : null}

      <nav
        aria-label="Mobile primary sections"
        data-testid="mobile-bottom-nav"
        className="border-border bg-card shadow-soft fixed inset-x-0 bottom-0 z-30 border-t px-1.5 py-2 lg:hidden"
      >
        <div className="mx-auto grid max-w-xl grid-cols-6 gap-1">
          {topLevelNavItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === pathname ||
              (item.href !== "/" && pathname.startsWith(`${item.href}/`));

            return (
              <Link
                key={item.id}
                href={item.href}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring flex h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 text-[11px] leading-none font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none",
                  isActive &&
                    "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
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
        className="border-border bg-background mt-5 rounded-md border border-dashed px-3 py-3 text-sm"
      >
        <p className="font-medium">Diagnostics hidden</p>
        <p className="text-muted-foreground mt-1 text-xs leading-5">
          Devtools are hidden for this session. Restore them whenever needed.
        </p>
        <Button
          type="button"
          variant="secondary"
          className="mt-3 w-full"
          onClick={onRestore}
        >
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
      className="border-border bg-background mt-5 rounded-md border px-3 py-3 text-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">Diagnostics</p>
          <p className="text-muted-foreground mt-1 text-xs leading-5">
            No recording or playback active.
          </p>
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
      className="border-border bg-card flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
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
