# Metronome

## What This Is

Metronome is a local-first web application for musicians to run metronome practice, import and view sheet music, define measure grids and practice segments, record and review takes, and inspect local practice history. The existing browser application keeps user artifacts and metadata on the device; frozen legacy product contracts remain under [`docs/legacy/v1`](../docs/legacy/v1/) as historical evidence, while OpenGSD is the sole lifecycle and roadmap control plane.

## Core Value

Musicians can move from a score and practice target to a repeatable local practice-and-review loop without surrendering their recordings or practice data to a cloud service.

## Current State: v1.1 Repository Formatting Baseline

**Validated milestone:** One deterministic repository-wide Prettier and LF baseline now covers supported text files without changing product behavior and is enforced consistently in Windows development and Ubuntu CI. Native phase verification passed; the release exit still governs final-head CI/review, merge, and local-main synchronization.

**Target outcomes:**

- Define the repository's canonical LF/text policy in root `.gitattributes`, with explicit binary, generated-output, and planning-lifecycle protection.
- Reuse one root `prettier.config.mjs`, one `.prettierignore`, exact stable Prettier and Tailwind-plugin dependencies, and only the public commands `npm run format` and `npm run format:check`; exclude `.planning/**` so native lifecycle writes cannot recursively invalidate the formatting baseline.
- Commit one idempotent mechanical formatting baseline for every other allowed, non-generated, Prettier-supported text file, including source, tests, configuration, scripts, current documentation, and legacy documentation.
- Keep the supported repository-local Node/npm runtime wrapper as a portable fallback; direct `node`, `npm`, and `npx` may be used when already available, but the phase does not mutate user or system `PATH`.
- Use a fast tracked pre-commit gate for staged whitespace and formatting drift; run format checking plus lint, typecheck, unit tests, and build once for the frozen final local candidate and in Ubuntu CI.
- Keep the mechanical formatter output isolated and reviewable without imposing an exact task or commit count on native planning and execution.
- Complete native shipping and the separate exact-final-head release exit before starting a fresh R01 from the resulting synchronized `main`.

## Requirements

### Validated

- ✓ 32 evidence-backed product capabilities are retained in the shipped [`v1.0 requirements archive`](milestones/v1.0-REQUIREMENTS.md).
- ✓ Milestone v1.1 Phase 1 validated all 14 formatting requirements: one LF/Prettier policy, an idempotent 341-file mechanical baseline, Windows runtime fallback, fast local enforcement, Ubuntu CI enforcement, and frozen-revision quality evidence.

### Active

- Complete the separate native release exit on the actual final pull-request head: ship, freeze the head, pass applicable CI, obtain a read-only `@codex` review with no unresolved actionable findings, merge, and synchronize a clean local `main`.

### Deferred

- 32 unimplemented product capability contracts remain preserved as [native OpenGSD seeds](seeds/). None match this tooling-only milestone and all remain dormant and unchanged.
- A fresh R01 product/refactor milestone begins only after this formatting milestone has shipped, merged, and synchronized to clean `main`.

### Out of Scope

- Any product behavior, UI, persistence, storage, audio, domain, or service-contract change.
- Reading, searching, indexing, mapping, summarizing, citing, importing, hashing for evidence, or formatting `.planning/deprecated/**`.
- Formatting binary assets, generated outputs, dependency directories, build artifacts, or other explicitly ignored paths.
- A second formatter, custom validator, receipt, SHA ledger, lifecycle script, new formatter wrapper command, cache, controller, or parallel business path.
- Playwright, browser, visual, or microphone testing; the milestone changes repository presentation and enforcement only.
- Combining formatting with dependency modernization beyond the exact formatter/plugin versions required for this baseline.
- Creating, planning, or integrating the next R01 before the formatting milestone's separate release exit is complete.

## Context

- Frozen legacy product contracts: [`docs/legacy/v1`](../docs/legacy/v1/)
- Imported capability-to-slice evidence: [`docs/legacy/v1/implementation-slices/product-feature-map.md`](../docs/legacy/v1/implementation-slices/product-feature-map.md)
- Completed history: 8 completed packs / 83 verified slices.
- Semantic capability truth: 32 archived Complete capabilities / 32 dormant unimplemented seeds.
- The archived Complete set and dormant seed set form the exact disjoint 64-capability baseline preserved from frozen [`docs/legacy/v1/status.json`](../docs/legacy/v1/status.json).
- The application is TypeScript/React/Next.js with browser-local persistence and explicit domain, service, and infrastructure boundaries.
- The superseded, unimplemented R01 lifecycle is retained only on local branch `deprecated/r01-canonical-formatting-20260725`; its planning bytes are quarantined there and are not inputs to this milestone.

## Constraints

