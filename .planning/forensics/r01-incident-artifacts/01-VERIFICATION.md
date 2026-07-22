---
phase: 01-canonical-practice-presentation-formatting
verified: 2026-07-21T16:54:13Z
status: gaps_found
score: 17/24 must-haves verified
behavior_unverified: 0
overrides_applied: 0
gaps:
  - truth: "[edge:FMT-02/precision] Every production surface introduced by CAP-03 is traceable to its Approved Surface."
    status: failed
    reason: "CAP-03 in RESEARCH.md explicitly excludes domain/service/API/ID-algorithm changes, while reviewed revision 884805f adds parsePracticeGoalDraft and createPracticeGoalId and also changes existing validation/service code. PLAN/receipt record an owner-approved expansion, but the research-owned CAP admission was never updated as required by the Metronome policy."
    artifacts:
      - path: ".planning/phases/01-canonical-practice-presentation-formatting/01-RESEARCH.md"
        issue: "CAP-03 Approved Surface allows only Home, the dashboard hook, two Goals components, and two tests; it says domain/service/API/ID changes are excluded."
      - path: "src/domain/practice/validation.ts"
        issue: "Adds the exported goal-draft parser and changes pre-existing schemas without a matching CAP-03 Approved Surface entry."
      - path: "src/services/practice-goals/service.ts"
        issue: "Adds the exported WebCrypto ID provider and changes four existing service methods without a matching CAP-03 Approved Surface entry."
    missing:
      - "A research-owned CAP-03 admission that names the exact validation/service symbols and allowed incidental hunks, or removal of the unadmitted production changes."
      - "An exact task -> CAP decision -> Approved Surface -> source-hunk mapping for both modified existing owners."
  - truth: "[edge:HEALTH-01/boundary|adjacency|empty|ordering|precision] Final CodeScene evidence proves every changed source against the exact baseline/final path and blob pair with complete attributable provider output."
    status: failed
    reason: "The retained final JSON proves the reviewed/base SHAs, an overall passed change set, final scores, Home 7.97, and two new-file scores, but it does not retain the required complete per-file baseline/final path+blob evidence. In particular, baseline/final pairs for validation.ts and practice-goals/service.ts are absent, blob identities are absent, and the staged safeguard/commit parent-tree equality is not durably demonstrated. DELIV-01 therefore lacks complete product evidence even though rollback and cleanliness passed."
    artifacts:
      - path: ".logs/gsd-observability/r01-home-repair-20260721-01/evidence/codescene-final.json"
        issue: "Contains final scores and summary acceptance booleans, but not complete provider payloads, per-file baseline/final pairs for all six existing sources, blob IDs, or the required identity equality evidence."
      - path: ".logs/gsd-observability/r01-home-repair-20260721-01/verification.jsonl"
        issue: "Compact events retain a safeguard identity and a later staged identity, but no auditable mapping proves the safeguarded production identity equals the committed source tree before final analysis."
    missing:
      - "Complete attributable CodeScene baseline/final evidence for all six modified existing source files and final evidence for both added source files, tied to exact revision, path, blob, invocation time, and provider/tool identity."
      - "Durable staged-safeguard -> commit parent/tree equality evidence for the corrected final candidate."
      - "A refreshed DELIV-01 evidence conclusion after the HEALTH-01 evidence gap is closed."
---

# Phase 1: Canonical Practice Presentation Formatting Verification Report

**Phase Goal:** Musicians retain the exact selected timestamp and duration presentation while Home, the practice-session dashboard, and session comparison use the existing practice formatting boundary as the single canonical owner with less production code.
**Verified:** 2026-07-21T16:54:13Z
**Status:** gaps_found
**Re-verification:** No — initial verification
**Reviewed product revision:** `884805f16d4327e0fa57046f937e38e4f1106540`
**Execution closeout revision:** `519b1eb9d344c6ce7e9ed52cfaeb05cdb294477f`

## Goal Achievement

The runtime presentation outcome is implemented and behaviorally exercised, but the phase cannot pass its evidence-first contract. Functional success does not close the missing CAP admission and final CodeScene attribution.

### Roadmap Success Criteria

