# F4 Countdown Executor Unification Plan

## Planning Status

- Planning branch: `codex/pack-f-f4-countdown-executor-plan`
- Scope type: Pack F plan-only stage for the next smallest coding PR.
- Current baseline assumption: `main` includes merged F2 guardrails and F3 Tone runtime metronome alignment.
- Model/tier for implementation: high-risk timing/audio work; use `gpt-5.5`, high or extra-high reasoning, standard speed.
- This plan PR must not edit production code, test code, or merge anything.

## Status JSON Evidence

This plan PR should make only the minimal Pack F status update:

- Pack F remains `implementation_in_progress`.
- `F1-library-first-rescan-plan` remains `verified`.
- `F2-external-library-first-guardrails` remains `verified`.
- `F3-tone-runtime-metronome-alignment` remains `implementation_done` with its existing plan pointer.
- `F4-countdown-executor-unification` moves from `not_started` to `planning_in_progress` and gains plan pointer `docs/v1/implementation-slices/plans/F4-countdown-executor-unification.md`.
- `F5-tonaljs-music-domain-policy`, `F6-recording-waveform-analysis-alignment`, and `F7-boundary-hardening-viewer-closeout` remain `not_started`.

No F4 coding, review, verification, or downstream stage status is advanced by this plan.

Current `docs/v1/status.json` evidence on this branch:

```json
{
  "pack": "pack-f-audio-music-library-alignment",
  "status": "implementation_in_progress",
  "slices": [
    {
      "slice": "F1-library-first-rescan-plan",
      "status": "verified",
      "plan": "docs/v1/implementation-slices/plans/F0-audio-music-library-alignment-and-tech-debt-closeout.md"
    },
    {
      "slice": "F2-external-library-first-guardrails",
      "status": "verified"
    },
    {
      "slice": "F3-tone-runtime-metronome-alignment",
      "status": "implementation_done",
      "plan": "docs/v1/implementation-slices/plans/F3-tone-runtime-metronome-alignment.md"
    },
    {
      "slice": "F4-countdown-executor-unification",
      "status": "planning_in_progress",
      "plan": "docs/v1/implementation-slices/plans/F4-countdown-executor-unification.md"
    },
    {
      "slice": "F5-tonaljs-music-domain-policy",
      "status": "not_started"
    },
    {
      "slice": "F6-recording-waveform-analysis-alignment",
      "status": "not_started"
    },
    {
      "slice": "F7-boundary-hardening-viewer-closeout",
      "status": "not_started"
    }
  ]
}
```

Status diff evidence:

```diff
diff --git a/docs/v1/status.json b/docs/v1/status.json
index e6e7415a..ac32cb95 100644
--- a/docs/v1/status.json
+++ b/docs/v1/status.json
@@ -949,7 +949,8 @@
                                                             },
                                                             {
                                                                 "slice":  "F4-countdown-executor-unification",
-                                                                "status":  "not_started"
+                                                                "status":  "planning_in_progress",
+                                                                "plan":  "docs/v1/implementation-slices/plans/F4-countdown-executor-unification.md"
                                                             },
                                                             {
                                                                 "slice":  "F5-tonaljs-music-domain-policy",
```

## Required Reads

