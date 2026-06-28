# C2-07 Unit Recording Fixture Slimming Plan

## Status

- Workstream: `pack-c-codebase-slimming`
- Slice: `C2-07 test-fixture-slimming`
- Current lifecycle state: `verified`
- Parent plan: `docs/v1/implementation-slices/plans/C2-main-codebase-slimming-plan.md`
- Baseline branch: `main`
- Baseline commit: `2fce4124c791bcf47ab46d09641c6885330eb2c4`
- Previous slice: `C2-06 save-rollback-leaf-helpers` is `verified` and merged.
- Plan review: `PASS_WITH_CHANGES`, then `PASS` after locking the file scope
  and adding the fixture semantic preservation checklist.
- This plan intentionally covers the first, narrow C2-07 PR: unit recording
  factories only. E2E fixture slimming is left for a follow-up PR after this
  one is reviewed and merged.
- `verified` here means this narrow first fixture PR was merged and checked. It
  does not mean the whole Phase 7 test-slimming work is complete.
- Remaining Phase 7 work is tracked separately:
  - `C2-08 large-unit-fixture-follow-up`
  - `C2-09 e2e-fixture-and-spec-slimming`

## Problem

Several `recordings-review-*` unit tests each define their own copy of the
same recording fixture mechanics:

- quick review recording defaults;
- sheet review recording defaults;
- sheet segment context defaults;
- artifact ref attachment unless the test explicitly overrides `artifactRef`;
- small artifact body or local artifact record builders.

The duplicated setup makes behavior tests longer and easier to drift. The
current copies are concentrated in:

- `tests/unit/recordings-review-audio-export.test.ts`
- `tests/unit/recordings-review-waveform-comparison-sources.test.ts`
- `tests/unit/recordings-review-take-groups.test.ts`
- `tests/unit/recordings-review-take-history-summary.test.ts`

There is also similar setup in larger tests such as
`tests/unit/recordings-review-experience.test.tsx`,
`tests/unit/recordings-review-history.test.ts`, and E2E files. Those larger
files are explicitly deferred to follow-up PRs.

## Goal

Create one shared unit test factory module for recording-review fixtures and
replace local duplicate builders in the narrow target files.

This must be real slimming:

- remove repeated fixture construction branches;
- preserve all behavior assertions;
- avoid line wrapping, whitespace-only edits, import churn, or other cosmetic
  diffs that merely reduce apparent line count.

## Scope

1. Add `tests/unit/factories/recordings-review.ts`.
   - Export a shared segment-context builder.
   - Export shared quick and sheet `ReviewRecording` builders.
   - Preserve the current local behavior where `artifactRef` is auto-attached
     by default but `artifactRef: null` or another explicit override is honored.
   - Support partial `settings` overrides without requiring every caller to
     re-spread default settings.
   - Support `segmentContext` overrides, including `null` and deliberately
     malformed/unknown segment contexts used by grouping tests.
   - Export small artifact helpers only if they replace repeated local artifact
     construction in at least two target files.

2. Refactor the narrow target files:
   - `tests/unit/recordings-review-audio-export.test.ts`
   - `tests/unit/recordings-review-waveform-comparison-sources.test.ts`
   - `tests/unit/recordings-review-take-groups.test.ts`
   - `tests/unit/recordings-review-take-history-summary.test.ts`

3. Keep per-test semantic defaults stable.
   - If a file currently depends on `audio/webm`, `audio/wav`, a specific
     `audioDataUrl`, or an ISO timestamp shape, preserve that value through
     overrides rather than silently changing fixture semantics.
   - Do not broaden test expectations to accommodate the helper.

4. Lock this PR to the four named target unit test files.
   - `tests/unit/recordings-review-experience.test.tsx` is deferred.
   - `tests/unit/recordings-review-history.test.ts` is deferred.
   - If implementation discovers another tiny adoption opportunity, stop and
     update this plan before touching that file.

## Fixture Semantic Preservation Checklist

Before editing each target file, inventory the local builder defaults and keep
the same semantics after migration:

- quick recording default fields:
  - `id`
  - `type`
  - `name`
  - `sessionId`
  - `sheetId`
  - `createdAt`
  - `durationMs`
  - `sizeBytes`
  - `mimeType`
  - `audioDataUrl`
  - `settings`
  - `artifactRef`
