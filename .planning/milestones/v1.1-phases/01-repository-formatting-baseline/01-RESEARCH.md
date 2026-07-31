# Phase 1: Repository Formatting Baseline - Research

**Researched:** 2026-07-31
**Domain:** Repository-wide Prettier/LF policy, Windows runtime fallback, Git hook, and CI enforcement
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

### Lifecycle and quarantine
- **D-01:** This is a fresh, standalone v1.1 formatting milestone created from current `main`. The superseded R01 is deprecated and is not repaired, imported, or used as evidence.
- **D-02:** `.planning/deprecated/**` is an absolute quarantine. Formatting tools, research, planning, codebase maps, searches, evidence collection, and validation must not read, search, index, summarize, cite, hash, or transform its contents.
- **D-03:** Native OpenGSD exclusively owns discussion, research, planning, checking, execution, verification, recovery, and shipping. No repository controller, validator, receipt, retry layer, scanner, graph, cache, database, or telemetry system may be added around it.
- **D-04:** Work remains in the primary checkout with `workflow.use_worktrees=false`; no Git worktree may be created or invoked.
- **D-04a:** The owner's 2026-07-31 instruction authorizes this bounded phase through native research, planning, execution, verification, and in-scope repair. Routine stage confirmations and “defer because difficult” exits are not gates; stop only for a material boundary change, global/irreversible action, missing external authority, or a high-impact blocker that cannot be safely repaired within scope.

### Formatting policy and toolchain
- **D-05:** Add one root `.gitattributes` LF policy with explicit binary, generated-output, and quarantine protection.
- **D-06:** Keep one root `prettier.config.mjs` and one `.prettierignore`. Prettier is the sole general-purpose formatter, and the only public formatting commands are `npm run format` and `npm run format:check`.
- **D-07:** Preserve the repository's established formatting style unless official compatibility requirements demand a narrowly documented change. The Tailwind plugin must use its supported Tailwind v4 stylesheet integration.
- **D-08:** Pin exact compatible stable versions of Prettier and `prettier-plugin-tailwindcss`. Native phase research must verify official package identity, release/version status, integrity/provenance, configuration syntax, and Tailwind v4 compatibility before planning approves implementation.

### Mechanical baseline and history
- **D-09:** Format the complete allowed surface, not a small hand-picked file set: source, tests, configuration, scripts, current documentation, and legacy documentation, plus any other allowed tracked file type that Prettier officially supports. Exclude all `.planning/**` lifecycle files so planning, SUMMARY, verification, and shipping writes cannot create recursive formatting drift.
- **D-10:** Commit exactly one isolated repository-wide mechanical formatting baseline. Diagnostic formatter runs may repeat until the configuration reaches a fixed point; the baseline commit contains formatter output only—no manual cleanup, dependency edit, policy edit, enforcement edit, generated artifact, or semantic product change.
- **D-11:** A second formatting run is verification only and must produce no tracked diff; `format:check` must then pass over the same complete surface.
- **D-12:** Keep the mechanical baseline in its own commit, separate from policy/tooling, enforcement, semantic edits, and lifecycle metadata. Native planning decides task shape; an exact plan, task, or total commit count is not a correctness gate.

### Windows runtime
- **D-13:** Use direct supported `node`, `npm`, and `npx` when they are already available. Otherwise use the existing repository-local Node 24/Corepack route in `scripts/npm-local.ps1`; do not mutate user or system `PATH` for this phase.
- **D-14:** Retain `scripts/npm-local.ps1` as the supported portable fallback. Repository scripts remain ordinary npm scripts; the tracked hook resolves direct npm first and the wrapper second.

### Enforcement and evidence
- **D-15:** A repository-tracked pre-commit hook must fail fast with `git diff --cached --check` and, after the formatting policy exists in `HEAD`, `npm run format:check`. Lint, typecheck, the full unit suite, and build run once for the frozen final local candidate and in Ubuntu CI instead of on every commit.
- **D-16:** Ubuntu CI must run the same `format:check` before lint, typecheck, unit tests, and build.
- **D-17:** Final phase evidence covers allowed formatting scope, quarantine protection, a no-diff second format, supported direct-or-existing-wrapper Windows runtime resolution, all existing non-browser quality gates, and clean Git rollback/reviewability. Playwright, browser, visual, microphone, and product UAT are out of scope.

### Release boundary
- **D-18:** Phase verification does not prove release. Native shipping, exact-final-PR-head CI, a read-only `@codex` review of that same frozen head with no unresolved actionable findings, merge, and clean synchronized `main` are separate conjunctive release-exit facts.
- **D-19:** A fresh R01 may start only after the formatting release exit succeeds, from the resulting synchronized `main`, with new research and planning and no deprecated R01 input.

### the agent's Discretion
- Select the exact stable formatter/plugin versions and supported Tailwind v4 configuration only after the required official-source research.
- Define the precise allowed Prettier CLI patterns and ignore/attribute rules, provided they cover every approved tracked text surface outside `.planning/**` without traversing or consuming the quarantine.
- Choose the repository path and activation details for the tracked pre-commit hook. The solution must prefer direct npm, retain the existing local runtime fallback, introduce no extra public formatting command or formatter wrapper, and replace the current untracked local-only hook behavior.
- Choose exact verification commands, evidence formatting, and commit messages while preserving an isolated mechanical baseline and the bounded final gates.

