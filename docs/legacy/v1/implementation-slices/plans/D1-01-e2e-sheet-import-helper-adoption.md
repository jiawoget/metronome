# D1-01 E2E Sheet Import Helper Adoption Plan

## Status

- Workstream: `pack-d-codebase-slimming-follow-up`
- Slice: `D1-01 e2e-sheet-import-helper-adoption`
- Current lifecycle state: `verified`
- Parent plan: `docs/v1/implementation-slices/plans/D1-main-codebase-slimming-follow-up-plan.md`
- Baseline branch: `main`
- Baseline commit: `1c81f70c`
- Previous workstream: `pack-c-codebase-slimming` is `verified`
- Plan review: initial web ChatGPT review `PASS`; delta review `PASS`

This plan covers only the first narrow implementation slice. It is designed to
validate that Pack D can produce real net deletion without touching product
code, storage cleanup, snapshot readers, or assertions.

## Problem

Several E2E specs still define local `importSheet(...)` helpers that duplicate
the already shared `tests/e2e/fixtures/sheets.ts#importTestSheet(...)` flow:

- navigate to `/sheet-library`
- upload a sheet fixture from `test-fixtures/sheets`
- wait for `Ready:`
- fill sheet metadata
- save imported sheet
- assert the imported sheet heading
- read the `Open Sheet Practice` href and derive `sheetId`

This duplicate setup is not behavior under test in these specs. It creates
multiple places that can drift when Sheet Library import labels or fixture
paths change.

## Local Evidence

Existing shared helper:

- `tests/e2e/fixtures/sheets.ts#importTestSheet(page, { name, bpm, timeSignature, fixture })`

Remaining local helpers from the current scan:

- `tests/e2e/sheet-practice-controls.spec.ts`
  - local `path` / `fileURLToPath`
  - local `sheetFixturesDir`
  - local `importSheet(page)`
  - imports `real-sheet.png`
  - name: `Controls Contract Sheet`
  - bpm: `72`
  - time signature: `4/4`
- `tests/e2e/sheet-practice-session.spec.ts`
  - local `path` / `fileURLToPath`
  - local `sheetFixturesDir`
  - local `importSheet(page)`
  - imports `real-sheet.png`
  - name: `Session Contract Sheet`
  - default helper BPM/time signature are acceptable only if they match current behavior
- `tests/e2e/practice-session.spec.ts`
  - local `path` / `fileURLToPath`
  - local `sheetFixturesDir`
  - local `importSheet(page)`
  - imports `real-sheet.png`
  - name: `Practice Session Sheet`
  - returns only `sheetId`
- `tests/e2e/sheet-viewer.spec.ts`
  - local `importSheet(page, fixtureName, name)`
  - uses multiple fixture names and sheet names
  - also uses `sheetFixturesDir` elsewhere for a pixel fixture read; this file may not be able to remove all path imports in this slice
- `tests/e2e/sheet-recording-review.spec.ts`
  - local `importSheet(page, name = "Recording Contract Sheet")`
  - uses the returned `{ link, sheetId }`

## Scope

Allowed implementation files:

- `tests/e2e/sheet-practice-controls.spec.ts`
- `tests/e2e/practice-session.spec.ts`
- `tests/e2e/sheet-practice-session.spec.ts`
- `tests/e2e/sheet-viewer.spec.ts`
- `tests/e2e/sheet-recording-review.spec.ts`

Conditionally allowed:

- `tests/e2e/fixtures/sheets.ts`

Only edit `fixtures/sheets.ts` if a tiny general option is required to preserve
an existing helper's behavior. The current helper already supports `name`,
`bpm`, `timeSignature`, and `fixture`, so no helper change is expected.

Status/plan files:

- `docs/v1/status.json`
- this plan file
- `docs/v1/implementation-slices/plans/D1-main-codebase-slimming-follow-up-plan.md`

## Explicit Non-Scope

- No `src/**` changes.
- No `tests/unit/**` changes.
- No `clearState(...)` changes.
- No `getPracticeSnapshot(...)` changes.
- No storage helper, IndexedDB helper, or artifact seeding changes.
- No synthetic microphone helper changes.
- No assertion deletion, weakening, broadening, or movement.
- No timing relaxation.
- No file-wide formatting, import sorting, or line wrapping as a slimming substitute.
- No E2E spec splitting.

## Implementation Steps

0. Confirm status/source-of-truth before editing implementation files.
   - `docs/v1/status.json` lists Pack D as `planning_in_progress`.
   - `docs/v1/status.json` lists D1-01 as `planning_in_progress`.
   - `docs/v1/implementation-slices/plans/D1-main-codebase-slimming-follow-up-plan.md` is present and reviewed.

