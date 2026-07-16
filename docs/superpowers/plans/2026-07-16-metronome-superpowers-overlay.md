# Metronome Superpowers Overlay Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to execute this plan task by task.

**Goal:** Make the existing Metronome workflow durable in fresh Codex tasks by adding one mandatory router and one repo-local skill that compose the existing Superpowers plugin and existing debt gates.

**Architecture:** Root `AGENTS.md` routes every task to `.agents/skills/metronome-workflow/SKILL.md`. That skill is the single Metronome-wide workflow contract and composes Superpowers. Existing `skills/metronome_*.md` files remain role references, existing debt-gate validation remains the only promotion validator, and `docs/v1/status.json` remains untouched. No second framework, stage machine, status ledger, attestation framework, ignored-file manifest, or wrapper API is added.

**Tech Stack:** Markdown, Node.js ESM, existing Git/GitHub Actions gates, PowerShell, `codex-cli 0.144.5`, CodeScene MCP.

**Execution Mode:** `superpowers:executing-plans`, reusing one GPT-5.6 Terra standard coding agent. The change is small and cohesive across one workflow contract and its existing enforcement surfaces. `superpowers:subagent-driven-development` is reserved for a future plan whose tasks are large or independently reviewable.

**Estimated Production-Code Diff:** `0 LOC` under `src/**`. Expected changes are workflow docs, one repo skill, and the existing validator/self-test/PR template only.

**Plan Verdict:** `PLAN_READY` for a new plan-only commit and independent review. Commit `dc9015b9aaa62eeda5217669a15390d8dc993c5b` is superseded. Overlay coding remains blocked until Task 0 passes for the new commit and hashes.

## Verified Interfaces and Limits

- `codex-cli 0.144.5` was verified with `codex.exe --version`.
- `codex exec --help` verified `--model`, `--config`, `--strict-config`, `--ignore-user-config`, `--sandbox read-only`, `--sandbox workspace-write`, `--ephemeral`, `--cd`, `--json`, and `--output-last-message`.
- `codex debug models --bundled` verified `gpt-5.6-sol`, `gpt-5.6-terra`, and `gpt-5.6-luna` with medium reasoning available; standard launches here set `model_reasoning_effort="medium"` and `service_tier="default"`. Every nested planner or reviewer launch sets these explicitly and never inherits active user configuration.
- Task 0 retains the raw `codex exec --json` review trace but parses no lifecycle or discovery schema. The real R-01 trial uses the generated plan, Git identities, and independent review result instead of telemetry assertions.
- The following Superpowers sources were verified as files under `C:\Users\wsuto\.codex\.tmp\plugins\plugins\superpowers\skills`: `using-superpowers\SKILL.md`, `writing-plans\SKILL.md`, `executing-plans\SKILL.md`, and `subagent-driven-development\SKILL.md`. Task 0 rechecks them; a missing source is `PLAN_BLOCKED`.
- The available CodeScene schema verifies `mcp__codescene__analyze_change_set({git_repository_path, base_ref})` and its `quality_gates`/`results[].verdict` response. It is used once, at final promotion. If the target call cannot run or cannot prove no decline, promotion is blocked.
- Any newly claimed CLI flag, JSONL field, MCP field, gate entrypoint, or plugin path must first be proven by an actual target command or official schema. Otherwise stop with `PLAN_BLOCKED`; do not infer or simulate the interface.

**Threat model:** These controls prevent accidental model misrouting, stale plan evidence, Git-visible tracked/untracked mutations, and workflow drift under a non-malicious monitor. The exact CLI launch parameters are operational evidence, not cryptographic proof of model identity, freshness, or independence. A malicious monitor and ignored-file mutations are out of scope; cleanliness claims must say **Git-visible tracked/untracked cleanliness**, never full-worktree cleanliness.

## Central Contract

The implementation must place shared policy only in `.agents/skills/metronome-workflow/SKILL.md`; root `AGENTS.md` is the mandatory pointer to it.

1. A Superpowers Task is the Metronome Stage.
2. Plan agents, including the fresh R-01 trial planner, use GPT-5.6 Sol standard. Every coder, diagnosis agent, and reviewer uses GPT-5.6 Terra standard or GPT-5.6 Luna standard. Never use fast, and never route a non-plan role to Sol.
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
| `MSO-6` | Isolated real R-01 plan trial and independent plan review pass |

`MSO-0` through `MSO-5` are operational checkpoints recorded and advanced by the monitor under the stated threat model. They are not repository-level states, and the implementation must not add generic transition parsing or intermediate-stage evidence.

