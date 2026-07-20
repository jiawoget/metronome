# P4-04 Bar Count-In Scheduler Plan

## Slice

- Slice: `P4-04 bar-count-in-scheduler`
- Product feature: `controls.bar-aware-count-in`
- Product contract: `docs/v1/05b-practice-controls.md`
- Slice file: `docs/v1/implementation-slices/04-practice-controls-upgrade.md`
- Required prerequisite: verified `P4-03 bar-count-in-domain`
- Planning model: `gpt-5.5`, medium effort, standard speed
- Recommended implementation tier: Tier C/high-risk timing slice, because this touches shared metronome scheduling and needs scheduler evidence

## Refined Scope

Wire the P4-03 `getBarCountInPlan` domain output into the Sheet Practice metronome start path so Sheet Practice can run a bar-aware pre-start count-in before the shared metronome service begins playing.

The slice should prove scheduler behavior through focused service/hook/component tests and a targeted browser timing trace. It should not add visible controls or change the default user-facing behavior. Until P4-05 adds UI controls, the implementation should expose the scheduler capability behind existing code seams and tests, with production defaults preserving current Sheet Practice behavior.

The intended behavior is:

- given a current `MeasureGrid`, optional selected `PracticeSegment`, and an explicit count-in enablement/count value, calculate the count-in with `getBarCountInPlan`;
- refuse to schedule a stale selected-segment plan;
- schedule pre-start count-in ticks using only the P4-03 beat offsets and total duration, including fractional millisecond offsets where present;
- start the existing `MetronomeService` only after the count-in plan completes;
- keep existing session creation, rollback, cancellation, and stop semantics intact;
- emit enough scheduler evidence for tests to verify count-in ticks precede the first metronome service start and that playback ticks continue to use the existing shared service.

## Out Of Scope

- P4-05 visible controls: no new count-in toggle, selector, labels, countdown display, responsive layout, or user-facing copy beyond minimal internal/test state needed by existing status hooks.
- Per-sheet presets: no preset domain, repository, migration, save/load/rename/delete, or default count-in persistence. P4-06/P4-07 own this.
- Advanced countdown shared infrastructure: do not generalize a full countdown engine for Quick Metronome or Pack 6. P4-08/Pack 6 own advanced countdown work.
- Cloud sync, account sync, backup/restore merge, or cross-device resume.
- Recording model changes: no changes to `SheetRecordingMetadata`, recording artifacts, recording waveform data, rerecord contracts, or recording save inputs.
- AI/audio analysis, onset detection, score following, mistake detection, or generated analysis data.
- P4-03 domain math changes except for narrow bug fixes if the coding agent discovers a verified defect. Do not duplicate the P4-03 math elsewhere.

## Current Architecture Context

P4-03 created the pure domain helper:

- `src/domain/practice/bar-count-in.ts`
  - `getBarCountInPlan({ measureGrid, selectedSegment, countInMeasures })`
  - returns `BarCountInPlan`
  - preserves fractional `beatDurationMs`/`totalDurationMs`
  - reports stale segment/grid association with `status: "segment-grid-stale"` and `beats: []`

The current shared metronome path is:

- `src/services/metronome/index.ts`
  - `MetronomeService` interface: `onTick`, `start`, `update`, `stop`
  - `METRONOME_TRACE_EVENT` for scheduled playback ticks
- `src/services/metronome/browser-metronome-service.ts`
  - wraps Tone transport
  - schedules repeated playback ticks through `scheduleRepeat`
  - dispatches playback trace events
- `src/lib/quick-metronome/use-metronome-transport.ts`
  - shared React transport hook for Quick Metronome and Sheet Practice
  - currently supports simple beat-count countdown from `settings.countdownBeats`
- `src/components/sheet-practice/controls/sheet-practice-controls.tsx`
  - owns Sheet Practice state, selected segment, measure grid service, sessions, recording independence, and start/stop callbacks
  - uses `useMetronomeTransport`
- `src/components/sheet-practice/segments/practice-segment-selector-panel.tsx`
  - already reports selected segment changes to controls
- `src/components/sheet-practice/measure-grid/measure-grid-calibration-panel.tsx`
  - already persists/refreshes measure grid state through `measureGridService`

## Architecture Boundary

