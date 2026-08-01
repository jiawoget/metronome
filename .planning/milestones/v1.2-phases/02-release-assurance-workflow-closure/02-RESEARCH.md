# Phase 2: Release Assurance & Workflow Closure - Research

**Researched:** 2026-08-01
**Domain:** Existing-behavior assurance across browser Web Crypto, a Git Bash pre-commit hook, Windows runtime fallback, Git binary identity, and Native OpenGSD lifecycle closure
**Confidence:** HIGH

## Summary

Phase 2 should be planned as one sequential assurance plan over existing owners, not as a feature build. The approved secure quick-recording implementation is already correct: `src/lib/quick-metronome/session.ts` prefers `crypto.randomUUID()`, falls back to exactly 16 `crypto.getRandomValues()` bytes rendered as lowercase hexadecimal, assigns the same ID to `recording.id` and `artifactRef.artifactId`, and throws when neither secure API exists. The existing focused unit file already proves the fallback and failure branches and restores stubbed globals; it needs only one deterministic both-APIs-present precedence test. `[VERIFIED: src/lib/quick-metronome/session.ts, tests/unit/quick-metronome-session.test.ts, and focused 18/18 test run]`

The only implementation correction belongs in `.githooks/pre-commit`. The hook currently selects the first present `npm`/`npm.cmd` without proving either that command's version or the Node runtime it will use. Keep the current staged-index snapshot, cleanup traps, bootstrap behavior, `.planning/**` exclusion, `run_npm` interface, whitespace check, and `format:check` boundary; replace only route eligibility. A direct route is allowed only when the exact captured `node` and exact captured npm candidate both report stable numeric versions satisfying the simple lower bounds read from staged `package.json`. Every missing, failed, malformed, prerelease, unsupported-range, or too-old case must use the unchanged `scripts/npm-local.ps1` route through `powershell`, then `pwsh`, or fail non-zero when neither fallback host exists. `[VERIFIED: .githooks/pre-commit, scripts/npm-local.ps1, package.json, .npmrc, and package-lock.json]` `[CITED: https://docs.npmjs.com/cli/configuring-npm/package-json/#engines]` `[CITED: https://semver.org/spec/v2.0.0.html]`

The remaining work is proof and authority reconciliation. Both target PDFs already have raw worktree blob IDs equal to their `HEAD` blobs (`598` and `936` bytes respectively) and no path diff, so they must not be rewritten. PROJECT, STATE, and ROADMAP now route to v1.2, while AGENTS still contains active v1.1 release-exit/shipping instructions and PROJECT still contains one misleading “session-ID” phrase; native state will also continue to change as the phase advances. Reconcile only active authority, verify the integrated revision, and stop after Native OpenGSD verification—no ship, push, PR, final-head review/CI, merge, tag, or local-main synchronization. `[VERIFIED: live Git object comparison, PROJECT.md, STATE.md, ROADMAP.md, AGENTS.md, REQUIREMENTS.md, and smart-entry --json]`

**Primary recommendation:** Modify only the existing hook selector and the existing focused test owner, reconcile active authority through Native OpenGSD, prove the immutable PDF and negative-scope invariants, run proportional exact-revision gates, then stop at native verification. `[VERIFIED: REQUIREMENTS.md, ROADMAP.md, PROJECT.md, and metronome-policy reuse contract]`

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Secure quick-recording identity | Browser / Client | Quick-metronome library | Browser Web Crypto supplies entropy; `src/lib/quick-metronome/session.ts` owns recording construction and identity linkage. No backend or storage tier should generate this ID. `[VERIFIED: live source and call sites]` |
| Pre-commit runtime eligibility | Repository Tooling / SCM | Host Runtime | `.githooks/pre-commit` owns selection and the staged gate; the host supplies candidate Node/npm and PowerShell, while `scripts/npm-local.ps1` owns the known-good local runtime. `[VERIFIED: live hook and wrapper]` |
| Staged formatting snapshot | Repository Tooling / SCM | Formatter | Git index plumbing owns the bytes under test; the existing npm script/Prettier installation only evaluates the exported snapshot. `[VERIFIED: live hook and package.json]` `[CITED: https://git-scm.com/docs/git-checkout-index]` |
| PDF fixture integrity | Git Object Store | Repository Worktree | `HEAD:<path>` is the committed authority and `git hash-object --no-filters` identifies raw worktree bytes without EOL/filter conversion. `[VERIFIED: live blob comparison]` `[CITED: https://git-scm.com/docs/git-hash-object]` |
| Lifecycle authority and closure | Native OpenGSD Control Plane | Repository routing docs | PROJECT/REQUIREMENTS/ROADMAP/STATE and native phase artifacts own lifecycle truth; AGENTS constrains routing but cannot be a parallel controller. `[VERIFIED: AGENTS.md, planning files, and metronome-policy]` |

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ID-01 | Prefer `crypto.randomUUID()` with the existing `recording_` prefix when both secure APIs exist. | Production branch order is already correct; add one deterministic `vi.stubGlobal("crypto", ...)` test and assert `getRandomValues` was not called. `[VERIFIED: session.ts, installed Vitest API, and current unit owner]` |
| ID-02 | Convert exactly 16 fallback bytes to 32 lowercase hex characters and keep artifact/recording IDs identical. | Existing production code and focused test already prove the exact byte vector, lowercase output, and ID linkage; retain them unchanged. `[VERIFIED: session.ts and quick-metronome-session.test.ts]` |
| ID-03 | Throw the existing secure-random error and create no recording without either Web Crypto path. | Existing constructor throws before returning a recording and the focused test asserts the exact error. `[VERIFIED: session.ts and quick-metronome-session.test.ts]` |
| HOOK-01 | Use direct Node/npm only when the exact candidates have stable versions satisfying staged engine lower bounds. | Read the staged manifest, accept only the current single `>=X.Y.Z` shape, capture exact paths before PATH changes, normalize/validate versions, and compare numeric triplets. `[VERIFIED: hook, manifest, and root engine contract]` `[CITED: https://semver.org/spec/v2.0.0.html]` |
| HOOK-02 | Route every unproven direct pair to the existing PowerShell fallback or fail non-zero. | Preserve current `powershell` then `pwsh` order and exact `-File ... "$@"` forwarding; exercise missing, malformed, prerelease, unsupported, incompatible, fallback, and no-route cases. `[VERIFIED: hook, wrapper, and live environment]` `[CITED: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_powershell_exe?view=powershell-5.1]` |
| HOOK-03 | Preserve the shipped staged-index gate and fast scope. | Keep whitespace, bootstrap, snapshot prefix/NUL flow, `.planning/**` exclusion, cleanup guards, root `node_modules/.bin`, exit propagation, and final format command structurally unchanged. `[VERIFIED: live hook, AGENTS.md, and successful fallback hook run]` |
| PDF-01 | Prove both readable PDF worktree blobs equal `HEAD`, retain valid sizes/offsets, and have no tracked diff. | Current raw IDs are equal; sizes are 598 and 936 bytes; both begin `%PDF-1.4`, end `%%EOF`, retain `startxref` values 415/713, and have empty path status. Recompute after implementation; do not edit them. `[VERIFIED: live Git and byte inspection]` |
| AUTH-01 | Make active PROJECT/STATE/ROADMAP/AGENTS authority coherent for shipped v1.1, active v1.2, dormant product scope, Native ownership, and the verification stop. | PROJECT/STATE/ROADMAP are substantially current; correct PROJECT terminology and stale AGENTS v1.1 release-exit clauses, then let native transitions update STATE/ROADMAP. `[VERIFIED: live authority files and contradiction search]` |
| FLOW-01 | Complete the v1.2 native research → requirements/roadmap → checked plan → bounded execution → verification chain. | Research/requirements/roadmap exist and smart-entry currently recommends planning Phase 2; later artifacts must be created by Native OpenGSD rather than project scripts. `[VERIFIED: init.phase-op, smart-entry --json, config.json, and live phase directory]` |
| SCOPE-01 | Produce no product expansion, secure-ID redesign, package/wrapper/controller, PDF content change, special reverify gate, or shipping action. | Use the negative-scope path/diff checks and selected-owner inventory below as the final integration gate; authorization ends at native verification. `[VERIFIED: PROJECT.md, REQUIREMENTS.md, ROADMAP.md, and AGENTS constraints as superseded by current owner direction where stale]` |
</phase_requirements>

