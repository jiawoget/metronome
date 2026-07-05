## Summary

<!-- Explain the user-visible change. For docs/tooling-only PRs, say so explicitly. -->

## Reuse Proof

Every non-trivial helper, service method, controller, hook, formatter, validator, parser, adapter, or repository method must prove that existing repo primitives and installed libraries were checked first.

| Need | Search terms used | Existing primitive/library checked | Files read | Decision |
|---|---|---|---|---|
|  |  |  |  | reuse / extract-and-retire / no-go |

## Retired Surface

A refactor PR is not debt-reducing unless it removes or narrows old surface. For Phase 0 tooling-only PRs, state `tooling-only; no runtime surface`.

| Removed / narrowed surface | Old callers migrated | Replacement |
|---|---|---|
|  |  |  |

## New Surface

| New helper/service/type/component/gate | Why existing surface was insufficient | Old surface retired in same PR |
|---|---|---|
|  |  |  |

## Boundary Delta

- UI/component direct browser adapter imports added: yes/no
- UI/component direct infrastructure imports added: yes/no
- Domain imports from service/component added: yes/no
- Service pass-through methods added: yes/no
- Repository direct callers reduced: yes/no/not applicable

## Debt Gate Evidence

- `npm run validate:debt-gates`: pass/fail/not run
- `npm run lint:debt:changed`: pass/fail/not run
- `npm run debt:primitive-index`: pass/fail/not run
- CodeScene changed-file baseline/review: attached/not connected/not applicable
- Behavior-equivalence tests for retired compatibility surface: pass/fail/not applicable

## Reviewer Contract

A reviewer should request changes if this PR adds a wrapper, alias, local normalize/format/validate helper, browser adapter import, or service pass-through without a matching Reuse Proof and Retired Surface entry.
