# AGENTS

## Repository workflow
- Native OpenGSD is the sole project lifecycle entrypoint.
- Start project work with `$gsd-next`, or continue the already-active GSD phase.
- OpenGSD loads the project policy through `.planning/config.json`; do not load the policy manually.

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
