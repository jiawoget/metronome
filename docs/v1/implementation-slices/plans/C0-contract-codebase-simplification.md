# C0 Contract Stage: Codebase Simplification Before Continuing V1

## Contract Goal

Pause new v1 feature work and simplify the existing codebase without changing behavior. This is a contract stage, not a product feature slice. The implementation must remove duplicated mechanisms, reuse existing packages/local helpers, and keep tests meaningful.

The coding agent must optimize for correctness first. Net line reduction is required as evidence, but deleting behavior or coverage to reduce line count fails this contract.

## Current Baseline

Measured local hotspots:

| Area | Approx lines | Notes |
| --- | ---: | --- |
| `src/components` | 7,038 | Many controller-style components exceed 450 lines. |
| `tests/unit` | 7,339 | Repository/service tests repeat domain boundary matrices. |
| `tests/e2e` | 6,255 | Many specs duplicate IndexedDB/localStorage/sheet/audio setup. |

Top-heavy files that must drive this cleanup:

| File | Lines | Problem |
| --- | ---: | --- |
| `tests/e2e/sheet-recording-review.spec.ts` | 1006 | Repeats sheet import, synthetic mic/audio, localStorage snapshot, long flow helpers. |
| `tests/unit/practice-segment-repository.test.ts` | 985 | Repeats domain validation matrix and persisted-row malformed cases. |
| `tests/e2e/recordings-review.spec.ts` | 853 | Repeats recording snapshot/audio/waveform helpers. |
| `tests/unit/practice-session-service.test.ts` | 719 | Repeats memory repo/factory/session scenario setup. |
| `src/components/sheet-library/sheet-library-experience.tsx` | 657 | Import/edit metadata forms and field markup repeated. |
| `src/components/sheet-practice/reference/reference-panel.tsx` | 640 | Large local state controller with repeated form/status patterns. |
| `src/components/quick-metronome/quick-metronome-experience.tsx` | 627 | Duplicates recording/metronome state with sheet practice. |
| `src/components/recordings-review/recordings-review-experience.tsx` | 523 | Header/list/details/tile/pill markup in one file. |
| `src/components/sheet-practice/controls/sheet-practice-controls.tsx` | 506 | Orchestrates metronome, recording, session, v1 panels. |
| `src/components/measure-grid/..` equivalent | 451 | Manual field validation and async stale-sheet guard. |

Installed but underused packages:

- `dexie`: used, but segment repository still hand-rolls compound keys.
- `zod`: used, but UI draft validation and persisted record parsing still duplicate schema logic.
- `zustand`: installed but unused; use only when it materially removes cross-component event/state glue.
- `clsx` / `tailwind-merge`: available through local `cn` utility; use for shared UI helpers.
- `@radix-ui/react-slot`: installed only for slot composition; do not assume AlertDialog/Select are available.

Potential new packages, only if justified:

- `react-hook-form` + `@hookform/resolvers/zod`: acceptable only for real repeated form state/errors, especially sheet metadata, settings, measure grid, and upcoming segment create/edit.
- `@tanstack/react-query`: acceptable only if async cache/invalidation is implemented explicitly for Dexie/localStorage mutations.
- Radix AlertDialog: acceptable for destructive confirmations; Radix Select is not required for line reduction.

## Completion Criteria

The contract is complete only when:

- `git diff --stat` shows net simplification, not just file movement.
- Targeted unit tests pass for changed areas.
- Affected E2E tests pass or a sandbox-specific Playwright blocker is documented with an escalated retry attempt.
- `typecheck`, `lint`, and `build` pass.
- Review agent confirms:
  - behavior is preserved,
  - coverage was compressed, not deleted,
  - abstractions make call sites simpler,
  - no new dependency was added without a concrete payoff.

## Workstream A: E2E And Unit Test Duplication

### Evidence

Repeated E2E storage setup appears in:

- `tests/e2e/sheet-recording-review.spec.ts`
- `tests/e2e/reference-system.spec.ts`
- `tests/e2e/sheet-practice-integration.spec.ts`
- `tests/e2e/sheet-practice-session.spec.ts`
- `tests/e2e/sheet-practice-controls.spec.ts`
- `tests/e2e/settings-local-data.spec.ts`
- `tests/e2e/practice-session.spec.ts`
- `tests/e2e/practice-segment-selector.spec.ts`
- `tests/e2e/measure-grid-calibration.spec.ts`

Repeated sheet import flow appears in:

- `tests/e2e/sheet-recording-review.spec.ts`
- `tests/e2e/reference-system.spec.ts`
- `tests/e2e/sheet-practice-integration.spec.ts`
- `tests/e2e/sheet-practice-session.spec.ts`
- `tests/e2e/sheet-practice-controls.spec.ts`
- `tests/e2e/practice-segment-selector.spec.ts`
- `tests/e2e/measure-grid-calibration.spec.ts`

Repeated synthetic mic/audio/WAV logic appears in:

- `tests/e2e/sheet-recording-review.spec.ts`
- `tests/e2e/reference-system.spec.ts`
- `tests/e2e/quick-metronome.spec.ts`
- `tests/e2e/recordings-review.spec.ts`

Repeated localStorage recording-history snapshots appear in:

- `tests/e2e/sheet-recording-review.spec.ts`
- `tests/e2e/settings-local-data.spec.ts`
- `tests/e2e/quick-metronome.spec.ts`
- `tests/e2e/recordings-review.spec.ts`
- `tests/e2e/sheet-practice-integration.spec.ts`
- `tests/e2e/sheet-practice-session.spec.ts`
- `tests/e2e/sheet-practice-controls.spec.ts`

Repeated unit factories/fakes appear in:

- `tests/unit/practice-session-service.test.ts`
- `tests/unit/practice-segment-repository.test.ts`
- `tests/unit/measure-grid-repository.test.ts`
- `tests/unit/sheet-library-service.test.ts`
- `tests/unit/sheet-practice-controls.test.tsx`

### Required Implementation

Create shared E2E helpers:

- `tests/e2e/fixtures/storage.ts`
  - constants for DB names and recording history key.
  - `deleteDatabase(page, databaseName)`.
  - `clearDatabases(page, databaseNames)`.
  - `clearRecordingHistory(page)`.
  - `readRecordingHistory(page)`.
  - `seedRecordingHistory(page, snapshot)`.
  - optional `countObjectStoreRows(page, databaseName, stores)`.
- `tests/e2e/fixtures/sheets.ts`
  - `importTestSheet(page, { name, bpm, timeSignature, fixture })`.
  - Return `{ sheetId, link }` or equivalent so tests stop parsing links manually.
- `tests/e2e/fixtures/audio.ts`
  - shared synthetic microphone setup.
  - WAV data URL creation/decoding only if multiple specs truly share identical logic.
  - `expectAudibleRecordingEvidence(...)` for common assertions.

Create shared unit helpers:

- `tests/unit/factories/practice.ts`
  - `buildPracticeSession`.
  - `buildSheetRecordingMetadata`.
  - `buildMeasureGrid`.
  - `buildPracticeSegment`.
  - fixed ISO date constants.
- `tests/unit/fakes/repositories.ts`
  - typed memory repositories only when at least two tests share the same fake.

Refactor tests so coverage moves to the right layer:

- Domain tests own complete input boundary matrices.
- Repository tests own storage behavior:
  - CRUD,
  - scoping,
  - reload/persistence,
  - validation-before-write,
  - corrupt persisted row filtering,
  - migration compatibility only when contractually required.
- E2E tests own user-visible workflow contracts:
  - recording save,
  - Practice Again not mutating source recording,
  - settings cleanup,
  - reference local audio and Bilibili fallback,
  - sheet-scoped recording behavior,
  - measure-grid/segment stale-state behavior.

### Specific Test Compression Targets

