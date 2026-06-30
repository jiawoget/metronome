# D1 Main Codebase Slimming Follow-Up Plan

## Purpose

This is a docs/status-only planning artifact for a new slimming workstream after
Pack C. It does not authorize implementation yet.

The goal is to turn the current `main` line/function scan and the web ChatGPT
review into a small, reviewable sequence of slices. Implementation starts only
after this plan is reviewed in the web ChatGPT `metronome` project and the user
approves execution.

## Status

- Workstream: `pack-d-codebase-slimming-follow-up`
- Current lifecycle state: `in_progress`
- Source of truth: `docs/v1/status.json`
- Baseline branch: `main`
- Baseline commit: `1c81f70c` (`Merge pull request #17 from jiawoget/codex/v1-c2-full-e2e-stabilization`)
- Previous workstream: `pack-c-codebase-slimming` is `verified`
- Plan review: pending web ChatGPT review

## Baseline Evidence

Local scan on current `main`:

- Tracked files: 375
- Text tracked files: 367
- Total text lines: 91,531
- Nonblank text lines: 78,526

Line count by category:

- `docs`: 121 files, 32,849 lines
- `tests`: 64 files, 26,174 lines
- `src`: 157 files, 21,906 lines
- `root/config`: 15 files, 10,120 lines, mostly `package-lock.json`
- `scripts`: 6 files, 467 lines
- `test-fixtures`: 4 files, 15 lines

AST/function scan:

- Total functions/functions blocks: 3,418
- Function lines: 69,445
- Functions/blocks >= 80 lines: 132
- Functions/blocks >= 150 lines: 62
- `src`: 1,448 functions, 24,120 function lines
- `tests/e2e`: 551 functions, 12,051 function lines
- `tests/unit`: 1,375 functions, 32,912 function lines

Important local evidence:

- Existing E2E fixtures:
  - `tests/e2e/fixtures/sheets.ts#importTestSheet`
  - `tests/e2e/fixtures/storage.ts#clearDatabases`
  - `tests/e2e/fixtures/storage.ts#clearRecordingHistory`
  - `tests/e2e/fixtures/storage.ts#readRecordingHistory`
  - `tests/e2e/fixtures/storage.ts#seedRecordingHistory`
  - `tests/e2e/fixtures/audio.ts#installSyntheticMicrophone`
  - `tests/e2e/fixtures/recordings-review.ts` recording-review factories and artifact seeding
- Remaining local E2E helper duplication:
  - `importSheet` in several sheet/practice E2E specs
  - `clearState` wrappers across sheet-practice/reference/measure-grid specs
  - `getPracticeSnapshot` implementations across sheet-practice/reference specs
- Remaining source helper duplication:
  - `normalizeRequiredString(value: unknown)` in several `src/lib/recordings-review/*` modules
  - a semantically different throwing `normalizeRequiredString(value: string, label: string)` in `src/infrastructure/db/recording-artifact-repository.ts`
- Tempting but likely false-positive slimming:
  - large React component splitting
  - shared Dexie `getDatabase()` abstraction
  - `package-lock.json` size

## Web ChatGPT Review Summary Used For This Plan

The web ChatGPT `metronome` project reviewed the local scan and returned:

- Verdict: `PROCEED_NARROWLY`
- Do not restart a broad Pack C-style slimming pass.
- Do not start from large component splitting.
- First recommended slice: E2E sheet import helper adoption.
- Next candidates:
  - E2E storage cleanup helper consolidation
  - E2E practice snapshot reader helper
  - narrow recordings-review string normalization helper
- Deferred/no-go:
  - large React component splitting
  - shared Dexie `getDatabase()` abstraction
  - DB artifact repository normalization helper merge
  - broad unit recording-review fixture cleanup without a per-file semantic checklist
  - docs/v0 or historical plan deletion without reference analysis
  - package-lock slimming

## Workstream Rules

1. Every slice must have a plan file under `docs/v1/implementation-slices/plans/`.
2. The full plan text must be sent to the web ChatGPT `metronome` project for review before coding.
3. Coding starts only after a `PASS` or after required changes are applied and re-reviewed.
4. Each slice is implemented in a small PR.
5. Every PR gets web ChatGPT PR review before merge.
6. No implementation PR may claim slimming from formatting, line wrapping, import sorting, or splitting files without net maintenance reduction.
7. Every PR description must include before/after accounting:
   - implementation files changed
   - plan/status files changed
   - helper bodies removed or retained
   - shared helper adopted or added
   - assertions touched: yes/no
   - net implementation LOC, excluding docs/status