- sheet recording default fields:
  - `id`
  - `type`
  - `name`
  - `sessionId`
  - `sheetId`
  - `sheetName`
  - `createdAt`
  - `durationMs`
  - `sizeBytes`
  - `mimeType`
  - `audioDataUrl`
  - `settings`
  - `segmentContext`
  - `artifactRef`
- `settings` default values and partial override behavior.
- `segmentContext` default values.
- `segmentContext: null` cases.
- deliberately malformed or unknown `segmentContext` cases.
- artifact-ref auto-attachment behavior.
- explicit `artifactRef: null` must remain `null`.
- explicit non-null `artifactRef` overrides must remain unchanged.
- `mimeType`, `audioDataUrl`, timestamp, and id shapes must not be silently
  unified by the shared helper.

The shared helper must use property-presence checks for default artifact refs.
Do not use `??` or another truthiness fallback that would replace
`artifactRef: null` with a generated artifact ref.

## Explicit Non-Scope

- No production code changes.
- No E2E changes in this PR.
- No deletion of behavioral assertions.
- No broad rewrite of `recordings-review-experience.test.tsx`.
- No changes to `tests/unit/recordings-review-experience.test.tsx`.
- No changes to `tests/unit/recordings-review-history.test.ts`.
- No file-wide formatting, line wrapping, or import-only churn as a slimming
  substitute.
- No generic test DSL, builder class, scenario object, or fixture framework.
- No artifact helper for a single caller or speculative future reuse.
- No changes to repository storage keys, artifact schemas, waveform comparison
  logic, export logic, grouping logic, or UI behavior.
- No snapshot update.

## Expected File Changes

Tests:

- `tests/unit/factories/recordings-review.ts`
- `tests/unit/recordings-review-audio-export.test.ts`
- `tests/unit/recordings-review-waveform-comparison-sources.test.ts`
- `tests/unit/recordings-review-take-groups.test.ts`
- `tests/unit/recordings-review-take-history-summary.test.ts`

Workflow:

- `docs/v1/status.json`
- `docs/v1/implementation-slices/plans/C2-07-unit-recording-fixtures.md`

If implementation needs to touch production code, E2E tests, or any non-target
test file, stop and ask before expanding scope. The actual test-file scope for
this PR is fixed to the four target files above.

## Implementation Steps

1. Add the shared factory module under the existing `tests/unit/factories/`
   folder.
2. Move only fixture construction knowledge into the helper:
   - default quick recording fields;
   - default sheet recording fields;
   - default sheet segment context fields;
   - artifact ref auto-attachment;
   - small artifact body/local artifact record builders if reused.
3. Replace local helper functions in the four target files with imports from
   the shared factory.
4. Keep local helpers that are test-specific, such as in-memory repository
   stubs, AudioContext mocks, snapshot/group builders, and expectation helpers.
5. Do not touch assertion blocks. If a touched assertion line appears necessary,
   stop and justify it before proceeding; otherwise revert that part.
6. Run targeted unit tests.
7. Run typecheck, lint, build, and full unit tests before PR.

## Acceptance Criteria

- The four target test files no longer each define duplicate quick/sheet
  recording and segment-context builders.
- All existing assertions in the target files remain present.
- The shared helper is a plain set of factory functions, not a new test
  framework.
- Explicit `artifactRef` overrides still work, including `artifactRef: null`.
- Malformed and `null` segment-context grouping cases remain covered.
- There is a net reduction in duplicated fixture code after accounting for the
  new shared helper.
- No formatting-only slimming is included.
- Assertion blocks are not deleted, broadened, or moved for cosmetic reasons.
- The PR description includes a short before/after accounting:
  - which local helper blocks were removed;
  - which shared helper functions replaced them;
  - whether net reduction remains after adding the factory module.

## Verification

Baseline and targeted unit:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- recordings-review-audio-export.test.ts recordings-review-waveform-comparison-sources.test.ts recordings-review-take-groups.test.ts recordings-review-take-history-summary.test.ts
```

Required before PR:

```powershell
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint
& .\scripts\npm-local.ps1 --% run build
& .\scripts\npm-local.ps1 --% run test:unit
git diff --check
```

If any helper adoption changes expected values instead of only setup location,
revert that part and keep the corresponding local fixture for a later, more
careful PR.