- `tests/unit/practice-segment-repository.test.ts`
  - Do not repeat every domain-invalid segment field.
  - Keep representative corrupt row cases:
    - non-object row,
    - missing `segment`,
    - embedded `sheetId` mismatch,
    - embedded `segmentId` mismatch,
    - invalid segment payload,
    - invalid grid association.
  - If Dexie compound key removes legacy key support, delete tests that exist only for the old hand-rolled key format.
- `tests/unit/measure-grid-repository.test.ts`
  - Keep happy path, sheet scoping, validation-before-write, reload, corrupt row.
  - Remove repeated full measure-grid invalid matrix; keep that in `tests/unit/measure-grid.test.ts`.
- `tests/e2e/sheet-recording-review.spec.ts`
  - Move synthetic mic, decode, sheet import, storage setup into helpers.
  - Keep the complete user journey assertions.
- `tests/e2e/recordings-review.spec.ts`
  - Move seed history, audio data helpers, repeated waveform evidence into helpers.
  - Keep one waveform/preview contract instead of repeating DOM geometry checks in every case.

### Must Not Remove

- E2E coverage for recording save.
- E2E coverage for Practice Again.
- E2E coverage for settings local cleanup.
- E2E coverage for reference local audio and Bilibili fallback.
- E2E coverage for sheet-practice scoped recordings.
- Repository tests for corrupt local data tolerance.

### Expected Net Reduction

- Conservative: 900-1,400 lines.
- Aggressive but acceptable: 1,500+ lines.

## Workstream B: Persistence, Domain, And Existing Package Reuse

### Evidence

#### Segment Repository Rebuilds Dexie Compound Keys

File:

- `src/infrastructure/db/browser-practice-segment-service.ts`

Current repeated/hand-written logic:

- `key: JSON.stringify([sheetId, segmentId])`
- legacy key `${sheetId}::${segmentId}`
- `createPracticeSegmentRecordKey`
- `createLegacyPracticeSegmentRecordKey`
- `isPracticeSegmentRecordKeyMatch`
- duplicate row de-duplication with `Map`
- tests for delimiter collision caused by the hand-rolled key format.

Replacement:

- Use Dexie compound primary key/index:
  - schema example: `segments: "[sheetId+segmentId], sheetId, segmentId, updatedAt"`.
  - use `get([sheetId, segmentId])`.
  - use `delete([sheetId, segmentId])`.
- Keep row fields `sheetId`, `segmentId`, `segment`, `updatedAt`.
- Remove `key` unless a real migration contract is documented.
- Remove legacy delimiter compatibility if it was introduced only to patch this implementation before user data exists.

Required tests:

- save/list/get/delete with compound key.
- no collision for `("a::b","c")` vs `("a","b::c")` if ids can contain delimiters.
- corrupt row filtering still works.
- no stale old key tests unless migration retained.

#### Zod Double Validation

Files:

- `src/domain/practice/segments/index.ts`
- `src/domain/practice/measure-grid/index.ts`

Current repeated logic:

- `parsePracticeSegment` pre-parses range using `parseMeasureRange`, then parses full `practiceSegmentSchema`.
- `validatePracticeSegment` validates range, then parses full schema.
- `getPracticeSegmentGridStatus` parses the full segment and then parses `parsedSegment.grid` again.
- measure-grid calculations validate the same grid multiple times through chained public functions.

Replacement:

- Let `practiceSegmentSchema` own nested `measureRangeSchema` validation.
- Keep `parsePracticeSegment` as `safeParse`.
- Keep `validatePracticeSegment` as `parse`.
- Remove re-parsing of grid association after full segment parse.
- Add internal already-validated helper for measure-grid calculations if it reduces repeated validation without weakening public API boundaries.

Required tests:

- Existing domain tests must still pass.
- Add/keep at least one invalid nested range and invalid grid association test.

#### Dexie Singleton Boilerplate

Files:

- `src/infrastructure/db/practice-session-repository.ts`
- `src/infrastructure/db/browser-settings-service.ts`
- `src/infrastructure/db/browser-measure-grid-service.ts`
- `src/infrastructure/db/browser-practice-segment-service.ts`
- `src/infrastructure/files/sheet-library-repository.ts`
- `src/infrastructure/reference/reference-repository.ts`

