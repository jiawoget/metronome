# P4-02 Segment Tempo UI Plan

## Slice

- Slice: `P4-02 segment-tempo-ui`
- Product feature: `controls.segment-tempo`
- Product contract: `docs/v1/05b-practice-controls.md`
- Slice file: `docs/v1/implementation-slices/04-practice-controls-upgrade.md`
- Required prerequisite: verified `P4-01 segment-tempo-apply-policy`
- Planning model: `gpt-5.5`, medium effort, standard speed
- Recommended implementation tier: Tier C, user-facing UI with browser E2E

## Refined Scope

Add compact Sheet Practice controls that let a user apply the active practice segment's `targetBpm` to the current Sheet Practice BPM before or during practice, using the verified pure policy from P4-01.

The implementation should:

- Surface the currently selected segment's tempo policy near the existing Sheet Practice metronome BPM controls.
- Reuse `getSegmentTempoApplyPolicy` from `src/domain/practice/segment-tempo-apply-policy.ts`; do not duplicate policy logic in React.
- Lift or expose the active segment from `PracticeSegmentSelectorPanel` to `SheetPracticeControls` with a sheet-scoped callback/prop contract so the parent can compute the policy against committed `settings.bpm`.
- Add an explicit apply action for the selected segment target BPM when the policy status is `applied`.
- Update the existing BPM state by calling only `updateSettings({ bpm: policy.nextBpm })`, so `bpmDraft`, tick interval text, metronome service updates, and session start behavior continue using the single existing settings source of truth.
- Render honest disabled/neutral states for `no-segment`, `no-target-bpm`, and `already-applied`.
- Keep the UI compact and secondary so the sheet, transport controls, segment selector, and measure grid remain usable across desktop, tablet-like, and narrow mobile widths.

Preferred UX behavior:

- No selected segment: show a small neutral status such as `Select a segment to use target BPM`; apply action disabled or hidden.
- Selected segment without target BPM: show the segment name and `No target BPM`; apply action disabled.
- Selected segment target equals current normalized BPM: show `Target already applied` or equivalent; apply action disabled.
- Selected segment target differs from current BPM: show the target and an `Apply target BPM` action that sets the BPM to the policy `nextBpm`.
- After applying, the BPM input should immediately reflect the next BPM and the status should move to `already-applied`.

The coding agent may adjust exact microcopy to match local style, but tests should assert stable accessible names and state changes rather than decorative wording.

## Selector Callback Contract

The selected segment callback must be sheet-scoped, not a naked `PracticeSegment | null`. Preferred shape:

```ts
onSelectedSegmentChange?: (selection: {
  sheetId: string;
  segment: PracticeSegment | null;
}) => void;
```

An equivalent named type is acceptable if it preserves the same semantics.

`PracticeSegmentSelectorPanel` must send the current selector `sheetId` with every selected segment notification. `SheetPracticeControls` must verify both:

- `selection.sheetId === current sheetId`
- `selection.segment === null || selection.segment.sheetId === current sheetId`

If either check fails, the parent must clear active segment tempo state rather than display or apply stale target BPM data.

## Out Of Scope

- P4-03 and later bar-aware count-in domain/scheduler/UI work.
- Starting, stopping, rescheduling, or otherwise changing the metronome scheduler beyond the existing settings update path.
- Timing evidence for new count-in or scheduler behavior.
- P4-06/P4-07 per-sheet preset domain, repository, Dexie schema/migration, or preset UI.
- Recording/session persistence changes, recording artifact changes, rerecord workflow schema changes, or `SheetRecordingMetadata` changes.
- Persisting segment tempo application as a saved sheet preference or session event.
- Command palette, Home dashboard, Continue Practice recommendations, analytics, or broad navigation changes.
- Quick Metronome UI changes.
- New dependencies, new UI primitive systems, or hand-rolled select/dialog/menu primitives.
- Changing segment creation/edit validation range or P4-01 policy behavior.

## Likely Files And Areas

Primary implementation candidates:

- `src/components/sheet-practice/controls/sheet-practice-controls.tsx`
  - Owns Sheet Practice metronome settings state and can compute/apply the P4-01 policy.
  - Should hold the selected segment state needed by the tempo UI.
  - Must validate sheet-scoped selection callbacks before storing selected segment state.
- `src/components/sheet-practice/segments/practice-segment-selector-panel.tsx`
  - Add a narrow optional sheet-scoped callback such as `onSelectedSegmentChange({ sheetId, segment })` or equivalent.
  - Invoke the callback when selection changes, when the selected segment disappears, when the sheet changes, when loading fails, when the list is empty, and after load/editor/delete flows that alter active selection.
