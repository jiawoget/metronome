# P5-08 Viewer Page Thumbnails UI Plan

## Slice

- Slice id: P5-08 `viewer-page-thumbnails-ui`
- Pack: Pack 5 Library / Viewer Upgrade
- Product feature: `viewer.page-thumbnails`
- Product contract: `docs/v1/05a-sheet-viewer.md`
- Slice file: `docs/v1/implementation-slices/05-library-viewer-upgrade.md`
- Required reuse boundary: P5-07 `browserSheetViewerService.loadPageThumbnails(...)` and `browserSheetViewerService.revokePageThumbnails(...)`
- Planning model: `gpt-5.5`, medium effort, standard-only/no-fast
- Recommended implementation tier: Tier C, focused UI plus browser E2E
- Status: planning artifact only; no product source code or tests changed by this plan

## Refined Scope

P5-08 adds visible thumbnail navigation to the existing Sheet Viewer using the P5-07 thumbnail service. This is a UI integration slice only.

This slice owns:

- loading thumbnails for the current ready sheet from `browserSheetViewerService.loadPageThumbnails(state.sheet.id)`;
- revoking the returned thumbnail object URLs through `browserSheetViewerService.revokePageThumbnails(...)` on sheet change, unmount, reload, or error replacement;
- a compact desktop thumbnail rail beside the dominant sheet area;
- a mobile/tablet thumbnail drawer or collapsible panel reachable from the viewer toolbar;
- one thumbnail button per returned page, with page number labels and current-page selected styling;
- page selection by clicking or keyboard-activating a thumbnail;
- visible loading, error, and empty thumbnail states that do not block the full sheet viewer;
- accessibility labels, selected state semantics, focus handling, and keyboard reachability;
- focused unit/component tests where practical plus Playwright evidence using real PDF/image artifacts.

This slice does not own:

- P5-09 page number text entry, jump form, or invalid page input handling;
- P5-10/P5-11 zoom-pan domain/UI changes beyond preserving the current zoom controls;
- P5-12 assisted page turning, timing rules, segment-boundary turns, score following, or automatic page changes;
- thumbnail generation, PDF rasterization, image downscaling, canvas code, or service/adaptor caching;
- persistent thumbnail storage, schema changes, migrations, import-time thumbnails, or cleanup/export/import integration;
- changing Sheet Library import, artifact repository, PDF worker setup, or full-size PDF/image rendering behavior;
- updating `docs/v1/status.json`. Implementation PR closeout must leave status changes to the separate scheduler/status step.

## Current Code Shape

Relevant existing files:

- `src/components/sheet-practice/viewer/sheet-viewer-experience.tsx`
  - Owns Sheet Practice viewer UI, current page state, zoom state, toolbar, full-size PDF/image rendering, `ReferencePanel`, and `SheetPracticeControls`.
  - Currently calls `browserSheetViewerService.loadSheet(...)` through `useSheetViewer(...)`.
  - This is the primary integration point for P5-08.
- `src/infrastructure/sheet-viewer/browser-sheet-viewer-service.ts`
  - Exports `browserSheetViewerService`.
  - P5-07 exposes the service on `window.__metronomeSheetViewerService` when `NEXT_PUBLIC_METRONOME_E2E === "1"` for E2E evidence.
- `src/infrastructure/sheet-viewer/use-browser-sheet-viewer-object-urls.ts`
  - Existing hook pattern for creating and revoking artifact object URLs on ready-state changes.
  - P5-08 may mirror this shape for thumbnail object URL lifecycle, but should use `loadPageThumbnails(...)` rather than creating URLs directly.
- `src/services/sheet-viewer/types.ts`
  - Defines `SheetPageThumbnail`, `SheetPageThumbnailSet`, and service error states.
- `src/services/sheet-viewer/service.ts`
  - `loadPageThumbnails(...)` validates the sheet through the same path as `loadSheet(...)`, returns fresh blob URLs, and caches thumbnail blobs.
  - `revokePageThumbnails(...)` revokes only the thumbnail URLs returned by that call.
- `src/components/sheet-practice/viewer/pdf-sheet-renderer.tsx`
  - Owns full-size PDF rendering through `react-pdf`; do not move thumbnail concerns here unless a very small prop/test-id change is unavoidable.
- `tests/e2e/sheet-viewer.spec.ts`
  - Already imports real PDF/image fixtures, verifies full viewer behavior, and verifies P5-07 service thumbnails are decodable and revocable.
