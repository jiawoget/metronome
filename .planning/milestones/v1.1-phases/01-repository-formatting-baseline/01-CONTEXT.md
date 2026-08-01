# Phase 1: Repository Formatting Baseline - Context

**Gathered:** 2026-07-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish one deterministic LF and Prettier baseline for every allowed, tracked, Prettier-supported repository text file outside `.planning/**`; preserve a reliable direct-or-repository-local Windows Node/npm route; and enforce formatting through a fast local commit gate plus the existing Ubuntu CI quality sequence. This phase changes repository presentation and enforcement only. It must not change product behavior, consume quarantined planning, create a parallel workflow, or begin the next R01.

</domain>

<decisions>
## Implementation Decisions

### Lifecycle and quarantine
- **D-01:** This is a fresh, standalone v1.1 formatting milestone created from current `main`. The superseded R01 is deprecated and is not repaired, imported, or used as evidence.
- **D-02:** `.planning/deprecated/**` is an absolute quarantine. Formatting tools, research, planning, codebase maps, searches, evidence collection, and validation must not read, search, index, summarize, cite, hash, or transform its contents.
- **D-03:** Native OpenGSD exclusively owns discussion, research, planning, checking, execution, verification, recovery, and shipping. No repository controller, validator, receipt, retry layer, scanner, graph, cache, database, or telemetry system may be added around it.
- **D-04:** Work remains in the primary checkout with `workflow.use_worktrees=false`; no Git worktree may be created or invoked.
- **D-04a:** The owner's 2026-07-31 instruction authorizes this bounded phase through native research, planning, execution, verification, and in-scope repair. Routine stage confirmations and “defer because difficult” exits are not gates; stop only for a material boundary change, global/irreversible action, missing external authority, or a high-impact blocker that cannot be safely repaired within scope.

### Formatting policy and toolchain
- **D-05:** Add one root `.gitattributes` LF policy with explicit binary, generated-output, and quarantine protection.
- **D-06:** Keep one root `prettier.config.mjs` and one `.prettierignore`. Prettier is the sole general-purpose formatter, and the only public formatting commands are `npm run format` and `npm run format:check`.
- **D-07:** Preserve the repository's established formatting style unless official compatibility requirements demand a narrowly documented change. The Tailwind plugin must use its supported Tailwind v4 stylesheet integration.
- **D-08:** Pin exact compatible stable versions of Prettier and `prettier-plugin-tailwindcss`. Native phase research must verify official package identity, release/version status, integrity/provenance, configuration syntax, and Tailwind v4 compatibility before planning approves implementation.

### Mechanical baseline and history
- **D-09:** Format the complete allowed surface, not a small hand-picked file set: source, tests, configuration, scripts, current documentation, and legacy documentation, plus any other allowed tracked file type that Prettier officially supports. Exclude all `.planning/**` lifecycle files so planning, SUMMARY, verification, and shipping writes cannot create recursive formatting drift.
- **D-10:** Commit exactly one isolated repository-wide mechanical formatting baseline. Diagnostic formatter runs may repeat until the configuration reaches a fixed point; the baseline commit contains formatter output only—no manual cleanup, dependency edit, policy edit, enforcement edit, generated artifact, or semantic product change.
- **D-11:** A second formatting run is verification only and must produce no tracked diff; `format:check` must then pass over the same complete surface.
- **D-12:** Keep the mechanical baseline in its own commit, separate from policy/tooling, enforcement, semantic edits, and lifecycle metadata. Native planning decides task shape; an exact plan, task, or total commit count is not a correctness gate.

### Windows runtime
- **D-13:** Use direct supported `node`, `npm`, and `npx` when they are already available. Otherwise use the existing repository-local Node 24/Corepack route in `scripts/npm-local.ps1`; do not mutate user or system `PATH` for this phase.
- **D-14:** Retain `scripts/npm-local.ps1` as the supported portable fallback. Repository scripts remain ordinary npm scripts; the tracked hook resolves direct npm first and the wrapper second.

### Enforcement and evidence
- **D-15:** A repository-tracked pre-commit hook must fail fast with `git diff --cached --check` and, after the formatting policy exists in `HEAD`, `npm run format:check`. Lint, typecheck, the full unit suite, and build run once for the frozen final local candidate and in Ubuntu CI instead of on every commit.
- **D-16:** Ubuntu CI must run the same `format:check` before lint, typecheck, unit tests, and build.
- **D-17:** Final phase evidence covers allowed formatting scope, quarantine protection, a no-diff second format, supported direct-or-existing-wrapper Windows runtime resolution, all existing non-browser quality gates, and clean Git rollback/reviewability. Playwright, browser, visual, microphone, and product UAT are out of scope.

