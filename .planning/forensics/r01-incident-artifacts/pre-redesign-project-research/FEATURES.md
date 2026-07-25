# Feature Research: Evidence-First Code Slimming Candidates

**Domain:** Behavior-preserving maintenance refactor discovery
**Researched:** 2026-07-21
**Baseline:** current `main` at `6c0089b9cac378214ff4f4ecdbe2f3f5b42c81a4`
**Confidence:** MEDIUM overall; HIGH for the exact overlaps below and HIGH that Lumen independently surfaced Candidate 1, MEDIUM for ecosystem-wide coverage because semantic ranking is discovery evidence rather than proof of equivalence or an exhaustive scan

## Search Method and Evidence Quality

Application-code discovery's final configuration uses Lumen's native `.lumenignore` to exclude `.planning/`, `.semgrep/`, and `docs/legacy/`. These native index exclusions keep current-code discovery independent from generated planning, scanner state, frozen history, and the rerun loops those paths can cause; they are not a custom wrapper or post-query filtering mechanism.

Ollama `0.32.1` was healthy at `127.0.0.1:11434` with model `ordis/jina-embeddings-v2-base-code`, and a direct embedding request succeeded with a 768-dimensional vector. After the native ignores were added, an explicit CLI rebuild indexed 345 files into 2,859 chunks in 28.059 seconds. This code-focused CLI rebuild is the authoritative final index for the research.

A CLI semantic query against that rebuilt index ranked `src/components/home/home-dashboard.tsx::formatActivityTime+formatAnalyticsDuration+formatAnalyticsTimestamp` first at `0.85`, the hook formatter group second at `0.81`, and `src/domain/practice/session-comparison.ts::formatTimestamp` third at `0.68`. It returned no `.planning/`, `docs/legacy/`, or `.semgrep/` results. The independent ranking therefore surfaced all three production locations containing Candidate 1's strongest UTC/minute-formatting overlap without planning, historical, or scanner contamination.

For pre-ignore diagnostic history only, an earlier broad run indexed 603 files into 8,440 chunks. Its first natural-language query ranked `src/hooks/use-practice-session-dashboard.ts::formatSessionComparisonTimestamp` at `0.69` and `src/domain/practice/session-comparison.ts::formatTimestamp` at `0.68`; a source-oriented follow-up ranked the Home formatter group at `0.88`, the hook formatter group at `0.80`, and the domain formatter at `0.73`. That run confirmed provider health and the same candidate family, but its counts and rankings are not the final code-focused configuration.

The long-lived MCP process retained its prior cached database and reported 349 files and 2,877 chunks. It needs a host restart before its status can reflect the native-ignore rebuild, so that cached MCP status is not final index evidence; the explicit CLI rebuild and query above are authoritative.

On Windows, restricting the semantic query with an absolute `src` path returned no results even though project-index queries returned the ranked `src/**` hits above. Semantic evidence admission must therefore normalize the returned paths and retain only repository-relative paths under `src/`; it must not rely on Lumen's absolute-path subtree filter. A no-result response from that filter is not negative evidence about the indexed source.

An earlier fallback graph was used only to locate possible symbol names while the embedding provider was unavailable. It had no embeddings and was last updated on 2026-07-04, so no conclusion below relies on it. Every serious candidate was re-established against files and tests in the current checkout through exact reads and literal symbol searches. No experimental `C:\tmp` worktree or superseded R01 artifact was inspected or used.

The result is intentionally a shortlist, not a claim that every duplicate in the repository was found. Candidate-level confidence is high where current functions are byte-for-byte or behavior-for-behavior equivalent. Ecosystem-wide completeness remains medium because semantic similarity ranks useful discovery leads but does not itself establish exact contracts or prove that the search is exhaustive.

## Maintenance Table Stakes

| Required behavior | Why non-negotiable | Verification consequence |
|---|---|---|
| Preserve exact user-visible text | UTC timestamps, duration labels, and fallback wording are asserted by UI/domain tests | Shared formatters need direct boundary tests plus the existing Home and comparison suites |
| Preserve null/blank normalization | Blank IDs change target state, grouping, and whether recordings remain selectable | The canonical string helper must keep `unknown -> string \| null`, trim only outer whitespace, and preserve case/internal whitespace |
| Preserve ID shape and injection seams | Prefixes are observable and service factories accept deterministic ID factories in tests | A shared ID factory may replace defaults only; injected `createId` options must remain unchanged |
| Delete all copies inside the selected boundary | Leaving a second local implementation creates the parallel abstraction this milestone forbids | Selection must name the exact copies to remove and the single canonical owner |
| Finish net-negative in production LOC | This milestone validates code slimming, not merely rearrangement | Count deleted and added `src/**` lines before implementation and again on the final diff |
| Keep validated capabilities unchanged | This is maintenance, not a product requirement | Existing unit suites are regression gates; any intentional text or compatibility change vetoes the candidate |

