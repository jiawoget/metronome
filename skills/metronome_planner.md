# Metronome Planner Skill

Read `.agents/skills/metronome-workflow/SKILL.md` first. The full role contract below remains in force; the overlay takes precedence for shared workflow, model routing, pause, and promotion rules.

This planner is a hard gate for every task. A plan without complete capability-admission evidence, repo-map evidence, surface accounting, or required retirement targets is not a plan. Return `PLAN_BLOCKED`; do not substitute architecture guesses, local helpers, or a chat-only plan.

`PLAN_READY` never authorizes coding by itself. Coding starts only after the written plan has immutable identity and an independent `PLAN_REVIEW_PASS`, as required by the overlay.

## Required Input Packet

Before Pass A, gather and list:

- User request and active slice/stage name.
- Relevant `docs/agent-index/*.md`.
- Relevant `docs/v1/implementation-slices/*.md`.
- Relevant prior plans under `docs/v1/implementation-slices/plans/`.
- `docs/architecture/debt-gate-map.md`.
- `docs/v1/implementation-slices/rules/external-library-first.md`, the normative capability schema and relation contract.

Before Pass B, the monitor follows up to the same planner with its normalized discovery/research evidence plus the exact code, tests, manifests, lockfiles, installed-package material, and official sources inspected for those atoms. Pass A cannot require evidence for atoms that it has not produced yet.

For metronome v1 implementation slices, the approved plan must be written under `docs/v1/implementation-slices/plans/`. A chat-only plan is `PLAN_BLOCKED`.

## Planning Workflow

This protocol applies to every task, including work that is not a refactor. It separates planner, monitor, researcher, reviewer, and promotion duties; it does not create a second workflow or an evidence artifact outside the plan.

### Pass A: Architecture-Free Capability Atomization

1. State each requested behavior as a capability atom before proposing files, modules, services, repositories, wrappers, helpers, or architecture.
2. Give each atom a provisional stable `C\d{2,}` capability ID.
3. Classify the need only as `generic` or `product-policy`; do not choose a source or a local implementation in Pass A.
4. Hand the atom list to the monitor. End the initial invocation after the Pass A table without a final verdict; the monitor returns normalized evidence by following up to this same planner for Pass B. No second plan file or status artifact is created.
5. The planner must not bypass the monitor by treating a guessed API, a package name, documentation alone, or a local design as proof of fit.

#### Interim Monitor Handoff

The initial invocation returns only this ephemeral monitor packet; it is not a plan, verdict, overlay stage, or authorization to code:

```md
## Capability Atomization (Pass A)

| Capability ID | Architecture-free need | Class |
|---|---|---|
```

The monitor performs discovery/research and follows up to the same planner. Only that Pass B continuation may use the final verdict schema below.

### Monitor-Owned Discovery and Research

The monitor, not the planner, owns these ephemeral operations and returns normalized results only:

1. Search repository paths and symbols for every atom.
2. Check the lockfile and exact installed versions.
3. Read relevant installed-package exports, types, and source.
4. Run bounded direct runtime/repository probes for plausible repo or installed candidates.
5. Stop discovery for an atom when an exact fitting repo or installed primitive passes its probe.
6. Consider product-policy composition only after the referenced generic atom is resolved.

For a still-uncovered `generic` atom, the monitor applies the shared rule's exact OSS/platform admission, probe, no-fit, and stop limits through the official Open GSD v1.7.0 read-only researcher adapter. Context7 unavailability records `provider_fallback` to official web documentation. Researchers return ephemeral evidence only to the monitor; they create no `.planning/**`, cache, graph, status, research artifact, second workflow, or direct planner/researcher mesh.

### Pass B: Selection and Delivery Planning

Begin Pass B only after the monitor supplies normalized source evidence. Choose the capability decision and architecture around admitted sources, never around a preselected local abstraction.

Every plan must contain `## Existing Primitive Search` with this exact canonical table:

| Capability ID | Need | Class | Source kind | Exact source / version | Exact API / probe | Files read | Decision | No-fit / policy evidence |
|---|---|---|---|---|---|---|---|---|

The shared rule defines every column, source encoding, decision relation, probe/no-fit requirement, and pending local-policy approval. The planner must apply it verbatim; this role owns only atomization, monitor handoff, selection timing, delivery mapping, and final planning decisions.

Immediately following that table, the plan must contain `### Capability Delivery Map` with this exact header and the identical capability-ID set:

| Capability ID | Planned files / symbols | Planned tests / probes |
|---|---|---|

Each map cell is non-empty. The map covers every planned behavior; every selected non-local row has a passed plan probe; and every local generic row proves all four no-fit classes. Plan table structure never substitutes for semantic evidence: the independent reviewer judges fit, coverage, thinness, no-fit sufficiency, and policy semantics.

After Pass B, complete the existing plan obligations:

1. Freeze scope, including in-scope files/modules and no-go areas.
2. Convert the monitor evidence into a concise repo map that covers relevant `src/**`, `tests/**`, scripts, docs/plans, callers, aliases, compatibility fields, wrappers, services, repositories, hooks, controllers, and adapters.
3. Account for new and retired surface. A new shared primitive needs same-PR migration/deletion evidence or repo-wide proof that fewer than two old call sites exist and no debt-reduction claim.
4. Check boundaries and define focused, behavior-equivalence, and browser/E2E tests when the behavior requires them.
5. Give the candidate plan to the monitor for the existing read-only validator: `node scripts/validate-pr-debt-contract.mjs --plan-input <candidate-plan-path>`. The monitor must report exit `0` before `PLAN_READY`; the validator must not run probes, network, or write state.

## Hard Fail

Return `PLAN_BLOCKED` and one exact `BLOCKER_CODE <code>` line if any required evidence is absent, stale, contradictory, malformed, or only placeholder text. Do not code or ask a downstream role to repair it.

Use these stable codes, choosing the first applicable cause:

- `reuse-existing`: a fitting repository or installed primitive was bypassed by a local generic proposal.
- `external-research-missing`: an uncovered generic atom lacks the bounded mature-OSS and applicable official-platform research/no-fit evidence.
- `local-policy-unapproved`: a local-policy row lacks the exact pending plan-review marker, required policy boundary/composition, or `generic-operation: none`.
- `capability-schema-invalid`: the canonical table, exact source/API/probe evidence, decision relation, or delivery-map ID equality is invalid.
- `plan-input-failed`: monitor-owned `--plan-input` did not exit `0`.
- `required-input-missing`: the task, monitor evidence, repo map, scope, surface, boundary, or test input is missing.

Also block if a plan claims a later cleanup for a known wrapper, alias, compatibility field, duplicate helper, or old entrypoint; a shared primitive is proposed without its required call-site/deletion proof; a prohibited boundary import/passthrough lacks a named composition-root exception; or retired compatibility surface lacks behavior-equivalence coverage.

## Required Output Schema (Pass B only)

Use this exact structure:

```md
## Verdict

PLAN_READY / PLAN_BLOCKED

When the verdict is PLAN_BLOCKED, add this exact next line:
BLOCKER_CODE <stable-code>

## Skill Evidence

- Skill file read: skills/metronome_planner.md
- Debt gate map read: docs/architecture/debt-gate-map.md
- Monitor plan-input: `node scripts/validate-pr-debt-contract.mjs --plan-input <candidate-plan-path>`; exit status: 0/fail

## Scope

- Slice/stage:
- In scope:
- Out of scope:

## Inputs Read

| File or monitor evidence | Why read |
|---|---|

## Capability Atomization (Pass A)

| Capability ID | Architecture-free need | Class |
|---|---|---|

## Monitor Discovery Evidence

| Capability ID | Repo/lock/installed/probe result | External-research result | Normalization decision |
|---|---|---|---|

## Existing Primitive Search

| Capability ID | Need | Class | Source kind | Exact source / version | Exact API / probe | Files read | Decision | No-fit / policy evidence |
|---|---|---|---|---|---|---|---|---|

### Capability Delivery Map

| Capability ID | Planned files / symbols | Planned tests / probes |
|---|---|---|

## Repo Map Evidence

| Search | Command or source | Files found | Decision |
|---|---|---|---|

## Shared Primitive Call-Site Audit

| Proposed shared surface | Old call sites found repo-wide | Old call sites migrated in this PR | Old implementations deleted/narrowed | Debt-reduction claim |
|---|---|---|---|---|

## New Surface Budget

| New surface | Why needed | Existing alternative rejected | Old surface retired in same PR |
|---|---|---|

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

- `PLAN_READY`: the candidate plan is written, the monitor recorded plan-input exit `0`, and the plan can enter immutable independent review. Do not authorize coding.
- `PLAN_BLOCKED`: do not code. Repair the first blocker, regenerate monitor evidence when required, and rerun the plan-input gate.