- `docs/v1/START-HERE.md`
- `docs/v1/status.json`
- `docs/v1/implementation-slices/plans/F0-audio-music-library-alignment-and-tech-debt-closeout.md`
- `docs/v1/implementation-slices/plans/F3-tone-runtime-metronome-alignment.md`
- `docs/v1/implementation-slices/rules/external-library-first.md`
- `docs/v1/implementation-slices/04-practice-controls-upgrade.md`
- `docs/v1/implementation-slices/05-library-viewer-upgrade.md`
- `src/lib/quick-metronome/pre-start-countdown.ts`
- `src/lib/quick-metronome/bar-count-in-scheduler.ts`
- `src/lib/quick-metronome/use-metronome-transport.ts`
- `src/domain/practice/bar-count-in.ts`
- `src/components/sheet-practice/controls/sheet-practice-controls.tsx`
- `src/services/sheet-viewer/service.ts`
- `src/infrastructure/audio/tone-metronome-adapter.ts`
- `src/services/metronome/browser-metronome-service.ts`
- `tests/unit/pre-start-countdown.test.ts`
- `tests/unit/bar-count-in-domain.test.ts`
- `tests/unit/bar-count-in-scheduler.test.ts`
- `tests/unit/quick-metronome-transport.test.tsx`
- `tests/unit/sheet-practice-controls.test.tsx`
- `tests/unit/architecture-boundaries.test.ts`
- `tests/e2e/sheet-practice-controls.spec.ts`
- `tests/e2e/sheet-segment-recording.spec.ts`
- `tests/e2e/sheet-viewer.spec.ts`
- `tests/e2e/quick-metronome.spec.ts`

## Current Runtime Shape

- `src/lib/quick-metronome/pre-start-countdown.ts` mixes deterministic plan helpers with production `setTimeout` execution:
  - pure: `getQuickAdvancedCountdownPlan`, `toPreStartCountdownPlan`, plan/tick types, input validation;
  - runtime: `schedulePreStartCountdown` accepts `setTimeout`/`clearTimeout`, schedules each tick from offset-derived delays, and schedules completion from `totalDurationMs`.
- `src/lib/quick-metronome/bar-count-in-scheduler.ts` is a runtime wrapper over `schedulePreStartCountdown`. It preserves bar count-in presentation metadata but still executes through `setTimeout`.
- `src/lib/quick-metronome/use-metronome-transport.ts` passes `window.setTimeout` and `window.clearTimeout` directly for bar count-in and generic pre-start countdown. Its fixed `settings.countdownBeats` path also schedules a recursive `window.setTimeout`.
- `src/domain/practice/bar-count-in.ts` is already pure business planning. `getBarCountInPlan` validates the measure grid and selected segment, blocks stale selected-segment grids, and derives labels, offsets, beat counts, and durations.
- `src/components/sheet-practice/controls/sheet-practice-controls.tsx` prepares bar count-in plans and currently injects `scheduleBarCountIn` into the transport hook. It also has a non-audio zero-delay refresh timer for session hydration.
- F3 is already present in the baseline: `src/infrastructure/audio/tone-metronome-adapter.ts` exposes Tone `Transport`, `Loop`, `Draw`, and click primitives through `createLoop`, `draw`, `startTransport`, `stopTransport`, `cancelTransport`, `triggerClick`, and `dispose`. `src/services/metronome/browser-metronome-service.ts` uses that runtime instead of `setTimeout` for metronome tick alignment.
- `src/services/sheet-viewer/service.ts` contains only the pure assisted page-turn delay helper. The actual assisted page-turn `window.setTimeout` lives in viewer UI, outside the current Pack F runtime timer guardrail target.

## External Primitive Check

F4 must not add another scheduler. The repo already depends on Tone, and F3 raised a Tone runtime adapter for musical timing and UI draw synchronization. Countdown execution should extend or reuse that boundary instead of reintroducing local timers under a new name.

