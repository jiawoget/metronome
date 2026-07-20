# P1-03 Measure Grid Calibration UI Plan

## 1. Slice Identity And Status Assumptions

- Slice: `P1-03 measure-grid-calibration-ui`.
- Product feature: `practice.measure-grid`.
- Pack: `pack-1-practice-segment-mvp`.
- Current status assumption from `docs/v1/status.json`: `planning_ready`.
- Dependency assumptions: `P1-01 measure-grid-types-and-math` is `verified`; `P1-02 measure-grid-repository` is `verified`; latest commit before this slice is `8b25dec feat: add v1 measure grid repository`.
- Planning agent policy: `gpt-5.5`, medium effort, standard speed.
- Coding/review/verification tier from Pack 1: Tier C, user-facing UI with browser E2E.
- Escalation recommendation: stay Tier C. The slice includes UI, persistence through an existing service, reload, and browser E2E, but no media capture, recording artifacts, migrations, cleanup, or destructive data operations.
- This plan is documentation only. Do not edit product code and do not mark `status.json` during planning.

Recommendation after this file exists: P1-03 can move to `ready_for_coding` because the UI contract, data contract, timestamp fallback, boundaries, and verification plan are defined below.

## 2. Product And Design Intent From Docs

`practice.measure-grid` gives each sheet one deterministic manually calibrated measure grid. The user tells Sheet Practice where measure 1 begins; later Practice Segment features can convert measure ranges into timestamps without automatic PDF recognition or score following.

For this slice only, the product intent is the compact Sheet Practice calibration UI:

- Open an existing sheet and see visible MeasureGrid calibration controls.
- Initialize the draft from a saved grid when one exists.
- For a sheet with no saved grid, initialize BPM and time signature from sheet defaults, then from current Sheet Practice metronome settings, then from documented app fallbacks.
- Let the user edit BPM, time signature, pickup beats, and measure-one offset.
- Let the user set measure 1 from the current playback/scrub timestamp when a timestamp boundary is available.
- Save through the P1-02 measure-grid service.
- Show `Needs calibration`, `Calibrated`, and `Unsaved changes` states.
- Preserve existing v0 Sheet Practice behavior for sheets without grids.

Design intent:

- Keep the sheet image/PDF centered and visually dominant.
- Keep bottom Sheet Practice transport controls reachable and stable.
- Add calibration as a compact workspace control, not a setup wizard, landing page, tutorial panel, or marketing-style explanation.
- Use warm light surfaces, compact typography, thin borders, subtle shadows, and existing button/input/select styles.
- Use yellow for calibrated/active practice emphasis. Use purple only if a secondary edit/create affordance already fits the local pattern.
- Do not draw detected bar lines on the PDF and do not imply automatic measure detection.

## 3. UI/UX Contract

Placement:

- Prefer composing a compact `MeasureGridCalibrationPanel` inside `SheetPracticeControls`, because that area already owns practice BPM/time signature defaults, transport state, and bottom-control responsiveness.
- If layout pressure is high, place the panel as a fourth compact row below the current three-column controls and above the existing `Defaults: ...` footer, or replace/extend the footer into a stable calibration strip.
- Do not put the primary calibration UI inside the sheet canvas or over the viewer scroll area.
- Do not displace `ReferencePanel` unless the implementation has a very small, justified composition change. The right-side panel is already secondary context and the sheet must remain dominant.

Required visible controls and labels:

- Heading: `Measure grid`.
- Status badge text: exactly one of `Needs calibration`, `Calibrated`, or `Unsaved changes`.
- BPM numeric input labeled `Grid BPM`.
- Time signature select labeled `Grid time signature`; allowed values must match P1-01 domain support: `2/4`, `3/4`, `4/4`, `6/8`.
- Pickup beats numeric input labeled `Pickup beats`.
- Offset display/input labeled `Measure 1 offset`. It may be a read-only formatted value plus a hidden numeric source, or an editable numeric milliseconds field if that matches local form patterns.
- Action button labeled `Set measure 1 here`.
- Action button labeled `Save grid`.
- Optional reset action labeled `Clear grid` only if it is cheap, well-tested, and uses P1-02 `clearGrid`; otherwise defer it.

Visual states:

- `Needs calibration`: no saved grid or draft has no valid measure-one offset. Show a muted or amber badge. `Save grid` is disabled until all fields are valid, including offset.
- `Calibrated`: saved grid exists, draft matches saved grid, and all fields validate. Show a compact yellow-accent badge or border treatment.
- `Unsaved changes`: draft differs from saved grid or a new valid draft has not been saved. Show an amber badge and keep `Save grid` enabled only when valid.
- `Saving`: disable save and show a concise in-button or aria-live status such as `Saving...`; do not optimistically claim persistence until the service resolves.
- `Save failed`: show a concise recoverable alert in the panel; keep the prior saved grid intact and keep the draft editable.
- `Loading`: show a compact skeleton or text in the panel only; existing sheet viewer and controls must still render.

Input behavior:

- BPM accepts integers `30` through `300`, matching P1-01.
- Pickup beats accepts non-negative integers smaller than the selected time signature numerator.
- Offset accepts finite non-negative integer milliseconds. If displayed in seconds, still save integer milliseconds.
- Invalid values show field-level recoverable messages and do not call `saveGrid`.
- Changing time signature must revalidate pickup beats immediately.
- The UI must never mutate the original sheet BPM/time signature metadata.
- Grid BPM/time signature edits are separate from existing metronome controls. Do not silently mirror changes both ways. If current metronome settings are used only for initialization, make that a one-time draft default.

Responsive behavior:

- Desktop: existing grid in `SheetPracticeControls` remains stable; viewer and reference panel stay above the control area; calibration must not cover transport or viewer.
- Tablet-like/iPad landscape: calibration wraps into compact rows without clipping labels or pushing transport out of reach.
- Narrow mobile: calibration controls stack into one column or a compact collapsible panel inside the controls area. Transport buttons remain reachable and visible.
- Resize transitions must not overlap text, buttons, the sheet viewer, or bottom controls.
- Use stable dimensions for status badges and action rows so changing from `Needs calibration` to `Unsaved changes` does not cause jarring layout shift.

Accessibility expectations:

- All inputs have programmatic labels matching the visible labels above.
- Status changes use `aria-live="polite"` or existing local live-region pattern.
- Field validation messages are associated with their inputs through `aria-describedby` where practical.
- Buttons have clear accessible names.
- Disabled `Set measure 1 here` explains the reason in visible concise text or an accessible description when no timestamp is available.
- Keyboard users can tab through all fields and actions in a predictable order.

## 4. Data/Service Contract

Use the P1-02 service boundary:

- Import `browserMeasureGridService` only from `src/infrastructure/db/browser-measure-grid-service.ts` at a client boundary, or inject a `MeasureGridService` for testable components.
- UI components call only `getGrid(sheetId)`, `saveGrid(sheetId, grid)`, and optional `clearGrid(sheetId)`.
- UI components must not import Dexie, `MEASURE_GRID_DB_NAME`, repository internals, or parsing helpers that belong below the service boundary.

Load behavior:

- On sheet change, load the saved grid for the active `sheetId`.
- If saved grid exists, draft equals saved grid and status is `Calibrated`.
- If no saved grid exists, draft initializes from:
  1. sheet `defaultBpm` and `defaultTimeSignature` if valid and supported by MeasureGrid;
  2. current Sheet Practice metronome settings if sheet defaults are missing or unsupported;
  3. existing app defaults from `DEFAULT_METRONOME_SETTINGS` or `createSheetPracticeControlInitialState`.
- For no saved grid, `measureOneOffsetMs` must remain absent until set through a real timestamp or an explicit valid offset field. Do not default it to `0` unless the user has actually set or entered it.
- A malformed persisted grid already maps to `null` in P1-02. Treat it as `Needs calibration`, not a crash.

Save behavior:

- Build a `MeasureGrid` only from validated draft values.
- Call `saveGrid(sheetId, grid)` only when all fields are valid and a measure-one offset exists.
- On success, replace saved snapshot with returned validated grid and show `Calibrated`.
- On validation or service error, show recoverable error, leave the draft visible, and keep the previous saved snapshot unchanged.
- Reloading the browser after save must restore the same BPM, time signature, pickup beats, offset, and `Calibrated` status.

Dirty/unsaved behavior:

- Draft differs from saved snapshot: show `Unsaved changes`.
- New unsaved draft with no saved grid and no offset: show `Needs calibration`.
- New unsaved draft with all fields valid including offset: show `Unsaved changes` until saved.
- Sheet switch: reset load state for the new `sheetId`; no draft values from the old sheet may leak into the new sheet once the new load resolves.
- Navigation warning for unsaved grid changes is optional and out of scope unless an existing local pattern is trivial to reuse. Visible unsaved state is required.

