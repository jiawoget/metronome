# F3 Tone Runtime Metronome Alignment Plan

## Planning Status

- Original planning branch: `codex/pack-f-f3-tone-runtime-plan`
- Implementation branch: `codex/pack-f-f3-tone-runtime`
- Scope type: historical Pack F planning artifact plus PR #96 implementation evidence.
- Implementation stage: PR #96 implements the smallest F3 coding stage described by this plan.
- Model/tier for implementation: high-risk timing/audio work; use `gpt-5.5`, high/extra-high reasoning, standard speed.
- Current baseline assumption: `main` includes merged F2 guardrails.
- This file preserves the planning content as the handoff and records the implementation PR status update; it is not a replacement design doc.

## Status JSON Evidence

The original plan PR changed only Pack F status evidence in `docs/v1/status.json`:

- Pack F remains `implementation_in_progress`.
- `F1-library-first-rescan-plan` remains `verified` with plan pointer `docs/v1/implementation-slices/plans/F0-audio-music-library-alignment-and-tech-debt-closeout.md`.
- `F2-external-library-first-guardrails` moves from `implementation_done` to `verified`, matching the merged F2 guardrail baseline.
- `F3-tone-runtime-metronome-alignment` moves from `not_started` to `planning_in_progress` and gains plan pointer `docs/v1/implementation-slices/plans/F3-tone-runtime-metronome-alignment.md`.
- `F4-countdown-executor-unification`, `F5-tonaljs-music-domain-policy`, `F6-recording-waveform-analysis-alignment`, and `F7-boundary-hardening-viewer-closeout` remain `not_started`.
- No Pack F slice is advanced to coding or verification by this plan PR.

PR #96 implementation status evidence:

- Pack F remains `implementation_in_progress`; it is active but not pack-verified.
- `F3-tone-runtime-metronome-alignment` moves from `planning_in_progress` to `implementation_done`, matching the implemented runtime PR state before pack verification.
- `F4-countdown-executor-unification`, `F5-tonaljs-music-domain-policy`, `F6-recording-waveform-analysis-alignment`, and `F7-boundary-hardening-viewer-closeout` remain `not_started`.

## Required Reads

- `docs/v1/START-HERE.md`
- `docs/v1/status.json`
- `docs/v1/implementation-slices/plans/F0-audio-music-library-alignment-and-tech-debt-closeout.md`
- `docs/v1/implementation-slices/rules/external-library-first.md`
- `docs/v1/implementation-slices/06-quick-metronome-training.md`
- `docs/v1/implementation-slices/04-practice-controls-upgrade.md`
- `src/infrastructure/audio/tone-metronome-adapter.ts`
- `src/services/metronome/browser-metronome-service.ts`
- `src/lib/quick-metronome/control.ts`
- `src/lib/quick-metronome/use-metronome-transport.ts`
- `tests/unit/quick-metronome-metronome-service.test.ts`
- `tests/unit/quick-metronome-transport.test.tsx`
- `tests/unit/quick-metronome-control.test.ts`
- `tests/unit/sheet-practice-controls.test.tsx`
- `tests/unit/architecture-boundaries.test.ts`
- `tests/e2e/quick-metronome.spec.ts`
- `tests/e2e/sheet-practice-controls.spec.ts`

## Current Runtime Shape

- `src/infrastructure/audio/tone-metronome-adapter.ts` imports Tone only inside the infrastructure adapter, creates a `Tone.Synth`, exposes `scheduleRepeat(callback, intervalSeconds)`, and lets the service pass generic trigger payloads.
- `src/services/metronome/browser-metronome-service.ts` currently:
  - computes `getTickIntervalMs(settings) / 1_000` for Tone scheduling;
  - owns transport stop/cancel/reschedule tokens;
  - uses `window.setTimeout` to delay UI tick handlers until `audioTime`;
  - owns accent policy application through `isAccentTick`;
  - owns diagnostic trace dispatch through `METRONOME_TRACE_EVENT`.
- `src/lib/quick-metronome/control.ts` owns product policy for allowed BPM, time signatures, subdivisions, accent modes, countdown choices, tap tempo, tick interval diagnostics, and accent decisions.
- `src/lib/quick-metronome/use-metronome-transport.ts` still owns fixed pre-start countdown and bar-count-in timer wiring. That timer work is F4, not F3.
- `tests/unit/architecture-boundaries.test.ts` currently allows one `setTimeout` use in `src/services/metronome/browser-metronome-service.ts` with expiry stage `F3`; the F3 coding PR must remove that allowlist entry when the service stops using the timer.

