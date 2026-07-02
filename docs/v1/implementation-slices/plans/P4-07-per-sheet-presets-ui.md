# P4-07 Per-Sheet Presets UI Plan

## Slice

- Slice: `P4-07 per-sheet-presets-ui`
- Product feature: `controls.per-sheet-metronome-presets`
- Product contract: `docs/v1/05b-practice-controls.md` and `docs/v1/remaining-feature-contracts.md#controlsper-sheet-metronome-presets`
- Slice file: `docs/v1/implementation-slices/04-practice-controls-upgrade.md`
- Prerequisites: verified `P4-01` through `P4-06`
- Planning model: `gpt-5.5`, medium effort, standard speed
- Recommended implementation tier: Tier C, Sheet Practice UI plus browser E2E

## Refined Scope

Add compact Sheet Practice UI for local metronome presets scoped to the current sheet and optionally to the currently selected practice segment.

The UI must let the user:

- save the current Sheet Practice metronome settings and current P4-05 bar count-in UI state as a preset;
- choose whether a new preset is sheet-wide or scoped to the currently selected segment;
- list available presets clearly by scope;
- load a preset into the current controls;
- rename a preset;
- delete a preset after an explicit user action.

The implementation must reuse the P4-06 domain/service/repository foundation. Saving must call `createSheetMetronomePresetSettingsSnapshot` with the current `MetronomeSettings` and `{ enabled, bars }` bar count-in UI state. Loading must call `loadPreset` and convert the loaded settings with `createMetronomeControlStateFromPreset`, then update only the existing controls state: metronome settings, BPM draft through the existing state hook path, bar count-in enabled, and bar count-in bars.

Loading a preset is an explicit user action. It must not auto-start playback, prepare or schedule a bar count-in plan, create or mutate practice sessions, mutate recordings, mutate sheet defaults, select a segment, save measure grids, or auto-apply on sheet load or segment selection.

## Out Of Scope

- No P4-08 shared countdown infrastructure.
- No scheduler rewrite, transport rewrite, Tone/WebAudio rewrite, or bar-count-in scheduler changes.
- No Quick Metronome templates, routines, warmups, auto-increase, mute training, or Pack 6 behavior.
- No cloud sync, import/export, backup/restore, cross-device sync, or conflict handling.
- No session, recording, sheet library, measure-grid, or practice-segment schema changes.
- No auto-apply defaults on sheet load, sheet reload, segment selection, segment creation, or measure-grid save.
- No migration of sheet defaults into presets.
- No deletion of orphaned segment-scoped presets when a segment no longer exists.

## File-By-File Implementation Plan

### `src/components/sheet-practice/controls/types.ts`

- Import `SheetMetronomePresetService` type from `@/services/sheet-metronome-presets`.
- Add an optional `sheetMetronomePresetService?: SheetMetronomePresetService` prop to `SheetPracticeControlsProps`.
- Keep this a typed dependency injection point so unit tests can pass a fake service without touching IndexedDB.

### `src/components/sheet-practice/controls/sheet-practice-controls.tsx`

- Import:
  - `createSheetMetronomePresetSettingsSnapshot`;
  - `createMetronomeControlStateFromPreset`;
  - `browserSheetMetronomePresetService`;
  - the new UI component described below.
- Default the new `sheetMetronomePresetService` prop to `browserSheetMetronomePresetService`.
- Track the currently selected segment already stored as `scopedSelectedTempoSegment`; pass it to the preset UI as the optional selected segment scope.
- Add handlers close to existing control-state handlers:
  - save current preset using `settings`, `isBarCountInEnabled`, and `barCountInMeasures`;
  - load preset using `sheetMetronomePresetService.loadPreset(sheetId, presetId)`;
  - after a successful load, call `updateSettings(next.settings)`, set bar count-in enabled/bars, clear any active/pending bar count-in plan or tick, and show a non-blocking status message;
  - rename and delete through the injected service, then refresh the local list.