Invalid input behavior:

- Invalid BPM, time signature, pickup beats, or offset blocks save.
- Invalid save attempts do not call the service and do not corrupt the previous saved grid.
- Invalid current draft must not break existing metronome, recording, session, reference, or viewer behavior.

## 5. Timestamp Contract

Primary contract:

- `Set measure 1 here` uses the current playback/scrub timestamp from an existing Sheet Practice viewer, transport, playback, or scrub boundary.
- The saved value is `measureOneOffsetMs`, an integer non-negative timestamp in milliseconds where measure 1 starts.
- The button must be near the calibration controls and clearly tied to the current practice timeline.

Current repo reality:

- `SheetPracticeControls` currently exposes metronome transport state and `lastTick`, but there is no obvious sheet media scrub timeline in the inspected code.
- `lastTick` is metronome tick metadata, not necessarily the same as a sheet/reference media scrub timestamp.

Implementation requirement:

- First reuse an existing current timestamp boundary if one exists in nearby viewer, playback, reference, or transport code discovered by the coding agent.
- If no legitimate current playback/scrub timestamp exists, do not invent fake media timing, do not use wall-clock time, and do not use a metronome tick index as sheet timeline without a documented adapter.
- The acceptable fallback for P1-03 is:
  - keep `Set measure 1 here` disabled with concise copy such as `No playback timestamp available`;
  - allow manual entry of `Measure 1 offset` in milliseconds; and
  - cover manual offset save/reload in E2E.
- If the coding agent can expose a tiny adapter from an existing deterministic timestamp source without changing media behavior, it may do so inside the allowed Sheet Practice integration scope. That adapter must be testable and must not start a new timing subsystem.

E2E timestamp handling:

- If a real timestamp boundary is available, E2E must move/scrub to a deterministic timestamp, click `Set measure 1 here`, and assert the offset.
- If only the fallback is available, E2E must assert `Set measure 1 here` is disabled for lack of timestamp, manually enter an offset, save, reload, and assert persistence. The test name should make clear that this is the current no-timestamp fallback.

## 6. Existing Patterns To Reuse And No-New-Wheel Constraints

Reuse:

- MeasureGrid domain validation and math from `src/domain/practice/measure-grid/index.ts`.
- P1-02 service boundary from `src/services/measure-grid/*` and `src/infrastructure/db/browser-measure-grid-service.ts`.
- Sheet Practice composition in `src/components/sheet-practice/viewer/sheet-viewer-experience.tsx` and `src/components/sheet-practice/controls/sheet-practice-controls.tsx`.
- Existing metronome default logic from `src/components/sheet-practice/controls/practice-control-state.ts`.
- Existing control UI patterns from `MetronomeSettingsPanel`, `TransportActionsPanel`, `StatusTile`, `LabeledSelect`, and `Button`.
- Existing E2E import/open-sheet helpers and IndexedDB cleanup style from `tests/e2e/sheet-practice-controls.spec.ts` and nearby Sheet Practice specs.
- Testing Library component test style from `tests/unit/sheet-practice-controls.test.tsx`.
- README PowerShell command style through `scripts/npm-local.ps1`.

No-new-wheel constraints:

- Do not add a new UI framework, form library, persistence library, router, global state library, or E2E harness.
- Do not hand-roll IndexedDB or bypass Dexie/service boundaries.
- Do not duplicate MeasureGrid validation rules in UI except for draft parsing needed to show field errors; final validation must go through domain/service validation.
- Do not create a new transport, audio scheduler, media playback engine, PDF parser, or scrub timeline.
- Do not draw PDF bar lines or overlays.
- Do not implement Practice Segment CRUD, segment selection, recording metadata, rerecording, take grouping, marker behavior, reference alignment, assisted page turning, cloud sync, import/export, or cleanup.

## 7. Functional Boundaries And Out Of Scope

In scope:

- Compact MeasureGrid calibration UI inside Sheet Practice.
- Draft load/save state for one active `sheetId`.
- Grid BPM, time signature, pickup beats, and measure-one offset controls.
- `Set measure 1 here` wired to an existing timestamp boundary, or a disabled/manual fallback if no boundary exists.
- Status states: `Needs calibration`, `Calibrated`, `Unsaved changes`, loading, saving, and save error.
- Persistence through P1-02 service.
- Component/unit tests for draft state, validation, service calls, and fallback timestamp behavior.
- Browser E2E for calibrate/save/reload, invalid inputs, responsive layout, and console errors.

