# Requirements: Metronome v1.1 R01 Evidence-First Code Slimming

**Defined:** 2026-07-21
**Core Value:** Musicians can move from a score and practice target to a repeatable local practice-and-review loop without surrendering their recordings or practice data to a cloud service.

## v1.1 Requirements

Requirements for this maintenance milestone. Each requirement must map to exactly one roadmap phase.

### Behavior Preservation

- [ ] **FMT-01**: Musicians continue to see the exact existing UTC-minute timestamps, minute-scale duration text, rounding behavior, and invalid-value fallbacks across Home, the practice-session dashboard, and session comparison, including `Unknown time` and analytics-specific `Unknown update time`.
- [ ] **FMT-02**: The selected Home, dashboard-hook, and session-comparison formatting callers use the existing practice formatting boundary as their single owner, with all seven superseded duplicate formatter bodies or no-op wrappers removed and no compatibility or parallel runtime path retained.

### Evidence and Slimming

- [ ] **EVID-01**: The selected refactor remains supported by reproducible current-HEAD semantic evidence, installed-dependency inspection, and authoritative OSS/platform API evidence, adds no dependency, and refreshes selection evidence if the source HEAD or semantic-index configuration changes before implementation.
- [ ] **SLIM-01**: The final formatted diff is strictly net-negative in tracked production code under `src/**`, with no deletion credit from tests, planning, generated files, renames, formatting-only churn, or logic moved into a new production path.

### Quality and Code Health

- [ ] **QUAL-01**: Pre-change characterization locks the selected valid, invalid, UTC, fallback, rounding, sub-minute, and hour/minute behavior before production edits, and the reviewed revision passes focused behavior tests plus all repository lint, typecheck, unit, build, architecture, and debt gates.
- [ ] **HEALTH-01**: CodeScene analysis of the exact final revision shows no changed-source Code Health decline, no new severe finding, and every applicable touched hotspot meets the repository policy threshold.

### Delivery

- [ ] **DELIV-01**: The immutable reviewed product revision has complete product evidence, demonstrates a clean version-control rollback without data migration or user repair, leaves relevant source and configuration state clean, and is ready to enter native verification, validation, and security.

Passing VERIFICATION, current Nyquist VALIDATION, and SECURITY with `threats_open: 0` is a mandatory native `$gsd-ship` precondition, but those later lifecycle facts receive no Phase 1 requirement credit.

## Milestone Release Exit

This is explicitly outside Phase 1 requirement completion. All gates below are conjunctive and remain pending:

1. Run native `$gsd-ship` to create or prepare the PR.
2. After any ship-note or update, resolve the actual final post-ship PR head.
3. Ensure CI applies to that exact head; re-run or refresh CI if `[ci skip]` prevents it.
4. Obtain a mandatory, finding-free, read-only `@codex` review of that same head using `skills/reviewing-metronome-prs/SKILL.md`.
5. Merge the GitHub PR.
6. Update local `main` to the intended `origin` merge revision.
7. Verify `main == origin/main`, no `MERGE_HEAD`, an empty index, and empty `git status --porcelain=v1 --untracked-files=all` output.

`verification.status=passed` and milestone requirement completion do not prove this exit. The active goal and milestone must not be reported complete until every gate above is true.

## Future Requirements

None for this maintenance milestone. The alternative refactor candidates remain research evidence only, and the 32 dormant product capabilities remain native seeds rather than future requirements in this file.

## Out of Scope

Explicitly excluded to prevent scope drift.

| Item | Reason |
|------|--------|
| String-normalizer, ID-factory, reference-duration, Dexie, deep-equality, hydration, music-library, storage, and media/browser refactors | v1.1 selects exactly one bounded formatter target; other candidates require a separately approved milestone or scope change. |
| Seconds-scale session-comparison duration formatting | Its `0s`, `<1s`, and `Xm Ys` contract is not equivalent to the selected minute-scale formatter. |
| Sheet-library duration formatting | It rounds differently and maps zero or invalid input to `<1 min`; consolidation would change behavior. |
| `Intl.DateTimeFormat` or a new formatting dependency | Locale and implementation variability cannot guarantee the current fixed ASCII output, and no new dependency is needed. |
| New utility, facade, adapter, compatibility alias, feature flag, or parallel formatter path | The milestone must retire duplicate ownership through the existing practice formatting boundary. |
| Persistence schemas, storage keys, service contracts, browser-resource ownership, or local-first behavior | The selected target is a pure presentation-formatting consolidation and must not expand into product or platform change. |
| The 32 dormant product seeds | This maintenance milestone selects no product capability seed; every seed remains unchanged. |
| Historical R01 pilot targets, code, worktrees, or conclusions | The selected target and evidence were re-established from the current `main` milestone baseline. |

## Traceability

Every v1.1 requirement maps to the single bounded roadmap phase.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FMT-01 | Phase 1 | Pending |
| FMT-02 | Phase 1 | Pending |
| EVID-01 | Phase 1 | Pending |
| SLIM-01 | Phase 1 | Pending |
| QUAL-01 | Phase 1 | Pending |
| HEALTH-01 | Phase 1 | Pending |
| DELIV-01 | Phase 1 | Pending |

**Coverage:**
- v1.1 requirements: 7 total
- Mapped to phases: 7
- Unmapped: 0

---
*Requirements defined: 2026-07-21*
*Last updated: 2026-07-21 after roadmap creation*
