# Pitfalls Research

**Domain:** Windows + Git Bash release assurance under Native OpenGSD
**Researched:** 2026-08-01
**Confidence:** MEDIUM overall (HIGH for live repository findings; MEDIUM for official guidance fetched through the verified web-search seam)

## Recommended Ownership Model

Use one bounded assurance phase. Assign each risk to one implementation step so
that no task broadens into a repository-wide cleanup:

| Step | Owner responsibility | Explicit boundary |
|------|----------------------|-------------------|
| **A. Native authority reconciliation** | Reconcile active v1.2 authority in `STATE.md`, `ROADMAP.md`, `PROJECT.md`, and `AGENTS.md` through the Native OpenGSD lifecycle | No custom state validator/controller; no shipping |
| **B. Engine-aware hook selection** | Change only direct Node/npm eligibility and fallback routing in `.githooks/pre-commit` | Do not refactor snapshot creation, cleanup, formatter commands, or `npm-local.ps1` |
| **C. Secure-ID assurance** | Retain production semantics and add only missing focused characterization | No new ID algorithm, dependency, or product behavior |
| **D. Binary-fixture integrity** | Prove the two readable PDFs equal `HEAD` and remain binary | No tracked fixture rewrite when hashes already match; no checksum manifest |
| **E. Native verification and bounded stop** | Inspect provenance and run proportional existing checks | Stop after Native verification; no ship/PR/review/merge actions |

## Critical Pitfalls

### Pitfall 1: Stale narrative authority routes v1.2 back into the completed v1.1 release exit

**What goes wrong:**
The milestone frontmatter says v1.2 is in planning, while body text still directs
the operator to finish v1.1. An agent follows the stale text, attempts shipping,
or refuses to create the first v1.2 phase. A second failure mode is declaring
all v1.1 references stale and deleting valid archived history.

**Why it happens:**
The live files are only partially reconciled:

- `PROJECT.md` is current and says v1.1 shipped and v1.2 stops after Native
  verification.
- `STATE.md` frontmatter names v1.2, but **Current focus**, decisions, deferred
  items, continuity, and operator next steps still describe a pending v1.1
  release exit.
- `ROADMAP.md` archives v1.1 but **Current Lifecycle** says that release exit is
  still authoritative.
- `AGENTS.md` says the v1.1 exit is active and repeats broader authorization
  through PR, merge, and local-main synchronization.

**How to avoid:**
Step A must use Native OpenGSD for state/roadmap transitions, then reconcile
only the current-authority prose in the four named files. Preserve historical
v1.1 archive references and decisions. Compare the result with read-only
`smart-entry --json`; treat an unexplained contradiction as a stop condition,
not as permission to add a validator. The live smart-entry result is
`needs-first-phase`, which agrees with v1.2 planning and zero current phases; it
does not support a return to v1.1 shipping.

**Warning signs:**

- “Current focus: v1.1 release exit” remains in the active state.
- Operator next steps say not to start a new milestone.
- The active roadmap says v1.1 release proof is pending.
- `AGENTS.md` still grants shipping authority for the current work.
- A check tries to ban every textual occurrence of `v1.1`, including valid
  archives and historical decisions.

**Focused verification:**
Read the current-authority sections semantically, confirm v1.2/zero-or-new-phase
state with Native read-only routing, and confirm current scope ends after
verification. Do not use a global “no v1.1 text anywhere” assertion.

**Owned by:** Step A, independently checked in Step E.

---

### Pitfall 2: Presence-only or incorrect version comparison selects an incompatible direct runtime

**What goes wrong:**
The hook sees `npm` or `npm.cmd` and invokes it even though Node is below
`>=24.0.0` or npm is below `>=11.17.0`. A home-grown comparison can also accept
`11.9.0` as newer than `11.17.0`, check only major versions, or accidentally
accept a prerelease.

**Why it happens:**
The current selector checks command presence only. Git Bash exposes multiple
Windows command forms, and shell string ordering is not SemVer ordering. The
hook also runs with `set -euo pipefail`, so an unguarded failed version probe can
abort instead of choosing the intended fallback.

**How to avoid:**
Step B should accept a direct route only when all of these hold:

1. An exact `node` executable and one exact npm candidate are resolved.
2. Both version commands succeed inside explicit `if`/guarded logic.
3. Output is normalized for CR/LF and Node's single leading `v`.
4. Stable major, minor, and patch components are parsed and compared
   numerically against the current staged `package.json` minima.
