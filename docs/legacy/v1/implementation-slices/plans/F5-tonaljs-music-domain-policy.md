# F5 TonalJS / Music Domain Alignment Plan

## Planning Status

Status: `planning_in_progress`

This is a plan-only slice for Pack F Stage F5. It must not edit production code,
tests, package manifests, lockfiles, dependency files, or installed packages.

`docs/v1/status.json` evidence for this plan PR:

- Pack F remains `implementation_in_progress`.
- `F1-library-first-rescan-plan` remains `verified`.
- `F2-external-library-first-guardrails` remains `verified`.
- `F3-tone-runtime-metronome-alignment` remains `implementation_done`.
- `F4-countdown-executor-unification` remains `implementation_done`.
- `F5-tonaljs-music-domain-policy` moves from `not_started` to
  `planning_in_progress` and points to this plan file.
- `F6-recording-waveform-analysis-alignment` remains `not_started`.
- `F7-boundary-hardening-viewer-closeout` remains `not_started`.

## Required Reads

Completed for this plan:

- `docs/v1/START-HERE.md`
- `docs/v1/status.json`
- `docs/v1/implementation-slices/plans/F0-audio-music-library-alignment-and-tech-debt-closeout.md`
- `docs/v1/implementation-slices/rules/external-library-first.md`
- `package.json`
- `src/domain/practice/meter-timing.ts`
- `src/domain/practice/measure-grid/index.ts`
- `src/domain/practice/bar-count-in.ts`
- `src/domain/practice/validation.ts`
- `src/domain/practice/types.ts`
- `src/lib/quick-metronome/control.ts`
- `src/lib/quick-metronome/types.ts`
- `src/lib/quick-metronome/pre-start-countdown.ts`
- `src/services/metronome/browser-metronome-service.ts`
- `tests/unit/quick-metronome-control.test.ts`
- `tests/unit/measure-grid.test.ts`
- `tests/unit/pre-start-countdown.test.ts`
- `tests/unit/bar-count-in-domain.test.ts`
- `tests/unit/architecture-boundaries.test.ts`
- `tests/unit/sheet-viewer-measure-grid-timestamp.test.tsx`
- `tests/unit/measure-grid-calibration.test.tsx`

Focused scans used:

```text
rg --files tests\unit | rg "meter|measure-grid|pre-start-countdown|bar-count-in-domain|architecture-boundaries"
rg --files tests\unit | rg -i "metronome|meter"
rg -n timeSignature\.split src tests docs\v1\implementation-slices
rg -n "TIME_SIGNATURES|SUBDIVISIONS|PRACTICE_TIME_SIGNATURES|duration-value|@tonaljs|PACK_F_APPROVED_PRIMITIVE_EXCEPTION|musicPrimitiveTableAllowlist|getMeterTimeSignatureParts|getMeterBeatDurationMs|getMeterTicksPerMeasure|isAccentTick" src tests docs\v1\implementation-slices
```

External primitive reads used for planning:

- `https://www.npmjs.com/package/@tonaljs/time-signature`
- `https://raw.githubusercontent.com/tonaljs/tonal/main/packages/duration-value/index.ts`

Local shell attempts to fetch npm registry metadata with `npm view`,
`Invoke-RestMethod`, and `curl.exe` were blocked by the current Windows shell
environment before any package install. This plan therefore treats external
metadata as planning evidence only; the future coding PR must run a real package
spike before changing dependencies.

## Current F5 Debt Inventory

