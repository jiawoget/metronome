> Frozen legacy v1 record. Preserve for historical product, pack, slice, and evidence context. Do not use this document or `status.json` as current lifecycle authority. Read [root `AGENTS.md`](../../AGENTS.md) and current [`.planning/`](../../.planning/) authority for routing.

# v1 Development Plan

For day-to-day scheduling, start with docs/v1/START-HERE.md. This file is the detailed planning reference.

## Purpose

v1 planning starts by turning roadmap ideas into implementation-ready feature contracts before product code changes begin.

The first implementation phase is documentation and definition only:

1. Preserve the complete v1 feature inventory.
2. Move deferred work into v2 documents so it is not forgotten.
3. Define each v1 feature clearly enough to decide whether it deserves a full contract.
4. Promote features one at a time into v0-style contracts with acceptance criteria and verification requirements.

## Planning Decisions

- v1 planning and implementation work should happen on the `codex/v1-development` branch unless the user explicitly chooses another branch.
- v1 uses the same implementation and verification status flow as v0.
- v1 work is organized by module plus sub-feature. Large modules should be split into smaller feature files before implementation.
- v1 must keep v0 boundaries: local-first practice, service/adaptor boundaries, real artifacts, real browser E2E, and separate verification.
- Cloud sync, account login, cross-device resume, backup/restore, and conflict handling move to v2.
- Audio analysis remains in v1 only as bounded infrastructure and support for review. User-facing automatic scoring is not part of v1.
- Practice Segment v1 is based on a manually calibrated measure grid, not PDF image recognition.
- v1 UI design follows `Design Notes/design_pictures/overall_style_design.png` and `docs/v1/ui-design.md`.

## Feature Definition Sequence

1. Define the full v1 feature inventory in `docs/v1/feature-inventory.md`.
2. Create v2 roadmap and status documents for deferred work.
3. Convert priority v1 features into full contracts using `docs/v1/module-template.md`.
4. Include UI design requirements for every user-facing feature contract.
5. Set a feature to `contract_ready` only after it has v0-level scope, boundaries, acceptance criteria, test plan, implementation contract, verification contract, and done definition.
6. Group feature contracts into user-acceptance packs in `docs/v1/acceptance-packs.md`.
7. Split the next pack into atomic implementation slices under `docs/v1/implementation-slices/`.
8. Assign one implementation agent to exactly one `ready_for_coding` implementation slice.

## Planning Layers

v1 planning uses three layers so implementation agents do not receive oversized feature contracts:

```text
Product Feature Inventory
  -> Product Feature Contracts
  -> Atomic Implementation Slices
  -> Acceptance Packs
```

- Product feature inventory records what v1 includes.
- Product feature contracts define user scope, boundaries, acceptance criteria, and verification expectations.
- Implementation slices are the small units assigned to fresh coding/review/verification agents.
- Acceptance packs are the larger product increments the user accepts after all included slices are verified.

Do not launch a coding agent directly for a large product feature if it has not been split into implementation slices.

## Acceptance Packs

The user accepts v1 in packs, not one tiny slice at a time.

Pack definitions live in:

```text
docs/v1/acceptance-packs.md
```

The current pack order is:

```text
Pack 0 Design / Planning Foundation
Pack 1 Practice Segment MVP
Pack 2 Segment Take Review
Pack 3 Session / Continue Practice
Pack 4 Practice Controls Upgrade
Pack 5 Library / Viewer Upgrade
Pack 6 Quick Metronome Training
Pack 7 Reference / Markers
Pack 8 Settings / Local Data
Pack 9 Audio Analysis Infrastructure
```

Pack implementation should proceed in dependency order unless the user explicitly reprioritizes.

## Implementation Slices

Implementation slices live under:

```text
docs/v1/implementation-slices/
```

All v1 status is tracked in one file:

```text
docs/v1/status.json
```

Only slices marked `ready_for_coding` may be assigned to a coding agent.

Each slice should be small enough for one fresh coding agent context:

- One narrow behavior boundary.
- One to three primary code areas.
- Five to eight acceptance criteria.
- Clear out-of-scope list.
- Focused verification requirements.

The first implementation target is Pack 1:

```text
docs/v1/implementation-slices/01-practice-segment-mvp.md
```

## Initial v1 Spine

The first v1 spine is:

```text
MeasureGrid
  -> Practice Segment
  -> Segment-aware session and recording
  -> Multi-take management
  -> Segment review and comparison
  -> Continue Practice back to the same segment
```

Other v1 features remain valid candidates, but they should not be implemented before their contracts are written and approved.

## Status Semantics

Top-level feature status uses the v0 flow:

```text
not_started
  -> contract_ready
  -> implementation_in_progress
  -> implementation_done
  -> verification_in_progress
  -> verified
```

If verification fails:

```text
verification_in_progress
  -> needs_fix
  -> implementation_in_progress
```

The planning pass may set features to `contract_ready`. Implementation and verification passes may update only their assigned feature.