- **Lifecycle:** Native OpenGSD owns milestone switching, discussion, research, planning, checking, execution, verification, state, recovery, and shipping. The project adds no controller around it.
- **Checkout:** `workflow.use_worktrees=false`; all work remains in the primary checkout. No Git worktree may be created or invoked.
- **Planning lifecycle:** `.planning/**` is outside the formatter surface. `.planning/deprecated/**` remains an absolute content quarantine and is never consumed or transformed.
- **Formatting ownership:** Prettier is the sole general-purpose formatter. The repository exposes only `format` and `format:check`; no alternate formatter entrypoint or new formatter wrapper is added.
- **Mechanical baseline:** The committed baseline contains formatter output only. Diagnostic formatter runs may repeat until the configuration reaches a fixed point; the committed result must be idempotent.
- **Implementation history:** Mechanical formatter output is isolated from semantic, policy, and enforcement edits; native task or commit count is not a gate.
- **Windows runtime:** Prefer direct supported `node`/`npm` when available and retain `scripts/npm-local.ps1` as the repository-local fallback. Do not alter user or system `PATH` for this phase.
- **Quality:** The fast pre-commit gate checks staged whitespace and formatting. The frozen final local candidate and Ubuntu CI run format checking, lint, typecheck, unit tests, and build. No Playwright gate is required.
- **Completion truth:** Phase completion does not prove release. The active goal remains incomplete until native shipping, exact-final-head CI, read-only `@codex` review with no unresolved actionable findings, merge, and clean synchronized `main` all succeed.
- **Local first:** Product storage and behavior remain unchanged throughout this tooling-only milestone.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Replace the unimplemented R01 with a standalone formatting milestone | The previous design crossed lifecycle and branch boundaries that native OpenGSD cannot safely own | ✓ Approved |
| Reuse v1.1 for the replacement milestone | v1.0 is the latest shipped milestone; the previous v1.1 never shipped and is quarantined as deprecated history | ✓ Approved |
| Reset roadmap numbering to Phase 1 | This is a fresh milestone-local lifecycle with one independent formatting phase | ✓ Approved |
| Keep `.planning/deprecated/**` as an absolute quarantine | Legacy planning must remain auditable without influencing current routing, research, formatting, or evidence | ✓ Approved |
| Use one root Prettier configuration and two public npm commands | A single canonical entrypoint prevents formatter and workflow drift | ✓ Approved |
| Separate phase requirements from release-exit facts | Native verification can prove the implementation before shipping; PR merge and synchronized `main` remain post-ship truth | ✓ Approved |
| Start a fresh R01 only after formatting release exit | The next lifecycle must inherit the merged canonical baseline from updated `main`, never deprecated planning | ✓ Approved |
| Exclude `.planning/**` from formatter enforcement | Native lifecycle files continue changing during planning, execution, verification, and shipping; including them creates recursive drift and repeated reformatting | ✓ Approved 2026-07-31 |
| Keep the repository-local Node/npm fallback | The bundled runtime satisfies the repository contract while global PATH mutation adds machine-wide risk and user confirmation overhead | ✓ Approved 2026-07-31 |
| Use bounded owner authorization and fast commit gates | Native research/check/verify remain, while routine confirmations and repeated full-suite runs no longer block each lifecycle commit | ✓ Approved 2026-07-31 |
| Disable product-domain capabilities for this tooling milestone | AI, UI, API, schema, security, post-plan gap, and pre-ship review layers add no evidence here; the next milestone must opt back in only where its scope needs them | ✓ Approved 2026-07-31 |
| Reuse exact-revision gate evidence | A single sequential plan has no merge-integration risk; repeating the same full suite immediately adds latency without new evidence unless the head, inputs, or execution topology changed | ✓ Approved 2026-07-31 |
| Keep milestone archival and release proof on one PR head | Generic lifecycle routing labels a milestone shipped before GitHub merge, while a second closeout PR would duplicate CI and review; capture phase evidence first, archive on the same branch, then freeze one final head | ✓ Approved 2026-08-01 |
| Do not treat preserved dormant product seeds as formatting-milestone gaps | The 32 seeds predate v1.1, are explicitly out of scope, and remain subject to separate owner authorization; re-acknowledging them at every tooling closeout adds no evidence | ✓ Approved 2026-08-01 |

## Evolution

The shipped v1.0 archive retains 32 validated capabilities, and the remaining 32 identities stay dormant as native seeds. The superseded R01 was never implemented and is no longer an active lifecycle input. Milestone v1.1 Phase 1 has now validated the repository formatting baseline; release remains pending until the exact final pull-request head passes CI and read-only review, merges, and local `main` is synchronized. A separately approved fresh R01 may begin only from that merged baseline.

---
*Last updated: 2026-08-01 after v1.1 milestone archival*