P4-04 should add a scheduler/service boundary that consumes `BarCountInPlan` as data. The count-in scheduler may live near the shared transport hook, but the Sheet Practice caller must be responsible for constructing the plan from sheet-specific inputs.

Preferred boundary:

- Add a small scheduler helper under `src/lib/quick-metronome/` or `src/services/metronome/` that can run a `BarCountInReadyPlan` by using timers and callbacks.
- Extend `useMetronomeTransport` with an optional pre-start plan/callback shape rather than adding Sheet Practice-only timing logic directly inside the component.
- Keep `BrowserMetronomeService` focused on actual repeating playback. Avoid teaching it about sheets, segments, measure grids, or P4-03 domain types unless a minimal generic trace type is needed.
- Let `SheetPracticeControls` load/hold the current measure grid and selected segment, call `getBarCountInPlan`, and pass only a schedulable count-in plan into the shared transport hook when explicitly enabled.

The implementation must not import UI/components into scheduler/service modules. Scheduler code may import domain types from `src/domain/practice/bar-count-in.ts` and meter/timing helpers only if it is consuming the domain plan, not recreating it.

## Reuse Constraints

- Reuse `getBarCountInPlan` and its returned `beats`, `totalDurationMs`, `status`, `startMeasure`, and segment context.
- Scheduler timing has one source of truth: `plan.beats[].offsetMs` and `plan.totalDurationMs`.
- The scheduler must not derive BPM, meter, beat duration, measure duration, grid timing, or recompute beat durations. It must not read `settings.bpm`, `settings.timeSignature`, `beatDurationMs`, or meter helpers to decide count-in timer delays.
- Do not recalculate beats-per-measure, source measure labels, beat offsets, stale status, pickup handling, or fractional timing outside P4-03.
- Do not use `settings.countdownBeats` as a proxy for bar-aware count-in math. Existing simple countdown remains available, but bar-aware scheduling must come from the P4-03 plan.
- Reuse existing `MetronomeService.start/update/stop` for actual playback. Do not create a parallel Tone/WebAudio metronome.
- Reuse the existing test fakes for `MetronomeService`, `MeasureGridService`, `PracticeSegmentService`, and Tone adapter patterns.
- Reuse `METRONOME_TRACE_EVENT` only for playback ticks unless the coding agent adds a clearly named count-in trace event/detail type. Do not overload playback traces with fake playback ticks.
- Keep Quick Metronome behavior unchanged unless the shared hook must gain optional no-op-compatible parameters.

## Likely Files

Likely production files:

- `src/lib/quick-metronome/use-metronome-transport.ts`
  - Add optional pre-start count-in scheduling inputs and cancellation semantics.
- `src/lib/quick-metronome/bar-count-in-scheduler.ts`
  - Preferred small helper for scheduling a `BarCountInReadyPlan` with `window.setTimeout`, emitting callbacks/traces, and returning a cancel function.
- `src/services/metronome/index.ts`
  - Optional: add a count-in trace event constant/detail type if browser evidence needs a stable public event.
- `src/components/sheet-practice/controls/types.ts`
  - Add any optional test seam needed for enabling count-in in component tests, without exposing UI.
- `src/components/sheet-practice/controls/sheet-practice-controls.tsx`
  - Wire selected segment + live measure grid into `getBarCountInPlan` and the transport hook.

Likely tests:

- `tests/unit/bar-count-in-scheduler.test.ts` or equivalent focused scheduler helper test.
- `tests/unit/quick-metronome-transport.test.tsx`
  - Shared hook behavior, fake timers, cancellation, failure cleanup.
- `tests/unit/sheet-practice-controls.test.tsx`
  - Sheet Practice integration with selected segment, live grid, stale grid, session rollback, and no recording coupling.
- `tests/e2e/sheet-practice-controls.spec.ts` or a new focused E2E spec
  - Targeted browser evidence that count-in behavior is observable and playback still uses the shared service, without strict real-browser tick ordering requirements.

Avoid broad edits to:

- recording services/repositories;
- practice session schemas/events, except existing metronome started/stopped events continuing to fire after actual playback starts/stops;
- Quick Metronome UI;
- Sheet Practice visual controls;
- P4-03 domain tests unless a real upstream bug is found.

## Proposed Scheduler Contract