| Area | Current path | Current debt | Required F5 direction |
| --- | --- | --- | --- |
| Time signature primitive parsing | `src/domain/practice/meter-timing.ts` | `getMeterTimeSignatureParts` owns the only production `timeSignature.split("/")` parser and raw numerator/denominator math. | Move primitive parsing behind `src/domain/music/**`; no scattered split parsing. |
| Meter duration math | `src/domain/practice/meter-timing.ts` | Beat, measure, tick, and ticks-per-measure helpers mix primitive duration facts with practice-domain naming. | Keep practice-facing helpers only if they delegate to a music-domain facade. |
| Measure grid policy | `src/domain/practice/measure-grid/index.ts` | Zod time-signature enum and pickup validation depend on local numerator helper. | Keep product validation local, but derive primitive numerator through the music facade. |
| Quick metronome product policy | `src/lib/quick-metronome/control.ts`; `src/lib/quick-metronome/types.ts` | `TIME_SIGNATURES`, `SUBDIVISIONS`, BPM clamp, accent policy, countdown choices, subdivision multiplier, and parsing fallback all live together. | Preserve product policy locally; only primitive time-signature/duration facts move. |
| Countdown and count-in math | `src/lib/quick-metronome/pre-start-countdown.ts`; `src/domain/practice/bar-count-in.ts` | Advanced countdown and bar count-in use meter numerator and beat duration directly. | Preserve generated shapes, labels, offsets, and fractional sums while changing only the primitive source. |
| Practice session validation | `src/domain/practice/validation.ts`; `src/domain/practice/types.ts` | A duplicate `PRACTICE_TIME_SIGNATURES` tuple exists and is currently allowlisted until F5. | Decide whether this remains approved product policy or is derived from a shared product-policy tuple. |
| Settings and presets | `src/domain/settings/types.ts`; `src/domain/settings/validation.ts`; `src/domain/practice/sheet-metronome-presets.ts` | Settings and preset validation re-export or consume quick-metronome policy arrays. | Avoid introducing new tables; keep one product policy owner or explicit approved policy facade. |
| Tone interval denominator mapping | `src/services/metronome/browser-metronome-service.ts` | F3 added Tone notation interval mapping but still reads the practice meter helper for the denominator. | Route denominator facts through `src/domain/music/time-signature.ts` if coding changes this file. |
| Architecture guardrails | `tests/unit/architecture-boundaries.test.ts` | Music primitive table allowlist has F5-expiring entries for `src/domain/practice/validation.ts` and `src/lib/quick-metronome/control.ts`. | Replace expiry with approved `src/domain/music/**` and product-policy allowlist, or remove allowlist entries if the tables move. |

Current behavior that must not drift:

- Supported time signatures stay exactly `2/4`, `3/4`, `4/4`, `6/8`, `12/8`.
- `5/4`, additive signatures such as `3+2+3/8`, and irrational signatures such as
  `12/10` stay unsupported by product policy.
- At 120 BPM, `6/8` measure duration remains `1_500` ms and `12/8` measure duration
  remains `3_000` ms.
- At 120 BPM, `6/8` and `12/8` quarter-subdivision tick intervals remain `250` ms.
- Bar count-in uses numerator beat counts for `6/8` and `12/8` and eighth-note
  beat durations.
- Quick advanced countdown measure mode uses the meter numerator for beat count
  and denominator-aware beat duration for offsets.
- Accent policy remains product-owned: `off`, `every-beat`, and downbeat behavior
  do not move into infrastructure or TonalJS.

## External Primitive Check

### `@tonaljs/time-signature`

Evidence:

- The npm package page describes it as functions to parse time signatures.
- The current npm page showed version `4.9.0`, zero dependencies, and unpacked
  size `18.9 kB`.
- `TimeSignature.get("3/4")` returns an object with `upper`, `lower`, `type`,
  `additive`, and `empty`.
- The API intentionally accepts broader musical primitives, including additive
  signatures such as `3+2+3/8`, array inputs, and irrational signatures such as
  `12/10`.

F5 implication:

- Candidate decision is `replace` only for primitive parsing and classification.
- Product policy must still wrap the result and reject anything outside the
  current allowed simple/compound set.
- The coding PR must test every currently supported signature plus at least
  `5/4`, `3+2+3/8`, `12/10`, malformed strings, nullish values, and non-string
  inputs at product boundaries.

### `@tonaljs/duration-value`

Evidence:

- TonalJS source for `packages/duration-value/index.ts` exposes `names`,
  `shorthands`, `get`, `value`, and `fraction`.
- `get(name)` returns a duration object with `empty`, `value`, `fraction`,
  `shorthand`, `dots`, and `names`.
- The implementation handles dotted duration notation by calculating fractions.

F5 implication:

- Candidate decision is `replace` for duration-value facts only if the coding
  spike proves it can model the repo's denominator-aware duration needs without
  changing current BPM math.
