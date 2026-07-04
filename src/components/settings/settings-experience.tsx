"use client";

import { AlertTriangle, Database, Mic, RotateCcw, Save, Settings2, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  DEFAULT_USER_SETTINGS,
  SETTINGS_SUBDIVISIONS,
  SETTINGS_TIME_SIGNATURES,
  formatStorageBytes,
  getClearLocalDataPlan,
  type LocalDataSummary,
  type MicrophonePermissionStatus,
  type UserSettings
} from "@/domain/settings";
import {
  browserSettingsService,
  browserLocalDataCleanupService,
  browserMicrophonePermissionService,
  browserStorageSummaryService
} from "@/services/settings/browser";
import type {
  LocalDataCleanupService,
  PermissionStatusService,
  StorageSummaryService,
  UserSettingsService
} from "@/services/settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type SettingsExperienceProps = {
  settingsService?: UserSettingsService;
  storageSummaryService?: StorageSummaryService;
  cleanupService?: LocalDataCleanupService;
  permissionService?: PermissionStatusService;
};

type LoadState = "loading" | "ready" | "error";

const subdivisionLabels: Record<UserSettings["defaultSubdivision"], string> = {
  quarter: "Quarter notes",
  eighth: "Eighth notes",
  triplet: "Triplets",
  sixteenth: "Sixteenth notes"
};

const permissionLabels: Record<MicrophonePermissionStatus, string> = {
  granted: "Microphone permission granted",
  denied: "Microphone permission denied",
  prompt: "Microphone permission will be requested when recording starts",
  unknown: "Microphone permission status is unknown",
  unsupported: "Permission status is not available in this browser"
};

function emptySummary(): LocalDataSummary {
  return {
    counts: {
      sheets: 0,
      recordings: 0,
      references: 0,
      errorMarkers: 0,
      practiceSessions: 0
    },
    storageEstimate: {
      supported: false,
      message: "Storage estimate has not loaded yet."
    }
  };
}

function getStorageEstimateLabel(summary: LocalDataSummary) {
  const estimate = summary.storageEstimate;

  if (!estimate.supported) {
    return estimate.message;
  }

  const usage = formatStorageBytes(estimate.usageBytes);

  if (estimate.quotaBytes === null) {
    return `${usage} used. Browser quota is not reported.`;
  }

  return `${usage} used of ${formatStorageBytes(estimate.quotaBytes)} available.`;
}

function getPermissionTone(status: MicrophonePermissionStatus) {
  if (status === "granted") {
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  }

  if (status === "denied") {
    return "border-red-200 bg-red-50 text-red-900";
  }

  return "border-amber-200 bg-amber-50 text-amber-900";
}

