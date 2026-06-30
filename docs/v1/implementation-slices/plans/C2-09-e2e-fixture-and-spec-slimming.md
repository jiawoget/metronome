# C2-09 E2E Fixture And Spec Slimming Plan

## Status

- Workstream: `pack-c-codebase-slimming`
- Slice: `C2-09 e2e-fixture-and-spec-slimming`
- Current lifecycle state: `verified`
- Parent plan: `docs/v1/implementation-slices/plans/C2-main-codebase-slimming-plan.md`
- Baseline branch: `main`
- Baseline commit: `4a7190b40b69cb1af0f5e48786bc38784f8744e6`
- Previous slice: `C2-08 large-unit-fixture-follow-up` is `verified` and
  merged.
- Plan review: initial `PASS`, then reopened for review after targeted E2E
  baseline exposed stale legacy `audioDataUrl` fixture assumptions; revised
  plan review `PASS`.

This plan intentionally covers the first narrow E2E fixture slimming PR. It
does not cover broad cross-spec E2E fixture framework work, unit AudioContext
mock extraction, or in-memory artifact repository helper extraction.

## Known Remaining Phase 7 Work

- `C2-07 test-fixture-slimming`: `verified`.
- `C2-08 large-unit-fixture-follow-up`: `verified`.
- `C2-09 e2e-fixture-and-spec-slimming`: this plan;
  `verified`.
- `C2-10 shared-unit-audio-artifact-fixtures`: deferred; `not_started`.
- `pack-c-codebase-slimming` must remain `in_progress` until C2-09 and C2-10
  are completed, or explicitly re-scoped out by review.

## Problem

`tests/e2e/recordings-review.spec.ts` is currently the largest E2E test file
and repeatedly constructs recording-history snapshots inline. The repeated
shape appears in every seeded scenario:

- `sessions: [...]`
- `recordings: [...]`
- sheet recording defaults:
  - `type: "sheet"`
  - `origin: "user"`
  - `sheetId`
  - `sheetName`
  - `mimeType: "audio/wav"`
  - `audioDataUrl`
  - `durationMs`
  - `sizeBytes`
  - `settings`
  - optional `trustedPeaks`
  - optional `segmentContext`
- quick recording defaults:
  - `type: "quick"`
  - `origin: "user"`
  - `sheetId: null`
  - `mimeType: "audio/wav"`
  - `audioDataUrl`
  - `durationMs`
  - `sizeBytes`
  - `settings`
- `errorMarkers: []` or repeated marker object shapes
- `recordingOrganization` item shape for tag/favorite/archive cases

This is real E2E fixture duplication. It makes the spec large and raises the
chance that future behavior tests copy stale recording shapes instead of using
one canonical E2E fixture layer.

After the initial plan review, the targeted E2E baseline was run twice:

```powershell
& .\scripts\npm-local.ps1 --% run test:e2e -- recordings-review.spec.ts
```

Both the normal run and the less-restricted rerun failed before implementation.
The failures were not browser-launch failures. The failed pages showed seeded
recordings with legacy `audioDataUrl` but no valid `artifactRef`, while current
recording-review playback/export/waveform code requires an IndexedDB-backed
local recording artifact. The visible page error was:

- `This recording has no accessible local audio artifact.`

Therefore the original "do not introduce default artifactRef values" plan
assumption is stale. C2-09 must include artifact-backed E2E fixture seeding as
part of the fixture slimming work, while still keeping missing-artifact cases
explicit.

## Scope

1. Add a small E2E fixture helper module:
   - `tests/e2e/fixtures/recordings-review.ts`

2. Move only reusable recording-review E2E data construction into that helper:
   - `createE2ESegmentContext(...)`
   - `createE2EQuickRecording(...)`
   - `createE2ESheetRecording(...)`
   - `createE2ERecordingSession(...)`
   - `createE2EErrorMarker(...)`
   - `createE2ERecordingOrganizationItem(...)`
   - `createE2ERecordingArtifactRef(...)`
   - `seedE2ERecordingArtifacts(...)`
   - optionally `createE2ERecordingHistorySnapshot(...)`

3. Refactor only:
   - `tests/e2e/recordings-review.spec.ts`

