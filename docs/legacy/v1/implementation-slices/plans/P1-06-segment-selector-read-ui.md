# P1-06 Segment Selector Read UI Plan

## 1. Slice Identity And Status Assumptions

- Slice: `P1-06 segment-selector-read-ui`.
- Product feature: `practice.practice-segments`.
- Pack: `pack-1-practice-segment-mvp`.
- Current status assumption from `docs/v1/status.json`: `planning_ready`.
- Dependency assumptions: `P1-01 measure-grid-types-and-math`, `P1-02 measure-grid-repository`, `P1-03 measure-grid-calibration-ui`, `P1-04 segment-types-and-validation`, and `P1-05 segment-repository` are `verified`.
- Latest commit before this slice, per assignment: `c79b422 feat: add v1 practice segment repository`.
- Planning agent policy: `gpt-5.5`, medium effort, standard speed.
- Expected implementation tier after planning: Tier C.
- Escalation recommendation: stay Tier C. This is compact user-facing UI with browser E2E and responsive checks, but it should not add recording/media behavior, schema migration, destructive data operations, or create/edit/delete flows.
- This plan is documentation only. Do not edit product code and do not edit `docs/v1/status.json` during planning.

Recommendation after this file exists: P1-06 can move to `ready_for_coding` because the selector UI contract, service boundaries, edge cases, tests, verification commands, and coding-agent handoff are defined below.

## 2. Product And Design Intent From Docs

`practice.practice-segments` lets the user return to a saved focused passage, such as measures `5-12`, inside Sheet Practice. P1-06 is the read/select part of that feature only:

- Show existing Practice Segment records for the active sheet.
- Let the user select one active segment in the Sheet Practice workspace.
- Show the selected segment's name, inclusive measure range, optional target BPM, and timing status.
- Derive timing status from the current MeasureGrid plus the segment's grid association from P1-04.
- Preserve existing Sheet Practice behavior when no segments exist, no grid exists, the grid changed, or the segment service cannot load.

Design intent:

- Keep the sheet/PDF visually dominant.
- Place segment selection near the sheet title or in the right-side/secondary Sheet Practice controls area. Given current code, the lowest-risk first implementation is a compact panel composed near `MeasureGridCalibrationPanel` inside `SheetPracticeControls`.
- Use yellow for selected/active segment emphasis and primary practice state.
- Use small inline badges for `Active`, `Needs calibration`, `Grid changed`, and load/error states.
- Keep copy concise and honest. Do not imply automatic PDF measure detection, automatic score following, automatic BPM detection, automatic mistake detection, scoring, or automatic transport looping.
- On narrow mobile, the selector/list must wrap or collapse cleanly without covering bottom transport controls.

## 3. UI/UX Contract

Recommended placement:

- Add a compact segment selector/list panel in `src/components/sheet-practice/segments/`, then compose it from `src/components/sheet-practice/controls/sheet-practice-controls.tsx`.
- Place it in the bordered secondary area that currently contains MeasureGrid calibration, either above the grid panel or beside it on wider screens. It must not be a floating modal, large wizard, or marketing-style explanation panel.
- Use a stable `data-testid`, for example `practice-segment-selector-panel`, and stable child test ids for status/active segment where useful.

Required visible states:

- Loading: show a compact loading badge/line while segment and grid reads for the current sheet are pending.
- Empty list: when `listSegments(sheetId)` returns `[]`, show a concise empty state such as `No saved segments yet.` and keep Sheet Practice controls usable. Because P1-06 cannot create segments, do not show a fake create button. A disabled or secondary note can say creation is not available in this slice only if useful for tests, but avoid in-app instructional clutter.
- Existing segments: display each segment name and range. The list can be a vertical compact list, select-like control plus active summary, or segmented/radio-style list. It must be keyboard-accessible and screen-reader labeled.
- Active segment: selecting a segment updates local active selection immediately and displays an active summary with:
  - segment name;
  - range formatted like `Measures 5-12`;
  - target BPM as `Target 96 BPM` when present, or omit/mark `No target BPM` as compact metadata;
  - status badge derived from MeasureGrid association.
- Unselected state with segments present: show `Choose a segment` or equivalent compact prompt without defaulting to a hidden selection unless the implementation explicitly selects the first segment and makes that visible. Recommended: no auto-selection; user selection is explicit.
- Disabled/read-only limitations: all controls are read/select only. No inputs for name/range/BPM/notes, no edit/delete buttons, no create action, no drag/drop, no sheet overlay boxes, no transport loop toggle, no target BPM apply button.

Status mapping:

- `current` from `getPracticeSegmentGridStatus(segment, currentGrid)`: show active/current timing status, such as `Ready` or `Active`, and when selected it can use yellow-accent styling.
- `missing-grid`: show `Needs calibration`. Segment remains visible and selectable, but do not show usable derived timestamps or imply recording readiness.
- `stale`: show `Grid changed`. Segment remains visible and selectable so the user can see what exists, but derived timing is stale/needs review.
- `invalid-association`: show `Needs review` or `Invalid segment data`; do not crash. In normal reads, malformed repository rows should already be filtered, so this is mainly a defensive UI state.
- Service load error: show a recoverable error message in the segment panel only; do not break metronome, recording controls, viewer, or MeasureGrid calibration.

Range and timing display:

- Always show inclusive measure range from `segment.range`.
- Do not duplicate MeasureGrid math in UI.
- If current grid is available and status is `current`, the component may call `getPracticeSegmentRangeMs(segment, currentGrid)` to display compact derived timing such as `00:08-00:24` only if formatting stays concise and is covered by tests. This is optional for P1-06. The required display is range + target BPM + status.
- If grid is missing/stale/invalid, do not display calculated timing as authoritative.

Mobile layout:

- The segment panel must stack without clipped badges or controls.
- The list must remain usable at `390x844` or similar.
- The Sheet Practice viewer and transport controls must remain reachable; no sticky or absolute segment UI may cover them.

## 4. Data And Service Contract

Read existing segments:

- Use `browserPracticeSegmentService` from `src/infrastructure/db/browser-practice-segment-service.ts` only as the default injected implementation.
- UI/component code should depend on the `PracticeSegmentService` type from `src/services/practice-segments`, not Dexie or repository internals.
- Call `practiceSegmentService.listSegments(sheetId)` when the active `sheetId` changes.
- Treat an empty result as a valid empty state.
- Treat service rejection as a local panel error with retry on sheet change or component remount. A retry button is optional; if added, it must only re-run reads.

Read current MeasureGrid:

- Use the existing injected `measureGridService` already passed to `SheetPracticeControls`.
- Call `measureGridService.getGrid(sheetId)` for current grid status. Do not mutate or save MeasureGrid from the segment selector.
- The selector should not depend on MeasureGrid calibration panel internals or draft state. It reads only the saved grid.

Select segment:

- Active selection is local Sheet Practice UI state for this slice.
- Store selected segment id in React state owned by the segment panel or `SheetPracticeControls`.
- Selecting a segment must not call `saveSegment`, `deleteSegment`, recording services, session services, localStorage, or Dexie directly.
- If the selected segment disappears from a later `listSegments` result for the same sheet, clear active selection and show the unselected/empty state as appropriate.
- If `getSegment` is not needed, do not call it; `listSegments` already returns full `PracticeSegment` objects. Use `getSegment` only if implementation chooses a defensive re-read before selection.

Sheet switch behavior:

- When `sheetId` changes, show loading for the new sheet and prevent stale segments from the previous sheet being displayed as active for the new sheet.
- Clear the active selected segment id until the new sheet's list has loaded.
- Segments from other sheets must not appear. This should be guaranteed by `listSegments(sheetId)` and verified in E2E.
- If the same component instance receives a new `sheetId`, ignore in-flight results from the old sheet.

MeasureGrid stale helpers:

- Reuse `getPracticeSegmentGridStatus(segment, currentGrid)` from `src/domain/practice/segments/index.ts`.
- Reuse `getPracticeSegmentRangeMs(segment, currentGrid)` only if displaying derived timestamps.
- Do not create new grid-version logic in UI.
- Do not inspect `segment.grid.measureGridVersion` directly except through the domain helper.

Malformed repository rows:

- P1-05 normalizes and filters invalid persisted rows. P1-06 should rely on service output for valid `PracticeSegment[]`.
- Defensive UI should still handle a segment producing `invalid-association` without throwing.

## 5. Existing Patterns To Reuse And No-New-Wheel Constraints

Reuse:

- `MeasureGridCalibrationPanel` load-state, injected service, stale-sheet guard, compact badge styling, and `data-testid` pattern.
- `SheetPracticeControls` dependency injection pattern for services.
- `SheetPracticeControlsProps` in `src/components/sheet-practice/controls/types.ts`; extend it with an optional `practiceSegmentService?: PracticeSegmentService`.
- P1-04 domain helpers:
  - `getPracticeSegmentGridStatus`
  - `getPracticeSegmentRangeMs` if needed
  - `type PracticeSegment`
  - `type PracticeSegmentGridStatus`
- P1-05 service boundary:
  - `PracticeSegmentService`
  - `browserPracticeSegmentService`
