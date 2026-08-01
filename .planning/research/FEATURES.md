# Feature Research: v1.2 Release Assurance & Workflow Closure

**Domain:** Repository release assurance for an existing local-first TypeScript application
**Researched:** 2026-08-01
**Confidence:** HIGH for repository behavior and current-state findings; MEDIUM for supporting external documentation

## Research Framing

This milestone is complete when the merged behavior is characterized, the one known hook-selection defect is corrected, the local binary fixtures are proven identical to their committed blobs, lifecycle authority agrees on v1.2, and Native OpenGSD verifies the bounded result. It is not a product-feature milestone and should not use ordinary MVP or competitive-feature language to justify additional behavior.

One terminology correction matters for atomic requirements: [`src/lib/quick-metronome/session.ts`](../../src/lib/quick-metronome/session.ts) generates a **quick-recording ID** (`recording_<secure value>`), not a practice-session ID. The generated recording ID is linked to the pre-existing `session.id` and is reused as `artifactRef.artifactId`. Requirements should preserve this actual contract rather than imply that v1.2 changes session-ID generation.

## Feature Landscape

### Table Stakes (Milestone Cannot Complete Without These)

| Behavior | Why Required | Current Status | Complexity | Observable Acceptance Evidence |
|----------|--------------|----------------|------------|--------------------------------|
| Prefer `crypto.randomUUID()` for quick-recording IDs | This is the first branch of the already-merged secure-ID contract and must not be weakened or silently replaced | **Implemented; explicit precedence characterization still needed.** `createId()` checks `randomUUID` before `getRandomValues`; the ordinary creation test proves the `recording_` prefix but does not deterministically prove precedence when both APIs exist | LOW | A focused unit test stubs both APIs, returns a known UUID, proves `recording_<uuid>`, proves `randomUUID()` was called, and proves `getRandomValues()` was not called |
| Use `crypto.getRandomValues()` as the only fallback | Environments without `randomUUID()` still need a cryptographically strong identifier without falling back to predictable randomness | **Implemented and focused-tested.** Sixteen bytes become 32 lowercase hexadecimal characters and the ID remains the artifact identity | LOW | Existing/focused test produces `recording_000102030405060708090a0b0c0d0e0f`; `artifactRef.artifactId === recording.id`; no `Math.random`, timestamp, counter, or ad-hoc entropy source is introduced |
| Fail closed when Web Crypto is unavailable | Continuing with a weak ID would violate the approved security contract and could create recording/artifact identity collisions | **Implemented and focused-tested** for a `crypto` object without either secure method | LOW | Focused unit test observes the exact `Secure random number generation is unavailable` error and observes no recording object returned or persisted |
| Select direct Node/npm only when **both** satisfy `package.json` engines | Command presence alone is not compatibility. The repository requires Node `>=24.0.0` and npm `>=11.17.0` | **Needs correction.** The current pre-commit hook accepts the first `npm`/`npm.cmd` found without checking either version | MEDIUM | Controlled route-selection cases prove: compatible Node + compatible npm uses the direct route; old/malformed/missing Node or old/malformed/missing npm does not use the direct route |
| Reuse `scripts/npm-local.ps1` for every incompatible direct-runtime case | The repository already has a pinned local Node 24.17.0 + npm 11.17.0 route; reuse avoids a second wrapper and avoids global/user `PATH` mutation | **Infrastructure already implemented; hook routing needs correction** | MEDIUM | With an incompatible direct pair and PowerShell available, the hook completes `format:check` through the existing local wrapper. No new runtime wrapper, downloaded tool, or persistent `PATH` change appears in the diff |
| Fail closed when neither a compatible direct pair nor the existing local route can run | A commit must not pass merely because runtime validation was impossible | **Partially implemented.** The hook already errors when no command route exists; corrected logic must extend this to incompatible/unparseable direct versions when no fallback is usable | LOW | Controlled case exits non-zero with an actionable route error and does not claim formatting passed |
| Preserve staged-index formatting semantics while correcting selection | The hook is a staged-content gate, not a working-tree formatter; changing this would regress the verified v1.1 contract | **Implemented and must remain unchanged** | MEDIUM | Hook still runs `git diff --cached --check`, skips only the historical bootstrap case, snapshots the staged index under the Git directory, excludes `.planning/**`, runs `npm run format:check` against that snapshot, and cleans the snapshot on success/failure/signal |
| Prove the two valid PDF fixtures equal their HEAD blobs byte-for-byte | PDF cross-reference offsets are byte-sensitive; a clean-looking text conversion can still corrupt them | **Restored in the current working tree; confirmation evidence required.** `real-sheet.pdf` and `two-page-sheet.pdf` currently hash to their respective HEAD blob IDs | LOW | For each named fixture, `git hash-object -- <path>` equals `git rev-parse HEAD:<path>` and `git diff -- <path>` is empty. `.gitattributes` continues to classify `*.pdf` as binary. `bad-sheet.pdf` is intentionally invalid test data and is not one of the two restoration targets |
| Reconcile lifecycle authority around completed v1.1 and active v1.2 | Agents must route from one coherent source of truth; stale closeout instructions can dispatch unauthorized shipping work | **Partially reconciled.** PROJECT already declares v1.2 and the pre-shipping stop boundary. STATE, ROADMAP, and AGENTS still describe the v1.1 release exit as pending/active | MEDIUM | PROJECT, STATE, ROADMAP, and AGENTS all agree that v1.1 shipped on 2026-08-01; v1.2 is the active assurance milestone; no fresh product/R01 scope is active; and current authorization ends after Native OpenGSD verification |
| Complete the native research-to-verification chain | The milestone exists to bring actual merged behavior under Native OpenGSD authority, not merely to edit files | **In progress through native research; later native stages required** | MEDIUM | Durable native research exists; roadmap requirements are atomic; the plan is checker-approved; bounded execution produces only in-scope changes; the native verifier records the phase result against the resulting revision; state/roadmap reflect that result |
| Stop after native verification | Verification is the authorized end state for v1.2; shipping is a separate later decision | **Declared in PROJECT; stale AGENTS/STATE/ROADMAP wording must be removed** | LOW | No PR creation, push, final-head review/CI, merge, tag, or local-main synchronization is performed or claimed as part of this milestone |

