# Metronome Superpowers Overlay Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to execute this plan task by task.

**Goal:** Make the existing Metronome workflow durable in fresh Codex tasks by adding one mandatory router and one repo-local skill that compose the existing Superpowers plugin and existing debt gates.

**Architecture:** Root `AGENTS.md` routes every task to `.agents/skills/metronome-workflow/SKILL.md`. That skill is the single Metronome-wide workflow contract and composes Superpowers. Existing `skills/metronome_*.md` files remain role references, existing debt-gate validation remains the only promotion validator, and `docs/v1/status.json` remains untouched. No second framework, stage machine, status ledger, attestation framework, ignored-file manifest, or wrapper API is added.

**Tech Stack:** Markdown, Node.js ESM, existing Git/GitHub Actions gates, PowerShell, `codex-cli 0.144.5`, CodeScene MCP.

**Execution Mode:** `superpowers:executing-plans`, reusing one GPT-5.6 Terra standard coding agent. The change is small and cohesive across one workflow contract and its existing enforcement surfaces. `superpowers:subagent-driven-development` is reserved for a future plan whose tasks are large or independently reviewable.

**Estimated Production-Code Diff:** `0 LOC` under `src/**`. Expected changes are workflow docs, one repo skill, and the existing validator/self-test/PR template only.

**Plan Verdict:** `PLAN_READY` for a new plan-only commit and independent review. Commit `e15fe5f934c48f5740edbafa61906d649af595d8` is superseded. Overlay coding remains blocked until Task 0 passes for the new commit and hashes.

## Verified Interfaces and Limits

- `codex-cli 0.144.5` was verified with `codex.exe --version`.
- `codex exec --help` verified `--model`, `--config`, `--strict-config`, `--ignore-user-config`, `--sandbox read-only`, `--ephemeral`, `--cd`, `--json`, and `--output-last-message`.
- `codex debug models --bundled` verified `gpt-5.6-terra` and `gpt-5.6-luna`; standard launches use `model_reasoning_effort="medium"` and `service_tier="default"`. Every nested reviewer or acceptance launch must set these explicitly and must never inherit the active Sol/low configuration.
- Real `codex exec --json` output exposes thread, turn, and item events. The only fields used here are completed `command_execution` items (`command`, `aggregated_output`, `exit_code`, `status`) and final output written by `--output-last-message`. There are no claimed discovery or invocation events.
- The following Superpowers sources were verified as files under `C:\Users\wsuto\.codex\.tmp\plugins\plugins\superpowers\skills`: `using-superpowers\SKILL.md`, `writing-plans\SKILL.md`, `executing-plans\SKILL.md`, and `subagent-driven-development\SKILL.md`. Task 0 rechecks them; a missing source is `PLAN_BLOCKED`.
- The available CodeScene schema verifies `mcp__codescene__analyze_change_set({git_repository_path, base_ref})` and its `quality_gates`/`results[].verdict` response. It is used once, at final promotion. If the target call cannot run or cannot prove no decline, promotion is blocked.
- Any newly claimed CLI flag, JSONL field, MCP field, gate entrypoint, or plugin path must first be proven by an actual target command or official schema. Otherwise stop with `PLAN_BLOCKED`; do not infer or simulate the interface.

**Threat model:** These controls prevent accidental model misrouting, stale plan evidence, Git-visible tracked/untracked mutations, and workflow drift under a non-malicious monitor. The exact CLI launch parameters are operational evidence, not cryptographic proof of model identity, freshness, or independence. A malicious monitor and ignored-file mutations are out of scope; cleanliness claims must say **Git-visible tracked/untracked cleanliness**, never full-worktree cleanliness.

## Central Contract

The implementation must place shared policy only in `.agents/skills/metronome-workflow/SKILL.md`; root `AGENTS.md` is the mandatory pointer to it.

