# Roadmap: Metronome v1.1 Repository Formatting Baseline

## Milestones

- 🚧 **v1.1 Repository Formatting Baseline** - Phase 1 in progress

## Overview

Milestone v1.1 establishes one deterministic repository-wide Prettier and LF baseline without changing product behavior. One independent phase defines the policy and toolchain, commits one idempotent allowed-surface mechanical baseline, preserves the supported repository-local Windows runtime fallback, and enforces formatting through a fast local commit gate plus the full Ubuntu CI sequence. Pull-request creation, merge, synchronized `main`, and any later fresh R01 remain a separate milestone release exit.

## Phases

**Phase Numbering:** This fresh milestone resets numbering to Phase 1 by owner decision.

- [ ] **Phase 1: Repository Formatting Baseline** - Maintainers can format and validate every allowed repository text file through one deterministic, cross-platform policy without changing product behavior.

## Phase Details

### Phase 1: Repository Formatting Baseline

**Goal**: Maintainers have one deterministic repository-wide formatting baseline that is safe to apply, reproducible on Windows and Ubuntu, and enforced without repeating the full quality suite on every lifecycle commit or changing product behavior.
**Depends on**: Nothing (first phase)
**Requirements**: POLICY-01, TOOL-01, TOOL-02, EVID-01, BASE-01, BASE-02, BASE-03, WIN-01, WIN-02, ENF-01, ENF-02, QUAL-01, HIST-01, DELIV-01
**Success Criteria** (what must be TRUE):

  1. Maintainers can inspect one native research decision and one root formatting policy comprising `.gitattributes`, `prettier.config.mjs`, `.prettierignore`, exact formatter/plugin packages, and only `npm run format` plus `npm run format:check`; binary/generated paths and all `.planning/**` lifecycle bytes remain outside the formatting surface, with `.planning/deprecated/**` never consumed.
  2. One isolated committed mechanical baseline covers every other allowed tracked Prettier-supported file and contains formatter output only; diagnosis continues until a second `npm run format` creates no tracked diff and `npm run format:check` passes.
  3. Repository commands and the tracked hook work with direct supported Node/npm when available and with `scripts/npm-local.ps1` otherwise, without changing user or system `PATH`.
  4. The tracked pre-commit hook fails fast on staged whitespace and formatting drift; the frozen local candidate and Ubuntu CI run formatting, lint, typecheck, full unit, and build gates once per candidate head.
  5. Maintainers can inspect an immutable implementation revision whose mechanical formatter output is isolated from policy, enforcement, semantic, and lifecycle edits, with complete gate evidence and no product behavior change; an exact plan/task/commit count and Playwright are not required.

**Plans**: 1/1 plans executed

Plans:

- [x] 01-01-PLAN.md — Establish the canonical policy/enforcement tracer, commit the isolated fixed-point baseline, and prove the frozen candidate.

## Milestone Release Exit

Phase 1 completion does not prove release. After native verification, the separate conjunctive exit in `REQUIREMENTS.md` governs native shipping, one frozen exact-final-head local and Ubuntu CI evidence pass, read-only `@codex` review with no unresolved actionable findings, pull-request merge, clean synchronization of local `main` with `origin/main`, and only then any separately approved fresh R01. These facts receive no Phase 1 requirement credit.

## Progress

**Execution Order:** Phase 1 only; Milestone Release Exit follows phase verification and is not a phase.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Repository Formatting Baseline | 1/1 | In Progress|  |
