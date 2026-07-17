# Refactor Pipeline Planning Template

Use this template for CodeScene/refactor/debt-reduction pipelines under
`docs/v1/implementation-slices/refactor/`.

Read and follow `.agents/skills/metronome-workflow/SKILL.md` first. Refactor
plans must not prewrite large implementation bodies.

The output is a strict coding handoff. It is not a broad strategy document.
Do not let the coding agent reinterpret the remediation plan. Do not create
optional architecture work. Every new surface must be tied to same-PR deletion
of old surface.

## Hard Output Rules

- Maximum length: 120 lines unless the monitor explicitly asks for more.
- Use exactly the sections below.
- Do not duplicate the same instruction across multiple sections.
- Do not include background unless it directly constrains coding.
- Do not mark a pipeline as a phase closeout unless the whole phase is actually completed.
- If required evidence is missing, output `PLAN_BLOCKED` and stop.

## 0. Verdict

Verdict: `PLAN_READY` / `PLAN_BLOCKED`

If `PLAN_BLOCKED`, list only:

- missing file/evidence:
- why it blocks safe coding:
- what must be read or produced next:

Do not provide a speculative implementation plan when blocked.

## 1. Pipeline Contract

Pipeline ID: `<R-xx / slice name>`

One-PR objective:

- `<one sentence describing the exact debt to reduce>`

Target debt pattern:

- `<semantic duplication / boundary mixing / compatibility residue / wrapper residue / controller bloat>`

Allowed production files:

- `<file 1>`
- `<file 2 if absolutely necessary>`

Allowed test files:

- `<test file 1>`
- `<test file 2>`

Explicitly out of scope:

- `<sibling component / service / hook / adapter / route / schema / unrelated behavior>`
- `<known debt that must not be fixed in this PR>`

This pipeline is not allowed to:

- widen public API
- add a new service/hook/controller/repository method
- move browser adapter defaults unless this is the explicit objective
- change visible user messages unless listed in the behavior contract
- touch unrelated timing, test harness, route, schema, or storage behavior

## 2. Coding Read Set

### Must read before coding

Maximum 5 files.

| File | Why coding must read it | Decision it informs |
|---|---|---|
| `<path>` | `<specific reason>` | `<specific decision>` |

### Planner-only evidence

These files informed this plan but should not be reread by coding unless the
plan is blocked.

| File | Why coding should not start from it |
|---|---|
| `<remediation / scan / broad strategy doc>` | `<already distilled into this plan>` |

### Read only if blocked

Maximum 5 files.

| File | Trigger for reading |
|---|---|
| `<path>` | `<specific condition>` |

## 3. Existing Behavior Contract

The coding agent must preserve:

- Public props / exported API: `<exact contract>`
- URL/query/storage contract: `<exact contract>`
- Visible user messages: `<exact messages or "unchanged from current tests">`
- Store/state-machine semantics: `<exact state transitions/actions that must remain owner>`
- Critical ordering: `<example: validation must happen before startCapture()>`
- Error/rollback behavior: `<exact behavior to preserve>`
- Tests or harness events that must not change: `<exact surface>`

If preserving these requires widening scope, stop and report `PLAN_BLOCKED`.

## 4. Required Retired Surfaces

A refactor PR is not valid unless the listed old surfaces actually disappear in
the same PR.

| ID | Old surface to delete | Why it is debt | Replacement | Required proof | Behavior test |
|---|---|---|---|---|---|
| RS-1 | `<function / branch chain / wrapper / alias / duplicate block>` | `<duplication / partial validator / boundary leak / wrapper residue>` | `<existing primitive or allowed local helper>` | `<rg / diff proof>` | `<test file / assertion>` |

Rules:

- At least one retired surface is required.
- Adding a helper without deleting the old implementation is failure.
- Renaming an old helper is not deletion.
- Moving duplicate logic to a new file is not deletion.
- Leaving old aliases/wrappers for compatibility is failure unless this plan explicitly marks the pipeline `PLAN_BLOCKED`.

## 5. Allowed New Surface Budget

| Proposed new surface | Allowed? | Constraints | Required retired surface |
|---|---:|---|---|
| Local unexported helper | yes/no | Must be pure unless explicitly stated; no store writes; no UI messages; no side effects. | `<RS-id>` |
| Local type alias / discriminated union | yes/no | Internal only; no exported API. | `<RS-id>` |
| New file | default no | Do not create by default. If the target file becomes materially unreadable, stop and report instead of expanding scope. | none |
| New hook/controller/service/facade | no | Would widen surface. | none |
| New repository method | no | Would widen persistence contract. | none |
| New domain primitive | no unless explicit | Must be pure and replace at least two old production call sites. | `<RS-id>` |

Hard rule: if the plan cannot name the retired surface tied to a new surface,
the new surface is not allowed.

## 6. Implementation Steps

Maximum 6 steps.

Each step must use this format:

### Step `<n>`: `<short name>`

Edit:

- `<file>`

Do:

- delete `<RS-id / old surface>`
- replace with `<specific existing primitive or allowed new local surface>`

Do not change:

- `<specific stable behavior / file / API>`

Safety:

- `<pure helper / stale guard / ownership / ordering constraint, if relevant>`

Deletion proof:

- `<exact rg or diff check>`

Behavior proof:

- `<exact test or assertion>`

Do not include optional architecture alternatives here. If the coding agent
discovers the step requires out-of-scope work, it must stop and report the
blocker.

## 7. Async / State / Side-Effect Safety

Required if the plan touches async reads, store writes, effects, capture/save,
persistence, or UI messages.

The implementation must preserve:

- Pure resolver/helper rule: `<helper may read services and return result, but must not write store/message/state>`
- Stale async guard: `<capture identity before await; verify identity still matches after await before writing state>`
- Store ownership: `<store action names that remain the only writers>`
- Capture/save ordering: `<validation before capture / rollback after failure / finish after save>`
- Effect dependency constraint: `<avoid adding unstable object deps unless necessary>`

If these cannot be preserved, the plan is blocked.

## 8. Verification Before Review Handoff

Coding agent must report exact evidence.

Required commands:

```bash
<unit test command>
<store/domain test command if relevant>
<typecheck command>
<lint command for edited files>
```

Required deletion proofs:

```bash
<rg "oldHelperName" target-file>
<rg "old direct call pattern" target-file>
```

Required review gates:

- changed-file Code Health must not decline, if CodeScene is available
- no new infrastructure/browser import unless explicitly allowed
- no new public API unless explicitly allowed
- no out-of-scope file changed
- retired surface list must match the actual diff

Optional commands only if touched behavior warrants them:

```bash
<e2e command>
<broader regression command>
```

## 9. Final Coding Agent Handoff

Write 8-12 lines only.

Must include:

- files to edit
- old surfaces to delete
- the only allowed new surface
- behavior that must stay unchanged
- out-of-scope areas
- required tests
- required deletion proof
- stop condition if scope expands
