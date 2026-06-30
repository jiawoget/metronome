# D1-06 Deferred No-Go Validation And Closeout

## Status

- Workstream: `pack-d-codebase-slimming-follow-up`
- Slice: `D1-06 deferred-no-go-validation-and-closeout`
- Baseline branch: `main`
- Baseline commit: `97621be9 Merge pull request #22 from jiawoget/codex/d1-05-unit-fixture-audit-plan`
- Local status at plan creation: clean `main...origin/main`, then branch `codex/d1-06-closeout-plan`
- Web ChatGPT plan review:
  - First review: `PASS_WITH_CHANGES`
  - Required fixes: add reproducible evidence, align every decision to the
    D1-main deferred source list, strengthen each deferred decision with a
    technical invariant and breakage risk, and gate status updates on external
    plan review `PASS`.
  - Second review: `PASS`

## Goal

Close Pack D deliberately by validating the deferred no-go candidates from
`D1-main-codebase-slimming-follow-up-plan.md` instead of allowing them to return
as vague "more slimming" work.

This slice should not delete or rewrite production/test code unless the plan
review finds a concrete, net-negative, behavior-safe deletion. The expected
implementation is docs/status-only closeout.

## Deferred Candidate Source Alignment

The source of truth for D1-06 is the D1-main plan section `D1-06 Deferred No-Go
Validation And Closeout` plus the D1-main `Explicit No-Go List`.

Source candidate list from D1-main:

- Large React components:
  - `SheetPracticeControls`
  - `PracticeSegmentSelectorPanel`
  - `ReferencePanel`
  - `SheetLibraryExperience`
  - `RecordingsReviewExperience`
- Shared Dexie `getDatabase()` abstraction
- DB artifact repository `normalizeRequiredString` merge
- docs/v0 or historical plan deletion
- `package-lock.json` slimming

Source explicit no-go list from D1-main:

- Large component splitting when it only moves code between files.
- Shared Dexie `getDatabase()` adapter across typed repositories.
- Merging the DB artifact repository's throwing validator with recordings-review
  null-returning normalization.
- Package-lock line-count slimming.
- Deleting docs/v0 or old plan files solely because docs dominate line count.
- Any fixture helper that hides missing-artifact, unsupported-MIME,
  decode-failed, corruption, ownership, cleanup, or rollback evidence.

Mapping:

| D1-main deferred item | D1-06 validation section | Decision for this slice | Primary evidence |
| --- | --- | --- | --- |
| Large React components | Large React Components | Not in scope for D1-06 implementation | component LOC/top-level scan and local stateful feature-hub ownership |
| Shared Dexie `getDatabase()` abstraction | Shared Dexie `getDatabase()` | Not in scope for D1-06 implementation | seven repository-local Dexie classes with distinct schemas/versioning |
| DB artifact repository `normalizeRequiredString` merge | DB Artifact `normalizeRequiredString` | Not in scope for D1-06 implementation | throwing persistence validator vs null-returning UI/domain normalizer |
| docs/v0 or historical plan deletion | `docs/v0` Or Historical Plan Deletion | Not in scope for D1-06 implementation | `docs/v0` still referenced by v1 docs and agent-index |
| `package-lock.json` slimming | `package-lock.json` | Not in scope for D1-06 implementation | generated lockfile, not source code |
| Broad fixture helper consolidation | Broad Fixture Helper Consolidation | Not in scope for D1-06 implementation | D1-05 audit preserved behavior-specific evidence |

## Reproducible Scan Commands

These commands were used to produce the evidence below:

```powershell
rg -n "D1-06|D1-05|pack-d|codebase-slimming" docs/v1/status.json docs/v1/implementation-slices/plans/D1-main-codebase-slimming-follow-up-plan.md
rg --files src | rg "sheet-practice-controls|practice-segment-selector|reference-panel|sheet-library-experience|recordings-review-experience"

$paths = @(
  'src\components\sheet-practice\controls\sheet-practice-controls.tsx',
  'src\components\sheet-practice\segments\practice-segment-selector-panel.tsx',
  'src\components\sheet-practice\reference\reference-panel.tsx',
  'src\components\sheet-library\sheet-library-experience.tsx',
  'src\components\recordings-review\recordings-review-experience.tsx'
)
foreach ($p in $paths) {
  $lines = (Get-Content $p | Measure-Object -Line).Lines
  $funcs = (rg -n "^(export\s+)?(function|const)\s+[A-Za-z0-9_]+|^function\s+[A-Za-z0-9_]+" $p | Measure-Object).Count
  [PSCustomObject]@{Path=$p; Lines=$lines; TopLevelMatches=$funcs}
}

rg -n "^class .*Dexie|^function getDatabase|new Dexie|\.version\(|stores\(" src/infrastructure src/lib
rg -n "function normalizeRequiredString|export function normalizeRequiredString|normalizeRequiredString\(" src/infrastructure/db/recording-artifact-repository.ts src/lib/recordings-review/string-normalization.ts
rg -n "docs/v0|v0/|v0\\" README.md docs .github scripts src tests -g "!docs/v0/**"
Get-ChildItem docs\v0 -Recurse -File -ErrorAction SilentlyContinue | Measure-Object
Get-Item package-lock.json | Select-Object Name,Length,LastWriteTime
```

