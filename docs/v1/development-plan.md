# v1 Development Plan

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
6. Assign one implementation agent to exactly one `contract_ready` feature.

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