| Primitive or reference | Evidence checked | F4 decision | What repo code still owns |
| --- | --- | --- | --- |
| Tone `Transport` | F0 and F3 identify `Transport` as the owner of musical event timing, start/stop/cancel, BPM, and scheduled callback times. The F3 adapter already wraps global transport lifecycle. | `replace` production countdown/count-in `setTimeout` execution. If F4 needs finite one-shot events, add a minimal adapter method over Tone `Transport.scheduleOnce` and matching clear/cancel handle, not a custom lookahead scheduler. | Repo code still owns when a countdown is armed, canceled, blocked, or followed by `metronomeService.start`. |
| Tone `Loop` | F3 uses `Loop` for repeated metronome playback at notation intervals. It is the right primitive for ongoing beat trains. | `keep-business-logic` plus runtime reuse. F4 countdowns are finite precomputed plans, so they should not be forced into a new local loop abstraction. Use Tone `Loop` only if the implementation can preserve all plan offsets and cancellation semantics with less code than `scheduleOnce`. | Pure plans still define the finite sequence and labels. The executor only plays the plan. |
| Tone `Draw` | F3 moved visual tick handler alignment from `window.setTimeout` to `Tone.getDraw().schedule` through the adapter. | `replace` countdown UI callback timing. Countdown `onTick` and `onComplete` should be delivered through the same fakeable `draw` boundary at scheduled audio time. | UI/hook code still owns visible countdown state and stale-run guards. |
| F3 Tone runtime adapter | Current adapter exposes `createLoop`, `draw`, `triggerClick`, transport lifecycle, and fakeable types. | `replace` local timer wiring by introducing a countdown executor backed by this adapter. F4 may add only the smallest missing finite-event primitive to the adapter surface. | Service/hook code owns product orchestration; infrastructure owns Tone imports. No UI/domain Tone imports are allowed. |
| Historical Web Audio lookahead scheduler | F0 recorded older `setTimeout` or worker lookahead patterns as historical evidence. | `no-go-with-guardrail` for F4. This repo already uses Tone; do not build a second countdown scheduler, worker clock, or lookahead queue. | If Tone cannot preserve F4 behavior, stop and update F0/F4 with a documented no-go instead of landing a disguised local scheduler. |
| Browser `setTimeout` | Current F2 guardrail allows temporary F4 countdown/count-in production timer entries. | `replace` for beat/countdown/count-in runtime in F4. A narrow exception may remain only for genuinely non-audio/manual UI delays with `PACK_F_APPROVED_RUNTIME_TIMER_EXCEPTION` and a plan-approved reason. | Non-audio zero-delay refresh timers and viewer manual page-turn timers are not F4 countdown execution. F7 owns their final naming and guardrails. |

Pure business plan logic that must remain repo-owned:

- `getQuickAdvancedCountdownPlan`: deterministic beat or measure countdown plan from product settings.
- `toPreStartCountdownPlan`: deterministic neutral projection from a ready bar count-in plan.
- `getBarCountInPlan`: deterministic selected-segment or whole-sheet bar count-in planning, stale-grid blocking, segment labels, pre-roll labels, measure offsets, pickup evidence, and denominator-aware durations.
- Sheet Practice orchestration: loading the current measure grid, blocking missing/stale grids, recording harness events, visible countdown state, start failure rollback, latest settings on completion, and session event capture.

## Smallest Implementable F4 Coding PR

### 1. Split pure plan code from runtime execution

Keep pure plan behavior deterministic and testable without browser timers.

Likely production edits:

- `src/lib/quick-metronome/pre-start-countdown.ts`
  - Keep or move only pure plan types and helpers:
    - `PreStartCountdownBeat`
    - `PreStartCountdownPlan`
    - `QuickAdvancedCountdownMode`
    - `QuickAdvancedCountdownInput`
    - `getQuickAdvancedCountdownPlan`
    - `toPreStartCountdownPlan`
  - Remove production `setTimeout` execution from this module.
- `src/lib/quick-metronome/bar-count-in-scheduler.ts`
  - Delete, or replace with a small pure metadata adapter if the coding agent needs a transition path.
  - Do not leave a production `scheduleBarCountIn` implementation that calls `setTimeout`.
- `src/domain/practice/bar-count-in.ts`
  - No behavioral change expected. Keep `getBarCountInPlan` pure.

If import churn is high, the coding agent may keep compatibility exports from the old file paths, but those exports must not expose production timer scheduling.

### 2. Introduce a countdown executor boundary

Add a runtime boundary that consumes precomputed plans and is fakeable in tests.

Likely new production file:

- `src/services/metronome/countdown-executor.ts`

Likely shape:

```ts
export type CountdownExecutorTick = {
  count: number;
  beatNumber: number;
  remainingBeats: number;
  scheduledOffsetMs: number;
  scheduledDelayMs: number;
  audioTime: number;
};

export type CountdownExecutorRun = {
  cancel: () => void;
};

export type CountdownExecutor = {
  run: (options: {
    plan: PreStartCountdownPlan;
    bpm: number;
    timeSignature: TimeSignature;
    onTick?: (tick: CountdownExecutorTick) => void;
    onComplete: () => void;
  }) => CountdownExecutorRun;
};
```

The exact names can differ, but the boundary must make these responsibilities explicit:

- Pure plans provide beat count, offsets, and total duration.
- The executor owns runtime scheduling, cancellation, audio-time alignment, and optional click output.
- The hook/UI owns state transitions and start orchestration.
- Unit tests can provide a fake executor with manual `tick`, `complete`, and `cancel` controls.

### 3. Back the production executor with F3 Tone runtime primitives

Likely production files:

- `src/infrastructure/audio/tone-metronome-adapter.ts`
- `src/services/metronome/browser-countdown-executor.ts`
- `src/services/metronome/browser.ts`

Preferred implementation:

- Extend `ToneMetronomeAdapter` only as much as F4 needs for finite countdown execution. A likely addition is a fakeable one-shot scheduled event handle over Tone `Transport.scheduleOnce`, for example:

```ts
export type ToneMetronomeScheduledEventHandle = {
  cancel: () => void;
};

scheduleOnce: (
  callback: ToneScheduledCallback,
  time: string | number
) => ToneMetronomeScheduledEventHandle;
```

- Use Tone transport time for the finite countdown sequence.
- Use `adapter.draw` for `onTick` and `onComplete` callbacks.
- Use `adapter.triggerClick` for audible countdown ticks if current product behavior expects countdown clicks. If current behavior is visual-only, document that F4 preserves visual-only countdown and does not add new audible clicks.
- Stop/cancel/dispose the runtime on cancel and after completion.
- Do not import Tone outside `src/infrastructure/audio/tone-metronome-adapter.ts`.
- Do not use `window.setTimeout`, `setInterval`, workers, or a lookahead queue for production beat/countdown/count-in execution.

The production executor can create its own adapter before playback starts, then dispose it before `metronomeService.start`. Because Tone transport is global, tests must cover that cancel/complete stops and cancels transport so the subsequent F3 metronome start begins cleanly.

### 4. Route `useMetronomeTransport` through the executor

Likely production file:

- `src/lib/quick-metronome/use-metronome-transport.ts`

Required orchestration changes:

- Replace `BarCountInScheduler` and `PreStartCountdownScheduler` timer callback options with a `CountdownExecutor` or `createCountdownExecutor` option.
- For `barCountIn`, call the executor with `toPreStartCountdownPlan(plan)` and map generic ticks back to `plan.beats[tick.count - 1]` to preserve:
  - `sourceMeasureNumber`
  - `isPreRoll`
  - `beatNumber`
  - `scheduledOffsetMs`
  - `scheduledDelayMs`
- For generic `preStartCountdown`, pass the provided plan directly.
- For fixed `settings.countdownBeats`, derive a plan using `getQuickAdvancedCountdownPlan({ mode: "beats", count: settings.countdownBeats, bpm: settings.bpm, timeSignature: settings.timeSignature })` and execute it through the same boundary.
- Keep latest-settings-on-complete behavior: when countdown completes, `metronomeService.start` must use the current `latestOptionsRef.current.settings`.
- Keep duplicate-start guards, stop cancellation, stale run id checks, and start failure rollback.

If a default production executor would introduce infrastructure imports into the hook, prefer dependency injection from the existing browser composition layer or service factory. The coding PR must preserve the UI-to-infrastructure guardrail.

### 5. Update Sheet Practice composition without changing product scope

Likely production file:

- `src/components/sheet-practice/controls/sheet-practice-controls.tsx`

Expected changes:

- Stop importing `scheduleBarCountIn`.
- Pass the production countdown executor or executor factory into `useMetronomeTransport` through a service-level boundary.
- Preserve bar count-in plan preparation, missing-grid block, stale-grid block, harness events, visible tick detail, and active plan cleanup.
- Do not change segment tempo, presets, recording workflows, or measure-grid calibration behavior.

The existing zero-delay session refresh timer is not beat/countdown execution. F4 may either leave it as a narrow non-audio exception with a marker and updated architecture reason, or move it only if there is an obvious existing React/data-subscription alternative. Do not expand F4 into general UI timer cleanup.

### 6. Update F4 guardrails

Likely test file:

- `tests/unit/architecture-boundaries.test.ts`

Required guardrail result:

- Remove the F4 allowlist entries for:
  - `src/lib/quick-metronome/bar-count-in-scheduler.ts`
  - `src/lib/quick-metronome/pre-start-countdown.ts`
  - `src/lib/quick-metronome/use-metronome-transport.ts`
- Do not leave beat/countdown/count-in production `setTimeout` usage in the scanned files.
- If `src/components/sheet-practice/controls/sheet-practice-controls.tsx` keeps the zero-delay refresh timer, either:
  - update the allowlist reason so it is explicitly non-audio and expires at F7; or
  - add `PACK_F_APPROVED_RUNTIME_TIMER_EXCEPTION` with a documented F4 no-go reason.

### 7. Assisted page-turn decision

F4 should name and defer assisted page turn instead of routing it through the countdown executor.

Decision:

- F4 does not implement reference-synced page turning.
- F4 does not route viewer assisted page turn through the countdown executor.
- Assisted page turn remains a manually armed segment timer for Pack 5 viewer behavior and is planned for F7 boundary hardening.

Reason:

- Current assisted page turn is opt-in, manually armed, and derived from selected segment duration.
- It is not a pre-start musical countdown, not metronome playback, and not reference-synced score following.
- Routing it through the Tone countdown executor in F4 would couple viewer UI to global audio transport and could make the feature look like reference synchronization, which is explicitly out of v1 scope.

F7 should rename or isolate this as a manual segment page-turn timer and decide whether a narrow UI timer exception is acceptable.

## Likely Files

Expected production files in the F4 coding PR:

- `src/infrastructure/audio/tone-metronome-adapter.ts`
- `src/services/metronome/countdown-executor.ts`
- `src/services/metronome/browser-countdown-executor.ts`
- `src/services/metronome/browser.ts`
- `src/lib/quick-metronome/pre-start-countdown.ts`
- `src/lib/quick-metronome/use-metronome-transport.ts`
- `src/components/sheet-practice/controls/sheet-practice-controls.tsx`

Expected deleted or heavily simplified production file:

- `src/lib/quick-metronome/bar-count-in-scheduler.ts`

Expected test files:

- `tests/unit/pre-start-countdown.test.ts`
- `tests/unit/bar-count-in-domain.test.ts`
- `tests/unit/bar-count-in-scheduler.test.ts`, likely renamed or replaced by countdown executor tests
- `tests/unit/quick-metronome-transport.test.tsx`
- `tests/unit/sheet-practice-controls.test.tsx`
- `tests/unit/architecture-boundaries.test.ts`
- `tests/unit/fake-tone-metronome-adapter.ts`

Expected E2E verification specs:

- `tests/e2e/quick-metronome.spec.ts`
- `tests/e2e/sheet-practice-controls.spec.ts`
- `tests/e2e/sheet-segment-recording.spec.ts`
- `tests/e2e/sheet-viewer.spec.ts`

No F4 production change is expected in:

- `src/domain/practice/bar-count-in.ts`, except if a type-only import/export cleanup is unavoidable.
- `src/services/sheet-viewer/service.ts`
- `src/components/sheet-practice/viewer/sheet-viewer-experience.tsx`
- reference playback, recording capture, waveform, TonalJS, sheet import, storage, or settings modules.