## Project Constraints (from AGENTS.md)

- Native OpenGSD is the sole lifecycle and agent-coordination entrypoint; repository work must route from current STATE and ROADMAP. `[VERIFIED: AGENTS.md]`
- Use the active native phase; do not start a new milestone while v1.2 is active. `[VERIFIED: AGENTS.md, STATE.md, and ROADMAP.md]`
- Do not imitate native research, planning, checking, retry/recovery, execution, verification, state transition, or shipping with repository scripts or hand-built controller steps. `[VERIFIED: AGENTS.md]`
- Lifecycle mutations use native commands and are checked with read-only `smart-entry --json`; an unexplained contradiction is a stop condition. `[VERIFIED: AGENTS.md]`
- `workflow.use_worktrees=false`; all work stays in `C:\Users\wsuto\metronome`, and no Git worktree may be created or invoked. `[VERIFIED: AGENTS.md and config.json]`
- Typed dispatch must use native-resolved agent type/model/effort with `fork_turns: "none"` where supported; missing exact binding is fail-closed. `[VERIFIED: AGENTS.md]`
- Within the approved bounded phase, continue through one plan-local diagnosis/repair loop without routine stage prompts; stop for material scope/architecture changes, global/irreversible actions, missing external authority, or an unresolved high-impact blocker. `[VERIFIED: AGENTS.md]`
- Keep product-domain capability toggles disabled for this tooling-only milestone and re-evaluate them only in a future milestone that needs them. `[VERIFIED: AGENTS.md and config.json]`
- Treat codebase-map/Lumen output only as navigation caches and confirm material facts in live files. `[VERIFIED: AGENTS.md and metronome-policy]`
- Apply `skills/metronome-policy/SKILL.md` to any added/replaced/materially expanded behavior or abstraction; reuse existing owners and do not create parallel capability. `[VERIFIED: AGENTS.md and metronome-policy]`
- Keep the tracked hook fast: staged whitespace plus bootstrap-aware `format:check`; do not add lint, typecheck, full unit, or build to every commit. `[VERIFIED: AGENTS.md]`
- Reuse exact-revision full-gate evidence only when the revision and inputs are unchanged; rerun on stale/missing/contradictory evidence or relevant head/input/topology changes. `[VERIFIED: AGENTS.md]`
- Preserve the repository-local runtime fallback and do not mutate global or user PATH. `[VERIFIED: AGENTS.md]`
- Never bypass hooks with `--no-verify` without explicit owner instruction. `[VERIFIED: AGENTS.md]`
- `security_enforcement=false` and `workflow.nyquist_validation=false` for this milestone, so Security Domain and Validation Architecture sections are intentionally omitted. `[VERIFIED: .planning/config.json]`
- The active AGENTS clauses saying the v1.1 release exit is still active/pending and authorizing its shipping flow are stale relative to the owner's current v1.2 decision; Stage 1 must reconcile them before later agents route work. They are evidence of AUTH-01 drift, not permission to ship. `[VERIFIED: AGENTS.md versus PROJECT.md, REQUIREMENTS.md, STATE.md, ROADMAP.md, and the explicit owner scope]`

## Standard Stack

### Core

| Tool/API | Version / Contract | Purpose | Why Standard Here |
|----------|--------------------|---------|-------------------|
| Browser Web Crypto | `randomUUID()` then `getRandomValues(Uint8Array(16))` | Secure recording identity | It is the existing production owner and supplies cryptographically strong bytes without a package. `[VERIFIED: live source]` `[CITED: https://www.w3.org/TR/webcrypto-2/#Crypto-method-getRandomValues]` `[CITED: https://www.w3.org/TR/webcrypto-2/#Crypto-method-randomUUID]` |
| Git for Windows | 2.55.0.windows.3 | Hook execution, staged snapshot, object identity | The tracked hook and fixture proof already use Git-native plumbing; no sidecar manifest or controller is required. `[VERIFIED: live environment and repository]` |
| Git Bash | 5.3.15 | Execute the tracked Bash hook | The hook is tracked mode `100755` with `set -euo pipefail`; testing must use Git Bash's own `/usr/bin` utilities rather than the unrelated Windows WSL `bash.exe`. `[VERIFIED: live environment and hook mode]` |
| Windows PowerShell / PowerShell | 5.1.26100.8875 / 7.6.4 | Host the existing fallback | Both are available; preserve current priority `powershell` then `pwsh` and literal argument forwarding. `[VERIFIED: live environment and hook]` |
| Repository-local Node | 24.17.0 | Known-good fallback runtime | `scripts/npm-local.ps1` prepends this runtime only inside its process. `[VERIFIED: wrapper and live output]` |
| Repository-local npm | 11.17.0 | Known-good package command | The wrapper asks Corepack for the same version required by `packageManager` and the npm engine minimum. `[VERIFIED: wrapper, package.json, and live output]` |

### Supporting