4. Keep existing E2E storage helpers in `tests/e2e/fixtures/storage.ts`.
   - Use the existing `seedRecordingHistory(...)` helper.
   - The new recording-review fixture may write to
     `RECORDING_ARTIFACT_DB_NAME` only to seed recording audio artifacts needed
     by the target spec.
   - Do not move unrelated localStorage or IndexedDB clear/read helpers in this
     PR.

5. Preserve all existing behavior assertions and scenario names.
   - The PR may reduce repeated fixture literals.
   - The PR must not remove the current end-to-end coverage for grouping,
     filters, tags/favorites/archive, export, waveform comparison,
     return-to-practice, mobile readability, playback/continue/delete, or
     bad-audio handling.

## Explicit Non-Scope

- No production code changes.
- No unit test changes.
- No `tests/e2e/sheet-recording-review.spec.ts` changes.
- No `tests/e2e/sheet-segment-recording.spec.ts` changes.
- No `tests/e2e/sheet-practice-integration.spec.ts` changes.
- No shared synthetic microphone extraction in this PR.
- No shared audio decode helper extraction in this PR.
- No shared IndexedDB clear/read framework beyond the artifact seeding helper
  needed by `recordings-review.spec.ts`.
- No splitting `recordings-review.spec.ts` into multiple spec files in this PR.
- No moving bad-audio matrices to unit tests in this PR.
- No assertion deletion, weakening, broadening, or movement for cosmetic
  reasons.
- No file-wide formatting, import churn, or line wrapping as a slimming
  substitute.

Deferred unit helper work remains tracked as
`C2-10 shared-unit-audio-artifact-fixtures`.

## Fixture Semantic Preservation Checklist

Before editing, inventory and preserve these semantics.

### Existing `createSegmentContext(...)`

The current local helper in `recordings-review.spec.ts` must be replaced by a
shared E2E helper with identical defaults:

- `segmentId: "segment-bridge"`
- `segmentName: "Bridge"`
- range `5..12`
- `targetBpm: 96`
- `measureGridVersion:
  "bpm:96|timeSignature:4/4|pickupBeats:0|measureOneOffsetMs:1000"`
- grid snapshot `{ bpm: 96, timeSignature: "4/4", pickupBeats: 0,
  measureOneOffsetMs: 1_000 }`
- measure range `11_000..31_000`

### Recording Defaults

The shared E2E recording helpers must preserve the current scenario-specific
fields and only supply repeated defaults.

Quick defaults:

- `type: "quick"`
- `origin: "user"`
- `sheetId: null`
- `mimeType: "audio/wav"`
- default settings `{ bpm: 120, timeSignature: "4/4" }`

Sheet defaults:

- `type: "sheet"`
- `origin: "user"`
- `mimeType: "audio/wav"`
- default settings `{ bpm: 96, timeSignature: "4/4" }`

The helper must allow explicit scenario overrides for:

- `id`
- `name`
- `sessionId`
- `sheetId`
- `sheetName`
- `createdAt`
- `durationMs`
- `sizeBytes`
- `audioDataUrl`
- `mimeType`
- `trustedPeaks`
- `segmentContext`
- `artifactAnalysis`
- `settings`
- `artifactRef`
- `audioDataUrl: null`
- intentionally malformed values used by bad-artifact tests

### Bad Audio And Missing Artifact Cases

The following bad-audio semantics must remain explicit at call sites, not hidden
inside a generic scenario builder:

- invalid base64/body for `bad-gamma`
- `audioDataUrl: null` for missing artifacts
- invalid `trustedPeaks: [0, 0]`
- metadata/audio duration mismatch
- unsupported MIME type in waveform comparison

### ArtifactRef Semantics

Current recording-review playback/export/waveform code is artifactRef-first.
The shared E2E recording helpers must therefore make valid audio fixtures
artifact-backed by default when a scenario supplies an audio artifact:

- `artifactRef: { kind: "indexeddb", artifactId: recording.id,
  storageVersion: 1 }`
- a matching IndexedDB row in `RECORDING_ARTIFACT_DB_NAME` /
  `recordingArtifacts`
- `artifactId === recordingId`
- `recordingType` matches `quick` or `sheet`
- `mimeType`, `sizeBytes`, and `blob` match the scenario artifact

Missing-artifact cases must remain explicit. They should use `artifactRef: null`
or omit `artifactRef` intentionally, with assertions still expecting the
missing-artifact UI.

## Implementation Steps

