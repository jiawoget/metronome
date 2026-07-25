# AGENTS

## Repository workflow

- Native OpenGSD is the sole project lifecycle and agent-coordination entrypoint. Read `.planning/STATE.md` and `.planning/ROADMAP.md` before routing repository work.
- Use `$gsd-new-milestone` only when state is `Awaiting next milestone` and the roadmap has no current phases. Otherwise use `$gsd-next` or the already-active native phase.
- The current R01 phase has no plan and remains unimplemented. Workflow cleanup does not authorize product work; begin a native discuss, research, planning, or execution step only after an explicit owner direction.
- Do not imitate native research, planning, checker revision, retry, recovery, execution, verification, or state transitions with project scripts or hand-created controller steps.
- Use native state and roadmap commands for lifecycle mutations, then compare the result with read-only `smart-entry --json`. On contradiction, stop instead of retrying or adding a validator.
- With `workflow.use_worktrees=false`, all work stays in the primary checkout at `C:\Users\wsuto\metronome`. Do not create or invoke a Git worktree.
- When the active Codex schema supports typed dispatch fields, pass the native-resolved `agent_type`, `model`, `reasoning_effort`, and `fork_turns: "none"`. Missing exact binding is a fail-closed incompatibility.
- The native codebase map and Lumen are navigation caches only. Confirm material facts against live files and rebuild a cache only when a freshness check proves it stale.

## Reuse contract

- When work adds, replaces, or materially expands behavior, infrastructure, or an abstraction, read and follow `skills/metronome-policy/SKILL.md`.
- `.planning/config.json` injects that contract only into `gsd-phase-researcher`, `gsd-planner`, `gsd-plan-checker`, `gsd-executor`, `gsd-verifier`, and `gsd-code-reviewer`.

## Final pull-request review

- Final review is a finding-free, read-only `@codex` review of the actual final pull-request head. It does not edit files, merge the pull request, publish a custom status, or replace native OpenGSD.
- The reviewer reads `.planning/PROJECT.md`, `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`, and `.planning/STATE.md`, inspects the real diff, and applies `skills/metronome-policy/SKILL.md` when its trigger is met.

## Release exit

- `$gsd-ship` creates or prepares a pull request; it does not prove that the pull request merged.
- Do not report a goal or milestone complete until CI applies to the actual final PR head, the finding-free read-only `@codex` review covers that same head, the PR is merged, local `main` is updated to the intended `origin/main`, `main == origin/main`, no `MERGE_HEAD` exists, the index is empty, and `git status --porcelain=v1 --untracked-files=all` is empty.
- Never claim a post-merge fact from a pre-ship verifier result.

## Git hook

- The local pre-commit hook runs `npm run lint`, `npm run typecheck`, `npm run test:unit`, and `npm run build`.
- If npm is not on `PATH`, the hook falls back through `npm`, `npm.cmd`, then `powershell` or `pwsh` with `scripts/npm-local.ps1`.
- Do not bypass hooks with `--no-verify` unless the project owner explicitly requests it.