export function SettingsExperience({
  settingsService = browserSettingsService,
  storageSummaryService = browserStorageSummaryService,
  cleanupService = browserLocalDataCleanupService,
  permissionService = browserMicrophonePermissionService
}: SettingsExperienceProps) {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS);
  const [bpmDraft, setBpmDraft] = useState(String(DEFAULT_USER_SETTINGS.defaultBpm));
  const [summary, setSummary] = useState<LocalDataSummary>(emptySummary);
  const [permissionStatus, setPermissionStatus] = useState<MicrophonePermissionStatus>("unknown");
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [saveMessage, setSaveMessage] = useState("Settings are loaded from local app storage.");
  const [cleanupMessage, setCleanupMessage] = useState<string | null>(null);
  const [cleanupError, setCleanupError] = useState<string | null>(null);
  const [isConfirmingCleanup, setIsConfirmingCleanup] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  const cleanupPlan = useMemo(() => getClearLocalDataPlan(), []);

  async function refreshSummary() {
    setSummary(await storageSummaryService.getSummary());
  }

  useEffect(() => {
    let isActive = true;

    async function load() {
      try {
        const [nextSettings, nextSummary, nextPermissionStatus] = await Promise.all([
          settingsService.getSettings(),
          storageSummaryService.getSummary(),
          permissionService.getMicrophonePermissionStatus()
        ]);

        if (!isActive) {
          return;
        }

        setSettings(nextSettings);
        setBpmDraft(String(nextSettings.defaultBpm));
        setSummary(nextSummary);
        setPermissionStatus(nextPermissionStatus);
        setLoadState("ready");
      } catch {
        if (isActive) {
          setLoadState("error");
        }
      }
    }

    void load();

    return () => {
      isActive = false;
    };
  }, [permissionService, settingsService, storageSummaryService]);

  async function persistSettings(patch: Partial<UserSettings>) {
    const nextSettings = await settingsService.updateSettings(patch);

    setSettings(nextSettings);
    setBpmDraft(String(nextSettings.defaultBpm));
    setSaveMessage("Settings saved locally.");
  }

  async function commitBpmDraft() {
    await persistSettings({ defaultBpm: Number(bpmDraft) });
  }

  async function resetSettings() {
    const nextSettings = await settingsService.resetToDefaults();

    setSettings(nextSettings);
    setBpmDraft(String(nextSettings.defaultBpm));
    setSaveMessage("Settings reset to defaults.");
  }

  function cancelCleanup() {
    setIsConfirmingCleanup(false);
    setCleanupError(null);
    setCleanupMessage("Cleanup canceled. Local data was not changed.");
  }

  async function confirmCleanup() {
    setIsCleaning(true);
    setCleanupError(null);
    setCleanupMessage(null);

    try {
      await cleanupService.clearAllLocalData();
      const nextSettings = await settingsService.getSettings();

      setSettings(nextSettings);
      setBpmDraft(String(nextSettings.defaultBpm));
      setIsConfirmingCleanup(false);
      setCleanupMessage("All local data was cleared and settings returned to defaults.");
      await refreshSummary();
    } catch {
      setCleanupError("Local data cleanup failed. No completion was recorded; try again before assuming data is cleared.");
    } finally {
      setIsCleaning(false);
    }
  }

  if (loadState === "error") {
    return (
      <section className="mx-auto w-full max-w-5xl">
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
              Settings could not load from local app storage.
            </p>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section aria-labelledby="settings-title" className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <header className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5 shadow-soft md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Settings
          </p>
          <h1 id="settings-title" className="text-2xl font-semibold tracking-normal sm:text-3xl">
            Settings
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Defaults and practice data stay in this browser. v0 does not include account controls, cloud sync,
            themes, import/export, or selective cleanup.
          </p>
        </div>
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Settings2 className="h-7 w-7" aria-hidden="true" />
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.72fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Practice Defaults</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <label className="grid gap-2 text-sm font-medium">
                Default BPM
                <input
                  data-testid="settings-default-bpm"
                  value={bpmDraft}
                  inputMode="numeric"
                  onChange={(event) => setBpmDraft(event.target.value)}
                  onBlur={() => void commitBpmDraft()}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.currentTarget.blur();
                    }
                  }}
                  className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium">
                  Default time signature
                  <select
                    data-testid="settings-time-signature"
                    value={settings.defaultTimeSignature}
                    onChange={(event) => void persistSettings({ defaultTimeSignature: event.target.value as UserSettings["defaultTimeSignature"] })}
                    className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                  >
                    {SETTINGS_TIME_SIGNATURES.map((timeSignature) => (
                      <option key={timeSignature} value={timeSignature}>
                        {timeSignature}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 text-sm font-medium">
                  Default subdivision
                  <select
                    data-testid="settings-subdivision"
                    value={settings.defaultSubdivision}
                    onChange={(event) => void persistSettings({ defaultSubdivision: event.target.value as UserSettings["defaultSubdivision"] })}
                    className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                  >
                    {SETTINGS_SUBDIVISIONS.map((subdivision) => (
                      <option key={subdivision} value={subdivision}>
                        {subdivisionLabels[subdivision]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="grid gap-2 text-sm font-medium">
                <span className="flex items-center justify-between gap-3">
                  <span>Metronome volume</span>
                  <span data-testid="settings-metronome-volume">{settings.metronomeVolume}</span>
                </span>
                <input
                  aria-label="Metronome volume"
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={settings.metronomeVolume}
                  onChange={(event) => void persistSettings({ metronomeVolume: Number(event.target.value) })}
                  className="w-full accent-primary"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium">
                <span className="flex items-center justify-between gap-3">
                  <span>Reference default volume</span>
                  <span data-testid="settings-reference-volume">{settings.referenceDefaultVolume}</span>
                </span>
                <input
                  aria-label="Reference default volume"
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={settings.referenceDefaultVolume}
                  onChange={(event) => void persistSettings({ referenceDefaultVolume: Number(event.target.value) })}
                  className="w-full accent-primary"
                />
              </label>

              <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p role="status" className="flex min-h-10 items-center gap-2 text-sm text-muted-foreground">
                  <Save className="h-4 w-4" aria-hidden="true" />
                  {loadState === "loading" ? "Loading settings..." : saveMessage}
                </p>
                <Button type="button" variant="secondary" onClick={() => void resetSettings()}>
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  Reset defaults
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Microphone</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                data-testid="settings-microphone-status"
                className={cn("flex items-start gap-3 rounded-md border px-3 py-3 text-sm", getPermissionTone(permissionStatus))}
              >
                <Mic className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{permissionLabels[permissionStatus]}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Storage Estimate</CardTitle>
            </CardHeader>
            <CardContent>
              <p data-testid="settings-storage-estimate" className="flex items-start gap-3 rounded-md border border-border bg-muted px-3 py-3 text-sm text-muted-foreground">
                <Database className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {getStorageEstimateLabel(summary)}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Local Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-5">
            <p className="max-w-4xl text-sm leading-6 text-muted-foreground">
              Imported sheets, recordings, references, markers, sessions, history, and settings are stored locally
              in this browser. Clearing local data removes saved practice data from this device and restores default
              practice settings.
            </p>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <CountTile label="Sheets" value={summary.counts.sheets} testId="settings-count-sheets" />
              <CountTile label="Recordings" value={summary.counts.recordings} testId="settings-count-recordings" />
              <CountTile label="References" value={summary.counts.references} testId="settings-count-references" />
              <CountTile label="Error markers" value={summary.counts.errorMarkers} testId="settings-count-markers" />
              <CountTile label="Sessions" value={summary.counts.practiceSessions} testId="settings-count-sessions" />
            </div>

            <div className="rounded-md border border-border bg-muted px-3 py-3">
              <p className="text-sm font-medium">Clear All Local Data removes:</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{cleanupPlan.join(", ")}.</p>
            </div>

            {cleanupError ? (
              <p
                role="alert"
                data-testid="settings-cleanup-error"
                className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {cleanupError}
              </p>
            ) : null}

            {cleanupMessage ? (
              <p role="status" className="rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
                {cleanupMessage}
              </p>
            ) : null}

            {isConfirmingCleanup ? (
              <div className="grid gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-950">
                <p className="font-semibold">Confirm local data cleanup</p>
                <p className="leading-6">
                  This clears every v0 local data type and resets practice defaults. This action cannot be undone.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button type="button" variant="secondary" onClick={cancelCleanup} disabled={isCleaning}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={() => void confirmCleanup()} disabled={isCleaning}>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    {isCleaning ? "Clearing..." : "Confirm clear local data"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-end">
                <Button type="button" onClick={() => setIsConfirmingCleanup(true)}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Clear All Local Data
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function CountTile({ label, value, testId }: { label: string; value: number; testId: string }) {
  return (
    <div className="min-h-24 rounded-md border border-border bg-background p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p data-testid={testId} className="mt-3 text-2xl font-semibold tracking-normal">
        {value}
      </p>
    </div>
  );
}