- `tests/unit/sheet-viewer-service.test.ts`
  - Already covers service thumbnail mapping/caching/revocation. P5-08 should not duplicate service generation tests.
- `src/components/ui/button.tsx`
  - Existing button primitive for toolbar/drawer trigger controls.

## UI Contract

### Desktop

- Keep the full sheet as the visual priority.
- Add a thumbnail rail inside the viewer surface, visually secondary to the main sheet viewport.
- Preferred layout inside the existing viewer `section`:
  - toolbar remains at the top;
  - content area becomes a responsive inner grid/flex row;
  - thumbnail rail is a fixed compact column, about 7-9rem wide, with vertical scrolling;
  - existing `data-testid="sheet-viewer-scroll"` remains on the full-size sheet scroll area for existing tests.
- The rail must not displace or cover the right `ReferencePanel`, bottom `SheetPracticeControls`, or transport controls.
- The rail should show page number text such as `Page 1`, not a jump input.
- The selected thumbnail should use the existing yellow/primary accent and an `aria-current="page"` or equivalent selected semantic.
- Clicking page 2 should call existing `setCurrentPage(2)` and update the existing `Page 2 of N` toolbar text.

### Mobile And Tablet

- Do not permanently consume horizontal width with a rail on narrow screens.
- Add a compact toolbar button, preferably icon + accessible label such as `Page thumbnails`.
- The button opens a drawer/collapsible panel below the toolbar or over the viewer surface without hiding bottom practice controls.
- The mobile thumbnail list may scroll horizontally or vertically, but it must keep stable item sizes and avoid text clipping.
- Selecting a thumbnail should close the drawer if it overlays the viewer; if implemented as an inline collapsible panel, it may stay open.
- Resize between mobile and desktop must not leave stale open UI that overlaps the sheet.

### Loading, Error, And Empty States

- While thumbnails load, show a compact non-blocking state in the rail/drawer area such as `Loading thumbnails...`.
- The main sheet viewer must remain usable while thumbnails are loading.
- If `loadPageThumbnails(...)` returns `status: "error"`, show a compact recoverable message such as `Thumbnails unavailable`; do not replace the main viewer error state unless `loadSheet(...)` itself failed.
- The thumbnail error state may include the service message, but should stay concise and not add tutorial copy.
- If the service returns `ready` with an empty `thumbnails` array, show `No thumbnails available`.
- A one-page sheet should still show a single selected thumbnail if the service returns one; do not hide it unless design verification proves the panel is wasted space on mobile.

## Thumbnail Lifecycle

Implement a small hook or local effect that follows the existing `useBrowserSheetViewerObjectUrls(...)` cleanup style.

Required behavior:

- Start with `{ status: "loading" }` whenever the ready sheet id changes.
- Call `browserSheetViewerService.loadPageThumbnails(state.sheet.id)` only after `loadSheet(...)` has returned a ready state.
- Ignore stale error results when the sheet changes or the component unmounts.
- If `loadPageThumbnails(...)` resolves after sheet change, unmount, or cancellation and returns a ready set, immediately call `browserSheetViewerService.revokePageThumbnails(staleReadySet)` before discarding it.
- Do not put stale ready sets into state and rely on later cleanup; stale ready results must be revoked at the stale-result branch.
- When a ready thumbnail set is replaced, when the sheet changes, or when the component unmounts, call `browserSheetViewerService.revokePageThumbnails(previousSet)`.
- Never call `URL.createObjectURL`, `URL.revokeObjectURL`, `pdfjs-dist`, canvas APIs, Dexie, or `sheetLibraryRepository` from UI code.
- Do not store thumbnail URLs in React state after they have been revoked.
- Do not revoke full-size artifact object URLs through the thumbnail path.

Suggested local state shape:

```ts
type ThumbnailUiState =
  | { status: "idle" }
  | { status: "loading" }
  | Extract<SheetPageThumbnailSet, { status: "ready" }>
  | {
      status: "error";
      code: SheetViewerErrorCode;
      title: string;
      message: string;
    };
```

This state must represent idle/absent, loading, ready, and thumbnail-only error states. A ready set with `thumbnails: []` remains a ready state with an empty array, not an error.

Keep this state local to the viewer unless an existing local convention points to a tiny hook file. Do not add global context or a thumbnail store.

## Page Selection Rules

- Thumbnail selection uses the existing `currentPage` state in `SheetViewerReady`.
- Render thumbnail buttons only for thumbnails where `1 <= pageNumber <= totalPages`.
- Do not render a visible `Go to page N` button if activating it would navigate to a different page than `N`.
- Keep clamping only as a defensive last guard inside the click handler:

