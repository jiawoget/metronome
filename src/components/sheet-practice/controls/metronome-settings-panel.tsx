import { ChevronDown, ChevronUp, Circle } from "lucide-react";

import {
  ACCENT_MODES,
  COUNTDOWN_OPTIONS,
  SUBDIVISIONS,
  TIME_SIGNATURES,
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
  setBpmDraft,
  commitBpmInput,
  stepBpmInput,
  updateSettings
}: MetronomeSettingsPanelProps) {
  return (
    <div className="border-border bg-background grid gap-3 rounded-md border p-3 md:grid-cols-[minmax(13rem,0.85fr)_1fr]">
      <div>
        <label htmlFor="sheet-bpm" className="text-sm font-medium">
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
            id="sheet-bpm"
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
        <p className="text-muted-foreground mt-2 text-sm leading-6">
          Tick interval {Math.round(getTickIntervalMs(settings))} ms.
        </p>
      </div>

      {unsupportedTimeSignatureMessage ? (
        <p
          role="status"
          className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 md:col-span-2"
        >
          {unsupportedTimeSignatureMessage}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <LabeledSelect
          label="Time signature"
          value={settings.timeSignature}
          disabled={arePreRunSettingsLocked}
          onChange={(value) =>
            updateSettings({ timeSignature: parseTimeSignature(value) })
          }
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
          disabled={arePreRunSettingsLocked}
          onChange={(value) =>
            updateSettings({ countdownBeats: parseCountdownBeats(value) })
          }
          options={COUNTDOWN_OPTIONS.map((beats) => ({
            value: String(beats),
            label: beats === 0 ? "Off" : `${beats} beats`
          }))}
        />
      </div>

      {arePreRunSettingsLocked ? (
        <p
          role="status"
          className="text-muted-foreground text-sm leading-6 md:col-span-2"
        >
          Meter, subdivision, accent, and countdown are locked while the
          metronome is running. Stop playback to change them.
        </p>
      ) : null}

      <div className="md:col-span-2">
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