- Keep loading disabled while `arePreRunSettingsLocked` is true. The metronome can still accept live BPM edits while running today, but presets include meter/subdivision/accent/countdown/bar count-in, so loading the full bundle while playing/counting would bypass existing locked controls.
- Saving, renaming, deleting, and listing may remain available while stopped only. Prefer disabling mutating preset actions while playing/counting for a clear first version.
- Do not call `startMetronome`, `stopMetronome`, `prepareBarCountInPlan`, `scheduleSheetBarCountIn`, `ensureMetronomeSession`, recording services, session services, measure-grid services, or sheet library services from preset handlers.
- Insert the preset UI inside the existing `MetronomeSettingsPanel` surface through a new `presetControl` prop. P4-07 MUST NOT add a new top-level panel, fourth grid column, or separate controls band for presets.

### `src/components/sheet-practice/controls/metronome-settings-panel.tsx`

- Add an optional `presetControl?: ReactNode` prop.
- Render it in a stable location after bar count-in and before the locked-settings help text, using `md:col-span-2`/`sm:col-span-3` as appropriate so the compact controls do not squeeze BPM and meter controls.
- Do not move existing BPM, meter, countdown, accent, or bar count-in behavior.

### `src/components/sheet-practice/controls/sheet-metronome-preset-control.tsx` (new)

- Build a focused presentational/controller component for preset CRUD UI.
- Props should include:
  - `sheetId`;
  - `selectedSegment: { id: string; name: string } | null`;
  - `service: SheetMetronomePresetService`;
  - `settings: MetronomeSettings`;
  - `barCountIn: { enabled: boolean; bars: 1 | 2 }`;
  - `disabled?: boolean`;
  - `onPresetLoaded: (state: { settings: MetronomeSettings; barCountIn: { enabled: boolean; bars: 1 | 2 } }) => void`;
  - `onStatusMessage?: (message: string) => void`;
  - `onErrorMessage?: (message: string | null) => void`.
- On mount and whenever `sheetId` changes, list all presets for the sheet with `service.listPresets(sheetId)`.
- Guard every async list request against stale responses. Use a request id/ref, cancelled boolean, or equivalent local guard; the P4-06 service has no `AbortSignal` contract. If the component unmounts or `sheetId` changes before `listPresets` resolves, ignore the stale result and do not update visible preset state.
- After every successful save, rename, or delete, re-fetch with `service.listPresets(sheetId)` and treat that response as the source of truth. Do not rely on local optimistic insertion, local row patching, or local filtering as the committed state.
- If save, rename, delete, or the post-mutation refresh fails, preserve the current visible list and current control state, and surface a visible non-crashing error.
- Present two clear scope groups:
  - `Sheet-wide presets`;
  - `Selected segment presets` when a segment is selected.
- Show orphaned, unknown, deleted, or non-selected segment-scoped presets in a clearly labeled secondary group or row label, for example `Other segment presets` or `Unknown segment`. These presets remain visible for rename/delete and remain loadable.
- New preset form:
  - name input;
  - scope segmented/radio control with `Sheet-wide` and `Selected segment` options;
  - selected-segment option disabled with explanatory helper text when no segment is selected;
  - save button with a save icon.
- Preset rows:
  - display preset name, scope label, and concise settings summary such as BPM, time signature, subdivision, countdown, and bar count-in state;
  - load button;
  - rename button/icon that opens an inline edit field or compact dialog;
  - delete button/icon with a confirm step.
- Use the existing `Button` component and local patterns. Use lucide icons such as `Save`, `ListMusic`, `Upload`, `Pencil`, `Trash2`, and `X` if available.
- Keep error/status text inside an `aria-live="polite"` region. Validation and storage failures should be visible without throwing React errors.
- Avoid broad modal infrastructure. Inline edit/confirm states are enough unless the existing app has a nearby dialog pattern already used in controls.
- Guard every async load request against stale responses. If `loadPreset` resolves after unmount, after `sheetId` changes, or after playback/counting starts, ignore the result, preserve the current controls, and preserve the locked-settings invariant.

### `src/components/sheet-practice/controls/index.ts` or barrel files

- Only update if this directory already exports new controls through a barrel. Do not add a barrel just for this slice.

### `tests/unit/sheet-practice-controls.test.tsx`