1. A Superpowers Task is the Metronome Stage.
2. Plan agents use GPT-5.6 Sol standard. Every coder, diagnosis agent, reviewer, and fresh-context acceptance agent uses GPT-5.6 Terra standard or GPT-5.6 Luna standard. Never use fast, and never route a non-plan role to Sol.
3. Small cohesive work uses one coding agent through `superpowers:executing-plans`; large independently separable work uses `superpowers:subagent-driven-development`.
4. `PLAN_READY` does not authorize coding. The current tracked plan commit, Git blob, and SHA-256 must have a matching independent Terra/Luna `PLAN_REVIEW_PASS` first.
5. Unexpected production LOC growth, Code Health decline, scope expansion, or an unplanned wrapper/public API means: stop; launch independent GPT-5.6 Terra standard or GPT-5.6 Luna standard diagnosis; resume only after explicit user decision. Never route diagnosis, fix, or review to GPT-5.6 Sol.
6. Refactor plans describe exact files, behavior, tests, and commands but do not prewrite large implementation bodies.
7. Unverified interfaces block the plan or promotion. Final promotion reuses `validate:debt-gates`, the pre-commit hook, CI, CodeScene, and the existing PR evidence section.

The root router must make the overlay mandatory before planning, coding, review, or promotion. Role files point to the overlay and contain only role-specific inputs, checks, model choice, and verdicts. They do not restate the shared pause, stage, execution-mode, or interface rules.

## Promotion Authority

This tracked, hashed plan is the sole authority for this overlay rollout. Its stage IDs are:

| Checkpoint | Operational meaning |
|---|---|
| `MSO-0` | New plan-only commit and matching independent review approved |
| `MSO-1` | RED self-tests prove both overlay control files are initially ungated |
| `MSO-2` | Existing validator owns overlay final-promotion evidence |
| `MSO-3` | Root router and repo overlay exist |
| `MSO-4` | Role references and refactor reference are narrowed |
| `MSO-5` | Existing hooks, tests, scope audit, and CodeScene pass |
| `MSO-6` | Isolated R-01 observable-conformance acceptance passes |

`MSO-0` through `MSO-5` are operational checkpoints recorded and advanced by the monitor under the stated threat model. They are not repository-level states, and the implementation must not add generic transition parsing or intermediate-stage evidence.

The existing PR validator mechanically accepts this overlay PR only at exact final stage `MSO-6`. For changes to `AGENTS.md` or `.agents/skills/metronome-workflow/SKILL.md`, it must require the exact plan path, current plan commit/blob/SHA-256, independent plan-review policy and PASS, existing final role verdicts, and `Current metronome Stage: MSO-6`. `MSO-5`, an unknown heading, or a missing heading must fail. The monitor is the authorized promoter after all evidence exists; CI is the final mechanical check.

---

### Task 0 [MSO-0]: Bootstrap the New Tracked Plan Approval

Modify and commit only `docs/superpowers/plans/2026-07-16-metronome-superpowers-overlay.md`; put review evidence under `C:\tmp\metronome-overlay-plan-review`.

**Step 1: Create the plan-only commit and identities**

```powershell
git status --short
git diff --name-only
git add docs/superpowers/plans/2026-07-16-metronome-superpowers-overlay.md
git diff --cached --name-only
git commit -m "Revise Metronome Superpowers overlay plan"
git status --short
$plan = 'docs/superpowers/plans/2026-07-16-metronome-superpowers-overlay.md'
$planCommit = git rev-parse HEAD
$planBlob = git rev-parse "HEAD:$plan"
$planSha256 = (Get-FileHash -Algorithm SHA256 $plan).Hash.ToLowerInvariant()
$superpowers = 'C:\Users\wsuto\.codex\.tmp\plugins\plugins\superpowers\skills'
@(
  "$superpowers\using-superpowers\SKILL.md",
  "$superpowers\writing-plans\SKILL.md",
  "$superpowers\executing-plans\SKILL.md",
  "$superpowers\subagent-driven-development\SKILL.md"
) | ForEach-Object { if (-not (Test-Path -LiteralPath $_ -PathType Leaf)) { throw "PLAN_BLOCKED: missing $_" } }
```

The staged list must contain only this plan. Use normal hooks, never `--no-verify`, and require empty final status. Record all three identities; any later plan edit repeats Task 0 from Step 1.

**Step 2: Launch one independent read-only Luna review of that exact commit**