### Useful Verification Detail (Valuable, Not Separate Scope)

| Detail | Value | Complexity | Boundary |
|--------|-------|------------|----------|
| Deterministic secure-ID branch tests | Makes precedence and fallback shape reviewable without probabilistic assertions | LOW | Add only focused characterization where current coverage is implicit; do not change the quick-recording product contract |
| Hook route-selection matrix | Prevents a partial fix that checks only npm, only Node, or only command presence | MEDIUM | Exercise compatible, incompatible, missing, and unparseable version cases; reuse the current hook and wrapper rather than building a hook framework |
| Route provenance in test evidence | Shows which route actually executed, avoiding a false green from an unintended PATH command | LOW | Prefer controlled PATH shims/test observations or concise existing-hook output; do not add telemetry or a new persistent controller |
| Exact blob IDs in verification notes | Turns “PDF looks restored” into repeatable byte evidence | LOW | Record the comparison result; do not commit a regenerated fixture or add a permanent binary-validation subsystem |
| Cross-document contradiction search | Detects lingering phrases such as “v1.1 release exit remains active” after reconciliation | LOW | Search only the four active authority files; `.planning/deprecated/**` remains quarantined and must not be read or transformed |
| Exact-revision evidence provenance | Lets native verification reuse a still-valid focused/full gate result when head and inputs are unchanged | LOW | Reuse is allowed by repository policy; do not invent a final-review-specific reverify gate |
| Negative-scope diff review | Makes absence of product expansion observable | LOW | Confirm no UI, persistence, storage, audio, domain, service-contract, dependency-modernization, dormant-seed, or formatter-baseline changes |

These details strengthen evidence but must remain subordinate to the table-stakes behaviors. They are not independent features and do not justify a second phase unless native planning discovers a real dependency boundary.

### Anti-Features (Explicitly Do Not Build)

