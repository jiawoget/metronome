# F7-3 Mutation Hardening, Test Harness Boundary, and Final Closeout Plan

## Planning Status

Status: `planning_in_progress`

Planning branch: `codex/pack-f-f7-3-closeout-plan`

Scope type: Pack F / F7 substage plan-only PR for mutation hardening, diagnostics
and test harness boundary cleanup, and final Pack F closeout scans.

Model tier for future implementation/review/verification: `gpt-5.5`,
extra-high effort, standard speed, no fast-path assumptions.

This plan PR must not change product code, tests, package manifests, lockfiles,
dependency files, installed packages, or runtime behavior.

## Status Handling

No `docs/v1/status.json` edit is required for this plan PR.

Current post-PR-106 Pack F status:

- Pack F remains `implementation_in_progress`.
- F1 and F2 remain `verified`.
- F3, F4, F5, and F6 remain `implementation_done`.
- `F7-boundary-hardening-viewer-closeout` remains `coding_in_progress` and
  points to `docs/v1/implementation-slices/plans/F7-boundary-hardening-viewer-closeout.md`.

This F7-3 plan is a child planning artifact under the existing F7 parent slice.
It must not mark F7 or Pack F verified. The final F7-3 implementation PR may
move F7 to `implementation_done` only after all F7-3 implementation, scans, and
local verification pass. Pack F must remain `implementation_in_progress` until a
separate review and verification gate marks the pack verified.

## Required Reads Completed

- `docs/v1/START-HERE.md`
- `docs/v1/status.json`
- `docs/v1/implementation-slices/plans/F7-boundary-hardening-viewer-closeout.md`
- `docs/v1/implementation-slices/rules/external-library-first.md`
- `docs/v1/code-review-workflow.md`
- `tests/unit/architecture-boundaries.test.ts`

Focused current-state reads and scans used for this F7-3 plan:

```text
rg -n "@/infrastructure" src/components src/app src/hooks
rg -n "window\.|dispatchEvent|CustomEvent|__|TEST|test harness|harness|globalThis|setTimeout|addEventListener" src/components src/services src/lib tests/e2e
rg -n "async function handle(FileChange|Save|BatchImport|Delete|saveMetadataEdit|toggleFavorite|saveTags)|await browserSheetLibraryService|set(ImportState|DeletingId|FavoriteUpdatingId|TagSavingId)|try \{|catch|finally" src/components/sheet-library/sheet-library-experience.tsx
rg -n "deleteSheet|updateLastPracticedAt|getArtifact|clear|Result|ok: false|try \{|catch|batch|favorite|tags|metadata" src/services/sheet-library src/components/sheet-library tests/unit tests/e2e/sheet-library.spec.ts
rg -n "ensureQuickSession|ensureSheetSession|captureSessionEvent|updatePracticeSessionDuration|updateSheetSessionDuration|endPracticeSession|handleStopped|handleStop|try \{|catch|finally" src/components/quick-metronome/quick-metronome-experience.tsx src/components/sheet-practice/controls/sheet-practice-controls.tsx src/services/practice-session tests/unit tests/e2e
rg --files tests/unit tests/e2e | rg "(sheet-library|quick-metronome|sheet-practice|practice-session|recordings-review|architecture|viewer|recording)"
rg -n "SHEET_RECORDING_HARNESS_EVENT|SHEET_BAR_COUNT_IN|__sheetPractice|quick-metronome:scheduled-tick|recordings-review:playback|recordings-review:seek|reference-audio:state-change|active-recording-navigation|__metronome|__quick|__recordings|__reference|__sheet" src tests docs/v1
rg -n "timeSignature\.split|noteNames|chord|scale|interval|setTimeout|decodeAudioData|MediaRecorder" src
rg -n "eslint-disable|@ts-ignore|@ts-expect-error|TODO|FIXME" src tests
```

Current scan result to preserve:

- `rg -n "@/infrastructure" src/components src/app src/hooks` currently returns
  no hits after PR #106. F7-3 must preserve that zero-hit boundary.

## Current F7-3 Debt Inventory

