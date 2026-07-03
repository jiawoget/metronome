# P5-11 Viewer Zoom Pan UI Plan

## Slice

- Slice id: P5-11 `viewer-zoom-pan-ui`
- Pack: Pack 5 Library / Viewer Upgrade
- Product feature: `viewer.advanced-zoom-pan`
- Product contract: `docs/v1/05a-sheet-viewer.md`
- Slice file: `docs/v1/implementation-slices/05-library-viewer-upgrade.md`
- Depends on: P5-10 `viewer-zoom-pan-domain`, now verified on main
- Planning model: `gpt-5.5`, medium effort, standard-only/no-fast
- Ponytail mode: full; reuse P5-10 helpers and the existing viewer layout, no new transform engine
- Recommended implementation tier: Tier C, user-facing UI with browser E2E
- Status: planning artifact only; no product code, tests, or `docs/v1/status.json` changed by this plan

## Refined Scope

P5-11 wires P5-10 transform state into the existing Sheet Viewer UI so users can zoom, reset, and pan the visible PDF/image sheet without breaking page thumbnails, page jump, previous/next navigation, or current Sheet Practice controls.

This slice owns:

- replacing the current raw `zoom` state in `SheetViewerReady` with shared `SheetViewerTransform` state;
- visible zoom out, zoom in, zoom level, and reset controls in the existing toolbar;
- using P5-10 helpers for scale changes, reset, page-change reset, pan, and transform clamping;
- measuring the visible viewer viewport and rendered PDF/image content dimensions after render/load and resize;
- applying transform scale and translation to both PDF and image render paths;
- a minimum viable pan interaction that works only when scaled content exceeds the viewport on at least one axis;
- desktop, tablet, and mobile responsive behavior that preserves thumbnail rail/drawer, page jump, reference panel, and bottom practice controls;
- accessibility for new controls and interactions;
- focused unit/component tests if a small control or hook is extracted;
- browser E2E proving real PDF and image zoom/pan/reset across responsive viewports plus invalid/no-overlap cases.

This slice does not own:

- persistence, URL/query state, reload restore, schema/storage/migrations, export/import, cleanup, or per-sheet saved transform;
- artifact loading, Sheet Library import, full-size object URL lifecycle, thumbnail loading/generation, PDF worker setup, or `react-pdf` infrastructure changes;
- P5-12 assisted page turning, score following, automatic page turns, segment-boundary timing, reference playback coupling, recording/metronome coupling, markers, annotations, or overlays;
- fit width, fit page, zoom-to-cursor, pinch zoom, wheel zoom, smooth inertial pan, mini-map, or a gesture framework;
- new dependencies, package/lockfile changes, Playwright config changes, or test framework changes;
- `docs/v1/status.json`.

## Current Code Shape

Relevant existing files:

- `src/components/sheet-practice/viewer/sheet-viewer-experience.tsx`
  - `SheetViewerReady` currently owns `const [zoom, setZoom] = useState(1)`.
  - Toolbar controls call `stepSheetViewerZoom(current, "out" | "in")`.
  - PDF width is `Math.round(760 * zoom)`.
  - Image width is `Math.round(imageBaseWidth * zoom)`.
  - `data-testid="sheet-viewer-scroll"` is the scroll/viewport element and must remain for existing E2E.
  - P5-08 thumbnail rail/drawer and P5-09 page jump both share `currentPage`.
- `src/components/sheet-practice/viewer/sheet-page-thumbnails.tsx`
  - Already owns accessible page thumbnail navigation and current page state.
  - P5-11 must preserve `aria-current="page"` behavior and mobile drawer close behavior.
- `src/components/sheet-practice/viewer/sheet-page-jump.tsx`
  - Already validates typed page jumps and calls `onJumpToPage`.
  - P5-11 must not change page validation semantics.
- `src/services/sheet-viewer/service.ts`
  - P5-10 exports `SHEET_VIEWER_TRANSFORM_LIMITS`, `createSheetViewerTransform`, `setSheetViewerTransformScale`, `panSheetViewerTransform`, `clampSheetViewerTransform`, `resetSheetViewerTransform`, and `resetSheetViewerTransformForPageChange`.
  - Keep zoom range `0.5..2` and step `0.25`.