### Deferred Ideas (OUT OF SCOPE)
- A fresh R01 product/refactor milestone after the exact-final-head release exit and synchronized clean `main`.
- All product behavior, UI, persistence, storage, audio, domain, and service changes.
- All 32 dormant product capability seeds; none match this tooling-only milestone.
- Browser, Playwright, visual, microphone, and product UAT.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| POLICY-01 | Maintainers have one root `.gitattributes` policy that normalizes allowed repository text to LF while explicitly preserving binary assets, generated outputs, and `.planning/**`; `.planning/deprecated/**` remains protected without reading or transforming quarantined contents. | Use `* text=auto eol=lf`, explicit `binary` patterns, generated-path `-text` rules, and separate comments/rules for lifecycle exclusion versus absolute quarantine. `[CITED: https://git-scm.com/docs/gitattributes]` |
| TOOL-01 | Maintainers have one root `prettier.config.mjs` and one `.prettierignore` that preserve the repository's established style, configure the supported Tailwind v4 stylesheet integration, and exclude `.planning/**`, binary, dependency, generated, and build-output paths. | Keep the current style owner, add `endOfLine: "lf"` and `tailwindStylesheet: "./src/app/globals.css"`, and make `.prettierignore` the traversal boundary. `[VERIFIED: live repository]` `[CITED: https://github.com/tailwindlabs/prettier-plugin-tailwindcss]` |
| TOOL-02 | The project pins exact compatible versions of Prettier and the Tailwind Prettier plugin from their official packages, exposes only `npm run format` and `npm run format:check` as public formatting commands, and introduces no second formatter, new formatter wrapper, custom validator, receipt, ledger, or lifecycle script. | Replace only the root manifest ranges with exact Prettier 3.9.5 and `prettier-plugin-tailwindcss` 0.8.0, retaining the versions already installed and resolved with integrity in the lockfile; run no package acquisition or upgrade. Use `prettier --write . --ignore-unknown` and `prettier --check . --ignore-unknown`. `[VERIFIED: package.json, package-lock.json, and installed package metadata]` `[CITED: https://prettier.io/docs/install]` `[CITED: https://github.com/tailwindlabs/prettier-plugin-tailwindcss]` |
| EVID-01 | Before implementation, current native phase research verifies the selected formatter and plugin against official release/package identity, integrity, configuration, Tailwind v4 compatibility, and repository constraints; in-scope conflicts are diagnosed and repaired in this phase, while only a material boundary change or unavailable external authority stops for owner direction. | Official documentation, official package identity, installed metadata/README, existing lockfile integrity, and disposable full-surface probes are recorded below; no new package is acquired. `[VERIFIED: live repository]` `[CITED: https://prettier.io/docs/install]` `[CITED: https://github.com/tailwindlabs/prettier-plugin-tailwindcss]` |
| BASE-01 | One committed mechanical Prettier baseline formats every allowed tracked Prettier-supported text file across source, tests, configuration, scripts, current documentation, and legacy documentation, while `.planning/**`, excluded, and quarantined paths remain byte-untouched. | Invoke the root directory rather than a hand-picked glob; use `.prettierignore` plus `--ignore-unknown`. The live path-only inventory found 532 tracked paths outside `.planning/**`, 518 of which the installed Prettier support API recognized before generated-file exclusions. `[VERIFIED: live repository]` |
| BASE-02 | The mechanical baseline commit contains formatter output only, with no product-semantic edit, dependency-policy change, enforcement edit, generated artifact, or manual cleanup mixed into it. | Commit policy/tooling/enforcement before the format write, begin the baseline from an otherwise clean allowed surface, and stage only tracked formatter output outside `.planning/**`. `[VERIFIED: CONTEXT.md]` |
| BASE-03 | Before the baseline is committed, formatter/configuration diagnosis continues until a fixed point is reached; immediately after the committed baseline, a second `npm run format` produces no tracked diff and `npm run format:check` passes over the complete configured surface. | Use the index as the comparison point between writes; the exact stage/rerun procedure below resolves the reproduced E2E second-pass delta without a custom ledger. `[VERIFIED: live repository]` |
| WIN-01 | Repository commands use an already available supported `node`/`npm` toolchain when present and otherwise use the existing `scripts/npm-local.ps1` bundled-runtime fallback; the phase performs no user- or system-PATH mutation. | Direct Node/npm/npx are absent in the current shell; the wrapper yields Node 24.17.0 and npm 11.17.0 using process-local Corepack state. `[VERIFIED: live environment]` |
| WIN-02 | The tracked pre-commit hook resolves `npm` or `npm.cmd` first and falls back to `scripts/npm-local.ps1` through PowerShell when necessary, failing closed only when neither supported route exists. | Reuse the tracked executable `.githooks/pre-commit`; keep route resolution separate from formatter success so a real format failure is never retried through another route. `[VERIFIED: live repository]` |
| ENF-01 | The tracked pre-commit hook is a fast fail-closed gate that runs `git diff --cached --check` and, once the formatting policy exists in `HEAD`, `npm run format:check`; it does not repeat lint, typecheck, the full unit suite, or build on every commit. | The tracked hook already implements this bootstrap-aware shape; the plan should verify and only refine it if a requirement gap is proven. `[VERIFIED: .githooks/pre-commit]` |
| ENF-02 | Ubuntu CI runs the same `npm run format:check` before lint, typecheck, unit tests, and build, so the canonical formatting contract is enforced consistently across Windows development and CI. | Insert one format-check step after `npm ci` and before the existing lint step; retain the current remaining order. `[VERIFIED: .github/workflows/ci.yml]` |
| QUAL-01 | The frozen final implementation revision passes one complete local sequence of `format:check`, a second-format no-diff check, lint, typecheck, the full unit suite, and build; Playwright/browser testing is not required because no product or UI behavior changes. | Run the complete non-browser sequence once after the candidate is frozen; earlier commits use only the fast hook and targeted formatting checks. `[VERIFIED: package.json]` `[VERIFIED: CONTEXT.md]` |
| HIST-01 | The implementation history keeps the repository-wide mechanical formatter output isolated from policy/tooling, enforcement, semantic edits, and lifecycle metadata, without treating an exact plan, task, or commit count as a correctness gate. | The plan must identify the mechanical baseline commit by content and parent cleanliness, not by imposing a fixed total commit count. `[VERIFIED: CONTEXT.md]` |
| DELIV-01 | The immutable reviewed implementation revision has complete evidence for allowed formatting scope, quarantine protection, Windows toolchain resolution, gate success, and clean version-control rollback, and is ready to enter native verification and shipping without any product migration or user repair. | Record command outcomes against one frozen implementation revision, including supported direct-or-existing-wrapper runtime resolution; keep PR creation, merge, final-head review, and synchronized `main` in the separate release exit. `[VERIFIED: REQUIREMENTS.md]` `[VERIFIED: live environment]` |
</phase_requirements>

## Project Constraints (from AGENTS.md)

- Native OpenGSD is the only lifecycle and coordination entrypoint; the active v1.1 formatting phase is authorized through research, planning, execution, verification, and bounded repair without routine stage confirmations. `[VERIFIED: AGENTS.md]`
- Do not create a fresh milestone/R01, imitate native lifecycle stages with scripts, or add a controller, validator, retry/recovery layer, receipt, scanner, graph, cache, database, or telemetry system. `[VERIFIED: AGENTS.md]`
- Any native lifecycle mutation must be compared with read-only `smart-entry --json`; a contradiction is a stop condition. This research performed no lifecycle mutation. `[VERIFIED: AGENTS.md]`
- Work stays in `C:\Users\wsuto\metronome` with `workflow.use_worktrees=false`; do not create or invoke a Git worktree. `[VERIFIED: AGENTS.md]`
- Typed native dispatch must use the resolved agent type/model/effort with `fork_turns: "none"` when the schema supports it; missing exact binding fails closed. `[VERIFIED: AGENTS.md]`
- Code maps and Lumen are navigation caches only; material facts require live-file confirmation. No graph was present, and no cache evidence was used. `[VERIFIED: AGENTS.md]` `[VERIFIED: live repository]`
- The `metronome-policy` reuse evidence lane is not applicable because this phase is pure formatting/enforcement and adds no product behavior or abstraction; its prohibition on parallel lifecycle infrastructure still applies. `[VERIFIED: skills/metronome-policy/SKILL.md]`
- The tracked pre-commit hook is intentionally fast: staged whitespace plus `format:check` after policy bootstrap, not lint/typecheck/unit/build on every commit. `[VERIFIED: AGENTS.md]`
- Direct npm may be used when supported; otherwise retain `scripts/npm-local.ps1`. Do not mutate global/user PATH or remove the working local fallback. `[VERIFIED: AGENTS.md]`
- Do not bypass hooks with `--no-verify` without explicit owner direction. `[VERIFIED: AGENTS.md]`
- Final local/Ubuntu verification runs `format:check`, lint, typecheck, the full unit suite, and build once per frozen candidate revision. `[VERIFIED: AGENTS.md]`
- Final PR review is read-only `@codex` review of the same frozen head; shipping, final CI/review, merge, clean synchronized `main`, and the next R01 are release-exit work, not Phase 1 implementation proof. `[VERIFIED: AGENTS.md]`