```ts
setCurrentPage(Math.min(totalPages, Math.max(1, thumbnail.pageNumber)));
```

- No free-form page number input.
- No persistence of selected page beyond the current existing viewer behavior.
- No URL query param updates for page selection.
- If thumbnails return page numbers outside the current `totalPages`, ignore those invalid buttons or clamp defensively; do not create a new validation subsystem.

## Accessibility

- Thumbnail rail/drawer should have an accessible label such as `Page thumbnails`.
- Each thumbnail button should have an accessible name like `Go to page 2`.
- The current page thumbnail should expose selected/current state with `aria-current="page"` or `aria-pressed` only if the component is truly a toggle-style button. Prefer `aria-current="page"` for page navigation.
- Buttons must be keyboard reachable in document order after the toolbar trigger/controls.
- Focus outline must remain visible.
- Thumbnail images should have descriptive alt text such as `${sheetName} page ${pageNumber} thumbnail`.
- Loading and error states should use polite status/alert semantics where appropriate without spamming screen readers during ordinary page changes.
- The mobile drawer trigger must expose expanded/collapsed state with `aria-expanded`.

## Implementation Steps

1. Add a small thumbnail loading hook or local effect in `src/components/sheet-practice/viewer/sheet-viewer-experience.tsx`.
2. Build a compact `SheetPageThumbnailRail` or similar local component in the same file first. Split to `src/components/sheet-practice/viewer/sheet-page-thumbnails.tsx` only if the component makes the existing file materially harder to read.
3. Render thumbnail loading/error/empty/ready states inside the viewer surface.
4. Wire thumbnail click/keyboard activation to existing `currentPage` state.
5. Preserve the existing toolbar page label, previous/next buttons, zoom buttons, `sheet-viewer-scroll` test id, full-size renderers, `ReferencePanel`, and `SheetPracticeControls`.
6. Add responsive behavior:
   - desktop rail visible inline;
   - mobile drawer/collapsible trigger visible;
   - no overlap with sheet, reference panel, or practice controls across resize.
7. Add or update focused tests.
8. Run scoped verification, then `typecheck`, scoped lint, and `git diff --check`.

## Allowed Files

Primary allowed implementation files:

- `src/components/sheet-practice/viewer/sheet-viewer-experience.tsx`
- `src/components/sheet-practice/viewer/sheet-page-thumbnails.tsx` only if extracting the component is cleaner than keeping it local
- `src/infrastructure/sheet-viewer/use-browser-sheet-viewer-page-thumbnails.ts` only if a hook file is cleaner and mirrors `use-browser-sheet-viewer-object-urls.ts`

Primary allowed test files:

- `tests/e2e/sheet-viewer.spec.ts`
- a new `tests/e2e/sheet-viewer-thumbnails-ui.spec.ts` if keeping thumbnail UI evidence separate is clearer
- `tests/unit/sheet-viewer-thumbnail-ui.test.tsx` only if the repo already has a practical React component test pattern available during implementation

Allowed supporting files only if needed:

- `src/services/sheet-viewer/index.ts` if an existing type export is missing
- `tests/e2e/fixtures/sheets.ts` only for reusable helper cleanup, not fixture semantics changes
- `tests/unit/architecture-boundaries.test.ts` only to assert UI does not import thumbnail-generation infrastructure, if the assertion stays narrow

## No-Go Files

Do not edit:

- `docs/v1/status.json`
- `src/services/sheet-viewer/service.ts`
- `src/services/sheet-viewer/types.ts`
- `src/infrastructure/sheet-viewer/browser-sheet-viewer-adapter.ts`
- `src/infrastructure/files/sheet-library-repository.ts`
- `src/infrastructure/files/sheet-library-service.ts`
- Dexie schema/version files or any storage migration file
- `package.json`, package lockfiles, or dependency config
- Sheet Library import/orchestrator files
- recording, metronome, analysis, marker, segment, reference playback, or assisted-turning modules

If implementation discovers a real bug in the P5-07 service, stop and report it as a P5-07 follow-up/fix decision instead of smuggling service rewrites into P5-08.

## Acceptance Criteria

