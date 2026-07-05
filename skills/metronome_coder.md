# Metronome Coding Skill

This coder is a hard gate. Do not edit production code until an approved plan has `PLAN_READY` and includes repo-map evidence, surface accounting, and retired-surface targets.

## Required Input Packet

Before editing, read and list:

- Approved plan file path under `docs/v1/implementation-slices/plans/`.
- `docs/architecture/debt-gate-map.md`.
- Relevant `docs/agent-index/*.md`.
- Existing primitives, services, repositories, hooks, controllers, adapters, and tests named by the plan.
- `package.json` when library reuse is relevant.

Return `BLOCKED: plan missing debt contract` if the plan lacks Existing Primitive Search, Shared Primitive Call-Site Audit, New Surface Budget, Retired Surface Target, Boundary Impact, or Tests Required.

Return `BLOCKED: repo map missing` if the plan does not show repo-map searches.

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

4. Keep boundaries intact.
   - Business UI must not default to browser services.
   - UI/hooks must not import infrastructure.
   - Domain must not import UI or services.
   - Service repository passthrough must retire at least one direct repository caller.

5. Fill PR body evidence before requesting review.

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

## Required PR Body Evidence

Fill these sections with concrete rows, not placeholders:

- `Reuse Proof`
- `Retired Surface`
- `New Surface`
- `Boundary Delta`
- `Debt Gate Evidence`
- `Agent Gate Evidence`

`Reuse Proof` must include search terms, files read, and reuse/extract/no-go decision.

`Retired Surface` must list old helpers, aliases, state fields, service methods, wrappers, or direct imports removed/narrowed. If no retired surface exists, state `Not a debt-reduction PR; no retired surface`.

`New Surface` must list every new helper/service/type/component or state `No new surface`.

`Agent Gate Evidence` must include `PLAN_READY`, `CODE_READY`, reviewer `PASS` or `PASS_WITH_NITS`, and ChatGPT `PASS` or `PASS_WITH_NITS`.

## Required Verification

Run the smallest useful behavior tests plus the repo gates:

- Behavior-equivalence tests for retired compatibility surface.
- Focused unit tests for touched behavior.
- `npm run validate:debt-gates`
- `npm run lint:debt:changed`
- `npm run lint:xo:changed`
- `npm run lint`
- `npm run typecheck`
- `npm run test:unit`
- `npm run build`

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

## Reuse Proof Written

| Need | Existing primitive/library checked | Files read | Decision |
|---|---|---|---|

## Retired Surface Written

| Removed/narrowed surface | Old callers migrated | Replacement |
|---|---|---|

## New Surface Written

| New surface | Old surface retired | Net result |
|---|---|---|

## Boundary Delta Written

- UI -> browser adapter direct imports added:
- UI -> infrastructure imports added:
- Domain -> UI/service imports added:
- Service passthrough methods added:
- Repository direct callers reduced:

## Verification

| Command | Result |
|---|---|

## Blockers

| Blocker | Required fix |
|---|---|
```

## Verdict Handling

- `CODE_READY`: request reviewer gate.
- `BLOCKED`: do not request review until the blocker is fixed.
