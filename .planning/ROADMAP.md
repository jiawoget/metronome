# Roadmap: Metronome

## Milestones

- [x] **v1.0 Legacy Delivered Baseline** — Shipped 2026-07-20. See the [archived v1.0 roadmap](milestones/v1.0-ROADMAP.md).
- [ ] **v1.1 R01 Evidence-First Code Slimming** — One bounded canonical practice presentation formatting consolidation.

## Overview

Milestone v1.1 delivers one reuse-first maintenance outcome: Home, the practice-session dashboard, and session comparison retain their exact UTC-minute timestamp and minute-scale duration presentation while the existing practice formatting boundary becomes the sole owner. Phase 1 ends with one immutable, reversible, clean reviewed product revision with complete product evidence, ready to enter native verification, validation, and security. Passing those native gates is a mandatory `$gsd-ship` precondition but receives no Phase 1 requirement credit; roadmap creation claims neither product readiness, ship readiness, nor the separate release exit.

## Phases

- [ ] **Phase 1: Canonical Practice Presentation Formatting** - Consolidate the selected presentation formatters into the existing practice formatting boundary while preserving exact behavior and proving a safe net reduction.

## Phase Details

### Phase 1: Canonical Practice Presentation Formatting
**Goal**: Musicians retain the exact selected timestamp and duration presentation while Home, the practice-session dashboard, and session comparison use the existing practice formatting boundary as the single canonical owner with less production code.
**Depends on**: Nothing (first phase)
**Requirements**: FMT-01, FMT-02, EVID-01, SLIM-01, QUAL-01, HEALTH-01, DELIV-01
**Success Criteria** (what must be TRUE):
  1. Musicians continue to see deterministic zero-padded `YYYY-MM-DD HH:mm UTC` timestamps, general `Unknown time` and analytics-specific `Unknown update time` fallbacks, `0 min` for non-finite, negative, or zero minute-scale durations, `<1 min` for positive sub-minute durations, and the current floor-to-minute `N min` or `N hr M min` wording across Home, the practice-session dashboard, and session comparison; excluded seconds-scale and sheet-library formatting remain unchanged.
  2. The selected Home, dashboard-hook, and session-comparison callers use the existing practice formatting boundary as their only runtime owner, with all seven superseded duplicate formatter bodies or no-op wrappers absent and no compatibility, facade, adapter, feature-flag, or parallel formatting path introduced.
  3. Reviewable evidence ties the selected boundary to the implementation HEAD through current semantic search, installed-dependency inspection, and authoritative OSS/platform API inspection, adds no dependency, and is refreshed before production edits if the source HEAD or semantic-index configuration changes.
  4. Pre-change characterization locks the selected valid, invalid, UTC, fallback, rounding, sub-minute, and hour/minute behavior; the final formatted `src/**` diff is strictly net-negative without credit for tests, planning, generated files, renames, formatting churn, or moved logic; and the exact reviewed revision passes focused behavior tests plus lint, typecheck, unit, build, architecture, and debt gates, while final-revision CodeScene shows no changed-source decline, no new severe finding, and every applicable touched hotspot at the repository policy threshold.
  5. The immutable reviewed product revision has complete product evidence, cleanly rolls back through version control without data migration or user repair, leaves relevant source and configuration state clean, and is ready to enter native verification, validation, and security.
**Plans**: 1 plan
**UI hint**: no

Passing VERIFICATION, current Nyquist VALIDATION, and SECURITY with `threats_open: 0` is mandatory before native `$gsd-ship`, but these later lifecycle facts receive no Phase 1 requirement credit.

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

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Canonical Practice Presentation Formatting | 0/1 | Ready to execute | - |

---
*Roadmap created: 2026-07-21 for milestone v1.1 R01 Evidence-First Code Slimming*