- Extend the existing Sheet Practice controls test harness with a fake `SheetMetronomePresetService`.
- Add focused tests for:
  - saving a sheet-wide preset captures current BPM/time signature/subdivision/accent/countdown plus bar count-in enabled/bars;
  - saving a selected-segment preset passes the selected segment id and renders a selected-segment scope label;
  - loading a preset updates BPM, time signature, subdivision, accent, countdown, and bar count-in state;
  - loading a preset does not call metronome start/stop, session creation/event capture, measure-grid plan preparation, or recording services;
  - load is disabled while metronome is playing/counting;
  - rename calls `renamePreset`, refreshes the list, and surfaces duplicate-name errors;
  - delete calls `deletePreset`, refreshes the list, and does not delete without the confirm action;
  - missing preset load returns a visible message and preserves existing control state.
- Prefer adding reusable fake-service helpers near existing helpers in the file, not a separate test utility unless the file becomes unmanageable.

### `tests/e2e/sheet-practice-controls.spec.ts`

- Add Playwright coverage in the existing Sheet Practice controls spec because this feature is part of the same visible control surface.
- Extend the storage fixture imports to include the P4-06 preset DB name, or add that DB constant to the fixture source if it exists there already.
- Add one CRUD/load/reload test:
  - import a test sheet;
  - set BPM/meter/subdivision/accent/countdown;
  - enable bar count-in and choose 2 bars;
  - save a sheet-wide preset;
  - create/select a practice segment;
  - change settings and save a selected-segment preset;
  - reload the page and verify both presets remain visible with distinct scope labels;
  - load the sheet-wide preset and verify controls update without selecting/changing a segment;
  - load the selected-segment preset and verify controls update, including bar count-in enabled/bars;
  - rename one preset and verify the new name persists after reload;
  - delete one preset and verify it remains deleted after reload.
- Add timing evidence in the same or a second focused test:
  - after loading a preset with a changed BPM/time signature/subdivision/accent, start the metronome only after the explicit load action;
  - collect `quick-metronome:scheduled-tick` traces as current tests do;
  - verify traces use the loaded settings and expected interval/accent pattern;
  - verify no traces occur merely from loading the preset before pressing Start.
- Keep console/page error collection and assert no errors.
- Include responsive checks at desktop, tablet, and mobile widths proving preset controls and transport remain visible and do not overlap the viewer.

### `tests/e2e/fixtures/storage.ts`

- Only if needed, add `SHEET_METRONOME_PRESET_DB_NAME` to the fixture constants by importing/reusing the same storage-contract constant or duplicating the literal only if the fixture already follows that pattern.
- Include the preset DB in cleanup for the new e2e test so saved presets do not bleed across tests.

## UX, Accessibility, And Responsive Requirements

- The UI must read as a compact preset manager, not a new page section.
- Scope must be explicit everywhere:
  - saving control labels: `Sheet-wide` and `Selected segment`;
  - list group labels: `Sheet-wide presets`, `Selected segment presets`, and, if shown, `Other segment presets`;
  - row labels for segment presets should include the segment name when known.
- If no segment is selected, the selected-segment save option is disabled and the UI explains that selecting a segment enables segment-scoped presets.
- Loading a segment-scoped preset must not select that segment. The row label tells the user what the preset was saved for, but load applies only the metronome/bar-count-in control state.
- Orphaned/deleted segment presets remain user-visible as other/unknown segment presets. Loading one is allowed and applies only its saved metronome and bar-count-in settings; it must not restore, select, recreate, or otherwise mutate the missing segment.
- Mutating actions need accessible names that include the preset name, for example `Load preset Warmup`, `Rename preset Warmup`, `Delete preset Warmup`.
- Rename must preserve keyboard flow: focus moves to the edit field, Enter saves, Escape cancels, and cancellation does not mutate the preset.
- Delete must require confirmation by button or inline confirm state; the first click must not delete.
- Status/error messages use `role="status"` or an `aria-live="polite"` region. Destructive confirmation/error text should be clear and concise.
- Buttons must remain icon plus accessible name or visible text. Use tooltips only as a supplement, not the only accessible label.
- On mobile widths around 390px:
  - name input, scope selector, list rows, and row actions must wrap without text overflow;
  - transport buttons remain reachable;
  - the sheet viewer is not overlapped by the controls;
  - no fixed-width preset rows wider than the viewport.
- On desktop/tablet:
  - keep the existing three-panel control balance;
  - do not add a wide table that forces horizontal scrolling;
  - use compact grouped rows/cards inside the metronome controls surface.

## Boundary Conditions And Failure Semantics

