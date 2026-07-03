# P5-10 Viewer Zoom Pan Domain Plan

## Slice

- Slice id: P5-10 `viewer-zoom-pan-domain`
- Pack: Pack 5 Library / Viewer Upgrade
- Product feature: `viewer.advanced-zoom-pan`
- Product contract: `docs/v1/05a-sheet-viewer.md`
- Slice file: `docs/v1/implementation-slices/05-library-viewer-upgrade.md`
- Planning model: `gpt-5.5`, medium effort, standard-only/no-fast
- Ponytail mode: full; extend the existing zoom helper instead of creating parallel viewer math
- Recommended implementation tier: Tier A, pure logic/types with focused unit tests
- Status: planning artifact only; no product code, tests, or `docs/v1/status.json` changed by this plan

## Refined Scope

P5-10 defines the shared Sheet Viewer transform domain for zoom and pan. It prepares P5-11 UI controls and gestures without adding any visible behavior in this slice.

This slice owns:

- reusable transform state/types for scale and translation;
- validation and normalization for non-finite, invalid, and out-of-range transform input;
- pure helper functions for zoom step, set-scale, reset, pan, page-change, viewport/content sizing, and translation clamp;
- unit tests for the helper behavior and edge cases;
- one narrow integration-style service test if needed to prove exported helpers can replace the current raw zoom helper path.

This slice does not own:

- UI controls, buttons, sliders, pinch/wheel/drag gesture handlers, cursor styling, touch behavior, or scroll anchoring in the component;
- persistence, URL/query state, reload restore, schema/storage/migration, export/import, or cleanup behavior;
- PDF/image artifact loading, thumbnail generation, PDF worker setup, `react-pdf` rendering, or Sheet Library import;
- assisted page turning, score following, segment-boundary timing, reference playback coupling, overlays, annotations, or marker logic;
- new dependencies or package/lockfile changes;
- `docs/v1/status.json`.

## Current Code Shape

Relevant existing files:

- `src/services/sheet-viewer/service.ts`
  - Already exports `clampSheetViewerZoom(...)` and `stepSheetViewerZoom(...)`.
  - Current zoom constants are `min: 0.5`, `max: 2`, `step: 0.25`.
  - P5-10 must reuse/extend these helpers and constants. Do not create a second zoom business-logic path in UI code.
- `src/services/sheet-viewer/types.ts`
  - Existing service/viewer type home. Add transform types here only if the type is shared outside `service.ts`.
- `src/services/sheet-viewer/index.ts`
  - Already re-exports service and types.
- `src/components/sheet-practice/viewer/sheet-viewer-experience.tsx`
  - Currently stores `const [zoom, setZoom] = useState(1)`.
  - Current buttons call `stepSheetViewerZoom(current, "out" | "in")`.
  - P5-10 should not wire the new transform state into this component beyond a tiny compile/test-driven import need. P5-11 owns UI integration.
- `tests/unit/sheet-viewer-service.test.ts`
  - Already covers page label formatting and current zoom clamp/step behavior. Extend this file first.
- `tests/e2e/sheet-viewer.spec.ts`
  - Already proves current PDF/image zoom buttons in browser. P5-10 should not require new E2E because there is no user-facing change.

## Domain Contract

Keep the constants boring and explicit:

```ts
export const SHEET_VIEWER_TRANSFORM_LIMITS = {
  minScale: 0.5,
  maxScale: 2,
  scaleStep: 0.25
} as const;
```

Preferred types:

```ts
export type SheetViewerTransform = {
  scale: number;
  translateX: number;
  translateY: number;
};

export type SheetViewerViewportSize = {
  width: number;
  height: number;
};

export type SheetViewerContentSize = {
  width: number;
  height: number;
};
```

Preferred helpers:

```ts
export function createSheetViewerTransform(input?: Partial<SheetViewerTransform>): SheetViewerTransform;
export function clampSheetViewerZoom(value: number): number;
export function stepSheetViewerZoom(current: number, direction: "in" | "out"): number;
export function setSheetViewerTransformScale(
  transform: SheetViewerTransform,
  scale: number,
  bounds?: SheetViewerTransformBounds
): SheetViewerTransform;
export function panSheetViewerTransform(
  transform: SheetViewerTransform,
  delta: { x: number; y: number },
  bounds?: SheetViewerTransformBounds
): SheetViewerTransform;
export function clampSheetViewerTransform(
  transform: SheetViewerTransform,
  bounds?: SheetViewerTransformBounds
): SheetViewerTransform;
export function resetSheetViewerTransform(): SheetViewerTransform;
export function resetSheetViewerTransformForPageChange(): SheetViewerTransform;
```