| Anti-Feature | Why It May Seem Useful | Why It Is Problematic Here | Required Alternative |
|--------------|------------------------|----------------------------|----------------------|
| New product behavior or fresh R01 work | Could make the assurance milestone appear more substantial | Violates the bounded authorization and obscures whether the existing tree was actually assured | Keep all 32 dormant seeds dormant; open future product direction only under separate owner authorization |
| New session-ID semantics | “Secure session ID” wording can be read as a request to change practice-session generation | The live code under review generates recording IDs and links them to an existing session; changing session IDs is a product/domain change | Name the requirement “quick-recording ID contract” and test the actual `recording.id`/`artifactRef.artifactId` behavior |
| Weak random fallback (`Math.random`, timestamps, counters) | Avoids an error in browsers without Web Crypto | Breaks the explicit fail-closed security decision and risks collisions | Throw the existing explicit error when neither secure API exists |
| Second runtime wrapper or package-manager bootstrap | Could centralize version probing | Duplicates `scripts/npm-local.ps1`, expands maintenance, and can change machine-wide behavior | Keep selection in the tracked hook and route incompatible environments to the existing wrapper |
| Global or user `PATH` mutation | Could make `node`/`npm` appear compatible for later commands | Creates machine-wide side effects outside repository authority | Limit PATH changes to the existing process-local wrapper behavior |
| Reformatting the repository or changing formatter ownership | Might incidentally produce a clean `format:check` | Reopens the completed 341-file v1.1 baseline and confounds the defect fix | Preserve Prettier as the sole formatter and touch only assurance-related logic/evidence |
| Commit regenerated or normalized PDF fixtures | Could make tests pass locally | The valid HEAD blobs are authoritative; regeneration or EOL processing can alter offsets and create an unauthorized tracked change | Restore/compare raw bytes against HEAD and leave the fixture diff empty |
| Treat `bad-sheet.pdf` as a damaged fixture to repair | Its filename can look like another corruption report | It is deliberate invalid-input coverage used by sheet-library/viewer tests | Restore/confirm only `real-sheet.pdf` and `two-page-sheet.pdf` |
| Custom lifecycle controller, state validator, or retry script | Might automate the research-plan-execute-verify sequence | Duplicates Native OpenGSD and creates a competing authority layer | Use Native OpenGSD artifacts and commands directly |
| Final-review-specific native re-verification gate | Sounds like extra assurance | The owner explicitly rejected this extra workflow layer; final review/shipping are outside current authorization | End v1.2 at ordinary Native OpenGSD verification; await later explicit shipping authority |
| PR, push, final-head CI/review, merge, tag, or main synchronization | These are common release-closeout actions | They are explicitly outside the current authorization | Report the native verification result and stop |
| Reading or transforming `.planning/deprecated/**` | Historical material might appear useful for reconciliation | The directory is an absolute quarantine and not an input to this milestone | Reconcile only active PROJECT, STATE, ROADMAP, and AGENTS authority using current archives/live facts |

## Acceptance Requirement Candidates

The roadmap can translate the landscape into the following atomic, testable requirements. IDs are suggested labels, not a new workflow schema.

| Candidate | Atomic Requirement | Implementation Classification | Minimum Evidence |
|-----------|--------------------|-------------------------------|------------------|
| ID-01 | Quick-recording ID creation prefers `crypto.randomUUID()` and preserves the `recording_` prefix | Behavior exists; add explicit precedence characterization | Deterministic focused unit test with both APIs present |
| ID-02 | If `randomUUID()` is unavailable, 16 `getRandomValues()` bytes produce 32 lowercase hex characters and the recording/artifact IDs remain identical | Behavior and focused test exist | Focused test remains green and inspects exact ID + artifact reference |
| ID-03 | If neither secure API is available, creation throws the existing secure-random error and produces no recording | Behavior and focused test exist | Focused fail-closed test remains green |
| HOOK-01 | The hook uses direct npm only when direct Node and npm both satisfy the root engine ranges | Correction required | Controlled compatible and incompatible route cases |
| HOOK-02 | Every missing, unparsable, or engine-incompatible direct pair routes to the existing PowerShell wrapper when available, otherwise fails non-zero | Correction required; fallback exists | Negative route matrix plus successful local-wrapper case |
| HOOK-03 | Engine-aware selection does not alter the verified staged-index, bootstrap, exclusion, cleanup, or fast-gate behavior | Preservation requirement | Focused hook behavior evidence and diff inspection |
| PDF-01 | `real-sheet.pdf` and `two-page-sheet.pdf` working bytes equal their HEAD blobs and have no tracked diff | Current tree already satisfies; verification evidence required | Two blob-ID equality comparisons plus empty path diff |
| AUTH-01 | PROJECT, STATE, ROADMAP, and AGENTS agree on completed v1.1, active v1.2, dormant product scope, Native OpenGSD authority, and the post-verification stop boundary | PROJECT substantially current; STATE/ROADMAP/AGENTS need reconciliation | Targeted contradiction search and direct file inspection |
| FLOW-01 | Native OpenGSD completes research, requirements/roadmap, checker-approved planning, bounded execution, and verification for the resulting revision | Native lifecycle work required | Durable native artifacts and verifier result |
| SCOPE-01 | The resulting milestone contains no product expansion, dormant-seed activation, new wrapper/controller, fixture content change, final-review-specific gate, or shipping action | Preservation requirement | Final diff/status review against explicit exclusions |

