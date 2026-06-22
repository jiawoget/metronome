# v1 Scheduler Handoff

## Current State

The planning pass has produced:

- Product feature inventory: `docs/v1/feature-inventory.md`
- Product contracts:
  - `docs/v1/05f-practice-segments.md`
  - `docs/v1/remaining-feature-contracts.md`
- Acceptance packs: `docs/v1/acceptance-packs.md`
- Implementation slice rules: `docs/v1/implementation-slices/README.md`
- Pack 1 slices: `docs/v1/implementation-slices/01-practice-segment-mvp.md`
- Slice status: `docs/v1/implementation-slices/status.json`
- Contract review report: `docs/v1/contract-review-report.md`

No product implementation code should be assumed complete from this planning work.

## Scheduling Rule

Do not assign agents to broad product features directly.

Use this lifecycle:

```text
Select next ready_for_coding slice
  -> fresh coding agent implements only that slice
  -> fresh review agent reviews changed files against slice + product contract
  -> coding fix pass if needed
  -> fresh verification agent verifies slice acceptance criteria
  -> update slice status
  -> continue until pack is verified
  -> present pack for user acceptance
```

All coding/review/verification agents must:

- Use `fork_context: false`.
- Use standard speed unless the user approves otherwise.
- Use the model/effort tier assigned in the implementation slice file.
- Prefer the least expensive safe model tier; do not default every slice to the highest model.
- Read repository docs directly.
- Preserve v0 verified behavior.
- Avoid adjacent v1 and v2 scope.

## First Implementation Target

Start with Pack 1: Practice Segment MVP.

First slice:

```text
P1-01 measure-grid-types-and-math
```

Source:

```text
docs/v1/implementation-slices/01-practice-segment-mvp.md
docs/v1/implementation-slices/status.json
docs/v1/05f-practice-segments.md
```

Expected first-slice scope:

- Add MeasureGrid domain types.
- Add validation.
- Add deterministic measure and range timestamp math.
- No UI.
- No persistence.
- No Sheet Practice wiring.

Model assignment for the first slice:

```text
Tier A
Coding agent: gpt-5.4, medium effort, standard speed
Review agent: gpt-5.4-mini, medium effort, standard speed
Verification agent: gpt-5.4-mini, medium effort, standard speed
```

Reason: pure domain math and validation only.

## Pack 1 User Acceptance Path

Pack 1 is not accepted until the full path works:

```text
Open a sheet
  -> Calibrate measure 1
  -> Create a segment for measures 5-12
  -> Select the segment
  -> Record one take
  -> Record again
  -> Confirm both recordings exist and carry segment context
```

## Important Notes

- `docs/v1/module-status.json` tracks product feature contract readiness, not slice implementation readiness.
- `docs/v1/implementation-slices/status.json` is the source of truth for implementation scheduling.
- `docs/v1/implementation-slices/README.md` defines model budget tiers and escalation rules.
- Only `P1-01 measure-grid-types-and-math` is currently `ready_for_coding`.
- Later Pack 1 slices should be promoted to `ready_for_coding` only after dependency slices are verified.
- Do not start Pack 2 until Pack 1 is accepted unless the user explicitly reprioritizes.