## External Primitive Check

Pack F's rule requires an explicit primitive decision before adding local audio, timing, or music primitives. F3 must not introduce a new scheduler around Tone.

| Primitive or reference | Evidence checked | F3 decision | What repo code still owns |
| --- | --- | --- | --- |
| Tone `Transport` | Tone source documents Transport as the owner for musical event timing, BPM, tempo curves, start/stop/pause, cancellation, and exact scheduled callback times. Source checked: `https://raw.githubusercontent.com/Tonejs/Tone.js/dev/Tone/core/clock/Transport.ts`; package version in repo: `tone@^15.1.22`. | `replace` local interval ownership. The adapter must expose `setBpm`, `startTransport`, `stopTransport`, `cancelTransport`, and disposal over the existing global Tone transport. | Product BPM validation remains in `control.ts`; service chooses when a settings update means reset/restart. No custom BPM clock, lookahead scheduler, or raw interval-to-seconds scheduling may be added. |
| Tone `Loop` | Tone docs show `Loop` creates a repeated callback at a musical interval, can start/stop on the Transport timeline, and accepts notation such as `8n`. Source checked: `https://tonejs.github.io/docs/15.1.22/classes/Loop.html`. | `replace` `transport.scheduleRepeat(callback, intervalSeconds)` with adapter-owned loop creation. | Service still counts ticks and applies product accent semantics. Adapter owns loop handles and cleanup. |
| Tone `Draw` | Tone source says Transport/Event callbacks fire before the scheduled audio time and Draw schedules visual callbacks against AudioContext time with `requestAnimationFrame`. Source checked: `https://raw.githubusercontent.com/Tonejs/Tone.js/dev/Tone/core/util/Draw.ts`; installed package exports `getDraw`. | `replace` `window.setTimeout(delayMs)` in `BrowserMetronomeService.emitTick`. | Service still decides which tick payload to emit. Adapter exposes `draw(callback, time)` through `Tone.getDraw().schedule`; tests use a fake draw implementation. |
| Tone `Synth` | Tone docs show `Synth` supports `triggerAttackRelease(note, duration, time, velocity)`. Source checked: `https://tonejs.github.io/docs/15.1.22/classes/Synth.html`. Current adapter already uses `Tone.Synth`. | `replace` low-level generic `trigger` with adapter-owned `triggerClick`. Use Synth for F3 because no sample asset or loading state is needed. | Service passes semantic click intent: accented and beat/subdivision tick. Adapter owns note/duration/velocity and `Tone.Synth` details. |
| Tone `Sampler` | Tone docs show `Sampler` maps notes or MIDI values to sample URLs, repitches loaded samples, and exposes `triggerAttackRelease`. Source checked: `https://tonejs.github.io/docs/15.1.22/classes/Sampler.html`. F0 also noted Chromatone uses `Sampler` for metronome-like clicks. | `no-go-with-guardrail` for F3. Do not add sampled-click assets, loading UI, or sample failure paths in this runtime-alignment PR. If sampled clicks are later required, use `Tone.Sampler` behind the same adapter. | Repo can keep a small click timbre policy in the adapter. It must not add custom buffer playback or Web Audio oscillator scheduling outside Tone. |
| Chromatone `use/tempo.js` | F0 records this reference using Tone `getTransport`, `Loop`, `Sampler`, `getDraw`, and Tonal `Note` in a tempo/metronome-like tool. Source: `https://github.com/chromatone/chromatone.center/blob/master/use/tempo.js`. | Reference pattern only; no dependency. It supports moving runtime primitives into one composition boundary. | Keep metronome product policy in this repo instead of copying Chromatone note/theory tables or app state. |
| `cwilso/metronome` | F0 records this older Web Audio scheduler using `setTimeout` lookahead and AudioContext scheduled note times. Source: `https://github.com/cwilso/metronome`. | `no-go-with-guardrail` for new F3 code. It explains why custom schedulers exist historically, but this repo already depends on Tone. | If Tone loop/draw spike fails, F3 must update this plan/F1 with a documented no-go instead of silently reintroducing local lookahead scheduling. |
| `tambien/Metro.js` | F0 records this as a narrow Web Audio metronome library with notation-like subdivisions and timetag callbacks. Source: `https://github.com/tambien/Metro.js`. | Reference pattern only; do not add another metronome dependency. | Reuse Tone notation and scheduled times instead of importing or recreating Metro.js behavior. |

