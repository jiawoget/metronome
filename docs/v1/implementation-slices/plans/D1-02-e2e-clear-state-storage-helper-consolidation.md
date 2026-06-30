# D1-02 E2E Clear-State Storage Helper Consolidation Plan

## Status

- Workstream: `pack-d-codebase-slimming-follow-up`
- Slice: `D1-02 e2e-clear-state-storage-helper-consolidation`
- Current lifecycle state: `verified`
- Parent plan: `docs/v1/implementation-slices/plans/D1-main-codebase-slimming-follow-up-plan.md`
- Baseline branch: `main`
- Baseline commit: `011cf000` (`Merge pull request #18 from jiawoget/codex/pack-d-slimming-plan`)
- Previous slice: `D1-01 e2e-sheet-import-helper-adoption` is `verified`
- Plan review: initial web ChatGPT review `PASS`; first delta review `PASS`; corrected-evidence delta review `PASS`

This plan covers only E2E storage cleanup helper consolidation. Implementation
is authorized only after web ChatGPT review passes.

## Problem

Several E2E specs still own repeated browser storage cleanup mechanics around
Sheet Library setup:

- navigate to a stable page before clearing storage
- clear recording history localStorage
- delete a spec-specific set of IndexedDB databases
- reload
- assert the Sheet Library heading is visible

Most target specs already use shared primitives from
`tests/e2e/fixtures/storage.ts`, but still repeat the local `clearState(...)`
wrapper shape. `tests/e2e/sheet-practice-integration.spec.ts` still owns a
local `deleteDatabase(...)` implementation.

The slice should reduce duplicated cleanup mechanics without changing storage
semantics, reload timing, or the set of databases each spec clears.

## Local Evidence

Existing shared storage fixture:

- `tests/e2e/fixtures/storage.ts#clearDatabases(page, databaseNames)`
- `tests/e2e/fixtures/storage.ts#clearRecordingHistory(page)`
- exported DB names:
  - `SHEET_LIBRARY_DB_NAME`
  - `PRACTICE_SESSION_DB_NAME`
  - `MEASURE_GRID_DB_NAME`
  - `PRACTICE_SEGMENT_DB_NAME`
  - `REFERENCE_DB_NAME`
  - `RECORDING_ARTIFACT_DB_NAME`

Target helper inventory:

| File | Current cleanup behavior | Notes |
| --- | --- | --- |
| `tests/e2e/measure-grid-calibration.spec.ts` | `goto("/sheet-library")`; `clearRecordingHistory`; delete sheet library, practice session, measure grid DBs; reload; assert Sheet Library heading | Already uses fixture primitives; local wrapper is repeated shape. |
| `tests/e2e/practice-segment-selector.spec.ts` | `goto("/sheet-library")`; `clearRecordingHistory`; delete sheet library, practice session, measure grid, practice segment DBs; reload; assert heading | Already uses fixture primitives; local wrapper is repeated shape. |
| `tests/e2e/sheet-segment-recording.spec.ts` | `goto("/sheet-library")`; `clearRecordingHistory`; delete sheet library, practice session, measure grid, practice segment DBs; reload; assert heading | Already uses fixture primitives; local wrapper is repeated shape and used multiple times. |
| `tests/e2e/reference-system.spec.ts` | `goto("/sheet-library")`; `clearRecordingHistory`; delete sheet library, reference, practice session DBs; reload; assert heading | Uses alias `clearDatabaseList`; local wrapper is repeated shape. |
| `tests/e2e/sheet-recording-review.spec.ts` | `goto("/sheet-library")`; `clearRecordingHistory`; delete sheet library and practice session DBs; reload; assert heading | Already uses fixture primitives; local wrapper is repeated shape and used three times. |
| `tests/e2e/sheet-practice-integration.spec.ts` | `goto("/sheet-library")`; remove recording-history key; local `deleteDatabase` for sheet library and practice session DBs; reload; assert heading | Current main matches the common Sheet Library reset shape except it still owns a local `deleteDatabase(...)` helper. |

