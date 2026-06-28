import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ReferencePanel } from "@/components/sheet-practice/reference/reference-panel";
import type {
  BilibiliReference,
  LocalAudioReference,
  LocalAudioReferenceArtifact,
  SheetReference
} from "@/domain/reference";
import type { BrowserLocalReferenceAudioPlayer } from "@/infrastructure/reference/local-reference-audio-player";
import type { ReferenceService } from "@/services/reference";

const localReference: LocalAudioReference = {
  id: "reference-alpha",
  sheetId: "sheet-alpha",
  kind: "local-audio",
  title: "Alpha reference",
  fileName: "alpha.wav",
  mimeType: "audio/wav",
  sizeBytes: 3,
  durationMs: 3_000,
  createdAt: "2026-06-21T12:00:00.000Z",
  updatedAt: "2026-06-21T12:00:00.000Z",
  isActive: true
};

const localArtifact: LocalAudioReferenceArtifact = {
  referenceId: localReference.id,
  sheetId: localReference.sheetId,
  blob: new Blob(["wav"], { type: "audio/wav" }),
  mimeType: "audio/wav",
  sizeBytes: 3,
  createdAt: "2026-06-21T12:00:00.000Z"
};

const secondLocalReference: LocalAudioReference = {
  ...localReference,
  id: "reference-bravo",
  title: "Bravo reference",
  fileName: "bravo.wav",
  updatedAt: "2026-06-21T12:01:00.000Z"
};

const bilibiliReference: BilibiliReference = {
  id: "reference-bilibili",
  sheetId: "sheet-alpha",
  kind: "bilibili",
  title: "Bilibili reference",
  url: "https://www.bilibili.com/video/BV1234567890",
  bvid: "BV1234567890",
  author: null,
  durationLabel: null,
  thumbnailUrl: null,
  embedUrl: null,
  createdAt: "2026-06-21T12:00:00.000Z",
  updatedAt: "2026-06-21T12:00:00.000Z",
  isActive: true
};

function createReferenceService({
  activeReference = localReference,
  references = [localReference],
  artifacts = new Map([[localReference.id, localArtifact]])
}: {
  activeReference?: SheetReference | null;
  references?: SheetReference[];
  artifacts?: Map<string, LocalAudioReferenceArtifact | null>;
} = {}) {
  let currentActiveReference = activeReference;
  let currentReferences = references;
  const listeners = new Set<() => void>();
  const service: ReferenceService = {
    listReferences: vi.fn(async () => currentReferences),
    countAllReferences: vi.fn(async () => 1),
    getActiveReference: vi.fn(async () => currentActiveReference),
    getLocalAudioArtifact: vi.fn(async (referenceId: string) => artifacts.get(referenceId) ?? null),
    addLocalAudioReference: vi.fn(),
    saveBilibiliUrlReference: vi.fn(),
    saveBilibiliSearchResultReference: vi.fn(),
    searchBilibili: vi.fn(),
    subscribe: vi.fn((listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    })
  };

  return {
    service,
    setActiveReference(nextActiveReference: SheetReference | null, nextReferences = currentReferences) {
      currentActiveReference = nextActiveReference;
      currentReferences = nextReferences;
      for (const listener of listeners) {
        listener();
      }
    }
  };
}

function createAudioPlayer(): BrowserLocalReferenceAudioPlayer {
  return {
    load: vi.fn(),
    play: vi.fn(async () => undefined),
    pause: vi.fn(),
    setVolume: vi.fn((value: number) => value),
    getSnapshot: vi.fn(() => ({
      referenceId: localReference.id,
      state: "paused",
      currentTime: 0,
      volume: 1,
      duration: 3,
      message: null
    })),
    dispose: vi.fn()
  } as unknown as BrowserLocalReferenceAudioPlayer;
}

function dispatchReferenceAudioState(referenceId: string | null, currentTime: number) {
  window.dispatchEvent(
    new CustomEvent("reference-audio:state-change", {
      detail: {
        referenceId,
        state: "paused",
        currentTime,
        volume: 1,
        duration: 3,
        message: null
      }
    })
  );
}

