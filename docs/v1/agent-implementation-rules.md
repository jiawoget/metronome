# v1 Agent Implementation Rules

Start with `docs/v1/START-HERE.md` for day-to-day scheduling. This file is the detailed rules reference.

## Purpose

These rules define how v1 feature contracts are implemented and verified. They intentionally follow the v0 process so v1 does not become broad, unverified scope creep.

## Source Of Truth

Implementation and verification agents must read repository documents, not rely on chat history.

For v1 work, use the minimal role-specific bundles in `docs/v1/START-HERE.md`.

Detailed reference documents are:

- `docs/v1/development-plan.md`
- `docs/v1/feature-inventory.md`
- `docs/v1/status.json`
- The assigned feature contract file.
- Relevant v0 module contracts that the v1 feature builds on.
- `docs/v0/project-structure.md`
- `docs/v0/tech-stack-decisions.md`
- `docs/v0/design-style-guide.md` for UI work.
- `docs/v1/ui-design.md` for UI work.

## Subagent Lifecycle

Each v1 implementation slice must use fresh subagents.

- Create a new planning agent for each slice.
- Create a new coding agent for each slice.
- Do not reuse a coding agent across slices.
- Create a new review agent for each slice.
- Create a new verification agent for each slice.
- Close all slice agents after their assigned pass is complete.
- Use `fork_context: false` so agents read repository files instead of inheriting long chat history.
- Pass file paths, slice id, feature id, ownership boundaries, and output requirements in the prompt; do not paste full planning documents into prompts.

The standard lifecycle is:

```text
Slice planning_ready
  -> fresh planning agent refines exactly that slice
  -> slice ready_for_coding
  -> fresh coding agent implements exactly that planned slice
  -> fresh review agent reviews the changed files against the planned slice and product contract
  -> coding agent fix pass if review finds issues
  -> fresh verification agent verifies planned slice acceptance criteria
  -> close slice agents
```

## Model, Effort, And Speed Defaults

Use `standard` speed/service tier for v1 subagents unless the user explicitly approves a different speed.

Implementation should use the model tier assigned in the active implementation slice file under `docs/v1/implementation-slices/`.

Do not default every slice to the highest model. The scheduler should choose the least expensive safe model tier and escalate only when the slice risk requires it.

Global fallback assignments, used only when a slice file does not yet specify a tier:

```text
Planning agent: gpt-5.4-mini, high effort, standard speed
Coding agent: gpt-5.4, high effort, standard speed
Review agent: gpt-5.4-mini, high effort, standard speed
Verification agent: gpt-5.4-mini, high effort, standard speed
```

Low-risk pure logic slices should use:

```text
Planning agent: gpt-5.4-mini, medium effort, standard speed
Coding agent: gpt-5.4, medium effort, standard speed
Review agent: gpt-5.4-mini, medium effort, standard speed
Verification agent: gpt-5.4-mini, medium effort, standard speed
```

User-facing UI implementation should use `gpt-5.5` for the coding agent when the slice includes real app UI, responsive layout, or browser E2E.

High-risk media, timing, recording, waveform, data cleanup, migration, or complex browser E2E slices should use:

```text
Planning agent: gpt-5.4 or gpt-5.5, high effort, standard speed
Coding agent: gpt-5.5, high effort, standard speed
Review agent: gpt-5.4 or gpt-5.5, high effort, standard speed
Verification agent: gpt-5.4, high effort, standard speed
```

Use `xhigh` effort only for unusually hard architecture migration, audio algorithm, data migration, or repeated failure debugging work.

Detailed tier definitions live in `docs/v1/implementation-slices/README.md`.

## Status Flow

v1 uses the v0 status flow:

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

## Planning Agent

The planning agent may:

- Create or update v1 and v2 planning documents.
- Split large modules into smaller feature contracts.
- Set a feature to `contract_ready` only when the full contract is written.
- Move deferred work into `docs/v2`.
- Refine exactly one implementation slice from `planning_ready` to `ready_for_coding`.
- Specify scope, out of scope, likely files, model tier, acceptance criteria, and verification evidence for the assigned slice.

The planning agent must not mark a feature `verified`.

The planning agent must not implement product code.

## Implementation Agent

One implementation agent may implement exactly one assigned v1 feature contract at a time.

The implementation agent must:

- Read the assigned contract and required docs before editing product code.
- Update only the assigned feature status and implementation notes.
- Preserve v0 verified behavior unless the contract explicitly changes it.
- Keep UI away from storage, audio, cloud, analysis, and third-party internals.
- Run relevant self-tests before handoff.

The implementation agent must not:

- Implement adjacent v1 features in the same pass.
- Implement v2 work.
- Weaken acceptance criteria or tests.
- Ship display-only or metadata-only behavior where real artifacts are required.

## Verification Agent

One verification agent verifies exactly one assigned v1 feature contract at a time.

The verification agent must:

- Read the assigned contract and required docs.
- Verify each acceptance criterion.
- Use real browser E2E for user-facing UI features.
- Check persistence after reload when data is saved.
- Check console errors for tested browser flows.
- Inspect real media artifacts for recording, waveform, metronome, or analysis claims.
- Report PASS or FAIL with evidence.

The verification agent must not:

- Approve untested acceptance criteria.
- Approve display-only or stub-only behavior.
- Mark adjacent features verified.
- Fix implementation during verification unless explicitly assigned a fix pass.

## Feature Contract Requirements

A v1 feature can become `contract_ready` only when it includes:

- Purpose.
- User value.
- v1 scope.
- Out of scope for v1, including v2 deferrals.
- User paths.
- Product decisions.
- Data boundary.
- State boundary.
- Architecture boundary.
- UI design requirements for user-facing features.
- Dependencies.
- Acceptance criteria.
- Unit, integration, E2E, manual QA, and specialized verification plans where applicable.
- Failure and edge cases.
- Implementation contract.
- Verification contract.
- Handoff requirements.
- Done definition.

## Mandatory Failure Conditions

Verification must fail if:

- Any acceptance criterion is untested.
- UI behavior is not exercised through real browser interaction when UI exists.
- Persistence is claimed but not tested after reload.
- Media behavior is claimed but no real artifact or timing evidence is inspected.
- Product code bypasses service or adapter boundaries.
- User-facing UI ignores the reference image or v1 UI design requirements.
- The feature implements v2 scope.
- A previously verified core v0 workflow is broken.