1. Opening a real imported multi-page PDF shows visible page thumbnails after the sheet loads.
2. The thumbnail UI uses `loadPageThumbnails(...)`; UI code does not generate thumbnails itself.
3. Selecting page 2 by thumbnail updates the full-size viewer to page 2 and updates the existing `Page 2 of 2` label.
4. The current thumbnail is visibly selected and has accessible current/selected semantics.
5. Thumbnail URLs are revoked through `revokePageThumbnails(...)` when the viewer unmounts, reloads, or switches sheets.
6. A real imported image sheet shows its single thumbnail without breaking image rendering.
7. Thumbnail loading is non-blocking; the full viewer remains usable while thumbnails load.
8. Thumbnail service errors show a compact thumbnail-only error state without replacing the main viewer when `loadSheet(...)` is ready.
9. Desktop, tablet-like, and narrow mobile layouts keep the sheet dominant and do not overlap the reference panel or bottom controls.
10. Existing previous/next page buttons, zoom buttons, PDF/image rendering, reload behavior, and library return continue to pass.
11. No P5-09 page jump, P5-10/P5-11 zoom-pan changes, P5-12 assisted page turning, persistent thumbnail storage, schema migration, new dependency, or `docs/v1/status.json` change is introduced.

## Test Coverage Plan

### Browser E2E

Extend `tests/e2e/sheet-viewer.spec.ts` or add `tests/e2e/sheet-viewer-thumbnails-ui.spec.ts`.

Use real fixtures from `test-fixtures/sheets`:

- `two-page-sheet.pdf`
- `real-sheet.png`

Required PDF UI proof:

1. Clear `SHEET_LIBRARY_DB_NAME`.
2. Import `two-page-sheet.pdf` through the real Sheet Library flow with `importTestSheet(...)`.
3. Open Sheet Practice.
4. Assert the main heading and `Page 1 of 2` are visible.
5. Assert the page thumbnail region or mobile trigger is accessible by role/name.
6. On desktop viewport, assert two thumbnail buttons exist, for example `Go to page 1` and `Go to page 2`.
7. Assert the page 1 thumbnail is current/selected.
8. Click `Go to page 2`.
9. Assert `Page 2 of 2` is visible and the PDF canvas is still rendered/non-empty using the existing canvas helper.
10. Assert the page 2 thumbnail is current/selected.

Required image UI proof:

1. Import `real-sheet.png`.
2. Open Sheet Practice.
3. Assert one thumbnail button exists and the image still renders.

Required responsive proof:

1. Run the PDF case at desktop width, e.g. `1280x800`.
2. Resize to narrow mobile, e.g. `390x844`.
3. Assert the thumbnail trigger/drawer is reachable and selecting page 1 or 2 still works.
4. Assert `sheet-viewer-scroll`, `ReferencePanel` behavior where visible, and `SheetPracticeControls` do not overlap. A bounding-box check similar to existing Sheet Practice integration specs is acceptable.
5. Resize back to desktop and assert the rail is usable without stale overlay state.

Required cleanup proof:

- Deterministic cleanup testing is required through a hook/component/mock test.
- The mock test must cover:
  - ready replacement revokes the previous ready thumbnail set;
  - unmount revokes the current ready thumbnail set;
  - stale ready resolve after sheet change/unmount/cancel is immediately revoked before discard;
  - stale error resolve may be discarded without revocation;
  - error replacement does not revoke full-size artifact URLs.
- E2E may additionally spy on `window.__metronomeSheetViewerService.revokePageThumbnails` if it can be done without product code changes, but E2E cleanup spying is not a substitute for the deterministic mock test.
- If there is no existing React component test pattern, extract a tiny thumbnail-loading hook file for testability. Do not rewrite the P5-07 service to make cleanup easier to test.

### Unit Or Component Tests

Add deterministic hook/component tests for thumbnail URL cleanup. Do not add a new test framework; if no low-friction React component pattern exists, extract a tiny hook file and test it with the repo's existing unit setup or the smallest compatible existing pattern.

Required focused cases:

- stale ready thumbnail load results are immediately revoked after sheet id changes or unmount;
- stale error thumbnail load results are ignored without revocation;
- ready thumbnail sets are revoked on unmount and ready replacement;
- error thumbnail sets render a thumbnail-only error and do not hide the main viewer;
- error replacement does not revoke full-size artifact URLs;
- selected thumbnail gets `aria-current="page"`;
- clicking a thumbnail calls the provided page-selection callback.

The cleanup test should mock `browserSheetViewerService.loadPageThumbnails(...)` and `browserSheetViewerService.revokePageThumbnails(...)` or inject a minimal service-like dependency. It must not call `URL.revokeObjectURL` directly and must not require P5-07 service changes.

### Existing Tests To Preserve

P5-08 should keep these existing tests passing:

- `tests/unit/sheet-viewer-service.test.ts`
- existing `tests/e2e/sheet-viewer.spec.ts` full viewer tests
- existing Sheet Practice layout specs that assert `sheet-viewer-scroll` and controls do not overlap

Do not weaken existing thumbnail service assertions from P5-07.

## Verification Commands For Coding Agent

Adjust scoped file lists to the final implementation:

```powershell
& .\scripts\npm-local.ps1 --% run test:e2e -- tests/e2e/sheet-viewer.spec.ts --project=chromium
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/sheet-viewer-service.test.ts
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint -- src/components/sheet-practice/viewer/sheet-viewer-experience.tsx tests/e2e/sheet-viewer.spec.ts
git diff --check
```

If a new thumbnail component/hook/test/spec file is added, include it in the scoped lint/test command. If the E2E proof is split into a new spec file, run that spec plus the existing `tests/e2e/sheet-viewer.spec.ts` to catch regressions.

Final PR merge gate:

- Before marking the implementation PR ready, run the full local E2E suite in `[chromium]`, not only the scoped thumbnail spec.
- GitHub CI must be green before ready/merge/status closeout.
- `docs/v1/status.json` remains untouched by the implementation PR; status closeout is a separate scheduler/status step after merge readiness is proven.

## Model Gates

- Planning agent: `gpt-5.5`, medium effort, standard-only/no-fast
- Coding agent: `gpt-5.5`, high effort, standard-only/no-fast
- Code review agent: `gpt-5.5`, extra-high effort, standard-only/no-fast
- Verification agent: `gpt-5.5`, high effort, standard-only/no-fast
- Web ChatGPT planning/PR gates: Extra High, not Pro

Reason: this is UI work inside the core Sheet Practice surface with real browser evidence, but it should stay small because thumbnail generation already exists in P5-07.

## Handoff Notes For One Coding Agent

Read only the focused paths:

- `docs/v1/START-HERE.md`
- `docs/v1/implementation-slices/plans/P5-08-viewer-page-thumbnails-ui.md`
- `docs/v1/implementation-slices/plans/P5-07-viewer-page-thumbnails-service.md`
- `docs/v1/implementation-slices/05-library-viewer-upgrade.md`
- `docs/v1/05a-sheet-viewer.md`
- `docs/v1/ui-design.md`
- `docs/v0/design-style-guide.md`
- `src/components/sheet-practice/viewer/sheet-viewer-experience.tsx`
- `src/infrastructure/sheet-viewer/browser-sheet-viewer-service.ts`
- `src/infrastructure/sheet-viewer/use-browser-sheet-viewer-object-urls.ts`
- `src/services/sheet-viewer/types.ts`
- `src/services/sheet-viewer/service.ts`
- `tests/e2e/sheet-viewer.spec.ts`
- `tests/e2e/fixtures/sheets.ts`
- `tests/unit/sheet-viewer-service.test.ts`

Implement P5-08 only. The shortest correct path is to add a small thumbnail loading UI around the existing viewer page state, consume `loadPageThumbnails(...)`, revoke via `revokePageThumbnails(...)`, and prove real PDF/image thumbnail selection in Playwright.

## Split Triggers

Stop and return to planning if implementation appears to require:

- production-code changes above roughly 250-350 LOC excluding tests;
- changes to P5-07 service/adaptor behavior beyond import/export typing;
- a new persistent thumbnail store, schema version, migration, cleanup service, export/import support, or storage usage integration;
- a new dependency or package/lockfile change;
- a new router/page architecture for viewer navigation;
- URL/query-param page state;
- page jump input validation;
- zoom-pan transform refactors;
- assisted page-turn timing, segment-boundary, reference playback, or analysis work;
- a broad rewrite of `SheetViewerExperience`, `PdfSheetRenderer`, `ReferencePanel`, or `SheetPracticeControls`.

## Deferred Work Register

| Deferred work | Future owner |
| --- | --- |
| Page number jump form and invalid input handling | P5-09 |
| Viewer zoom-pan domain state | P5-10 |
| Viewer zoom-pan UI controls and gestures | P5-11 |
| Assisted/manual page turning at segment boundaries | P5-12 |
| Persistent thumbnail cache with cleanup/export/import support | Future reviewed storage/performance slice |
| Import-time thumbnail precomputation | Future reviewed performance slice |
| Thumbnail rail virtualization / progressive rendering for very large PDFs | Future viewer performance slice |
| Thumbnail retry button or advanced per-page fallback UI | Future UI hardening slice if P5-08 evidence shows need |
| Cloud sync, score following, automatic recognition, mistake detection | v2 or future reviewed feature |
