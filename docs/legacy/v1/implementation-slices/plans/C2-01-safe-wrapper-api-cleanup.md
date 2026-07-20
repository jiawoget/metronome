# C2-01 Safe Wrapper/API Cleanup Plan

## Status

- Workstream: `pack-c-codebase-slimming`
- Slice: `C2-01 safe-wrapper-api-cleanup`
- Current lifecycle state: `planning_in_progress`
- Parent plan: `docs/v1/implementation-slices/plans/C2-main-codebase-slimming-plan.md`
- Baseline expectation: current `main` after Pack 1 and Pack 2 are verified.

## Goal

Remove low-value wrapper/barrel code and stale public recording-review API
without changing user-visible recording behavior.

This is the first implementation PR from the C2 slimming plan. It intentionally
does not delete legacy `audioDataUrl` migration/fallback and does not change the
recording artifact storage model.

## In Scope

1. Delete `src/lib/recordings-review/artifact-service.ts`.
2. Replace its import sites with direct imports from focused modules.
3. Delete `src/lib/quick-metronome/artifact-controller.ts` by folding its two
   use-case methods into the existing quick recording controller boundary.
4. Remove stale `recordingHistoryRepository.getArtifact()` if no production
   code depends on it.
5. Remove `saveSheetReviewRecordingMetadata` if it is truly unused outside the
   repository operation bundle.
6. Relax over-specific architecture-boundary tests that ban function names, but
   keep meaningful module/path boundaries.

## Out Of Scope

- No legacy `audioDataUrl` migration deletion.
- No `artifact-data-url.ts` deletion.
- No runtime fallback deletion from `artifact-storage.ts`.
- No metadata/session type split.
- No sheet recording direct Blob/body decode.
- No artifact body/details single-resolve refactor.
- No quick/sheet transaction or rollback helper extraction.
- No fixture slimming or broad E2E rewrite.

## Current Findings

### `artifact-service.ts`

Current file is a pure barrel:

- re-exports artifact model types/errors;
- re-exports `dataUrlToRecordingArtifactBlob`;
- re-exports artifact detail helpers;
- re-exports legacy migration;
- re-exports artifact storage helpers.

Known direct import sites:

- `src/lib/sheet-practice/recording-service.ts`
- `src/services/recordings-review/index.ts`
- `src/lib/quick-metronome/recording-controller.ts`
- `src/lib/recordings-review/waveform-comparison-sources.ts`
- `src/lib/recordings-review/audio-export.ts`
- `src/lib/recordings-review/artifact-review-controller.ts`
- `src/infrastructure/db/recording-history-metadata-repository.ts`
- `tests/unit/recordings-review-history.test.ts`
- `tests/unit/recordings-review-artifact-storage.test.ts`

Replacement import targets:

| Symbol | Direct module |
| --- | --- |
| `RecordingArtifactBody` | `@/lib/recordings-review/artifact-model` |
| `RecordingArtifactUnavailableReason` | `@/lib/recordings-review/artifact-model` |
| `RecordingArtifactError` | `@/lib/recordings-review/artifact-model` |
| `dataUrlToRecordingArtifactBlob` | `@/lib/recordings-review/artifact-data-url` |
| `derivePeaksFromSamples` | `@/lib/recordings-review/artifact-details` |
| `getDurationWarning` | `@/lib/recordings-review/artifact-details` |
| `hasUsablePeaks` | `@/lib/recordings-review/artifact-details` |
| `loadRecordingArtifactDetails` | `@/lib/recordings-review/artifact-details` |
| `RecordingArtifactMigrationResult` | `@/lib/recordings-review/artifact-migration` |
| `migrateLegacyRecordingArtifacts` | `@/lib/recordings-review/artifact-migration` |
| `assertRecordingArtifactCleanup` | `@/lib/recordings-review/artifact-storage` |
| `cleanupCommittedRecordingArtifacts` | `@/lib/recordings-review/artifact-storage` |
| `createRecordingArtifactRef` | `@/lib/recordings-review/artifact-storage` |
| `resolveRecordingArtifactBody` | `@/lib/recordings-review/artifact-storage` |
| `saveCapturedRecordingArtifact` | `@/lib/recordings-review/artifact-storage` |

