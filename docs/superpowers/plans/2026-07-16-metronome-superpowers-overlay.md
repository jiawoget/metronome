# Metronome Superpowers Overlay Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to execute this plan task by task.

**Goal:** Make the Metronome workflow durable through one mandatory router and one repo-local Superpowers overlay, merge that workflow first, then validate it operationally with a real R-01 planning trial that never merges a refactor plan into `main`.

**Architecture:** Root `AGENTS.md` routes every task to `.agents/skills/metronome-workflow/SKILL.md`. The dedicated workflow PR contains only the durable router, overlay, existing full role contracts with precedence pointers, gate/self-test/template changes, and this workflow plan. It reaches `MSO-6` and merges before the real R-01 trial. Afterward, a fresh Sol plan agent creates R-01 on a temporary plan-only branch; coding and review consume that plan by immutable Git identity without merging or cherry-picking it.

**Tech Stack:** Markdown, Node.js ESM, existing Git/GitHub Actions gates, PowerShell, `codex-cli 0.144.5`, CodeScene MCP.

**Execution Mode:** `superpowers:executing-plans`, reusing one GPT-5.6 Terra standard coding agent because the workflow repair is small and cohesive. `superpowers:subagent-driven-development` remains for future work whose stages are large and independently separable.

**Estimated Production-Code Diff:** `0 LOC` under `src/**`.

**Plan Verdict:** `PLAN_READY` for a new plan-only commit and independent review. Commit `8d2094daf60f57513552702d81ac17fc234c94fb` is superseded. Preserve the paused uncommitted implementation, commit only this revised plan first, and do not resume implementation until Task 0 passes for the new tracked identities.

## Verified Interfaces and Limits

- `codex-cli 0.144.5`, the required model/config flags, `read-only`/`workspace-write`, `--ephemeral`, `--ignore-user-config`, `--cd`, `--json`, and `--output-last-message` were verified from the installed CLI.
- `gpt-5.6-sol`, `gpt-5.6-terra`, and `gpt-5.6-luna` support medium reasoning. Nested launches set `model_reasoning_effort="medium"` and `service_tier="default"`; never inherit fast or active user configuration.
- Superpowers `using-superpowers`, `writing-plans`, `executing-plans`, and `subagent-driven-development` source files were verified under the installed plugin cache. Missing sources block the relevant stage.
- CodeScene exposes `mcp__codescene__analyze_change_set({git_repository_path, base_ref})` with `quality_gates`/`results[].verdict`. Missing or ambiguous no-decline evidence blocks workflow promotion.
- Any newly claimed CLI, event, MCP, gate, or plugin interface must be proven by a target command or official schema before use. Otherwise return `PLAN_BLOCKED`.

**Threat model:** Prevent accidental model misrouting, stale evidence, Git-visible tracked/untracked mutations, and workflow drift under a non-malicious monitor. Explicit launch commands and Git identities are operational evidence, not cryptographic proof of model identity or independence. A malicious monitor and ignored-file mutation are out of scope. Cleanliness claims mean Git-visible tracked/untracked cleanliness.

## Central Contract

1. A Superpowers Task is the Metronome Stage.
2. Plan agents use GPT-5.6 Sol standard. Coders, diagnosis agents, and reviewers use GPT-5.6 Terra standard or GPT-5.6 Luna standard. Never use fast, and never route a non-plan role to Sol.
3. Small cohesive work uses one coding agent through `superpowers:executing-plans`; large independent stages use `superpowers:subagent-driven-development`.
4. `PLAN_READY` does not authorize coding. A tracked plan commit, blob, SHA-256, matching independent Terra/Luna `PLAN_REVIEW_PASS`, and explicit user decision are required.
5. Unexpected production LOC growth, Code Health decline, scope expansion, or an unplanned wrapper/public API means: stop; launch independent GPT-5.6 Terra standard or GPT-5.6 Luna standard diagnosis; resume only after explicit user decision. Never route diagnosis, fix, or review to GPT-5.6 Sol.
6. Refactor plans name exact files, behavior, tests, and commands without prewriting large implementation bodies.
7. Workflow promotion reuses the existing validator, pre-commit hook, CI, CodeScene, and PR evidence. No second validator, status ledger, telemetry/attestation framework, manifest, or CI branch-fetch framework is added.
8. R-01 and later generated refactor plan commits never merge or cherry-pick into `main`. The plan branch is a temporary immutable input, not a product or workflow delivery branch.

Root `AGENTS.md` is only the mandatory router. The overlay owns shared policy. Each `skills/metronome_*.md` file keeps its complete `HEAD` role contract and receives only a short overlay pointer/precedence statement; do not extract, summarize, or delete existing role-specific rules.

## Workflow Promotion Authority

| Checkpoint | Operational meaning |
|---|---|
| `MSO-0` | Revised workflow plan-only commit and independent review approved |
| `MSO-1` | RED proves both overlay control files need promotion evidence |
| `MSO-2` | Existing validator owns final workflow-PR evidence only |
| `MSO-3` | Mandatory router and minimal overlay are complete |
| `MSO-4` | Full role contracts are restored with minimal precedence pointers |
| `MSO-5` | Implementation review, scope audit, hooks, tests, and CodeScene pass |
| `MSO-6` | Workflow PR CI and required external review pass; workflow PR merges |

`MSO-0` through `MSO-5` are monitor checkpoints, not repository state. The existing PR validator mechanically accepts overlay control changes only at exact `MSO-6`, bound to the tracked workflow-plan identity, independent workflow-plan review, existing final role verdicts, and gate evidence. It must not require or parse any R-01 plan identity, review, or coding authorization.

The real R-01 trial begins only after `MSO-6`, the workflow PR is merged, and the monitor has returned to clean `main`. It is operational validation of the merged workflow, not a retroactive gate for that PR. Failure opens a narrow workflow-fix PR and blocks R-01 coding.

## Paused-Diff Corrections

Apply these deletions and modifications to the current paused implementation; do not add replacement machinery:

- `.github/pull_request_template.md`: retain all seven existing planner/coder/reviewer/ChatGPT lines, add the seven workflow-plan promotion lines listed in Task 2, and delete the four obsolete R-01 lines.
- `scripts/validate-pr-debt-contract.mjs`: delete all R-01 trial parsing/checks. Keep the narrow overlay-control check, but derive current plan blob and SHA-256 only from `HEAD:<planPath>` Git object content, never `git hash-object <working-file>` or `readFileSync(<working-file>)`.
- `scripts/validate-pr-debt-contract.selftest.mjs`: delete R-01 synthetic fields and negative fixtures. Compute valid plan identity from tracked Git objects and add one regression proving an unstaged working-file mutation cannot change accepted `HEAD:<planPath>` identity.
- `scripts/validate-metronome-gates.mjs`: delete required-content markers for R-01 trial evidence, add the repo-local overlay skill to the `required` file list, and restore all role-file required-content arrays to their `HEAD` contracts with only the overlay pointer marker added.
- `.agents/skills/metronome-workflow/SKILL.md`: remove pre-merge R-01 evidence from Promotion; add the main-first/no-plan-in-main rule and the minimal immutable handoff described below.
- `skills/metronome_planner.md`, `skills/metronome_coder.md`, `skills/metronome_reviewer.md`, `skills/metronome_chatgpt_review.md`: discard the paused summaries, restore full `HEAD` content, then add only the overlay pointer/precedence paragraph after each title.
- Do not change `src/**`, `docs/v1/status.json`, package manifests/locks, workflows, or `docs/v1/implementation-slices/refactor/R-01-sheet-practice-controls.md` in the workflow PR.

The paused implementation's obsolete pre-merge R-01 surface is exhaustively bounded as follows:

- PR/validator labels: `R-01 trial identity`, `R-01 trial review policy`, `R-01 trial review verdict`, and `R-01 coding authorization`, including all four validator failure messages containing those labels.
- Validator parser identifiers/fragments: `trialIdentity`, `trialMatch`, `trialMatch.groups.candidate`, `(?<candidate>`, and the synthetic identity fragments `candidate=`, `planCommit=`, `blob=`, and `sha256=`.
- Required-content/overlay markers: every `requiredContent` entry containing `R-01 trial identity` and the overlay phrase `R-01 trial evidence`.
- Self-test fixtures: the four R-01 lines in `validBody`, the `line.startsWith('- R-01 trial identity:')` mutation, the R-01 review mutation from `PASS` to `CHANGES_REQUIRED`, and the coding-authorization mutation from `BLOCKED_PENDING_USER_DECISION` to `AUTHORIZED`.
- Obsolete status/verdict tokens: `BLOCKED_PENDING_USER_DECISION` and `AUTHORIZED` globally on these workflow/gate surfaces; `PASS` and `CHANGES_REQUIRED` are removed only when attached to an R-01 label because both remain valid elsewhere. `MSO-5` and `MSO-unknown` remain required negative final-stage fixtures.

Delete these items; do not rename, repurpose, or retain compatibility parsing for them.

**Expected LOC direction:** Relative to the paused diff (`316` additions, `515` deletions), gate/self-test/template additions must shrink because R-01 machinery is deleted. Role-file deletions must collapse to zero or near zero because full `HEAD` contracts return; each role should show only a tiny positive pointer-only diff. Production LOC stays zero. The only new file remains `.agents/skills/metronome-workflow/SKILL.md`.

---

### Task 0 [MSO-0]: Commit and Approve This Revised Plan Only

**File:** `docs/superpowers/plans/2026-07-16-metronome-superpowers-overlay.md`

**Step 1: Preserve the paused implementation and commit only the plan**

```powershell
git status --short
git add docs/superpowers/plans/2026-07-16-metronome-superpowers-overlay.md
$staged = @(git diff --cached --name-only)
if ($staged.Count -ne 1 -or $staged[0] -ne 'docs/superpowers/plans/2026-07-16-metronome-superpowers-overlay.md') { throw 'PLAN_BLOCKED: plan-only staging failed' }
git commit -m "Close main-first trial identity checks"
```

Use normal hooks and never `--no-verify`. All paused implementation files must remain uncommitted and otherwise unchanged.

**Step 2: Compute tracked Git identities, never working-file identities**

```powershell
$plan = 'docs/superpowers/plans/2026-07-16-metronome-superpowers-overlay.md'
$planCommit = git rev-parse HEAD
$planBlob = git rev-parse "HEAD:$plan"
$env:PLAN_SPEC = "HEAD:$plan"
$planSha256 = node --input-type=module -e 'import {execFileSync} from "node:child_process"; import {createHash} from "node:crypto"; process.stdout.write(createHash("sha256").update(execFileSync("git", ["show", process.env.PLAN_SPEC])).digest("hex"));'
Remove-Item Env:PLAN_SPEC
```

**Step 3: Launch one fresh independent read-only Luna review**

```powershell
$codex = 'C:\Users\wsuto\.codex\.sandbox-bin\codex.exe'
$evidence = 'C:\tmp\metronome-overlay-plan-review'
New-Item -ItemType Directory -Force -Path $evidence | Out-Null
$before = git status --porcelain=v2 --untracked-files=all
$prompt = "Independently review only $plan at commit $planCommit, blob $planBlob, SHA-256 $planSha256. Verify the main-first workflow PR boundary, tracked-HEAD plan identity, full-role-contract restoration, post-merge no-plan-in-main R-01 trial, immutable handoff, exact tests, and zero production LOC. Do not modify files. Return exactly PLAN_REVIEW_PASS or CHANGES_REQUIRED."
& $codex exec --model gpt-5.6-luna --config 'model_reasoning_effort="medium"' --config 'service_tier="default"' --strict-config --ignore-user-config --sandbox read-only --ephemeral --cd 'C:\Users\wsuto\metronome' --json --output-last-message "$evidence\review-last.txt" $prompt |
  Tee-Object -FilePath "$evidence\review-events.jsonl"
if ($LASTEXITCODE -ne 0 -or (Get-Content -Raw "$evidence\review-last.txt").Trim() -ne 'PLAN_REVIEW_PASS') { throw 'PLAN_BLOCKED: independent review failed' }
$after = git status --porcelain=v2 --untracked-files=all
if (Compare-Object $before $after) { throw 'PLAN_BLOCKED: review changed Git-visible status' }
```

The monitor records `planPath`, `planCommit`, `planBlob`, `planSha256`, reviewer policy, and verdict under `C:\tmp\metronome-overlay-plan-review\approval.json`.

**Step 4: Assert tracked approval before implementation resumes**

