# Debt Gate Map

OpenGSD owns the project lifecycle and loads the project policy through `.planning/config.json`. This document is only a static map of existing quality entrypoints.

## Static and architectural checks

| Check | Local entrypoint | Configuration or implementation |
|---|---|---|
| Semgrep runner self-test | `npm run validate:debt-gates` | `scripts/run-metronome-semgrep-changed.selftest.mjs` |
| Semgrep changed files | `npm run lint:debt:changed` | `scripts/run-metronome-semgrep-changed.mjs`, `.semgrep/**` |
| XO changed files | `npm run lint:xo:changed` | `scripts/run-xo-changed.mjs`, `xo.config.js`, `.xo-suppressions.json` |
| CodeScene changed files | `npm run lint:codescene:changed` | `scripts/run-codescene-debt-changed.mjs`, `.codescene/quality-gate-policy.md` |

## Repository checks

| Check | Local entrypoint |
|---|---|
| ESLint | `npm run lint` |
| TypeScript | `npm run typecheck` |
| Unit tests | `npm run test:unit` |
| Production build | `npm run build` |

The local pre-commit hook runs the Semgrep runner self-test, changed-file Semgrep and XO checks, ESLint, typecheck, unit tests, and build. `.github/workflows/metronome-debt-gates.yml` runs the Semgrep changed-file path, typecheck, and lint in pull requests. CodeScene remains a separate review entrypoint.
