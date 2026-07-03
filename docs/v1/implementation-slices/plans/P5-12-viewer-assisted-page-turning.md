# P5-12 Viewer Assisted Page Turning Plan

## Slice

- Slice id: P5-12 `viewer-assisted-page-turning`
- Pack: Pack 5 Library / Viewer Upgrade
- Product feature: `viewer.assisted-page-turning`
- Product contract: `docs/v1/05a-sheet-viewer.md` and `docs/v1/remaining-feature-contracts.md#viewer.assisted-page-turning`
- Slice file: `docs/v1/implementation-slices/05-library-viewer-upgrade.md`
- Planning model: `gpt-5.5`, medium effort, standard-only/no-fast
- Ponytail mode: full; reuse current viewer page state, segment selection, and measure-grid snapshot data
- Recommended implementation tier: Tier C, focused user-facing UI with deterministic browser E2E
- Status: planning artifact only; no product code, tests, commit, or `docs/v1/status.json` change

## Refined Scope

P5-12 adds user-controlled assisted page turning for multi-page Sheet Practice. The first version is deliberately manual: the user enables assisted turning, arms one turn from the selected segment boundary/timing data, and the viewer advances one page when that timer completes.

This slice owns:

- a compact enable/disable control for assisted page turning in the Sheet Viewer surface;
- a visible manual arm/start action for the selected segment timing cue;
- advancing from the current page to the next page when the armed timer reaches the selected segment boundary duration;
- manual override behavior: previous/next, thumbnails, page jump, disable, sheet change, and segment change cancel any pending assisted turn;
- disabled/unavailable states when there is no selected segment, no usable segment timing, a one-page sheet, or the viewer is already on the last page;
- deterministic unit/component tests and Playwright E2E for enable, arm, timed turn, manual override, disable, last-page/no-segment cases, and preservation of existing viewer behavior.

This slice does not own:

- automatic score following;
- audio-based page turning, microphone input, metronome audio inspection, reference playback analysis, waveform/peak/onset analysis, or any call into audio analysis modules;
- automatic PDF recognition, page-region recognition, OCR, barline detection, score position tracking, overlays, annotations, markers, or drawing on the sheet;
- persistence, URL/query state, reload restore, schema/storage/migrations, export/import, cleanup, or per-sheet saved assisted-turn settings;
- artifact loading, PDF worker setup, thumbnail generation/loading, Sheet Library import, or PDF/image renderer infrastructure;
- changing P5-09 page jump validation, P5-10 transform math, or P5-11 pan/zoom bounds except preserving their existing reset-on-page-change behavior;
- package/lockfile changes, test framework changes, Playwright config changes, or `docs/v1/status.json`.

## Current Code Shape

Relevant existing files:

- `src/components/sheet-practice/viewer/sheet-viewer-experience.tsx`
  - Owns `currentPage`, `goToPage(...)`, thumbnails, page jump, previous/next, zoom/pan transform, and bottom `SheetPracticeControls`.
  - P5-12 should reuse `goToPage(...)` for assisted turns so thumbnails, `Page N of M`, PDF/image render, and P5-11 transform reset stay consistent.
  - P5-11 added `Reset zoom`, `sheet-viewer-transform-content`, and page-change transform reset. P5-12 must preserve these.
- `src/components/sheet-practice/controls/sheet-practice-controls.tsx`
  - Owns `selectedTempoSegment` and receives selected segment changes from `PracticeSegmentSelectorPanel`.
  - This is the smallest seam for P5-12: add an optional prop that reports the currently selected `PracticeSegment | null` up to the viewer.
- `src/components/sheet-practice/controls/types.ts`
  - Add the optional selected-segment callback type here if needed.
- `src/components/sheet-practice/segments/practice-segment-selector-panel.tsx`
  - Already exposes `onSelectedSegmentChange`.
  - Do not rewrite segment loading, editing, validation, or persistence.
- `src/domain/practice/segments/index.ts`
  - `PracticeSegment` includes `grid.measureGridSnapshot`.
  - `getPracticeSegmentRangeMs(...)` and `createSheetRecordingSegmentContext(...)` already derive timing from measure-grid data.