## Feature Dependencies

```text
Existing createId() implementation
    └──requires characterization──> ID-01 + ID-02 + ID-03 focused evidence

package.json engine ranges
    └──govern──> HOOK-01 compatible direct-route decision
                     └──otherwise requires──> existing scripts/npm-local.ps1
                                                   └──or fail closed if unavailable──> HOOK-02

Existing staged-index hook behavior
    └──must survive──> HOOK-01 + HOOK-02 correction

.gitattributes (*.pdf binary) + valid HEAD blobs
    └──support──> PDF-01 byte-exact comparison

Completed v1.1 archive + owner-approved v1.2 PROJECT scope
    └──govern──> AUTH-01 reconciliation
                     └──enables coherent routing──> FLOW-01 native plan/execution/verification

FLOW-01 verification
    └──terminates current authorization──> STOP (no shipping work)
```

### Dependency Notes

- **ID evidence depends on the existing implementation, not an ID redesign.** Tests should lock the branch order and failure behavior before any unrelated refactor is considered.
- **HOOK-01 depends on both root engine declarations.** Checking only `npm --version` is insufficient because npm executes under a Node runtime; checking only Node is equally incomplete.
- **HOOK-02 depends on the existing wrapper and a PowerShell executable.** The fallback already pins compatible repository-local versions. The correction should select it, not duplicate it.
- **HOOK-03 constrains the correction.** Runtime selection happens before the existing `run_npm` invocation, but staged snapshot semantics remain the accepted v1.1 behavior.
- **PDF-01 depends on Git object identity, not visual inspection.** Matching Git blob IDs proves the bytes that matter to PDF offsets. `.gitattributes` supplies the binary handling contract.
- **AUTH-01 is a prerequisite for reliable native routing.** PROJECT already carries the current scope, but stale STATE/ROADMAP/AGENTS text can still direct an agent toward v1.1 shipping work.
- **FLOW-01 depends on the research and roadmap artifacts produced by Native OpenGSD.** It must not be recreated by repository scripts.
- **The stop boundary follows verification.** Shipping and release-exit facts are not dependencies of v1.2 completion and must not be added as acceptance criteria.

## Milestone Completion Definition

### Complete With

- [ ] Explicit tests characterize all three secure-ID branches without changing production semantics.
- [ ] The tracked hook selects direct execution only for a fully compatible Node/npm pair and otherwise reuses the existing local wrapper or fails closed.
- [ ] Existing staged-index formatting behavior remains intact.
- [ ] Both valid PDF fixture hashes equal HEAD and neither fixture has a tracked content change.
- [ ] The four active authority files state one coherent v1.2 lifecycle and current stop boundary.
- [ ] Native OpenGSD planning/checking, bounded execution, and verification complete with evidence tied to the resulting revision.
- [ ] Diff/status inspection proves all anti-features remained absent.

### Do Not Add After Verification in This Authorization

- [ ] Pull-request creation or push
- [ ] Final-head review/CI or a special post-review native reverify
- [ ] Merge, tag, or local-main synchronization
- [ ] Product/R01 planning or dormant-seed activation

## Prioritization Matrix

| Behavior | Assurance Value | Implementation Cost | Priority | Rationale |
|----------|-----------------|---------------------|----------|-----------|
| Secure-ID characterization | HIGH | LOW | P1 | Locks the approved security behavior already in production |
| Engine-aware hook selection | HIGH | MEDIUM | P1 | Only confirmed production/tooling defect in the bounded scope |
| Preserve staged-index gate | HIGH | MEDIUM | P1 | Prevents the correction from regressing the shipped v1.1 contract |
| PDF blob equality | HIGH | LOW | P1 | Binary corruption is byte-sensitive and current equality is directly provable |
| Authority reconciliation | HIGH | MEDIUM | P1 | Removes contradictory routing and authorization narratives |
| Native lifecycle verification | HIGH | MEDIUM | P1 | Defines milestone closure and evidence provenance |
| Additional route logging | MEDIUM | LOW | P2 | Useful only if needed to make controlled route evidence unambiguous |
| Permanent fixture-check subsystem | LOW | MEDIUM | P3 / DO NOT BUILD | One-time byte proof is sufficient; a new subsystem is scope expansion |

