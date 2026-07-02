# P4-05 Bar Count-In UI Plan

## Slice

- Slice: `P4-05 bar-count-in-ui`
- Product feature: `controls.bar-aware-count-in`
- Product contract: `docs/v1/05b-practice-controls.md`
- Slice file: `docs/v1/implementation-slices/04-practice-controls-upgrade.md`
- Required prerequisites: verified `P4-03 bar-count-in-domain`, verified `P4-04 bar-count-in-scheduler`
- Planning model: `gpt-5.5`, medium effort, standard speed
- Recommended implementation tier: Tier C UI + browser E2E, because this exposes scheduler-backed count-in behavior in Sheet Practice and must verify responsive, accessible controls

## Refined Scope

Add visible, user-facing bar-aware count-in controls and countdown state to Sheet Practice.

P4-05 should promote the P4-04 non-visual/test seam into real UI:

- a Sheet Practice count-in toggle;
- a compact count-in measure selector for one or two bars;
- visible bar-aware readiness, blocked, and active countdown feedback;
- count-in tick details that distinguish pre-roll beats from beats counted from the preceding measure;
- accessible labels and live status for screen readers;
- responsive layout checks so Sheet Practice remains a focused practice workspace.

The implementation must reuse the already-verified P4-03 domain helper and P4-04 scheduler/transport path. This slice owns visible controls and presentation state only. It must not add a new countdown engine, recompute count-in math, or change persistence schemas.

## Out Of Scope

- No P4-03 domain math changes unless the coding agent finds a narrow verified bug that blocks UI integration.
- No P4-04 scheduler rewrites, new timing engine, new Tone/WebAudio path, or new shared countdown infrastructure.
- No P4-06/P4-07 preset work: no per-sheet default persistence, no save/load/rename/delete presets, no Dexie schema or migration, and no remembered count-in preference.
- No P4-08 advanced shared countdown infrastructure.
- No Quick Metronome advanced countdown work and no Quick Metronome visible UI changes.
- No recording schema, recording artifact, recording metadata, session schema, analytics, or import/export changes.
- No cloud sync, account sync, backup/restore merge, automatic score following, mistake detection, or analysis features.
- No PDF overlay, bar-line drawing, assisted page turning, or measure timeline work.

## Deferred Work

| Deferred work | Owning slice |
|---|---|
| Per-sheet count-in or preset defaults, Dexie schema, preset persistence, save/load/rename/delete behavior, and remembered count-in preferences | P4-06/P4-07 |
| Shared advanced countdown infrastructure or a generalized countdown engine | P4-08 |
| Quick Metronome advanced countdown, mute training, auto-increase, and other training behavior | Pack 6 |
| PDF overlay, bar-line drawing, measure timeline, and assisted page turning | Later viewer/reference-marker slices, not P4-05 |
| Recording/session schema, analytics, and import/export behavior | Out of P4-05 unless a later slice explicitly owns them |

## Current Architecture Context

P4-03 provides:

- `src/domain/practice/bar-count-in.ts`
  - `getBarCountInPlan({ measureGrid, selectedSegment, countInMeasures })`
  - returns `BarCountInPlan`
  - reports stale selected-segment plans with `status: "segment-grid-stale"`
  - includes ready plan fields such as `beatCount`, `totalDurationMs`, `beats`, `startMeasure`, `segmentName`, `sourceMeasureNumber`, `isPreRoll`, and `beatNumber`

P4-04 provides:

- `src/lib/quick-metronome/bar-count-in-scheduler.ts`
  - schedules count-in ticks from a ready plan and returns a cancel handle
- `src/lib/quick-metronome/use-metronome-transport.ts`
  - accepts optional `barCountIn` transport options
  - exposes `transportState`, `isCounting`, and `countdownRemaining`
  - keeps existing simple countdown and actual playback behavior intact
- `src/components/sheet-practice/controls/sheet-practice-controls.tsx`
  - already prepares count-in plans from current measure grid and selected segment
  - accepts an optional `barCountIn` prop and test harness options
  - dispatches plan, blocked, and tick harness events for E2E evidence
  - blocks missing-grid, stale-grid, and invalid-plan starts

Current visible UI only shows generic `Counting N` in the `Metronome` status tile and a generic `Countdown running.` message. P4-05 should make the bar-aware mode discoverable and understandable without disrupting the existing Sheet Practice control density.

## Component Boundaries

Preferred production files:

- `src/components/sheet-practice/controls/bar-count-in-control.tsx`
  - New small UI component for the toggle, count-in measure selector, readiness/help text, blocked state, and active tick detail.
  - Receives plain props from `SheetPracticeControls`; does not load measure grids, create plans, or call services.
- `src/components/sheet-practice/controls/sheet-practice-controls.tsx`
  - Owns local UI state for enabled/count-in-measures and active tick/presentation data.
  - Passes effective user settings into the existing P4-04 `barCountIn` preparation flow.
  - Clears active tick state on stop, start failure, blocked plan, unmount, or playback start as appropriate.
- `src/components/sheet-practice/controls/types.ts`
  - Only extend types if needed for internal presentation data or test seams. Keep existing P4-04 prop compatibility.
- `src/components/sheet-practice/controls/practice-status-panel.tsx`
  - Optional small display enhancement if the existing `Metronome` tile needs a more specific value such as `Count-in 3`.
- `src/components/sheet-practice/controls/metronome-settings-panel.tsx`
  - Preferred placement for the new count-in control, near the existing `Countdown` select, because it is a pre-run metronome setting.

Likely tests:

- `tests/unit/sheet-practice-controls.test.tsx`
- `tests/e2e/sheet-practice-controls.spec.ts`

Avoid creating a broad shared countdown component or touching Quick Metronome UI. If a tiny presentational component is useful, keep it Sheet Practice scoped.

## UI Behavior

Add a compact "Bar count-in" control to Sheet Practice metronome settings:

- Toggle:
  - Off by default on every mount.
  - Uses a native checkbox, switch-like button with `aria-pressed`, or existing local button style. Prefer a clear binary control over a text-only command.
  - Disabled while `arePreRunSettingsLocked` is true, matching meter/subdivision/countdown lock behavior during counting or playback.
- Count-in bars:
  - Visible or enabled only when bar count-in is on.
  - Supports exactly `1` and `2` bars for P4-05.
  - Defaults to `1`.
  - Uses a compact select or two-option segmented control.
  - Disabled while counting or playback is active.
- Legacy simple countdown interaction:
  - When bar count-in is enabled, the UI must make clear that the bar-aware count-in will be used instead of the legacy simple `Countdown` setting for Sheet Practice starts.
  - Preferred implementation: disable the existing legacy `Countdown` select while bar count-in is enabled and not running, with visible muted text such as `Beat countdown is replaced by bar count-in for Sheet Practice.`
  - Do not change Quick Metronome simple countdown behavior.
  - Do not persist or mutate the legacy `settings.countdownBeats` value merely because bar count-in is toggled.
- Readiness copy:
  - Keep copy compact. Do not add tutorial text.
  - Examples: `Counts one bar before the selected segment or measure 1.` and `Requires a saved measure grid.`
  - Avoid implying presets or saved defaults.

Visible active state during bar-aware count-in:

- `PracticeStatusPanel` can keep the existing `Metronome` tile value, but it should show useful count-in text if a bar-aware tick is active.
- `TransportActionsPanel` message should distinguish bar-aware count-in from legacy simple countdown, for example `Bar count-in running.`
- The visible detail should show current count and source context without layout jump:
  - count: `1`, `2`, `3`, etc.
  - pre-roll: `Pre-roll beat 1`
  - selected/whole-sheet source measure: `Measure 4 beat 1`
  - remaining beats: optional, if it fits without crowding.
- Stop remains available during count-in and cancels count-in through the existing P4-04 stop path.

Blocked states:

- Missing grid:
  - Use the existing P4-04 message `Save a measure grid before starting bar count-in.`
  - Surface it visibly in the existing alert/message area.
  - Keep playback stopped.
- Stale selected segment:
  - Use the existing P4-04 message `Selected segment grid changed. Metronome was stopped.`
  - Keep playback stopped.
- Invalid plan:
  - Surface the P4-04 error message through the existing `errorMessage` path.
  - Keep playback stopped.

## Accessibility Expectations

- The toggle must have an accessible name such as `Enable bar count-in`.
- The count-in bars control must have an accessible name such as `Bar count-in bars`.
- Disabled states must use real disabled controls or accurate ARIA state.
- Active count-in text must be announced politely, not assertively, so it does not fight with playback/recording controls.
- Error states continue to use `role="alert"` through the existing error message path.
- The control must be keyboard operable:
  - Tab reaches toggle and count-in bars.
  - Space/Enter toggles where applicable.
  - Select or segmented options can be changed without a mouse.