Repeated pattern:

- Dexie subclass.
- module-level `let database`.
- `getDatabase()`.
- test reset/delete helpers.

Replacement:

- Optional small helper only if it reduces code without hiding schema/version readability.
- Candidate: `createDexieSingleton<TDatabase>({ create })`.
- Do not create a generic repository framework.

#### LocalStorage JSON Snapshot Repetition

Files:

- `src/lib/quick-metronome/persistence.ts`
- `src/lib/recordings-review/repository.ts`

Repeated pattern:

- SSR guard.
- `JSON.parse` try/catch.
- cached raw/cached snapshot.
- `JSON.stringify`.
- custom events and `storage` listener.

Replacement options:

- Safer: `createLocalJsonStore<T>({ key, emptySnapshot, normalize, eventNames })`.
- Higher risk: `zustand/persist` with repository facade retained.

Use `zustand` only if it simplifies cross-component state and does not blur storage contract tests.

#### Time Signature And Date Helpers

Files:

- `src/domain/practice/validation.ts`
- `src/domain/practice/measure-grid/index.ts`
- `src/domain/settings/types.ts`
- `src/lib/quick-metronome/types.ts`
- `src/domain/practice/rules.ts`
- `src/lib/sheet-practice/recording-service.ts`
- `src/infrastructure/db/global-practice-session-repository.ts`
- `src/lib/recordings-review/history.ts`

Replacement:

- Derive time-signature schemas/types from one stable `TIME_SIGNATURES` tuple when low risk.
- Extract tiny `parseIsoMs` / `compareIsoDesc` helpers only if they remove repeated fallback date parsing.

### Must Not Remove

- corrupt persisted data tolerance,
- `updatedAt`,
- strict ISO validation,
- explicit service/repository validation boundaries where repositories are exported and can be called directly.

### Expected Net Reduction

- Conservative: 250-450 lines.

## Workstream C: UI Helper, Form, And State Duplication

### Evidence

High local state counts:

- `src/components/sheet-practice/reference/reference-panel.tsx`: about 14 `useState` calls.
- `src/components/sheet-library/sheet-library-experience.tsx`: about 13 `useState` calls.
- `src/components/sheet-practice/controls/sheet-practice-controls.tsx`: about 10 `useState` and 3 `useEffect`.
- `src/components/settings/settings-experience.tsx`: about 10 `useState`.
- `src/components/quick-metronome/quick-metronome-experience.tsx`: about 8 `useState`.
- `src/components/recordings-review/recordings-review-experience.tsx`: about 8 `useState`.

Repeated UI patterns:

- field label/input/select/error markup,
- status tiles/count tiles/detail tiles,
- metadata pills,
- page header and status banner,
- loading/ready/error state with `errorMessage`,
- stale async guard with `isActive` and loaded id,
- destructive confirmation state,
- quick metronome and sheet practice recording/metronome workflow state.

### Required Low-Risk Implementation

Prefer shared local UI helpers before new dependencies:

- Generalize existing `src/components/sheet-practice/controls/labeled-select.tsx` if it is actually reusable.
- Add shared field components only when at least two existing files become shorter:
  - `TextField`
  - `NumberField`
  - `SelectField`
  - `FieldError`
  - `FormMessage`
- Add shared display components only when they replace real duplicate markup:
  - `StatusTile`
  - `MetadataPill`
  - `PageHeader`
  - `StatusBanner`

Specific targets:

- `src/components/quick-metronome/quick-metronome-experience.tsx`
  - Remove its local `LabeledSelect` if existing/shared component fits.
  - Compare local status tiles with `src/components/sheet-practice/controls/status-tile.tsx`.
- `src/components/settings/settings-experience.tsx`
  - Reuse shared count/status tile and form message.
- `src/components/recordings-review/recordings-review-experience.tsx`
  - Reuse metadata pill/detail tile if it simplifies.