## Scope

Allowed implementation files:

- `tests/e2e/fixtures/storage.ts`
- `tests/e2e/measure-grid-calibration.spec.ts`
- `tests/e2e/reference-system.spec.ts`
- `tests/e2e/practice-segment-selector.spec.ts`
- `tests/e2e/sheet-segment-recording.spec.ts`
- `tests/e2e/sheet-recording-review.spec.ts`
- `tests/e2e/sheet-practice-integration.spec.ts`

Status/plan files:

- `docs/v1/status.json`
- this plan file
- optionally `docs/v1/implementation-slices/plans/D1-main-codebase-slimming-follow-up-plan.md` if status/progress notes need updating

## Explicit Non-Scope

- No `src/**` changes.
- No `tests/unit/**` changes.
- No `getPracticeSnapshot(...)` changes.
- No sheet import helper changes.
- No recording artifact IndexedDB seeding changes.
- No synthetic microphone changes.
- No assertion deletion, weakening, broadening, or timing relaxation.
- No broad E2E scenario DSL.
- No generic "clear all app state" helper that hides per-spec database ownership.
- Do not add `RECORDING_ARTIFACT_DB_NAME` to any target spec unless it already clears that DB before implementation.

## Proposed Implementation Shape

### Required Sub-scope: Remove Local `deleteDatabase` From Sheet Practice Integration

`tests/e2e/sheet-practice-integration.spec.ts` currently defines a local
`deleteDatabase(...)` helper. Because current main uses the same Sheet Library
reset shape as the other target specs, it may use the shared
`clearSheetLibraryTestState(...)` helper as long as the implementation
preserves its exact DB list and recording-history cleanup behavior.

Preserve:

- `await page.goto("/sheet-library")`
- recording-history key removal semantics
- reload and Sheet Library heading readiness assertion
- the same two DBs:
  - `SHEET_LIBRARY_DB_NAME`
  - `PRACTICE_SESSION_DB_NAME`

This is expected to be a clear net deletion with low risk.

### Conditional Sub-scope: Shared Sheet-Library Reset Helper

Consider adding one small helper to `tests/e2e/fixtures/storage.ts`, for
example:

```ts
export async function clearSheetLibraryTestState(
  page: Page,
  databaseNames: string[]
) {
  await page.goto("/sheet-library");
  await clearRecordingHistory(page);
  await clearDatabases(page, databaseNames);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Sheet Library" })).toBeVisible();
}
```

The exact name may change, but the helper must stay narrow:

- It may centralize only the common Sheet Library reset shape.
- Prefer a narrow name such as `clearSheetLibraryTestState(...)` or
  `resetSheetLibraryStorageForE2E(...)`; avoid names that imply a global app
  reset.
- It must accept explicit database names from each spec.
- It must not choose databases implicitly.
- It must not clear all localStorage.
- It must not touch recording artifacts unless the caller explicitly passes that DB.
- It must not embed assertions beyond the existing Sheet Library heading readiness assertion.
- If this helper imports `expect` from Playwright, the PR description must
  state that it is an E2E fixture readiness assertion, not a production runtime
  dependency or new app dependency.

Adopt this helper only if implementation diff accounting shows real net
deletion or a clearly smaller maintenance surface after adding the helper.
If keeping local one-line wrappers or passing database arrays at call sites
erases the LOC/maintenance benefit, close that portion as no-go and keep only
the required `sheet-practice-integration` deletion.

## Implementation Steps

0. Confirm status/source-of-truth before editing implementation files.
   - `docs/v1/status.json` lists Pack D as `in_progress`.
   - `docs/v1/status.json` lists D1-01 as `verified`.
   - `docs/v1/status.json` lists D1-02 as `implementation_in_progress` before implementation edits.

1. Inventory current cleanup semantics:

```powershell
rg -n "async function clearState|async function deleteDatabase|clearDatabases|clearRecordingHistory|window.localStorage.clear|window.localStorage.removeItem" tests/e2e/measure-grid-calibration.spec.ts tests/e2e/reference-system.spec.ts tests/e2e/practice-segment-selector.spec.ts tests/e2e/sheet-segment-recording.spec.ts tests/e2e/sheet-recording-review.spec.ts tests/e2e/sheet-practice-integration.spec.ts tests/e2e/fixtures/storage.ts
```

2. Run targeted baseline before implementation:

```powershell
& .\scripts\npm-local.ps1 --% run test:e2e -- reference-system.spec.ts measure-grid-calibration.spec.ts practice-segment-selector.spec.ts sheet-segment-recording.spec.ts
& .\scripts\npm-local.ps1 --% run test:e2e -- sheet-recording-review.spec.ts sheet-practice-integration.spec.ts
```

3. Remove local `deleteDatabase(...)` from
   `tests/e2e/sheet-practice-integration.spec.ts`.
   - If the shared helper is adopted, import and use `clearSheetLibraryTestState`.
   - If the shared helper is rejected as no-go, import only the primitive fixture helpers needed to preserve the same shape.
   - Keep route and recording-history cleanup semantics unchanged.
   - Delete only the local helper body and replacement call sites.

4. Decide whether to add the shared Sheet Library reset helper.
   - If added, refactor only target `clearState(...)` wrappers that exactly
     match the common shape.
   - Preserve each database list exactly.
   - Preserve route/reload/heading assertion sequence.
   - `sheet-practice-integration.spec.ts` may use the helper because the
     current implementation matches the common Sheet Library reset shape.
     Preserve its exact DB list: `[SHEET_LIBRARY_DB_NAME,
     PRACTICE_SESSION_DB_NAME]`.

5. Run targeted verification:

```powershell
& .\scripts\npm-local.ps1 --% run test:e2e -- reference-system.spec.ts measure-grid-calibration.spec.ts practice-segment-selector.spec.ts sheet-segment-recording.spec.ts
& .\scripts\npm-local.ps1 --% run test:e2e -- sheet-recording-review.spec.ts sheet-practice-integration.spec.ts
```

6. Run required checks:

```powershell
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint
git diff --check
```

7. Before PR review, report diff accounting:
   - local `deleteDatabase(...)` helper removed: yes/no
   - shared reset helper added: yes/no
   - local `clearState(...)` wrappers removed or retained
   - per-spec database lists unchanged: yes/no
   - recording-history cleanup preserved in `sheet-practice-integration`: yes/no
   - assertions touched: yes/no
   - net implementation LOC excluding docs/status
   - a per-target table with:
     - file
     - before DB list
     - after DB list
     - route before/after
     - localStorage behavior before/after

## Acceptance Criteria

- `sheet-practice-integration.spec.ts` no longer owns a local IndexedDB
  `deleteDatabase(...)` implementation.
- Recording-history cleanup semantics in `sheet-practice-integration.spec.ts`
  remain intact.
- Any shared Sheet Library reset helper is narrow and caller-supplied DB lists
  remain explicit.
- Every target spec clears the same DB names it cleared before implementation.
- The Sheet Library route/reload/heading-readiness behavior is preserved for
  specs that had it before implementation.
- No `getPracticeSnapshot(...)` code changes in this slice.
- No sheet import helper changes in this slice.
- No storage/artifact seeding changes in this slice.
- No production files change.
- No unit tests change.
- No assertions, test names, user flows, or timeout behavior are removed or
  weakened.
- If the optional shared reset helper does not produce real net deletion or a
  clearly smaller maintenance surface, it is not merged.

## Verification

Post-implementation evidence:

- Web ChatGPT corrected-evidence plan delta review: `PASS`.
  - Required changes before implementation: `None`.
  - It confirmed current `sheet-practice-integration.spec.ts` uses the same
    Sheet Library reset shape as the other target specs and may adopt
    `clearSheetLibraryTestState(page, [SHEET_LIBRARY_DB_NAME,
    PRACTICE_SESSION_DB_NAME])`.
