# Phase 1: Canonical Practice Presentation Formatting - Research

**Researched:** 2026-07-21
**Domain:** Behavior-preserving TypeScript presentation-format consolidation
**Confidence:** HIGH for the current source/caller/test boundary; MEDIUM for external-platform generalizations

## Summary

Phase 1 should consolidate exactly two pure presentation behaviors—fixed UTC-minute timestamps and minute-scale practice durations—into the existing `src/domain/practice/format.ts` owner. The current `src/**` tree at `19b17b530736d2e51a6a9ee24cfdf6c092fb5b66` has tree object `a53cc5795216a48cbd89b79eccf5805b780c7c08`, identical to the approved selection baseline `6c0089b9cac378214ff4f4ecdbe2f3f5b42c81a4`; the intervening commits change planning and semantic-index artifacts, not production source. [VERIFIED: git objects and current HEAD]

Four timestamp bodies, two identical minute-duration bodies, and one no-op minute wrapper remain at the selected Home, dashboard-hook, and session-comparison locations. They have seven timestamp call expressions and three minute-duration call expressions. The existing practice barrel already exports `format.ts`, so the consolidation requires no new module, barrel, wrapper, facade, adapter, compatibility alias, feature flag, dependency, or owner move. [VERIFIED: current HEAD source]

**Primary recommendation:** characterize every selected output through existing public seams before production edits, then add the two admitted exports to `src/domain/practice/format.ts`, redirect only the verified callers, delete all seven superseded functions atomically, and accept only a strictly net-negative virtually normalized `src/**` result from immutable `$productionBaseSha`/`$reviewedHeadSha` blobs that passes the exact reviewed-revision gates. [VERIFIED: REQUIREMENTS.md and current HEAD source]

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|---|---|---|
| FMT-01 | Preserve exact UTC-minute timestamps, minute-scale durations, rounding, and fallbacks. | The behavior matrix and pre-change tests below lock every selected branch. [VERIFIED: `.planning/REQUIREMENTS.md`] |
| FMT-02 | Use one owner and remove all seven duplicate/no-op functions. | The source/caller/deletion map and Approved Surface enumerate the only permitted edits. [VERIFIED: `.planning/REQUIREMENTS.md`; current HEAD source] |
| EVID-01 | Keep evidence current, add no dependency, and refresh after source/index drift. | The evidence identity and freshness rule bind implementation to the current source tree and `.lumenignore`. [VERIFIED: `.planning/REQUIREMENTS.md`; git objects] |
| SLIM-01 | Finish strictly net-negative in tracked production `src/**`. | The immutable baseline and final calculation exclude tests, planning, generated files, renames, moves, and formatting churn. [VERIFIED: `.planning/REQUIREMENTS.md`] |
| QUAL-01 | Characterize first and pass focused plus repository gates. | Validation Architecture gives exact tests, mutation checks, commands, artifacts, and stop conditions. [VERIFIED: `.planning/REQUIREMENTS.md`; `package.json`] |
| HEALTH-01 | Pass exact-revision CodeScene policy. | The CodeScene gate requires no changed-source decline, no new severe finding, and the touched Home hotspot at least 7.0. [VERIFIED: `.codescene/quality-gate-policy.md`] |
| SHIP-01 | Obtain independent review, prove rollback, merge natively, and leave updated `main` clean. | Delivery obligations below make review, one-change revert, native merge, and clean-main checks terminal gates. [VERIFIED: `.planning/REQUIREMENTS.md`; `AGENTS.md`] |
</phase_requirements>

## Capability Admission

Discovery level is **Level 2** because the phase consolidates generic time/formatting behavior and explicitly requires slimming and Code Health evidence. Every admitted atom is resolved; no `LOCAL_NO_FIT`, `NEEDS_SCOPE_DECISION`, or silent unresolved capability remains. [VERIFIED: `skills/metronome-policy/SKILL.md`]

### CAP-01 — Fixed UTC-minute practice timestamp

| Field | Admission record |
|---|---|
| Intent | Render selected absolute practice instants as fixed ASCII `YYYY-MM-DD HH:mm UTC` while preserving the caller's invalid-value label. [VERIFIED: current HEAD source and FMT-01] |
| Inputs / outputs | Input is `string \| null`; output is a string. Valid values are parsed by the existing `Date` algorithm, rendered from UTC fields, zero-padded to minutes, and omit seconds/milliseconds. [VERIFIED: four current bodies] |
| Invariants and boundary behavior | Null/empty/invalid values produce `Unknown time` through the legitimate general Home/domain seams; analytics suppresses its updated suffix when `analytics.generatedAt.trim().length === 0` and produces `Unknown update time` for a non-empty invalid value; valid values preserve UTC conversion, ASCII digits/punctuation, and minute truncation. [VERIFIED: current HEAD source and tests] |
| Side effects | None: no mutation, I/O, storage, timers, locale lookup, or browser resource ownership. [VERIFIED: current HEAD source] |
| Lifecycle / current owner | Presentation formatting occurs after domain/service data is available and before React rendering. The retained owner is the existing practice formatting boundary `src/domain/practice/format.ts`; current ownership is duplicated across Home, the hook, and session comparison. [VERIFIED: current call graph] |
| Domain synonyms | UTC timestamp, absolute practice time, activity time, analytics update time, session started/updated time, fixed minute label. [VERIFIED: current symbol and UI labels] |
| Local candidates | Four bodies share the same valid-value UTC field assembly: hook `formatSessionComparisonTimestamp`, Home `formatActivityTime`, Home `formatAnalyticsTimestamp`, and session-comparison `formatTimestamp`. Analytics differs by its `Unknown update time` fallback and the caller's trimmed display gate; the selected local owner is the already-exported practice format module. [VERIFIED: current HEAD source] |
| Installed dependency candidates | The manifest has no installed date-format dependency whose API owns this exact fixed output and fallback policy. React, Next.js, Dexie, Zod, and Tonal do not replace this presentation contract. [VERIFIED: `package.json`, `package-lock.json`, approved STACK/SUMMARY research] |
| OSS / platform candidates | `Intl.DateTimeFormat` is rejected because output is locale- and implementation-sensitive; reconstructing the fixed string with `formatToParts` would retain custom glue. Existing `Date` UTC getters plus `String.padStart` already implement the exact contract inside the local owner. [CITED: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/format] |
| Decision | **USE_LOCAL**. Consolidate the already-shipping deterministic algorithm in the existing practice formatting owner. [VERIFIED: current HEAD source and approved SUMMARY research] |
| Concrete mismatch / rejection evidence | `Intl` cannot guarantee the current exact order, punctuation, digits, timezone label, or both product fallbacks; no installed package owns those Metronome-specific labels. A new wrapper would preserve rather than retire duplicate policy. [CITED: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/format] [VERIFIED: package manifest and metronome policy] |
| **Approved Surface** | Add only `formatPracticeUtcMinuteTimestamp(value: string \| null, invalidFallback: "Unknown time" \| "Unknown update time" = "Unknown time"): string` to `src/domain/practice/format.ts`; import/use it only in `src/domain/practice/session-comparison.ts`, `src/hooks/use-practice-session-dashboard.ts`, and `src/components/home/home-dashboard.tsx`; delete the four named timestamp bodies. `src/domain/practice/index.ts` remains unchanged because its existing wildcard export already exposes `format.ts`. [VERIFIED: current HEAD imports/exports] |
| Evidence | Current source tree `a53cc5795216a48cbd89b79eccf5805b780c7c08`; seven exact timestamp call expressions; Home/session-comparison tests; approved semantic rankings Home `0.85`, hook `0.81`, domain `0.68` from the ignore-aware 345-file/2,859-chunk rebuild. [VERIFIED: git objects and approved FEATURES/SUMMARY research] |

### CAP-02 — Minute-scale practice duration text

