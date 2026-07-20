# P1-07 Segment Create/Edit/Delete UI Plan

## Slice

- Slice id: P1-07 `segment-create-edit-delete-ui`
- Pack: Pack 1 Practice Segment MVP
- Product contract: `practice.practice-segments` in `docs/v1/05f-practice-segments.md`
- Planning model requirement: GPT-5.5, medium effort, standard speed
- Coding tier: Tier C, user-facing UI with browser E2E
- Status: planning artifact only; do not mark verified from this plan

## Goal

Add create, edit, and delete UI for Practice Segments in Sheet Practice on top of the existing read-only selector and existing practice segment repository/service. Users must be able to create a segment for the active sheet, edit an existing segment, delete a segment safely, reload and see persisted changes, switch sheets without state leakage, and keep active selected segment state coherent.

## Scope

- Extend the existing Sheet Practice segment panel into a compact CRUD surface.
- Create a new segment for the current `sheetId` from user-entered fields.
- Edit an existing segment's editable fields.
- Delete an existing segment with explicit confirmation or an equivalent safe two-step UI.
- Persist all changes through `PracticeSegmentService`.
- Use the current saved MeasureGrid from `MeasureGridService` to create/update the segment grid association.
- Preserve and update active selected segment state after create/edit/delete.
- Keep existing read selector behavior: list, select, status badges, sheet scoping, stale/missing-grid statuses.
- Update focused component/unit tests and targeted E2E to cover CRUD, reload, validation, service failure, active selection, sheet switch, and responsive/console smoke.

## Non-Scope

- No recording metadata, recording start/save changes, segment-linked recording, `Record again`, take grouping, take review, waveform, session summaries, analytics, or review page work.
- No automatic PDF measure detection, score following, measure overlays, visual drag selection, looping, bar-aware count-in, or segment tempo application to metronome controls.
- No new IndexedDB/Dexie access from UI components.
- No duplicate persistence layer, new repository abstraction, cloud sync, import/export, backup/restore, or migration work.
- No broad redesign of Sheet Practice controls, MeasureGrid calibration, metronome, recording, sheet viewer, or app shell.

## Existing Ownership And Patterns

Current relevant code:

- `src/domain/practice/segments/index.ts`
  - Owns `PracticeSegment`, validation helpers, target BPM limits `30..300`, notes max `1000`, name max `80`, grid association, status helpers, and range timing helper.
- `src/services/practice-segments/service.ts`
  - Owns high-level validation and repository delegation.
- `src/services/practice-segments/types.ts`
  - Existing service contract: `listSegments`, `getSegment`, `saveSegment`, `deleteSegment`.
- `src/infrastructure/db/browser-practice-segment-service.ts`
  - Dexie-backed repository and browser service. UI must not import Dexie internals.
- `src/components/sheet-practice/segments/practice-segment-selector-panel.tsx`
  - Existing read-only selector, local active selection, injected services, sheet-switch stale result guard, status badges, empty/error states.
- `src/components/sheet-practice/controls/sheet-practice-controls.tsx`
  - Composes segment selector and MeasureGrid calibration; passes injected services and `measureGridRevision`.
- `src/components/sheet-practice/measure-grid/measure-grid-calibration-panel.tsx`
  - Existing compact form pattern, validation messaging, loading/saving/error state pattern, service injection pattern.

Likely files to change:

- `src/components/sheet-practice/segments/practice-segment-selector-panel.tsx`
- Possibly a new colocated helper/component under `src/components/sheet-practice/segments/`, such as `practice-segment-editor.tsx`, only if it keeps the selector readable.
- `src/components/sheet-practice/controls/sheet-practice-controls.tsx` only if the selector needs an active-selection callback or refresh hook beyond its current internal state.
- `src/components/sheet-practice/controls/types.ts` only if a prop shape must be exposed for test injection.
- `tests/unit/practice-segment-selector.test.tsx`
- `tests/unit/sheet-practice-controls.test.tsx`
- `tests/e2e/practice-segment-selector.spec.ts`, either updated or split into a dedicated CRUD spec.

Files explicitly out of scope:

- `src/infrastructure/db/browser-practice-segment-service.ts`, unless a missing test-only helper is absolutely necessary. Do not change schema or persistence behavior for this UI slice.
- `src/domain/practice/segments/index.ts`, unless a tiny UI-facing exported helper is truly needed. Do not change validation policy.
- `src/services/practice-segments/*`, unless a small type-only addition is necessary. Do not rebuild the service.
- Recording, session, waveform, playback, audio, reference, marker, sheet import, viewer internals, and app shell files.

## UI Contract

Placement:

- Controls live inside the existing `PracticeSegmentSelectorPanel` in Sheet Practice, next to or above the saved segment list.
- Keep the panel compact and secondary to the sheet and transport controls.
- On empty state, show a visible create affordance instead of the current read-only-only state.
- Use existing light workspace styling, subtle borders, compact typography, yellow active state, and purple only for secondary create/edit affordances if already consistent with local components.
- Use `Button` from `src/components/ui/button` where suitable and lucide icons for create/edit/delete/save/cancel if icons are already available in the app pattern.

Expected fields:

- Name: required, trim before save, max 80 characters through existing domain validation.
- Start measure: required 1-based integer.
- End measure: required 1-based integer, must be greater than or equal to start.
- Target BPM: optional; blank means `null`; if provided must be an integer from 30 to 300.
- Notes: include only because the domain/service already support it; optional; blank means `null`; max 1000 characters.

Validation messages:

- Empty name: `Segment name is required.`
- Name too long: `Segment name must be 80 characters or fewer.`
- Invalid start/end: `Measures must be whole numbers starting at 1.`
- End before start: `End measure must be greater than or equal to start measure.`
- Invalid target BPM: `Target BPM must be an integer from 30 to 300.`
- Notes too long: `Notes must be 1000 characters or fewer.`
- Missing current MeasureGrid for create/update: `Save a measure grid before creating segments.`
- Service validation fallback: show the thrown error when useful; otherwise show `Segment could not be saved.`

Behavior:

- Create opens an inline editor or compact modal/dialog within the segment panel. Inline is preferred if it stays compact and does not push transport controls out of reach.
- Create requires a successfully loaded current MeasureGrid. If no grid is saved, disable create/save and show the missing-grid message. Do not save a segment with a fake grid association.
- New segment id may be generated in UI using `crypto.randomUUID()` with a safe fallback only if existing project patterns require it. Keep ids stable after save.
- New segment `sheetId` must always be the active panel `sheetId`.
- New segment `grid` must be `createPracticeSegmentGridAssociation(currentGrid)`.
- Save must call `practiceSegmentService.saveSegment(segment)` and then refresh local list from `listSegments(sheetId)` or update local state from the returned validated segment. Prefer a single local refresh helper to avoid divergent state.
- After create succeeds, select the created segment as active.
- Edit can be exposed from the selected active summary or each row. It must prefill saved values.
- Edit must preserve `id` and `sheetId`.
- Edit should update the segment's grid association to the current saved MeasureGrid because range timing now reflects the current grid. If no current grid exists, block save with the missing-grid message.
- After edit succeeds, keep the edited segment active if it was active; if editing a non-active segment, do not unexpectedly switch active selection unless the edit action itself selected it.
- Delete must require confirmation before calling `deleteSegment`. Acceptable safe patterns are a small confirm state on the row/summary or an accessible confirmation dialog.
- Delete must identify the segment by name/range in the confirmation UI enough to prevent accidental deletion.
- Delete button disabled while deleting; save buttons disabled while saving; list rows should remain stable during in-flight operations.
- After deleting the active segment, clear active selection unless another segment was explicitly selected by the user during the delete request.
- After deleting a non-active segment, preserve current active selection if it still exists.
- If create/edit/delete fails, keep the previous persisted list and active selection intact and show a recoverable error.
- Loading state should keep the existing `Loading` badge and disable create/edit/delete until both segment list and grid status are resolved enough to know whether operations are allowed.
- Segment list error should keep CRUD unavailable because saved state cannot be trusted.
- Grid load error should keep rows visible as today but block create/edit saves that require current grid association.
- Sheet switch must clear editor drafts and confirmation state, reload list/grid for the new `sheetId`, and not apply late old-sheet async results.

Active selection:

- Selection remains local to the current Sheet Practice view for this slice.
- Active selection still resets on reload and sheet switch, matching P1-06 behavior.
- Create success selects the created segment.
- Edit success keeps active selection coherent with the edited segment id.
- Delete active clears active selection.
- Delete missing/stale segment should refresh list and clear selection if the selected id no longer exists.

## Data And Service Contract

- UI may import domain validation helpers and constructors from `@/domain/practice`, especially `createPracticeSegmentGridAssociation`, `validatePracticeSegmentName`, `validatePracticeSegmentTargetBpm`, `validatePracticeSegmentNotes`, and/or `validatePracticeSegment`.
- UI must use `PracticeSegmentService` for saves/deletes and `MeasureGridService` for current grid reads.
- UI must not import or call Dexie, `indexedDB`, `browserPracticeSegmentRepository`, test seed helpers, or storage contracts.
- Do not add a second segment store, localStorage persistence, or app-wide store for CRUD state.
- Preserve repository scoping by `sheetId`.
- Prefer local component state for drafts, in-flight status, active selection, confirmation state, and recoverable errors.
- Do not enforce duplicate-name rejection unless the existing service/domain already does. Current domain does not reject duplicate names, so duplicates should be allowed in this slice unless a coding agent finds an existing product rule elsewhere.
- Persisted data shape must remain the existing `PracticeSegment` shape: `id`, `sheetId`, `name`, `range`, `targetBpm`, `notes`, `grid`.

## Edge Cases And Boundaries

- Empty or whitespace-only name: reject in UI and do not call `saveSegment`.
- Name over 80 characters: reject and preserve previous data.
- Start measure `0`, negative, fractional, non-numeric, blank, or unsafe integer: reject.
- End measure before start: reject.
- Same start/end measure: valid one-measure segment.
- Target BPM blank: save as `null`.
- Target BPM under 30, over 300, fractional, non-numeric, or unsafe integer: reject.
- Notes blank/whitespace: save as `null`.
- Notes over 1000 characters: reject.
- No saved current grid: block create/edit save. Existing segments can still be listed and selected with `Needs calibration`.
- Grid load failure: keep existing read behavior, but create/edit save blocked.
- Segment list load failure: show error and disable CRUD controls.
- `saveSegment` failure: leave draft open with error, do not mutate the displayed persisted list as if save succeeded.
- `deleteSegment` failure: keep row and active selection, show error.
- Edit of missing/deleted segment: if service offers no explicit update failure, save will recreate that id. To avoid surprising resurrection after stale UI, coding agent should call `getSegment(sheetId, id)` immediately before editing save when feasible; if it returns `null`, show `Segment no longer exists.` and refresh list instead of saving.
- Delete of already-missing segment: `deleteSegment` is idempotent; refresh list and clear selection if needed.
- Late async result from prior sheet: must be ignored using the existing `isActive` effect pattern and `loadResult.sheetId` guard.
- User switches sheets while editor/confirmation is open: close editor/confirmation and reset draft/error to the new sheet.
- Many segments: list remains scroll/flow friendly with stable row heights; no virtualization required.
- Reload after create/edit/delete: browser E2E must prove IndexedDB-backed persistence reflects final state.

## Test Plan

Unit/component tests:

- Update `tests/unit/practice-segment-selector.test.tsx`; remove/replace assertions that no create/edit/delete UI exists.
- Empty state shows create affordance.
- Create with current grid fills name/range/target/notes, calls `saveSegment` with active `sheetId`, generated id, normalized optional fields, and `createPracticeSegmentGridAssociation(currentGrid)`, then selects the created segment.
- Create is disabled or save-blocked when current grid is missing or grid load failed.
- Create validation covers empty name, invalid range, end before start, invalid target BPM, and notes too long without calling `saveSegment`.
- Edit pre-fills values, preserves id/sheetId, saves updated fields, refreshes/updates row, and keeps active selection coherent.
- Edit missing/deleted segment path shows recoverable error and refreshes without resurrecting if a preflight `getSegment` is implemented.
- Delete requires confirmation; cancel does not call service; confirm calls `deleteSegment(sheetId, segmentId)`.
- Deleting active segment clears active summary; deleting non-active segment preserves active summary.
- Save/delete service failures preserve prior UI list and selection and show errors.
- Sheet switch clears draft/confirm/error and ignores late old-sheet results.
- Component remains injectable with fake `PracticeSegmentService` and `MeasureGridService`.