- `src/services/sheet-viewer/types.ts`
  - P5-10 defines `SheetViewerTransform`, `SheetViewerViewportSize`, `SheetViewerContentSize`, and `SheetViewerTransformBounds`.
- `tests/unit/sheet-viewer-service.test.ts`
  - Already covers P5-10 domain math. P5-11 should add UI-facing tests only if new extracted code needs them.
- `tests/e2e/sheet-viewer.spec.ts`
  - Already covers real PDF/image rendering, thumbnails, page jump, current zoom buttons, scroll, resize, reload, and invalid sheet states.

## UI Contract

Use the existing toolbar. Keep the sheet name, `Page N of M`, previous/next, page jump, thumbnail trigger, and Library link visible and stable.

Required controls:

- `Zoom out` icon button using the existing `Minus` icon and button style.
- `Zoom in` icon button using the existing `Plus` icon and button style.
- visible zoom level text using the transform scale, for example `125%`, with accessible label `Zoom level`.
- new `Reset zoom` control using an existing lucide icon where appropriate, for example `RotateCcw`, with `aria-label="Reset zoom"`.

Control behavior:

- zoom out and zoom in call P5-10 scale helpers, not local clamp math;
- reset calls `resetSheetViewerTransform()` and sets scale/translation to default;
- zoom controls should be disabled at min/max only if this can be done without adding extra local math beyond reading P5-10 constants;
- reset may be disabled at default transform, but it is acceptable to keep it enabled if that avoids fussy state code;
- controls must keep stable dimensions and avoid text clipping on mobile.

Layout behavior:

- desktop keeps the existing inline thumbnail rail and right reference panel.
- tablet/mobile keeps the thumbnail drawer/trigger reachable from the toolbar.
- page jump may wrap with toolbar controls but must remain usable.
- bottom `SheetPracticeControls` must not be covered by thumbnail drawer, panned content, or zoom controls.
- sheet remains the visual priority; no tutorial copy or marketing-style explanations.

## Behavior Contract

Transform state:

- Replace raw `zoom` state with:

```ts
const [transform, setTransform] = useState(() => resetSheetViewerTransform());
```

- Use `transform.scale` wherever the current code uses `zoom`.
- Use `transform.translateX` and `transform.translateY` only for visual pan.
- Reset transform on sheet change through the existing `key={state.sheet.id}` behavior.
- Reset transform on page change with `resetSheetViewerTransformForPageChange()`. This applies to previous/next, thumbnail selection, and valid page jump. Do not carry a panned corner to another page.
- Do not persist transform across reloads, routes, sheets, sessions, or URLs.

Zoom:

- `Zoom in` and `Zoom out` call `setSheetViewerTransformScale(current, nextScale, bounds)` where `nextScale` comes from `stepSheetViewerZoom(current.scale, direction)` or equivalent P5-10 helper composition.
- Clamp translation through P5-10 after every scale change.
- Preserve existing PDF/image visual size expectations: a zoom-in must make the real PDF canvas or image visibly wider.

Pan:

- Minimum viable pan is drag-to-pan inside `sheet-viewer-scroll`.
- Custom drag-pan must be implemented at least for the desktop/mouse pointer path.
- Touch/mobile custom drag-pan may be omitted; mobile responsive proof only requires zoom/reset, thumbnail drawer, page jump, native scroll, and bottom controls not to conflict.
- Pan only starts when measured scaled content exceeds the measured viewport on at least one axis.
- Dragging updates translation through `panSheetViewerTransform(current, delta, bounds)`.
- If content fits an axis, that axis must stay at translation `0`.
- Use pointer events on the viewer/content wrapper. Pointer capture and `preventDefault`-style behavior are allowed only after pan actually starts and overflow exists.
- Pointer up, pointer cancel, lost pointer capture, and component unmount must clear dragging state and release pointer capture if held.
- Do not start pan from interactive toolbar, thumbnail, page jump, reference panel, or bottom controls.
- Do not globally hijack wheel, touchmove, or trackpad scroll.
- Cursor should communicate panning only when pan is available, for example `grab` / `grabbing`; default cursor is fine when content cannot pan.