- Existing UI primitives such as `Button` only if an actual command exists. Prefer native/select/radio/list buttons with accessible labels over custom controls.
- Existing Tailwind/shadcn-compatible patterns, lucide icons only when they add real clarity.
- Existing test patterns in `tests/unit/measure-grid-calibration.test.tsx`, `tests/unit/sheet-practice-controls.test.tsx`, and `tests/e2e/measure-grid-calibration.spec.ts`.

No-new-wheel constraints:

- Do not add a new global state library, persistence layer, form library, router pattern, CSS-in-JS system, component framework, test runner, or browser automation tool.
- Do not call IndexedDB/Dexie from React components.
- Do not duplicate MeasureGrid timing/version math in UI.
- Do not create a second active-selection persistence model.
- Do not refactor Sheet Practice layout broadly.
- Do not move MeasureGrid calibration UI unless absolutely required for composition; if touched, preserve all P1-03 tests and behavior.
- Do not implement a custom select/menu/popover primitive if a simple accessible native control or existing button/list pattern satisfies the slice.

## 6. Out Of Scope

P1-06 must not implement:

- Create segment UI.
- Edit segment UI.
- Delete segment UI.
- Segment name/range/target BPM/notes form fields.
- Recording changes, `segmentId` recording metadata, recording artifacts, rerecording, take grouping, review navigation, waveform comparison, or latest/best take semantics.
- Persistence schema changes beyond using the existing P1-05 service.
- Saving or persisting active segment selection.
- Applying target BPM to metronome controls.
- Bar-aware count-in, automatic transport looping, automatic seek-to-segment, AB loop creation, reference binding, or assisted page turning.
- MeasureGrid calibration changes or MeasureGrid schema changes.
- Drawing detected bar lines, visual box selection, PDF/image measure recognition, score following, BPM detection, mistake detection, scoring, analytics, cloud sync, accounts, backup/restore, migration, import/export, or cleanup.
- Editing `docs/v1/status.json`.

## 7. Boundary Matrix

| Condition | Required behavior | Required evidence |
| --- | --- | --- |
| No segments for active sheet | Show concise empty state; no create/edit/delete UI; existing Sheet Practice controls remain usable | Component test and E2E |
| No saved MeasureGrid | Segment list still loads; statuses show `Needs calibration`; no authoritative timing display | Component test and E2E |
| Stale grid | Segment remains visible/selectable; status shows `Grid changed` or equivalent; no crash | Component test using changed grid |
| Current grid | Segment can show current/ready status; selected summary shows active state, range, and target BPM | Component test and E2E |
| Missing segment after reload/delete elsewhere | If selected id is absent after list reload or sheet remount, clear active selection and show unselected/empty state | Component test with rerendered service result |
| Segment service error | Segment panel shows recoverable local error; viewer, metronome controls, recording controls, and MeasureGrid panel stay usable | Component test |
| MeasureGrid service error | Segment panel treats grid as unavailable/needs calibration or shows compact status error; segment list still renders when segment service succeeds | Component test |
| Sheet switch | Old sheet segments disappear; active selection clears or reloads for new sheet; other sheet's segments never appear | Component test and E2E |
| In-flight old-sheet read resolves late | Ignore stale result and keep new sheet state correct | Component test with controlled promises |
| Invalid/malformed repository rows already normalized by service | UI assumes returned list is valid; defensive `invalid-association` status does not crash | Source inspection plus component defensive test if easy |
| Target BPM missing | Active/row metadata omits target BPM or shows compact `No target BPM`; no layout shift/clipping | Component test |
| Long segment name | Truncates/wraps professionally without overlapping badges/buttons | Component or responsive visual check |
| Mobile layout | Segment panel/list remains usable at narrow width and does not cover sheet or transport controls | E2E responsive checks |

## 8. Exact Test Plan

Unit/component tests:

- Add `tests/unit/practice-segment-selector.test.tsx` for the new selector component.
- Render with injected fake `PracticeSegmentService` and `MeasureGridService`.
- Test loading to empty state for `listSegments` returning `[]`.
- Test service error renders a local recoverable error and does not throw.
- Test rows display segment name, `Measures 5-12`, target BPM when present, and no target BPM handling when `null`.
- Test selecting a segment updates active summary and visible active badge/state.
- Test `current`, `missing-grid`, `stale`, and defensive `invalid-association` status mapping.
- Test selection does not call `saveSegment` or `deleteSegment` on the injected fake service.
- Test rerender/sheet switch clears previous active selection and calls `listSegments`/`getGrid` with the new `sheetId`.
- Test a selected segment missing from a later list clears active selection.
- Test late old-sheet promise resolution is ignored if the implementation has async race protection.
- Extend `tests/unit/sheet-practice-controls.test.tsx` only enough to verify the segment panel is composed and receives injected `practiceSegmentService` and `measureGridService`; avoid broad control rewrites.