Exact naming is flexible, but coding should preserve these semantics.

```ts
type BarCountInSchedulerTick = {
  count: number;
  beatNumber: number;
  remainingBeats: number;
  sourceMeasureNumber: number | null;
  isPreRoll: boolean;
  scheduledOffsetMs: number;
  scheduledDelayMs: number;
};

type BarCountInSchedulerOptions = {
  plan: BarCountInReadyPlan;
  setTimeout: typeof window.setTimeout;
  clearTimeout: typeof window.clearTimeout;
  onTick?: (tick: BarCountInSchedulerTick) => void;
  onComplete: () => void;
};
```

Important behavior:

- Only `status: "ready"` plans are schedulable.
- The scheduler must normalize beat timers from P4-03 offsets. Preferred formula: `scheduledDelayMs = beat.offsetMs - plan.beats[0].offsetMs`, with the first beat therefore scheduled at `0` because its offset defines the count-in start.
- Completion must be scheduled from `plan.totalDurationMs`, not from BPM, meter, rounded measure duration, or accumulated `beat.durationMs` values.
- Stop/cancel must clear all pending count-in timers and must not call `MetronomeService.start` or mutate transport state directly.
- Updating settings during count-in should use the latest start settings for actual playback, following the current `useMetronomeTransport` behavior.
- A new start while count-in is already active should not create duplicate timer chains.
- Cancellation ownership flows UI -> transport -> scheduler. The scheduler only emits callbacks and exposes cancellation; the transport/sheet-practice flow owns state transitions, session callbacks, and playback start.

## Sheet Practice Wiring

Because P4-05 owns UI controls, P4-04 should not expose a visible count-in selector. Use a narrow internal/test seam so scheduler behavior can be verified before UI exists.

Preferred Sheet Practice behavior for P4-04:

- Production default: bar-aware count-in disabled, preserving current behavior.
- Optional/test seam: allow `SheetPracticeControls` to receive a non-visual `barCountIn` option or equivalent with `{ enabled: boolean; countInMeasures: number }`.
- When enabled and `Start metronome` is clicked:
  - load the current measure grid for `sheetId` through existing `measureGridService.getGrid(sheetId)`;
  - use the selected segment only if it belongs to the current sheet;
  - call `getBarCountInPlan({ measureGrid, selectedSegment, countInMeasures })`;
  - if no grid exists, block count-in with a clear non-UI-intrusive message and do not silently fall back to simple countdown or direct playback while bar-aware mode is enabled.
  - if the plan is stale, block and do not start playback;
  - if the plan is ready, schedule count-in and start playback after it completes.

The scheduler must not decide, force, or own session creation timing. Session ownership belongs to the existing transport and Sheet Practice flow:

- playback `metronome_started` remains tied to actual playback start after `MetronomeService.start` succeeds;
- count-in may prepare transport state only through the existing transport/session boundaries;
- if an implementation chooses to reserve or prepare session context during count-in, that decision must stay in the Sheet Practice/transport owner and must preserve existing rollback semantics;
- if count-in is stopped before completion, playback must not start and no playback-start event should be captured;
- if playback start fails after count-in completes, preserve existing rollback behavior.

## Behavior Matrix

| Scenario | Expected behavior |
|---|---|
| Bar-aware count-in disabled | Existing Sheet Practice metronome behavior unchanged. Existing simple `settings.countdownBeats` behavior unchanged. |
| Enabled, live grid, no selected segment | Use `getBarCountInPlan` whole-sheet plan into measure 1; schedule all returned beats; start metronome after `totalDurationMs`. |
| Enabled, live grid, selected segment for current sheet | Use selected segment start measure; schedule returned beats; start metronome after `totalDurationMs`. |
| Enabled, selected segment from another sheet | Treat as no selected segment or clear selection before planning; must not schedule another sheet's segment. |
| Enabled, no measure grid | Do not start bar-aware count-in or playback; report blocked start through existing blocked/failure path. Fallback to legacy/simple countdown is allowed only when bar-aware count-in is disabled before scheduler invocation. |
| Enabled, stale segment/grid association | Do not start count-in or playback; do not capture playback `metronome_started`; leave transport stopped. |
| Enabled, invalid grid/segment/count value | Treat as start failure/block; stop/clear transport; no playback start; no duplicate math fallback. |
| Stop during count-in | UI asks transport to stop; transport cancels scheduler, sets transport stopped, does not call `MetronomeService.start`, and does not capture playback `metronome_started`. |
| Settings change during count-in | Countdown timing remains based on the already-computed P4-03 plan; actual playback starts with latest metronome settings, matching current hook latest-options policy. |
| Existing simple countdown and bar-aware count-in both configured | Resolve one mode before invoking the scheduler. Sheet Practice bar-aware count-in, when explicitly enabled, takes precedence over legacy `settings.countdownBeats`; Quick Metronome simple countdown remains unchanged. No parallel countdown modes. |
| Recording active during count-in | Preserve independence: recording stays active; stopping count-in does not stop recording. |
| Playback start fails after count-in | Existing `onStartFailed` rollback behavior runs; no `metronome_started` event is captured. |
| Rapid repeated start while counting | Do not create duplicate scheduler instances, duplicate timer chains, or duplicate playback start calls. |

