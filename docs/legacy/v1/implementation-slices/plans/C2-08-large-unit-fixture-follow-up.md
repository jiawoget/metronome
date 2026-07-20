# C2-08 Large Unit Fixture Follow-Up Plan

## Status

- Workstream: `pack-c-codebase-slimming`
- Slice: `C2-08 large-unit-fixture-follow-up`
- Current lifecycle state: `verified`
- Parent plan: `docs/v1/implementation-slices/plans/C2-main-codebase-slimming-plan.md`
- Baseline branch: `main`
- Baseline commit: `688e9a8614860707d900a212a4d752261b211286`
- Previous slice: `C2-07 test-fixture-slimming` is `verified` and merged.
- Plan review: `PASS_WITH_CHANGES`, then `PASS` after making remaining Phase 7
  work a hard status/source-of-truth gate.
- This plan intentionally covers the second narrow unit-test fixture PR. It
  does not cover E2E fixture slimming or shared AudioContext/artifact mock
  extraction.

## Known Remaining Phase 7 Work

- `C2-07 test-fixture-slimming`: `verified`.
  - This only covers the first narrow unit recording factory PR.
- `C2-08 large-unit-fixture-follow-up`: this plan;
  `verified`.
- `C2-09 e2e-fixture-and-spec-slimming`: deferred; `not_started`.
- `C2-10 shared-unit-audio-artifact-fixtures`: deferred; `not_started`.
- `pack-c-codebase-slimming` must remain `in_progress` until C2-08, C2-09,
  and C2-10 are completed, or explicitly re-scoped out by review.

`docs/v1/status.json` and the C2 main plan must both track C2-10 before this
slice enters implementation.

## Problem

C2-07 extracted shared recording-review unit factories and applied them to four
smaller `recordings-review-*` unit tests. Two larger unit tests were explicitly
deferred and still carry local duplicated recording fixture construction:

- `tests/unit/recordings-review-experience.test.tsx`
  - local `createSegmentContext(...)`
  - local `createQuickRecording(...)`
  - local `createSheetRecording(...)`
  - artifact-ref auto-attachment logic duplicated from the shared factory
- `tests/unit/recordings-review-history.test.ts`
  - top-level literal `quickRecording`, `sheetRecording`, and
    `segmentSheetRecording` objects with the same field shape as the shared
    factory
  - local segment-context shape embedded in `segmentSheetRecording`

This is real fixture duplication, but these files are large and user-facing in
coverage terms. The PR must remove duplicated setup without weakening the
behavior tests.

## Scope

1. Reuse existing shared recording-review factories from
   `tests/unit/factories/recordings-review.ts`.
   - `makeQuickReviewRecording`
   - `makeSheetReviewRecording`
   - `makeSheetRecordingSegmentContext`

2. Refactor only:
   - `tests/unit/recordings-review-experience.test.tsx`
   - `tests/unit/recordings-review-history.test.ts`

3. Keep tiny local wrapper function names if they reduce call-site churn.
   - For `recordings-review-experience.test.tsx`, local wrappers named
     `createQuickRecording`, `createSheetRecording`, and
     `createSegmentContext` may stay, but their bodies should delegate to the
     shared factory.
   - For `recordings-review-history.test.ts`, top-level constants may stay as
     constants, but should be constructed by shared factories when doing so
     preserves semantics.

4. Update `tests/unit/factories/recordings-review.ts` only if a tiny,
   generally useful option is required by both target files.
   - Do not add scenario builders, fixture classes, or a generic DSL.
   - Do not add options for one-off cases that can remain local.

## Explicit Non-Scope

- No production code changes.
- No E2E changes.
- No `recordings-review-repository.test.ts` changes.
- No `recordings-review-waveform-comparison-sources.test.ts` changes.
- No `recording-artifact-review.test.tsx` changes.
- No `sheet-practice-recording.test.ts` or `sheet-practice-controls.test.tsx`
  changes.
- No shared AudioContext mock extraction in this PR.
- No shared in-memory artifact repository helper extraction in this PR.
- No assertion deletion, weakening, broadening, or movement for cosmetic
  reasons.
