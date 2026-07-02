import { Check, Pencil, Trash2, Upload, X } from "lucide-react";
import type { KeyboardEvent } from "react";

import type { SheetMetronomePreset } from "@/domain/practice";
import { Button } from "@/components/ui/button";
import type { AccentMode, Subdivision } from "@/lib/quick-metronome/types";

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

type SheetMetronomePresetRowProps = {
  preset: SheetMetronomePreset;
  scopeLabel: string;
  isEditing: boolean;
  isConfirmingDelete: boolean;
  renameDraft: string;
  actionsDisabled: boolean;
  isBusy: boolean;
  onRenameDraftChange: (value: string) => void;
  onRenameKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onSaveRename: () => void;
  onCancelRename: () => void;
  onLoad: () => void;
  onStartRename: () => void;
  onAskDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
};

function formatCountdown(countdownBeats: number) {
  return countdownBeats === 0
    ? "No beat countdown"
    : `${countdownBeats}-beat countdown`;
}

function formatBarCountIn(barCountIn: { enabled: boolean; bars: 1 | 2 }) {
  if (!barCountIn.enabled) {
    return "Bar count-in off";
  }

  return barCountIn.bars === 1
    ? "Bar count-in 1 bar"
    : "Bar count-in 2 bars";
}

function formatPresetSummary(preset: SheetMetronomePreset) {
  return [
    `${preset.settings.bpm} BPM`,
    preset.settings.timeSignature,
    subdivisionLabels[preset.settings.subdivision],
    accentLabels[preset.settings.accent],
    formatCountdown(preset.settings.countdownBeats),
    formatBarCountIn(preset.settings.barCountIn)
  ].join(", ");
}

export function SheetMetronomePresetRow({
  preset,
  scopeLabel,
  isEditing,
  isConfirmingDelete,
  renameDraft,
  actionsDisabled,
  isBusy,
  onRenameDraftChange,
  onRenameKeyDown,
  onSaveRename,
  onCancelRename,
  onLoad,
  onStartRename,
  onAskDelete,
  onConfirmDelete,
  onCancelDelete
}: SheetMetronomePresetRowProps) {
  return (
    <div
      data-testid={`sheet-metronome-preset-${preset.id}`}
      className="border-border bg-background grid min-w-0 gap-2 rounded-md border p-2"
    >
      <div className="grid min-w-0 gap-1">
        {isEditing ? (
          <label className="grid gap-1 text-xs font-medium">
            Rename preset {preset.name}
            <input
              aria-label={`Rename preset ${preset.name} name`}
              value={renameDraft}
              autoFocus
              disabled={actionsDisabled}
              onChange={(event) => onRenameDraftChange(event.currentTarget.value)}
              onKeyDown={onRenameKeyDown}
              className="border-border bg-background focus-visible:ring-ring h-9 min-w-0 rounded-md border px-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
            />
          </label>
        ) : (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{preset.name}</p>
            <p className="text-muted-foreground text-xs leading-5">
              {scopeLabel}
            </p>
          </div>
        )}
        <p className="text-muted-foreground text-xs leading-5">
          {formatPresetSummary(preset)}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {isEditing ? (
          <>
            <Button
              type="button"
              size="default"
              disabled={actionsDisabled}
              onClick={onSaveRename}
            >
              <Check className="h-4 w-4" aria-hidden="true" />
              Save rename
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="default"
              disabled={isBusy}
              onClick={onCancelRename}
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Cancel rename
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="secondary"
              disabled={actionsDisabled}
              aria-label={`Load preset ${preset.name}`}
              onClick={onLoad}
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              Load
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={actionsDisabled}
              aria-label={`Rename preset ${preset.name}`}
              onClick={onStartRename}
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Rename
            </Button>
            {isConfirmingDelete ? (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={actionsDisabled}
                  aria-label={`Confirm delete preset ${preset.name}`}
                  onClick={onConfirmDelete}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Confirm delete
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isBusy}
                  aria-label={`Cancel delete preset ${preset.name}`}
                  onClick={onCancelDelete}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="secondary"
                disabled={actionsDisabled}
                aria-label={`Delete preset ${preset.name}`}
                onClick={onAskDelete}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Delete
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
