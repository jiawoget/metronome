# Project Research Summary

**Project:** Metronome — v1.2 Release Assurance & Workflow Closure
**Domain:** Bounded release assurance for an existing local-first TypeScript web application on Windows/Git Bash
**Researched:** 2026-08-01
**Confidence:** HIGH

## Executive Summary

Metronome v1.2 is an assurance milestone, not a product milestone. The application and its secure quick-recording identity behavior already exist; the work is to place the merged tree under coherent Native OpenGSD authority, characterize the approved Web Crypto branch order, repair one confirmed pre-commit runtime-selection defect, and prove that restored binary fixtures remain byte-identical to Git HEAD. Experts should implement this as one bounded phase and one sequential plan across existing owners rather than introduce new services, wrappers, dependencies, controllers, or release machinery.

The only production/tooling behavior that should change is direct runtime eligibility inside `.githooks/pre-commit`: a captured Node plus `npm`/`npm.cmd` pair may run only when both stable versions satisfy the staged `package.json` engine minima. Every missing, malformed, prerelease, too-old, or unsupported-range case must reuse the existing `scripts/npm-local.ps1` route when available and otherwise fail closed. The hook's staged-index snapshot, cleanup, whitespace check, `.planning/**` exclusion, argument forwarding, and fast `format:check` boundary must remain intact. The secure quick-recording implementation and both valid PDF fixtures should have no production-content diff.

The main risks are scope creep, stale lifecycle prose, incorrect shell version comparison, probe/invocation mismatch on Windows, and confusing worktree state with staged or Git-object truth. Mitigate them by reconciling active authority before implementation, resolving and invoking the same executable pair, reading engine requirements from staged content, testing a controlled route matrix, preserving test-global cleanup, comparing raw fixture blob IDs to `HEAD`, and ending the authorization at ordinary Native OpenGSD verification. Shipping, PR creation, final-head review/CI, merge, tag, and local-main synchronization remain explicitly outside v1.2.

## Key Findings

### Recommended Stack

Keep the existing stack and ownership boundaries. No installation, lockfile change, formatter change, runtime manager, UUID package, checksum manifest, or lifecycle sidecar is justified. The bounded shell comparator should support only the repository's current stable `>=MAJOR.MINOR.PATCH` engine shape and fall back conservatively for anything it cannot prove compatible.

**Core technologies:**

- **Node.js:** direct candidates must satisfy `>=24.0.0`; the existing fallback supplies `24.17.0` — validate the exact executable before direct use.
- **npm:** direct `npm`/`npm.cmd` must satisfy `>=11.17.0`; the existing Corepack fallback supplies exactly `11.17.0` — command presence alone is insufficient.
- **Git Bash and Git plumbing:** retain the tracked pre-commit owner, staged-index snapshot, binary attributes, and Git object IDs — these already define the correct commit and fixture boundaries.
- **Windows PowerShell plus `scripts/npm-local.ps1`:** preserve the verified `powershell`, then `pwsh`, fallback with quoted array forwarding and process-local environment changes only.
- **Web Crypto:** retain `crypto.randomUUID()`, then 16 bytes from `crypto.getRandomValues()`, then throw — no weak fallback or new abstraction.
- **Vitest 4.1.9:** add at most one deterministic precedence test in the existing quick-metronome unit file and retain `vi.unstubAllGlobals()` isolation.
- **Prettier 3.9.5 with Tailwind plugin 0.8.0:** continue using only the existing `npm run format:check` staged-snapshot gate.

**Critical version requirements:**

- Compare major, minor, and patch numerically; reject malformed output and prereleases, ignore valid build metadata, and remove only Node's single leading `v` plus CR/LF.
- Read the engine contract from staged `package.json` content. Missing, duplicate, compound, or otherwise unsupported ranges must not authorize a direct route.
- Do not depend on the transitive `semver` package; it is not a declared root contract and would still require trusting a candidate Node runtime.

See [STACK.md](STACK.md) for the complete route matrix and compatibility rationale.

### Expected Features

This milestone's “features” are assurance outcomes over existing behavior.

**Must have (table stakes):**