## Existing vs Required Change Summary

| Area | Already Present | Needs Correction or Reconciliation |
|------|-----------------|------------------------------------|
| Secure ID | `randomUUID` first; 16-byte `getRandomValues` fallback; fail-closed error; fallback/failure focused tests | Add deterministic `randomUUID` precedence characterization; use precise “recording ID” terminology |
| Hook | Whitespace gate, bootstrap skip, staged snapshot, `.planning` exclusion, cleanup, `npm`/`npm.cmd`/PowerShell routes, existing local wrapper | Validate both Node and npm against root engines before accepting direct route; cover missing/unparseable/incompatible cases |
| PDF fixtures | Binary `.gitattributes` rule; valid HEAD blobs; current working copies of `real-sheet.pdf` and `two-page-sheet.pdf` match HEAD | Capture repeatable equality/no-diff evidence; do not commit fixture bytes |
| Lifecycle authority | PROJECT declares v1.2, records v1.1 shipped, and defines the verification stop boundary | STATE current focus/next steps, ROADMAP current lifecycle, and AGENTS workflow/release language still point to pending v1.1 closeout; reconcile all four files as a consistent set |
| Native workflow | Native OpenGSD is declared sole authority and research is underway | Complete requirements/roadmap, planning/check, bounded execution, and native verification; stop there |

## Confidence Assessment

| Finding Area | Confidence | Basis |
|--------------|------------|-------|
| Existing secure-ID behavior | HIGH | Direct inspection of production code and focused unit tests |
| Missing explicit precedence evidence | HIGH | Direct inspection shows the branch order, while no deterministic both-APIs precedence test is present |
| Hook selection defect | HIGH | Direct inspection of hook and root `engines`; route selection checks command presence only |
| Existing wrapper reuse path | HIGH | Direct inspection of `scripts/npm-local.ps1`, including pinned local Node/npm |
| PDF restoration state | HIGH | Live `git hash-object` results equal the HEAD blob IDs for both valid fixtures; path diff is empty |
| Lifecycle narrative drift | HIGH | Direct contradictions between current PROJECT and live STATE/ROADMAP/AGENTS wording |
| Supporting platform semantics | MEDIUM | Official npm, Git, and MDN pages fetched through the research seam and cross-checked against repository behavior |

## Sources

### Repository Primary Sources (HIGH)

- [`src/lib/quick-metronome/session.ts`](../../src/lib/quick-metronome/session.ts) — actual recording-ID branch order, prefix, fallback encoding, and fail-closed error.
- [`tests/unit/quick-metronome-session.test.ts`](../../tests/unit/quick-metronome-session.test.ts) — existing fallback, fail-closed, artifact-identity, and surrounding quick-recording behavior evidence.
- [`.githooks/pre-commit`](../../.githooks/pre-commit) — current command-presence routing and staged-index gate behavior.
- [`scripts/npm-local.ps1`](../../scripts/npm-local.ps1) — existing repository-local Node 24.17.0/npm 11.17.0 fallback.
- [`package.json`](../../package.json) — Node `>=24.0.0` and npm `>=11.17.0` engine contract.
- [`.gitattributes`](../../.gitattributes) — PDF binary classification and planning quarantine.
- [`PROJECT.md`](../PROJECT.md), [`STATE.md`](../STATE.md), [`ROADMAP.md`](../ROADMAP.md), and [`AGENTS.md`](../../AGENTS.md) — current authority agreement and contradictions.
- Live Git object comparison on 2026-08-01: `real-sheet.pdf` = `2c2bf826458ee864821b0942e8cc2172e756ad0a`; `two-page-sheet.pdf` = `8d48ef4af67dcbeaba5e617d3a1023276e612f71`; each working blob matched HEAD.

### Supporting Official Documentation (MEDIUM, websearch provider verified)

- [npm package.json `engines` documentation](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/#engines) — both Node and npm versions can be declared as engine ranges.
- [Git `hash-object` documentation](https://git-scm.com/docs/git-hash-object) — computes the blob object ID from named file contents; comparison with `HEAD:<path>` provides byte-identity evidence for binary fixtures.
- [MDN `Crypto.randomUUID()`](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID) — cryptographically secure v4 UUID generation.
- [MDN `Crypto.getRandomValues()`](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues) — cryptographically strong random bytes and typed-array behavior.

---
*Feature research for: Metronome v1.2 Release Assurance & Workflow Closure*
*Researched: 2026-08-01*
