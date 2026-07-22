# AGENTS

## Repository workflow
- Native OpenGSD is the sole project lifecycle entrypoint.
- Read `.planning/STATE.md` and `.planning/ROADMAP.md` before routing repository work.
- When state is `Awaiting next milestone` and the current roadmap has zero phases, start with `$gsd-new-milestone`.
- When a current milestone or phase exists and `STATE.md` is not paused at a forensics decision, use `$gsd-next` or continue the already-active GSD phase.
- When `STATE.md` has `status: paused` and `paused_at` points under `.planning/forensics/`, do not invoke `$gsd-next` or continue the active phase. Read the referenced report and present its exact owner choices. `$gsd-resume-work` may surface that decision only; it must not dispatch discuss, plan, execute, or another lifecycle step until the project owner explicitly selects a disposition and approves its boundary. Generic `continue`, `go`, `next`, or `resume` wording is not that approval.
- Do not decompose or imitate native planner/checker/revision handling with hand-created controller steps. Native OpenGSD owns that loop and its lifecycle state.
- Native OpenGSD also owns checker revision limits, retry, stall detection, and user escalation. Do not add project cache keys, retry lineage, receipts, fingerprints, or another plan validator around it.
- If a product-plan finding can only be resolved by changing project policy, validator, observability, lifecycle tooling, or an unresolved environment prerequisite with no documented repository fallback, stop that product attempt and record a separate `$gsd-forensics` investigation. Do not revise the product plan to repair its checker.
- Once native plan checking begins, the control plane is frozen for that attempt.
- Treat native `state.*` mutation commands as write operations, never as usage probes: use `--help`, and never invoke a mutator without its required arguments. Do not use generic `state patch` for lifecycle-derived fields such as status, pause, phase, plan, or progress. After an intended native lifecycle mutation, compare its result with read-only `smart-entry --json`; if they contradict, stop and record a separate `$gsd-forensics` investigation. Do not retry, manually normalize `STATE.md`, or add a wrapper validator.
- With `workflow.use_worktrees=false`, all project work and rollback verification stay in the primary project folder. Plans and agents must not invoke `git worktree` directly.
- While any linked historical worktree remains registered, before every product-agent dispatch resolve the current working directory, `git rev-parse --show-toplevel`, and the first `worktree` path from `git worktree list --porcelain`; require all three normalized paths to equal the exact primary checkout root. On any mismatch, stop before dispatch. This is a location precondition only; it does not validate plans or replace native lifecycle routing.
- OpenGSD's Codex stale-bake warning is mtime-based. Do not reinstall agents or block product work from that warning alone. First confirm that an actual `model_overrides` change exists; when it does not and native model plus `agent-skills` resolution are current, record the upstream diagnostic and continue. A proven mismatch is separate control-plane work.
- For typed GSD subagents on Codex, when `spawn_agent` accepts model and reasoning fields, the controller uses `fork_turns: "none"` and passes the model and effort resolved by native OpenGSD for that agent. Record the declared agent type, model, and effort in observability metadata. Do not rely on parent inheritance or an absent agent-TOML model field; if the active schema cannot carry an exact required binding, stop before product dispatch and report the control-plane incompatibility.
- Runtime measurement is project-local under ignored `.logs/gsd-observability/`. Invoke `gsd:observe` and `gsd:observe:summary` through the repository npm runtime and its documented Windows fallback. On PowerShell, pipe any JSON payload directly into `scripts/npm-local.ps1`; do not switch to bare system Node. The writer records declared step timing, status, inputs, and outputs only; it never validates, authorizes, retries, or promotes lifecycle state. Measurement failure or unavailable metrics are reported as incomplete and never change the native workflow outcome. Agents use only the compact summary, not raw logs.
- `.planning/config.json` injects `skills/metronome-policy/SKILL.md` only into its explicitly mapped OpenGSD subagents; it does not inject the policy into the `$gsd-new-milestone` controller or every lifecycle actor.
- `$gsd-new-milestone` reads and follows `skills/promoting-dormant-seeds/SKILL.md` only when selected legacy seeds are approved.

## Final PR review
- Final pull-request review is performed by `@codex`.
- Before reviewing, read and use `skills/reviewing-metronome-prs/SKILL.md`.
- This is a read-only terminal gate and does not replace the native OpenGSD lifecycle.

## Release exit
- `$gsd-ship` creates or prepares a pull request; it does not prove that the pull request merged.
- Do not report the active goal or milestone complete until all release-exit facts are true: after any ship-note or update, resolve the actual final PR head; ensure CI applies to that exact head (re-run or refresh it when `[ci skip]` prevents this); obtain a mandatory finding-free, read-only `@codex` review of that same head using `skills/reviewing-metronome-prs/SKILL.md`; merge the GitHub PR; update local `main` to the intended `origin` merge revision; then verify `main == origin/main`, no `MERGE_HEAD`, an empty index, and empty `git status --porcelain=v1 --untracked-files=all` output.
- Never put a post-merge fact in a pre-ship phase requirement or claim it from `verification.status=passed` or other verifier status.

## Git hooks
- This repo uses a local `pre-commit` hook for gate checks.
- Before committing, the hook runs:
  - `npm run validate:debt-gates`
  - `npm run lint:debt:changed`
  - `npm run lint:xo:changed`
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test:unit`
  - `npm run build`

## Local Node fallback for pre-commit
- On environments without `npm` available on PATH, pre-commit should fallback to the repository local runtime via `scripts/npm-local.ps1`.
- The hook should attempt hooks in this order:
  1. `npm`
  2. `npm.cmd`
  3. `powershell` / `pwsh` + `scripts/npm-local.ps1`
- Do not bypass hooks with `--no-verify` unless explicitly requested.
