# Stack Research

**Domain:** v1.2 release assurance and Windows Git-hook runtime selection
**Researched:** 2026-08-01
**Confidence:** MEDIUM overall (HIGH for live repository facts; MEDIUM for official guidance fetched through the verified web-search seam)

## Recommendation

Keep the existing stack. The only runtime integration change should be a small,
fail-closed selection block inside `.githooks/pre-commit`: a direct `node` plus
`npm`/`npm.cmd` pair is eligible only when both reported versions satisfy the
current staged `package.json` engine minima. Every absent, malformed,
prerelease, too-old, or unsupported-range case should route to the already
tracked `scripts/npm-local.ps1`. Do not add a package, wrapper, runtime manager,
formatter, fixture manifest, UUID library, or lifecycle gate.

The secure-ID production code and binary-fixture policy already implement the
required behavior. Retain them and improve only focused assurance: explicitly
test that `crypto.randomUUID()` wins when both Web Crypto APIs exist, retain the
existing fallback/fail-closed tests, and compare the two readable PDF working
tree blobs directly with their `HEAD` blobs.

## Live Repository Facts

These facts were verified from the current checkout, not inferred from external
documentation.

| Surface | Current mechanism | Verified fact | Implication |
|---------|-------------------|---------------|-------------|
| Runtime contract | `package.json`, `.npmrc`, `.nvmrc` | `engines.node` is `>=24.0.0`, `engines.npm` is `>=11.17.0`, `packageManager` is `npm@11.17.0`, `.npmrc` sets `engine-strict=true`, and `.nvmrc` selects major 24 | Compare both direct CLI versions; command presence alone is insufficient |
| Windows fallback | `scripts/npm-local.ps1` | Prepends `.tools/node-v24.17.0-win-x64`, sets repo-local `COREPACK_HOME`, and runs `corepack npm@11.17.0`; live outputs were Node `v24.17.0` and npm `11.17.0` | Reuse this exact fallback; it satisfies both current minima without mutating user/system `PATH` |
| Hook | `.githooks/pre-commit` | Executable mode `100755`; retains `git diff --cached --check`, staged-index snapshotting, and `run_npm --prefix "$snapshot_dir" run format:check`; its selector currently accepts the first present `npm`/`npm.cmd` without checking Node or npm versions | Change only the selector and preserve the rest of the hook |
| CI | `.github/workflows/ci.yml` | Uses `.nvmrc`, installs npm `11.17.0`, prints both versions, then runs the existing quality commands | The local hook should enforce the same runtime contract, not introduce another one |
| Secure ID | `src/lib/quick-metronome/session.ts` | Prefers `crypto.randomUUID()`, otherwise fills `Uint8Array(16)` with `crypto.getRandomValues()`, otherwise throws; no weak fallback exists | No production-code change is needed |
| Secure-ID tests | `tests/unit/quick-metronome-session.test.ts` | Covers the 16-byte deterministic fallback and fail-closed behavior; the current focused file passed `18/18` tests | Add at most one explicit precedence test; retain existing tests |
| PDF policy | `.gitattributes` | `*.pdf binary`; `git check-attr` resolves `text`, `diff`, and `merge` as unset for both readable PDFs | No line-ending conversion or text merge should touch PDF bytes |
| PDF bytes | `test-fixtures/sheets/real-sheet.pdf`, `two-page-sheet.pdf` | Raw worktree blob IDs equal `HEAD`: `2c2bf826458ee864821b0942e8cc2172e756ad0a` and `8d48ef4af67dcbeaba5e617d3a1023276e612f71` respectively | Keep the files unchanged; equality is the required integrity evidence |

