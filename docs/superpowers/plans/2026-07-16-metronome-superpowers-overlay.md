# Metronome Superpowers Overlay Implementation Contract

## Objective and Non-Goals

### Objective

Merge one workflow/gate PR that makes the existing Metronome debt workflow durable through the root router, the repo-local Superpowers overlay, corrected role boundaries, and the existing validator. Only after that PR reaches `MSO-6` and merges may the monitor run the real R-01 planning trial.

This is an explicitly approved blocked-stage replan. The plan defines durable dependencies, evidence, ownership, invalidation, and stop conditions.
The monitor owns runtime commands, polling, run IDs, transcripts, temporary paths, branch mechanics, and other ephemeral proof.

Success requires:

- a mandatory `AGENTS.md` route to `.agents/skills/metronome-workflow/SKILL.md`;
- Sol-only planning and Terra/Luna-only coding, diagnosis, and review;
- an immutable tracked workflow-plan identity plus independent plan review and explicit user approval before implementation resumes;
- current-stage-only coder evidence followed by monitor preflight, exact-HEAD gates, semantic implementation review, CI, and external ChatGPT review;
- exactly two legal overlay PR evidence states, `MSO-5` and `MSO-6`;
- workflow/gate merge before R-01, with no generated R-01 plan commit merged or cherry-picked into `main`;
- zero changed files under `src/**`.

### Non-Goals

- Do not implement, resume, or modify the paused workflow implementation while revising this plan.
- Do not implement R-01 product work or modify
  `docs/v1/implementation-slices/refactor/R-01-sheet-practice-controls.md` in
  the workflow PR.
- Keep exactly one debt-contract validator. Do not add a duplicate workflow, ledger,
  polling, compatibility, wrapper, or parallel path, or add telemetry, attestation, manifest, or helper scripts.
- Do not add CodeScene execution to `.git/hooks/pre-commit`, package scripts
  used by that hook, or its npm/npm.cmd/PowerShell fallback chain.
- Do not add package, lock, workflow, status, or product-source changes.
- Do not prewrite monitor command bodies, GitHub polling, run-ID handling,
  transcript capture, repeated promotion scripts, or large implementation
  bodies in this plan.
- Plan review judges dependency closure and evidence sufficiency. It must not
  require future monitor command implementations to be embedded here.

## Immutable Inputs

### Model and Role Routing

- A Superpowers Task is a Metronome Stage.
- Planning agents use `GPT-5.6 Sol standard` only.
- Coders, diagnosis agents, and reviewers use `GPT-5.6 Terra standard` or
  `GPT-5.6 Luna standard` only.
- Never use fast. Never route coding, diagnosis, fix, or review to Sol.
- Small cohesive implementation uses `superpowers:executing-plans`; large,
  independently separable implementation uses
  `superpowers:subagent-driven-development`.

### Approved Workflow Plan Identity

Before workflow implementation resumes, this plan must exist as a plan-only
tracked commit with all of the following immutable values:

- plan path:
  `docs/superpowers/plans/2026-07-16-metronome-superpowers-overlay.md`;
- plan commit: the tracked commit containing the approved plan;
- plan blob: the Git blob at `<planCommit>:<planPath>`;
- plan SHA-256: the SHA-256 of the bytes returned by Git for that object;
- independent review policy: exact `GPT-5.6 Terra standard` or
  `GPT-5.6 Luna standard`;
- independent review verdict: exact `PLAN_REVIEW_PASS`;
- explicit user decision: approved.

The approved plan commit must be an ancestor of the implementation candidate.
The declared blob must match both the approved commit and tracked
`HEAD:<planPath>`. The declared SHA-256 must match tracked Git object bytes,
not the working file. A working-tree mutation cannot change accepted identity.

`PLAN_READY` alone never authorizes coding. Missing, malformed, stale, or
mismatched identity, review, or user approval blocks implementation.

### Plan Review Contract

