# Requirements: Metronome v1.1 Repository Formatting Baseline

**Defined:** 2026-07-30
**Core Value:** Musicians can move from a score and practice target to a repeatable local practice-and-review loop without surrendering their recordings or practice data to a cloud service.

## v1.1 Requirements

Requirements for this tooling-only milestone. Every requirement maps to exactly one roadmap phase. Product behavior and post-ship release facts are intentionally excluded from phase requirement completion.

### Policy and Toolchain

- [ ] **POLICY-01**: Maintainers have one root `.gitattributes` policy that normalizes allowed repository text to LF while explicitly preserving binary assets, generated outputs, and `.planning/**`; `.planning/deprecated/**` remains protected without reading or transforming quarantined contents.
- [ ] **TOOL-01**: Maintainers have one root `prettier.config.mjs` and one `.prettierignore` that preserve the repository's established style, configure the supported Tailwind v4 stylesheet integration, and exclude `.planning/**`, binary, dependency, generated, and build-output paths.
- [ ] **TOOL-02**: The project pins exact compatible versions of Prettier and the Tailwind Prettier plugin from their official packages, exposes only `npm run format` and `npm run format:check` as public formatting commands, and introduces no second formatter, new formatter wrapper, custom validator, receipt, ledger, or lifecycle script.
- [ ] **EVID-01**: Before implementation, current native phase research verifies the selected formatter and plugin against official release/package identity, integrity, configuration, Tailwind v4 compatibility, and repository constraints; in-scope conflicts are diagnosed and repaired in this phase, while only a material boundary change or unavailable external authority stops for owner direction.

### Mechanical Baseline

- [ ] **BASE-01**: One committed mechanical Prettier baseline formats every allowed tracked Prettier-supported text file across source, tests, configuration, scripts, current documentation, and legacy documentation, while `.planning/**`, excluded, and quarantined paths remain byte-untouched.
- [ ] **BASE-02**: The mechanical baseline commit contains formatter output only, with no product-semantic edit, dependency-policy change, enforcement edit, generated artifact, or manual cleanup mixed into it.
- [ ] **BASE-03**: Before the baseline is committed, formatter/configuration diagnosis continues until a fixed point is reached; immediately after the committed baseline, a second `npm run format` produces no tracked diff and `npm run format:check` passes over the complete configured surface.

### Windows Runtime

- [ ] **WIN-01**: Repository commands use an already available supported `node`/`npm` toolchain when present and otherwise use the existing `scripts/npm-local.ps1` bundled-runtime fallback; the phase performs no user- or system-PATH mutation.
- [ ] **WIN-02**: The tracked pre-commit hook resolves `npm` or `npm.cmd` first and falls back to `scripts/npm-local.ps1` through PowerShell when necessary, failing closed only when neither supported route exists.

### Continuous Enforcement

- [ ] **ENF-01**: The tracked pre-commit hook is a fast fail-closed gate that runs `git diff --cached --check` and, once the formatting policy exists in `HEAD`, `npm run format:check`; it does not repeat lint, typecheck, the full unit suite, or build on every commit.
- [ ] **ENF-02**: Ubuntu CI runs the same `npm run format:check` before lint, typecheck, unit tests, and build, so the canonical formatting contract is enforced consistently across Windows development and CI.
- [ ] **QUAL-01**: The frozen final implementation revision passes one complete local sequence of `format:check`, a second-format no-diff check, lint, typecheck, the full unit suite, and build; Playwright/browser testing is not required because no product or UI behavior changes.

### History and Delivery

- [ ] **HIST-01**: The implementation history keeps the repository-wide mechanical formatter output isolated from policy/tooling, enforcement, semantic edits, and lifecycle metadata, without treating an exact plan, task, or commit count as a correctness gate.
- [ ] **DELIV-01**: The immutable reviewed implementation revision has complete evidence for allowed formatting scope, quarantine protection, Windows toolchain resolution, gate success, and clean version-control rollback, and is ready to enter native verification and shipping without any product migration or user repair.

## Milestone Release Exit

This section is explicitly outside Phase 1 requirement completion. Every gate below is conjunctive and remains pending until after implementation verification:

1. Run native `$gsd-ship` to create or prepare the formatting pull request.
2. After any ship-note or metadata update, resolve the actual final post-ship pull-request head.
3. Freeze the candidate head, then ensure Windows/local evidence and Ubuntu standard CI apply to it; if the head changes, invalidate both CI and review and run one fresh pass on the replacement head.
4. Obtain a mandatory read-only `@codex` review of that exact final head with no unresolved actionable findings.
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
| A second formatter, custom validator, scanner, receipt, SHA ledger, controller, cache, or new formatter wrapper command | Native OpenGSD and the two public npm commands remain the sole lifecycle and formatting entrypoints; the existing Node/npm runtime fallback remains allowed. |
| More than one committed mechanical formatting baseline | Diagnostic runs may repeat until the formatter is stable, but only one isolated formatter-output baseline is committed. |
| Dependency modernization beyond the exact formatter/plugin versions | Broader upgrades would mix unrelated risk into the baseline. |
| Playwright, browser, visual, microphone, or product UAT | No runtime product behavior is intentionally changed. |
| PR creation, merge, `main` synchronization, or the next R01 as Phase 1 requirements | These are post-verification release-exit facts, not implementation truth. |

## Traceability

Every v1.1 requirement maps exactly once to the milestone's single independent phase.

| Requirement | Phase | Status |
|-------------|-------|--------|
| POLICY-01 | Phase 1 | Pending |
| TOOL-01 | Phase 1 | Pending |
| TOOL-02 | Phase 1 | Pending |
| EVID-01 | Phase 1 | Pending |
| BASE-01 | Phase 1 | Pending |
| BASE-02 | Phase 1 | Pending |
| BASE-03 | Phase 1 | Pending |
| WIN-01 | Phase 1 | Pending |
| WIN-02 | Phase 1 | Pending |
| ENF-01 | Phase 1 | Pending |
| ENF-02 | Phase 1 | Pending |
| QUAL-01 | Phase 1 | Pending |
| HIST-01 | Phase 1 | Pending |
| DELIV-01 | Phase 1 | Pending |

**Coverage:**

- v1.1 requirements: 14 total
- Mapped to phases: 14
- Unmapped: 0
- Duplicate mappings: 0

---
*Requirements defined: 2026-07-30*
