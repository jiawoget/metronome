import { Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SheetMetronomePresetSaveScope = "sheet" | "segment";

type SheetMetronomePresetSaveFormProps = {
  sheetId: string;
  nameDraft: string;
  saveScope: SheetMetronomePresetSaveScope;
  selectedSegment: { id: string; name: string } | null;
  disabled: boolean;
  isBusy: boolean;
  canSave: boolean;
  onNameDraftChange: (value: string) => void;
  onSaveScopeChange: (scope: SheetMetronomePresetSaveScope) => void;
  onSubmit: () => void;
};

export function SheetMetronomePresetSaveForm({
  sheetId,
  nameDraft,
  saveScope,
  selectedSegment,
  disabled,
  isBusy,
  canSave,
  onNameDraftChange,
  onSaveScopeChange,
  onSubmit
}: SheetMetronomePresetSaveFormProps) {
  const selectedSegmentScopeDisabled = !selectedSegment;

  return (
    <form
      className="grid gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label className="grid gap-1 text-xs font-medium">
        Preset name
        <input
          aria-label="Preset name"
          value={nameDraft}
          disabled={disabled || isBusy}
          onChange={(event) => onNameDraftChange(event.currentTarget.value)}
          className="h-9 min-w-0 rounded-md border border-border bg-background px-2 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        />
      </label>
      <fieldset className="grid gap-1">
        <legend className="text-xs font-medium">Save scope</legend>
        <div className="flex flex-wrap gap-2">
          <label className="flex min-w-0 items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-sm">
            <input
              type="radio"
              name={`sheet-metronome-preset-scope-${sheetId}`}
              value="sheet"
              checked={saveScope === "sheet"}
              disabled={disabled || isBusy}
              onChange={() => onSaveScopeChange("sheet")}
            />
            Sheet-wide
          </label>
          <label
            className={cn(
              "flex min-w-0 items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-sm",
              selectedSegmentScopeDisabled && "opacity-60"
            )}
          >
            <input
              type="radio"
              name={`sheet-metronome-preset-scope-${sheetId}`}
              value="segment"
              checked={saveScope === "segment"}
              disabled={disabled || isBusy || selectedSegmentScopeDisabled}
              onChange={() => onSaveScopeChange("segment")}
            />
            Selected segment
          </label>
        </div>
        {selectedSegment ? (
          <p className="text-xs leading-5 text-muted-foreground">
            Selected segment: {selectedSegment.name}
          </p>
        ) : (
          <p className="text-xs leading-5 text-muted-foreground">
            Select a segment to enable segment-scoped presets.
          </p>
        )}
      </fieldset>
      <Button type="submit" disabled={!canSave} className="justify-self-start">
        <Save className="h-4 w-4" aria-hidden="true" />
        Save preset
      </Button>
    </form>
  );
}