### `quick-metronome/artifact-controller.ts`

Current file is a rename wrapper:

- `migrateQuickRecordingArtifacts()` calls `migrateLegacyRecordingArtifacts()`.
- `resolveQuickRecordingArtifactBody()` calls `resolveRecordingArtifactBody()`.

Known direct import sites:

- `src/components/quick-metronome/quick-metronome-experience.tsx`
- `src/components/quick-metronome/latest-quick-recording.tsx`

Implementation must not make React components import the low-level artifact
modules directly.

Instead, fold the two methods into the existing quick recording controller
boundary:

- `src/lib/quick-metronome/recording-controller.ts` imports
  `migrateLegacyRecordingArtifacts` from
  `@/lib/recordings-review/artifact-migration` and exposes a narrow controller
  method such as `migrateRecordingArtifacts()`.
- `src/lib/quick-metronome/recording-controller.ts` imports
  `resolveRecordingArtifactBody` from
  `@/lib/recordings-review/artifact-storage` and exposes a narrow controller
  method such as `resolveRecordingArtifactBody(recording, options)`.
- `quick-metronome-experience.tsx` calls the quick recording controller method
  instead of importing artifact migration/storage modules.
- `latest-quick-recording.tsx` calls the quick recording controller method
  instead of importing artifact migration/storage modules.

Do not create a new generic quick artifact facade. The only acceptable folding
target is the existing quick recording use-case boundary or an already-existing
service/controller boundary with concrete quick-recording semantics.

### Stale Repository API

`recordingHistoryRepository.getArtifact(recordingId)` currently returns
`this.getRecording(recordingId)?.audioDataUrl ?? null`.

It appears to be test-only legacy surface, but implementation must confirm with
`rg "recordingHistoryRepository\\.getArtifact|getArtifact\\(" src tests` and
must not remove unrelated `getArtifact()` methods from sheet-library or
recording-artifact repositories.

Expected handling:

- remove `recordingHistoryRepository.getArtifact()` from
  `src/lib/recordings-review/repository.ts` if only obsolete tests use it;
- update or delete the tests in
  `tests/unit/recordings-review-repository.test.ts` that only assert this
  legacy helper;
- keep tests for persisted metadata omitting `audioDataUrl` through the real
  recording metadata/snapshot APIs.

`saveSheetReviewRecordingMetadata` appears exposed from
`recordingHistoryRepository` but should be unused now that sheet recording saves
go through `saveSheetRecordingMetadataWithSession`.

Expected handling:

- confirm no production or test caller uses
  `recordingHistoryRepository.saveSheetReviewRecordingMetadata`;
- confirm it is not re-exported from any public service/index module;
- confirm it is not used through aliasing/destructuring of
  `recordingHistoryRepository` or `recordingHistoryOperations`;
- if unused, remove the repository export and the underlying helper from
  `recording-history-operations.ts`;
- keep `saveSheetRecordingMetadataWithSession` unchanged.

## Architecture Boundary Test Plan

Update `tests/unit/architecture-boundaries.test.ts` so it protects module
boundaries instead of specific function names.

Keep bans for:

- UI importing concrete recording repositories;
- UI importing Dexie;
- UI importing browser audio/capture infrastructure;
- UI importing raw artifact repository/storage modules where the UI should stay
  behind a service/controller boundary;
- Recordings Review UI importing artifact storage, migration, or decode/detail
  modules directly instead of using its controller/service boundaries;
- app/server layers importing browser recording storage;
- local PDF worker requirements.

Remove or narrow bans that only check function names:

- `loadRecordingArtifactDetails`
- `resolveRecordingArtifactBody`

For React components, keep path/module bans instead of allowing direct low-level
artifact imports. This slice should not introduce a new global ban on existing
browser service singletons that current Pack 1/2 UI already uses; keep the
boundary focused on raw artifact/repository/storage modules. Quick Metronome UI
should not import:

- `@/lib/recordings-review/repository`
- `@/lib/recordings-review/artifact-storage`
- `@/lib/recordings-review/artifact-migration`
- concrete recording repositories
- browser recording storage/capture infrastructure

Quick Metronome UI should remain behind `quickRecordingController` or another
explicit quick-recording use-case boundary. Delete function-name bans only when
the module/path boundary still prevents React from reaching raw storage,
migration, or repository modules.

## Acceptance Criteria

- `artifact-service.ts` is deleted.
- `quick-metronome/artifact-controller.ts` is deleted.
- No source or test file imports `@/lib/recordings-review/artifact-service`.
- No source or test file imports `@/lib/quick-metronome/artifact-controller`.
- No new barrel/facade module replaces either deleted file.
- Quick React components do not import `@/lib/recordings-review/artifact-storage`
  or `@/lib/recordings-review/artifact-migration`.
- Existing architecture tests continue to ban React components from direct raw
  artifact storage/migration/repository imports.
- `recordingHistoryRepository.getArtifact()` is removed only if trace confirms
  it is stale and test-only.
- `saveSheetReviewRecordingMetadata` is removed only if trace confirms it is
  unused.
- Verified Pack 1/2 behavior remains unchanged.
- Legacy `audioDataUrl` migration/fallback remains present.
- Missing artifact, unsupported MIME, decode failed, empty audio, cleanup, and
  rollback behavior remain unchanged.

## Implementation Steps

1. Run focused traces:
   - `rg -n "artifact-service|quick-metronome/artifact-controller" src tests`
   - `rg -n "recordingHistoryRepository\\.getArtifact|saveSheetReviewRecordingMetadata" src tests`
   - `rg -n "getArtifact|saveSheetReviewRecordingMetadata|recordingHistoryOperations" src tests`
2. Replace `artifact-service.ts` imports with direct module imports.
3. Move the quick artifact-controller methods into the existing
   `quickRecordingController` boundary.
4. Delete the two wrapper files.
5. Remove stale repository API only after trace confirms no real caller.
6. Adjust obsolete tests that assert the stale API instead of real persisted
   behavior.
7. Update architecture boundary tests to protect paths/modules rather than
   function names.
8. Run targeted tests, then broad verification.

## Verification Plan

Targeted:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- architecture-boundaries.test.ts recordings-review-repository.test.ts recordings-review-history.test.ts recordings-review-artifact-storage.test.ts sheet-practice-recording.test.ts quick-metronome-session.test.ts
& .\scripts\npm-local.ps1 --% run test:unit -- browser-settings-local-data-service.test.ts
```

Broad:

```powershell
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint
& .\scripts\npm-local.ps1 --% run build
& .\scripts\npm-local.ps1 --% run test:unit
& .\scripts\npm-local.ps1 --% run test:e2e -- recordings-review.spec.ts sheet-recording-review.spec.ts sheet-segment-recording.spec.ts quick-metronome.spec.ts
```

## Risks

- Direct imports may accidentally let UI depend on low-level artifact storage.
  Mitigation: keep architecture tests path-based.
- Removing `getArtifact()` may delete a legacy assertion without preserving the
  real invariant. Mitigation: keep tests that verify persisted metadata omits
  `audioDataUrl`.
- Removing `saveSheetReviewRecordingMetadata` may be unsafe if hidden tests call
  it as public API. Mitigation: delete only after local trace confirms it is not
  part of the planned public service boundary.
- Boundary tests may become too weak. Mitigation: keep repository, Dexie,
  artifact storage, artifact migration, MediaRecorder, Tone, and browser storage
  bans.

## Coding Handoff

Implement this as a small cleanup PR only. Do not advance to C2-02 in the same
PR. Do not create a generic artifact service replacement. If the import rewrite
causes a larger architectural question, stop and update the plan instead of
expanding scope.

After implementation, update `docs/v1/status.json` through the normal lifecycle
and request a web ChatGPT PR review before merge.
