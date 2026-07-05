## Summary


## Reuse Proof

| Need | Existing primitive/library checked | Files read | Decision |
|---|---|---|---|

Shared primitive call-site migration:

## Retired Surface

| Removed / narrowed surface | Old callers migrated | Replacement |
|---|---|---|

## New Surface

| New helper/service/type/component | Why not reuse existing | Old surface removed in same PR |
|---|---|---|

Net surface delta:

## Boundary Delta

- UI -> browser adapter direct imports added:
- Domain -> UI/service imports added:
- Service passthrough methods added:
- Repository direct callers reduced:

## Debt Gate Evidence

- `npm run validate:debt-gates`:
- `npm run lint:debt:changed`:
- `npm run lint:xo:changed`:
- `npm run lint`:
- `npm run typecheck`:
- `npm run test:unit`:
- `npm run build`:

## Agent Gate Evidence

- Planner skill verdict:
- Coder repo map / primitive search:
- Reviewer verdict:
- ChatGPT final review prompt/verdict:
