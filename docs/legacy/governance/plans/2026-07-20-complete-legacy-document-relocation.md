# Complete Legacy Document Relocation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Leave `docs/` with one current router, current static architecture documentation, and one exhaustive `docs/legacy/` namespace for all pre-OpenGSD documentation.

**Architecture:** Move only Git-tracked historical documentation through an explicit path mapping, then normalize every tracked reference and validate all Markdown links. Native OpenGSD authority and archives remain under `.planning/`; no product source, dependency, quality gate, or retired executable workflow is introduced.

**Tech Stack:** Git, Markdown, PowerShell, native OpenGSD artifacts, repository pre-commit gates

## Global Constraints

- The exact pre-move tracked legacy manifest contains 184 paths from `docs/v0`, `docs/agent-index`, `docs/v1`, `docs/v2`, `docs/refactor`, `docs/superpowers`, `docs/v0-plan.md`, and `docs/v1-roadmap.md`.
- Move only tracked files. Never move, add, stage, delete, or rewrite ignored `docs/v1/code-review-workflow.md` or untracked `.superpowers/**` evidence.
- Preserve `.planning/milestones/**`: it is the current native OpenGSD archive mechanism, not a legacy control plane.
- Preserve every `.planning/seeds/**` capability identity and behavior; update only its documentation path references.
- Preserve the exact bytes of all moved JSON truth files, including legacy v1 `status.json` with SHA-256 `B8EB24D247E29FC8E2C54A4ACC8800CCCFFA1F23762B1A05EB5CB9D7C0FCD992`.
- Do not change `src/**`, `tests/**`, dependency fields, lockfiles, or production behavior.
- Do not restore deleted legacy agents, skills, validators, scripts, workflow state, or a second lifecycle control plane.
- After relocation, no tracked file may remain at an old documentation root and no tracked reference outside `docs/legacy/**` may point to an old root.
- Final current authority remains `AGENTS.md`, `.planning/{PROJECT,ROADMAP,STATE}.md`, native seeds and milestones, `skills/metronome-policy/SKILL.md`, and `skills/reviewing-metronome-prs/SKILL.md`.

---

### Task 1: Relocate the complete tracked legacy documentation set

**Files:**
- Create: `docs/README.md`
- Create: `docs/legacy/governance/plans/2026-07-20-complete-legacy-document-relocation.md`
- Move: `docs/v0/**` -> `docs/legacy/v0/**`
- Move: `docs/agent-index/**` -> `docs/legacy/v0/agent-index/**`
- Move: `docs/v0-plan.md` -> `docs/legacy/v0/plan.md`
- Move: `docs/v1/**` -> `docs/legacy/v1/**`
- Move: `docs/v1-roadmap.md` -> `docs/legacy/v1/roadmap.md`
- Move: `docs/v2/**` -> `docs/legacy/v2/**`
- Move: `docs/refactor/**` -> `docs/legacy/refactor/**`
- Move: `docs/superpowers/plans/**` -> `docs/legacy/governance/plans/**`
- Move: `docs/superpowers/specs/**` -> `docs/legacy/governance/specs/**`
- Modify: every tracked text file outside `docs/legacy/**` containing a navigable or source-of-truth reference to an old documentation root, plus only the moved Markdown links that must change to remain resolvable

**Interfaces:**
- Consumes: the exact 184-path manifest at branch head `bd7c051a18e42c3ecfad0cd51f63143ffbbdc06e`
- Produces: one `docs/legacy/` archive namespace; current `.planning` and skill references that resolve into it; zero old tracked documentation roots

- [ ] **Step 1: Capture the exact pre-move manifest and protected-file hashes**

Run from the repository root:

```powershell
$legacySources = @(
  'docs/v0',
  'docs/agent-index',
  'docs/v1',
  'docs/v2',
  'docs/refactor',
  'docs/superpowers',
  'docs/v0-plan.md',
  'docs/v1-roadmap.md'
)
$manifest = @(git ls-files -- $legacySources)
if ($manifest.Count -ne 184) { throw "Expected 184 tracked legacy paths, found $($manifest.Count)" }
if ((git rev-parse HEAD) -ne 'bd7c051a18e42c3ecfad0cd51f63143ffbbdc06e') { throw 'Unexpected starting head' }
if (-not (Test-Path -LiteralPath 'docs/v1/code-review-workflow.md')) { throw 'Protected ignored file is unexpectedly absent' }
```

