---
phase: 01-repository-formatting-baseline
plan: 01
subsystem: tooling
tags: [prettier, formatting, line-endings, ci, git-hooks]
requires: []
provides:
  - Root LF and Prettier policy with lifecycle, quarantine, generated-output, and binary exclusions
  - Independently revertible 341-file formatter-only baseline commit at a verified fixed point
  - Fast local hook and Ubuntu CI formatting enforcement using the retained repository-local runtime route
affects: [repository-tooling, contributor-workflow, ci]
tech-stack:
  added: []
  patterns:
    - Exact retained Prettier 3.9.5 and Tailwind plugin 0.8.0 pins
    - Structural exclusion of all .planning lifecycle files from formatter traversal
    - Frozen-revision verification before native phase verification
key-files:
  created:
    - .gitattributes
    - .prettierignore
  modified:
    - prettier.config.mjs
    - package.json
    - package-lock.json
    - .github/workflows/ci.yml
    - src/**
    - tests/**
    - scripts/**
    - docs/**
key-decisions:
  - Retained the existing exact formatter artifacts and repository-local npm fallback without package acquisition or PATH mutation.
  - Kept every .planning lifecycle byte outside formatter traversal, including the nested deprecated quarantine.
  - Allowed next-env.d.ts to inherit root LF normalization so a successful build cannot dirty the frozen candidate.
patterns-established:
  - Canonical formatting is npm run format followed by npm run format:check at a real fixed point.
  - The mechanical baseline remains a standalone commit containing formatter output only.
requirements-completed:
  - POLICY-01
  - TOOL-01
  - TOOL-02
  - EVID-01
  - BASE-01
  - BASE-02
  - BASE-03
  - WIN-01
  - WIN-02
  - ENF-01
  - ENF-02
  - QUAL-01
  - HIST-01
  - DELIV-01
coverage:
  requirements: 14/14
  tasks: 3/3
duration: 16 min
completed: 2026-07-31
status: complete
---

# Phase 1 Plan 01: Repository Formatting Baseline Summary

Exact pinned Prettier enforcement, a 341-file formatter-only fixed-point baseline, and a clean frozen revision that passes the complete non-browser quality sequence on Windows.

## Performance

- **Duration:** 16 min
- **Started:** 2026-07-31T15:26:36Z
- **Completed:** 2026-07-31T15:42:07Z
- **Tasks:** 3
- **Implementation files changed:** 347

## Accomplishments

- Established one root LF and Prettier policy while structurally excluding all `.planning/**` lifecycle content, the nested deprecated quarantine, generated outputs, dependencies, caches, and binary assets.
- Retained exact Prettier `3.9.5` and Tailwind plugin `0.8.0` artifacts, exposed only the canonical `format` and `format:check` scripts, and performed no install, update, package acquisition, or PATH mutation.
- Captured the formatter baseline in an independently revertible 341-file commit and proved a real fixed point before freezing the candidate.
- Preserved the executable tracked fast hook and added Ubuntu CI formatting enforcement before lint, typecheck, unit tests, and build.
- Verified the replacement frozen revision `99b4965d93387c7ae2305779c73a27503655c588` through the complete required non-browser sequence.

## Task Commits

Each task was committed atomically:

1. **Task 1: Establish the root formatting and LF policy** - `a1e25654` (`chore`)
2. **Task 2: Apply and freeze the formatter-only repository baseline** - `4c776dd0` (`style`)
3. **Task 3: Verify and repair the frozen cross-platform candidate** - `99b4965d` (`fix`)

## Verification Evidence

| Check | Result |
| --- | --- |
| Repository runtime route | PASS - Node 24.17.0 and npm 11.17.0 through `scripts/npm-local.ps1` |
| `npm run format:check` | PASS |
| Canonical `npm run format` fixed point | PASS - no allowed tracked diff |
| Lint | PASS |
| Typecheck | PASS |
| Unit suite | PASS - 66 files and 845 tests |
| Production build | PASS - Next.js 16.2.9 completed all routes |
| Mechanical commit isolation | PASS - exactly 341 paths and no policy or tooling files |
| Mechanical commit reverse-apply check | PASS |
| Generated-file normalization repair reverse-apply check | PASS |
| Tracked hook | PASS - executable mode retained and `core.hooksPath=.githooks` |
| CI ordering | PASS - format check precedes the existing quality gates |
| Frozen implementation worktree | PASS - clean outside expected lifecycle metadata |

## Files Created/Modified

- `.gitattributes` - Defines repository LF/text classification and protects generated or binary paths while allowing `next-env.d.ts` to normalize to LF.
- `.prettierignore` - Excludes lifecycle, quarantine, dependency, generated, cache, output, and binary paths from formatter traversal.
- `prettier.config.mjs` - Keeps the Tailwind stylesheet integration and enforces LF output.
- `package.json` - Defines the two canonical formatting commands with exact formatter pins.
- `package-lock.json` - Keeps root formatter specifiers and retained resolved artifacts aligned.
- `.github/workflows/ci.yml` - Runs formatting verification before existing Ubuntu CI gates.
- 341 allowed tracked text files - Mechanical formatter output only in commit `4c776dd0`.

## Decisions Made

- Used the repository-local npm fallback because direct `node` and `npm` were not on PATH; no machine-wide environment was changed.
- Preserved the single existing formatter owner and its exact installed versions rather than acquiring or replacing tooling.
- Kept `.planning/**` outside every formatter and repository-wide normalization command; no quarantined content was read, indexed, transformed, or cited.
- Treated the generated Next environment declaration as normalizable text so the production build remains clean on Windows.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed generated Next environment line-ending drift**

- **Found during:** Task 3 frozen-candidate verification
- **Issue:** The initial `.gitattributes` policy marked `next-env.d.ts` as `-text`, so a successful Windows build rewrote its LF bytes as CRLF and dirtied the frozen candidate.
- **Fix:** Removed the explicit `-text` exception so the generated declaration inherits root `text=auto eol=lf` normalization, then reran the entire replacement-candidate sequence.
- **Files modified:** `.gitattributes`
- **Commit:** `99b4965d`

## Issues Encountered

- The first canonical formatting pass exposed one additional formatter reflow on the second pass. The file was staged as formatter output, a third pass was clean, and the fixed point was verified before commit.
- Capturing a Git patch in a PowerShell string changed line endings and made the first reverse-apply invocation fail. Repeating the same proof through Git's raw native pipe preserved patch bytes and passed; no repository file required a change for this verification-only issue.
- The initial build revealed the generated `next-env.d.ts` line-ending bug described above. The scoped policy repair was committed separately and every final gate was rerun against the replacement frozen revision.

## Authentication Gates

None.

## User Setup Required

None - no external service or manual setup is required.

## Known Stubs

None introduced. The mechanical baseline changed formatting only and preserved existing behavior and content.

## Threat Flags

None. This tooling-only plan introduced no network endpoint, authentication path, file-access trust boundary, or schema change.

## Next Phase Readiness

- The implementation is ready for native phase verification against the frozen revision and its committed evidence.
- Shipping, pull-request merge, synchronized `main`, and any fresh product or R01 work remain outside this plan and are not claimed here.

## Self-Check: PASSED

- Required policy files and this summary exist.
- Task commits `a1e25654`, `4c776dd0`, and `99b4965d` exist in repository history.
- All 14 plan requirements are represented in `requirements-completed`.