- `src/services/sheet-viewer/service.ts` and `src/services/sheet-viewer/types.ts`
  - Viewer service/type home. Add a tiny pure assisted-turn helper here only if it keeps UI smaller and testable.
- `tests/e2e/sheet-viewer.spec.ts`
  - Existing real PDF/image viewer E2E. Extend or split a focused assisted-turn spec.
- Existing unit tests:
  - `tests/unit/practice-segment-domain.test.ts` covers segment timing helpers.
  - `tests/unit/sheet-viewer-measure-grid-timestamp.test.tsx` shows the viewer can pass props into `SheetPracticeControls` with mocks.
  - `tests/unit/sheet-practice-controls.test.tsx` already mocks `PracticeSegmentSelectorPanel` selection behavior.

## User And UI Contract

Add a small assisted page-turning control near existing viewer controls, not in the bottom transport as a separate feature surface.

Required UI:

- A toggle or checkbox with accessible name `Assisted page turning`.
- A compact status label that does not claim score following, for example `Manual segment timer`.
- A button with accessible name such as `Arm assisted page turn`.
- A cancel state/action while armed, for example `Cancel assisted page turn`.
- A concise unavailable message when no selected segment/timing is available, for example `Select a segment to arm a timed page turn.`

Behavior:

- Disabled by default on every page load and every sheet open.
- Enabling does not immediately start a timer.
- Arming is user-controlled and schedules exactly one turn.
- The turn advances at most one page: `currentPage + 1`, clamped to `totalPages`.
- If `currentPage >= totalPages`, arming is unavailable and no timer runs.
- If there is no selected segment, the segment does not belong to this sheet, or segment timing is invalid, arming is unavailable and no timer runs.
- If the user disables assisted turning, changes page manually, changes selected segment, changes sheet, or reloads, any pending turn is canceled.
- Manual page navigation remains authoritative. Previous/next, thumbnails, and page jump must continue to work whether assisted turning is enabled, armed, or canceled.
- A completed assisted turn resets zoom/pan exactly like any other page change because it must call the existing viewer page navigation path.

No product language may imply automatic score following. Avoid phrases like `follow score`, `listening`, `recognize page`, `detect measure`, or `automatic page turn from audio`.

## Assisted Turn Rule

Use one minimal rule for P5-12:

```text
When enabled and armed for the selected segment:
  wait for selectedSegment measure range duration
  if still enabled, still armed, same sheet, same selected segment, and not on last page
  then goToPage(currentPage + 1)
```

Duration source:

- Preferred: use existing segment timing helpers from `@/domain/practice`.
- The duration is `measureRangeMs.endMs - measureRangeMs.startMs` from the selected segment's own measure-grid snapshot.
- If using `createSheetRecordingSegmentContext(segment)` is smaller, use its `measureRangeMs` rather than duplicating range math.
- Reject non-finite, zero, negative, or missing durations.
- Do not look at microphone input, metronome audio, reference audio, waveform data, PDF content, or screen position.

Manual timing semantics:

- The user is responsible for pressing `Arm assisted page turn` at the point they want the segment timer to begin.
- This is "manual/segment-boundary assisted turning", not score following.
- Do not try to infer when the performer reaches the segment start.

## Implementation Boundaries

Preferred implementation:

1. In `SheetViewerReady`, add local assisted-turn state:
   - `enabled: boolean`;
   - `armedSegmentId: string | null`;
   - `armedTimeoutId` in a ref;
   - optional concise status string.
2. Lift the selected segment from `SheetPracticeControls` to `SheetViewerReady` via a new optional prop such as `onSelectedSegmentChange?: (segment: PracticeSegment | null) => void`.
3. In `SheetPracticeControls`, call the new optional prop inside the existing `handleSelectedSegmentChange(...)` after sheet ownership validation.
4. Compute an armable segment duration using a tiny helper.
5. Add a small control component only if `sheet-viewer-experience.tsx` becomes hard to read.
6. When the timer fires, call existing `goToPage(Math.min(totalPages, currentPage + 1))`.

Keep the timer boring:

- Use `window.setTimeout` / `window.clearTimeout`.
- Store timeout id in a ref.
- Clear it on disable, manual page navigation, selected segment change, sheet unmount, successful assisted turn, and component unmount.
- Guard the timeout callback with current refs for enabled, armed segment id, selected segment id, current page, and total pages so stale callbacks cannot turn the page.

Do not add:

- a new service class;
- global Zustand/context state;
- a scheduler framework;
- a route/query parameter;
- persistence/storage;
- a dependency;
- a broad practice-controls rewrite.

## Allowed Files

Primary allowed implementation files:

- `src/components/sheet-practice/viewer/sheet-viewer-experience.tsx`
- `src/components/sheet-practice/controls/sheet-practice-controls.tsx`
- `src/components/sheet-practice/controls/types.ts`

Allowed if they reduce complexity or improve focused tests:

- `src/components/sheet-practice/viewer/sheet-assisted-page-turning-control.tsx`
- `src/services/sheet-viewer/service.ts` for a tiny pure helper such as `getAssistedPageTurnDelayMs(segment)`
- `src/services/sheet-viewer/types.ts` only for a small exported helper/result type
- `tests/unit/sheet-viewer-assisted-page-turning.test.tsx`
- `tests/unit/sheet-viewer-service.test.ts`
- `tests/e2e/sheet-viewer.spec.ts` or `tests/e2e/sheet-viewer-assisted-page-turning.spec.ts`

Allowed supporting test files only if needed:

- `tests/e2e/fixtures/sheets.ts`
- existing sheet/segment E2E helper files, only for seeding a segment/measure grid without duplicating setup

## No-Go Files

Do not edit:

- `docs/v1/status.json`
- Dexie schema/version/migration/storage files
- `src/infrastructure/sheet-viewer/*`
- `src/infrastructure/files/*`
- `src/components/sheet-practice/viewer/pdf-sheet-renderer.tsx`
- thumbnail generation/loading services
- Sheet Library import/orchestrator files
- recording, reference playback, marker, annotation, waveform, analysis, or score-following modules
- `package.json`, lockfiles, Playwright config, Vitest config, or test framework setup

If implementation appears to require any no-go file, stop and return to planning.

## Acceptance Criteria

1. Assisted page turning is disabled by default and does not run timers until the user enables and arms it.
2. A user can enable and disable assisted page turning with an accessible control.
3. With a selected segment that has valid measure-grid timing, arming schedules one deterministic page turn based on the selected segment duration.
4. When the armed timer completes on a multi-page sheet before the last page, the viewer advances exactly one page through existing page navigation state.
5. The assisted turn updates `Page N of M`, PDF/image render, current thumbnail state, and resets zoom/pan like any other page change.
6. Manual previous/next, thumbnail selection, and page jump work while assisted turning is enabled and cancel any pending armed turn.
7. Disabling assisted turning cancels any pending armed turn.
8. Changing the selected segment cancels any pending armed turn.
9. No selected segment, invalid timing, one-page sheet, and last-page states are visible and do not schedule timers.
10. The UI never claims automatic score following or audio recognition.
11. No audio analysis, PDF recognition, overlay/annotation, persistence/storage/schema, package/lockfile, or `docs/v1/status.json` changes are introduced.

## Test Plan

### Unit Or Component Tests

Use existing Vitest/Testing Library patterns. Do not add a test framework.

Required cases if helper extracted:

- valid segment returns `endMs - startMs`;
- one-measure segment duration works;
- missing/null segment is unavailable;
- non-finite, zero, or negative duration is unavailable;
- helper uses existing domain timing/context instead of duplicating measure math.

Required component behavior:

- renders disabled-by-default toggle and arm button/status;
- no selected segment keeps arm unavailable and schedules no timer;
- enabling plus arming with a valid segment schedules one timeout;
- advancing fake timers triggers exactly one `goToPage(currentPage + 1)` callback;
- disabling before timeout clears the timer and prevents page turn;
- manual page change callback clears the pending timer;
- selected segment change clears the pending timer;
- last page and one-page sheet cannot arm;
- timeout callback is stale-safe when sheet/page/segment state changes before it fires;
- unmount clears timeout.

If testing `SheetPracticeControls` prop passthrough:

- mock `PracticeSegmentSelectorPanel`;
- select a segment and assert the optional parent callback receives that segment;
- select no segment or wrong-sheet data and assert parent callback receives `null`.

### Browser E2E

Add deterministic Playwright proof using a real imported two-page PDF.

Preferred deterministic timing strategy:

- Install Playwright browser clock before navigating to/importing the sheet, for example `await page.clock.install(...)`.
- Seed or create a sheet, measure grid, and selected segment whose duration is known.
- Enable assisted page turning.
- Select the segment.
- Click `Arm assisted page turn`.
- Assert page remains `Page 1 of 2` before advancing the clock.
- Fast-forward browser time past the segment duration.
- Assert `Page 2 of 2`, current thumbnail page 2, non-empty PDF canvas, and default zoom/pan.

If Playwright clock cannot be made stable:

- Keep the unit/component fake-timer tests as the primary deterministic timing proof.
- Use E2E for UI wiring, enable/arm/cancel/manual override, and a deliberately short test-only harness only if an existing E2E harness pattern can be reused without product behavior changes.
- Do not wait many real seconds in E2E.

Required E2E cases:

- enable, select segment, arm, deterministic turn from page 1 to page 2;
- manual page jump or previous/next after arming cancels pending turn, then clock fast-forward does not turn again;
- disable after arming cancels pending turn;
- last page cannot arm and does not schedule a turn;
- no selected segment shows unavailable state and cannot arm;
- mobile/narrow viewport keeps assisted controls usable without overlapping thumbnail drawer, page jump, zoom controls, or bottom controls;
- console/page errors remain empty.

No E2E may depend on microphone, audio files, PDF recognition, waveform data, or live wall-clock sleeps.

### Existing Tests To Preserve

Keep these passing:

- `tests/unit/sheet-viewer-service.test.ts`
- `tests/unit/sheet-viewer-page-jump.test.tsx`
- `tests/unit/sheet-viewer-thumbnails-ui.test.tsx`
- `tests/unit/sheet-viewer-measure-grid-timestamp.test.tsx`
- relevant `tests/unit/sheet-practice-controls.test.tsx`
- `tests/e2e/sheet-viewer.spec.ts`

Do not weaken existing assertions for page jump validation, thumbnails, zoom/pan, transform reset on page change, real PDF canvas rendering, image rendering, reload behavior, invalid sheet states, or layout overlap.

## Verification Commands For Coding Agent