| Library/Tool | Version | Purpose | When to Use |
|--------------|---------|---------|-------------|
| Vitest | 4.1.9 locked and installed | Deterministic secure-ID characterization | Use existing `vi.stubGlobal` and `vi.unstubAllGlobals` in the existing unit file. `[VERIFIED: package.json, package-lock.json, installed declarations, and official Vitest docs]` |
| Prettier | 3.9.5 locked and installed | Existing staged format policy | Invoke only through the existing `format:check` npm script; do not change formatter ownership. `[VERIFIED: package.json, package-lock.json, and successful hook run]` |
| `prettier-plugin-tailwindcss` | 0.8.0 locked and installed | Existing Tailwind-aware ordering | It remains an unchanged installed input to `format:check`; Phase 2 does not upgrade or reinstall it. `[VERIFIED: package.json and package-lock.json]` |
| Git object commands | Git 2.55.0 | Raw PDF identity | Use `hash-object --no-filters` and `rev-parse HEAD:<path>` at baseline and final integration. `[VERIFIED: live commands]` `[CITED: https://git-scm.com/docs/git-hash-object]` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff / Rejection |
|------------|-----------|----------------------|
| Narrow in-hook stable-triplet comparator | Add `semver` as a root dependency | `semver` 6.3.1 exists only transitively; using it requires trusting a Node runtime before selection and a direct dependency would change manifest/lock. Reject for this bounded phase. `[VERIFIED: package.json, package-lock.json, installed metadata, and SCOPE-01]` |
| Existing `scripts/npm-local.ps1` | New Bash/Node wrapper or runtime manager | Duplicates a verified owner and expands maintenance/security scope. Reject. `[VERIFIED: wrapper and reuse contract]` |
| Native Web Crypto | UUID package or a shared local weak-fallback helper | Adds a dependency or imports `Date.now()`/`Math.random()` semantics that violate ID-03. Reject. `[VERIFIED: local ID implementation search and requirements]` |
| Git blob identity | SHA sidecar/checksum manifest | Duplicates Git's object authority and creates a permanent subsystem for a one-time proof. Reject. `[VERIFIED: current blob equality and SCOPE-01]` |
| Native lifecycle artifacts | Custom workflow validator/controller | Creates competing lifecycle authority. Reject. `[VERIFIED: AGENTS.md and metronome-policy]` |

**Installation:** None. Phase 2 must not run `npm install`, change `package.json`/`package-lock.json`, or add any external package. `[VERIFIED: SCOPE-01 and live dependency inventory]`

**Version verification:** Existing versions were confirmed from the root manifest, lockfile, installed package metadata/types, and live CLI output on 2026-08-01. Registry publish-date selection is not applicable because no package/version is being selected or installed. `[VERIFIED: package.json, package-lock.json, node_modules metadata, and live environment]`

## Package Legitimacy Audit

Not applicable: this phase installs no packages. The planner must treat any proposed dependency installation as a scope deviation. `vitest`, `prettier`, and `prettier-plugin-tailwindcss` are pre-existing locked/installed inputs; transitive `semver` is explicitly rejected as a new direct dependency. `[VERIFIED: package.json, package-lock.json, installed metadata, and SCOPE-01]`

**Packages removed due to [SLOP] verdict:** none—no candidate packages were proposed.

**Packages flagged as suspicious [SUS]:** none—no package installation is planned.

## Compact Reuse Decision

| Evidence Lane | Findings | Decision |
|---------------|----------|----------|
| Equivalent local implementations | `session.ts` already owns the exact `randomUUID → 16 secure bytes → throw` recording-ID contract. Other local ID helpers in sheet library, references, practice sessions, error markers, presets, segments, and dashboard either expose only `randomUUID` or permit timestamp/`Math.random()` fallbacks, so they are not semantically equivalent to the secure fail-closed contract. `.githooks/pre-commit` already owns selection/snapshotting and `scripts/npm-local.ps1` already owns local runtime execution. `[VERIFIED: live source, types, call sites, and tests]` | Reuse `session.ts`, its existing unit file, the tracked hook, and the unchanged PowerShell wrapper. Do not centralize IDs or create a second hook/runtime abstraction. |
| Installed dependency APIs | Vitest 4.1.9 exposes `vi.stubGlobal` and `vi.unstubAllGlobals`; the current test already uses both patterns. Transitive `semver` 6.3.1 is installed but is not declared at the root and cannot safely choose the Node runtime required to execute itself. `[VERIFIED: lockfile and installed declarations/source]` | Use existing Vitest APIs for the new characterization. Do not use or promote transitive `semver`; keep version proof inside the shell owner. |
| Mature platform / OSS APIs | W3C Web Crypto defines secure UUID/random-byte behavior; Git supplies pre-commit abort, staged export, raw hashing, and binary attributes; Bash documents guarded `errexit`/`pipefail`; PowerShell documents `-File` arguments and exit propagation. `[CITED: https://www.w3.org/TR/webcrypto-2/]` `[CITED: https://git-scm.com/docs/githooks]` `[CITED: https://git-scm.com/docs/git-checkout-index]` `[CITED: https://www.gnu.org/software/bash/manual/html_node/The-Set-Builtin.html]` `[CITED: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_powershell_exe?view=powershell-5.1]` | Use these existing platform capabilities directly. No OSS package or custom controller is warranted. |
| Selected approach | Existing owners cover all capabilities; only direct-route eligibility is defective and only one primary-branch test is missing. `[VERIFIED: requirements-to-owner trace]` | Make the minimum in-place hook change, one focused test addition, targeted authority reconciliation, immutable fixture proof, and native verification stop. |

**Concrete rejection reasons:** shared weak ID helpers violate ID-03; a UUID package changes dependencies; transitive `semver` has bootstrap and ownership problems; a new wrapper duplicates `npm-local.ps1`; a fixture manifest duplicates Git; a lifecycle script violates Native OpenGSD exclusivity. `[VERIFIED: live alternatives, requirements, and reuse contract]`

## Architecture Patterns

### System Architecture Diagram

```text
Browser recording request
  -> createQuickRecording (existing owner)
     -> randomUUID available? -- yes --> recording_<uuid>
     |                         no
     -> getRandomValues available? -- yes --> 16 bytes -> 32 lower-hex chars
                               no
                               -> throw secure-random error -> no recording
  -> recording.id == artifactRef.artifactId

git commit / controlled hook test
  -> tracked pre-commit
     -> git diff --cached --check
     -> HEAD contains formatting policy? -- no --> bootstrap success
                                      yes
     -> read staged package.json engine minima
     -> capture exact node + npm candidate paths
     -> both stable and >= staged minima? -- yes --> exact direct npm
                                     no
     -> npm-local.ps1 exists + powershell? -- yes --> local Node/Corepack/npm
                                     no
     -> npm-local.ps1 exists + pwsh? -- yes --> local Node/Corepack/npm
                                     no
                                     -> non-zero failure
     -> export staged index excluding .planning/**
     -> snapshot-scoped format:check
     -> guarded cleanup + original exit status

Raw PDF worktree bytes -> git hash-object --no-filters
Committed PDF bytes    -> git rev-parse HEAD:<path>
                           -> equal IDs + empty path diff? --> immutable proof

Native PROJECT/REQUIREMENTS/ROADMAP/STATE
  -> research -> checker-approved plan -> bounded execution -> verification
  -> STOP (no shipping actions)
```