| Field | Admission record |
|---|---|
| Intent | Render selected practice durations as `0 min`, `<1 min`, `N min`, `N hr`, or `N hr M min` without altering seconds-scale or sheet-library contracts. [VERIFIED: current HEAD source and FMT-01] |
| Inputs / outputs | Input is a number interpreted as milliseconds; output is a string. [VERIFIED: current function signatures and callers] |
| Invariants and boundary behavior | Non-finite, negative, and zero values produce `0 min`; positive values below 60,000 ms produce `<1 min`; other values floor to whole minutes; exact hours omit `0 min`; hours with a remainder use `N hr M min`. [VERIFIED: two identical current bodies] |
| Side effects | None: pure arithmetic and string assembly only. [VERIFIED: current HEAD source] |
| Lifecycle / current owner | Presentation mapping occurs in the dashboard hook and Home analytics. The retained owner is `src/domain/practice/format.ts`; the hook's no-op wrapper is not an owner and must disappear. [VERIFIED: current call graph] |
| Domain synonyms | Minute-scale duration, analytics total practice, comparison duration, goal-contribution minutes, hour/minute wording. [VERIFIED: current symbols and UI labels] |
| Local candidates | Hook `formatSessionComparisonDuration` and Home `formatAnalyticsDuration` are behavior-for-behavior identical; hook `formatSessionComparisonMinutes` returns its delegate unchanged. [VERIFIED: current HEAD source] |
| Installed dependency candidates | No installed dependency supplies the exact finite-value policy, floor-to-minute behavior, English singular wording, and product fallbacks. `Intl.NumberFormat` can format numbers but does not own these thresholds or labels. [VERIFIED: package manifest and approved STACK/SUMMARY research] |
| OSS / platform candidates | `Number.isFinite`, `Math.floor`, and template strings already provide the required primitives. A duration library or sheet-format reuse would add cost or change semantics. [VERIFIED: current HEAD source and approved research] |
| Decision | **USE_LOCAL**. Move the identical already-shipping policy into the existing practice format owner. [VERIFIED: current HEAD source and approved SUMMARY research] |
| Concrete mismatch / rejection evidence | Session-comparison seconds-scale formatting rounds seconds and emits `0s`, `<1s`, and `Xm Ys`; sheet-library formatting rounds minutes and maps zero/invalid to `<1 min`; existing `formatPracticeDuration` emits `M:SS`. None is behavior-equivalent. [VERIFIED: current HEAD source] |
| **Approved Surface** | Add only `formatPracticeMinuteDuration(value: number): string` to `src/domain/practice/format.ts`; import/use it only in `src/hooks/use-practice-session-dashboard.ts` and `src/components/home/home-dashboard.tsx`; replace hook calls at current lines 532 and 605 plus Home call at current line 1023; delete `formatSessionComparisonDuration`, `formatSessionComparisonMinutes`, and `formatAnalyticsDuration`. [VERIFIED: current HEAD source] |
| Evidence | Three exact selected call expressions, two identical bodies, one no-op wrapper, existing Home boundary tests, and the approved semantic/call-site review. [VERIFIED: current HEAD source and approved FEATURES/SUMMARY research] |

**Admission closure:** The planner and executor may use only the two Approved Surface entries above. Any required new dependency, module, type export, wrapper, facade, adapter, compatibility path, feature flag, owner move, public API, or additional formatter stops the affected CAP and returns it to research. [VERIFIED: `skills/metronome-policy/SKILL.md`]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|---|---|---|---|
| Timestamp and minute-duration policy | Domain / pure presentation boundary | — | `src/domain/practice/format.ts` already owns practice presentation formatting and has no runtime dependency on UI or infrastructure. [VERIFIED: current HEAD source] |
| Session-comparison model formatting | Domain | Browser / Client | Domain comparison uses the canonical timestamp; UI only renders returned strings. [VERIFIED: current call graph] |
| Dashboard view-model projection | Browser / Client hook | Domain | The hook maps service/domain values and calls the canonical pure functions; it retains mapping but not formatting policy. [VERIFIED: current call graph] |
| Home rendering | Browser / Client | Domain | Home supplies the analytics fallback and renders canonical output; it does not own another algorithm. [VERIFIED: current call graph] |
| Persistence and services | Database / Storage and API / Backend-equivalent application service | — | No repository, schema, storage key, service contract, or orchestration path changes. [VERIFIED: Approved Surface and current call graph] |

## Exact Current Source, Caller, and Deletion Map

All line numbers below are from current HEAD `19b17b530736d2e51a6a9ee24cfdf6c092fb5b66`; the exact symbols must be re-located by name if preceding test-only edits shift lines. [VERIFIED: current HEAD source]

| Current owner / symbol | Current body | Current runtime callers | Required disposition |
|---|---:|---|---|
| `src/domain/practice/format.ts::formatPracticeDuration` | 1-11 | Existing recordings-review and practice-status `M:SS` consumers | Retain unchanged; extend this module with the two admitted exports. [VERIFIED: current HEAD source] |
| `src/domain/practice/index.ts` wildcard export of `format.ts` | 1 | Existing practice barrel consumers | Retain unchanged; no new barrel or re-export alias. [VERIFIED: current HEAD source] |
| `src/domain/practice/session-comparison.ts::formatTimestamp` | 487-505 | `createCandidateLabel` at 273; `timestampValue` at 360 | Replace both calls with CAP-01; delete body. [VERIFIED: current HEAD source] |
| `src/hooks/use-practice-session-dashboard.ts::formatSessionComparisonTimestamp` | 638-656 | `createHomeSessionComparisonCandidate` at 530 and 531 | Replace both calls with CAP-01; delete body. [VERIFIED: current HEAD source] |
| `src/components/home/home-dashboard.tsx::formatActivityTime` | 1450-1468 | continue-practice metadata at 1243; recent-activity row at 1335 | Replace both calls with CAP-01 default fallback; delete body. [VERIFIED: current HEAD source] |
| `src/components/home/home-dashboard.tsx::formatAnalyticsTimestamp` | 1491-1505 | analytics updated text at 1049 | Call CAP-01 with `Unknown update time`; delete body; retain the existing `analytics.generatedAt.trim().length > 0` display gate. [VERIFIED: current HEAD source] |
| `src/hooks/use-practice-session-dashboard.ts::formatSessionComparisonDuration` | 611-630 | comparison candidate at 532; no-op wrapper at 633 | Replace candidate call with CAP-02; delete body. [VERIFIED: current HEAD source] |
| `src/hooks/use-practice-session-dashboard.ts::formatSessionComparisonMinutes` | 632-636 | goal contribution at 605 | Replace caller directly with CAP-02; delete wrapper. [VERIFIED: current HEAD source] |
| `src/components/home/home-dashboard.tsx::formatAnalyticsDuration` | 1470-1489 | analytics total at 1023 | Replace call with CAP-02; delete body. [VERIFIED: current HEAD source] |

**Deletion proof after implementation:** `rg -n "formatSessionComparisonTimestamp|formatActivityTime|formatAnalyticsTimestamp|formatSessionComparisonDuration|formatAnalyticsDuration|formatSessionComparisonMinutes" src` must return no matches, and `rg -n "function formatTimestamp" src/domain/practice/session-comparison.ts` must return no match. The only new selected symbols may be the two Approved Surface exports and their ten caller expressions. [VERIFIED: current deletion map]

## Exact Behavior Matrix

### CAP-01 timestamp

| Input / context | Exact output | Notes |
|---|---|---|
| `null`, `""`, or an invalid date string; general caller | `Unknown time` | No raw invalid input is echoed. [VERIFIED: current timestamp bodies] |
| Whitespace-only analytics `generatedAt` | No ` · Updated ...` suffix | `PracticeAnalyticsPanel` suppresses formatting unless `analytics.generatedAt.trim().length > 0`. [VERIFIED: current Home source] |
| Invalid date string; analytics caller | `Unknown update time` | Caller passes the distinct fallback; do not standardize it. [VERIFIED: `formatAnalyticsTimestamp`] |
| `2026-01-02T03:04:59.999+02:00` | `2026-01-02 01:04 UTC` | UTC conversion, zero padding, seconds and milliseconds omitted. [VERIFIED: current UTC getter algorithm] |
| `2026-01-02T03:04:59.999Z` | `2026-01-02 03:04 UTC` | Fixed ASCII form independent of local timezone. [VERIFIED: current UTC getter algorithm] |
| Valid instant near a UTC date boundary | UTC calendar date and time | The implementation uses `getUTCFullYear/getUTCMonth/getUTCDate/getUTCHours/getUTCMinutes`, not local getters. [VERIFIED: current timestamp bodies] |

