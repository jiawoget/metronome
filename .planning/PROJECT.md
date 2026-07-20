# Metronome

## What This Is

Metronome is a local-first web application for musicians to run metronome practice, import and view sheet music, define measure grids and practice segments, record and review takes, and inspect local practice history. The existing browser application keeps user artifacts and metadata on the device; frozen legacy product contracts remain under [`docs/v1`](../docs/v1/) as historical evidence, while OpenGSD is the sole lifecycle and roadmap control plane.

## Core Value

Musicians can move from a score and practice target to a repeatable local practice-and-review loop without surrendering their recordings or practice data to a cloud service.

## Requirements

### Validated

- ✓ 32 evidence-backed product capabilities are retained in the shipped [`v1.0 requirements archive`](milestones/v1.0-REQUIREMENTS.md).

### Active

- None. The repository is between milestones, so a fresh `REQUIREMENTS.md` will be created only when the next real milestone is defined.

### Deferred

- 32 unimplemented capability contracts are preserved as [native OpenGSD seeds](seeds/). Native `$gsd-new-milestone` questioning may surface or select relevant seeds, but selection alone does not consume them. A selected seed remains until an approved current `REQUIREMENTS.md` contains the same legacy capability ID, feature key, and required behavior; that approval commit deletes the seed while unselected seeds remain dormant and unchanged.

### Out of Scope

- The five unfinished legacy pack boundaries and their 49 not-started slice decomposition are historical proposals under `docs/v1/`, not the future roadmap.
- Cloud accounts, sync, sharing, and remote storage — current v1 contracts are local-first and defer cross-device behavior.
- Automatic score following, correctness scoring, or claims of musical-performance accuracy — these require separately approved product and analysis contracts.
- A custom lifecycle wrapper, shadow status ledger, capability database, committed migration validator, or project knowledge graph — native OpenGSD artifacts own lifecycle state.
- Treating maintenance/refactor slices as user-facing product requirements — the 24 support/maintenance slices remain completed roadmap history only.
- Treating the historical R01 governance proof as current primary-repository product work — its pending isolated contract lives in the [Lumen and historical R01 pilot plan](../docs/superpowers/plans/2026-07-20-lumen-r01-opengsd-pilot.md).

## Context

- Frozen legacy product contracts: [`docs/v1`](../docs/v1/)
- Imported capability-to-slice evidence: [`docs/v1/implementation-slices/product-feature-map.md`](../docs/v1/implementation-slices/product-feature-map.md)
- Completed history: 8 completed packs / 83 verified slices.
- Semantic capability truth: 32 archived Complete capabilities / 32 dormant unimplemented seeds.
- The archived Complete set and dormant seed set form the exact disjoint 64-capability baseline preserved from frozen [`docs/v1/status.json`](../docs/v1/status.json).
- The application is TypeScript/React/Next.js with browser-local persistence and explicit domain, service, and infrastructure boundaries.

## Constraints

- **Lifecycle**: Begin the next real product milestone through native `$gsd-new-milestone`; once active, continue through `$gsd-next` or that active phase. This prevents a second scheduler or state machine.
- **Deferred-capability carrier**: Before requirement approval, the dormant seed is the sole carrier. The same planning commit that approves the matching requirement deletes the seed; afterward native requirement, plan, verification, and archive artifacts carry the truth. OpenGSD does not perform this deletion automatically.
- **Completion truth**: A product requirement is complete only when every mapped legacy slice is verified and reachable runtime plus automated or repeatable acceptance evidence is linked — prevents false promotion during import.
- **Local first**: Existing browser-local storage and audio boundaries remain authoritative unless a future requirement explicitly changes them.
- **Reuse first**: Agents must inspect existing project code, installed dependencies, and relevant external APIs before adding parallel implementations.
- **Historical evidence**: Legacy product contracts, pack specifications, and slice plans remain evidence, but they no longer own current lifecycle state.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Archive completed legacy history only | Completion history must not convert unfinished proposals into current phases or plans | ✓ Good |
| Preserve deferred capabilities through one authoritative carrier | Native `$gsd-new-milestone` discovers seeds; selection keeps the seed until the matching requirement is approved and deletes it in that same commit, leaving unselected seeds untouched | ✓ Good |
| Keep the primary repository between milestones | The historical R01 proof is governance evaluation, not a current product phase | ✓ Good |
| Import each completed legacy pack as one native PLAN/SUMMARY pair | Preserves eight completed phases without pretending 83 historical slices were executed natively | ✓ Good |
| Use native OpenGSD as the sole project lifecycle and roadmap control plane | Cross-session planning, execution, verification, and progress already exist in OpenGSD | ✓ Good |

## Evolution

The shipped v1.0 archive retains the 32 validated capabilities. The remaining 32 capability identities currently live in native dormant seeds. After governance acceptance, a future user decision starts `$gsd-new-milestone`; its questioning may select relevant seeds and define fresh requirements and phase boundaries without importing unfinished legacy packs. Selection keeps a seed until matching requirement approval; the approval commit deletes it so the capability is represented by exactly one authoritative carrier before and after promotion.

---
*Last updated: 2026-07-20 for the repaired between-milestones state*
