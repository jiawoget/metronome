# G-01 Semgrep Diff-Aware Changed-File Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task in the primary checkout. Do not create a worktree.

**Goal:** Make the Semgrep hard gate inspect committed and staged source snapshots while blocking only findings introduced relative to the merge-base baseline.

**Architecture:** Keep the existing single runner and GitHub workflow. Extend the runner's candidate set from committed files alone to the union of committed and staged files, reject unstaged drift in those inputs, and invoke the current Semgrep `scan --baseline-commit` API. Add one black-box selftest that creates temporary Git repositories and proves staged coverage, legacy-finding neutrality, new-finding blocking, and fail-closed drift behavior.

**Tech Stack:** Node.js 24 ESM, Git, Semgrep CLI, existing PowerShell npm wrapper, GitHub Actions.

## Global Constraints

- No `src/**`, `.semgrep/**`, XO, dependency, lockfile, or GitHub workflow change.
- Do not remove a Semgrep rule, lower a severity, add an allowlist, add `nosemgrep`, or skip a candidate file.
- Use `semgrep scan --baseline-commit <merge-base>` directly; do not add a legacy CLI fallback or a custom finding-diff implementation.
- Preserve the existing `BASE_REF`, `GITHUB_BASE_REF`, and `origin/main` merge-base resolution order.
- Local Semgrep commands on this Windows environment require elevated execution; CI continues to run normally on Ubuntu.
- This prerequisite gate repair is separate from R01. Do not modify the merged R01 revision-6 plan or the frozen R01 candidate branch.

---

## Verdict

PLAN_READY

## Skill Evidence

- Skill file read: `skills/metronome_planner.md`
- Debt gate map read: `docs/architecture/debt-gate-map.md`
- Workflow overlay read: `.agents/skills/metronome-workflow/SKILL.md`
- Superpowers skills read: `brainstorming`, `writing-plans`, `systematic-debugging`, `test-driven-development`

## Scope

- Slice/stage: `G-01-semgrep-diff-aware-changed-file-gate`
- In scope: correct Semgrep candidate discovery, baseline invocation, unstaged-drift rejection, executable selftest coverage, validator wiring, and exact debt-gate documentation.
- Out of scope: R01 implementation files, the seven legacy controls findings, Semgrep rule contents, finding severity, diagnostics/test-harness policy, recording/read-model cleanup, XO behavior, dependency upgrades, workflow restructuring, and any compatibility fallback.

## Inputs Read

| File or source | Why read |
|---|---|
| User instruction and active R01 goal | Continue R01, keep decisions with the user, and repair the blocking gate without changing R01 scope |
| Independent Terra diagnosis of the R01 preflight failure | Confirm the staged-file blind spot and reject unrelated R01 scope expansion |
| `scripts/run-metronome-semgrep-changed.mjs` | Locate committed-only candidate discovery and the non-baseline Semgrep invocation |
| `.git/hooks/pre-commit` | Prove the runner executes before the staged production snapshot becomes `HEAD` |
| `scripts/run-xo-changed.mjs` | Reuse the repository's committed-plus-staged union and unstaged-drift pattern |
| `scripts/validate-metronome-gates.mjs` | Reuse the existing executable gate-package selftest entrypoint |
| `.github/workflows/metronome-debt-gates.yml` | Verify the same runner is already used in PR CI and needs no workflow change |
| `.semgrep/metronome-ui-ownership.yml` | Confirm the seven R01 blockers are active rules and must remain active |
| `docs/v1/implementation-slices/rules/diagnostics-test-boundary.md` | Confirm some legacy harness surfaces are separately registered and not G-01 implementation scope |
| `docs/architecture/debt-gate-map.md` | Preserve gate-control evidence and preflight ordering |
| `package.json` | Reuse `lint:debt:changed` and `validate:debt-gates`; add no script or dependency |
| Official Semgrep diff-aware CI documentation | Verify baseline scanning is the supported current model |
| Elevated temporary probe `C:\tmp\semgrep-baseline-probe.mjs` | Prove `semgrep scan --baseline-commit HEAD` sees staged content, suppresses one unchanged legacy match, and blocks one newly staged match |

## Root Cause And Verified Interface