| Area | Current evidence | Debt | F7-3 direction |
| --- | --- | --- | --- |
| Sheet Library import/save | `src/components/sheet-library/sheet-library-experience.tsx` catches preview import throws but `handleSave` awaits `sheetLibraryService.importSheet` without `try/catch/finally`. | A thrown import adapter or repository failure can leave import state stuck at `saving` and skip a user-facing error. | Either make `importSheet` catch expected adapter/repository failures into `{ ok: false, message }`, or wrap the UI caller in `try/catch/finally`. Prefer the smaller contract with explicit tests. |
| Sheet Library batch import | `handleBatchImport` awaits `importSheetsBatch`; service catches per-file import failures but not top-level service/repository failures outside each file loop. | A thrown batch call can leave state stuck at `batching`, with no batch result or message. | Keep per-file batch resilience and add top-level failure settlement. Do not drop successful-file behavior. |
| Sheet Library delete | `handleDelete` sets `deletingId`, awaits throw-through `deleteSheet`, then clears state after success. | A thrown delete leaves `deletingId` stuck and does not report the error. | Wrap caller with `try/catch/finally`, or change `deleteSheet` to a Result-returning mutation and update tests. Pick one contract and document it. |
| Sheet Library metadata edit | `saveMetadataEdit` awaits Result-returning `updateSheetMetadata`, but the service can throw through repository or artifact-inspection failures before returning a Result. | A thrown update bypasses the existing `!result.ok` UI path. | Make Result-returning sheet-library mutations catch expected repository/adapter failures, or add UI fallback catch. |
| Sheet Library favorite/tags | `toggleFavorite` and `saveTags` set row-level loading ids and clear them only in success or `!result.ok` branches. | A thrown service call leaves row action state stuck. | Add `finally` around row-level loading ids, with tests that a thrown service call resets the row and shows an error. |
| Sheet Library service contract | `SheetLibraryService` mixes Result-returning mutations (`importSheet`, batch import, metadata, favorite, tags) with throw-through utilities (`deleteSheet`, `updateLastPracticedAt`, `getArtifact`, `clear`). | The intended boundary is implicit, so callers do not know which calls must catch throws. | Document and test the split. Result-returning mutations should return `{ ok: false, message }` for expected validation/import/repository failures. Throw-through utility methods are allowed only when every UI caller settles state in `finally`. |
| Quick Metronome stop/session writes | `src/components/quick-metronome/quick-metronome-experience.tsx` `handleStopped` awaits `captureSessionEvent`, `updatePracticeSessionDuration`, or `endPracticeSession` before setting the stopped message. `captureSessionEvent` is best-effort in service, but duration/end can throw. | A stop flow can produce an unhandled rejection and skip UI message/session settlement if duration/end writes fail. | Wrap stop session writes in a narrow helper or local `try/catch`. The metronome should still be visibly stopped and the user should receive a recoverable message. |
| Quick recording save rollback | `quickRecordingController.saveCapturedQuickRecording` already owns rollback for artifact, metadata, and linked session failures, and tests cover rollback. | F7-3 must harden caller state without weakening rollback semantics. | Preserve existing controller rollback. Add only targeted tests for UI stop/session write failure and recording state settlement. |
| Sheet Practice stop/session writes | `src/components/sheet-practice/controls/sheet-practice-controls.tsx` `handleStopped` awaits `captureSessionEvent` and `updateSheetSessionDuration` before setting the stopped message. | A duration failure can skip the stopped message or produce an unhandled rejection after transport stopped. | Add narrow failure settlement. Keep bar count-in cleanup and recording-active messaging unchanged. |
| Sheet Practice harness duration update | The recording harness listener calls `sessionService.updateSheetSessionDuration(session.id).then(...)` without catch. | Test harness stop can create unhandled rejections and stale session state when duration update fails. | Add catch or reuse the same narrow session-settlement helper. Keep harness disabled outside the explicit E2E flag. |
| Test harness globals and events | Current surfaces include `__sheetPracticeControlsTestHarness`, `__sheetPracticeControlsBarCountIn`, `sheet-practice-controls:*`, `__metronomeManualSegmentPageTurnTimer`, `__metronomeSheetViewerService`, `quick-metronome:scheduled-tick`, `recordings-review:*`, `reference-audio:state-change`, and `metronome:active-recording-navigation`. | Some are product diagnostics and some are E2E-only controls, but ownership and allowed locations are not centralized. | Create or document one diagnostics/test boundary with names, owners, allowed producers/consumers, and removal conditions. Do not invent new ad hoc globals/events. |
| Final Pack F closeout | Current broad scans include expected hits: sheet category `scale`, Tone loop `interval`, approved `MediaRecorder`, approved `decodeAudioData`, viewer zoom `scale`, manual page-turn timer, reference player interval, UI playback reset timers, and two `no-img-element` eslint disables. | A zero-hit policy would be false-positive heavy, but unclassified hits are not acceptable for closeout. | Final F7-3 implementation must attach a classification table: resolved, approved exception, or blocking. Pack F cannot be verified while any scan hit is unclassified or blocking. |

