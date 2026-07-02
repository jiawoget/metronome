import { ListMusic } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode
} from "react";

import {
  createMetronomeControlStateFromPreset,
  createSheetMetronomePresetSettingsSnapshot,
  type SheetMetronomePreset
} from "@/domain/practice";
import {
  SheetMetronomePresetSaveForm,
  type SheetMetronomePresetSaveScope
} from "@/components/sheet-practice/controls/sheet-metronome-preset-save-form";
import { SheetMetronomePresetRow } from "@/components/sheet-practice/controls/sheet-metronome-preset-row";
import type { SheetMetronomePresetService } from "@/services/sheet-metronome-presets";
import type { MetronomeSettings } from "@/lib/quick-metronome/types";

type SheetMetronomePresetControlProps = {
  sheetId: string;
  selectedSegment: { id: string; name: string } | null;
  service: SheetMetronomePresetService;
  settings: MetronomeSettings;
  barCountIn: { enabled: boolean; bars: 1 | 2 };
  disabled?: boolean;
  onPresetLoaded: (state: {
    settings: MetronomeSettings;
    barCountIn: { enabled: boolean; bars: 1 | 2 };
  }) => void;
  onStatusMessage?: (message: string) => void;
  onErrorMessage?: (message: string | null) => void;
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function PresetGroup({
  title,
  emptyText,
  presets,
  children
}: {
  title: string;
  emptyText: string;
  presets: SheetMetronomePreset[];
  children: (preset: SheetMetronomePreset) => ReactNode;
}) {
  return (
    <section className="grid gap-2" aria-label={title}>
      <h4 className="text-sm font-medium">{title}</h4>
      {presets.length === 0 ? (
        <p className="text-muted-foreground text-xs leading-5">{emptyText}</p>
      ) : (
        <div className="grid gap-2">{presets.map((preset) => children(preset))}</div>
      )}
    </section>
  );
}

export function SheetMetronomePresetControl({
  sheetId,
  selectedSegment,
  service,
  settings,
  barCountIn,
  disabled = false,
  onPresetLoaded,
  onStatusMessage,
  onErrorMessage
}: SheetMetronomePresetControlProps) {
  const [presets, setPresets] = useState<SheetMetronomePreset[]>([]);
  const [isListLoading, setIsListLoading] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [saveScope, setSaveScope] =
    useState<SheetMetronomePresetSaveScope>("sheet");
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [confirmDeletePresetId, setConfirmDeletePresetId] =
    useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const mountedRef = useRef(false);
  const sheetIdRef = useRef(sheetId);
  const disabledRef = useRef(disabled);
  const listRequestIdRef = useRef(0);
  const loadRequestIdRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      listRequestIdRef.current += 1;
      loadRequestIdRef.current += 1;
    };
  }, []);

  useEffect(() => {
    sheetIdRef.current = sheetId;
  }, [sheetId]);

  useEffect(() => {
    disabledRef.current = disabled;
    if (disabled) {
      loadRequestIdRef.current += 1;
    }
  }, [disabled]);

  const showStatus = useCallback(
    (message: string) => {
      setStatusMessage(message);
      setErrorMessage(null);
      onStatusMessage?.(message);
      onErrorMessage?.(null);
    },
    [onErrorMessage, onStatusMessage]
  );

  const showError = useCallback(
    (message: string) => {
      setErrorMessage(message);
      onErrorMessage?.(message);
    },
    [onErrorMessage]
  );

  const isCurrentListRequest = useCallback(
    (requestId: number, requestSheetId: string) =>
      mountedRef.current &&
      listRequestIdRef.current === requestId &&
      sheetIdRef.current === requestSheetId,
    []
  );

  const refreshPresets = useCallback(async () => {
    const requestSheetId = sheetId;
    const requestId = listRequestIdRef.current + 1;

    listRequestIdRef.current = requestId;
    setIsListLoading(true);

    try {
      const nextPresets = await service.listPresets(requestSheetId);

      if (!isCurrentListRequest(requestId, requestSheetId)) {
        return null;
      }

      setPresets(nextPresets);

      return nextPresets;
    } catch (error) {
      if (isCurrentListRequest(requestId, requestSheetId)) {
        showError(getErrorMessage(error, "Presets could not be loaded."));
      }

      return null;
    } finally {
      if (isCurrentListRequest(requestId, requestSheetId)) {
        setIsListLoading(false);
      }
    }
  }, [isCurrentListRequest, service, sheetId, showError]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshPresets();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      listRequestIdRef.current += 1;
    };
  }, [refreshPresets]);

  const sheetWidePresets = useMemo(
    () => presets.filter((preset) => preset.segmentId === null),
    [presets]
  );
  const selectedSegmentPresets = useMemo(
    () =>
      selectedSegment
        ? presets.filter((preset) => preset.segmentId === selectedSegment.id)
        : [],
    [presets, selectedSegment]
  );
  const otherSegmentPresets = useMemo(
    () =>
      presets.filter(
        (preset) =>
          preset.segmentId !== null &&
          (!selectedSegment || preset.segmentId !== selectedSegment.id)
      ),
    [presets, selectedSegment]
  );
  const isBusy = busyAction !== null;
  const effectiveSaveScope = selectedSegment ? saveScope : "sheet";
  const actionsDisabled = disabled || isBusy;
  const canSave =
    !disabled &&
    !isBusy &&
    (effectiveSaveScope === "sheet" || selectedSegment !== null);

  function getPresetScopeLabel(preset: SheetMetronomePreset) {
    if (preset.segmentId === null) {
      return "Sheet-wide";
    }

    if (selectedSegment?.id === preset.segmentId) {
      return `Selected segment: ${selectedSegment.name}`;
    }

    return "Unknown segment";
  }

  async function handleSavePreset() {
    const trimmedName = nameDraft.trim();

    if (!trimmedName) {
      showError("Preset name is required.");
      return;
    }

    if (effectiveSaveScope === "segment" && !selectedSegment) {
      showError("Select a segment before saving a segment preset.");
      return;
    }

    setBusyAction("save");

    try {
      await service.savePreset({
        sheetId,
        segmentId:
          effectiveSaveScope === "segment" ? selectedSegment?.id ?? null : null,
        name: trimmedName,
        settings: createSheetMetronomePresetSettingsSnapshot({
          settings,
          barCountIn
        })
      });

      const refreshed = await refreshPresets();

      if (refreshed !== null) {
        setNameDraft("");
        showStatus(`Saved preset ${trimmedName}.`);
      }
    } catch (error) {
      showError(getErrorMessage(error, "Preset could not be saved."));
    } finally {
      if (mountedRef.current) {
        setBusyAction(null);
      }
    }
  }

  async function handleLoadPreset(preset: SheetMetronomePreset) {
    if (disabled) {
      return;
    }

    const requestSheetId = sheetId;
    const requestId = loadRequestIdRef.current + 1;
    const loadBusyAction = `load:${preset.id}`;

    loadRequestIdRef.current = requestId;
    setBusyAction(loadBusyAction);

    try {
      const result = await service.loadPreset(requestSheetId, preset.id);
      const isCurrentLoad =
        mountedRef.current &&
        loadRequestIdRef.current === requestId &&
        sheetIdRef.current === requestSheetId;

      if (!isCurrentLoad || disabledRef.current) {
        return;
      }

      if (result.status === "missing") {
        showError("Preset was not found.");
        await refreshPresets();
        return;
      }

      onPresetLoaded(createMetronomeControlStateFromPreset(result.settings));
      showStatus(`Loaded preset ${result.preset.name}.`);
    } catch (error) {
      const isCurrentLoad =
        mountedRef.current &&
        loadRequestIdRef.current === requestId &&
        sheetIdRef.current === requestSheetId;

      if (isCurrentLoad) {
        showError(getErrorMessage(error, "Preset could not be loaded."));
      }
    } finally {
      if (mountedRef.current && sheetIdRef.current === requestSheetId) {
        setBusyAction((current) =>
          current === loadBusyAction ? null : current
        );
      }
    }
  }

  function cancelRename() {
    setEditingPresetId(null);
    setRenameDraft("");
  }

  function startRename(preset: SheetMetronomePreset) {
    setEditingPresetId(preset.id);
    setRenameDraft(preset.name);
    setConfirmDeletePresetId(null);
  }

  async function saveRename(preset: SheetMetronomePreset) {
    const trimmedName = renameDraft.trim();

    if (!trimmedName) {
      showError("Preset name is required.");
      return;
    }

    setBusyAction(`rename:${preset.id}`);

    try {
      await service.renamePreset({
        sheetId,
        presetId: preset.id,
        name: trimmedName
      });

      const refreshed = await refreshPresets();

      if (refreshed !== null) {
        setEditingPresetId(null);
        setRenameDraft("");
        showStatus(`Renamed preset ${trimmedName}.`);
      }
    } catch (error) {
      showError(getErrorMessage(error, "Preset could not be renamed."));
    } finally {
      if (mountedRef.current) {
        setBusyAction(null);
      }
    }
  }

  async function deletePreset(preset: SheetMetronomePreset) {
    setBusyAction(`delete:${preset.id}`);

    try {
      await service.deletePreset(sheetId, preset.id);

      const refreshed = await refreshPresets();

      if (refreshed !== null) {
        setConfirmDeletePresetId(null);
        showStatus(`Deleted preset ${preset.name}.`);
      }
    } catch (error) {
      showError(getErrorMessage(error, "Preset could not be deleted."));
    } finally {
      if (mountedRef.current) {
        setBusyAction(null);
      }
    }
  }

  function handleRenameKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
    preset: SheetMetronomePreset
  ) {
    if (event.key === "Enter") {
      event.preventDefault();
      void saveRename(preset);
    } else if (event.key === "Escape") {
      cancelRename();
    }
  }

  function renderPresetRow(preset: SheetMetronomePreset) {
    const isEditing = editingPresetId === preset.id;
    const isConfirmingDelete = confirmDeletePresetId === preset.id;
    const scopeLabel = getPresetScopeLabel(preset);

    return (
      <SheetMetronomePresetRow
        key={preset.id}
        preset={preset}
        scopeLabel={scopeLabel}
        isEditing={isEditing}
        isConfirmingDelete={isConfirmingDelete}
        renameDraft={renameDraft}
        actionsDisabled={actionsDisabled}
        isBusy={isBusy}
        onRenameDraftChange={setRenameDraft}
        onRenameKeyDown={(event) => handleRenameKeyDown(event, preset)}
        onSaveRename={() => void saveRename(preset)}
        onCancelRename={cancelRename}
        onLoad={() => void handleLoadPreset(preset)}
        onStartRename={() => startRename(preset)}
        onAskDelete={() => {
          setEditingPresetId(null);
          setConfirmDeletePresetId(preset.id);
        }}
        onConfirmDelete={() => void deletePreset(preset)}
        onCancelDelete={() => setConfirmDeletePresetId(null)}
      />
    );
  }

  return (
    <section
      aria-label="Sheet metronome presets"
      className="bg-muted/40 grid min-w-0 gap-3 rounded-md px-3 py-2"
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <ListMusic className="h-4 w-4" aria-hidden="true" />
        <h3 className="text-sm font-medium">Metronome presets</h3>
        {isListLoading ? (
          <span className="text-muted-foreground text-xs">Loading...</span>
        ) : null}
      </div>

      <SheetMetronomePresetSaveForm
        sheetId={sheetId}
        nameDraft={nameDraft}
        saveScope={effectiveSaveScope}
        selectedSegment={selectedSegment}
        disabled={disabled}
        isBusy={isBusy}
        canSave={canSave}
        onNameDraftChange={setNameDraft}
        onSaveScopeChange={setSaveScope}
        onSubmit={() => void handleSavePreset()}
      />

      <div className="grid gap-3">
        <PresetGroup
          title="Sheet-wide presets"
          emptyText="No sheet-wide presets saved."
          presets={sheetWidePresets}
        >
          {renderPresetRow}
        </PresetGroup>
        {selectedSegment ? (
          <PresetGroup
            title="Selected segment presets"
            emptyText="No presets saved for the selected segment."
            presets={selectedSegmentPresets}
          >
            {renderPresetRow}
          </PresetGroup>
        ) : null}
        {otherSegmentPresets.length > 0 ? (
          <PresetGroup
            title="Other segment presets"
            emptyText="No other segment presets saved."
            presets={otherSegmentPresets}
          >
            {renderPresetRow}
          </PresetGroup>
        ) : null}
      </div>

      <div aria-live="polite" className="min-h-5">
        {errorMessage ? (
          <p role="alert" className="text-destructive text-xs leading-5">
            {errorMessage}
          </p>
        ) : statusMessage ? (
          <p role="status" className="text-muted-foreground text-xs leading-5">
            {statusMessage}
          </p>
        ) : null}
      </div>
    </section>
  );
}