8. Every 3 completed slices require a manual E2E checkpoint before continuing.
   - After D1-03: run full local E2E plus a manual Chrome/local-app smoke path for the E2E areas touched by D1-01 through D1-03.
   - After D1-06 / workstream closeout: run full local E2E plus a manual Chrome/local-app smoke path before reporting the whole goal complete.
9. If any slice produces zero or negative net value after inventory, it must be re-scoped or closed as no-go by review, not forced into a fake cleanup.
10. `pack-d-codebase-slimming-follow-up` may be marked `verified` only after D1-06 closeout has passed full unit, full E2E, and manual Chrome/local-app smoke verification.

## Slice Sequence

### D1-01 E2E Sheet Import Helper Adoption

Goal:

- Delete duplicate local `importSheet(...)` helper bodies in E2E specs by using the existing `importTestSheet(...)` fixture.

Allowed implementation files:

- `tests/e2e/sheet-practice-controls.spec.ts`
- `tests/e2e/practice-session.spec.ts`
- `tests/e2e/sheet-practice-session.spec.ts`
- `tests/e2e/sheet-viewer.spec.ts`
- `tests/e2e/sheet-recording-review.spec.ts`
- `tests/e2e/fixtures/sheets.ts` only if a tiny generally useful option is required

Explicit non-scope:

- No `src/**`
- No `clearState`
- No `getPracticeSnapshot`
- No artifact IndexedDB seeding
- No `tests/unit/**`
- No assertion deletion or timing relaxation

Expected net implementation LOC:

- Approximately 70-120 LOC reduction.

Verification:

```powershell
& .\scripts\npm-local.ps1 --% run test:e2e -- sheet-practice-controls.spec.ts practice-session.spec.ts sheet-practice-session.spec.ts sheet-viewer.spec.ts sheet-recording-review.spec.ts
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint
git diff --check
```

### D1-02 E2E Clear-State Storage Helper Consolidation

Goal:

- Replace duplicate local `clearState(...)` / `deleteDatabase(...)` E2E cleanup helpers with existing storage fixture primitives.

Candidate files:

- `tests/e2e/measure-grid-calibration.spec.ts`
- `tests/e2e/reference-system.spec.ts`
- `tests/e2e/practice-segment-selector.spec.ts`
- `tests/e2e/sheet-segment-recording.spec.ts`
- `tests/e2e/sheet-recording-review.spec.ts`
- `tests/e2e/sheet-practice-integration.spec.ts`
- `tests/e2e/fixtures/storage.ts` only if a tiny export is needed

Risk:

- Medium. Some specs depend on exact cleanup order, reload/goto timing, and artifact DB inclusion.

Required plan constraints:

- Inventory each local helper before editing.
- Preserve each spec's database list and localStorage cleanup semantics.
- Do not touch practice snapshot readers in this slice.
- Do not touch import helpers in this slice after D1-01.
- Do not collapse all cleanup into a generic scenario DSL.

Targeted verification:

```powershell
& .\scripts\npm-local.ps1 --% run test:e2e -- reference-system.spec.ts measure-grid-calibration.spec.ts practice-segment-selector.spec.ts sheet-segment-recording.spec.ts
& .\scripts\npm-local.ps1 --% run test:e2e -- sheet-recording-review.spec.ts sheet-practice-integration.spec.ts
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint
git diff --check
```

### D1-03 E2E Practice Snapshot Reader Helper

Goal:

- Add a narrow E2E snapshot reader helper for practice-session IndexedDB rows and recording-history localStorage rows.

Candidate files:

- `tests/e2e/reference-system.spec.ts`
- `tests/e2e/sheet-practice-controls.spec.ts`
- `tests/e2e/sheet-practice-session.spec.ts`
- `tests/e2e/sheet-practice-integration.spec.ts`
- optional new `tests/e2e/fixtures/practice.ts`

Risk:

- Medium. The specs need slightly different returned shapes: sessions only, sessions plus recordings, and sometimes error markers.

Required plan constraints:

- Prefer one raw snapshot reader with explicit per-test assertions.
- Do not create a generic query DSL.
- Keep object shape expectations visible in tests.
- Preserve handling for missing/nonexistent `sessions` object store.

Targeted verification:

```powershell
& .\scripts\npm-local.ps1 --% run test:e2e -- reference-system.spec.ts sheet-practice-controls.spec.ts sheet-practice-session.spec.ts sheet-practice-integration.spec.ts
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint
git diff --check
```

Mandatory checkpoint after D1-03:

```powershell
& .\scripts\npm-local.ps1 --% run test:e2e
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint
git diff --check
```

