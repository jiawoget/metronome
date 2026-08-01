---
phase: 02-release-assurance-workflow-closure
plan: 01
subsystem: repository-tooling
tags: [git-hooks, semver, web-crypto, native-opengsd, fixture-integrity]
requires:
  - phase: 01-repository-formatting-baseline
    provides: tracked fast hook, staged-snapshot formatting, and repository-local npm fallback
provides:
  - deterministic randomUUID precedence coverage for quick-recording identity
  - staged-engine-aware direct hook routing with conservative fallback
  - frozen-revision evidence for authority, PDF bytes, scope, and repository quality
affects: [repository-tooling, contributor-workflow, native-verification]
tech-stack:
  added: []
  patterns: [staged engine contract, exact candidate probe-and-invoke, immutable blob evidence]
key-files:
  created:
    - .planning/phases/02-release-assurance-workflow-closure/02-01-SUMMARY.md
  modified:
    - AGENTS.md
    - .planning/PROJECT.md
    - tests/unit/quick-metronome-session.test.ts
    - .githooks/pre-commit
key-decisions:
  - "Reuse the existing quick-recording implementation and characterize randomUUID precedence without changing production code."
  - "Authorize direct hook execution only when exact captured Node and priority npm candidates satisfy simple staged lower bounds; otherwise retain the existing PowerShell fallback."
  - "Treat Native lifecycle STATE preparation separately from the four-owner implementation range while constraining both ranges explicitly."
patterns-established:
  - "Staged contract first: route eligibility comes from :package.json, not an unstaged worktree manifest."
  - "Probe equals invoke: direct npm evidence and execution use the same canonical candidate path."
requirements-completed: [ID-01, ID-02, ID-03, HOOK-01, HOOK-02, HOOK-03, PDF-01, AUTH-01, FLOW-01, SCOPE-01]
coverage:
  - source: requirements
    id: ID-01
    evidence: "Focused and full unit runs pass the deterministic randomUUID-precedence test."
    automated: true
    human_judgment: false
  - source: requirements
    id: HOOK-01
    evidence: "Five compatible matrix cases pass with exact probe/invocation provenance."
    automated: true
    human_judgment: false
  - source: requirements
    id: HOOK-02
    evidence: "Thirteen fallback cases and one no-route failure pass with exact arguments and exit status."
    automated: true
    human_judgment: false
  - source: requirements
    id: PDF-01
    evidence: "Both raw worktree hashes equal HEAD and retain committed size/startxref invariants."
    automated: true
    human_judgment: false
  - source: requirements
    id: AUTH-01
    evidence: "PROJECT, STATE, ROADMAP, AGENTS, and parsed smart-entry agree on current Phase 2 Native routing."
    automated: true
    human_judgment: false
duration: 27m
completed: 2026-08-01
status: complete
---

# Phase 2 Plan 01: Release Assurance & Workflow Closure Summary

**Staged-engine-aware hook routing, deterministic secure-ID precedence, immutable PDF evidence, and coherent Native Phase 2 authority on one frozen revision.**

## Performance

- **Duration:** 27 minutes
- **Started:** 2026-08-01T05:25:29Z
- **Completed:** 2026-08-01T05:53:05Z
- **Tasks:** 3
- **Implementation files modified:** 4

## Accomplishments

- Reconciled active authority so v1.1 is shipped, v1.2 assurance is current, dormant product/R01 work remains excluded, and authorization stops after ordinary Native verification.
- Added deterministic proof that `crypto.randomUUID()` wins over `getRandomValues()` while preserving recording/artifact identity and leaving production session code byte-identical.
- Qualified the existing fast hook's direct route against simple staged Node/npm lower bounds, exact stable candidate versions, and exact probe/invocation paths while preserving its existing PowerShell fallback and snapshot boundary.
- Passed a 19-case external route matrix plus the real staged-snapshot integration, bound every result to frozen hook blob `d693c73bd72b27e8cc78a75518c858453275851c`, then removed the exact temporary root.
- Froze candidate `1d30909292280a3e2fac471c9aca0697ae3709f6` and passed format, lint, typecheck, the full unit suite, and build once on that unchanged revision.

## Task Commits

1. **Task 1: Reconcile authority and prove one secure-ID-to-hook route end to end** - `1d30909` (`fix`)
2. **Task 2: Expand the controlled route matrix and preserve the complete hook boundary** - evidence-only; Task 1 implementation passed without another durable correction, so no empty commit was created.
3. **Task 3: Prove immutable scope and hand the frozen revision to Native verification** - evidence/summary-only; no implementation file changed.