- **Secure quick-recording ID retention:** deterministically prove `randomUUID()` precedence, preserve the exact 16-byte lowercase-hex fallback and `artifactRef.artifactId === recording.id`, and retain the explicit fail-closed error.
- **Engine-aware direct runtime selection:** accept a direct route only when the captured Node and exact npm candidate both satisfy staged root engines.
- **Existing fallback reuse:** route all incompatible, missing, or unparseable direct cases through `scripts/npm-local.ps1` when PowerShell is available; fail non-zero only when no compatible route exists.
- **Staged-index gate preservation:** retain whitespace checking, bootstrap behavior, snapshot isolation, `.planning/**` exclusion, safe cleanup, exit propagation, and snapshot-scoped `format:check`.
- **Byte-exact fixture evidence:** prove `real-sheet.pdf` and `two-page-sheet.pdf` raw worktree blob IDs equal their `HEAD:<path>` IDs and keep their tracked diff empty.
- **Coherent lifecycle authority:** PROJECT, STATE, ROADMAP, and AGENTS must agree that v1.1 shipped, v1.2 is active, product/R01 scope is dormant, and current authorization stops after Native verification.
- **Native closure:** complete requirements/roadmap, checker-approved planning, bounded execution, and Native OpenGSD verification against the resulting revision.

**Should have (assurance detail):**

- **Controlled selector route matrix:** exact minimum, higher stable, old Node, old npm, malformed, prerelease, missing-command, fallback, and no-route cases with observable route provenance.
- **Contradiction-focused authority review:** inspect current-authority sections without banning legitimate archived v1.1 history or consuming `.planning/deprecated/**`.
- **Exact-revision evidence provenance:** reuse unchanged full-gate evidence when policy permits; rerun only when the revision, inputs, or evidence validity changes.
- **Negative-scope diff review:** explicitly prove there is no product expansion, wrapper/controller, dependency, formatter, fixture-content, worktree, or release action.

**Defer or separately authorize:**

- Generalized compound SemVer-range support — research only if `package.json` later changes beyond the current simple lower bounds.
- Any fresh product capability, dormant seed, session-ID redesign, or R01 work — unrelated to release assurance.
- Permanent fixture-check infrastructure, checksum sidecars, a hook test controller, or another runtime wrapper — one-time focused evidence and existing owners are sufficient.
- PR, push, final-head review/CI, merge, tag, main synchronization, or a final-review-specific reverify gate — outside the present authorization.

See [FEATURES.md](FEATURES.md) for atomic requirement candidates and dependency details.

### Architecture Approach

Use one bounded assurance path across existing planes. The product data plane remains unchanged and is characterized through its public quick-recording API; the repository commit-gate plane receives the one in-place selector correction; the Native lifecycle plane reconciles authority and owns research through verification; Git attributes and object identity provide immutable binary evidence. There are no new production components.

**Major components:**

1. **Quick-recording data plane** — retain `session.ts`; characterize `randomUUID` precedence, secure-byte fallback, failure behavior, and recording/artifact identity in the existing unit-test owner.
2. **Pre-commit control plane** — `.githooks/pre-commit` owns staged engine discovery, exact candidate probing, compatibility selection, fallback routing, snapshot formatting, cleanup, and commit pass/fail.
3. **Repository-local runtime fallback** — `scripts/npm-local.ps1` continues to own pinned Node/Corepack/npm execution unchanged.
4. **Native lifecycle plane** — PROJECT scopes the milestone; REQUIREMENTS/ROADMAP/STATE/phase artifacts and AGENTS route native planning, checking, execution, and verification, then stop.
5. **Immutable fixture evidence** — `.gitattributes` and Git blob equality prove the two valid PDFs are unchanged; fixture bytes are not an implementation component.

**Key patterns:** modify the existing owner in place; use staged content as the hook's contract authority; capture/probe/invoke the same executable paths; fall back conservatively under `set -euo pipefail`; keep ephemeral route shims outside tracked architecture; and verify integration over one resulting revision.

See [ARCHITECTURE.md](ARCHITECTURE.md) for component boundaries and control/data flows.

### Critical Pitfalls

1. **Stale authority dispatches completed v1.1 release work** — reconcile only active PROJECT/STATE/ROADMAP/AGENTS sections through Native OpenGSD, preserve valid archives, compare with read-only routing, and keep the v1.2 post-verification stop.
2. **Presence-only or incorrect version comparison selects an incompatible runtime** — validate both exact candidates, use guarded probes, parse numeric stable triplets, reject unsupported inputs, and exercise the full compatible/incompatible matrix.
3. **The hook probes one executable but invokes another** — resolve absolute candidates before PATH changes and probe and invoke the same Node/npm pair; never combine evidence from `npm` and `npm.cmd`.
4. **Selector work regresses the established commit gate** — leave PowerShell argument forwarding, staged snapshot semantics, cleanup guards, exclusion rules, and fast format-only scope unchanged; any cleanup hunk is a plan-deviation stop.
5. **Assurance mutates product or binary content or grows into release work** — leave production secure-ID code and valid PDFs unchanged, preserve test-global restoration, prove raw blob equality before any index refresh, review the final diff against explicit exclusions, and stop after Native verification.