## Smallest Implementable F3 Coding PR

### 1. Raise the Tone adapter API

File: `src/infrastructure/audio/tone-metronome-adapter.ts`

Replace the low-level schedule/trigger surface with a Tone-runtime surface:

```ts
export type ToneMetronomeLoopInterval =
  | "4n"
  | "8n"
  | "8t"
  | "16n"
  | "16t"
  | "32n";

export type ToneMetronomeLoopHandle = {
  start: (time?: string | number) => ToneMetronomeLoopHandle;
  stop: (time?: string | number) => ToneMetronomeLoopHandle;
  cancel: (time?: string | number) => ToneMetronomeLoopHandle;
  dispose: () => void;
};

export type ToneMetronomeClick = {
  time: number;
  accented: boolean;
  beatTick: boolean;
};

export type ToneMetronomeAdapter = {
  now: () => number;
  start: () => Promise<void>;
  setBpm: (bpm: number) => void;
  createLoop: (
    callback: ToneScheduledCallback,
    interval: ToneMetronomeLoopInterval
  ) => ToneMetronomeLoopHandle;
  draw: (callback: () => void, time: number) => void;
  startTransport: (time?: string | number) => void;
  stopTransport: () => void;
  cancelTransport: () => void;
  triggerClick: (click: ToneMetronomeClick) => void;
  dispose: () => void;
};
```

Implementation notes:

- `setBpm` should set the Tone transport BPM immediately. Do not introduce ramps in F3; Pack 6 auto-increase can decide ramp behavior later.
- `createLoop` should create a `Tone.Loop(callback, interval)`, start it at `0`, and return a handle that stops/cancels/disposes the loop. The service should no longer receive event ids from `transport.scheduleRepeat`.
- `draw` should delegate to `Tone.getDraw().schedule`. Keep the method fakeable so unit tests do not depend on real animation frames.
- `triggerClick` should use the existing `Tone.Synth` click source for F3. Preserve current notes/feel unless tests prove a bug: accented `E6` at velocity `0.9`, beat tick `B5`, subdivision tick `E5`, duration `0.06`.
- `dispose` must dispose the synth and any still-owned active loop if the adapter owns one internally. Prefer explicit loop handle cleanup from the service so lifecycle stays testable.

### 2. Use Tone notation from the service boundary

File: `src/services/metronome/browser-metronome-service.ts`

The service should bridge product `MetronomeSettings` to Tone runtime calls without importing Tone:

- Replace `eventId: number | null` with `loop: ToneMetronomeLoopHandle | null`.
- On `start(settings)`:
  - create and start the adapter;
  - stop/cancel transport as today;
  - reset `tickIndex`, `lastTriggerTime`, and schedule token as today;
  - call `adapter.setBpm(clampBpm(settings.bpm))`;
  - call `adapter.createLoop(callback, getToneLoopInterval(settings))`;
  - start the Tone transport.
- On `update(settings)` while playing:
  - keep current observable reset semantics unless a test deliberately documents a narrower BPM-only update path;
  - call `adapter.setBpm(clampBpm(settings.bpm))`;
  - clear the old loop handle, reset tick state, recreate the loop from notation, and restart transport.
- On `stop()`:
  - stop/cancel/dispose the loop handle;
  - stop/cancel transport;
  - dispose the adapter;
  - clear adapter and loop refs.
- In `handleScheduledTick(time)`:
  - keep `isAccentTick`, tick trace, tick index, and `getTickIntervalMs` for diagnostics only;
  - call `adapter.triggerClick({ time, accented, beatTick })`;
  - call `adapter.draw(() => emit tick handlers, time)` instead of `window.setTimeout`.

The Tone notation mapping must preserve current denominator-aware meter behavior. A fixed `quarter -> 4n` table is not enough because current `6/8` and `12/8` tests treat the denominator beat as an eighth note.

Required mapping:

| Product meter denominator | Product subdivision | Tone interval |
| --- | --- | --- |
| `4` | `quarter` | `4n` |
| `4` | `eighth` | `8n` |
| `4` | `triplet` | `8t` |
| `4` | `sixteenth` | `16n` |
| `8` | `quarter` | `8n` |
| `8` | `eighth` | `16n` |
| `8` | `triplet` | `16t` |
| `8` | `sixteenth` | `32n` |