## Implementation Scope For The Future F7-3 Coding PR

### 1. Define the mutation failure contract

Choose the smallest consistent contract and document it in code-adjacent tests or
service comments only where the tests alone are not enough.

Required decisions:

- Result-returning Sheet Library mutations:
  - `previewImport`
  - `importSheet`
  - `importSheetsBatch`
  - `updateSheetMetadata`
  - `updateSheetOrganization`
  - `setSheetTags`
  - `setSheetFavorite`
- Throw-through utilities:
  - `deleteSheet`
  - `updateLastPracticedAt`
  - `getArtifact`
  - `clear`

Preferred contract:

- Result-returning mutations catch expected validation, adapter, repository, and
  artifact-inspection failures and return `{ ok: false, message }`.
- Throw-through utilities may remain throw-through when their UI callers catch,
  show a user-facing error, and clear transient state in `finally`.
- `captureSessionEvent` remains best-effort and returns `null` on failure.
- Duration/end session writes may still throw; UI stop handlers must settle the
  visible transport state and user message.

No broad app-wide Result framework, dependency-injection rewrite, or storage
schema change is allowed.

### 2. Harden Sheet Library mutation UI

Likely files:

- `src/components/sheet-library/sheet-library-experience.tsx`
- `src/services/sheet-library/service.ts`
- `src/services/sheet-library/types.ts` only if the contract changes
- `tests/unit/sheet-library-experience.test.tsx`
- `tests/unit/sheet-library-service.test.ts`
- `tests/e2e/sheet-library.spec.ts` only for one high-value browser regression

Required behavior:

- Failed single import:
  - `importState` leaves `saving`.
  - selected files and preview are not silently discarded unless explicitly
    justified.
  - the user sees an error message.
- Failed batch import:
  - `importState` leaves `batching`.
  - successful per-file imports remain visible when only neighboring files fail.
  - top-level failure shows an error without pretending all files imported.
- Failed delete:
  - `deletingId` clears in `finally`.
  - the sheet row remains visible.
  - the user sees a delete failure message.
- Failed metadata edit:
  - edit mode remains recoverable.
  - saved row data is not optimistically changed.
  - the user sees a metadata failure message.
- Failed favorite/tags update:
  - `favoriteUpdatingId` or `tagSavingId` clears in `finally`.
  - current favorite/tags remain unchanged.
  - the user sees a row action failure message.

Acceptance tests:

- Unit tests in `sheet-library-experience.test.tsx` should inject throwing
  service methods and assert no stuck loading/deleting/saving state.
- Unit tests in `sheet-library-service.test.ts` should prove Result-returning
  mutations convert expected repository/adapter failures into `{ ok: false }`
  if the service contract is chosen.
- Keep existing batch import partial-success tests intact.

### 3. Harden Quick Metronome session stop paths

Likely files:

- `src/components/quick-metronome/quick-metronome-experience.tsx`
- `tests/unit/quick-metronome-session.test.ts`

Required behavior:

- When stopping metronome playback and `updatePracticeSessionDuration` or
  `endPracticeSession` rejects, the visible transport should still be stopped.
- The user should receive a recoverable session-save error message or status
  message; do not claim duration was persisted if it was not.
- Existing recording save rollback behavior must remain owned by
  `quickRecordingController`.
- `captureSessionEvent` remains best-effort; do not surface event-sink failures
  as blocking playback errors.

Acceptance tests:

- Add/adjust a unit test where stop succeeds at the transport layer but
  `endPracticeSession` rejects.
- Add/adjust a unit test where stop succeeds while recording is active but
  `updatePracticeSessionDuration` rejects.
- Keep existing tests for event capture ordering and recording rollback.

### 4. Harden Sheet Practice session stop and harness paths

