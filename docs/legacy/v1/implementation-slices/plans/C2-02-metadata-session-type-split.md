# C2-02 Metadata/Session Type Split Plan

## Status

- Workstream: `pack-c-codebase-slimming`
- Slice: `C2-02 metadata-session-type-split`
- Current lifecycle state: `verified`
- Parent plan: `docs/v1/implementation-slices/plans/C2-main-codebase-slimming-plan.md`
- Baseline branch: `main`
- Baseline commit: `e2b948b006a3acba601ac799cce55fd61869a59b`
- Review history:
  - Initial plan review: `PASS_WITH_CHANGES`, then `PASS`.
  - Current implementation size review: `SHRINK_BEFORE_CONTINUE`.
  - Revised C2-02A plan review: `PASS_WITH_CHANGES`, then `PASS` after the
    requested scope clarifications.
  - PR review: `PASS_WITH_CHANGES`, then `PASS` after the metadata bucket
    normalization fix.

## Decision

C2-02 is a structural prerequisite for later line-count slimming. It is not
expected to be net deletion by itself.

The previous implementation attempt solved too much at once: new metadata
bucket, legacy fake-row normalization, duplicate cleanup, clear/session cleanup,
stable sorting, unknown-field preservation, and a large repository test matrix.
That direction was technically reasonable but not acceptable as a small
slimming PR.

This revised plan shrinks C2-02 into a minimal C2-02A implementation and moves
compatibility hardening plus actual deletion work into follow-ups.

## Problem

`src/infrastructure/db/recording-history-metadata-repository.ts` currently
stores practice-session-only sheet metadata by constructing fake
`ReviewRecording` rows:

- `sizeBytes: 0`
- `mimeType: "metadata/session"`
- `audioDataUrl: null`

That pollutes the review/audio model and blocks later deletion-oriented cleanup
around artifact refs and legacy `audioDataUrl`.

## C2-02A Scope

Do only the smallest structural split:

1. Add the minimal optional snapshot field:

```ts
sheetRecordingMetadata?: SheetRecordingMetadata[];
```

2. Stop `recordingHistoryMetadataRepository.saveRecordingMetadata(...)` from
   constructing fake `ReviewRecording` rows.
3. Save metadata-only sheet rows into `sheetRecordingMetadata`.
4. Keep real sheet recordings in `recordings` unchanged.
5. Make `recordingHistoryMetadataRepository.listRecordingMetadata*()` merge:
   - metadata-only bucket rows;
   - non-legacy real sheet `ReviewRecording` rows mapped back to
     `SheetRecordingMetadata`.
6. When saving a real sheet `ReviewRecording`, remove a same-id
   `sheetRecordingMetadata` row in the same snapshot mutation. This is retained
   in C2-02A because it prevents placeholder resurrection and is small.

C2-02A only stops creating new `metadata/session` fake `ReviewRecording` rows.
Existing legacy fake rows may remain in `snapshot.recordings` until C2-02B.
C2-02A must not add broad read-time legacy normalization, migration, or flush
logic for those legacy rows.

## Explicit Non-Scope For C2-02A

- No new helper module unless it demonstrably reduces code.
- No broad legacy fake-row auto-normalization or flush.
- No attempt to repair existing legacy `metadata/session` fake rows that are
  already stored in `snapshot.recordings`.
- No metadata bucket unknown-field preservation work.
- No clear/session orphan cleanup redesign.
- No Review UI union type.
- No artifact resolver changes.
- No legacy `audioDataUrl` deletion.
- No sheet direct Blob/body decode.
- No broad test-matrix expansion.

## Follow-Ups

### C2-02B Compatibility Hardening

Only after C2-02A is reviewed:

- read legacy `metadata/session` fake review rows into metadata-only bucket;
- keep them out of take groups and artifact paths;
- flush old fake rows from `recordings` on a later safe write;
- harden clear behavior for metadata-only rows and orphan sheet sessions;
- decide and test unknown-field preservation for metadata bucket rows.

### C2-02C Deletion-Oriented Cleanup

After the metadata split is stable:

- remove now-unneeded legacy branches unlocked by the split;
- continue toward C2-03/C2-04 artifactRef/audioDataUrl cleanup;
- require the PR to show actual deletion or a clear reduction in complexity.

## Expected C2-02A File Changes

Likely production files:

- `src/lib/recordings-review/types.ts`
- `src/lib/recordings-review/repository.ts`
- `src/lib/recordings-review/recording-history-operations.ts`
- `src/infrastructure/db/recording-history-metadata-repository.ts`

Likely test file:

- `tests/unit/recordings-review-repository.test.ts`

Avoid touching unrelated artifact, waveform, export, UI, E2E, and local-data
cleanup files in C2-02A.

## C2-02A Acceptance Criteria

- Production save path no longer constructs a new fake `ReviewRecording` with
  `mimeType: "metadata/session"`.
- Metadata-only sheet rows persist outside `snapshot.recordings`.
- Real quick and sheet recordings remain in `snapshot.recordings`.
- `listRecordingMetadata()` and `listRecordingMetadataForSession(sessionId)`
  return metadata-only rows and real sheet recording metadata.
- Saving a real sheet recording with the same id removes the metadata-only row.
- Existing real sheet recording save, rollback, take grouping, waveform, export,
  and return-to-practice behavior are unchanged.
- C2-02A does not add a new facade/helper module merely to move code around.

## C2-02A Test Plan

Targeted unit:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- recordings-review-repository.test.ts practice-session-service.test.ts architecture-boundaries.test.ts
```

Broad checks before PR:

```powershell
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint
& .\scripts\npm-local.ps1 --% run build
& .\scripts\npm-local.ps1 --% run test:unit
```

Focused E2E only if implementation touches behavior beyond repository/service
boundaries:

```powershell
& .\scripts\npm-local.ps1 --% run test:e2e -- sheet-recording-review.spec.ts sheet-segment-recording.spec.ts
```

## Implementation Guardrails

- Keep production changes narrow, ideally 3-4 files.
- If production changes exceed the expected 3-4 files or require a new helper
  module, stop and explain why before continuing.
- Keep test additions focused on the new storage boundary and same-id cleanup.
- Do not claim this PR is line-count slimming.
- In the PR description, call it a prerequisite that unlocks later deletion.
- If implementation again requires broad legacy normalization, clear/session
  cleanup, or UI behavior changes, stop and split to C2-02B planning.

## Coding Handoff

Implement C2-02A only after this revised plan receives review approval. Do not
restart the larger implementation that was paused by the `SHRINK_BEFORE_CONTINUE`
review.
