import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ReferencePanel } from "@/components/sheet-practice/reference/reference-panel";
import type { PracticeSession } from "@/domain/practice";
import type {
  BilibiliReference,
  BilibiliSearchResult,
  LocalAudioReference,
  LocalAudioReferenceArtifact,
  SheetReference
} from "@/domain/reference";
import type { BrowserLocalReferenceAudioPlayer } from "@/infrastructure/reference/local-reference-audio-player";
import type { PracticeSessionEventCaptureInput } from "@/services/practice-session";
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

const sheetSession: PracticeSession = {
  id: "session-alpha",
  sourceType: "sheet",
  sheetId: "sheet-alpha",
  startedAt: "2026-06-21T12:00:00.000Z",
  endedAt: null,
  durationMs: 0,
  bpm: 96,
  timeSignature: "4/4",
  recordingCount: 0,
  latestRecordingId: null,
  updatedAt: "2026-06-21T12:00:00.000Z"
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

const bilibiliSearchResult: BilibiliSearchResult = {
  id: "bilibili-result-alpha",
  title: "Alpha Bilibili result",
  url: "https://www.bilibili.com/video/BV1234567890",
  bvid: "BV1234567890",
  author: "Uploader",
  durationLabel: "3:21",
  thumbnailUrl: null,
  embedUrl: null
};

function expectNoCaptureKind(
  captureSessionEvent: { mock: { calls: unknown[][] } },
  kind: string
) {
  expect(
    captureSessionEvent.mock.calls.filter(
      ([input]) =>
        typeof input === "object" &&
        input !== null &&
        "kind" in input &&
        input.kind === kind
    )
  ).toEqual([]);
}

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

function createSessionService(session: PracticeSession | null = sheetSession) {
  return {
    ensureSheetSession: vi.fn(async () => session),
    captureSessionEvent: vi.fn(async (input: PracticeSessionEventCaptureInput) => {
      void input;

      return null;
    })
  };
}

function dispatchReferenceAudioState(
  referenceId: string | null,
  currentTime: number,
  state: "idle" | "playing" | "paused" | "error" = "paused"
) {
  window.dispatchEvent(
    new CustomEvent("reference-audio:state-change", {
      detail: {
        referenceId,
        state,
        currentTime,
        volume: 1,
        duration: 3,
        message: null
      }
    })
  );
}

describe("ReferencePanel playback timestamp", () => {
  it("captures local reference playback started once and stopped from audio state transitions", async () => {
    const user = userEvent.setup();
    const { service } = createReferenceService();
    const sessionService = createSessionService();

    render(
      <ReferencePanel
        sheetId="sheet-alpha"
        referenceService={service}
        sessionService={sessionService}
        createAudioPlayer={createAudioPlayer}
      />
    );

    await expect(screen.findByText("Alpha reference")).resolves.toBeVisible();
    await waitFor(() => {
      expect(service.getLocalAudioArtifact).toHaveBeenCalledWith(localReference.id);
    });

    await user.click(screen.getByRole("button", { name: "Play local reference" }));
    dispatchReferenceAudioState(localReference.id, 0.1, "playing");

    await waitFor(() => {
      expect(sessionService.captureSessionEvent).toHaveBeenCalledWith({
        sessionId: "session-alpha",
        kind: "reference_started",
        referenceId: "reference-alpha"
      });
    });

    dispatchReferenceAudioState(localReference.id, 0.2, "playing");
    expect(
      sessionService.captureSessionEvent.mock.calls.filter(
        ([input]) => input.kind === "reference_started"
      )
    ).toHaveLength(1);

    dispatchReferenceAudioState(localReference.id, 0.3, "paused");

    await waitFor(() => {
      expect(sessionService.captureSessionEvent).toHaveBeenCalledWith({
        sessionId: "session-alpha",
        kind: "reference_stopped",
        referenceId: "reference-alpha"
      });
    });
  });

  it("captures reference_stopped with the previous playing reference id after selection changes", async () => {
    const user = userEvent.setup();
    const { service, setActiveReference } = createReferenceService({
      references: [localReference, secondLocalReference]
    });
    const sessionService = createSessionService();

    render(
      <ReferencePanel
        sheetId="sheet-alpha"
        referenceService={service}
        sessionService={sessionService}
        createAudioPlayer={createAudioPlayer}
      />
    );

    await expect(screen.findByText("Alpha reference")).resolves.toBeVisible();
    await waitFor(() => {
      expect(service.getLocalAudioArtifact).toHaveBeenCalledWith(localReference.id);
    });

    await user.click(screen.getByRole("button", { name: "Play local reference" }));
    dispatchReferenceAudioState(localReference.id, 0.1, "playing");

    await waitFor(() => {
      expect(sessionService.captureSessionEvent).toHaveBeenCalledWith({
        sessionId: "session-alpha",
        kind: "reference_started",
        referenceId: "reference-alpha"
      });
    });

    setActiveReference(secondLocalReference, [secondLocalReference]);
    await expect(screen.findByText("Bravo reference")).resolves.toBeVisible();

    dispatchReferenceAudioState(localReference.id, 0.2, "paused");

    await waitFor(() => {
      expect(sessionService.captureSessionEvent).toHaveBeenCalledWith({
        sessionId: "session-alpha",
        kind: "reference_stopped",
        referenceId: "reference-alpha"
      });
    });
  });

  it("does not capture playback events for Bilibili search, save, or open flows", async () => {
    const user = userEvent.setup();
    const { service, setActiveReference } = createReferenceService();
    const sessionService = createSessionService();

    vi.mocked(service.searchBilibili).mockResolvedValue({
      ok: true,
      value: [bilibiliSearchResult]
    });
    vi.mocked(service.saveBilibiliSearchResultReference).mockResolvedValue({
      ok: true,
      value: bilibiliReference
    });
    vi.mocked(service.saveBilibiliUrlReference).mockResolvedValue({
      ok: true,
      value: bilibiliReference
    });

    render(
      <ReferencePanel
        sheetId="sheet-alpha"
        referenceService={service}
        sessionService={sessionService}
        createAudioPlayer={createAudioPlayer}
      />
    );

    await expect(screen.findByText("Alpha reference")).resolves.toBeVisible();

    await user.type(screen.getByPlaceholderText("Search Bilibili"), "alpha");
    await user.click(screen.getByRole("button", { name: "Search Bilibili" }));
    await expect(screen.findByText("Alpha Bilibili result")).resolves.toBeVisible();
    expectNoCaptureKind(sessionService.captureSessionEvent, "reference_started");
    expectNoCaptureKind(sessionService.captureSessionEvent, "reference_stopped");

    await user.click(screen.getByText("Alpha Bilibili result"));
    await user.click(screen.getByRole("button", { name: "Save selected result" }));

    await waitFor(() => {
      expect(service.saveBilibiliSearchResultReference).toHaveBeenCalledWith({
        sheetId: "sheet-alpha",
        result: bilibiliSearchResult
      });
    });

    await user.type(
      screen.getByPlaceholderText("https://www.bilibili.com/video/BV..."),
      "https://www.bilibili.com/video/BV1234567890"
    );
    await user.click(screen.getByRole("button", { name: "Save Bilibili URL" }));

    await waitFor(() => {
      expect(service.saveBilibiliUrlReference).toHaveBeenCalledWith({
        sheetId: "sheet-alpha",
        url: "https://www.bilibili.com/video/BV1234567890",
        title: ""
      });
    });

    setActiveReference(bilibiliReference, [bilibiliReference]);
    await expect(screen.findByText("Bilibili reference")).resolves.toBeVisible();
    await user.click(screen.getByRole("link", { name: "Open Bilibili reference" }));

    expectNoCaptureKind(sessionService.captureSessionEvent, "reference_started");
    expectNoCaptureKind(sessionService.captureSessionEvent, "reference_stopped");
  });

  it("does not capture playback events when a local reference artifact is missing", async () => {
    const { service } = createReferenceService({
      artifacts: new Map([[localReference.id, null]])
    });
    const sessionService = createSessionService();

    render(
      <ReferencePanel
        sheetId="sheet-alpha"
        referenceService={service}
        sessionService={sessionService}
        createAudioPlayer={createAudioPlayer}
      />
    );

    await expect(screen.findByText("Alpha reference")).resolves.toBeVisible();
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Local audio artifact is missing. Add the file again."
      );
    });

    expectNoCaptureKind(sessionService.captureSessionEvent, "reference_started");
    expectNoCaptureKind(sessionService.captureSessionEvent, "reference_stopped");
  });

  it("does not capture reference_stopped for playback errors before a playing transition", async () => {
    const { service } = createReferenceService();
    const sessionService = createSessionService();

    render(
      <ReferencePanel
        sheetId="sheet-alpha"
        referenceService={service}
        sessionService={sessionService}
        createAudioPlayer={createAudioPlayer}
      />
    );

    await expect(screen.findByText("Alpha reference")).resolves.toBeVisible();
    await waitFor(() => {
      expect(service.getLocalAudioArtifact).toHaveBeenCalledWith(localReference.id);
    });

    dispatchReferenceAudioState(localReference.id, 0, "error");

    await new Promise((resolve) => window.setTimeout(resolve, 0));
    expectNoCaptureKind(sessionService.captureSessionEvent, "reference_stopped");
  });

  it("reports local audio playback time as milliseconds for measure-grid calibration", async () => {
    const onPlaybackTimestampChange = vi.fn();
    const { service } = createReferenceService();

    render(
      <ReferencePanel
        sheetId="sheet-alpha"
        referenceService={service}
        sessionService={createSessionService(null)}
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
        sessionService={createSessionService(null)}
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
        sessionService={createSessionService(null)}
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