## Serious Candidate 1: Canonical Practice Presentation Formatting

**Recommendation:** strongest candidate. Extend the existing canonical module `src/domain/practice/format.ts`, already exported by `src/domain/practice/index.ts` and already reused by recordings review and practice status. Add one fixed UTC-minute formatter with a caller-supplied invalid fallback, and one minute-scale practice-duration formatter. Delete the local copies; do not introduce a second formatting module.

### Exact semantic overlap

| Current symbol | File | Current behavior | Current callers / evidence |
|---|---|---|---|
| `formatSessionComparisonTimestamp` | `src/hooks/use-practice-session-dashboard.ts:638` | Nullable ISO input; invalid becomes `Unknown time`; valid becomes `YYYY-MM-DD HH:mm UTC` using UTC fields | Candidate projection at lines 530-531; exact rendered timestamps in `tests/unit/home-dashboard.test.tsx:192-195,428-461` |
| `formatActivityTime` | `src/components/home/home-dashboard.tsx:1450` | Same nullable input, invalid fallback, UTC fields, and output | Recent activity at lines 1243 and 1335; invalid contract at `tests/unit/home-dashboard.test.tsx:1059-1073` |
| `formatAnalyticsTimestamp` | `src/components/home/home-dashboard.tsx:1491` | Same valid UTC formatting; invalid fallback is `Unknown update time` rather than `Unknown time` | Analytics generated-at text at line 1049; exact output at `tests/unit/home-dashboard.test.tsx:541-574,1408-1422` |
| `formatTimestamp` | `src/domain/practice/session-comparison.ts:487` | Same nullable input, `Unknown time`, UTC fields, and output | Candidate labels and metric values at lines 273 and 360; exact label at `tests/unit/session-comparison.test.ts:259-267` |
| `formatSessionComparisonDuration` | `src/hooks/use-practice-session-dashboard.ts:611` | Non-finite or non-positive -> `0 min`; below one minute -> `<1 min`; otherwise floor minutes and render `min` or `hr ... min` | Candidate projection at line 532 and goal progress at line 605 |
| `formatAnalyticsDuration` | `src/components/home/home-dashboard.tsx:1470` | Behavior-for-behavior identical to `formatSessionComparisonDuration` | Analytics total at line 1023; boundary coverage at `tests/unit/home-dashboard.test.tsx:370-384,541-573,625-650` |
| `formatSessionComparisonMinutes` | `src/hooks/use-practice-session-dashboard.ts:632` | A no-op wrapper around `formatSessionComparisonDuration`; both branches return the same text | Goal-progress call at line 605 |

The four UTC implementations occupy about 72 production lines. The two identical minute-duration implementations plus the no-op wrapper occupy about 45. A canonical pair in the already-existing `src/domain/practice/format.ts` should require roughly 39-42 lines plus approximately 3-6 import/glue lines. Expected effect: **about 117 lines retired, 42-48 added, net -69 to -75 production LOC**.

### Differences that must remain explicit

- `formatAnalyticsTimestamp` needs its distinct `Unknown update time` fallback. The canonical function should accept the fallback rather than silently standardize wording.
- `src/domain/practice/session-comparison.ts:507` is a seconds-scale duration formatter (`0s`, `<1s`, `Xm Ys`) and is not part of this consolidation.
- `src/components/sheet-library/sheet-library-experience.tsx:103` rounds minutes and maps zero/invalid values to `<1 min`; the dashboard formatter floors minutes and maps zero/invalid values to `0 min`. It must stay separate.
- `Intl.DateTimeFormat` is not a behavior-preserving substitute for the exact fixed string. MDN documents that formatted output may vary across implementations even for the same locale. Reuse the current deterministic UTC-field algorithm in one place.

### Required tests if selected

