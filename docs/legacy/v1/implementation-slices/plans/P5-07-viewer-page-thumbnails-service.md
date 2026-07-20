# P5-07 Viewer Page Thumbnails Service Plan

## Slice

- Slice id: P5-07 `viewer-page-thumbnails-service`
- Pack: Pack 5 Library / Viewer Upgrade
- Product feature: `viewer.page-thumbnails`
- Product contract: `docs/v1/05a-sheet-viewer.md`
- Related library contract: `docs/v1/04-sheet-library.md`
- Slice file: `docs/v1/implementation-slices/05-library-viewer-upgrade.md`
- Planning model: `gpt-5.5`, medium effort, standard-only/no-fast
- Ponytail mode: full; reuse existing sheet artifact loading and PDF/image rendering APIs
- Recommended implementation tier: Tier C, focused browser rendering service with real artifact tests
- Status: planning artifact only; no product source code or tests changed by this plan

## Refined Scope

P5-07 adds a service/API that can generate and read page thumbnails from real imported sheet artifacts.

This slice owns:

- thumbnail domain/service types for sheet viewer pages;
- a `SheetViewerService` method that loads an already-imported sheet and returns thumbnail metadata plus browser-readable thumbnail URLs;
- browser adapter thumbnail generation for both PDF and image artifacts;
- deterministic cleanup/revocation for generated thumbnail object URLs;
- small cache behavior inside the service or browser adapter so repeated reads in one viewer session do not rerender the same thumbnails unnecessarily;
- focused unit tests plus browser-backed evidence using real PDF/image sheet fixtures.

This slice does not own:

- P5-08 thumbnail rail, drawer, page selection UI, keyboard behavior, or selected thumbnail styling;
- P5-09 page number jump;
- P5-10/P5-11 zoom-pan domain/UI;
- P5-12 assisted page turning;
- visible Sheet Viewer layout changes; any E2E harness must be test-only and unreachable in normal product use;
- persistence schema changes, IndexedDB thumbnail tables, migrations, or cross-session thumbnail cache;
- import-time thumbnail generation;
- server-side rendering, Node canvas, worker pools, network/CDN PDF workers, or new dependencies.

## Current Code Shape

Relevant existing files:

- `src/services/sheet-viewer/types.ts`
  - Defines `SheetViewerAdapter`, `SheetViewerLibraryReader`, `SheetViewerLoadState`, and object URL types.
  - Current adapter boundary already owns artifact inspection and blob URL creation/revocation.
- `src/services/sheet-viewer/service.ts`
  - `createSheetViewerService(...)` already validates sheet id, sheet lookup, artifact lookup, artifact readability, artifact metadata match, and adapter inspection.
  - `createArtifactObjectUrls(...)` and `revokeArtifactObjectUrls(...)` already keep UI away from raw `URL.createObjectURL`.
- `src/infrastructure/sheet-viewer/browser-sheet-viewer-adapter.ts`
  - Already imports `pdfjs-dist`, uses the local `pdfjs-dist/build/pdf.worker.min.mjs` worker, and decodes images with `createImageBitmap` or `Image`.
  - This is the right place for browser-only PDF page rasterization and image downscaling.
- `src/infrastructure/sheet-viewer/browser-sheet-viewer-service.ts`
  - Wires browser Sheet Library service to the browser viewer adapter.
- `src/components/sheet-practice/viewer/pdf-sheet-renderer.tsx`
  - UI rendering uses `react-pdf` and the same local PDF worker.
  - P5-07 should not move UI rendering into the service or make the service depend on React.
- `src/components/sheet-practice/viewer/sheet-viewer-experience.tsx`
  - Current viewer loads real artifacts via `browserSheetViewerService.loadSheet(...)`.
  - P5-08 should consume the P5-07 service output from here; P5-07 should not build the rail now.
- `src/infrastructure/files/sheet-library-repository.ts`
  - Stores `sheets` and `artifacts` in `SHEET_LIBRARY_DB_NAME`.
  - Artifact rows are keyed by `sheetId`.
  - There is no thumbnail store today.