Browser E2E:

- Add `tests/e2e/practice-segment-selector.spec.ts`.
- Use real browser interaction because Tier C requires verifying visible Sheet Practice UI, selection behavior, sheet switch scoping, console errors, and responsive layout.
- Seed/import two real sheets using the existing sheet-library E2E pattern.
- Seed a calibrated MeasureGrid for sheet A and sheet B through IndexedDB or through the visible MeasureGrid UI if practical.
- Seed existing Practice Segment rows through IndexedDB in the P1-05 database (`metronome-practice-v1-practice-segments`) using valid segment shape and grid association. Prefer direct IndexedDB seeding for P1-06 because create/edit UI is out of scope.
- Open Sheet Practice for sheet A.
- Verify segment selector/list is visible and secondary to the sheet/controls.
- Verify sheet A segments appear, including name, range, target BPM, and current status.
- Select a segment and verify active summary updates.
- Reload the page and verify saved segments still list while active selection either clears or restores only if intentionally local-to-current-mount; recommended expectation is active selection clears because P1-06 does not persist it.
- Open sheet B and verify sheet A segments do not appear.
- Verify no-grid sheet or sheet with missing MeasureGrid shows `Needs calibration` status for its seeded segment without breaking the page.
- Verify stale grid by seeding a segment association from one grid and a current saved grid with changed BPM/offset; expect `Grid changed`.
- Resize to desktop (`1280x820`), tablet-like/iPad landscape (`1024x768`), and narrow mobile (`390x844`), scroll controls into view as existing tests do, and verify the selector/list, sheet viewer, and transport controls remain usable.
- Capture console/page errors during the flow and expect none.

Why E2E is required for Tier C:

- P1-06 is user-facing UI in Sheet Practice. Component tests can prove state transitions, but only browser E2E can prove the selector is actually composed into the route, segments are read from real IndexedDB through the P1-05 service, selection works through user interaction, sheet switch scoping holds in the app shell/viewer route, responsive layout remains usable, and no browser console errors appear.

Source/boundary inspection:

- Confirm React components import only domain helpers and service types/default browser service, not Dexie classes or table internals.
- Confirm no calls to `saveSegment`, `deleteSegment`, recording services, session metadata creation for segment context, or target BPM application were added.
- Confirm no MeasureGrid math/version logic was copied into UI.

## 9. Verification Commands

Use README-style PowerShell commands.

Targeted component/unit commands:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run test:unit -- tests/unit/practice-segment-selector.test.tsx
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run test:unit -- tests/unit/sheet-practice-controls.test.tsx
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run test:unit -- tests/unit/practice-segment-domain.test.ts
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run test:unit -- tests/unit/practice-segment-repository.test.ts
```

Targeted E2E command:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run test:e2e -- tests/e2e/practice-segment-selector.spec.ts
```

Typecheck, lint, and build:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run typecheck
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run lint
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run build
```

Broader regression when time allows:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run test:unit
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run test:e2e
```