## Local Scan Evidence

### Large React Components

The named components are large, but the local scan shows they are feature hubs
with local state, event handlers, and view composition. A split would mostly
move code between files unless a separate design identifies real duplicated
logic or dead behavior.

| Candidate | File | Current size | Top-level matches | D1-06 decision |
| --- | --- | ---: | ---: | --- |
| `SheetPracticeControls` | `src/components/sheet-practice/controls/sheet-practice-controls.tsx` | 842 lines | 5 | Not in scope for D1-06 implementation |
| `PracticeSegmentSelectorPanel` | `src/components/sheet-practice/segments/practice-segment-selector-panel.tsx` | 903 lines | 16 | Not in scope for D1-06 implementation |
| `ReferencePanel` | `src/components/sheet-practice/reference/reference-panel.tsx` | 647 lines | 5 | Not in scope for D1-06 implementation |
| `SheetLibraryExperience` | `src/components/sheet-library/sheet-library-experience.tsx` | 616 lines | 4 | Not in scope for D1-06 implementation |
| `RecordingsReviewExperience` | `src/components/recordings-review/recordings-review-experience.tsx` | 1492 lines | 15 | Not in scope for D1-06 implementation |

Technical invariant:

- These files are user-facing feature containers that combine local UI state,
  event handlers, persistence/service calls, and route-level composition.
- A pure split does not remove behavior or reduce maintenance surface; it only
  relocates code and increases cross-file coordination.

What would break or regress if treated as a D1-06 deletion target:

- UI workflows could lose route/container state coupling.
- Tests would need to be rewritten around new component boundaries without any
  product behavior deletion.
- The PR would create formatting/refactor churn while claiming slimming.

Allowed future work:

- A separate reviewed UI refactor may split one component if it proves reduced
  duplicated behavior, clearer ownership, and no net test weakening.
- This Pack D closeout must not count component splitting as slimming when the
  code is only relocated.

### Shared Dexie `getDatabase()`

Local scan found separate Dexie database wrappers in:

- `src/infrastructure/reference/reference-repository.ts`
- `src/infrastructure/files/sheet-library-repository.ts`
- `src/infrastructure/db/browser-practice-segment-service.ts`
- `src/infrastructure/db/browser-measure-grid-service.ts`
- `src/infrastructure/db/browser-settings-service.ts`
- `src/infrastructure/db/practice-session-repository.ts`
- `src/infrastructure/db/recording-artifact-repository.ts`

These wrappers share a lazy `getDatabase()` shape, but their schema classes,
store names, version histories, availability checks, and reset semantics differ.
The current duplication is intentional typed repository boundary code. A shared
adapter would add generic indirection and raise schema/lifecycle coupling risk.

D1-06 decision: not in scope for D1-06 implementation.

Technical invariant:

- Each repository owns its Dexie schema class, store names, version history, and
  browser availability/reset behavior.
- The local scan found versioned DB classes in files such as
  `browser-practice-segment-service.ts` and `practice-session-repository.ts`,
  while simpler stores such as settings, reference, sheet-library, measure-grid,
  and recording-artifact storage each define their own store contract.

What would break or regress if merged here:

- A generic adapter would couple migrations and availability checks across
  unrelated repositories.
- Repository tests would need to validate adapter behavior in addition to the
  actual persistence contract.
- The change is likely net-positive code or indirection, not real deletion.

Allowed future work:

- Only revisit if a later DB-boundary plan proves net deletion across multiple
  repositories without weakening typed schema ownership or migration behavior.

### DB Artifact `normalizeRequiredString`

Local scan found two helpers with the same name but different contracts:

- `src/infrastructure/db/recording-artifact-repository.ts`
  - accepts `string`
  - trims
  - throws a label-specific error when empty
  - is part of persistence validation
- `src/lib/recordings-review/string-normalization.ts`
  - accepts `unknown`
  - returns `string | null`
  - is used by recordings-review organization/grouping UI/domain helpers

D1-06 decision: not in scope for D1-06 implementation.

Merging them would either weaken repository validation or make
recordings-review callers catch persistence-style exceptions. The previous D1-04
normalization cleanup already handled the safe null-returning recordings-review
duplication; this remaining helper is intentionally different.

Technical invariant:

- The DB artifact helper is a throwing persistence validator for required
  `LocalRecordingArtifact` fields.
- The recordings-review helper is a null-returning normalizer for optional or
  unknown UI/domain metadata.

What would break or regress if merged here:

- Persistence could silently accept invalid required artifact fields.
- UI/domain code could start throwing where it currently treats invalid metadata
  as absent.
- D1-04 already removed the safe same-contract duplication, so this remaining
  same-name helper is not same-behavior duplication.

### `docs/v0` Or Historical Plan Deletion

