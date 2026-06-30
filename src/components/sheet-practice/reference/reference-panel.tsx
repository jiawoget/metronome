"use client";

import {
  ExternalLink,
  FileAudio,
  Link2,
  Pause,
  Play,
  Search,
  Video
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  clampReferenceVolume,
  type BilibiliSearchResult,
  type LocalAudioReference,
  type SheetReference
} from "@/domain/reference";
import { browserPracticeSessionService } from "@/infrastructure/db/browser-practice-session-service";
import { BrowserLocalReferenceAudioPlayer } from "@/infrastructure/reference/local-reference-audio-player";
import { browserReferenceService } from "@/infrastructure/reference/browser-reference-service";
import type { PracticeSessionService } from "@/services/practice-session";
import type { ReferenceService } from "@/services/reference";
import { Button } from "@/components/ui/button";

type ReferencePanelProps = {
  sheetId: string;
  referenceService?: ReferenceService;
  sessionService?: Pick<
    PracticeSessionService,
    "ensureSheetSession" | "captureSessionEvent"
  >;
  createAudioPlayer?: () => BrowserLocalReferenceAudioPlayer;
  onPlaybackTimestampChange?: (timestampMs: number | null) => void;
};

type PlaybackState = {
  referenceId: string | null;
  state: "idle" | "playing" | "paused" | "error";
  currentTime: number;
  volume: number;
  message: string | null;
};