Minimum fallback if drag gestures become risky:

- Keep zoom/reset UI and native scroll behavior.
- Add no custom pan buttons unless drag-pan cannot be made safe and E2E proves native scroll is insufficient for zoomed content.
- If fallback is used, document it in the PR and defer richer gestures. Do not add a directional pad unless review approves the extra UI surface.

## Measurement And Transform Integration

Use measured DOM sizes; do not touch artifact loading or renderer infrastructure.

Hard invariant:

- `SheetViewerTransformBounds.content` must always be the unscaled/base content size.
- Never pass DOM layout width/height that already includes `Math.round(baseWidth * transform.scale)` into `bounds.content`.
- P5-10 calculates effective size as `content.width * transform.scale` and `content.height * transform.scale`; passing scaled DOM dimensions would double-scale pan bounds.
- Resize and render-load reclamping must preserve this invariant before calling `setSheetViewerTransformScale(...)`, `panSheetViewerTransform(...)`, or `clampSheetViewerTransform(...)`.

Recommended shape:

- Keep `data-testid="sheet-viewer-scroll"` on the scroll/viewport element and attach a ref to it.
- Add `data-testid="sheet-viewer-transform-content"` and a ref to the rendered content wrapper that contains either `PdfSheetRenderer` or `img`.
- After PDF render ready or image load, measure:
  - viewport: `scrollArea.clientWidth` and `scrollArea.clientHeight`;
  - content: unscaled/base wrapper or rendered element width and height only.
- Use `ResizeObserver` where available for the viewport and content wrapper. If the repo already has no resize helper, keep this as a tiny local effect/hook in the viewer file or a small extracted hook only if tests need it.
- Treat invalid/zero/non-finite measurements as absent bounds; P5-10 helpers should reset translation to `0,0` in that case.
- Clamp current transform when bounds change, page changes, PDF render completes, image loads, or viewport resizes.

Important detail:

- Avoid double-scaling. The current code changes PDF/image width based on zoom. P5-11 should choose one simple approach:
  - Preferred: continue calculating rendered width from `transform.scale` and apply translation with CSS transform only. In this approach P5-10 bounds must use base content dimensions and `transform.scale`.
  - Under the preferred width-based approach, PDF base width is the existing base width, currently `760`; PDF base height must come from a 100% render measurement or from the current rendered height divided by `transform.scale`.
  - Under the preferred width-based approach, image base width is `imageBaseWidth`, natural width, or the chosen 100% display width; image base height must likewise come from a 100% image/load measurement or from current rendered height divided by `transform.scale`.
  - Do not use the already scaled PDF/image DOM width and height as `bounds.content`. For example, `Math.round(baseWidth * transform.scale)` is render layout input, not transform bounds content.
  - Acceptable alternative: render at base width and apply CSS `transform: translate(...) scale(...)` to the wrapper. If chosen, verify PDF canvas/image remains crisp enough and layout size/pan bounds are correct.
- Do not change `PdfSheetRenderer`, PDF worker setup, or thumbnail services to get dimensions.

## Allowed Files

Primary allowed implementation files:

- `src/components/sheet-practice/viewer/sheet-viewer-experience.tsx`

Allowed only if they keep the implementation smaller or testable:

- `src/components/sheet-practice/viewer/sheet-viewer-transform-controls.tsx`
- `src/components/sheet-practice/viewer/use-sheet-viewer-transform-measurements.ts`
- `tests/unit/sheet-viewer-transform-controls.test.tsx`
- `tests/unit/sheet-viewer-transform-measurements.test.tsx`
- `tests/e2e/sheet-viewer.spec.ts`

Allowed service/test files only for import/test coverage adjustments:

- `src/services/sheet-viewer/service.ts` only if a tiny missing helper is truly needed; prefer not touching P5-10 domain
- `src/services/sheet-viewer/types.ts` only if a missing exported type is truly needed
- `tests/unit/sheet-viewer-service.test.ts` only if service helper behavior changes

## No-Go Files

Do not edit:

- `docs/v1/status.json`
- `src/infrastructure/sheet-viewer/*`
- `src/infrastructure/files/*`
- `src/components/sheet-practice/viewer/pdf-sheet-renderer.tsx`
- `src/components/sheet-practice/viewer/sheet-page-thumbnails.tsx`, unless a tiny prop/class passthrough is unavoidable
- `src/components/sheet-practice/viewer/sheet-page-jump.tsx`, unless a tiny layout prop/class passthrough is unavoidable
- Dexie schema/version/migration/storage files
- `package.json`, lockfiles, Playwright config, test framework config
- Sheet Library import/orchestrator files
- recording, metronome, reference playback, marker, segment, analysis, assisted-turning, or score-following modules

## Accessibility Expectations

- Every zoom/reset button has a stable accessible name.
- Existing previous/next, page jump, thumbnail, and Library keyboard order remains predictable.
- Reset and zoom controls are keyboard activatable with native buttons.
- Drag-pan is pointer-only enhancement; keyboard users must still be able to zoom/reset and use native scroll/focus without being trapped.
- Do not hijack wheel, trackpad, or touch scroll globally.
- Focus outline remains visible on toolbar controls and thumbnail buttons.
- Cursor changes do not replace accessible labels.
- Screen readers should hear zoom level through the existing `aria-label="Zoom level"` text.
- If pan state text is added, keep it visually minimal and avoid chatty live regions. Prefer no extra status region unless tests show ambiguity.

## Acceptance Criteria

1. Sheet Viewer uses shared P5-10 transform state instead of raw local `zoom` state.
2. Zoom in/out controls still work for real imported PDFs and images and display the correct zoom percentage.
3. A visible reset control returns scale and translation to `100%`, `0,0`.
4. Panning works when zoomed content is larger than the viewport and clamps at content edges.
5. Panning does not move content on an axis where the scaled content fits inside the viewport.
6. Page changes through previous/next, thumbnails, and page jump reset transform to default.
7. Resize and renderer load events reclamp transform without `NaN`, offscreen content loss, or console errors.
8. Existing page thumbnails, page jump validation, previous/next navigation, PDF/image rendering, reload behavior, and invalid sheet states continue to pass.
9. Desktop, tablet-like, and narrow mobile layouts keep the sheet dominant and avoid overlap with thumbnail rail/drawer, reference panel, and bottom practice controls.
10. Implementation does not touch artifact loading, PDF worker, thumbnail services, persistence/storage, assisted page turning, new dependencies, package/lockfiles, or `docs/v1/status.json`.

## Test Plan

### Unit Or Component Tests

Do not add a test framework. Add tests only if implementation extracts a component or hook.

If controls are extracted, cover:

- renders `Zoom out`, `Zoom in`, `Reset zoom`, and zoom level with accessible names;
- clicking zoom in/out calls the supplied callbacks;
- reset callback is wired;
- min/max disabled behavior if implemented;
- default transform still displays `100%`.

If measurement/pan logic is extracted, cover:

- missing/zero measurements produce no pan and reset translation through P5-10 helpers;
- viewport/content resize reclamps stale translation;
- content fitting one axis blocks that axis only;
- pointer drag delta is converted to `panSheetViewerTransform(...)` input without non-finite values.

Keep P5-10 domain math in `tests/unit/sheet-viewer-service.test.ts`; do not duplicate all domain cases in UI tests.

### Browser E2E

Extend `tests/e2e/sheet-viewer.spec.ts` unless splitting a focused spec is clearly smaller.

Required PDF proof:

1. Clear `SHEET_LIBRARY_DB_NAME`.
2. Import `two-page-sheet.pdf` through `importTestSheet(...)`.
3. Open Sheet Practice at desktop viewport, for example `1280x800`.
4. Assert heading, `Page 1 of 2`, thumbnail navigation, and page jump are visible.
5. Assert initial zoom level is `100%`.
6. Click `Zoom in` twice and assert zoom level reaches `150%` and the PDF canvas remains non-empty.
7. Locate `data-testid="sheet-viewer-transform-content"` and record its CSS `transform` value and bounding box.
8. Drag the zoomed sheet content horizontally or vertically where overflow exists.
9. Assert the wrapper's CSS `transform` or bounding box changes in the expected pan direction without exceeding P5-10 clamp bounds.
10. At `100%` zoom, or on any axis where scaled content fits the viewport, drag and assert that axis does not gain translation.
11. Click `Reset zoom` and assert zoom level returns to `100%` and the wrapper transform returns to default, for example no translation and no residual scale beyond the default render width.
12. Jump to page 2 by page input and assert `Page 2 of 2`, current thumbnail, `100%` zoom, and wrapper transform default.
13. Navigate back with previous/thumbnail and assert transform remains default.

If implementation deliberately uses fallback/native scroll instead of transform pan:

- The PR must explicitly state that fallback and why custom transform pan was not used.
- E2E must prove native scroll is the deliberate pan mechanism by asserting scroll offsets change after zoom and reset/page-change behavior is still default.
- Do not use a loose assertion such as "transformed content moved or scroll/pan state changed" to pass both designs.

Required image proof:

1. Import `real-sheet.png`.
2. Assert image renders and `Page 1 of 1` remains visible.
3. Zoom in and assert the image client width increases.
4. Pan only if the image overflows after zoom; otherwise assert dragging does not create a bad transform.
5. Reset and assert `100%` plus visible image.

Responsive proof:

- Repeat the core PDF zoom/reset path at a narrow viewport, for example `390x844`.
- Custom touch/mobile drag-pan is not required.
- Open and close the thumbnail drawer after zoom/reset and assert it does not block page jump or bottom controls.
- Resize from mobile to desktop and assert the rail is usable, current thumbnail state is correct, and no stale overlay remains.
- Include the existing `expectViewerControlsDoNotOverlap(...)` style check for `sheet-viewer-scroll` and `sheet-practice-controls`.

Invalid/no-overlap cases:

- Try pan at `100%` when content fits and assert `sheet-viewer-transform-content` does not gain unexpected translation, console error, or trapped gesture.
- Try pan on an axis where content fits and assert that axis stays at translation `0`.
- Try zoom/reset after an invalid page jump error and assert the page error remains recoverable.
- Existing missing id, unknown sheet, missing artifact, bad PDF, and bad image cases must keep passing and should not render transform controls in error states.

### Existing Tests To Preserve

Keep these passing:

- `tests/unit/sheet-viewer-service.test.ts`
- `tests/unit/sheet-viewer-page-jump.test.tsx` if present in the current branch
- `tests/unit/sheet-viewer-thumbnails-ui.test.tsx`
- `tests/e2e/sheet-viewer.spec.ts`

Do not weaken existing assertions for real PDF canvas rendering, image decode, thumbnail URL behavior, page jump invalid input, reload default page behavior, or layout overlap.

## Verification Commands For Coding Agent

