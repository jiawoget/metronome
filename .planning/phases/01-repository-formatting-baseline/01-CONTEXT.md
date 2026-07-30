# Phase 1: Repository Formatting Baseline - Context

**Gathered:** 2026-07-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish one deterministic LF and Prettier baseline for every allowed, tracked, Prettier-supported repository text file; prove direct Windows Node/npm/npx use; and enforce formatting before the existing local and Ubuntu CI quality gates. This phase changes repository presentation and enforcement only. It must not change product behavior, consume quarantined planning, create a parallel workflow, or begin the next R01.

</domain>

<decisions>
## Implementation Decisions

### Lifecycle and quarantine
- **D-01:** This is a fresh, standalone v1.1 formatting milestone created from current `main`. The superseded R01 is deprecated and is not repaired, imported, or used as evidence.
- **D-02:** `.planning/deprecated/**` is an absolute quarantine. Formatting tools, research, planning, codebase maps, searches, evidence collection, and validation must not read, search, index, summarize, cite, hash, or transform its contents.
- **D-03:** Native OpenGSD exclusively owns discussion, research, planning, checking, execution, verification, recovery, and shipping. No repository controller, validator, receipt, retry layer, scanner, graph, cache, database, or telemetry system may be added around it.
- **D-04:** Work remains in the primary checkout with `workflow.use_worktrees=false`; no Git worktree may be created or invoked.

### Formatting policy and toolchain
- **D-05:** Add one root `.gitattributes` LF policy with explicit binary, generated-output, and quarantine protection.
- **D-06:** Keep one root `prettier.config.mjs` and one `.prettierignore`. Prettier is the sole general-purpose formatter, and the only public formatting commands are `npm run format` and `npm run format:check`.
- **D-07:** Preserve the repository's established formatting style unless official compatibility requirements demand a narrowly documented change. The Tailwind plugin must use its supported Tailwind v4 stylesheet integration.
- **D-08:** Pin exact compatible stable versions of Prettier and `prettier-plugin-tailwindcss`. Native phase research must verify official package identity, release/version status, integrity/provenance, configuration syntax, and Tailwind v4 compatibility before planning approves implementation.

### Mechanical baseline and history
- **D-09:** Format the complete allowed surface, not a small hand-picked file set: source, tests, configuration, scripts, active planning, current documentation, and legacy documentation, plus any other allowed tracked file type that Prettier officially supports.
- **D-10:** Apply exactly one repository-wide mechanical formatting pass. The baseline commit contains formatter output only—no manual cleanup, dependency edit, policy edit, enforcement edit, generated artifact, or semantic product change.
- **D-11:** A second formatting run is verification only and must produce no tracked diff; `format:check` must then pass over the same complete surface.
- **D-12:** Implementation history has exactly three non-overlapping implementation commits: (1) policy/tooling, (2) the single mechanical baseline, and (3) enforcement. Native planning, SUMMARY, verification, review, and ship metadata commits are outside that count.

### Windows runtime
- **D-13:** A newly launched Windows shell must resolve the intended supported `node`, `npm`, and `npx` directly from user `PATH`. If a PATH edit is needed, perform one exact reversible append and verify the fresh-shell result.
- **D-14:** Remove `scripts/npm-local.ps1` only after direct fresh-shell resolution and repository command execution succeed. The final hook and repository scripts must not fall back to that wrapper.

### Enforcement and evidence
- **D-15:** A repository-tracked pre-commit hook must run `npm run format:check` before lint, typecheck, the full unit suite, and build, failing closed on formatting drift without bypassing any existing gate.
- **D-16:** Ubuntu CI must run the same `format:check` before lint, typecheck, unit tests, and build.
- **D-17:** Final phase evidence covers allowed formatting scope, quarantine protection, a no-diff second format, direct Windows runtime resolution, all existing non-browser quality gates, and clean Git rollback/reviewability. Playwright, browser, visual, microphone, and product UAT are out of scope.

### Release boundary
- **D-18:** Phase verification does not prove release. Native shipping, exact-final-PR-head CI, a finding-free read-only `@codex` review of that same head, merge, and clean synchronized `main` are separate conjunctive release-exit facts.
- **D-19:** A fresh R01 may start only after the formatting release exit succeeds, from the resulting synchronized `main`, with new research and planning and no deprecated R01 input.

### the agent's Discretion
- Select the exact stable formatter/plugin versions and supported Tailwind v4 configuration only after the required official-source research.
- Define the precise allowed Prettier CLI patterns and ignore/attribute rules, provided they cover every approved tracked text surface without traversing or consuming the quarantine.
- Choose the repository path and activation details for the tracked pre-commit hook. The solution must use direct npm, introduce no extra public formatting command or wrapper, and replace the current untracked local-only hook behavior.
- Choose exact verification commands, evidence formatting, and commit messages while preserving the three implementation roles and all locked gates.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Native lifecycle and scope
- `.planning/PROJECT.md` — milestone goal, constraints, out-of-scope boundaries, and release-exit separation.
- `.planning/REQUIREMENTS.md` — all 14 Phase 1 requirements and their acceptance boundaries.
- `.planning/ROADMAP.md` — the single-phase milestone goal and success criteria.
- `.planning/STATE.md` — current native lifecycle position and active phase.
- `.planning/config.json` — worktree policy, native model routing, effort tiers, and injected repository contract.
- `AGENTS.md` — sole-entrypoint, quarantine, runtime dispatch, Git-hook, and release-exit rules.
- `skills/metronome-policy/SKILL.md` — reuse-first evidence contract and prohibition on parallel lifecycle infrastructure.

### Formatter and runtime baseline
- `package.json` — current Node/npm contract, scripts, dependency ranges, and existing quality commands.
- `package-lock.json` — installed formatter, plugin, Tailwind package identities, exact versions, resolved artifacts, and integrity data to verify against official sources.
- `prettier.config.mjs` — existing style choices and current Tailwind plugin registration.
- `.gitignore` — existing dependency, generated-output, test-output, audit, and local-environment exclusions.
- `.nvmrc` — CI Node major selection.
- `.npmrc` — strict engine enforcement.
- `src/app/globals.css` — Tailwind v4 stylesheet entrypoint used by the formatter plugin integration.
- `scripts/npm-local.ps1` — current repository-local runtime fallback that may be removed only after fresh-shell direct-tool proof.

### Enforcement
- `.github/workflows/ci.yml` — current Ubuntu sequence: install, lint, typecheck, unit tests, and build.
- `.git/hooks/pre-commit` — current local-only hook behavior to migrate; this path is not tracked and `core.hooksPath` is currently unset.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `prettier.config.mjs`: already establishes semicolons, double quotes, no trailing commas, and the Tailwind plugin; Phase 1 should extend this single owner rather than add another formatter configuration.
- `src/app/globals.css`: existing Tailwind v4 entry stylesheet (`@import "tailwindcss"` plus the project config) is the live integration target to validate against official plugin guidance.
- `.github/workflows/ci.yml`: existing ordered Ubuntu quality pipeline can receive one preceding format-check step without replacing its gates.
- `.git/hooks/pre-commit`: existing fail-closed lint/typecheck/unit/build sequence is useful behavior to preserve while moving ownership into a tracked repository path and removing wrapper fallback.

### Established Patterns
- `package.json` declares `npm@11.17.0`, Node `>=24.0.0`, and npm `>=11.17.0`; `.nvmrc` selects Node 24 and `.npmrc` enforces engines.
- `package.json` currently has no `format` or `format:check` script. Its formatter ranges are `prettier: ^3.8.4` and `prettier-plugin-tailwindcss: ^0.8.0`; the live lockfile resolves Prettier 3.9.5 and the plugin 0.8.0, so exact-version selection remains a research decision rather than an assumption.
- The existing Prettier config has no Tailwind v4 stylesheet option. `.gitattributes` and `.prettierignore` are currently absent.
- The current user PATH contains only WindowsApps for this purpose, and `node`, `npm`, and `npx` do not resolve in the active shell. `scripts/npm-local.ps1` instead injects a repository-local Node 24.17.0/Corepack runtime.
- The current pre-commit hook exists only under `.git/hooks/pre-commit`; no `core.hooksPath` is configured and no tracked hook directory exists.
- Codebase-map documents are navigation caches dated 2026-07-25. Material facts above were rechecked against live files and commands.

### Integration Points
- Policy/tooling commit: `.gitattributes`, `.prettierignore`, `prettier.config.mjs`, `package.json`, and `package-lock.json`.
- Mechanical baseline commit: every allowed tracked Prettier-supported file, explicitly excluding generated, binary, dependency, output, and quarantined paths.
- Enforcement commit: tracked pre-commit hook, `.github/workflows/ci.yml`, direct-runtime cleanup including `scripts/npm-local.ps1`, and narrowly necessary setup documentation.

</code_context>

<specifics>
## Specific Ideas

- Treat formatting as a repository baseline, not a cleanup of only the previously noticed files.
- Keep the formatting entrypoint singular and unsurprising: two npm commands backed directly by Prettier.
- Make the huge mechanical diff independently reviewable by isolating it between policy/tooling and enforcement commits.
- Preserve deprecated bytes by policy and exclusion without treating them as research or evidence.

</specifics>

<deferred>
## Deferred Ideas

- A fresh R01 product/refactor milestone after the exact-final-head release exit and synchronized clean `main`.
- All product behavior, UI, persistence, storage, audio, domain, and service changes.
- All 32 dormant product capability seeds; none match this tooling-only milestone.
- Browser, Playwright, visual, microphone, and product UAT.

</deferred>

---

*Phase: 1-repository-formatting-baseline*
*Context gathered: 2026-07-30*