- `src/components/sheet-practice/segments/...` or `src/components/sheet-practice/controls/...`
  - A small focused component is acceptable if it keeps `sheet-practice-controls.tsx` from growing materially. Prefer a controls-owned component if the control is rendered with metronome settings.
- `src/components/sheet-practice/controls/metronome-settings-panel.tsx`
  - Optional: add a compact child/slot only if that fits the existing panel layout better than rendering adjacent markup from the parent.
- `src/components/sheet-practice/controls/types.ts`
  - Only if prop typing needs to expose the selected segment callback or a test seam.

Existing domain/service files to reuse, not reimplement:

- `src/domain/practice/segment-tempo-apply-policy.ts`
- `src/domain/practice/index.ts`
- `src/lib/quick-metronome/use-metronome-settings-state.ts`
- `src/lib/quick-metronome/control.ts`

Test candidates:

- `tests/unit/sheet-practice-controls.test.tsx`
- `tests/unit/practice-segment-selector.test.tsx` only if the selector callback contract needs direct unit coverage.
- `tests/e2e/practice-segment-selector.spec.ts` or a new focused `tests/e2e/segment-tempo-ui.spec.ts`.
- `tests/e2e/sheet-practice-controls.spec.ts` only if the new scenario is best folded into existing controls timing coverage without making that test too broad.

## Acceptance Criteria

- The Sheet Practice UI exposes a compact segment tempo apply control when the active selected segment is known.
- The control uses `getSegmentTempoApplyPolicy` for all status and next-BPM decisions.
- Selecting a segment with `targetBpm: 96` while the current BPM is `72` enables an apply action; clicking it updates the BPM input to `96` and updates tick interval/status text through existing settings state.
- Selecting a segment whose target BPM clamps above the metronome maximum, such as `300`, applies the P4-01 `nextBpm` value rather than inventing UI-side clamp logic.
- A selected segment with `targetBpm: null` clearly reports that no target BPM is available and does not offer an enabled apply action.
- A selected segment whose normalized target equals the current normalized BPM reports that the target is already applied and does not offer an enabled apply action.
- With no selected segment, the UI remains neutral and does not change BPM.
- Selection changes, segment deletion, segment edits, sheet changes, selector load failure, empty segment lists, and reload without an active selection clear or refresh the displayed segment tempo state instead of leaving stale target data.
- Applying target BPM does not start playback, stop playback, start recording, save a preset, write Dexie/localStorage, or create/update a practice session by itself.
- The UI remains responsive: no clipped labels, no overlapping controls, no controls covering the sheet/viewer, and the segment/measure panels remain reachable at desktop, tablet-like, and narrow mobile sizes.

## Boundary Conditions

- `PracticeSegmentSelectorPanel` currently owns `selectedSegmentKey`; P4-02 may lift state through a callback but should not move segment repository ownership or rewrite the selector.
- The selected segment state passed to `SheetPracticeControls` must be scoped to the current `sheetId`; stale callbacks from a prior sheet or async load must clear active segment tempo state and must not display/apply old data.
- If the selected segment is deleted, the parent selected segment state must become `null`.
- If a selected segment is edited and its target BPM changes, the parent state must receive the updated segment so the policy updates without a full page reload.
- If segment loading fails, the tempo control should fall back to the no-selected-segment/neutral state and preserve the existing selector error behavior.
- If the current BPM draft is mid-edit and not committed, applying a segment target must use committed `settings.bpm` as the policy `currentBpm`, must not call `commitBpmInput()`, and must call only `updateSettings({ bpm: policy.nextBpm })`. The visible BPM spinbutton/draft should then become `policy.nextBpm` through the existing hook.
- If the metronome is playing, BPM remains editable today; applying a target BPM may use the same settings update path as manual BPM changes and must not alter the existing lock behavior for meter/subdivision/accent/countdown.
- If recording is active, applying target BPM must not affect recording lifecycle or segment recording context.
- If target BPM is valid for segment storage but outside playback range, P4-01 policy determines `nextBpm`; UI must not show contradictory "apply 300 BPM" behavior if the actual BPM will be 240.
- The control must use accessible button names and status text that can be located by Testing Library and Playwright.

## Test Coverage Plan

Unit/component tests:

- In `tests/unit/sheet-practice-controls.test.tsx`, render `SheetPracticeControls` with a segment service containing one segment with target BPM lower/higher than `defaultBpm`; select the segment and verify the apply control becomes enabled.
- Click `Apply target BPM` and assert the BPM spinbutton value changes to the P4-01 `nextBpm`, the tick interval text updates, and the control moves to the already-applied/disabled state.
- Cover mid-edit draft behavior: type an uncommitted BPM draft value, select/apply a segment target, assert the policy used committed `settings.bpm`, assert `commitBpmInput()` was not required/called as part of apply, and assert the visible BPM spinbutton becomes `policy.nextBpm`.
- Cover `targetBpm: null`: selected segment renders a no-target state and no enabled apply action.
- Cover already-applied: `defaultBpm` equal to selected target renders an already-applied state and does not change BPM.
- Cover clamp policy: selected segment `targetBpm: 300` from current `120` applies BPM `240`; selected `targetBpm: 300` from current `240` is already applied.
- Cover selection changes between two segments so the displayed target and enabled state update.
- Cover callback sheet scope: selector callback includes the current `sheetId`; parent ignores or clears state for a stale callback with a previous sheet id, and also clears when `segment.sheetId` does not match the current sheet.
- Cover delete of the selected segment clearing parent state and verify the tempo UI no longer shows the old target.
- Cover edit of the selected segment changing `targetBpm`; the callback must propagate the updated segment and the parent must recompute policy without reload.
- Cover selector load failure and empty segment list clearing parent active tempo state while preserving the selector's existing error or empty-state UI.
- Cover callback propagation from `PracticeSegmentSelectorPanel` either through the Sheet Practice controls test or, if cleaner, a focused selector unit test.

Integration/service tests:

- No repository or service integration tests are required because P4-02 should not add service/repository methods or persistence behavior.

Browser E2E:

- Add a focused Playwright scenario that imports a sheet, saves a measure grid, creates a segment with target BPM, selects it, applies the target BPM, and verifies the visible BPM input changes.
- The E2E should verify reload behavior honestly: after page reload there should be no stale selected segment apply state unless the existing route `returnSegmentId` flow selects a segment. Re-selecting the saved segment should restore the apply UI from persisted segment data.
- Verify no session is created by apply alone by checking the existing practice snapshot helper still reports no sessions before playback/recording.
- Verify applying a target before starting playback causes the next `Start metronome` session/tick behavior to use the applied BPM through existing controls evidence, if feasible without making the E2E too slow.
- Include responsive checks at `1280x820`, `1024x768`, and `390x844` that the Sheet Practice controls, segment selector, measure grid panel, BPM input, and apply action/status remain visible/usable without overlap or clipping.

Negative cases:

- No selected segment.
- Selected segment without target BPM.
- Selected target already applied.
- Target BPM above metronome max using P4-01 clamp result.
- Stale sheet-scoped callback from a previous sheet.
- Selected segment whose `sheetId` does not match the parent sheet.
- Deleting or editing selected segment after the control has rendered.
- Segment load failure and empty list clearing active tempo state while preserving selector error/empty UI.

Fixtures:

- Reuse existing sheet import, storage cleanup, measure grid, and segment editor helpers from current E2E tests where possible.
- Reuse existing `createTestSegment`, `createPracticeSegmentService`, and `createMeasureGridService` patterns in component tests.
- Do not add audio, recording, waveform, PDF-rendering, Dexie migration, or session persistence fixtures.

## Verification Evidence

Coding verification should run the narrowest relevant checks first:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/sheet-practice-controls.test.tsx
```

If `PracticeSegmentSelectorPanel` gets focused unit tests, include:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/practice-segment-selector.test.tsx
```

Run focused browser E2E for the new apply behavior:

```powershell
& .\scripts\npm-local.ps1 --% run test:e2e -- tests/e2e/practice-segment-selector.spec.ts
```

If the coding agent creates a new focused spec, run that exact file instead of broadening an unrelated E2E command.

Then run targeted project checks:

```powershell
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint -- <changed source and test files>
git diff --check
```

Verification should explicitly report:

- browser engine used for E2E, for example Playwright `[chromium]` rather than real Chrome unless real Chrome was actually used;
- viewport sizes checked for responsive behavior;
- source inspection confirmed Sheet Practice UI imports/calls `getSegmentTempoApplyPolicy`;
- source inspection confirmed React UI does not duplicate the target-BPM status enum, clamp comparison, normalization, `Math.min`/`Math.max`, or `MAX_BPM`/`MIN_BPM`-style BPM policy logic for segment tempo application;
- tests assert behavior through visible UI state and user interactions rather than a parallel reimplementation of the P4-01 policy in test code;
- no product persistence schema, Dexie migration, recording artifact, practice session repository, count-in scheduler, preset, Home, or command palette files changed;
- no product code beyond the planned UI/control boundary changed.