Likely files:

- `src/components/sheet-practice/controls/sheet-practice-controls.tsx`
- `tests/unit/sheet-practice-controls.test.tsx`
- `tests/e2e/sheet-practice-controls.spec.ts` only if harness behavior changes

Required behavior:

- Bar count-in cleanup still happens on stop regardless of session write result.
- A stopped metronome should show a settled visible state even if
  `updateSheetSessionDuration` rejects.
- Recording-active stop copy remains distinct from normal stop copy.
- The recording harness duration update must not leave unhandled promise
  rejections.
- Harness controls remain hidden unless `__sheetPracticeControlsTestHarness` is
  explicitly enabled by tests.

Acceptance tests:

- Add/adjust a unit test where sheet metronome stop succeeds but
  `updateSheetSessionDuration` rejects.
- Add/adjust a unit test where the recording harness stop path sees a rejected
  duration update and does not produce an unhandled rejection.
- Preserve existing bar count-in and recording save failure tests.

### 5. Document or centralize diagnostics and E2E harness surfaces

Likely files:

- Prefer one small existing-structure file under `src/lib/**` or `src/services/**`
  if centralizing event/global names reduces spread.
- Alternatively add a narrow documentation file if moving names would cause a
  larger production diff than the risk justifies.
- `tests/unit/architecture-boundaries.test.ts` only if a new guardrail is needed.

Required boundary inventory:

- Product diagnostics:
  - `quick-metronome:scheduled-tick`
  - `recordings-review:playback`
  - `recordings-review:seek`
  - `recordings-review:timeupdate`
  - `reference-audio:state-change`
  - `metronome:active-recording-navigation`
- E2E-only controls or globals:
  - `__sheetPracticeControlsTestHarness`
  - `__sheetPracticeControlsBarCountIn`
  - `sheet-practice-controls:set-recording-harness-active`
  - `sheet-practice-controls:bar-count-in-plan`
  - `sheet-practice-controls:bar-count-in-blocked`
  - `sheet-practice-controls:bar-count-in-tick`
  - `__metronomeManualSegmentPageTurnTimer`
  - `__metronomeSheetViewerService`
  - `__referenceSystemUseFixtureSearch`
- Test-collected arrays on `window` are test-owned and do not need production
  owners, but the production events they observe do.

Acceptance criteria:

- Each production-emitted event or production-read global has an owner, allowed
  producer, allowed consumer, and reason.
- E2E-only surfaces are gated by existing test flags or environment checks.
- No new global/event names are introduced without adding them to the boundary.
- Diagnostics remain diagnostics; business services must not depend on
  Playwright-only globals.

### 6. Final Pack F scan and classification

The final F7-3 implementation PR must run the final scans from the F7 master
plan and attach a classification table to the PR:

```powershell
rg -n "@/infrastructure" src/components src/app src/hooks
rg -n "timeSignature\.split|noteNames|chord|scale|interval|setTimeout|decodeAudioData|MediaRecorder" src
rg -n "eslint-disable|@ts-ignore|@ts-expect-error|TODO|FIXME" src tests
```

Classification values:

- `resolved`: no action needed because the hit is removed or moved behind the
  approved owner.
- `approved exception`: hit remains with a reason, owner, and closeout
  condition.
- `blocking`: Pack F cannot be verified until fixed or reviewed into an
  approved exception.

Minimum expected classifications to revisit after implementation:

- `@/infrastructure` in `src/components src/app src/hooks`: must remain zero
  hits, unless a reviewed F7 closeout exception is added with reason and owner.
- `scale` in sheet category and viewer zoom/PDF sizing: likely approved
  non-music-domain or viewer-transform usage.
- Tone loop `interval`: approved Tone adapter primitive.
- `MediaRecorder`: approved browser capture adapter only.
- `decodeAudioData`: approved shared decode adapter only.
- browser timers:
  - app shell navigation guard delay
  - recordings review client-ready delay
  - manual segment page-turn timer
  - reference playback UI reset/progress timers
  - quick latest-recording playback reset timers
  - sheet metronome preset feedback timer
  - sheet-practice non-audio hydration/harness timers
- `eslint-disable @next/next/no-img-element`: viewer image rendering and
  thumbnails only, or remove if a native alternative preserves behavior.

Any unclassified hit blocks Pack F verification.

