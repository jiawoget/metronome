# Architecture Research: v1.2 Release Assurance & Workflow Closure

**Domain:** Bounded repository assurance over an existing local-first web application
**Researched:** 2026-08-01
**Confidence:** HIGH for repository ownership and integration boundaries; MEDIUM for supporting platform documentation

## Architectural Recommendation

Implement v1.2 as one bounded assurance path across three existing planes, with no new runtime component:

1. **Product data plane — preserve and characterize only.** Keep [`src/lib/quick-metronome/session.ts`](../../src/lib/quick-metronome/session.ts) unchanged. Add deterministic branch coverage to its existing unit-test owner so the merged secure recording-ID behavior is explicit.
2. **Repository commit-gate control plane — correct in place.** Keep [`.githooks/pre-commit`](../../.githooks/pre-commit) as the sole owner of candidate detection, engine validation, route selection, staged-index snapshotting, and commit pass/fail. Keep [`scripts/npm-local.ps1`](../../scripts/npm-local.ps1) as the unchanged compatible execution fallback.
3. **Native lifecycle control plane — reconcile through its existing authority.** PROJECT defines scope, native requirements/roadmap/state/phase artifacts control lifecycle, AGENTS routes agents, and config keeps unrelated capabilities disabled. Do not add a repository controller, validator, receipt, or second state machine.

The two valid PDF fixtures are not a fourth implementation plane. They are immutable binary inputs whose content identity is verified against Git HEAD; they should not appear in the implementation diff.

## System Overview

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ PRODUCT DATA PLANE — unchanged production behavior                      │
│                                                                          │
│ quick-recording caller                                                   │
│        │                                                                 │
│        ▼                                                                 │
│ src/lib/quick-metronome/session.ts                                       │
│ createQuickRecording() → createId("recording")                           │
│        │                         │                                        │
│        │                         ├─ crypto.randomUUID()                    │
│        │                         ├─ crypto.getRandomValues(16 bytes)       │
│        │                         └─ throw if neither exists                │
│        ▼                                                                 │
│ existing QuickRecording → existing artifact/storage paths                │
│                                                                          │
│ v1.2 integration: existing unit test characterizes branch precedence     │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│ REPOSITORY COMMIT-GATE PLANE — one in-place correction                   │
│                                                                          │
│ git commit                                                               │
│    ▼                                                                     │
│ .githooks/pre-commit                                                     │
│    ├─ git diff --cached --check                                          │
│    ├─ preserve bootstrap rule                                            │
│    ├─ materialize staged-index snapshot                                  │
│    ├─ read authoritative engine contract from snapshot package.json      │
│    ├─ probe direct node + npm/npm.cmd                                     │
│    ├─ compatible pair ────────────────► direct npm                        │
│    ├─ incompatible/missing pair ──────► existing npm-local.ps1            │
│    ├─ no usable route ────────────────► non-zero / abort commit           │
│    └─ usable route ─► format:check(snapshot) ─► zero / allow commit       │
│                                                                          │
│ v1.2 integration: selection changes; snapshot/format/cleanup owners stay  │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│ NATIVE LIFECYCLE PLANE — sole workflow authority                         │
│                                                                          │
│ owner-approved PROJECT scope                                             │
│    ▼                                                                     │
│ native research → requirements/roadmap → plan/check → execute → verify   │
│    │                  │                                      │            │
│    │                  ├─ STATE/ROADMAP lifecycle truth       └─ STOP      │
│    │                  └─ AGENTS routing alignment                         │
│    └─ config keeps unrelated product/release capabilities disabled       │
│                                                                          │
│ no PR / final-head review / merge / tag / main synchronization           │
└──────────────────────────────────────────────────────────────────────────┘

                         IMMUTABLE BINARY EVIDENCE
          .gitattributes (*.pdf binary) + valid HEAD fixture blobs
                                   │
                                   ▼
            working blob ID == HEAD blob ID; tracked diff is empty