- Empty preset names are rejected before service calls where possible and surface a visible validation message.
- Duplicate names from the service surface `Preset name already exists.` or the service-provided equivalent without clearing the form or losing current control state.
- Storage/list/save/load/rename/delete failures surface visible errors and preserve the current controls and current list until a successful refresh.
- Missing preset on load surfaces a visible message and refreshes the list; current settings remain unchanged.
- Malformed persisted rows are already filtered by P4-06. The UI should simply render the valid list returned by the service and not add its own row parser.
- Service list calls must be cancelled/ignored if the component unmounts or `sheetId` changes before resolution. Because the service has no `AbortSignal`, use a local stale-response guard such as a request id/ref or cancelled boolean.
- Successful save, rename, and delete flows must re-fetch from `listPresets(sheetId)` before changing the committed visible list. Failed mutations or failed post-mutation refreshes preserve the previous list and form/control state.
- Segment selection changes refresh labels/scopes but must not auto-load or auto-save anything.
- If a selected segment is deleted after a preset is saved, the preset remains persisted and visible as an unknown/other segment preset if returned by the service. Loading remains allowed and applies only settings, with no segment selection side effect.
- Loading while stopped must clear pending/active bar count-in plan and tick state so the next explicit Start prepares from the newly loaded UI state.
- Loading while playing/counting is disabled for this slice. If a service load resolves after playback or counting starts, ignore it and preserve the lock invariant.
- Preset operations must not mutate `defaultBpm`, `defaultTimeSignature`, sheet library rows, measure grids, sessions, recordings, or Quick Metronome templates.
- Save captures the current settings exactly after existing control normalization. It does not store segment target BPM policy, measure-grid snapshots, scheduler plans, session ids, recording ids, or defaults.

## Acceptance Criteria

- Sheet Practice exposes compact preset CRUD controls.
- The user can save sheet-wide and selected-segment presets with clear scope labels.
- Saving captures current `MetronomeSettings` plus bar count-in enabled/bars.
- The user can list, load, rename, and delete presets.
- Presets persist after reload.
- Loading updates only metronome controls and bar count-in UI state.
- Loading does not auto-start playback, prepare scheduler plans, mutate sessions/recordings, mutate sheet defaults, or change segment selection.
- The UI remains accessible and responsive across desktop, tablet, and mobile widths.
- Unit/component tests cover CRUD, load semantics, scope handling, errors, and no-side-effect boundaries.
- Playwright covers CRUD/load/reload plus timing evidence after explicit Start.

## Test Coverage Plan

### Unit/component tests

Use `tests/unit/sheet-practice-controls.test.tsx` and the existing fake-service style.

Required cases:

- renders an empty preset manager state without blocking existing Sheet Practice controls;
- saves a sheet-wide preset with current settings and bar count-in off;
- saves a selected-segment preset with current settings and bar count-in on/two bars;
- rejects a blank name without calling `savePreset`;
- surfaces duplicate-name save and rename failures;
- lists sheet-wide and selected-segment presets under distinct labels;
- loads a preset and updates BPM draft/input, time signature, subdivision, accent, countdown, bar-count-in toggle, and bars;
- loading a preset does not call `start`, `stop`, `ensureSheetSession`, `captureSessionEvent`, recording start/save/discard, or measure-grid scheduler preparation callbacks;
- disables load while playing/counting and preserves current state;
- missing preset load preserves current state and shows a message;
- rename supports save/cancel and refreshes list on success;
- delete requires confirmation and refreshes list on success;
- service failure on list/save/load/rename/delete is visible and non-crashing.
- stale list safety: trigger a pending `listPresets`, unmount or change `sheetId`, resolve the promise, and assert no stale list appears and no console error/state-update warning occurs;
- stale load safety: trigger a pending `loadPreset`, then unmount, change `sheetId`, or start playback/counting before resolving; assert no stale settings apply, no stale status appears, and no console error/state-update warning occurs.

### Playwright E2E

Use `tests/e2e/sheet-practice-controls.spec.ts`.

Required cases:

- CRUD/load/reload:
  - clean sheet, session, measure-grid, segment, and preset DBs;
  - import a sheet;
  - create a sheet-wide preset;
  - create/select a segment and create a selected-segment preset;
  - reload and verify both scopes persist;
  - load each preset and verify the visible controls;
  - rename and reload;
  - delete and reload.