- The repo currently stores subdivisions as product labels (`quarter`, `eighth`,
  `triplet`, `sixteenth`) and maps them to tick density. That mapping is product
  policy and must not be replaced by TonalJS unless every current trace and UI
  label remains exact.
- If the package is unavailable as a minimal install in the current npm
  ecosystem, F5 should not install full `tonal` by default. Use the no-go branch
  below.

### Full `tonal`

F5 must not install the full `tonal` package unless the coding PR documents
package and bundle/tree-shaking evidence that it is not materially broader than
the two minimal modules. The expected first spike is:

```text
@tonaljs/time-signature
@tonaljs/duration-value
```

## Decision Tree

1. Start with a dependency-free spike in the coding PR branch:
   - inspect current npm metadata for `@tonaljs/time-signature`,
     `@tonaljs/duration-value`, and `tonal`;
   - confirm package availability, types, ESM behavior, dependency count,
     unpacked size, and lockfile impact;
   - do not commit dependency changes until the decision below is clear.
2. If minimal TonalJS modules install cleanly and preserve semantics:
   - add only `@tonaljs/time-signature` and `@tonaljs/duration-value`;
   - add `src/domain/music/time-signature.ts`;
   - add `src/domain/music/duration.ts`;
   - add `src/domain/music/README.md` or `src/domain/music/theory-policy.md`;
   - route practice/quick-meter helpers through the new facade;
   - keep allowed signatures, subdivisions, BPM limits, accent modes, and
     countdown choices as product policy.
3. If TonalJS parses broader signatures but can be wrapped safely:
   - still use TonalJS behind the facade;
   - reject unsupported product signatures in product-policy helpers;
   - test additive, irrational, uncommon denominators, and malformed inputs.
4. If TonalJS cannot preserve current simple-meter constraints or the minimal
   duration package cannot be installed without broad package churn:
   - choose `no-go-with-guardrail`;
   - do not install full `tonal` unless bundle evidence changes the decision;
   - move the local parser into `src/domain/music/time-signature.ts`;
   - move duration facts into `src/domain/music/duration.ts`;
   - add `PACK_F_APPROVED_PRIMITIVE_EXCEPTION` only inside the approved
     `src/domain/music/**` files, with the no-go rationale documented;
   - update architecture tests so new split parsing and primitive tables cannot
     appear outside the music facade or explicit product-policy owner.

## Smallest Implementable F5 Coding PR

The smallest acceptable coding PR is one narrow policy/facade PR, not a broad
music-theory rewrite.

Required implementation shape:

1. Add a music-domain facade:
   - `src/domain/music/time-signature.ts`
   - `src/domain/music/duration.ts`
   - `src/domain/music/README.md` or `src/domain/music/theory-policy.md`
2. Add a focused test file for the facade, for example:
   - `tests/unit/music-domain-time-signature.test.ts`
   - `tests/unit/music-domain-duration.test.ts`
3. Replace direct production `timeSignature.split("/")` with facade calls.
4. Keep or consolidate product-policy arrays without widening behavior:
   - time signatures: `2/4`, `3/4`, `4/4`, `6/8`, `12/8`;
   - subdivisions: `quarter`, `eighth`, `triplet`, `sixteenth`;
   - BPM and accent/countdown policy stay outside TonalJS.
5. Update current callers only where needed:
   - `src/domain/practice/meter-timing.ts` may remain as practice-facing
     compatibility helpers if it delegates to `src/domain/music/**`;
   - `src/domain/practice/measure-grid/index.ts` should keep grid validation
     behavior unchanged;
   - `src/domain/practice/bar-count-in.ts` should keep plan output unchanged;
   - `src/lib/quick-metronome/control.ts` should keep parse fallback and accent
     behavior unchanged;
   - `src/lib/quick-metronome/pre-start-countdown.ts` should keep advanced
     countdown output unchanged;
   - `src/services/metronome/browser-metronome-service.ts` should use facade
     denominator facts if touched.
6. Tighten architecture guardrails:
   - forbid production `timeSignature.split("/")` outside approved
     `src/domain/music/**` helper code;
   - forbid new note/chord/scale/key/interval/pitch/MIDI primitive tables
     outside `src/domain/music/**` or an explicitly approved product-policy
     facade;
   - remove or update F5-expiring allowlist entries for
     `src/domain/practice/validation.ts` and `src/lib/quick-metronome/control.ts`.