Sheet Practice composition tests:

- Update `tests/unit/sheet-practice-controls.test.tsx` to confirm CRUD-capable selector still composes with injected services and MeasureGrid save still refreshes segment statuses.
- Add a narrow integration-like test if the selector needs a callback from `SheetPracticeControls`; otherwise avoid broad controls tests.

Repository/domain tests:

- Existing `tests/unit/practice-segment-repository.test.ts` and `tests/unit/practice-segment-domain.test.ts` already cover validation, persistence, delete idempotence, reload, target BPM/null notes, and stale grids. Add only if UI work reveals a genuine missing domain/service boundary; do not duplicate UI validation there.

E2E:

- Update or add targeted Playwright coverage in `tests/e2e/practice-segment-selector.spec.ts`.
- Flow:
  - Clear relevant databases.
  - Import/create a test sheet.
  - Open Sheet Practice.
  - Verify create is unavailable before saved grid, or save a MeasureGrid first through existing calibration UI.
  - Create segment: name, start/end, target BPM, notes.
  - Verify row appears, active summary selected, status `Ready`, target BPM/range visible.
  - Reload and verify segment persists; active selection can reset to `Choose a segment`.
  - Edit segment name/range/target BPM/notes and verify updated row after save and reload.
  - Create or seed another sheet and verify segments do not leak across sheet switch.
  - Delete segment through confirmation, verify row removed and active selection cleared, reload and verify absence.
  - Negative validation in browser: invalid range or target BPM disables save and does not change persisted row.
  - Responsive smoke at desktop `1280x820`, tablet-like `1024x768`, and narrow mobile `390x844`; verify sheet viewer, selector, grid panel, and Start metronome remain visible/reachable without overlap.
  - Capture console/page errors and expect none.
- Service failure E2E can remain component-level unless there is an established browser harness for forced failures.

## Verification Commands

Use README Windows command style:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/practice-segment-selector.test.tsx tests/unit/sheet-practice-controls.test.tsx tests/unit/practice-segment-domain.test.ts tests/unit/practice-segment-repository.test.ts
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run typecheck
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run lint
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run build
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 --% run test:e2e -- tests/e2e/practice-segment-selector.spec.ts
```

If Playwright/Chromium fails with Windows `EPERM`, browser install, or sandbox symptoms, rerun the targeted E2E with escalated permissions and document the exact failure and rerun result.

## Acceptance Checklist

- [ ] Create UI is visible and usable for the current sheet once a saved MeasureGrid exists.
- [ ] Create persists a valid segment with name, range, optional target BPM, optional notes, and current grid association.
- [ ] Edit UI updates name/range/target BPM/notes without changing segment id or sheet id.
- [ ] Delete UI requires confirmation and removes only the chosen segment.
- [ ] Invalid input is rejected before service save and does not corrupt prior saved data.
- [ ] Active selected segment state is coherent after create, edit, delete, reload, and sheet switch.
- [ ] Segment list and CRUD are scoped to `sheetId`.
- [ ] Changes persist after browser reload.
- [ ] Missing grid, stale grid, grid load failure, list load failure, save failure, and delete failure have recoverable UI states.
- [ ] UI uses existing domain/service boundaries and does not call IndexedDB/Dexie directly.
- [ ] No recording, rerecording, take review, session analytics, marker, reference, cloud, or audio behavior is implemented.
- [ ] Unit/component tests and targeted E2E cover the slice.
- [ ] Typecheck, lint, build, and targeted tests are run and reported by the coding agent.

## Handoff Notes For Coding Agent

- Start from the existing `PracticeSegmentSelectorPanel`; preserve its sheet-load guard and active-selection semantics.
- Reuse the MeasureGrid calibration panel's form-state pattern for validation, `saving` disabled state, and recoverable errors.
- Prefer small internal helpers for parsing numeric drafts rather than changing domain policy.
- Keep state local unless a cross-component need is proven.
- Do not reinterpret P1-08+ recording requirements; this slice ends at segment CRUD and active selection.
