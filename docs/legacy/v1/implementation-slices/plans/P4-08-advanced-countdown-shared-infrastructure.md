# P4-08 Advanced Countdown Shared Infrastructure Plan

## Slice

- Slice: `P4-08 advanced-countdown-shared-infrastructure`
- Related Pack 4 feature: `controls.bar-aware-count-in`
- Related Pack 6 feature: `quick.advanced-countdown`
- Product contracts:
  - `docs/v1/05b-practice-controls.md`
  - `docs/v1/02-quick-metronome.md`
  - `docs/v1/remaining-feature-contracts.md`, section `quick.advanced-countdown`
- Slice files:
  - `docs/v1/implementation-slices/04-practice-controls-upgrade.md`
  - `docs/v1/implementation-slices/06-quick-metronome-training.md`
- Required prerequisites: verified `P4-03 bar-count-in-domain`, verified `P4-04 bar-count-in-scheduler`, verified `P4-05 bar-count-in-ui`
- Planning model: `gpt-5.5`, medium effort, standard speed
- Recommended implementation tier: Tier C timing/shared-hook slice, because it touches shared pre-start scheduling but should not add user-facing UI

## Verdict

Implement a minimal shared infrastructure bridge now.

Do not implement the full Quick Metronome advanced countdown feature in P4-08. P6-14 still owns Quick Metronome user-facing controls, copy, persistence decisions, E2E happy paths, and final acceptance for `quick.advanced-countdown`.

Do not defer P4-08 entirely to Pack 6 either. P4-03 through P4-05 already proved a scheduler-backed pre-start count-in path, but the scheduler and transport names are still bar-count-in-specific. If Pack 6 builds directly on those names, it will either leak Sheet Practice vocabulary into Quick Metronome or duplicate countdown scheduling. P4-08 should make the existing proven scheduler shape reusable with the smallest compatible extraction.

## Refined Scope

P4-08 should:

- introduce one generic pre-start countdown plan shape that contains only the fields the shared scheduler/transport need;
- adapt the existing `BarCountInReadyPlan` into that generic shape without changing P4-03 math;
- generalize the existing `scheduleBarCountIn` implementation to a reusable scheduler while preserving a compatibility wrapper for existing P4 code/tests;
- let `useMetronomeTransport` accept a generic advanced countdown option in addition to the existing bar-count-in option;
- add a pure Quick Metronome countdown plan helper for Pack 6 to use later, covering beats and measures but not exposing UI;
- keep current Sheet Practice and Quick Metronome behavior unchanged by default.

The implementation should be a bridge, not a new countdown framework.

Hard Quick Metronome boundary:

- `getQuickAdvancedCountdownPlan()` may exist only as a pure helper in P4-08.
- P4-08 must not wire that helper into any production Quick Metronome entry point.
- The Quick Metronome screen after P4-08 must still use the existing fixed `settings.countdownBeats` path only.
- P4-08 must not change Quick UI, settings state, Start behavior, default countdown select options, presets, `localStorage`, Dexie, route copy, or any user-visible Quick Metronome behavior.
- In P4-08, `getQuickAdvancedCountdownPlan()` may be used only by unit tests or by future Pack 6 callers.

## Out Of Scope

- No Quick Metronome visible UI changes, controls, labels, route changes, screenshots, or user-facing advanced countdown behavior.
- No production Quick Metronome entry may call `getQuickAdvancedCountdownPlan()` in P4-08.
- No Quick Metronome settings, Start handler, default countdown select, route copy, preset/template path, `localStorage`, Dexie, or user-visible behavior changes.
- No Pack 6 training modes: no auto-increase, mute training, templates, warmup routines, or tempo history.
- No persistence schema changes, Dexie migrations, localStorage writes, quick template storage, preset defaults, or import/export changes.
- No changes to `MetronomeSettings.countdownBeats` semantics or existing fixed countdown options unless needed only for type compatibility.
- No P4-03 bar count-in domain rewrites, measure-grid math changes, stale-grid policy changes, or selected-segment behavior changes.
- No P4-05 Sheet Practice UI redesign.
- No new Tone/WebAudio engine, new metronome service, scheduler rewrite around audio internals, or new dependency.
- No recording/session schema changes and no automatic recording start.

## Boundaries With Existing Work