Out of scope:

- Segment CRUD, segment selector, segment persistence, active segment state, or segment stale-grid status.
- Recording, rerecording, session history changes, or recording metadata updates.
- Mutating sheet default BPM/time signature from calibration UI.
- Automatic PDF/image bar-line detection, score following, BPM detection, mistake detection, scoring, or visual measure overlays.
- New media timeline, audio scheduler, waveform, or reference alignment behavior.
- Sheet deletion cascade cleanup for grids.
- Data import/export, backup/restore, conflict resolution, cloud sync, login, or cross-device resume.
- Broad Sheet Practice refactors not needed to mount the calibration UI.

## 8. Boundary Condition Matrix

| Condition | Required behavior | Required evidence |
| --- | --- | --- |
| Existing sheet with no saved grid | Sheet opens normally; calibration shows defaults and `Needs calibration`; v0 controls still work | Component test and E2E |
| Existing saved grid | Draft loads saved values and status is `Calibrated` | Component/service test and E2E reload |
| Malformed saved grid | Treat as no grid; no crash | Unit/component test with mocked service or seeded malformed row |
| Service `getGrid` rejects | Sheet still opens; panel shows recoverable load error | Component test |
| Service `saveGrid` rejects | Show error; draft remains editable; previous saved state not overwritten | Component test and source inspection |
| Invalid BPM below/above range | Field error; save disabled or blocked; service not called | Component test and E2E negative case |
| Invalid time signature | Unsupported value cannot be selected; invalid injected draft is rejected | Component test/source inspection |
| Invalid pickup beats | Pickup must be integer, non-negative, and less than numerator | Component test and E2E negative case |
| Invalid offset | Negative, fractional, missing, or non-finite offsets block save | Component test and E2E negative case |
| No timestamp boundary | `Set measure 1 here` disabled; manual offset path remains available | Component test and E2E fallback, if applicable |
| Timestamp available | Clicking `Set measure 1 here` writes current timestamp to draft offset | Component test with injected timestamp provider and E2E if available |
| Unsaved changes | Badge shows `Unsaved changes`; save enabled only when draft valid | Component test and E2E |
| Reload after save | Same grid values and `Calibrated` state restore | E2E with IndexedDB persistence |
| Sheet switch | New sheet loads its own grid/defaults; old draft does not leak | E2E or component test |
| Mobile layout | Calibration does not cover sheet or transport; labels do not clip | Responsive E2E |
| Tablet layout | Controls wrap cleanly; sheet and transport usable | Responsive E2E |
| Desktop layout | Sheet remains dominant; controls stable | Responsive E2E |
| Browser console/page errors | No console errors or page errors during flow | E2E console capture |
| Existing v0 controls | Start/stop metronome and existing recording controls still render and are not displaced | E2E smoke assertions |

## 9. Complete Test Plan

P1-03 owns browser E2E because P1-02 deliberately had no UI. P1-02 verified repository semantics and storage-boundary reload. P1-03 is the first slice where a real user can calibrate through Sheet Practice, so this slice must prove visible UI, service integration, page reload persistence, responsive behavior, invalid-input recovery, and console cleanliness.

Unit/component tests:

- Render calibration panel with no saved grid and valid sheet defaults; assert `Needs calibration`, default `Grid BPM`, `Grid time signature`, empty/manual offset state, and disabled save until offset exists.
- Render with a saved grid; assert values load and status is `Calibrated`.
- Edit BPM from a saved grid; assert `Unsaved changes` and save enabled when valid.
- Reject BPM `29`, `301`, fractional, and blank values; assert service `saveGrid` is not called.
- Reject pickup beats equal to numerator, negative, fractional, and blank if required.
- Reject negative/fractional/blank offset.
- Changing time signature revalidates pickup beats.
- `Set measure 1 here` with injected timestamp provider sets offset to the current integer timestamp.
- `Set measure 1 here` with no timestamp provider is disabled and exposes an accessible reason.
- Save success calls `saveGrid(sheetId, grid)`, then shows `Calibrated`.
- Save failure shows recoverable error, keeps draft values, and keeps previous saved snapshot.
- Sheet id change reloads grid/defaults for the new sheet and clears old sheet draft while loading.
- Component uses injected service in tests where possible rather than touching real Dexie.

Existing unit coverage to preserve:

- Keep `tests/unit/measure-grid.test.ts` passing for deterministic math.
- Keep `tests/unit/measure-grid-repository.test.ts` passing for P1-02 persistence and malformed data behavior.
- Keep existing Sheet Practice controls tests passing because this slice composes into the same control surface.

Browser E2E:

- Add a dedicated spec such as `tests/e2e/measure-grid-calibration.spec.ts` or a focused Sheet Practice spec.
- Clear relevant IndexedDB databases before the test, including `metronome-practice-v1-measure-grids`, plus sheet library/session DBs used by the imported sheet flow.
- Import or seed a real sheet fixture with BPM `72` and time signature `4/4`.
- Open Sheet Practice and assert the sheet viewer is visible and dominant.
- Assert calibration UI is visible with `Measure grid`, `Grid BPM`, `Grid time signature`, `Pickup beats`, `Measure 1 offset`, `Set measure 1 here`, and `Save grid`.
- If timestamp exists: move/scrub to deterministic timestamp, click `Set measure 1 here`, assert offset value.
- If timestamp fallback applies: assert `Set measure 1 here` is disabled with no timestamp reason, manually enter `1250` ms.
- Fill/edit BPM, time signature, pickup beats, and offset; assert `Unsaved changes`.
- Save and assert `Calibrated`.
- Reload the browser and assert BPM, time signature, pickup beats, offset, and `Calibrated` remain.
- Use page evaluation or UI evidence to confirm the saved IndexedDB row is scoped to the active `sheetId`.
- Open a second sheet with no grid and assert it shows `Needs calibration` and does not show the first sheet's grid.
- Negative inputs: try invalid BPM and invalid pickup/offset, assert field error and no saved calibrated state.
- Existing sheets without grids still open and metronome controls still render; basic start/stop smoke is desirable if it does not make the spec flaky.
- Capture console errors and page errors and assert none.

Responsive E2E:

- Desktop: `1280x820`.
- Tablet-like/iPad landscape: `1024x768`.
- Narrow mobile: `390x844`.
- At each viewport, assert sheet viewer scroll area, calibration panel, and `Start metronome` or equivalent transport control are visible and not incoherently overlapping.
- Reuse or adapt the bounding-box overlap helper from `tests/e2e/sheet-practice-controls.spec.ts`.
- On mobile, scroll the controls into view if needed, but do not accept a layout where controls cover the sheet or transport.

Manual QA:

- Compare Sheet Practice with `docs/v1/ui-design.md`, `docs/v0/design-style-guide.md`, and `Design Notes/design_pictures/overall_style_design.png`.
- Confirm the panel feels compact and secondary to the sheet.
- Confirm no automatic PDF measure detection or score-following claims appear.
- Confirm status labels do not clip or overlap at all required viewport widths.

## 10. Verification Commands

Use README-style PowerShell commands.

Targeted component/unit commands, adjusted to the final test filename:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run test:unit -- tests/unit/measure-grid-calibration.test.tsx
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run test:unit -- tests/unit/measure-grid.test.ts tests/unit/measure-grid-repository.test.ts tests/unit/sheet-practice-controls.test.tsx
```

Typecheck and lint:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run typecheck
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run lint
```

Targeted Playwright command, using the project script with a spec path:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run test:e2e -- tests/e2e/measure-grid-calibration.spec.ts
```

Full E2E or regression command when time allows:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run test:e2e
```