The flows above are existing component boundaries plus the one selector correction; they do not introduce a new runtime or lifecycle service. `[VERIFIED: live repository and requirements]`

### Recommended Project Structure

```text
.githooks/
└── pre-commit                                  # modify selector only
scripts/
└── npm-local.ps1                               # existing fallback; unchanged
src/lib/quick-metronome/
└── session.ts                                  # production behavior; unchanged
tests/unit/
└── quick-metronome-session.test.ts             # add one precedence test
test-fixtures/sheets/
├── real-sheet.pdf                              # immutable; verify only
└── two-page-sheet.pdf                          # immutable; verify only
.planning/
├── PROJECT.md                                  # correct active terminology if needed
├── REQUIREMENTS.md                             # native authority
├── ROADMAP.md                                  # native lifecycle mutation only
├── STATE.md                                    # native lifecycle mutation only
└── phases/02-release-assurance-workflow-closure/
    ├── 02-RESEARCH.md                          # this artifact
    ├── 02-01-PLAN.md                           # native planner/checker output
    └── 02-VERIFICATION.md                      # native verifier output
AGENTS.md                                       # reconcile stale active routing
```

No new source module, wrapper, package, fixture, checksum file, selector library, or lifecycle script should appear. `[VERIFIED: SCOPE-01 and reuse decision]`

### Pattern 1: Characterize Existing Behavior at Its Current Test Owner

**What:** Add one deterministic both-APIs-present test beside the existing fallback and unavailable-crypto tests. `[VERIFIED: current unit file]`

**When to use:** Use before touching the hook so the product-adjacent invariant is frozen independently. Production `session.ts` should remain unchanged unless the test reveals a contradiction, which would trigger bounded diagnosis rather than redesign. `[VERIFIED: locked owner decision]`

**Example:** See “Deterministic `randomUUID` precedence” under Code Examples. `[CITED: https://vitest.dev/api/vi#vi-stubglobal]`

### Pattern 2: Staged Contract, Exact Candidate, Conservative Fallback

**What:** Read engine minima from `git show :package.json`, accept only exactly one normalized `>=MAJOR.MINOR.PATCH` value for each engine, resolve candidate paths before the existing PATH prepend, probe the exact paths, and invoke the exact npm path only when both stable versions compare numerically at or above the staged minima. `[VERIFIED: staged hook architecture and HOOK-01]` `[CITED: https://semver.org/spec/v2.0.0.html]`

**When to use:** Always for direct route selection. Any ambiguity returns “not eligible,” which activates the existing fallback; ambiguity is not a reason to abort before checking fallback. `[VERIFIED: HOOK-02]`

**Required route matrix:**

| Staged Node Range | Staged npm Range | Candidate Node | Candidate npm | Expected Route |
|-------------------|------------------|----------------|---------------|----------------|
| `>=24.0.0` | `>=11.17.0` | `v24.0.0` | `11.17.0` | Exact direct npm candidate. `[VERIFIED: current contract]` |
| same | same | `v24.17.0` | `11.17.1` | Exact direct npm candidate. `[VERIFIED: numeric lower-bound rule]` |
| same | same | `v25.0.0` | `12.0.0` | Exact direct npm candidate. `[VERIFIED: numeric lower-bound rule]` |
| same | same | `v23.99.99` | `11.17.0` | Existing PowerShell fallback. `[VERIFIED: current minima]` |
| same | same | `v24.17.0` | `11.16.9` | Existing PowerShell fallback. `[VERIFIED: current minima]` |
| same | same | `v25.0.0-rc.1` | `11.17.0` | Existing PowerShell fallback; prerelease is not eligible. `[CITED: https://semver.org/spec/v2.0.0.html]` |
| same | same | valid | malformed/failed/missing | Existing PowerShell fallback. `[VERIFIED: HOOK-02]` |
| missing/duplicate/compound/unsupported | any | any | any | Existing PowerShell fallback. `[VERIFIED: locked bounded-range decision]` |
| any ineligible case | any | any | any | Non-zero only when wrapper/PowerShell routes are unavailable. `[VERIFIED: HOOK-02]` |

### Pattern 3: Ephemeral Selector Matrix Plus Real Integration

**What:** Test route selection in a temporary minimal Git repository with distinguishable PATH shims that log probe and invocation, then separately run the real tracked hook in the real checkout with direct Node/npm absent so the unchanged `npm-local.ps1` and staged snapshot are exercised. `[VERIFIED: repository research and live fallback run]`

**When to use:** Use during hook implementation and verification. Keep shims outside the tracked tree; do not add a permanent hook harness. A simplistic PowerShell launch of `bash.exe` is not representative: in this sandbox, non-login invocation lacked Git `/usr/bin/mktemp`, while a Git Bash login invocation had it; the real hook also requires temporary write access under `.git`. `[VERIFIED: live environment probes and successful escalated Git Bash hook run]`

**Harness constraints:**

- Preserve Git Bash system paths needed for `git`, `mktemp`, `sed`/`awk`, `rm`, and `cygpath`; prepend only the temporary sentinel directory. `[VERIFIED: hook dependencies]`
- Give fake `node`, `npm`, and `npm.cmd` distinct logs so the same resolved npm candidate is visibly probed and invoked. `[VERIFIED: probe/invoke risk]`
- Use an ephemeral fallback host sentinel for selector-only cases, but also run the real wrapper in the real checkout to prove cross-shell arguments and `format:check`. `[VERIFIED: separation of selector and integration evidence]`
- For no-route evidence, exclude Windows PowerShell directories while retaining Git utilities; require the hook's actionable non-zero route failure, not an earlier missing-tool failure. `[VERIFIED: HOOK-02 acceptance boundary]`
- Clean all temporary repositories/shims/logs; do not stage them. `[VERIFIED: SCOPE-01]`

### Pattern 4: Git Object Identity for Immutable Binary Fixtures

**What:** Compare raw worktree blob IDs against committed blob IDs and require an empty path diff. `--no-filters` is essential because it explicitly ignores attribute filters and EOL conversion. `[CITED: https://git-scm.com/docs/git-hash-object]`

**When to use:** At baseline and again over the final implementation revision. Do not restore/write a fixture when equality already holds. `[VERIFIED: current PDF equality]`

### Pattern 5: Native Closure With a Negative-Scope Gate

**What:** Reconcile active authority, create/check/execute/verify through Native OpenGSD, and inspect the final diff for forbidden owners. `[VERIFIED: AGENTS.md, REQUIREMENTS.md, and metronome-policy]`