```

## Component Ownership and Change Classification

### Modified Components

| Component | Existing Owner | v1.2 Change | Why This Owner | Must Preserve |
|-----------|----------------|-------------|----------------|---------------|
| `.githooks/pre-commit` | Git Bash commit-gate control flow | Add fail-closed Node/npm engine probing and choose direct execution only when both candidates satisfy the staged root engine contract; otherwise select the existing PowerShell wrapper | Route selection already lives here; moving it elsewhere would create a parallel gate or wrapper | Whitespace check, bootstrap skip, staged-index snapshot, `.planning/**` exclusion, safe cleanup, exit-code propagation, fast-gate scope |
| `tests/unit/quick-metronome-session.test.ts` | Quick-recording behavior characterization | Add an explicit both-APIs-present test proving `randomUUID()` wins and fallback is not called; retain existing exact fallback and fail-closed tests | This file already exercises `createQuickRecording` and its identity/storage invariants | Existing quick-recording behavior, test isolation, artifact ID equality |
| `.planning/STATE.md` | Native OpenGSD state mutation | Replace stale v1.1 release-exit focus/next steps as the native v1.2 lifecycle advances | STATE is native lifecycle truth, not a hand-built project state machine | Current milestone status and native transition semantics |
| `.planning/ROADMAP.md` | Native OpenGSD roadmap mutation | Add the bounded v1.2 assurance phase/requirements and remove the stale “v1.1 release exit remains active” lifecycle narrative | ROADMAP is the native dependency/order authority | Archived v1.0/v1.1 history and absence of product/R01 activation |
| `.planning/PROJECT.md` | Project scope authority | Reconcile only remaining terminology/cross-file facts, especially “recording ID” versus misleading “session-ID” wording, if native milestone generation has not already done so | PROJECT already owns the approved goal, constraints, and stop boundary | v1.1 shipped fact, v1.2 bounded scope, verification stop boundary |
| `AGENTS.md` | Repository routing authority | Replace pending-v1.1 release instructions with active-v1.2 assurance routing and the explicit stop after native verification | Agent routing belongs here; it must agree with PROJECT/STATE/ROADMAP | Native OpenGSD exclusivity, no worktree, reuse contract, no routine stage prompts inside approved scope |

### New Artifacts, Not New Architecture

| Artifact | Creation Owner | Classification | Constraint |
|----------|----------------|----------------|------------|
| `.planning/REQUIREMENTS.md`, active phase context/research/plan/check/verification artifacts | Native OpenGSD | Expected lifecycle evidence | Let native commands create/name/move them; do not hand-create a controller or duplicate their status |
| Hook route-selection evidence | Executor/verifier, preferably ephemeral controlled scenarios | Test evidence, not a production component | Use temporary PATH shims or an isolated temporary repository if needed; do not add a permanent wrapper/controller merely to test the hook |
| Secure-ID precedence assertion | Existing unit-test file | Test addition, not a new module | Keep it beside current fallback/failure tests |

### Explicitly Unchanged Components

| Component | Why Unchanged |
|-----------|---------------|
| `src/lib/quick-metronome/session.ts` | The approved `randomUUID` → `getRandomValues` → throw behavior is already correct. v1.2 characterizes it; production edits would create unnecessary product risk |
| `scripts/npm-local.ps1` | It already owns repository-local Node 24.17.0/Corepack/npm 11.17.0 execution and process-local environment setup. The defect is selection, not fallback execution |
| `package.json` and `package-lock.json` | Engine ranges and public `format`/`format:check` commands already define the contract. No dependency or package-manager change is needed |
| `.gitattributes` | `*.pdf binary`, `.planning/** -text`, and repository LF policy already establish the correct ownership rules |
| `test-fixtures/sheets/real-sheet.pdf` and `two-page-sheet.pdf` | Their current working blob IDs already equal valid HEAD. Verification should prove identity, not produce a tracked edit |
| `test-fixtures/sheets/bad-sheet.pdf` | It is intentional invalid-input coverage and is not a restoration target |
| Application UI, domain, service, repository, persistence, audio, and storage code | No new product behavior is authorized; the secure recording-ID path continues through existing types and storage boundaries |
| CI/build scripts and formatter configuration | v1.1 already verified the formatter/CI architecture. The local hook selection defect does not require CI or formatter redesign |
| `.planning/config.json` capability toggles | Research/check/verifier are enabled; product-domain, review, security, worktree, and other unrelated capabilities are deliberately disabled for this milestone |
| Dormant seeds and `.planning/deprecated/**` | They are outside scope; deprecated planning is an absolute content quarantine |

### New Production Components

**None.** No new service, repository, engine, wrapper, controller, formatter, validator, cache, database, telemetry path, or runtime dependency is justified.

## Reuse Decision

The repository reuse contract requires a concrete local/dependency/platform scan before custom implementation.

| Evidence Lane | Finding | Decision |
|---------------|---------|----------|
| Semantically equivalent local owners | The tracked hook already owns route selection and the PowerShell script already owns compatible repository-local npm execution. No other active runtime selector was found | Modify the hook in place; reuse the wrapper unchanged |
| Installed dependency APIs | `semver` 6.3.1 is present only as a transitive/hoisted package and is absent from root `package.json` | Do not make the commit hook depend on an undeclared transitive package and do not add a new dependency for two current minimum ranges |
| Platform APIs | Git supplies pre-commit failure semantics and staged-index plumbing; Node/npm expose version strings; npm defines `engines` as Node/npm version ranges; Web Crypto supplies both approved secure ID APIs | Use those existing platform contracts directly |
| Selected implementation | A small fail-closed version/range check contained inside `.githooks/pre-commit`, limited to the repository’s current `>=MAJOR.MINOR.PATCH` engine shape, with unsupported/malformed input routed to the existing fallback or error | Keeps logic at the existing owner and avoids a new abstraction |
| Rejected alternative: new wrapper | Would duplicate `npm-local.ps1` and introduce another execution path | Reject |
| Rejected alternative: root `semver` dependency | Expands package/lock surface and still requires a candidate Node runtime before the hook can trust it | Reject for this bounded scope |
| Rejected alternative: custom lifecycle validator/controller | Duplicates Native OpenGSD state/check/recovery behavior | Reject |

### Why a Small In-Hook Check Is Not a New Abstraction

The engine-selection logic has one caller, one owner, and no independent lifecycle. It should remain private shell functions/data inside the hook. Extraction becomes justified only if another active repository entrypoint must make the identical decision and cannot call the hook owner; no such second caller exists in the live tree.

The check must fail closed:

- Missing `node`, missing npm candidate, failed version command, malformed version output, missing engine declaration, or an unsupported range shape cannot select the direct route.
- For the current root contract, normalize `node --version` by accepting an optional leading `v`, then compare numeric major/minor/patch values against `>=24.0.0`; compare the chosen npm candidate against `>=11.17.0`.
- Prerelease suffixes or non-numeric components should not be treated as satisfying the stable minimum. Route to the existing fallback or fail if fallback cannot run.
- Do not use npm itself to download or resolve a comparison package while deciding whether that npm is compatible.

If the repository later adopts compound engine ranges, that is a separate contract change. The safe current behavior is to reject an engine expression the bounded parser cannot prove satisfied, not to guess.

## Integration Points

### Internal Boundaries

| Boundary | Communication | Ownership Rule | v1.2 Effect |
|----------|---------------|----------------|-------------|
| Quick-recording caller → `createQuickRecording` | Direct typed function call | Quick-metronome library owns recording construction | No runtime change |
| `createQuickRecording` → Web Crypto | Browser/global platform API | `createId` owns branch order and failure | Characterization test only |
| Recording ID → `artifactRef.artifactId` | Same returned object | Existing quick-recording storage identity contract | Must remain equal |
| Git commit → `.githooks/pre-commit` | Git hook invocation and exit status | Hook owns commit allow/abort decision | Version compatibility becomes an explicit prerequisite |
| Hook → staged index | `git diff --cached`, `git ls-files`, `git checkout-index` | Hook owns staged-content isolation | Preserve; engine contract should come from the staged snapshot/index, not an unrelated working-tree copy |
| Hook → direct Node/npm | PATH candidate probing and process invocation | Hook owns validation before invocation | Direct route only when both candidates prove compatible |
| Hook → `scripts/npm-local.ps1` | PowerShell process with existing npm arguments | Wrapper owns local Node/Corepack/npm execution only | Reused unchanged for incompatible or missing direct pairs |
| Selected npm route → snapshot `format:check` | `--prefix <snapshot> run format:check` | Root package script and Prettier own formatting policy | No formatter change |
| `.gitattributes` → PDF checkout/hash behavior | Git attribute classification | Git owns binary bytes | Verification-only equality check |
| PROJECT → REQUIREMENTS/ROADMAP/STATE | Native OpenGSD lifecycle commands | Native OpenGSD is sole lifecycle writer/router | Reconcile stale narratives without parallel state |
| AGENTS → subsequent agents | Repository instructions | AGENTS routes within native authority | Replace v1.1 release-exit direction with v1.2 stop boundary |
| Native verifier → milestone result | Native verification artifact/state transition | Verifier owns phase conclusion | Current authorization terminates here |

### External Platform Boundaries

| Platform | Integration Pattern | Constraint |
|----------|---------------------|------------|
| Browser Web Crypto | Existing `crypto.randomUUID()` / `getRandomValues()` calls | No weak fallback and no cloud dependency |
| Git | Tracked `core.hooksPath=.githooks`, index plumbing, object IDs, non-zero hook abort | Preserve staged semantics and binary content identity |
| Git Bash | Executes tracked hook and process-local PATH | No new shell/controller layer |
| Windows PowerShell/Corepack | Existing local npm fallback | No user/system PATH mutation; no wrapper rewrite |
| Native OpenGSD | Research, requirements, roadmap, plan/check, execute, verify, state | Sole lifecycle authority; stop after verification |

No remote product service is introduced. Network services are not part of runtime or acceptance flow.

## Control and Data Flows

### 1. Secure Quick-Recording Identity Flow (Unchanged)

```text
recording artifact + existing session.id + settings
    ↓
createQuickRecording(...)
    ↓
createId("recording")
    ├─ randomUUID available ──► recording_<uuid>
    ├─ otherwise getRandomValues available ──► recording_<32 hex chars>
    └─ neither available ──► throw; no QuickRecording returned
    ↓
QuickRecording {
  id: recordingId,
  sessionId: existing session.id,
  artifactRef.artifactId: recordingId
}
    ↓
existing recording controller/repository/artifact storage paths
```

Architecture implication: this is a **recording-ID** contract. The existing session identity enters as input and is not generated or changed by this module.

### 2. Pre-Commit Runtime Selection and Formatting Flow (Corrected)

```text
git commit
    ↓
git diff --cached --check
    ├─ fail ──► abort commit
    └─ pass
         ↓
HEAD has formatting baseline?
    ├─ no ──► preserve bootstrap success
    └─ yes
         ↓
create safe staged-index snapshot + install cleanup trap
         ↓
read engine ranges from snapshot package.json
         ↓
discover direct node and npm/npm.cmd candidates
         ↓
probe both versions and compare to current engine contract
    ├─ both provably satisfy ──► direct npm route
    ├─ either missing/unparseable/unsatisfied
    │        └─ wrapper + powershell/pwsh available ──► npm-local.ps1 route
    └─ no compatible route ──► non-zero; cleanup; abort commit
         ↓
prepend repository node_modules/.bin for formatter executable resolution
         ↓
selected route --prefix <snapshot> run format:check
    ├─ non-zero ──► cleanup; abort commit
    └─ zero ──► cleanup; allow commit
```

#### Staged Contract Rule

Because the hook validates the staged snapshot, the engine values used for route selection should come from the same staged `package.json`. Reading a different working-tree copy can produce a false result when `package.json` is partially staged. Snapshot creation should therefore precede engine-contract evaluation (after the existing bootstrap check), or the hook should read the index blob directly. Reusing the already-required snapshot is simpler and keeps one content authority.

#### Route Matrix

| Direct Node | Direct npm | PowerShell wrapper | Result |
|-------------|------------|--------------------|--------|
| Satisfies engine | Satisfies engine | Any | Direct npm |
| Missing | Present | Available | Existing wrapper |
| Present | Missing | Available | Existing wrapper |
| Too old | Satisfies | Available | Existing wrapper |
| Satisfies | Too old | Available | Existing wrapper |
| Malformed/unprobeable | Any | Available | Existing wrapper |
| Any incompatible pair | Any incompatible pair | Unavailable/broken | Non-zero failure |

No case may select direct npm merely because `command -v npm` succeeds.

### 3. PDF Integrity Evidence Flow (No Mutation)

```text
HEAD:fixture path ──► committed blob ID ─┐
                                         ├─ equality required ─► evidence
working fixture ──git hash-object───────┘
        │
        └─ .gitattributes: *.pdf binary
```

Targets are exactly:

- `test-fixtures/sheets/real-sheet.pdf`
- `test-fixtures/sheets/two-page-sheet.pdf`

The final implementation diff for both paths must be empty. The intentionally invalid `bad-sheet.pdf` remains untouched.

### 4. Native Lifecycle Flow (Reconciled)

```text
PROJECT (approved scope and stop boundary)
    ↓
native research artifacts
    ↓
native requirements + roadmap phase
    ↓
native plan → native plan checker
    ↓
bounded executor changes existing owners only
    ↓
native verifier inspects code, tests, binary identity, authority, provenance
    ↓
verified milestone state
    ↓
STOP — later shipping requires new explicit authority
```

AGENTS and config constrain routing but do not replace this lifecycle. STATE and ROADMAP record native transitions; repository scripts must not compute or publish a second status.

## Dependency-Safe Implementation Order

### Stage 0 — Native Definition (Current Research/Planning)

1. Complete research synthesis.
2. Generate atomic requirements and a single bounded assurance phase in ROADMAP through Native OpenGSD.
3. Let native state mutation establish the active v1.2 phase.
4. Produce and checker-approve the implementation plan before code changes.

**Why first:** Execution must be governed by current v1.2 authority rather than the stale v1.1 release-exit narrative.

### Stage 1 — Freeze Baselines and Reconcile Routing

1. Record current secure-ID source/test behavior and the two valid fixture blob IDs.
2. Reconcile AGENTS/PROJECT wording with the native v1.2 STATE/ROADMAP: v1.1 shipped, v1.2 active, verification is the stop boundary.
3. Confirm config remains bounded and no worktree/product/release capability was enabled.

**Why before implementation:** Subsequent agents and verification must read coherent authority. Baseline hashes make accidental binary mutation detectable.

### Stage 2 — Characterize Existing Product Behavior

1. Add deterministic `randomUUID()` precedence coverage in the existing quick-metronome test file.
2. Run the focused test containing ordinary, fallback, and fail-closed paths.
3. Do not edit production `session.ts` unless the test exposes a contradiction with the already-approved behavior; such a contradiction would require plan-local diagnosis, not redesign.

**Why before hook correction:** It independently locks the only product-adjacent invariant and keeps any later failure attributable to repository tooling.

### Stage 3 — Correct the Existing Hook Owner

1. Define controlled route cases for both engine candidates and fallback/no-route outcomes.
2. Adjust snapshot timing/index access so engine selection uses the staged contract.
3. Add contained fail-closed version/range helpers inside `.githooks/pre-commit`.
4. Preserve `run_npm`, snapshot creation/exclusion, cleanup, and format invocation ownership.
5. Exercise syntax, compatible-direct, incompatible-fallback, missing/malformed, and no-route cases with ephemeral controlled commands.

**Why after characterization:** This is the only behavioral implementation change. It depends on the engine declarations, existing wrapper, and staged-snapshot flow, but not on product code.

### Stage 4 — Integrate and Verify Invariants

1. Recompute both valid PDF working/HEAD blob comparisons and require empty fixture diffs.
2. Inspect the complete diff for unchanged wrapper, production secure-ID source, package/lock, attributes, fixture bytes, application layers, and dormant seeds.
3. Run the proportional repository gates selected by the native plan, reusing exact-revision evidence only when policy permits.
4. Run Native OpenGSD verification against the resulting revision and reconcile final native state.
5. Stop. Do not enter shipping or final-review flow.

**Why last:** Binary, boundary, and lifecycle checks are integration invariants over the final bounded result, not components to implement separately.

## Verification Architecture

| Boundary | Focused Evidence | Integration Evidence | Failure Meaning |
|----------|------------------|----------------------|-----------------|
| Secure recording ID | Deterministic branch tests in existing unit file | Existing quick-recording focused suite | Product contract changed or characterization is incomplete |
| Hook selector | Controlled Node/npm/fallback matrix and shell syntax | Actual staged-snapshot `format:check` through selected route | Route decision or existing gate flow is incorrect |
| Wrapper reuse | Invocation through existing `npm-local.ps1` with incompatible direct pair | Relevant repository command succeeds under local runtime | Hook bypassed/replaced the established fallback |
| PDF bytes | Two working blob IDs equal two HEAD blob IDs | Empty tracked fixture diff; applicable PDF consumers remain valid if run | Local binary corruption or unauthorized fixture edit |
| Authority | Targeted contradiction search across PROJECT/STATE/ROADMAP/AGENTS | Native smart-entry/read-only state agrees with current lifecycle | Competing or stale routing remains |
| Scope | File ownership/diff inspection | Native verifier goal-backward result | New component/product/release work escaped the bounded plan |

Do not create a final-review-specific second native verifier pass. Native verification closes the current authorization; later release actions have their own separately authorized evidence.

## Operational Scaling Considerations

This milestone does not change application user scale. Relevant scale is the number of contributor runtime combinations.

| Environment | Architecture Behavior |
|-------------|-----------------------|
| Compatible Node/npm on PATH | Fast direct path; no PowerShell dependency |
| Windows Git Bash with incompatible/missing direct pair | Existing PowerShell wrapper supplies pinned local runtime |
| Environment without usable direct pair or PowerShell fallback | Fail closed with actionable error; do not silently skip formatting |
| Partially staged `package.json` | Engine decision follows the staged snapshot/index, matching the content being committed |
| Future unsupported engine expression | Fail closed/fallback rather than approximate; separately scope generalized semver support if the root contract changes |

There is no user-count-driven reason to split modules, add services, or introduce remote infrastructure.

## Architectural Anti-Patterns

### Parallel Runtime Wrapper

**What:** Add another `.ps1`, `.cmd`, Node launcher, or package-manager shim for the hook.
**Why wrong:** `scripts/npm-local.ps1` already owns compatible local execution; duplication creates drift.
**Instead:** Keep validation/routing in the hook and call the existing wrapper unchanged.

### Undeclared Transitive Dependency as Gate Infrastructure

**What:** Invoke the hoisted `semver` package even though the root manifest does not declare it.
**Why wrong:** Transitive placement/version is not a stable project contract, and the hook is deciding whether the candidate Node runtime is trustworthy.
**Instead:** Use contained fail-closed comparison for the current simple minimum ranges.

### Working-Tree Contract Against a Staged Snapshot

**What:** Validate working-tree `package.json` but format staged content.
**Why wrong:** Partial staging can make route selection and validated content disagree.
**Instead:** Read engine values from the staged snapshot/index.

### Product-Layer Extraction for One Private Helper

**What:** Export `createId`, add an ID service, or introduce a repository/domain abstraction solely for tests.
**Why wrong:** The behavior has one local owner and can be observed through public `createQuickRecording`.
**Instead:** Characterize through the existing public function and leave production boundaries intact.

### Binary “Repair” by Transformation

**What:** Re-save, normalize, or format PDF fixtures.
**Why wrong:** Byte offsets are content-sensitive and HEAD already contains valid blobs.
**Instead:** Restore/compare raw Git bytes and require no fixture diff.

### Lifecycle Sidecar

**What:** Add scripts that validate, retry, publish, or mirror OpenGSD lifecycle status.
**Why wrong:** Creates competing authority and violates the project reuse contract.
**Instead:** Use native research, planning/checking, execution, verification, STATE, and ROADMAP directly.

### Verification-to-Shipping Creep

**What:** Attach PR creation, final-head review/CI, merge, tag, or main sync to v1.2 verification.
**Why wrong:** These actions require later explicit authorization and are not dependencies of assurance completion.
**Instead:** Stop after the native verifier records the bounded result.

## Roadmap Implications

One phase and one sequential plan are architecturally sufficient because all work converges on existing owners and there is no deployment or cross-service boundary. The plan should group tasks by dependency rather than manufacture separate “product,” “tooling,” and “docs” phases:

1. Authority/baseline reconciliation.
2. Secure-ID characterization.
3. In-place hook selection correction and route evidence.
4. Binary/diff/gate integration evidence.
5. Native verification and stop.

Splitting these into independent parallel plans would increase integration ambiguity: config has `parallelization=false`, all work stays in the primary checkout, and authority/binary invariants are easiest to prove over one resulting revision.

## Confidence Assessment

| Area | Confidence | Basis |
|------|------------|-------|
| Existing component ownership | HIGH | Direct inspection of hook, wrapper, product module, tests, manifest, attributes, config, and authority files |
| Modified-versus-unchanged boundary | HIGH | Approved PROJECT constraints map directly to live owners; only the hook contains the known implementation defect |
| Staged engine-contract recommendation | HIGH | Hook already validates a staged snapshot; using the same snapshot avoids observable partial-staging inconsistency |
| Reuse decision | HIGH | Live search found existing hook/wrapper owners; installed `semver` is transitive and not a root dependency |
| Native lifecycle boundary | HIGH | PROJECT, config, AGENTS, and repository policy explicitly assign sole authority to Native OpenGSD |
| Platform hook/engine/Web Crypto semantics | MEDIUM | Official Git, npm, and MDN sources fetched/cached through the research seam and cross-checked with live code |

## Sources

### Repository Primary Sources (HIGH)

- [`PROJECT.md`](../PROJECT.md) — approved v1.2 goal, constraints, target outcomes, and stop boundary.
- [`.planning/config.json`](../config.json) — enabled native research/check/verify flow, disabled unrelated capabilities, no worktrees, sequential execution.
- [`AGENTS.md`](../../AGENTS.md) — repository routing and reuse policies, including stale v1.1 release-exit language to reconcile.
- [`.githooks/pre-commit`](../../.githooks/pre-commit) — current staged-index flow, cleanup, route selection, and npm invocation.
- [`scripts/npm-local.ps1`](../../scripts/npm-local.ps1) — pinned local Node/Corepack/npm fallback owner.
- [`src/lib/quick-metronome/session.ts`](../../src/lib/quick-metronome/session.ts) and [`tests/unit/quick-metronome-session.test.ts`](../../tests/unit/quick-metronome-session.test.ts) — secure recording-ID production/test boundary.
- [`package.json`](../../package.json) and [`package-lock.json`](../../package-lock.json) — root engine contract and evidence that `semver` is transitive rather than directly declared.
- [`.gitattributes`](../../.gitattributes) — binary PDF and planning/text ownership.
- [`skills/metronome-policy/SKILL.md`](../../skills/metronome-policy/SKILL.md) — mandatory reuse-first decision and prohibition on lifecycle sidecars.

### Supporting Official Documentation (MEDIUM, websearch provider verified)

- [Git hooks documentation](https://git-scm.com/docs/githooks) — pre-commit timing, working-directory context, and non-zero abort behavior.
- [Git `hash-object` documentation](https://git-scm.com/docs/git-hash-object) — content-derived blob identity for fixture evidence.
- [npm package.json `engines` documentation](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/#engines) — Node and npm engine range declarations.
- [MDN `Crypto.randomUUID()`](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID) and [MDN `Crypto.getRandomValues()`](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues) — approved secure identifier sources.

---
*Architecture research for: Metronome v1.2 Release Assurance & Workflow Closure*
*Researched: 2026-08-01*