- `src/domain/sheet/types.ts`
  - `SheetArtifactFile` already has `pageNumber`, `blob`, `width`, and `height`.
  - Image artifacts can map directly from one stored image file per page.

Existing tests to extend or mirror:

- `tests/unit/sheet-viewer-service.test.ts`
- `tests/e2e/sheet-viewer.spec.ts`
- `tests/e2e/fixtures/sheets.ts`
- `tests/unit/architecture-boundaries.test.ts`

## Service Contract

Add the smallest useful service surface to `src/services/sheet-viewer`:

```ts
export type SheetPageThumbnail = {
  sheetId: string;
  pageNumber: number;
  width: number;
  height: number;
  url: string;
};

export type SheetPageThumbnailSet =
  | {
      status: "ready";
      sheetId: string;
      pageCount: number;
      thumbnails: SheetPageThumbnail[];
    }
  | {
      status: "error";
      code: SheetViewerErrorCode;
      title: string;
      message: string;
    };
```

Preferred `SheetViewerService` additions:

```ts
loadPageThumbnails(sheetId: string | null | undefined): Promise<SheetPageThumbnailSet>;
revokePageThumbnails(thumbnails: SheetPageThumbnailSet): void;
```

Semantics:

- Reuse the same validation path as `loadSheet(...)`: trimmed sheet id, sheet lookup, artifact lookup, non-empty artifact check, artifact metadata match, and adapter inspection.
- Return the same user-facing error codes/titles/messages as `loadSheet(...)` when sheet/artifact loading fails.
- For a ready sheet, generate exactly one thumbnail per real page.
- Thumbnail `pageNumber` is 1-based and must match existing artifact page numbering and PDF page numbering.
- The service should not know how PDF rasterization or image downscaling works; delegate that to the adapter.
- The returned `url` should be a blob URL created from generated thumbnail blobs, not a data URL string embedded in sheet metadata.
- `revokePageThumbnails(...)` must revoke only the thumbnail object URLs returned by that specific call.
- It must not clear the in-memory thumbnail `Blob`/dimensions cache; cache disposal can be added later only through an explicit reviewed `clearCache`/`dispose` path.

Keep this as a viewer service capability. Do not create a separate top-level `thumbnail-service` unless the existing service boundary becomes clearly awkward.

## Adapter Contract

Extend `SheetViewerAdapter` with browser rendering, for example:

```ts
generatePageThumbnails(
  sheet: ImportedSheet,
  artifact: SheetArtifact,
  options?: { maxWidth?: number }
): Promise<
  | { ok: true; thumbnails: Array<{ pageNumber: number; blob: Blob; width: number; height: number }> }
  | { ok: false; code: "bad-pdf" | "bad-image" | "missing-artifact" | "artifact-mismatch"; message: string }
>;
```

Defaults:

- `maxWidth`: 120 CSS pixels, enough for P5-08 rail/drawer without over-rendering.
- Output MIME: `image/png` unless a browser support issue forces `image/webp`; do not add format negotiation in this slice.
- Preserve aspect ratio.
- Minimum dimensions: if a source page decodes but would round below 1 pixel, clamp output width/height to at least 1.

PDF behavior:

- Reuse `pdfjs-dist` already installed in `package.json`.
- Use the existing local worker path:

```ts
new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString()
```

- Do not use `pdfjs-dist/legacy`.
- Do not load workers from CDN.
- For each page from `1..document.numPages`, call `document.getPage(pageNumber)`, choose a scale that targets `maxWidth`, render to an offscreen canvas or regular `document.createElement("canvas")`, then convert with `canvas.toBlob(...)`.
- Destroy the PDF loading task/document as the current adapter does.
- Clean up canvas dimensions after conversion if the implementation keeps canvases around in local variables.

Image behavior:

- Use the existing stored image artifact files.
- Decode with the current `createImageBitmap` or `Image` fallback pattern.
- Draw the decoded image into a canvas scaled to `maxWidth`.
- Return one thumbnail per non-empty image artifact file, preserving `file.pageNumber` when present and falling back to array index + 1.
- Do not read EXIF, perform image enhancement, or introduce a third-party image library.

Failure behavior:

- Empty/missing artifact files return `missing-artifact`.
- PDF parse/render failures return `bad-pdf` with the same kind of message as current load errors.
- Image decode/canvas conversion failures return `bad-image`.
- If `canvas.toBlob(...)` returns null, treat it as `bad-pdf` or `bad-image` depending on source kind.
- Partial thumbnail sets are not accepted in P5-07: if any page fails, return an error and discard any intermediate thumbnail blobs created for that failed request.
- If object URLs were already created for a failed request, revoke those URLs before returning the error. Blob objects themselves do not need revocation.

## Cache And Storage Decision

Use only an in-memory per-service or per-adapter cache for P5-07.

Do not add a persistent thumbnail table yet because:

- original artifact blobs are already persisted and authoritative;
- P5-07 has no UI rail yet, so cross-session cache value is unproven;
- persistent thumbnails would require schema/versioning/cleanup/migration decisions that are larger than this service slice;
- deleting a sheet today deletes only the sheet and artifact rows, so persistent thumbnails would create a new cleanup obligation.

Acceptable cache key:

```text
sheetId + artifact.createdAt + artifact.kind + pageCount/imageCount + maxWidth
```

Cache value:

- Cache generated thumbnail `Blob`s plus dimensions only.
- Create fresh object URLs for each `loadPageThumbnails(...)` call from those cached or newly generated blobs.
- Do not store object URLs in the cache.
- A small `Map` with one entry per loaded sheet is enough. If implementing broader cache, cap it at a tiny number such as 5 sheets.

Invalidation:

- Different `artifact.createdAt`, kind, page count, or maxWidth misses the cache.
- `revokePageThumbnails(...)` revokes URLs for the returned set and leaves cached blobs/dimensions intact.
- No migration, cleanup service, storage usage UI, or data export/import handling in this slice.

## Boundary Rules

- UI components may call `browserSheetViewerService.loadPageThumbnails(...)` later, but must not import `pdfjs-dist`, Dexie, `sheetLibraryRepository`, or canvas thumbnail helpers.
- `src/services/sheet-viewer` owns orchestration and error mapping.
- `src/infrastructure/sheet-viewer/browser-sheet-viewer-adapter.ts` owns browser APIs: `pdfjs-dist`, `createImageBitmap`, `Image`, `canvas`, `URL.createObjectURL`, and `URL.revokeObjectURL`.
- `src/infrastructure/files` keeps owning sheet import and artifact persistence. Do not move thumbnail generation into import.
- `src/components/sheet-practice/viewer/pdf-sheet-renderer.tsx` keeps owning full-size visual rendering with `react-pdf`.
- No new package or lockfile changes.

## Acceptance Criteria

1. `browserSheetViewerService.loadPageThumbnails(sheetId)` returns a ready thumbnail set for a real imported multi-page PDF.
2. The PDF thumbnail set has one thumbnail per PDF page, with 1-based page numbers and non-empty blob URLs.
3. PDF thumbnails are rendered from the real stored PDF artifact through `pdfjs-dist` and the local bundled worker.
4. `loadPageThumbnails(sheetId)` returns a ready thumbnail set for real imported PNG/JPG image artifacts.
5. Image thumbnails are rendered from the real stored image blobs and preserve page order.
6. Thumbnail dimensions preserve aspect ratio and respect the chosen max width.
7. Missing sheet id, unknown sheet, missing artifact, artifact mismatch, bad PDF, and bad image return explicit error states aligned with existing `loadSheet(...)` behavior.
8. Repeated thumbnail reads for the same unchanged artifact avoid duplicate rasterization within the same service/adapter instance.
9. `revokePageThumbnails(...)` revokes all generated thumbnail URLs without touching the original sheet artifact URLs.
10. Existing `loadSheet(...)`, full PDF/image rendering, zoom buttons, page navigation, and object URL behavior continue to pass.
11. Architecture tests still enforce local PDF worker usage and no `pdfjs-dist/legacy`.
12. No P5-08+ visible thumbnail UI, page jump, zoom-pan, assisted turning, persistent thumbnail storage, schema migration, or new dependency is introduced.

## Test Coverage Plan

### Unit Tests

