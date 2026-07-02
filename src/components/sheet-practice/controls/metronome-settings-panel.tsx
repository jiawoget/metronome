import type { ReactNode } from "react";
import { Activity, ChevronDown, ChevronUp, Circle } from "lucide-react";

import {
  ACCENT_MODES,
  SUBDIVISIONS,
  TIME_SIGNATURES,
  getCountdownOptions,
  getTickIntervalMs,
  parseAccentMode,
  parseCountdownBeats,
  parseSubdivision,
  parseTimeSignature
} from "@/lib/quick-metronome/control";
import {
  MAX_BPM,
  MIN_BPM,
  type AccentMode,
  type MetronomeSettings,
  type Subdivision
} from "@/lib/quick-metronome/types";
import { Button } from "@/components/ui/button";
import { LabeledSelect } from "@/components/sheet-practice/controls/labeled-select";
import { cn } from "@/lib/utils";

const subdivisionLabels: Record<Subdivision, string> = {
  quarter: "Quarter",
  eighth: "Eighth",
  triplet: "Triplet",
  sixteenth: "Sixteenth"
};

const accentLabels: Record<AccentMode, string> = {
  downbeat: "Downbeat",
  "every-beat": "Every beat",
  off: "Off"
};

type MetronomeSettingsPanelProps = {
  settings: MetronomeSettings;
  bpmDraft: string;
  unsupportedTimeSignatureMessage: string | null;
  arePreRunSettingsLocked: boolean;
  bpmInputId?: string;
  className?: string;
  layout?: "sheet" | "stacked";
  bpmAccessory?: ReactNode;
  barCountInControl?: ReactNode;
  isCountdownReplacedByBarCountIn?: boolean;
  countdownReplacementText?: string;
  onTapTempo?: () => void;
  setBpmDraft: (value: string) => void;
  commitBpmInput: () => void;
  stepBpmInput: (step: -1 | 1) => void;
  updateSettings: (nextSettings: Partial<MetronomeSettings>) => void;
};

export function MetronomeSettingsPanel({
  settings,
  bpmDraft,
  unsupportedTimeSignatureMessage,
  arePreRunSettingsLocked,
  bpmInputId = "sheet-bpm",
  className,
  layout = "sheet",
  bpmAccessory,
  barCountInControl,
  isCountdownReplacedByBarCountIn = false,
  countdownReplacementText = "Bar count-in replaces beat countdown for Sheet Practice.",
  onTapTempo,
  setBpmDraft,
  commitBpmInput,
  stepBpmInput,
  updateSettings
}: MetronomeSettingsPanelProps) {
  function handleTimeSignatureChange(value: string) {
    const nextTimeSignature = parseTimeSignature(value);

    updateSettings({
      timeSignature: nextTimeSignature
    });
  }

  function handleCountdownChange(value: string) {
    updateSettings({
      countdownBeats: parseCountdownBeats(value)
    });
  }

  return (
    <div
      className={cn(
        "border-border bg-background grid gap-3 rounded-md border p-3",
        layout === "sheet" && "md:grid-cols-[minmax(13rem,0.85fr)_1fr]",
        className
      )}
    >
      <div>
        <label htmlFor={bpmInputId} className="text-sm font-medium">
          BPM
        </label>
        <div className="mt-2 grid grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] gap-2">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label="Decrease BPM"
            onClick={() => stepBpmInput(-1)}
          >
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </Button>
          <input
            id={bpmInputId}
            aria-label="BPM"
            type="number"
            min={MIN_BPM}
            max={MAX_BPM}
            step={1}
            value={bpmDraft}
            onChange={(event) => setBpmDraft(event.target.value)}
            onBlur={commitBpmInput}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                commitBpmInput();
                event.currentTarget.blur();
              }
            }}
            className="border-border bg-background focus-visible:ring-ring h-10 min-w-0 rounded-md border px-2 text-center text-lg font-semibold focus-visible:ring-2 focus-visible:outline-none"
          />
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label="Increase BPM"
            onClick={() => stepBpmInput(1)}
          >
            <ChevronUp className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
          {onTapTempo ? (
            <Button type="button" variant="secondary" onClick={onTapTempo}>
              <Activity className="h-4 w-4" aria-hidden="true" />
              Tap Tempo
            </Button>
          ) : null}
          <p className="text-muted-foreground text-sm leading-6">
            Tick interval {Math.round(getTickIntervalMs(settings))} ms.
          </p>
        </div>
        {bpmAccessory}
      </div>

      {unsupportedTimeSignatureMessage ? (
        <p
          role="status"
          className={cn(
            "rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900",
            layout === "sheet" && "md:col-span-2"
          )}
        >
          {unsupportedTimeSignatureMessage}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <LabeledSelect
          label="Time signature"
          value={settings.timeSignature}
          disabled={arePreRunSettingsLocked}
          onChange={handleTimeSignatureChange}
          options={TIME_SIGNATURES.map((timeSignature) => ({
            value: timeSignature,
            label: timeSignature
          }))}
        />
        <LabeledSelect
          label="Subdivision"
          value={settings.subdivision}
          disabled={arePreRunSettingsLocked}
          onChange={(value) =>
            updateSettings({ subdivision: parseSubdivision(value) })
          }
          options={SUBDIVISIONS.map((subdivision) => ({
            value: subdivision,
            label: subdivisionLabels[subdivision]
          }))}
        />
        <LabeledSelect
          label="Countdown"
          value={String(settings.countdownBeats)}
          disabled={
            arePreRunSettingsLocked || isCountdownReplacedByBarCountIn
          }
          onChange={handleCountdownChange}
          options={getCountdownOptions().map((option) => ({
            value: String(option.beats),
            label: option.label
          }))}
        />
        {isCountdownReplacedByBarCountIn ? (
          <p
            role="status"
            className="text-muted-foreground -mt-1 text-xs leading-5 sm:col-start-3"
          >
            {countdownReplacementText}
          </p>
        ) : null}
        {barCountInControl ? (
          <div className="min-w-0 sm:col-span-3">{barCountInControl}</div>
        ) : null}
      </div>

      {arePreRunSettingsLocked ? (
        <p
          role="status"
          className={cn(
            "text-muted-foreground text-sm leading-6",
            layout === "sheet" && "md:col-span-2"
          )}
        >
          Meter, subdivision, accent, and countdown are locked while the
          metronome is running. Stop playback to change them.
        </p>
      ) : null}

      <div className={cn(layout === "sheet" && "md:col-span-2")}>
        <p className="text-sm font-medium">Accent</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {ACCENT_MODES.map((accentMode) => (
            <Button
              key={accentMode}
              type="button"
              variant={settings.accent === accentMode ? "default" : "secondary"}
              aria-pressed={settings.accent === accentMode}
              disabled={arePreRunSettingsLocked}
              onClick={() =>
                updateSettings({ accent: parseAccentMode(accentMode) })
              }
            >
              <Circle className="h-4 w-4" aria-hidden="true" />
              {accentLabels[accentMode]}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