- Add direct unit coverage for the canonical timestamp helper: null, invalid input, zero-padding, UTC conversion, and both fallback labels.
- Add direct unit coverage for the canonical minute duration helper: non-finite, negative, zero, 1-59,999 ms, 60 minutes, and hour-plus-minute boundaries.
- Retain `tests/unit/home-dashboard.test.tsx`, `tests/unit/session-comparison.test.ts`, and the unit/type/build gates. These already assert the most important visible strings.

**Confidence:** HIGH for semantic duplication and the LOC direction; MEDIUM-HIGH for implementation risk because the current contracts are mostly indirect UI assertions.

## Serious Candidate 2: One Trimmed Non-Empty String Normalizer

**Recommendation:** strong alternative. Promote the already-used `normalizeRequiredString` implementation to a neutral leaf boundary and remove every null-returning duplicate in the selected scope. Do not make practice-domain code import a recordings-review-specific module, and do not leave both old and new helper modules alive.

### Exact semantic overlap

All functions below accept `unknown`, return `null` for non-strings, trim outer whitespace, return `null` for an empty trimmed value, and otherwise return the trimmed string:

| Symbol | File | Current use |
|---|---|---|
| `normalizeRequiredString` (existing reusable implementation) | `src/lib/recordings-review/string-normalization.ts:1` | Imported by waveform comparison, take selection, take grouping, and recording organization modules |
| `requiredString` | `src/domain/practice/recent-activity.ts:374` | Session/recording IDs, sheet IDs/names, and segment IDs/names |
| `requiredString` | `src/domain/practice/session-comparison.ts:559` | Session selection, recording links, target IDs/names |
| `normalizeRequiredString` | `src/domain/practice/session-history-groups.ts:332` | Sheet/segment group identities and labels |
| `normalizeOptionalDisplayString` | `src/lib/recordings-review/take-groups.ts:211` | Snapshot sheet/segment display names; identical behavior despite the display-oriented name |
| `normalizeOptionalString` | `src/lib/recordings-review/take-selection-metadata.ts:233` | A redundant wrapper; the existing helper already maps null/undefined to null |

The four local function bodies account for approximately 36 production lines, and the redundant optional wrapper accounts for another 7. Retaining/moving the existing 9-line implementation and adding roughly 3-4 new imports should produce **about 43 lines retired, 3-5 added, net -38 to -40 production LOC**. Import-path changes for existing callers should be LOC-neutral.

### Current contract evidence

- `tests/unit/home-recent-activity-source.test.ts:258-326` proves blank IDs become `no-target` rather than valid targets.
- `tests/unit/session-comparison.test.ts:180-205,309-388` proves selected IDs are sanitized/deduplicated and a whitespace-only sheet ID becomes `no-target`.
- `tests/unit/recordings-review-take-groups.test.ts:144-185,221-248` proves whitespace-only segment/sheet IDs normalize into the no-segment or ungrouped paths.
- `tests/unit/recordings-review-history.test.ts:216-297` covers normalized sheet filtering.
- `tests/unit/recordings-review-repository.test.ts:367-454` covers normalized take-selection metadata through persistence.

### Differences and vetoes

- `src/infrastructure/db/recording-artifact-repository.ts:49` is not equivalent: it accepts a statically typed string and throws a label-specific error on blank input. It must not use the null-returning helper without an explicit adapter, which would erase the LOC benefit.
- Zod preprocessors in practice segments and metronome presets carry schema errors, maximum lengths, and field-specific types. They are validation policy, not the same normalization primitive.
- `normalizeReferenceTitle` collapses internal whitespace, truncates to 180 characters, and supplies a fallback; it is deliberately different.
- Zod 4 can express trim/min/safe-parse, but wrapping this tiny helper in a schema would add machinery without stronger LOC or behavior evidence. Prefer the existing imperative implementation.

If selected, add one direct shared-helper test covering non-string, blank, outer whitespace, internal whitespace, and case preservation, then retain all suites listed above.

**Confidence:** HIGH for equivalence; MEDIUM-HIGH for boundary choice because the current reusable module is recordings-review-specific and must be promoted without creating another parallel utility.

## Serious Candidate 3: Shared Local ID Factory

**Recommendation:** viable but lower-ranked. Seven functions repeat the same UUID-or-fallback algorithm:

- `createId` — `src/lib/quick-metronome/session.ts:4`
- `createDefaultId` — `src/services/reference/service.ts:31`
- `createDefaultId` — `src/services/practice-session/service.ts:61`
- `createSheetId` — `src/services/sheet-library/service.ts:30`
- `createDefaultPresetId` — `src/services/sheet-metronome-presets/service.ts:30`
- `createMarkerId` — `src/lib/recordings-review/error-markers.ts:52`
- `createSegmentId` — `src/components/sheet-practice/segments/practice-segment-selector-panel.tsx:236`

Each uses a prefix, `crypto.randomUUID()` when available, and `${prefix}_${Date.now()}_${randomSuffix}` otherwise. The copies occupy about 49 production lines. One neutral 7-9 line factory plus seven imports would likely yield **about 49 lines retired, 14-18 added, net -31 to -35 production LOC**.

Important differences are manageable but must be contractual: service-level `createId` injection remains; hard-coded prefixes remain exactly `recording_`, `sheet_`, `preset_`, `marker_`, and `segment_`; `globalThis.crypto` should be used consistently; and the non-UUID fallback remains because `randomUUID()` availability is checked today. MDN confirms that `randomUUID()` only returns a bare 36-character v4 UUID and is a secure-context API; it does not supply project prefixes or the current fallback.

Existing evidence is weaker than for candidates 1-2. `tests/unit/quick-metronome-session.test.ts:113-125` asserts `recording_`; `tests/unit/practice-segment-selector.test.tsx:255-285` asserts `segment_`; service tests heavily exercise injected deterministic factories. There is no direct test that forces both the UUID and fallback branches across all prefixes. Those tests are required before consolidation.

`createDefaultPracticeGoalId` at `src/components/home/home-dashboard.tsx:1515` is excluded: its UUID branch is deliberately unprefixed and its fallback uses `local-goal-...` with hyphens. Folding it into the same call without an explicit mode would change observable ID shape or complicate the helper.

**Confidence:** MEDIUM. The duplication is real, but the shared boundary is cross-layer and the fallback branch is under-tested.

## Serious Candidate 4: Reuse `formatPracticeDuration` in Reference Summary

`src/components/sheet-practice/reference/reference-panel.tsx:49` duplicates `src/domain/practice/format.ts:1` for millisecond-to-`M:SS` display. Both clamp zero/negative values to `0:00`, round to seconds, permit minutes greater than 59, and zero-pad seconds. The domain implementation is already reused by recordings review and the practice status panel.

Replacing the local 7-line helper with one import should yield **about 7 lines retired, 1-3 added, net -4 to -6 production LOC**. `tests/unit/recordings-review-history.test.ts:306-310` directly covers the canonical helper, but `tests/unit/reference-panel.test.tsx` does not assert the rendered `fileName · duration` summary. Add that assertion before deleting the local function.

This is the safest candidate but probably too small to be the strongest demonstration of the milestone's evidence-first slimming workflow.

**Confidence:** HIGH for equivalence and low risk; LOW-MEDIUM for milestone value because the LOC reduction is tiny.

## Candidate Dependencies and Selection Contract

```text
Current-main exact behavior evidence
    -> choose exactly one candidate boundary
        -> add direct canonical-helper contract tests
            -> redirect all callers inside that boundary
                -> delete every superseded copy
                    -> verify net-negative src/** LOC and full repository gates
```

- Candidate 1 has an existing canonical owner (`src/domain/practice/format.ts`) and the best ratio of retired logic to glue.
- Candidate 2 must settle the neutral ownership path before coding; moving the existing helper is acceptable, creating a second helper is not.
- Candidate 3 must first add deterministic UUID/fallback branch tests and keep all dependency-injection seams.
- Candidate 4 needs one missing reference-summary assertion but otherwise has no architectural prerequisite.

## Explicit No-Go Findings

