# Metronome Planner Skill

This planner is a hard gate. A plan that lacks reuse proof, repo-map evidence, surface accounting, or retirement targets is not a plan; output `BLOCKED`.

## Refactor Pipeline Template

For CodeScene/refactor/debt-reduction pipelines such as `R-xx`, the planner must use:

- `docs/v1/implementation-slices/refactor/refactor-pipeline-planning-template.md`

The refactor template supersedes the generic output schema below. Write refactor pipeline plans under `docs/v1/implementation-slices/refactor/`, not under `docs/v1/implementation-slices/plans/`.

For refactor pipelines:

- Output `PLAN_READY` / `PLAN_BLOCKED`, not `BLOCKED`.
- Keep the coding read set small and split into `Must read before coding`, `Planner-only evidence`, and `Read only if blocked`.
- Required retired surfaces must be actual deletions. Do not count narrowing, renaming, moving, or leaving compatibility wrappers as deletion.
- Implementation steps must be coding handoff steps, not a broad strategy.
- If the pipeline appears too large for one PR, output `PLAN_BLOCKED` and ask the monitor to confirm a split; do not invent sub-pipelines.
- Do not claim a remediation phase is complete unless the whole phase is actually complete.

## Required Input Packet

Before planning, gather and list the exact inputs read:

- User request and active slice/stage name.
- Relevant `docs/agent-index/*.md`.
- Relevant `docs/v1/implementation-slices/*.md`.
- Relevant prior plans under `docs/v1/implementation-slices/plans/`.
- `docs/architecture/debt-gate-map.md`.
- `docs/refactor/src-debt-forensics-2026-07-04/99-remediation-plan.md` for known debt areas.
- `package.json` when choosing libraries or tooling.
- Existing code and tests named by the repo-map search.

For metronome v1 implementation slices, the approved plan must be written under `docs/v1/implementation-slices/plans/`. For refactor pipelines, the approved plan must be written under `docs/v1/implementation-slices/refactor/`. A chat-only plan is `BLOCKED`.

## Planning Workflow

1. Freeze scope.
   - Name the slice/stage.
   - Name files or modules likely in scope.
   - Name no-go areas.

2. Build the repo map.
   - Search beyond the target file.
   - Include `src/**`, `tests/**`, relevant `scripts/**`, and relevant docs/plans.
   - Use focused `rg` searches for `normalize*`, `format*`, `validate*`, `resolve*`, `select*`, `build*`, `create*`, service methods, repository methods, hooks, controllers, adapters, aliases, compatibility fields, and direct callers.
   - If a generated primitive index exists, read it and cite it. If it does not exist, the repo map table below is mandatory.

3. Prove reuse first.
   - Prefer existing repo primitives.
   - Then prefer already-installed libraries.
   - Then extract a shared primitive only if old call sites will be migrated and old implementations will disappear.
   - Add a local helper only with explicit no-go evidence.

4. Account for surface.
   - Every new helper/service/controller/hook/formatter/validator/parser/adapter/repository method must have a matching old surface retired or narrowed in the same PR.
   - If no old surface can be retired, the plan must say this is not a debt-reduction PR.

5. Check boundaries.
   - UI -> browser adapter direct imports added: yes/no.
   - UI -> infrastructure imports added: yes/no.
   - Domain -> UI/service imports added: yes/no.
   - Service passthrough methods added: yes/no.
   - Repository direct callers reduced: yes/no.

6. Define tests.
   - Behavior-equivalence coverage is mandatory when deleting compatibility surface.
   - Focused unit tests are mandatory for non-trivial logic.
   - Browser/E2E verification is mandatory for UI workflow or recording/media behavior.

## Hard Fail

Output `BLOCKED` if any of these are true:

- Required input packet is missing.
- Repo map evidence is missing.
- Existing Primitive Search table is missing, empty, or evidence-free.
- New Surface Budget table is missing, empty, or evidence-free.
- Retired Surface target is missing for a refactor/debt PR.
- The plan says "clean up later" for a known wrapper, alias, compatibility field, duplicate helper, or old entrypoint.
- A shared primitive/controller/service/presenter/helper is proposed without either at least two old call sites to migrate and old implementations to delete, or repo-wide search evidence that fewer than two old call sites exist and no debt-reduction claim is being made.
- Boundary Impact has `yes` for UI -> browser/infrastructure, domain -> UI/service, or service passthrough without a named composition-root exception.
- Tests do not cover behavior equivalence for retired compatibility surface.

For refactor pipelines, output `PLAN_BLOCKED` if the refactor template sections are missing, if `Required Retired Surfaces` is empty, if implementation steps do not name exact deletion proof, or if a new surface is not tied to same-PR deletion.

## Required Output Schema

Use this exact structure:

```md
## Verdict

PLAN_READY / BLOCKED

## Skill Evidence

- Skill file read: skills/metronome_planner.md
- Debt gate map read: docs/architecture/debt-gate-map.md

## Scope

- Slice/stage:
- In scope:
- Out of scope:

## Inputs Read

| File | Why read |
|---|---|

## Repo Map Evidence

| Search | Command or source | Files found | Decision |
|---|---|---|---|

## Existing Primitive Search

| Need | Search terms used | Existing primitive/library found | Files read | Decision |
|---|---|---|---|---|

Decision must be `Reuse`, `Extract and retire old copies`, or `No-go, with evidence`.

## Shared Primitive Call-Site Audit

| Proposed shared surface | Old call sites found repo-wide | Old call sites migrated in this PR | Old implementations deleted/narrowed | Debt-reduction claim |
|---|---|---|---|---|

## New Surface Budget

| New surface | Why needed | Existing alternative rejected | Old surface retired in same PR |
|---|---|---|---|

## Retired Surface Target

| Surface to remove/narrow | Current callers | Replacement | Behavior-equivalence test |
|---|---|---|---|

## Boundary Impact

- UI -> browser adapter direct imports added: yes/no, evidence:
- UI -> infrastructure imports added: yes/no, evidence:
- Domain -> UI/service imports added: yes/no, evidence:
- Service passthrough methods added: yes/no, evidence:
- Repository direct callers reduced: yes/no, evidence:

## Tests Required

| Behavior | Test file/type | Why it gates merge |
|---|---|---|

## No-Go / Deferrals

| Item | Reason | Follow-up owner |
|---|---|---|
```

## Verdict Handling

- `PLAN_READY`: coding may start only after the plan file is written.
- `BLOCKED`: do not code. Fix the plan and rerun the plan review gate.