| # | Roadmap truth | Status | Evidence |
|---|---|---|---|
| 1 | Exact legacy UTC-minute, fallback, and minute-duration presentation remains across selected surfaces; excluded formatters remain unchanged. | VERIFIED | Canonical implementations are in `src/domain/practice/format.ts`; three exact named behavior tests passed independently. The reviewed range does not modify any sheet-library formatter, and `session-comparison.ts::formatDuration` plus `formatPracticeDuration` retain their seconds/M:SS contracts. |
| 2 | Home, dashboard hook, and comparison use the practice formatting boundary only; seven duplicate bodies/wrappers are absent. | VERIFIED | Seven timestamp calls and three minute-duration calls resolve to the two canonical exports. All seven retired selected symbols are absent; the unrelated recordings-review `formatTimestamp` remains. |
| 3 | Current semantic/dependency/platform selection evidence is revision-bound, adds no dependency, and refreshes on drift. | VERIFIED | Pre-edit evidence records a fingerprint cache hit and immutable source tree/blob identities. `package.json`, `package-lock.json`, formatter inputs, and the practice barrel do not change in `3370d2f..884805f`. The PLAN pin `94bacd...` matches the execution receipt bytes at reviewed revision `884805f`; closeout `519b1eb9` changes only the approved legacy-year wording correction. |
| 4 | Characterization precedes edits; source is net-negative; exact revision passes repository gates and complete CodeScene acceptance. | FAILED | Characterization, mutation-red/restoration, focused tests, normalized net `-142`, and the full hook pass. Complete per-file CodeScene path/blob and baseline/final evidence does not exist for all changed sources. |
| 5 | Immutable reviewed revision has complete product evidence, clean rollback/state, and is ready for native gates. | FAILED | Git rollback and scoped cleanliness pass, and no product/config change occurs after `884805f`. Product evidence is not complete until the CAP and HEALTH evidence gaps close. |

**Roadmap score:** 3/5 success criteria verified.