Keep this as a small helper in `browser-metronome-service.ts` unless the coding agent needs a second production caller. Reuse `getMeterTimeSignatureParts` from `src/domain/practice/meter-timing.ts`; do not add another `timeSignature.split("/")` parser in F3.

### 3. Update F3 tests and guardrail evidence

Likely test changes:

- `tests/unit/quick-metronome-metronome-service.test.ts`
  - Fake adapter must expose `setBpm`, `createLoop`, `draw`, `triggerClick`, and loop handle methods.
  - Assert start uses `createLoop(expect.any(Function), "4n")` for default settings.
  - Assert 4/4 subdivisions map to `"4n"`, `"8n"`, `"8t"`, and `"16n"`.
  - Assert 6/8 and 12/8 quarter-subdivision scheduling maps to `"8n"` and still emits twelve eighth-note ticks per 12/8 downbeat cycle.
  - Assert tick handlers are routed through `adapter.draw` at the scheduled audio time.
  - Assert `triggerClick` receives semantic click intent and trace `audioTime` stays aligned with scheduled time.
  - Keep the monotonic trigger-time test only if `triggerClick` still needs service-side monotonic guarding; otherwise move that guard into adapter tests or delete it with clear evidence.
- `tests/unit/sheet-practice-controls.test.tsx`
  - Update the shared fake Tone adapter shape.
  - Keep existing assertions that sheet-practice metronome trace/accent behavior works.
- `tests/unit/architecture-boundaries.test.ts`
  - Remove the `src/services/metronome/browser-metronome-service.ts` `setTimeout` allowlist entry once the source no longer uses `setTimeout`.
  - Keep F4 timer allowlist entries for countdown, bar count-in, and transport countdown wiring unchanged.

Likely unchanged but required verification tests:

- `tests/unit/quick-metronome-control.test.ts`
- `tests/unit/quick-metronome-transport.test.tsx`
- `tests/e2e/quick-metronome.spec.ts`
- `tests/e2e/sheet-practice-controls.spec.ts`

## Likely Files

Expected production files in the coding PR:

- `src/infrastructure/audio/tone-metronome-adapter.ts`
- `src/services/metronome/browser-metronome-service.ts`
- `src/lib/quick-metronome/metronome-service.ts` only for type re-exports, if tests import adapter types through the existing compatibility barrel.

Expected test files in the coding PR:

- `tests/unit/quick-metronome-metronome-service.test.ts`
- `tests/unit/sheet-practice-controls.test.tsx`
- `tests/unit/architecture-boundaries.test.ts`

Expected verification-only files:

- `tests/unit/quick-metronome-control.test.ts`
- `tests/unit/quick-metronome-transport.test.tsx`
- `tests/e2e/quick-metronome.spec.ts`
- `tests/e2e/sheet-practice-controls.spec.ts`

Do not edit React components for F3 unless a test exposes an adapter type mismatch that cannot be fixed at the service boundary.

## No-Go / Out Of Scope

- No React component Tone imports.
- No domain Tone imports.
- No `src/components/** -> @/infrastructure/audio/**` import.
- No new local Web Audio scheduler, worker scheduler, lookahead loop, or runtime `setTimeout` scheduler in metronome playback.
- Do not change `schedulePreStartCountdown`, `scheduleBarCountIn`, or the fixed countdown logic in `use-metronome-transport.ts`; F4 owns those.
- Do not add `Tone.Sampler` assets, loading state, sampled-click settings, or click-sound UI.
- Do not add BPM ramp/auto-increase, mute training, warmup routines, or advanced countdown behavior.
- Do not change allowed BPM, allowed time signatures, allowed subdivisions, accent modes, countdown choices, tap-tempo averaging, session creation, storage, recording, waveform, sheet viewer, or TonalJS policy.
- Do not mark F3 ready for coding until this plan receives the external ChatGPT plan review gate.

## Acceptance Criteria

- `ToneMetronomeAdapter` exposes `setBpm`, `createLoop`, `draw`, `triggerClick`, and loop cleanup primitives.
- `BrowserMetronomeService` no longer calls `adapter.scheduleRepeat(callback, seconds)` or computes seconds for Tone scheduling.
- `BrowserMetronomeService` no longer uses `window.setTimeout` for UI tick handler alignment.
- The service still dispatches `METRONOME_TRACE_EVENT` with `tickIndex`, `audioTime`, `accented`, `bpm`, `expectedIntervalMs`, `subdivision`, and `timeSignature`.
- Current accent behavior remains unchanged for downbeat, every-beat, and off modes.
- Current denominator-aware 6/8 and 12/8 behavior remains unchanged.
- F3 removes the expired service-level runtime timer allowlist from `tests/unit/architecture-boundaries.test.ts`; F4 timer allowlists remain.
- No production Tone imports exist outside `src/infrastructure/audio/tone-metronome-adapter.ts`.
- No UI/domain code imports Tone.

