import {
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  LibraryRecentPracticeSummaryBySheetItem,
  LibraryRecentPracticeSummaryBySheetSource
} from "@/domain/practice";
import type { SheetListItem } from "@/domain/sheet";
import type { SheetImportPreview } from "@/services/sheet-library";

const sheetServiceMocks = vi.hoisted(() => ({
  listSheets: vi.fn(),
  previewImport: vi.fn(),
  importSheet: vi.fn(),
  importSheetsBatch: vi.fn(),
  deleteSheet: vi.fn(),
  updateSheetMetadata: vi.fn(),
  setSheetFavorite: vi.fn(),
  setSheetTags: vi.fn()
}));

const practiceServiceMocks = vi.hoisted(() => ({
  getLibraryRecentPracticeSummaryBySheet: vi.fn()
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

vi.mock("@/services/sheet-library/browser", () => ({
  browserSheetLibraryService: sheetServiceMocks
}));

vi.mock("@/services/practice-session/browser", () => ({
  browserPracticeSessionService: practiceServiceMocks
}));

import { SheetLibraryExperience } from "@/components/sheet-library/sheet-library-experience";

function createSheet(overrides: Partial<SheetListItem> = {}): SheetListItem {
  return {
    id: "sheet-alpha",
    name: "Alpha Etude",
    category: "song",
    bpm: 96,
    timeSignature: "4/4",
    kind: "pdf",
    pageCount: 1,
    imageCount: 0,
    imageDimensions: [],
    mimeTypes: ["application/pdf"],
    sizeBytes: 1024,
    originalFileNames: ["alpha.pdf"],
    createdAt: "2026-06-21T12:00:00.000Z",
    updatedAt: "2026-06-21T12:00:00.000Z",
    lastPracticedAt: null,
    tags: [],
    favorite: false,
    artifactStatus: {
      readable: true,
      label: "PDF artifact parsed: 1 page"
    },
    ...overrides
  };
}

function createPreview(
  overrides: Partial<SheetImportPreview> = {}
): SheetImportPreview {
  const kind = overrides.kind ?? "pdf";

  return {
    kind,
    pageCount: kind === "pdf" ? 2 : null,
    imageCount: kind === "image" ? 1 : 0,
    imageDimensions:
      kind === "image" ? [{ width: 800, height: 1000 }] : [],
    mimeTypes: [kind === "pdf" ? "application/pdf" : "image/png"],
    sizeBytes: 1024,
    originalFileNames: [kind === "pdf" ? "preview.pdf" : "preview.png"],
    files: [
      {
        name: kind === "pdf" ? "preview.pdf" : "preview.png",
        mimeType: kind === "pdf" ? "application/pdf" : "image/png",
        sizeBytes: 1024,
        pageNumber: 1,
        blob: new Blob([kind], {
          type: kind === "pdf" ? "application/pdf" : "image/png"
        }),
        width: kind === "image" ? 800 : null,
        height: kind === "image" ? 1000 : null
      }
    ],
    ...overrides
  };
}

function createSummary(
  overrides: Partial<LibraryRecentPracticeSummaryBySheetItem> = {}
): LibraryRecentPracticeSummaryBySheetItem {
  return {
    sheetId: "sheet-alpha",
    lastPracticedAt: "2026-06-21T12:05:00.000Z",
    lastSessionId: "session-alpha",
    latestRecordingId: "recording-alpha",
    sessionCount: 3,
    recordingCount: 2,
    durationMs: 42 * 60_000,
    segmentPracticeCount: 1,
    ...overrides
  };
}

function createSummarySource(
  items: LibraryRecentPracticeSummaryBySheetItem[]
): LibraryRecentPracticeSummaryBySheetSource {
  return {
    generatedAt: "2026-06-21T12:10:00.000Z",
    limit: Number.MAX_SAFE_INTEGER,
    items
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });

  return { promise, resolve, reject };
}

function getSheetCard(name: string) {
  const heading = screen.getByRole("heading", { name });
  const card = heading.closest(".bg-card");

  if (!card) {
    throw new Error(`Card not found for ${name}`);
  }

  return card as HTMLElement;
}

describe("SheetLibraryExperience practice summaries", () => {
  beforeEach(() => {
    Object.values(sheetServiceMocks).forEach((mock) => mock.mockReset());
    practiceServiceMocks.getLibraryRecentPracticeSummaryBySheet.mockReset();

    sheetServiceMocks.listSheets.mockResolvedValue([
      createSheet(),
      createSheet({
        id: "sheet-beta",
        name: "Beta Study",
        category: "exercise",
        originalFileNames: ["beta.pdf"]
      })
    ]);
    practiceServiceMocks.getLibraryRecentPracticeSummaryBySheet.mockResolvedValue(
      createSummarySource([])
    );
  });

  it("renders joined summaries, no-history rows, and ignores missing sheet summaries", async () => {
    practiceServiceMocks.getLibraryRecentPracticeSummaryBySheet.mockResolvedValue(
      createSummarySource([
        createSummary(),
        createSummary({
          sheetId: "sheet-deleted",
          sessionCount: 99,
          recordingCount: 88,
          durationMs: 99 * 60_000
        })
      ])
    );

    render(<SheetLibraryExperience />);

    await screen.findByRole("heading", { name: "Alpha Etude" });
    await waitFor(() =>
      expect(
        screen.queryByText("Loading practice summary...")
      ).not.toBeInTheDocument()
    );

    expect(
      practiceServiceMocks.getLibraryRecentPracticeSummaryBySheet
    ).toHaveBeenCalledWith({ limit: Number.MAX_SAFE_INTEGER });

    const alphaCard = getSheetCard("Alpha Etude");
    const betaCard = getSheetCard("Beta Study");
    const alphaSummary = within(alphaCard).getByLabelText(
      "Recent practice for Alpha Etude"
    );

    expect(alphaSummary).toHaveTextContent("Recent practice");
    expect(within(alphaSummary).getByText(/Last practiced/)).toBeVisible();
    expect(
      within(alphaSummary).getByText(
        "42 min · 3 sessions · 2 recordings · 1 segment practice"
      )
    ).toBeVisible();
    expect(
      within(betaCard).getByText("No local practice summary yet.")
    ).toBeVisible();
    expect(
      within(betaCard).getByRole("link", { name: "Review recordings" })
    ).toHaveAttribute("href", "/recordings?sheetId=sheet-beta");
    expect(screen.queryByText(/99 sessions/)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search"), {
      target: { value: "alpha" }
    });

    expect(screen.getByRole("heading", { name: "Alpha Etude" })).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Beta Study" })
    ).not.toBeInTheDocument();
    expect(
      within(getSheetCard("Alpha Etude")).getByText(
        "42 min · 3 sessions · 2 recordings · 1 segment practice"
      )
    ).toBeVisible();
  });

  it("shows an error and stops loading when the sheet list cannot load", async () => {
    sheetServiceMocks.listSheets.mockRejectedValue(
      new Error("library unavailable")
    );

    render(<SheetLibraryExperience />);

    expect(
      await screen.findByRole("alert")
    ).toHaveTextContent("Sheet library could not be loaded.");
    expect(screen.queryByText("Loading sheets...")).not.toBeInTheDocument();
  });

  it("ignores stale import previews when a newer file selection resolves first", async () => {
    const firstPreview = createDeferred<{
      ok: true;
      preview: SheetImportPreview;
    }>();

    sheetServiceMocks.previewImport
      .mockReturnValueOnce(firstPreview.promise)
      .mockResolvedValueOnce({
        ok: true,
        preview: createPreview({
          kind: "image",
          pageCount: null,
          imageCount: 1,
          originalFileNames: ["second.png"]
        })
      });

    render(<SheetLibraryExperience />);

    await screen.findByRole("heading", { name: "Alpha Etude" });

    const input = screen.getByLabelText("File");

    fireEvent.change(input, {
      target: {
        files: [
          new File(["first"], "first.pdf", { type: "application/pdf" })
        ]
      }
    });
    fireEvent.change(input, {
      target: {
        files: [
          new File(["second"], "second.png", { type: "image/png" })
        ]
      }
    });

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Ready: 1 image."
    );

    firstPreview.resolve({
      ok: true,
      preview: createPreview({
        kind: "pdf",
        pageCount: 2,
        imageCount: 0,
        originalFileNames: ["first.pdf"]
      })
    });

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        "Ready: 1 image."
      );
      expect(screen.getByLabelText("Name")).toHaveValue("second");
    });
  });

  it("shows an error when import preview throws", async () => {
    sheetServiceMocks.previewImport.mockRejectedValue(
      new Error("preview unavailable")
    );

    render(<SheetLibraryExperience />);

    await screen.findByRole("heading", { name: "Alpha Etude" });

    fireEvent.change(screen.getByLabelText("File"), {
      target: {
        files: [new File(["bad"], "bad.pdf", { type: "application/pdf" })]
      }
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Sheet preview could not be loaded."
    );
    expect(
      screen.getByRole("button", { name: "Save Imported Sheet" })
    ).toBeDisabled();
  });

  it("does not show no-history copy while summaries are still loading", async () => {
    const deferred =
      createDeferred<LibraryRecentPracticeSummaryBySheetSource>();

    practiceServiceMocks.getLibraryRecentPracticeSummaryBySheet.mockReturnValue(
      deferred.promise
    );

    render(<SheetLibraryExperience />);

    await screen.findByRole("heading", { name: "Alpha Etude" });

    const alphaCard = getSheetCard("Alpha Etude");
    const loadingSummary = within(alphaCard).getByText(
      "Loading practice summary..."
    );

    expect(loadingSummary).toHaveAttribute("aria-busy", "true");
    expect(
      within(alphaCard).queryByText("No local practice summary yet.")
    ).not.toBeInTheDocument();

    deferred.resolve(createSummarySource([]));

    await waitFor(() =>
      expect(
        within(alphaCard).getByText("No local practice summary yet.")
      ).toBeVisible()
    );
  });

  it("keeps sheet rows and row actions visible when summary loading fails", async () => {
    practiceServiceMocks.getLibraryRecentPracticeSummaryBySheet.mockRejectedValue(
      new Error("summary unavailable")
    );

    render(<SheetLibraryExperience />);

    await screen.findByRole("heading", { name: "Alpha Etude" });

    expect(
      await screen.findByText("Recent practice summaries could not be loaded.")
    ).toBeVisible();

    const alphaCard = getSheetCard("Alpha Etude");

    expect(
      within(alphaCard).getByRole("link", { name: "Open Sheet Practice" })
    ).toHaveAttribute("href", "/sheet-practice/sheet-alpha");
    expect(
      within(alphaCard).getByRole("link", { name: "Review recordings" })
    ).toHaveAttribute("href", "/recordings?sheetId=sheet-alpha");
    expect(
      within(alphaCard).queryByText("No local practice summary yet.")
    ).not.toBeInTheDocument();
  });
});