Adjust scoped file lists to the final implementation:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/sheet-viewer-service.test.ts tests/unit/sheet-viewer-thumbnails-ui.test.tsx tests/unit/sheet-viewer-page-jump.test.tsx
& .\scripts\npm-local.ps1 --% run test:e2e -- tests/e2e/sheet-viewer.spec.ts --project=chromium
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint -- src/components/sheet-practice/viewer/sheet-viewer-experience.tsx src/components/sheet-practice/viewer/sheet-page-thumbnails.tsx src/components/sheet-practice/viewer/sheet-page-jump.tsx src/services/sheet-viewer/service.ts src/services/sheet-viewer/types.ts tests/unit/sheet-viewer-service.test.ts tests/unit/sheet-viewer-thumbnails-ui.test.tsx tests/unit/sheet-viewer-page-jump.test.tsx tests/e2e/sheet-viewer.spec.ts
git diff --check
```

If new transform control/hook/test files are added, include them in scoped unit/lint commands.

Final PR ready/merge gate:

- Before marking the implementation PR ready or merging, run the full local E2E suite and pass:

```powershell
& .\scripts\npm-local.ps1 --% run test:e2e
```

- GitHub CI must also pass before ready/merge/status closeout.
- The implementation PR must not edit `docs/v1/status.json`.

## Model Gates

- Planning agent: `gpt-5.5`, medium effort, standard-only/no-fast
- Coding agent: `gpt-5.5`, high effort, standard-only/no-fast
- Code review agent: `gpt-5.5`, extra-high effort, standard-only/no-fast
- Verification agent: `gpt-5.5`, high effort, standard-only/no-fast
- Web ChatGPT planning/PR reviews: Extra High, not Pro

Reason: P5-11 is compact UI work but sits inside the core Sheet Practice viewer and needs real browser evidence across PDF, image, and responsive layouts.

## Handoff Notes For One Coding Agent

Read only the focused paths:

- `docs/v1/START-HERE.md`
- `docs/v1/implementation-slices/plans/P5-11-viewer-zoom-pan-ui.md`
- `docs/v1/implementation-slices/plans/P5-10-viewer-zoom-pan-domain.md`
- `docs/v1/implementation-slices/plans/P5-09-viewer-page-jump.md`
- `docs/v1/implementation-slices/plans/P5-08-viewer-page-thumbnails-ui.md`
- `docs/v1/implementation-slices/05-library-viewer-upgrade.md`
- `docs/v1/05a-sheet-viewer.md`
- `docs/v1/ui-design.md`
- `docs/v0/design-style-guide.md`
- `src/components/sheet-practice/viewer/sheet-viewer-experience.tsx`
- `src/components/sheet-practice/viewer/sheet-page-thumbnails.tsx`
- `src/components/sheet-practice/viewer/sheet-page-jump.tsx`
- `src/services/sheet-viewer/service.ts`
- `src/services/sheet-viewer/types.ts`
- `tests/unit/sheet-viewer-service.test.ts`
- `tests/e2e/sheet-viewer.spec.ts`

Implement P5-11 only. The shortest correct path is to replace `zoom` with P5-10 `transform`, keep the current toolbar and render paths, add one reset button, measure viewport/content with DOM refs, and add guarded drag-to-pan only inside the viewer when zoomed content overflows.

## Split Triggers

Stop and return to planning if implementation appears to require:

- production-code changes above roughly 250-350 LOC excluding tests;
- changing `PdfSheetRenderer`, PDF worker setup, artifact object URL lifecycle, thumbnail services, or Sheet Library import;
- persistence, URL state, schema/storage/migration, cleanup, export/import, or package/lockfile changes;
- a new global store, context provider, event bus, transform engine, gesture framework, or dependency;
- pinch zoom, wheel zoom, zoom-to-cursor, fit-width/page modes, mini-map, page-specific transform memory, or multi-touch handling;
- broad rewrites of `SheetViewerExperience`, `ReferencePanel`, `SheetPracticeControls`, thumbnails, or page jump;
- assisted page turning, score following, segment-boundary timing, reference playback, recording/metronome coupling, markers, annotations, or analysis.

## Deferred Work Register

| Deferred work | Future owner |
| --- | --- |
| Pointer-anchored zoom / zoom-to-cursor | Future viewer interaction hardening if users need it |
| Fit width / fit page controls | Future reviewed viewer ergonomics slice |
| Pinch zoom, wheel zoom, and inertial pan | Future gesture hardening slice after basic UI proves stable |
| Persisted per-sheet transform or URL transform state | Future reviewed navigation/persistence slice |
| Page-specific transform memory | Future reviewed viewer ergonomics slice |
| Directional pan controls | Only if drag/native scroll evidence is insufficient |
| Assisted/manual page turning at segment boundaries | P5-12 |
| Cloud sync, score following, automatic recognition, mistake detection | v2 or future reviewed feature |