See [PITFALLS.md](PITFALLS.md) for warning signs, recovery strategies, and step ownership.

## Implications for Roadmap

Research supports exactly one phase and one sequential plan. Splitting authority, product characterization, hook correction, fixture evidence, and verification into separate phases would add artificial handoffs without a deployable or architectural boundary; all outcomes converge on one revision and `parallelization=false`.

### Phase 1: Release Assurance & Workflow Closure

**Rationale:** Authority must be coherent before agents modify the hook, the secure-ID behavior should be locked before tooling changes, and binary/scope/native verification must assess the integrated final revision. One phase preserves that dependency order and makes the stop boundary unambiguous.

**Delivers:** Reconciled v1.2 authority; explicit secure quick-recording ID branch evidence; an engine-aware, fail-closed pre-commit selector that reuses the current fallback; byte-exact PDF evidence; proportional exact-revision quality evidence; and a Native OpenGSD verification result.

**Addresses:** ID-01 through ID-03, HOOK-01 through HOOK-03, PDF-01, AUTH-01, FLOW-01, and SCOPE-01 from FEATURES.md.

**Uses:** Existing Node/npm engine declarations, Git Bash, Git staged-index plumbing, `scripts/npm-local.ps1`, Vitest, Web Crypto, Git attributes/object IDs, and Native OpenGSD.

**Implements:** No new component. It changes only the selector owned by `.githooks/pre-commit`, adds focused characterization to the existing test owner, and reconciles native authority files through lifecycle operations.

**Avoids:** Stale v1.1 dispatch, lexical/partial SemVer checks, probe/invoke drift, PowerShell quoting regressions, staged/worktree confusion, snapshot-cleanup changes, leaked Web Crypto mocks, PDF rewrites, new infrastructure, and shipping creep.

**Recommended single-plan task order:**

1. Reconcile v1.2 authority and record secure-ID/PDF baselines.
2. Add deterministic `randomUUID()` precedence characterization without production changes.
3. Correct direct Node/npm eligibility and fallback selection inside the existing hook; exercise controlled routes and the real Git-Bash fallback.
4. Prove PDF blob equality, inspect scope/ownership, and run proportional existing gates tied to the candidate revision.
5. Run Native OpenGSD verification, reconcile resulting state, and stop without shipping actions.

### Phase Ordering Rationale

- Authority reconciliation precedes execution so no later agent follows stale v1.1 shipping instructions.
- Secure-ID characterization is independent but should precede the hook change so product-contract failures remain attributable.
- Hook selection is the sole behavioral correction and must use the staged engine contract plus the unchanged fallback/snapshot owners.
- Binary equality, negative-scope review, and native verification are final-revision invariants and therefore belong at the end.
- A single sequential plan matches the primary-checkout/no-worktree configuration and avoids ambiguous evidence across independently changed heads.

### Research Flags

**Phases likely needing deeper research during planning:**

- **None.** Phase 1 already has implementation-ready repository evidence, exact ownership, a concrete route matrix, official platform guidance, and explicit failure boundaries. Use this research during `$gsd-plan-phase`; do not repeat broad research.

**Phases with established patterns (skip research-phase):**

- **Phase 1:** Existing hook/wrapper/test/Git/native owners are directly inspected and the only bounded parser shape is known. Planning should resolve exact task commands and ephemeral test setup, not reopen stack or architecture selection.

**Plan-time validation flags (not new research):**

- Confirm the final plan reads engine values from the staged snapshot/index and captures exact executable paths before the existing PATH prepend.
- Define controlled PATH scenarios without committing a new wrapper/controller; include snapshot cleanup and route provenance evidence.
- Bind expensive gate reuse or rerun decisions to the exact implementation revision and inputs.
- Treat any needed production secure-ID edit, PDF byte change, cleanup refactor, dependency change, or release action as a scope-deviation stop.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Live versions, fallback behavior, and owner boundaries are HIGH confidence; official SemVer/npm/Web Crypto guidance is MEDIUM because it came through the verified research seam. |
| Features | HIGH | Table stakes, anti-features, current implementation status, and atomic evidence map directly to inspected repository behavior and approved milestone scope. |
| Architecture | HIGH | Existing owners and changed-versus-unchanged boundaries are explicit; research consistently finds no need for a new component or phase split. |
| Pitfalls | MEDIUM | Repository-specific risks are HIGH confidence; some shell/platform prevention details rely on official guidance classified MEDIUM by the research seam. |