- Timing evidence:
  - collect `quick-metronome:scheduled-tick` traces;
  - load a preset that changes BPM/time signature/subdivision/accent;
  - assert no scheduled ticks appear before pressing Start;
  - press Start and verify traces match loaded timing and accent expectations;
  - stop playback and verify no console/page errors.
- Responsive/a11y:
  - assert preset controls and transport are visible at 1280x820, 1024x768, and 390x844;
  - assert no viewer overlap using the existing helper pattern;
  - use role/name selectors for preset actions to prove accessible names are available.
- Keep the combined CRUD/reload/timing/responsive coverage focused. Prefer stable user-visible assertions and timing traces over excessive implementation-detail or brittle text/layout assertions.

## Verification Commands For Coding Agent

Focused unit/component verification:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/sheet-practice-controls.test.tsx
```

Focused browser verification:

```powershell
& .\scripts\npm-local.ps1 --% run test:e2e -- tests/e2e/sheet-practice-controls.spec.ts --project=chromium
```

Type/lint/diff checks:

```powershell
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint -- src/components/sheet-practice/controls/sheet-practice-controls.tsx src/components/sheet-practice/controls/metronome-settings-panel.tsx src/components/sheet-practice/controls/sheet-metronome-preset-control.tsx src/components/sheet-practice/controls/types.ts tests/unit/sheet-practice-controls.test.tsx tests/e2e/sheet-practice-controls.spec.ts tests/e2e/fixtures/storage.ts
git diff --check
```

If the implementation does not touch `tests/e2e/fixtures/storage.ts` or uses different exact filenames, keep the same command shape and report the actual changed files.

Full pre-merge E2E gate:

```powershell
& .\scripts\npm-local.ps1 --% run test:e2e -- --project=chromium
```

Report clearly whether browser verification used Playwright `[chromium]` or real Chrome.

## Planning Validation

For this planning-only slice:

```powershell
Get-Content -Raw docs/v1/status.json | ConvertFrom-Json | Out-Null
git diff --check
```

## Status And Review Gates

- After this planning edit, `docs/v1/status.json` may move only `P4-07 per-sheet-presets-ui` from `not_started` to `planning_in_progress`.
- External web ChatGPT plan review must return `PASS` before P4-07 can move to `ready_for_coding`.
- The full original plan text should be sent to the logged-in web ChatGPT `metronome` project with the established Chinese review prompt. Incorporate feedback before advancing.
- This planning artifact alone does not authorize coding.
- After coding, use a separate code review agent. Review should check contract boundaries, UI scope, no scheduler/session/recording/default mutations, and test evidence.
- Full E2E must pass before merge.
- Do not mark P4-07 `ready_for_coding`, `coding_in_progress`, `review_in_progress`, `verification_in_progress`, or `verified` until the corresponding gates pass and the scheduler explicitly advances it.
- `P4-08 advanced-countdown-shared-infrastructure` remains `not_started`.

## Handoff Notes For Future Coding Agent

Read only the focused paths:

- `docs/v1/START-HERE.md`
- `docs/v1/implementation-slices/plans/P4-07-per-sheet-presets-ui.md`
- `docs/v1/implementation-slices/04-practice-controls-upgrade.md`
- `docs/v1/implementation-slices/plans/P4-06-per-sheet-presets-domain-repository.md`
- `docs/v1/05b-practice-controls.md`
- `docs/v1/remaining-feature-contracts.md` section `controls.per-sheet-metronome-presets`
- `src/components/sheet-practice/controls/sheet-practice-controls.tsx`
- `src/components/sheet-practice/controls/metronome-settings-panel.tsx`
- `src/components/sheet-practice/controls/bar-count-in-control.tsx`
- `src/components/sheet-practice/controls/types.ts`
- `src/domain/practice/sheet-metronome-presets.ts`
- `src/services/sheet-metronome-presets/*`
- `src/infrastructure/db/browser-sheet-metronome-preset-service.ts`
- `tests/e2e/sheet-practice-controls.spec.ts`
- `tests/unit/sheet-practice-controls.test.tsx`

Implement the UI slice only. Stop and request a planning update if the work appears to require scheduler changes, shared countdown infrastructure, Quick Metronome templates, session/recording/schema changes, cloud/import/export behavior, or auto-apply defaults.
