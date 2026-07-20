# AGENTS

## Repository workflow
- Native OpenGSD is the sole project lifecycle entrypoint.
- Read `.planning/STATE.md` and `.planning/ROADMAP.md` before routing repository work.
- When state is `Awaiting next milestone` and the current roadmap has zero phases, start with `$gsd-new-milestone`.
- When a current milestone or phase exists, use `$gsd-next` or continue the already-active GSD phase.
- `.planning/config.json` injects `skills/metronome-policy/SKILL.md` only into its explicitly mapped OpenGSD subagents; it does not inject the policy into the `$gsd-new-milestone` controller or every lifecycle actor.
- `$gsd-new-milestone` controller rule: before approving or committing requirements derived from selected seeds, read the `Dormant seed promotion` section of `skills/metronome-policy/SKILL.md`; after approval, verify the exact legacy capability ID, feature key, and required behavior, delete each matching selected seed, and include `REQUIREMENTS.md` plus those deletions in the same requirements commit. Keep rejected, unmatched, and unselected seeds unchanged.

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