- Targeted E2E baseline before implementation:
  - `& .\scripts\npm-local.ps1 --% run test:e2e -- reference-system.spec.ts measure-grid-calibration.spec.ts practice-segment-selector.spec.ts sheet-segment-recording.spec.ts`: `PASS`, 7/7.
  - `& .\scripts\npm-local.ps1 --% run test:e2e -- sheet-recording-review.spec.ts sheet-practice-integration.spec.ts`: `PASS`, 4/4.
- Targeted E2E after implementation:
  - `& .\scripts\npm-local.ps1 --% run test:e2e -- reference-system.spec.ts measure-grid-calibration.spec.ts practice-segment-selector.spec.ts sheet-segment-recording.spec.ts`: `PASS`, 7/7.
  - `& .\scripts\npm-local.ps1 --% run test:e2e -- sheet-recording-review.spec.ts sheet-practice-integration.spec.ts`: `PASS`, 4/4.
- Required checks after implementation:
  - `& .\scripts\npm-local.ps1 --% run typecheck`: `PASS`.
  - `& .\scripts\npm-local.ps1 --% run lint`: `PASS`.
  - `git diff --check`: `PASS`.
- Diff accounting excluding docs/status:
  - shared reset helper added: yes, `clearSheetLibraryTestState(...)`.
  - local `deleteDatabase(...)` removed from `sheet-practice-integration.spec.ts`: yes.
  - local `clearState(...)` wrappers retained as one-line explicit DB-list call sites.
  - assertions touched: no user-flow assertions removed or weakened; existing Sheet Library heading readiness assertion moved into the E2E fixture helper.
  - implementation LOC: 21 added, 63 deleted, net `-42`.

Per-target preservation table:

| File | Before DB list | After DB list | Route before/after | localStorage behavior before/after |
| --- | --- | --- | --- | --- |
| `tests/e2e/measure-grid-calibration.spec.ts` | sheet library, practice session, measure grid | same | `/sheet-library` / same | recording-history key removed via `clearRecordingHistory` / same via helper |
| `tests/e2e/practice-segment-selector.spec.ts` | sheet library, practice session, measure grid, practice segment | same | `/sheet-library` / same | recording-history key removed via `clearRecordingHistory` / same via helper |
| `tests/e2e/sheet-segment-recording.spec.ts` | sheet library, practice session, measure grid, practice segment | same | `/sheet-library` / same | recording-history key removed via `clearRecordingHistory` / same via helper |
| `tests/e2e/reference-system.spec.ts` | sheet library, reference, practice session | same | `/sheet-library` / same | recording-history key removed via `clearRecordingHistory` / same via helper |
| `tests/e2e/sheet-recording-review.spec.ts` | sheet library, practice session | same | `/sheet-library` / same | recording-history key removed via `clearRecordingHistory` / same via helper |
| `tests/e2e/sheet-practice-integration.spec.ts` | sheet library, practice session | same | `/sheet-library` / same | recording-history key removed with local `window.localStorage.removeItem(...)` / same through `clearRecordingHistory` in helper |

Targeted baseline and verification:

```powershell
& .\scripts\npm-local.ps1 --% run test:e2e -- reference-system.spec.ts measure-grid-calibration.spec.ts practice-segment-selector.spec.ts sheet-segment-recording.spec.ts
& .\scripts\npm-local.ps1 --% run test:e2e -- sheet-recording-review.spec.ts sheet-practice-integration.spec.ts
```

Required before PR:

```powershell
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint
git diff --check
```

If the baseline fails before implementation, stop and classify the failure
before editing. If preserving behavior requires changing assertions, touching
practice snapshot readers, adding recording artifact DB cleanup, or creating a
broad all-app-state reset helper, stop and request plan review again.