The independent plan reviewer verifies:

- every implementation dependency appears before its consumer;
- every role receives only evidence available at its stage;
- the exact workflow allowlist, zero `src/**`, one debt-contract validator, no duplicate path, and required role/R-01 removals are complete;
- validator responsibility, legal evidence values, required positive and negative tests, promotion states, invalidation, repair, and stop rules are closed;
- the post-merge R-01 trial cannot affect workflow PR merge eligibility;
- no generated R-01 plan can enter `main`.

The reviewer returns `PLAN_REVIEW_PASS` only when those contracts are complete.
It may return `CHANGES_REQUIRED` for a missing dependency or evidence rule, but
not because this plan omits future PowerShell, GitHub, CodeScene, polling,
transcript, or branch-management command bodies.

### Allowed Workflow PR Files

The workflow PR may change only this exact set:

- `docs/superpowers/plans/2026-07-16-metronome-superpowers-overlay.md`
- `AGENTS.md`
- `.agents/skills/metronome-workflow/SKILL.md`
- `skills/metronome_planner.md`
- `skills/metronome_coder.md`
- `skills/metronome_reviewer.md`
- `skills/metronome_chatgpt_review.md`
- `docs/v1/implementation-slices/refactor/refactor-pipeline-planning-template.md`
- `docs/architecture/debt-gate-map.md`
- `scripts/validate-pr-debt-contract.mjs`
- `scripts/validate-pr-debt-contract.selftest.mjs`
- `scripts/validate-metronome-gates.mjs`
- `.github/pull_request_template.md`

The only new file is the already planned
`.agents/skills/metronome-workflow/SKILL.md`. Renames, copies, untracked files,
and committed or working changes outside the allowlist are scope failures.

## Dependency-Ordered Stage Contract

### MSO-0: Approve the Tracked Plan

1. Preserve the paused implementation unchanged.
2. Track only this revised plan.
3. Establish its commit, blob, and SHA-256 from Git object bytes.
4. Obtain a fresh independent Terra/Luna `PLAN_REVIEW_PASS` against that exact
   identity.
5. Obtain explicit user approval.

No implementation dependency may begin before all five conditions hold.

### MSO-1: Preserve the Overlay-Control RED Boundary

The existing self-test must prove that both `AGENTS.md` and
`.agents/skills/metronome-workflow/SKILL.md` require overlay promotion
evidence. Before validator support, those two targeted assertions are the only
accepted RED condition. Partial work remains uncommitted.

### MSO-2: Complete the Existing Validator Contract

1. Make both overlay-control paths enter the existing debt-contract validator.
2. Make those paths require the seven existing role fields plus seven
   workflow-plan fields.
3. Bind overlay identity to tracked `HEAD` Git objects.
4. Accept only the two legal stage/ChatGPT pairs.
5. Require positive CodeScene `analyze_change_set`, no decline, and literal
   `quality_gates: passed` evidence.
6. Remove all pre-merge R-01 fields, parsing, markers, and fixtures.
7. Reduce the two diagnosed validator complexity regressions with the minimum local
   responsibility split until both methods are below every applicable CodeScene method-size and complexity threshold.
8. Pass the validator self-test, debt-gate validator, and monitor-owned
   CodeScene change-set gate before continuing.

### MSO-3: Complete the Router and Minimal Overlay

1. Keep `AGENTS.md` as the mandatory route, not a duplicate policy document.
2. Keep shared model routing, execution choice, hard-pause, promotion,
   invalidation, and plan-branch rules in the overlay.
3. State the main-first rule: workflow/gate PR merge precedes the real R-01
   trial, and generated R-01/later plan commits never merge or cherry-pick into
   `main`.
4. State that CodeScene is monitor-owned and not part of the Git hook.
5. State that failed preflight cannot enter semantic review.

### MSO-4: Correct Role and Reference Boundaries