- No file-wide formatting, import churn, or line wrapping as a slimming
  substitute.

Deferred unit helper work is tracked separately as
`C2-10 shared-unit-audio-artifact-fixtures`. E2E fixture/spec slimming remains
tracked as `C2-09 e2e-fixture-and-spec-slimming`.

`C2-10 shared-unit-audio-artifact-fixtures` is limited to shared unit-test
helpers for existing local AudioContext mocks and in-memory artifact/detail
loading helpers. It must not introduce a generic test framework, scenario DSL,
production code, E2E changes, or behavior changes to playback/artifact
semantics.

## Fixture Semantic Preservation Checklist

Before editing, inventory and preserve these file-specific semantics.

### `recordings-review-experience.test.tsx`

- Default quick recording fields:
  - `id: "quick-recording"`
  - `type: "quick"`
  - `name: "Quick take"`
  - `sessionId: "session-quick"`
  - `sheetId: null`
  - `createdAt: "2026-06-21T09:00:00.000Z"`
  - `durationMs: 10_000`
  - `sizeBytes: 128`
  - `mimeType: "audio/wav"`
  - `audioDataUrl: "data:audio/wav;base64,UklGRg=="`
  - `settings: { bpm: 120, timeSignature: "4/4" }`
- Default sheet recording fields:
  - `id: "sheet-recording"`
  - `type: "sheet"`
  - `name: "Sheet take"`
  - `sessionId: "session-sheet"`
  - `sheetId: "sheet-alpha"`
  - `sheetName: "Alpha Etude"`
  - `createdAt: "2026-06-21T12:00:00.000Z"`
  - `durationMs: 12_000`
  - `sizeBytes: 256`
  - `mimeType: "audio/webm"`
  - `audioDataUrl: "data:audio/webm;base64,UklGRg=="`
  - default settings merge behavior
- Default segment context fields must match the current local
  `createSegmentContext(...)`.
  - `segmentId: "segment-alpha"`
  - `segmentName: "Bridge"`
  - range `5..12`
  - `targetBpm: 96`
  - `measureGridVersion:
    "bpm:96|timeSignature:4/4|pickupBeats:0|measureOneOffsetMs:1000"`
  - grid snapshot `{ bpm: 96, timeSignature: "4/4", pickupBeats: 0,
    measureOneOffsetMs: 1_000 }`
  - measure range `11_000..31_000`
- Default artifact ref auto-attachment must remain enabled.
- Explicit `artifactRef: null` or explicit non-null `artifactRef` overrides
  must remain honored by property-presence checks.
- Existing mock setup, snapshot builders, comparison result helpers, user-event
  flows, and assertions must remain unchanged.

### `recordings-review-history.test.ts`

- `quickRecording` must keep:
  - `id: "quick-1"`
  - `name: "Morning rhythm"`
  - `sessionId: "session-quick"`
  - `createdAt: "2026-06-21T09:00:00.000Z"`
  - `durationMs: 65_000`
  - `sizeBytes: 12_000`
  - `mimeType: "audio/wav"`
  - `audioDataUrl: "data:audio/wav;base64,UklGRg=="`
  - `settings: { bpm: 120, timeSignature: "4/4" }`
  - `trustedPeaks: [0.1, 0.5, 1]`
- `sheetRecording` must keep:
  - `id: "sheet-1"`
  - `name: "Etude take"`
  - `sessionId: "session-sheet"`
  - `sheetId: "sheet-42"`
  - `sheetName: "Moonlight Etude"`
  - `createdAt: "2026-06-21T10:00:00.000Z"`
  - `durationMs: 125_000`
  - `sizeBytes: 24_000`
  - `mimeType: "audio/wav"`
  - `audioDataUrl: "data:audio/wav;base64,UklGRg=="`
  - `settings: { bpm: 96, timeSignature: "3/4" }`
  - `trustedPeaks: [0.2, 0.8, 0.4]`