Extend `tests/unit/sheet-viewer-service.test.ts`:

- ready PDF thumbnail result maps adapter thumbnail blobs to blob URLs and includes `sheetId`, `pageCount`, `pageNumber`, `width`, and `height`;
- ready image thumbnail result preserves page order from adapter output;
- missing/blank sheet id, sheet not found, missing artifact, artifact mismatch, bad PDF, and bad image mirror existing `loadSheet(...)` errors;
- `revokePageThumbnails(...)` calls adapter URL revoke for every thumbnail URL;
- repeated `loadPageThumbnails(...)` for the same sheet/artifact uses cached adapter output if the service owns caching, or document the adapter-level cache and unit-test it there;
- `loadSheet(...)` existing tests still pass unchanged.

Add or extend a browser-adapter unit test only if jsdom/canvas mocks stay small:

- mock `pdfjs-dist` and canvas conversion to prove page loop and local worker path;
- mock image decode/canvas conversion to prove scaling math and error mapping.

Skip heavy canvas mocks if they become broader than the implementation. The browser E2E below is the real rendering proof.

### Browser E2E

Add a focused thumbnail service E2E test near `tests/e2e/sheet-viewer.spec.ts` or a new `tests/e2e/sheet-viewer-thumbnails.spec.ts`.

Use real fixtures from `test-fixtures/sheets`:

- `two-page-sheet.pdf`
- `real-sheet.png`
- `bad-sheet.pdf`
- `bad-sheet.png`

Recommended proof path:

1. Clear `SHEET_LIBRARY_DB_NAME`.
2. Import `two-page-sheet.pdf` through the real Sheet Library flow using `importTestSheet(...)`.
3. In the browser page context, import/use the already bundled `browserSheetViewerService` only if the app test setup supports it; otherwise expose a tiny test-only route/harness only if there is already an accepted pattern.
4. Call `loadPageThumbnails(sheetId)` and assert:
   - status is `ready`;
   - `pageCount` is 2;
   - there are two thumbnails;
   - every URL starts with `blob:`;
   - every width/height is positive;
   - page numbers are `[1, 2]`.
5. Load each thumbnail URL into an `Image` in the browser and draw or inspect natural dimensions to prove the blob is decodable and non-empty.
6. If canvas pixel checks are practical, assert at least one thumbnail has non-white changed pixels, similar to the existing PDF canvas check.
7. Call `revokePageThumbnails(...)`; assert loading the revoked URL fails or at least no console/page errors were emitted during revocation.
8. Repeat with `real-sheet.png` and assert one decodable thumbnail.
9. Seed or import `bad-sheet.pdf` and `bad-sheet.png` and assert `bad-pdf` / `bad-image` error states.

If exposing the service directly in E2E requires broad app changes, use a minimal test-only harness guarded to test files. Any harness must be test-only and must not add visible product UI, navigation, route, drawer, rail, or layout behavior reachable in normal use. Do not add user-facing rail/drawer UI as the proof mechanism; that belongs to P5-08.

### Architecture Tests

Extend `tests/unit/architecture-boundaries.test.ts` only if needed:

- include any new sheet-viewer adapter file in the local PDF worker assertion;
- keep assertions that `pdfjs-dist/legacy`, `unpkg`, and `https://` are absent from PDF/viewer code;
- optionally assert `src/components/sheet-practice` does not import `pdfjs-dist` outside the existing full PDF renderer.

## Verification Commands For Coding Agent

