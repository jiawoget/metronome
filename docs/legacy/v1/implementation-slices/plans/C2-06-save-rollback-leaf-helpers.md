# C2-06 Save Rollback Leaf Helpers Plan

## Status

- Workstream: `pack-c-codebase-slimming`
- Slice: `C2-06 save-rollback-leaf-helpers`
- Current lifecycle state: `verified`
- Parent plan: `docs/v1/implementation-slices/plans/C2-main-codebase-slimming-plan.md`
- Baseline branch: `main`
- Baseline commit: `cb3472e84889b60280ef9c0dafc6158fd3c04bbd`
- Previous slice: `C2-05 artifact-review-single-resolve` is `verified` and merged.
- Plan review: `PASS_WITH_CHANGES`, then `PASS` after narrowing the session
  helper module and adding the rollback coverage inventory.

## Problem

Quick and sheet recording save flows both have the same rollback leaf work
spelled out inline:

- call `cleanupCommittedRecordingArtifacts(...)`;
- immediately call `assertRecordingArtifactCleanup(...)`;
- restore a previous practice session snapshot when one existed;
- otherwise delete the newly-created practice session snapshot;
- collect rollback failures locally and preserve the original save error when
  cleanup succeeds.

The duplication sits inside:

- `src/lib/quick-metronome/recording-controller.ts`
- `src/lib/sheet-practice/recording-service.ts`

This is not a request to unify quick and sheet save flows. Their operation
ordering and failure surfaces are different and must remain visible in their own
modules.

## Scope

Extract only domain-specific leaf helpers and keep each save flow in place:

1. Add a checked artifact cleanup helper in
   `src/lib/recordings-review/artifact-storage.ts`.
   - Intended shape:

```ts
export async function cleanupCommittedRecordingArtifactsOrThrow(
  recordingIds: string[]
): Promise<void> {
  const cleanupResult = await cleanupCommittedRecordingArtifacts(recordingIds);
  assertRecordingArtifactCleanup(cleanupResult);
}
```

   - Use this helper only where save/rollback code currently performs the
     immediate `cleanupCommittedRecordingArtifacts(...)` plus
     `assertRecordingArtifactCleanup(...)` pair.

2. Add one practice-session rollback leaf helper.
   - Preferred location:
     `src/services/practice-session/snapshot-rollback.ts`.
   - Do not create a broad `recording-save-rollback.ts` module. The helper must
     live in a narrowly named module dedicated only to practice-session snapshot
     restore/delete, or stay local to the callers.
   - Intended shape:

```ts
type PracticeSessionSnapshotRollbackPort = {
  restorePracticeSessionSnapshot(session: PracticeSession): Promise<PracticeSession>;
  deletePracticeSessionSnapshot(sessionId: string): Promise<void>;
};

export async function restoreOrDeletePracticeSessionSnapshot({
  previousSession,
  createdSessionId,
  sessionService
}: {
  previousSession: PracticeSession | null;
  createdSessionId: string;
  sessionService: PracticeSessionSnapshotRollbackPort;
}): Promise<void> {
  if (previousSession) {
    await sessionService.restorePracticeSessionSnapshot(previousSession);
    return;
  }

  await sessionService.deletePracticeSessionSnapshot(createdSessionId);
}
```

   - This helper does not catch errors, retry, aggregate rollback failures, or
     know about quick/sheet save ordering.
   - It must not depend on the complete `PracticeSessionService` type or change
     the practice-session service contract.
   - If implementation needs a wider rollback module, extra helpers,
     rollback result objects, or error aggregation/orchestration in the helper,
     stop and ask for user approval before coding further.

3. Refactor quick recording save rollback.
   - Remove the local `restoreLinkedQuickPracticeSession(...)` helper if the new
     leaf helper fully replaces it.
   - Keep the quick order unchanged:
     artifact body save -> session link -> metadata save -> optional end
     session.
   - Keep quick rollback behavior unchanged:
     metadata cleanup when metadata was saved;
     artifact cleanup when only the artifact body was saved;
     linked session restore/delete only when a linked session exists;
     same rollback failure message.

4. Refactor sheet recording save rollback.
   - Use the checked artifact cleanup helper inside
     `rollbackSheetReviewRecordingMetadata(...)` and the metadata-prepared but
     artifact-not-saved branch.
   - Use the practice-session rollback helper only in the current
     `artifactSaved` rollback branch.
   - Keep sheet order unchanged:
     decode -> prepare metadata -> save artifact body -> save review metadata
     with session -> commit prepared session.
   - Keep sheet rollback behavior unchanged:
     previous session restored when present;
     newly-created prepared session deleted when no previous session exists;
     same rollback failure message.