```powershell
$approval = Get-Content -Raw 'C:\tmp\metronome-overlay-plan-review\approval.json' | ConvertFrom-Json
$null = git merge-base --is-ancestor $approval.planCommit HEAD
if ($LASTEXITCODE -ne 0) { throw 'PLAN_BLOCKED: reviewed plan commit is not an ancestor' }
$headBlob = git rev-parse "HEAD:$($approval.planPath)"
$approvedBlob = git rev-parse "$($approval.planCommit):$($approval.planPath)"
$env:PLAN_SPEC = "HEAD:$($approval.planPath)"
$headSha256 = node --input-type=module -e 'import {execFileSync} from "node:child_process"; import {createHash} from "node:crypto"; process.stdout.write(createHash("sha256").update(execFileSync("git", ["show", process.env.PLAN_SPEC])).digest("hex"));'
Remove-Item Env:PLAN_SPEC
if ($approval.planBlob -ne $headBlob -or $approval.planBlob -ne $approvedBlob -or $approval.planSha256 -ne $headSha256) { throw 'PLAN_BLOCKED: stale tracked plan approval' }
if ($approval.reviewerPolicy -notin @('GPT-5.6 Terra standard', 'GPT-5.6 Luna standard') -or $approval.verdict -ne 'PLAN_REVIEW_PASS') { throw 'PLAN_BLOCKED: invalid independent review evidence' }
if (-not (Test-Path 'C:\tmp\metronome-overlay-plan-review\review-events.jsonl') -or (Get-Content -Raw 'C:\tmp\metronome-overlay-plan-review\review-last.txt').Trim() -ne 'PLAN_REVIEW_PASS') { throw 'PLAN_BLOCKED: missing independent review artifacts' }
```

---

### Task 1 [MSO-1]: Keep the Existing Overlay-Control RED Tests

**File:** `scripts/validate-pr-debt-contract.selftest.mjs`

Keep the two paused fixtures for `AGENTS.md` and `.agents/skills/metronome-workflow/SKILL.md`. Before the matcher exists, these exact assertions must fail because actual status is `0`:

```js
assert.equal(result.status, 1, 'AGENTS.md change must require overlay promotion evidence');
assert.equal(result.status, 1, 'metronome-workflow skill change must require overlay promotion evidence');
```

Run `node scripts/validate-pr-debt-contract.selftest.mjs`; only that expected assertion failure is valid RED. Keep RED/partial states uncommitted.

---

### Task 2 [MSO-2]: Narrow the Existing Validator to Workflow Promotion

**Files:**
- Modify: `scripts/validate-pr-debt-contract.mjs`
- Modify: `scripts/validate-pr-debt-contract.selftest.mjs`
- Modify: `scripts/validate-metronome-gates.mjs`
- Modify: `.github/pull_request_template.md`

**Step 1: Preserve the existing contract and add conditional workflow evidence**

Add `/^AGENTS\.md$/v` and `/^\.agents\/skills\/metronome-workflow\/SKILL\.md$/v` to the existing `gateControlFilePatterns`, and add the exact two paths to `overlayControlFiles`. The first array makes either change enter the existing debt/agent contract path; the set makes either change additionally require all seven workflow fields, for the complete fourteen-field contract below. Add required-content presence markers for both regex/path pairs in `scripts/validate-metronome-gates.mjs`.

The final PR body retains the complete existing seven-field role contract and, for overlay-control diffs, adds seven workflow-specific fields. The combined required `Agent Gate Evidence` set is exactly these fourteen labels:

```text
- Planner skill read evidence:
- Planner skill verdict:
- Coder skill read evidence:
- Coder repo map / primitive search:
- Reviewer skill read evidence:
- Reviewer verdict:
- ChatGPT final review prompt/verdict:
- Overlay plan path:
- Overlay plan commit:
- Overlay plan blob:
- Overlay plan SHA-256:
- Independent plan review policy:
- Independent plan review verdict:
- Current metronome Stage:
```

Keep `validateAgentGateEvidence` behavior for the first seven: planner/coder/reviewer read evidence names its existing role file; verdicts are exactly `PLAN_READY`, `CODE_READY`, reviewer `PASS|PASS_WITH_NITS`, and ChatGPT `PASS|PASS_WITH_NITS`. For overlay-control diffs, `validateOverlayPromotionEvidence` additionally requires the fixed plan path, ancestor plan commit, matching approved/current tracked blob, matching tracked SHA-256, Terra/Luna standard policy, exact `PLAN_REVIEW_PASS`, and exact `MSO-6`. Non-overlay PRs continue to require the existing seven fields without the seven conditional workflow fields. Remove every R-01 field from validator, template, required-content markers, and self-tests.

**Step 2: Read plan identity only from Git objects**

Use `git rev-parse HEAD:<planPath>` for the current blob and hash bytes returned by `git show HEAD:<planPath>` for current SHA-256. Compare the declared blob to both `<approvedCommit>:<planPath>` and `HEAD:<planPath>`. Do not call `git hash-object <planPath>` or hash `readFileSync(<planPath>)`.

**Step 3: Keep exact self-tests and add tracked-vs-working regression**

Retain the existing first-seven positive and negative assertions. For both `commitAgentsRouterChange(cwd)` and `commitMetronomeWorkflowSkillChange(cwd)`, assert a body missing `Overlay plan path` fails and the fully populated fourteen-field `MSO-6` body passes; these two deterministic pairs prove both paths trigger the complete contract. For the seven conditional workflow fields, retain or add one failure for each missing/invalid value, non-ancestor/stale commit, wrong blob/SHA, `MSO-5`, unknown stage, and one fully populated fourteen-field positive `MSO-6` fixture. Delete every R-01 fixture enumerated under Paused-Diff Corrections. Add this behavior:

1. Build `validBody(cwd)` from `git show HEAD:<planPath>`.
2. Mutate the plan in the temporary working tree without committing it.
3. Run the gate with the tracked valid body.
4. Assert status `0`, proving the validator ignores the working file and binds to tracked `HEAD`.

Run:

```powershell
node scripts/validate-pr-debt-contract.selftest.mjs
& .\scripts\npm-local.ps1 --% run validate:debt-gates
```

Expected: both exit `0`. Leave the partial implementation uncommitted.

---

### Task 3 [MSO-3]: Finish the Router and Minimal Main-First Overlay

**Files:**
- Modify: `AGENTS.md`
- Create: `.agents/skills/metronome-workflow/SKILL.md`

Preserve the paused root router and central model/pause/execution rules. Replace the overlay Promotion text so workflow changes reach exact `MSO-6` through workflow-plan approval, implementation review, existing gates, CI, and external review only.

Add one concise plan-branch rule:

- generated R-01/later refactor plan commits never merge or cherry-pick into `main`;
- plan branches are retained only through their coding/review lifecycle;
- the monitor passes immutable plan path/commit/blob/SHA, review verdict, and user decision directly to later agents;
- coding branches start from clean `main` and read the plan with `git show <planCommit>:<planPath>`.

