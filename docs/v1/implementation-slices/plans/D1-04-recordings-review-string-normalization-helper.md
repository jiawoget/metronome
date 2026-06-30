# D1-04 Recordings-Review String Normalization Helper Plan

## Purpose

This is the reviewed implementation plan for D1-04 in
`pack-d-codebase-slimming-follow-up`. It does not authorize coding until the
full plan is reviewed in the web ChatGPT `metronome` project and returns PASS,
or required changes are applied and re-reviewed.

D1-04 targets one narrow source-code duplication pattern: the identical
`unknown -> trimmed non-empty string | null` helper repeated inside
`src/lib/recordings-review/*`.

## Baseline

- Branch: `codex/d1-04-normalization-plan`
- Baseline branch: `main`
- Baseline commit: `d91f1d00` (`Merge pull request #20 from jiawoget/codex/d1-03-practice-snapshot-plan`)
- Previous slice: `D1-03 e2e-practice-snapshot-reader-helper` is verified.
- Pack status: `pack-d-codebase-slimming-follow-up` is in progress.
- D1-04 status before this plan: `not_started`
- D1-04 status after this plan: `planning_in_progress`

## Local Inventory

### Identical Helper Bodies In Scope

The following four helpers are semantically identical:

```ts
function normalizeRequiredString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized.length > 0 ? normalized : null;
}
```

Locations:

- `src/lib/recordings-review/recording-organization-metadata.ts`
  - Used for persisted recording organization IDs and timestamps.
  - Current helper line: `246`
- `src/lib/recordings-review/waveform-comparison-sources.ts`
  - Used to reject sheet recordings with missing or blank `sheetId` before
    waveform comparison source loading.
  - Current helper line: `298`
- `src/lib/recordings-review/take-groups.ts`
  - Used for take group sheet IDs and segment IDs.
  - Current helper line: `210`
- `src/lib/recordings-review/take-selection-metadata.ts`
  - Used for persisted take selection group IDs, sheet IDs, and timestamps.
  - Current helper line: `232`

### Similar Names Explicitly Out Of Scope

- `src/infrastructure/db/recording-artifact-repository.ts`
  - `normalizeRequiredString(value: string, label: string)` throws labeled
    validation errors for required artifact fields.
  - It is not semantically equivalent to the recordings-review null-returning
    helper and must not be merged in this slice.
- `src/lib/recordings-review/take-groups.ts`
  - `normalizeOptionalDisplayString(value: unknown)` currently has the same
    implementation shape, but it represents display metadata, not required
    identifier normalization. Do not merge it in D1-04.
- `src/lib/recordings-review/take-selection-metadata.ts`
  - `normalizeOptionalString(value: unknown)` has optional/nullish semantics
    and may continue to wrap the required helper locally after import.
- `src/lib/recordings-review/recording-organization-metadata.ts`
  - `normalizeRecordingTag(...)` and write-time tag normalization enforce tag
    rules such as comma/control-character/length limits. Do not touch them.

## Proposed Implementation

Allowed production edits:

- Add one tiny recordings-review-local helper module, likely
  `src/lib/recordings-review/string-normalization.ts`, exporting:
  - `normalizeRequiredString(value: unknown): string | null`
- Replace the four local duplicate helper definitions with imports from that
  helper.
- Keep the helper inside `src/lib/recordings-review/` so it remains scoped to
  the feature boundary.

Allowed status/docs edits:

- This plan file.
- `docs/v1/status.json` D1-04 status tracking.
- PR body/checklist text.

Implementation constraints:

- Delete the four local helper bodies instead of keeping wrappers.
- Do not change call sites beyond the import and local helper removal needed
  for TypeScript.
- Do not change assertion text, fixture shape, persistence keys, or storage
  contracts.
- Do not create a generic validation library, database adapter, or cross-module
  utility.
- Do not include formatting-only churn or unrelated import sorting.
- If actual implementation accounting shows no net source-code reduction and no
  clearer ownership win, stop and close D1-04 as no-go instead of forcing a PR.

Expected production LOC impact:

- Add one small helper module: approximately 9-12 LOC.
- Add four imports: approximately 4 LOC.
- Delete four duplicate helper bodies: approximately 28 LOC.
- Expected net production LOC: approximately -12 to -15 LOC.

## Tests And Coverage

Targeted existing coverage:

- `tests/unit/recordings-review-take-groups.test.ts`
  - Covers take grouping for sheet/segment IDs, missing/empty/malformed segment
    metadata, no-segment buckets, and repository snapshots through the grouping
    boundary.
- `tests/unit/recordings-review-waveform-comparison-sources.test.ts`
  - Covers waveform source availability, sheet/no-segment grouping, deleted
    recordings, artifact readiness, and source loading boundaries.
- `tests/unit/recordings-review-repository.test.ts`
  - Covers persisted take selection normalization, recording organization
    metadata normalization, tag/favorite/archive persistence, cleanup on delete,
    and metadata preservation across sheet snapshot writes.

No new tests are planned because this slice is pure helper deduplication with
unchanged behavior and existing focused coverage for every touched behavior
path. If implementation needs behavior edits, that is scope creep and should
return to planning.

## Verification Commands

Run before PR review after implementation:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- recordings-review-take-groups.test.ts recordings-review-waveform-comparison-sources.test.ts recordings-review-repository.test.ts
& .\scripts\npm-local.ps1 --% run test:unit
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint
git diff --check
```

Full E2E is not mandatory for D1-04 because the D1-03 checkpoint already ran
full E2E and manual Chrome/local-app smoke, and the Pack D rule requires the
next full E2E checkpoint after D1-06. If any implementation accidentally
touches UI, E2E fixtures, storage contracts, or routing, D1-04 must run the
relevant targeted E2E tests or be re-scoped.

## PR Review Evidence Required

The PR description must include:

- Implementation files changed.
- Docs/status files changed.
- Helper bodies removed: expected 4.
- Shared helper added: expected 1 recordings-review-local helper.
- Assertions touched: expected no.
- Net production LOC excluding docs/status.
- Verification command results.
- Explicit note that `src/infrastructure/db/recording-artifact-repository.ts`
  was not touched.
- Explicit note that out-of-scope helpers intentionally remain unchanged:
  `normalizeOptionalDisplayString`, `normalizeOptionalString` nullish behavior,
  and `normalizeRecordingTag` / write-time tag normalization.

## Acceptance Criteria

- Web ChatGPT plan review returns PASS, or required changes are applied and
  re-reviewed before coding.
- The implementation only consolidates the four identical recordings-review
  null-returning helpers.
- Artifact repository validation remains unchanged.
- Optional/display/tag normalization remains unchanged except that
  `normalizeOptionalString` may call the imported required-string helper.
- Local targeted unit, full unit, typecheck, lint, and `git diff --check` pass.
- Web ChatGPT PR review returns PASS or PASS_WITH_NITS with no blockers.
- GitHub CI is green before merge.

## Review Questions For Web ChatGPT

1. Is this D1-04 scope narrow enough to count as real slimming rather than
   abstraction churn?
2. Is it correct to exclude the DB artifact repository helper even though it
   has the same name?
3. Should `normalizeOptionalDisplayString` stay local despite having the same
   current body, because its display-metadata semantics differ?
4. Are the listed unit tests sufficient for this helper-only source change?
5. Should any implementation no-go condition be stronger before coding starts?