## Explicit Non-Scope

- No transaction framework, rollback manager, generic error collector, retry
  policy, or new save service.
- No broad `recording-save-rollback.ts` module.
- No helper that accepts or mutates `rollbackErrors`.
- No helper that returns a rollback result object.
- No change to quick/sheet save ordering.
- No change to practice-session service contracts.
- No change to artifact repository schema or resolver semantics.
- No change to UI components, capture services, export, waveform comparison, or
  C2-07 fixture slimming.
- No broad test rewrite. Existing rollback matrix tests should remain the main
  coverage.
- Do not replace unrelated clear/delete flows unless implementation proves a
  tiny local cleanup is necessary for typecheck.

## Expected File Changes

Production:

- `src/lib/recordings-review/artifact-storage.ts`
- `src/lib/quick-metronome/recording-controller.ts`
- `src/lib/sheet-practice/recording-service.ts`
- Possibly one small helper module for practice-session snapshot rollback:
  - `src/services/practice-session/snapshot-rollback.ts`

Tests:

- Prefer no new tests if existing rollback tests still cover the refactor.
- If a coverage gap appears, add only one focused assertion to an existing test
  file:
  - `tests/unit/quick-metronome-session.test.ts`
  - `tests/unit/sheet-practice-recording.test.ts`

Workflow:

- `docs/v1/status.json`
- `docs/v1/implementation-slices/plans/C2-06-save-rollback-leaf-helpers.md`

If implementation needs more production modules than these, stop and explain
why before expanding scope.

## Required Coverage Inventory

Before implementation, map existing tests to this rollback matrix. Add only the
smallest focused assertion in the existing quick/sheet test files if a matrix
item is not covered.

Quick save rollback matrix:

- Artifact saved, metadata save fails: artifact cleanup is checked.
- Metadata saved, later failure: metadata cleanup path is unchanged.
- Linked session had a previous snapshot: previous session is restored.
- Linked session was newly created with no previous snapshot: created session is
  deleted.
- Artifact cleanup/assert fails: rollback failure message is unchanged.
- Session restore/delete fails: rollback failure aggregation/message is
  unchanged.
- Original save error is preserved when rollback succeeds.

Sheet save rollback matrix:

- Metadata prepared, artifact save fails: prepared session rollback remains
  unchanged.
- Artifact saved, review metadata save fails: artifact cleanup is checked.
- Previous session exists: previous session is restored.
- No previous session exists: newly-created prepared session is deleted.
- Artifact cleanup/assert fails: rollback failure message is unchanged.
- Session restore/delete fails: rollback failure aggregation/message is
  unchanged.
- Original save error is preserved when rollback succeeds.

## Acceptance Criteria

- Quick and sheet rollback behavior remains identical under existing failure
  tests.
- Repeated `cleanupCommittedRecordingArtifacts(...)` plus
  `assertRecordingArtifactCleanup(...)` pairs in quick/sheet save rollback are
  replaced by one checked artifact cleanup helper.
- The checked artifact cleanup helper replaces only the immediate adjacent
  pattern `const result = await cleanupCommittedRecordingArtifacts(ids);`
  followed by `assertRecordingArtifactCleanup(result);` in quick/sheet
  save/rollback code. Do not spread it to unrelated clear/delete/export/review
  cleanup flows in this slice.
- Repeated previous-session-restore/new-session-delete branches are replaced by
  one leaf helper without hiding caller-specific save order.
- Rollback error aggregation remains local to quick/sheet catch blocks.
- Existing rollback failure messages are unchanged.
- No new facade, cache, transaction object, or generic rollback framework is
  introduced.

## Verification

Targeted unit first:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- quick-metronome-session.test.ts sheet-practice-recording.test.ts recordings-review-artifact-storage.test.ts
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

1. Is the helper scope small enough for C2-06, or is the proposed
   `src/services/practice-session/snapshot-rollback.ts` module still too broad?
2. Should the session restore/delete helper live under
   `src/services/practice-session/snapshot-rollback.ts`, or should it stay local
   to the callers?
3. Are existing quick/sheet rollback tests sufficient for this behavior-preserving
   refactor, or is one focused assertion required before implementation?
