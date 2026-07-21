# Phase 1: Canonical Practice Presentation Formatting - Research

**Researched:** 2026-07-21
**Domain:** Behavior-preserving TypeScript presentation-format consolidation
**Confidence:** HIGH for the current source/caller/test boundary; MEDIUM for external-platform generalizations

## Summary

Phase 1 should consolidate exactly two pure presentation behaviors—fixed UTC-minute timestamps and minute-scale practice durations—into the existing `src/domain/practice/format.ts` owner. The current `src/**` tree at `19b17b530736d2e51a6a9ee24cfdf6c092fb5b66` has tree object `a53cc5795216a48cbd89b79eccf5805b780c7c08`, identical to the approved selection baseline `6c0089b9cac378214ff4f4ecdbe2f3f5b42c81a4`; the intervening commits change planning and semantic-index artifacts, not production source. [VERIFIED: git objects and current HEAD]

Four timestamp bodies, two identical minute-duration bodies, and one no-op minute wrapper remain at the selected Home, dashboard-hook, and session-comparison locations. They have seven timestamp call expressions and three minute-duration call expressions. The existing practice barrel already exports `format.ts`, so the consolidation requires no new module, barrel, wrapper, facade, adapter, compatibility alias, feature flag, dependency, or owner move. [VERIFIED: current HEAD source]

**Primary recommendation:** characterize every selected output through existing public seams before production edits, then add the two admitted exports to `src/domain/practice/format.ts`, redirect only the verified callers, delete all seven superseded functions atomically, and accept only a strictly net-negative virtually normalized `src/**` result from immutable `$productionBaseSha`/`$reviewedProductionSha` blobs that passes the exact reviewed-revision gates. [VERIFIED: REQUIREMENTS.md and current HEAD source]

**Execution amendment:** The formatter consolidation is complete and preserved at immutable commit `ef98c28759a017d6c1a09ef4f1bd68a9488440bf`; its T1/T2 work is historical evidence and is never repeated, amended, or reverted. The first T3 attempt was blocked only because final Home Code Health was `6.86`, below the unchanged `7.0` threshold. The approved repair adds one local Goals-first structural extraction followed by one explicit final-evidence retry. It performs no semantic, dependency, or OSS rediscovery and uses a new observability run/step identity. [VERIFIED: immutable commit and `.logs/gsd-observability/r01-formal-20260721-01/evidence/codescene-final.json`]

**Amendment precedence:** CAP-03 and the amended execution receipt/PLAN govern all work after `ef98c28`. Later references in this document to an exact four-source/six-file formatter transaction, zero new production paths, the original 89-line verifier, or T1-T3 describe the completed historical formatter attempt only. They do not authorize repeating it and do not constrain the approved CAP-03 files. Final acceptance instead evaluates the combined immutable range `3370d2f93fd6740d96150d9ee69e31238b258c6a..reviewedProductionSha`: four existing production paths may be modified, exactly two Goals components may be added, and the combined normalized production LOC must remain strictly negative.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|---|---|---|
| FMT-01 | Preserve exact UTC-minute timestamps, minute-scale durations, rounding, and fallbacks. | The behavior matrix and pre-change tests below lock every selected branch. [VERIFIED: `.planning/REQUIREMENTS.md`] |
| FMT-02 | Use one owner and remove all seven duplicate/no-op functions. | The source/caller/deletion map and Approved Surface enumerate the only permitted edits. [VERIFIED: `.planning/REQUIREMENTS.md`; current HEAD source] |
| EVID-01 | Keep evidence current, add no dependency, and refresh after product/search drift. | The evidence identity and freshness rule bind implementation to separate product and semantic-index configuration fingerprints. [VERIFIED: `.planning/REQUIREMENTS.md`; git objects] |
| SLIM-01 | Finish strictly net-negative in tracked production `src/**`. | The immutable baseline and final calculation exclude tests, planning, generated files, renames, moves, and formatting churn. [VERIFIED: `.planning/REQUIREMENTS.md`] |
| QUAL-01 | Characterize first and pass focused plus repository gates. | Validation Architecture gives exact tests, mutation checks, commands, artifacts, and stop conditions. [VERIFIED: `.planning/REQUIREMENTS.md`; `package.json`] |
| HEALTH-01 | Pass exact-revision CodeScene policy. | The CodeScene gate requires no changed-source decline, no new severe finding, and the touched Home hotspot at least 7.0. [VERIFIED: `.codescene/quality-gate-policy.md`] |
| DELIV-01 | Prove the immutable reviewed product revision has complete product evidence, is reversible and clean, and is ready to enter native verification, validation, and security. | These product/repository facts are provable inside execute-plan. Passing the later native gates is mandatory before `$gsd-ship` but receives no Phase 1 requirement credit; post-ship review, CI, merge, and clean-main facts remain the separate Milestone Release Exit. [VERIFIED: `.planning/REQUIREMENTS.md`; native execute-plan ordering; `AGENTS.md`] |
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

### CAP-03 — Goals-first Home structural extraction (execution amendment)