- Button/control labels must not rely on color alone.
- Visible labels must not clip at mobile width.
- Existing `Start metronome`, `Stop metronome`, `Start recording`, and `Stop recording` accessible names must remain unchanged.

Keyboard accessibility must be covered by tests:

- keyboard focus reaches the bar count-in toggle and bars control;
- Space/Enter toggles bar count-in;
- the bars option can be changed via keyboard/select controls;
- counting/playing controls are truly disabled or their ARIA state is accurate;
- existing Start/Stop/Record accessible names remain unchanged.

## Responsive And Design Requirements

This UI must follow:

- `docs/v1/ui-design.md`
- `docs/v0/design-style-guide.md`

Requirements:

- Keep Sheet Practice sheet/PDF visually dominant.
- Keep transport controls reachable and stable.
- Do not add a tutorial panel, marketing-style card, decorative illustration, gradient, or oversized text.
- Use restrained surfaces consistent with existing `MetronomeSettingsPanel`.
- Do not nest cards inside cards; if the control lives inside the settings panel, use a compact row/field group rather than another heavy panel.
- Maintain stable dimensions while toggling, counting, blocking, and resizing.
- Check desktop, tablet-like, and narrow mobile widths.
- Text must not overlap, clip, or push primary actions out of reach.

## State Model

Preferred local state in `SheetPracticeControls`:

- `isBarCountInEnabled: boolean`, default `false`
- `barCountInMeasures: 1 | 2`, default `1`
- `activeBarCountInTick: BarCountInSchedulerTick | null`
- optional `lastBarCountInBlock: SheetPracticeBarCountInBlock | null` only if the existing message/error paths are not enough for display

State transitions:

- Toggle on:
  - Does not prepare a plan immediately.
  - Does not load measure grid until Start is clicked.
  - Does not change persisted settings or simple countdown.
  - Must not write to Dexie, `localStorage`, presets, defaults, or any other persistence path.
- Toggle off:
  - Clears active bar count-in presentation state if not running.
  - During counting, toggle is disabled; user must Stop first.
- Start with toggle off:
  - Existing behavior unchanged, including simple countdown.
- Start with toggle on:
  - Reuses P4-04 `prepareBarCountInPlan`.
  - Passes `enabled: true` and selected `countInMeasures`.
  - On ready plan, existing transport enters `counting`.
  - On blocked plan, existing block handling keeps stopped.
- Tick:
  - Update `activeBarCountInTick`.
  - Preserve P4-04 `countdownRemaining` updates.
- Playback started:
  - Clear `activeBarCountInTick`.
  - Show existing playing message after actual playback starts.
- Stop during count-in:
  - Existing P4-04 cancellation path runs.
  - Clear active tick and active plan.
  - Do not start playback.
- Recording active:
  - Existing recording/metronome independence remains unchanged.

## Behavior Matrix

| Scenario | Expected behavior |
|---|---|
| Bar count-in off | Existing Sheet Practice behavior unchanged, including legacy simple countdown. |
| Bar count-in on, one bar, saved grid, no selected segment | Uses P4-03 whole-sheet plan into measure 1; visible count-in starts; playback starts after completion. |
| Bar count-in on, one bar, saved grid, selected segment | Uses P4-03 selected-segment plan; visible count-in references the preceding measure or pre-roll context. |
| Bar count-in on, two bars | Uses `countInMeasures: 2`; UI shows two bars selected; scheduler receives the P4-03 two-bar plan. |
| Missing measure grid | Start is blocked with the existing missing-grid message; transport remains stopped; no playback/session start. |
| Stale selected segment grid | Start is blocked with the existing stale-grid message; no fallback to whole-sheet or stale snapshot timing. |
| Invalid count-in input | UI should prevent invalid values; if an invalid value reaches the domain boundary, existing invalid-plan block/error path handles it. |
| Stop during count-in | Count-in cancels, visible tick clears, transport returns stopped, playback does not start. |
| Repeated Start while count-in is preparing or counting | Existing duplicate-start protection remains; no duplicate plan loads or scheduler chains. |
| Settings changed during count-in | Existing lock policy applies for meter/subdivision/countdown/bar count-in controls; BPM remains consistent with current transport policy. |
| Recording active during count-in | Recording remains active; stopping count-in does not stop recording. |
| Mobile width | Controls remain visible and usable; no overlap with viewer or transport. |

## Edge Cases

