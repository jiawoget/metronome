# Metronome Superpowers Overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every fresh Codex task and empty-context subagent read and observably conform to the existing Superpowers workflow through one minimal, repo-local metronome overlay whose promotion artifacts are enforced by the current debt gates.

**Architecture:** Root `AGENTS.md` remains the mandatory router. It routes all repository work to one `.agents/skills/metronome-workflow/SKILL.md`, which composes the existing Superpowers skill sources and points to the existing `skills/metronome_*.md` hard-gate references; it does not duplicate those references or create a second framework. The tracked hashed plan is the sole Stage authority. The existing `validate:debt-gates` package, PR debt-contract validator, pre-commit hook, and CI remain the promotion mechanism, extended to require an independent Terra/Luna `PASS` for the exact plan SHA-256 before coding. `docs/v1/status.json` remains the product/slice status source of truth and is not extended into a workflow ledger.

**Tech Stack:** Markdown agent instructions, Codex repo-local skills, Node.js ESM validation/self-tests, Git/Git worktrees, existing npm gate scripts.

**Selected execution mode:** `superpowers:executing-plans` with one GPT-5.6 Terra standard coding agent. This is a small cohesive gate-control change whose files form one contract and whose tests must evolve in lockstep; fresh per-task implementation agents would add handoff risk without creating independent workstreams. The final R-01 acceptance uses a separate empty-context validation agent, not the coding agent.

**Estimated production-code diff:** `0 LOC` under `src/**`; approximately `+120/-15` lines of workflow/gate code in `scripts/**`; approximately `+210/-25` lines of Markdown/agent configuration. Hard pause if any `src/**` file changes or production LOC is non-zero.

**Plan verdict:** `PLAN_READY` for a new independent review; coding remains unauthorized until Stage `MSO-0` passes. Commit `643effca01d9e57088c0fe0eed9f438979f946e6` and its Luna review are superseded by this revision: create a new plan-only commit, recompute commit/blob/SHA-256, and obtain a fresh independent approval before any overlay work.

---

## Verified Interface Evidence