The old runner computes only `git diff <merge-base> HEAD`. During the original R01 production commit, `HEAD` was the characterization commit, so the runner saw only the committed test file and ignored all staged production files. After the commit, the same runner scanned the whole touched controls file without a baseline and reported seven matches already present on `main`.

The elevated probe established the exact supported replacement behavior on this machine:

| Scenario | Command contract | Result |
|---|---|---|
| One legacy `dangerousCall()` remains unchanged while another line is staged | `semgrep scan --config .semgrep --error --baseline-commit <HEAD> src/example.ts` | Exit `0`; current version reports one raw match, final diff-aware summary reports `0 findings` |
| A second `dangerousCall()` is staged | Same command | Exit `1`; final diff-aware summary reports `1 finding (1 blocking)` at the new line |

No custom fingerprinting, JSON comparison, rule exception, or compatibility path is needed.

## Repo Map Evidence

| Search | Command or source | Files found | Decision |
|---|---|---|---|
| Semgrep runner call sites | `rg -n "run-metronome-semgrep-changed|lint:debt:changed" scripts .github docs package.json` | package script, validator, workflow, PR template, debt-gate map | Keep one runner; no duplicate workflow or command |
| Existing changed-input implementation | Read `scripts/run-xo-changed.mjs` | committed files, staged files, unstaged drift set | Reuse its Git snapshot pattern, not its XO-specific control-file behavior |
| Existing executable selftests | `rg -n "selftest" scripts package.json` | PR debt-contract selftest and validator entrypoint | Add one Semgrep runner selftest and invoke it from the same validator |
| Baseline support | Elevated temporary Git/Semgrep probe | current Semgrep CLI | Use current `scan --baseline-commit` API directly |
| Legacy blockers | `git grep` on `main` plus `git diff main...R01` | seven controls findings all predate R01 and are outside its changed lines | Do not delete, suppress, or absorb them into R01 |

## Existing Primitive Search

| Need | Search terms used | Existing primitive/library found | Files read | Decision |
|---|---|---|---|---|
| Merge-base resolution | `merge-base`, `BASE_REF`, `GITHUB_BASE_REF` | Existing runner logic | Semgrep and XO runners | Reuse |
| Committed plus staged candidate union | `diff --cached`, `committedFiles`, `stagedFiles` | XO runner's set union | `scripts/run-xo-changed.mjs` | Reuse |
| Unstaged snapshot drift rejection | `unstagedFiles`, `rejectUnstagedDrift` | XO runner's fail-closed pattern | `scripts/run-xo-changed.mjs` | Reuse |
| New-finding comparison | `baseline`, `SEMGREP_BASELINE_REF` | Current Semgrep `scan --baseline-commit` | Official docs and elevated probe | Reuse |
| Gate-package selftest execution | `spawnSync`, `selftest` | Existing validator process execution | `scripts/validate-metronome-gates.mjs` | Reuse |
| Custom finding fingerprint/diff | `json`, `fingerprint`, `baseline` | Not needed because Semgrep owns the comparison | runner and probe | No-go, with evidence |

## Shared Primitive Call-Site Audit

| Proposed shared surface | Old call sites found repo-wide | Old call sites migrated in this PR | Old implementations deleted/narrowed | Debt-reduction claim |
|---|---:|---:|---|---|
| None | 0 | 0 | The committed-only candidate path is narrowed in place | No shared production/tooling primitive is added |

## New Surface Budget

| New surface | Why needed | Existing alternative rejected | Old surface retired in same PR |
|---|---|---|---|
| `scripts/run-metronome-semgrep-changed.selftest.mjs` | Black-box regression proof must execute real Git and Semgrep snapshot behavior | Narrative evidence and pure helper tests cannot prove staged/baseline integration | Retires untested assumptions that hook success means staged production was scanned |

No new runtime, package, workflow, rule, helper module, compatibility layer, or public API surface is approved.

## Retired Surface Target

| Surface to remove/narrow | Current callers | Replacement | Behavior-equivalence test |
|---|---|---|---|
| Committed-only `merge-base..HEAD` candidate list | Local hook and PR workflow through the runner | Committed-plus-staged candidate union | Selftest proves a staged-only TypeScript change is listed and scanned |
| Full touched-file finding semantics with no baseline | Local hook and PR workflow through the runner | Semgrep-owned merge-base comparison | Selftest proves unchanged legacy finding passes and newly staged finding blocks |
| Silent use of a mixed staged/unstaged file snapshot | Runner | Explicit drift rejection before scanning | Selftest proves the runner exits nonzero with the named file |
| Gate validator that does not exercise the runner | `validate:debt-gates` | Invoke the new selftest before PR-contract validation | Validator command output includes the selftest pass token |