### CAP-02 minute-scale duration

| Input milliseconds | Exact output | Rule |
|---:|---|---|
| `NaN`, `Infinity`, `-Infinity` | `0 min` | Non-finite guard. [VERIFIED: current duration bodies] |
| Any negative finite value | `0 min` | Non-positive guard. [VERIFIED: current duration bodies] |
| `0` | `0 min` | Zero guard. [VERIFIED: current duration bodies] |
| `1` through `59_999` | `<1 min` | Positive sub-minute range. [VERIFIED: current duration bodies] |
| `60_000` | `1 min` | Whole minute. [VERIFIED: current duration bodies] |
| `119_999` | `1 min` | Floor, never round, to whole minutes. [VERIFIED: current duration bodies] |
| `3_599_999` | `59 min` | Last sub-hour value floors to 59 minutes. [VERIFIED: current duration bodies] |
| `3_600_000` | `1 hr` | Exact hours omit a zero-minute suffix. [VERIFIED: current duration bodies] |
| `3_660_000` | `1 hr 1 min` | Non-zero remainder uses hour/minute wording. [VERIFIED: current duration bodies] |
| Larger finite values | `N hr` or `N hr M min` | No cap or day conversion is introduced. [VERIFIED: current duration bodies] |

### Explicitly excluded formatting contracts

- `src/domain/practice/session-comparison.ts::formatDuration` at current line 507 is seconds-scale (`0s`, `<1s`, rounded seconds, `Xm Ys`) and remains byte-for-byte behaviorally unchanged. [VERIFIED: current HEAD source]
- `src/components/sheet-library/sheet-library-experience.tsx::formatPracticeDuration` at current line 103 rounds to minutes and maps zero/invalid to `<1 min`; it remains separate and unchanged. [VERIFIED: current HEAD source]
- `src/domain/practice/format.ts::formatPracticeDuration` renders rounded `M:SS`; it remains separate and unchanged. [VERIFIED: current HEAD source]

## Standard Stack

| Technology | Locked version / surface | Phase use |
|---|---|---|
| TypeScript | 6.0.3 | Preserve explicit nullable timestamp and numeric duration contracts. [VERIFIED: `package-lock.json`] |
| Vitest | 4.1.9 | Pre-change characterization and focused regression tests. [VERIFIED: `package-lock.json`] |
| Prettier | 3.9.5 | Virtually normalize immutable Git blobs through stdin without writing worktree files. [VERIFIED: locked installed CLI] |
| ECMAScript platform | `Date`, `Number.isFinite`, `Math.floor`, `String.padStart` | Continue the exact existing primitives inside one local owner. [VERIFIED: current HEAD source] |

**Installation:** none. `package.json` and `package-lock.json` must not change. [VERIFIED: FMT/EVID requirements and Approved Surface]

## Package Legitimacy Audit

Not applicable: this phase installs, promotes, or imports no external package. A package manifest or lockfile change is a scope violation and a stop condition. [VERIFIED: EVID-01 and Approved Surface]

## Architecture Patterns

### System Architecture Diagram

```text
Practice session/service data
          |
          v
session-comparison domain ------> canonical practice format.ts <------ dashboard hook
          |                                   ^                              |
          |                                   |                              v
          +---------------------------- Home rendering <-------------- comparison view model

Invalid timestamp? --yes--> caller-selected fixed fallback
         |
         no
         v
UTC fields + zero padding --> YYYY-MM-DD HH:mm UTC

Invalid/non-positive duration? --> 0 min
positive < 60,000 ms? ---------> <1 min
otherwise floor minutes -------> N min | N hr | N hr M min
```

The diagram contains no external service or storage boundary because the selected functions run after reads and before rendering. [VERIFIED: current call graph]

### Recommended Project Structure

```text
src/domain/practice/format.ts                 # retained owner; two admitted exports added
src/domain/practice/session-comparison.ts     # caller only; local timestamp body removed
src/hooks/use-practice-session-dashboard.ts   # caller only; three local bodies removed
src/components/home/home-dashboard.tsx        # caller only; three local bodies removed
tests/unit/home-dashboard.test.tsx            # public Home and hook characterization
tests/unit/session-comparison.test.ts          # public domain characterization
```

No other production or test path is required by the admitted scope. [VERIFIED: current source/test seams]

### Pattern 1: Existing-owner consolidation

Use precise exports from the existing `format.ts` owner, direct same-domain import in `session-comparison.ts`, and the existing `@/domain/practice` barrel imports in Home and the hook. Do not route the domain module through its own barrel. [VERIFIED: current import graph]

```ts
// Approved call shape; implementation remains the existing deterministic algorithm.
formatPracticeUtcMinuteTimestamp(value);
formatPracticeUtcMinuteTimestamp(analytics.generatedAt, "Unknown update time");
formatPracticeMinuteDuration(durationMs);
```

## Code Examples

Verified usage must remain direct and limited to the admitted callers:

```ts
// General timestamp callers
formatPracticeUtcMinuteTimestamp(candidate.updatedAt);

// The one distinct analytics fallback
formatPracticeUtcMinuteTimestamp(analytics.generatedAt, "Unknown update time");

// Both comparison/goal and analytics minute-scale callers
formatPracticeMinuteDuration(candidate.durationMs);
```

The same-domain `session-comparison.ts` import should come directly from `@/domain/practice/format`; Home and the hook may add the two symbols to their existing `@/domain/practice` imports. No caller-local alias, wrapper, or compatibility export is admitted. [VERIFIED: current import graph and Approved Surface]

### Anti-Patterns to Avoid

- **New generic formatter module:** it creates a new owner instead of using the admitted practice boundary. [VERIFIED: Approved Surface]
- **Compatibility alias or re-export:** it leaves two names/paths and weakens deletion proof. [VERIFIED: metronome policy]
- **Partial caller migration:** it leaves parallel runtime ownership. [VERIFIED: FMT-02]
- **Locale-driven formatter:** it can change exact text. [CITED: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/format]
- **Changing excluded formatters:** seconds-scale, `M:SS`, and sheet-library minute behavior are not equivalent. [VERIFIED: current HEAD source]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| Cross-layer formatting access | Wrapper, facade, adapter, or `shared/format.ts` | Existing practice barrel and direct same-domain import | The existing owner is already reachable and a new layer produces no behavior or LOC benefit. [VERIFIED: current imports] |
| Rollback | Feature flag or old/new runtime switch | Version-control revert of the bounded change | A runtime fallback creates two authorities; no data migration is involved. [VERIFIED: Approved Surface] |
| Duration/date dependency | New date/duration package | Existing deterministic local algorithm in `format.ts` | Exact fallbacks and wording are product policy, not library defaults. [VERIFIED: approved STACK/SUMMARY research] |
| Mutation testing framework | New package | Deliberate temporary source mutations plus focused Vitest runs | Two small pure behavior families need no dependency to prove test sensitivity. [VERIFIED: package scope and test infrastructure] |

## Pre-Change Characterization Strategy

All characterization changes occur before any `src/**` edit. Before adding tests, capture immutable `PRODUCTION_BASE_SHA` with `git rev-parse --verify HEAD^{commit}`, capture `PRODUCTION_BASE_SRC_TREE` with `git rev-parse "${PRODUCTION_BASE_SHA}:src"`, and record the four Approved Surface source blob IDs from that commit. The tests must first pass against the seven current implementations, then demonstrate failure under deliberate semantic mutations, and finally restore the exact committed source tree and production blob hashes before consolidation begins. [VERIFIED: QUAL-01]

