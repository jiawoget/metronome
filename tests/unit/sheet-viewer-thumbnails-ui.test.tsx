import { render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SheetPageThumbnailSet } from "@/services/sheet-viewer";

const viewerMocks = vi.hoisted(() => ({
  loadPageThumbnails: vi.fn(),
  revokePageThumbnails: vi.fn(),
  revokeArtifactObjectUrls: vi.fn()
}));

vi.mock("@/infrastructure/sheet-viewer/browser-sheet-viewer-service", () => ({
  browserSheetViewerService: viewerMocks
}));

import { SheetPageThumbnails } from "@/components/sheet-practice/viewer/sheet-page-thumbnails";
import { useBrowserSheetViewerPageThumbnails } from "@/infrastructure/sheet-viewer/use-browser-sheet-viewer-page-thumbnails";

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

function createDeferred<T>(): Deferred<T> {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
}

function readySet(sheetId: string, urlPrefix = sheetId): SheetPageThumbnailSet {
  return {
    status: "ready",
    sheetId,
    pageCount: 2,
    thumbnails: [
      {
        sheetId,
        pageNumber: 1,
        width: 80,
        height: 100,
        url: `blob:${urlPrefix}-1`
      },
      {
        sheetId,
        pageNumber: 2,
        width: 80,
        height: 100,
        url: `blob:${urlPrefix}-2`
      }
    ]
  };
}

function errorSet(): SheetPageThumbnailSet {
  return {
    status: "error",
    code: "bad-pdf",
    title: "PDF cannot be rendered",
    message: "The saved PDF artifact could not be rendered."
  };
}

describe("useBrowserSheetViewerPageThumbnails", () => {
  beforeEach(() => {
    viewerMocks.loadPageThumbnails.mockReset();
    viewerMocks.revokePageThumbnails.mockReset();
    viewerMocks.revokeArtifactObjectUrls.mockReset();
  });

  it("revokes ready thumbnail sets on replacement and unmount", async () => {
    const first = readySet("sheet-1");
    const second = readySet("sheet-2");

    viewerMocks.loadPageThumbnails
      .mockResolvedValueOnce(first)
      .mockResolvedValueOnce(second);

    const { result, rerender, unmount } = renderHook(
      ({ sheetId }) => useBrowserSheetViewerPageThumbnails(sheetId),
      { initialProps: { sheetId: "sheet-1" } }
    );

    await waitFor(() => {
      expect(result.current).toEqual(first);
    });

    rerender({ sheetId: "sheet-2" });

    expect(viewerMocks.revokePageThumbnails).toHaveBeenCalledWith(first);

    await waitFor(() => {
      expect(result.current).toEqual(second);
    });

    unmount();

    expect(viewerMocks.revokePageThumbnails).toHaveBeenCalledWith(second);
    expect(viewerMocks.revokeArtifactObjectUrls).not.toHaveBeenCalled();
  });

  it("immediately revokes stale ready results after a sheet change", async () => {
    const firstLoad = createDeferred<SheetPageThumbnailSet>();
    const second = readySet("sheet-2");
    const stale = readySet("sheet-1", "stale");

    viewerMocks.loadPageThumbnails
      .mockReturnValueOnce(firstLoad.promise)
      .mockResolvedValueOnce(second);

    const { result, rerender } = renderHook(
      ({ sheetId }) => useBrowserSheetViewerPageThumbnails(sheetId),
      { initialProps: { sheetId: "sheet-1" } }
    );

    rerender({ sheetId: "sheet-2" });
    firstLoad.resolve(stale);

    await waitFor(() => {
      expect(viewerMocks.revokePageThumbnails).toHaveBeenCalledWith(stale);
    });
    await waitFor(() => {
      expect(result.current).toEqual(second);
    });
  });

  it("suppresses the previous ready state immediately after rerendering for a new sheet", async () => {
    const first = readySet("sheet-1");
    const secondLoad = createDeferred<SheetPageThumbnailSet>();

    viewerMocks.loadPageThumbnails
      .mockResolvedValueOnce(first)
      .mockReturnValueOnce(secondLoad.promise);

    const { result, rerender } = renderHook(
      ({ sheetId }) => useBrowserSheetViewerPageThumbnails(sheetId),
      { initialProps: { sheetId: "sheet-1" } }
    );

    await waitFor(() => {
      expect(result.current).toEqual(first);
    });

    rerender({ sheetId: "sheet-2" });

    expect(result.current).toEqual({ status: "loading" });
  });

  it("revokes stale ready results after unmount", async () => {
    const load = createDeferred<SheetPageThumbnailSet>();
    const stale = readySet("sheet-1", "unmounted");

    viewerMocks.loadPageThumbnails.mockReturnValueOnce(load.promise);

    const { unmount } = renderHook(() => useBrowserSheetViewerPageThumbnails("sheet-1"));

    unmount();
    load.resolve(stale);

    await waitFor(() => {
      expect(viewerMocks.revokePageThumbnails).toHaveBeenCalledWith(stale);
    });
  });

  it("discards stale error results without revocation", async () => {
    const firstLoad = createDeferred<SheetPageThumbnailSet>();
    const secondLoad = createDeferred<SheetPageThumbnailSet>();

    viewerMocks.loadPageThumbnails
      .mockReturnValueOnce(firstLoad.promise)
      .mockReturnValueOnce(secondLoad.promise);

    const { rerender } = renderHook(
      ({ sheetId }) => useBrowserSheetViewerPageThumbnails(sheetId),
      { initialProps: { sheetId: "sheet-1" } }
    );

    rerender({ sheetId: "sheet-2" });
    firstLoad.resolve(errorSet());

    await waitFor(() => {
      expect(viewerMocks.loadPageThumbnails).toHaveBeenCalledTimes(2);
    });
    expect(viewerMocks.revokePageThumbnails).not.toHaveBeenCalled();
    expect(viewerMocks.revokeArtifactObjectUrls).not.toHaveBeenCalled();
  });

  it("renders active thumbnail errors without artifact URL cleanup", async () => {
    viewerMocks.loadPageThumbnails.mockResolvedValueOnce(errorSet());

    const { result } = renderHook(() => useBrowserSheetViewerPageThumbnails("sheet-1"));

    await waitFor(() => {
      expect(result.current).toMatchObject({
        status: "error",
        code: "bad-pdf"
      });
    });
    expect(viewerMocks.revokePageThumbnails).not.toHaveBeenCalled();
    expect(viewerMocks.revokeArtifactObjectUrls).not.toHaveBeenCalled();
  });
});

