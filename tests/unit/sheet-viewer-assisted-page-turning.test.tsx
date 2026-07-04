import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createPracticeSegmentGridAssociation,
  type PracticeSegment
} from "@/domain/practice";
import type { SheetViewerLoadState } from "@/services/sheet-viewer";

type MockControlsProps = {
  onSelectedSegmentChange?: (segment: PracticeSegment | null) => void;
};

const viewerMocks = vi.hoisted(() => ({
  loadSheet: vi.fn(),
  loadPageThumbnails: vi.fn(),
  createArtifactObjectUrls: vi.fn(),
  revokeArtifactObjectUrls: vi.fn(),
  revokePageThumbnails: vi.fn(),
  selectedSegment: null as PracticeSegment | null
}));

vi.mock("next/dynamic", () => ({
  default: () => () => null
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

vi.mock("@/infrastructure/sheet-viewer/browser-sheet-viewer-service", () => ({
  browserSheetViewerService: {
    loadSheet: viewerMocks.loadSheet,
    loadPageThumbnails: viewerMocks.loadPageThumbnails,
    createArtifactObjectUrls: viewerMocks.createArtifactObjectUrls,
    revokeArtifactObjectUrls: viewerMocks.revokeArtifactObjectUrls,
    revokePageThumbnails: viewerMocks.revokePageThumbnails
  }
}));

vi.mock("@/components/sheet-practice/reference/reference-panel", () => ({
  ReferencePanel: () => null
}));

vi.mock("@/components/sheet-practice/controls/sheet-practice-controls", () => ({
  SheetPracticeControls: ({ onSelectedSegmentChange }: MockControlsProps) => (
    <div data-testid="mock-sheet-practice-controls">
      <button
        type="button"
        onClick={() => onSelectedSegmentChange?.(viewerMocks.selectedSegment)}
      >
        Select assisted segment
      </button>
      <button type="button" onClick={() => onSelectedSegmentChange?.(null)}>
        Clear assisted segment
      </button>
    </div>
  )
}));

import { SheetViewerExperience } from "@/components/sheet-practice/viewer/sheet-viewer-experience";

function createReadyState(pageCount = 3): SheetViewerLoadState {
  const files = Array.from({ length: pageCount }, (_, index) => ({
    name: `alpha-${index + 1}.png`,
    mimeType: "image/png",
    sizeBytes: 3,
    pageNumber: index + 1,
    blob: new Blob(["png"], { type: "image/png" }),
    width: 600,
    height: 800
  }));

  return {
    status: "ready",
    sheet: {
      id: "sheet-alpha",
      name: "Alpha",
      category: "song",
      bpm: 72,
      timeSignature: "4/4",
      kind: "image",
      pageCount,
      imageCount: pageCount,
      imageDimensions: files.map(() => ({ width: 600, height: 800 })),
      mimeTypes: ["image/png"],
      sizeBytes: 3,
      originalFileNames: files.map((file) => file.name),
      createdAt: "2026-06-21T12:00:00.000Z",
      updatedAt: "2026-06-21T12:00:00.000Z",
      lastPracticedAt: null,
      artifactStatus: {
        readable: true,
        label: "Ready"
      }
    },
    artifact: {
      sheetId: "sheet-alpha",
      kind: "image",
      files,
      createdAt: "2026-06-21T12:00:00.000Z"
    },
    pageCount,
    imageDimensions: files.map(() => ({ width: 600, height: 800 }))
  };
}

function createSegment(): PracticeSegment {
  const grid = {
    bpm: 240,
    timeSignature: "4/4",
    pickupBeats: 0,
    measureOneOffsetMs: 0
  } as const;

  return {
    id: "segment-assisted",
    sheetId: "sheet-alpha",
    name: "Assisted turn",
    range: {
      startMeasure: 1,
      endMeasure: 1
    },
    targetBpm: null,
    notes: null,
    grid: createPracticeSegmentGridAssociation(grid)
  };
}

function selectAssistedSegment() {
  fireEvent.click(screen.getByRole("button", { name: "Select assisted segment" }));
}

function enableManualSegmentPageTurn() {
  fireEvent.click(screen.getByRole("checkbox", { name: "Manual segment page turn" }));
}

describe("SheetViewerExperience manual segment page turn", () => {
  beforeEach(() => {
    viewerMocks.loadSheet.mockReset();
    viewerMocks.loadSheet.mockResolvedValue(createReadyState());
    viewerMocks.loadPageThumbnails.mockReset();
    viewerMocks.loadPageThumbnails.mockResolvedValue({
      status: "ready",
      sheetId: "sheet-alpha",
      pageCount: 3,
      thumbnails: []
    });
    viewerMocks.revokePageThumbnails.mockReset();
    viewerMocks.createArtifactObjectUrls.mockReset();
    viewerMocks.createArtifactObjectUrls.mockImplementation(
      (artifact: Extract<SheetViewerLoadState, { status: "ready" }>["artifact"]) => ({
        sheetId: artifact.sheetId,
        urls: artifact.files.map((file) => `blob:${file.name}`)
      })
    );
    viewerMocks.revokeArtifactObjectUrls.mockReset();
    viewerMocks.selectedSegment = createSegment();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the existing error UI when the initial sheet viewer load rejects", async () => {
    viewerMocks.loadSheet.mockRejectedValue(new Error("viewer unavailable"));

    render(<SheetViewerExperience sheetId="sheet-alpha" />);

    expect(
      await screen.findByRole("heading", { name: "Sheet viewer unavailable" })
    ).toBeVisible();
    expect(screen.queryByText("Loading selected sheet...")).not.toBeInTheDocument();
  });

  it("is disabled by default and advances one page after a manually armed segment timer", async () => {
    render(<SheetViewerExperience sheetId="sheet-alpha" />);

    await screen.findByText("Page 1 of 3");
    expect(screen.getByRole("checkbox", { name: "Manual segment page turn" })).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Arm manual page turn" })).toBeDisabled();

    enableManualSegmentPageTurn();
    expect(screen.getByText("Select a segment to arm a timed page turn.")).toBeVisible();
    selectAssistedSegment();
    expect(screen.getByText("Ready: 1s.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Arm manual page turn" })).toBeEnabled();

    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: "Arm manual page turn" }));
    expect(screen.getByText("Manual page turn armed.")).toBeVisible();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(999);
    });
    expect(screen.getByText("Page 1 of 3")).toBeVisible();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(screen.getByText("Page 2 of 3")).toBeVisible();
    expect(screen.getByRole("button", { name: "Arm manual page turn" })).toBeVisible();
  });

  it("cancels a pending turn on manual page jump", async () => {
    render(<SheetViewerExperience sheetId="sheet-alpha" />);

    await screen.findByText("Page 1 of 3");
    enableManualSegmentPageTurn();
    selectAssistedSegment();

    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: "Arm manual page turn" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Page number" }), {
      target: { value: "3" }
    });
    fireEvent.click(screen.getByRole("button", { name: /^Go$/ }));
    expect(screen.getByText("Page 3 of 3")).toBeVisible();
    expect(screen.queryByText("Manual page turn armed.")).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(screen.getByText("Page 3 of 3")).toBeVisible();
  });

  it("cancels a pending turn when disabled or when the selected segment changes", async () => {
    render(<SheetViewerExperience sheetId="sheet-alpha" />);

    await screen.findByText("Page 1 of 3");
    enableManualSegmentPageTurn();
    selectAssistedSegment();

    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: "Arm manual page turn" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Manual segment page turn" }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(screen.getByText("Page 1 of 3")).toBeVisible();

    enableManualSegmentPageTurn();
    selectAssistedSegment();
    fireEvent.click(screen.getByRole("button", { name: "Arm manual page turn" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear assisted segment" }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });

    expect(screen.getByText("Page 1 of 3")).toBeVisible();
    expect(screen.getByText("Select a segment to arm a timed page turn.")).toBeVisible();
  });

  it("does not arm when the selected segment has unusable timing", async () => {
    viewerMocks.selectedSegment = {
      ...createSegment(),
      range: {
        startMeasure: 2,
        endMeasure: 1
      }
    };

    render(<SheetViewerExperience sheetId="sheet-alpha" />);

    await screen.findByText("Page 1 of 3");
    enableManualSegmentPageTurn();
    selectAssistedSegment();

    expect(
      screen.getByText("Selected segment needs timing before manual turning.")
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Arm manual page turn" })).toBeDisabled();
  });
});