Adjust scoped file lists to the final implementation:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/sheet-viewer-service.test.ts tests/unit/architecture-boundaries.test.ts
& .\scripts\npm-local.ps1 --% run test:e2e -- tests/e2e/sheet-viewer.spec.ts --project=chromium
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint -- src/services/sheet-viewer/types.ts src/services/sheet-viewer/service.ts src/infrastructure/sheet-viewer/browser-sheet-viewer-adapter.ts src/infrastructure/sheet-viewer/browser-sheet-viewer-service.ts tests/unit/sheet-viewer-service.test.ts tests/unit/architecture-boundaries.test.ts tests/e2e/sheet-viewer.spec.ts
git diff --check
```

If the E2E test is placed in a new file, replace the scoped E2E/lint path with that file. If no architecture test change is needed, remove it from the scoped commands.

## Model Gates

- Planning agent: `gpt-5.5`, medium effort, standard-only/no-fast
- Coding agent: `gpt-5.5`, high effort, standard-only/no-fast
- Code review agent: `gpt-5.5`, extra-high effort, standard-only/no-fast
- Verification agent: `gpt-5.5`, high effort, standard-only/no-fast
- Web ChatGPT planning/PR gates: Extra High, not Pro

Reason: this is a service/infrastructure slice that touches real browser PDF/image rendering and artifact boundaries, but it should remain small because the UI rail is explicitly deferred.

## Handoff Notes For One Coding Agent

Read only the focused paths:

- `docs/v1/START-HERE.md`
- `docs/v1/implementation-slices/plans/P5-07-viewer-page-thumbnails-service.md`
- `docs/v1/implementation-slices/05-library-viewer-upgrade.md`
- `docs/v1/05a-sheet-viewer.md`
- `docs/v1/04-sheet-library.md`
- `src/services/sheet-viewer/types.ts`
- `src/services/sheet-viewer/service.ts`
- `src/services/sheet-viewer/index.ts`
- `src/infrastructure/sheet-viewer/browser-sheet-viewer-adapter.ts`
- `src/infrastructure/sheet-viewer/browser-sheet-viewer-service.ts`
- `src/infrastructure/sheet-viewer/use-browser-sheet-viewer-object-urls.ts`
- `src/components/sheet-practice/viewer/pdf-sheet-renderer.tsx`
- `src/components/sheet-practice/viewer/sheet-viewer-experience.tsx`
- `src/domain/sheet/types.ts`
- `src/infrastructure/files/sheet-library-repository.ts`
- `tests/unit/sheet-viewer-service.test.ts`
- `tests/unit/architecture-boundaries.test.ts`
- `tests/e2e/sheet-viewer.spec.ts`
- `tests/e2e/fixtures/sheets.ts`

Implement P5-07 only. The shortest correct path is to extend the existing sheet-viewer service and browser adapter, generate thumbnail blobs from the real existing artifacts, return blob URLs plus dimensions/page numbers, and add revocation. Keep the rail/drawer entirely out of this PR.

## No-Go Scope

- No thumbnail rail/drawer, sidebar, carousel, selected-page controls, or page-click behavior.
- No URL/page jump behavior.
- No zoom-pan state changes.
- No assisted page turning, score following, automatic bar detection, or timing logic.
- No new persistent thumbnail store, Dexie schema version, migration, export/import support, or cleanup integration.
- No import-time thumbnail generation.
- No server/Node PDF rendering.
- No new dependency, package-lock churn, CDN worker, or `pdfjs-dist/legacy` workaround.
- No broad rewrite of `SheetViewerExperience`, `PdfSheetRenderer`, Sheet Library import, or artifact repository.

## Split Triggers

Stop and return to planning if implementation appears to require:

- production-code changes above roughly 250-300 LOC excluding tests;
- a new persistence table, migration, or cleanup workflow;
- a new dependency or package/lockfile change;
- a user-facing thumbnail rail or drawer to prove the service;
- changing how full-size PDF/image pages render today;
- storing thumbnails in sheet metadata or artifact rows;
- reworking Sheet Library import flow;
- a generalized asset cache, worker pool, or media pipeline abstraction.

## Deferred Work Register

| Deferred work | Future owner |
| --- | --- |
| Thumbnail rail/drawer UI and page selection | P5-08 |
| Page number jump and invalid input handling | P5-09 |
| Viewer zoom-pan domain and UI | P5-10/P5-11 |
| Assisted/manual page turning at segment boundaries | P5-12 |
| Persistent thumbnail cache with cleanup/export/import support | Future reviewed storage/performance slice, only after P5-08 proves need |
| Import-time thumbnail precomputation | Future reviewed performance slice |
| Better visual placeholders for per-page thumbnail errors | P5-08 or later UI slice |
| Cloud sync, score following, automatic recognition, mistake detection | v2 or future reviewed feature |