The existing PR validator mechanically accepts this overlay PR only at exact final stage `MSO-6`. For changes to `AGENTS.md` or `.agents/skills/metronome-workflow/SKILL.md`, it must require the exact overlay-plan identity and independent review PASS, the real R-01 trial identity and independent review PASS, R-01 coding still blocked for user decision, existing final role verdicts, and `Current metronome Stage: MSO-6`. `MSO-5`, an unknown heading, or a missing heading must fail. The monitor is the authorized promoter after all evidence exists; CI is the final mechanical check.

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
- R-01 trial identity:
- R-01 trial review policy:
- R-01 trial review verdict:
- R-01 coding authorization:
- Current metronome Stage:
```

Require:

- plan path exactly `docs/superpowers/plans/2026-07-16-metronome-superpowers-overlay.md`;
- declared commit is an ancestor of `HEAD`;
- declared blob equals both `<commit>:<planPath>` and the current tracked plan blob;
- declared SHA-256 equals the current plan file SHA-256;
- policy exactly `GPT-5.6 Terra standard` or `GPT-5.6 Luna standard`;
- independent verdict exactly `PLAN_REVIEW_PASS`;
- R-01 trial identity exactly `candidate=<40hex>; planCommit=<40hex>; blob=<40hex>; sha256=<64hex>`, with `candidate` equal to `HEAD`;
- R-01 trial review policy exactly `GPT-5.6 Terra standard` or `GPT-5.6 Luna standard`;
- R-01 trial review verdict exactly `PASS`;
- R-01 coding authorization exactly `BLOCKED_PENDING_USER_DECISION`;
- existing planner/coder/reviewer/ChatGPT final verdicts remain valid;
- stage exactly `MSO-6`.

The validator can prove the candidate is current and the evidence is complete; the monitor proves the isolated plan commit/blob/SHA relationship before promotion because that validation commit is intentionally not merged into the workflow PR. Do not accept arbitrary `MSO-*` headings or parse intermediate transitions.

**Step 3: Make the self-test executable and exact**

Extend `validBody` with valid overlay and R-01 evidence. Add negative cases for `MSO-5`, an unknown stage, missing overlay-plan PASS, stale overlay commit/blob/SHA-256, stale R-01 candidate, R-01 review `CHANGES_REQUIRED`, R-01 coding not blocked, and one positive `MSO-6` case.

Run:

```powershell
node scripts/validate-pr-debt-contract.selftest.mjs
```

Expected exit: `0`, ending with `validate-pr-debt-contract selftest passed.`

**Step 4: Gate presence without duplicating policy**

Update `scripts/validate-metronome-gates.mjs` to require the two overlay files and distinctive ownership markers only:

- root router contains `.agents/skills/metronome-workflow/SKILL.md`;
- overlay contains `Superpowers Task is the Metronome Stage`, all four hard-pause triggers, `explicit user decision`, `Never route diagnosis, fix, or review to GPT-5.6 Sol`, and both execution-mode skill names;
- validator/self-test/template contain the exact overlay and R-01 trial evidence labels and `MSO-6`.

Do not add another validator or a generic status protocol.

**Step 5: Add the final-promotion evidence lines to the existing PR template**

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

### Task 6 [MSO-6]: Run the Real Fresh-Context R-01 Planning Trial

Run the trial on a local validation branch rooted at the green overlay candidate. Its only repository change is the real durable R-01 plan; never merge or cherry-pick that validation commit into the overlay workflow PR.

**Step 1: Create the isolated clean validation branch**

```powershell
$repo = 'C:\Users\wsuto\metronome'
$candidate = git -C $repo rev-parse HEAD
$worktree = 'C:\tmp\metronome-r01-worktree'
$evidence = 'C:\tmp\metronome-r01-evidence'
$branch = "codex/r01-overlay-validation-$($candidate.Substring(0, 12))"
if (Test-Path $worktree) { throw 'R-01 PLAN_BLOCKED: validation worktree exists' }
git -C $repo show-ref --verify --quiet "refs/heads/$branch"
if ($LASTEXITCODE -eq 0) { throw 'R-01 PLAN_BLOCKED: validation branch exists' }
git -C $repo worktree add -b $branch $worktree $candidate
New-Item -ItemType Directory -Force -Path $evidence | Out-Null
if (git -C $worktree status --porcelain=v2 --untracked-files=all) { throw 'R-01 PLAN_BLOCKED: validation worktree is not Git-visible clean' }
```

**Step 2: Launch a brand-new empty-context Sol plan agent**

This is the acceptance trial, not product implementation. The fresh planner must be led by persistent repo routing to read root/overlay instructions, applicable Superpowers planning and execution-mode skills, and these authoritative R-01 sources:

- `docs/refactor/src-debt-forensics-2026-07-04/00-project-codescene-scan.md`
- `docs/refactor/src-debt-forensics-2026-07-04/01-sheet-practice-controls.md`
- `docs/refactor/src-debt-forensics-2026-07-04/99-remediation-plan.md`
- `docs/v1/implementation-slices/refactor/refactor-pipeline-planning-template.md`
- existing `docs/v1/implementation-slices/refactor/R-01-sheet-practice-controls.md`
- only the necessary debt-map, target, focused test, and directly relevant primitive files

The neutral prompt must not name `AGENTS.md`, the repo overlay, or Superpowers source paths:

```powershell
$worktree = 'C:\tmp\metronome-r01-worktree'
$evidence = 'C:\tmp\metronome-r01-evidence'
$codex = 'C:\Users\wsuto\.codex\.sandbox-bin\codex.exe'
$prompt = @'
Prepare the durable complete R-01 refactor implementation plan at the repository-prescribed path. Follow all persistent repository workflow and planning instructions. Locate and read the authoritative project scan, R-01 target forensics, remediation plan, refactor template, existing R-01 plan, and only the target/repo-map code needed to make exact decisions. Record the governing workflow and planning-skill sources actually read as planner-only evidence. Map every R-01 scan finding to an implementation stage or an explicit PLAN_BLOCKED item. For each stage, choose one-agent reuse or a fresh agent based on its size and independence. Include retired-surface deletion proof, allowed new surface, net-debt evidence, production-LOC and Code Health guards, and a mandatory user review stop before coding. The finding-coverage table alone may exceed the template line cap. Write only the R-01 plan; do not edit product code. Return exactly PLAN_READY or PLAN_BLOCKED.
'@
& $codex exec --model gpt-5.6-sol --config 'model_reasoning_effort="medium"' --config 'service_tier="default"' --strict-config --ignore-user-config --sandbox workspace-write --ephemeral --cd $worktree --output-last-message "$evidence\r01-plan-last.txt" $prompt
if ($LASTEXITCODE -ne 0 -or (Get-Content -Raw "$evidence\r01-plan-last.txt").Trim() -ne 'PLAN_READY') { throw 'R-01 PLAN_BLOCKED: fresh Sol plan agent did not return PLAN_READY' }
```

This is a new `codex exec`, not `resume`; `--ephemeral` and the neutral prompt provide empty conversation context. The explicit model, medium reasoning, default service tier, and ignored user config prevent Sol/fast or inherited active configuration drift.

**Step 3: Enforce plan-only scope and bind the artifact**

```powershell
$worktree = 'C:\tmp\metronome-r01-worktree'
$evidence = 'C:\tmp\metronome-r01-evidence'
$repo = 'C:\Users\wsuto\metronome'
$r01Plan = 'docs/v1/implementation-slices/refactor/R-01-sheet-practice-controls.md'
$candidate = git -C $repo rev-parse HEAD
if ((git -C $worktree rev-parse HEAD) -ne $candidate) { throw 'R-01 PLAN_BLOCKED: fresh planner created an unexpected commit' }
$changed = @(git -C $worktree status --porcelain=v1 --untracked-files=all)
$changedPaths = @($changed | ForEach-Object { $_.Substring(3).Trim('"') })
if ($changedPaths.Count -ne 1 -or $changedPaths[0] -ne $r01Plan) { throw 'R-01 PLAN_BLOCKED: fresh planner changed anything except the R-01 plan' }
if (git -C $worktree diff --name-only -- src) { throw 'R-01 PLAN_BLOCKED: product code changed' }
rg -n '^Verdict: `PLAN_READY`$' "$worktree\$r01Plan"
if ($LASTEXITCODE -ne 0) { throw 'R-01 PLAN_BLOCKED: durable plan verdict is not PLAN_READY' }
git -C $worktree add -- $r01Plan
$staged = @(git -C $worktree diff --cached --name-only)
if ($staged.Count -ne 1 -or $staged[0] -ne $r01Plan) { throw 'R-01 PLAN_BLOCKED: validation commit is not plan-only' }
git -C $worktree commit -m "Validate overlay with fresh R-01 plan"
if (git -C $worktree status --porcelain=v2 --untracked-files=all) { throw 'R-01 PLAN_BLOCKED: validation branch is not clean after commit' }
$candidate = git -C $worktree rev-parse HEAD^
$planCommit = git -C $worktree rev-parse HEAD
$planBlob = git -C $worktree rev-parse "HEAD:$r01Plan"
$planSha256 = (Get-FileHash -Algorithm SHA256 "$worktree\$r01Plan").Hash.ToLowerInvariant()
[ordered]@{candidate=$candidate; planCommit=$planCommit; blob=$planBlob; sha256=$planSha256} | ConvertTo-Json | Set-Content -Encoding utf8 "$evidence\r01-identity.json"
```

Use normal hooks for this plan-only validation commit. The commit parent binds the generated plan to the exact overlay candidate; the blob and SHA-256 bind its content.

**Step 4: Launch a fresh independent read-only Luna plan review**

```powershell
$worktree = 'C:\tmp\metronome-r01-worktree'
$evidence = 'C:\tmp\metronome-r01-evidence'
$codex = 'C:\Users\wsuto\.codex\.sandbox-bin\codex.exe'
$identity = Get-Content -Raw "$evidence\r01-identity.json" | ConvertFrom-Json
$beforeReview = git -C $worktree status --porcelain=v2 --untracked-files=all
if ($beforeReview) { throw 'R-01 PLAN_BLOCKED: review worktree is not Git-visible clean' }
$prompt = @"
Independently review the R-01 plan at commit $($identity.planCommit), blob $($identity.blob), SHA-256 $($identity.sha256), based on candidate $($identity.candidate). Read docs/refactor/src-debt-forensics-2026-07-04/00-project-codescene-scan.md, docs/refactor/src-debt-forensics-2026-07-04/01-sheet-practice-controls.md, docs/refactor/src-debt-forensics-2026-07-04/99-remediation-plan.md, docs/v1/implementation-slices/refactor/refactor-pipeline-planning-template.md, and docs/v1/implementation-slices/refactor/R-01-sheet-practice-controls.md. Check required router/overlay/Superpowers planner-read evidence, 100% target-finding coverage, stage feasibility, per-stage one-agent reuse versus fresh-agent strategy, deletion/new-surface/net-debt evidence, anti-wrapper and production-LOC guards, Code Health no-decline, no product coding, and the explicit user review stop before R-01 coding. Do not modify files. Return exactly PASS or CHANGES_REQUIRED.
"@
& $codex exec --model gpt-5.6-luna --config 'model_reasoning_effort="medium"' --config 'service_tier="default"' --strict-config --ignore-user-config --sandbox read-only --ephemeral --cd $worktree --output-last-message "$evidence\r01-review-last.txt" $prompt
if ($LASTEXITCODE -ne 0 -or (Get-Content -Raw "$evidence\r01-review-last.txt").Trim() -ne 'PASS') { throw 'R-01 PLAN_BLOCKED: independent plan review did not PASS' }
$afterReview = git -C $worktree status --porcelain=v2 --untracked-files=all
if ($afterReview -ne $beforeReview -or $afterReview) { throw 'R-01 PLAN_BLOCKED: read-only review changed Git-visible status' }
```

**Step 5: Promote the overlay workflow, not R-01 coding**

Populate the existing PR evidence with `R-01 trial identity: candidate=<candidate>; planCommit=<planCommit>; blob=<blob>; sha256=<sha256>`, `R-01 trial review policy: GPT-5.6 Luna standard`, `R-01 trial review verdict: PASS`, `R-01 coding authorization: BLOCKED_PENDING_USER_DECISION`, and `Current metronome Stage: MSO-6`. Run existing CI `npm run validate:debt-gates` in PR context.

Leave the validation branch/worktree available for explicit user review of the generated R-01 plan. Do not start R-01 coding until the user reviews that artifact and explicitly decides to proceed. If the trial changes the overlay plan or implementation, repeat Task 0 or Tasks 5-6 as applicable before promotion.

## Deliberate Repetition

Only these repeated blocks remain, each because it is an executable boundary:

- The overlay and four R-01 final-promotion evidence labels appear in the PR template, validator, and self-test: producer, enforcement, and regression fixture must share the same literal contract.
- The plan path, exact `MSO-6`, and hard-pause markers recur at authority, enforcement, and verification boundaries so stale/wrong evidence fails; the full shared policy is not copied.
- Role model lines remain in the four role references because model eligibility is genuinely role-specific; shared model/pause/stage prose exists only in the overlay.
- The R-01 source paths appear in the trial read set and reviewer prompt because planner and independent reviewer must use the same authoritative corpus.
- Git-visible cleanliness is checked in Task 0 and Task 6 for different processes: independent plan review and isolated acceptance. No shared status protocol or helper is added.

**Self-review result:** The plan changes only workflow surfaces, permits no partial overlay implementation commit, mechanically promotes only exact `MSO-6`, leaves intermediate checkpoints to the monitor, centralizes shared rules in one overlay, and contains no lifecycle/status/attestation framework. The real R-01 trial uses a fresh writable Sol planner for one plan-only artifact, a hashed validation commit, and a fresh read-only Luna PASS while product coding remains user-blocked. Production-code diff remains `0 LOC`.