## Test Plan For Coding PR

Required local commands:

```text
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/quick-metronome-metronome-service.test.ts tests/unit/quick-metronome-control.test.ts tests/unit/quick-metronome-transport.test.tsx tests/unit/sheet-practice-controls.test.tsx tests/unit/architecture-boundaries.test.ts
& .\scripts\npm-local.ps1 --% run test:e2e -- tests/e2e/quick-metronome.spec.ts tests/e2e/sheet-practice-controls.spec.ts
& .\scripts\npm-local.ps1 --% run lint -- src/infrastructure/audio/tone-metronome-adapter.ts src/services/metronome/browser-metronome-service.ts src/lib/quick-metronome/metronome-service.ts tests/unit/quick-metronome-metronome-service.test.ts tests/unit/sheet-practice-controls.test.tsx tests/unit/architecture-boundaries.test.ts
& .\scripts\npm-local.ps1 --% run typecheck
git diff --check
```

If E2E is too slow for the coding agent's first loop, it may run the unit/lint/typecheck set first, but F3 cannot be marked verified without the two targeted E2E specs.

## Plan PR Verification Evidence

Plan/status-only verification for this PR:

```text
git diff --check
```

Result: passed. The command returned exit code `0`; only Git LF-to-CRLF working-copy warning was printed for `docs/v1/implementation-slices/plans/F3-tone-runtime-metronome-alignment.md`.

```text
Get-Content docs\v1\status.json -Raw | ConvertFrom-Json | Out-Null; Write-Output 'docs/v1/status.json parsed OK'
```

Result: passed with output `docs/v1/status.json parsed OK`.

## Risks And Mitigations

- Denominator-aware mapping risk: simple notation tables can break 6/8 and 12/8. Mitigate with explicit tests for 4-denominator and 8-denominator mappings plus the existing 12/8 downbeat cycle.
- Tone Draw test-env risk: real Draw uses `requestAnimationFrame`. Mitigate by keeping `draw` adapter-fakeable and asserting the service calls it with scheduled audio time.
- Global Transport risk: Tone `getTransport()` is global. Mitigate by keeping stop/cancel before start and on stop, and by disposing loop handles.
- Loop lifecycle risk: moving from numeric event ids to loop handles can leak callbacks. Mitigate with tests asserting stop/update calls loop `stop`, `cancel`, and `dispose`.
- Product behavior drift risk: runtime alignment could accidentally move accent/session/settings rules into infrastructure. Mitigate by keeping `isAccentTick`, `getTickIntervalMs` diagnostics, and service event dispatch outside the adapter.
- Sampler temptation risk: adding samples would widen F3 into asset/loading UX. Mitigate by documenting Sampler as no-go for F3 and keeping Synth behind the adapter.

## Rollback And Fake Strategy

- Rollback is code-only: restore the previous adapter/service contract and restore the F3 `setTimeout` allowlist entry if the coding PR is reverted. No data migration or persisted schema changes are involved.
- Unit tests should use a fake `ToneMetronomeAdapter` with manual loop callback capture and immediate `draw` execution by default.
- Browser E2E should remain the runtime proof for real Tone/Draw integration.
- If Tone `Loop` or `Draw` cannot preserve required timing behavior, stop the coding PR, keep the F2 guardrail exception, update this plan/F1 with a documented `no-go-with-guardrail`, and do not add a custom scheduler under a different name.

## Handoff

Coding agent should read only:

- `docs/v1/START-HERE.md`
- this plan
- `docs/v1/implementation-slices/rules/external-library-first.md`
- `docs/v1/implementation-slices/plans/F0-audio-music-library-alignment-and-tech-debt-closeout.md`
- `src/infrastructure/audio/tone-metronome-adapter.ts`
- `src/services/metronome/browser-metronome-service.ts`
- `src/lib/quick-metronome/control.ts`
- `src/lib/quick-metronome/use-metronome-transport.ts`
- the tests listed in this plan

The coding agent should not continue into F4 countdown executor work.