function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.round(ms / 1_000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function getReferenceSummary(reference: SheetReference | null) {
  if (!reference) {
    return "No reference saved for this sheet.";
  }

  if (reference.kind === "local-audio") {
    return `${reference.fileName} · ${formatDuration(reference.durationMs)}`;
  }

  return [reference.bvid, reference.durationLabel, reference.author]
    .filter(Boolean)
    .join(" · ");
}

function createDefaultAudioPlayer() {
  return new BrowserLocalReferenceAudioPlayer();
}

export function ReferencePanel({
  sheetId,
  referenceService = browserReferenceService,
  sessionService = browserPracticeSessionService,
  createAudioPlayer = createDefaultAudioPlayer,
  onPlaybackTimestampChange
}: ReferencePanelProps) {
  const audioPlayer = useMemo(() => createAudioPlayer(), [createAudioPlayer]);
  const [references, setReferences] = useState<SheetReference[]>([]);
  const [activeReference, setActiveReference] = useState<SheetReference | null>(
    null
  );
  const [localTitle, setLocalTitle] = useState("");
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [bilibiliUrl, setBilibiliUrl] = useState("");
  const [bilibiliTitle, setBilibiliTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<BilibiliSearchResult[]>(
    []
  );
  const [selectedResult, setSelectedResult] =
    useState<BilibiliSearchResult | null>(null);
  const [fallbackSearchUrl, setFallbackSearchUrl] = useState<string | null>(
    null
  );
  const [isSearching, setIsSearching] = useState(false);
  const [message, setMessage] = useState(
    "References are saved locally for this sheet."
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    referenceId: null,
    state: "idle",
    currentTime: 0,
    volume: 1,
    message: null
  });
  const activeLocalReferenceIdRef = useRef<string | null>(null);
  const preparedLocalReferenceSessionIdRef = useRef<string | null>(null);
  const playingLocalReferenceRef = useRef<{
    referenceId: string;
    sessionId: string;
  } | null>(null);
  const activeLocalReferenceId =
    activeReference?.kind === "local-audio" ? activeReference.id : null;

  const refresh = useCallback(async () => {
    const nextReferences = await referenceService.listReferences(sheetId);
    const nextActive = await referenceService.getActiveReference(sheetId);

    setReferences(nextReferences);
    setActiveReference(nextActive);
  }, [referenceService, sheetId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refresh();
    }, 0);
    const unsubscribe = referenceService.subscribe(() => {
      void refresh();
    });

    return () => {
      window.clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [referenceService, refresh]);

  useEffect(() => {
    activeLocalReferenceIdRef.current = activeLocalReferenceId;
    onPlaybackTimestampChange?.(null);
    const resetPlaybackStateTimeoutId = window.setTimeout(() => {
      setPlaybackState((current) => ({
        ...current,
        referenceId: activeLocalReferenceId,
        state: "idle",
        currentTime: 0,
        message: null
      }));
    }, 0);

    if (activeReference?.kind !== "local-audio") {
      audioPlayer.dispose();
      return () => {
        window.clearTimeout(resetPlaybackStateTimeoutId);
      };
    }

    let active = true;
    const missingArtifactMessage =
      "Local audio artifact is missing. Add the file again.";

    void referenceService
      .getLocalAudioArtifact(activeReference.id)
      .then((artifact) => {
        if (!active) {
          return;
        }

        if (artifact) {
          audioPlayer.load(activeReference, artifact);
          setPlaybackState((current) => ({
            ...current,
            referenceId: activeReference.id,
            state: "paused",
            currentTime: 0,
            message: null
          }));
        } else {
          audioPlayer.dispose();
          onPlaybackTimestampChange?.(null);
          setPlaybackState((current) => ({
            ...current,
            referenceId: activeReference.id,
            state: "error",
            currentTime: 0,
            message: missingArtifactMessage
          }));
          setErrorMessage(missingArtifactMessage);
        }
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "Local audio artifact could not be loaded.";

        audioPlayer.dispose();
        onPlaybackTimestampChange?.(null);
        setPlaybackState((current) => ({
          ...current,
          referenceId: activeReference.id,
          state: "error",
          currentTime: 0,
          message
        }));
        setErrorMessage(message);
      });

    return () => {
      active = false;
      window.clearTimeout(resetPlaybackStateTimeoutId);
      onPlaybackTimestampChange?.(null);
    };
  }, [activeLocalReferenceId, activeReference, audioPlayer, onPlaybackTimestampChange, referenceService]);

  useEffect(() => {
    const handleAudioState = (event: Event) => {
      const detail = (event as CustomEvent<PlaybackState>).detail;
      const activeLocalReferenceId = activeLocalReferenceIdRef.current;
      const playingLocalReference = playingLocalReferenceRef.current;
      const isPreviousPlayingReference =
        !!detail.referenceId &&
        detail.referenceId === playingLocalReference?.referenceId;
      const isStopState =
        detail.state === "paused" ||
        detail.state === "idle" ||
        detail.state === "error";

      if (
        detail.referenceId &&
        detail.referenceId !== activeLocalReferenceId &&
        !isPreviousPlayingReference
      ) {
        return;
      }

      if (
        detail.state === "playing" &&
        detail.referenceId &&
        detail.referenceId === activeLocalReferenceId &&
        playingLocalReference?.referenceId !== detail.referenceId
      ) {
        const sessionId = preparedLocalReferenceSessionIdRef.current;

        if (sessionId) {
          playingLocalReferenceRef.current = {
            referenceId: detail.referenceId,
            sessionId
          };
          void sessionService.captureSessionEvent({
            sessionId,
            kind: "reference_started",
            referenceId: detail.referenceId
          });
        }
      } else if (
        isStopState &&
        playingLocalReference &&
        (!detail.referenceId ||
          detail.referenceId === playingLocalReference.referenceId)
      ) {
        playingLocalReferenceRef.current = null;
        preparedLocalReferenceSessionIdRef.current = null;
        void sessionService.captureSessionEvent({
          sessionId: playingLocalReference.sessionId,
          kind: "reference_stopped",
          referenceId: playingLocalReference.referenceId
        });
      }

      if (detail.referenceId && detail.referenceId !== activeLocalReferenceId) {
        return;
      }

      setPlaybackState({
        referenceId: detail.referenceId,
        state: detail.state,
        currentTime: detail.currentTime,
        volume: detail.volume,
        message: detail.message
      });
      onPlaybackTimestampChange?.(
        detail.referenceId &&
          detail.referenceId === activeLocalReferenceId &&
          Number.isFinite(detail.currentTime)
          ? Math.max(0, Math.round(detail.currentTime * 1_000))
          : null
      );
      if (detail.message) {
        setErrorMessage(detail.message);
      }
    };

    window.addEventListener("reference-audio:state-change", handleAudioState);

    return () => {
      window.removeEventListener(
        "reference-audio:state-change",
        handleAudioState
      );
      audioPlayer.dispose();
      onPlaybackTimestampChange?.(null);
    };
  }, [audioPlayer, onPlaybackTimestampChange, sessionService]);

  async function saveLocalReference() {
    setErrorMessage(null);

    if (!localFile) {
      setErrorMessage("Choose a local audio file first.");
      return;
    }

    const result = await referenceService.addLocalAudioReference({
      sheetId,
      file: localFile,
      title: localTitle
    });

    if (!result.ok) {
      setErrorMessage(result.message);
      return;
    }

    setLocalTitle("");
    setLocalFile(null);
    setMessage("Local audio reference saved.");
    await refresh();
  }

  async function playLocalReference() {
    if (activeReference?.kind !== "local-audio") {
      return;
    }

    setErrorMessage(null);
    const session = await sessionService.ensureSheetSession({
      sheetId,
      trigger: "reference"
    });
    preparedLocalReferenceSessionIdRef.current = session?.id ?? null;
    await audioPlayer.play();
    setMessage("Local reference playing.");
  }

  function pauseLocalReference() {
    audioPlayer.pause();
    setMessage("Local reference paused.");
  }

  function changeVolume(value: string) {
    const volume = audioPlayer.setVolume(clampReferenceVolume(Number(value)));

    setPlaybackState((current) => ({
      ...current,
      volume
    }));
  }

  async function searchBilibili() {
    setErrorMessage(null);
    setIsSearching(true);
    setSelectedResult(null);
    setFallbackSearchUrl(null);

    const result = await referenceService.searchBilibili(searchQuery);

    setIsSearching(false);

    if (!result.ok) {
      setSearchResults([]);
      setErrorMessage(result.message);
      setFallbackSearchUrl(
        searchQuery.trim().length >= 2
          ? `https://search.bilibili.com/all?keyword=${encodeURIComponent(searchQuery.trim())}`
          : null
      );
      return;
    }

    setSearchResults(result.value);
    setFallbackSearchUrl(null);
    setMessage(
      `Bilibili search returned ${result.value.length} result${result.value.length === 1 ? "" : "s"}.`
    );
  }

  async function saveSelectedBilibiliResult() {
    setErrorMessage(null);

    if (!selectedResult) {
      setErrorMessage("Select a Bilibili search result first.");
      return;
    }

    const result = await referenceService.saveBilibiliSearchResultReference({
      sheetId,
      result: selectedResult
    });

    if (!result.ok) {
      setErrorMessage(result.message);
      return;
    }

    await sessionService.ensureSheetSession({
      sheetId,
      trigger: "reference"
    });
    setMessage("Bilibili search result saved as the active reference.");
    await refresh();
  }

  async function saveBilibiliUrlReference() {
    setErrorMessage(null);

    const result = await referenceService.saveBilibiliUrlReference({
      sheetId,
      url: bilibiliUrl,
      title: bilibiliTitle
    });

    if (!result.ok) {
      setErrorMessage(result.message);
      return;
    }

    await sessionService.ensureSheetSession({
      sheetId,
      trigger: "reference"
    });
    setBilibiliUrl("");
    setBilibiliTitle("");
    setMessage("Bilibili URL saved as the active reference.");
    await refresh();
  }

  const localReference =
    activeReference?.kind === "local-audio"
      ? (activeReference as LocalAudioReference)
      : null;

  return (
    <aside
      aria-labelledby="reference-panel-title"
      data-testid="reference-panel"
      className="border-border bg-card shadow-soft flex min-h-0 flex-col overflow-hidden rounded-lg border"
    >
      <div className="border-border border-b px-4 py-3">
        <p className="text-muted-foreground text-xs font-semibold tracking-[0.08em] uppercase">
          06 Reference System
        </p>
        <h2
          id="reference-panel-title"
          className="mt-1 text-lg font-semibold tracking-normal"
        >
          References
        </h2>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4">
        <section
          aria-label="Active reference"
          className="border-border bg-muted rounded-md border p-3"
        >
          <div className="flex items-start gap-3">
            <span className="bg-primary/15 text-primary mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md">
              {activeReference?.kind === "bilibili" ? (
                <Video className="h-4 w-4" aria-hidden="true" />
              ) : (
                <FileAudio className="h-4 w-4" aria-hidden="true" />
              )}
            </span>
            <div className="min-w-0">
              <p
                data-testid="active-reference-title"
                className="truncate font-medium"
              >
                {activeReference?.title ?? "No active reference"}
              </p>
              <p
                data-testid="active-reference-summary"
                className="text-muted-foreground mt-1 text-sm leading-6"
              >
                {getReferenceSummary(activeReference)}
              </p>
            </div>
          </div>

          {localReference ? (
            <div className="mt-3 grid gap-3">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  onClick={() => void playLocalReference()}
                  disabled={playbackState.state === "playing"}
                  aria-label="Play local reference"
                >
                  <Play className="h-4 w-4" aria-hidden="true" />
                  Play
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={pauseLocalReference}
                  disabled={playbackState.state !== "playing"}
                  aria-label="Pause local reference"
                >
                  <Pause className="h-4 w-4" aria-hidden="true" />
                  Pause
                </Button>
              </div>
              <label className="grid gap-2 text-sm font-medium">
                Reference volume
                <input
                  aria-label="Reference volume"
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={playbackState.volume}
                  onChange={(event) => changeVolume(event.target.value)}
                  className="accent-primary w-full"
                />
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <StatusPill
                  label="State"
                  value={playbackState.state}
                  testId="reference-playback-state"
                />
                <StatusPill
                  label="Time"
                  value={playbackState.currentTime.toFixed(2)}
                  testId="reference-current-time"
                />
                <StatusPill
                  label="Volume"
                  value={Math.round(playbackState.volume * 100).toString()}
                  testId="reference-volume-state"
                />
              </div>
            </div>
          ) : null}

          {activeReference?.kind === "bilibili" ? (
            <div className="border-border bg-background mt-3 rounded-md border p-3">
              <p className="text-muted-foreground text-sm leading-6">
                Bilibili references open in the original player to keep practice
                playback isolated from third-party page scripts.
              </p>
              <Button asChild variant="secondary" className="mt-3 w-full">
                <a href={activeReference.url} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  Open Bilibili reference
                </a>
              </Button>
            </div>
          ) : null}
        </section>

        <section
          aria-labelledby="local-reference-title"
          className="border-border grid gap-3 rounded-md border p-3"
        >
          <h3
            id="local-reference-title"
            className="text-sm font-semibold tracking-normal"
          >
            Local Audio
          </h3>
          <label className="grid gap-1 text-sm font-medium">
            Local title
            <input
              value={localTitle}
              onChange={(event) => setLocalTitle(event.target.value)}
              className="border-border bg-background focus-visible:ring-ring h-10 rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
              placeholder="Optional title"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Local audio file
            <input
              aria-label="Local audio file"
              type="file"
              accept="audio/*,.mp3,.wav,.ogg,.aac,.m4a,.webm"
              onChange={(event) =>
                setLocalFile(event.target.files?.[0] ?? null)
              }
              className="border-border bg-background file:bg-muted min-h-10 rounded-md border px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:px-3 file:py-1 file:text-sm file:font-medium"
            />
          </label>
          <Button type="button" onClick={() => void saveLocalReference()}>
            <FileAudio className="h-4 w-4" aria-hidden="true" />
            Save local reference
          </Button>
        </section>

        <section
          aria-labelledby="bilibili-search-title"
          className="border-border grid gap-3 rounded-md border p-3"
        >
          <h3
            id="bilibili-search-title"
            className="text-sm font-semibold tracking-normal"
          >
            Bilibili Search
          </h3>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <label className="sr-only" htmlFor="bilibili-search-input">
              Search Bilibili
            </label>
            <input
              id="bilibili-search-input"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="border-border bg-background focus-visible:ring-ring h-10 min-w-0 rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
              placeholder="Search Bilibili"
            />
            <Button
              type="button"
              size="icon"
              aria-label="Search Bilibili"
              onClick={() => void searchBilibili()}
            >
              <Search className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
          {isSearching ? (
            <p className="text-muted-foreground text-sm">Searching...</p>
          ) : null}
          {fallbackSearchUrl ? (
            <div
              data-testid="bilibili-search-fallback"
              className="border-border bg-muted rounded-md border px-3 py-3 text-sm"
            >
              <p className="font-medium">
                Live API search did not return usable results.
              </p>
              <p className="text-muted-foreground mt-1 leading-6">
                Use Bilibili web search in a new tab, then paste a selected
                video URL below.
              </p>
              <Button asChild variant="secondary" className="mt-3 w-full">
                <a href={fallbackSearchUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  Open Bilibili web search
                </a>
              </Button>
            </div>
          ) : null}
          {searchResults.length > 0 ? (
            <div className="grid gap-2" data-testid="bilibili-search-results">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  type="button"
                  aria-pressed={selectedResult?.id === result.id}
                  onClick={() => setSelectedResult(result)}
                  className="border-border bg-background hover:bg-muted aria-pressed:border-primary aria-pressed:bg-primary/10 rounded-md border p-3 text-left text-sm transition-colors"
                >
                  <span className="block truncate font-medium">
                    {result.title}
                  </span>
                  <span className="text-muted-foreground mt-1 block text-xs">
                    {[result.bvid, result.durationLabel, result.author]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            onClick={() => void saveSelectedBilibiliResult()}
          >
            <Video className="h-4 w-4" aria-hidden="true" />
            Save selected result
          </Button>
        </section>

        <section
          aria-labelledby="bilibili-url-title"
          className="border-border grid gap-3 rounded-md border p-3"
        >
          <h3
            id="bilibili-url-title"
            className="text-sm font-semibold tracking-normal"
          >
            Bilibili URL
          </h3>
          <label className="grid gap-1 text-sm font-medium">
            URL title
            <input
              value={bilibiliTitle}
              onChange={(event) => setBilibiliTitle(event.target.value)}
              className="border-border bg-background focus-visible:ring-ring h-10 rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
              placeholder="Optional title"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Bilibili URL
            <input
              aria-label="Bilibili URL"
              value={bilibiliUrl}
              onChange={(event) => setBilibiliUrl(event.target.value)}
              className="border-border bg-background focus-visible:ring-ring h-10 rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
              placeholder="https://www.bilibili.com/video/BV..."
            />
          </label>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void saveBilibiliUrlReference()}
          >
            <Link2 className="h-4 w-4" aria-hidden="true" />
            Save Bilibili URL
          </Button>
        </section>

        <div
          aria-live="polite"
          className="border-border bg-muted rounded-md border px-3 py-2 text-sm"
        >
          <p className="font-medium">{message}</p>
          <p
            data-testid="reference-count"
            className="text-muted-foreground mt-1 text-xs"
          >
            Saved references {references.length}
          </p>
          {errorMessage ? (
            <p role="alert" className="text-destructive mt-2 font-medium">
              {errorMessage}
            </p>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

function StatusPill({
  label,
  value,
  testId
}: {
  label: string;
  value: string;
  testId: string;
}) {
  return (
    <div className="border-border bg-background rounded-md border px-2 py-1">
      <p className="text-muted-foreground text-[0.7rem] font-medium">{label}</p>
      <p data-testid={testId} className="mt-0.5 truncate font-semibold">
        {value}
      </p>
    </div>
  );
}