0. Confirm status/source-of-truth before touching test files.
   - `docs/v1/status.json` keeps Pack C as `in_progress`.
   - `docs/v1/status.json` lists C2-09 as `planning_in_progress`.
   - `docs/v1/status.json` lists C2-10 as `not_started`.
   - `docs/v1/implementation-slices/plans/C2-main-codebase-slimming-plan.md`
     keeps C2-10 as deferred remaining Phase 7 work.

1. Record the targeted E2E baseline result:

```powershell
& .\scripts\npm-local.ps1 --% run test:e2e -- recordings-review.spec.ts
```

The current pre-implementation baseline is known to fail because legacy
`audioDataUrl` E2E seeds are missing artifact refs/bodies. This is the fixture
staleness C2-09 will address. Do not proceed if new baseline failures appear
outside this known missing-artifact pattern.

2. Add `tests/e2e/fixtures/recordings-review.ts`.
   - Export narrow fixture types only as needed by E2E tests.
   - Implement factory functions as plain object builders.
   - Implement artifact seeding by converting scenario `audioDataUrl` values to
     browser `Blob`s and writing matching records to `recordingArtifacts`.
   - Avoid classes, a fluent DSL, scenario names, or helpers that embed
     assertions.

3. Refactor `tests/e2e/recordings-review.spec.ts`.
   - Replace the local `createSegmentContext(...)` implementation with an
     import alias from the new helper.
   - Replace repeated inline quick/sheet recording object defaults with the new
     helper calls.
   - Seed valid audio recordings with artifact refs and matching IndexedDB
     artifact bodies.
   - Keep scenario-specific fields readable at call sites.
   - Keep `seedRecordingHistory(...)`, assertions, user flows, and test names
     intact.

4. Run targeted E2E again.

5. Run required checks before PR:

```powershell
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint
& .\scripts\npm-local.ps1 --% run build
& .\scripts\npm-local.ps1 --% run test:unit
git diff --check
```

6. In the PR description, include before/after accounting:
   - which repeated E2E fixture shapes were replaced;
   - which helper functions were added;
   - whether there is net reduction in the implementation files after adding
     the helper file;
   - confirmation that no assertion blocks or user flows were deleted.

## Acceptance Criteria

- Only these files change:
  - `tests/e2e/fixtures/recordings-review.ts`
  - `tests/e2e/recordings-review.spec.ts`
  - `docs/v1/status.json`
  - this plan file
  - `docs/v1/implementation-slices/plans/C2-main-codebase-slimming-plan.md`
- `docs/v1/status.json` confirms or updates:
  - Pack C = `in_progress`
  - C2-09 = `verified` after local verification
  - C2-10 = `not_started`
- Valid audio E2E recordings in `recordings-review.spec.ts` are backed by
  `artifactRef` plus matching IndexedDB artifact rows.
- `recordings-review.spec.ts` no longer owns a duplicate E2E segment-context
  factory implementation.
- Repeated quick/sheet recording fixture defaults in
  `recordings-review.spec.ts` are delegated to a shared E2E fixture helper.
- Bad-audio, missing-artifact, invalid-peaks, unsupported-MIME, and
  duration-mismatch cases remain explicit and readable. Missing-artifact cases
  are the only cases that intentionally lack artifact refs/bodies.
- No production, unit, cross-spec E2E, synthetic microphone, audio decode, or
  IndexedDB framework extraction is attempted.
- No assertion blocks, user flows, or scenario names are deleted or weakened.
- The PR is real fixture duplication reduction, not formatting-only slimming.
- The PR description separates:
  - actual E2E fixture logic removed;
  - helper functions added;
  - scenario-specific overrides retained;
  - assertion/user-flow blocks untouched.

## Verification

Targeted E2E:

```powershell
& .\scripts\npm-local.ps1 --% run test:e2e -- recordings-review.spec.ts
```

Required before PR:

```powershell
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint
& .\scripts\npm-local.ps1 --% run build
& .\scripts\npm-local.ps1 --% run test:unit
git diff --check
```

Local verification on 2026-06-30: `typecheck`, `lint`, `build`,
`test:unit` (41 files / 436 tests), targeted `recordings-review.spec.ts` E2E
(7 tests), and `git diff --check` all passed.

If preserving E2E semantics requires deleting user flows, splitting the spec
file, or introducing a broad generic E2E DSL, stop and ask for review before
continuing.