```powershell
$plan = 'docs/superpowers/plans/2026-07-16-metronome-superpowers-overlay.md'
$planCommit = git rev-parse HEAD
$planBlob = git rev-parse "HEAD:$plan"
$planSha256 = (Get-FileHash -Algorithm SHA256 $plan).Hash.ToLowerInvariant()
$codex = 'C:\Users\wsuto\.codex\.sandbox-bin\codex.exe'
$evidence = 'C:\tmp\metronome-overlay-plan-review'
New-Item -ItemType Directory -Force -Path $evidence | Out-Null
$beforeReview = git status --porcelain=v2 --untracked-files=all
if ($beforeReview) { throw 'PLAN_BLOCKED: review worktree is not Git-visible clean' }
$prompt = @"
Independently review only $plan at commit $planCommit (blob $planBlob, SHA-256 $planSha256). Check feasibility, minimality, internal consistency, exact RED/GREEN commands, final-only MSO-6 promotion, fresh-context acceptance, and the zero-production-LOC boundary. Do not modify files. Return exactly PLAN_REVIEW_PASS or CHANGES_REQUIRED.
"@
& $codex exec --model gpt-5.6-luna --config 'model_reasoning_effort="medium"' --config 'service_tier="default"' --strict-config --ignore-user-config --sandbox read-only --ephemeral --cd 'C:\Users\wsuto\metronome' --json --output-last-message "$evidence\review-last.txt" $prompt |
  Tee-Object -FilePath "$evidence\review-events.jsonl"
if ($LASTEXITCODE -ne 0) { throw 'PLAN_BLOCKED: independent review launch failed' }
if ((Get-Content -Raw "$evidence\review-last.txt").Trim() -ne 'PLAN_REVIEW_PASS') { throw 'PLAN_BLOCKED: independent review did not pass' }
$afterReview = git status --porcelain=v2 --untracked-files=all
if ($afterReview -ne $beforeReview -or $afterReview) { throw 'PLAN_BLOCKED: review changed Git-visible status' }
```

The explicit invocation is the operational model/read-only evidence under the threat model. JSONL does not prove model identity or human-like independence.

**Step 3: Assert minimal approval evidence before coding**

Write `$evidence\approval.json` with exactly `planPath`, `planCommit`, `planBlob`, `planSha256`, `reviewerPolicy` (`GPT-5.6 Luna standard` here), and `verdict` (`PLAN_REVIEW_PASS`). Then run:

```powershell
$plan = 'docs/superpowers/plans/2026-07-16-metronome-superpowers-overlay.md'
$evidence = 'C:\tmp\metronome-overlay-plan-review'
$approval = Get-Content -Raw "$evidence\approval.json" | ConvertFrom-Json
$null = git merge-base --is-ancestor $approval.planCommit HEAD
if ($LASTEXITCODE -ne 0) { throw 'PLAN_BLOCKED: reviewed plan commit is not an ancestor' }
$approvedBlob = git rev-parse "$($approval.planCommit):$plan"
$actualBlob = git hash-object $plan
$actualSha256 = (Get-FileHash -Algorithm SHA256 $plan).Hash.ToLowerInvariant()
if ($approval.planPath -ne $plan -or $approval.planBlob -ne $approvedBlob -or $approval.planBlob -ne $actualBlob -or $approval.planSha256 -ne $actualSha256) { throw 'PLAN_BLOCKED: stale plan approval' }
if ($approval.reviewerPolicy -notin @('GPT-5.6 Terra standard', 'GPT-5.6 Luna standard') -or $approval.verdict -ne 'PLAN_REVIEW_PASS') { throw 'PLAN_BLOCKED: invalid independent review evidence' }
if (-not (Test-Path "$evidence\review-events.jsonl") -or (Get-Content -Raw "$evidence\review-last.txt").Trim() -ne 'PLAN_REVIEW_PASS') { throw 'PLAN_BLOCKED: missing review artifacts' }
```

The assertion mechanically proves current Git/file identity, an allowed recorded policy, the exact verdict, and artifact presence. The monitor guarantees freshness and independence by making the separate pinned launch. No cryptographic claim is made.

Do not make a RED or partial implementation commit in Tasks 1-4. The next commit occurs only after Task 5 is green.

### Task 1 [MSO-1]: RED - Prove Overlay Control Files Are Ungated