| Area | P4-08 boundary |
|---|---|
| P4-03 `bar-count-in-domain` | Reuse and adapt `BarCountInReadyPlan`; do not change measure-grid, stale-segment, pickup, or beat-label math. |
| P4-04 `bar-count-in-scheduler` | Extract the existing scheduler behavior to generic pre-start countdown scheduling; keep `scheduleBarCountIn` as a small wrapper or compatibility export. |
| P4-05 `bar-count-in-ui` | Existing UI, harness events, messages, and disabled-state behavior must remain unchanged. |
| P4-06/P4-07 presets | Existing preset snapshot behavior for `countdownBeats` and bar count-in state must remain unchanged. |
| P6-14 `quick-advanced-countdown` | Owns visible Quick Metronome advanced countdown UI, route wiring, E2E acceptance, and whether advanced countdown replaces or extends the fixed `countdownBeats` select. P4-08 does not satisfy Pack 6 acceptance. |

## Current Reuse Points

Existing code to reuse:

- `src/domain/practice/bar-count-in.ts`
  - `BarCountInReadyPlan`
  - `getBarCountInPlan`
- `src/lib/quick-metronome/bar-count-in-scheduler.ts`
  - proven timer scheduling from plan beat offsets
- `src/lib/quick-metronome/use-metronome-transport.ts`
  - shared transport state, cancellation, latest-settings playback start, duplicate-start protection
- `src/lib/quick-metronome/control.ts`
  - `parseTimeSignature`, `getCountdownOptions`, `parseCountdownBeats`
- `src/domain/practice/meter-timing.ts`
  - `getMeterBeatDurationMs` and denominator-aware timing policy
- Existing tests:
  - `tests/unit/bar-count-in-scheduler.test.ts`
  - `tests/unit/quick-metronome-transport.test.tsx`
  - `tests/unit/bar-count-in-domain.test.ts`
  - `tests/unit/quick-metronome-control.test.ts`
  - `tests/unit/sheet-practice-controls.test.tsx`
  - `tests/e2e/sheet-practice-controls.spec.ts`

## Proposed Interfaces

Exact names can change to match local style, but preserve these semantics.

Preferred new shared module:

```ts
// src/lib/quick-metronome/pre-start-countdown.ts

export type PreStartCountdownBeat = {
  count: number;
  beatNumber: number;
  remainingBeats: number;
  scheduledOffsetMs: number;
  scheduledDelayMs: number;
};

export type PreStartCountdownPlan = {
  beatCount: number;
  totalDurationMs: number;
  beats: Array<{
    count: number;
    beatNumber: number;
    offsetMs: number;
  }>;
};

export type PreStartCountdownSchedulerOptions = {
  plan: PreStartCountdownPlan;
  setTimeout?: (callback: () => void, delayMs: number) => number;
  clearTimeout?: (timerId: number) => void;
  onTick?: (tick: PreStartCountdownBeat) => void;
  onComplete: () => void;
};
```

The generic public types must stay neutral. They must not require Sheet Practice presentation metadata such as `sourceMeasureNumber` or `isPreRoll`, and they must not include a `source` discriminator that can tempt scheduler branching.

Scheduler core requirements:

- Depend only on neutral scheduling fields: `beatCount`, `totalDurationMs`, `beats[].offsetMs`, and the minimal tick identity fields needed for callbacks such as `count` and `beatNumber`.
- Never branch behavior based on source values such as `"bar-count-in"`, `"fixed-beats"`, or `"fixed-measures"`.
- Treat all plans with the same neutral fields the same way.
- Keep Sheet Practice presentation metadata outside the core scheduler.

Optional presentation metadata may exist only at adapter boundaries:

```ts
export type BarCountInPreStartCountdownBeat = PreStartCountdownBeat & {
  sourceMeasureNumber: number | null;
  isPreRoll: boolean;
};

export type BarCountInPreStartCountdownPlan = PreStartCountdownPlan & {
  beats: Array<PreStartCountdownPlan["beats"][number] & {
    sourceMeasureNumber: number | null;
    isPreRoll: boolean;
  }>;
};
```

The coding agent may instead keep `sourceMeasureNumber` and `isPreRoll` only in the `scheduleBarCountIn` compatibility wrapper tick. Either shape is acceptable as long as the generic scheduler does not require or interpret those fields.

Required helpers:

```ts
export function schedulePreStartCountdown(
  options: PreStartCountdownSchedulerOptions
): { cancel: () => void };

export function toPreStartCountdownPlan(
  plan: BarCountInReadyPlan
): PreStartCountdownPlan;
```

Backward-compatible wrapper:

```ts
export function scheduleBarCountIn(options: BarCountInSchedulerOptions): BarCountInSchedulerCancel {
  return schedulePreStartCountdown({
    ...options,
    plan: toPreStartCountdownPlan(options.plan)
  });
}
```