**When to use:** The plan's final task. The verifier result is the authorization endpoint, not the start of release exit. `[VERIFIED: PROJECT.md and SCOPE-01]`

### Anti-Patterns to Avoid

- **General SemVer implementation:** Do not attempt npm's full range grammar. Support only the current single stable lower-bound form and fall back on everything else. `[VERIFIED: deferred generalized-range requirement]`
- **Lexical or major-only comparison:** `11.9.0` must not outrank `11.17.0`; compare validated components numerically. `[CITED: https://semver.org/spec/v2.0.0.html]`
- **Probe/invoke drift:** Do not probe `npm` and later execute a bare name that may resolve to `npm.cmd` or another PATH entry after `node_modules/.bin` is prepended. `[VERIFIED: hook ordering and Windows candidate inventory]`
- **Unguarded probes under `set -e`:** Failed command substitutions must be inside explicit conditional logic so fallback remains reachable. `[CITED: https://www.gnu.org/software/bash/manual/html_node/The-Set-Builtin.html]`
- **PowerShell string collapsing or `eval`:** Preserve `"$@"`, `-NoProfile`, `-NonInteractive`, `-ExecutionPolicy Bypass`, and `-File`. `[VERIFIED: current hook]` `[CITED: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_powershell_exe?view=powershell-5.1]`
- **Worktree-only formatting evidence:** The hook checks an index export, not arbitrary working bytes. Keep `checkout-index`, NUL-delimited paths, prefix, and `.planning/**` exclusion. `[VERIFIED: current hook]` `[CITED: https://git-scm.com/docs/git-checkout-index]`
- **Product or fixture edits:** `session.ts` and the two valid PDFs are unchanged invariants; production or binary diffs are deviation signals. `[VERIFIED: SCOPE-01]`
- **Lifecycle sidecar or release creep:** Do not add controllers, special reverify gates, or shipping actions. `[VERIFIED: owner decisions and metronome-policy]`

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Secure random identity | UUID generator, PRNG, weak fallback, shared weak-ID abstraction | Existing Web Crypto branch in `session.ts` | Security, collision, prefix, and failure behavior are already correct and locked. `[VERIFIED: live source and requirements]` |
| Full npm range evaluation | General SemVer parser in Bash | Narrow current-shape extractor/comparator plus conservative fallback | Full range grammar is outside scope; the fallback already supplies a compatible runtime. `[VERIFIED: deferred requirement and existing wrapper]` |
| Runtime bootstrap | New wrapper/downloader/version manager | Existing `scripts/npm-local.ps1` | It already pins local Node/Corepack/npm and changes PATH only in-process. `[VERIFIED: live wrapper]` |
| Hook testing framework | Tracked simulator/controller/telemetry | Ephemeral Git repo/PATH sentinels plus real hook integration | Permanent infrastructure is unnecessary for this bounded selector change. `[VERIFIED: SCOPE-01]` |
| Binary integrity subsystem | Checksums, fixture normalizer, PDF rewriter | Git raw blob identity and binary attributes | Git already owns exact committed bytes and filter semantics. `[VERIFIED: live equality]` `[CITED: https://git-scm.com/docs/git-hash-object]` |
| Workflow status validator | Receipt, ledger, retry loop, custom state publisher | Native OpenGSD artifacts and smart-entry read-only check | A second control plane would contradict repository authority. `[VERIFIED: AGENTS.md and metronome-policy]` |

**Key insight:** The phase is safest when every requirement is expressed as either a focused characterization of an existing owner, one contained eligibility correction in that owner, or a proof of an unchanged invariant. `[VERIFIED: requirement-to-owner map]`

## Common Pitfalls

### Pitfall 1: Stale AGENTS Text Dispatches v1.1 Shipping

**What goes wrong:** A later agent reads the active v1.1 release-exit clauses and proceeds toward archival/PR/merge despite v1.2's post-verification stop. `[VERIFIED: live AGENTS contradiction]`

**Why it happens:** PROJECT/STATE/ROADMAP were advanced to v1.2, but AGENTS still contains v1.1 pending-release instructions and PROJECT has one “session-ID” wording remnant. `[VERIFIED: contradiction search]`

**How to avoid:** Reconcile active routing before hook execution, preserve completed milestone archives, and confirm smart-entry still points to the current native stage. `[VERIFIED: AGENTS workflow and smart-entry result]`

**Warning signs:** “release exit is active,” “release exit is still pending,” authorization through merge, or current scope described as session-ID/product redesign. `[VERIFIED: live text]`

### Pitfall 2: Presence-Only or Incorrect Version Comparison

**What goes wrong:** An old Node, old npm, malformed version, or prerelease is treated as eligible; lexical comparison may also rank `11.9.0` above `11.17.0`. `[VERIFIED: current selector defect and route matrix]`

**Why it happens:** The hook currently checks only command presence and runs with strict Bash options. `[VERIFIED: .githooks/pre-commit]`

**How to avoid:** Guard probes, validate complete stable triplets, ignore only valid build metadata, reject prereleases, and compare major/minor/patch numerically. `[CITED: https://semver.org/spec/v2.0.0.html]` `[CITED: https://www.gnu.org/software/bash/manual/html_node/The-Set-Builtin.html]`

**Warning signs:** bare `command -v npm` immediately sets the final command; use of string comparison, `sort -V`, or only a happy-path case. `[VERIFIED: current defect and required matrix]`

### Pitfall 3: One Executable Is Probed and Another Invoked

**What goes wrong:** Evidence comes from one npm form/path while the later PATH mutation resolves another. `[VERIFIED: current hook ordering and Windows command forms]`

**Why it happens:** Bare names survive discovery, candidate priority is recomputed, or PATH changes before capture. `[VERIFIED: hook flow]`

**How to avoid:** Capture exact absolute `node` and npm paths before prepending `node_modules/.bin`, and use the captured npm path in `run_npm`. `[VERIFIED: HOOK-01 interpretation]`

**Warning signs:** logs show different candidate paths; the code probes `npm` but stores only `npm_cmd="npm"`; tests never expose competing `npm` and `npm.cmd`. `[VERIFIED: route-provenance requirement]`

### Pitfall 4: PowerShell Fallback Is Accidentally Redesigned

**What goes wrong:** Paths with spaces or npm arguments split, profiles alter output, the hook blocks for input, exit codes disappear, or PATH is mutated persistently. `[VERIFIED: cross-shell boundary and wrapper]`

**Why it happens:** `"$@"` is collapsed, `eval` is introduced, flags are reordered, or the wrapper is edited despite no defect. `[VERIFIED: current correct invocation]`

**How to avoid:** Keep the current PowerShell call and wrapper byte-for-byte where practical; the selector merely chooses it. `[CITED: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_powershell_exe?view=powershell-5.1]`