- Count-in before measure 1 may be pre-roll. UI should display `Pre-roll` rather than measure 0 or negative measure labels.
- Selected segment starting at measure 1 is also pre-roll.
- Selected segment from another sheet should continue to be ignored by existing Sheet Practice selection scoping.
- Changing selected segment after enabling bar count-in but before Start should use the selected segment at Start time.
- Measure grid changes after enabling but before Start should use the current saved grid loaded by P4-04 at Start time.
- Grid deleted after enabling but before Start should block as missing grid.
- Stale segment should block, not silently use whole-sheet count-in.
- `6/8` and `12/8` active states should reflect P4-03 beat counts; UI must not reinterpret compound meter.
- Fractional scheduler durations from P4-03/P4-04 are not a UI concern; do not round or recalculate for scheduling.
- Component unmount during count-in must not leave visible stale state or timers beyond the existing transport cleanup.

## Unit Test Plan

Add or extend focused tests in `tests/unit/sheet-practice-controls.test.tsx`:

- Renders the new bar count-in toggle off by default.
- Enabling the toggle reveals or enables the count-in bars control with default `1`.
- Selecting `2` bars causes the existing P4-04 plan preparation callback or harness evidence to receive a plan with doubled `beatCount`/duration for a known 4/4 grid.
- Enables bar count-in, selects `2` bars, then remounts Sheet Practice and asserts the toggle returns off and bars returns to default `1` or is hidden/disabled per UI design.
- Asserts toggling bar count-in does not mutate legacy `settings.countdownBeats`.
- Asserts no Dexie, `localStorage`, preset, or default-setting write path is introduced for bar count-in state.
- With bar count-in off and legacy countdown set, existing simple countdown behavior remains unchanged.
- With bar count-in on, the UI routes Start through the P4-04 bar count-in path rather than legacy simple countdown.
- Missing grid displays `Save a measure grid before starting bar count-in.`, keeps `sheet-metronome-state` stopped, and does not call `metronomeService.start`.
- Stale selected segment displays the existing stale-grid block message, keeps stopped, and does not create `metronome_started`.
- Active tick callback updates visible bar-aware count-in detail, including a pre-roll case and a selected-segment preceding-measure case.
- Stop during bar count-in clears visible tick detail and does not start playback.
- Controls are disabled while counting/playing and enabled again when stopped.
- Keyboard focus reaches the bar count-in toggle and bars control.
- Space/Enter toggles bar count-in.
- Bars option can be changed via keyboard/select interaction.
- Counting/playing controls are truly disabled or their ARIA state is accurate.
- Recording active plus bar count-in preserves existing recording state and recording/metronome independence.
- Existing accessible names for start/stop/record controls remain unchanged.

Do not duplicate P4-03 domain coverage in component tests. Use known grids only to prove UI wiring and selected count-in measure value. Domain math stays covered by `tests/unit/bar-count-in-domain.test.ts`; scheduler timing stays covered by `tests/unit/bar-count-in-scheduler.test.ts` and `tests/unit/quick-metronome-transport.test.tsx`.

## E2E Plan

Update `tests/e2e/sheet-practice-controls.spec.ts`.

Preferred changes:

- Replace or complement the existing hidden-harness test `sheet practice can run hidden bar-aware count-in before shared metronome playback` with a visible UI path.
- Use the existing Sheet Library import flow.
- Save a measure grid through UI.
- Create a practice segment through UI.
- Enable `Bar count-in` through the visible control.
- Select one bar and start metronome.
- Assert:
  - the visible metronome state enters `Counting`;
  - visible bar-aware count-in detail appears;
  - harness evidence still records one P4-03/P4-04 plan and expected ticks;
  - playback starts after count-in with shared metronome trace evidence;
  - stopping returns to `Stopped`;
  - no console or page errors.
- Add a small missing-grid path if runtime remains reasonable:
  - enable bar count-in without saving a grid;
  - click Start;
  - assert the missing-grid message and no playback trace.
- Keep the existing broad Sheet Practice controls E2E coverage for shared metronome timing, session activity, recording independence, and responsive overlap.
- Add responsive checks for the visible bar count-in control at `1280x820`, `1024x768`, and `390x844`, using existing `expectNoViewerOverlap`.
- At each responsive size, assert:
  - `Enable bar count-in` is visible and operable;
  - `Bar count-in bars` is visible and operable, or correctly disabled by counting/playing state;
  - active tick detail is visible and does not overflow the viewport;
  - `Start metronome`, `Stop metronome`, `Start recording`, and `Stop recording` accessible names remain locatable;
  - the sheet viewer remains dominant and controls do not cover the viewer.

