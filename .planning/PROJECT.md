# Metronome

## What This Is

Metronome is a local-first web application for musicians to run metronome practice, import and view sheet music, define measure grids and practice segments, record and review takes, and inspect local practice history. The existing browser application keeps user artifacts and metadata on the device; frozen legacy product contracts remain under [`docs/legacy/v1`](../docs/legacy/v1/) as historical evidence, while OpenGSD is the sole lifecycle and roadmap control plane.

## Core Value

Musicians can move from a score and practice target to a repeatable local practice-and-review loop without surrendering their recordings or practice data to a cloud service.

## Current Milestone: v1.1 Repository Formatting Baseline

**Goal:** Establish one deterministic repository-wide Prettier and LF baseline across supported text files without changing product behavior, then enforce that baseline consistently in Windows development and Ubuntu CI.

**Target outcomes:**

- Define the repository's canonical LF/text policy in root `.gitattributes`, with explicit binary and `.planning/deprecated/**` quarantine overrides.
- Reuse one root `prettier.config.mjs`, one `.prettierignore`, exact stable Prettier and Tailwind-plugin dependencies, and only the public commands `npm run format` and `npm run format:check`.
- Apply one repository-wide mechanical formatting pass to every allowed, non-generated, Prettier-supported text file, including source, tests, configuration, scripts, active planning, current documentation, and legacy documentation.
- Prove a fresh Windows shell resolves the intended `node`, `npm`, and `npx` directly from user `PATH`; remove `scripts/npm-local.ps1` only after that proof succeeds.
- Run `format:check` before the existing lint, typecheck, unit, and build gates in both the tracked pre-commit hook and Ubuntu CI.
- Keep implementation history reviewable as exactly three implementation commits: policy/tooling, the single mechanical formatting pass, and enforcement. Native planning, SUMMARY, verification, and ship metadata commits do not count as implementation commits.
- Complete native shipping and the separate exact-final-head release exit before starting a fresh R01 from the resulting synchronized `main`.

## Requirements

### Validated

- ✓ 32 evidence-backed product capabilities are retained in the shipped [`v1.0 requirements archive`](milestones/v1.0-REQUIREMENTS.md).

### Active

- Establish one explicit LF and Prettier policy for all allowed tracked repository text while preserving binary, generated, and quarantined bytes.
- Produce one idempotent repository-wide mechanical formatting baseline with no product-semantic edits.
- Make formatting drift fail locally and in Ubuntu CI before the repository's existing quality gates.
- Make the intended Node.js toolchain directly available in a fresh Windows shell without retaining a repository-specific npm wrapper after successful proof.
- Preserve auditable three-commit implementation roles and complete the separate native release exit on the actual final pull-request head.

### Deferred

- 32 unimplemented product capability contracts remain preserved as [native OpenGSD seeds](seeds/). None match this tooling-only milestone and all remain dormant and unchanged.
- A fresh R01 product/refactor milestone begins only after this formatting milestone has shipped, merged, and synchronized to clean `main`.

### Out of Scope

- Any product behavior, UI, persistence, storage, audio, domain, or service-contract change.
- Reading, searching, indexing, mapping, summarizing, citing, importing, hashing for evidence, or formatting `.planning/deprecated/**`.
- Formatting binary assets, generated outputs, dependency directories, build artifacts, or other explicitly ignored paths.
- A second formatter, custom validator, receipt, SHA ledger, lifecycle script, wrapper command, cache, controller, or parallel business path.
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
- **Quarantine:** `.planning/deprecated/**` is never consumed or transformed. Static ignore and attribute policy must protect it without scanning its contents.
- **Formatting ownership:** Prettier is the sole general-purpose formatter. The repository exposes only `format` and `format:check`; no alternate entrypoint or wrapper is added.
- **Mechanical baseline:** The baseline commit contains formatter output only. A second formatter run must produce no diff.
- **Implementation history:** The three implementation commits have non-overlapping roles: policy/tooling, mechanical baseline, enforcement. Lifecycle metadata is separate and does not change this implementation contract.
- **Windows runtime:** A fresh shell must resolve the intended `node`, `npm`, and `npx` directly. Any user-PATH edit is exact, single, reversible, and verified before `scripts/npm-local.ps1` is removed.
- **Quality:** Formatting checks precede the existing lint, typecheck, unit, and build gates locally and in Ubuntu CI. No Playwright gate is required.
- **Completion truth:** Phase completion does not prove release. The active goal remains incomplete until native shipping, exact-final-head CI, finding-free read-only `@codex` review, merge, and clean synchronized `main` all succeed.
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

## Evolution

The shipped v1.0 archive retains 32 validated capabilities, and the remaining 32 identities stay dormant as native seeds. The superseded R01 was never implemented and is no longer an active lifecycle input. Milestone v1.1 now establishes the repository formatting baseline; after it ships and `main` is synchronized, a separately approved fresh R01 may begin from that new baseline.

---
*Last updated: 2026-07-30 for the Repository Formatting Baseline milestone*
