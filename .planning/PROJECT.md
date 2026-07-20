# Metronome

## What This Is

Metronome is a local-first web application for musicians to run metronome practice, import and view sheet music, define measure grids and practice segments, record and review takes, and inspect local practice history. The existing browser application keeps user artifacts and metadata on the device; product contracts live under [`docs/v1`](../docs/v1/), while OpenGSD is the sole lifecycle and roadmap control plane.

## Core Value

Musicians can move from a score and practice target to a repeatable local practice-and-review loop without surrendering their recordings or practice data to a cloud service.

## Requirements

### Validated

- ✓ 32 evidence-backed product capabilities are retained in the v1.0 completed requirements archive that milestone completion will create at [`milestones/v1.0-REQUIREMENTS.md`](milestones/v1.0-REQUIREMENTS.md).

### Active

- R01 discovery-and-slimming pilot only. Native research and planning must define its current work; no R01 `PLAN.md` is prewritten by this staging milestone.

### Out of Scope

- The five unfinished legacy pack boundaries and their 49 not-started slice decomposition are historical proposals under `docs/v1/`, not the future roadmap.
- Cloud accounts, sync, sharing, and remote storage — current v1 contracts are local-first and defer cross-device behavior.
- Automatic score following, correctness scoring, or claims of musical-performance accuracy — these require separately approved product and analysis contracts.
- A custom lifecycle wrapper, shadow status ledger, capability database, committed migration validator, or project knowledge graph — native OpenGSD artifacts own lifecycle state.
- Treating maintenance/refactor slices as user-facing product requirements — the 24 support/maintenance slices remain completed roadmap history only.

## Context

- Product contracts: [`docs/v1`](../docs/v1/)
- Imported capability-to-slice evidence: [`docs/v1/implementation-slices/product-feature-map.md`](../docs/v1/implementation-slices/product-feature-map.md)
- Completed history: 8 completed packs / 83 verified slices.
- Semantic capability truth: 32 Complete capabilities / 32 Pending capabilities.
- Pending capabilities persist as the non-phase Backlog in [ROADMAP.md](ROADMAP.md).
- The application is TypeScript/React/Next.js with browser-local persistence and explicit domain, service, and infrastructure boundaries.

## Constraints

- **Lifecycle**: Start and continue project work through native OpenGSD (`$gsd-next` or the active phase) — prevents a second scheduler or state machine.
- **Completion truth**: A product requirement is complete only when every mapped legacy slice is verified and reachable runtime plus automated or repeatable acceptance evidence is linked — prevents false promotion during import.
- **Local first**: Existing browser-local storage and audio boundaries remain authoritative unless a future requirement explicitly changes them.
- **Reuse first**: Agents must inspect existing project code, installed dependencies, and relevant external APIs before adding parallel implementations.
- **Historical evidence**: Legacy product contracts, pack specifications, and slice plans remain evidence, but they no longer own current lifecycle state.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Archive completed legacy history only | Completion history must not convert unfinished proposals into current phases or plans | ✓ Good |
| Persist 32 Pending capabilities as a non-phase Backlog projection | Stable capability identities remain visible without inheriting obsolete pack or slice decomposition | ✓ Good |
| Keep R01 as the only current planning target | Current work must begin through native research and planning from the isolated discovery-and-slimming pilot | ✓ Good |
| Import each completed legacy pack as one native PLAN/SUMMARY pair | Preserves eight completed phases without pretending 83 historical slices were executed natively | ✓ Good |
| Use native OpenGSD as the sole project lifecycle and roadmap control plane | Cross-session planning, execution, verification, and progress already exist in OpenGSD | ✓ Good |

## Evolution

After staging v1.0 completed history, native milestone completion archives the 32 validated requirements. Subsequent work begins with R01 discovery and planning; Pending Backlog capabilities become phases only through future current-design decisions.

---
*Last updated: 2026-07-20 for completed-only v1.0 staging*