5. Malformed output, prerelease output, unsupported engine-range shape, or any
   failure selects `scripts/npm-local.ps1` rather than aborting.

Do not use lexical comparison, major-only checks, `sort -V`, or the transitive
`semver` package.

**Warning signs:**

- `npm_cmd="npm"` immediately follows `command -v npm` with no Node check.
- Versions are compared as strings.
- `node --version` or `npm --version` appears as an unguarded assignment under
  `set -e`.
- Only the happy path `24.17.0`/`11.17.0` is tested.

**Focused verification:**
Use controlled Git-Bash PATH shims to cover exact minimum, higher stable
versions, Node `23.x`, npm `11.16.9`, malformed output, prerelease output, and
missing commands. In every incompatible case, observe the existing PowerShell
fallback; in the compatible cases, observe the exact direct executable.

**Owned by:** Step B, independently checked in Step E.

---

### Pitfall 3: Probe one executable but invoke another after PATH or command-precedence changes

**What goes wrong:**
The hook validates one `node`/npm pair but `run_npm` later resolves a different
command. On Windows, `npm`, `npm.cmd`, Node-manager shims, and installed Node
directories may coexist. A later PATH prepend or shell command cache can turn
the probed pair into a mixed pair at invocation time.

**Why it happens:**
Command names are stored instead of resolved executable paths, discovery and
invocation are separated, or `node_modules/.bin` is prepended before discovery
finishes. A test can also report the version from `npm` but execute `npm.cmd`.

**How to avoid:**
Resolve and capture the exact direct command paths before the existing
`node_modules/.bin` PATH prepend. Probe and invoke the same captured paths. Keep
the existing candidate priority (`npm`, then `npm.cmd`) and do not splice a
version result from one candidate into another. If a coherent direct selection
cannot be established, use the known-good fallback; conservative fallback is
preferable to guessing command provenance.

**Warning signs:**

- Logs show different paths during probe and execution.
- `PATH` changes before version discovery.
- The implementation stores only `npm` as a bare string after probing an
  absolute path.
- Tests put only one command on PATH and never model competing shims.

**Focused verification:**
Put distinguishable fake `npm` and `npm.cmd` commands plus multiple fake Node
locations in a temporary PATH and have each log its invocation. Assert that the
same selected candidate is probed and used. Do not commit these shims as a new
wrapper.

**Owned by:** Step B.

---

### Pitfall 4: PowerShell fallback argument handling is “simplified” and stops working from Git Bash

**What goes wrong:**
The fallback receives one concatenated command string instead of the original
argument array; `--prefix` paths containing spaces split; a profile prompts or
changes behavior; or the hook hangs waiting for input. Another variant mutates
global/user PATH instead of relying on the wrapper's process-local PATH.

**Why it happens:**
Developers treat Bash-to-PowerShell invocation like an interactive PowerShell
command line, add `eval`, add stop-parsing syntax in the wrong shell, reorder
flags, or bypass the existing wrapper because cross-shell quoting looks
unfamiliar.

**How to avoid:**
Retain the current function and exact argument-array forwarding:

```bash
"$power_shell" -NoProfile -NonInteractive -ExecutionPolicy Bypass \
  -File "$npm_local_script" "$@"
```

Keep the fallback order `powershell`, then `pwsh`. Do not change
`scripts/npm-local.ps1`; it already chooses Node 24.17.0, sets repo-local
`COREPACK_HOME`, prepends PATH only in its process, and invokes npm 11.17.0.
Do not use `eval` or collapse `"$@"` into one string.

**Warning signs:**

- The wrapper sees a single argument containing `--prefix ... run`.
- A hook run blocks for input or loads user-profile output.
- `PATH` is changed outside the hook/wrapper process.
- The patch touches `scripts/npm-local.ps1` despite no demonstrated defect
  there.

**Focused verification:**
Run the hook from real Git for Windows Bash with direct Node/npm hidden. Confirm
the fallback completes `run_npm --prefix "$snapshot_dir" run format:check`.
This live path already passed before implementation and must remain green.

**Owned by:** Step B.

---

### Pitfall 5: Verification checks the working tree while the hook checks the index snapshot

**What goes wrong:**
A manual `npm run format:check` passes in the working tree but the commit still
fails because staged bytes differ. Conversely, the hook is changed and invoked
without a representative staged index, so its real `checkout-index` behavior is
never exercised.

