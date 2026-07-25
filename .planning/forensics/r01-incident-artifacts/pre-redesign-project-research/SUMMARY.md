# Project Research Summary

**Project:** Metronome v1.1 R01 Evidence-First Code Slimming  
**Domain:** Behavior-preserving maintenance refactor for a local-first Next.js application  
**Researched:** 2026-07-21  
**Confidence:** MEDIUM

## Executive Summary

Metronome v1.1 is not a new product feature or another workflow experiment. It is one bounded maintenance milestone that must prove the native OpenGSD lifecycle can discover, plan, implement, verify, review, merge, and close a real reuse-first code-slimming change. Combined research approves exactly one target for roadmap selection: consolidate the existing Home, dashboard-hook, and practice-domain UTC-minute timestamp and minute-scale duration implementations into the existing practice formatting boundary. This target has the clearest exact duplication, the strongest semantic-search corroboration, no persistence or browser-resource risk, no new dependency, and the largest credible production-code reduction: approximately 117 lines retired, 42–48 added, for an estimated net reduction of 69–75 production lines.

The target reuses the existing `src/domain/practice/format.ts` owner rather than adding a utility, wrapper, or compatibility layer. Authoritative platform research does not identify an external formatter that preserves the current fixed ASCII output contract: `Intl.DateTimeFormat` is locale- and implementation-sensitive, so adopting it would risk changing visible text. The correct reuse decision is therefore internal consolidation after checking installed dependencies and authoritative OSS/platform APIs—not forcing an OSS dependency where its semantics differ. The existing stack remains unchanged.

This is approval to plan the target, not evidence that implementation is complete. Pre-change characterization, an exact deletion map and LOC baseline, atomic removal of every duplicate in scope, full repository gates, post-change CodeScene analysis, independent review, and a demonstrated version-control rollback all remain fail-closed obligations inside the same future Phase 1. No separate evidence-recovery phase, stage, or experiment rerun is warranted.

## Selection Decision

**Approved for roadmap selection:** **Candidate 1 — canonical UTC-minute timestamp and minute-scale practice-duration formatting consolidation.**

**Existing owner to retain and extend:** the practice formatting boundary in `src/domain/practice/format.ts`, already exported through the practice domain and already used by multiple presentation flows.

**Existing callers and duplicate owners to migrate:** the current formatting logic in the Home dashboard component, the practice-session dashboard hook, and the session-comparison domain flow. These are existing production locations; this research does not create or modify them.

**Approval boundary:** the evidence admits this target into planning only. Coding must not begin until Phase 1 records and passes its pre-change characterization and deletion-map gates.

| Existing symbol | Required Phase 1 disposition |
|---|---|
| `formatSessionComparisonTimestamp` | Redirect callers to the canonical timestamp owner, then delete the duplicate body |
| `formatActivityTime` | Redirect callers to the canonical timestamp owner, then delete the duplicate body |
| `formatAnalyticsTimestamp` | Redirect callers while passing `Unknown update time`, then delete the duplicate body |
| Session-comparison `formatTimestamp` | Redirect its domain callers to the canonical practice-format owner, then delete the local body |
| `formatSessionComparisonDuration` | Redirect callers to the canonical minute-duration owner, then delete the duplicate body |
| `formatAnalyticsDuration` | Redirect callers to the canonical minute-duration owner, then delete the duplicate body |
| `formatSessionComparisonMinutes` | Delete the no-op wrapper after redirecting its caller |

### Behavior Contract

| Concern | Behavior that must remain exact |
|---|---|
| Valid timestamp | Deterministic `YYYY-MM-DD HH:mm UTC`, assembled from UTC fields with zero padding |
| General invalid or absent timestamp | `Unknown time` |
| Analytics invalid or absent timestamp | `Unknown update time` |
| Non-finite, negative, or zero minute-scale duration | `0 min` |
| Positive duration below one minute | `<1 min` |
| Minute/hour duration | Current floor-to-minute `N min` or `N hr M min` wording |

The canonical timestamp function must preserve the caller-selected invalid fallback; it must not standardize the two fallback labels. The seconds-scale session-comparison duration formatter (`0s`, `<1s`, `Xm Ys`) is outside this target. The sheet-library duration formatter is also outside this target because it rounds differently and maps zero/invalid input to `<1 min`. Similar names are not evidence of equivalent semantics.

