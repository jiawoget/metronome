# C2-04 Legacy Audio Data URL Deletion Plan

## Status

- Workstream: `pack-c-codebase-slimming`
- Slice: `C2-04 legacy-audio-data-url-deletion`
- Lifecycle: `planning_in_progress`
- Baseline branch: `main`
- Baseline commit: `6a895375`
- Parent plan: `docs/v1/implementation-slices/plans/C2-main-codebase-slimming-plan.md`
- Prerequisites already merged:
  - C2-02: metadata-only sheet rows no longer fake `ReviewRecording`.
  - C2-03: sheet save decodes from captured blobs and persists artifactRef-only metadata.

## Gate: Legacy Data Policy

The parent C2 plan records the required policy before legacy deletion:

```text
Legacy data policy:
- This app has not been formally released.
- Existing developer-era localStorage `audioDataUrl` recordings may be dropped.
- No migration/fallback for `audioDataUrl` will be preserved.
- New persisted recording metadata must be artifactRef-only.
```

This slice treats that recorded parent-plan decision as the data-policy gate for
implementation. If external review says this policy still needs a separate
human reaffirmation before code changes, stop before implementation and ask the
user explicitly.

## Problem

The app still carries two forms of legacy `audioDataUrl` compatibility:

- Startup migration:
  - `src/lib/recordings-review/artifact-migration.ts`
  - `src/lib/recordings-review/artifact-data-url.ts`
  - `migrateLegacyArtifacts()` and `migrateRecordingArtifacts()` public service/controller methods
  - repository write-session helpers used only by that migration
- Runtime fallback:
  - `resolveRecordingArtifactBody()` accepts missing/broken `artifactRef` if
    `recording.audioDataUrl` can be decoded.
  - `persistLegacyFallback` can write that decoded fallback into artifact storage.
  - export and waveform eligibility still consider `audioDataUrl` a local artifact.

After C2-02 and C2-03, new user recordings should be artifactRef-only. Keeping
the legacy data URL path adds code, error states, tests, and ambiguity around
what persisted review metadata means.

## Scope

Delete the legacy persisted-data URL support path:

1. Remove startup migration.
   - Delete `artifact-migration.ts`.
   - Delete `artifact-data-url.ts`.
   - Remove migration imports, service/controller methods, and UI mount calls:
     - `src/services/recordings-review/index.ts`
     - `src/lib/quick-metronome/recording-controller.ts`
     - `src/components/recordings-review/use-recordings-review-controller.ts`
     - `src/components/quick-metronome/quick-metronome-experience.tsx`
   - Remove `beginLegacyArtifactMigrationWrite()` and
     `commitLegacyArtifactMigrationWrite()` from `recording-history/repository`
     only if no longer referenced.

2. Make artifact body resolution artifactRef-only.
   - Remove `recording.audioDataUrl` fallback from
     `src/lib/recordings-review/artifact-storage.ts`.
   - Remove the `persistLegacyFallback` option.
   - Keep existing artifactRef error behavior for:
     - `missing-artifact-ref`
     - `missing-artifact-body`
     - `unsupported-mime`
     - `storage-unavailable`
     - `quota-exceeded`

3. Remove legacy-only error and metadata surface.
   - Remove `legacy-artifact-malformed` from
     `RecordingArtifactUnavailableReason`.
   - Remove migration-only provenance metadata from:
     - `LocalRecordingArtifact.legacyMigratedFrom`;
     - `toLocalArtifact(...)` input;
     - tests that only assert migrated provenance.
   - Do not change the IndexedDB schema or version solely for that optional
     field removal. Existing rows with an extra ignored property may remain.
   - Update export/waveform eligibility to require `artifactRef`, not
     `audioDataUrl`.

4. Update tests narrowly.
   - Delete migration-specific tests from
     `tests/unit/recordings-review-artifact-storage.test.ts`.
   - Convert runtime fallback tests into artifactRef-only missing-body/ref tests.
   - Update `tests/unit/recordings-review-history.test.ts` for the artifactRef-only
     detail loading and missing/decode/duration error boundaries it already owns.
   - Update audio export tests so old `audioDataUrl`-only recordings are
     ineligible rather than exported or parsed.
   - Update waveform comparison source tests so `audioDataUrl` no longer makes a
     source eligible.
   - Add/keep explicit acceptance coverage that:
     - an `audioDataUrl`-only recording with no `artifactRef` is ineligible with
       `missing-artifact`, even when the data URL looks valid;
     - a recording with `artifactRef` but missing IndexedDB body reports
       `missing-artifact-body` at resolver/detail-loading boundaries and export
       reports `missing-artifact`, with no legacy fallback.
   - Remove stale architecture-boundary bans that mention deleted migration APIs.

## Explicit Non-Scope

- Do not remove `audioDataUrl` from the shared `ReviewRecording` or
  `QuickRecording` TypeScript shapes in this PR. It is still used by
  non-persisted demo playback and many fixtures. A broader type/fixture cleanup
  belongs in C2-07.
- Do not rewrite e2e fixture factories in this slice unless a compile/test
  failure proves a small local edit is required.
- Do not change artifact storage schema or delete existing IndexedDB artifact
  rows. Existing artifactRef-backed recordings should keep working.
- Do not alter save/rollback transaction behavior for quick or sheet recordings.
- Do not introduce a compatibility shim or no-op migration facade; deleted
  legacy APIs should be removed from callers.

## Expected File Touches

- Delete:
  - `src/lib/recordings-review/artifact-data-url.ts`
  - `src/lib/recordings-review/artifact-migration.ts`
- Update:
  - `src/lib/recordings-review/artifact-storage.ts`
  - `src/lib/recordings-review/artifact-model.ts`
  - `src/lib/recordings-review/audio-export.ts`
  - `src/lib/recordings-review/waveform-comparison-sources.ts`
  - `src/lib/recordings-review/repository.ts`
  - `src/infrastructure/db/recording-artifact-repository.ts`
  - `src/services/recordings-review/index.ts`
  - `src/lib/quick-metronome/recording-controller.ts`
  - `src/components/recordings-review/use-recordings-review-controller.ts`
  - `src/components/quick-metronome/quick-metronome-experience.tsx`
  - Targeted unit tests named above
  - `tests/unit/architecture-boundaries.test.ts`

## Verification

Run, at minimum:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- recordings-review-artifact-storage.test.ts recordings-review-history.test.ts recordings-review-audio-export.test.ts recordings-review-waveform-comparison-sources.test.ts architecture-boundaries.test.ts quick-metronome-session.test.ts sheet-practice-recording.test.ts
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint
& .\scripts\npm-local.ps1 --% run build
& .\scripts\npm-local.ps1 --% run test:unit
git diff --check
```

## Review Questions

1. Is the parent-plan legacy data policy sufficient for this slice to proceed,
   or should implementation stop until the user separately reaffirms the data
   loss decision?
2. Is the scope narrow enough for one PR, given it deletes migration/runtime
   fallback but leaves shared `audioDataUrl` types and broad fixture cleanup for
   C2-07?
3. Are there any runtime callers that should keep a no-op migration method, or
   should the service/controller surface be deleted outright as planned?