**Why it happens:**
The hook exports cached paths with `git ls-files --cached` and
`git checkout-index --prefix=...`; it intentionally tests staged content in a
temporary directory, excludes `.planning/**`, and uses root
`node_modules/.bin` only for the executable. This is not equivalent to checking
the repository working directory.

**How to avoid:**
Do not replace the staged snapshot with a worktree check. Keep `--prefix` with a
trailing slash, NUL-delimited path flow, `.planning/**` exclusion, root
`node_modules/.bin` prepend, and `npm --prefix "$snapshot_dir"`. Test the final
hook through the ordinary commit gate on the exact planned staged files. Treat
working-tree formatting as diagnostic evidence only.

**Warning signs:**

- The final command drops `--prefix "$snapshot_dir"`.
- `git checkout-index` is removed or changed to copy worktree files.
- Verification reports only `npm run format:check` from the repo root.
- A staged/unstaged split changes the result unexpectedly.

**Focused verification:**
Inspect the index with `git diff --cached`, run the hook through Git Bash, and
confirm the log still says `staged-index npm run format:check`. Afterward,
confirm no `pre-commit-index.*` directory remains under the Git directory.

**Owned by:** Step B, checked again in Step E.

---

### Pitfall 6: A selector repair accidentally weakens snapshot cleanup safety

**What goes wrong:**
A refactor broadens the cleanup target or bypasses the three existing checks
before `rm -rf`. On failure or signal, snapshots leak; in the worst case a bad
path reaches recursive deletion.

**Why it happens:**
The selector and cleanup live in one shell file, making adjacent cleanup logic
look available for stylistic refactoring even though the milestone has no
cleanup defect.

**How to avoid:**
Keep Step B's diff confined to command selection/version helpers and any narrow
diagnostic messages. Do not change `git_dir` canonicalization, trap handling,
snapshot naming, child-path checks, or cleanup. If a selector implementation
appears to require a cleanup rewrite, stop and redesign the selector.

**Warning signs:**

- The patch changes `cleanup_snapshot`, traps, `mktemp`, or `rm -rf`.
- Snapshot paths are no longer canonical absolute children of the Git
  directory.
- A failed hook leaves `.git/pre-commit-index.*` behind.

**Focused verification:**
Review the exact hook diff for unchanged cleanup code, exercise both a passing
hook and a controlled failing route, and enumerate the exact snapshot prefix
after each run.

**Owned by:** Step B; any cleanup hunk is a plan-deviation stop.

---

### Pitfall 7: Web Crypto tests leak globals or accidentally change the approved ID semantics

**What goes wrong:**
A mock persists into later tests, a test passes because jsdom happens to expose
`randomUUID`, or implementation “cleanup” converts the fallback into a UUID,
adds `Math.random`, or stops failing closed. The test suite may pass in one order
and fail in another.

**Why it happens:**
Vitest does not automatically restore stubbed globals by default. The current
test file correctly calls `vi.unstubAllGlobals()` in `afterEach`; removing that
cleanup or mutating `globalThis.crypto` directly breaks isolation. The generic
metadata test asserts only a prefix and does not explicitly prove
`randomUUID` precedence.

**How to avoid:**
Step C should leave `src/lib/quick-metronome/session.ts` unchanged unless a
focused test proves an actual regression. Add at most one deterministic test
that stubs both methods, returns a known UUID, and asserts
`getRandomValues` was not called. Retain the existing 16-byte fallback and
unavailable-crypto tests plus `vi.unstubAllGlobals()`.

**Warning signs:**

- Direct assignment to `globalThis.crypto` without restoration.
- A test depends on the environment's random UUID value.
- The fallback output changes from 32 lowercase hex characters.
- A weak or silent fallback appears.
- Production code changes are larger than test characterization requires.

**Focused verification:**
Run only `tests/unit/quick-metronome-session.test.ts` first, then the existing
unit suite once at the final candidate revision. Assert primary precedence,
deterministic fallback bytes, exact fail-closed error, and post-test restoration.

**Owned by:** Step C, independently checked in Step E.

---

### Pitfall 8: Binary fixtures are rewritten to fix a status/stat-cache symptom

**What goes wrong:**
PowerShell text I/O, editor save, or line-ending normalization alters PDF bytes
and invalidates cross-reference offsets. A different failure mode is repeatedly
restoring already-correct bytes because cached stat information makes a file
look suspicious.

