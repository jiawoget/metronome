# Roadmap: Metronome v1.1 Repository Formatting Baseline

## Milestones

- 🚧 **v1.1 Repository Formatting Baseline** - Phase 1 in progress

## Overview

Milestone v1.1 establishes one deterministic repository-wide Prettier and LF baseline without changing product behavior. One independent phase defines the policy and toolchain, applies the single allowed-surface mechanical pass, proves direct Windows runtime use, and enforces the same formatting gate in local pre-commit and Ubuntu CI. Pull-request creation, merge, synchronized `main`, and any later fresh R01 remain a separate milestone release exit.

## Phases

**Phase Numbering:** This fresh milestone resets numbering to Phase 1 by owner decision.

- [ ] **Phase 1: Repository Formatting Baseline** - Maintainers can format and validate every allowed repository text file through one deterministic, cross-platform policy without changing product behavior.

## Phase Details

### Phase 1: Repository Formatting Baseline
**Goal**: Maintainers have one deterministic repository-wide formatting baseline that is safe to apply, reproducible on Windows and Ubuntu, and enforced before existing quality gates without changing product behavior.
**Depends on**: Nothing (first phase)
**Requirements**: POLICY-01, TOOL-01, TOOL-02, EVID-01, BASE-01, BASE-02, BASE-03, WIN-01, WIN-02, ENF-01, ENF-02, QUAL-01, HIST-01, DELIV-01
**Success Criteria** (what must be TRUE):
  1. Maintainers can inspect one native research decision and one root formatting policy comprising `.gitattributes`, `prettier.config.mjs`, `.prettierignore`, exact formatter/plugin packages, and only `npm run format` plus `npm run format:check`; binary/generated paths and `.planning/deprecated/**` remain protected without quarantined contents being consumed or transformed.
  2. One mechanical formatting pass covers every allowed tracked Prettier-supported text file, contains formatter output only, leaves excluded and quarantined bytes untouched, and is idempotent: a second `npm run format` creates no tracked diff while `npm run format:check` passes.
  3. A newly launched Windows shell resolves the intended `node`, `npm`, and `npx` directly from user `PATH`, and—only after that proof—the repository scripts and pre-commit hook work without `scripts/npm-local.ps1` or another repository-specific wrapper.
  4. Both the tracked pre-commit hook and Ubuntu CI fail closed on formatting drift by running `npm run format:check` before the existing lint, typecheck, full unit, and build gates.
  5. Maintainers can inspect an immutable implementation revision with exactly three non-overlapping implementation commit roles—policy/tooling, the single mechanical pass, and enforcement—and evidence that format checking, second-format no-diff, lint, typecheck, the full unit suite, and build pass with clean rollback and no product behavior change; Playwright is not required.
**Plans**: TBD

## Milestone Release Exit

Phase 1 completion does not prove release. After native verification, the separate conjunctive exit in `REQUIREMENTS.md` governs native shipping, exact-final-head local and Ubuntu CI evidence, finding-free read-only `@codex` review, pull-request merge, clean synchronization of local `main` with `origin/main`, and only then any separately approved fresh R01. These facts receive no Phase 1 requirement credit.

## Progress

**Execution Order:** Phase 1 only; Milestone Release Exit follows phase verification and is not a phase.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Repository Formatting Baseline | 0/TBD | Not started | - |