Do not add R-01 fields, a ledger, helper script, or branch-fetch workflow.

---

### Task 4 [MSO-4]: Restore Full Role Contracts and Keep References Focused

**Files:**
- Modify: `skills/metronome_planner.md`
- Modify: `skills/metronome_coder.md`
- Modify: `skills/metronome_reviewer.md`
- Modify: `skills/metronome_chatgpt_review.md`
- Modify: `scripts/validate-metronome-gates.mjs`
- Modify: `docs/v1/implementation-slices/refactor/refactor-pipeline-planning-template.md`
- Modify: `docs/architecture/debt-gate-map.md`

For each role file, reconstruct the complete content from `git show HEAD:<path>` and add only this meaning immediately after the title: read `.agents/skills/metronome-workflow/SKILL.md` first; the full role contract remains in force; the overlay has precedence only for shared workflow/model/pause/promotion rules.

Do not keep the paused summaries. Restore `scripts/validate-metronome-gates.mjs` role required-content markers to `HEAD` exactly, then add only `.agents/skills/metronome-workflow/SKILL.md` as the new marker for each role. Also add `.agents/skills/metronome-workflow/SKILL.md` to the validator's `required` file array, not just `requiredContent`, so the existing `existsSync` loop emits `Missing required debt gate file: .agents/skills/metronome-workflow/SKILL.md` and exits `1` when absent.

The existing validator has no isolated missing-file fixture or dependency-injection selftest style; do not add one. Its direct `required`/`existsSync` loop is the missing-file negative behavior. Add a deterministic source-presence assertion for the skill path in both `required` and `requiredContent`, then run `validate:debt-gates` to exercise the present-file path.

Keep the current three-line pointers in the refactor template and debt map. They remain focused references and must not repeat overlay policy.

Verify:

```powershell
git diff --numstat -- skills/metronome_planner.md skills/metronome_coder.md skills/metronome_reviewer.md skills/metronome_chatgpt_review.md
$gateSource = Get-Content -Raw scripts/validate-metronome-gates.mjs
$requiredEnd = $gateSource.IndexOf('const requiredContent')
if ($requiredEnd -lt 0 -or -not $gateSource.Substring(0, $requiredEnd).Contains("'.agents/skills/metronome-workflow/SKILL.md'")) { throw 'BLOCKED: overlay skill is missing from the required file list' }
if (-not $gateSource.Substring($requiredEnd).Contains("'.agents/skills/metronome-workflow/SKILL.md': [")) { throw 'BLOCKED: overlay skill required-content entry is missing' }
& .\scripts\npm-local.ps1 --% run validate:debt-gates
```

Each role file should show a tiny addition and zero contract deletion relative to `HEAD`. Leave Task 1-4 changes uncommitted.

---

### Task 5 [MSO-5]: Review, Simplify, Gate, and Commit the Workflow Implementation

**Allowed workflow PR files:** this plan, `AGENTS.md`, `.agents/skills/metronome-workflow/SKILL.md`, four role files, refactor template, debt map, existing validator/self-test/gate wrapper, and PR template. No R-01 plan, product source, status, package, lock, or workflow file is allowed.

**Step 1: Prove simplification and scope**