**Why it happens:**
Binary diffs are opaque, Windows checkout history involved CRLF-expanded local
copies, and Git's index stores both object identity and cached stat information.
`git update-index --refresh` only re-matches stat data; it does not calculate a
new blob ID or repair content.

**How to avoid:**
Step D must establish raw content truth first:

1. Confirm `git check-attr text diff merge` reports all three unset for both
   readable PDFs.
2. Compare `git hash-object --no-filters -- <path>` to
   `git rev-parse "HEAD:<path>"`.
3. Confirm `git diff --quiet -- <two paths>` and targeted status are clean.
4. Only if raw hashes match but stat state remains stale, use a targeted
   `git update-index --refresh -- <two exact paths>` and recheck. This refresh is
   not proof of byte equality.

The live files already match HEAD:

- `real-sheet.pdf` → `2c2bf826458ee864821b0942e8cc2172e756ad0a`
- `two-page-sheet.pdf` → `8d48ef4af67dcbeaba5e617d3a1023276e612f71`

Therefore the expected implementation diff for both PDFs is empty.

**Warning signs:**

- PDF size or blob ID changes.
- `.gitattributes` no longer resolves `*.pdf` as binary.
- A command uses `Get-Content`/`Set-Content` or text redirection on a PDF.
- A new `.sha256` sidecar appears.
- Verification cites only `git status`, not raw blob equality.

**Focused verification:**
Repeat attribute and raw-hash checks at the final candidate revision. If either
hash differs, stop before staging; do not normalize or regenerate the fixture.

**Owned by:** Step D, independently checked in Step E.

---

### Pitfall 9: The assurance milestone expands into new infrastructure, product work, or release exit

**What goes wrong:**
The plan adds a semver dependency, new runtime wrapper, hook test controller,
checksum registry, UUID abstraction, formatter, lifecycle validator, product
feature, final-review-specific reverify gate, or ship/PR/merge work.

**Why it happens:**
Each narrow assurance issue has a tempting generalized solution, and stale
`AGENTS.md` text still describes the broader v1.1 release authorization.

**How to avoid:**
Make every task cite one active v1.2 outcome and one existing mechanism it
reuses. Require explicit deviation review for any new file outside native
planning artifacts. Preserve milestone-scoped disabled capabilities in
`config.json`, `workflow.use_worktrees=false`, and the primary checkout. Step E
must stop after Native verification even if the repository is otherwise ready
to ship.

**Warning signs:**

- `package.json` or `package-lock.json` changes.
- A new script/controller/validator appears.
- `scripts/npm-local.ps1`, formatter configuration, or product modules change
  without a demonstrated in-scope defect.
- A worktree is created.
- The next action after verification is `$gsd-ship` or PR creation.

**Focused verification:**
Review the real final diff against the bounded file responsibilities, inspect
native state, and record that shipping remains unexecuted and unauthorized.
Do not encode this one-time review as a permanent repository gate.

**Owned by:** All steps; Step E is the final scope check.

## Moderate Pitfalls

| Pitfall | What goes wrong | Prevention | Owner |
|---------|-----------------|------------|-------|
| Fallback becomes a hard error | Old direct npm aborts even though the local wrapper is usable | Treat incompatibility as fallback eligibility; error only when all routes are absent | Step B |
| Engine source drifts from staged package | Hook validates worktree engines while committing different staged engines | Read the staged `package.json` contract or fail closed to fallback | Step B |
| CR remains in Windows version output | A compatible `npm.cmd` result fails strict parsing | Remove CR/LF before syntax validation; do not trim arbitrary internal characters | Step B |
| Error output is swallowed | Users cannot tell why fallback or failure occurred | Emit concise selected-route/version diagnostics without secrets or command-string eval | Step B |
| Full suite moved into pre-commit | Every commit becomes slow and developers bypass the hook | Keep only diff-check and staged format-check in the hook | Step B |
| Exact-revision evidence discarded | The unchanged full suite/build is repeated after every native step | Bind evidence to HEAD and inputs; rerun only when stale, changed, missing, or contradictory | Step E |
| Research dirtiness treated as product failure | `smart-entry` reports `git_dirty=true` while parallel research files are being written | Distinguish expected `.planning/research` artifacts from unexplained implementation changes | Steps A/E |
| Deprecated planning is consumed during reconciliation | Quarantined history influences current routing | Do not read/search/index `.planning/deprecated/**`; use live native files and archives named by PROJECT | Step A |

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hard-code only a Node major | Tiny comparator | Silently accepts incompatible Node/npm minors and patches | Never for this milestone |
| Depend on transitive `semver` | General range support | Undeclared dependency can disappear and widens the lock surface | Not in v1.2 |
| Always force the local wrapper | Avoids comparator work | Ignores the approved compatible-direct path and masks selection behavior | Only as a temporary diagnostic, not committed behavior |
| Directly assign mocked globals | Shorter test | Leaks Web Crypto state between tests | Never; use `vi.stubGlobal` plus restoration |
| Refresh index before hashing PDFs | Makes status quieter | Can conceal whether bytes were ever checked | Never as integrity proof |
| Add lifecycle prose checker | Makes current contradictions machine-visible | Creates the prohibited parallel control plane | Never |