- `segmentSheetRecording` must keep the current segment fields:
  - `segmentId: "segment-bridge"`
  - `segmentName: "Bridge"`
  - range `5..8`
  - `targetBpm: 96`
  - `timeSignature: "3/4"` in the grid snapshot/version
  - measure range `10_000..25_000`
- The history constants currently do not have default `artifactRef` values.
  Preserve that by using `withArtifactRef: false` unless a specific test
  explicitly adds `artifactRef`.
- The tests that explicitly add `artifactRef` for missing-body coverage must
  remain explicit and readable.
- Do not touch the local `installAudioContextMock(...)` in this PR.
- Do not touch `loadTestArtifactDetails(...)` in this PR.

## Implementation Steps

0. Confirm status/source-of-truth before touching test files.
   - `docs/v1/status.json` keeps Pack C as `in_progress`.
   - Before implementation, `docs/v1/status.json` lists C2-08 as
     `planning_in_progress`; after local verification, update it to
     `verified`.
   - `docs/v1/status.json` lists C2-09 as `not_started`.
   - `docs/v1/status.json` lists C2-10 as `not_started`.
   - `docs/v1/implementation-slices/plans/C2-main-codebase-slimming-plan.md`
     tracks C2-10 as deferred remaining Phase 7 work.

1. Run the targeted baseline tests:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- recordings-review-experience.test.tsx recordings-review-history.test.ts
```

2. Refactor `recordings-review-experience.test.tsx`.
   - Import shared factories.
   - Replace local builder bodies with shared factory calls.
   - Remove the now-unused direct `createRecordingArtifactRef` import if the
     local builder no longer needs it.
   - Preserve call sites and assertions.

3. Refactor `recordings-review-history.test.ts`.
   - Import shared factories.
   - Build `quickRecording`, `sheetRecording`, and `segmentSheetRecording`
     through the shared factories or tiny local wrappers.
   - Use `withArtifactRef: false` to preserve the existing no-artifact-ref
     default.
   - Preserve explicit artifact-ref additions in the existing missing-body
     tests.

4. Run targeted tests, typecheck, lint, build, full unit tests, and
   `git diff --check`.

5. In the PR description, include before/after accounting:
   - which local helper or literal fixture blocks were removed;
   - which shared helper functions replaced them;
   - whether there is a net reduction after any factory-file adjustment;
   - confirmation that no assertion blocks were deleted or broadened.

## Acceptance Criteria

- Only the two target unit test files, the shared factory file if needed,
  `docs/v1/status.json`, this plan file, and the C2 main plan change.
- The C2 main plan may change only to register C2-10 as deferred remaining
  Phase 7 work and to update C2-08 final status after verification.
- `docs/v1/status.json` confirms or updates:
  - Pack C = `in_progress`
  - C2-08 = `verified` after local verification
  - C2-09 = `not_started`
  - C2-10 = `not_started`
- `recordings-review-experience.test.tsx` no longer owns a duplicate
  recording/segment factory implementation.
- `recordings-review-history.test.ts` no longer owns duplicated literal
  recording fixture construction where shared factories can preserve semantics.
- `recordings-review-history.test.ts` still has no default artifact refs on
  `quickRecording`, `sheetRecording`, or `segmentSheetRecording`.
- Existing assertions remain present and behavior-specific.
- No AudioContext or artifact repository helper extraction is attempted.
- No production, E2E, app repository metadata/model files, or sheet-practice
  files are touched.
- The PR is a real fixture duplication reduction, not formatting-only slimming.
- The PR description separates:
  - actual fixture logic removed;
  - wrapper names retained;
  - factory options added;
  - assertion blocks untouched.

## Verification

Targeted unit:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- recordings-review-experience.test.tsx recordings-review-history.test.ts
```

Required before PR:

```powershell
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint
& .\scripts\npm-local.ps1 --% run build
& .\scripts\npm-local.ps1 --% run test:unit
git diff --check
```

If preserving fixture semantics requires touching assertion blocks or broadening
the shared factory beyond plain recording/segment construction, stop and ask for
review before continuing.