Install browsers only if missing in the environment:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run playwright:install
```

If the targeted Playwright script does not forward spec arguments in this repo, use the full `test:e2e` command and document that targeted forwarding was unavailable.

## 11. Review Checklist And Verification Checklist

Review checklist:

- [ ] Changed files stay within P1-03 allowed UI/test scope.
- [ ] UI calls P1-02 measure-grid service, not Dexie or repository internals.
- [ ] Sheet defaults and metronome defaults are used only for grid draft initialization.
- [ ] Grid edits do not mutate sheet metadata or existing metronome settings silently.
- [ ] `Needs calibration`, `Calibrated`, and `Unsaved changes` states are visible and accurate.
- [ ] Invalid fields block save and keep previous saved grid intact.
- [ ] Timestamp behavior uses a real existing boundary or the documented disabled/manual fallback.
- [ ] Browser reload persistence is covered.
- [ ] Desktop, tablet-like, and mobile layouts are covered.
- [ ] No segment CRUD, recording, session, reference, marker, analysis, cloud, import/export, cleanup, or PDF recognition behavior was added.
- [ ] Existing P1-01 and P1-02 tests still pass.

Verification checklist:

- [ ] Run targeted calibration unit/component tests.
- [ ] Run P1-01 and P1-02 regression tests.
- [ ] Run typecheck and lint.
- [ ] Run targeted measure-grid calibration Playwright spec or full E2E if targeting is unavailable.
- [ ] Verify calibrate/save/reload through real browser interaction.
- [ ] Verify negative input cases.
- [ ] Verify no-grid existing sheet opens normally.
- [ ] Verify sheet switch isolation.
- [ ] Verify console/page errors are empty.
- [ ] Verify responsive screenshots or bounding-box evidence at desktop, tablet-like, and mobile widths.
- [ ] Inspect changed files for service-boundary compliance and no adjacent feature scope.

## 12. Coding-Agent Handoff

Read before coding:

- `docs/v1/START-HERE.md`
- `docs/v1/status.json`
- `docs/v1/implementation-slices/README.md`
- `docs/v1/implementation-slices/01-practice-segment-mvp.md`
- `docs/v1/implementation-slices/plans/P1-03-measure-grid-calibration-ui.md`
- `docs/v1/05f-practice-segments.md`, especially `practice.measure-grid`
- `docs/v1/agent-implementation-rules.md`
- `docs/v1/ui-design.md`
- `docs/v0/project-structure.md`
- `docs/v0/tech-stack-decisions.md`
- `docs/v0/design-style-guide.md`
- `README.md` verification command section

Narrow code/design patterns to inspect:

- `src/domain/practice/measure-grid/index.ts`
- `src/services/measure-grid/*`
- `src/infrastructure/db/browser-measure-grid-service.ts`
- `src/components/sheet-practice/viewer/sheet-viewer-experience.tsx`
- `src/components/sheet-practice/controls/sheet-practice-controls.tsx`
- `src/components/sheet-practice/controls/metronome-settings-panel.tsx`
- `src/components/sheet-practice/controls/transport-actions-panel.tsx`
- `src/components/sheet-practice/controls/practice-control-state.ts`
- `src/components/sheet-practice/controls/labeled-select.tsx`
- `src/components/sheet-practice/controls/status-tile.tsx`
- `tests/unit/measure-grid.test.ts`
- `tests/unit/measure-grid-repository.test.ts`
- `tests/unit/sheet-practice-controls.test.tsx`
- `tests/e2e/sheet-practice-controls.spec.ts`
- Nearby Sheet Practice E2E specs only as needed for import/open-sheet helpers.

Allowed write scope:

- `src/components/sheet-practice/measure-grid/*` or a similarly narrow Sheet Practice calibration component folder.
- Minimal composition edits in `src/components/sheet-practice/controls/sheet-practice-controls.tsx` and related `types.ts` if needed.
- Minimal helper/hook file for calibration draft state if kept under Sheet Practice or measure-grid UI ownership.
- Minimal timestamp adapter prop or hook only if it wraps an existing timestamp boundary.
- Tests for the calibration UI under `tests/unit/` and `tests/e2e/`.
- Minimal test helper additions for clearing/seeding the measure-grid DB.

Forbidden write scope:

- Do not edit `docs/v1/status.json`.
- Do not edit product docs except implementation notes if explicitly assigned later.
- Do not change P1-01 domain math or P1-02 repository behavior unless a bug is discovered and the fix is required for this UI; if touched, explain and run their tests.
- Do not create Practice Segment domain, repository, selector, create/edit/delete UI, or stale-grid behavior.
- Do not change recording, session metadata, reference, marker, waveform, audio, sheet import, settings, cleanup, cloud, or review modules.
- Do not add dependencies, new UI frameworks, new persistence mechanisms, or new browser automation tools.
- Do not implement automatic PDF/image measure detection, score following, BPM detection, mistake detection, scoring, or bar-line overlays.

Preserve verified behavior:

- P1-01 measure math and validation remain the source of truth.
- P1-02 service remains the only persistence boundary for grids.
- Existing Sheet Practice controls continue to initialize from sheet defaults and work for sheets with no grid.
- Existing sheet viewer, reference panel, metronome, recording controls, session integration, and recording list counts must keep their current behavior.

## 13. Ready For Coding Recommendation

P1-03 can move to `ready_for_coding` after this plan file exists and is accepted as the durable planning artifact. Keep the slice at Tier C for coding, review, and verification unless implementation discovers that a real media/timing subsystem must be changed; in that case, pause and escalate before coding beyond the existing timestamp boundary.