### Plan Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | FMT-01 boundary thresholds | VERIFIED | Home characterization covers `1`, `59_999`, `60_000`, `119_999`, `3_599_999`, `3_600_000`, `3_660_000`, and a 25-hour value. |
| 2 | FMT-01 empty/fallback handling | VERIFIED | Named Home test covers null, empty, invalid, analytics-invalid, and whitespace-only suffix suppression. |
| 3 | FMT-01 exact legacy encoding | VERIFIED | `getUTCFullYear()` preserves the legacy numeric year token; month/day/hour/minute use `padStart(2, "0")`; named tests prove offset-to-UTC ASCII output. |
| 4 | FMT-01 precision | VERIFIED | Source omits seconds/milliseconds, floors minutes, omits zero remainder, and leaves larger finite hours uncapped. |
| 5 | FMT-01 idempotency | VERIFIED | Both exports are synchronous pure functions over arguments and local constants only; no mutation or ambient state is present. |
| 6 | FMT-01 concurrency independence | VERIFIED | No I/O, timer, locale API, cache, or shared mutable value exists in either formatter. |
| 7 | FMT-02 ten canonical calls/seven retirements | VERIFIED | Exact source search finds seven timestamp and three minute-duration call expressions; all seven selected retired symbols are absent. |
| 8 | FMT-02 excluded adjacency | VERIFIED | The reviewed range preserves seconds-scale comparison formatting, M:SS practice formatting, and all sheet-library paths. |
| 9 | FMT-02 no alternate runtime owner | VERIFIED | No compatibility alias, facade, adapter, feature flag, manifest change, or parallel selected formatter remains. Only the two named Goals files are newly added under `src/**`. |
| 10 | FMT-02 execution ordering | VERIFIED | Historical T1 records green characterization plus four mutation failures and exact source restoration before T2; formatter commit `ef98c287` is atomic. |
| 11 | FMT-02/CAP-03 exact admitted surface | FAILED | Actual validation/service APIs and incidental existing-code edits are outside CAP-03's research-owned Approved Surface. |
| 12 | EVID-01 immutable selection identity | VERIFIED | Preflight records fingerprint cache hit; receipt identities bind baseline source tree and four blobs. Execution-time receipt SHA matches the PLAN pin at `884805f`. |
| 13 | SLIM-01 immutable LOC comparison | VERIFIED | Evidence is bound to `3370d2f..884805f`, exact `6M + 2A`, unchanged formatter inputs, clean reviewed branch, and normalized totals `3648 -> 3506` (`-142`). |
| 14 | QUAL-01 full public characterization | VERIFIED | Exact named tests exercise selected public Home, hook, and comparison seams. |
| 15 | QUAL-01 adjacent/excluded cases | VERIFIED | Adjacent minute thresholds and excluded `0s`, `<1s`, `1m 5s` outputs are asserted. |
| 16 | QUAL-01 invalid/empty seams | VERIFIED | Null, empty, whitespace, invalid date, NaN, infinities, negative, and zero cases are exercised without casts. |
| 17 | QUAL-01 ordered gates and rollback | VERIFIED | Logs retain characterization/restoration, product commits, full gates, final evidence, and disposable rollback in that order. |
| 18 | QUAL-01 command precision | VERIFIED | Corrected hook metadata records no bypass, 67 unit files / 868 tests, lint/XO/typecheck/build/debt pass, and zero Semgrep findings. |
| 19 | HEALTH-01 no decline/severe and Home >= 7 | FAILED | Home `7.97`, added files `10.0`, and overall `quality_gates: passed` are retained, but required baseline/final evidence for every existing changed source is incomplete. |
| 20 | HEALTH-01 exact path/blob adjacency | FAILED | Final JSON names revisions and paths but retains no baseline/final blob pairs and no baseline scores for `validation.ts` or `practice-goals/service.ts`. |
| 21 | HEALTH-01 fail-closed completeness | FAILED | Missing required per-file provider evidence is observable; the PLAN explicitly makes missing/unattributable output blocking. |
| 22 | HEALTH-01 ordering/identity equality | FAILED | Safeguard and commit events are ordered, but no durable evidence proves the safeguarded production identity equals the corrected committed source tree. |
| 23 | HEALTH-01 complete provider precision | FAILED | Final JSON is a curated summary; complete provider output with revision/blob/path/time/tool attribution was not retained. |
| 24 | DELIV-01 complete immutable readiness | FAILED | Reviewed product revision, clean state, rollback, LOC, and hook pass; CAP and HEALTH evidence gaps make the product-evidence set incomplete. |

**Score:** 17/24 plan truths verified (0 present-but-behavior-unverified).

## Required Artifacts

| Artifact | Expected | L1/L2/L3 status | Details |
|---|---|---|---|
| `src/domain/practice/format.ts` | Two canonical formatter exports | VERIFIED | Exists, substantive, exported through existing practice barrel, and used by all selected callers. |
| `src/domain/practice/session-comparison.ts` | Direct UTC-minute caller; local body retired | VERIFIED | Two canonical calls; seconds-scale `formatDuration` remains substantive and separate. |
| `src/hooks/use-practice-session-dashboard.ts` | Direct timestamp/duration callers | VERIFIED | Two timestamp and two duration calls; formats real service comparison candidates. |
| `src/components/home/home-dashboard.tsx` | Direct formatter calls and composition-only Goals ownership | VERIFIED | Three timestamp calls, one duration call, and `<PracticeGoalsPanel data={dashboardData} />`. |
| `src/components/home/practice-goals-panel.tsx` | Goals list/mutation orchestration | VERIFIED | 495 normalized lines, imported and rendered by Home; delegates editor state and real callbacks. |
| `src/components/home/practice-goal-editor.tsx` | Goal draft UI and submission | VERIFIED | 226 normalized lines; parses draft, calls save action, and renders validation/error states. |
| `src/domain/practice/validation.ts` | Goal draft parsing in domain owner | WIRED; CAP GAP | Export is substantive, tested, and called by editor, but is not admitted by RESEARCH CAP-03. |
| `src/services/practice-goals/service.ts` | WebCrypto-only ID creation | WIRED; CAP GAP | Export is substantive, fail-closed, tested, and exposed by dashboard hook, but is not admitted by RESEARCH CAP-03. |
| `tests/unit/home-dashboard.test.tsx` | Home/hook exact presentation characterization | VERIFIED | Both exact named cases exist; each passed independently. |
| `tests/unit/session-comparison.test.ts` | Timestamp and excluded seconds characterization | VERIFIED | Exact named case exists and passed independently. |
| `tests/unit/architecture-boundaries.test.ts` | Goals ownership boundary | VERIFIED | Exact named test exists and passed independently. |
| `tests/unit/practice-goal-repository.test.ts` | Draft parsing/error categories | VERIFIED | Exercises `parsePracticeGoalDraft` across success and validation categories. |
| `tests/unit/practice-goal-service.test.ts` | UUID success/fail-closed behavior | VERIFIED | Exercises native `crypto.randomUUID()` and unavailable-provider failure. |

