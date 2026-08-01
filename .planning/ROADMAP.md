# Roadmap: Metronome

## Overview

Milestone v1.2 brings the shipped v1.1 tree under coherent Native OpenGSD authority, preserves the approved secure quick-recording identity contract, corrects the existing pre-commit runtime-selection defect, proves the two PDF fixtures remain byte-identical to `HEAD`, and stops after Native OpenGSD verification. All 10 requirements converge on one integrated revision, so the milestone uses one bounded phase and one sequential plan.

## Milestones

- 🚧 **v1.2 Release Assurance & Workflow Closure** — Phase 2 complete, 1/1 plan and 10/10 requirements verified; release exit not authorized
- ✅ **v1.1 Repository Formatting Baseline** — Phase 1, 1 plan, 14/14 requirements validated and shipped 2026-08-01 ([roadmap archive](milestones/v1.1-ROADMAP.md), [requirements archive](milestones/v1.1-REQUIREMENTS.md))
- ✅ **v1.0 Legacy Delivered Baseline** — 8 phases, 8 plans, 32 delivered capabilities archived 2026-07-20 ([roadmap archive](milestones/v1.0-ROADMAP.md), [requirements archive](milestones/v1.0-REQUIREMENTS.md))

## Phases

### 🚧 v1.2 Release Assurance & Workflow Closure (Verified; Release Exit Not Authorized)

- [x] **Phase 2: Release Assurance & Workflow Closure** - Preserve secure recording identity, repair engine-aware hook routing, prove repository integrity, and close at Native verification. (completed 2026-08-01)

**Verification:** Passed ordinary Native OpenGSD verification on 2026-08-01. Milestone archival, shipping, and release-exit actions require fresh owner authorization.

## Milestone v1.2 Release Assurance & Workflow Closure (Phase Details)

### Phase 2: Release Assurance & Workflow Closure

**Goal**: Repository operators can rely on the shipped tree's secure quick-recording identity, engine-aware pre-commit routing, byte-identical PDF fixtures, and coherent Native OpenGSD lifecycle through verification.
**Depends on**: Phase 1 (v1.1 shipped)
**Requirements**: ID-01, ID-02, ID-03, HOOK-01, HOOK-02, HOOK-03, PDF-01, AUTH-01, FLOW-01, SCOPE-01
**Success Criteria** (what must be TRUE):

  1. Quick-recording creation uses the existing `recording_`-prefixed `crypto.randomUUID()` path when available, otherwise derives 32 lowercase hexadecimal characters from exactly 16 secure random bytes with matching recording and artifact IDs, and creates nothing when neither secure path exists.
  2. A commit uses the exact direct Node/npm candidates only when both stable versions satisfy the staged root engine minima; every missing, malformed, prerelease, unsupported, or incompatible pair uses the existing PowerShell fallback when available and otherwise fails non-zero.
  3. The commit gate still checks the staged-index snapshot, bootstraps through existing owners, excludes `.planning/**`, cleans up safely, propagates failures, performs the whitespace check, and keeps its fast `format:check` boundary.
  4. Repository inspection shows both PDF fixtures have raw working-tree blob IDs equal to their `HEAD` blob IDs with valid committed bytes and no tracked diff, while PROJECT, STATE, ROADMAP, and AGENTS consistently identify v1.1 as shipped and v1.2 as the active Native OpenGSD assurance milestone.
  5. Native OpenGSD verifies the integrated Phase 2 revision with no product or dormant-seed expansion, secure-ID redesign, new dependency, wrapper, controller, PDF content change, final-review-specific reverify gate, or shipping action; authorization stops at that verification result.

**Plans**: 1/1 plans executed

Plans:

- [x] 02-01-PLAN.md — Reconcile authority, characterize secure recording identity, correct existing hook routing, prove fixture and scope integrity, and reach Native verification.

## Progress

**Execution Order:** Phase 2

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Repository Formatting Baseline | v1.1 | 1/1 | Complete | 2026-08-01 |
| 2. Release Assurance & Workflow Closure | v1.2 | 1/1 | Complete    | 2026-08-01 |