The wrapper must keep current `BarCountInSchedulerTick` semantics for Sheet Practice, including `sourceMeasureNumber` and `isPreRoll`. Those fields are compatibility/presentation metadata, not scheduler-core requirements.

Quick countdown helper for Pack 6:

```ts
export type QuickAdvancedCountdownMode = "beats" | "measures";

export type QuickAdvancedCountdownInput = {
  mode: QuickAdvancedCountdownMode;
  count: number;
  bpm: number;
  timeSignature: TimeSignature;
};

export function getQuickAdvancedCountdownPlan(
  input: QuickAdvancedCountdownInput
): PreStartCountdownPlan;
```

Required semantics:

- `mode: "beats"` creates exactly `count` beats.
- `mode: "measures"` creates `count * numerator` beats, where numerator comes from the existing time-signature policy.
- `count` must be finite, integer, and positive. Invalid values throw at the helper boundary.
- `bpm` and `timeSignature` must reuse current quick metronome/meter validation. Do not add unsupported meters.
- Beat duration must come from `getMeterBeatDurationMs({ bpm, timeSignature })`.
- `totalDurationMs = beatDurationMs * beatCount`, preserving fractional values.
- `beats[].offsetMs` starts at `-totalDurationMs` and ends at `-beatDurationMs`, matching the P4-03/P4-04 scheduler convention.
- Quick countdown plans do not have real sheet source measures. The generic helper should not invent sheet labels; it should emit only neutral beat/count/offset fields and beat numbers cycling through the meter numerator.
- The helper must not be imported or called from production Quick Metronome UI, settings, route, or start code in P4-08.

Transport hook extension:

```ts
export type PreStartCountdownTransportOptions = {
  enabled?: boolean;
  plan: PreStartCountdownPlan | null;
  schedule?: typeof schedulePreStartCountdown;
  onTick?: (tick: PreStartCountdownBeat) => void;
};
```

`useMetronomeTransport` should accept a generic `preStartCountdown?: PreStartCountdownTransportOptions` and continue accepting existing `barCountIn?: BarCountInTransportOptions` for compatibility. If both are passed, prefer the existing Sheet Practice `barCountIn` path for this slice and document that callers must not pass both outside tests.

Fallback order in `useMetronomeTransport`:

1. Existing `barCountIn` compatibility path, when enabled and given a ready plan.
2. Generic `preStartCountdown`, when enabled and given a plan.
3. Existing fixed `settings.countdownBeats` path.
4. Immediate playback.

If `preStartCountdown.enabled === false` or `preStartCountdown.plan === null`, it must be ignored and the legacy fixed `settings.countdownBeats` behavior must remain unchanged.

## Failure Semantics

- Non-ready or stale `BarCountInPlan` must still be rejected before scheduling. P4-08 should adapt only `BarCountInReadyPlan`.
- Generic scheduler rejects empty beat arrays, non-positive `beatCount`, and non-positive/non-finite `totalDurationMs`.
- Invalid Quick advanced countdown input throws from the pure helper; P6-14 UI will prevent invalid user input and surface errors.
- Cancel during generic countdown clears all timers, does not call `onComplete`, and does not start playback.
- Repeated Start while counting still creates no duplicate scheduler chain.
- Settings changes during countdown do not mutate the active plan; actual playback still starts with latest settings through existing transport behavior.
- If `metronomeService.start` fails after countdown completes, existing `onStartFailed` rollback semantics remain unchanged.
- Existing simple `settings.countdownBeats` remains the fallback path when no generic countdown or bar-count-in plan is enabled.
- `preStartCountdown.enabled === false` and `preStartCountdown.plan === null` are non-errors and must fall through to existing fixed `settings.countdownBeats` behavior.
- Browser timer jitter is not a product error; deterministic timing belongs in unit tests with fake timers.

## Behavior Matrix