## Key Findings

### Stack and Reuse Decision

Keep the current application stack and add no dependency. Relevant installed capabilities were inspected at their locked versions, including Next.js 16.2.9, React 19.2.7, Dexie 4.4.4, Zod 4.4.3, Zustand 5.0.14, and the transitive `dequal` 2.0.3 package. The stack research identified credible alternatives—most notably a small Dexie `Collection.modify` substitution and a possible direct `dequal/lite` dependency—but neither should be selected for R01:

- The Dexie change is an estimated net reduction of only about 10 production lines and adds persistence-specific characterization and rollback risk.
- Promoting `dequal` to a direct dependency would add ownership, bundle, and maintenance cost for a smaller retirement than the selected target.
- React hydration and other installed-API overlaps are either smaller or have observable timing gaps.
- No dependency API replaces the selected fixed presentation contract exactly.

`Intl.DateTimeFormat` was specifically evaluated and rejected as the implementation for this target. Its output can vary by locale and implementation, while current tests and UI behavior require fixed punctuation, ordering, digits, timezone text, and fallback wording. Reconstructing the exact output with `formatToParts` would preserve custom glue rather than retire it. Consolidating the existing deterministic algorithm into one existing owner is both the smallest and the most behavior-faithful solution.

The source research contains an intentional disagreement: stack-only ranking preferred the low-risk Dexie substitution, while feature and architecture research favored the formatter family. Cross-research synthesis resolves it in favor of the formatter target because it is independently surfaced by semantic search, has direct literal and test evidence, is named by CodeScene duplication findings, avoids persistence semantics, requires no dependency, and offers a materially larger deletion.

### Required Outcome

**Must have:**

- One canonical existing owner and zero surviving duplicate formatter bodies within the selected boundary.
- Exact preservation of valid output, invalid fallbacks, UTC semantics, rounding, and duration wording.
- Strictly net-negative formatted production LOC under `src/**`; tests and planning files do not count as deletion credit.
- No new production module, dependency, compatibility alias, feature flag, or parallel runtime path.
- Repository lint, typecheck, unit, build, architecture, and debt gates all passing on the reviewed revision.
- CodeScene evidence for the exact post-change revision with no changed-source decline or new severe finding and all applicable policy thresholds satisfied.
- Independent review, clean version-control rollback, merge, and a clean updated `main`.

**Useful differentiators:**

- Direct contract tests at the canonical formatter boundary, rather than relying only on UI snapshots.
- A deletion map proving that each retired function and distinctive branch has no remaining production caller or equivalent copy.
- Fresh semantic evidence tied to the selection HEAD whenever code or index configuration changes.

**Explicitly deferred or excluded:**

- String-normalizer, ID-factory, reference-duration, Dexie, deep-equality, hydration, music-library, storage, and media/browser refactors.
- Seconds-scale duration output and sheet-library duration output.
- New shared/common utilities, generic formatting frameworks, storage abstractions, or lifecycle overlays.

### Architecture Approach

The selected change stays within the existing dependency direction:

1. **Practice formatting domain boundary** — owns the canonical pure timestamp and minute-duration formatting behavior.
2. **Session-comparison domain flow** — consumes the canonical formatting behavior without changing comparison policy or data shape.
3. **Practice-session dashboard hook** — maps existing service/domain data to Home view models and no longer owns duplicate formatting bodies.
4. **Home dashboard component** — renders the same strings and supplies the analytics-specific invalid fallback without owning another algorithm.
5. **Verification boundaries** — characterize exact strings, enforce architecture/debt gates, measure production LOC, and compare CodeScene before/after.

No service contract, repository, IndexedDB schema, localStorage key, event model, browser adapter, or local-first ownership boundary changes. Rollback remains a bounded source revert with no data migration or user repair.

### Semantic Discovery Evidence

The authoritative Lumen evidence comes from the explicit CLI rebuild after the root `.lumenignore` excluded `.planning/`, `.semgrep/`, and `docs/legacy/`. That rebuild indexed **345 files into 2,859 chunks in 28.059 seconds**. The formatter query ranked the Home formatter group at **0.85**, the dashboard-hook formatter group at **0.81**, and the domain timestamp owner at **0.68**, with no ignored-area results.