`docs/v0` currently contains 22 files. It is still referenced by:

- `docs/v1/START-HERE.md`
- `docs/v1/agent-implementation-rules.md`
- `docs/v1/05f-practice-segments.md`
- `docs/v1/remaining-feature-contracts.md`
- `docs/v1/implementation-slices/README.md`
- multiple `docs/v1/implementation-slices/plans/*.md`
- `docs/agent-index/*.md`

D1-06 decision: not in scope for D1-06 implementation.

Deleting old docs because they dominate line count would be fake slimming unless
a separate docs archival plan proves the references are obsolete and updates the
workflow contract. This slice must not delete historical context as a codebase
slimming substitute.

Technical invariant:

- v1 planning and agent routing docs still name `docs/v0` as active historical
  contracts for project structure, tech-stack decisions, and UI style.
- `docs/agent-index/*.md` still maps module specs back to `docs/v0/*.md`.

What would break or regress if deleted here:

- Future v1 slice agents would lose referenced architecture/design contracts.
- Agent-index links would become stale.
- The deletion would reduce repository line count without reducing product code
  or executable maintenance surface.

### `package-lock.json`

`package-lock.json` is a generated dependency lockfile and is currently about
324 KB. Manual line-count slimming would be dependency churn, not source
simplification.

D1-06 decision: not in scope for D1-06 implementation.

Technical invariant:

- The lockfile records the resolved dependency graph for deterministic installs.
- It is not an authored source module and should track dependency changes, not
  slimming goals.

What would break or regress if changed here:

- Dependency resolution could churn without a reviewed dependency intent.
- CI/local install reproducibility could change while the PR claims codebase
  slimming.

Allowed future work:

- Only change the lockfile as a consequence of an intentional dependency change
  reviewed on its own merits.

### Broad Fixture Helper Consolidation

D1-05 already audited the remaining unit fixture opportunities and found that
the residual duplication preserves important behavior evidence: missing
artifacts, unsupported MIME handling, decode failures, corruption, ownership,
cleanup, rollback, and legacy `audioDataUrl` guardrails.

D1-06 decision: not in scope for D1-06 implementation.

Technical invariant:

- Fixture duplication that remains after D1-05 is tied to distinct behavioral
  evidence: missing artifact bodies, unsupported MIME, decode failures,
  corruption, ownership, cleanup, rollback, and legacy `audioDataUrl`
  guardrails.

What would break or regress if collapsed broadly:

- Tests could stop documenting the exact storage/artifact failure contract they
  are meant to protect.
- Helper abstraction could hide important seed differences, causing false
  confidence around artifact-backed recordings.

Allowed future work:

- Narrow fixture helpers are allowed only when they do not hide the behavioral
  evidence above and produce real net deletion.

## Proposed Implementation After Plan Review PASS

1. Keep production code unchanged.
2. Keep tests unchanged.
3. Update this plan with the web ChatGPT plan verdict.
4. Update `docs/v1/status.json`:
   - `D1-06 deferred-no-go-validation-and-closeout`: `verified`
   - `pack-d-codebase-slimming-follow-up`: `verified`
5. Do not delete `docs/v0`, historical plans, `package-lock.json`, or component
   files in this slice.

Execution guard:

- The `status.json` verified updates are allowed only after external web ChatGPT
  plan review returns `PASS`.
- If the second plan review returns `PASS_WITH_CHANGES` or `BLOCKED`, apply the
  requested plan changes and re-review before any closeout implementation.

## Verification

Run the full closeout verification required by the main Pack D plan:

```powershell
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint
& .\scripts\npm-local.ps1 --% run test:unit
& .\scripts\npm-local.ps1 --% run test:e2e
git diff --check
```

Also run a final Chrome/local-app smoke before marking the workstream complete:

1. Start the local app with the repo-local npm wrapper.
2. Open the app in Chrome.
3. Confirm the app shell renders.
4. Visit the sheet library surface and confirm it renders without route/runtime
   failure.
5. Visit the recordings review surface and confirm it renders without
   route/runtime failure.
6. Visit the quick metronome surface and confirm the primary controls render.

## PR Review Gate

After local verification passes:

1. Open a draft PR.
2. Send the PR URL, branch, head SHA, diffstat, changed-file summary, and local
   verification evidence to web ChatGPT in the metronome project.
3. Address any `CHANGES_REQUIRED` feedback.
4. Mark ready only after web ChatGPT returns `PASS` or `PASS_WITH_NITS` with no
   blockers and GitHub CI is green.
5. Merge and return local `main` to a clean `main...origin/main` state.

## Exit Criteria

- Web ChatGPT plan review is `PASS`, or required changes are applied and
  re-reviewed to `PASS`.
- No production/test code is changed unless separately justified by the review.
- Full typecheck, lint, unit, and E2E verification pass.
- Manual Chrome/local-app smoke passes.
- Web ChatGPT PR review returns no blockers.
- CI is green.
- PR is merged.
- Local workspace is back on clean `main...origin/main`.
