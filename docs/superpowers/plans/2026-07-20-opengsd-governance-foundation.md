# OpenGSD Governance Foundation Implementation Plan (Executed Historical Record)

> **Status:** Executed and retained only as historical implementation evidence. Do not execute these tasks again. The primary repository is now between milestones; the pending historical R-01 pilot has its own isolated execution contract.

**Goal:** Make OpenGSD 1.7.0 the only project lifecycle control plane, inject one stateless Metronome capability-discovery policy through native `agent_skills`, and retire the legacy Metronome orchestrator and semantic PR validator without weakening the existing Semgrep, XO, lint, typecheck, unit, or build gates.

**Architecture:** OpenGSD owns lifecycle and tracked `.planning` state. `skills/metronome-policy/SKILL.md` contains only capability-discovery and CAP-to-plan obligations. Repository quality gates remain normal package scripts and CI jobs; no JavaScript parses prose to decide reuse, planning, review, or promotion state.

**Pinned runtime:** `@opengsd/gsd-core@1.7.0`, installed through the official Codex installer. The old runtime under `C:\tmp\metronome-opengsd-r01-019f7372` is evidence only and must not be copied or used as the installed runtime.

**Design source:** `docs/superpowers/specs/2026-07-20-opengsd-capability-discovery-design.md`.

## Scope and file contract

Create:

- `.planning/config.json`
- `skills/metronome-policy/SKILL.md`

Modify:

- `AGENTS.md`
- `package.json`
- `.github/workflows/metronome-debt-gates.yml`
- `.github/pull_request_template.md`
- `docs/architecture/debt-gate-map.md`

Delete:

- `.agents/skills/metronome-workflow/SKILL.md`
- `skills/metronome_planner.md`
- `skills/metronome_coder.md`
- `skills/metronome_reviewer.md`
- `skills/metronome_chatgpt_review.md`
- `skills/code_review.md`
- `scripts/validate-metronome-gates.mjs`
- `scripts/validate-pr-debt-contract.mjs`
- `scripts/validate-pr-debt-contract.selftest.mjs`
- `package-json-scripts.patch.json`

Do not modify:

- `.semgrep/**`
- `scripts/run-metronome-semgrep-changed.mjs`
- `scripts/run-metronome-semgrep-changed.selftest.mjs`
- `scripts/run-xo-changed.mjs`
- `.git/hooks/pre-commit`
- product code or tests under `src/**` and `tests/**`
- `docs/v1/status.json` in this plan

Narrow executed scope adjustment:

- `.xo-suppressions.json` was modified only to remove stale suppression entries belonging to the retired validators. No new suppression or unrelated XO policy change was introduced.

The task descriptions below record the executed foundation work and are not live lifecycle entrypoints.

## Task 1: Establish the clean runtime baseline

**Files:** none.

1. Prove the branch is based on the current `origin/main`, contains only the approved design and implementation-plan commits, and has no uncommitted implementation changes.
2. Prove `C:\Users\wsuto\.codex\gsd-core\VERSION` is absent before installation and record that the old temporary pilot runtime is not the target.
3. Verify the package/version exists through the repository-local npm runtime.
4. Install the exact global Codex runtime with elevated permission:

   ```powershell
   & .\scripts\npm-local.ps1 --% exec --yes --package=@opengsd/gsd-core@1.7.0 -- gsd-core --codex --global
   ```

5. Verify `C:\Users\wsuto\.codex\gsd-core\VERSION` is exactly `1.7.0`. A different version, missing runtime, or installer fallback blocks the plan.

The global installation is machine setup, not a repository diff. Do not vendor `.codex/gsd-core` into the project.

## Task 2: Add the native OpenGSD configuration and one policy

**Files:** create `.planning/config.json`; create `skills/metronome-policy/SKILL.md`.

1. Before either file exists, run the native `query agent-skills --json` command for `gsd-planner` from the repository root and record the expected unconfigured result.
2. Create a minimal OpenGSD config with this semantic shape:

   ```json
   {
     "mode": "interactive",
     "runtime": "codex",
     "model_profile": "quality",
     "planning": {
       "commit_docs": true,
       "search_gitignored": false
     },
     "workflow": {
       "research": true,
       "plan_check": true,
       "verifier": true,
       "auto_advance": false,
       "pattern_mapper": false,
       "use_worktrees": false
     },
     "parallelization": false,
     "agent_skills": {
       "gsd-assumptions-analyzer": ["skills/metronome-policy"],
       "gsd-phase-researcher": ["skills/metronome-policy"],
       "gsd-planner": ["skills/metronome-policy"],
       "gsd-plan-checker": ["skills/metronome-policy"],
       "gsd-executor": ["skills/metronome-policy"],
       "gsd-verifier": ["skills/metronome-policy"]
     },
     "intel": {
       "enabled": false
     },
     "graphify": {
       "auto_update": false
     },
     "effort": {
       "default": "xhigh",
       "routing_tier_defaults": {
         "light": "xhigh",
         "standard": "xhigh",
         "heavy": "xhigh"
       }
     }
   }
   ```