- `src/components/sheet-library/sheet-library-experience.tsx`
  - Use shared field helpers for import/edit metadata forms.
- `src/components/sheet-practice/measure-grid/measure-grid-calibration-panel.tsx`
  - Use shared field/error helpers if it simplifies.
  - Collapse duplicate `errorMessage` rendering.

### Required Functional Bug Fix

Known stale-state bug:

- `src/components/sheet-practice/measure-grid/measure-grid-calibration-panel.tsx` saves a grid.
- `src/components/sheet-practice/segments/practice-segment-selector-panel.tsx` is a sibling and loads grid only on `sheetId/service` change.
- Result: selector status can remain stale after same-page grid save.

Required fix:

- Add narrow invalidation/callback/state lift so selector refreshes after grid save.
- Keep behavior scoped to sheet practice.
- Add unit or E2E coverage:
  - load sheet with segment needing calibration or stale grid,
  - save/update grid,
  - selector status refreshes without page reload.

### Optional Higher-Risk Implementation

Only do these if the coding agent can keep the change contained and tested:

- Extract `useMetronomeSettingsController`.
- Extract `useRecordingLifecycle`.
- Extract `useActiveRecordingNavigationBlocker`.
- Use `zustand` for active recording/session state if it removes custom events and duplicated component state.

Do not add `react-hook-form` or TanStack Query in the first implementation pass unless the coding agent can show a clear net simplification and preserve save timing/invalidation.

### Expected Net Reduction

- Low-risk UI helpers: 250-450 lines.
- Form/zod integration if adopted safely: 450-750 lines.
- Recording/metronome hooks: 180-350 lines, but higher regression risk.

## Recommended Implementation Order

The coding agent should not attempt every possible simplification at once. Use this order:

1. Test helper extraction and test compression.
2. Segment repository Dexie compound key and domain zod double-validation cleanup.
3. Narrow stale-state fix for measure-grid -> segment-selector refresh.
4. Low-risk shared UI helpers.
5. Optional persistence/localStorage helpers.
6. Stop and report remaining opportunities before high-risk workflow hook extraction.

This order prioritizes easy review and test confidence.

## Verification Plan

Use README-compatible commands.

Targeted unit tests likely required:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/practice-segment-domain.test.ts tests/unit/practice-segment-repository.test.ts tests/unit/measure-grid.test.ts tests/unit/measure-grid-repository.test.ts
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/measure-grid-calibration.test.tsx tests/unit/practice-segment-selector.test.tsx tests/unit/sheet-practice-controls.test.tsx
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/practice-session-service.test.ts tests/unit/sheet-library-service.test.ts
```

Targeted E2E tests likely required:

```powershell
& .\scripts\npm-local.ps1 --% run test:e2e -- tests/e2e/measure-grid-calibration.spec.ts tests/e2e/practice-segment-selector.spec.ts
& .\scripts\npm-local.ps1 --% run test:e2e -- tests/e2e/sheet-recording-review.spec.ts tests/e2e/recordings-review.spec.ts
& .\scripts\npm-local.ps1 --% run test:e2e -- tests/e2e/reference-system.spec.ts tests/e2e/quick-metronome.spec.ts
```

Broad gates:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint
& .\scripts\npm-local.ps1 --% run build
```

Playwright may require escalation when Chromium spawn is blocked.

## Review Gate

After coding, a separate review agent must inspect the diff and answer:

- Is line reduction real net simplification?
- Were tests compressed into helpers or deleted?
- Did any helper hide important domain behavior?
- Did Dexie/zod/zustand usage match the package’s actual purpose?
- Did stale grid/segment UI behavior improve and get covered?
- Did any user-visible label/test id/accessibility attribute change unexpectedly?
- Are there remaining high-risk simplifications that should be deferred instead of bundled?

## Completion Report

The monitoring agent must report:

- changed files,
- `git diff --stat`,
- net line-count delta,
- tests run and pass/fail,
- review findings,
- fixes after review,
- remaining cleanup opportunities before P1-07.