## No-Go / Out Of Scope

- No production code in this plan PR.
- No new scheduler abstraction backed by `setTimeout`, `setInterval`, workers, requestAnimationFrame loops, or Web Audio lookahead queues.
- No UI/domain Tone imports.
- No `src/components/** -> @/infrastructure/audio/**` import.
- No business policy moved into infrastructure.
- No changes to allowed BPM, time signatures, subdivisions, accent modes, tap tempo, preset persistence, session persistence, recording, waveform, or sheet viewer rendering.
- No reference-synced page turning, automatic score following, automatic PDF recognition, automatic mistake detection, A-B loop, or reference segment binding.
- No F5 TonalJS parser/duration work.
- No F6 recording/decode/waveform work.
- No F7 broad boundary cleanup.
- No package install unless the coding agent proves Tone's installed API cannot support the executor.

## Acceptance Criteria

- Pure plan helpers remain deterministic and do not schedule timers.
- `getQuickAdvancedCountdownPlan` keeps current validation, meter-cycling beat labels, denominator-aware 6/8 and 12/8 durations, and fractional duration behavior.
- `getBarCountInPlan` keeps current stale-grid blocking, whole-sheet versus selected-segment scope, pre-roll labels, pickup evidence, selected segment labels, and no input mutation.
- Production bar count-in, generic pre-start countdown, and fixed `settings.countdownBeats` all execute through one countdown executor boundary.
- The production executor uses F3 Tone runtime primitives and fakeable adapter methods; it does not add local browser timer scheduling.
- `useMetronomeTransport` keeps duplicate-start guards, cancellation on stop/unmount, latest-settings-on-complete behavior, start-blocked behavior, start-failed rollback, and state transitions.
- Sheet Practice bar count-in still blocks visibly without a measure grid and still blocks stale selected-segment grids without falling back to playback.
- Sheet Practice visible bar-aware count-in still emits the harness plan/tick events used by E2E.
- Metronome playback starts only after countdown completion.
- F4 expired timer allowlist entries are removed from `tests/unit/architecture-boundaries.test.ts`, except for any explicitly documented non-audio/manual timer exception.
- No Tone import appears outside `src/infrastructure/audio/tone-metronome-adapter.ts`.
- Assisted page turn is explicitly deferred to F7 as a manually armed segment timer; no reference-synced page-turn logic is added.

## Test Plan For Coding PR

Required unit and architecture command:

```text
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/pre-start-countdown.test.ts tests/unit/bar-count-in-domain.test.ts tests/unit/quick-metronome-transport.test.tsx tests/unit/sheet-practice-controls.test.tsx tests/unit/architecture-boundaries.test.ts
```

If `tests/unit/bar-count-in-scheduler.test.ts` is replaced by executor tests, include the replacement test file in the same unit command and remove the obsolete scheduler test from the command.

Required E2E command:

```text
& .\scripts\npm-local.ps1 --% run test:e2e -- tests/e2e/quick-metronome.spec.ts tests/e2e/sheet-practice-controls.spec.ts tests/e2e/sheet-segment-recording.spec.ts tests/e2e/sheet-viewer.spec.ts
```

Required static checks:

```text
& .\scripts\npm-local.ps1 --% run lint -- src/infrastructure/audio/tone-metronome-adapter.ts src/services/metronome/countdown-executor.ts src/services/metronome/browser-countdown-executor.ts src/services/metronome/browser.ts src/lib/quick-metronome/pre-start-countdown.ts src/lib/quick-metronome/use-metronome-transport.ts src/components/sheet-practice/controls/sheet-practice-controls.tsx tests/unit/pre-start-countdown.test.ts tests/unit/quick-metronome-transport.test.tsx tests/unit/sheet-practice-controls.test.tsx tests/unit/architecture-boundaries.test.ts
& .\scripts\npm-local.ps1 --% run typecheck
git diff --check
```

Targeted behavior to assert:

- Fake executor captures countdown plans without using `window.setTimeout`.
- Fake executor manual tick updates `countdownRemaining` and bar count-in visible tick detail.
- Fake executor completion starts playback with latest settings.
- Fake executor cancellation prevents future completion from starting playback.
- Repeated starts while counting do not create duplicate executor runs.
- Bar count-in wins over simple countdown when both are configured.
- Fixed `settings.countdownBeats` uses `getQuickAdvancedCountdownPlan` and the same executor.
- Missing-grid and stale-grid bar count-in blocks do not call `metronomeService.start`.
- Architecture scan fails if new production beat/countdown/count-in `setTimeout` scheduling appears.

## Plan PR Verification

For this plan/status-only PR, verification is intentionally small and was rerun after the external plan review requested explicit evidence.

```text
git diff --check
```

Result: passed. The command returned exit code `0` and printed no output.

```text
Get-Content docs\v1\status.json -Raw | ConvertFrom-Json | Out-Null; Write-Output 'docs/v1/status.json parsed OK'
```

Result: passed with output:

```text
docs/v1/status.json parsed OK
```

The status diff shown in `Status JSON Evidence` was produced with:

```text
git diff origin/main...HEAD -- docs\v1\status.json
```

Do not run product unit or E2E suites as proof for the plan-only PR.

## Risks And Mitigations

- Tone global transport coupling: countdown execution before playback can affect the following metronome start if it leaves scheduled events behind. Mitigate with tests for cancel/complete cleanup and by stopping/canceling transport before disposal.
- Accidental second scheduler: an executor wrapper could hide `setTimeout` scheduling. Mitigate with architecture-boundary tests and code review requiring Tone primitive usage.
- Audible behavior drift: current countdown behavior may be visual-only. Mitigate by preserving current audible behavior unless a product test proves countdown clicks already exist.
- Denominator-aware timing drift: fixed countdown and bar count-in depend on shared meter timing. Mitigate by keeping `getQuickAdvancedCountdownPlan` and `getBarCountInPlan` pure and reusing their existing tests.
- Stale-grid safety drift: moving execution could accidentally start playback when a selected segment plan is stale. Mitigate with existing Sheet Practice unit tests and E2E blocking evidence.
- Test harness coupling: E2E listens for bar count-in plan/tick events. Mitigate by preserving event payload shapes or updating tests only when payload semantics remain equivalent.
- UI boundary drift: injecting a production executor could tempt a component to import infrastructure audio. Mitigate by exporting through the service/browser composition layer and keeping architecture tests strict.
- F4 scope creep: viewer assisted page turn and reference sync are nearby timer topics. Mitigate by deferring assisted page turn naming/cleanup to F7 and changing no viewer production code in F4.

## Rollback And Fake Strategy

- Rollback is code-only; no data migration or persisted schema change is involved.
- If F4 coding fails, revert the countdown executor changes and restore the F4 runtime timer allowlist entries until a revised plan is approved.
- Unit tests should use a fake countdown executor with:
  - captured `run` options;
  - manual `tick` and `complete` methods;
  - `cancel` spy;
  - no browser timer dependency.
- Tone adapter tests should fake finite scheduled event handles and `draw` callbacks. They should not require real audio output.
- Browser E2E remains the runtime proof for real Tone integration and Sheet Practice behavior.
- If Tone `Transport`/`Draw` cannot preserve required countdown semantics, stop implementation, document the no-go in this plan and F0, and do not land a custom `setTimeout` scheduler under an exception without external plan review.

## Handoff

Coding agent should read only:

- `docs/v1/START-HERE.md`
- this plan
- `docs/v1/implementation-slices/rules/external-library-first.md`
- `docs/v1/implementation-slices/plans/F0-audio-music-library-alignment-and-tech-debt-closeout.md`
- `docs/v1/implementation-slices/plans/F3-tone-runtime-metronome-alignment.md`
- the current code and tests listed in this plan

The coding agent should implement only F4 countdown executor unification and should not continue into F5, F6, or F7.
