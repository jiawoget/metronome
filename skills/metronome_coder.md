# Metronome Coding Skill

Read `.agents/skills/metronome-workflow/SKILL.md` first. The full role contract below remains in force; the overlay takes precedence for shared workflow, model routing, pause, and promotion rules.

This coder is a hard gate for every task. Do not edit production code until an approved immutable plan has `PLAN_READY`, matching immutable plan identity, independent `PLAN_REVIEW_PASS`, and the reviewed capability table and delivery map. The coder implements that reviewed decision; it does not rediscover a substitute architecture or silently change a source.

## Required Input Packet

Before editing, read and list:

- Approved plan path under `docs/v1/implementation-slices/plans/` and its immutable commit, blob, and SHA-256.
- The reviewed `## Existing Primitive Search` table and `### Capability Delivery Map`, with the exact stable capability-ID set.
- Independent `PLAN_REVIEW_PASS` and one matching `LOCAL_POLICY_APPROVED <Cxx> <planCommit> <planBlob> <planSha256>` line for every local-policy row.
- `docs/architecture/debt-gate-map.md`.
- Relevant `docs/agent-index/*.md`.
- Existing primitives, services, repositories, hooks, controllers, adapters, and tests named by the reviewed plan.
- `package.json`, lockfile, and installed-package material only when the reviewed source requires them.

Return top-level `BLOCKED` with `BLOCKER_CODE reviewed-capability-table-missing` when a plan lacks the reviewed table/map or immutable review evidence. Return top-level `BLOCKED` with `BLOCKER_CODE capability-plan-identity-mismatch` when its path, commit, blob, SHA-256, approval lines, or table does not exactly match the reviewed immutable plan.

## Coding Workflow

### 1. Revalidate the reviewed admission decision

1. Re-run the repo-map search named by the plan, including same-semantics primitives, old aliases, compatibility fields, wrappers, direct callers, and relevant `src/**`, `tests/**`, scripts, and docs/plans.
2. Re-run every selected-source probe in the exact implementation environment. Record the exact resolved version, export, API, observed behavior, and passed result.
3. Stop before implementation and return `BLOCKED` with `BLOCKER_CODE capability-probe-mismatch` if the reviewed version, export, API, behavior, or probe result differs.
4. A failed non-local source never permits a local helper, handwritten equivalent, substituted package, or changed API. Return the mismatch to plan review; only a reviewed immutable plan revision may select another source.

### 2. Implement only the reviewed composition

1. Reuse the reviewed repository, installed, OSS, or platform primitive directly where the table says `direct-use`.
2. Keep `thin-policy` and `local-policy` code product-specific, explicit, and composed around the referenced generic `Cxx` capability. Policy may constrain the selected primitive but must not reimplement a generic operation.
3. A local-policy implementation must preserve `policy-boundary:`, its reviewed `composes:` target (or `none`), `generic-operation: none`, and the matching immutable approval identity. Missing or stale approval is `BLOCKED` with `BLOCKER_CODE local-policy-approval-mismatch`.
4. A `local-no-fit` generic implementation is allowed only exactly where the reviewed table has all four repo/installed/OSS/platform no-fit results. Do not broaden it into a new shared helper or abstraction without a reviewed plan revision.
5. Map every changed behavior and its supporting test/probe to one or more reviewed capability IDs. A plan decision of `direct-use` forbids a handmade equivalent helper.

### 3. Preserve surface and boundaries

- Retire old wrappers, aliases, compatibility fields, and direct paths named by the plan; do not defer known cleanup.
- A shared primitive/controller/service/presenter/helper must migrate at least two old call sites and delete/narrow old implementations unless the plan proves fewer than two old call sites and makes no debt-reduction claim.
- Business UI must not default to browser services; UI/hooks must not import infrastructure; domain must not import UI/services; a service repository passthrough must retire at least one direct repository caller.
- Behavior-equivalence coverage is required when retiring compatibility surface. Run focused tests for non-trivial logic and browser/E2E verification for UI, recording, or media workflows when the plan requires them.

## Forbidden Without Hard Evidence

Without a reviewed immutable plan revision, do not add or substitute:

- A local helper, wrapper, parser, normalizer, formatter, validator, resolver, selector, builder, or creator after a selected non-local source fails.
- A package/version/export/API not present in the immutable reviewed table.
- Product-policy code that performs a generic parse, normalization, validation, formatting, conversion, or other reimplementation hidden behind policy language.
- A wrapper while leaving the old wrapper or direct path active.
- A service method that only returns `repository.*(...)` without retiring a direct caller.
- Singular/plural compatibility state, alias actions, UI browser-service defaults, UI infrastructure imports, domain UI/service imports, or tests that merely update expectations without required behavior-equivalence coverage.

## Required PR Body Evidence Source

Required PR body evidence remains monitor-owned. The coder supplies exact source data for the monitor to copy into `## Reuse Proof`; it does not claim a PR verdict, PR URL/body completion, CI, ChatGPT, CodeScene, or a downstream reviewer result.

Conditional reuse-admission conformance is also monitor-owned and occurs only
after a committed candidate passes preflight and independent candidate review.
The coder does not run role projections, assign applicability/status, compare a
hidden oracle, or persist prompts/results. Its implementation map and direct-use
diff evidence remain the candidate-review inputs; a projected role verdict is
never coding or promotion authorization.

Return these five concrete groups:

1. Implementation files and purpose.
2. Scope accounting: reviewed capability decision, new-surface result, and boundary delta.
3. Retired/deleted surface proof, including every planned retired surface.
4. Exact source probes and focused tests actually run, with actual results.
5. The monitor-consumable capability PR evidence below.

The fifth group must reproduce the exact reviewed capability source selections with actual implementation probes, not plan placeholders:

```md
## Capability PR Evidence for Monitor

Capability plan path: docs/v1/implementation-slices/plans/<plan>.md
Capability plan commit: <lowercase 40-hex>
Capability plan blob: <lowercase 40-hex>
Capability plan SHA-256: <lowercase 64-hex>

## Reuse Proof

| Capability ID | Need | Class | Source kind | Exact source / version | Exact API / probe | Files read | Decision | No-fit / policy evidence |
|---|---|---|---|---|---|---|---|---|

For every local-policy row, use exactly:
approval: <Cxx>@<lowercase 40-hex commit>/<lowercase 40-hex blob>/<lowercase 64-hex sha256>

### Capability Implementation Map

| Capability ID | Changed files / symbols | Tests / probes |
|---|---|---|
```

The implementation map has non-empty cells, the exact same C-ID set as `Reuse Proof`, and covers every changed behavior and supporting test/probe. The monitor validates the PR evidence and tracked plan/approval identity without executing probes; the independent reviewer decides source fit, policy thinness, map truth, hidden handmade equivalents, diff conformance, and test correctness.

## Required Output Schema

```md
## Verdict

CODE_READY / BLOCKED

When the verdict is BLOCKED, add this exact next line:
BLOCKER_CODE <stable-code>

## Skill Evidence

- Skill file read: skills/metronome_coder.md
- Debt gate map read: docs/architecture/debt-gate-map.md
- Immutable reviewed capability plan read: <path>@<commit>/<blob>/<sha256>

## Files Changed

| File | Purpose | Capability IDs |
|---|---|---|

## Scope Accounting

| Capability ID | Reviewed source/decision | Exact probe rerun | Implementation result |
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

| Command | Result | Capability IDs |
|---|---|---|

## Capability PR Evidence for Monitor

Capability plan path: docs/v1/implementation-slices/plans/<plan>.md
Capability plan commit: <lowercase 40-hex>
Capability plan blob: <lowercase 40-hex>
Capability plan SHA-256: <lowercase 64-hex>

## Reuse Proof

| Capability ID | Need | Class | Source kind | Exact source / version | Exact API / probe | Files read | Decision | No-fit / policy evidence |
|---|---|---|---|---|---|---|---|---|

### Capability Implementation Map

| Capability ID | Changed files / symbols | Tests / probes |
|---|---|---|

## Blockers

| Blocker | Required fix |
|---|---|
```

## Verdict Handling

- `CODE_READY`: return only the current-stage handoff and monitor-consumable evidence for preflight.
- `BLOCKED`: do not edit around the mismatch or request a downstream stage. Use a stable `BLOCKER_CODE`, repair through the reviewed plan when required, and restart from the exact immutable evidence.