## Summary

Retain and exact-pin the live installed/locked pair Prettier 3.9.5 and `prettier-plugin-tailwindcss` 0.8.0, with the existing style settings, explicit `endOfLine: "lf"`, and `tailwindStylesheet: "./src/app/globals.css"`. Change only the root manifest range specifiers; do not acquire or upgrade packages. Prettier's official guidance supports exact local pinning, `prettier --write .`, `prettier --check .`, a root ignore file, and `--ignore-unknown`; the Tailwind plugin's official README requires Prettier 3+, ESM loading, and the stylesheet option for Tailwind v4. `[VERIFIED: package.json, package-lock.json, and installed package metadata]` `[CITED: https://prettier.io/docs/install]` `[CITED: https://prettier.io/docs/cli]` `[CITED: https://github.com/tailwindlabs/prettier-plugin-tailwindcss]`

The repository-wide probe reproduced the known instability under the selected installed pair (3.9.5/0.8.0): after pass 1, pass 2 only reflowed one chained locator in `tests/e2e/sheet-practice-integration.spec.ts`; the next check passed. A separate out-of-scope comparison with newer 3.9.6/0.8.1 behaved identically, so upgrading would not improve fixed-point behavior. The implementation must therefore reach a fixed point before the single baseline commit by staging the current formatter result, running the same formatter again, and treating any unstaged delta as additional formatter output to inspect and stage before repeating. This uses Git's index as the comparison point and introduces no custom hash, ledger, validator, loop script, or manual code edit. `[VERIFIED: live repository disposable probes]`

The planning lifecycle and deprecated quarantine are different controls. `.planning/**` is excluded because native lifecycle files legitimately change throughout the phase; `.planning/deprecated/**` is an absolute no-consume boundary that research, formatting, mapping, hashing, and evidence collection must never enter. Ignore and attribute rules should document both reasons even though the broader lifecycle rule already excludes the nested path. `[VERIFIED: CONTEXT.md]`

**Primary recommendation:** Create one narrow plan that establishes policy/tooling and enforcement, produces one isolated formatter-only fixed-point baseline, then runs the complete non-browser quality sequence once on the frozen candidate; do not make the number of tasks or commits a gate. `[VERIFIED: CONTEXT.md]`

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Formatting write/check | Repository tooling | Developer workstation | Exact local Prettier owns transformations; npm exposes the two canonical entrypoints. `[CITED: https://prettier.io/docs/cli]` |
| LF normalization | Git index/working tree | Prettier | `.gitattributes` owns cross-platform text/binary classification; Prettier explicitly emits LF for supported files. `[CITED: https://git-scm.com/docs/gitattributes]` `[CITED: https://prettier.io/docs/options]` |
| Tailwind class ordering | Prettier plugin | Tailwind stylesheet | The plugin reads the v4 entry stylesheet to derive the canonical project class order. `[CITED: https://github.com/tailwindlabs/prettier-plugin-tailwindcss]` |
| Quarantine protection | Repository policy | Native workflow | Ignore/attribute rules keep tools out; the stronger no-consume process boundary comes from CONTEXT/AGENTS. `[VERIFIED: CONTEXT.md]` |
| Commit-time enforcement | Git hook | npm runtime resolver | The tracked executable hook owns fast staged checks and delegates the formatter check through direct npm or the existing wrapper. `[VERIFIED: .githooks/pre-commit]` |
| Final enforcement | Ubuntu CI | Frozen local candidate | CI and local verification run the same format check before the existing quality gates. `[VERIFIED: .github/workflows/ci.yml]` |
| Product behavior | — | — | No browser, API, database, storage, audio, or UI responsibility exists in this tooling-only phase. `[VERIFIED: CONTEXT.md]` |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `prettier` | 3.9.5 exact; already installed and locked | Sole general-purpose formatter and check CLI | Retaining the existing official package artifact avoids acquisition and output drift while exact-pinning removes manifest range drift. `[VERIFIED: installed package metadata and package-lock.json]` `[CITED: https://prettier.io/docs/install]` |
| `prettier-plugin-tailwindcss` | 0.8.0 exact; already installed and locked | Sort Tailwind v4 classes using the live stylesheet | Retaining the existing official Tailwind Labs package artifact provides the verified Prettier 3/Tailwind v4 integration without an upgrade. `[VERIFIED: installed package metadata, installed README, and package-lock.json]` `[CITED: https://github.com/tailwindlabs/prettier-plugin-tailwindcss]` |
| Git | 2.55.0.windows.3 available | LF attributes, index comparison, tracked hook activation | Git officially owns EOL normalization, binary attributes, executable hook discovery, and `core.hooksPath`. `[VERIFIED: live environment]` `[CITED: https://git-scm.com/docs/gitattributes]` |

### Supporting