Automated artifact query: 14/14 declarations exist and are substantive. The two CAP gaps are authorization/traceability failures, not missing or stub files.

## Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `session-comparison.ts` | `format.ts` | direct timestamp import/calls | WIRED | Two calls found. |
| dashboard hook | practice barrel | both canonical imports | WIRED | Four calls found. |
| Home | practice barrel | both canonical imports | WIRED | Four calls found. |
| Home | Goals panel | component composition | WIRED | Real dashboard data is passed. |
| Goals panel | Goal editor | component composition | WIRED | Save and ID callbacks flow through. |
| Goal editor | practice validation | `parsePracticeGoalDraft` | WIRED | Draft result controls submission/error rendering. |
| dashboard hook | goal service | `createPracticeGoalId` | WIRED | Returned as a dashboard action and consumed by editor. |

Automated key-link query: 7/7 patterns verified.

## Data-Flow Trace (Level 4)

| Artifact | Data variable | Source | Produces real data | Status |
|---|---|---|---|---|
| Home analytics/activity | `analytics`, `recentActivity`, continue targets | injected data or `usePracticeSessionDashboard()` | Yes; values flow into canonical calls and rendered JSX | FLOWING |
| Dashboard comparison | service candidates | `browserPracticeSessionService.getSessionComparison()` | Yes; candidates are mapped through canonical formatters | FLOWING |
| Domain comparison | sessions and timestamps | `getSessionComparison()` input | Yes; candidate labels/metrics render canonical timestamps | FLOWING |
| Goals components | `dashboardData` goals/actions | dashboard hook and goal service | Yes; goals, evaluations, save/delete, draft parser, and ID provider are connected | FLOWING; CAP GAP |

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Home timestamp/duration matrix | `npm-local test:unit home-dashboard -t "characterizes selected..."` | 1 passed, 35 skipped, 3.44s | PASS |
| Dashboard-hook candidate formatting | `npm-local test:unit home-dashboard -t "characterizes dashboard-hook..."` | 1 passed, 35 skipped, 3.48s | PASS |
| Domain comparison and seconds exclusion | `npm-local test:unit session-comparison -t "characterizes UTC-minute..."` | 1 passed, 5 skipped, 2.36s | PASS |
| Goals composition boundary | `npm-local test:unit architecture-boundaries -t "keeps Home..."` | 1 passed, 17 skipped, 1.87s | PASS |

The full suite was not rerun. Immutable hook evidence records the one corrected full hook against `884805f`: debt self-test, changed Semgrep, XO, lint, typecheck, 67 unit files / 868 tests, and production build all passed with `hook_bypassed: false`.

## Immutable Evidence Validation

| Evidence | Validation | Status |
|---|---|---|
| Product/closeout identity | `HEAD=519b1eb9`; `884805f` is its product ancestor; `884805f..HEAD` has no `src/**`, `xo.config.js`, manifest, or formatter-input change | PASS |
| Receipt identity | PLAN pin equals SHA-256 `94bacd91...` for the receipt at `884805f`; closeout changes only the approved legacy-year wording | PASS |
| LOC evidence | SHA-256 `DC7A0F4A...`; exact refs, `6M + 2A`, unchanged formatter inputs, `3648 -> 3506`, net `-142`, temp cleanup true | PASS |
| Full hook | Completed event outputs `884805f`; exit 0, no bypass, 868 tests, lint/XO/typecheck/build/debt pass | PASS |
| Rollback | Disposable revert to parent `c7532db8`; index/worktree matched parent, 5 files / 78 tests passed, temp worktree removed, main unchanged | PASS |
| CodeScene | SHA-256 `473029BF...`; correct refs, provider/version, overall pass, final scores, Home `7.97` | FAILED — required complete per-file baseline/final path/blob attribution is absent |