Expected: 184 tracked source paths, exact starting head, and the protected ignored file present but absent from `git ls-files`.

- [ ] **Step 2: Move only the 184 tracked files through the approved mapping**

For each source path returned by `git ls-files`, calculate the destination with the first matching rule below and use `git mv -- <source> <destination>` after creating the destination parent:

```text
docs/agent-index/<rest>       -> docs/legacy/v0/agent-index/<rest>
docs/v0/<rest>                -> docs/legacy/v0/<rest>
docs/v1/<rest>                -> docs/legacy/v1/<rest>
docs/v2/<rest>                -> docs/legacy/v2/<rest>
docs/refactor/<rest>          -> docs/legacy/refactor/<rest>
docs/superpowers/plans/<rest> -> docs/legacy/governance/plans/<rest>
docs/superpowers/specs/<rest> -> docs/legacy/governance/specs/<rest>
docs/v0-plan.md               -> docs/legacy/v0/plan.md
docs/v1-roadmap.md            -> docs/legacy/v1/roadmap.md
```

Stop on a missing source, an existing conflicting destination, a path outside the repository, or any manifest mismatch. Do not move a directory wholesale because `docs/v1` contains an ignored protected file.

- [ ] **Step 3: Normalize tracked path references**

Apply these replacements to tracked text files outside `docs/legacy/**`, longest and most specific key first:

```text
docs/agent-index/  -> docs/legacy/v0/agent-index/
docs/superpowers/  -> docs/legacy/governance/
docs/refactor/     -> docs/legacy/refactor/
docs/v0-plan.md    -> docs/legacy/v0/plan.md
docs/v1-roadmap.md -> docs/legacy/v1/roadmap.md
docs/v0/           -> docs/legacy/v0/
docs/v1/           -> docs/legacy/v1/
docs/v2/           -> docs/legacy/v2/
```

Inside `docs/legacy/**`, preserve historical path literals and every JSON file byte-for-byte. Repair only Markdown link destinations affected by the additional `legacy/` depth and top-level notices that present a path as the current repository location. This keeps historical meaning intact while making current navigation resolve to the archive.

- [ ] **Step 4: Prove the structural boundary**

Run:

```powershell
$oldTracked = @(git ls-files -- docs/v0 docs/agent-index docs/v1 docs/v2 docs/refactor docs/superpowers docs/v0-plan.md docs/v1-roadmap.md)
if ($oldTracked.Count -ne 0) { throw "Old tracked roots remain: $($oldTracked -join ', ')" }

$allowedDocsRoots = @('docs/README.md', 'docs/architecture/', 'docs/legacy/')
$unexpected = @(git ls-files -- docs | Where-Object {
  $path = $_
  -not ($allowedDocsRoots | Where-Object { $path -eq $_ -or $path.StartsWith($_) })
})
if ($unexpected.Count -ne 0) { throw "Unexpected docs paths: $($unexpected -join ', ')" }
```

Expected: zero old tracked roots and zero tracked docs outside the router, current architecture, and legacy namespace.

- [ ] **Step 5: Prove preservation and link integrity**

Verify:

- `docs/legacy/v1/status.json` SHA-256 is exactly `B8EB24D247E29FC8E2C54A4ACC8800CCCFFA1F23762B1A05EB5CB9D7C0FCD992`.
- All moved JSON files have the same blob bytes as their pre-move source at `bd7c051`.
- Every local Markdown link in every tracked Markdown file resolves.
- Outside `docs/legacy/**`, no tracked text contains `docs/v0/`, `docs/v1/`, `docs/v2/`, `docs/refactor/`, `docs/superpowers/`, `docs/agent-index/`, `docs/v0-plan.md`, or `docs/v1-roadmap.md`.
- `.planning/PROJECT.md`, `.planning/ROADMAP.md`, `.planning/STATE.md`, all 32 seeds, and every native milestone artifact resolve historical provenance only through `docs/legacy/**`.
- `git diff --check` passes.
- `git diff --name-only origin/main...HEAD` plus the working tree contains zero `src/**`, `tests/**`, or lockfile changes, and package dependency fields still equal `origin/main`.

- [ ] **Step 6: Hand the exact working-tree result to the root agent**

Do not stage or commit. Report the move count, changed-reference count, link-audit totals, protected-file status, JSON preservation result, remaining `git status --short`, and any concern. The root agent performs strict diff review, exact staging, the one final full-hook commit, independent review, PR update, CI, and `@codex` review.