| Library/Tool | Version | Purpose | When to Use |
|--------------|---------|---------|-------------|
| Node.js | Repository contract `>=24.0.0`; fallback 24.17.0 | Run local Prettier/npm | Use an already available supported direct runtime; otherwise the checked repository-local runtime. `[VERIFIED: package.json]` `[VERIFIED: live environment]` |
| npm | Repository contract `>=11.17.0`; wrapper resolves 11.17.0 | Exact dependency pin and npm scripts | Use direct supported npm when present; otherwise `scripts/npm-local.ps1`. `[VERIFIED: package.json]` `[VERIFIED: live environment]` |
| Tailwind CSS | Existing 4.3.1 range/installation | Source of v4 class-order configuration | Keep the existing package; do not modernize it in this phase. `[VERIFIED: package.json]` |
| PowerShell | Windows PowerShell 5.1 and PowerShell 7 available | Launch repository-local npm fallback | Hook may use `powershell`, then `pwsh`, only when direct npm is unavailable. `[VERIFIED: live environment]` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Prettier 3.9.5 exact | Newer 3.9.6 | 3.9.6 is an out-of-scope upgrade; the disposable comparison reproduced the same second-pass reflow and supplied no phase-relevant benefit. `[VERIFIED: live repository disposable probes]` `[CITED: https://github.com/prettier/prettier/releases]` |
| Plugin 0.8.0 exact | Newer 0.8.1 | 0.8.1 is an out-of-scope upgrade; its release fixes are unrelated to the selected repository integration, and the comparison pair did not improve fixed-point behavior. `[VERIFIED: live repository disposable probes]` `[CITED: https://github.com/tailwindlabs/prettier-plugin-tailwindcss/releases/tag/v0.8.1]` |
| `prettier ... . --ignore-unknown` | Extension-specific globs | Root-directory inference covers newly added supported file types and avoids Windows/Ubuntu shell-glob divergence; `.prettierignore` owns exclusions. `[CITED: https://prettier.io/docs/cli]` |
| Documented `git config core.hooksPath .githooks` | A hook-manager dependency or `prepare` script | Explicit local activation adds no package, implicit lifecycle script, or public formatter command. `[CITED: https://git-scm.com/docs/git-config#Documentation/git-config.txt-corehooksPath]` |

**Pinning (no acquisition):** Update only the two root manifest specifiers; do not run an install or upgrade command. Preserve the existing lock resolutions, tarball URLs, integrity values, and installed package artifacts. `[VERIFIED: package.json, package-lock.json, and installed package metadata]`

```json
"prettier": "3.9.5",
"prettier-plugin-tailwindcss": "0.8.0"
```

**Version verification:** The existing lockfile resolves Prettier 3.9.5 with integrity `sha512-/FVl766LpUfB5vXgCYOYa0MeV/441Ia99AeICQIQFTY/Nw0roZwULcXpku5i1/m5kt/baz+s4Zogspd839HSMg==` and plugin 0.8.0 with integrity `sha512-V8ITGH87yuBDF6JpEZTOVlUz/saAwqb8f3HRgUj8Lh+tGCcrmorhsLpYqzygwFwK0PE2Ib6Mv3M7T/uE2tZV1g==`; the installed metadata matches those versions. Implementation must confirm those lock entries remain unchanged after the manifest-only exact pin. `[VERIFIED: package-lock.json and installed package metadata]`

## Package Legitimacy Audit

No external package acquisition occurs in this phase. The phase retains the already installed and locked official packages and only removes range drift in the root manifest, so the package-acquisition legitimacy gate is not applicable. `[VERIFIED: package.json, package-lock.json, and installed package metadata]` `[CITED: https://prettier.io/docs/install]` `[CITED: https://github.com/tailwindlabs/prettier-plugin-tailwindcss]`

| Package | Installed/Locked | Integrity Evidence | Official Identity | Disposition |
|---------|------------------|--------------------|-------------------|-------------|
| `prettier` | 3.9.5 | Existing lockfile SHA-512 entry matches the retained resolution. `[VERIFIED: package-lock.json]` | Official Prettier package and documentation. `[CITED: https://prettier.io/docs/install]` | Retain artifact; exact-pin the existing version in `package.json`; no install or upgrade. |
| `prettier-plugin-tailwindcss` | 0.8.0 | Existing lockfile SHA-512 entry matches the retained resolution. `[VERIFIED: package-lock.json]` | Official Tailwind Labs plugin repository and installed README. `[CITED: https://github.com/tailwindlabs/prettier-plugin-tailwindcss]` `[VERIFIED: installed package metadata]` | Retain artifact; exact-pin the existing version in `package.json`; no install or upgrade. |

## Architecture Patterns

### System Architecture Diagram

The flow below reflects the official CLI/Git behavior and the live repository controls. `[CITED: https://prettier.io/docs/cli]` `[CITED: https://git-scm.com/docs/githooks]` `[VERIFIED: live repository]`

```text
Maintainer command
    |
    v
Supported direct node/npm? ---- no ----> scripts/npm-local.ps1
    | yes                                  | Node 24.17 + Corepack npm 11.17
    +-------------------+------------------+
                        v
            npm run format / format:check
                        |
                        v
             exact local Prettier + plugin
                        |
              +---------+----------+
              |                    |
              v                    v
   prettier.config.mjs      .prettierignore
   + Tailwind stylesheet    + .gitignore defaults
              |                    |
              +---------+----------+
                        v
   Allowed supported files outside .planning/**
                        |
          write changed anything after staging?
              | yes                     | no
              v                         v
   inspect/stage formatter delta   single mechanical commit
   and run formatter again               |
                                           v
                       post-commit format -> no Git diff -> check

Git commit entry -> tracked .githooks/pre-commit
                   -> staged whitespace check
                   -> policy present in HEAD?
                         no: bootstrap exit 0
                         yes: npm run format:check

Ubuntu CI -> npm ci -> format:check -> lint -> typecheck -> unit -> build

.planning/** ------------ formatting lifecycle exclusion (never entered)
.planning/deprecated/** -- absolute content quarantine (never consumed by any phase tool)
```

### Recommended Project Structure

```text
/
├── .gitattributes              # LF/text, binary, generated, lifecycle/quarantine policy
├── .prettierignore             # sole formatter traversal exclusions
├── prettier.config.mjs         # sole style/plugin owner
├── package.json                # only format + format:check public commands
├── package-lock.json           # exact package resolutions/integrity
├── .githooks/
│   └── pre-commit              # tracked executable fast gate
├── .github/workflows/ci.yml    # Ubuntu format check before existing gates
└── scripts/npm-local.ps1       # existing fallback; retain rather than replace
```

Every listed path exists now except `.gitattributes` and `.prettierignore`; the existing hook is tracked as executable mode `100755`, and local `core.hooksPath` currently equals `.githooks`. `[VERIFIED: live repository]`

### Pattern 1: One Root Formatter Owner

**What:** Extend the existing ESM config rather than adding another config or formatter. `[VERIFIED: prettier.config.mjs]`

**When to use:** All supported files reached from the repository root. `[CITED: https://prettier.io/docs/configuration]`

```javascript
// Source: https://prettier.io/docs/configuration
// Source: https://github.com/tailwindlabs/prettier-plugin-tailwindcss
/** @type {import("prettier").Config & import("prettier-plugin-tailwindcss").PluginOptions} */
const config = {
  plugins: ["prettier-plugin-tailwindcss"],
  tailwindStylesheet: "./src/app/globals.css",
  endOfLine: "lf",
  semi: true,
  singleQuote: false,
  trailingComma: "none"
};

export default config;
```

The Tailwind plugin is the only plugin, so the official “load last” compatibility rule is automatically satisfied. `[CITED: https://github.com/tailwindlabs/prettier-plugin-tailwindcss]`

### Pattern 2: Root CLI With Explicit Unknown-File Handling

**What:** Let Prettier infer supported files from `.` and let `.prettierignore` own the boundary. `[CITED: https://prettier.io/docs/cli]`

```json
{
  "scripts": {
    "format": "prettier --write . --ignore-unknown",
    "format:check": "prettier --check . --ignore-unknown"
  }
}
```

Do not add `format:fix`, `format:staged`, a shell wrapper, a cache flag, or a file-list generator. `[VERIFIED: CONTEXT.md]`

### Pattern 3: Defense-in-Depth Boundary Without Quarantine Consumption

**What:** Use attributes for Git byte handling and `.prettierignore` for formatter traversal; keep explanatory comments that distinguish mutable lifecycle output from absolute legacy quarantine. `[CITED: https://git-scm.com/docs/gitattributes]` `[CITED: https://prettier.io/docs/ignore]`

```gitattributes
# Canonical repository text baseline
* text=auto eol=lf

# Native lifecycle bytes are not part of the formatting baseline
.planning/** -text

# Absolute legacy content quarantine; never read or transformed
.planning/deprecated/** -text

# Current and foreseeable binary assets
*.png binary
*.jpg binary
*.jpeg binary
*.gif binary
*.webp binary
*.avif binary
*.ico binary
*.pdf binary
*.woff binary
*.woff2 binary
*.ttf binary
*.otf binary
*.mp3 binary
*.wav binary
*.ogg binary
*.mp4 binary
*.mov binary
*.zip binary
*.gz binary
*.wasm binary

# Dependency/generated/output trees
node_modules/** -text
.tools/** -text
.next/** -text
out/** -text
coverage/** -text
playwright-report/** -text
test-results/** -text
.audit/** -text
.tmp/** -text
.code-review-graph/** -text
```

```gitignore
# Native OpenGSD lifecycle exclusion
.planning/

# Absolute quarantine (redundant as a matcher, distinct as a process contract)
.planning/deprecated/

# Dependencies, generated outputs, and caches
node_modules/
.tools/
.next/
out/
coverage/
playwright-report/
test-results/
.audit/
.tmp/
.code-review-graph/
.logs/
*.tsbuildinfo
next-env.d.ts

# Binary formats
**/*.png
**/*.jpg
**/*.jpeg
**/*.gif
**/*.webp
**/*.avif
**/*.ico
**/*.pdf
**/*.woff
**/*.woff2
**/*.ttf
**/*.otf
**/*.mp3
**/*.wav
**/*.ogg
**/*.mp4
**/*.mov
**/*.zip
**/*.gz
**/*.wasm
```

The second block is `.prettierignore` content; it uses gitignore syntax, not an additional `.gitignore` file. `[CITED: https://prettier.io/docs/ignore]`

After staging `.gitattributes`, run `git add --renormalize -- . ':(exclude).planning/**'` and review the staged path set before committing policy. This applies the new attribute policy only to allowed paths and keeps any attribute-driven normalization separate from the later formatter-only baseline. The current path-only EOL inventory outside `.planning/**` shows the tracked text index already uses LF, so a large renormalization delta is not expected. `[CITED: https://git-scm.com/docs/gitattributes]` `[VERIFIED: live repository]`

### Pattern 4: Index-Based Formatter Fixed Point

**What:** Compare pass N+1 to the already staged pass N through the ordinary Git index. `[VERIFIED: live repository disposable probes]`

**When to use:** Before the one mechanical baseline commit, after policy/tooling is committed and the allowed worktree is otherwise clean. `[VERIFIED: CONTEXT.md]`

```powershell
# Use direct supported npm when available; commands below show the current-machine fallback.
& .\scripts\npm-local.ps1 --% run format

# Stage only tracked formatter output outside native planning.
git add -u -- . ':(exclude).planning/**'

# A second write now appears as an unstaged delta relative to the staged first pass.
& .\scripts\npm-local.ps1 --% run format
git diff --exit-code -- . ':(exclude).planning/**'

# If the diff is non-empty, inspect it as formatter-only output, stage it, and repeat
# the same write + unstaged-diff check. Do not hand-edit the E2E file.
```

For the current tree, expect the first repeat to reflow `tests/e2e/sheet-practice-integration.spec.ts` and the next check to be clean. That expectation is diagnostic evidence, not a hard-coded special case or an instruction to format only that file. `[VERIFIED: live repository disposable probes]`

After the baseline commit, prove the committed fixed point directly: `[VERIFIED: CONTEXT.md]`

```powershell
& .\scripts\npm-local.ps1 --% run format
git diff --exit-code -- . ':(exclude).planning/**'
& .\scripts\npm-local.ps1 --% run format:check
```

### Pattern 5: Bootstrap-Aware Fast Hook

**What:** The tracked hook always checks staged whitespace, skips format checking only while `.prettierignore` is absent from `HEAD`, then runs the canonical npm check through one resolved runtime route. `[VERIFIED: .githooks/pre-commit]`

**When to use:** Every commit after local activation with `git config core.hooksPath .githooks`. `[CITED: https://git-scm.com/docs/git-config#Documentation/git-config.txt-corehooksPath]`

The plan should reuse the existing tracked hook and preserve its executable bit. Do not copy the legacy heavy `.git/hooks/pre-commit` into the repository, and do not fall back to another runtime after `format:check` itself fails. `[VERIFIED: live repository]`

### Anti-Patterns to Avoid