If the suite becomes slow, prioritize one visible happy-path E2E plus one focused missing-grid unit test. Deterministic timing remains unit/hook responsibility; E2E should use tolerant runtime evidence only.

Report browser evidence precisely. If run with Playwright `[chromium]`, say Playwright `[chromium]`, not real Chrome.

## Acceptance Criteria

- Sheet Practice exposes a visible bar-aware count-in toggle and one/two-bar selector.
- Bar count-in is off by default and not persisted.
- Enabling bar count-in reuses the P4-04 start path and P4-03 plan output.
- Ready whole-sheet and selected-segment plans show visible countdown state before playback starts.
- Missing-grid, stale-segment, and invalid-plan states are visible and keep playback stopped.
- Stop during count-in cancels count-in and clears active visible tick state.
- Existing simple countdown remains available when bar count-in is off.
- Quick Metronome behavior is unchanged.
- Recording/session schemas and recording behavior are unchanged.
- UI is keyboard accessible, screen-reader understandable, and responsive across desktop, tablet-like, and mobile widths.
- Tests cover visible UI wiring, blocked states, cancellation, and browser-visible behavior.

## Status And Review Gates

- External plan review must PASS before implementation.
- External web ChatGPT delta review returned `PASS`; implementation has started and P4-05 is now `review_in_progress`.
- Pack 4 remains `planning_in_progress`.
- `P4-01 segment-tempo-apply-policy`, `P4-02 segment-tempo-ui`, `P4-03 bar-count-in-domain`, and `P4-04 bar-count-in-scheduler` remain `verified`.
- `P4-06 per-sheet-presets-domain-repository`, `P4-07 per-sheet-presets-ui`, and `P4-08 advanced-countdown-shared-infrastructure` remain `not_started`.

## Verification Commands For Coding Agent

Expected focused verification after implementation:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/sheet-practice-controls.test.tsx tests/unit/quick-metronome-transport.test.tsx tests/unit/bar-count-in-scheduler.test.ts tests/unit/bar-count-in-domain.test.ts
& .\scripts\npm-local.ps1 --% run test:e2e -- tests/e2e/sheet-practice-controls.spec.ts
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint -- src/components/sheet-practice/controls/sheet-practice-controls.tsx src/components/sheet-practice/controls/metronome-settings-panel.tsx src/components/sheet-practice/controls/practice-status-panel.tsx src/components/sheet-practice/controls/transport-actions-panel.tsx src/components/sheet-practice/controls/types.ts tests/unit/sheet-practice-controls.test.tsx tests/e2e/sheet-practice-controls.spec.ts
git diff --check
```

If the implementation adds `src/components/sheet-practice/controls/bar-count-in-control.tsx`, include it in the lint command. If it does not touch optional listed files, remove untouched paths from the lint command and list the actual changed files.

## Planning Validation

For this planning-only slice:

```powershell
Get-Content -Raw docs/v1/status.json | ConvertFrom-Json | Out-Null
git diff --check
```

## Handoff Notes

Coding agents should read:

- `docs/v1/START-HERE.md`
- `docs/v1/implementation-slices/plans/P4-05-bar-count-in-ui.md`
- `docs/v1/implementation-slices/04-practice-controls-upgrade.md`
- `docs/v1/05b-practice-controls.md`
- `docs/v1/implementation-slices/plans/P4-03-bar-count-in-domain.md`
- `docs/v1/implementation-slices/plans/P4-04-bar-count-in-scheduler.md`
- `docs/v1/ui-design.md`
- `docs/v0/design-style-guide.md`
- `src/domain/practice/bar-count-in.ts`
- `src/lib/quick-metronome/bar-count-in-scheduler.ts`
- `src/lib/quick-metronome/use-metronome-transport.ts`
- `src/components/sheet-practice/controls/sheet-practice-controls.tsx`
- `src/components/sheet-practice/controls/metronome-settings-panel.tsx`
- `src/components/sheet-practice/controls/practice-status-panel.tsx`
- `src/components/sheet-practice/controls/transport-actions-panel.tsx`
- `src/components/sheet-practice/controls/types.ts`
- `tests/unit/sheet-practice-controls.test.tsx`
- `tests/e2e/sheet-practice-controls.spec.ts`

Stop and request a planning update if implementation appears to require presets, persisted defaults, a generalized countdown architecture, Quick Metronome advanced countdown UI, recording/session schema changes, PDF overlays, or scheduler/domain rewrites.