The live Git Bash environment had neither `node` nor `npm` on `PATH`, found
Windows PowerShell and PowerShell 7, and the current hook completed its
staged-index `format:check` successfully through `scripts/npm-local.ps1`. This
proves the fallback path is usable and should not be replaced.

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Node.js | Direct candidate must satisfy `>=24.0.0`; fallback is `24.17.0` | Execute repository tooling | Already authoritative in `package.json`/`.nvmrc`; fallback is present and verified |
| npm | Direct candidate must satisfy `>=11.17.0`; fallback is exactly `11.17.0` | Run `format:check` and existing verification scripts | Already authoritative in `package.json`; Corepack fallback supplies the required version |
| Git Bash | Existing Git for Windows shell | Execute the tracked pre-commit hook | Existing hook language and deployment surface; no shell migration is needed |
| Web Crypto | Browser platform API | Generate quick-recording IDs | Native secure primitives already implement the approved contract |
| Git object database and attributes | Installed Git | Preserve and verify fixture bytes | Existing `binary` attribute plus blob-ID comparison is sufficient and deterministic |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | `4.1.9` resolved | Characterize secure-ID branch behavior | Reuse the existing focused unit file; add no new test framework |
| Prettier | `3.9.5` | Existing staged-index format gate | Continue invoking only through `npm run format:check` |
| `prettier-plugin-tailwindcss` | `0.8.0` | Existing Tailwind ordering policy | Retained transitively through the existing format command; unrelated to selector logic |

No new supporting library is recommended. Although `semver` exists only as a
transitive lockfile package, the hook must not depend on that accidental
placement or add a direct dependency for two current simple lower-bound ranges.

### Development Tools

| Tool/API | Purpose | Exact reuse |
|----------|---------|-------------|
| `command -v node`, `node --version` | Discover and probe direct Node | A version probe is the only allowed use before eligibility is known |
| `command -v npm`, `command -v npm.cmd`, `<candidate> --version` | Discover and probe direct npm | Keep the existing preference order, but accept only with compatible Node and npm |
| `powershell` then `pwsh` | Launch the existing fallback | Preserve current order and flags: `-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "$npm_local_script"` |
| `git show :package.json` | Read the package contract that is actually staged | Extract only the current `>=X.Y.Z` engine shape; unsupported/missing/duplicate values force fallback |
| `git hash-object --no-filters -- <path>` | Compute a raw worktree blob ID | Compare against `git rev-parse "HEAD:<path>"` for each readable PDF |
| `crypto.randomUUID()` | Primary recording-ID source | Prefix the returned UUID exactly as today |
| `crypto.getRandomValues(new Uint8Array(16))` | Secure fallback source | Preserve current lowercase, two-hex-digits-per-byte encoding |

## Smallest Hook Integration

Only replace the route-selection block. Preserve `run_npm`, local
`node_modules/.bin` PATH prepending, snapshot cleanup, staged checkout, and the
final command unchanged.

### 1. Read the staged engine minima and fail closed

Use `git show :package.json` so a commit that changes the engine contract is
checked against the contract being committed. A small Git-Bash `sed` extraction
may accept only the repository's present normalized forms:

```bash
"node": ">=MAJOR.MINOR.PATCH"
"npm": ">=MAJOR.MINOR.PATCH"
```

If either value is missing, appears more than once, or changes to a compound
range, do not guess and do not choose direct tools; route to
`scripts/npm-local.ps1`. Supporting arbitrary npm ranges is outside this
milestone.

### 2. Compare versions as SemVer, not strings

For each reported version:

1. Remove one leading `v` (needed for `node --version`) and CR/LF output.
2. Accept exactly three numeric core components; reject empty or malformed
   output and numeric components with illegal leading zeroes.
3. Reject any prerelease suffix. An ordinary stable `>=X.Y.Z` comparator does
   not opt into prerelease candidates.
4. Ignore valid `+build.metadata` for precedence.
5. Compare major, then minor, then patch numerically. Never use lexical string
   comparison (`11.9.0` would otherwise sort above `11.17.0`).

For the current contract, these decisions are required:

| Node | npm | Route |
|------|-----|-------|
| `v24.0.0` | `11.17.0` | Direct |
| `v24.17.0` | `11.17.1` | Direct |
| `v25.0.0` | `12.0.0` | Direct (both satisfy the declared lower bounds) |
| `v23.99.99` | `11.17.0` | Existing PowerShell fallback |
| `v24.17.0` | `11.16.9` | Existing PowerShell fallback |
| `v25.0.0-rc.1` | `11.17.0` | Existing PowerShell fallback |
| missing/malformed/version command fails | any | Existing PowerShell fallback |