1. Restore each role file from its full `HEAD` contract.
2. Add the same short overlay pointer and precedence statement after each role
   title.
3. Keep planner behavior otherwise unchanged.
4. Remove coder circular future-stage requirements and replace them with the four current-stage evidence groups defined under Coding Handoff.
5. Make the reviewer consume one exact committed candidate and monitor-owned
   preflight/HEAD evidence, with no PR, CI, or ChatGPT dependency.
6. Make ChatGPT consume the draft `MSO-5`/`PENDING` PR after exact-head CI,
   without requiring its own future verdict in the input packet.
7. Keep the refactor template and debt map as pointer-only references.
8. Restore role-file required-content markers to `HEAD`, adding only the
   overlay pointer marker and required overlay file checks.

### MSO-4R: One-Time Authorized Validator Repair

The approved implementation stage exhausted its one repair and returned `STAGE_BLOCKED`. CodeScene first reported complexity 11 in `validateImmutableOverlayPlanIdentity` plus two complex-condition findings; the permitted repair removed both findings and reduced complexity to 10.
The second CodeScene result still had `quality_gates: failed` because introduced complexity 10 is at the threshold and must be below it. The existing validator self-test, `validate:debt-gates`, and Git diff check pass.

- The user's explicit decision authorizes exactly one new, separately planned implementation attempt in this stage.
- Write scope is only `scripts/validate-pr-debt-contract.mjs`; target only `validateImmutableOverlayPlanIdentity`.
- Preserve behavior and all current tests; do not edit tests.
- Add no helper merely to move complexity and no validator, wrapper, compatibility path, abstraction, file, or mechanism.
- Baseline candidate accounting is Git +465/-144, net +321, with the same 12-file allowlist and zero `src/**`; final net growth must not exceed +321 and reduction is preferred.
- Acceptance requires method complexity below 10, no new CodeScene findings, no Code Health decline, and exact `quality_gates: passed`, followed by every existing gate.
- This stage has exactly one implementation attempt. Any failure returns exact `STAGE_BLOCKED` and requires a new user decision.
- Every earlier workflow invariant remains unchanged.

### MSO-5: Form and Review the Exact Candidate

1. The coder returns exact `CODE_READY` evidence only for implementation,
   scope, deletion, and focused tests.
2. The monitor records diffstat for growth detection, then proves the exact allowlist,
   zero `src/**`, one validator, no duplicate path, and required role/R-01 removals before review.
3. The monitor runs the validator self-test, every existing local gate, and the
   CodeScene pre-commit safeguard against the staged candidate.
4. The monitor commits exactly the preflighted tree with normal hooks and binds
   a retained candidate HEAD to that tree.
5. Against unchanged candidate HEAD, the monitor reruns semantic accounting,
   local gates, and CodeScene `analyze_change_set`; CodeScene must report no
   decline and exact `quality_gates: passed`.
6. Only then does one fresh Terra/Luna implementation reviewer assess the exact
   candidate. Inputs are base, HEAD, changed-file split, diffstat, approved
   immutable plan, coder handoff, monitor preflight, HEAD-bound local gates,
   and HEAD-bound CodeScene evidence.
7. Reviewer `PASS` or `PASS_WITH_NITS` permits a draft PR with exact `MSO-5`
   and ChatGPT `PENDING`. The reviewer cannot require a PR URL/body, CI result,
   or ChatGPT evidence.

### MSO-6: Promote and Merge

1. The draft PR branch and head must equal the retained reviewed candidate
   HEAD, with no merge commits or Git-visible drift.
2. The draft body contains complete exact-head evidence in legal
   `MSO-5`/`PENDING` form.
3. Existing CI passes on that unchanged head while the PR remains draft.
4. External ChatGPT reviews the exact draft PR, implementation-review output,
   CI, CodeScene, and local-gate evidence and returns exact `PASS` or
   `PASS_WITH_NITS`.