The earlier 603-file / 8,440-chunk run is pre-ignore diagnostic history only. The long-lived MCP process retained a stale 349-file / 2,877-chunk cache after the ignore change and is not authoritative. After any ignore-rule change, only an explicit rebuilt CLI index or a freshly loaded MCP host is admissible; a changed selection HEAD also requires freshness to be re-established.

### CodeScene Evidence

Local CodeScene is available: installation verification passed **5 of 5** checks. Recorded current-main baselines are Home dashboard **6.46**, dashboard hook **8.11**, session comparison **8.54**, practice validation **9.38**, session events **9.09**, sheet metronome presets **9.38**, and reference repository **10.0**. The detailed Home review identifies Code Duplication in the existing `formatActivityTime` range at lines 1450–1468 and `formatAnalyticsTimestamp` range at lines 1491–1505.

These are admission and baseline facts, not terminal success. The exact implementation revision still needs per-file post-change analysis and policy comparison. Earlier architecture notes that described Lumen or CodeScene as unavailable predate the final tool refresh; the refreshed feature and pitfall evidence above supersedes those availability statements without erasing their historical context.

### Critical Pitfalls

1. **Treating a platform primitive as product policy** — lock the exact output matrix first; reject `Intl` or any library behavior that changes punctuation, timezone text, fallbacks, or rounding.
2. **Keeping the wheel behind a new facade** — use the existing domain boundary, delete every equivalent body in scope, and reject aliases, wrappers, flags, or fallback paths.
3. **Counting movement as slimming** — measure formatted additions and deletions only in tracked production files, inspect whitespace-insensitive diffs, and give no credit for tests, planning, generated files, or renames.
4. **Using stale discovery evidence** — bind selection to the current HEAD and the authoritative ignore-aware index; rebuild or reload whenever freshness changes.
5. **Equating green default gates with completion** — require direct characterization, exact LOC, post-change CodeScene, review, and rollback in addition to lint, unit tests, typecheck, and build.

## Implications for Roadmap

### Phase 1: Canonical Practice Presentation Formatting

**Rationale:** All decisive evidence converges on one existing pure-function boundary. It offers the largest credible net deletion, avoids external dependency and persistence risk, and directly addresses CodeScene duplication in a low-Code-Health Home hotspot. Splitting discovery, characterization, implementation, and verification into separate phases would recreate the process overhead this milestone is meant to test and would falsely suggest the target is already implementation-ready.

**Delivers:** One canonical UTC-minute timestamp formatter and one canonical minute-scale duration formatter in the existing practice formatting boundary; all equivalent Home, hook, and domain callers migrated; every superseded body deleted; exact behavior retained; production LOC strictly reduced; full gates and CodeScene policy passed; independent review and rollback evidence completed; merged result on clean updated `main`.

**Addresses:** reuse-first discovery, avoidance of duplicate wheels, exact behavior preservation, net-negative production LOC, one-owner architecture, Code Health safeguards, and native OpenGSD lifecycle proof.

**Avoids:** locale-sensitive output drift, fallback-label collapse, accidental inclusion of non-equivalent duration contracts, new wrapper layers, stale semantic evidence, LOC gaming, and baseline-only CodeScene claims.

#### Work sequence inside Phase 1

1. Reconfirm baseline identity and semantic-index freshness; record the literal caller/deletion map and the rejected alternatives.
2. Add pre-change direct characterization for UTC conversion, zero padding, both invalid fallbacks, non-finite/negative/zero durations, sub-minute values, and hour/minute boundaries. Demonstrate mutation sensitivity before changing production behavior.
3. Extend the existing practice formatting owner, redirect every equivalent caller, and delete all selected duplicate bodies atomically. Do not touch excluded formatters.
4. Measure the exact formatted `src/**` delta and prove no retired symbol, branch, alias, or parallel implementation remains.
5. Run focused tests, architecture/debt gates, full lint, typecheck, unit suite, and build; run any browser verification only if the actual diff introduces a browser-observable seam beyond pure formatting.
6. Analyze the exact post-change revision with CodeScene, require policy pass, perform independent review, and demonstrate a clean one-change rollback without data migration.
7. Merge through the native lifecycle and verify updated `main` is clean.