Use base-10 numeric arithmetic for components (for example `10#$major`) after
validation; do not use `sort -V`, which is not an npm-range evaluator.

### 3. Preserve fallback routing exactly

The final decision order should be:

1. Compatible `node` plus `npm`.
2. Compatible `node` plus `npm.cmd` when `npm` is absent.
3. Existing `scripts/npm-local.ps1` through `powershell`.
4. The same script through `pwsh` when Windows PowerShell is absent.
5. Fail with a clear message only when neither a compatible direct pair nor the
   existing script/PowerShell route is available.

An incompatible direct pair is not a terminal error when the tracked fallback
is usable. Do not mutate global/user `PATH`; retain only the hook-local
`node_modules/.bin` prepend already present.

## Secure Web Crypto Retention

No new API or production abstraction is needed. The W3C specification defines
`randomUUID()` as a version-4 UUID built from 16 cryptographically secure random
bytes and `getRandomValues()` as filling a supported integer typed array with
cryptographically secure bytes. The current `Uint8Array(16)` fallback is within
that contract.

Add at most one focused test to the existing Vitest file:

- stub `crypto.randomUUID` to return a known UUID;
- provide a spy for `crypto.getRandomValues`;
- create a recording and assert the exact `recording_<known-uuid>` ID;
- assert `randomUUID` was called and `getRandomValues` was not.

Retain the existing deterministic fallback and unavailable-crypto tests. Do not
add `Math.random`, timestamps, counters, an ID package, or silent degradation.

## Binary-Fixture Integrity

Treat the committed blobs as authoritative. The focused evidence is:

```powershell
git check-attr text diff merge -- `
  test-fixtures/sheets/real-sheet.pdf `
  test-fixtures/sheets/two-page-sheet.pdf

git hash-object --no-filters -- test-fixtures/sheets/real-sheet.pdf
git rev-parse "HEAD:test-fixtures/sheets/real-sheet.pdf"

git hash-object --no-filters -- test-fixtures/sheets/two-page-sheet.pdf
git rev-parse "HEAD:test-fixtures/sheets/two-page-sheet.pdf"
```

Require each pair of IDs to be equal and `git status --short --` for the two
paths to be empty. Do not rewrite, re-save, normalize, or add checksum sidecars.
The intentionally invalid `bad-sheet.pdf` is not one of the two restored
readable fixtures.

## Installation

No dependency installation or lockfile change is required.

```powershell
# Existing focused unit verification
& .\scripts\npm-local.ps1 run test:unit -- tests/unit/quick-metronome-session.test.ts

# Existing complete hook behavior in Git Bash after the selector change
./.githooks/pre-commit
```

## Focused Verification Matrix

| Concern | Evidence required |
|---------|-------------------|
| Compatible direct route | Controlled Git-Bash PATH exposes compatible `node` and `npm`; selector uses direct command and preserves staged `format:check` |
| Old Node | Controlled Node `23.x` with npm `11.17.0`; selector invokes existing PowerShell fallback |
| Old npm | Controlled Node `24.x` with npm `11.16.9`; selector invokes existing PowerShell fallback |
| Missing direct tools | Real Windows Git Bash path; hook reaches `npm-local.ps1` and `format:check` passes |
| Malformed/prerelease output | Selector rejects it and falls back, without lexical or partial comparison |
| No route | Hide both PowerShell executables and direct tools in a controlled PATH; hook fails closed with the existing actionable error style |
| Secure primary ID | New deterministic precedence test passes |
| Secure fallback/failure | Existing two tests remain green; focused file stays green (`18/18` before the optional precedence addition) |
| PDF bytes | Both raw worktree blob IDs equal their `HEAD:<path>` blob IDs; attributes remain unset for text/diff/merge |
| Scope | `git diff -- package.json package-lock.json scripts/npm-local.ps1 src/lib/quick-metronome/session.ts .gitattributes test-fixtures/sheets/*.pdf` is empty unless a focused test change was explicitly planned |