5. A body-only edit changes `PENDING` to that verdict and `MSO-5` to `MSO-6`,
   preserving all earlier exact-head evidence.
6. Edited-event CI, including `validate:debt-gates`, passes on the unchanged
   head.
7. The monitor rechecks branch, local head, PR head, cleanliness, merge-free
   history, and evidence before merge.
8. The workflow/gate PR merges, and the monitor returns to current clean
   `main`, before any real R-01 trial begins.

## Exact File Changes

### Router and Overlay

- `AGENTS.md`: keep only the mandatory pre-task route to the overlay plus the
  existing Git-hook/fallback contract. Do not duplicate overlay policy.
- `.agents/skills/metronome-workflow/SKILL.md`: preserve central routing and
  replace Promotion with the dependency order in MSO-5/MSO-6. Add current-stage
  coder ownership, monitor preflight, exact-HEAD review, two-state promotion,
  invalidation, one-repair handling, `STAGE_BLOCKED`, CodeScene ownership, and
  main-first/no-generated-plan-in-main rules. Remove pre-merge R-01 evidence.

### Role Contracts

- `skills/metronome_planner.md`: restore full `HEAD`; add only the overlay
  pointer/precedence paragraph.
- `skills/metronome_coder.md`: restore full `HEAD`; add the pointer; replace
  `Fill PR body evidence before requesting review`, Required PR Body Evidence,
  future full-gate claims, and reviewer-request verdict handling with the four
  current-stage handoff groups. Keep debt, reuse, retirement, boundary, and
  correctness rules. `CODE_READY` returns to the monitor for preflight.
- `skills/metronome_reviewer.md`: restore full `HEAD`; add the pointer; replace
  PR/body/CI/ChatGPT inputs and checks with the exact-candidate packet. Preserve
  independent primitive, surface, boundary, behavior, test, and correctness
  review. Require `quality_gates: passed`. Return `PASS|PASS_WITH_NITS` to the
  monitor. For one repair, the same reviewer reviews the complete repaired
  candidate plus its delta from the rejected candidate.
- `skills/metronome_chatgpt_review.md`: restore full `HEAD`; add the pointer;
  leave plan review unchanged. For PR review, require exact draft
  `MSO-5`/`PENDING`, reviewer pass, exact-head CI, CodeScene, and full-gate
  evidence. Remove any requirement that the packet already contain the final
  ChatGPT verdict. `CHANGES_REQUIRED` cannot advance.

### Validator and Evidence Template

- `scripts/validate-pr-debt-contract.mjs`: keep this as the one validator. Add
  the two overlay-control matchers and conditional evidence branch. Extract
  exactly one cohesive immutable-overlay-plan identity helper covering fixed
  path, ancestor commit, approved/current blob equality, and tracked SHA-256.
  Make `validateOverlayPromotionEvidence` compose that helper, independent
  review evidence, and legal stage/ChatGPT pairing. Rewrite `validateSections`
  declaratively with one missing-section early return, one surface-evidence
  result list, and one overlay branch. Both diagnosed functions must fall below
  every applicable CodeScene method-size and complexity threshold. Do not add another helper only to move complexity.
- `scripts/validate-pr-debt-contract.selftest.mjs`: construct valid overlay
  identity from tracked Git objects; cover both control paths, both legal
  promotion states, all specified negatives, and working-file mutation versus
  tracked-HEAD identity. Remove all R-01 pre-merge fixtures.
- `scripts/validate-metronome-gates.mjs`: add the overlay skill to `required`;
  add source-presence checks for the overlay path in both `required` and
  `requiredContent`; restore role markers to `HEAD` plus only the pointer; add
  minimal validator/template markers for the legal overlay contract; remove
  R-01 trial markers.
- `.github/pull_request_template.md`: retain the seven existing role evidence
  labels, add the seven workflow-plan labels, and describe only the legal
  `MSO-5` and `MSO-6` combinations. Remove obsolete R-01 fields.