| Scenario | Expected behavior |
|---|---|
| Existing Quick Metronome with fixed `countdownBeats` | Unchanged. Existing simple countdown tests still pass. |
| Existing Sheet Practice bar count-in | Unchanged UI and behavior; wrapper routes through generic scheduler internally if extraction is chosen. |
| Ready `BarCountInReadyPlan` adapted to generic plan | Produces the same tick count, delays, remaining beats, and completion timing as current P4-04 scheduler. |
| Quick beats plan, 4 beats in 4/4 at 120 BPM | Generic plan has 4 beats, 500 ms beat duration, 2000 ms total, offsets `[-2000, -1500, -1000, -500]`. |
| Quick measures plan, 2 measures in 3/4 at 90 BPM | Generic plan has 6 beats and fractional beat duration from shared meter timing. |
| Quick measures plan in 6/8 or 12/8 | Uses numerator beat counts and eighth-note denominator-aware timing, matching current meter policy. |
| Invalid quick count | Throws; no scheduler starts. |
| Generic countdown stopped before completion | Timers clear, transport returns stopped, playback does not start. |
| Both generic pre-start countdown and bar count-in passed | Existing bar-count-in path wins for compatibility; callers should avoid this outside compatibility tests. |
| Generic pre-start countdown disabled or plan null, fixed `countdownBeats` set | Existing fixed countdown start/tick/complete order is unchanged. |

## Likely Files

Production files:

- `src/lib/quick-metronome/pre-start-countdown.ts`
  - New shared plan/scheduler/helper module, or equivalent small module if the coding agent prefers renaming the current scheduler.
- `src/lib/quick-metronome/bar-count-in-scheduler.ts`
  - Keep compatibility exports and delegate to shared scheduler.
- `src/lib/quick-metronome/use-metronome-transport.ts`
  - Add optional generic pre-start countdown path with the same cancellation/latest-settings semantics.
- `src/lib/quick-metronome/control.ts`
  - Optional: export small validation helpers or option constants only if the Quick countdown helper needs them.

Likely tests:

- `tests/unit/pre-start-countdown.test.ts`
- `tests/unit/bar-count-in-scheduler.test.ts`
- `tests/unit/quick-metronome-transport.test.tsx`
- `tests/unit/quick-metronome-control.test.ts`
- `tests/unit/sheet-practice-controls.test.tsx`

Avoid editing:

- Quick Metronome UI component, settings state, Start handler, default countdown select, route copy, preset/template code, `localStorage`, Dexie, or any production Quick entry.
- Sheet Practice UI components except for type import fallout if unavoidable.
- E2E specs unless a compatibility check needs a small assertion. P4-08 should not need new browser E2E because user-facing behavior is unchanged.
- Persistence, recording, session, repository, import/export, or Dexie files.

## Unit Test Plan

Add or extend focused unit coverage:

- Generic scheduler schedules ticks from `plan.beats[].offsetMs` normalized to the first beat offset.
- Generic scheduler schedules completion from `plan.totalDurationMs`.
- Generic scheduler preserves fractional delay values.
- Generic scheduler cancel prevents future ticks and completion.
- Generic scheduler rejects empty beats, invalid beat count, and invalid total duration.
- `toPreStartCountdownPlan(BarCountInReadyPlan)` preserves beat count, offsets, source measure labels, pre-roll flags, and total duration.
- `scheduleBarCountIn` compatibility wrapper still emits the same tick shape expected by existing P4 tests.
- `getQuickAdvancedCountdownPlan({ mode: "beats" })` creates the requested beat count and meter-cycling beat numbers.
- `getQuickAdvancedCountdownPlan({ mode: "measures" })` multiplies by the time-signature numerator.
- Quick helper uses denominator-aware timing for `3/4`, `6/8`, and `12/8`.
- Quick helper rejects zero, negative, fractional, `NaN`, infinite, and unsupported meter input.
- `useMetronomeTransport` generic countdown path:
  - enters `counting`;
  - emits countdown-start and tick callbacks;
  - starts playback only after completion;
  - uses latest settings at playback start;
  - cancels on stop;
  - does not duplicate starts while counting or playing;
  - lets the P4 `barCountIn` compatibility path win if both `barCountIn` and `preStartCountdown` are passed;
  - ignores `preStartCountdown.enabled === false` and falls back to existing fixed `settings.countdownBeats`;
  - ignores `preStartCountdown.plan === null` and falls back to existing fixed `settings.countdownBeats`;
  - preserves the existing Quick fixed countdown start/tick/complete order when generic countdown is absent, disabled, or null;
  - does not change legacy fixed countdown behavior when generic countdown is absent.
- Existing Sheet Practice bar-count-in component tests still pass without changing visible behavior.

The conflict and fallback assertions above belong explicitly in `tests/unit/quick-metronome-transport.test.tsx`, because the transport hook owns pre-start precedence.

## Deferred To P6-14

P6-14 remains `not_started`, and P4-08 does not satisfy Pack 6 acceptance.

P6-14 owns:

- Quick Metronome advanced countdown UI controls, labels, and copy.
- The product decision for whether advanced countdown replaces or extends the existing `countdownBeats` select.
- User input validation and error surfacing in the Quick Metronome screen.
- Persistence, preset, and template decisions for Quick advanced countdown settings.
- Quick Metronome configure/play/stop E2E for the final user-visible behavior.
- Any route, settings, Start handler, default select, local storage, Dexie, or user-visible behavior changes needed to expose the feature.

## E2E Plan

No new P4-08 E2E is required if implementation only extracts shared infrastructure and keeps runtime UI unchanged.

Run the existing Sheet Practice bar count-in E2E as a regression check because the scheduler implementation is shared:

- `tests/e2e/sheet-practice-controls.spec.ts`

P6-14 must add Quick Metronome configure/play/stop E2E for the final user-facing advanced countdown behavior.

Report browser evidence precisely. If the run uses Playwright `[chromium]`, say Playwright `[chromium]`, not real Chrome.

## Acceptance Criteria

- A shared pre-start countdown plan/scheduler exists with no Sheet Practice vocabulary in its generic public types.
- Existing `scheduleBarCountIn` imports remain supported or are migrated with minimal churn.
- Existing Sheet Practice bar-aware count-in behavior and tests remain unchanged.
- Existing Quick Metronome fixed countdown behavior and tests remain unchanged.
- A pure Quick advanced countdown plan helper exists for beats and measures, with denominator-aware timing and validation.
- Production Quick Metronome still does not call the pure helper in P4-08.
- `useMetronomeTransport` can run the generic plan path without requiring Sheet Practice-specific plan types.
- No user-facing Quick Metronome advanced countdown UI is implemented.
- No persistence, recording, session, or audio-engine schema is changed.
- The resulting implementation is small enough for one PR.

## Verification Commands For Coding Agent

Expected focused verification after implementation:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/pre-start-countdown.test.ts tests/unit/bar-count-in-scheduler.test.ts tests/unit/quick-metronome-transport.test.tsx tests/unit/quick-metronome-control.test.ts tests/unit/sheet-practice-controls.test.tsx
& .\scripts\npm-local.ps1 --% run test:e2e -- tests/e2e/sheet-practice-controls.spec.ts
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint -- src/lib/quick-metronome/pre-start-countdown.ts src/lib/quick-metronome/bar-count-in-scheduler.ts src/lib/quick-metronome/use-metronome-transport.ts src/lib/quick-metronome/control.ts tests/unit/pre-start-countdown.test.ts tests/unit/bar-count-in-scheduler.test.ts tests/unit/quick-metronome-transport.test.tsx tests/unit/quick-metronome-control.test.ts tests/unit/sheet-practice-controls.test.tsx
git diff --check
```

If the implementation renames the new test/module, run the actual paths and list the substitution in verification notes. If no production UI files are touched, do not lint them just to make the command longer.

## Planning Validation

For this planning-only slice:

```powershell
Get-Content -Raw docs/v1/status.json | ConvertFrom-Json | Out-Null
git diff --check
```

## Status And Review Gates

- P4-08 should move from `not_started` to `ready_for_coding` after this planning artifact is written.
- Pack 4 remains `planning_in_progress` until P4-08 implementation is verified or the scheduler marks the pack complete.
- P6-14 remains `not_started`; P4-08 does not satisfy Pack 6 acceptance by itself.
- External plan review should PASS before coding starts if the current v1 gate requires web ChatGPT plan review.

## Handoff Notes

Coding agents should read:

- `docs/v1/START-HERE.md`
- `docs/v1/implementation-slices/plans/P4-08-advanced-countdown-shared-infrastructure.md`
- `docs/v1/implementation-slices/04-practice-controls-upgrade.md`
- `docs/v1/implementation-slices/06-quick-metronome-training.md`
- `docs/v1/implementation-slices/plans/P4-03-bar-count-in-domain.md`
- `docs/v1/implementation-slices/plans/P4-04-bar-count-in-scheduler.md`
- `docs/v1/implementation-slices/plans/P4-05-bar-count-in-ui.md`
- `src/domain/practice/bar-count-in.ts`
- `src/lib/quick-metronome/bar-count-in-scheduler.ts`
- `src/lib/quick-metronome/use-metronome-transport.ts`
- `src/lib/quick-metronome/control.ts`
- `src/lib/quick-metronome/types.ts`
- relevant tests listed above

Stop and request a planning update if implementation appears to require Quick Metronome UI, persistence, templates, recording/session schema work, a new audio engine, or a broad countdown framework.
