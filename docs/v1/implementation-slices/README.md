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

## Model Budget Policy

The scheduler should choose the least expensive model tier that can safely complete the slice.

Use standard speed for all v1 subagents unless the user explicitly approves otherwise.

### Tier A: Pure Logic / Types

Use for pure domain math, validation, formatting, selectors, and small non-UI utilities.

```text
Coding agent: gpt-5.4, medium effort, standard speed
Review agent: gpt-5.4-mini, medium effort, standard speed
Verification agent: gpt-5.4-mini, medium effort, standard speed
```

Expected token profile: low. Prefer this tier whenever there is no UI, persistence, browser E2E, media, or migration work.

### Tier B: Local Persistence / Service Boundary

Use for repositories, local storage services, metadata schema changes, and integration tests without complex media artifacts.

```text
Coding agent: gpt-5.4, high effort, standard speed
Review agent: gpt-5.4-mini, high effort, standard speed
Verification agent: gpt-5.4-mini, high effort, standard speed
```

Expected token profile: medium. Use this tier when persistence after reload or backwards compatibility matters, but no browser-heavy UI or real media artifact verification is required.

### Tier C: User-Facing UI With Browser E2E

Use for compact UI slices, responsive layout, route wiring, forms, and browser E2E without media capture or complex timing.

```text
Coding agent: gpt-5.5, high effort, standard speed
Review agent: gpt-5.4, medium effort, standard speed
Verification agent: gpt-5.4-mini, high effort, standard speed
```

Expected token profile: medium-high. Use this tier for UI because implementation must preserve the v1 visual direction, responsive behavior, interaction polish, and browser E2E expectations.

### Tier D: Recording / Media / Timing / Waveform

Use for recording artifacts, metronome timing, scheduler behavior, waveform decode, audio analysis evidence, or any slice where a false pass could leave fake media behavior.

```text
Coding agent: gpt-5.5, high effort, standard speed
Review agent: gpt-5.4, high effort, standard speed
Verification agent: gpt-5.4, high effort, standard speed
```

Expected token profile: high. Use this tier only when real artifact, timing, scheduler, decode, or waveform evidence is required.

### Tier E: Risky Data Operations / Migration / Cleanup

Use for import/export, backup/restore-like workflows, selective cleanup, data migration, or operations that can corrupt or delete local data.

```text
Coding agent: gpt-5.5, high effort, standard speed
Review agent: gpt-5.5, high effort, standard speed
Verification agent: gpt-5.4, high effort, standard speed
```

Expected token profile: high. Use this tier for destructive or data-integrity-sensitive work even when the UI is small.

### Escalation Rules

Escalate one tier if:

- The previous review or verification failed for architecture or data-integrity reasons.
- The slice touches verified v0 behavior in a shared service.
- The slice requires browser E2E plus persistence plus nontrivial service rewiring.
- The slice has repeated failures after a fix pass.

Do not escalate just because a task is user-facing if it is a simple form or display slice covered by Tier C.

### Fix Pass Rules

Use the same coding model as the original slice for the first fix pass.

If a second fix pass is needed for the same failure category:

- Tier A may escalate coding to `gpt-5.4, high effort`.
- Tier B may escalate coding to `gpt-5.5, high effort`.
- Tier C already uses `gpt-5.5` for coding; narrow the fix prompt to the failed UI evidence instead of escalating by default.
- Tier D/E should stay on the original high-risk assignment and narrow the prompt to the failing evidence.

### Token-Saving Prompt Rules

For every subagent prompt:

- Pass file paths and slice id, not full document contents.
- Ask the agent to read only the required docs and local files for the assigned slice.
- Include explicit out-of-scope bullets.
- For review and verification agents, pass the implementation commit hash and changed files.
- Do not ask verification agents to re-review unrelated source unless boundary inspection is part of the slice.
