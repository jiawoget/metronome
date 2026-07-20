# AGENTS

## Repository workflow
- Native OpenGSD is the sole project lifecycle entrypoint.
- Read `.planning/STATE.md` and `.planning/ROADMAP.md` before routing repository work.
- When state is `Awaiting next milestone` and the current roadmap has zero phases, start with `$gsd-new-milestone`.
- When a current milestone or phase exists, use `$gsd-next` or continue the already-active GSD phase.
- `.planning/config.json` injects `skills/metronome-policy/SKILL.md` only into its explicitly mapped OpenGSD subagents; it does not inject the policy into the `$gsd-new-milestone` controller or every lifecycle actor.
- `$gsd-new-milestone` controller rule: before approving or committing requirements derived from selected seeds, read the `Dormant seed promotion` section of `skills/metronome-policy/SKILL.md`, then perform this fail-closed native transaction:
  1. After approval, verify the exact legacy capability ID, feature key, and required behavior, and delete only the matching selected seeds. Before committing, require an empty index, no `MERGE_HEAD`, an existing `.planning/seeds` directory, and an exact `git status --porcelain=v1 --untracked-files=all -- .planning` path set consisting only of the current `.planning/REQUIREMENTS.md` add/modify plus those expected seed deletions. On any mismatch, stop without cleaning, staging, or rewriting history; keep rejected, unmatched, and unselected seeds unchanged.
  2. Replace the native requirements commit with `gsd_run query commit "docs: define milestone v[X.Y] requirements" --files .planning/REQUIREMENTS.md .planning/seeds`. OpenGSD 1.7 skips explicitly named missing paths, so never pass deleted seed file paths; the existing directory pathspec is required to stage the selected deletions. Never use an unscoped commit or the helper's merge fallback.
  3. After the helper commits, require an empty index and verify with `git diff-tree --no-commit-id --name-status -r HEAD` that the commit contains only the added/modified `.planning/REQUIREMENTS.md` and the expected deleted matching seed paths. Confirm rejected, unmatched, and unselected seeds remain unchanged; otherwise stop without cleaning or rewriting history.

## Final PR review
- Final pull-request review is performed by `@codex`.
- Before reviewing, read and use `skills/reviewing-metronome-prs/SKILL.md`.
- This is a read-only terminal gate and does not replace the native OpenGSD lifecycle.

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