describe("SheetPageThumbnails", () => {
  it("renders only valid thumbnail buttons and marks the current page", async () => {
    const user = userEvent.setup();
    const onSelectPage = vi.fn();

    render(
      <SheetPageThumbnails
        state={{
          status: "ready",
          sheetId: "sheet-1",
          pageCount: 4,
          thumbnails: [
            { sheetId: "sheet-1", pageNumber: 0, width: 80, height: 100, url: "blob:bad-0" },
            { sheetId: "sheet-1", pageNumber: 1, width: 80, height: 100, url: "blob:page-1" },
            { sheetId: "sheet-1", pageNumber: 2, width: 80, height: 100, url: "blob:page-2" },
            { sheetId: "sheet-1", pageNumber: 3, width: 80, height: 100, url: "blob:bad-3" }
          ]
        }}
        sheetName="Autumn Etude"
        currentPage={2}
        totalPages={2}
        onSelectPage={onSelectPage}
      />
    );

    expect(screen.queryByRole("button", { name: "Go to page 0" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Go to page 3" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to page 2" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("img", { name: "Autumn Etude page 2 thumbnail" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Go to page 1" }));

    expect(onSelectPage).toHaveBeenCalledWith(1);
  });

  it("renders loading, error, and empty states without page buttons", () => {
    const { rerender } = render(
      <SheetPageThumbnails
        state={{ status: "loading" }}
        sheetName="Autumn Etude"
        currentPage={1}
        totalPages={2}
        onSelectPage={vi.fn()}
      />
    );

    expect(screen.getByRole("status")).toHaveTextContent("Loading thumbnails...");

    rerender(
      <SheetPageThumbnails
        state={errorSet()}
        sheetName="Autumn Etude"
        currentPage={1}
        totalPages={2}
        onSelectPage={vi.fn()}
      />
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Thumbnails unavailable");

    rerender(
      <SheetPageThumbnails
        state={{ status: "ready", sheetId: "sheet-1", pageCount: 0, thumbnails: [] }}
        sheetName="Autumn Etude"
        currentPage={1}
        totalPages={2}
        onSelectPage={vi.fn()}
      />
    );

    expect(screen.getByRole("status")).toHaveTextContent("No thumbnails available");
  });
});