## Boundary Impact

- UI -> browser adapter direct imports added: no; no `src/**` change.
- UI -> infrastructure imports added: no; no `src/**` change.
- Domain -> UI/service imports added: no; no `src/**` change.
- Service passthrough methods added: no; no service change.
- Repository direct callers reduced: no; gate-control repair only.

## Tests Required

| Behavior | Test file/type | Why it gates merge |
|---|---|---|
| Staged-only `.ts` change is a scan candidate before commit | New black-box selftest in a temporary Git repository | Reproduces the original false pass |
| Unchanged baseline finding is not reported as new | Same selftest with a minimal local Semgrep rule | Proves R01 can be checked without hiding existing debt |
| Newly staged finding exits nonzero | Same selftest | Proves hard-fail debt prevention remains active |
| Candidate file with unstaged drift exits nonzero and names the file | Same selftest | Proves the analyzed snapshot is unambiguous |
| Validator always runs the new selftest | `npm run validate:debt-gates` | Prevents future removal or disconnect of staged/baseline coverage |
| Current R01 candidate passes after gate merge | Actual R01 `npm run lint:debt:changed` against updated `main` | Final integration proof on the original failure |

## Implementation Tasks

### Task 0: immutable plan promotion

- [ ] Commit only this plan file on `codex/semgrep-diff-aware-gate-plan`.
- [ ] Record the exact plan commit, Git blob, and SHA-256.
- [ ] Obtain independent Terra/Luna `PLAN_REVIEW_PASS` against those exact identities.
- [ ] Open a plan-only PR, request GitHub `@codex review`, resolve actionable feedback without creating a second plan file, require CI green, and squash merge.
- [ ] Return the primary checkout to clean updated `main` before implementation.

### Task 1: write the black-box regression selftest first

**Files:**

- Create: `scripts/run-metronome-semgrep-changed.selftest.mjs`

**Interfaces:**

- Consumes: the repository runner through its absolute file path; system Git and Semgrep executables.
- Produces: exit `0` and exact final line `Semgrep changed-file selftest passed.` only when all four contracts pass.

- [ ] Create a temporary Git repository using Node `fs`, `os`, and `child_process`; create a minimal TypeScript Semgrep rule and one source file containing one baseline match.
- [ ] Commit the baseline, stage an unrelated source-line change, execute the current runner with `BASE_REF=<baseline commit>`, and assert stdout names `src/example.ts` while the process exits `0`.
- [ ] Stage a second matching call and assert the runner exits nonzero and reports the new line.
- [ ] Restore the one-match staged snapshot, add an unstaged edit to the same file, and assert nonzero exit plus the exact drift message and path.
- [ ] Run the selftest elevated and verify RED against the old runner because the staged-only file is reported as unscanned.

Run:

```powershell
& .\scripts\npm-local.ps1 --% exec -- node scripts/run-metronome-semgrep-changed.selftest.mjs
```

Expected before Task 2: nonzero exit with the staged-only candidate assertion.

### Task 2: implement the minimal runner correction

**Files:**

- Modify: `scripts/run-metronome-semgrep-changed.mjs`

**Interfaces:**

- Consumes: `BASE_REF`/`GITHUB_BASE_REF`, Git committed/staged/unstaged snapshots, `.semgrep`, and the current Semgrep executable.
- Produces: one unambiguous candidate list and `semgrep scan --baseline-commit <merge-base>` exit status.

- [ ] Preserve merge-base resolution.
- [ ] Read committed candidates with `git diff --name-only --no-renames --diff-filter=ACMRD <merge-base> HEAD`.
- [ ] Read staged candidates with `git diff --cached --name-only --no-renames --diff-filter=ACMRD`.
- [ ] Form a de-duplicated union, filter supported JavaScript/TypeScript extensions, and reject any candidate also present in the unstaged diff before filtering deleted paths with `existsSync`.
- [ ] Invoke the current API with arguments beginning `scan --config .semgrep --error --baseline-commit <merge-base>` followed by sorted existing candidates.
- [ ] Add no fallback, custom diff, ignore, severity change, or rule mutation.
- [ ] Re-run the selftest elevated and verify GREEN, including the exact pass token.

