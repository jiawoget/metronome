# Requirements: Metronome v1.1 Repository Formatting Baseline

**Defined:** 2026-07-30
**Core Value:** Musicians can move from a score and practice target to a repeatable local practice-and-review loop without surrendering their recordings or practice data to a cloud service.

## v1.1 Requirements

Requirements for this tooling-only milestone. Every requirement maps to exactly one roadmap phase. Product behavior and post-ship release facts are intentionally excluded from phase requirement completion.

### Policy and Toolchain

- [ ] **POLICY-01**: Maintainers have one root `.gitattributes` policy that normalizes repository text to LF while explicitly preserving binary assets, generated outputs, and `.planning/deprecated/**` without reading or transforming quarantined contents.
- [ ] **TOOL-01**: Maintainers have one root `prettier.config.mjs` and one `.prettierignore` that preserve the repository's established style, configure the supported Tailwind v4 stylesheet integration, and exclude quarantined, binary, dependency, generated, and build-output paths.
- [ ] **TOOL-02**: The project pins exact compatible versions of Prettier and the Tailwind Prettier plugin from their official packages, exposes only `npm run format` and `npm run format:check` as public formatting commands, and introduces no second formatter, wrapper, custom validator, receipt, ledger, or lifecycle script.
- [ ] **EVID-01**: Before implementation, current native phase research verifies the selected formatter and plugin against official release/package identity, integrity, configuration, Tailwind v4 compatibility, and repository constraints; any material conflict stops for owner direction rather than being bypassed or silently downgraded.

### Mechanical Baseline

- [ ] **BASE-01**: One mechanical Prettier pass formats every allowed tracked Prettier-supported text file across source, tests, configuration, scripts, active planning, current documentation, and legacy documentation, while excluded and quarantined paths remain byte-untouched.
- [ ] **BASE-02**: The mechanical baseline commit contains formatter output only, with no product-semantic edit, dependency-policy change, enforcement edit, generated artifact, or manual cleanup mixed into it.
- [ ] **BASE-03**: Immediately after the baseline, `npm run format` is idempotent—a second run produces no tracked diff—and `npm run format:check` passes over the complete configured surface.

### Windows Runtime

- [ ] **WIN-01**: In a newly launched Windows shell, the intended supported `node`, `npm`, and `npx` resolve directly through user `PATH`; if a PATH edit is required it is one exact reversible append, and `scripts/npm-local.ps1` is removed only after the fresh-shell proof succeeds.
- [ ] **WIN-02**: After wrapper removal, repository scripts and the tracked pre-commit hook use the direct Node/npm toolchain successfully, with no fallback to a repository-local npm wrapper or an unresolved executable.

### Continuous Enforcement

- [ ] **ENF-01**: The tracked pre-commit hook runs `npm run format:check` before the existing lint, typecheck, unit, and build gates and fails closed on formatting drift without bypassing any existing gate.
- [ ] **ENF-02**: Ubuntu CI runs the same `npm run format:check` before lint, typecheck, unit tests, and build, so the canonical formatting contract is enforced consistently across Windows development and CI.
- [ ] **QUAL-01**: The final implementation revision passes `format:check`, a second-format no-diff check, lint, typecheck, the full unit suite, and build; Playwright/browser testing is not required because no product or UI behavior changes.

### History and Delivery

- [ ] **HIST-01**: The implementation history contains exactly three implementation commits with non-overlapping roles: policy/tooling, one repository-wide mechanical formatting pass, and enforcement; native planning, SUMMARY, verification, review, and ship metadata commits are excluded from this count.
- [ ] **DELIV-01**: The immutable reviewed implementation revision has complete evidence for allowed formatting scope, quarantine protection, Windows toolchain resolution, gate success, and clean version-control rollback, and is ready to enter native verification and shipping without any product migration or user repair.

## Milestone Release Exit

This section is explicitly outside Phase 1 requirement completion. Every gate below is conjunctive and remains pending until after implementation verification:

1. Run native `$gsd-ship` to create or prepare the formatting pull request.
2. After any ship-note or metadata update, resolve the actual final post-ship pull-request head.
3. Ensure Windows/local evidence and Ubuntu standard CI apply to that exact final head; re-run or refresh CI if the head changed or `[ci skip]` prevented coverage.
4. Obtain a mandatory finding-free, read-only `@codex` review of that exact final head.
5. Merge the GitHub pull request.
6. Update local `main` to the intended `origin/main` merge revision.
7. Verify `main == origin/main`, no `MERGE_HEAD`, an empty index, and empty `git status --porcelain=v1 --untracked-files=all` output.
8. Only after all prior gates pass, start a separately approved fresh R01 from the synchronized formatting baseline; do not import or consult deprecated R01 planning.

`verification.status=passed` and Phase 1 requirement completion do not prove this release exit.

## Future Requirements

- A fresh R01 milestone may be defined after the formatting release exit. Its target, research, requirements, and plan must be derived anew from the resulting `main`.
- The 32 dormant product capability seeds remain available only to a separately approved product milestone whose goals match their trigger conditions.

## Out of Scope

| Item | Reason |
|------|--------|
| Product, UI, domain, persistence, storage, audio, or service behavior changes | This milestone establishes repository presentation and enforcement only. |
| Reading, searching, indexing, mapping, summarizing, citing, importing, or formatting `.planning/deprecated/**` | The directory is an absolute quarantine for legacy lifecycle bytes. |
| Binary assets, dependency directories, generated outputs, build artifacts, and other explicitly ignored paths | These are not canonical Prettier inputs and must remain untouched. |
| A second formatter, custom validator, scanner, receipt, SHA ledger, controller, cache, or wrapper command | Native OpenGSD and the two public npm commands remain the sole lifecycle and formatting entrypoints. |
| More than one mechanical formatting pass | The baseline must be one reviewable mechanical commit; later runs verify idempotence only. |
| Dependency modernization beyond the exact formatter/plugin versions | Broader upgrades would mix unrelated risk into the baseline. |
| Playwright, browser, visual, microphone, or product UAT | No runtime product behavior is intentionally changed. |
| PR creation, merge, `main` synchronization, or the next R01 as Phase 1 requirements | These are post-verification release-exit facts, not implementation truth. |

## Traceability

Traceability is filled by the roadmapper. Every requirement must map to exactly one phase.

| Requirement | Phase | Status |
|-------------|-------|--------|
| POLICY-01 | TBD | Pending |
| TOOL-01 | TBD | Pending |
| TOOL-02 | TBD | Pending |
| EVID-01 | TBD | Pending |
| BASE-01 | TBD | Pending |
| BASE-02 | TBD | Pending |
| BASE-03 | TBD | Pending |
| WIN-01 | TBD | Pending |
| WIN-02 | TBD | Pending |
| ENF-01 | TBD | Pending |
| ENF-02 | TBD | Pending |
| QUAL-01 | TBD | Pending |
| HIST-01 | TBD | Pending |
| DELIV-01 | TBD | Pending |

**Coverage:**

- v1.1 requirements: 14 total
- Mapped to phases: 0
- Unmapped: 14

---
*Requirements defined: 2026-07-30*