## Out Of Scope

- No product code, test, package, lockfile, or dependency changes in this plan
  PR.
- No package installs.
- No new audio, music, metronome, countdown, reference, waveform, PDF, or
  recording primitive implementation.
- No A-B loop, reference-synced page turning, automatic score following,
  automatic PDF recognition, automatic mistake detection, or user-facing
  scoring.
- No storage schema migration.
- No UI redesign, route restructure, app shell rewrite, or large visual restyle.
- No weakening architecture tests, negative tests, rollback tests, or final scan
  requirements to make closeout pass.
- No broad Result framework or dependency-injection framework.

## Required Future Verification

Run from repo root after the F7-3 implementation PR:

```powershell
git diff --check
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/architecture-boundaries.test.ts tests/unit/sheet-library-experience.test.tsx tests/unit/sheet-library-service.test.ts tests/unit/quick-metronome-session.test.ts tests/unit/sheet-practice-controls.test.tsx tests/unit/sheet-practice-recording.test.ts tests/unit/practice-session-service.test.ts tests/unit/practice-session-repository.test.ts tests/unit/recordings-review-artifact-storage.test.ts
& .\scripts\npm-local.ps1 --% run test:e2e -- tests/e2e/sheet-library.spec.ts tests/e2e/quick-metronome.spec.ts tests/e2e/sheet-practice-controls.spec.ts tests/e2e/sheet-segment-recording.spec.ts tests/e2e/sheet-viewer.spec.ts tests/e2e/recordings-review.spec.ts
& .\scripts\npm-local.ps1 --% run lint
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run test:unit
& .\scripts\npm-local.ps1 --% run build
& .\scripts\npm-local.ps1 --% run test:e2e
& .\scripts\npm-local.ps1 --% run smoke
```

Also run and classify:

```powershell
rg -n "@/infrastructure" src/components src/app src/hooks
rg -n "timeSignature\.split|noteNames|chord|scale|interval|setTimeout|decodeAudioData|MediaRecorder" src
rg -n "eslint-disable|@ts-ignore|@ts-expect-error|TODO|FIXME" src tests
```

If `test:e2e`, `build`, or `smoke` cannot run because of local environment
state, the F7-3 implementation PR must record the blocker and cannot be treated
as Pack F verified without an owner-approved equivalent gate.

## Plan PR Verification

Required for this plan-only PR:

```powershell
git diff --check
Get-Content docs\v1\status.json -Raw | ConvertFrom-Json | Out-Null; Write-Output 'docs/v1/status.json parsed OK'
git diff --cached --check
```

Product tests are intentionally not required for this plan-only PR because it
does not change production code or tests.

## Handoff Instructions For The F7-3 Coding Agent

Read only these files first:

```text
docs/v1/START-HERE.md
docs/v1/status.json
docs/v1/implementation-slices/plans/F7-boundary-hardening-viewer-closeout.md
docs/v1/implementation-slices/plans/F7-3-mutation-harness-final-closeout.md
docs/v1/implementation-slices/rules/external-library-first.md
docs/v1/code-review-workflow.md
tests/unit/architecture-boundaries.test.ts
src/components/sheet-library/sheet-library-experience.tsx
src/services/sheet-library/service.ts
src/services/sheet-library/types.ts
src/components/quick-metronome/quick-metronome-experience.tsx
src/components/sheet-practice/controls/sheet-practice-controls.tsx
src/services/practice-session/service.ts
src/services/practice-session/types.ts
tests/unit/sheet-library-experience.test.tsx
tests/unit/sheet-library-service.test.ts
tests/unit/quick-metronome-session.test.ts
tests/unit/sheet-practice-controls.test.tsx
tests/unit/sheet-practice-recording.test.ts
```

Then:

1. Implement only F7-3 mutation hardening, diagnostics/test harness boundary
   cleanup, and final Pack F closeout scan classification.
2. Preserve the zero-hit UI/app/hook infrastructure import guardrail.
3. Preserve existing recording rollback semantics.
4. Keep `captureSessionEvent` best-effort.
5. Keep user-visible state settling even when duration/end session writes fail.
6. Do not mark Pack F verified in the coding PR.

If the implementation would exceed roughly 500 production LOC, split F7-3 again
before coding rather than hiding multiple changes in one closeout PR.