## Edge Cases

- Fractional offsets from P4-03 must be passed to timers as-is where the timer API accepts them. Tests should use fake timers for exact scheduler evidence and tolerant assertions only for browser runtime evidence.
- Count-in before measure 1 may have negative P4-03 `startsAtMs`; scheduler must use relative count-in offsets and `plan.totalDurationMs`, and must not reject negative domain `startsAtMs`.
- `6/8` and `12/8` must schedule numerator beat counts using the P4-03 plan. Do not reinterpret compound meter.
- A one-measure selected segment and multi-measure selected segment with the same start should schedule the same count-in.
- Updating BPM during count-in should not mutate the active plan or recalculate count-in math mid-flight.
- Component unmount during count-in must clear timers and stop the metronome service without leaking callbacks.
- Repeated start clicks during count-in must not schedule duplicate count-ins or duplicate playback starts.
- Stale grid should be blocked even if the stale segment snapshot contains enough data to compute timing.

## Unit Test Expectations

Focused scheduler/helper tests:

- schedules every tick from `plan.beats[].offsetMs`, normalized relative to the first plan beat offset;
- never reads BPM, meter, grid timing, `beatDurationMs`, or `beat.durationMs` to calculate scheduler delays;
- preserves fractional offset-derived delay values, using fake timers and close-to assertions;
- calls `onComplete` exactly once after `totalDurationMs`;
- cancel prevents future ticks and completion;
- rejects or refuses non-ready/stale plans at the boundary if the helper receives a broad `BarCountInPlan`.

Shared transport hook tests:

- with no bar-aware plan, existing start/update/stop/simple countdown tests continue to pass unchanged;
- with a ready bar-aware plan, transport state enters `counting`, emits count-in tick callbacks, delays `metronomeService.start` until completion, then enters `playing`;
- stop during bar-aware count-in clears timers and never calls `metronomeService.start`;
- start failure after count-in still calls `metronomeService.stop`, returns to stopped, and invokes `onStartFailed` with the pre-start context;
- latest settings are used for playback start after count-in if settings changed during count-in;
- simple countdown precedence is resolved before scheduler invocation when both simple countdown and bar-aware plan are present;
- rapid repeated starts while counting reuse or reject the active count-in and do not create duplicate scheduler instances.

Sheet Practice component tests:

- with count-in disabled, existing start metronome expectations are unchanged;
- with count-in enabled and no selected segment, `measureGridService.getGrid(sheetId)` is called and playback starts only after scheduled count-in completion;
- with count-in enabled and selected segment, `getBarCountInPlan` consumes that selected segment and the live grid; tests can assert callback/trace details rather than redoing domain math;
- stale selected segment blocks start and leaves `sheet-metronome-state` stopped;
- stop during count-in cancels through the UI -> transport -> scheduler hierarchy, does not start playback, does not capture playback `metronome_started`, and does not affect recording state;
- recording active plus count-in preserves existing recording/metronome independence.

Metronome service tests:

- only add `BrowserMetronomeService` tests if the service itself changes.
- If a count-in trace event is added outside the service, keep service tests focused on playback traces and Tone scheduling.

## Integration And E2E Expectations

Because the pack notes say timing slices need scheduler evidence, P4-04 should include one targeted browser verification path in addition to unit tests.