## Integration Gotchas

| Integration | Common mistake | Correct approach |
|-------------|----------------|------------------|
| Git Bash → Node/npm | Probe names, then resolve them again after PATH changes | Capture exact candidate paths, versions, and invoke the same pair |
| Git Bash → PowerShell | Join arguments into a string or use `eval` | Preserve quoted `-File` path and `"$@"` array forwarding |
| Git index → snapshot | Treat current worktree as the hook input | Preserve `checkout-index --prefix` and verify staged bytes |
| Vitest → Web Crypto | Assume stubs auto-reset | Keep `vi.unstubAllGlobals()` in `afterEach` |
| Windows checkout → Git blob | Trust timestamps/status alone | Compare raw worktree blob ID to `HEAD:<path>` first |
| Native state → narrative docs | Hand-create a state controller | Use native lifecycle mutations, then read-only smart-entry comparison |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Full unit/build suite in pre-commit | Commit latency grows and bypass pressure rises | Keep the existing fast hook boundary | Every normal commit |
| Repeating full gates at unchanged HEAD | Multiple identical long runs with no new evidence | Reuse exact-revision evidence; one final candidate gate | Single sequential plan |
| Running broad browser E2E to prove PDF equality | Browser setup dominates a byte-integrity check | Use Git blob equality; run behavior E2E only if Native verification finds stale behavior evidence | This assurance-only milestone |
| General SemVer engine in shell | Selector becomes larger than the defect | Support current stable `>=X.Y.Z` shape and fail closed otherwise | Any future complex engine range; research then |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Reintroduce weak ID fallback | Predictable/colliding recording IDs | `randomUUID`, then secure random bytes, then throw |
| Use `eval` for PowerShell/npm command strings | Argument injection and path corruption | Execute captured commands with quoted arrays |
| Re-resolve tools after PATH mutation | Unvalidated executable runs | Capture exact executable before PATH changes |
| Broaden snapshot deletion logic | Recursive deletion can target the wrong directory | Leave canonicalization and child-prefix guards unchanged |
| Use text tools on PDF fixtures | Binary corruption | Raw Git restore only if a verified mismatch exists; otherwise no write |

## “Looks Done But Isn't” Checklist