| Field | Admission record |
|---|---|
| Intent | Restore Home to a composition role by extracting its approximately 613 physical lines of Practice Goals UI responsibility into cohesive sibling components, without changing behavior or persistence. [VERIFIED: approved architecture analysis and existing `session-comparison-panel.tsx` precedent] |
| Inputs / outputs | Existing Home/hook props, goal view models, callbacks, and rendered behavior remain the contract; no domain or service API changes. |
| Local candidates | Use the existing sibling-component pattern represented by `src/components/home/session-comparison-panel.tsx`; keep goal composition in `home-dashboard.tsx`, panel behavior in `practice-goals-panel.tsx`, and editor/form state in `practice-goal-editor.tsx`. |
| Dependency / OSS decision | **USE_LOCAL**. This is a bounded responsibility extraction using existing React/project patterns. No new dependency, framework, generic abstraction, service, schema, domain API, ID algorithm, or persistence path is admitted. No rediscovery is required because the approved change introduces no generic capability. |
| Required deletion | Remove duplicate save/delete callback aliases and the empty-data reference sentinel when preserved behavior and tests permit; do not merely move one approximately 600-line block into one new file. |
| **Approved Surface** | Modify only `src/components/home/home-dashboard.tsx` and `src/hooks/use-practice-session-dashboard.ts`; create only `src/components/home/practice-goals-panel.tsx` and `src/components/home/practice-goal-editor.tsx`; modify only `tests/unit/home-dashboard.test.tsx` and `tests/unit/architecture-boundaries.test.ts` as needed. Domain, services, dependencies, schemas, algorithms, persistence, and every other path are excluded. |
| Acceptance | Existing user-visible behavior stays locked; Home remains composition; each new file receives attributable CodeScene evidence with no new severe finding; Home is at least `7.0`; normalized total production LOC across the original formatter range plus this repair remains strictly net-negative. |

**Admission closure:** The formatter CAP-01/CAP-02 implementation at `ef98c28759a017d6c1a09ef4f1bd68a9488440bf` is immutable historical work. The executor may implement only CAP-03 within its Approved Surface, then run one explicit final-evidence retry. Any required dependency, domain/service change, API replacement, persistence change, ID algorithm change, or additional production path blocks the repair and returns for a separate scope decision rather than rediscovery or automatic retry.

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

Before adding characterization, require an empty complete index and clean `src/**`. After focused green and mutation restoration, keep the index empty and require working status to contain exactly two non-empty `M` rows for `tests/unit/home-dashboard.test.tsx` and `tests/unit/session-comparison.test.ts`, with no source row. Record the T1 terminal event against `PRODUCTION_BASE_SHA`, `PRODUCTION_BASE_SRC_TREE`, and the four source blob IDs. Do not commit or run the full hook yet; the single six-file final transaction preserves the ordering evidence without paying for a second hook. [VERIFIED: QUAL-01, complete-index boundary, execution recovery contract]

### Required mutation-sensitivity evidence

- Temporarily change `Math.floor(value / 60_000)` to `Math.round(value / 60_000)` specifically in `use-practice-session-dashboard.ts::formatSessionComparisonDuration`; the public panel/hook assertion `119_999 -> 1 min` must fail. Apply the equivalent mutation separately to Home `formatAnalyticsDuration` and require its `119_999` assertion to fail as well. [VERIFIED: current duration branches]
- Temporarily change a general timestamp fallback from `Unknown time` to `Unknown update time`; the public Home/hook/domain characterization that reaches that owner must fail. [VERIFIED: current fallback branches]
- Temporarily change the no-op wrapper's `<1 min` return to `0 min`; the goal-contribution assertion must fail. [VERIFIED: current wrapper call path]

Each mutation is applied one at a time, its expected failing assertion is recorded, and the exact original line is restored immediately. After **each** restoration, require `git status --porcelain=v1 --untracked-files=all -- src` to return no rows and require `git hash-object` for all four source files to equal their recorded baseline blob IDs. A mutation that does not fail, any remaining source status row, or any blob mismatch blocks implementation until characterization/restoration is corrected. `git diff` alone never proves restoration. [VERIFIED: QUAL-01 and metronome fail-closed policy]

## Immutable Virtual-Normalized Production LOC Baseline

The checked-in admitted files do not currently pass Prettier 3.9.5, so an in-worktree `prettier --check` or `--write` requirement would either fail before the refactor or create unrelated formatting churn. LOC evidence must instead compare immutable Git blobs after virtual Prettier normalization through stdin; normalization must never write any source file. [VERIFIED: locked Prettier 3.9.5 and factual audit]

### Clean reviewed-HEAD and exact-source prerequisites

Record `PRODUCTION_BASE_SHA` and `IMPLEMENTATION_BRANCH` before characterization; the latter must be the non-empty result of `git symbolic-ref -q --short HEAD`. Before T3, after T3, and immediately before native closeout, that command must still resolve the recorded named branch and `git rev-parse --verify "${IMPLEMENTATION_BRANCH}^{commit}"` must equal immutable `reviewedProductionSha`; detached HEAD is `BLOCK`. Final evidence is always `$productionBaseSha..$reviewedProductionSha`, never a dynamic HEAD or working-tree diff. The baseline must be an ancestor of the reviewed commit. At final review, worktree/index/untracked status must be clean for both the four Approved Surface source paths and formatter inputs `prettier.config.mjs`, `.prettierignore`, `package.json`, and `package-lock.json`; an absent `.prettierignore` must remain absent and untracked. The changed `src/**` set in the committed range must still be exactly the four approved paths with status `M`; any added/deleted/renamed/moved production file or any fifth source path is `BLOCK`. Rollback may run only in a disposable context and must never detach or move the intended implementation branch. [VERIFIED: SLIM-01, Approved Surface, and named-branch closeout invariant]

