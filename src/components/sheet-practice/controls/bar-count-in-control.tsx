import type { ChangeEvent } from "react";

import { cn } from "@/lib/utils";

export type BarCountInBars = 1 | 2;

export type BarCountInControlActiveTick = {
  count: number;
  beatNumber: number;
  remainingBeats: number;
  sourceMeasureNumber: number | null;
  isPreRoll: boolean;
};

export type BarCountInControlProps = {
  enabled: boolean;
  bars: BarCountInBars;
  disabled?: boolean;
  className?: string;
  helperText?: string;
  readinessText?: string;
  lockedText?: string;
  blockedText?: string | null;
  activeTick?: BarCountInControlActiveTick | null;
  onEnabledChange: (enabled: boolean) => void;
  onBarsChange: (bars: BarCountInBars) => void;
};

function parseBars(value: string): BarCountInBars {
  return value === "2" ? 2 : 1;
}

function formatBarsText(bars: BarCountInBars) {
  return bars === 1 ? "one bar" : "two bars";
}

function formatActiveTick(tick: BarCountInControlActiveTick) {
  const sourceText = tick.isPreRoll
    ? `Pre-roll beat ${tick.beatNumber}`
    : `Measure ${tick.sourceMeasureNumber ?? "?"} beat ${tick.beatNumber}`;
  const remainingText =
    tick.remainingBeats === 1
      ? "1 beat remains"
      : `${tick.remainingBeats} beats remain`;

  return `Count ${tick.count}. ${sourceText}. ${remainingText}.`;
}

export function BarCountInControl({
  enabled,
  bars,
  disabled = false,
  className,
  helperText = "Uses the saved measure grid when enabled.",
  readinessText,
  lockedText = "Stop playback to change bar count-in.",
  blockedText = null,
  activeTick = null,
  onEnabledChange,
  onBarsChange
}: BarCountInControlProps) {
  const barsDisabled = disabled || !enabled;
  const statusText =
    activeTick !== null
      ? formatActiveTick(activeTick)
      : blockedText
        ? blockedText
        : disabled
          ? lockedText
          : enabled
            ? readinessText ??
              `Counts ${formatBarsText(bars)} before the selected segment or measure 1.`
            : helperText;

  function handleEnabledChange(event: ChangeEvent<HTMLInputElement>) {
    onEnabledChange(event.currentTarget.checked);
  }

  function handleBarsChange(event: ChangeEvent<HTMLSelectElement>) {
    onBarsChange(parseBars(event.currentTarget.value));
  }

  return (
    <div
      className={cn(
        "bg-muted/40 grid gap-3 rounded-md px-3 py-2 sm:grid-cols-[minmax(0,1fr)_7rem] sm:items-start",
        className
      )}
    >
      <div className="min-w-0">
        <label className="flex min-w-0 items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            aria-label="Enable bar count-in"
            checked={enabled}
            disabled={disabled}
            onChange={handleEnabledChange}
            className="border-border text-primary focus-visible:ring-ring h-4 w-4 rounded focus-visible:ring-2 focus-visible:outline-none"
          />
          <span className="truncate">Bar count-in</span>
        </label>
        <p
          role="status"
          aria-live="polite"
          className={cn(
            "text-muted-foreground mt-1 text-xs leading-5",
            blockedText && "text-destructive"
          )}
        >
          {statusText}
        </p>
      </div>

      <div className="min-w-0">
        <label htmlFor="sheet-bar-count-in-bars" className="text-xs font-medium">
          Bars
        </label>
        <select
          id="sheet-bar-count-in-bars"
          aria-label="Bar count-in bars"
          value={String(bars)}
          disabled={barsDisabled}
          onChange={handleBarsChange}
          className="border-border bg-background focus-visible:ring-ring mt-1 h-9 w-full rounded-md border px-2 text-sm focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
        >
          <option value="1">1 bar</option>
          <option value="2">2 bars</option>
        </select>
      </div>
    </div>
  );
}
