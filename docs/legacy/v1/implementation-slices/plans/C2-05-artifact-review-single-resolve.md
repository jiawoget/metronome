# C2-05 Artifact Review Single Resolve Plan

## Status

- Workstream: `pack-c-codebase-slimming`
- Slice: `C2-05 artifact-review-single-resolve`
- Current lifecycle state: `verified`
- Parent plan: `docs/v1/implementation-slices/plans/C2-main-codebase-slimming-plan.md`
- Baseline branch: `main`
- Baseline commit: `9a6d0407e3aa13b2e6507d5e0de61f49fa6298e3`
- Previous slice: `C2-04 legacy-audio-data-url-deletion` is `verified` and merged.
- Plan review: `PASS_WITH_CHANGES`, then `PASS` after tightening the resolver
  call-count test and no-new-helper constraints.

## Problem

`src/lib/recordings-review/artifact-review-controller.ts` currently loads a
selected recording by running two artifact body paths in parallel:

```ts
Promise.all([
  loadRecordingArtifactDetails(recording),
  resolveRecordingArtifactBody(recording)
])
```

After C2-04, both paths are artifactRef-only. `loadRecordingArtifactDetails(...)`
already calls `resolveRecordingArtifactBody(recording)` internally, so the
recording review panel reads the same artifact body twice from IndexedDB for a
single selected recording:

- once to decode details/peaks/duration;
- once to pass the Blob to `RecordingWaveformPlaybackAdapter`.

This is a small duplicate IO path, not a product behavior issue.

## Scope

Make the recording artifact review controller resolve the artifact body once and
reuse that body for both detail decoding and playback:

1. Update `useRecordingArtifactReviewController(...)` in
   `src/lib/recordings-review/artifact-review-controller.ts`.
   - Call `resolveRecordingArtifactBody(recording)` once.
   - Pass the resolved `blob` into the existing
     `loadRecordingArtifactDetailsFromBody(...)` helper.
   - Reuse the same resolved `blob` for `setArtifactBlob(...)`.
   - The only allowed production structure change is the controller's internal
     call order. Do not add `loadForReview(...)`, `reviewArtifactLoader(...)`,
     a controller factory, memoized resolver, or any new intermediate helper.
   - Preserve the existing loading, cancellation, error mapping, playback
     readiness, seek, and cleanup behavior.

2. Keep `loadRecordingArtifactDetails(recording)` intact.
   - It remains the public helper for waveform comparison and other callers
     that need a one-call "resolve plus decode" path.
   - Do not change artifact storage resolver behavior in this slice.

3. Add focused test coverage in
   `tests/unit/recording-artifact-review.test.tsx`.
   - Keep existing injected-controller rendering/seek tests.
   - Add a default-controller test that stubs audio decode and playback adapter
     loading, renders a real artifactRef-backed recording, and asserts
     `resolveRecordingArtifactBody(...)` is called exactly once for that review
     load.
   - Do not rely only on UI ready assertions; the test must mock/spy the
     resolver call count directly.
   - Cover rerendering the same selected recording object without introducing a
     second artifact body resolve. If the test intentionally changes the
     selected recording identity, a reload is allowed and should be asserted
     separately only if needed.
   - Assert the ready state still renders derived peaks/source and the playback
     adapter receives the same Blob resolved by the resolver.

## Explicit Non-Scope

- No export service refactor.
- No waveform comparison refactor.
- No `resolveRecordingArtifactBody(...)` API or error-semantics changes.
- No artifact repository/schema changes.
- No `audioDataUrl` type or fixture cleanup; C2-07 owns broad fixture slimming.
- No new artifact facade, cache layer, controller factory, or transaction helper.
- No UI layout/text behavior changes beyond what existing ready/error/loading
  states already render.

## Expected File Changes

Production:

- `src/lib/recordings-review/artifact-review-controller.ts`

Tests:

- `tests/unit/recording-artifact-review.test.tsx`

Workflow:

- `docs/v1/status.json`
- `docs/v1/implementation-slices/plans/C2-05-artifact-review-single-resolve.md`

If implementation requires additional production files, stop and explain why
before expanding the slice.

## Acceptance Criteria

- A single artifact review load resolves the selected recording's artifact body
  once.
- The resolved Blob is reused for both decoded artifact details and playback
  adapter loading.
- Missing artifact ref/body, unsupported MIME, decode failure, and playback-load
  failure still surface through the existing error UI path.
- Existing error-path coverage remains in place. If a specific listed error
  path is not currently covered, do not grow C2-05 into a broad error-test
  expansion; add only the smallest targeted assertion needed to prevent this
  controller refactor from masking it.
- Existing injected-controller tests remain unchanged in behavior.
- `loadRecordingArtifactDetails(recording)` remains available and unchanged for
  waveform comparison/history helper tests.
- No behavior from C2-04 is reversed: there is no `audioDataUrl` fallback.

## Verification

Targeted unit first:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- recording-artifact-review.test.tsx recordings-review-history.test.ts recordings-review-waveform-comparison-sources.test.ts recordings-review-artifact-storage.test.ts
```

Broad checks before PR:

```powershell
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint
& .\scripts\npm-local.ps1 --% run build
& .\scripts\npm-local.ps1 --% run test:unit
git diff --check
```

## Web ChatGPT Review Questions

1. Is this slice narrow enough as only the artifact review controller
   single-resolve cleanup?
2. Should the controller call `loadRecordingArtifactDetailsFromBody(...)`
   directly after one resolve, or is there a better existing local helper that
   avoids introducing a new facade?
3. Is the proposed default-controller test sufficient to prevent reintroducing
   the duplicate artifact body read?