### Reproducible virtual normalization and calculation

Run the following 89-physical-line recipe from the repository root after replacing the three placeholders with the recorded immutable baseline SHA, reviewed product SHA, and intended implementation branch. The retained categories are necessary and non-duplicative: immutable revision/branch and clean-scope identity; formatter-input immutability; locked Git/Node/Prettier/plugin identity; UTF-8 immutable-blob normalization; exact four-file inventory; per-file numstat plus every hunk; aggregate strict-net-negative assertion; and encoding/temp cleanup. Explicit `--config`, `--no-editorconfig`, and `--ignore-path .prettierignore` close discovery; an absent `.prettierignore` remains an input whose range and untracked state must stay absent. Every native command is an individual gate: any unexpected nonzero exit is `BLOCK`; exit `1` is accepted only from `git diff --no-index` when normalized files differ. [VERIFIED: locked local tool paths and validation design]

```powershell
$ErrorActionPreference = "Stop"
if (Test-Path Variable:PSNativeCommandUseErrorActionPreference) { $PSNativeCommandUseErrorActionPreference = $false }
$productionBaseSha = "<recorded-PRODUCTION_BASE_SHA>"; $reviewedProductionSha = "<recorded-reviewedProductionSha>"; $intendedBranch = "<recorded-IMPLEMENTATION_BRANCH>"
$approvedPaths = @("src/domain/practice/format.ts", "src/domain/practice/session-comparison.ts", "src/hooks/use-practice-session-dashboard.ts", "src/components/home/home-dashboard.tsx")
$formatterInputs = @("prettier.config.mjs", ".prettierignore", "package.json", "package-lock.json")
$cleanPaths = $approvedPaths + $formatterInputs
$nodeExe = (Resolve-Path -LiteralPath ".\.tools\node-v24.17.0-win-x64\node.exe").Path
$prettierCli = (Resolve-Path -LiteralPath ".\node_modules\prettier\bin\prettier.cjs").Path
$prettierConfig = (Resolve-Path -LiteralPath ".\prettier.config.mjs").Path
$utf8NoBom = [Text.UTF8Encoding]::new($false)
$previousOutputEncoding = $OutputEncoding
$previousConsoleEncoding = [Console]::OutputEncoding
$baseTemp = $null
$reviewedTemp = $null
$baseRef = @(& git rev-parse --verify ($productionBaseSha + "^{commit}") 2>&1)
if ($LASTEXITCODE -ne 0) { throw "Invalid PRODUCTION_BASE_SHA: $($baseRef -join "`n")" }
$productionBaseSha = ($baseRef -join "").Trim()
$headRef = @(& git rev-parse --verify "HEAD^{commit}" 2>&1)
if ($LASTEXITCODE -ne 0) { throw "Cannot resolve reviewed HEAD: $($headRef -join "`n")" }
$resolvedHeadSha = ($headRef -join "").Trim(); if ($resolvedHeadSha -ne $reviewedProductionSha) { throw "HEAD is not reviewedProductionSha." }
$branchRef = @(& git symbolic-ref -q --short HEAD 2>&1); if ($LASTEXITCODE -ne 0 -or ($branchRef -join "").Trim() -ne $intendedBranch) { throw "Detached or wrong implementation branch." }
$branchTip = @(& git rev-parse --verify ($intendedBranch + "^{commit}") 2>&1); if ($LASTEXITCODE -ne 0 -or ($branchTip -join "").Trim() -ne $reviewedProductionSha) { throw "Implementation branch tip is not reviewedProductionSha." }
& git merge-base --is-ancestor $productionBaseSha $reviewedProductionSha 2>&1
if ($LASTEXITCODE -ne 0) { throw "PRODUCTION_BASE_SHA is not an ancestor of reviewedProductionSha." }
$range = "$productionBaseSha..$reviewedProductionSha"
& git diff --quiet --no-ext-diff --no-textconv $range -- @formatterInputs
$configExit = $LASTEXITCODE
if ($configExit -eq 1) { throw "Formatter inputs changed in $range." }
if ($configExit -ne 0) { throw "Formatter-input immutability check failed with exit $configExit." }
$gitVersion = @(& git --version 2>&1); if ($LASTEXITCODE -ne 0 -or ($gitVersion -join "").Trim() -ne "git version 2.55.0.windows.3") { throw "Expected Git 2.55.0.windows.3, got $($gitVersion -join '')" }
$nodeVersion = @(& $nodeExe --version 2>&1); if ($LASTEXITCODE -ne 0 -or ($nodeVersion -join "").Trim() -ne "v24.17.0") { throw "Expected Node v24.17.0, got $($nodeVersion -join '')" }
$prettierVersion = @(& $nodeExe $prettierCli --version 2>&1); if ($LASTEXITCODE -ne 0 -or ($prettierVersion -join "").Trim() -ne "3.9.5") { throw "Expected Prettier 3.9.5, got $($prettierVersion -join '')" }
$pluginVersion = @(& $nodeExe -p "require('./node_modules/prettier-plugin-tailwindcss/package.json').version" 2>&1); if ($LASTEXITCODE -ne 0 -or ($pluginVersion -join "").Trim() -ne "0.8.0") { throw "Expected prettier-plugin-tailwindcss 0.8.0, got $($pluginVersion -join '')" }
$status = @(& git status --porcelain=v2 --branch --untracked-files=all -- @cleanPaths 2>&1)
if ($LASTEXITCODE -ne 0) { throw "Scoped status failed: $($status -join "`n")" }
$headRows = @($status | Where-Object { $_ -like "# branch.head *" })
$oidRows = @($status | Where-Object { $_ -like "# branch.oid *" })
$dirtyRows = @($status | Where-Object { -not $_.StartsWith("# ") })
if ($headRows.Count -ne 1 -or $headRows[0] -ne "# branch.head $intendedBranch" -or $oidRows.Count -ne 1 -or $oidRows[0] -ne "# branch.oid $reviewedProductionSha" -or $dirtyRows.Count -ne 0) { throw "Scoped checkout is not clean on intended reviewed branch: $($status -join "`n")" }
$changedRows = @(& git diff --name-status --no-renames $range -- src 2>&1)
if ($LASTEXITCODE -ne 0) { throw "Changed-source inventory failed: $($changedRows -join "`n")" }
$actualRows = @($changedRows | Sort-Object)
$expectedRows = @($approvedPaths | ForEach-Object { "M`t$_" } | Sort-Object)
if (($actualRows -join "`n") -ne ($expectedRows -join "`n")) { throw "Changed src rows are not the exact four M-only Approved Surface rows: $($changedRows -join "`n")" }
@("CHANGED_SOURCE_ROWS_BEGIN", ($changedRows -join "`n"), "CHANGED_SOURCE_ROWS_END") | Write-Output
$addedTotal, $deletedTotal = 0, 0
try {
  $OutputEncoding = $utf8NoBom
  [Console]::OutputEncoding = $utf8NoBom
  $baseTemp = New-TemporaryFile
  $reviewedTemp = New-TemporaryFile
  foreach ($path in $approvedPaths) {
    $blobPairs = @(@($productionBaseSha, $baseTemp.FullName), @($reviewedProductionSha, $reviewedTemp.FullName))
    foreach ($pair in $blobPairs) {
      $spec = "$($pair[0]):$path"
      $sourceLines = @(& git cat-file blob $spec 2>&1)
      if ($LASTEXITCODE -ne 0) { throw "git cat-file failed for $spec`: $($sourceLines -join "`n")" }
      $sourceText = ($sourceLines -join "`n") + "`n"
      $normalizedLines = @($sourceText | & $nodeExe $prettierCli --config $prettierConfig --no-editorconfig --ignore-path ".prettierignore" --stdin-filepath $path 2>&1)
      if ($LASTEXITCODE -ne 0) { throw "Prettier normalization failed for $spec`: $($normalizedLines -join "`n")" }
      [IO.File]::WriteAllText($pair[1], (($normalizedLines -join "`n") + "`n"), $utf8NoBom)
    }
    $normalizedDiff = @(& git -c core.autocrlf=false diff --no-index --numstat --patch --unified=0 --diff-algorithm=myers --no-indent-heuristic -- $baseTemp.FullName $reviewedTemp.FullName 2>&1)
    $diffExit = $LASTEXITCODE
    if ($diffExit -notin 0, 1) { throw "Normalized diff failed for $path`: $($normalizedDiff -join "`n")" }
    $numstatRows = @($normalizedDiff | Where-Object { $_ -match "^\d+`t\d+`t" })
    if (($diffExit -eq 0 -and $numstatRows.Count -ne 0) -or ($diffExit -eq 1 -and $numstatRows.Count -ne 1)) { throw "Unexpected normalized numstat for $path`: $($normalizedDiff -join "`n")" }
    $added = 0
    $deleted = 0
    if ($numstatRows.Count -eq 1) {
      $fields = $numstatRows[0] -split "`t"
      $added = [int]$fields[0]
      $deleted = [int]$fields[1]
    }
    $addedTotal += $added
    $deletedTotal += $deleted
    Write-Output ("NORMALIZED_NUMSTAT path={0} added={1} deleted={2} net={3}" -f $path, $added, $deleted, ($added - $deleted))
    @("NORMALIZED_DIFF_BEGIN path=$path", ($normalizedDiff -join "`n"), "NORMALIZED_DIFF_END path=$path") | Write-Output
  }
  $net = $addedTotal - $deletedTotal
  @("REVIEW_RANGE=$range", "NORMALIZED_ADDED=$addedTotal", "NORMALIZED_DELETED=$deletedTotal", "NORMALIZED_NET=$net") | Write-Output
  if ($net -ge 0) { throw "SLIM-01 failed: normalized production LOC is not strictly net-negative." }
}
finally {
  $OutputEncoding = $previousOutputEncoding
  [Console]::OutputEncoding = $previousConsoleEncoding
  if ($null -ne $baseTemp) { Remove-Item -LiteralPath $baseTemp.FullName -Force }
  if ($null -ne $reviewedTemp) { Remove-Item -LiteralPath $reviewedTemp.FullName -Force }
}
```

The evidence record must contain the resolved baseline/reviewed SHAs, intended named branch and matching tip, successful ancestry/formatter-input/scoped-cleanliness gates, exact four-file name/status rows, locked Git/Node/Prettier/plugin versions, normalized added/deleted totals, net `added - deleted`, and every normalized hunk. The recipe never formats or writes a worktree source file. [VERIFIED: validation procedure]

### Separate semantic-deletion audit

Normalized net-negative LOC is necessary but not sufficient. Review every normalized addition/deletion hunk and create a fail-closed mapping with columns `path`, `hunk header`, `CAP`, `allowed addition/deletion`, `retired symbol/caller`, and `evidence`. Every hunk must map only to one of: the two canonical function bodies, their direct imports/calls, or the seven named retired bodies/caller rewires. [VERIFIED: Approved Surface and SLIM-01]

No credit is permitted for comment-only deletion, relocated logic in any existing or new path, formatting-only hunks, tests/planning/generated files, new production files, renames, moves, minification, or unrelated cleanup. Search all `src/**` for retired symbols and distinctive algorithms/fallback strings, inspect `$productionBaseSha..$reviewedProductionSha` with `--no-renames`, and block on any unmapped hunk or surviving/relocated duplicate. Raw worktree or commit `numstat` alone never proves semantic deletion. [VERIFIED: SLIM-01 and metronome policy]

## Dependency and OSS Conclusion

The selected timestamp bodies share the same valid-value algorithm while analytics differs in fallback/display gating; the two minute-duration bodies are identical and the wrapper is a no-op. That local evidence plus the existing correct owner means no dependency is needed. The approved manifest evidence found no exact installed replacement, and authoritative platform evidence rejects `Intl.DateTimeFormat` for a fixed cross-implementation ASCII contract. Rebuilding the same punctuation/fallback policy around `formatToParts`, a date library, or `Intl.NumberFormat` would add glue rather than retire it. [VERIFIED: current source and approved STACK/SUMMARY research] [CITED: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/format]

This conclusion does not reopen candidate selection: Dexie, `dequal`, React hydration, string normalization, ID factories, storage, music, and media/browser alternatives remain outside Phase 1. `package.json`, `package-lock.json`, client dependency graphs, and install-script policy must remain unchanged. [VERIFIED: REQUIREMENTS.md Out of Scope]

## State of the Art

| Old/current approach | Approved current approach | Impact |
|---|---|---|
| Four fixed-UTC timestamp bodies across domain, hook, and Home | One deterministic export in the existing practice formatting owner | Preserves exact text while deleting duplicate ownership. [VERIFIED: current source and Approved Surface] |
| Two identical minute-duration bodies plus a no-op wrapper | One minute-scale export in the same existing owner | Preserves floor/threshold/hour wording and removes three bodies. [VERIFIED: current source and Approved Surface] |
| Runtime fallback kept for refactor safety | Version-control rollback before entering native verification | Avoids parallel production paths and requires no data repair. [VERIFIED: DELIV-01 and Runtime State Inventory] |

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

**What goes wrong:** duplicate logic moves to a new/existing path or survives behind aliases while raw `--stat` appears smaller. **Avoidance:** enforce the exact four-file `M` allowlist, virtual-normalized `$productionBaseSha`/`$reviewedProductionSha` hunks, separate semantic-hunk mapping, deletion searches, and zero new production files. [VERIFIED: SLIM-01]

### Pitfall 5: Evidence is stale

**What goes wrong:** implementation begins after source or semantic-index configuration drift. **Avoidance:** bind research to HEAD/source tree/index-config hashes and refresh before any production edit. [VERIFIED: EVID-01]

### Pitfall 6: Baseline CodeScene is treated as final

**What goes wrong:** a green test suite hides a changed-source health decline or Home remains below policy threshold. **Avoidance:** analyze the exact reviewed revision, not a prior commit, and require every conjunctive policy condition. [VERIFIED: HEALTH-01 and CodeScene policy]

## Evidence Freshness Rule

The compact execution receipt records separate product, dependency, search-config, and policy fingerprints after `.logs/` was added to `.lumenignore` and Lumen completed one refresh. Before the first production edit, the executor recomputes those identities. An exact match consumes the receipt without rediscovery. Product or search-config drift is `EVIDENCE_STALE`: stop and return only the affected CAP to research; planning-only HEAD or STATE changes do not invalidate product evidence. Dependency or policy drift blocks until the corresponding receipt input is reconciled. [VERIFIED: `.lumenignore`, EVID-01, execution recovery contract]

Long-lived MCP counts retained across an ignore change are not fresh evidence. Accept only an explicit ignore-aware rebuild/query or a freshly loaded host whose index reflects the current configuration. Provider failure, stale status, or no result is `BLOCK`, not negative evidence. [VERIFIED: approved FEATURES/PITFALLS research and metronome policy]

## Validation Architecture

### Test layers

| Layer | Scope | Command / evidence | Failure mode and stop condition |
|---|---|---|---|
| Characterization | Existing public Home, hook/service, and domain seams | Focused Vitest command below; measure a <=30-second quick-feedback target before relying on it; green before any `src/**` edit | Runtime above 30 seconds, missing branch, flaky result, or a deliberate mutation that stays green is `BLOCK`; do not claim an unmeasured target as observed. [VERIFIED: QUAL-01] |
| Focused regression | Same two files on the implemented revision | `& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/home-dashboard.test.tsx tests/unit/session-comparison.test.ts` | Any changed string, rounding, or fallback is `BLOCK`. [VERIFIED: package scripts] |
| Architecture | Existing dependency boundaries and excluded paths | `& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/architecture-boundaries.test.ts` | New boundary exception, UI-to-infrastructure edge, or local-worker regression is `BLOCK`. [VERIFIED: existing architecture suite] |
| Static/debt | Gate self-test, changed Semgrep, changed XO, ESLint, TypeScript | Exact commands below | Any failure, suppression, or skipped check is `BLOCK`. [VERIFIED: package scripts and AGENTS.md] |
| Full behavior/build | Entire unit suite and production build | Exact commands below | Any failure or skipped test is `BLOCK`. [VERIFIED: AGENTS.md] |
| LOC/deletion | Immutable baseline and reviewed-commit blobs for the exact four-file allowlist | Clean four-source-plus-four-formatter-input checkout, locked Git/Node/Prettier/plugin virtual normalization, normalized A/D/net plus hunks, and separate semantic-hunk mapping | Non-negative normalized net, source/formatter-input drift, Unicode loss, unmapped hunk, new production path, rename/move, relocation, or surviving duplicate is `BLOCK`. Raw `numstat` alone is insufficient. [VERIFIED: SLIM-01] |
| CodeScene | Fresh baseline and final outputs for every changed source file plus full branch vs baseline | Raw MCP score/review outputs bound to exact revisions/blobs/paths; pre-commit safeguard bound first to parent/staged-tree/diff/blob identity and only then to the verified resulting commit; change-set results bound to exact refs | Decline, severe finding, Home below 7.0, identity mismatch, provider error, stale/session-only result, unattributable output, or unavailable evidence is `BLOCK`. [VERIFIED: HEALTH-01 and CodeScene policy] |
| Product delivery boundary | Immutable reviewed product revision, complete product evidence, rollback result, named-branch identity, and clean scoped checkout | T3 product/repository evidence | Missing product evidence, wrong/detached branch, dirty scoped path, or failed rollback blocks DELIV-01. Passing native verification/validation/security remains a later `$gsd-ship` precondition with no Phase 1 requirement credit. [VERIFIED: REQUIREMENTS.md, native execute-plan ordering, and AGENTS.md] |

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
2. Do not invoke CodeScene before production edits. In the controller-owned final gate, analyze all four baseline blobs from immutable `productionBaseSha` and all four final blobs from immutable `reviewedProductionSha`; retain each complete raw output in an external evidence record bound to the exact ref, blob ID, repository path, invocation time, and tool name. [VERIFIED: CodeScene workflow, HEALTH-01, execution recovery contract]
3. Before T2 staging, require the complete index empty. Stage only the four Approved Surface source paths, require exactly four non-empty cached `M` rows, no other staged path, no unstaged/untracked source, and exactly two approved unstaged test rows. Establish this identity before changed Semgrep/XO and the seven-gate T2 block. In T3 capture `PARENT_HEAD_SHA`, `STAGED_TREE`, full source diff, and four staged blobs, then bind MCP `pre_commit_code_health_safeguard` to that identity. Stage the two tests, require exactly six non-empty cached `M` rows, and commit once through the elevated full hook. Require an empty index afterward and require commit parent/tree plus complete `git diff-tree` rows to equal four approved source and two approved test rows. Before final review, require clean scope and freshly run `analyze_change_set` against `$productionBaseSha`; retain `quality_gates` and `results` with exact baseline and `reviewedProductionSha`. [VERIFIED: CodeScene MCP workflow guidance and single complete-index transaction]
4. At the exact clean `reviewedProductionSha` on `IMPLEMENTATION_BRANCH`, freshly run `code_health_score` and `code_health_review` for every changed source file and bind each complete raw output to that exact commit SHA, analyzed blob ID, repository path, invocation time, and tool name. Compare only these fresh baseline/final pairs. Acceptance requires no file decline, no new severe finding, and `src/components/home/home-dashboard.tsx >= 7.0` because it is a named touched hotspot. No new CodeScene directive is permitted. [VERIFIED: `.codescene/quality-gate-policy.md`]
5. Project/config identifiers and analysis/result IDs are optional metadata: retain them when the provider actually returns them, but never require or invent them. Any provider error or output that cannot be attributed through the external revision/blob/path/time/tool binding is `BLOCK`. [VERIFIED: CodeScene MCP output contract and fail-closed policy]
6. When the repository CLI environment is provisioned, also run the checked-in delta gate with exact immutable refs and retain its complete raw JSON and any view URL actually returned:

```powershell
$env:BASE_REF = $productionBaseSha
$env:HEAD_REF = $reviewedProductionSha
& .\scripts\npm-local.ps1 --% run lint:codescene:changed
```

The current interactive PowerShell environment has no `cs` command and no shell CodeScene token alias. MCP tools are exposed, but their earlier project selection is session-derived only. Missing CLI provisioning is not permission to skip CodeScene: fresh attributable MCP evidence must satisfy the contracts above, or the checked-in CLI prerequisites must be provisioned; if neither produces exact-revision evidence, stop. [VERIFIED: current environment probe and factual audit]

### Phase requirements to test/evidence map

| Requirement | Automated behavior/evidence | File exists? |
|---|---|---|
| FMT-01 | New characterization in Home and session-comparison suites; focused command | Existing files, new test cases required before production edits. [VERIFIED: test inventory] |
| FMT-02 | Focused tests plus exact zero-match deletion searches and diff trace | Tests exist; deletion evidence generated after implementation. [VERIFIED: source inventory] |
| EVID-01 | HEAD/source-tree/index hash record and refreshed Lumen/literal audit on drift | Evidence procedure required before production edits. [VERIFIED: research identity] |
| SLIM-01 | Clean exact-four-file allowlist, virtual Prettier normalization of `$productionBaseSha`/`$reviewedProductionSha` blobs, normalized A/D/net plus hunks, and semantic-hunk audit | Evidence generated from `$productionBaseSha..$reviewedProductionSha`; raw worktree/numstat evidence is insufficient. [VERIFIED: validation design] |
| QUAL-01 | Mutation-sensitive focused tests plus all repository commands | Existing framework/config; cases are Wave 0. [VERIFIED: package/test inventory] |
| HEALTH-01 | Fresh exact-revision CodeScene baseline, staged-identity safeguard, branch analysis, and per-file final review | Score/review outputs carry exact revision/blob/path/time/tool bindings; safeguard evidence carries verified parent/staged-tree/diff/blob/resulting-commit identity; `analyze_change_set` retains `quality_gates` and `results`; prior session values do not count. [VERIFIED: factual audit and CodeScene policy] |
| DELIV-01 | Immutable reviewed-product/named-branch identity, complete product evidence, clean disposable revert proof, and clean scoped state ready to enter native verification/validation/security | Product/repository evidence generated inside execute-plan; later native pass facts receive no Phase 1 requirement credit. [VERIFIED: REQUIREMENTS.md and native execute-plan ordering] |

### Evidence artifacts

- Characterization commit/test-only diff, green focused output, and recorded failing mutation outputs. [VERIFIED: QUAL-01]
- Immutable `PRODUCTION_BASE_SHA`, `PRODUCTION_BASE_SRC_TREE`, four source blob IDs, and `.lumenignore` blob. [VERIFIED: EVID-01/SLIM-01]
- Clean worktree/index/untracked status for four source plus four formatter-input paths, exact four-file committed `M` allowlist, UTF-8-safe normalized `A`, `D`, `A-D`, every normalized hunk, and the separate semantic-hunk mapping. [VERIFIED: FMT-02/SLIM-01]
- Full command outputs tied to `reviewedProductionSha` and `IMPLEMENTATION_BRANCH`. [VERIFIED: QUAL-01]
- Fresh CodeScene pre/post per-file scores/reviews and branch change-set raw outputs externally bound to exact revisions/blobs/paths/invocation times/tool names; pre-commit safeguard raw output with recorded parent SHA, staged tree/name-status/diff/blob IDs, and verified resulting commit/tree; optional returned metadata and any repository delta view URL actually returned. [VERIFIED: HEALTH-01]
- DELIV-01 evidence: complete product evidence, clean disposable revert demonstration, immutable product SHA/tree/config/named-branch bindings, and clean scoped state ready to enter native verification/validation/security. Later pass artifacts are ship preconditions only. [VERIFIED: REQUIREMENTS.md and native workflows]
- Milestone Release Exit evidence, carried externally rather than credited to Phase 1: actual deliverable SHA, applicable exact-head CI/delivery record, updated `main` SHA, and empty final `git status --porcelain=v1 --untracked-files=all`. The normally required independent `@codex` verdict is explicitly waived only for this migration/repair run.

### Wave 0 gaps

- [ ] Add the three exact characterization cases to the two existing test files before any `src/**` edit. [VERIFIED: test inventory]
- [ ] Record immutable production/semantic identities and prove the virtual-normalization procedure on baseline Git blobs without formatting the worktree. [VERIFIED: validation design]
- [ ] Defer both baseline-ref and final-ref CodeScene capture to the controller-owned immutable final gate; prior session values do not count. [VERIFIED: CodeScene scope and execution recovery contract]
- [ ] No framework install, test config, fixture file, or external dependency is required. [VERIFIED: current package/test infrastructure]

### Sampling rate

- **Per test-only characterization checkpoint:** focused Home + session-comparison tests and mutation sensitivity; measure the quick invocation against a <=30-second target and block rather than claim success if it exceeds the target. [VERIFIED: QUAL-01]
- **Candidate stage:** establish the exact four-source staged allowlist, then run focused tests, architecture test, debt self-test, changed Semgrep/XO, lint, and typecheck once. [VERIFIED: AGENTS.md and execution recovery contract]
- **Single final transaction:** bind the staged safeguard, add exactly the two characterized tests, commit exactly six modified paths through one full hook run, then perform LOC/deletion and full immutable-ref CodeScene evidence. [VERIFIED: requirements and execution recovery contract]
- **Phase product gate:** all DELIV-01 product/repository evidence is conjunctively green before entering native verification; unavailable, skipped, stale, detached/wrong-branch, or mismatched-revision evidence is `BLOCK`. Passing verification/validation/security is then mandatory before ship but carries no Phase 1 requirement credit. [VERIFIED: metronome fail-closed policy]

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
| Vitest / Prettier | tests/virtual LOC normalization | Yes | Vitest 4.1.9; Node 24.17.0; Prettier 3.9.5; Tailwind plugin 0.8.0 | Prettier is invoked only through repo-local Node with explicit config/ignore controls and UTF-8 stdin blobs; never `--write` on source. [VERIFIED: lockfile and current CLI] |
| Lumen semantic provider | EVID-01 refresh | MCP exposed; approved rebuild recorded | Ignore-aware approved index 345 files / 2,859 chunks | Explicit rebuilt CLI index or freshly loaded MCP host; otherwise block. [VERIFIED: approved FEATURES research and current tool exposure] |
| CodeScene MCP | HEALTH-01 | Tools exposed; fresh analysis still required | Prior project `82174` is a session-derived lead, not current repository evidence | Retain complete raw results with exact external revision/blob/path/time/tool bindings; provider errors, unattributable output, or unavailable evidence block. [VERIFIED: factual audit] |
| `cs` shell CLI/token | Checked-in `lint:codescene:changed` | No in current PowerShell environment | command/token aliases absent | Use CodeScene MCP exact-revision gates, or provision CLI/token; never skip. [VERIFIED: current environment] |
| Installed Codex agent bake | Native execute-phase routing | Stale at planning time | `init.execute-phase 1` warns that `.planning/config.json` changed after agents were baked | Before the controller invokes execute-phase or dispatches its executor, use `scripts/npm-local.ps1` to run the pinned `@opengsd/gsd-core@1.7.0` `gsd-core --codex --global` installer, rerun native `init.execute-phase 1`, and require the warning absent. This lifecycle/tool install is not a product dependency and receives no requirement credit. [VERIFIED: current native init output, installed `VERSION`, and native update workflow command shape] |

**Missing dependency with no fallback:** none for research or implementation. [VERIFIED: environment audit]

**Missing dependency with fallback:** the shell `cs` entrypoint/token is absent; CodeScene MCP tools are exposed as the required current fallback, but they count only when fresh output is attributable to the exact revisions through the evidence contract above. [VERIFIED: environment audit and factual audit]

## Rollback, Product Readiness, and Native Ship Preconditions

The production change must remain one bounded source refactor with no schema/key/dependency migration. Satisfy DELIV-01 inside execute-plan by reversing only the implementation revision in a clean disposable verification context, running focused tests to prove old behavior is restored, disposing that context, and returning to `IMPLEMENTATION_BRANCH` with its tip equal to immutable `reviewedProductionSha`, complete product evidence, and clean scoped source/formatter inputs. The intended branch must be verified before T3, after T3, and immediately before native closeout; rollback must never detach or move it. This establishes readiness to **enter** native verification, validation, and security. Passing `01-VERIFICATION.md`, current Nyquist `01-VALIDATION.md`, and `01-SECURITY.md` with `threats_open: 0` is separately mandatory before `$gsd-ship` but receives no Phase 1 requirement credit. None of these facts claims that a future PR has been reviewed or merged. [VERIFIED: DELIV-01, Runtime State Inventory, native execute-plan ordering, and native ship gates]

## Milestone Release Exit

The project owner explicitly waived the separate `@codex` PR-review gate for this unusually large migration/repair run. Strict task review, native verification/validation/security, exact-head CI where applicable, merge, and clean synchronized `main` remain required; this one-run waiver does not change the repository default for later work.

This release exit is deliberately external to Phase 1 requirement completion because native execute-plan and phase completion run before `$gsd-ship`. After native ship has made its final post-ship update, resolve the actual deliverable SHA without writing that SHA into a commit that would change it. Require applicable exact-head CI and complete the approved GitHub/direct-main delivery path. Finally require synchronized `main` and an empty `git status --porcelain=v1 --untracked-files=all`. Failed delivery, data/user repair, or dirty updated `main` leaves the Milestone Release Exit open; `verification.status=passed` never substitutes for it.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|---|---|---|
| — | None. All decision-bearing claims are tied to current repository evidence, approved upstream research, or cited official platform documentation. | All | No user confirmation is required for an assumed technical decision. |

## Open Questions

None. Formatter T1/T2 evidence is immutable at `ef98c28`; CAP-03 TDD evidence, final combined-range LOC, and one exact-revision health retry remain execution evidence rather than design questions. Any need to exceed the amended Approved Surface stops for an explicit scope decision rather than triggering rediscovery or an automatic plan loop.

## Project Constraints (from AGENTS.md)

- Native OpenGSD is the sole lifecycle entrypoint; continue the active Phase 1 rather than creating another scheduler or milestone. [VERIFIED: `AGENTS.md`, `STATE.md`, `ROADMAP.md`]
- Read and reconcile `.planning/STATE.md` and `.planning/ROADMAP.md` before routing work. [VERIFIED: `AGENTS.md`]
- Final PR review normally follows the repository `@codex` rule; the project owner explicitly waived it for this one migration/repair run without waiving native verification, security, delivery, or clean-main requirements.
- Before commit, run debt-gate self-test, changed Semgrep, changed XO, lint, typecheck, unit tests, and build through the hook. [VERIFIED: `AGENTS.md`]
- Use repository-local `scripts/npm-local.ps1` when npm is absent from PATH, in the documented npm -> npm.cmd -> PowerShell/pwsh fallback order. [VERIFIED: `AGENTS.md`]
- Do not bypass hooks with `--no-verify` unless the user explicitly requests it. [VERIFIED: `AGENTS.md`]
- Dormant seed promotion rules are not applicable because this milestone selects no dormant product capability and all 32 seeds remain unchanged. [VERIFIED: REQUIREMENTS.md Out of Scope]

## Sources

### Primary (HIGH confidence)

- Research-input commit `19b17b530736d2e51a6a9ee24cfdf6c092fb5b66`, its `src` tree `a53cc5795216a48cbd89b79eccf5805b780c7c08`, the later planning-only HEAD with the same `src` tree, and the exact production/test files cited above. [VERIFIED: git and source inspection]
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
**Valid until:** 2026-08-20, unless the selected product or semantic-index configuration fingerprint changes first. [VERIFIED: EVID-01 freshness rule]