Use temporary PATH shims only as test fixtures outside the repository or inside
an existing test harness; do not commit another runtime wrapper.

## Alternatives Considered

| Recommended | Alternative | Why Not in v1.2 |
|-------------|-------------|-----------------|
| Current-shape numeric comparator in the hook | Add direct `semver` dependency | Changes `package.json`/lockfile and is unnecessary for two fixed simple minima |
| Existing `engines` plus `.npmrc` | Add `devEngines` | Does not solve pre-selection of an incompatible npm and creates a second contract surface |
| Existing `npm-local.ps1` | New Bash/Node wrapper or runtime downloader | Duplicates a verified Windows fallback and widens ownership/security scope |
| Native Web Crypto | UUID package or weak JS fallback | Adds dependency or weakens approved fail-closed behavior |
| Git blob equality | SHA sidecar/manifest | Duplicates Git's authoritative object identity and creates another artifact to maintain |
| Existing Native OpenGSD lifecycle | Custom controller/gate | Explicitly outside the assurance milestone |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Command-presence-only selection | Can choose an npm or Node version below the repository engines | Validate both reported versions before direct use |
| Lexical version comparison or `sort -V` | Does not faithfully implement the current npm SemVer range semantics | Strict numeric triplet comparison for the current stable `>=` ranges |
| Transitive `node_modules/semver` | Not a declared API and can disappear with dependency-tree changes | Small fail-closed comparator limited to the current range shape |
| `Math.random`, time-based IDs, counters | Violates the retained secure-ID contract | `crypto.randomUUID`, then `crypto.getRandomValues`, then throw |
| Editing the PDF fixtures | Byte changes can invalidate PDF cross-reference offsets | Keep HEAD blobs and prove equality |
| Global/user `PATH` changes | Machine-wide side effects exceed scope | Existing hook-local PATH and `npm-local.ps1` |

## Version Compatibility

| Component | Compatible With | Notes |
|-----------|-----------------|-------|
| Direct Node | `package.json` `>=24.0.0` | Stable SemVer only for the current simple range; probe with `node --version` |
| Direct npm/npm.cmd | `package.json` `>=11.17.0` | Must pass together with Node; probe the exact selected command |
| `npm-local.ps1` | Node `24.17.0`, npm `11.17.0` | Verified live; Corepack and cache are already repository-local |
| Secure fallback | `Uint8Array(16)` and Web Crypto `getRandomValues` | Produces 32 lowercase hex characters after the existing prefix |
| PDF fixtures | Git `binary` macro | `-text -diff -merge` prevents conversion and text treatment |

## External Guidance

These are official primary sources. Confidence is **MEDIUM** because the
project's research seam classified verified `websearch` findings at that tier.

- [npm 11 `package.json` engines](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/#engines) — Node/npm ranges and advisory behavior without `engine-strict`.
- [npm 11 `engine-strict`](https://docs.npmjs.com/cli/v11/using-npm/config/#engine-strict) — incompatible engines are refused when enabled, subject to explicit force override.
- [npm `node-semver` range semantics](https://github.com/npm/node-semver#ranges) — `>=` comparator and prerelease exclusion rules.
- [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html) — numeric precedence, prerelease ordering, and ignored build metadata.
- [W3C `getRandomValues`](https://www.w3.org/TR/webcrypto-2/#Crypto-method-getRandomValues) and [`randomUUID`](https://www.w3.org/TR/webcrypto-2/#Crypto-method-randomUUID) — normative Web Crypto algorithms.
- [Git attributes](https://git-scm.com/docs/gitattributes#_using_macro_attributes) — the built-in `binary` macro is `-diff -merge -text`.
- [Git `hash-object`](https://git-scm.com/docs/git-hash-object) and [Git `rev-parse`](https://git-scm.com/docs/git-rev-parse) — worktree blob-ID computation and `HEAD:<path>` committed-blob addressing.

---
*Stack research for: Metronome v1.2 Release Assurance & Workflow Closure*
*Researched: 2026-08-01*