- Current-machine command `C:\Users\wsuto\.codex\.sandbox-bin\codex.exe --version` exits `0` with `codex-cli 0.144.5`. The same installed binary's `exec --help` exits `0` and verifies these exact options used below: `--model <MODEL>`, `--config <key=value>` with TOML parsing, `--strict-config`, `--sandbox read-only`, `--ephemeral`, `--ignore-user-config`, `--cd <DIR>`, and `--json`.
- Current-machine command `C:\Users\wsuto\.codex\.sandbox-bin\codex.exe debug models --bundled` exits `0`. Parsing its JSON verifies model slugs `gpt-5.6-terra` and `gpt-5.6-luna`; each has `default_reasoning_level: medium`, Terra supports `low,medium,high,xhigh,max,ultra`, and Luna supports `low,medium,high,xhigh,max`. The installed user config currently declares `model = "gpt-5.6-sol"`, `model_reasoning_effort = "low"`, and `service_tier = "default"`, so every nested launch below uses `--ignore-user-config` and explicitly supplies the non-Sol model, `model_reasoning_effort="medium"`, and non-fast `service_tier="default"`.
- A target-environment option probe using `exec --ignore-user-config --strict-config --model gpt-5.6-terra --config 'model_reasoning_effort="medium"' --config 'service_tier="default"' --sandbox read-only --ephemeral --json ...` passed CLI/config parsing and emitted `thread.started` plus `turn.started`; sampling then failed closed with `401 Unauthorized`. This proves the installed option/config syntax, not target-task authentication or successful acceptance; Tasks 0 and 6 still require exit `0` in their execution environment.
- The independent re-review and installed runtime confirm the CLI emits `thread.started`, `turn.started`, `item.started`, `item.completed`, and `turn.completed`; there are no instruction- or skill-discovery/invocation events.
- OpenAI's [Codex `exec_events.rs` schema](https://github.com/openai/codex/blob/main/codex-rs/exec/src/exec_events.rs) and [published `codex exec --json` event example](https://github.com/openai/codex/issues/5133) verify the real JSONL shape used below: top-level lifecycle `type`; `item.completed`; and `item.type = command_execution` with `command`, `aggregated_output`, `exit_code`, and `status`. They also show `item.type = agent_message` with `text` and `turn.completed`.
- Current-machine commands `codex plugin list --help` and `codex plugin list` verify the plugin-list interface. In this sandbox identity the latter reports `superpowers@openai-curated` as `not installed`, while `Test-Path` and frontmatter reads succeed for the existing cached `using-superpowers`, `writing-plans`, `executing-plans`, and `subagent-driven-development` `SKILL.md` sources under `C:\Users\wsuto\.codex\.tmp\plugins\plugins\superpowers\skills\`. Therefore this plan does not use marketplace status or JSONL as proof of plugin invocation: Stage `MSO-0` proves required source availability, and Stage `MSO-6` requires observable source reads plus behavioral conformance in the actual fresh task. Missing access is `PLAN_BLOCKED`.
- The target session's CodeScene MCP tool schema verifies the retained exact interface `mcp__codescene__analyze_change_set({git_repository_path: string, base_ref: string})`, returning `quality_gates` and per-file `results[].verdict` values including `degraded`. Stage `MSO-5` uses only that schema; if the tool is absent, errors, or returns an unparseable result, promotion is `PLAN_BLOCKED`.
- No plan step may claim a CLI/API/event/gate field beyond this evidence without first running the actual command in the target environment or citing its official schema. If neither proof exists, verdict is `PLAN_BLOCKED`, not an inferred interface.

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `AGENTS.md` | Modify | Mandatory, short router for fresh tasks and subagents; retain pre-commit fallback instructions. |
| `.agents/skills/metronome-workflow/SKILL.md` | Create | The only repo-local composing skill; map Superpowers Task to metronome Stage, choose execution mode, enforce model policy and hard pauses, and route to focused metronome references. |
| `skills/metronome_planner.md` | Modify | Keep planner-specific evidence/output rules; replace parallel orchestration prose with a pointer to the composing skill and encode plan-agent-only Sol policy. |
| `skills/metronome_coder.md` | Modify | Keep coding hard gate; point orchestration/model/stop behavior to the composing skill. |
| `skills/metronome_reviewer.md` | Modify | Keep independent review hard gate; point orchestration/model/stop behavior to the composing skill. |
| `skills/metronome_chatgpt_review.md` | Modify | Keep external review packets/verdicts; point orchestration/model policy to the composing skill. |
| `docs/v1/implementation-slices/refactor/refactor-pipeline-planning-template.md` | Modify | Prevent large prewritten implementation bodies and require overlay hard-pause language in refactor handoffs. |
| `docs/architecture/debt-gate-map.md` | Modify | Register `AGENTS.md` and `.agents/skills/**` as gate-control surfaces and document the single-router/single-overlay boundary. |
| `scripts/validate-metronome-gates.mjs` | Modify | Fail closed when router, overlay skill, model policy, execution choice, hard pauses, or promotion contract are absent. |
| `scripts/validate-pr-debt-contract.mjs` | Modify | Treat `AGENTS.md` and `.agents/skills/**` as gate-control changes and reject PR evidence unless the declared review points to an ancestor plan-only commit whose content/hash and current Stage heading still match. |
| `scripts/validate-pr-debt-contract.selftest.mjs` | Modify | Prove the new gate-control patterns trigger evidence and that missing, Sol, fast, stale-hash, unbound-Stage, and non-PASS plan reviews fail closed. |
| `.github/pull_request_template.md` | Modify | Carry reviewer policy, plan-review verdict, plan commit/path/SHA-256, and current Stage in the existing `Agent Gate Evidence` artifact. |
| `docs/v1/status.json` | Read only | Preserve schema version and current product/slice statuses; do not add a workflow pack, Stage ledger, or promotion state. |

## Contract Boundaries

- Superpowers Task means metronome Stage. Do not create a second Stage/Task hierarchy.
- The overlay may require existing Superpowers skills by name, but must not copy plugin bodies into the repository; availability is proven by source reads, not inferred marketplace status.
- `skills/metronome_*.md` remain role-specific references, not discoverable peer workflow frameworks.
- Plan agents use GPT-5.6 Sol standard. Every coder, reviewer, verification, acceptance, and other subagent uses GPT-5.6 Terra standard or GPT-5.6 Luna standard. No agent uses fast; no non-plan agent uses Sol.
- Every nested fresh `codex exec` reviewer or acceptance launch must use `--ignore-user-config --strict-config`, explicitly select `--model gpt-5.6-terra` or `--model gpt-5.6-luna`, set `--config 'model_reasoning_effort="medium"' --config 'service_tier="default"'`, and set `--sandbox read-only`. Capture `git status --porcelain=v2 --untracked-files=all` for Git-visible tracked/untracked cleanliness immediately before and after; any non-clean status, difference, launch failure, or status-capture failure is `PLAN_BLOCKED`. This does not detect ignored-file writes.
- Small cohesive work selects `superpowers:executing-plans` and reuses one coding agent. Large work with independently reviewable Tasks selects `superpowers:subagent-driven-development` and uses fresh implementation agents.
- `PLAN_READY` is necessary but insufficient for coding. Before any overlay coding or later R-01 coding, an independent GPT-5.6 Terra standard or GPT-5.6 Luna standard plan reviewer, never fast and never Sol, must return exact `PASS` for the current plan path and SHA-256.
- Promotion artifacts remain the durable plan file, its exact SHA-256, independent plan-review model/verdict, exact agent verdicts, PR debt evidence, review evidence, and green existing gates. `docs/v1/status.json` is not a workflow ledger.
- Exact hard-pause contract for every router/overlay/role reference: `unexpected production LOC growth, Code Health decline, scope expansion, or unplanned wrapper/public API => stop; launch independent GPT-5.6 Terra standard or GPT-5.6 Luna standard diagnosis; resume only after explicit user decision. Never route diagnosis, fix, or review to GPT-5.6 Sol.`
- General plan rule: `Every claimed CLI/API/event/gate interface must be verified by an actual command in the target environment or an official schema before PLAN_READY; otherwise PLAN_BLOCKED.`

## Threat Model and Evidence Limits

- In scope: accidental misrouting, stale plan/review evidence, skipped promotion preconditions, workflow drift, and Git-visible tracked/untracked mutations by review or acceptance tasks.
- Out of scope: a malicious monitor that lies about the exact command it launched, forges external evidence, or deliberately restores/hides mutations; cryptographic model/independence attestation; and ignored-file mutation detection. Do not add an ignored-file manifest, cryptographic attestation system, or broader ledger for those threats.
- Operational evidence for model, reasoning, service tier, freshness, independence, and read-only mode is the monitor-owned explicit CLI launch shown in this plan plus its exit/status/JSONL artifacts. JSONL proves only the documented events and command executions it contains. A malicious monitor is outside this workflow's trust model.
- Internal skill discovery or invocation is not observable in Codex CLI 0.144.5. R-01 may prove only actual file reads and observable conformance to the router/overlay/Superpowers contract; it must never relabel those facts as invocation telemetry.

## Stage Authority

The tracked plan at the approved `planCommit`/`planSha256` is the sole metronome Stage authority for this change. Its Task headings define Stage IDs; `docs/v1/status.json`, PR comments, and external evidence do not define stages. The only legal path is linear: `MSO-0 -> MSO-1 -> MSO-2 -> MSO-3 -> MSO-4 -> MSO-5 -> MSO-6`. No skip or backward promotion is legal; a failed check stays in the current Stage, and a hard pause stops promotion until explicit user direction.

| Stage | Plan Task | Legal entry | Promotion precondition |
|---|---|---|---|
| `MSO-0` | Task 0 | This revised plan is the only Git-visible tracked/untracked change | New plan-only commit; new blob/SHA-256; required Superpowers sources readable; independent Luna review exact `PASS`; Git-visible status unchanged |
| `MSO-1` | Task 1 | `approval.json.authorizedStage = MSO-1` from `MSO-0` | Both new gate-control fixtures exist; the first exact RED assertion fails for the documented reason; RED remains uncommitted |
| `MSO-2` | Task 2 | `MSO-1` RED evidence | Focused self-test passes; package gate fails only for planned router/reference content; partial state remains uncommitted |
| `MSO-3` | Task 3 | `MSO-2` evidence | Router/overlay checks pass; only planned role/template checks may remain red; partial state remains uncommitted |
| `MSO-4` | Task 4 | `MSO-3` evidence | Package validator and self-test pass; no product/status/package surface changed; implementation remains uncommitted |
| `MSO-5` | Task 5 | `MSO-4` evidence | Full hook command set passes; implementation commit succeeds with hooks; verified CodeScene result passes with no `degraded` file; scope audit passes |
| `MSO-6` | Task 6 | Clean committed `MSO-5` candidate | Fresh-context observable-conformance acceptance passes with Git-visible status unchanged; final existing PR evidence says `Current metronome Stage: MSO-6` |

Only the monitor is authorized to promote. It does so after checking the current row's precondition and emits `CURRENT_STAGE: MSO-N` in the existing execution/task trace; this is operational evidence, not a new file or ledger. Before coding, the existing `approval.json` binds `authorizedPromoter: monitor` and `authorizedStage: MSO-1` to the approved plan commit/hash. At final promotion, the existing PR body binds `Current metronome Stage: MSO-6` to the same plan commit/path/hash, and the existing validator enforces that exact value.

### Task 0 [MSO-0]: Bootstrap the Tracked Plan and Prove Independent Approval

**Files:**
- Commit only: `docs/superpowers/plans/2026-07-16-metronome-superpowers-overlay.md`
- Evidence outside repository: `C:\tmp\metronome-superpowers-plan-review\`

- [ ] **Step 1: Create the plan-only tracked commit with normal hooks**

This plan is already tracked and this review revision invalidates its prior approval. Before any overlay edit, confirm the plan is the only uncommitted file, then create a new plan-only commit through normal hooks; do not amend or reuse the earlier plan commit:

```powershell
git status --short
git add docs/superpowers/plans/2026-07-16-metronome-superpowers-overlay.md
git commit -m "docs: plan metronome Superpowers overlay"
```

Expected: the existing pre-commit hook runs normally and the new commit succeeds without `--no-verify`; afterward `git status --short` is empty. If unrelated Git-visible work is present, do not stage, revert, or hide it; the review bootstrap is `PLAN_BLOCKED` until the user supplies clean Git-visible status. If a normal hook fails, keep the plan uncommitted and resolve the plan/bootstrap failure before review.

- [ ] **Step 2: Bind review inputs to the clean plan commit and file hash**

Run:

```powershell
New-Item -ItemType Directory -Force C:\tmp\metronome-superpowers-plan-review
git rev-parse HEAD
git rev-parse HEAD:docs/superpowers/plans/2026-07-16-metronome-superpowers-overlay.md
Get-FileHash -Algorithm SHA256 docs\superpowers\plans\2026-07-16-metronome-superpowers-overlay.md
```

Record the new full plan commit SHA, Git blob ID, and lowercase file SHA-256; none may reuse commit `643effca01d9e57088c0fe0eed9f438979f946e6` or its review values. Require `git status --porcelain=v2 --untracked-files=all` to be empty and `git diff --exit-code HEAD -- .` to pass. Verify the existing Superpowers sources with the actual target paths already proven on this machine:

```powershell
$superpowersRoot = 'C:\Users\wsuto\.codex\.tmp\plugins\plugins\superpowers\skills'
$requiredSuperpowersSkills = @(
	"$superpowersRoot\using-superpowers\SKILL.md",
	"$superpowersRoot\writing-plans\SKILL.md",
	"$superpowersRoot\executing-plans\SKILL.md",
	"$superpowersRoot\subagent-driven-development\SKILL.md"
)
foreach ($skillPath in $requiredSuperpowersSkills) {
	if (-not (Test-Path -LiteralPath $skillPath -PathType Leaf)) { throw "PLAN_BLOCKED: missing Superpowers source $skillPath" }
	if ((Get-Content -Raw -LiteralPath $skillPath) -notmatch '(?m)^name:\s*(using-superpowers|writing-plans|executing-plans|subagent-driven-development)\s*$') { throw "PLAN_BLOCKED: invalid Superpowers source $skillPath" }
}
```

These checks prove the coordinator can read the required existing skill sources. They do not prove internal invocation by a later fresh task; Stage `MSO-6` separately requires target-task reads and observable conformance.

- [ ] **Step 3: Obtain the real independent review artifact and JSONL trace**

The monitor directly runs the explicit CLI command below as a fresh independent plan-review process. This plan fixes that reviewer to GPT-5.6 Luna standard: installed slug `gpt-5.6-luna`, installed default reasoning effort `medium`, and non-fast `service_tier="default"`. The launch ignores the active Sol/low user config, uses the installed read-only sandbox, and captures Git-visible tracked/untracked repository status before and after:

```powershell
$ErrorActionPreference = 'Stop'
$codex = 'C:\Users\wsuto\.codex\.sandbox-bin\codex.exe'
$repo = 'C:\Users\wsuto\metronome'
$evidenceDir = 'C:\tmp\metronome-superpowers-plan-review'
New-Item -ItemType Directory -Force $evidenceDir
$statusBefore = @(git -C $repo status --porcelain=v2 --untracked-files=all)
$statusBeforeExit = $LASTEXITCODE
Set-Content -LiteralPath "$evidenceDir\worktree-status-before.txt" -Value ([string]::Join("`n", $statusBefore))
if ($statusBeforeExit -ne 0 -or $statusBefore.Count -ne 0) { throw 'PLAN_BLOCKED: review Git-visible status was not clean before launch' }
& $codex exec --ignore-user-config --strict-config --model gpt-5.6-luna --config 'model_reasoning_effort="medium"' --config 'service_tier="default"' --sandbox read-only --ephemeral --cd $repo --json "Independent plan review only; read-only and do not edit files. Independently run git rev-parse HEAD, git rev-parse HEAD:docs/superpowers/plans/2026-07-16-metronome-superpowers-overlay.md, Get-FileHash -Algorithm SHA256 on docs/superpowers/plans/2026-07-16-metronome-superpowers-overlay.md, and read the complete plan. Review feasibility and internal consistency. End with exactly PLAN_REVIEW_PASS or PLAN_REVIEW_CHANGES_REQUIRED." | Tee-Object -FilePath "$evidenceDir\review-events.jsonl"
$reviewExit = $LASTEXITCODE
$statusAfter = @(git -C $repo status --porcelain=v2 --untracked-files=all)
$statusAfterExit = $LASTEXITCODE
Set-Content -LiteralPath "$evidenceDir\worktree-status-after.txt" -Value ([string]::Join("`n", $statusAfter))
if ($statusAfterExit -ne 0 -or [string]::Join("`n", $statusAfter) -cne [string]::Join("`n", $statusBefore)) { throw 'PLAN_BLOCKED: independent review changed Git-visible status or status capture failed' }
if ($reviewExit -ne 0) { throw 'PLAN_BLOCKED: independent review process failed' }
```

Under the stated threat model, the monitor-owned explicit command is the operational evidence for model/reasoning/service-tier/freshness/independence/read-only launch parameters; Codex CLI 0.144.5 JSONL does not cryptographically expose them. The two external status files capture Git-visible tracked/untracked state only, and their exact equality plus initial cleanliness is mandatory. They do not cover ignored files. The trace must show the reviewer independently ran the requested commands. Its final message is exactly `PLAN_REVIEW_PASS` or `PLAN_REVIEW_CHANGES_REQUIRED`.

Save the task's raw JSONL and the two Git-visible status snapshots under `C:\tmp\metronome-superpowers-plan-review\`. Save a small monitor-produced `approval.json` containing only: `planCommit`, `planBlob`, `planSha256`, `planPath`, `reviewThreadId`, `requestedReviewerPolicy`, `freshIndependentLaunchGuaranteedByMonitor`, `authorizedPromoter`, `authorizedStage`, and `verdict`. Set `requestedReviewerPolicy` to `GPT-5.6 Luna standard`, `authorizedPromoter` to `monitor`, and `authorizedStage` to `MSO-1`. The monitor copies `reviewThreadId` from the trace's real `thread.started.thread_id`; it does not invent an attestation signature.

- [ ] **Step 4: Run the executable pre-coding approval assertion**

Use inline PowerShell only; do not add an attestation script or framework. Parse `approval.json` and each JSONL line with `ConvertFrom-Json`. Assert all mechanically provable facts:

```powershell
$ErrorActionPreference = 'Stop'
$planPath = 'docs/superpowers/plans/2026-07-16-metronome-superpowers-overlay.md'
$approval = Get-Content -Raw C:\tmp\metronome-superpowers-plan-review\approval.json | ConvertFrom-Json
$events = @(Get-Content C:\tmp\metronome-superpowers-plan-review\review-events.jsonl | ForEach-Object { $_ | ConvertFrom-Json })
$statusBefore = (Get-Content -Raw C:\tmp\metronome-superpowers-plan-review\worktree-status-before.txt).TrimEnd("`r", "`n")
$statusAfter = (Get-Content -Raw C:\tmp\metronome-superpowers-plan-review\worktree-status-after.txt).TrimEnd("`r", "`n")
$head = (git rev-parse HEAD).Trim()
$blob = (git rev-parse "HEAD:$planPath").Trim()
$planContent = Get-Content -Raw $planPath
$sha256 = (Get-FileHash -Algorithm SHA256 $planPath).Hash.ToLowerInvariant()
$currentStatus = @(git status --porcelain=v2 --untracked-files=all)
$currentStatusExit = $LASTEXITCODE
$thread = @($events | Where-Object { $_.type -eq 'thread.started' -and $_.thread_id -eq $approval.reviewThreadId })
$commands = @($events | Where-Object { $_.type -eq 'item.completed' -and $_.item.type -eq 'command_execution' -and $_.item.status -eq 'completed' -and $_.item.exit_code -eq 0 })
$commitChecks = @($commands | Where-Object { $_.item.command -match 'git rev-parse HEAD' -and $_.item.aggregated_output -match ([regex]::Escape($approval.planCommit)) })
$blobChecks = @($commands | Where-Object { $_.item.command -match 'git rev-parse HEAD:docs/superpowers/plans/2026-07-16-metronome-superpowers-overlay\.md' -and $_.item.aggregated_output -match ([regex]::Escape($approval.planBlob)) })
$hashChecks = @($commands | Where-Object { $_.item.command -match 'Get-FileHash.+2026-07-16-metronome-superpowers-overlay\.md' -and $_.item.aggregated_output -match ([regex]::Escape($approval.planSha256)) })
$reads = @($commands | Where-Object { $_.item.command -match '2026-07-16-metronome-superpowers-overlay\.md' -and $_.item.aggregated_output -match 'Metronome Superpowers Overlay Implementation Plan' })
$verdicts = @($events | Where-Object { $_.type -eq 'item.completed' -and $_.item.type -eq 'agent_message' -and $_.item.text -match '(?m)^PLAN_REVIEW_PASS$' })
if ($approval.planPath -ne $planPath -or $approval.planCommit -ne $head -or $approval.planBlob -ne $blob -or $approval.planSha256 -ne $sha256 -or $approval.verdict -ne 'PASS' -or $approval.requestedReviewerPolicy -ne 'GPT-5.6 Luna standard' -or $approval.freshIndependentLaunchGuaranteedByMonitor -ne $true -or $approval.authorizedPromoter -ne 'monitor' -or $approval.authorizedStage -ne 'MSO-1' -or $planContent -notmatch '(?m)^### Task 1 \[MSO-1\]:' -or -not [string]::IsNullOrEmpty($statusBefore) -or -not [string]::IsNullOrEmpty($statusAfter) -or $statusAfter -cne $statusBefore -or $currentStatusExit -ne 0 -or $currentStatus.Count -ne 0 -or $thread.Count -ne 1 -or $commitChecks.Count -lt 1 -or $blobChecks.Count -lt 1 -or $hashChecks.Count -lt 1 -or $reads.Count -lt 1 -or $verdicts.Count -ne 1) { throw 'PLAN_BLOCKED: independent plan approval missing, stale, Git-visible status changed, or unproven' }
git diff --exit-code HEAD -- .
```

This assertion proves the clean tracked commit/blob/hash, matching clean Git-visible status snapshots, current Git-visible cleanliness, real trace/thread, successful command read of that plan, exact reviewer result, authorized next Stage/promoter, and consistency of the monitor artifact. Model, reasoning, service tier, read-only sandbox, freshness, and independence remain operational monitor guarantees under the explicit threat model; JSONL is not claimed as cryptographic proof. Any failure blocks Stage `MSO-1`.

- [ ] **Step 5: Repeat bootstrap after every plan change**

If this plan changes after approval, stop. Create a new plan-only commit through normal hooks, regenerate commit/blob/SHA-256, launch a new independent Terra/Luna standard review with the same explicit config/sandbox/status protocol, replace all external review evidence, and rerun Step 4. Never reuse approval for an older plan commit or hash. This revision therefore requires a new plan-only commit and complete repeat review before Stage `MSO-1`. Apply the same sequence before every later R-01 coding Stage.

### Task 1 [MSO-1]: RED - Extend Gate Self-Tests for Overlay Control Files

**Files:**
- Modify: `scripts/validate-pr-debt-contract.selftest.mjs`
- Test: `scripts/validate-pr-debt-contract.selftest.mjs`

- [ ] **Step 1: Add test fixtures for the two new gate-control surfaces**

Add helpers beside the existing `commitPackageManifestChange` fixture:

```js
function commitRootRouterChange(cwd) {
	write(cwd, 'AGENTS.md', '# Repository router\n');
	git(cwd, ['add', 'AGENTS.md']);
	git(cwd, ['commit', '-m', 'change repository router']);
}

function commitOverlaySkillChange(cwd) {
	write(cwd, '.agents/skills/metronome-workflow/SKILL.md', '---\nname: metronome-workflow\ndescription: Use when working in metronome.\n---\n');
	git(cwd, ['add', '.agents/skills/metronome-workflow/SKILL.md']);
	git(cwd, ['commit', '-m', 'change workflow overlay']);
}
```

Import `createHash` from `node:crypto`. Define `reviewedPlanPath`, exact `reviewedPlanContent = '# Test Plan\n\n### Task 6 [MSO-6]: Acceptance\n'`, and `reviewedPlanSha256 = createHash('sha256').update(reviewedPlanContent).digest('hex')`; have `createRepo()` write `reviewedPlanContent` to `reviewedPlanPath` before its base commit. Replace static `validBody` with `createValidBody(cwd)`, using `git(cwd, ['rev-parse', 'main'])` as the plan-only commit. This gives every self-test repository a real ancestor plan commit whose current content/hash and Stage heading the validator can verify.

- [ ] **Step 2: Add exact empty-body RED assertions and one valid-body pass for each fixture**

Use the existing `runGate(cwd, body)` helper. Add the root-router block first, then the overlay block, with these exact assertions so the pre-implementation failure is deterministic:

```js
{
	const cwd = createRepo();
	commitRootRouterChange(cwd);
	const result = runGate(cwd, '');
	assert.equal(result.status, 1, 'AGENTS.md change must require debt contract evidence');
	assert.match(result.stderr, /Pull request body is empty/v);
}

{
	const cwd = createRepo();
	commitOverlaySkillChange(cwd);
	const result = runGate(cwd, '');
	assert.equal(result.status, 1, 'overlay skill change must require debt contract evidence');
	assert.match(result.stderr, /Pull request body is empty/v);
}
```

For each fixture, also run `createValidBody(cwd)` and require exit `0` with `PR debt contract evidence sections are present and specific` after Stage `MSO-2` implements the matcher/evidence contract.

Have `createValidBody(cwd)` emit this exact evidence shape:

```text
- Monitor-guaranteed plan reviewer policy: GPT-5.6 Terra standard
- Independent plan review verdict: PASS
- Independent plan review plan commit: ${git(cwd, ['rev-parse', 'main'])}
- Independent plan review plan path: docs/superpowers/plans/2026-07-16-metronome-superpowers-overlay.md
- Independent plan review plan SHA-256: ${reviewedPlanSha256}
- Current metronome Stage: MSO-6
```

Add negative cases that independently replace those lines with `GPT-5.6 Sol standard`, `GPT-5.6 Terra fast`, `CHANGES_REQUIRED`, a non-ancestor commit, an empty plan path, `stale-hash`, and `MSO-5`; also remove the Stage line once. Each must exit `1` with the matching independent-plan-review error or exact `Current metronome Stage must identify a Stage heading in the approved plan`. Add one Luna standard declared-policy positive case. Name tests and messages accurately: the validator proves commit/path/hash/verdict/current-stage consistency and validates the monitor declaration's allowed value; it does not prove actual model or independence.

- [ ] **Step 3: Run the self-test and verify RED**

Run:

```powershell
& .\scripts\npm-local.ps1 --% run validate:debt-contract:selftest
```

Expected: FAIL because `AGENTS.md` and `.agents/skills/**` are not yet matched by `gateControlFilePatterns`.

Expected exact first failure: command exits `1`; Node reports `AssertionError [ERR_ASSERTION]: AGENTS.md change must require debt contract evidence` and the comparison `0 !== 1`. The actual gate returns status `0` before the matcher exists, so the subsequent stderr assertion is not the RED discriminator. If the first failure differs, stop and correct the fixture/expectation before Stage `MSO-2`.

- [ ] **Step 4: Keep the RED tests uncommitted**

Run `git status --short` and confirm only the planned Task 1 test change is present; the plan is already tracked and clean from Task 0. Do not stage or commit: the pre-commit hook runs `validate:debt-gates`, and `AGENTS.md` forbids `--no-verify`. The first overlay implementation commit is Task 5 after every hook command is green.

### Task 2 [MSO-2]: GREEN - Make Existing Debt Gates Own the Overlay

**Files:**
- Modify: `scripts/validate-pr-debt-contract.mjs`
- Modify: `scripts/validate-metronome-gates.mjs`
- Modify: `docs/architecture/debt-gate-map.md`
- Modify: `.github/pull_request_template.md`
- Test: `scripts/validate-pr-debt-contract.selftest.mjs`

- [ ] **Step 1: Expand the existing gate-control matcher**

Add these patterns to `gateControlFilePatterns` in `scripts/validate-pr-debt-contract.mjs`:

```js
/^AGENTS\.md$/v,
/^\.agents\/skills\//v,
```

Do not add another validator or package script.

- [ ] **Step 2: Enforce independent plan-review evidence in the existing validator**

In `scripts/validate-pr-debt-contract.mjs`, extend `validateAgentGateEvidence` using the existing `valueAfterColon`/`normalizeCell` helpers. Accept only:

```js
const allowedMonitorGuaranteedPlanReviewerPolicies = new Set([
	'GPT-5.6 Terra standard',
	'GPT-5.6 Luna standard',
]);
const gitObjectIdPattern = /^(?:[\da-f]{40}|[\da-f]{64})$/v;
const planSha256Pattern = /^[\da-f]{64}$/v;
```

Require six labels: `Monitor-guaranteed plan reviewer policy`, `Independent plan review verdict`, `Independent plan review plan commit`, `Independent plan review plan path`, `Independent plan review plan SHA-256`, and `Current metronome Stage`. The declared policy must be in the allowed set, verdict must equal `PASS`, and current Stage must be non-empty. The commit must match `gitObjectIdPattern`, resolve, and be an ancestor of `HEAD`. The normalized path must identify an existing Markdown plan under `docs/superpowers/plans/`, `docs/v1/implementation-slices/plans/`, or `docs/v1/implementation-slices/refactor/`. Use `runGit(['show', `${planCommit}:${planPath}`])` plus Node `createHash('sha256')`; require its digest, the current file digest, and the 64-hex evidence value all to match. Add only this small heading check, not a transition parser:

```js
function hasStageHeading(planContent, stage) {
	return planContent
		.split(/\r?\n/v)
		.some(line => line.startsWith('### Task ') && line.includes(`[${stage}]:`));
}
```

Require `hasStageHeading(approvedPlanContent, currentStage)` and `hasStageHeading(currentPlanContent, currentStage)`. Reject Sol/fast declarations, missing/pathless evidence, non-ancestor commits, malformed/stale/mismatched hashes, every verdict except exact `PASS`, and a missing/unbound Stage. For this plan the only final bound value is `MSO-6`. State in code comments/errors that the hashed plan defines Stage authority and that this verifies monitor-declared evidence shape, not cryptographic model/independence. Do not add a transition parser or ledger, and do not weaken existing planner/coder/reviewer/ChatGPT checks.

Add the same six blank labels to `.github/pull_request_template.md` under `Agent Gate Evidence`; this extends the existing promotion artifact rather than creating a new ledger.

- [ ] **Step 3: Register router and overlay artifacts in the package-presence gate**

Add `AGENTS.md` and `.agents/skills/metronome-workflow/SKILL.md` to `required` in `scripts/validate-metronome-gates.mjs`. Add exact `requiredContent` snippets that prove:

```text
AGENTS.md: metronome-workflow, mandatory router, PLAN_READY is necessary but insufficient for coding, independent plan review, explicit user decision, Never route diagnosis, fix, or review to GPT-5.6 Sol
.agents/skills/metronome-workflow/SKILL.md: superpowers:using-superpowers, superpowers:writing-plans, Superpowers Task is the metronome Stage, superpowers:executing-plans, superpowers:subagent-driven-development, GPT-5.6 Sol standard, GPT-5.6 Terra standard, GPT-5.6 Luna standard, never fast, PLAN_READY is necessary but insufficient for coding, independent plan review, unexpected production LOC growth, Code Health decline, scope expansion, unplanned wrapper/public API, independent GPT-5.6 Terra standard or GPT-5.6 Luna standard diagnosis, explicit user decision, Never route diagnosis, fix, or review to GPT-5.6 Sol, PLAN_READY, CODE_READY
```

Add the exact full hard-pause sentence from `Contract Boundaries` to `requiredContent` for `AGENTS.md`, the overlay skill, all four `skills/metronome_*.md` role references, `docs/architecture/debt-gate-map.md`, and the refactor template. Add the independent-plan-review sentence to the router, overlay, planner, coder, reviewer, ChatGPT review reference, and refactor template. Gate the exact general interface-verification rule in `AGENTS.md`, the overlay skill, `skills/metronome_planner.md`, and the refactor template. Gate `the tracked hashed plan is the sole metronome Stage authority` and `only the monitor may promote` in `AGENTS.md` and the overlay. Keep these as presence checks consistent with the validator's current design.

- [ ] **Step 4: Update the debt gate map, not a new ledger**

Under `Gate-control changes`, add `AGENTS.md` and `.agents/skills/**`. Add a short `Workflow Router Boundary` section stating root router -> one overlay skill -> focused `skills/metronome_*.md` references -> existing promotion gates. State that the tracked hashed plan is the sole Stage authority, only the monitor promotes through its plan-defined legal transitions, and the existing approval/PR evidence binds the authorized/current Stage without creating a ledger. State that `PLAN_READY` plus matching-hash independent Terra/Luna `PASS` is the coding promotion boundary, include the exact full hard-pause sentence, and state explicitly that `docs/v1/status.json` remains product/slice status only.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run:

```powershell
& .\scripts\npm-local.ps1 --% run validate:debt-contract:selftest
```

Expected: PASS with `validate-pr-debt-contract selftest passed.`

Run:

```powershell
& .\scripts\npm-local.ps1 --% run validate:debt-gates
```

Expected at this intermediate point: FAIL listing missing `AGENTS.md`/overlay/role content; this is an intentional partial state and must remain uncommitted.

- [ ] **Step 6: Keep the partial gate change uncommitted**

Run `git status --short`. Do not stage or commit while `validate:debt-gates` is red, and do not use `--no-verify`. Task 5 performs one implementation commit only after Tasks 3-4 make the complete contract green.

### Task 3 [MSO-3]: Create the Mandatory Router and Minimal Composing Skill

**Files:**
- Modify: `AGENTS.md`
- Create: `.agents/skills/metronome-workflow/SKILL.md`
- Test: `scripts/validate-metronome-gates.mjs`

- [ ] **Step 1: Extend root AGENTS.md as the mandatory router**

Keep the existing Git-hook and local npm fallback sections unchanged. Prepend a concise `Repository Workflow Router` section requiring every fresh task and subagent to read and follow `metronome-workflow` before planning, coding, reviewing, or verification. State that this root file is the mandatory router and that role details stay in the overlay/references. Add: `The tracked hashed plan is the sole metronome Stage authority; only the monitor may promote after its plan-defined preconditions pass.` Include all three exact policy sentences from `Contract Boundaries`: independent matching-hash plan approval is required before any coding including R-01, the full hard-pause/independent-diagnosis/user-decision/no-Sol contract, and the general actual-command-or-official-schema rule. Do not claim the CLI emits skill invocation telemetry.

- [ ] **Step 2: Create one repo-local skill**

Create `.agents/skills/metronome-workflow/SKILL.md` with valid YAML frontmatter:

```yaml
---
name: metronome-workflow
description: Use when planning, implementing, reviewing, verifying, or coordinating any change in the metronome repository.
---
```

Keep the body under 200 lines and compose, rather than reproduce, Superpowers. It must contain these exact decisions:

1. Require `superpowers:using-superpowers` first and require the applicable Superpowers process skill.
2. Define `Superpowers Task is the metronome Stage`; the tracked hashed plan is the sole Stage authority, one Stage owns one promotable artifact boundary, and only the monitor promotes after the plan-defined preconditions pass.
3. Planning requires `superpowers:writing-plans`, `skills/metronome_planner.md`, a durable plan, and exact `PLAN_READY`/`PLAN_BLOCKED`; `PLAN_READY` never authorizes coding without independent matching-hash Terra/Luna standard `PASS` evidence.
4. A plan agent chooses execution mode. Small cohesive work uses one coding agent through `superpowers:executing-plans`; large work with independent Tasks uses `superpowers:subagent-driven-development`.
5. Coder/reviewer/external-review roles load only their matching `skills/metronome_*.md` reference and emit its existing exact verdict.
6. Plan agents use GPT-5.6 Sol standard. All other subagents use GPT-5.6 Terra standard or GPT-5.6 Luna standard, never fast and never Sol.
7. Refactor plans do not prewrite large implementation bodies; they use the existing refactor template and deletion proofs.
8. Promotion uses the current plan/PR evidence, `validate:debt-gates`, pre-commit, CI, CodeScene, Semgrep, and exact verdicts; it does not update a parallel ledger.
9. Include this exact rule: `unexpected production LOC growth, Code Health decline, scope expansion, or unplanned wrapper/public API => stop; launch independent GPT-5.6 Terra standard or GPT-5.6 Luna standard diagnosis; resume only after explicit user decision. Never route diagnosis, fix, or review to GPT-5.6 Sol.`
10. Include this exact rule: `Every claimed CLI/API/event/gate interface must be verified by an actual command in the target environment or an official schema before PLAN_READY; otherwise PLAN_BLOCKED.`
11. State the evidence limit: internal skill invocation is unobservable; fresh-context acceptance proves only required file reads and observable workflow conformance.

- [ ] **Step 3: Run the package gate**

Run:

```powershell
& .\scripts\npm-local.ps1 --% run validate:debt-gates
```

Expected: router/overlay checks pass; any remaining failure names a role-reference or refactor-template snippet scheduled in Task 4. Keep this partial state uncommitted.

- [ ] **Step 4: Keep the partial router/skill change uncommitted**

Run `git status --short`. Do not stage or commit until Task 4 makes `validate:debt-gates` and the full pre-commit command set green.

### Task 4 [MSO-4]: Narrow Existing Role References Around the Overlay

**Files:**
- Modify: `skills/metronome_planner.md`
- Modify: `skills/metronome_coder.md`
- Modify: `skills/metronome_reviewer.md`
- Modify: `skills/metronome_chatgpt_review.md`
- Modify: `docs/v1/implementation-slices/refactor/refactor-pipeline-planning-template.md`
- Test: `scripts/validate-metronome-gates.mjs`

- [ ] **Step 1: Add one shared overlay pointer to each role reference**

Near each title, add: `Workflow composition and Stage orchestration are owned by .agents/skills/metronome-workflow/SKILL.md; this file remains the focused planner/coder/reviewer/external-review hard-gate reference.` Select the one matching the file. Do not copy the rest of the overlay workflow into these files.

- [ ] **Step 2: Encode role-specific model constraints**

Add only the role-relevant sentence:

```text
Planner: Use GPT-5.6 Sol standard; never fast.
Coder/reviewer/external review: Use GPT-5.6 Terra standard or GPT-5.6 Luna standard; never fast and never Sol.
```

Do not remove or rename existing input-packet fields, evidence tables, or verdict tokens; only the additions in Step 3 are permitted.

- [ ] **Step 3: Add independent plan approval and the exact hard-pause rule to every role reference**

Add this exact approval contract to planner, coder, reviewer, and ChatGPT review references:

```text
PLAN_READY is necessary but insufficient for coding. Before any overlay coding or later R-01 coding, require an independent plan review of the exact plan SHA-256 by GPT-5.6 Terra standard or GPT-5.6 Luna standard, never fast and never Sol, with verdict PASS.
```

Add this exact hard-pause contract to all four role references, not only the refactor template:

```text
unexpected production LOC growth, Code Health decline, scope expansion, or unplanned wrapper/public API => stop; launch independent GPT-5.6 Terra standard or GPT-5.6 Luna standard diagnosis; resume only after explicit user decision. Never route diagnosis, fix, or review to GPT-5.6 Sol.
```

In `skills/metronome_coder.md`, add the six PR evidence fields plus the Task 0 external approval/trace paths and `approval.json` fields `authorizedPromoter: monitor` / `authorizedStage: MSO-1` to the required input packet. Return `BLOCKED: independent plan review missing or stale` before production edits when the monitor-guaranteed reviewer policy, verdict, ancestor plan commit, plan path, SHA-256, Stage authority, approval artifact, or trace assertion is absent/mismatched. In reviewer and ChatGPT review packets, independently compare the current plan content/hash with the recorded ancestor plan commit and approval, require `Current metronome Stage` to match a Task heading in that plan, and for this overlay require final `MSO-6`.

Add the exact general interface-verification rule to `skills/metronome_planner.md`; planner verdict is `PLAN_BLOCKED` whenever an interface claim lacks an actual target-environment command or official schema. Coder/reviewer references must treat a plan that violates that rule as stale/blocked, without inventing replacement fields.

- [ ] **Step 4: Tighten the refactor planning template**

In `Hard Output Rules`, add that refactor plans must not prewrite large implementation bodies: name exact symbols, edits, tests, and deletion proofs, but leave implementation code to the coding Stage. Add the exact independent-plan-review, full hard-pause, and actual-command-or-official-schema sentences above to the coding handoff stop conditions so later R-01 coding cannot start from `PLAN_READY` alone or rely on an invented interface.

- [ ] **Step 5: Run the package validator and self-test**

Run:

```powershell
& .\scripts\npm-local.ps1 --% run validate:debt-gates
```

Expected: PASS with `Metronome debt gate package files are present.`, self-test pass, and local source/risk scan pass.

- [ ] **Step 6: Verify no status ledger or production surface was introduced**

Run:

```powershell
git diff --name-only origin/main...HEAD -- src docs/v1/status.json package.json
```

Expected: no output.

Run:

```powershell
git diff --numstat origin/main...HEAD -- src
```

Expected: no output. Any output triggers the exact hard-pause contract: stop, launch independent Terra/Luna diagnosis, and wait for explicit user decision; never send diagnosis, fix, or review to Sol.

- [ ] **Step 7: Keep the now-green implementation change uncommitted until the full hook set passes**

Run `git status --short` and confirm only files listed in `File Structure` changed. Do not stage or commit yet; Task 5 runs every pre-commit command before creating the first implementation commit.

### Task 5 [MSO-5]: Run Full Existing Promotion Gates

**Files:**
- Verify only: all changed files

- [ ] **Step 1: Run the exact pre-commit command set through the repo-local runtime**

Run each command separately and record exact pass/fail output for the PR body:

```powershell
& .\scripts\npm-local.ps1 --% run validate:debt-gates
& .\scripts\npm-local.ps1 --% run lint:debt:changed
& .\scripts\npm-local.ps1 --% run lint:xo:changed
& .\scripts\npm-local.ps1 --% run lint
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run test:unit
& .\scripts\npm-local.ps1 --% run build
```

Expected: all exit `0`. Do not use `--no-verify` for later commits.

- [ ] **Step 2: Create the first implementation commit only after all hook commands are green**

Run:

```powershell
git add AGENTS.md .agents/skills/metronome-workflow/SKILL.md skills/metronome_planner.md skills/metronome_coder.md skills/metronome_reviewer.md skills/metronome_chatgpt_review.md docs/architecture/debt-gate-map.md docs/v1/implementation-slices/refactor/refactor-pipeline-planning-template.md scripts/validate-metronome-gates.mjs scripts/validate-pr-debt-contract.mjs scripts/validate-pr-debt-contract.selftest.mjs .github/pull_request_template.md
git commit -m "build: add metronome Superpowers workflow overlay"
```

Expected: the pre-commit hook reruns every required command and the commit succeeds without `--no-verify`. If any hook fails, leave the whole implementation uncommitted, fix only the planned contract, rerun Task 5 Step 1, and retry.

- [ ] **Step 3: Run CodeScene before review**

Use the verified target-session schema exactly:

```text
mcp__codescene__analyze_change_set({
  git_repository_path: "C:\\Users\\wsuto\\metronome",
  base_ref: "origin/main"
})
```

Expected: a parseable result with `quality_gates` passed and no `results[]` item whose `verdict` is `degraded`. If the MCP tool is unavailable, errors, the base cannot resolve, or the result cannot prove both conditions, Stage `MSO-5` is `PLAN_BLOCKED`; do not replace it with an invented command or prose claim. Any decline triggers the exact hard-pause contract even if all npm commands pass: stop, launch independent Terra/Luna standard diagnosis, and wait for explicit user decision; never send diagnosis, fix, or review to Sol.

- [ ] **Step 4: Audit scope and surface**

Run:

```powershell
git diff --name-status origin/main...HEAD
git diff --stat origin/main...HEAD
git diff --numstat origin/main...HEAD -- src
rg -n "GPT-5\.6 Sol standard|GPT-5\.6 Terra standard|GPT-5\.6 Luna standard|never fast|never Sol" AGENTS.md .agents/skills skills
rg -n "unexpected production LOC growth, Code Health decline, scope expansion, or unplanned wrapper/public API => stop; launch independent GPT-5.6 Terra standard or GPT-5.6 Luna standard diagnosis; resume only after explicit user decision. Never route diagnosis, fix, or review to GPT-5.6 Sol." AGENTS.md .agents/skills skills docs/architecture/debt-gate-map.md docs/v1/implementation-slices/refactor/refactor-pipeline-planning-template.md
```

Expected: only planned gate-control/docs files; no `src/**` numstat; every policy term is discoverable from the overlay and appropriate focused reference.

- [ ] **Step 5: Prepare existing PR promotion evidence without promoting early**

Use `.github/pull_request_template.md`. Prepare this as a gate-control, non-debt-reduction PR with no production surface, but do not claim `Current metronome Stage: MSO-6` until Stage `MSO-6` acceptance passes. Do not add a new promotion document or update `docs/v1/status.json`. Copy the monitor-guaranteed reviewer policy declaration, `PASS`, plan-only commit, plan path, and matching SHA-256 from Task 0. The validator mechanically rejects non-ancestor/stale/mismatched plan evidence and any final Stage other than `MSO-6` even when `PLAN_READY` is present; it validates operational evidence shape but does not cryptographically prove the monitor's model/independence declaration. The existing exact `PLAN_READY`, `CODE_READY`, reviewer `PASS`/`PASS_WITH_NITS`, and ChatGPT `PASS`/`PASS_WITH_NITS` evidence remains required.

### Task 6 [MSO-6]: R-01 Fresh-Context Observable-Conformance Acceptance

**Files:**
- Verify only: committed candidate branch in disposable worktree
- Evidence outside repository and validation worktree: `C:\tmp\metronome-superpowers-r01-evidence\`

- [ ] **Step 1: Require a clean committed candidate**

Run:

```powershell
git status --short
git rev-parse HEAD
```

Expected: clean status and a commit SHA containing all Tasks 1-5. Do not run acceptance against uncommitted workflow files.

- [ ] **Step 2: Create an isolated validation worktree outside the repository**

Run:

```powershell
git worktree add --detach C:\tmp\metronome-superpowers-r01 HEAD
```

Expected: detached worktree at the candidate SHA. This worktree is acceptance-only; do not edit, commit, push, or open a PR from it.

- [ ] **Step 3: Launch an empty-context Codex acceptance agent and capture raw JSONL**

The monitor launches a new task with no inherited conversation. This plan fixes acceptance to GPT-5.6 Terra standard using installed slug `gpt-5.6-terra`, installed default reasoning effort `medium`, and non-fast `service_tier="default"`; it ignores the active Sol/low user config and sets the installed read-only sandbox explicitly. Under the threat model, the explicit command is operational launch evidence; JSONL does not prove those options. The neutral prompt must not name `AGENTS.md`, `metronome-workflow`, Superpowers, or any target file path. Capture and compare Git-visible tracked/untracked status around the launch:

```powershell
$ErrorActionPreference = 'Stop'
$codex = 'C:\Users\wsuto\.codex\.sandbox-bin\codex.exe'
$worktree = 'C:\tmp\metronome-superpowers-r01'
$evidenceDir = 'C:\tmp\metronome-superpowers-r01-evidence'
New-Item -ItemType Directory -Force $evidenceDir
$statusBefore = @(git -C $worktree status --porcelain=v2 --untracked-files=all)
$statusBeforeExit = $LASTEXITCODE
Set-Content -LiteralPath "$evidenceDir\worktree-status-before.txt" -Value ([string]::Join("`n", $statusBefore))
if ($statusBeforeExit -ne 0 -or $statusBefore.Count -ne 0) { throw 'PLAN_BLOCKED: R-01 Git-visible status was not clean before launch' }
& $codex exec --ignore-user-config --strict-config --model gpt-5.6-terra --config 'model_reasoning_effort="medium"' --config 'service_tier="default"' --sandbox read-only --ephemeral --cd $worktree --json "R-01 fresh-context acceptance. Read only; do not edit files or use prior conversation context. Follow repository instructions and applicable skills. Locate the approved implementation plan. Evaluate two hypothetical cases under the repository workflow: A is a small cohesive change with PLAN_READY but no independent matching-hash PASS; B unexpectedly adds production LOC during execution. Reply only with lines labeled PLAN, RESULT, CURRENT_STAGE, TASK_STAGE_RELATION, EXECUTION_MODE, CODING_AGENT, PLAN_READY_ALONE, HARD_PAUSE, DIAGNOSIS_AGENT, and RESUME." | Tee-Object -FilePath "$evidenceDir\events.jsonl"
$acceptanceExit = $LASTEXITCODE
$statusAfter = @(git -C $worktree status --porcelain=v2 --untracked-files=all)
$statusAfterExit = $LASTEXITCODE
Set-Content -LiteralPath "$evidenceDir\worktree-status-after.txt" -Value ([string]::Join("`n", $statusAfter))
if ($statusAfterExit -ne 0 -or [string]::Join("`n", $statusAfter) -cne [string]::Join("`n", $statusBefore)) { throw 'PLAN_BLOCKED: R-01 changed Git-visible status or status capture failed' }
if ($acceptanceExit -ne 0) { throw 'PLAN_BLOCKED: R-01 fresh task failed' }
```

Expected: exit `0`; identical empty Git-visible status snapshots; and a non-empty external `events.jsonl`, one valid JSON object per line, containing real `thread.started`, `turn.started`, `item.completed`, and `turn.completed` events. These snapshots do not cover ignored files. Any Git-visible mutation, status-capture failure, auth/CLI failure, inaccessible required skill source, or inability to preserve JSONL makes R-01 `PLAN_BLOCKED`; do not loosen model/config/sandbox flags or substitute inherited context or simulated evidence.

- [ ] **Step 4: Prove required reads and observable workflow conformance**

Parse only verified real fields. A read is proven only by a completed, zero-exit `command_execution` whose `command` identifies the file and whose `aggregated_output` contains file-specific content. Require reads of the root router, repo-local overlay, tracked plan, and existing Superpowers `using-superpowers` and `executing-plans` sources. The exact final `agent_message` proves observable conformance for the hypothetical cases; neither reads nor output prove an internal discovery/invocation event.

```powershell
$ErrorActionPreference = 'Stop'
$events = @(Get-Content C:\tmp\metronome-superpowers-r01-evidence\events.jsonl | ForEach-Object { $_ | ConvertFrom-Json })
$statusBefore = (Get-Content -Raw C:\tmp\metronome-superpowers-r01-evidence\worktree-status-before.txt).TrimEnd("`r", "`n")
$statusAfter = (Get-Content -Raw C:\tmp\metronome-superpowers-r01-evidence\worktree-status-after.txt).TrimEnd("`r", "`n")
$currentStatus = @(git -C C:\tmp\metronome-superpowers-r01 status --porcelain=v2 --untracked-files=all)
$currentStatusExit = $LASTEXITCODE
$thread = @($events | Where-Object { $_.type -eq 'thread.started' -and $_.thread_id })
$turnStarted = @($events | Where-Object { $_.type -eq 'turn.started' })
$commands = @($events | Where-Object { $_.type -eq 'item.completed' -and $_.item.type -eq 'command_execution' -and $_.item.status -eq 'completed' -and $_.item.exit_code -eq 0 })
$routerReads = @($commands | Where-Object { $_.item.command -match '(?i)\bAGENTS\.md\b' -and $_.item.aggregated_output -match 'Repository Workflow Router' -and $_.item.aggregated_output -match 'metronome-workflow' })
$skillReads = @($commands | Where-Object { $_.item.command -match '(?i)\.agents[\\/]skills[\\/]metronome-workflow[\\/]SKILL\.md' -and $_.item.aggregated_output -match 'name:\s*metronome-workflow' -and $_.item.aggregated_output -match 'superpowers:using-superpowers' })
$usingSuperpowersReads = @($commands | Where-Object { $_.item.command -match '(?i)superpowers.+skills[\\/]using-superpowers[\\/]SKILL\.md' -and $_.item.aggregated_output -match '(?m)^name:\s*using-superpowers\s*$' })
$executingPlansReads = @($commands | Where-Object { $_.item.command -match '(?i)superpowers.+skills[\\/]executing-plans[\\/]SKILL\.md' -and $_.item.aggregated_output -match '(?m)^name:\s*executing-plans\s*$' })
$planReads = @($commands | Where-Object { $_.item.command -match 'docs[\\/]superpowers[\\/]plans[\\/]2026-07-16-metronome-superpowers-overlay\.md' -and $_.item.aggregated_output -match 'Metronome Superpowers Overlay Implementation Plan' -and $_.item.aggregated_output -match '\*\*Plan verdict:\*\* `PLAN_READY`' })
$results = @($events | Where-Object { $_.type -eq 'item.completed' -and $_.item.type -eq 'agent_message' -and $_.item.text -match '(?m)^PLAN: docs/superpowers/plans/2026-07-16-metronome-superpowers-overlay\.md\r?\nRESULT: PLAN_READY\r?\nCURRENT_STAGE: MSO-6\r?\nTASK_STAGE_RELATION: SAME\r?\nEXECUTION_MODE: superpowers:executing-plans\r?\nCODING_AGENT: GPT-5\.6 Terra standard\r?\nPLAN_READY_ALONE: BLOCKED\r?\nHARD_PAUSE: STOP\r?\nDIAGNOSIS_AGENT: GPT-5\.6 Luna standard\r?\nRESUME: EXPLICIT_USER_DECISION$' })
$turnCompleted = @($events | Where-Object { $_.type -eq 'turn.completed' })
if (-not [string]::IsNullOrEmpty($statusBefore) -or -not [string]::IsNullOrEmpty($statusAfter) -or $statusAfter -cne $statusBefore -or $currentStatusExit -ne 0 -or $currentStatus.Count -ne 0 -or $thread.Count -ne 1 -or $turnStarted.Count -lt 1 -or $routerReads.Count -lt 1 -or $skillReads.Count -lt 1 -or $usingSuperpowersReads.Count -lt 1 -or $executingPlansReads.Count -lt 1 -or $planReads.Count -lt 1 -or $results.Count -ne 1 -or $turnCompleted.Count -lt 1) { throw 'PLAN_BLOCKED: R-01 does not prove required reads, Git-visible cleanliness, and observable conformance' }
```

Expected: matching empty Git-visible snapshots and current status; command-trace reads of root `AGENTS.md`, `.agents/skills/metronome-workflow/SKILL.md`, the tracked plan, and both required Superpowers sources; and the exact ten-line behavioral result. The result demonstrates the plan's Stage authority, Task/Stage equivalence, `executing-plans` choice, Terra coding policy, `PLAN_READY` insufficiency, and hard-pause/Luna-diagnosis/user-resume rules. If commands are combined, one completed item may satisfy multiple predicates only when its `command` and `aggregated_output` prove each file independently. Missing/truncated output, prose-only references, malformed JSONL, changed Git-visible status, or any unverified field makes R-01 `PLAN_BLOCKED`; never infer internal discovery or invocation.

- [ ] **Step 5: Bind final Stage evidence and prove the workflow PR was not contaminated**

Only after Step 4 passes, set the existing PR body field to `Current metronome Stage: MSO-6`, alongside the matching plan commit/path/SHA-256 from Stage `MSO-0`. The existing validator/CI must pass this exact field; do not create a stage file or update `docs/v1/status.json`. Then return to `C:\Users\wsuto\metronome` and run:

```powershell
git status --short
git diff --name-only origin/main...HEAD
```

Expected: clean status; no acceptance transcript, temporary fixture, or generated evidence in the branch diff.

- [ ] **Step 6: Remove the disposable worktree after evidence is captured**

Run:

```powershell
git worktree remove C:\tmp\metronome-superpowers-r01
git worktree prune
```

Expected: validation worktree removed; `C:\tmp\metronome-superpowers-r01-evidence\events.jsonl` and the two status snapshots remain outside both the worktree and repository. No repository file is changed.

## Final Review Checklist

- [ ] Root `AGENTS.md` is the only mandatory router.
- [ ] Exactly one repo-local composing skill exists under `.agents/skills`.
- [ ] The overlay composes the existing Superpowers sources and does not copy plugin skill bodies; target availability is proven by actual source reads, while internal invocation remains unobservable.
- [ ] Existing `skills/metronome_*.md` remain focused role references.
- [ ] The tracked approved plan/hash is the sole Stage authority; legal transitions are `MSO-0` through `MSO-6`; only the monitor promotes; existing approval/PR evidence binds authorized/current Stage without a ledger.
- [ ] Existing validator, self-test, pre-commit, CI, PR evidence, verified CodeScene schema, and Semgrep enforce promotion.
- [ ] `docs/v1/status.json` and `package.json` are unchanged; no second framework, status ledger, validator, or script exists.
- [ ] Plan-only Sol and non-plan Terra/Luna policy is exact; all fast modes are forbidden.
- [ ] Every nested review/acceptance `codex exec` ignores user config, explicitly pins Terra/Luna, `model_reasoning_effort="medium"`, `service_tier="default"`, and `--sandbox read-only` using installed CLI syntax.
- [ ] The exact plan SHA-256 has independent Terra/Luna standard `PASS` evidence before overlay coding and every later R-01 coding Stage; `PLAN_READY` alone never promotes coding.
- [ ] This tracked revision has a new plan-only commit, newly computed blob/SHA-256, new independent review trace, and matching clean before/after Git-visible tracked/untracked status snapshots; no prior plan approval is reused and ignored-file cleanliness is not claimed.
- [ ] Every router/overlay/role reference contains the exact stop -> independent Terra/Luna diagnosis -> explicit user decision contract and forbids Sol for diagnosis, fix, or review.
- [ ] No `src/**` or production LOC changed.
- [ ] R-01 passed from detached empty context using verified `command_execution` reads of the router, overlay, plan, and required Superpowers sources plus the exact behavioral dry-run result; Git-visible status stayed clean and identical; no discovery/invocation event is claimed.