| Apparent similarity | Classification | Why it is not a safe target |
|---|---|---|
| The four other functions named `formatDuration` | Coincidental name similarity across different contracts | Recordings/reference formatting uses milliseconds -> `M:SS`; recent activity uses `ms`/`s`/`m`; session comparison uses `<1s` and `Xm Ys`; Bilibili accepts either an already-formatted string or numeric seconds. Direct reuse changes units and boundary text. |
| `formatTimestamp` in recordings review vs UTC timestamp formatters | Coincidental name similarity | Recordings review formats a media offset as `M:SS`; comparison/dashboard functions format an absolute ISO instant as UTC date/time. |
| `parseTimeSignature` vs `normalizeTimeSignature` | Coincidental normalization wording | Quick metronome parsing accepts only supported values and falls back to the default meter; take-history normalization accepts any non-empty trimmed string and returns null otherwise. |
| Recording-artifact `normalizeRequiredString` vs null-returning string helpers | Real shared trimming step, different failure contract | The repository version throws a field-specific error and must remain fail-closed before writes. |
| Zod practice field preprocessors vs generic string normalization | Real shared trimming step, additional domain policy | Schemas enforce nullability, max length, structured errors, and field types. Replacing them with a generic helper would weaken validation. |
| Seven newest-first numeric comparator copies | Real low-level duplication, poor milestone target | The algorithm is only one decision line; a repository-wide generic comparator would couple practice and recordings domains for modest meaningful-code retirement. Keep as a later micro-cleanup unless a natural shared sort boundary already emerges. |
| `Intl.DateTimeFormat` as a replacement for fixed UTC text | API overlap, not exact output equivalence | Specification-permitted implementation/locale variation conflicts with hard-coded UI expectations. Consolidate the deterministic internal formatter instead. |
| `crypto.randomUUID()` alone as the ID refactor | Partial API overlap | It does not preserve prefixes or the current unavailable-API fallback, and it is limited to secure contexts. |

## Sources

### Current-main primary evidence

- Production symbols cited above under `src/**`, inspected at `main` commit `6c0089b9cac378214ff4f4ecdbe2f3f5b42c81a4`.
- Contract tests cited above under `tests/unit/**`.
- Native `.lumenignore`: excludes `.planning/`, `.semgrep/`, and `docs/legacy/` from the Lumen index without a custom wrapper.
- Final local Lumen evidence: healthy Ollama `0.32.1` plus `ordis/jina-embeddings-v2-base-code`, a successful 768-dimensional direct embedding, and an explicit CLI rebuild of 345 files into 2,859 chunks in 28.059 seconds; its formatter query ranked the Home, hook, and domain groups at `0.85`, `0.81`, and `0.68` with no ignored-area results.
- `package.json` and lockfile v3: 17 runtime and 23 development dependencies; relevant installed evidence includes Zod `4.4.3`.

### Authoritative API evidence

- [MDN: Intl.DateTimeFormat.prototype.format](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/format) — output variation is specification-permitted; MEDIUM confidence through the research confidence seam.
- [MDN: Crypto.randomUUID](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID) — bare v4 UUID return and secure-context constraint; MEDIUM confidence through the research confidence seam.
- [Zod 4: Basic usage](https://zod.dev/basics), [Zod API](https://zod.dev/api) — trim/min/safe-parse capability; MEDIUM confidence through official-doc fallback because Context7 was unavailable.

## Ranked Candidate Table

| Rank | Candidate | Existing reuse point | Approx. production LOC retired / added / net | Contract evidence | Confidence | Selection guidance |
|---:|---|---|---:|---|---|---|
| 1 | Canonical UTC-minute and minute-duration practice formatting | `src/domain/practice/format.ts` and its existing barrel export | `117 / 42-48 / -69 to -75` | Exact Home UI strings, duration boundaries, invalid-time fallback, session-comparison label | HIGH | **Best R01 target:** bounded to one existing formatting boundary, largest clear reduction, no product behavior change required |
| 2 | One trimmed non-empty string normalizer | Existing `normalizeRequiredString`, promoted to a neutral leaf | `43 / 3-5 / -38 to -40` | Blank-target, grouping, selection, filtering, and persistence tests | HIGH | Strong alternative; select only if ownership is resolved up front and all null-returning copies in scope are deleted |
| 3 | Shared prefixed local ID factory | One of the existing prefix-aware UUID/fallback implementations promoted to a neutral leaf | `49 / 14-18 / -31 to -35` | Prefix assertions and injected factories; fallback branch lacks direct coverage | MEDIUM | Viable after branch-contract tests; exclude practice-goal IDs |
| 4 | Reference summary reuses `formatPracticeDuration` | `src/domain/practice/format.ts:formatPracticeDuration` | `7 / 1-3 / -4 to -6` | Canonical helper tests; reference summary assertion missing | HIGH equivalence | Safest fallback, but likely too small to demonstrate the intended milestone rigor |