describe("ReferencePanel playback timestamp", () => {
  it("reports local audio playback time as milliseconds for measure-grid calibration", async () => {
    const onPlaybackTimestampChange = vi.fn();
    const { service } = createReferenceService();

    render(
      <ReferencePanel
        sheetId="sheet-alpha"
        referenceService={service}
        sessionService={{ ensureSheetSession: vi.fn(async () => null) }}
        createAudioPlayer={createAudioPlayer}
        onPlaybackTimestampChange={onPlaybackTimestampChange}
      />
    );

    await expect(screen.findByText("Alpha reference")).resolves.toBeVisible();
    await waitFor(() => {
      expect(service.getLocalAudioArtifact).toHaveBeenCalledWith(localReference.id);
    });

    dispatchReferenceAudioState(localReference.id, 1.234);

    await waitFor(() => {
      expect(onPlaybackTimestampChange).toHaveBeenCalledWith(1_234);
    });
  });

  it("clears stale local timestamps when switching to a local reference with a missing artifact", async () => {
    const onPlaybackTimestampChange = vi.fn();
    const { service, setActiveReference } = createReferenceService();

    render(
      <ReferencePanel
        sheetId="sheet-alpha"
        referenceService={service}
        sessionService={{ ensureSheetSession: vi.fn(async () => null) }}
        createAudioPlayer={createAudioPlayer}
        onPlaybackTimestampChange={onPlaybackTimestampChange}
      />
    );

    await expect(screen.findByText("Alpha reference")).resolves.toBeVisible();
    await waitFor(() => {
      expect(service.getLocalAudioArtifact).toHaveBeenCalledWith(localReference.id);
    });
    dispatchReferenceAudioState(localReference.id, 1.234);

    await waitFor(() => {
      expect(onPlaybackTimestampChange).toHaveBeenCalledWith(1_234);
    });
    onPlaybackTimestampChange.mockClear();

    setActiveReference(secondLocalReference, [secondLocalReference]);

    await expect(screen.findByText("Bravo reference")).resolves.toBeVisible();
    await waitFor(() => {
      expect(onPlaybackTimestampChange).toHaveBeenCalledWith(null);
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Local audio artifact is missing. Add the file again."
    );

    onPlaybackTimestampChange.mockClear();
    dispatchReferenceAudioState(localReference.id, 2.345);
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    expect(onPlaybackTimestampChange).not.toHaveBeenCalledWith(2_345);
  });

  it("clears local timestamps when the active reference becomes non-local", async () => {
    const onPlaybackTimestampChange = vi.fn();
    const { service, setActiveReference } = createReferenceService();

    render(
      <ReferencePanel
        sheetId="sheet-alpha"
        referenceService={service}
        sessionService={{ ensureSheetSession: vi.fn(async () => null) }}
        createAudioPlayer={createAudioPlayer}
        onPlaybackTimestampChange={onPlaybackTimestampChange}
      />
    );

    await expect(screen.findByText("Alpha reference")).resolves.toBeVisible();
    await waitFor(() => {
      expect(service.getLocalAudioArtifact).toHaveBeenCalledWith(localReference.id);
    });
    dispatchReferenceAudioState(localReference.id, 1.234);

    await waitFor(() => {
      expect(onPlaybackTimestampChange).toHaveBeenCalledWith(1_234);
    });
    onPlaybackTimestampChange.mockClear();

    setActiveReference(bilibiliReference, [bilibiliReference]);

    await expect(screen.findByText("Bilibili reference")).resolves.toBeVisible();
    await waitFor(() => {
      expect(onPlaybackTimestampChange).toHaveBeenCalledWith(null);
    });

    onPlaybackTimestampChange.mockClear();
    dispatchReferenceAudioState(localReference.id, 2.345);
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    expect(onPlaybackTimestampChange).not.toHaveBeenCalledWith(2_345);
  });
});