**File:** Modify `scripts/validate-pr-debt-contract.selftest.mjs`.

**Step 1: Add two exact RED fixtures**

Use existing `createRepo`, `write`, `git`, `runGate`, and `validBody` helpers. Add one fixture that commits a root `AGENTS.md` change and one that commits `.agents/skills/metronome-workflow/SKILL.md`, then runs the existing validator with `validBody` altered to omit overlay approval fields.

The exact new assertions are:

```js
assert.equal(result.status, 1, 'AGENTS.md change must require overlay promotion evidence');
assert.equal(result.status, 1, 'metronome-workflow skill change must require overlay promotion evidence');
```

**Step 2: Run RED and verify the intended failure**

```powershell
node scripts/validate-pr-debt-contract.selftest.mjs
```

Expected exit: `1`. Before matcher implementation, the first assertion fails with actual status `0`, expected status `1`, and message `AGENTS.md change must require overlay promotion evidence`. Any syntax error or different failure is not valid RED.

Leave the RED state uncommitted.

### Task 2 [MSO-2]: GREEN - Extend the Existing Final-Promotion Gate

**Files:**
- Modify: `scripts/validate-pr-debt-contract.mjs`
- Modify: `scripts/validate-pr-debt-contract.selftest.mjs`
- Modify: `scripts/validate-metronome-gates.mjs`
- Modify: `.github/pull_request_template.md`

**Step 1: Make the two overlay files existing gate-control files**

Add exact patterns for root `AGENTS.md` and `.agents/skills/metronome-workflow/SKILL.md` to `gateControlFilePatterns`. Add an `overlayControlFiles` set for only those paths.

**Step 2: Add a narrow overlay final-promotion validator**

When a PR diff includes either overlay control file, parse these additional lines from the existing `Agent Gate Evidence` section:

```text
- Overlay plan path:
- Overlay plan commit:
- Overlay plan blob:
- Overlay plan SHA-256:
- Independent plan review policy:
- Independent plan review verdict:
- Current metronome Stage:
```

Require:

- plan path exactly `docs/superpowers/plans/2026-07-16-metronome-superpowers-overlay.md`;
- declared commit is an ancestor of `HEAD`;
- declared blob equals both `<commit>:<planPath>` and the current tracked plan blob;
- declared SHA-256 equals the current plan file SHA-256;
- policy exactly `GPT-5.6 Terra standard` or `GPT-5.6 Luna standard`;
- independent verdict exactly `PLAN_REVIEW_PASS`;
- existing planner/coder/reviewer/ChatGPT final verdicts remain valid;
- stage exactly `MSO-6`.

Do not accept arbitrary `MSO-*` headings. Do not parse legal transitions or intermediate evidence. This is one special final-promotion check inside the existing validator.

**Step 3: Make the self-test executable and exact**

Extend `validBody` with valid values computed from each temporary repository's committed plan fixture. Add negative cases for `MSO-5`, an unknown stage, missing independent PASS, stale commit/blob/SHA-256, and a positive `MSO-6` case.

Run:

```powershell
node scripts/validate-pr-debt-contract.selftest.mjs
```

Expected exit: `0`, ending with `validate-pr-debt-contract selftest passed.`

**Step 4: Gate presence without duplicating policy**

Update `scripts/validate-metronome-gates.mjs` to require the two overlay files and distinctive ownership markers only:

- root router contains `.agents/skills/metronome-workflow/SKILL.md`;
- overlay contains `Superpowers Task is the Metronome Stage`, all four hard-pause triggers, `explicit user decision`, `Never route diagnosis, fix, or review to GPT-5.6 Sol`, and both execution-mode skill names;
- validator/self-test/template contain the exact overlay evidence labels and `MSO-6`.

Do not add another validator or a generic status protocol.

**Step 5: Add the seven evidence lines to the existing PR template**

Add the labels under `Agent Gate Evidence`; keep all existing evidence fields.

Leave this partial state uncommitted.

### Task 3 [MSO-3]: Add the Mandatory Router and One Overlay Skill

**Files:** Modify `AGENTS.md`; create `.agents/skills/metronome-workflow/SKILL.md`.

**Step 1: Turn root AGENTS into the mandatory router**