### Exact tests to add before production edits

1. Extend `tests/unit/home-dashboard.test.tsx` with `characterizes selected Home timestamp and minute-duration formatting`. Through injected `HomeDashboardData`, assert the legitimate nullable activity timestamp seam produces `Unknown time` for null/empty input, valid activity/analytics instants convert to UTC, whitespace-only analytics `generatedAt` suppresses the entire updated suffix, a non-empty invalid analytics value renders `Unknown update time`, and the Home duration body preserves `NaN`, both infinities, negative, zero, `1`, `59_999`, `60_000`, `119_999`, `3_599_999`, `3_600_000`, and `3_660_000`. [VERIFIED: existing Home public test seam]
2. Extend `tests/unit/home-dashboard.test.tsx` with `characterizes dashboard-hook comparison timestamps, durations, and goal wording`. Render `HomeDashboard` without injected data, return exactly three candidates from mocked `browserPracticeSessionService.getSessionComparison`, and select all three in the public panel. Use typed string timestamps only: include a non-empty invalid string that must become `Unknown time` and an offset string that must convert to UTC minute text. Give the candidates durations `30_000`, `119_999`, and `3_660_000`, then assert the panel and goal-contribution rows show `<1 min`, `1 min`, and `1 hr 1 min` respectively. Do not cast a hook timestamp to null: `SessionComparisonCandidate.startedAt` and `updatedAt` are strings. [VERIFIED: current types and existing hook/service mock/panel seam]
3. Extend `tests/unit/session-comparison.test.ts` with `characterizes UTC-minute session-comparison timestamps without changing seconds-scale duration`. Through public `getSessionComparison`, assert an offset instant becomes fixed UTC-minute text, an empty or invalid typed string reaches the existing `validTimestamp` path and produces `Unknown time` in both candidate labels and the `updated` metric, and seconds-scale values remain `0s`, `<1s`, and `1m 5s` as applicable. Null/empty coverage therefore comes from legitimate Home/domain seams, not an unsafe hook fixture. [VERIFIED: existing public domain test seam and types]