Non-requirements for the smallest coding PR:

- It does not need to implement note, chord, scale, key, interval, pitch, or MIDI
  features.
- It does not need to change user-visible UI labels.
- It does not need to rewrite Tone scheduling, countdown execution, recording,
  waveform, sheet viewer, or mutation boundaries.

## Likely Files

Future coding PR likely adds or edits:

- `src/domain/music/time-signature.ts`
- `src/domain/music/duration.ts`
- `src/domain/music/README.md` or `src/domain/music/theory-policy.md`
- `src/domain/practice/meter-timing.ts`
- `src/domain/practice/measure-grid/index.ts`
- `src/domain/practice/bar-count-in.ts`
- `src/domain/practice/validation.ts`
- `src/domain/practice/types.ts`
- `src/lib/quick-metronome/control.ts`
- `src/lib/quick-metronome/types.ts`
- `src/lib/quick-metronome/pre-start-countdown.ts`
- `src/services/metronome/browser-metronome-service.ts`
- `src/domain/settings/types.ts`
- `src/domain/settings/validation.ts`
- `src/domain/practice/sheet-metronome-presets.ts`
- `tests/unit/architecture-boundaries.test.ts`
- `tests/unit/quick-metronome-control.test.ts`
- `tests/unit/measure-grid.test.ts`
- `tests/unit/pre-start-countdown.test.ts`
- `tests/unit/bar-count-in-domain.test.ts`
- new `tests/unit/music-domain-*.test.ts`

Future coding PR may edit `package.json` and the lockfile only if the replace
branch installs minimal TonalJS modules. This plan PR must not edit those files.

## No-Go And Out Of Scope

No-go for F5:

- Full `tonal` package without explicit bundle/tree-shaking evidence.
- New custom note/chord/scale/key/interval/pitch/MIDI tables.
- Accepting additional product time signatures such as `5/4`, `7/8`, additive
  signatures, or irrational signatures.
- Moving accent mode, BPM clamp, countdown options, or settings persistence into
  TonalJS or infrastructure.
- A broad refactor of quick-metronome UI, settings UI, sheet practice controls,
  or persistence.

Explicitly out of scope:

- F6 recording, waveform, decode, capture, peaks, silence, MediaRecorder, and
  wavesurfer alignment.
- F7 UI-to-infrastructure boundaries, sheet viewer split, assisted page-turn
  cleanup, mutation hardening, and final Pack F closeout scan.
- F3/F4 status advancement or verification claims.

## Acceptance Criteria

The future coding PR passes F5 only when all of these are true:

- The PR documents the External Primitive Check result for
  `@tonaljs/time-signature` and `@tonaljs/duration-value`.
- The PR either uses minimal TonalJS modules behind `src/domain/music/**` or
  records a no-go-with-guardrail with local primitive code limited to
  `src/domain/music/**`.
- No production file outside approved music-domain helper code contains direct
  `timeSignature.split("/")`.
- No new note/chord/scale/key/interval/pitch/MIDI/rhythm/duration primitive
  table appears outside the approved music domain or explicit product-policy
  facade.
- Current allowed time signatures remain exactly `2/4`, `3/4`, `4/4`, `6/8`,
  and `12/8`.
- Product policy still rejects `5/4`, additive signatures, irrational
  signatures, malformed strings, and non-string inputs at the same boundaries as
  today.
- Existing quick-metronome control behavior is unchanged for BPM clamp, parse
  fallback, subdivision parse, accent parse, countdown options, tap tempo,
  tick intervals, and accent ticks.
- Existing measure-grid behavior is unchanged for validation, pickup-beat
  limits, measure starts/ends, range calculations, and denominator-aware `6/8`
  and `12/8` durations.
- Existing bar count-in behavior is unchanged for whole-sheet plans, selected
  segment plans, stale segment plans, pickup handling, fractional 3/4 sums, and
  compound-meter beat counts.
- Existing advanced countdown behavior is unchanged for beat mode, measure mode,
  invalid input errors, and compound-meter durations.
- `tests/unit/architecture-boundaries.test.ts` no longer contains stale F5
  allowlist debt and now enforces the F5 policy.