Preserve the existing hook and local-node instructions. Add one short repository workflow section that requires every plan, implementation, diagnosis, review, and promotion task to read and follow `.agents/skills/metronome-workflow/SKILL.md` before work begins.

Do not duplicate the overlay contract in the router.

**Step 2: Write the minimal composing skill**

Use valid skill frontmatter (`name: metronome-workflow`, concise description). Its body owns Superpowers composition beginning with `superpowers:using-superpowers`, the Central Contract, role-reference routing, and final promotion through existing gates at exact `MSO-6`. It must not become a second workflow framework or ledger.

**Step 3: Check the two central files**

```powershell
rg -n "metronome-workflow|Superpowers Task|unexpected production LOC growth|Code Health decline|scope expansion|unplanned wrapper/public API|explicit user decision|executing-plans|subagent-driven-development" AGENTS.md .agents/skills/metronome-workflow/SKILL.md
```

Leave this partial state uncommitted.

### Task 4 [MSO-4]: Narrow Existing References to Pointers

**Files:** Modify `skills/metronome_planner.md`, `skills/metronome_coder.md`, `skills/metronome_reviewer.md`, `skills/metronome_chatgpt_review.md`, `docs/v1/implementation-slices/refactor/refactor-pipeline-planning-template.md`, and `docs/architecture/debt-gate-map.md`. Read only `docs/v1/status.json`.

**Step 1: Make role references thin**

Each role file starts with a mandatory pointer to the overlay, then retains only genuine role-specific material:

- planner: required packet, reuse search, no large implementation bodies, GPT-5.6 Sol standard, `PLAN_READY / PLAN_BLOCKED`;
- coder: approved plan identity/review packet, repo search, GPT-5.6 Terra/Luna standard, `CODE_READY / BLOCKED`;
- reviewer: review packet, correctness/debt checks, GPT-5.6 Terra/Luna standard, verdicts;
- ChatGPT review: plan/PR review packets and evidence checked, GPT-5.6 Terra/Luna standard, verdicts.

Delete repeated shared pause, stage, execution-mode, and promotion prose. Existing validator-required role markers must remain or be updated narrowly in `requiredContent`.

**Step 2: Keep the refactor template and debt map focused**

The refactor template points to the overlay and adds only the refactor-specific rule that plans do not prewrite large implementation bodies. The debt map adds one pointer explaining that workflow/model/pause/final-promotion policy lives in the overlay; keep its architecture and CodeScene content focused on debt gates.

Do not edit `docs/v1/status.json`; it is not a stage authority or workflow ledger.

**Step 3: Run the focused gate**

```powershell
& .\scripts\npm-local.ps1 --% run validate:debt-gates
```

Expected exit: `0`. Leave all Task 1-4 changes uncommitted until Task 5.

### Task 5 [MSO-5]: Run Existing Gates and Create the Implementation Commit

Verify all Task 1-4 files. `src/**`, `docs/v1/status.json`, `package.json`, and lockfiles must remain unchanged.

**Step 1: Audit scope and production LOC**

```powershell
git diff --name-only
git diff --stat
git diff --numstat -- 'src/**'
```

The final command must be empty. Any unexpected production LOC, scope expansion, or unplanned wrapper/public API activates the central hard pause before proceeding.

**Step 2: Run the existing pre-commit command set**

```powershell
& .\scripts\npm-local.ps1 --% run validate:debt-gates
& .\scripts\npm-local.ps1 --% run lint:debt:changed
& .\scripts\npm-local.ps1 --% run lint:xo:changed
& .\scripts\npm-local.ps1 --% run lint
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run test:unit
& .\scripts\npm-local.ps1 --% run build
```

All must exit `0`.

**Step 3: Run CodeScene once for final promotion evidence**

Call the verified interface with:

```text
mcp__codescene__analyze_change_set({
  "git_repository_path": "C:\\Users\\wsuto\\metronome",
  "base_ref": "origin/main"
})
```

Require no Code Health decline in `quality_gates`/`results[].verdict`. Missing or ambiguous evidence blocks promotion and activates the hard pause; do not substitute an invented API.

**Step 4: Commit only after every relevant gate is green**

