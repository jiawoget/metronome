# Debt Gate Map

This file is the required repo map entrypoint for debt-prevention PRs. It is not a full architecture document; it lists the boundaries and primitive checks that agents must consult before planning, coding, or reviewing.

## Repo Map Inputs

Agents must search beyond the local file they intend to edit:

- `src/**`
- `tests/**`
- `scripts/**` when tooling or test helpers are touched
- `docs/v1/implementation-slices/plans/**` for active slice plans
- `docs/refactor/src-debt-forensics-2026-07-04/99-remediation-plan.md` for current debt acceptance gates

Required search families:

- `normalize*`, `format*`, `validate*`, `resolve*`, `select*`, `build*`, `create*`
- service, repository, controller, hook, adapter, read-model names related to the change
- old aliases, compatibility fields, wrappers, and direct callers named in the plan

## Shared Primitive Rule

A PR that extracts a shared primitive, controller, service, presenter, formatter, validator, parser, adapter, or helper is not debt reduction unless it:

1. Migrates at least two old call sites to the shared surface.
2. Deletes or narrows the old implementation paths in the same PR.
3. Lists the retired surface in the PR body.
4. Includes behavior-equivalence coverage when deleting compatibility surface.

If fewer than two old call sites exist, the plan must say so with repo-wide search evidence and must not claim shared-primitive debt reduction.

## Boundary Rules

Block new imports or defaults that move runtime dependencies inward:

- `src/components/**` and `src/hooks/**` must not import `@/infrastructure/**`.
- Business components must not default props to browser services.
- `src/domain/**` must not import `src/components/**`, `@/components/**`, `src/services/**`, or `@/services/**`.
- Service methods that only return `repository.*(...)` must retire at least one direct repository caller in the same PR.
- Composition-root exceptions must be named explicitly in the plan and PR body.

## Review Preflight Gates

The code review agent must run gates in this order before normal review:

1. CodeScene score/delta for changed production source files.
   - Primary path is CodeScene MCP `analyze_change_set` against the PR base ref.
   - Shell `npm run lint:codescene:changed` is fallback only when MCP is unavailable, and fallback evidence must explain why MCP could not run.
   - Missing shell token/env is not a valid reason to skip MCP.
   - Any Code Health decline is `CHANGES_REQUIRED`.
   - If CodeScene cannot run for a production-source PR, review is blocked unless the user explicitly grants a one-off override.
2. Semgrep changed-file gate.
   - `npm run lint:debt:changed` must pass.
   - Any Semgrep failure is `CHANGES_REQUIRED`.

Only after both preflight gates pass may the reviewer inspect normal correctness.

## Retired Surface Examples

Examples of surfaces that must be listed when touched:

- local `resolveTarget*` or target-resolution copies
- local duration/timestamp formatters
- `onSaveX` / `saveX` alias pairs
- singular/plural compatibility fields such as `continueTarget` plus `continueTargets`
- UI-owned browser adapter defaults
- direct repository callers replaced by service/controller boundaries
