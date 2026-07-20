# D1-03 E2E Practice Snapshot Reader Helper Plan

## Status

- Workstream: `pack-d-codebase-slimming-follow-up`
- Slice: `D1-03 e2e-practice-snapshot-reader-helper`
- Current lifecycle state: `verified`
- Parent plan: `docs/v1/implementation-slices/plans/D1-main-codebase-slimming-follow-up-plan.md`
- Baseline branch: `main`
- Baseline commit: `0413af34` (`Merge pull request #19 from jiawoget/codex/d1-02-clear-state-plan`)
- Previous slices:
  - `D1-01 e2e-sheet-import-helper-adoption`: `verified`
  - `D1-02 e2e-clear-state-storage-helper-consolidation`: `verified`
- Plan review: web ChatGPT review `PASS`

This plan covers only E2E practice-session snapshot reader duplication.
Implementation is authorized only after web ChatGPT review passes.

## Problem

Several Sheet Practice E2E specs still carry local `getPracticeSnapshot(...)`
helpers that repeat the same browser-storage mechanics:

- open or inspect the practice-session IndexedDB database
- tolerate missing/nonexistent `sessions` stores
- read all `sessions` rows
- read recording-history `recordings` from localStorage
- sometimes read recording-history `errorMarkers`

The duplication is real, but the reader must stay narrow. The tests should keep
their object shape expectations visible at assertion sites, and this slice must
not create a generic IndexedDB query DSL.

## Local Evidence

Current matching local helpers:

| File | Current reader shape | Notable differences |
| --- | --- | --- |
| `tests/e2e/sheet-practice-controls.spec.ts` | `getPracticeSnapshot(page)` returns `{ sessions, recordings }`; reads sessions from `PRACTICE_SESSION_DB_NAME`; reads recording-history `recordings`; uses `indexedDB.databases()` when available to avoid opening a nonexistent DB. | Session rows include `bpm` and `timeSignature` in the local type. Initial empty assertion expects exactly `{ sessions: [], recordings: [] }`. |
| `tests/e2e/sheet-practice-session.spec.ts` | `getPracticeSnapshot(page)` returns `{ sessions, recordings }`; reads sessions from `PRACTICE_SESSION_DB_NAME`; reads recording-history `recordings`; uses `indexedDB.databases()` when available to avoid opening a nonexistent DB. | Session rows include `durationMs` in the local type. Initial empty assertion expects exactly `{ sessions: [], recordings: [] }`. |
| `tests/e2e/reference-system.spec.ts` | `getPracticeSnapshot(page)` reads sessions from `PRACTICE_SESSION_DB_NAME`, then uses shared `readRecordingHistory(page)` and returns `{ sessions, recordings }`. | Does not currently use `indexedDB.databases()` pre-check; it handles missing `sessions` store by returning `[]`. |
| `tests/e2e/sheet-practice-integration.spec.ts` | `getPracticeSnapshot(page)` returns `{ sessions, recordings, errorMarkers }`; reads sessions from `PRACTICE_SESSION_DB_NAME`; reads recording-history `recordings` and `errorMarkers`. | Needs `errorMarkers` preserved. It currently passes local `practiceDbName` and `recordingHistoryStorageKey` constants into `page.evaluate(...)`. |

Adjacent but out-of-scope readers:

| File | Why excluded from D1-03 implementation by default |
| --- | --- |
| `tests/e2e/practice-session.spec.ts` | Uses `getPracticeSessions(page)` for quick-session behavior only, plus a broader `clearBrowserData(...)` that clears all localStorage on `/`. This is not the same Sheet Practice snapshot reader shape. |
| `tests/e2e/recordings-review.spec.ts` | Already uses `readRecordingHistory(...)` / `seedRecordingHistory(...)` fixture helpers and is not a practice-session IndexedDB snapshot helper target. |
| `tests/e2e/settings-local-data.spec.ts` | Reads broad settings/local-data persistence counts; not the same Sheet Practice snapshot reader shape. |

## Scope

Allowed implementation files:

- `tests/e2e/fixtures/storage.ts` or, if review requires a separate fixture,
  `tests/e2e/fixtures/practice-snapshot.ts`
- `tests/e2e/reference-system.spec.ts`
- `tests/e2e/sheet-practice-controls.spec.ts`
- `tests/e2e/sheet-practice-session.spec.ts`
- `tests/e2e/sheet-practice-integration.spec.ts`

Status/plan files:

- `docs/v1/status.json`
- this plan file
- optionally `docs/v1/implementation-slices/plans/D1-main-codebase-slimming-follow-up-plan.md` for progress notes only

## Explicit Non-Scope