```powershell
git add AGENTS.md .agents/skills/metronome-workflow/SKILL.md skills/metronome_planner.md skills/metronome_coder.md skills/metronome_reviewer.md skills/metronome_chatgpt_review.md docs/v1/implementation-slices/refactor/refactor-pipeline-planning-template.md docs/architecture/debt-gate-map.md scripts/validate-pr-debt-contract.mjs scripts/validate-pr-debt-contract.selftest.mjs scripts/validate-metronome-gates.mjs .github/pull_request_template.md
git diff --cached --name-only
git commit -m "Add minimal Metronome Superpowers overlay"
git status --short
```

Use normal hooks. Do not set PR stage `MSO-6` yet.

### Task 6 [MSO-6]: Run Minimal Fresh-Context R-01 Acceptance

Validate the candidate commit in a detached worktree, write evidence only under `C:\tmp\metronome-r01-evidence`, and modify no repository files. This proves observable conformance, not unobservable internal skill invocation.

**Step 1: Create a clean isolated validation worktree**

```powershell
$repo = 'C:\Users\wsuto\metronome'
$candidate = git -C $repo rev-parse HEAD
$worktree = 'C:\tmp\metronome-r01-worktree'
$evidence = 'C:\tmp\metronome-r01-evidence'
if (Test-Path $worktree) { throw 'R-01 BLOCKED: validation worktree path already exists' }
git -C $repo worktree add --detach $worktree $candidate
New-Item -ItemType Directory -Force -Path $evidence | Out-Null
```

**Step 2: Run one pinned, read-only, neutral fresh task**

The prompt must not name `AGENTS.md`, the repo-local skill, or their paths:

```powershell
$worktree = 'C:\tmp\metronome-r01-worktree'
$evidence = 'C:\tmp\metronome-r01-evidence'
$codex = 'C:\Users\wsuto\.codex\.sandbox-bin\codex.exe'
$before = git -C $worktree status --porcelain=v2 --untracked-files=all
if ($before) { throw 'R-01 BLOCKED: worktree is not Git-visible clean before acceptance' }
$prompt = @'
In this repository, locate and read the governing workflow, its composed execution guidance, and the approved implementation plan. Perform a read-only dry run for two cases: (A) a small cohesive change whose plan says PLAN_READY but has no matching independent plan-review PASS, and (B) the same task unexpectedly grows production LOC. Do not modify files. Return nine lines and no others, using these labels in order: PLAN, RESULT, TASK_IS_STAGE, MODE, CODER, PLAN_READY_ALONE, ON_PRODUCTION_LOC_GROWTH, RESUME, FINAL_PROMOTION_STAGE. Determine every value from the repository.
'@
& $codex exec --model gpt-5.6-terra --config 'model_reasoning_effort="medium"' --config 'service_tier="default"' --strict-config --ignore-user-config --sandbox read-only --ephemeral --cd $worktree --json --output-last-message "$evidence\r01-last.txt" $prompt |
  Tee-Object -FilePath "$evidence\r01-events.jsonl"
if ($LASTEXITCODE -ne 0) { throw 'R-01 BLOCKED: fresh task failed' }
$after = git -C $worktree status --porcelain=v2 --untracked-files=all
if ($after -ne $before -or $after) { throw 'R-01 BLOCKED: Git-visible tracked/untracked status changed' }
```

**Step 3: Require source-read command evidence using real JSONL fields**

Parse only completed `command_execution` items. For each required source, require exit code `0`, a read command containing the path, and `aggregated_output` containing its marker:

| Required source | Distinctive marker |
|---|---|
| root `AGENTS.md` | `metronome-workflow/SKILL.md` |
| `.agents/skills/metronome-workflow/SKILL.md` | `Superpowers Task is the Metronome Stage` |
| this plan | `Metronome Superpowers Overlay Implementation Plan` |
| Superpowers `using-superpowers/SKILL.md` | `name: using-superpowers` |
| Superpowers `executing-plans/SKILL.md` | `name: executing-plans` |

Run this inline assertion; do not move it into a reusable parser or schema:

```powershell
$evidence = 'C:\tmp\metronome-r01-evidence'
$commands = Get-Content "$evidence\r01-events.jsonl" | ForEach-Object {
  $event = $_ | ConvertFrom-Json
  if ($event.type -eq 'item.completed' -and $event.item.type -eq 'command_execution') { $event.item }
}
$reads = @(
  @('AGENTS\.md', 'metronome-workflow/SKILL.md'),
  @('metronome-workflow[\\/]SKILL\.md', 'Superpowers Task is the Metronome Stage'),
  @('2026-07-16-metronome-superpowers-overlay\.md', 'Metronome Superpowers Overlay Implementation Plan'),
  @('using-superpowers[\\/]SKILL\.md', 'name: using-superpowers'),
  @('executing-plans[\\/]SKILL\.md', 'name: executing-plans')
)
foreach ($read in $reads) {
  $hit = $commands | Where-Object { $_.exit_code -eq 0 -and $_.command -match '(Get-Content|rg|Select-String|type)' -and $_.command -match $read[0] -and $_.aggregated_output -match [regex]::Escape($read[1]) }
  if (-not $hit) { throw "R-01 BLOCKED: no command-read evidence for $($read[0])" }
}
```

A path mentioned only in final prose does not count. If the installed CLI cannot prove these reads through the verified fields, return `PLAN_BLOCKED` rather than infer them.

**Step 4: Require the exact behavioral result**

Run this exact trimmed equality assertion:

```powershell
$evidence = 'C:\tmp\metronome-r01-evidence'
$expected = @'
PLAN: docs/superpowers/plans/2026-07-16-metronome-superpowers-overlay.md
RESULT: PLAN_READY
TASK_IS_STAGE: YES
MODE: superpowers:executing-plans
CODER: GPT-5.6 Terra standard
PLAN_READY_ALONE: BLOCKED
ON_PRODUCTION_LOC_GROWTH: STOP_AND_INDEPENDENT_TERRA_OR_LUNA_DIAGNOSIS
RESUME: EXPLICIT_USER_DECISION
FINAL_PROMOTION_STAGE: MSO-6
'@
if ((Get-Content -Raw "$evidence\r01-last.txt").Trim() -ne $expected.Trim()) { throw 'R-01 BLOCKED: behavioral output mismatch' }
```

The fresh task prompt may specify these output labels but must not reveal the expected values. Any mismatch fails closed.

**Step 5: Promote only after R-01 passes**

Populate the existing PR evidence with the exact current plan identities, independent review PASS, final role verdicts, CodeScene no-decline result, and `Current metronome Stage: MSO-6`. Run `npm run validate:debt-gates` in PR context through existing CI.

If R-01 exposes a repair, stop and rerun the Task 0 pre-coding assertion before changing code. An unplanned repair or any plan edit requires a new plan-only commit/hash and fresh independent Task 0 review; after implementation edits, rerun Tasks 5 and 6.

Remove the detached validation worktree only after evidence is retained outside it:

```powershell
$repo = 'C:\Users\wsuto\metronome'
$worktree = 'C:\tmp\metronome-r01-worktree'
git -C $repo worktree remove $worktree
```

## Deliberate Repetition

Only these repeated blocks remain, each because it is an executable boundary:

- The seven overlay PR evidence labels appear in the PR template, validator, and self-test: producer, enforcement, and regression fixture must share the same literal contract.
- The plan path, exact `MSO-6`, and hard-pause markers recur at authority, enforcement, and verification boundaries so stale/wrong evidence fails; the full shared policy is not copied.
- Role model lines remain in the four role references because model eligibility is genuinely role-specific; shared model/pause/stage prose exists only in the overlay.
- R-01 output labels appear in its prompt contract and exact assertion because the fresh task must receive a format while the verifier checks values.
- Git-visible cleanliness is checked in Task 0 and Task 6 for different processes: independent plan review and isolated acceptance. No shared status protocol or helper is added.

**Self-review result:** The plan changes only workflow surfaces, permits no partial implementation commit, mechanically promotes only exact `MSO-6`, leaves intermediate checkpoints to the monitor, centralizes shared rules in one overlay, contains no lifecycle/status/attestation framework, and keeps R-01 pinned, read-only, Git-visible clean, command-observable, and fail-closed. Production-code diff remains `0 LOC`.