### Focused command

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/home-dashboard.test.tsx tests/unit/session-comparison.test.ts
```

Resolve the test-only checkpoint to immutable `CHARACTERIZATION_SHA` with `git rev-parse --verify HEAD^{commit}`. Require `git rev-parse "${CHARACTERIZATION_SHA}:src"` to equal `PRODUCTION_BASE_SRC_TREE`, and require `git status --porcelain=v1 --untracked-files=all -- src` to return no rows. A tree mismatch or any unstaged, staged, or untracked `src/**` path is `BLOCK`; a mutable working-tree diff alone is not characterization proof. [VERIFIED: QUAL-01 and SLIM-01]

### Required mutation-sensitivity evidence

- Temporarily change `Math.floor(value / 60_000)` to `Math.round(value / 60_000)` specifically in `use-practice-session-dashboard.ts::formatSessionComparisonDuration`; the public panel/hook assertion `119_999 -> 1 min` must fail. Apply the equivalent mutation separately to Home `formatAnalyticsDuration` and require its `119_999` assertion to fail as well. [VERIFIED: current duration branches]
- Temporarily change a general timestamp fallback from `Unknown time` to `Unknown update time`; the public Home/hook/domain characterization that reaches that owner must fail. [VERIFIED: current fallback branches]
- Temporarily change the no-op wrapper's `<1 min` return to `0 min`; the goal-contribution assertion must fail. [VERIFIED: current wrapper call path]

Each mutation is applied one at a time, its expected failing assertion is recorded, and the exact original line is restored immediately. After **each** restoration, resolve `MUTATION_RESTORED_SHA` with `git rev-parse --verify HEAD^{commit}`, require `git rev-parse "${MUTATION_RESTORED_SHA}:src"` to equal `PRODUCTION_BASE_SRC_TREE`, require `git status --porcelain=v1 --untracked-files=all -- src` to return no rows, and recheck all four recorded source blob IDs against `PRODUCTION_BASE_SHA`. A mutation that does not fail, a committed-tree mismatch, any unstaged/staged/untracked source path, or any blob mismatch blocks implementation until the characterization/restoration is corrected. `git diff` alone never proves restoration. [VERIFIED: QUAL-01 and metronome fail-closed policy]

## Immutable Virtual-Normalized Production LOC Baseline

The checked-in admitted files do not currently pass Prettier 3.9.5, so an in-worktree `prettier --check` or `--write` requirement would either fail before the refactor or create unrelated formatting churn. LOC evidence must instead compare immutable Git blobs after virtual Prettier normalization through stdin; normalization must never write any source file. [VERIFIED: locked Prettier 3.9.5 and factual audit]

### Clean reviewed-HEAD and exact-source prerequisites

Record `PRODUCTION_BASE_SHA` before characterization. At review entry, resolve `HEAD^{commit}` once to an immutable `$reviewedHeadSha`; final evidence is always `$productionBaseSha..$reviewedHeadSha`, never a dynamic `HEAD` after that resolution or a working-tree diff. The baseline must be an ancestor of the reviewed commit. At final review, worktree/index/untracked status must be clean for both the four Approved Surface source paths and formatter inputs `prettier.config.mjs`, `package.json`, and `package-lock.json`. The changed `src/**` set in the committed range must still be exactly the four approved paths with status `M`; any added/deleted/renamed/moved production file or any fifth source path is `BLOCK`. [VERIFIED: SLIM-01 and Approved Surface]

### Reproducible virtual normalization and calculation

Run the following from the repository root after replacing the baseline placeholder with the recorded immutable commit. It resolves both commit IDs, proves ancestry and range configuration immutability, then proves the checked-out formatter inputs and approved sources have no worktree, index, or untracked drift before invoking Prettier. Normalization is invalid if checked-out `prettier.config.mjs`, `package.json`, or `package-lock.json` differs from `$reviewedHeadSha`, even when the base-to-reviewed range itself is clean. The recipe reads only `<sha>:<path>` blobs, sends each blob through locked Prettier 3.9.5 using repository-local Node and `--stdin-filepath`, and reuses exactly two individual UTF-8-without-BOM temp files across all four paths. Every native command is an individual gate: any unexpected nonzero exit is `BLOCK`; exit `1` is accepted only from `git diff --no-index` when normalized files differ. [VERIFIED: locked local tool paths and validation design]

```powershell
$ErrorActionPreference = "Stop"
if (Test-Path Variable:PSNativeCommandUseErrorActionPreference) { $PSNativeCommandUseErrorActionPreference = $false }
$productionBaseSha = "<recorded-PRODUCTION_BASE_SHA>"
$approvedPaths = @("src/domain/practice/format.ts", "src/domain/practice/session-comparison.ts", "src/hooks/use-practice-session-dashboard.ts", "src/components/home/home-dashboard.tsx")
$formatterInputs = @("prettier.config.mjs", "package.json", "package-lock.json")
$cleanPaths = $approvedPaths + $formatterInputs
$nodeExe = (Resolve-Path -LiteralPath ".\.tools\node-v24.17.0-win-x64\node.exe").Path
$prettierCli = (Resolve-Path -LiteralPath ".\node_modules\prettier\bin\prettier.cjs").Path
$baseRef = @(& git rev-parse --verify ($productionBaseSha + "^{commit}") 2>&1)
if ($LASTEXITCODE -ne 0) { throw "Invalid PRODUCTION_BASE_SHA: $($baseRef -join "`n")" }
$productionBaseSha = ($baseRef -join "").Trim()
$headRef = @(& git rev-parse --verify "HEAD^{commit}" 2>&1)
if ($LASTEXITCODE -ne 0) { throw "Cannot resolve reviewed HEAD: $($headRef -join "`n")" }
$reviewedHeadSha = ($headRef -join "").Trim()
& git merge-base --is-ancestor $productionBaseSha $reviewedHeadSha 2>&1
if ($LASTEXITCODE -ne 0) { throw "PRODUCTION_BASE_SHA is not an ancestor of reviewedHeadSha." }
$range = "$productionBaseSha..$reviewedHeadSha"
$configDelta = @(& git diff --name-only $range -- @formatterInputs 2>&1)
if ($LASTEXITCODE -ne 0) { throw "Configuration immutability check failed: $($configDelta -join "`n")" }
if ($configDelta.Count -ne 0) { throw "Prettier or package configuration changed in review range: $($configDelta -join ', ')" }
$version = @(& $nodeExe $prettierCli --version 2>&1)
if ($LASTEXITCODE -ne 0) { throw "Prettier version probe failed: $($version -join "`n")" }
if ((($version -join "").Trim()) -ne "3.9.5") { throw "Expected locked Prettier 3.9.5, got $($version -join '')" }
$status = @(& git status --porcelain=v1 --untracked-files=all -- @cleanPaths 2>&1)
if ($LASTEXITCODE -ne 0) { throw "Scoped status failed: $($status -join "`n")" }
if ($status.Count -ne 0) { throw "Approved source or formatter-input paths are not clean: $($status -join "`n")" }
& git diff --quiet $reviewedHeadSha -- @cleanPaths
if ($LASTEXITCODE -ne 0) { throw "Scoped worktree differs from reviewedHeadSha." }
& git diff --cached --quiet $reviewedHeadSha -- @cleanPaths
if ($LASTEXITCODE -ne 0) { throw "Scoped index differs from reviewedHeadSha." }
$changedRows = @(& git diff --name-status --no-renames $range -- src 2>&1)
if ($LASTEXITCODE -ne 0) { throw "Changed-source inventory failed: $($changedRows -join "`n")" }
$actualPaths = @()
foreach ($row in $changedRows) {
  if ($row -notmatch "^M`t(.+)$") { throw "Added/deleted/renamed/moved or non-M source status is forbidden: $row" }
  $actualPaths += $Matches[1].Replace("\", "/")
}
$allowlistDelta = @(Compare-Object ($approvedPaths | Sort-Object) ($actualPaths | Sort-Object))
if ($allowlistDelta.Count -ne 0) { throw "Changed src set is not the exact four-file Approved Surface: $($allowlistDelta | Out-String)" }
$utf8NoBom = [Text.UTF8Encoding]::new($false)
$addedTotal = 0
$deletedTotal = 0
try {
  $baseTemp = New-TemporaryFile
  $reviewedTemp = New-TemporaryFile
  foreach ($path in $approvedPaths) {
    $blobPairs = @(@($productionBaseSha, $baseTemp.FullName), @($reviewedHeadSha, $reviewedTemp.FullName))
    foreach ($pair in $blobPairs) {
      $spec = "$($pair[0]):$path"
      $sourceLines = @(& git show --no-ext-diff --no-textconv $spec 2>&1)
      if ($LASTEXITCODE -ne 0) { throw "git show failed for $spec`: $($sourceLines -join "`n")" }
      $sourceText = ($sourceLines -join "`n") + "`n"
      $normalizedLines = @($sourceText | & $nodeExe $prettierCli --stdin-filepath $path 2>&1)
      if ($LASTEXITCODE -ne 0) { throw "Prettier normalization failed for $spec`: $($normalizedLines -join "`n")" }
      $normalizedText = ($normalizedLines -join "`n") + "`n"
      [IO.File]::WriteAllText($pair[1], $normalizedText, $utf8NoBom)
    }
    $numstat = @(& git -c core.autocrlf=false diff --no-index --numstat -- $baseTemp.FullName $reviewedTemp.FullName 2>&1)
    $numstatExit = $LASTEXITCODE
    if ($numstatExit -notin 0, 1) { throw "Normalized numstat failed for $path`: $($numstat -join "`n")" }
    $added = 0
    $deleted = 0
    if ($numstat.Count -gt 0) {
      $fields = $numstat[0] -split "`t"
      if ($fields.Count -lt 2 -or $fields[0] -notmatch "^\d+$" -or $fields[1] -notmatch "^\d+$") { throw "Unparseable normalized numstat for $path`: $($numstat -join "`n")" }
      $added = [int]$fields[0]
      $deleted = [int]$fields[1]
    }
    $addedTotal += $added
    $deletedTotal += $deleted
    Write-Output ("NORMALIZED_NUMSTAT path={0} added={1} deleted={2} net={3}" -f $path, $added, $deleted, ($added - $deleted))
    $patch = @(& git -c core.autocrlf=false diff --no-index --unified=0 -- $baseTemp.FullName $reviewedTemp.FullName 2>&1)
    $patchExit = $LASTEXITCODE
    if ($patchExit -notin 0, 1) { throw "Normalized diff failed for $path`: $($patch -join "`n")" }
    @("NORMALIZED_HUNKS_BEGIN path=$path", ($patch -join "`n"), "NORMALIZED_HUNKS_END path=$path") | Write-Output
  }
  $net = $addedTotal - $deletedTotal
  @("REVIEW_RANGE=$range", "NORMALIZED_ADDED=$addedTotal", "NORMALIZED_DELETED=$deletedTotal", "NORMALIZED_NET=$net") | Write-Output
  if ($net -ge 0) { throw "SLIM-01 failed: normalized production LOC is not strictly net-negative." }
}
finally {
  if ($null -ne $baseTemp) { Remove-Item -LiteralPath $baseTemp.FullName -Force }
  if ($null -ne $reviewedTemp) { Remove-Item -LiteralPath $reviewedTemp.FullName -Force }
}
```

The evidence record must contain the resolved baseline SHA, resolved reviewed SHA, successful ancestry/range-configuration/checked-out-cleanliness gates, exact four-file name/status set, locked Prettier version, normalized added/deleted totals, net `added - deleted`, and every normalized hunk. The recipe never formats or writes a worktree source file. [VERIFIED: validation procedure]

### Separate semantic-deletion audit

Normalized net-negative LOC is necessary but not sufficient. Review every normalized addition/deletion hunk and create a fail-closed mapping with columns `path`, `hunk header`, `CAP`, `allowed addition/deletion`, `retired symbol/caller`, and `evidence`. Every hunk must map only to one of: the two canonical function bodies, their direct imports/calls, or the seven named retired bodies/caller rewires. [VERIFIED: Approved Surface and SLIM-01]

No credit is permitted for comment-only deletion, relocated logic in any existing or new path, formatting-only hunks, tests/planning/generated files, new production files, renames, moves, minification, or unrelated cleanup. Search all `src/**` for retired symbols and distinctive algorithms/fallback strings, inspect `$productionBaseSha..$reviewedHeadSha` with `--no-renames`, and block on any unmapped hunk or surviving/relocated duplicate. Raw worktree or commit `numstat` alone never proves semantic deletion. [VERIFIED: SLIM-01 and metronome policy]

## Dependency and OSS Conclusion

The selected timestamp bodies share the same valid-value algorithm while analytics differs in fallback/display gating; the two minute-duration bodies are identical and the wrapper is a no-op. That local evidence plus the existing correct owner means no dependency is needed. The approved manifest evidence found no exact installed replacement, and authoritative platform evidence rejects `Intl.DateTimeFormat` for a fixed cross-implementation ASCII contract. Rebuilding the same punctuation/fallback policy around `formatToParts`, a date library, or `Intl.NumberFormat` would add glue rather than retire it. [VERIFIED: current source and approved STACK/SUMMARY research] [CITED: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/format]

This conclusion does not reopen candidate selection: Dexie, `dequal`, React hydration, string normalization, ID factories, storage, music, and media/browser alternatives remain outside Phase 1. `package.json`, `package-lock.json`, client dependency graphs, and install-script policy must remain unchanged. [VERIFIED: REQUIREMENTS.md Out of Scope]

## State of the Art

| Old/current approach | Approved current approach | Impact |
|---|---|---|
| Four fixed-UTC timestamp bodies across domain, hook, and Home | One deterministic export in the existing practice formatting owner | Preserves exact text while deleting duplicate ownership. [VERIFIED: current source and Approved Surface] |
| Two identical minute-duration bodies plus a no-op wrapper | One minute-scale export in the same existing owner | Preserves floor/threshold/hour wording and removes three bodies. [VERIFIED: current source and Approved Surface] |
| Runtime fallback kept for refactor safety | Version-control rollback before merge | Avoids parallel production paths and requires no data repair. [VERIFIED: SHIP-01 and Runtime State Inventory] |

**Deprecated/outdated for this phase:** locale-sensitive `Intl` replacement, helper facades, compatibility aliases, parallel old/new paths, and dependency-based formatting are rejected by the locked exact-output and slimming contract. [VERIFIED: REQUIREMENTS.md and Capability Admission]

## Runtime State Inventory

| Category | Items Found | Action Required |
|---|---|---|
| Stored data | None: selected formatters consume already-read values and write no database, localStorage, schema, key, ID, or serialized shape. [VERIFIED: current call graph] | No data migration. |
| Live service config | None: no remote/local service configuration contains or owns these presentation algorithms. [VERIFIED: current call graph and Approved Surface] | None. |
| OS-registered state | None: no task, service, process registration, protocol handler, or OS resource is involved. [VERIFIED: Approved Surface] | None. |
| Secrets/env vars | None: the selected functions read no environment or secret. [VERIFIED: current source] | None. |
| Build artifacts | Next/Vitest artifacts may contain previously bundled code, but they are derived rather than authoritative runtime state. [VERIFIED: project scripts] | Run the repository production build and tests on the reviewed revision; no user-data repair or package reinstall. |

## Common Pitfalls

### Pitfall 1: Fallback collapse

**What goes wrong:** analytics begins showing `Unknown time` instead of `Unknown update time`. **Avoidance:** retain the explicit fallback argument and characterize both labels. **Warning sign:** a canonical helper has one hard-coded fallback or Home no longer passes the analytics label. [VERIFIED: current behavior]

### Pitfall 2: Rounding drift

**What goes wrong:** `119_999` becomes `2 min`, or exact hours gain `0 min`. **Avoidance:** retain `Math.floor`, the sub-minute branch, and the zero-remainder branch. **Warning sign:** use of `Math.round`, a duration library default, or generalized pluralization. [VERIFIED: current behavior]

### Pitfall 3: A distinct formatter is pulled into scope

**What goes wrong:** seconds-scale, `M:SS`, or sheet-library behavior changes under a similar name. **Avoidance:** keep the three explicit exclusions untouched and include their existing tests in regression review. [VERIFIED: current source]

### Pitfall 4: Slimming is only movement

**What goes wrong:** duplicate logic moves to a new/existing path or survives behind aliases while raw `--stat` appears smaller. **Avoidance:** enforce the exact four-file `M` allowlist, virtual-normalized `$productionBaseSha`/`$reviewedHeadSha` hunks, separate semantic-hunk mapping, deletion searches, and zero new production files. [VERIFIED: SLIM-01]

### Pitfall 5: Evidence is stale

**What goes wrong:** implementation begins after source or semantic-index configuration drift. **Avoidance:** bind research to HEAD/source tree/index-config hashes and refresh before any production edit. [VERIFIED: EVID-01]

### Pitfall 6: Baseline CodeScene is treated as final

**What goes wrong:** a green test suite hides a changed-source health decline or Home remains below policy threshold. **Avoidance:** analyze the exact reviewed revision, not a prior commit, and require every conjunctive policy condition. [VERIFIED: HEALTH-01 and CodeScene policy]

## Evidence Freshness Rule

The approved selection evidence was built with `.lumenignore` excluding `.planning/`, `.semgrep/`, and `docs/legacy/`; its current blob is `d94e5e3bd0ab381f90910daf0cb2523bda05de8d`. Before the first production edit, compare the implementation checkout to the research identity. If the exact source HEAD/source tree or `.lumenignore`/semantic-index configuration changed, refresh semantic search on the new source, re-run the literal symbol/caller/test audit, and update the evidence identity before proceeding. [VERIFIED: `.lumenignore`, git object, EVID-01]

Long-lived MCP counts retained across an ignore change are not fresh evidence. Accept only an explicit ignore-aware rebuild/query or a freshly loaded host whose index reflects the current configuration. Provider failure, stale status, or no result is `BLOCK`, not negative evidence. [VERIFIED: approved FEATURES/PITFALLS research and metronome policy]

## Validation Architecture

### Test layers

| Layer | Scope | Command / evidence | Failure mode and stop condition |
|---|---|---|---|
| Characterization | Existing public Home, hook/service, and domain seams | Focused Vitest command below; green before any `src/**` edit | Missing branch, flaky result, or a deliberate mutation that stays green is `BLOCK`. [VERIFIED: QUAL-01] |
| Focused regression | Same two files on the implemented revision | `& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/home-dashboard.test.tsx tests/unit/session-comparison.test.ts` | Any changed string, rounding, or fallback is `BLOCK`. [VERIFIED: package scripts] |
| Architecture | Existing dependency boundaries and excluded paths | `& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/architecture-boundaries.test.ts` | New boundary exception, UI-to-infrastructure edge, or local-worker regression is `BLOCK`. [VERIFIED: existing architecture suite] |
| Static/debt | Gate self-test, changed Semgrep, changed XO, ESLint, TypeScript | Exact commands below | Any failure, suppression, or skipped check is `BLOCK`. [VERIFIED: package scripts and AGENTS.md] |
| Full behavior/build | Entire unit suite and production build | Exact commands below | Any failure or skipped test is `BLOCK`. [VERIFIED: AGENTS.md] |
| LOC/deletion | Immutable baseline and reviewed-commit blobs for the exact four-file allowlist | Clean four-source-plus-three-formatter-input checkout, Prettier 3.9.5 virtual normalization, normalized A/D/net plus hunks, and separate semantic-hunk mapping | Non-negative normalized net, source/formatter-input drift, unmapped hunk, new production path, rename/move, relocation, or surviving duplicate is `BLOCK`. Raw `numstat` alone is insufficient. [VERIFIED: SLIM-01] |
| CodeScene | Fresh baseline and final outputs for every changed source file plus full branch vs baseline | Raw MCP score/review outputs bound to exact revisions/blobs/paths; pre-commit safeguard bound first to parent/staged-tree/diff/blob identity and only then to the verified resulting commit; change-set results bound to exact refs | Decline, severe finding, Home below 7.0, identity mismatch, provider error, stale/session-only result, unattributable output, or unavailable evidence is `BLOCK`. [VERIFIED: HEALTH-01 and CodeScene policy] |
| Independent review/delivery | Real PR diff and native artifacts | `@codex` read-only review using `skills/reviewing-metronome-prs/SKILL.md` | Missing CAP/PLAN/diff/test traceability or implementation outside Approved Surface is `BLOCK`. [VERIFIED: AGENTS.md and review skill] |

### Exact repository commands for the reviewed revision

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/home-dashboard.test.tsx tests/unit/session-comparison.test.ts
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/architecture-boundaries.test.ts
& .\scripts\npm-local.ps1 --% run validate:debt-gates
& .\scripts\npm-local.ps1 --% run lint:debt:changed
& .\scripts\npm-local.ps1 --% run lint:xo:changed
& .\scripts\npm-local.ps1 --% run lint
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run test:unit
& .\scripts\npm-local.ps1 --% run build
```

The local pre-commit hook runs the same debt self-test, changed Semgrep/XO, lint, typecheck, unit, and build sequence and must not be bypassed with `--no-verify`. [VERIFIED: AGENTS.md and hook contract]

### Final CodeScene gate

1. Treat prior session-derived numbers (`6.46`, `8.11`, `8.54`) and project lead `82174` only as discovery leads. They are not repository-verifiable current evidence and cannot satisfy HEALTH-01. [VERIFIED: factual audit]
2. Before production edits, from a clean source checkout matching the recorded baseline blobs, freshly invoke MCP `code_health_score` and `code_health_review` for all four admitted production files. Retain each complete raw output in an external evidence record bound to the exact baseline SHA, analyzed blob ID, repository path, invocation time, and tool name. [VERIFIED: CodeScene workflow and HEALTH-01]
3. Before each implementation commit, require a non-empty intended staged diff; require `git diff --quiet -- src` and `git ls-files --others --exclude-standard -- src` to show no unstaged or untracked source; and require every staged `src/**` name-status row to be status `M` within the four-path Approved Surface. Capture `PARENT_HEAD_SHA` from `git rev-parse --verify HEAD^{commit}`, `STAGED_TREE` from `git write-tree`, the complete staged name-status and staged diff, and the staged blob IDs for all four approved source paths from `STAGED_TREE`. Then freshly run MCP `pre_commit_code_health_safeguard` on `C:\Users\wsuto\metronome` and bind its complete raw output only to those pre-commit identities plus repository root, invocation time, and tool name. After committing, require `git rev-parse --verify HEAD^` to equal `PARENT_HEAD_SHA` and `git rev-parse --verify HEAD^{tree}` to equal `STAGED_TREE`; only after both equalities hold may the safeguard result be bound to the resulting commit. Any staged identity, parent, or tree mismatch is `BLOCK`. Before final review, require clean scoped paths and freshly run `analyze_change_set` against `$productionBaseSha`. Its evidence must retain the guaranteed `quality_gates` and `results` fields together with the exact baseline SHA and `$reviewedHeadSha`; missing either field is `BLOCK`. [VERIFIED: CodeScene MCP workflow guidance]
4. At the exact clean `$reviewedHeadSha`, freshly run `code_health_score` and `code_health_review` for every changed source file and bind each complete raw output to that exact commit SHA, analyzed blob ID, repository path, invocation time, and tool name. Compare only these fresh baseline/final pairs. Acceptance requires no file decline, no new severe finding, and `src/components/home/home-dashboard.tsx >= 7.0` because it is a named touched hotspot. No new CodeScene directive is permitted. [VERIFIED: `.codescene/quality-gate-policy.md`]
5. Project/config identifiers and analysis/result IDs are optional metadata: retain them when the provider actually returns them, but never require or invent them. Any provider error or output that cannot be attributed through the external revision/blob/path/time/tool binding is `BLOCK`. [VERIFIED: CodeScene MCP output contract and fail-closed policy]
6. When the repository CLI environment is provisioned, also run the checked-in delta gate with exact immutable refs and retain its complete raw JSON and any view URL actually returned:

```powershell
$env:BASE_REF = $productionBaseSha
$env:HEAD_REF = $reviewedHeadSha
& .\scripts\npm-local.ps1 --% run lint:codescene:changed
```

The current interactive PowerShell environment has no `cs` command and no shell CodeScene token alias. MCP tools are exposed, but their earlier project selection is session-derived only. Missing CLI provisioning is not permission to skip CodeScene: fresh attributable MCP evidence must satisfy the contracts above, or the checked-in CLI prerequisites must be provisioned; if neither produces exact-revision evidence, stop. [VERIFIED: current environment probe and factual audit]

### Phase requirements to test/evidence map

| Requirement | Automated behavior/evidence | File exists? |
|---|---|---|
| FMT-01 | New characterization in Home and session-comparison suites; focused command | Existing files, new test cases required before production edits. [VERIFIED: test inventory] |
| FMT-02 | Focused tests plus exact zero-match deletion searches and diff trace | Tests exist; deletion evidence generated after implementation. [VERIFIED: source inventory] |
| EVID-01 | HEAD/source-tree/index hash record and refreshed Lumen/literal audit on drift | Evidence procedure required before production edits. [VERIFIED: research identity] |
| SLIM-01 | Clean exact-four-file allowlist, virtual Prettier normalization of `$productionBaseSha`/`$reviewedHeadSha` blobs, normalized A/D/net plus hunks, and semantic-hunk audit | Evidence generated from `$productionBaseSha..$reviewedHeadSha`; raw worktree/numstat evidence is insufficient. [VERIFIED: validation design] |
| QUAL-01 | Mutation-sensitive focused tests plus all repository commands | Existing framework/config; cases are Wave 0. [VERIFIED: package/test inventory] |
| HEALTH-01 | Fresh exact-revision CodeScene baseline, staged-identity safeguard, branch analysis, and per-file final review | Score/review outputs carry exact revision/blob/path/time/tool bindings; safeguard evidence carries verified parent/staged-tree/diff/blob/resulting-commit identity; `analyze_change_set` retains `quality_gates` and `results`; prior session values do not count. [VERIFIED: factual audit and CodeScene policy] |
| SHIP-01 | Independent `@codex` review, revert proof, native merge, clean `main` | Manual/repository evidence generated at delivery. [VERIFIED: AGENTS.md] |

### Evidence artifacts

- Characterization commit/test-only diff, green focused output, and recorded failing mutation outputs. [VERIFIED: QUAL-01]
- Immutable `PRODUCTION_BASE_SHA`, `PRODUCTION_BASE_SRC_TREE`, four source blob IDs, and `.lumenignore` blob. [VERIFIED: EVID-01/SLIM-01]
- Clean worktree/index/untracked status for four source plus three formatter-input paths, exact four-file committed `M` allowlist, normalized `A`, `D`, `A-D`, every normalized hunk, and the separate semantic-hunk mapping. [VERIFIED: FMT-02/SLIM-01]
- Full command outputs tied to `$reviewedHeadSha`. [VERIFIED: QUAL-01]
- Fresh CodeScene pre/post per-file scores/reviews and branch change-set raw outputs externally bound to exact revisions/blobs/paths/invocation times/tool names; pre-commit safeguard raw output with recorded parent SHA, staged tree/name-status/diff/blob IDs, and verified resulting commit/tree; optional returned metadata and any repository delta view URL actually returned. [VERIFIED: HEALTH-01]
- Independent review verdict, clean revert demonstration, merge result, updated `main` SHA, and empty final `git status --porcelain=v1 --untracked-files=all`. [VERIFIED: SHIP-01]

### Wave 0 gaps

- [ ] Add the three exact characterization cases to the two existing test files before any `src/**` edit. [VERIFIED: test inventory]
- [ ] Record immutable production/semantic identities and prove the virtual-normalization procedure on baseline Git blobs without formatting the worktree. [VERIFIED: validation design]
- [ ] Freshly capture all four pre-edit CodeScene scores/reviews with the exact external revision/blob/path/time/tool binding; prior session values do not count. [VERIFIED: CodeScene scope and factual audit]
- [ ] No framework install, test config, fixture file, or external dependency is required. [VERIFIED: current package/test infrastructure]

### Sampling rate

- **Per test-only characterization checkpoint:** focused Home + session-comparison tests and mutation sensitivity. [VERIFIED: QUAL-01]
- **Per production task commit:** focused tests, architecture test, debt self-test, changed Semgrep/XO, lint, typecheck, and CodeScene safeguard. [VERIFIED: AGENTS.md and CodeScene guidance]
- **Per wave merge/final reviewed revision:** full unit suite, build, LOC/deletion proof, full CodeScene change-set/per-file evidence. [VERIFIED: requirements]
- **Phase gate:** all evidence conjunctively green before native verification/ship; unavailable, skipped, stale, or mismatched-revision evidence is `BLOCK`. [VERIFIED: metronome fail-closed policy]

## Security Domain

### Applicable ASVS categories

| ASVS Category | Applies | Standard control |
|---|---|---|
| V2 Authentication | No | No authentication surface is touched. [VERIFIED: Approved Surface] |
| V3 Session Management | No | “Practice session” is domain data, not an authentication session. [VERIFIED: current domain types] |
| V4 Access Control | No | No authorization or privilege boundary is touched. [VERIFIED: Approved Surface] |
| V5 Input Validation | Yes, narrowly | Preserve nullable/invalid timestamp fallbacks and non-finite/non-positive numeric guards; never echo the raw invalid input. [VERIFIED: behavior matrix] |
| V6 Cryptography | No | No cryptographic operation, identifier, or secret changes. [VERIFIED: Approved Surface] |

### Known threat patterns for this boundary

| Pattern | STRIDE | Standard mitigation |
|---|---|---|
| Untrusted timestamp text rendered into UI | Tampering | Output only numeric UTC parts and fixed fallback literals; do not interpolate the raw input. [VERIFIED: current algorithm] |
| Dependency/supply-chain expansion for trivial formatting | Tampering | No dependency or lockfile change; fail on manifest drift. [VERIFIED: EVID-01] |
| Locale/environment-dependent presentation drift | Tampering / Repudiation | Use UTC getters and fixed ASCII output; do not use locale-dependent formatting. [VERIFIED: current algorithm] |

## Environment Availability

| Dependency | Required By | Available | Version / state | Fallback |
|---|---|---|---|---|
| Local Node.js | Repository commands | Yes | 24.17.0 | Repository-local runtime is authoritative. [VERIFIED: current environment] |
| Repository npm wrapper | All npm scripts | Yes | npm 11.17.0 | None needed. [VERIFIED: current environment] |
| Git | baseline/diff/rollback | Yes | 2.55.0.windows.3 | None needed. [VERIFIED: current environment] |
| ripgrep | literal/deletion audits | Yes | 15.1.0 | `git grep` only if `rg` becomes unavailable. [VERIFIED: current environment] |
| Vitest / Prettier | tests/virtual LOC normalization | Yes | 4.1.9 / 3.9.5 installed | Prettier is invoked only through repo-local Node with stdin blobs; never `--write` on source. [VERIFIED: lockfile and current CLI] |
| Lumen semantic provider | EVID-01 refresh | MCP exposed; approved rebuild recorded | Ignore-aware approved index 345 files / 2,859 chunks | Explicit rebuilt CLI index or freshly loaded MCP host; otherwise block. [VERIFIED: approved FEATURES research and current tool exposure] |
| CodeScene MCP | HEALTH-01 | Tools exposed; fresh analysis still required | Prior project `82174` is a session-derived lead, not current repository evidence | Retain complete raw results with exact external revision/blob/path/time/tool bindings; provider errors, unattributable output, or unavailable evidence block. [VERIFIED: factual audit] |
| `cs` shell CLI/token | Checked-in `lint:codescene:changed` | No in current PowerShell environment | command/token aliases absent | Use CodeScene MCP exact-revision gates, or provision CLI/token; never skip. [VERIFIED: current environment] |

**Missing dependency with no fallback:** none for research or implementation. [VERIFIED: environment audit]

**Missing dependency with fallback:** the shell `cs` entrypoint/token is absent; CodeScene MCP tools are exposed as the required current fallback, but they count only when fresh output is attributable to the exact revisions through the evidence contract above. [VERIFIED: environment audit and factual audit]

## Rollback, Review, and Clean-Main Obligations

The production change must remain one bounded source refactor with no schema/key/dependency migration. Demonstrate rollback before merge by reverting the implementation revision in a clean disposable verification context or by applying its exact reverse diff, running the focused tests to prove old behavior is restored, and then returning to the reviewed revision without retaining a runtime fallback. [VERIFIED: SHIP-01 and Runtime State Inventory]

Final review is read-only and performed by `@codex` using `skills/reviewing-metronome-prs/SKILL.md`. The reviewer must trace every changed production surface through plan task -> CAP decision -> Approved Surface -> tests -> verification, independently recheck reuse/dependency/OSS rejection evidence, and report production LOC and Code Health separately. [VERIFIED: AGENTS.md and review skill]

Merge only through the native OpenGSD lifecycle after all requirements are verified. After merge, update local `main`, require it to match the intended remote revision, and require `git status --porcelain=v1 --untracked-files=all` to be empty; any data repair, user action, stray worktree change, unresolved review finding, or dirty updated `main` blocks SHIP-01. [VERIFIED: AGENTS.md, STATE.md, and SHIP-01]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|---|---|---|
| — | None. All decision-bearing claims are tied to current repository evidence, approved upstream research, or cited official platform documentation. | All | No user confirmation is required for an assumed technical decision. |

## Open Questions

None. `format.ts` CodeScene baseline capture, characterization additions, mutation evidence, final LOC, and exact-revision health/review results are mandatory execution evidence rather than design questions. Any need to exceed Approved Surface is a stop-and-return-to-research condition, not planner discretion. [VERIFIED: metronome policy]

## Project Constraints (from AGENTS.md)

- Native OpenGSD is the sole lifecycle entrypoint; continue the active Phase 1 rather than creating another scheduler or milestone. [VERIFIED: `AGENTS.md`, `STATE.md`, `ROADMAP.md`]
- Read and reconcile `.planning/STATE.md` and `.planning/ROADMAP.md` before routing work. [VERIFIED: `AGENTS.md`]
- Final PR review is read-only, performed by `@codex`, and uses `skills/reviewing-metronome-prs/SKILL.md`; it does not replace native lifecycle work. [VERIFIED: `AGENTS.md`]
- Before commit, run debt-gate self-test, changed Semgrep, changed XO, lint, typecheck, unit tests, and build through the hook. [VERIFIED: `AGENTS.md`]
- Use repository-local `scripts/npm-local.ps1` when npm is absent from PATH, in the documented npm -> npm.cmd -> PowerShell/pwsh fallback order. [VERIFIED: `AGENTS.md`]
- Do not bypass hooks with `--no-verify` unless the user explicitly requests it. [VERIFIED: `AGENTS.md`]
- Dormant seed promotion rules are not applicable because this milestone selects no dormant product capability and all 32 seeds remain unchanged. [VERIFIED: REQUIREMENTS.md Out of Scope]

## Sources

### Primary (HIGH confidence)

- Current HEAD `19b17b530736d2e51a6a9ee24cfdf6c092fb5b66`, `src` tree `a53cc5795216a48cbd89b79eccf5805b780c7c08`, and exact production/test files cited above. [VERIFIED: git and source inspection]
- `.planning/{PROJECT,STATE,ROADMAP,REQUIREMENTS}.md` and `.planning/research/{SUMMARY,FEATURES,PITFALLS,ARCHITECTURE,STACK}.md`. [VERIFIED: repository artifacts]
- `AGENTS.md`, `skills/metronome-policy/SKILL.md`, `skills/reviewing-metronome-prs/SKILL.md`, `.planning/config.json`, `.lumenignore`, `package.json`, `package-lock.json`, `.codescene/*`, and `docs/architecture/debt-gate-map.md`. [VERIFIED: repository artifacts]
- CodeScene MCP workflow guidance; prior numeric scores/project selection are session-derived leads only and are excluded from acceptance evidence. [VERIFIED: installed skill and factual audit]

### Secondary (MEDIUM confidence)

- [MDN `Intl.DateTimeFormat.prototype.format`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/format) — locale/implementation output variability used only to reject it as the exact-output owner. [CITED: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/format]

### Tertiary (LOW confidence)

- None. [VERIFIED: Assumptions Log]

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — exact installed versions and zero-install decision are repository-verifiable. [VERIFIED: manifest/lockfile]
- Architecture: HIGH — all owners, callers, imports, and exclusions are exact current-source observations. [VERIFIED: current HEAD source]
- Behavior: HIGH — the valid timestamp assembly and both minute-duration bodies are exact current observations; analytics-specific fallback/display gating and each characterization seam are documented separately. [VERIFIED: current HEAD source/tests]
- Pitfalls/gates: HIGH — requirements, hooks, CodeScene policy, and local scripts define fail-closed outcomes. [VERIFIED: repository policy]
- External API conclusion: MEDIUM — official platform documentation supports the narrow `Intl` rejection; no ecosystem-wide replacement claim is needed. [CITED: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/format]

**Research date:** 2026-07-21
**Valid until:** 2026-08-20, unless source HEAD/source tree or semantic-index configuration changes first. [VERIFIED: EVID-01 freshness rule]