- No `src/**` changes.
- No `tests/unit/**` changes.
- No `tests/e2e/practice-session.spec.ts` changes unless web ChatGPT explicitly approves a narrow inclusion after reviewing its quick-session semantics.
- No `tests/e2e/recordings-review.spec.ts` changes.
- No `tests/e2e/settings-local-data.spec.ts` changes.
- No storage cleanup helper changes from D1-02.
- No sheet import helper changes from D1-01.
- No recording artifact IndexedDB seeding changes.
- No synthetic microphone changes.
- No assertion deletion, weakening, broadening, or timing relaxation.
- No generic IndexedDB query helper or scenario DSL.
- No hidden DB-name selection. The helper must use explicit storage contracts or explicit caller options only.

## Proposed Implementation Shape

Prefer one narrow E2E helper that returns raw snapshot data, for example:

```ts
export async function readPracticeSnapshot(page: Page, options?: {
  includeErrorMarkers?: boolean;
}) {
  // read sessions from PRACTICE_SESSION_DB_NAME
  // read recording-history recordings from RECORDING_HISTORY_STORAGE_KEY
  // include errorMarkers only when requested
}
```

Required helper constraints:

- It must read only the practice-session `sessions` store and recording-history localStorage.
- It must not become a generic table/query abstraction.
- It must preserve missing/nonexistent database handling.
  - The controls/session helpers currently avoid opening a nonexistent DB when `indexedDB.databases()` is available.
  - A shared helper may safely use that stricter no-create behavior for all targets if review accepts it; otherwise it must preserve per-target behavior.
- It must preserve missing `sessions` object store handling by returning an empty `sessions` array.
- It must default to returning `{ sessions, recordings }`.
- It must return `errorMarkers` only for callers that explicitly request them.
- It must keep object shape expectations visible in tests.
  - Tests may keep local row types or local casts.
  - Assertions must remain at spec call sites.
- It must not read or seed recording artifacts.
- It must not clear storage.
- It must not change app behavior, only E2E fixtures/specs.

If the helper needs enough generic typing/options that it adds more complexity
than it deletes, D1-03 must be closed as no-go or narrowed to only the clearly
identical `sheet-practice-controls` and `sheet-practice-session` duplication.

## Implementation Steps

0. Confirm status/source-of-truth before implementation.
   - `docs/v1/status.json` lists Pack D as `in_progress`.
   - D1-01 and D1-02 are `verified`.
   - D1-03 is `planning_in_progress` until web ChatGPT plan review passes.

1. Re-run the inventory before editing implementation files:

```powershell
rg -n "getPracticeSnapshot|readPracticeSnapshot|recordingHistoryStorageKey|objectStoreNames|indexedDB.databases|errorMarkers|latestRecordingId" tests/e2e/reference-system.spec.ts tests/e2e/sheet-practice-controls.spec.ts tests/e2e/sheet-practice-session.spec.ts tests/e2e/sheet-practice-integration.spec.ts tests/e2e/practice-session.spec.ts tests/e2e/fixtures/storage.ts
```

2. Run targeted baseline before implementation:

```powershell
& .\scripts\npm-local.ps1 --% run test:e2e -- reference-system.spec.ts sheet-practice-controls.spec.ts sheet-practice-session.spec.ts sheet-practice-integration.spec.ts
```

3. Add the narrow snapshot helper only if the implementation sketch shows real net deletion.
   - Prefer reusing existing `readRecordingHistory(page)` internally.
   - Keep `PRACTICE_SESSION_DB_NAME` / `RECORDING_HISTORY_STORAGE_KEY` ownership explicit in the fixture.
   - Preserve missing DB/store behavior.

4. Replace local `getPracticeSnapshot(...)` helpers only where the behavior matches.
   - `sheet-practice-controls.spec.ts`: preserve `{ sessions, recordings }`.
   - `sheet-practice-session.spec.ts`: preserve `{ sessions, recordings }`.
   - `reference-system.spec.ts`: preserve `{ sessions, recordings }`.
   - `sheet-practice-integration.spec.ts`: preserve `{ sessions, recordings, errorMarkers }`.

5. Keep test assertions visible.
   - Do not hide expected `recordingCount`, `latestRecordingId`, `durationMs`, `bpm`, `timeSignature`, `trustedPeaks`, or marker shapes inside helper assertions.

6. Run targeted verification:

```powershell
& .\scripts\npm-local.ps1 --% run test:e2e -- reference-system.spec.ts sheet-practice-controls.spec.ts sheet-practice-session.spec.ts sheet-practice-integration.spec.ts
```

7. Run required checks:

```powershell
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint
git diff --check
```

8. Because D1-03 is the third completed Pack D slice, run the mandatory
   every-3-slices checkpoint before marking D1-03 verified / PR-ready:

```powershell
& .\scripts\npm-local.ps1 --% run test:e2e
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint
git diff --check
```

9. Run a manual Chrome/local-app smoke path covering D1-01 through D1-03:
   - Sheet Library can import `test-fixtures/sheets/real-sheet.png`.
   - Imported sheet opens Sheet Practice.
   - Practice controls render and session/recording state remains usable.
   - Recordings Review route remains usable after the helper changes.
   - If no real microphone is available, use the established simulated microphone path rather than blocking on hardware.

10. Before PR review, report diff accounting:
    - helper added or no-go
    - local `getPracticeSnapshot(...)` helpers removed: count and files
    - per-file snapshot return shape before/after
    - missing DB/store behavior before/after
    - assertions touched: yes/no
    - net implementation LOC excluding docs/status

## Acceptance Criteria

- A reviewed plan approves the exact helper scope before implementation.
- Any helper is narrow to practice-session rows plus recording-history rows.
- It does not hide per-test shape assertions.
- It preserves the empty snapshot behavior in controls/session tests.
- It preserves `errorMarkers` in `sheet-practice-integration.spec.ts`.
- It preserves missing/nonexistent `sessions` object store behavior.
- It produces real net deletion or closes as no-go with evidence.
- No production files change.
- No unit tests change.
- No storage cleanup, sheet import, artifact seeding, or microphone fixture behavior changes.
- No assertions, test names, user flows, or timeout behavior are removed or weakened.
- The D1-03 full E2E plus manual Chrome/local-app checkpoint passes before continuing to D1-04.

## Verification

Current implementation evidence:

- Web ChatGPT plan review: `PASS`.
  - Required changes before implementation: `None`.
  - It approved including `sheet-practice-integration.spec.ts` with
    `includeErrorMarkers` explicitly enabled by that caller only.
  - It approved using one narrow raw snapshot reader and applying the stricter
    no-create `indexedDB.databases()` behavior across targets.
  - It confirmed full E2E plus manual Chrome/local-app smoke should be a
    PR-ready / merge-before gate for this third Pack D slice.
- Targeted baseline before implementation:
  - `& .\scripts\npm-local.ps1 --% run test:e2e -- reference-system.spec.ts sheet-practice-controls.spec.ts sheet-practice-session.spec.ts sheet-practice-integration.spec.ts`: `PASS`, 4/4.
- Local verification after implementation:
  - `& .\scripts\npm-local.ps1 --% run typecheck`: `PASS`.
  - `& .\scripts\npm-local.ps1 --% run test:e2e -- reference-system.spec.ts sheet-practice-controls.spec.ts sheet-practice-session.spec.ts sheet-practice-integration.spec.ts`: `PASS`, 4/4.
  - `& .\scripts\npm-local.ps1 --% run lint`: `PASS`.
  - `git diff --check`: `PASS`.
  - `& .\scripts\npm-local.ps1 --% run test:e2e`: `PASS`, 30/30.
  - Checkpoint rerun:
    - `& .\scripts\npm-local.ps1 --% run typecheck`: `PASS`.
    - `& .\scripts\npm-local.ps1 --% run lint`: `PASS`.
    - `git diff --check`: `PASS`.
- Manual Chrome/local-app smoke: `PASS`.
  - A hidden dev server was run on `http://127.0.0.1:3102`.
  - Chrome opened the Sheet Library route successfully.
  - After enabling Chrome extension file upload access,
    `test-fixtures/sheets/real-sheet.png` uploaded successfully and showed
    `Ready: 1 image.`
  - Saved imported sheet `D1-03 Smoke Sheet 1782797894632`.
  - Opened Sheet Practice from the imported sheet at
    `/sheet-practice/sheet_7ba4601c-9a83-42b9-b3c5-5c4c6cc951b7`.
  - Practice controls rendered; Start/Stop metronome worked and created sheet
    session `session_cc44b6d1-962b-423b-bbf6-7d40952a3edb`.
  - Recordings route opened successfully and showed the `Recordings` heading.

Targeted baseline and verification:

```powershell
& .\scripts\npm-local.ps1 --% run test:e2e -- reference-system.spec.ts sheet-practice-controls.spec.ts sheet-practice-session.spec.ts sheet-practice-integration.spec.ts
```

Required before PR:

```powershell
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint
git diff --check
```

D1-03 checkpoint before continuing:

```powershell
& .\scripts\npm-local.ps1 --% run test:e2e
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint
git diff --check
```

Manual Chrome/local-app smoke must also be recorded in this plan before D1-03
is treated as complete.

If the baseline fails before implementation, stop and classify the failure
before editing. If preserving behavior requires a broad DB query abstraction,
assertion changes, storage cleanup changes, or artifact fixture changes, stop
and request plan review again.