- **Hand-picked source globs:** They omit supported configuration or legacy/current documentation and create shell-specific behavior. Use `.` plus ignore policy. `[CITED: https://prettier.io/docs/cli]`
- **Treating `.planning/**` and deprecated quarantine as the same fact:** The first is a formatting lifecycle exclusion; the nested deprecated path is a stronger no-consume process boundary. `[VERIFIED: CONTEXT.md]`
- **Hashing quarantine to prove it did not change:** That violates D-02. Prove protection structurally and by change-path review without consuming quarantined bytes. `[VERIFIED: CONTEXT.md]`
- **Manual E2E reflow to force idempotence:** The reproduced pass-2 delta is formatter output; reach the fixed point by rerunning the exact formatter before commit. `[VERIFIED: live repository disposable probes]`
- **Prettier cache during the baseline:** Official docs state plugin versions/implementation are not cache keys; a cache also adds unnecessary state to a one-time baseline. `[CITED: https://prettier.io/docs/cli#--cache]`
- **Full quality suite on each commit:** It contradicts the fast-hook contract and repeats expensive work before the candidate is frozen. `[VERIFIED: AGENTS.md]`
- **Implicit hook installation script:** Git does not version local config; use the documented local `core.hooksPath` activation rather than a new lifecycle script or dependency. `[CITED: https://git-scm.com/docs/git-config#Documentation/git-config.txt-corehooksPath]`
- **Fallback after formatting failure:** Resolve the route first; once `format:check` runs, its nonzero status must fail closed rather than being retried through another npm route. `[VERIFIED: WIN-02 requirement]`

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Repository formatting | A second formatter or custom parser/printer | Exact local Prettier 3.9.5 | File inference, parsing, comments, embedded languages, and stable CLI behavior already exist. `[VERIFIED: installed package metadata]` `[CITED: https://prettier.io/docs/cli]` |
| Tailwind class order | A class sorter or regex rewrite | `prettier-plugin-tailwindcss` 0.8.0 with `tailwindStylesheet` | The official plugin derives order from the v4 stylesheet and integrates with Prettier's AST. `[VERIFIED: installed package metadata]` `[CITED: https://github.com/tailwindlabs/prettier-plugin-tailwindcss]` |
| LF enforcement | A newline conversion script | `.gitattributes` plus Prettier `endOfLine: "lf"` | Git owns index/worktree normalization and binary classification. `[CITED: https://git-scm.com/docs/gitattributes]` |
| Fixed-point proof | A hash manifest, loop script, receipt, or validator | Staged pass N + ordinary unstaged `git diff` for pass N+1 | Git already provides the comparison boundary and reviewable delta. `[VERIFIED: live repository disposable probes]` |
| Hook management | Husky or a custom installer | Tracked executable `.githooks/pre-commit` + documented `core.hooksPath` | The hook already exists and Git officially supports an alternate hook directory. `[VERIFIED: live repository]` `[CITED: https://git-scm.com/docs/githooks]` |
| Windows runtime bootstrap | PATH mutation or a new formatter wrapper | Existing `scripts/npm-local.ps1` | It already supplies Node 24/Corepack/npm 11.17 in process scope. `[VERIFIED: scripts/npm-local.ps1]` |
| Lifecycle/evidence | A project controller, scanner, cache, ledger, or status publisher | Native OpenGSD artifacts and verification | Parallel workflow infrastructure is expressly forbidden. `[VERIFIED: AGENTS.md]` |

**Key insight:** The difficult parts here are ownership and boundaries, not formatting syntax. Use Prettier, Git attributes/index, the existing hook, and native OpenGSD as their respective single owners. `[VERIFIED: live repository]`

## Common Pitfalls

### Pitfall 1: Committing After Only One Formatter Write

**What goes wrong:** The next `npm run format` changes `tests/e2e/sheet-practice-integration.spec.ts`, so the committed baseline fails BASE-03. `[VERIFIED: live repository disposable probes]`

**Why it happens:** The selected Prettier 3.9.5 reaches a different line-breaking decision for one chained locator after its first whole-file reprint; the Tailwind v4 option does not remove the effect. `[VERIFIED: live repository disposable probes]`

**How to avoid:** Stage each diagnostic pass, rerun, and use the unstaged diff as the pass-to-pass comparison until it is empty; then commit once and repeat the format/no-diff/check proof. `[VERIFIED: live repository disposable probes]`

**Warning signs:** Any unstaged diff after running the formatter against an already staged formatter pass. `[VERIFIED: Git behavior]`

### Pitfall 2: Traversing Quarantine During Scope Evidence

**What goes wrong:** A “prove unchanged” scan, formatter dry run, map, or hash reads forbidden deprecated planning bytes. `[VERIFIED: CONTEXT.md]`

**Why it happens:** Teams often treat ignore policy as merely a write filter and then use a broader read-only inventory for evidence. `[VERIFIED: CONTEXT.md]`

**How to avoid:** Every repository discovery or diff command must exclude all `.planning/**` before enumeration; quarantine evidence must be structural/path-only and must never cite content. `[VERIFIED: CONTEXT.md]`

**Warning signs:** A command root of `.` without `.prettierignore` already committed, or a search/hash command naming `.planning/deprecated`. `[VERIFIED: CONTEXT.md]`

### Pitfall 3: Omitting Tailwind v4 Stylesheet Configuration

**What goes wrong:** The plugin lacks the project's v4 theme/custom-utility context, so its class order does not represent the live project stylesheet. `[CITED: https://github.com/tailwindlabs/prettier-plugin-tailwindcss]`

**Why it happens:** Tailwind v3 used `tailwindConfig`; v4 requires the CSS entry point through `tailwindStylesheet`. `[CITED: https://github.com/tailwindlabs/prettier-plugin-tailwindcss]`

**How to avoid:** Set `tailwindStylesheet: "./src/app/globals.css"` in the root config and keep the ESM plugin last. `[CITED: https://github.com/tailwindlabs/prettier-plugin-tailwindcss]`

**Warning signs:** Missing option, a `tailwindConfig`-only setup, or an ENOENT for the stylesheet during format. `[VERIFIED: installed plugin README]`

### Pitfall 4: Range Specifiers or Lockfile Drift

**What goes wrong:** Different machines resolve different formatter patches, or `package.json`, installed metadata, and lockfile disagree. `[CITED: https://prettier.io/docs/install]`

**Why it happens:** The live manifest uses `^3.8.4`/`^0.8.0`, while the lock currently resolves 3.9.5/0.8.0. `[VERIFIED: package.json and package-lock.json]`

**How to avoid:** Replace only the root ranges with exact 3.9.5/0.8.0 and verify the existing lockfile resolutions and integrity entries remain unchanged; run no acquisition or upgrade command. `[VERIFIED: package.json and package-lock.json]`

**Warning signs:** A caret/tilde in either formatter dependency or a lock resolution different from the selected exact version. `[VERIFIED: live repository]`

### Pitfall 5: Choosing the Bundled npm.cmd Instead of the Wrapper

**What goes wrong:** Directly invoking the repository-local Node distribution's bundled `npm.cmd`/`npx.cmd` yields 11.13.0, below the repository's npm `>=11.17.0` contract. `[VERIFIED: live environment]`

**Why it happens:** Node 24.17.0 bundles npm/npx 11.13.0, while `scripts/npm-local.ps1` intentionally asks Corepack for npm 11.17.0. `[VERIFIED: live environment]` `[VERIFIED: scripts/npm-local.ps1]`

**How to avoid:** Use a supported direct PATH toolchain when present; otherwise invoke the wrapper, not `.tools/.../npm.cmd` directly. `[VERIFIED: AGENTS.md]`

**Warning signs:** `npm --version` reports 11.13.0 or direct Node/npm commands are missing. `[VERIFIED: live environment]`

### Pitfall 6: Making the Policy Bootstrap Commit Impossible