3. Validate every key with the installed 1.7.0 config loader. Do not add unknown aliases such as `graphify.enabled`, and do not embed model-routing objects where the schema expects strings.
4. Write one approximately 80-line policy. It must contain only:

   - Level 0/1/2 classification and ambiguity upgrade;
   - capability-atom fields;
   - local semantic, installed direct/transitive, platform, and OSS waterfall;
   - provider fail-closed and private-source rules;
   - `RESEARCH.md` Capability Admission decisions and Approved Surface;
   - six role-specific responsibilities and prohibitions;
   - CAP-to-PLAN and diff-to-CAP traceability;
   - affected-CAP return to research for a newly required surface;
   - separate behavior, retired LOC, production LOC, and Code Health reporting.

5. The policy must not contain lifecycle stages, model names, PR promotion, a status vocabulary, test-command duplication, R-01 paths, expected helper counts, or a second artifact schema.

## Task 3: Retire the second control plane and semantic validator

**Files:** modify `AGENTS.md`, `package.json`, `.github/workflows/metronome-debt-gates.yml`, `.github/pull_request_template.md`, `docs/architecture/debt-gate-map.md`; delete all legacy files listed in Scope.

1. Update `AGENTS.md` so native OpenGSD is the sole lifecycle entrypoint. It should direct project work to `$gsd-next` or the already-active GSD phase and explicitly say the project policy is loaded through `.planning/config.json`, not manually.
2. Keep the existing pre-commit command list, npm fallback, and no-`--no-verify` rule. The hook file itself is not modified.
3. Replace `package.json`'s `validate:debt-gates` implementation with the existing Semgrep runner self-test:

   ```json
   "validate:debt-gates": "node scripts/run-metronome-semgrep-changed.selftest.mjs"
   ```

4. Delete the obsolete `validate:debt-contract` and `validate:debt-contract:selftest` package scripts so no command points to removed files.
5. Delete the three custom validator files. Do not retain their PR-body parser, Reuse Proof parser, surface parser, MSO stages, skill-read markers, exact verdict vocabulary, or synthetic self-test corpus under another name.
6. Delete the old orchestrator, four role packets, and legacy reviewer proxy.
7. Simplify the PR template to ordinary human-readable Summary, Verification, and Review Evidence sections. It must not be a machine-parsed lifecycle contract.
8. Reduce `docs/architecture/debt-gate-map.md` to a static map of existing Semgrep, XO, CodeScene, lint, typecheck, test, and build entrypoints. State that OpenGSD owns lifecycle; remove role/stage/promotion requirements.
9. Rename the CI step label from “Validate debt gate package” to “Validate Semgrep changed-file runner”; keep the actual Semgrep, typecheck, and lint jobs.

## Task 4: Prove native policy injection and single-source loading

**Files:** none unless a defect is found inside the approved Task 2 boundary.

Use the repository-local Node binary and the installed GSD tool:

```powershell
$node = Resolve-Path '.\.tools\node-v24.17.0-win-x64\node.exe'
$gsd = "$env:USERPROFILE\.codex\gsd-core\bin\gsd-tools.cjs"
$agents = @(
  'gsd-assumptions-analyzer',
  'gsd-phase-researcher',
  'gsd-planner',
  'gsd-plan-checker',
  'gsd-executor',
  'gsd-verifier'
)

foreach ($agent in $agents) {
  & $node $gsd query agent-skills $agent --json
}
```

For all six outputs require:

- configured and resolved from the repository root;
- not degraded;
- exactly one skill;
- the block references `skills/metronome-policy/SKILL.md`.

Then require no live legacy control-plane reference:

```powershell
rg -n -uu 'metronome-workflow|skills/metronome_(planner|coder|reviewer|chatgpt_review)\.md|validate:debt-contract|validate-pr-debt-contract|validate-metronome-gates|MSO-[0-9]|PLAN_REVIEW_PASS|STAGE_BLOCKED|Agent Gate Evidence' AGENTS.md .agents skills scripts .github docs/architecture/debt-gate-map.md package.json
```

Expected result: no match. Historical `docs/superpowers/**` and `docs/v1/implementation-slices/plans/**` are intentionally outside this live-surface check.

## Task 5: Run focused and full verification

Run once, in this order:

```powershell
& .\scripts\npm-local.ps1 --% run validate:debt-gates
& .\scripts\npm-local.ps1 --% run lint:debt:changed
& .\scripts\npm-local.ps1 --% run lint:xo:changed
& .\scripts\npm-local.ps1 --% run lint
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run test:unit
& .\scripts\npm-local.ps1 --% run build
```

Also inspect `git diff --stat` and record deleted versus added workflow LOC. A passing build does not compensate for a second policy source or unresolved native mapping.

## Task 6: Commit the foundation

1. Self-review the exact diff against the design source.
2. Stage with elevated Git permission and commit without bypassing hooks:

   ```powershell
   git add -A
   git commit -m "Adopt native OpenGSD governance foundation"
   ```

3. Use a commit timeout of at least 10 minutes because the hook runs the full repository suite. If it times out, first inspect the elevated process and hook output; do not immediately rerun.
4. Record the immutable foundation commit. The historical R-01 pilot may cherry-pick this commit only; it must not cherry-pick roadmap migration state.

## Acceptance criteria

- OpenGSD 1.7.0 is installed outside the repository from the official package.
- `.planning/config.json` is accepted by the native loader.
- All six agent mappings resolve to exactly one policy source.
- The project has no live legacy Metronome orchestrator, role packets, or semantic PR validator.
- Existing Semgrep, XO, lint, typecheck, unit, build, and CodeScene entrypoints remain available.
- No product code changes.
- Net workflow/config LOC decreases materially.
- Full pre-commit succeeds on the committed candidate.