**Warning signs:** a wrapper diff, concatenated npm command string, missing `-NonInteractive`, or global/user PATH commands. `[VERIFIED: scope boundary]`

### Pitfall 5: The Test Environment Does Not Reproduce Git Bash

**What goes wrong:** The hook fails on a missing utility or sandbox write before reaching selection, producing a false conclusion about route logic. `[VERIFIED: live non-login and sandboxed hook attempts]`

**Why it happens:** Windows exposes an unrelated WSL `bash.exe`; Git Bash utilities are available only under its own login PATH, and snapshot creation writes under `.git`. `[VERIFIED: live environment]`

**How to avoid:** Use Git for Windows Bash with `/mingw64/bin:/usr/bin:/bin`, allow the hook's temporary `.git/pre-commit-index.*` write/cleanup, and design the no-route PATH so required Git utilities remain present. `[VERIFIED: successful real fallback hook run]`

**Warning signs:** failure occurs at `mktemp`, `git`, `cygpath`, or sandbox permission before any route evidence. `[VERIFIED: diagnostic runs]`

### Pitfall 6: Working-Tree Checks Replace Staged-Snapshot Evidence

**What goes wrong:** Root `format:check` passes while staged bytes fail, or a staged/unstaged split is invisible. `[VERIFIED: hook architecture]`

**Why it happens:** `git checkout-index --prefix` and `npm --prefix` are removed or tests invoke only the repository root. `[VERIFIED: hook flow]`

**How to avoid:** Preserve index export, the trailing prefix slash, NUL-separated filenames, `.planning/**` exclusion, and actual hook invocation. `[CITED: https://git-scm.com/docs/git-checkout-index]`

**Warning signs:** no `staged-index` log, no representative index, or `format:check` runs only in the worktree. `[VERIFIED: existing hook output]`

### Pitfall 7: PDF “Repair” Creates a Content Change

**What goes wrong:** A copy, formatter, EOL tool, or PDF generator rewrites offsets even though the working files already equal valid `HEAD` blobs. `[VERIFIED: current byte equality and historical corruption description]`

**Why it happens:** Visual validity or ordinary hashing is substituted for raw Git-object comparison. `[VERIFIED: PDF-01 evidence model]`

**How to avoid:** Recompute raw worktree and `HEAD` IDs before and after implementation; require the two target path diffs to remain empty. `[CITED: https://git-scm.com/docs/git-hash-object]`

**Warning signs:** any fixture hunk/status, size different from 598/936, changed `startxref`, or a new checksum/fixture script. `[VERIFIED: current fixture evidence and SCOPE-01]`

### Pitfall 8: Exact-Revision Evidence Is Reused After Inputs Change

**What goes wrong:** A prior green full suite is cited even though the hook, focused test, manifest, lock, formatter inputs, or revision changed. `[VERIFIED: AGENTS exact-revision policy]`

**Why it happens:** “same phase” is mistaken for “same revision and inputs.” `[VERIFIED: AGENTS.md]`

**How to avoid:** Record revision and inputs with every expensive gate; rerun focused evidence after each relevant change and run/reuse the full suite only under the documented policy. `[VERIFIED: AGENTS.md]`

**Warning signs:** no commit/revision provenance, a head change after evidence, or contradictory focused results. `[VERIFIED: release evidence policy]`

## Code Examples

Verified patterns from live owners and official sources follow. They are planner guidance, not pre-approved new abstractions.

### Deterministic `randomUUID` Precedence

```typescript
// Source: existing tests/unit/quick-metronome-session.test.ts pattern
// Official API: https://vitest.dev/api/vi#vi-stubglobal
it("prefers randomUUID when both secure ID APIs are available", () => {
  const randomUUID = vi.fn(() => "123e4567-e89b-42d3-a456-426614174000");
  const getRandomValues = vi.fn((bytes: Uint8Array) => bytes);

  vi.stubGlobal("crypto", { randomUUID, getRandomValues });

  const recording = createQuickRecording({
    artifact: {
      blob: new Blob(),
      durationMs: 0,
      mimeType: "audio/webm",
      sizeBytes: 0,
      analysis: null
    },
    session: { id: "session-secure-primary" },
    settings: DEFAULT_METRONOME_SETTINGS,
    createdAt: new Date("2026-06-21T08:01:00Z")
  });

  expect(recording.id).toBe(
    "recording_123e4567-e89b-42d3-a456-426614174000"
  );
  expect(recording.artifactRef.artifactId).toBe(recording.id);
  expect(randomUUID).toHaveBeenCalledOnce();
  expect(getRandomValues).not.toHaveBeenCalled();
});

// Existing afterEach already calls vi.unstubAllGlobals().
```

`vi.stubGlobal` installs a global value and `vi.unstubAllGlobals` restores originals; the installed Vitest 4.1.9 declarations expose both APIs. `[VERIFIED: installed Vitest declarations]` `[CITED: https://vitest.dev/api/vi#vi-stubglobal]`

### Fail-Closed Selector Shape

```bash
# Source: existing .githooks/pre-commit ownership plus official Bash/SemVer rules.
# Pseudocode: planner/executor must implement and test the exact shell form.

staged_package_json="$(git show :package.json 2>/dev/null)" || staged_package_json=""

# extract_single_minimum accepts exactly one engines.<name> value of >=X.Y.Z.
# stable_at_least accepts a validated stable candidate X.Y.Z[+build] and
# compares major/minor/patch numerically. Either helper returns non-zero on
# missing, duplicate, malformed, prerelease, or unsupported input.

if minima_are_supported "$staged_package_json" &&
   capture_exact_node_candidate &&
   capture_exact_npm_candidate &&
   probe_versions_guarded &&
   stable_at_least "$node_version" "$node_minimum" &&
   stable_at_least "$npm_version" "$npm_minimum"; then
  npm_cmd="$captured_npm_path"
elif [ -f "$npm_local_script" ] && command -v powershell >/dev/null 2>&1; then
  power_shell="powershell"
elif [ -f "$npm_local_script" ] && command -v pwsh >/dev/null 2>&1; then
  power_shell="pwsh"
else
  printf '%s\n' "Could not find a supported npm route for the pre-commit hook." >&2
  exit 1
fi
```

Failed probes are explicitly guarded because Bash `errexit` has conditional exceptions and `pipefail` changes pipeline status; unguarded command substitutions can terminate before fallback. `[CITED: https://www.gnu.org/software/bash/manual/html_node/The-Set-Builtin.html]`

### Raw PDF Identity Proof