## Review Checklist

Review must inspect the source, not only test output, and confirm:

- The UI imports/calls `getSegmentTempoApplyPolicy` for status and next BPM.
- The UI does not recreate `SegmentTempoApplyStatus` branching from raw target BPM, duplicate clamp comparisons, perform manual normalization with `Math.min`/`Math.max`, or import/use `MAX_BPM`/`MIN_BPM` as a segment-tempo policy substitute.
- The apply handler uses committed `settings.bpm` through the P4-01 policy and calls only `updateSettings({ bpm: policy.nextBpm })`.
- The apply handler does not call `commitBpmInput()` and does not read uncommitted draft text as policy input.
- The selector callback contract is sheet-scoped and the parent clears state on stale sheet id or mismatched segment sheet id.
- Tests assert observable UI behavior, visible BPM value, disabled/enabled action state, and selector error/empty UI preservation instead of duplicating the pure policy in test-only helpers.

## Reuse And Boundary Constraints

- Reuse `getSegmentTempoApplyPolicy`; do not reimplement target BPM status, validation, clamping, or comparison in UI.
- Reuse `updateSettings({ bpm: policy.nextBpm })` from `useMetronomeSettingsState`; do not create a second BPM state source, do not call `commitBpmInput()` from apply, and do not derive policy input from uncommitted BPM draft text.
- Reuse existing segment selector/service flows; do not add a new segment repository read path solely for the apply control if the selector already has the selected segment.
- Keep `PracticeSegmentSelectorPanel` responsible for segment CRUD and active selection UI; only expose selection state upward through a minimal sheet-scoped prop/callback.
- Keep UI code in `src/components/sheet-practice/controls/` and `src/components/sheet-practice/segments/`; do not touch Quick Metronome UI unless a type import path truly requires it.
- Do not edit `BrowserMetronomeService`, Tone adapter code, scheduler trace events, recording services, practice session repositories, Dexie database versions, or app navigation.
- Do not add dependencies or new global state. Zustand store changes are not expected for this slice.
- Use existing Tailwind/shadcn-compatible Button styling and lucide icons only if a small icon clarifies the action. Do not create decorative visual assets.
- Keep copy compact; do not add tutorial text or large cards.

## Status And Review Gates

- Initial external plan review verdict: `PASS_WITH_CHANGES`.
- The required deltas were applied and the external delta review returned `PASS`, so P4-02 may be treated as implementation-ready.
- Only after that delta `PASS`, `P4-02 segment-tempo-ui` may move to `ready_for_coding`.
- `pack-4-practice-controls-upgrade` must remain `planning_in_progress` during this planning delta.
- `P4-01 segment-tempo-apply-policy` remains `verified`.
- `P4-03` and later Pack 4 slices remain `not_started`.
- Do not mark Pack 4 or P4-02 as `coding_in_progress`, `review_in_progress`, `verification_in_progress`, or `verified` as part of this planning update.

## Handoff Notes

P4-02 is a UI wiring slice. The coding agent should implement only the compact apply/override controls and tests needed to prove the selected segment target BPM can update the existing Sheet Practice BPM.

Recommended coding prompt paths:

- `docs/v1/START-HERE.md`
- `docs/v1/implementation-slices/plans/P4-02-segment-tempo-ui.md`
- `docs/v1/implementation-slices/04-practice-controls-upgrade.md`
- `docs/v1/implementation-slices/plans/P4-01-segment-tempo-apply-policy.md`
- `docs/v1/05b-practice-controls.md`
- `docs/v1/ui-design.md`
- `docs/v0/project-structure.md`
- `docs/v0/tech-stack-decisions.md`
- `docs/v0/design-style-guide.md`
- `src/components/sheet-practice/controls/sheet-practice-controls.tsx`
- `src/components/sheet-practice/segments/practice-segment-selector-panel.tsx`
- `src/domain/practice/segment-tempo-apply-policy.ts`
- `tests/unit/sheet-practice-controls.test.tsx`
- relevant focused E2E spec under `tests/e2e/`

Stop and request a planning update if implementation appears to require scheduler changes, count-in behavior, persisted presets, Dexie migrations, recording/session schema changes, Home/command-palette integration, or a broad rewrite of the segment selector.