**What goes wrong:** The hook runs `format:check` before `.prettierignore` and the npm script exist in `HEAD`. `[VERIFIED: live repository]`

**Why it happens:** Hooks see the current `HEAD`, not merely the future contents staged for the policy commit. `[VERIFIED: Git hook behavior]`

**How to avoid:** Preserve the current `git cat-file -e HEAD:.prettierignore` bootstrap guard; all later commits must run format checking. `[VERIFIED: .githooks/pre-commit]`

**Warning signs:** The first policy commit fails with “Missing script: format:check,” or later commits still skip after the policy is in `HEAD`. `[VERIFIED: live hook logic]`

### Pitfall 7: Mixing Policy, Mechanical Output, and Lifecycle Metadata

**What goes wrong:** The large diff is no longer cleanly reviewable or revertible, and BASE-02/HIST-01 fail. `[VERIFIED: REQUIREMENTS.md]`

**Why it happens:** Formatting is run before exact dependency/config/ignore decisions are committed, or lifecycle artifacts are staged with the allowed surface. `[VERIFIED: CONTEXT.md]`

**How to avoid:** Establish the toolchain first, begin baseline work from a clean allowed surface, use `.planning/**`-excluding pathspecs, and keep the formatter-only result in one commit. `[VERIFIED: CONTEXT.md]`

**Warning signs:** `package.json`, lockfile, hook, CI, `.planning/**`, or manual product edits appear in the mechanical commit. `[VERIFIED: REQUIREMENTS.md]`

### Pitfall 8: Repeating the Full Suite Before the Candidate Is Frozen

**What goes wrong:** Planning/execution spends time rerunning lint, typecheck, the full unit suite, and build after revisions that are known to change again. `[VERIFIED: AGENTS.md]`

**Why it happens:** A legacy heavy local hook is mistaken for the desired tracked policy. `[VERIFIED: live repository]`

**How to avoid:** Use the tracked fast hook during commits and run the complete non-browser sequence once on the frozen final implementation revision; CI repeats that same final sequence. `[VERIFIED: AGENTS.md]`

**Warning signs:** Lint, typecheck, unit, or build commands appear inside `.githooks/pre-commit`. `[VERIFIED: AGENTS.md]`

## Code Examples

Verified implementation patterns are consolidated in the Architecture Patterns section. The following commands are the required final local gate shape, using the current machine's supported wrapper route. `[VERIFIED: live environment]`

```powershell
& .\scripts\npm-local.ps1 --% run format:check
& .\scripts\npm-local.ps1 --% run format
git diff --exit-code -- . ':(exclude).planning/**'
& .\scripts\npm-local.ps1 --% run lint
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run test:unit
& .\scripts\npm-local.ps1 --% run build
```

Run this sequence only after the candidate is frozen. If `format` creates a diff, the candidate was not actually frozen; repair within the bounded phase, establish a replacement frozen revision, and run the sequence once on that revision. `[VERIFIED: AGENTS.md]`

CI should mirror the canonical order after `npm ci`: `[VERIFIED: .github/workflows/ci.yml]`

```yaml
- name: Check formatting
  run: npm run format:check
- name: Lint
  run: npm run lint
- name: Typecheck
  run: npm run typecheck
- name: Unit tests
  run: npm run test:unit
- name: Build
  run: npm run build
```

## State of the Art

| Old/Current Repository State | Recommended Current State | When Changed | Impact |
|------------------------------|---------------------------|--------------|--------|
| `prettier` range `^3.8.4`, lock/install 3.9.5 | Exact 3.9.5 with the same retained lock/install artifact | Phase baseline decision | Deterministic resolution across machines without acquiring a new formatter artifact. `[VERIFIED: package.json, package-lock.json, and installed package metadata]` |
| Plugin range `^0.8.0`, lock/install 0.8.0 | Exact 0.8.0 with the same retained lock/install artifact | Phase baseline decision | Deterministic Tailwind integration without acquiring or upgrading a package. `[VERIFIED: package.json, package-lock.json, and installed package metadata]` |
| Plugin registration without v4 stylesheet | `tailwindStylesheet: "./src/app/globals.css"` | Tailwind v4 integration | Plugin loads the project's actual v4 stylesheet context. `[CITED: https://github.com/tailwindlabs/prettier-plugin-tailwindcss]` |
| Implicit/default EOL | Explicit `endOfLine: "lf"` plus `.gitattributes` | Prettier default changed to LF in v2.0 | Makes the cross-platform contract visible and Git-enforced. `[CITED: https://prettier.io/docs/options]` |
| Local heavy `.git/hooks/pre-commit` | Tracked fast `.githooks/pre-commit` | Already present on active branch | Repository policy is reviewable; local activation uses `core.hooksPath`. `[VERIFIED: live repository]` |

**Deprecated/outdated:**

- `tailwindConfig` is the v3 JavaScript-config integration and must not replace `tailwindStylesheet` for this v4 repository. `[CITED: https://github.com/tailwindlabs/prettier-plugin-tailwindcss]`
- Prettier 4.0.0 alpha is not the registry `latest` stable tag and is out of scope. `[CITED: https://www.npmjs.com/package/prettier]`
- Prettier 3.9.6 and `prettier-plugin-tailwindcss` 0.8.1 are newer out-of-scope alternatives; their disposable comparison did not improve the repository's fixed-point behavior. `[VERIFIED: live repository disposable probes]` `[CITED: https://github.com/prettier/prettier/releases]` `[CITED: https://github.com/tailwindlabs/prettier-plugin-tailwindcss/releases/tag/v0.8.1]`
- The plugin's pre-0.5 CommonJS loading model is obsolete; current releases require Prettier 3 and ESM. `[CITED: https://github.com/tailwindlabs/prettier-plugin-tailwindcss]`
- The local-only heavy `.git/hooks/pre-commit` is not tracked enforcement and must not be copied into the repository. `[VERIFIED: live repository]`

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|

All implementation-relevant claims were verified against live repository/environment probes or cited to official documentation/registry/release sources. No `[ASSUMED]` claim is used. `[VERIFIED: research record]`

## Open Questions

None. The selected versions, configuration shape, fixed-point procedure, supported direct-or-existing-wrapper runtime resolution, and no-acquisition boundary are resolved for planning. `[VERIFIED: live repository and environment]`

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Direct `node`/`npm`/`npx` on PATH | Preferred Windows command route | ✗ | — | Existing `scripts/npm-local.ps1`. `[VERIFIED: live environment]` |
| Repository-local Node | Wrapper | ✓ | 24.17.0 | — `[VERIFIED: live environment]` |
| Repository-local bundled npm/npx | Diagnostic only, not supported route | ✓ | 11.13.0 | Wrapper resolves required npm 11.17.0. `[VERIFIED: live environment]` |
| Corepack via wrapper | Exact npm runtime | ✓ | Corepack 0.35.0; npm 11.17.0 | — `[VERIFIED: live environment]` |
| Git | Attributes, index, hook activation | ✓ | 2.55.0.windows.3 | — `[VERIFIED: live environment]` |
| Windows PowerShell | Wrapper/hook fallback | ✓ | 5.1.26100.8875 | PowerShell 7 is also installed. `[VERIFIED: live environment]` |
| PowerShell 7 (`pwsh`) | Secondary hook fallback | ✓ | Available | Windows PowerShell 5.1. `[VERIFIED: live environment]` |
| Installed Prettier | Baseline and checks | ✓ | 3.9.5 | Retain artifact and exact-pin the existing version; no acquisition. `[VERIFIED: installed package metadata and package-lock.json]` |
| Installed Tailwind plugin | Tailwind class sorting | ✓ | 0.8.0 | Retain artifact and exact-pin the existing version; no acquisition. `[VERIFIED: installed package metadata and package-lock.json]` |

**Missing dependencies with no fallback:** none. `[VERIFIED: live environment]`

**Missing dependencies with fallback:** direct PATH Node/npm/npx; use `scripts/npm-local.ps1` without global/user PATH mutation. `[VERIFIED: live environment]`

## Security Domain

Security enforcement is enabled because `.planning/config.json` does not set `security_enforcement` to `false`. `[VERIFIED: .planning/config.json]`

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No authentication surface changes. `[VERIFIED: phase boundary]` |
| V3 Session Management | no | No application session changes. `[VERIFIED: phase boundary]` |
| V4 Access Control | no | No runtime authorization or resource boundary changes. `[VERIFIED: phase boundary]` |
| V5 Input Validation | yes, tooling boundary only | Literal repository-root commands, exact package names/versions, `.prettierignore`, Git pathspec exclusions, and no untrusted dynamic shell input. `[VERIFIED: recommended architecture]` |
| V6 Cryptography | no | No cryptographic implementation; use registry-provided integrity rather than a custom hash/ledger. `[VERIFIED: phase boundary]` |

### Known Threat Patterns for the Tooling Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Typosquat/dependency confusion | Spoofing/Tampering | Retain official installed packages, exact-pin their existing versions, preserve reviewed lockfile integrity, and perform no package acquisition or `npx --yes` download. `[VERIFIED: package-lock.json and installed package metadata]` `[CITED: https://prettier.io/docs/install]` |
| Malicious install script | Elevation of privilege | No install or upgrade runs in this phase; retain and review the existing lockfile entries. `[VERIFIED: recommended no-acquisition boundary]` |
| Unreviewed hook execution | Tampering/Elevation of privilege | Track the executable hook, keep it small, activate explicitly through local `core.hooksPath`, and review its diff. `[CITED: https://git-scm.com/docs/githooks]` |
| Quarantine traversal | Information disclosure | Exclude `.planning/**` before formatter traversal and forbid all content inspection/hash/search of the nested deprecated path. `[VERIFIED: CONTEXT.md]` |
| Shell argument injection | Elevation of privilege | Fixed literal commands/paths; do not construct commands from file contents or external search results. `[VERIFIED: recommended architecture]` |
| Cache-stale plugin output | Tampering | Do not use Prettier `--cache`; official docs say plugin version/implementation are absent from cache keys. `[CITED: https://prettier.io/docs/cli#--cache]` |

## Sources

### Primary (HIGH confidence)

- Live repository files: `AGENTS.md`, phase `CONTEXT.md`, `REQUIREMENTS.md`, `STATE.md`, `ROADMAP.md`, `.planning/config.json`, `package.json`, `package-lock.json`, `prettier.config.mjs`, `.gitignore`, `.githooks/pre-commit`, `.github/workflows/ci.yml`, `scripts/npm-local.ps1`, `src/app/globals.css`. Material project facts were confirmed directly. `[VERIFIED: live repository]`
- Installed metadata/README for Prettier 3.9.5 and `prettier-plugin-tailwindcss` 0.8.0. `[VERIFIED: installed packages]`
- Disposable full allowed-surface probes for selected installed 3.9.5/0.8.0 and the out-of-scope newer comparator 3.9.6/0.8.1, both with the Tailwind v4 stylesheet option. `[VERIFIED: live repository probes]`

### Secondary (MEDIUM confidence)

- [Prettier install guide](https://prettier.io/docs/install) — exact pin, root ignore file, whole-project write/check.
- [Prettier CLI](https://prettier.io/docs/cli) — directory inference, check behavior, ignore paths, `--ignore-unknown`, and cache warning.
- [Prettier configuration](https://prettier.io/docs/configuration) — ESM config and project-local behavior.
- [Prettier options](https://prettier.io/docs/options) — explicit LF and `.gitattributes` pairing.
- [Prettier plugins](https://prettier.io/docs/plugins) — ESM plugin loading through config.
- [Official Tailwind Prettier plugin README](https://github.com/tailwindlabs/prettier-plugin-tailwindcss) — package identity, v4 stylesheet, ESM/Prettier compatibility, plugin ordering.
- [Tailwind plugin v0.8.1 release](https://github.com/tailwindlabs/prettier-plugin-tailwindcss/releases/tag/v0.8.1) — official identity for the newer out-of-scope alternative.
- [Prettier releases](https://github.com/prettier/prettier/releases) — official identity for the newer out-of-scope alternative.
- [npm Prettier package](https://www.npmjs.com/package/prettier) and [npm Tailwind plugin package](https://www.npmjs.com/package/prettier-plugin-tailwindcss) — official package identities.
- [Git attributes](https://git-scm.com/docs/gitattributes), [Git hooks](https://git-scm.com/docs/githooks), and [Git core.hooksPath](https://git-scm.com/docs/git-config#Documentation/git-config.txt-corehooksPath) — LF/binary semantics and tracked hook activation.

### Tertiary (LOW confidence)

- None. No implementation recommendation relies on community-only or training-only evidence. `[VERIFIED: research record]`

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — the phase retains the official installed/locked artifacts, exact-pins their existing versions, and performs no package acquisition or upgrade. `[VERIFIED: package.json, package-lock.json, installed package metadata, and package legitimacy audit]`
- Architecture: HIGH — derived from locked decisions, official CLI/Git behavior, and current live repository owners. `[VERIFIED: live repository]`
- Pitfalls: HIGH — the critical fixed-point failure was reproduced twice across both installed and selected version pairs. `[VERIFIED: live repository disposable probes]`

**Research date:** 2026-07-31

**Valid until:** 2026-08-30 — the recommendation is tied to the repository's existing installed/locked artifacts rather than the moving registry latest tag. `[VERIFIED: package-lock.json and installed package metadata]`
