## Summary


## Reuse Proof

| Capability ID | Need | Class | Source kind | Exact source / version | Exact API / probe | Files read | Decision | No-fit / policy evidence |
|---|---|---|---|---|---|---|---|---|

### Capability Implementation Map

| Capability ID | Changed files / symbols | Tests / probes |
|---|---|---|

Capability plan path:
Capability plan commit:
Capability plan blob:
Capability plan SHA-256:

Local-policy approval tokens belong in their capability rows. For every
local-policy row, include the matching immutable `LOCAL_POLICY_APPROVED` evidence
in `Agent Gate Evidence`. Record actual passed implementation probes; a failed
probe blocks and never permits silent local fallback.

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

- CodeScene MCP `analyze_change_set`:
- `npm run validate:debt-gates`:
- `npm run lint:debt:changed`:
- `npm run lint:xo:changed`:
- `npm run lint`:
- `npm run typecheck`:
- `npm run test:unit`:
- `npm run build`:

## Agent Gate Evidence

- Planner skill read evidence:
- Planner skill verdict:
- Coder skill read evidence:
- Coder repo map / primitive search:
- Reviewer skill read evidence:
- Reviewer verdict:
- Codex final review prompt/verdict:
- ChatGPT final review prompt/verdict:
- Overlay plan path:
- Overlay plan commit:
- Overlay plan blob:
- Overlay plan SHA-256:
- Independent plan review policy:
- Independent plan review verdict:
- Current metronome Stage:
- Reuse-admission conformance applicability:
- Reuse-admission conformance status:
- Reuse-admission conformance Capability plan identity reference: Reuse Proof
- Reuse-admission conformance candidate HEAD:
<!--
Applicability is REQUIRED only for the exact canonical twelve-file control set;
all other candidates use NOT_APPLICABLE. MSO-5 permits triggered PENDING or
complete PASS. MSO-6 requires triggered PASS. Non-triggered work uses
NOT_APPLICABLE at either stage.

For PASS only, add each field exactly once:
- RED baseline commit: <lowercase current git merge-base origin/main HEAD>
- RED families with at least one oracle mismatch: 4/4
- GREEN families matched: 4/4
- GREEN negative cases matched: 8/8
- GREEN positive controls matched: 4/4
- GREEN metamorphic pairs matched: 4/4
Then add exactly twelve unique RED and twelve unique GREEN actual lines over the
same opaque IDs:
RED | <opaque-case-id> | <actual-top-level-verdict> | <actual-code-or-NONE>
GREEN | <opaque-case-id> | <actual-top-level-verdict> | <actual-code-or-NONE>
Do not persist prompts, packets, expected answers, oracle data, full outputs, or
transcripts.

Overlay/control promotion uses MSO-5 with ChatGPT PENDING, or MSO-6 with
ChatGPT PASS or PASS_WITH_NITS. External ChatGPT starts only after conformance
PASS or NOT_APPLICABLE and the evidence edit's exact-head CI.
-->