### Release boundary
- **D-18:** Phase verification does not prove release. Native shipping, exact-final-PR-head CI, a read-only `@codex` review of that same frozen head with no unresolved actionable findings, merge, and clean synchronized `main` are separate conjunctive release-exit facts.
- **D-19:** A fresh R01 may start only after the formatting release exit succeeds, from the resulting synchronized `main`, with new research and planning and no deprecated R01 input.

### the agent's Discretion
- Select the exact stable formatter/plugin versions and supported Tailwind v4 configuration only after the required official-source research.
- Define the precise allowed Prettier CLI patterns and ignore/attribute rules, provided they cover every approved tracked text surface outside `.planning/**` without traversing or consuming the quarantine.
- Choose the repository path and activation details for the tracked pre-commit hook. The solution must prefer direct npm, retain the existing local runtime fallback, introduce no extra public formatting command or formatter wrapper, and replace the current untracked local-only hook behavior.
- Choose exact verification commands, evidence formatting, and commit messages while preserving an isolated mechanical baseline and the bounded final gates.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Native lifecycle and scope
- `.planning/PROJECT.md` — milestone goal, corrected efficiency constraints, out-of-scope boundaries, and release-exit separation.
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
- `scripts/npm-local.ps1` — supported repository-local runtime fallback that remains available when direct npm is absent.

### Enforcement
- `.github/workflows/ci.yml` — current Ubuntu sequence: install, lint, typecheck, unit tests, and build.
- `.git/hooks/pre-commit` — legacy local-only heavy hook behavior to replace with the tracked fast hook; this path is not tracked and `core.hooksPath` is initially unset.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `prettier.config.mjs`: already establishes semicolons, double quotes, no trailing commas, and the Tailwind plugin; Phase 1 should extend this single owner rather than add another formatter configuration.
- `src/app/globals.css`: existing Tailwind v4 entry stylesheet (`@import "tailwindcss"` plus the project config) is the live integration target to validate against official plugin guidance.
- `.github/workflows/ci.yml`: existing ordered Ubuntu quality pipeline can receive one preceding format-check step without replacing its gates.
- `.git/hooks/pre-commit`: its runtime-resolution logic is reusable, but its full lint/typecheck/unit/build sequence is intentionally moved out of the per-commit path.

### Established Patterns
- `package.json` declares `npm@11.17.0`, Node `>=24.0.0`, and npm `>=11.17.0`; `.nvmrc` selects Node 24 and `.npmrc` enforces engines.
- `package.json` currently has no `format` or `format:check` script. Its formatter ranges are `prettier: ^3.8.4` and `prettier-plugin-tailwindcss: ^0.8.0`; the live lockfile resolves Prettier 3.9.5 and the plugin 0.8.0, so exact-version selection remains a research decision rather than an assumption.
- The existing Prettier config has no Tailwind v4 stylesheet option. `.gitattributes` and `.prettierignore` are currently absent.
- The current user PATH does not resolve the required runtime in this shell. `scripts/npm-local.ps1` already injects a repository-local Node 24.17.0/Corepack runtime and npm 11.17.0, so it is retained instead of triggering a machine-wide environment mutation.
- The current pre-commit hook exists only under `.git/hooks/pre-commit`; no `core.hooksPath` is configured and no tracked hook directory exists.
- Codebase-map documents are navigation caches dated 2026-07-25. Material facts above were rechecked against live files and commands.

### Integration Points
- Policy/tooling changes: `.gitattributes`, `.prettierignore`, `prettier.config.mjs`, `package.json`, and `package-lock.json`.
- Mechanical baseline commit: every allowed tracked Prettier-supported file, explicitly excluding `.planning/**`, generated, binary, dependency, and output paths.
- Enforcement changes: tracked fast pre-commit hook, `.github/workflows/ci.yml`, repository-local hook activation, and narrowly necessary setup documentation; `scripts/npm-local.ps1` remains unchanged.

</code_context>

<specifics>
## Specific Ideas

- Treat formatting as a repository baseline, not a cleanup of only the previously noticed files.
- Keep the formatting entrypoint singular and unsurprising: two npm commands backed directly by Prettier.
- Make the huge mechanical diff independently reviewable in its own commit; do not require a fixed total count for surrounding native work.
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