```powershell
$paths = @(
  'test-fixtures/sheets/real-sheet.pdf',
  'test-fixtures/sheets/two-page-sheet.pdf'
)

foreach ($path in $paths) {
  $headBlob = (git rev-parse "HEAD:$path").Trim()
  $worktreeBlob = (git hash-object --no-filters -- $path).Trim()

  if ($headBlob -ne $worktreeBlob) {
    throw "Raw fixture bytes differ from HEAD: $path"
  }
}

git diff --exit-code -- $paths
git diff --cached --exit-code -- $paths
```

`--no-filters` hashes contents as-is, including bypassing EOL conversion, so equality is appropriate for PDF offsets. `[CITED: https://git-scm.com/docs/git-hash-object]`

### Focused and Integration Commands

```powershell
# Focused product characterization (observed 18/18 before the new test)
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/quick-metronome-session.test.ts

# Syntax only; run from Git for Windows Bash
bash -n .githooks/pre-commit

# Real fallback integration; use Git Bash login/environment and permit only
# the hook's temporary .git/pre-commit-index.* snapshot write/cleanup.
./.githooks/pre-commit

# Negative-scope diff
git diff -- package.json package-lock.json scripts/npm-local.ps1 `
  src/lib/quick-metronome/session.ts .gitattributes `
  test-fixtures/sheets/real-sheet.pdf `
  test-fixtures/sheets/two-page-sheet.pdf