**Overall confidence:** HIGH for roadmap structure and scope; MEDIUM for low-level selector implementation until the controlled route matrix passes.

### Gaps to Address

- **Exact shell implementation:** The plan must select a minimal parser/helper shape that survives `set -euo pipefail`, CRLF output, prerelease rejection, and staged range extraction without changing cleanup or adding a dependency.
- **Ephemeral route harness:** The plan must specify how compatible, incompatible, competing, malformed, fallback, and no-route executables are observed without creating a tracked controller or invoking a different candidate than the one probed.
- **Native mutation sequence:** Requirements, roadmap, state, and AGENTS reconciliation must use Native OpenGSD's lifecycle semantics and preserve archived v1.1 history; a custom validator is prohibited.
- **Evidence freshness:** The verifier must decide whether full format/lint/typecheck/unit/build evidence remains valid for the exact final revision and rerun only stale, missing, changed, or contradictory gates.
- **Future engine-range drift:** If the root engine contract becomes compound or otherwise unsupported, direct selection should fall back/fail closed; generalized range support requires a separately scoped decision.

## Sources

### Primary (HIGH confidence)

- [STACK.md](STACK.md), [FEATURES.md](FEATURES.md), [ARCHITECTURE.md](ARCHITECTURE.md), and [PITFALLS.md](PITFALLS.md) — the four completed research reports synthesized here.
- [PROJECT.md](../PROJECT.md), [STATE.md](../STATE.md), [ROADMAP.md](../ROADMAP.md), `.planning/config.json`, and `AGENTS.md` — approved scope, current lifecycle, configuration, and stale-authority findings.
- `.githooks/pre-commit`, `scripts/npm-local.ps1`, `package.json`, `.npmrc`, `.nvmrc`, and `.github/workflows/ci.yml` — runtime contract, current selector defect, verified local fallback, and existing CI/tooling ownership.
- `src/lib/quick-metronome/session.ts` and `tests/unit/quick-metronome-session.test.ts` — secure quick-recording branch order, fallback encoding, fail-closed behavior, identity invariants, and test cleanup.
- `.gitattributes`, `test-fixtures/sheets/real-sheet.pdf`, and `test-fixtures/sheets/two-page-sheet.pdf` — binary policy and live worktree/HEAD blob equality.
- Native `smart-entry --json` evidence — v1.2 planning with zero active phases routes to `needs-first-phase`, not v1.1 shipping.

### Secondary (MEDIUM confidence, official guidance via verified research seam)

- [npm `engines`](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/#engines), [npm `engine-strict`](https://docs.npmjs.com/cli/v11/using-npm/config/#engine-strict), [node-semver ranges](https://github.com/npm/node-semver#ranges), and [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html) — engine declarations and comparison rules.
- [Git hooks](https://git-scm.com/docs/githooks), [checkout-index](https://git-scm.com/docs/git-checkout-index), [gitattributes](https://git-scm.com/docs/gitattributes), [hash-object](https://git-scm.com/docs/git-hash-object), [rev-parse](https://git-scm.com/docs/git-rev-parse), and [update-index refresh](https://git-scm.com/docs/git-update-index#_using_refresh) — hook abort, staged-content, binary, object-identity, and stat-refresh semantics.
- [W3C Web Crypto](https://www.w3.org/TR/webcrypto-2/) and MDN [`randomUUID`](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID) / [`getRandomValues`](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues) — secure random APIs.
- [Vitest global mocking](https://vitest.dev/guide/mocking/globals.html), [PowerShell executable semantics](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_powershell_exe?view=powershell-5.1), and [GNU Bash `set`](https://www.gnu.org/software/bash/manual/html_node/The-Set-Builtin.html) — test restoration and cross-shell failure/argument behavior.

### Tertiary (LOW confidence)

- None. No roadmap decision depends on an unverified community-only source.

---
*Research completed: 2026-08-01*
*Ready for roadmap: yes*
