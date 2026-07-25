# Metronome

## What This Is

Metronome is a local-first web application for musicians to run metronome practice, import and view sheet music, define measure grids and practice segments, record and review takes, and inspect local practice history. The existing browser application keeps user artifacts and metadata on the device; frozen legacy product contracts remain under [`docs/legacy/v1`](../docs/legacy/v1/) as historical evidence, while OpenGSD is the sole lifecycle and roadmap control plane.

## Core Value

Musicians can move from a score and practice target to a repeatable local practice-and-review loop without surrendering their recordings or practice data to a cloud service.

## Current Milestone: v1.1 R01 Evidence-First Code Slimming

**Goal:** Prove the native OpenGSD workflow on one real, bounded refactor discovered fresh from current `main`: reuse existing project code, installed dependencies, or an authoritative OSS API to retire duplicate or custom production logic while preserving behavior.

**Target outcomes:**
- Search current code semantically for duplicated behavior before choosing a target.
- Inspect installed dependencies and authoritative online OSS APIs before approving new implementation logic.
- Select exactly one evidence-backed refactor boundary; do not inherit the superseded R01 pilot's target or conclusions.
- Retire more production code than is added, preserve observable behavior, avoid new parallel abstractions, and produce a complete, immutable, reversible, clean reviewed product revision ready to enter native verification, validation, and security.
- Close the separate Milestone Release Exit only after native shipping, exact-head standard CI and applicable platform quality checks, finding-free `@codex` review, GitHub merge, and a clean local `main` synchronized to `origin/main`.

## Requirements

### Validated

- ✓ 32 evidence-backed product capabilities are retained in the shipped [`v1.0 requirements archive`](milestones/v1.0-REQUIREMENTS.md).

### Active

- Discover one bounded reuse-first refactor candidate from current `main` through local semantic, installed-dependency, and authoritative OSS API evidence.
- Replace the selected duplicate or custom implementation with an existing reusable implementation and achieve a net reduction in production LOC without observable behavior change.
- Verify the bounded product result through behavior tests, the standard lint/typecheck/unit/build suite, reuse-sensitive maintainability review, rollback, and clean source/configuration state; then pass the separate native verification, validation, and security preconditions before shipping and the separate Release Exit after shipping.

### Deferred

- 32 unimplemented capability contracts are preserved as [native OpenGSD seeds](seeds/). They remain dormant historical inputs until a future owner-approved milestone explicitly promotes matching product requirements.

### Out of Scope

- The five unfinished legacy pack boundaries and their 49 not-started slice decomposition are historical proposals under `docs/legacy/v1/`, not the future roadmap.
- Cloud accounts, sync, sharing, and remote storage — current v1 contracts are local-first and defer cross-device behavior.
- Automatic score following, correctness scoring, or claims of musical-performance accuracy — these require separately approved product and analysis contracts.
- A custom lifecycle wrapper, shadow status ledger, committed migration validator, status publisher, telemetry system, scanner, capability database, cache, or project knowledge graph — native OpenGSD artifacts own lifecycle state.
- Treating maintenance/refactor slices as user-facing product requirements — the 24 support/maintenance slices remain completed roadmap history only.
- Treating the superseded historical R01 pilot as current product work — v1.1 starts fresh from current `main` through native OpenGSD; the old [pilot plan](../docs/legacy/governance/plans/2026-07-20-lumen-r01-opengsd-pilot.md) is comparison evidence only.
- Preselecting the real R01 target from any historical pilot or worktree — v1.1 discovery must re-establish the target from current `main` and current external evidence.
- Consuming a dormant product seed for maintenance-only refactoring — all 32 seeds remain unchanged unless a separately approved product requirement exactly matches one.

## Context

- Frozen legacy product contracts: [`docs/legacy/v1`](../docs/legacy/v1/)
- Imported capability-to-slice evidence: [`docs/legacy/v1/implementation-slices/product-feature-map.md`](../docs/legacy/v1/implementation-slices/product-feature-map.md)
- Completed history: 8 completed packs / 83 verified slices.
- Semantic capability truth: 32 archived Complete capabilities / 32 dormant unimplemented seeds.
- The archived Complete set and dormant seed set form the exact disjoint 64-capability baseline preserved from frozen [`docs/legacy/v1/status.json`](../docs/legacy/v1/status.json).
- The application is TypeScript/React/Next.js with browser-local persistence and explicit domain, service, and infrastructure boundaries.

## Constraints

- **Lifecycle**: Native OpenGSD owns milestones, research, planning, checking, execution, verification, state, recovery, and shipping. Phase 1 has no active plan, and workflow cleanup does not authorize product work; a future lifecycle action requires explicit owner direction.
- **Deferred capabilities**: Dormant seeds are historical inputs, not current requirements or executable plans. Promotion requires an explicit future owner-approved milestone decision.
- **Completion truth**: A product requirement is complete only when every mapped legacy slice is verified and reachable runtime plus automated or repeatable acceptance evidence is linked — prevents false promotion during import.
- **Lifecycle boundary**: Phase requirement completion establishes only that the immutable reviewed product revision is ready to enter native verification, validation, and security. Passing VERIFICATION, current Nyquist VALIDATION, and SECURITY with `threats_open: 0` is mandatory before `$gsd-ship` but receives no Phase 1 requirement credit. The active goal and milestone remain incomplete until the separate Milestone Release Exit proves native shipping, exact-head standard CI and platform quality checks, finding-free review, merge, and clean synchronized `main`.
- **Local first**: Existing browser-local storage and audio boundaries remain authoritative unless a future requirement explicitly changes them.
- **Reuse first**: When triggered, agents follow the single compact contract at `skills/metronome-policy/SKILL.md` before adding parallel implementations.
- **Historical evidence**: Legacy product contracts, pack specifications, and slice plans remain evidence, but they no longer own current lifecycle state.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Archive completed legacy history only | Completion history must not convert unfinished proposals into current phases or plans | ✓ Good |
| Preserve deferred capabilities as dormant native seeds | Future milestones may consider them only through an explicit owner-approved requirement decision; they do not drive current work | ✓ Good |
| Keep the primary repository between milestones until governance acceptance | The superseded historical pilot did not advance lifecycle state; v1.1 began only after the governance migration merged into updated `main` | ✓ Good |
| Import each completed legacy pack as one native PLAN/SUMMARY pair | Preserves eight completed phases without pretending 83 historical slices were executed natively | ✓ Good |
| Use native OpenGSD as the sole project lifecycle and roadmap control plane | Cross-session planning, execution, verification, and progress already exist in OpenGSD | ✓ Good |
| Discover the real R01 target fresh from current `main` | The historical pilot was not resumed, and its temporary worktrees were not used as current authority and have now been removed; the selected target was re-established from current `main` using reuse and OSS evidence | ✓ Good |
| Reset v1.1 roadmap phase numbering to Phase 1 | The user explicitly chose milestone-local numbering while preserving the immutable v1.0 phase archive | — Pending |

## Evolution

The shipped v1.0 archive retains the 32 validated capabilities, and the remaining 32 identities stay dormant as native seeds. Milestone v1.1 remains unfinished with no active plan. Pre-redesign R01 research and failed attempts are frozen comparison evidence only; future owner-directed native planning must confirm current code, installed APIs, and authoritative external evidence anew.

---
*Last updated: 2026-07-25 after the native OpenGSD workflow cleanup migration*