```

The real current fallback hook run completed `format:check` successfully when executed in Git Bash with temporary `.git` snapshot permission. `[VERIFIED: live hook run on 2026-08-01]`

## State of the Art

| Old / Defective Approach | Current Recommended Approach | When Established | Impact |
|--------------------------|------------------------------|------------------|--------|
| Select direct npm by command presence | Qualify the exact Node/npm pair against staged stable lower bounds; otherwise reuse fallback | v1.2 owner decision, 2026-08-01 | Prevents an available but engine-incompatible pair from running the commit gate. `[VERIFIED: current defect and requirements]` |
| Trust a bare command name after PATH changes | Capture, probe, and invoke exact paths before the existing PATH prepend | Phase 2 research, 2026-08-01 | Makes route provenance observable and prevents mixed-pair execution. `[VERIFIED: Windows candidate analysis]` |
| Implicit primary Web Crypto branch coverage | Deterministic both-APIs precedence test plus existing fallback/failure tests | Phase 2 assurance, 2026-08-01 | Locks behavior without production redesign. `[VERIFIED: current coverage gap]` |
| Visual/file-size PDF confidence | Raw worktree blob ID equals `HEAD` blob ID plus empty path diff | Phase 2 assurance, 2026-08-01 | Proves exact bytes including offset-sensitive content. `[VERIFIED: live Git evidence]` |
| v1.1 release-exit instructions in active routing | v1.2 native planning/execution/verification with a hard post-verification stop | Owner decision, 2026-08-01 | Prevents unauthorized release work and restores one lifecycle authority. `[VERIFIED: current project decisions]` |

**Deprecated/outdated:**

- Presence-only `npm`/`npm.cmd` routing is the confirmed defect. `[VERIFIED: .githooks/pre-commit]`
- Active text claiming v1.1 release exit remains pending is stale. `[VERIFIED: AGENTS.md versus current planning authority]`
- “Secure quick-recording session-ID” is imprecise; the live path creates a recording ID and links it to an existing session. `[VERIFIED: session.ts, recording-controller.ts, and PROJECT.md]`
- A proposed final-review-specific native reverify gate is rejected and out of scope. `[VERIFIED: PROJECT.md and REQUIREMENTS.md]`

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| — | None. All material implementation and environment claims were verified against live repository/environment evidence or cited official documentation. | — | — |

No user confirmation is needed for a research assumption. A future root engine change away from one simple stable `>=X.Y.Z` value is not assumed to work; it must conservatively fall back and generalized range support remains separately scoped. `[VERIFIED: REQUIREMENTS.md Future Requirements]`

## Open Questions (RESOLVED)

1. **RESOLVED — Selector harness layout.**
   - Selected decision: Run the route matrix from the minimal temporary Git repository and harness at `C:/tmp/metronome-phase-02-hook-matrix/**`, outside tracked architecture. It uses distinct fake candidates, provenance logs, and structured results for selector cases; the real checkout separately proves the unchanged `npm-local.ps1` and staged-snapshot integration. The harness is never staged and is removed after its durable evidence is recorded. `[VERIFIED: 02-01-PLAN.md Artifacts this phase produces and Tasks 1-2]`

2. **RESOLVED — Exact-revision evidence freshness.**
   - Selected decision: Every evidence record captures the tested revision, relevant inputs, and hook hash. Matrix evidence is reusable only when its tested hook hash matches the current raw hook bytes and the frozen `HEAD:.githooks/pre-commit` blob; any revision or relevant-input change invalidates and reruns the affected focused, matrix, or full gate. The plan therefore runs the full `format:check`, lint, typecheck, unit, and build sequence once on the frozen revision because this phase changes the test and hook inputs. `[VERIFIED: 02-01-PLAN.md Tasks 2-3 and AGENTS.md exact-revision policy]`

No open research decision remains for planning or execution. `[VERIFIED: checker-selected plan decisions]`

## Environment Availability

| Dependency | Required By | Available | Version / Path | Fallback |
|------------|-------------|-----------|----------------|----------|
| Repository-local Node | Wrapper and GSD tooling | ✓ | 24.17.0 at `.tools/node-v24.17.0-win-x64/node.exe` | — `[VERIFIED: live environment]` |
| Repository-local npm | Tests/format/build fallback | ✓ | 11.17.0 through `scripts/npm-local.ps1` | — `[VERIFIED: live environment]` |
| Direct `node` | Hook direct route | ✗ in current PowerShell/Git Bash PATH | — | Existing wrapper `[VERIFIED: live command discovery]` |
| Direct `npm` / `npm.cmd` | Hook direct route | ✗ in current PowerShell/Git Bash PATH | — | Existing wrapper `[VERIFIED: live command discovery]` |
| Git for Windows | Hook/index/blob evidence | ✓ | 2.55.0.windows.3 at `C:\Program Files\Git` | — `[VERIFIED: live environment]` |
| Git Bash utilities | Hook execution | ✓ in Git Bash login PATH | Bash 5.3.15; `/usr/bin/mktemp` present | Do not use Windows WSL `bash.exe` `[VERIFIED: live environment]` |
| Windows PowerShell | First fallback host | ✓ | 5.1.26100.8875 | `pwsh` `[VERIFIED: live environment]` |
| PowerShell 7 | Second fallback host | ✓ | 7.6.4 | Fail if both hosts absent `[VERIFIED: live environment]` |
| Vitest | Focused characterization | ✓ | 4.1.9 locked/installed | None needed `[VERIFIED: lock and installed metadata]` |
| Prettier | Existing fast gate | ✓ | 3.9.5 locked/installed | None needed `[VERIFIED: lock and successful hook run]` |
| Native OpenGSD tooling | Planning/check/execution/verification | ✓ | `gsd-tools.cjs` resolved through repository-local Node | Stop on genuine native contradiction `[VERIFIED: init.phase-op and smart-entry]` |
| Knowledge graph | Optional navigation only | ✗ | `.planning/graphs/graph.json` absent | Direct live-file inspection used `[VERIFIED: filesystem inspection]` |
| Context7 MCP/CLI | Preferred docs lookup | ✗ | No MCP tool or `ctx7` CLI exposed | Official W3C/Vitest/npm/Git/GNU/Microsoft docs fetched through the research-plan websearch fallback `[VERIFIED: provider/tool discovery]` |

**Missing dependencies with no fallback:** none for implementation. `[VERIFIED: environment audit]`

**Missing dependencies with fallback:** direct PATH Node/npm are absent and correctly exercise the existing PowerShell wrapper; Context7 is absent but official primary documentation was obtained through the research seam's websearch fallback. `[VERIFIED: environment and source audit]`

**Execution caveat:** The sandbox blocks unapproved writes below `.git`, so a normal research invocation failed at snapshot `mktemp`; the approved diagnostic run allowed only the hook's temporary snapshot and passed. The plan/executor must distinguish permission denial from selector failure. `[VERIFIED: live diagnostic runs]`

## Sources

### Primary (HIGH confidence)

- `src/lib/quick-metronome/session.ts`, `src/lib/quick-metronome/types.ts`, `src/lib/quick-metronome/recording-controller.ts`, and all live `createQuickRecording` call sites — recording-ID owner, return shape, linkage, and call boundary. `[VERIFIED: live repository]`
- `tests/unit/quick-metronome-session.test.ts`, `vitest.config.ts`, installed `node_modules/vitest/dist/index.d.ts`, and the 18/18 focused run — current coverage, isolation, and usable mock APIs. `[VERIFIED: live repository and execution]`
- `.githooks/pre-commit`, `scripts/npm-local.ps1`, `package.json`, `.npmrc`, `.nvmrc`, `package-lock.json`, installed package metadata, `.github/workflows/ci.yml`, and hook mode/config — runtime contract, current defect, fallback, formatter boundary, and unchanged installed stack. `[VERIFIED: live repository]`
- `.gitattributes`, `test-fixtures/sheets/real-sheet.pdf`, and `test-fixtures/sheets/two-page-sheet.pdf` — binary classification and raw worktree/HEAD identity. `[VERIFIED: live repository and Git object checks]`
- `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, `.planning/ROADMAP.md`, `.planning/config.json`, `AGENTS.md`, and `skills/metronome-policy/SKILL.md` — authorized scope, lifecycle, constraints, and reuse contract. `[VERIFIED: live repository]`
- Native `init.phase-op 2` and `smart-entry --json` — phase directory, config availability, and current “needs a plan” route. `[VERIFIED: live native queries]`
- Git Bash/PowerShell/Node/npm environment probes and successful real fallback hook run — current host availability and cross-shell behavior. `[VERIFIED: live environment]`

### Secondary (MEDIUM confidence)

- [W3C Web Cryptography Level 2](https://www.w3.org/TR/webcrypto-2/) — `getRandomValues` and `randomUUID` algorithms. `[CITED: https://www.w3.org/TR/webcrypto-2/]`
- [Vitest `vi` API](https://vitest.dev/api/vi) and [mocking globals](https://vitest.dev/guide/mocking/globals.html) — `stubGlobal`/`unstubAllGlobals`. `[CITED: https://vitest.dev/api/vi]`
- [npm `package.json` engines](https://docs.npmjs.com/cli/configuring-npm/package-json/#engines) and [npm `engine-strict`](https://docs.npmjs.com/cli/using-npm/config/#engine-strict) — Node/npm engine declarations and install enforcement. `[CITED: https://docs.npmjs.com/cli/configuring-npm/package-json/#engines]`
- [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html) — stable numeric precedence, prerelease ordering, and ignored build metadata. `[CITED: https://semver.org/spec/v2.0.0.html]`
- [Git hooks](https://git-scm.com/docs/githooks), [checkout-index](https://git-scm.com/docs/git-checkout-index), [hash-object](https://git-scm.com/docs/git-hash-object), and [gitattributes](https://git-scm.com/docs/gitattributes) — hook abort, staged export, raw hashing, and binary attributes. `[CITED: https://git-scm.com/docs/githooks]`
- [GNU Bash `set`](https://www.gnu.org/software/bash/manual/html_node/The-Set-Builtin.html) — `errexit`, `nounset`, conditional exceptions, and `pipefail`. `[CITED: https://www.gnu.org/software/bash/manual/html_node/The-Set-Builtin.html]`
- [Microsoft `about_PowerShell_exe`](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_powershell_exe?view=powershell-5.1) and [Get-Command](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/get-command?view=powershell-7.6) — `-File` arguments/exit codes and executable precedence. `[CITED: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_powershell_exe?view=powershell-5.1]`

### Tertiary (LOW confidence)

- None. No recommendation depends on training knowledge or an unverified community source.

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — versions, lock ownership, installed APIs, runtime paths, and successful focused/hook execution were inspected live; no package selection remains. `[VERIFIED: live repository and environment]`
- Architecture: HIGH — each capability maps to an existing owner, call site, test, or native artifact; the exact changed-versus-unchanged boundary is explicit. `[VERIFIED: live repository and reuse contract]`
- Hook comparison semantics: MEDIUM — bounded behavior is supported by official npm/SemVer/Bash documentation and current requirements, but the final shell implementation still must pass the controlled route matrix. `[CITED: official sources above]`
- Pitfalls: HIGH for repository-specific risks and MEDIUM for generalized shell/platform behavior — all critical risks were either reproduced locally or cross-checked against official documentation. `[VERIFIED: live diagnostics]` `[CITED: official sources above]`
- Fixture and lifecycle scope: HIGH — byte IDs, sizes, offsets, current native route, and authority contradictions were inspected directly. `[VERIFIED: live Git/native/file evidence]`

**What might have been missed review:** Search covered all local secure-ID variants, production call sites, focused tests, hook/wrapper/manifest/lock/installed APIs, Git attributes/objects, active authority files, config toggles, environment commands, and official platform semantics. `.planning/deprecated/**` was deliberately never read, searched, indexed, hashed, or cited. `[VERIFIED: research command scope and project constraint]`

**Research date:** 2026-08-01

**Valid until:** 2026-08-31 for the locked repository inputs; re-research immediately if `package.json` engines, `.githooks/pre-commit`, `scripts/npm-local.ps1`, the quick-recording ID source, config toggles, or the authorization boundary changes. `[VERIFIED: identified decision inputs]`