### Task 3: make the regression executable in the existing gate package

**Files:**

- Modify: `scripts/validate-metronome-gates.mjs`
- Modify: `docs/architecture/debt-gate-map.md`

**Interfaces:**

- Consumes: the new selftest script.
- Produces: `validate:debt-gates` fail-closed execution and documented semantics.

- [ ] Add the selftest path to the validator's required file list.
- [ ] Require its staged-candidate, baseline, new-finding, drift, and pass-token markers in `requiredContent`.
- [ ] Spawn the selftest after package-shape validation and before the existing PR-contract selftest; propagate any nonzero status.
- [ ] Document that local candidates are committed-plus-staged, mixed candidate snapshots fail, and merge-base diff-aware scanning blocks net-new findings while leaving all rules active.
- [ ] Run `validate:debt-gates` elevated and verify both selftest pass tokens plus the normal local PR-context defer output.

### Task 4: exact-branch verification and promotion

- [ ] Commit through the normal hook; do not use `--no-verify`.
- [ ] Verify exact scope contains only the runner, its selftest, validator, debt-gate map, and the already-merged plan file.
- [ ] Run all commands below with fresh output.
- [ ] Run CodeScene MCP `analyze_change_set` against `origin/main`; require `quality_gates: passed` and no decline.
- [ ] Obtain independent Terra/Luna reviewer `PASS` or `PASS_WITH_NITS` on the exact committed candidate.
- [ ] Open the implementation PR with exact gate-control evidence, request `@codex review`, resolve actionable feedback, require current-HEAD CI green, and squash merge.
- [ ] Return to clean updated `main`, then resume R01 from that exact main without changing its revision-6 plan.

## Verification Commands

```powershell
& .\scripts\npm-local.ps1 --% exec -- node scripts/run-metronome-semgrep-changed.selftest.mjs
& .\scripts\npm-local.ps1 --% run validate:debt-gates
& .\scripts\npm-local.ps1 --% run lint:debt:changed
& .\scripts\npm-local.ps1 --% run lint:xo:changed
& .\scripts\npm-local.ps1 --% run lint
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run test:unit
& .\scripts\npm-local.ps1 --% run build
```

## No-Go / Deferrals

| Item | Reason | Follow-up owner |
|---|---|---|
| Delete or refactor the seven legacy controls findings | Unrelated R01 recording/harness/read-model scope | Future independently planned source-debt stage |
| Change `.semgrep/**` or finding severity | Would alter rule policy instead of correcting snapshot coverage | Explicit future user decision only |
| Add allowlist, `nosemgrep`, suppression, or path exclusion | Would hide evidence and violate the approved hard-gate outcome | Prohibited |
| Add old/new Semgrep CLI compatibility paths | Current `scan --baseline-commit` interface is verified | Prohibited |
| Custom JSON fingerprint comparison | Duplicates Semgrep's supported baseline engine | Prohibited |
| Change XO or GitHub workflow | Existing XO and workflow call sites already provide the required boundary | Out of scope |
| Modify R01 files or plan | G-01 is a prerequisite gate-control PR | Resume only after G-01 merges |

## Acceptance Criteria

1. A pre-commit staged-only JavaScript/TypeScript change is always listed and scanned.
2. A candidate file with unstaged drift fails before Semgrep runs.
3. An unchanged baseline finding is not reported as new.
4. A newly staged finding remains blocking with nonzero exit.
5. All existing Semgrep rules and severity values remain byte-identical; no suppression or allowlist is added.
6. `validate:debt-gates` executes the black-box selftest on every normal hook/CI invocation.
7. No `src/**`, dependency, lockfile, workflow, XO, or R01 change appears in the implementation PR.
8. Local gates, CodeScene, independent review, GitHub `@codex review`, and current-HEAD CI pass.
9. The gate-fix PR squash merges and the primary checkout returns to clean updated `main` before R01 resumes.

## Completion Output

Return `GATE_READY` only with current requirement-by-requirement evidence. Otherwise return `GATE_BLOCKED` and the exact failed criterion.