## Route Matrix Evidence

All non-failure rows forwarded `--prefix SNAPSHOT_ROOT run format:check`; all rows removed their staged-index snapshot, had no residue, and recorded the frozen hook blob above. Direct rows used identical npm probe/invocation paths. Declaration-rejection rows did not probe candidates.

| Case | Staged engines | Candidate tuple | Route |
| --- | --- | --- | --- |
| exact-minimum | Node `>=24.0.0`; npm `>=11.17.0` | `v24.0.0`; npm `11.17.0` | direct `npm` |
| higher-same-major | Node `>=24.0.0`; npm `>=11.17.0` | `v24.17.0`; npm `11.17.1` | direct `npm` |
| higher-major | Node `>=24.0.0`; npm `>=11.17.0` | `v25.0.0`; npm `12.0.0` | direct `npm` |
| missing-node-fallback | Node `>=24.0.0`; npm `>=11.17.0` | Node absent; npm `11.17.0` | fallback `powershell` |
| npm-cmd-only-direct | Node `>=24.0.0`; npm `>=11.17.0` | `v24.17.0`; npm absent; npm.cmd `11.17.1` | direct `npm.cmd` |
| pwsh-only-fallback | Node `>=24.0.0`; npm `>=11.17.0` | `v23.99.99`; npm `11.16.9` | fallback `pwsh` |
| too-old-node | Node `>=24.0.0`; npm `>=11.17.0` | `v23.99.99`; npm `11.17.0` | fallback `powershell` |
| too-old-npm | Node `>=24.0.0`; npm `>=11.17.0` | `v24.17.0`; npm `11.16.9` | fallback `powershell` |
| malformed-candidate-version | Node `>=24.0.0`; npm `>=11.17.0` | `v24.17.0`; npm `npm-11.17.0` | fallback `powershell` |
| prerelease-candidate-version | Node `>=24.0.0`; npm `>=11.17.0` | Node `v25.0.0-rc.1`; npm `11.17.0` | fallback `powershell` |
| failed-candidate-probe | Node `>=24.0.0`; npm `>=11.17.0` | `v24.17.0`; npm probe exit 7 | fallback `powershell` |
| missing-direct-command | Node `>=24.0.0`; npm `>=11.17.0` | `v24.17.0`; npm/npm.cmd absent | fallback `powershell` |
| missing-engine-declaration | Node absent; npm `>=11.17.0` | compatible candidates not probed | fallback `powershell` |
| duplicate-engine-declaration | Node `>=24.0.0`; npm twice | compatible candidates not probed | fallback `powershell` |
| compound-engine-range | Node `>=24.0.0 <25.0.0`; npm `>=11.17.0` | compatible candidates not probed | fallback `powershell` |
| unsupported-engine-range | Node `>=24.0.0`; npm `^11.17.0` | compatible candidates not probed | fallback `powershell` |
| fallback-success | Node `>=24.0.0`; npm `>=11.17.0` | `v23.99.99`; npm `11.16.9` | fallback `powershell`, exit 0 |
| no-route | Node `>=24.0.0`; npm `>=11.17.0` | all direct candidates absent; no shell fallback | failure, actionable exit 1 |
| competing-npm-forms | Node `>=24.0.0`; npm `>=11.17.0` | `v24.17.0`; npm `11.17.1`; npm.cmd `12.0.0` | direct priority `npm` |

## Immutable Scope and Fixture Evidence

- **Plan implementation base:** `f8b13e6b52c658eebb1138bd74223698dc25e283`
- **Native plan-preparation commit / implementation parent:** `4737b4334c8662df632211fba01a8ac31b96e691`
- **Frozen implementation revision:** `1d30909292280a3e2fac471c9aca0697ae3709f6`
- **Exact implementation diff:** `.githooks/pre-commit`, `.planning/PROJECT.md`, `AGENTS.md`, `tests/unit/quick-metronome-session.test.ts`
- **Native preparation provenance:** the wider plan-base range adds only `.planning/STATE.md` from `4737b43` beyond those four implementation owners.

