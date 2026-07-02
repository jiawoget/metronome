"use client";

import { CornerDownLeft, Route, Search, X } from "lucide-react";
import type { KeyboardEvent, MouseEvent } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { CommandPaletteContinueTargetsStatus } from "@/hooks/use-command-palette-continue-targets";
import { cn } from "@/lib/utils";
import {
  filterHomeCommandPaletteCommands,
  type HomeCommandPaletteCommand
} from "@/components/app-shell/command-palette-commands";

type CommandPaletteProps = {
  commands: readonly HomeCommandPaletteCommand[];
  continueTargetsStatus: CommandPaletteContinueTargetsStatus;
  continueTargetsErrorMessage: string | null;
  onClose: () => void;
  onExecuteCommand: (href: string) => boolean;
};

export function CommandPalette({
  commands,
  continueTargetsStatus,
  continueTargetsErrorMessage,
  onClose,
  onExecuteCommand
}: CommandPaletteProps) {
  const titleId = useId();
  const listboxId = useId();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const filteredCommands = useMemo(
    () => filterHomeCommandPaletteCommands(commands, query),
    [commands, query]
  );
  const resolvedActiveIndex =
    filteredCommands.length > 0
      ? Math.min(activeIndex, filteredCommands.length - 1)
      : 0;
  const activeCommand = filteredCommands[resolvedActiveIndex] ?? null;
  const activeDescendantId = activeCommand
    ? getCommandOptionId(listboxId, activeCommand.id)
    : undefined;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, []);

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case "Escape":
        event.preventDefault();
        onClose();
        break;
      case "ArrowDown":
        event.preventDefault();
        moveActiveResult(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        moveActiveResult(-1);
        break;
      case "Enter":
        event.preventDefault();
        if (activeCommand) {
          executeCommand(activeCommand, { closeWhenBlocked: true });
        }
        break;
      case "Tab":
        trapTabFocus(event);
        break;
    }
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key === "Tab") {
      trapTabFocus(event);
    }
  }

  function moveActiveResult(delta: number) {
    if (filteredCommands.length === 0) {
      setActiveIndex(0);
      return;
    }

    setActiveIndex((currentIndex) => {
      const nextIndex = currentIndex + delta;

      if (nextIndex < 0) {
        return filteredCommands.length - 1;
      }

      if (nextIndex >= filteredCommands.length) {
        return 0;
      }

      return nextIndex;
    });
  }

  function trapTabFocus(event: KeyboardEvent<HTMLElement>) {
    const focusableElements = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
    );

    if (!focusableElements || focusableElements.length === 0) {
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
      return;
    }

    if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  function executeCommand(
    command: HomeCommandPaletteCommand,
    { closeWhenBlocked = false }: { closeWhenBlocked?: boolean } = {}
  ) {
    const didNavigate = onExecuteCommand(command.href);

    if (didNavigate || closeWhenBlocked) {
      onClose();
    }
  }

  function handleResultClick(
    event: MouseEvent<HTMLButtonElement>,
    command: HomeCommandPaletteCommand
  ) {
    event.preventDefault();
    executeCommand(command);
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/20 px-3 py-14 backdrop-blur-[1px] sm:px-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-card text-card-foreground shadow-soft border-border mx-auto flex max-h-[min(680px,calc(100vh-7rem))] w-full max-w-xl flex-col overflow-hidden rounded-md border"
        onKeyDown={handleDialogKeyDown}
      >
        <div className="border-border flex items-center gap-2 border-b px-3 py-2.5">
          <Search
            className="text-muted-foreground h-4 w-4 shrink-0"
            aria-hidden="true"
          />
          <h2 id={titleId} className="sr-only">
            Command palette
          </h2>
          <input
            ref={searchInputRef}
            type="search"
            role="combobox"
            aria-label="Search commands"
            aria-expanded="true"
            aria-controls={listboxId}
            aria-activedescendant={activeDescendantId}
            data-command-palette-search="true"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleSearchKeyDown}
            className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-sm font-medium outline-none"
            placeholder="Search commands"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            aria-label="Close command palette"
            onClick={onClose}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto py-2">
          {filteredCommands.length > 0 ? (
            <div
              id={listboxId}
              role="listbox"
              aria-label="Command results"
              className="space-y-1 px-2"
            >
              {filteredCommands.map((command, index) => {
                const isActive = index === resolvedActiveIndex;

                return (
                  <button
                    key={command.id}
                    id={getCommandOptionId(listboxId, command.id)}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    aria-label={command.executionLabel}
                    className={cn(
                      "focus-visible:ring-ring flex w-full items-center gap-3 rounded-md px-3 py-2 text-left focus-visible:ring-2 focus-visible:outline-none",
                      isActive ? "bg-muted" : "hover:bg-muted/70"
                    )}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={(event) => handleResultClick(event, command)}
                  >
                    <CommandIcon command={command} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {command.title}
                      </span>
                      <span className="text-muted-foreground block truncate text-xs">
                        {command.subtitle}
                      </span>
                    </span>
                    <CornerDownLeft
                      className="text-muted-foreground h-3.5 w-3.5 shrink-0"
                      aria-hidden="true"
                    />
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground px-5 py-8 text-center text-sm">
              No commands found.
            </p>
          )}
        </div>

        {continueTargetsStatus === "loading" ||
        continueTargetsStatus === "error" ? (
          <div className="border-border text-muted-foreground border-t px-4 py-2 text-xs">
            {continueTargetsStatus === "loading"
              ? "Loading practice targets..."
              : continueTargetsErrorMessage}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CommandIcon({ command }: { command: HomeCommandPaletteCommand }) {
  if (command.kind === "route") {
    return (
      <Route className="text-muted-foreground h-4 w-4 shrink-0" aria-hidden="true" />
    );
  }

  return (
    <Search className="text-muted-foreground h-4 w-4 shrink-0" aria-hidden="true" />
  );
}

function getCommandOptionId(listboxId: string, commandId: string) {
  return `${listboxId}-${commandId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}