The fourteen `Agent Gate Evidence` labels and values are:

| Label | Legal value |
|---|---|
| Planner skill read evidence | names `skills/metronome_planner.md` |
| Planner skill verdict | exact `PLAN_READY` |
| Coder skill read evidence | names `skills/metronome_coder.md` |
| Coder repo map / primitive search | concrete, non-placeholder evidence |
| Reviewer skill read evidence | names `skills/metronome_reviewer.md` |
| Reviewer verdict | exact `PASS` or `PASS_WITH_NITS` |
| ChatGPT final review prompt/verdict | `PENDING` at `MSO-5`; `PASS` or `PASS_WITH_NITS` at `MSO-6` |
| Overlay plan path | exact approved workflow plan path |
| Overlay plan commit | valid ancestor commit containing the approved plan |
| Overlay plan blob | matches approved commit and tracked `HEAD` plan blob |
| Overlay plan SHA-256 | matches tracked `HEAD` Git object bytes |
| Independent plan review policy | exact Terra standard or Luna standard policy |
| Independent plan review verdict | exact `PLAN_REVIEW_PASS` |
| Current metronome Stage | exact `MSO-5` or `MSO-6`, legally paired |

Non-overlay debt-contract PRs retain their existing ChatGPT
`PASS|PASS_WITH_NITS` rule. For overlay-control changes, any cross-pair,
unknown stage, suffix, placeholder, blank, conflict, or extra verdict text
fails.

Remove these pre-merge R-01 labels everywhere on workflow/gate surfaces:

- `R-01 trial identity`
- `R-01 trial review policy`
- `R-01 trial review verdict`
- `R-01 coding authorization`

Also remove their parser identifiers, required-content markers, synthetic
identity fragments, fixtures, failure messages, and obsolete
`BLOCKED_PENDING_USER_DECISION`/`AUTHORIZED` tokens. Do not retain compatibility
parsing or renamed equivalents.

### Focused References

- `docs/v1/implementation-slices/refactor/refactor-pipeline-planning-template.md`:
  keep only the existing three-line overlay pointer and no large implementation
  bodies.
- `docs/architecture/debt-gate-map.md`: keep only the existing three-line
  overlay ownership pointer.
- This plan: retain this compact contract and no runtime runbook.

## Validation Matrix

| Boundary | Owner | Command or gate name | Required result |
|---|---|---|---|
| Revised plan | planning agent | `git diff --check` | pass |
| Revised plan | planning agent | line count | at most 491 |
| MSO-2 | coder/monitor | `node scripts/validate-pr-debt-contract.selftest.mjs` | exit 0 |
| MSO-2 onward | monitor | `npm run validate:debt-gates` | pass |
| Candidate | monitor | exact allowlist/scope proof | no outside path |
| Candidate | monitor | semantic accounting proof | zero `src/**`; one validator; no duplicate workflow, ledger, polling, compatibility, wrapper, or parallel path; circular role requirements and obsolete R-01 evidence absent |
| Candidate | monitor | `npm run lint:debt:changed` | pass |
| Candidate | monitor | `npm run lint:xo:changed` | pass |
| Candidate | monitor | `npm run lint` | pass |
| Candidate | monitor | `npm run typecheck` | pass |
| Candidate | monitor | `npm run test:unit` | pass |
| Candidate | monitor | `npm run build` | pass |
| Staged candidate | monitor | CodeScene pre-commit safeguard | pass; no decline; diagnosed validator methods below applicable thresholds |
| Committed HEAD | monitor | CodeScene `analyze_change_set` | no decline; `quality_gates: passed` |
| Committed HEAD | reviewer | semantic implementation review | exact `PASS|PASS_WITH_NITS` |
| Draft PR | CI | existing CI | green on exact reviewed HEAD |
| Draft PR | ChatGPT | external PR review | exact `PASS|PASS_WITH_NITS` |
| Final body | CI | pull-request edited-event CI | green on unchanged HEAD |