Deterministic ordering must be proven in unit/hook/component tests with fake timers or mocked services. E2E should cover user/runtime-observable behavior and coarse trace evidence only, because Tone, Playwright, and browser timer jitter can make strict real-browser tick ordering flaky.

Expected E2E shape:

- Use existing Sheet Practice fixture import flow.
- Add an init script listener for playback trace events and, if implemented, count-in trace events.
- Enable the hidden/test count-in seam without visible UI, for example by a test-only prop path, window harness event, or route-safe test harness already used by Sheet Practice controls.
- Select or seed a segment with a valid current measure grid.
- Start metronome.
- Assert coarse count-in and playback evidence:
  - count-in tick count matches P4-03 `beatCount` for one measure;
  - count-in evidence exists before the test observes playing state;
  - playback starts after a threshold consistent with the count-in duration, using a tolerant lower bound rather than strict tick-by-tick ordering;
  - no duplicate playback start calls or duplicate active scheduler evidence appear;
  - playback trace still reports the shared service settings and expected interval.
- Stop during count-in in a second small path if feasible; otherwise cover stop-during-count-in strongly in unit/component tests.

Do not require real Chrome specifically unless the scheduler asks for full Chrome verification later. If run with Playwright Chromium, report it as Playwright `[chromium]`, not generic Chrome.

## Acceptance Criteria

- P4-04 consumes `getBarCountInPlan` directly and does not duplicate P4-03 math.
- Bar-aware count-in can be enabled through a non-visual/test seam for Sheet Practice, with production default preserving current UI and behavior.
- Ready whole-sheet and selected-segment plans schedule count-in ticks before metronome playback starts.
- Stale selected-segment plans block playback rather than falling back to stale snapshots or whole-sheet timing.
- Stop/cancel during count-in leaves playback stopped and does not create playback `metronome_started` events.
- Existing simple countdown and Quick Metronome behavior remain unchanged unless explicitly covered by a backward-compatible hook extension.
- Scheduler evidence exists in unit/component tests and a targeted browser trace test.
- No visible count-in controls, presets, recording schema changes, cloud sync, or analysis features are added.

## Verification Commands For Coding Agent

Expected focused verification after implementation:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/bar-count-in-scheduler.test.ts tests/unit/quick-metronome-transport.test.tsx tests/unit/sheet-practice-controls.test.tsx
& .\scripts\npm-local.ps1 --% run test:e2e -- tests/e2e/sheet-practice-controls.spec.ts
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint -- src/lib/quick-metronome/use-metronome-transport.ts src/components/sheet-practice/controls/sheet-practice-controls.tsx tests/unit/bar-count-in-scheduler.test.ts tests/unit/quick-metronome-transport.test.tsx tests/unit/sheet-practice-controls.test.tsx tests/e2e/sheet-practice-controls.spec.ts
git diff --check
```

If no new `bar-count-in-scheduler.test.ts` file is created, remove it from the command and name the actual focused scheduler test file. If E2E is split into a new focused spec, run that exact spec.

## Planning Validation

For this planning-only slice:

```powershell
Get-Content -Raw docs/v1/status.json | ConvertFrom-Json | Out-Null
git diff --check
```

## Handoff Notes

Coding agents should read:

- `docs/v1/START-HERE.md`
- `docs/v1/implementation-slices/plans/P4-04-bar-count-in-scheduler.md`
- `docs/v1/implementation-slices/04-practice-controls-upgrade.md`
- `docs/v1/05b-practice-controls.md`
- `docs/v1/implementation-slices/plans/P4-03-bar-count-in-domain.md`
- `src/domain/practice/bar-count-in.ts`
- `src/lib/quick-metronome/use-metronome-transport.ts`
- `src/services/metronome/index.ts`
- `src/services/metronome/browser-metronome-service.ts`
- `src/components/sheet-practice/controls/sheet-practice-controls.tsx`
- `src/components/sheet-practice/controls/types.ts`
- relevant existing unit/E2E tests listed above

Stop and ask for a plan update if implementation appears to require visible UI controls, per-sheet preset storage, shared advanced countdown architecture, recording/session schema changes, cloud sync, AI/audio analysis, or rewriting the metronome service around a new audio engine.
