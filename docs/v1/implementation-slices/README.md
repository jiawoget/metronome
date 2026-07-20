> Frozen legacy v1 record. Preserve for historical product, pack, slice, and evidence context. Do not use this document or `status.json` as current lifecycle authority. Current project state is under `.planning/` and routing starts with `$gsd-next`.

# v1 Implementation Slices

Start with `docs/v1/START-HERE.md`.

This file is a detailed reference for slice lifecycle, model tiers, and backlog structure.

## Purpose

Implementation slices are the units assigned to fresh planning/coding/review/verification agents.

They are smaller than product feature contracts and much smaller than acceptance packs. A slice should fit inside one agent context and have a narrow file and behavior boundary.

## Relationship

```text
Product Feature Contract
  -> Atomic Implementation Slices
  -> Acceptance Pack
  -> User Acceptance
```

The user accepts packs. Agents implement slices.

When starting from a product module file or feature id, use:

```text
docs/v1/implementation-slices/product-feature-map.md
```

This map is the bridge between files such as `docs/v1/01-app-shell-home.md` and the implementation slice backlog.

## Slice Size Rules

Each slice should target:

- Contract text around 100-180 lines.
- 1-3 primary code areas.
- 5-8 acceptance criteria.
- Clear out-of-scope list.
- Unit/integration/E2E requirements only where relevant.
- One fresh planning agent, one fresh coding agent, one fresh review agent, one fresh verification agent.

Avoid slices that require one agent to understand UI, persistence, recording artifacts, E2E, and review behavior all at once.

## Slice Status Model

All v1 status lives in `docs/v1/status.json`.

Slice status is stored under:

```text
implementation.packs[].slices[]
```

```text
not_started
  -> planning_ready
  -> planning_in_progress
  -> planning_done
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
  -> planning_ready
```

For failures caused by unclear scope, missing acceptance criteria, missing fixtures, or unclear verification evidence, return to `planning_ready` before coding resumes.

For narrow implementation bugs where the slice contract is still sound:

```text
needs_fix
  -> coding_in_progress
```

## Pack Slice Files

The first implementation focus should be Pack 1: Practice Segment MVP.

Detailed slices for Pack 1 belong in:

```text
docs/v1/implementation-slices/01-practice-segment-mvp.md
```

Backlog slice files for later packs live alongside Pack 1:

```text
docs/v1/implementation-slices/00-planning-foundation.md
docs/v1/implementation-slices/02-segment-take-review.md
docs/v1/implementation-slices/03-sessions-continue-practice.md
docs/v1/implementation-slices/04-practice-controls-upgrade.md
docs/v1/implementation-slices/05-library-viewer-upgrade.md
docs/v1/implementation-slices/06-quick-metronome-training.md
docs/v1/implementation-slices/07-reference-markers.md
docs/v1/implementation-slices/08-settings-local-data.md
docs/v1/implementation-slices/09-audio-analysis-infrastructure.md
```

Pack 2-9 files are backlog-level splits. Before a later pack starts, the scheduler should refine that pack's slices to the same detail level as Pack 1, including:

- Model assignment.
- Scope.
- Out of scope.
- Acceptance.
- Verification.
- Pack-level acceptance gate.

Do not mark later-pack slices `ready_for_coding` in `docs/v1/status.json` until that refinement is complete.

## Per-Slice Agent Lifecycle

Each implementation slice must use fresh agents:

```text
Slice planning_ready
  -> fresh planning agent refines exactly one slice
  -> planning_done / ready_for_coding
  -> fresh coding agent implements exactly that planned slice
  -> fresh review agent reviews changed files against planned slice + product contract
  -> coding fix pass if review finds issues
  -> fresh verification agent verifies planned slice acceptance criteria
  -> verified
```

Do not reuse the planning agent as the coding agent.

The planning agent must:

- Read repository docs directly with `fork_context: false`.
- Use `gpt-5.5`, medium effort, standard speed.
- Refine only the assigned slice.
- Produce a detailed implementation-ready planning file under `docs/v1/implementation-slices/plans/`.
- Confirm scope, out of scope, expected files/areas, acceptance criteria, boundary conditions, verification evidence, model tier, dependencies, and handoff requirements.
- Define a complete test coverage plan for the slice, including unit, integration, browser E2E, reload/persistence, fixture, and negative cases where applicable.
- Constrain the coding agent to existing project patterns, libraries, helpers, and service boundaries; explicitly call out what must not be rebuilt from scratch.
- Avoid product code changes.

The coding agent must implement the planned slice, not reinterpret the broader product contract.

The review and verification agents must review/verify against the refined slice plan plus the product contract.

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

Planning agent prompts must ask for the planned slice output to be written into a clearly named planning note under:

```text
docs/v1/implementation-slices/plans/
```

Use filenames like `P1-02-measure-grid-repository.md`. A chat-only planning response is not sufficient to move a slice from `planning_ready` to `ready_for_coding`.

## Scheduling Rule

Do not launch a coding agent for a product feature directly.

Do not launch a coding agent for a backlog-level slice directly.

Launch coding agents only for slices marked `ready_for_coding`, after a fresh planning agent has completed slice planning.

## Model Budget Policy

The scheduler should always use `gpt-5.5`, medium effort, standard speed for planning agents so slice boundaries and coverage expectations are strong before coding starts.

For coding, review, and verification agents, the scheduler should choose the least expensive model tier that can safely complete the slice.

Use standard speed for all v1 subagents unless the user explicitly approves otherwise.

### Tier A: Pure Logic / Types

Use for pure domain math, validation, formatting, selectors, and small non-UI utilities.

```text
Planning agent: gpt-5.5, medium effort, standard speed
Coding agent: gpt-5.4, medium effort, standard speed
Review agent: gpt-5.4-mini, medium effort, standard speed
Verification agent: gpt-5.4-mini, medium effort, standard speed
```

Expected token profile: low. Prefer this tier whenever there is no UI, persistence, browser E2E, media, or migration work.

### Tier B: Local Persistence / Service Boundary

Use for repositories, local storage services, metadata schema changes, and integration tests without complex media artifacts.

```text
Planning agent: gpt-5.5, medium effort, standard speed
Coding agent: gpt-5.4, high effort, standard speed
Review agent: gpt-5.4-mini, high effort, standard speed
Verification agent: gpt-5.4-mini, high effort, standard speed
```

Expected token profile: medium. Use this tier when persistence after reload or backwards compatibility matters, but no browser-heavy UI or real media artifact verification is required.

### Tier C: User-Facing UI With Browser E2E

Use for compact UI slices, responsive layout, route wiring, forms, and browser E2E without media capture or complex timing.

```text
Planning agent: gpt-5.5, medium effort, standard speed
Coding agent: gpt-5.5, high effort, standard speed
Review agent: gpt-5.4, medium effort, standard speed
Verification agent: gpt-5.4-mini, high effort, standard speed
```

Expected token profile: medium-high. Use this tier for UI because implementation must preserve the v1 visual direction, responsive behavior, interaction polish, and browser E2E expectations.

### Tier D: Recording / Media / Timing / Waveform

Use for recording artifacts, metronome timing, scheduler behavior, waveform decode, audio analysis evidence, or any slice where a false pass could leave fake media behavior.

```text
Planning agent: gpt-5.5, medium effort, standard speed
Coding agent: gpt-5.5, high effort, standard speed
Review agent: gpt-5.4, high effort, standard speed
Verification agent: gpt-5.4, high effort, standard speed
```

Expected token profile: high. Use this tier only when real artifact, timing, scheduler, decode, or waveform evidence is required.

### Tier E: Risky Data Operations / Migration / Cleanup

Use for import/export, backup/restore-like workflows, selective cleanup, data migration, or operations that can corrupt or delete local data.

```text
Planning agent: gpt-5.5, medium effort, standard speed
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


