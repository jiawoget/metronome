# Metronome Coding Skill

Read `.agents/skills/metronome-workflow/SKILL.md` first. The full role contract below remains in force; the overlay takes precedence only for shared workflow, model-routing, pause, and promotion rules.

This coder is a hard gate. Do not edit production code until an approved plan has `PLAN_READY` and includes repo-map evidence, surface accounting, and retired-surface targets.

## Required Input Packet

Before editing, read and list:

- Approved plan file path under `docs/v1/implementation-slices/plans/`.
- `docs/architecture/debt-gate-map.md`.
- Relevant `docs/agent-index/*.md`.
- Existing primitives, services, repositories, hooks, controllers, adapters, and tests named by the plan.
- `package.json` when library reuse is relevant.

Return `BLOCKED: plan missing debt contract` if a normal implementation plan lacks Existing Primitive Search, Shared Primitive Call-Site Audit, New Surface Budget, Retired Surface Target, Boundary Impact, or Tests Required.

Return `BLOCKED: repo map missing` only for normal implementation plans that do not show repo-map searches.

## Coding Workflow

1. Re-run the repo-map search locally.
   - Search for `normalize*`, `format*`, `validate*`, `resolve*`, `select*`, `build*`, `create*`.
   - Search for old aliases, compatibility fields, wrappers, direct repository callers, and old entrypoints named by the plan.
   - Search in `src/**`, `tests/**`, relevant `scripts/**`, and relevant docs/plans.

2. Choose the first valid implementation option:
   - Reuse an existing repo primitive.
   - Reuse an already-installed library.
   - Extract a narrow shared primitive and delete/narrow old implementations in the same PR.
   - Add a local helper only with explicit no-go evidence.

3. Retire old surface while coding.
   - Do not leave old wrappers, aliases, compatibility fields, or direct paths active unless the PR says it is not debt reduction and explains why.
   - Shared primitive/controller/service/presenter/helper work must migrate at least two old call sites and delete/narrow old implementations unless repo-wide search proves fewer than two old call sites exist.
   - For refactor pipelines, surfaces listed under `Required Retired Surfaces` must actually be deleted. Renaming, moving, narrowing, or leaving compatibility wrappers is not completion unless the plan is explicitly `PLAN_BLOCKED`.

4. Keep boundaries intact.
   - Business UI must not default to browser services.
   - UI/hooks must not import infrastructure.
   - Domain must not import UI or services.
   - Service repository passthrough must retire at least one direct repository caller.

5. Return only the current-stage handoff below. The monitor owns preflight,
   PR evidence, full gates, CodeScene, reviewer, CI, and ChatGPT stages.

## Forbidden Without Hard Evidence

Do not add:

- A wrapper while leaving the old wrapper or direct path active.
- A service method that only returns `repository.*(...)` without retiring a direct caller.
- A new `normalize*`, `format*`, `validate*`, `resolve*`, `select*`, `build*`, or `create*` helper without Reuse Proof.
- Singular/plural compatibility state such as `target` plus `targets`.
- Alias actions such as `onSaveX` plus `saveX`.
- UI defaults bound to browser services.
- UI imports from infrastructure.
- Domain imports from UI or services.
- Tests that only update expectations while missing behavior-equivalence coverage.

## Current-Stage Handoff

Required PR Body Evidence is monitor-owned. Return these four concrete groups:

1. Implementation files and purpose.
2. Scope accounting: reuse decision, new-surface result, and boundary delta.
3. Retired/deleted surface proof, including every refactor `RS-*` item.
4. Focused tests actually run and their results, including behavior-equivalence
   coverage when a compatibility surface was retired.

Do not claim or request a reviewer verdict, PR URL/body, CI, ChatGPT,
monitor-owned CodeScene, or future full-gate evidence.

## Required Output Schema

```md
## Verdict

CODE_READY / BLOCKED

## Skill Evidence

- Skill file read: skills/metronome_coder.md
- Debt gate map read: docs/architecture/debt-gate-map.md

## Files Changed

| File | Purpose |
|---|---|

## Scope Accounting

| Need | Existing primitive/library checked | Files read | Decision |
|---|---|---|---|

## Retired/Deleted Surface Proof

| Removed/narrowed surface | Old callers migrated | Replacement |
|---|---|---|

## New Surface and Boundary Delta

- UI -> browser adapter direct imports added:
- UI -> infrastructure imports added:
- Domain -> UI/service imports added:
- Service passthrough methods added:
- Repository direct callers reduced:

## Focused Tests

| Command | Result |
|---|---|

## Blockers

| Blocker | Required fix |
|---|---|
```

## Verdict Handling

- `CODE_READY`: return the handoff to the monitor for preflight.
- `BLOCKED`: do not request a downstream stage until the blocker is fixed.