Also run a manual Chrome/local-app smoke covering:

- sheet import into Sheet Library
- opening Sheet Practice from the imported sheet
- recording/session persistence if the local app can be run normally
- Recordings Review route remains usable after the helper changes

### D1-04 Recordings-Review String Normalization Helper

Goal:

- Consolidate only the identical `unknown -> trimmed non-empty string | null` helper repeated inside `src/lib/recordings-review/*`.

Candidate files:

- `src/lib/recordings-review/recording-organization-metadata.ts`
- `src/lib/recordings-review/waveform-comparison-sources.ts`
- `src/lib/recordings-review/take-groups.ts`
- `src/lib/recordings-review/take-selection-metadata.ts`
- optional new or existing tiny helper under `src/lib/recordings-review/`

Explicit non-scope:

- Do not touch `src/infrastructure/db/recording-artifact-repository.ts`; its helper throws labeled validation errors and is not semantically equivalent.
- Do not introduce a broad validation library or adapter.
- Do not accept the change unless actual diff accounting shows net reduction or meaningful maintenance-surface reduction.
- If adding a helper file means D1-04 does not produce net LOC reduction or clearer maintenance ownership, close the slice as no-go instead of merging a zero-value abstraction.

Targeted verification:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- recordings-review-take-groups.test.ts recordings-review-waveform-comparison-sources.test.ts recordings-review-repository.test.ts
& .\scripts\npm-local.ps1 --% run test:unit
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint
git diff --check
```

### D1-05 Unit Recording Fixture Residual Audit

Goal:

- Re-check the remaining unit recording-review fixture duplication after C2-07, C2-08, and C2-10.

Default expected outcome:

- This is an audit-first slice. It may close as no-go with no code if the only remaining opportunities would hide behavior evidence or add helper complexity.

Candidate areas:

- `tests/unit/recordings-review-experience.test.tsx`
- `tests/unit/recordings-review-take-groups.test.ts`
- `tests/unit/recordings-review-waveform-comparison-sources.test.ts`
- `tests/unit/recordings-review-audio-export.test.ts`
- `tests/unit/recordings-review-repository.test.ts`

Required plan constraints:

- Start with a per-file semantic checklist.
- Identify exact duplicate fixture bodies before proposing edits.
- Do not weaken assertions or hide negative cases.
- Do not create broad in-memory repository helpers.
- If a low-risk narrow edit exists, create a separate implementation plan and web ChatGPT review before coding.

Verification if code changes are approved:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- recordings-review-experience.test.tsx recordings-review-take-groups.test.ts recordings-review-waveform-comparison-sources.test.ts recordings-review-audio-export.test.ts recordings-review-repository.test.ts
& .\scripts\npm-local.ps1 --% run test:unit
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint
git diff --check
```

### D1-06 Deferred No-Go Validation And Closeout

Goal:

- Close the workstream deliberately by validating the tempting but risky/no-go candidates instead of letting them reappear as vague "more slimming" work.

Required checks:

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

Expected outcome:

- Usually no production/test code change.
- Possible docs/status-only closeout recording why each no-go remains deferred.
- Any proposed deletion must prove reference safety and go through separate plan review.

Mandatory closeout verification:

```powershell
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint
& .\scripts\npm-local.ps1 --% run test:unit
& .\scripts\npm-local.ps1 --% run test:e2e
git diff --check
```

Also run a final manual Chrome/local-app smoke before marking the goal complete.

## Explicit No-Go List

These are not implementation targets for this pack unless a later reviewed plan
proves real net deletion and boundary safety:

- Large component splitting when it only moves code between files.
- Shared Dexie `getDatabase()` adapter across typed repositories.
- Merging the DB artifact repository's throwing validator with recordings-review null-returning normalization.
- Package-lock line-count slimming.
- Deleting docs/v0 or old plan files solely because docs dominate line count.
- Any fixture helper that hides missing-artifact, unsupported-MIME, decode-failed, corruption, ownership, cleanup, or rollback evidence.

## Review Questions For Web ChatGPT

1. Does this Pack D scope correctly preserve Pack C as verified instead of reopening it?
2. Are the six slices small enough and ordered correctly?
3. Should D1-05 and D1-06 remain audit/closeout slices, or should they be removed from the implementation workstream?
4. Is the every-3-slices manual E2E checkpoint strong enough?
5. Is D1-01 safe to become the first implementation slice after plan approval?
6. Are any candidates missing from the local scan and prior web ChatGPT review?
7. Are any candidates fake slimming or too likely to add code?
