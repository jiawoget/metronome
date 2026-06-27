import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SheetViewerLoadState } from "@/services/sheet-viewer";

const viewerMocks = vi.hoisted(() => ({
  controlsProps: [] as Array<{ currentMeasureGridTimestampMs?: number | null }>,
  loadSheet: vi.fn()
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
    loadSheet: viewerMocks.loadSheet
  }
}));

vi.mock("@/infrastructure/sheet-viewer/use-browser-sheet-viewer-object-urls", () => ({
  useBrowserSheetViewerObjectUrls: (state: SheetViewerLoadState) =>
    state.status === "ready"
      ? {
          sheetId: state.sheet.id,
          urls: ["blob:sheet-alpha-page-1"]
        }
      : null
}));

vi.mock("@/components/sheet-practice/reference/reference-panel", () => ({
  ReferencePanel: ({
    onPlaybackTimestampChange
  }: {
    onPlaybackTimestampChange?: (timestampMs: number | null) => void;
  }) => (
    <div>
      <button
        type="button"
        onClick={() => onPlaybackTimestampChange?.(2_468)}
      >
        Report reference timestamp
      </button>
      <button
        type="button"
        onClick={() => onPlaybackTimestampChange?.(null)}
      >
        Clear reference timestamp
      </button>
    </div>
  )
}));

vi.mock("@/components/sheet-practice/controls/sheet-practice-controls", () => ({
  SheetPracticeControls: (props: {
    currentMeasureGridTimestampMs?: number | null;
  }) => {
    viewerMocks.controlsProps.push(props);

    return (
      <div data-testid="mock-sheet-practice-controls">
        {String(props.currentMeasureGridTimestampMs ?? "null")}
      </div>
    );
  }
}));

import { SheetViewerExperience } from "@/components/sheet-practice/viewer/sheet-viewer-experience";

function createReadyState(): SheetViewerLoadState {
  return {
    status: "ready",
    sheet: {
      id: "sheet-alpha",
      name: "Alpha",
      category: "song",
      bpm: 72,
      timeSignature: "4/4",
      kind: "image",
      pageCount: null,
      imageCount: 1,
      imageDimensions: [{ width: 600, height: 800 }],
      mimeTypes: ["image/png"],
      sizeBytes: 3,
      originalFileNames: ["alpha.png"],
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
      files: [
        {
          name: "alpha.png",
          mimeType: "image/png",
          sizeBytes: 3,
          pageNumber: 1,
          blob: new Blob(["png"], { type: "image/png" }),
          width: 600,
          height: 800
        }
      ],
      createdAt: "2026-06-21T12:00:00.000Z"
    },
    pageCount: 1,
    imageDimensions: [{ width: 600, height: 800 }]
  };
}

describe("SheetViewerExperience measure-grid timestamp wiring", () => {
  beforeEach(() => {
    viewerMocks.controlsProps.length = 0;
    viewerMocks.loadSheet.mockReset();
    viewerMocks.loadSheet.mockResolvedValue(createReadyState());
  });

  it("passes the reference playback timestamp through to sheet practice controls", async () => {
    const user = userEvent.setup();

    render(<SheetViewerExperience sheetId="sheet-alpha" />);

    await waitFor(() => {
      expect(screen.getByTestId("mock-sheet-practice-controls")).toHaveTextContent("null");
    });

    await user.click(screen.getByRole("button", { name: "Report reference timestamp" }));

    await waitFor(() => {
      expect(screen.getByTestId("mock-sheet-practice-controls")).toHaveTextContent("2468");
    });
    expect(viewerMocks.controlsProps.at(-1)?.currentMeasureGridTimestampMs).toBe(2_468);
  });

  it("passes a cleared reference playback timestamp through as null", async () => {
    const user = userEvent.setup();

    render(<SheetViewerExperience sheetId="sheet-alpha" />);

    await waitFor(() => {
      expect(screen.getByTestId("mock-sheet-practice-controls")).toHaveTextContent("null");
    });

    await user.click(screen.getByRole("button", { name: "Report reference timestamp" }));

    await waitFor(() => {
      expect(screen.getByTestId("mock-sheet-practice-controls")).toHaveTextContent("2468");
    });

    await user.click(screen.getByRole("button", { name: "Clear reference timestamp" }));

    await waitFor(() => {
      expect(screen.getByTestId("mock-sheet-practice-controls")).toHaveTextContent("null");
    });
    expect(viewerMocks.controlsProps.at(-1)?.currentMeasureGridTimestampMs).toBeNull();
  });
});