1. Inventory local import helpers.

```powershell
rg -n "async function importSheet|sheetFixturesDir|fileURLToPath" tests/e2e
```

For each target helper, record the exact old behavior before replacing it:

- fixture file
- sheet name
- whether the old helper filled BPM
- whether the old helper filled time signature
- returned shape (`sheetId` only or `{ link, sheetId }`)

Do not rely on `importTestSheet(...)` defaults unless the inventory proves the
old helper left that field unset or used the same value.

2. Run targeted baseline before implementation:

```powershell
& .\scripts\npm-local.ps1 --% run test:e2e -- sheet-practice-controls.spec.ts practice-session.spec.ts sheet-practice-session.spec.ts sheet-viewer.spec.ts sheet-recording-review.spec.ts
```

3. Replace each target local helper with `importTestSheet(...)`.

Expected call shapes:

```ts
const { link, sheetId } = await importTestSheet(page, {
  name: "Controls Contract Sheet",
  bpm: "72",
  timeSignature: "4/4"
});
```

```ts
const { sheetId } = await importTestSheet(page, {
  name: "Practice Session Sheet"
});
```

```ts
const { link, sheetId } = await importTestSheet(page, {
  name,
  fixture: fixtureName
});
```

4. Preserve return shapes at call sites.
   - If the old helper returned `{ link, sheetId }`, keep that shape.
   - If the old helper returned only `sheetId`, destructure and return only `sheetId` or inline destructure at the call site.
   - Keep `link` locators scoped the same way as before.

5. Remove local imports/constants only when unused.
   - Remove `path`, `fileURLToPath`, `currentDir`, and `sheetFixturesDir` only from files where this slice makes them unused.
   - `sheet-viewer.spec.ts` may still need path helpers for non-import fixture reads; do not force removal.

6. Re-run targeted E2E and required checks:

```powershell
& .\scripts\npm-local.ps1 --% run test:e2e -- sheet-practice-controls.spec.ts practice-session.spec.ts sheet-practice-session.spec.ts sheet-viewer.spec.ts sheet-recording-review.spec.ts
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint
git diff --check
```

7. Before PR review, report diff accounting:
   - local import helper bodies removed
   - shared helper calls added
   - `fixtures/sheets.ts` changed: yes/no
   - assertions touched: yes/no
   - net implementation LOC excluding docs/status

## Acceptance Criteria

- The target E2E specs use `importTestSheet(...)` instead of local sheet-import helper bodies where semantics match.
- Sheet names, fixture names, BPM values, and time signatures are preserved.
- `sheet-viewer.spec.ts` keeps any non-import fixture file reads that still require local path helpers.
- `tests/e2e/fixtures/sheets.ts` remains unchanged unless a tiny generally useful option is necessary.
- No production files change.
- No unit tests change.
- No `clearState` or `getPracticeSnapshot` helper changes occur in this slice.
- No assertions, test names, user flows, or timeout behavior are removed or weakened.
- The implementation diff shows real net deletion or a clearly smaller maintenance surface after excluding docs/status.
- The PR description includes exact before/after accounting.

## Verification

Targeted baseline and verification:

```powershell
& .\scripts\npm-local.ps1 --% run test:e2e -- sheet-practice-controls.spec.ts practice-session.spec.ts sheet-practice-session.spec.ts sheet-viewer.spec.ts sheet-recording-review.spec.ts
```

Required before PR:

```powershell
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint
git diff --check
```

If the baseline fails before implementation, stop and classify the failure
before editing. If preserving behavior requires changing assertions, importing
storage helpers, touching `getPracticeSnapshot`, or adding a broad new fixture
framework, stop and request plan review again.

Local verification on 2026-06-30:

- Targeted E2E baseline before implementation: PASS, 9 tests.
- Targeted E2E verification after implementation: PASS, 9 tests.
- `typecheck`: PASS.
- `lint`: PASS.
- `git diff --check`: PASS.

Implementation accounting:

- Removed local sheet-import helper bodies from five E2E specs.
- Reused existing `tests/e2e/fixtures/sheets.ts#importTestSheet(...)`.
- Did not change `tests/e2e/fixtures/sheets.ts`.
- Did not touch `clearState`, `getPracticeSnapshot`, storage helpers, artifact
  seeding, assertions, test names, or timeout behavior.
- Implementation E2E spec diff excluding docs/status: 46 net lines removed.