Use an additional `SheetViewerTransformBounds` type if needed:

```ts
export type SheetViewerTransformBounds = {
  viewport: SheetViewerViewportSize;
  content: SheetViewerContentSize;
};
```

Rules:

- Scale starts at `1`.
- Translation starts at `{ translateX: 0, translateY: 0 }`.
- `clampSheetViewerZoom(...)` keeps the existing `0.5..2` range and should reject non-finite input by returning `1`.
- `clampSheetViewerZoom(...)` does only clamp plus non-finite fallback. It must not round finite in-range values.
- P5-10 must not change existing finite clamp behavior. For example, `clampSheetViewerZoom(1.234)` must still return `1.234`.
- `stepSheetViewerZoom(...)` keeps the existing `0.25` step and should route through `clampSheetViewerZoom(...)`.
- If `current` passed to `stepSheetViewerZoom(...)` is non-finite, treat it as `1` before stepping.
- Do not silently introduce more zoom levels, "fit width", "fit page", smooth zoom, or user-configurable min/max in this slice.
- Round scale to two decimals only after stepping in `stepSheetViewerZoom(...)` or explicitly setting scale in `setSheetViewerTransformScale(...)`.

## Translation And Clamp Rules

Translation is measured in CSS pixels relative to the centered rendered content. Positive `translateX` moves content right; positive `translateY` moves content down.

Clamp semantics:

- Calling `clampSheetViewerTransform(transform)` without bounds is equivalent to having no measurable viewport/content. It should normalize/clamp scale and reset translation to `0,0`.
- If viewport or content width/height is missing, zero, negative, or non-finite, return a normalized transform with scale clamped and translation reset to `0,0`.
- Effective content size is `content.width * scale` and `content.height * scale`.
- If effective content width is less than or equal to viewport width, clamp `translateX` to `0`.
- If effective content height is less than or equal to viewport height, clamp `translateY` to `0`.
- If effective content width is larger than viewport width, max horizontal pan is `(effectiveWidth - viewport.width) / 2`.
- If effective content height is larger than viewport height, max vertical pan is `(effectiveHeight - viewport.height) / 2`.
- Clamp translation to `[-maxPan, maxPan]` for each axis.
- Non-finite translation input becomes `0`.
- Non-finite pan deltas become `0`.
- Pan results must always pass through `clampSheetViewerTransform(...)`.

Scale changes:

- Calling `setSheetViewerTransformScale(transform, scale)` without bounds should set, round, and clamp scale, then reset translation to `0,0`.
- Calling `panSheetViewerTransform(transform, delta)` without bounds should not pan. It should return normalized/clamped scale with translation reset to `0,0`.
- Changing scale preserves existing translation when still valid.
- Changing scale reclamps translation against the new effective content size.
- If scaling down makes content fit on an axis, that axis translation returns to `0`.
- No zoom-around-pointer math in P5-10. P5-11 may add pointer anchoring only by extending this helper through a reviewed follow-up.

Reset and page-change behavior:

- `resetSheetViewerTransform()` returns `{ scale: 1, translateX: 0, translateY: 0 }`.
- Page change resets transform to default for P5-10/P5-11 first pass. This avoids carrying a zoomed/panned corner from page 1 to a differently sized page 2.
- Do not persist transform across sheets, reloads, routes, or sessions.

PDF/image reuse:

- The transform domain must be artifact-agnostic and work for both PDF canvas dimensions and image dimensions.
- Do not import PDF.js, `react-pdf`, image decode helpers, thumbnail service, or artifact repository into the transform helper.
- P5-11 can feed actual viewport/content sizes from the rendered PDF/image container.

## Expected Files And Areas

Primary allowed implementation files:

- `src/services/sheet-viewer/service.ts`
- `src/services/sheet-viewer/types.ts` only if shared exported types are cleaner there
- `src/services/sheet-viewer/index.ts` only if exports need a tiny adjustment

Primary allowed test files:

- `tests/unit/sheet-viewer-service.test.ts`

Allowed supporting files only if strictly needed:

- `src/components/sheet-practice/viewer/sheet-viewer-experience.tsx` only for a tiny compile-preserving import/use adjustment if the existing helper signature changes. Prefer avoiding this in P5-10.

No-go files:

- `docs/v1/status.json`
- `src/infrastructure/sheet-viewer/*`
- `src/infrastructure/files/*`
- `src/components/sheet-practice/viewer/pdf-sheet-renderer.tsx`
- `src/components/sheet-practice/viewer/sheet-page-thumbnails.tsx`
- `src/components/sheet-practice/viewer/sheet-page-jump.tsx`
- Dexie schema/version/migration/storage files
- `package.json`, lockfiles, test framework config, Playwright config
- recording, metronome, reference playback, marker, segment, analysis, assisted-turning, thumbnail generation, or import modules

## Acceptance Criteria

1. Existing `clampSheetViewerZoom(...)` and `stepSheetViewerZoom(...)` behavior is preserved for finite values.
2. Zoom constants remain `minScale = 0.5`, `maxScale = 2`, and `scaleStep = 0.25`.
3. Non-finite scale input normalizes to a safe default instead of returning `NaN` or `Infinity`.
4. A default transform is `{ scale: 1, translateX: 0, translateY: 0 }`.
5. Setting scale clamps to `0.5..2`, rounds to two decimals, and reclamps translation.
6. Panning clamps translation based on viewport size, content size, and current scale.
7. Content that fits within the viewport on an axis cannot retain pan on that axis.
8. Invalid, zero, negative, or non-finite viewport/content sizes reset translation to `0,0` while preserving valid clamped scale.
9. Reset and page-change helpers return the default transform.
10. The transform helpers are pure and shared by PDF and image viewer paths without importing artifact loading, PDF worker, thumbnail, or UI code.
11. No UI controls, gestures, persistence, URL state, schema/storage/migration, artifact loading, thumbnail, or PDF worker changes are introduced.

## Test Coverage Plan

### Unit Tests

Extend `tests/unit/sheet-viewer-service.test.ts`.

Required cases:

- `clampSheetViewerZoom(0.1)` returns `0.5`.
- `clampSheetViewerZoom(3)` returns `2`.
- `clampSheetViewerZoom(1.234)` returns `1.234`, proving finite in-range clamp behavior does not round.
- `clampSheetViewerZoom(Number.NaN)`, `Infinity`, and `-Infinity` return `1`.
- `stepSheetViewerZoom(1, "in")` returns `1.25`.
- `stepSheetViewerZoom(1, "out")` returns `0.75`.
- stepping beyond min/max clamps to `0.5` / `2`.
- stepping from non-finite current value treats current as `1`.
- `createSheetViewerTransform({ scale: Number.NaN, translateX: Infinity, translateY: Number.NaN })` normalizes to default-safe values.
- `createSheetViewerTransform({ translateX: 10 })` and other partial inputs fill missing fields with defaults.
- default/reset/page-change transform returns scale `1` and translation `0,0`.
- setting scale below/above bounds clamps to `0.5` / `2`.
- setting scale to a decimal rounds to two places.
- `setSheetViewerTransformScale(transform, Number.NaN, bounds)` and `Infinity` fall back safely.
- `setSheetViewerTransformScale(transform, scale)` without bounds sets/rounds/clamps scale and resets translation to `0,0`.
- `clampSheetViewerTransform(transform)` without bounds normalizes/clamps scale and resets translation to `0,0`.
- `panSheetViewerTransform(transform, delta)` without bounds cannot pan and returns normalized/clamped scale plus `0,0` translation.
- panning within bounds preserves translation.
- panning beyond bounds clamps to the calculated max pan.
- when scaled content fits horizontally, `translateX` becomes `0`.
- when scaled content fits vertically, `translateY` becomes `0`.
- when content is larger only on one axis, only that axis can pan.
- non-finite translation and pan deltas normalize to `0`.
- invalid viewport/content dimensions reset translation to `0,0`.
- scale change preserves current translation when that translation remains inside the new scale bounds.
- a scale change that makes content fit reclamps stale translation back to `0`.

Do not add a new test framework. Do not add browser-only mocks for this slice.

### Integration And E2E

No new E2E is required for P5-10 because the slice has no visible UI behavior.

Required preservation checks:

- Existing `tests/e2e/sheet-viewer.spec.ts` should still pass in the coding PR because it covers current PDF/image zoom buttons and rendering.
- If the coding PR changes the implementation of `clampSheetViewerZoom(...)` or `stepSheetViewerZoom(...)`, the coding agent must run the scoped Sheet Viewer E2E and pass:

```powershell
& .\scripts\npm-local.ps1 --% run test:e2e -- tests/e2e/sheet-viewer.spec.ts --project=chromium
```

- P5-11 will own browser proof for pan gestures/controls and responsive transform behavior.

## Verification Commands For Coding Agent

Adjust scoped file lists to the final implementation:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/sheet-viewer-service.test.ts
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint -- src/services/sheet-viewer/service.ts src/services/sheet-viewer/types.ts tests/unit/sheet-viewer-service.test.ts
git diff --check
```

If `sheet-viewer-experience.tsx` changes, include it in scoped lint and also run:

```powershell
& .\scripts\npm-local.ps1 --% run test:e2e -- tests/e2e/sheet-viewer.spec.ts --project=chromium
```

Final PR merge gate:

- Before marking the implementation PR ready or merging it, run the full local E2E suite and pass:

```powershell
& .\scripts\npm-local.ps1 --% run test:e2e
```

- GitHub CI must also be green before ready/merge/status closeout.
- `docs/v1/status.json` remains untouched by the implementation PR.

## Model Gates

- Planning agent: `gpt-5.5`, medium effort, standard-only/no-fast
- Coding agent: `gpt-5.5`, high effort, standard-only/no-fast
- Code review agent: `gpt-5.5`, extra-high effort, standard-only/no-fast
- Verification agent: `gpt-5.5`, high effort, standard-only/no-fast
- Web ChatGPT planning/PR gates: Extra High, not Pro

Reason: P5-10 is pure domain math and validation, but this repo's current fixed Pack 5 flow uses the same high-confidence model gate for implementation, review, verification, and web ChatGPT PR review before merge.

## Handoff Notes For One Coding Agent

Read only the focused paths:

- `docs/v1/START-HERE.md`
- `docs/v1/implementation-slices/plans/P5-10-viewer-zoom-pan-domain.md`
- `docs/v1/implementation-slices/plans/P5-09-viewer-page-jump.md`
- `docs/v1/implementation-slices/05-library-viewer-upgrade.md`
- `docs/v1/05a-sheet-viewer.md`
- `src/services/sheet-viewer/service.ts`
- `src/services/sheet-viewer/types.ts`
- `src/services/sheet-viewer/index.ts`
- `src/components/sheet-practice/viewer/sheet-viewer-experience.tsx`
- `tests/unit/sheet-viewer-service.test.ts`
- `tests/e2e/sheet-viewer.spec.ts` only if UI code changes

Implement P5-10 only. The shortest correct path is to extend the current `SHEET_VIEWER_ZOOM`, `clampSheetViewerZoom(...)`, and `stepSheetViewerZoom(...)` logic into a small pure transform helper set, then cover the math with unit tests. Do not add a transform service class, React hook, global store, context provider, gesture subsystem, or persistence layer.

## Split Triggers

Stop and return to planning if implementation appears to require:

- production-code changes above roughly 120-180 LOC excluding tests;
- new UI controls, gesture handlers, wheel/pinch/drag behavior, or visual layout work;
- changing PDF/image renderer internals or artifact loading;
- a new persistent transform store, URL state, schema version, migration, export/import, or cleanup path;
- a new dependency or package/lockfile change;
- a generic geometry/math package, viewer engine, event bus, reducer framework, or abstraction with one implementation;
- changing thumbnail generation, page jump, assisted page turning, reference playback, recording, marker, segment, or analysis modules.

## Deferred Work Register

| Deferred work | Future owner |
| --- | --- |
| Zoom controls wired to full transform state | P5-11 |
| Drag/pan, wheel, pinch, keyboard shortcuts, and cursor behavior | P5-11 |
| Responsive/mobile gesture proof and overlap checks | P5-11 |
| Pointer-anchored zoom or zoom-to-cursor | Future viewer interaction hardening if P5-11 proves need |
| Fit width / fit page modes | Future reviewed viewer ergonomics slice |
| Persisted per-sheet transform or URL transform state | Future reviewed navigation/persistence slice |
| Page-specific transform memory | Future reviewed viewer ergonomics slice |
| Assisted/manual page turns at segment boundaries | P5-12 |
| Cloud sync, score following, automatic recognition, mistake detection | v2 or future reviewed feature |