The validator self-test must include these positive and negative cases:

- `AGENTS.md` and overlay-skill changes each fail without complete overlay
  evidence and pass with complete evidence;
- draft `MSO-5`/`PENDING` and final `MSO-6`/`PASS` pass for both control paths;
- missing fixed path, malformed or non-ancestor commit, blank/wrong/stale blob,
  wrong SHA-256, blank/disallowed review policy, missing/wrong review verdict,
  unknown stage, suffix text, and conflicting values fail;
- `MSO-5`/`PASS` and `MSO-6`/`PENDING` fail;
- blank-blob and disallowed-policy cases assert their exact failure messages;
- positive CodeScene evidence without literal `quality_gates: passed` fails;
- an unstaged working-file mutation cannot alter a valid tracked
  `HEAD:<planPath>` identity;
- all existing first-seven role-field positives and negatives remain;
- every obsolete R-01 fixture and field is absent.

`scripts/validate-metronome-gates.mjs` keeps direct missing-file failure through
its existing `required`/`existsSync` loop. Do not add dependency injection or a
new isolated missing-file harness merely for the overlay skill.

## Promotion Invariants

- The workflow/gate PR must merge before the real R-01 trial.
- The workflow PR's eligibility never depends on later R-01 trial evidence.
- The candidate tree, committed tree, reviewed HEAD, CI head, ChatGPT-reviewed
  head, PR head, and merge head must remain the same exact code candidate.
- Draft overlay evidence has exactly `MSO-5` plus ChatGPT `PENDING`.
- Final overlay evidence has exactly `MSO-6` plus ChatGPT
  `PASS|PASS_WITH_NITS`.
- Draft `MSO-5` permits CI; final ChatGPT review occurs only after exact-head CI.
- Final body editing triggers edited-event CI before merge.
- A PR-body-only evidence edit does not invalidate code evidence, but it does
  require the edited-event CI rerun.
- Any code edit invalidates preflight and all downstream CodeScene,
  implementation-review, CI, and ChatGPT evidence. Promotion restarts at
  monitor preflight with a new exact candidate.
- The same implementation reviewer handles the one complete repaired candidate
  and its delta from the rejected candidate.
- The implementation reviewer cannot require PR, CI, or ChatGPT evidence.
- CodeScene remains monitor-owned and is never added to the Git hook.
- No repository stage ledger or repair counter is introduced.
- Generated R-01/later plan commits remain temporary immutable inputs and never
  merge or cherry-pick into `main`.

## Post-Merge R-01 Trial

> **Historical and superseded — do not execute this section.** The sole authoritative R-01 execution contract is the [Lumen and Historical R-01 OpenGSD Pilot Implementation Plan](2026-07-20-lumen-r01-opengsd-pilot.md).

The trial begins only after the workflow PR is merged and local clean `main`
matches freshly fetched `origin/main`. The workflow PR does not modify the
historical R-01 path already on `main`; the newly generated complete trial plan
exists only on a temporary plan branch.

1. Start a temporary plan-only branch/worktree from that exact merged-main
   commit.
2. Launch a fresh, empty-context `GPT-5.6 Sol standard` planner. It follows the
   merged persistent workflow, writes only
   `docs/v1/implementation-slices/refactor/R-01-sheet-practice-controls.md`, and
   returns exact `PLAN_READY` or `PLAN_BLOCKED`.
3. Require the plan commit to be a clean single plan-only child of merged main.
4. Record immutable plan path, commit, blob, and SHA-256 from Git object bytes.
5. Launch a fresh independent Terra/Luna read-only reviewer against that exact
   identity. Review covers finding/stage closure, deletion and new-surface
   budgets, net debt, production LOC, Code Health, and the user stop. It does
   not demand monitor runtime command bodies in the generated plan.