| Preserved owner | Frozen blob | Invariant |
| --- | --- | --- |
| `package.json` | `3b40cb7e6d717cc63b49e36bf197417e4d854ecb` | unchanged |
| `package-lock.json` | `8d6f781ac3185cfe80a21ce755ac5d30c40eb191` | unchanged |
| `scripts/npm-local.ps1` | `76e0403502ec988b7a70cb46f896aaf380132a2c` | unchanged |
| `src/lib/quick-metronome/session.ts` | `aba2b5e887064d7234d24d4970e307a8bdf10fde` | unchanged |
| `.gitattributes` | `4748c13fb4850c045ff512b18d7641e80209cf11` | unchanged |
| `test-fixtures/sheets/real-sheet.pdf` | `2c2bf826458ee864821b0942e8cc2172e756ad0a` | 598 bytes; `%PDF-1.4`; one `startxref` 415 pointing to `xref`; raw worktree = HEAD |
| `test-fixtures/sheets/two-page-sheet.pdf` | `8d48ef4af67dcbeaba5e617d3a1023276e612f71` | 936 bytes; `%PDF-1.4`; one `startxref` 713 pointing to `xref`; raw worktree = HEAD |

Both PDF paths also had empty staged and unstaged diffs.

## Verification Evidence

| Gate | Result |
| --- | --- |
| Focused quick-metronome owner | PASS, 19 tests |
| Git Bash hook syntax | PASS |
| Tracer exact-minimum / too-old-node routes | PASS |
| Complete external hook matrix | PASS, 19 independent cases |
| Real tracked-hook staged-snapshot integration | PASS |
| Parsed Native `smart-entry --json` | PASS: situation `executing`, recommendation `progress-next`, current/incomplete Phase 2, no release/ship/complete-milestone route |
| Authority assertions | PASS across PROJECT, STATE, ROADMAP, and AGENTS |
| `npm run format:check` | PASS |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| Full `npm run test:unit` | PASS |
| `npm run build` | PASS |
| Frozen HEAD / non-planning cleanliness | PASS; HEAD unchanged and only expected Native planning mutations remain |
| Temporary matrix cleanup | PASS; `C:\tmp\metronome-phase-02-hook-matrix` absent after all gates |

## Decisions Made

- Kept secure-ID production behavior in its existing owner; the new deterministic test establishes the primary branch contract without parallel logic.
- Kept the existing hook, wrapper, staged snapshot, format-only boundary, and fallback ordering; only direct-route eligibility and exact candidate capture were extended.
- Parsed only one simple stable `>=MAJOR.MINOR.PATCH` per staged engine field. Missing, duplicate, compound, unsupported, malformed, prerelease, failed, absent, or too-old evidence fails closed to the existing fallback.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected Task 3 verifier assumptions about Native formatting and provenance**

- **Found during:** Task 3 frozen-revision preflight
- **Issue:** The literal plan assertion expected `Phase 2`, while Native STATE records `Phase 02`; the plan-base range also legitimately contained the pre-executor Native STATE plan-preparation commit, so it could not equal only the four implementation owners.
- **Fix:** Accepted the equivalent zero-padded Native phase form, required the implementation parent to equal captured plan commit `4737b43`, enforced exactly four owners on `4737b43..1d30909`, and independently constrained `f8b13e6..1d30909` to those four plus `.planning/STATE.md`.
- **Files modified:** None; verification logic only. Broken-windows entry 2 was recorded and marked fixed.
- **Commit:** N/A

## Authentication Gates

None.

## Known Stubs

None. Diff scanning found only intentional empty shell-variable initialization in the hook and no placeholder UI/data behavior, TODO/FIXME, or skipped tests.

## Issues Encountered

- The external evidence runner needed harness-only parser/count and Windows `npm.cmd` sentinel corrections while developing the required matrix. No runner file entered the repository, all cases were rerun after the harness correction, and the exact external root was removed only after Task 3 passed.

## User Setup Required

None.

## Next Phase Readiness

- The frozen implementation and provenance are ready for the ordinary Native `gsd-verifier` to create `02-VERIFICATION.md`.
- Per active authority, that verification result is the authorization endpoint; shipping, PR, review/CI, merge, tag, archival, synchronization, product work, dormant-seed activation, and R01 remain outside this executor's scope.

## Self-Check: PASSED

- All four modified owners and this summary exist.
- Task commit `1d30909292280a3e2fac471c9aca0697ae3709f6` exists.
- Summary frontmatter is marked `status: complete`.
- The exact temporary matrix root is absent after successful verification.