These are tasks within one phase, not new phases, stages, or experiment cycles.

### Phase Ordering Rationale

- There is exactly one future roadmap phase for v1.1 R01.
- Characterization must precede production edits so preserved behavior is independently meaningful.
- Deletion and caller migration must be atomic so no temporary dual authority is accepted as a completed plan.
- LOC, CodeScene, review, rollback, merge, and clean-main checks are terminal obligations of the same phase.

### Research Flags

**No separate research phase is recommended.** The selected boundary uses established TypeScript pure-function consolidation and has sufficient current-main, semantic, test, dependency, official-platform, and CodeScene evidence for roadmap planning.

Phase 1 must stop and refresh targeted evidence—not create another phase—if the selection HEAD changes, the Lumen ignore/index configuration changes, characterization reveals a behavior mismatch, the final implementation needs a new dependency, or CodeScene declines. A new dependency or broadened boundary would invalidate this selection and require user approval rather than an automatic redesign.

## Confidence Assessment

| Area | Confidence | Notes |
|---|---|---|
| Stack | MEDIUM | Locked versions and exact APIs were inspected; stack-only ranking disagreed with the final target, but the disagreement is explicitly resolved by cross-research risk and deletion evidence. |
| Features / candidate fit | HIGH | Literal bodies, callers, tests, and authoritative semantic rankings converge on the formatter family and its behavior differences. |
| Architecture | HIGH | The existing owner and dependency direction are clear; no persistence, browser-resource, service-contract, or data-shape change is needed. |
| Pitfalls and gates | HIGH | Current repository gates, CodeScene baselines, failure conditions, and stale-index rules are concrete; post-change evidence remains open by design. |
| External API conclusion | MEDIUM | Official platform behavior supports rejecting `Intl` for exact fixed output; no claim of exhaustive ecosystem coverage is made. |

**Overall confidence:** MEDIUM. The roadmap choice is well supported, while implementation acceptance correctly remains unproven until Phase 1 closes every terminal gate.

### Gaps to Address in Phase 1

- Direct pre-change unit tests for both invalid timestamp labels and all minute-duration boundaries.
- An immutable production-only LOC baseline and exact deletion map before edits.
- Fresh Lumen evidence if selection HEAD or index freshness changes.
- Exact post-change CodeScene revision analysis, including no changed-source decline, no new severe finding, and applicable hotspot thresholds.
- Full repository gates, independent review, rollback demonstration, merge verification, and clean updated `main`.

## Sources

### Primary Repository Evidence

- `.planning/research/STACK.md` — locked dependency/API audit and alternative candidates.
- `.planning/research/FEATURES.md` — exact formatter overlaps, behavior matrix, semantic rankings, test evidence, and LOC estimate.
- `.planning/research/ARCHITECTURE.md` — current dependency boundaries, retained-owner rule, and bounded integration shape.
- `.planning/research/PITFALLS.md` — final Lumen and CodeScene status, fail-closed gates, and rollback requirements.
- Current production and test locations cited in those four research artifacts, inspected as existing repository inputs.
- Root `.lumenignore`, explicit Lumen CLI rebuild/query evidence, and local CodeScene installation/baseline/detailed-review evidence.

### Authoritative External Evidence

- [MDN `Intl.DateTimeFormat`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat) and [format behavior](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/format) — locale- and implementation-sensitive output used to reject direct substitution.
- [Dexie `Collection.modify`](https://dexie.org/docs/Collection/Collection.modify%28%29) — installed-API alternative evaluated but not selected.
- [React `useSyncExternalStore`](https://react.dev/reference/react/useSyncExternalStore) — installed-API alternative evaluated but not selected.
- [Zod documentation](https://zod.dev/api) and [Tonal repository](https://github.com/tonaljs/tonal) — existing validation/music capabilities inspected to avoid duplicate abstractions and policy leakage.

## Research Artifact Boundary

The only artifact created or replaced by this synthesis is `.planning/research/SUMMARY.md`. Every production or test path mentioned above refers to an existing input or a proposed future Phase 1 edit surface; none is reported as created by this research step. No commit is created by this synthesis.

---
*Research completed: 2026-07-21*  
*Ready for roadmap selection: yes*  
*Implementation acceptance complete: no*