6. Present the reviewed immutable plan to the user and stop. R-01 coding remains
   blocked until the review passes and the user explicitly approves.
7. Retain the temporary plan branch only through coding/review lifecycle. A
   coding branch starts from clean `main`, never from the plan branch, and reads
   the approved plan from `<planCommit>:<planPath>` after independently checking
   commit, blob, and SHA-256.
8. Never merge or cherry-pick the generated plan commit and never add CI
   branch-fetch logic for it.

If generation, identity, or independent review fails, keep the failed artifact
out of `main`, obtain fresh Terra/Luna diagnosis, and stop for a user decision.
An approved workflow correction uses the minimum subset of the same 13-file
allowlist from fresh `origin/main`; it cannot include product, R-01 plan,
package, lock, status, test, or workflow files. After the fix PR completes the
same exact-candidate and `MSO-5`/`MSO-6` promotion and merges, repeat the R-01
trial as a fresh Sol run from the new clean main.

## Stop Rules

Return `PLAN_BLOCKED`, `BLOCKED`, `CHANGES_REQUIRED`, or `STAGE_BLOCKED` as
defined by the active role; do not soften a blocked state into narrative
approval.

- Stop before edits when plan identity, independent review, or user approval is
  missing or stale.
- Stop before semantic review when semantic accounting proof, any local gate,
  the CodeScene pre-commit safeguard, exact candidate binding, HEAD-bound
  `analyze_change_set`, or `quality_gates: passed` is missing or fails.
- Net-positive LOC against `main` is not an automatic failure. New unexpected code
  growth still requires fresh independent Terra/Luna diagnosis and an explicit user decision before work resumes.
- The present diagnosed growth may proceed under the recorded user decision only if every semantic accounting, test, and CodeScene gate in this plan passes.
- Stop for Code Health decline, scope expansion, an unplanned wrapper/public
  API, a new file beyond the overlay, or an unverified interface.
- The first gate failure may receive one code-edit repair under the same
  approved plan. That edit invalidates every downstream result and restarts
  preflight.
- Any second failure after the repaired candidate returns exact
  `STAGE_BLOCKED`. Launch fresh independent Terra/Luna diagnosis and resume only
  after explicit user decision.
- If diagnosis changes this plan, shared contract, evidence schema, or scope,
  track and independently approve the revised plan before implementation.
- A mechanical correction already covered by an unchanged approved plan still
  requires fresh candidate evidence and independent implementation review.
- Stop R-01 coding if its generated plan, identity, independent review, or user
  approval is incomplete, or if any generated plan content appears in `main`.

## Coding Handoff

Implement this contract only after MSO-0 approval. Use the exact 13-file
allowlist and create no file other than the already planned overlay skill.
Preserve the paused work, restore full `HEAD` role contracts, and make only the
stage-boundary corrections named above. Production diff must remain zero.

Implement in dependency order:

1. validator RED boundary;
2. existing validator, self-tests, gate markers, and PR template;
3. router and minimal overlay;
4. full role contracts and pointer-only references;
5. current-stage coder handoff and monitor preflight;
6. exact-HEAD implementation review and two-state promotion.

The coder's `CODE_READY` handoff contains exactly these four evidence groups:

1. implementation files and purpose;
2. scope accounting, including reuse, new-surface, and boundary delta;
3. retired/deleted surface proof;
4. focused tests actually run and their results.

The coder must not require or claim reviewer verdict, PR URL/body, CI,
ChatGPT, monitor-owned CodeScene, or future full-gate evidence. The monitor
adds those only when their dependent stages have actually completed.

Completion requires the exact allowlist, zero `src/**`, exactly one validator, no
duplicate workflow, ledger, polling, compatibility, wrapper, or parallel path,
removal of circular future-stage role requirements and pre-merge R-01 machinery, all required positive and negative tests, no Code Health decline, exact `quality_gates: passed`, and both diagnosed validator methods below every applicable CodeScene threshold.