```powershell
$allowedWorkflowPr = @('docs/superpowers/plans/2026-07-16-metronome-superpowers-overlay.md','AGENTS.md','.agents/skills/metronome-workflow/SKILL.md','skills/metronome_planner.md','skills/metronome_coder.md','skills/metronome_reviewer.md','skills/metronome_chatgpt_review.md','docs/v1/implementation-slices/refactor/refactor-pipeline-planning-template.md','docs/architecture/debt-gate-map.md','scripts/validate-pr-debt-contract.mjs','scripts/validate-pr-debt-contract.selftest.mjs','scripts/validate-metronome-gates.mjs','.github/pull_request_template.md')
$committedWorkflow = @(git diff --name-only --no-renames origin/main...HEAD)
if ($LASTEXITCODE -ne 0) { throw 'BLOCKED: committed workflow path diff failed' }
$trackedWorkflow = @(git diff --name-only --no-renames HEAD)
if ($LASTEXITCODE -ne 0) { throw 'BLOCKED: tracked workflow path diff failed' }
$untrackedWorkflow = @(git ls-files --others --exclude-standard)
if ($LASTEXITCODE -ne 0) { throw 'BLOCKED: untracked workflow path listing failed' }
$workflowPrPaths = @(($committedWorkflow + $trackedWorkflow + $untrackedWorkflow) | Where-Object { $_ } | ForEach-Object { (($_ -replace '\\', '/') -replace '^\./', '') } | Sort-Object -Unique)
$forbiddenWorkflow = @($workflowPrPaths | Where-Object { $_ -notin $allowedWorkflowPr })
if ($forbiddenWorkflow.Count -gt 0) { throw "BLOCKED: workflow PR scope escaped: $($forbiddenWorkflow -join ', ')" }
$diffStat = @(git diff --stat)
if ($LASTEXITCODE -ne 0) { throw 'BLOCKED: workflow diff-stat failed' }
$diffStat | Write-Output
$productionDiff = @(git diff --numstat -- 'src/**')
if ($LASTEXITCODE -ne 0) { throw 'BLOCKED: production diff check failed' }
if ($productionDiff.Count -gt 0) { throw "BLOCKED: production files changed`n$($productionDiff -join "`n")" }
$r01Surfaces = @(
  '.github/pull_request_template.md',
  'scripts/validate-pr-debt-contract.mjs',
  'scripts/validate-pr-debt-contract.selftest.mjs',
  'scripts/validate-metronome-gates.mjs',
  '.agents/skills/metronome-workflow/SKILL.md'
)
$obsolete = @(
  'R-01 trial identity',
  'R-01 trial review policy',
  'R-01 trial review verdict',
  'R-01 coding authorization',
  'trialIdentity',
  'trialMatch',
  'trialMatch.groups.candidate',
  '(?<candidate>',
  'candidate=',
  'planCommit=',
  'blob=',
  'sha256=',
  'R-01 trial evidence',
  "line.startsWith('- R-01 trial identity:')",
  '- R-01 trial review verdict: PASS',
  '- R-01 trial review verdict: CHANGES_REQUIRED',
  '- R-01 coding authorization: BLOCKED_PENDING_USER_DECISION',
  '- R-01 coding authorization: AUTHORIZED',
  'BLOCKED_PENDING_USER_DECISION',
  'AUTHORIZED'
)
foreach ($token in $obsolete) {
  $hits = @(rg -n -F -- $token $r01Surfaces 2>&1)
  if ($LASTEXITCODE -eq 0) { throw "BLOCKED: obsolete pre-merge R-01 token remains: $token`n$($hits -join "`n")" }
  if ($LASTEXITCODE -ne 1) { throw "BLOCKED: rg failed while checking: $token" }
}
```

The production command and every token search must be empty. The broad label checks also eliminate the four validator failure messages and every `requiredContent` occurrence; the exact fixture/status checks prevent stale synthetic self-tests. Gate/self-test additions must be lower than the paused implementation; role deletions must be gone. Any unexpected growth triggers the central hard pause.

**Step 2: Run implementation review and all existing gates**

Use a fresh Terra/Luna reviewer with the restored full `skills/metronome_reviewer.md` contract. Require no findings before proceeding.

```powershell
& .\scripts\npm-local.ps1 --% run validate:debt-gates
& .\scripts\npm-local.ps1 --% run lint:debt:changed
& .\scripts\npm-local.ps1 --% run lint:xo:changed
& .\scripts\npm-local.ps1 --% run lint
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run test:unit
& .\scripts\npm-local.ps1 --% run build
```

Run verified CodeScene `analyze_change_set` against `origin/main` and require no decline. All commands must pass before the implementation commit.

**Step 3: Commit only the approved workflow files**

Stage the allowed list explicitly, inspect `git diff --cached --name-only`, and commit with normal hooks:

```powershell
git commit -m "Add minimal Metronome Superpowers workflow"
if ($LASTEXITCODE -ne 0) { throw 'BLOCKED: workflow implementation commit failed' }
$implementationStatus = @(git status --porcelain=v2 --untracked-files=all)
if ($LASTEXITCODE -ne 0) { throw 'BLOCKED: post-implementation status failed' }
if ($implementationStatus.Count -gt 0) { throw 'BLOCKED: workflow implementation worktree is not clean after commit' }
```

---

### Task 6 [MSO-6]: Promote and Merge the Workflow PR

1. Push the workflow branch and open/update the dedicated PR. Rerun Task 5 Step 1 on the exact PR head; its complete committed/tracked/untracked path union must contain only the thirteen paths in Task 5's exact `$allowedWorkflowPr`.
2. Populate `Debt Gate Evidence` with every existing command/CodeScene result and populate all fourteen `Agent Gate Evidence` labels from Task 2: the existing planner/coder/reviewer/ChatGPT seven plus the overlay path/commit/blob/SHA-256, independent-review policy/verdict, and `Current metronome Stage: MSO-6`. There are no R-01 fields.
3. Wait for existing CI, including `validate:debt-gates`, to pass on the exact PR head.
4. Run the required external review through the restored `skills/metronome_chatgpt_review.md` contract against the exact PR diff and CI/CodeScene evidence. Require exact `PASS` or `PASS_WITH_NITS`; unavailable or blocking review means `PLAN_BLOCKED`.
5. If PR metadata or evidence changes, wait for the edited-event CI rerun. Merge only when implementation review, full gates, CI, CodeScene, and external review all pass.
6. Return to clean current `main`:

```powershell
git switch main
if ($LASTEXITCODE -ne 0) { throw 'PLAN_BLOCKED: workflow promotion could not switch to main' }
git pull --ff-only
if ($LASTEXITCODE -ne 0) { throw 'PLAN_BLOCKED: workflow promotion could not fast-forward main' }
$mainStatus = @(git status --porcelain=v2 --untracked-files=all)
if ($LASTEXITCODE -ne 0) { throw 'PLAN_BLOCKED: workflow promotion main status failed' }
if ($mainStatus.Count -gt 0) { throw 'PLAN_BLOCKED: workflow promotion did not return to clean main' }
```

The final status must be empty. The workflow PR is now complete; its already-merged status cannot depend on the later R-01 trial.

## Post-Merge R-01 Operational Trial

This section runs only after Task 6 on clean `main`. It is not an MSO promotion stage.
The workflow PR does not alter the historical R-01 file already present on main; the newly generated complete-plan commit/delta stays only on the temporary plan branch and never merges.

**Step 1: Create a temporary plan-only branch from clean main**

```powershell
$repo = 'C:\Users\wsuto\metronome'
$mainCommit = git -C $repo rev-parse main
if ($LASTEXITCODE -ne 0 -or $mainCommit -notmatch '^[a-f0-9]{40}$') { throw 'R-01 PLAN_BLOCKED: main commit resolution failed' }
$worktree = 'C:\tmp\metronome-r01-plan-worktree'
$branch = "codex/r01-plan-$($mainCommit.Substring(0, 12))"
$mainStatus = @(git -C $repo status --porcelain=v2 --untracked-files=all)
if ($LASTEXITCODE -ne 0) { throw 'R-01 PLAN_BLOCKED: main status failed' }
if ($mainStatus.Count -gt 0) { throw 'R-01 PLAN_BLOCKED: main is not clean' }
if (Test-Path $worktree) { throw 'R-01 PLAN_BLOCKED: plan worktree already exists' }
git -C $repo show-ref --verify --quiet "refs/heads/$branch"
$branchProbe = $LASTEXITCODE
if ($branchProbe -notin @(0, 1)) { throw 'R-01 PLAN_BLOCKED: plan branch probe failed' }
if ($branchProbe -eq 0) { throw 'R-01 PLAN_BLOCKED: plan branch already exists' }
git -C $repo worktree add -b $branch $worktree $mainCommit
if ($LASTEXITCODE -ne 0) { throw 'R-01 PLAN_BLOCKED: plan worktree creation failed' }
$worktreeStatus = @(git -C $worktree status --porcelain=v2 --untracked-files=all)
if ($LASTEXITCODE -ne 0) { throw 'R-01 PLAN_BLOCKED: plan worktree status failed' }
if ($worktreeStatus.Count -gt 0) { throw 'R-01 PLAN_BLOCKED: new plan worktree is not clean' }
$worktreeHead = git -C $worktree rev-parse HEAD
if ($LASTEXITCODE -ne 0 -or $worktreeHead -notmatch '^[a-f0-9]{40}$' -or $worktreeHead -ne $mainCommit) { throw 'R-01 PLAN_BLOCKED: plan worktree base mismatch' }
```

**Step 2: Launch a fresh empty-context Sol standard plan agent**

Use a new, non-resumed `codex exec`; the neutral prompt relies on persistent routing rather than naming router/overlay paths:

```powershell
$worktree = 'C:\tmp\metronome-r01-plan-worktree'
$codex = 'C:\Users\wsuto\.codex\.sandbox-bin\codex.exe'
$evidence = 'C:\tmp\metronome-r01-plan-evidence'
$mainCommit = git -C $worktree rev-parse HEAD
if ($LASTEXITCODE -ne 0 -or $mainCommit -notmatch '^[a-f0-9]{40}$') { throw 'R-01 PLAN_BLOCKED: trial base resolution failed' }
New-Item -ItemType Directory -Force -Path $evidence | Out-Null
$prompt = @'
Create the durable complete R-01 staged refactor plan at the repository-prescribed path. Follow persistent repository workflow and planning instructions. Read the authoritative project scan, R-01 target forensics, remediation plan, refactor template, applicable planning/execution skills, and only necessary target/repo-map code. Map every finding to a stage or explicit PLAN_BLOCKED item; choose one-agent reuse or a fresh agent per stage by size; include deletion, allowed-new-surface, net-debt, production-LOC, Code Health, and user-review-before-coding gates. Write only the plan and return exactly PLAN_READY or PLAN_BLOCKED.
'@
& $codex exec --model gpt-5.6-sol --config 'model_reasoning_effort="medium"' --config 'service_tier="default"' --strict-config --ignore-user-config --sandbox workspace-write --ephemeral --cd $worktree --output-last-message "$evidence\plan-last.txt" $prompt
if ($LASTEXITCODE -ne 0 -or (Get-Content -Raw "$evidence\plan-last.txt").Trim() -ne 'PLAN_READY') { throw 'R-01 PLAN_BLOCKED: fresh Sol planner failed' }
$postPlanHead = git -C $worktree rev-parse HEAD
if ($LASTEXITCODE -ne 0 -or $postPlanHead -notmatch '^[a-f0-9]{40}$') { throw 'R-01 PLAN_BLOCKED: post-plan HEAD resolution failed' }
if ($postPlanHead -ne $mainCommit) { throw 'R-01 PLAN_BLOCKED: planner created an unexpected commit' }
$planPath = 'docs/v1/implementation-slices/refactor/R-01-sheet-practice-controls.md'
$statusLines = @(git -C $worktree status --porcelain=v1 --untracked-files=all)
if ($LASTEXITCODE -ne 0) { throw 'R-01 PLAN_BLOCKED: plan-only status failed' }
$changed = @($statusLines | ForEach-Object { $_.Substring(3).Trim('"') })
if ($changed.Count -ne 1 -or $changed[0] -ne $planPath) { throw 'R-01 PLAN_BLOCKED: trial is not plan-only' }
git -C $worktree add -- $planPath
if ($LASTEXITCODE -ne 0) { throw 'R-01 PLAN_BLOCKED: plan staging failed' }
git -C $worktree commit -m "Create reviewed R-01 implementation plan"
if ($LASTEXITCODE -ne 0) { throw 'R-01 PLAN_BLOCKED: plan commit failed' }
$planParent = git -C $worktree rev-parse HEAD^
if ($LASTEXITCODE -ne 0 -or $planParent -notmatch '^[a-f0-9]{40}$') { throw 'R-01 PLAN_BLOCKED: plan parent resolution failed' }
if ($planParent -ne $mainCommit) { throw 'R-01 PLAN_BLOCKED: plan commit is not based on merged main' }
$postCommitStatus = @(git -C $worktree status --porcelain=v2 --untracked-files=all)
if ($LASTEXITCODE -ne 0) { throw 'R-01 PLAN_BLOCKED: post-commit status failed' }
if ($postCommitStatus.Count -gt 0) { throw 'R-01 PLAN_BLOCKED: plan branch is not clean after commit' }
```

Use normal hooks, require clean status after commit, and compute the immutable identity:

```powershell
$worktree = 'C:\tmp\metronome-r01-plan-worktree'
$planPath = 'docs/v1/implementation-slices/refactor/R-01-sheet-practice-controls.md'
$planCommit = git -C $worktree rev-parse HEAD
if ($LASTEXITCODE -ne 0 -or $planCommit -notmatch '^[a-f0-9]{40}$') { throw 'R-01 PLAN_BLOCKED: plan commit resolution failed' }
$planBlob = git -C $worktree rev-parse "HEAD:$planPath"
if ($LASTEXITCODE -ne 0 -or $planBlob -notmatch '^[a-f0-9]{40}$') { throw 'R-01 PLAN_BLOCKED: plan blob resolution failed' }
$env:PLAN_SPEC = "$planCommit`:$planPath"
$planSha256 = node --input-type=module -e 'import {execFileSync} from "node:child_process"; import {createHash} from "node:crypto"; process.stdout.write(createHash("sha256").update(execFileSync("git", ["-C", "C:\\tmp\\metronome-r01-plan-worktree", "show", process.env.PLAN_SPEC])).digest("hex"));'
$planHashExit = $LASTEXITCODE
Remove-Item Env:PLAN_SPEC
if ($planHashExit -ne 0 -or $planSha256 -notmatch '^[a-f0-9]{64}$') { throw 'R-01 PLAN_BLOCKED: plan SHA-256 computation failed' }
```

**Step 3: Review and stop for the user**

Launch a separate fresh Luna standard reviewer:

```powershell
$worktree = 'C:\tmp\metronome-r01-plan-worktree'
$evidence = 'C:\tmp\metronome-r01-plan-evidence'
$codex = 'C:\Users\wsuto\.codex\.sandbox-bin\codex.exe'
$planPath = 'docs/v1/implementation-slices/refactor/R-01-sheet-practice-controls.md'
$planCommit = git -C $worktree rev-parse HEAD
if ($LASTEXITCODE -ne 0 -or $planCommit -notmatch '^[a-f0-9]{40}$') { throw 'R-01 PLAN_BLOCKED: review plan commit resolution failed' }
$planBlob = git -C $worktree rev-parse "HEAD:$planPath"
if ($LASTEXITCODE -ne 0 -or $planBlob -notmatch '^[a-f0-9]{40}$') { throw 'R-01 PLAN_BLOCKED: review plan blob resolution failed' }
$env:PLAN_SPEC = "$planCommit`:$planPath"
$planSha256 = node --input-type=module -e 'import {execFileSync} from "node:child_process"; import {createHash} from "node:crypto"; process.stdout.write(createHash("sha256").update(execFileSync("git", ["-C", "C:\\tmp\\metronome-r01-plan-worktree", "show", process.env.PLAN_SPEC])).digest("hex"));'
$planHashExit = $LASTEXITCODE
Remove-Item Env:PLAN_SPEC
if ($planHashExit -ne 0 -or $planSha256 -notmatch '^[a-f0-9]{64}$') { throw 'R-01 PLAN_BLOCKED: review plan SHA-256 computation failed' }
$before = @(git -C $worktree status --porcelain=v2 --untracked-files=all)
if ($LASTEXITCODE -ne 0) { throw 'R-01 PLAN_BLOCKED: pre-review status failed' }
$reviewPrompt = "Independently review $planPath at commit $planCommit, blob $planBlob, SHA-256 $planSha256. Read the actual project scan, R-01 forensics, remediation plan, template, and generated plan. Require 100% finding coverage, feasible stages and per-stage agent strategy, deletion/new-surface/net-debt evidence, anti-wrapper/LOC/Code Health guards, no product coding, and an explicit user stop. Do not modify files. Return exactly PASS or CHANGES_REQUIRED."
& $codex exec --model gpt-5.6-luna --config 'model_reasoning_effort="medium"' --config 'service_tier="default"' --strict-config --ignore-user-config --sandbox read-only --ephemeral --cd $worktree --output-last-message "$evidence\review-last.txt" $reviewPrompt
if ($LASTEXITCODE -ne 0 -or (Get-Content -Raw "$evidence\review-last.txt").Trim() -ne 'PASS') { throw 'R-01 PLAN_BLOCKED: independent review failed' }
$after = @(git -C $worktree status --porcelain=v2 --untracked-files=all)
if ($LASTEXITCODE -ne 0) { throw 'R-01 PLAN_BLOCKED: post-review status failed' }
if (Compare-Object $before $after) { throw 'R-01 PLAN_BLOCKED: read-only review changed Git-visible status' }
```

On success, present the generated plan and immutable identity to the user. Do not start coding until the user explicitly approves.

**Failure path: narrow workflow-fix loop**

If plan generation, identity binding, or independent review fails, stop. Keep the failed temporary R-01 branch/artifact out of `main`; never edit, merge, or cherry-pick it. Launch a fresh independent Terra/Luna standard diagnosis against the failed evidence, then create a new fix worktree from freshly fetched `origin/main`:

```powershell
$repo = 'C:\Users\wsuto\metronome'
git -C $repo fetch origin main
if ($LASTEXITCODE -ne 0) { throw 'PLAN_BLOCKED: workflow-fix fetch failed' }
$fixBase = git -C $repo rev-parse origin/main
if ($LASTEXITCODE -ne 0 -or $fixBase -notmatch '^[a-f0-9]{40}$') { throw 'PLAN_BLOCKED: origin/main base resolution failed' }
$stamp = Get-Date -Format 'yyyyMMddHHmmss'
$fixBranch = "codex/metronome-workflow-fix-$stamp"
$fixWorktree = "C:\tmp\metronome-workflow-fix-$stamp"
git -C $repo show-ref --verify --quiet "refs/heads/$fixBranch"
$branchProbe = $LASTEXITCODE
if ($branchProbe -notin @(0, 1)) { throw 'PLAN_BLOCKED: workflow-fix branch probe failed' }
if ($branchProbe -eq 0 -or (Test-Path $fixWorktree)) { throw 'PLAN_BLOCKED: workflow-fix branch/worktree already exists' }
git -C $repo worktree add -b $fixBranch $fixWorktree $fixBase
if ($LASTEXITCODE -ne 0) { throw 'PLAN_BLOCKED: workflow-fix worktree creation failed' }
$fixStatus = @(git -C $fixWorktree status --porcelain=v2 --untracked-files=all)
if ($LASTEXITCODE -ne 0) { throw 'PLAN_BLOCKED: workflow-fix worktree status failed' }
if ($fixStatus.Count -gt 0) { throw 'PLAN_BLOCKED: workflow-fix worktree is not clean' }
$fixHead = git -C $fixWorktree rev-parse HEAD
if ($LASTEXITCODE -ne 0 -or $fixHead -notmatch '^[a-f0-9]{40}$') { throw 'PLAN_BLOCKED: workflow-fix HEAD resolution failed' }
if ($fixHead -ne $fixBase) { throw 'PLAN_BLOCKED: workflow-fix is not based on fetched origin/main' }
```

The workflow-fix diff is limited to the minimum subset of the exact `$allowed` set below. `src/**`, every product/test/status/package/lock/workflow file, and `docs/v1/implementation-slices/refactor/R-01-sheet-practice-controls.md` are forbidden. Under the stated non-malicious-monitor threat model, the monitor also forbids merge/cherry-pick commits from the temporary R-01 branch. Before every fix commit and PR promotion, compare committed branch, tracked working, and untracked names to the allowlist, require no merge commits, and fail closed on any R-01 plan path:

```powershell
$allowed = @('AGENTS.md','.agents/skills/metronome-workflow/SKILL.md','skills/metronome_planner.md','skills/metronome_coder.md','skills/metronome_reviewer.md','skills/metronome_chatgpt_review.md','docs/v1/implementation-slices/refactor/refactor-pipeline-planning-template.md','docs/architecture/debt-gate-map.md','scripts/validate-pr-debt-contract.mjs','scripts/validate-pr-debt-contract.selftest.mjs','scripts/validate-metronome-gates.mjs','.github/pull_request_template.md','docs/superpowers/plans/2026-07-16-metronome-superpowers-overlay.md')
$committed = @(git -C $fixWorktree diff --name-only --no-renames origin/main...HEAD)
if ($LASTEXITCODE -ne 0) { throw 'PLAN_BLOCKED: committed-path diff failed' }
$tracked = @(git -C $fixWorktree diff --name-only --no-renames HEAD)
if ($LASTEXITCODE -ne 0) { throw 'PLAN_BLOCKED: tracked working-path diff failed' }
$untracked = @(git -C $fixWorktree ls-files --others --exclude-standard)
if ($LASTEXITCODE -ne 0) { throw 'PLAN_BLOCKED: untracked-path listing failed' }
$changed = @(($committed + $tracked + $untracked) | Where-Object { $_ } | ForEach-Object {
  $normalized = (($_ -replace '\\', '/') -replace '^\./', '')
  if ([string]::IsNullOrWhiteSpace($normalized) -or $normalized -match '^(/|[A-Za-z]:/)' -or (($normalized -split '/') -contains '..')) { throw "PLAN_BLOCKED: unsafe workflow-fix path: $_" }
  $normalized
} | Sort-Object -Unique)
$outside = @($changed | Where-Object { $_ -notin $allowed })
if ($outside.Count -gt 0) { throw "PLAN_BLOCKED: workflow-fix scope escaped: $($outside -join ', ')" }
if ($changed -contains 'docs/v1/implementation-slices/refactor/R-01-sheet-practice-controls.md' -or ($changed | Where-Object { $_ -like 'src/*' })) { throw 'PLAN_BLOCKED: R-01/product content entered workflow-fix' }
$mergeCommits = @(git -C $fixWorktree log --merges --format='%H' "$fixBase..HEAD")
if ($LASTEXITCODE -ne 0) { throw 'PLAN_BLOCKED: merge-history check failed' }
if ($mergeCommits.Count -gt 0) { throw 'PLAN_BLOCKED: workflow-fix contains a merge commit' }
```

The three Git sources cover committed branch changes, staged/unstaged tracked changes, and untracked paths. With `--no-renames`, a rename becomes delete+add, so both changed paths are checked. For a copy, the unchanged source is not a changed path and needs no allowlist check; the new destination is reported and must be allowed. Do not add copy detection. Every command error, unsafe path, or path outside `$allowed` is `PLAN_BLOCKED`, including untracked `src/**` and R-01 plan paths.

If diagnosis changes this workflow plan, shared contract, evidence schema, or scope, the first fix-branch commit must contain only this plan; recompute its tracked commit/blob/SHA-256, obtain a fresh independent Terra/Luna `PLAN_REVIEW_PASS`, and receive explicit user approval before implementation. A mechanical correction already specified by the unchanged approved plan may reuse that tracked plan identity, but still requires the new diagnosis and independent implementation review.

Implement only the diagnosed workflow correction. Run the complete Task 5 gate suite and CodeScene, commit with normal hooks, populate all fourteen evidence fields, pass PR CI and the required external review, merge the narrow workflow-fix PR, then return to freshly fetched clean `main`:

```powershell
git -C $repo switch main
if ($LASTEXITCODE -ne 0) { throw 'PLAN_BLOCKED: switch to main failed after workflow-fix merge' }
git -C $repo fetch origin main
if ($LASTEXITCODE -ne 0) { throw 'PLAN_BLOCKED: post-fix main fetch failed' }
git -C $repo pull --ff-only origin main
if ($LASTEXITCODE -ne 0) { throw 'PLAN_BLOCKED: post-fix main fast-forward failed' }
$mainStatus = @(git -C $repo status --porcelain=v2 --untracked-files=all)
if ($LASTEXITCODE -ne 0) { throw 'PLAN_BLOCKED: post-fix main status failed' }
if ($mainStatus.Count -gt 0) { throw 'PLAN_BLOCKED: main is not clean after workflow-fix merge' }
```

After diagnosis evidence is retained, remove the failed temporary plan worktree/branch without applying its artifact anywhere. Repeat Steps 1-3 as a brand-new Sol trial from the newly merged clean `main`. R-01 coding stays blocked until that repeated trial returns `PLAN_READY`, receives fresh Terra/Luna `PASS`, and the user explicitly approves the reviewed immutable plan.

**Step 4: Minimal handoff after explicit approval**

Pass this six-field packet directly in the coding/reviewer task prompt; do not save a status ledger:

```text
Plan path: docs/v1/implementation-slices/refactor/R-01-sheet-practice-controls.md
Plan commit: <40hex>
Plan blob: <40hex>
Plan SHA-256: <64hex>
Independent plan review: PASS (GPT-5.6 Terra/Luna standard)
User decision: APPROVED
```

The coding branch starts from clean `main`, not the plan branch. Before coding, substitute the packet values and run:

```powershell
$planPath = 'docs/v1/implementation-slices/refactor/R-01-sheet-practice-controls.md'
$planCommit = '<packet planCommit>'
$packetPlanBlob = '<packet planBlob>'
$packetPlanSha256 = '<packet planSha256>'
if ($planCommit -notmatch '^[a-f0-9]{40}$' -or $packetPlanBlob -notmatch '^[a-f0-9]{40}$' -or $packetPlanSha256 -notmatch '^[a-f0-9]{64}$') { throw 'BLOCKED: malformed immutable plan packet' }
git cat-file -e "$planCommit`:$planPath"
if ($LASTEXITCODE -ne 0) { throw 'BLOCKED: immutable plan commit/path is unavailable' }
$actualPlanBlob = git rev-parse "$planCommit`:$planPath"
if ($LASTEXITCODE -ne 0 -or $actualPlanBlob -notmatch '^[a-f0-9]{40}$') { throw 'BLOCKED: immutable plan blob resolution failed' }
if ($actualPlanBlob -ne $packetPlanBlob) { throw 'BLOCKED: immutable plan blob mismatch' }
$env:PLAN_SPEC = "$planCommit`:$planPath"
$actualPlanSha256 = node --input-type=module -e 'import {execFileSync} from "node:child_process"; import {createHash} from "node:crypto"; process.stdout.write(createHash("sha256").update(execFileSync("git", ["show", process.env.PLAN_SPEC])).digest("hex"));'
$planHashExit = $LASTEXITCODE
Remove-Item Env:PLAN_SPEC
if ($planHashExit -ne 0 -or $actualPlanSha256 -notmatch '^[a-f0-9]{64}$') { throw 'BLOCKED: immutable plan git-show/SHA-256 computation failed' }
if ($actualPlanSha256 -ne $packetPlanSha256) { throw 'BLOCKED: immutable plan SHA-256 mismatch' }
```

Only after all checks pass may the agent read `git show <planCommit>:<planPath>` and code. Reviewer agents receive the same packet and rerun the same existence/blob/SHA block before review. Keep the local plan branch until the coding PR closes, then delete it; never merge/cherry-pick it and never add CI branch-fetch logic.

## Final Self-Review

- The workflow PR reaches `MSO-6` and merges before any real R-01 trial.
- The PR template/validator preserve the existing seven role fields and require the seven additional workflow fields for overlay-control diffs.
- Every enumerated pre-merge R-01 label, parser/fixture identifier, marker, and obsolete status token is absent from workflow validator, self-test, gate markers, PR template, and overlay promotion.
- Overlay plan identity is derived from tracked `HEAD:<path>` blob/content/SHA only.
- Full `HEAD` role contracts survive with pointer-only additions.
- Generated R-01/later plans never merge into `main`; later agents verify commit, blob, and SHA-256 from immutable `git show` bytes before using the handoff.
- Post-merge trial failure starts a bounded workflow-fix from fresh `origin/main`; no product/R-01 plan content enters it, and a repeated fresh trial plus user approval is required before coding.
- Production diff remains `0 LOC`, and the paused implementation becomes smaller in mechanism surface.