## Future Coding PR Verification Commands

Run from repo root after implementation:

```powershell
git diff --check
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/quick-metronome-control.test.ts tests/unit/measure-grid.test.ts tests/unit/pre-start-countdown.test.ts tests/unit/bar-count-in-domain.test.ts tests/unit/architecture-boundaries.test.ts tests/unit/sheet-metronome-preset-domain.test.ts tests/unit/sheet-metronome-preset-service.test.ts tests/unit/settings-experience.test.tsx tests/unit/quick-metronome-metronome-service.test.ts
& .\scripts\npm-local.ps1 --% run lint -- src/domain/music src/domain/practice src/lib/quick-metronome src/services/metronome tests/unit
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run build
```

If the replace branch adds TonalJS packages, also record:

```powershell
git diff -- package.json package-lock.json
rg -n "from ['\"]tonal['\"]|import\\(['\"]tonal['\"]\\)" src tests
rg -n "timeSignature\\.split|split\\(['\"]\\/['\"]\\)" src tests
```

The full `tonal` package is acceptable only if the coding PR adds a separate
bundle/tree-shaking note and proves why minimal `@tonaljs/*` modules are not the
better dependency boundary.

## Plan PR Verification Evidence

Required for this plan-only PR:

```powershell
git diff --check
Get-Content docs\v1\status.json -Raw | ConvertFrom-Json | Out-Null; Write-Output 'docs/v1/status.json parsed OK'
git diff --cached --check
```

Recorded evidence for this plan PR:

- `git diff --check`: PASS.
- `Get-Content docs\v1\status.json -Raw | ConvertFrom-Json | Out-Null; Write-Output 'docs/v1/status.json parsed OK'`: PASS, output
  `docs/v1/status.json parsed OK`.
- `git diff --cached --check`: PASS after staging.

Product tests are intentionally not required for this plan/status-only PR.

## Risks And Rollback

Risks:

- TonalJS time-signature parsing accepts broader music-theory inputs than the
  current product supports; product policy must keep the whitelist.
- Duration-value primitives may not map directly to the repo's subdivision
  labels and tick-density policy; do not let dependency adoption widen behavior.
- Moving policy arrays may break settings, presets, and zod enum inference if
  done in a broad refactor.
- Architecture tests can become toothless if they simply move F5 allowlist debt
  to a new file without documenting ownership.
- Installing full `tonal` can expand dependency surface beyond F5's prevention
  goal.

Rollback:

- If TonalJS adoption causes drift, revert dependency and lockfile changes,
  keep the new `src/domain/music/**` facade, and switch to the no-go local
  parser/duration helper inside that facade.
- If architecture tests are too broad, narrow them to direct primitive-table and
  `timeSignature.split("/")` scans rather than weakening the guardrail.
- If product policy consolidation risks settings/preset behavior, leave a single
  explicit product-policy owner and defer cosmetic deduplication.

## Handoff Instructions For Coding Agent

Read only these files first:

```text
docs/v1/START-HERE.md
docs/v1/status.json
docs/v1/implementation-slices/plans/F5-tonaljs-music-domain-policy.md
docs/v1/implementation-slices/plans/F0-audio-music-library-alignment-and-tech-debt-closeout.md
docs/v1/implementation-slices/rules/external-library-first.md
src/domain/practice/meter-timing.ts
src/domain/practice/measure-grid/index.ts
src/lib/quick-metronome/control.ts
src/lib/quick-metronome/types.ts
src/lib/quick-metronome/pre-start-countdown.ts
tests/unit/architecture-boundaries.test.ts
tests/unit/quick-metronome-control.test.ts
tests/unit/measure-grid.test.ts
tests/unit/pre-start-countdown.test.ts
tests/unit/bar-count-in-domain.test.ts
package.json
```

Then:

1. Spike minimal TonalJS modules before editing behavior.
2. Choose `replace` or `no-go-with-guardrail` using the decision tree above.
3. Keep the implementation PR small and limited to music-domain facade, meter
   helper routing, product-policy ownership, targeted tests, and architecture
   guardrails.
4. Do not touch F6/F7 areas.
5. Do not advance `docs/v1/status.json` beyond the lifecycle state explicitly
   requested for the coding PR.