Adjust scoped file lists to the final implementation:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/sheet-viewer-service.test.ts tests/unit/sheet-viewer-page-jump.test.tsx tests/unit/sheet-viewer-thumbnails-ui.test.tsx tests/unit/sheet-viewer-measure-grid-timestamp.test.tsx tests/unit/sheet-practice-controls.test.tsx
& .\scripts\npm-local.ps1 --% run test:e2e -- tests/e2e/sheet-viewer.spec.ts --project=chromium
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint -- src/components/sheet-practice/viewer/sheet-viewer-experience.tsx src/components/sheet-practice/controls/sheet-practice-controls.tsx src/components/sheet-practice/controls/types.ts src/services/sheet-viewer/service.ts src/services/sheet-viewer/types.ts tests/unit/sheet-viewer-service.test.ts tests/unit/sheet-viewer-measure-grid-timestamp.test.tsx tests/unit/sheet-practice-controls.test.tsx tests/e2e/sheet-viewer.spec.ts
git diff --check
```

If a new assisted-turning component/test/spec file is added, include it in scoped unit/E2E/lint commands.

Final PR ready/merge gate:

- Before marking the implementation PR ready or merging, run the full local E2E suite and pass:

```powershell
& .\scripts\npm-local.ps1 --% run test:e2e
```

- GitHub CI must pass before ready/merge/status closeout.
- The implementation PR must not edit `docs/v1/status.json`.

## Model Gates

- Planning agent: `gpt-5.5`, medium effort, standard-only/no-fast
- Coding agent: `gpt-5.5`, high effort, standard-only/no-fast
- Code review agent: `gpt-5.5`, extra-high effort, standard-only/no-fast
- Verification agent: `gpt-5.5`, high effort, standard-only/no-fast
- Web ChatGPT planning/PR reviews: Extra High, not Pro

Reason: P5-12 is small UI/timer work, but it sits in the core Sheet Practice viewer and must prove timing deterministically without slipping into audio/score-following scope.

## Handoff Notes For One Coding Agent

Read only the focused paths:

- `docs/v1/START-HERE.md`
- `docs/v1/implementation-slices/plans/P5-12-viewer-assisted-page-turning.md`
- `docs/v1/implementation-slices/plans/P5-11-viewer-zoom-pan-ui.md`
- `docs/v1/implementation-slices/plans/P5-10-viewer-zoom-pan-domain.md`
- `docs/v1/implementation-slices/plans/P5-09-viewer-page-jump.md`
- `docs/v1/implementation-slices/05-library-viewer-upgrade.md`
- `docs/v1/05a-sheet-viewer.md`
- `docs/v1/remaining-feature-contracts.md`
- `docs/v1/acceptance-packs.md`
- `src/components/sheet-practice/viewer/sheet-viewer-experience.tsx`
- `src/components/sheet-practice/controls/sheet-practice-controls.tsx`
- `src/components/sheet-practice/controls/types.ts`
- `src/components/sheet-practice/segments/practice-segment-selector-panel.tsx`
- `src/domain/practice/segments/index.ts`
- `src/services/sheet-viewer/service.ts`
- `src/services/sheet-viewer/types.ts`
- `tests/e2e/sheet-viewer.spec.ts`

Implement P5-12 only. The shortest correct path is to add a small disabled-by-default assisted page-turning control in the viewer, lift selected segment data from existing controls through an optional callback, arm one `setTimeout` from existing segment timing data, and call the existing `goToPage(currentPage + 1)` path when the timer completes.

## Split Triggers

Stop and return to planning if implementation appears to require:

- production-code changes above roughly 250-350 LOC excluding tests;
- automatic score following, PDF recognition, barline detection, OCR, overlays, annotations, markers, or page coordinate mapping;
- microphone/audio/reference playback/waveform/audio-analysis calls;
- a new service class, scheduler framework, global store, context provider, or event bus;
- persistence, URL state, schema/storage/migration, cleanup, export/import, package/lockfile, or config changes;
- changing thumbnail services, PDF worker setup, artifact loading, Sheet Library import, recording save/capture, or metronome timing internals;
- broad rewrites of `SheetViewerExperience`, `SheetPracticeControls`, `PracticeSegmentSelectorPanel`, P5-09 page jump, or P5-11 zoom/pan.

## Deferred Work Register

| Deferred work | Future owner |
| --- | --- |
| Automatic score following | v2 or future reviewed score-following feature |
| Audio-based page turning / onset or waveform-driven turns | Future audio-analysis feature, not Pack 5 |
| PDF recognition, OCR, barline/page-region mapping | Future score-analysis feature |
| Per-sheet persisted assisted-turn preferences | Future reviewed navigation/persistence slice |
| Multiple queued turns or turn schedule editor | Future viewer ergonomics slice after P5-12 proves useful |
| Page-specific segment-to-page mapping | Future reviewed viewer/segment mapping slice |
| Overlay cues or annotations on the sheet | Future overlay/annotation slice |
| Reference playback synchronized turns | Future reference integration slice |

## Concise Coding-Agent Prompt

Boole, implement P5-12 `viewer-assisted-page-turning` on branch `codex/p5-12-viewer-assisted-page-turning` with GPT-5.5 High Standard. Read `docs/v1/START-HERE.md` and `docs/v1/implementation-slices/plans/P5-12-viewer-assisted-page-turning.md`, then the focused files named in the plan. Implement only the planned disabled-by-default manual/segment-boundary assisted page turning: reuse existing viewer `currentPage`/`goToPage`, lift selected segment data through a small optional `SheetPracticeControls` callback, arm one timeout from existing segment timing data, cancel on manual override/disable/segment change/unmount, and add deterministic unit/E2E coverage. Do not add score following, audio/PDF recognition, overlays, storage/schema/migrations, package changes, or broad infrastructure. Do not edit `docs/v1/status.json`.
