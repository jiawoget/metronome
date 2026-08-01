# AGENTS

## Repository workflow

- Native OpenGSD is the sole project lifecycle and agent-coordination entrypoint. Read `.planning/STATE.md` and `.planning/ROADMAP.md` before routing repository work.
- Use `$gsd-new-milestone` only when state is `Awaiting next milestone` and the roadmap has no current phases. Otherwise use `$gsd-next` or the already-active native phase.
- The v1.1 Repository Formatting Baseline shipped on 2026-08-01. v1.2 Release Assurance & Workflow Closure passed ordinary Native verification and the Native milestone audit, then was archived on the PR #136 release-candidate branch. The owner's 2026-08-01 instruction authorizes the remaining bounded release exit through final-head review/CI, merge, and local-main synchronization without another stage-by-stage confirmation. Do not report v1.2 shipped or begin the next milestone until those release facts are complete. Product work, dormant-seed activation, a fresh R01, and tagging remain outside scope.
- Do not imitate native research, planning, checker revision, retry, recovery, execution, verification, or state transitions with project scripts or hand-created controller steps.
- Use native state and roadmap commands for lifecycle mutations, then compare the result with read-only `smart-entry --json`. A genuine unexplained contradiction is a stop condition. The v1.2 audit and archival are now part of PR #136; freeze the final candidate head only after all closeout documents are committed, then run one CI and read-only review pass on that exact head. PR creation or Native archival alone does not mean the milestone shipped.
- With `workflow.use_worktrees=false`, all work stays in the primary checkout at `C:\Users\wsuto\metronome`. Do not create or invoke a Git worktree.
- When the active Codex schema supports typed dispatch fields, pass the native-resolved `agent_type`, `model`, `reasoning_effort`, and `fork_turns: "none"`. Missing exact binding is a fail-closed incompatibility.
- Once the owner authorizes a bounded phase through completion, do not ask for routine stage confirmations and do not defer an in-scope problem merely because it is difficult. Continue with one bounded plan-local diagnosis/repair loop. Stop only for a material scope or architecture change, a global/irreversible action, missing external authority, or a newly discovered high-impact blocker that cannot be safely resolved inside the approved boundary.
- Capability toggles in `.planning/config.json` are milestone-scoped. For the current tooling-only milestone, keep AI, UI, API coverage, schema, security, post-plan gap analysis, pre-ship code review, and similar product-domain capabilities disabled; re-evaluate them explicitly when a later milestone actually needs them.
- The native codebase map and Lumen are navigation caches only. Confirm material facts against live files and rebuild a cache only when a freshness check proves it stale.

## Reuse contract

- When work adds, replaces, or materially expands behavior, infrastructure, or an abstraction, read and follow `skills/metronome-policy/SKILL.md`.
- `.planning/config.json` injects that contract only into `gsd-phase-researcher`, `gsd-planner`, `gsd-plan-checker`, `gsd-executor`, `gsd-verifier`, and `gsd-code-reviewer`.

## Final pull-request review

- Final review is a read-only `@codex` review of the frozen final pull-request head with no unresolved actionable findings. It does not edit files, merge the pull request, publish a custom status, or replace native OpenGSD.
- The reviewer reads `.planning/PROJECT.md`, `.planning/ROADMAP.md`, `.planning/STATE.md`, and the active `.planning/REQUIREMENTS.md` or its milestone archive after closeout, inspects the real diff, and applies `skills/metronome-policy/SKILL.md` when its trigger is met.

## Release exit

- `$gsd-ship` creates or prepares a pull request; it does not prove that the pull request merged.
- For the current single-phase milestone, capture the ship body and preflight evidence before native milestone archival moves the phase directory. Include the archival commit in the same pull request before its final head is frozen. Do not create or push a release tag from an unmerged candidate; this repository keeps `git.create_tag=false` for PR-based closeout.
- Freeze the candidate head before final CI and review. Any later head change invalidates both and requires one fresh CI/review pass on the replacement head.
- Do not report a goal or milestone complete until CI applies to the actual final PR head, the read-only `@codex` review covers that same head with no unresolved actionable findings, the PR is merged, local `main` is updated to the intended `origin/main`, `main == origin/main`, no `MERGE_HEAD` exists, the index is empty, and `git status --porcelain=v1 --untracked-files=all` is empty.
- Never claim a post-merge fact from a pre-ship verifier result.

## Git hook

- The tracked pre-commit hook is a fast commit gate: it runs `git diff --cached --check` and, after the formatting policy exists in `HEAD`, `npm run format:check`. It does not repeat lint, typecheck, the full unit suite, or build on every commit.
- Final local verification and Ubuntu CI run `format:check`, lint, typecheck, the full unit suite, and build once per frozen candidate revision.
- Reuse committed exact-revision gate evidence when the implementation head and inputs are unchanged. For one sequential plan with no worktree/merge boundary, do not immediately repeat the same build and full test suite as a synthetic post-merge gate; run that gate only after an actual merge, multiple independently executed plans, stale/missing evidence, or a relevant head/input change. Native verification should independently inspect artifacts and provenance, rerunning expensive gates only when evidence is stale, absent, or contradictory.
- If npm is not on `PATH`, repository commands and the hook may fall back through `npm`, `npm.cmd`, then `powershell` or `pwsh` with `scripts/npm-local.ps1`. Do not mutate global or user `PATH`, and do not remove a working repository-local runtime fallback merely to satisfy process wording.
- Do not bypass hooks with `--no-verify` unless the project owner explicitly requests it.
