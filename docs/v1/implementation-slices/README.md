# v1 Implementation Slices

## Purpose

Implementation slices are the units assigned to fresh coding/review/verification agents.

They are smaller than product feature contracts and much smaller than acceptance packs. A slice should fit inside one agent context and have a narrow file and behavior boundary.

## Relationship

```text
Product Feature Contract
  -> Atomic Implementation Slices
  -> Acceptance Pack
  -> User Acceptance
```

The user accepts packs. Agents implement slices.

## Slice Size Rules

Each slice should target:

- Contract text around 100-180 lines.
- 1-3 primary code areas.
- 5-8 acceptance criteria.
- Clear out-of-scope list.
- Unit/integration/E2E requirements only where relevant.
- One fresh coding agent, one fresh review agent, one fresh verification agent.

Avoid slices that require one agent to understand UI, persistence, recording artifacts, E2E, and review behavior all at once.

## Slice Status Model

Slice status is separate from `docs/v1/module-status.json`.

```text
not_started
  -> ready_for_coding
  -> coding_in_progress
  -> coding_done
  -> review_in_progress
  -> review_done
  -> verification_in_progress
  -> verified
```

If review or verification fails:

```text
verification_in_progress
  -> needs_fix
  -> coding_in_progress
```

## Initial Pack Split

The first implementation focus should be Pack 1: Practice Segment MVP.

Detailed slices for Pack 1 belong in:

```text
docs/v1/implementation-slices/01-practice-segment-mvp.md
```

Other packs should receive slice files only when the previous dependency pack is close to acceptance, unless the user explicitly reprioritizes.

## Required Agent Prompt Inputs

Every slice agent prompt should include paths, not pasted full docs:

- `docs/v1/development-plan.md`
- `docs/v1/agent-implementation-rules.md`
- `docs/v1/acceptance-packs.md`
- The relevant product contract file.
- The relevant implementation slice file.
- Relevant v0 module contracts.
- `docs/v0/project-structure.md`
- `docs/v0/tech-stack-decisions.md`
- `docs/v0/design-style-guide.md` for UI work.
- `docs/v1/ui-design.md` for UI work.

## Scheduling Rule

Do not launch a coding agent for a product feature directly. Launch agents only for a slice marked `ready_for_coding`.