- [ ] **Hook works on this machine:** Current Git Bash has no direct Node/npm, so fallback success alone does not prove engine-aware direct selection—verify incompatible and compatible direct candidates with controlled PATH.
- [ ] **Versions are checked:** Confirm both Node and the exact invoked npm candidate are checked across major/minor/patch, not just printed.
- [ ] **Fallback is preserved:** Confirm old/malformed direct tools reach `npm-local.ps1` instead of aborting under `set -euo pipefail`.
- [ ] **The actual commit is checked:** Confirm the staged-index snapshot, not only the working tree, passes format checking.
- [ ] **Snapshot cleanup survives:** Confirm no `pre-commit-index.*` directory remains after pass and controlled failure.
- [ ] **Secure behavior is retained:** Confirm explicit `randomUUID` precedence, deterministic 16-byte fallback, fail-closed error, and global restoration.
- [ ] **PDFs are unchanged:** Confirm raw blob equality and empty targeted diff; a parser success alone is not byte identity.
- [ ] **Authority is current:** Confirm active sections say v1.2 and stop after Native verification while historical v1.1 archives remain intact.
- [ ] **Native routing agrees:** Confirm read-only smart-entry/state inspection has no unexplained contradiction after reconciliation.
- [ ] **Scope is closed:** Confirm no new package, wrapper, controller, formatter, worktree, product behavior, or shipping action.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Direct selector aborts instead of falling back | LOW | Reproduce under controlled PATH, move failing probes into guarded conditionals, and rerun the real Git-Bash fallback path |
| PowerShell arguments break | LOW | Restore the exact existing invocation and `"$@"`; verify a snapshot path containing spaces before broader checks |
| Snapshot cleanup changed | HIGH | Stop execution, restore the proven cleanup block from current HEAD after reviewing the exact diff, then exercise pass/failure cleanup before continuing |
| Web Crypto mock leaks | LOW | Restore `vi.unstubAllGlobals()` cleanup, make stubs deterministic, rerun focused file in isolation and in the unit suite |
| PDF raw hash differs | MEDIUM | Stop before staging, confirm the exact two authorized paths, restore raw bytes from `HEAD` with Git, then re-hash; never use text I/O |
| Hashes match but status is stale | LOW | Run targeted `git update-index --refresh -- <two paths>`, then re-run hash, diff, and status checks |
| Lifecycle prose contradicts native state | MEDIUM | Use the active Native OpenGSD transition/recovery path, reconcile current-authority prose, and compare read-only smart-entry output; do not script a controller |
| Work expands beyond authorization | LOW | Drop the proposed out-of-scope task before implementation; retain only plan-local assurance work and stop after verification |

## Pitfall-to-Step Mapping

| Pitfall | Prevention owner | Verification |
|---------|------------------|--------------|
| Stale v1.1 authority | Step A | Current-section semantic review plus Native read-only routing |
| Incorrect SemVer comparison | Step B | Exact-minimum/higher/older/malformed/prerelease PATH matrix |
| Mixed command precedence | Step B | Distinct executable logs prove probe/invoke identity |
| PowerShell argument drift | Step B | Real Git Bash fallback runs staged format-check |
| Index/worktree confusion | Step B | `git diff --cached` plus snapshot hook run |
| Cleanup regression | Step B | No cleanup diff and no residual snapshot after pass/failure |
| Web Crypto mock/semantic drift | Step C | Focused deterministic branch tests and global restoration |
| PDF corruption/stat drift | Step D | Attributes, raw blob IDs, targeted diff/status |
| Scope or release expansion | Steps A–E | Final diff/provenance review and explicit stop after Native verification |
| Redundant expensive gates | Step E | Evidence bound to exact HEAD/inputs; proportional rerun decision recorded |

## Sources

### Live repository evidence (HIGH)

- `.planning/PROJECT.md`, `.planning/STATE.md`, `.planning/ROADMAP.md`,
  `.planning/config.json`, and `AGENTS.md` — current authority and contradictions.
- `.githooks/pre-commit` and `scripts/npm-local.ps1` — selection, strict-shell,
  snapshot, cleanup, and Windows fallback behavior.
- `src/lib/quick-metronome/session.ts` and
  `tests/unit/quick-metronome-session.test.ts` — secure-ID branches and mock
  cleanup.
- `.gitattributes` and the two readable PDF blobs — binary policy and exact
  worktree/HEAD equality.
- Native `smart-entry --json` — live result `needs-first-phase` with v1.2
  planning and zero phases.

### Official primary guidance (MEDIUM via research seam)

- [Git `checkout-index`](https://git-scm.com/docs/git-checkout-index) — exports cached/index content and defines `--prefix` behavior.
- [Git `update-index`](https://git-scm.com/docs/git-update-index#_using_refresh) and [Git status background refresh](https://git-scm.com/docs/git-status.html#_background_refresh) — stat refresh is distinct from content/object identity.
- [Vitest global mocking](https://vitest.dev/guide/mocking/globals.html) and [`vi` API](https://vitest.dev/api/vi#vi-stubglobal) — stub and restoration behavior.
- [Microsoft `powershell.exe` CLI](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_powershell_exe?view=powershell-5.1) — `NoProfile`, `NonInteractive`, `ExecutionPolicy`, and `File` semantics.
- [GNU Bash `set` behavior](https://www.gnu.org/software/bash/manual/html_node/The-Set-Builtin.html) and [pipeline behavior](https://www.gnu.org/software/bash/manual/html_node/Pipelines.html) — `errexit` and `pipefail` failure contexts.

---
*Pitfalls research for: Metronome v1.2 Release Assurance & Workflow Closure*
*Researched: 2026-08-01*