If Playwright browsers are not installed:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run playwright:install
```

## 10. Review And Verification Checklist

Review checklist:

- [ ] Changed files stay inside allowed P1-06 UI/composition/test scope.
- [ ] Segment selector is read/select only: no create/edit/delete UI and no mutation calls.
- [ ] UI uses `PracticeSegmentService` and `MeasureGridService` boundaries; no direct Dexie/IndexedDB calls from components.
- [ ] Active selection is local UI state and not persisted.
- [ ] Sheet switch clears/reloads selection and cannot show previous sheet segments.
- [ ] Grid status uses P1-04 helpers rather than duplicated version/math logic.
- [ ] Empty, no-grid, stale-grid, service-error, and selected states are visible and concise.
- [ ] Target BPM is displayed as descriptive metadata only; it is not applied to metronome controls.
- [ ] MeasureGrid calibration behavior from P1-03 remains intact.
- [ ] Existing Sheet Practice metronome, recording, viewer, reference panel, and session behavior remain intact.
- [ ] No recording/session/take/marker/reference/cloud/analysis behavior was added.
- [ ] No persistence schema changes beyond using the existing segment and grid services.
- [ ] UI follows `docs/v1/ui-design.md` and `docs/v0/design-style-guide.md`: light workspace, compact panel, yellow active emphasis, no wizard/hero/gradient/text-heavy panel.
- [ ] `docs/v1/status.json` was not edited.

Verification checklist:

- [ ] Run targeted selector component tests.
- [ ] Run Sheet Practice controls regression tests.
- [ ] Run practice segment domain and repository regression tests.
- [ ] Run typecheck.
- [ ] Run lint.
- [ ] Run build.
- [ ] Run targeted Playwright E2E for list/select/sheet switch/no-grid/stale-grid/responsive checks.
- [ ] Verify browser console/page errors are empty during E2E.
- [ ] Inspect source boundaries for no storage bypass, no duplicated MeasureGrid math, and no adjacent feature mutations.
- [ ] Verify desktop, tablet-like, and mobile viewports do not clip/overlap the selector or cover sheet/transport controls.

## 11. Coding-Agent Handoff

Read before coding:

- `docs/v1/START-HERE.md`
- `docs/v1/status.json`
- `docs/v1/implementation-slices/README.md`
- `docs/v1/implementation-slices/01-practice-segment-mvp.md`
- `docs/v1/implementation-slices/plans/P1-06-segment-selector-read-ui.md`
- `docs/v1/05f-practice-segments.md`, especially `practice.practice-segments` and `practice.measure-grid`
- `docs/v1/agent-implementation-rules.md`
- `docs/v1/ui-design.md`
- `docs/v0/design-style-guide.md`
- `docs/v0/project-structure.md`
- `docs/v0/tech-stack-decisions.md`
- `README.md` verification command section

Code patterns to inspect:

- `src/domain/practice/segments/index.ts`
- `src/services/practice-segments/*`
- `src/infrastructure/db/browser-practice-segment-service.ts`
- `src/services/measure-grid/*`
- `src/infrastructure/db/browser-measure-grid-service.ts`
- `src/components/sheet-practice/measure-grid/measure-grid-calibration-panel.tsx`
- `src/components/sheet-practice/controls/sheet-practice-controls.tsx`
- `src/components/sheet-practice/controls/types.ts`
- `src/components/sheet-practice/viewer/sheet-viewer-experience.tsx`
- `src/app/sheet-practice/[sheetId]/page.tsx`
- `tests/unit/measure-grid-calibration.test.tsx`
- `tests/unit/sheet-practice-controls.test.tsx`
- `tests/e2e/measure-grid-calibration.spec.ts`
- Existing Sheet Practice E2E files for route setup and responsive checks.

Allowed write scope:

- New selector component files under `src/components/sheet-practice/segments/`.
- Minimal composition edits in `src/components/sheet-practice/controls/sheet-practice-controls.tsx`.
- Minimal prop type edits in `src/components/sheet-practice/controls/types.ts`.
- Tests for the new selector and narrow Sheet Practice controls composition.
- New targeted E2E file for selector list/select/sheet switch/responsive behavior.
- Minimal test helper code inside the new test files.

Forbidden write scope:

- Do not edit `docs/v1/status.json`.
- Do not change P1-04 domain semantics or P1-05 persistence schema unless a verified bug blocks P1-06; if so, stop and return to planning.
- Do not change MeasureGrid calibration save/load behavior.
- Do not add create/edit/delete segment UI or service mutations.
- Do not persist active segment selection.
- Do not modify recording metadata, recording artifacts, sessions, review pages, takes, waveform, markers, references, analysis, cloud, account, backup/restore, import/export, cleanup, or migration modules.
- Do not apply target BPM to metronome state.
- Do not add automatic PDF/image measure detection, score following, mistake detection, scoring, automatic looping, bar-aware count-in, or visual segment boxes on the sheet.
- Do not add dependencies or change framework/test tooling.

Preserve verified behavior:

- P1-01 MeasureGrid math remains the source of truth for timing.
- P1-02 MeasureGrid repository remains the current-grid read boundary.
- P1-03 MeasureGrid calibration UI remains usable and covered by existing tests.
- P1-04 segment domain helpers remain the stale-status source of truth.
- P1-05 segment service remains the only segment persistence boundary.
- Existing v0 Sheet Practice, Sheet Library, metronome, recording, review, session, reference, and settings flows must continue to work.

## 12. Ready For Coding Recommendation

P1-06 can move to `ready_for_coding` after this planning file is accepted as the durable planning artifact. Keep coding/review/verification at Tier C:

```text
Coding agent: gpt-5.5, high effort, standard speed
Review agent: gpt-5.4, medium effort, standard speed
Verification agent: gpt-5.4-mini, high effort, standard speed
```

Escalate only if implementation discovers unavoidable persistence migration, shared Sheet Practice architecture rewiring, or recording/session coupling. In that case, stop and return to planning instead of expanding P1-06.