## Probe Execution

No conventional or PLAN-declared `probe-*.sh` exists. The logged LOC verifier is an immutable evidence generator, not a probe; it was inspected and hash-validated rather than rerun because it intentionally requires `HEAD == 884805f`, while the reviewed product now has a documentation-only closeout descendant at `519b1eb9`.

## Requirements Coverage

| Requirement | Source plan | Status | Evidence |
|---|---|---|---|
| FMT-01 | 01-01 | SATISFIED | Exact canonical behavior and fallbacks independently tested. |
| FMT-02 | 01-01 | SATISFIED | One runtime owner, ten calls, seven retirements, no alternate path. |
| EVID-01 | 01-01 | SATISFIED | Formatter selection evidence, fingerprints, receipt-at-reviewed-SHA binding, and zero dependency drift verify. |
| SLIM-01 | 01-01 | SATISFIED | Exact eight-source normalized range is net `-142`, including both added production files. |
| QUAL-01 | 01-01 | SATISFIED | Characterization/mutations precede edits; focused checks and immutable full hook pass. |
| HEALTH-01 | 01-01 | BLOCKED | Numeric outcome is favorable, but required complete per-file provider evidence is not retained. |
| DELIV-01 | 01-01 | BLOCKED | Revision/rollback/cleanliness pass; complete product evidence does not. |

All seven PLAN requirement IDs exist in `REQUIREMENTS.md`, all seven map to Phase 1, and there are no orphaned Phase 1 requirements.

## Anti-Patterns Found

| File/evidence | Pattern | Severity | Impact |
|---|---|---|---|
| `01-RESEARCH.md` vs reviewed production diff | Production API/owner changes outside CAP-03 Approved Surface | BLOCKER | Violates the repository's fail-closed task -> CAP -> Approved Surface traceability contract. |
| `codescene-final.json` | Curated acceptance summary without complete per-file baseline/final identity evidence | BLOCKER | HEALTH-01 and complete DELIV-01 evidence cannot be independently audited. |
| Modified product/config files | `TBD`, `FIXME`, `XXX`, `TODO`, `HACK`, placeholder, console-only implementation | NONE | No debt-marker blocker or product stub found. Conditional `return null` branches are normal rendering/helper behavior, not stubs. |

## Review Adjudication

`01-REVIEW.md` records zero phase-introduced findings. Its five observations are durable pre-existing behavior at baseline `3370d2f`, and semantic preservation is the approved R01 boundary:

| Observation | Classification for this phase |
|---|---|
| Core dashboard reads can reject the aggregate refresh | Pre-existing critical observation; unchanged and outside selected formatting scope |
| Years below 1000 are not four-digit padded | Pre-existing contract debt; closeout corrected the overclaim to exact legacy numeric-year preservation |
| Session label replacement targets the first delimiter | Pre-existing warning; unchanged |
| Stale save can close a newer editor | Pre-existing warning; behavior moved without semantic change |
| Stale delete completion/error can affect another goal | Pre-existing warning; behavior moved without semantic change |

These observations remain future work. Treating them as Phase 1 blockers would require changing the approved semantic-preservation boundary and would be scope drift.

## Human Verification Required

None. The exact user-visible formatting contract is covered by named behavioral tests. The remaining blockers require durable technical evidence and CAP traceability, not visual or subjective human judgment.

## Gaps Summary

Two grouped concerns block goal acceptance:

1. The reviewed implementation exceeds CAP-03's research-owned Approved Surface. Later owner-approved PLAN/receipt text does not satisfy the repository policy's required CAP re-admission and exact hunk traceability.
2. CodeScene outcomes are numerically favorable, but the retained evidence is not the complete exact-revision/path/blob provider record required by the PLAN. HEALTH-01 and therefore DELIV-01 remain open.

No later phase exists in this milestone, so neither gap is deferred.

---

_Verified: 2026-07-21T16:54:13Z_
_Verifier: the agent (gsd-verifier)_
