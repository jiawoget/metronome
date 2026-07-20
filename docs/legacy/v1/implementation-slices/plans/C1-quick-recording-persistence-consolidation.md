# C1 Contract: Quick Recording Persistence Consolidation

## Objective

Remove the duplicated localStorage snapshot/cache/event implementation in
`src/lib/quick-metronome/persistence.ts` by delegating quick recording reads and
writes to the canonical recording history repository in
`src/lib/recordings-review/repository.ts`.

This is a code-size and contract-consistency cleanup. It must preserve behavior
for Quick Metronome, Latest Quick Recording, Recordings Review, practice session
aggregation, and recording history tests.

## Current Duplication

Both modules now use the same storage contract:

- `RECORDING_HISTORY_STORAGE_KEY` from
  `src/infrastructure/storage/storage-contracts.ts`
- `src/lib/quick-metronome/persistence.ts`
- `src/lib/recordings-review/repository.ts`

`recordingHistoryRepository` already owns:

- snapshot normalization
- localStorage read/write
- cache invalidation
- `recordings-review-change` dispatch
- `quick-metronome-recordings-change` dispatch
- `storage` event subscription
- marker cleanup when recordings are removed

`quickRecordingRepository` still duplicates a smaller localStorage reader,
writer, cache, `quick-metronome-recordings-change` dispatch, and subscription
logic.

## Required Behavior

Keep the public quick API stable:

```ts
quickRecordingRepository.getSnapshot()
quickRecordingRepository.getLatestQuickRecording()
quickRecordingRepository.saveQuickRecording(recording)
quickRecordingRepository.clear()
quickRecordingRepository.subscribe(listener)
```

The implementation should:

1. Import and use `recordingHistoryRepository`.
2. Keep `createRecordingId()` or equivalent collision handling local to quick
   persistence.
3. Preserve duplicate-id behavior:
   - if a saved quick recording id already exists, save the new recording with a
     generated id.
4. Preserve ordering:
   - saved quick recording appears at the front of `snapshot.recordings`.
5. Preserve sessions and error markers when saving quick recordings.
6. Preserve `getLatestQuickRecording()` semantics:
   - returns the first recording with `type === "quick"`, otherwise `null`.
7. Preserve subscription behavior for `LatestQuickRecording`.
   - Since `recordingHistoryRepository.writeSnapshot()` dispatches both
     review and quick events, quick subscribers should still update after quick
     saves and recording-review mutations.

## Forbidden Changes

Do not:

- introduce a new generic storage wrapper
- add Zustand or another state library
- change the storage key
- change `RecordingReviewSnapshot` or quick recording shape
- remove `quickRecordingRepository` public API
- move UI components
- change recording artifact creation
- change practice session creation/linking logic
- change Recordings Review marker behavior
- remove `RECORDINGS_STORAGE_KEY` export unless all unit tests and imports are
  deliberately migrated in the same small patch

## Suggested Implementation

In `src/lib/quick-metronome/persistence.ts`:

- Delete local `RECORDING_HISTORY_STORAGE_KEY` import if no longer needed.
- Delete local `STORE_EVENT`, `emptySnapshot`, `cachedRawValue`,
  `cachedSnapshot`, `getStorage`, `readSnapshot`, and `writeSnapshot`.
- Use `recordingHistoryRepository.getSnapshot()` in `getSnapshot()` and
  `getLatestQuickRecording()`.
- In `saveQuickRecording(recording)`:
  - read `const snapshot = recordingHistoryRepository.getSnapshot()`
  - apply the existing duplicate-id logic
  - call `recordingHistoryRepository.saveSnapshot({ ...snapshot, recordings })`
  - return the persisted recording
- In `clear()`:
  - call `recordingHistoryRepository.clear()`
- In `subscribe(listener)`:
  - call `recordingHistoryRepository.subscribe(listener)`

Expected code reduction: roughly 45-70 LOC.

## Review Checklist

- No second storage cache remains in quick persistence.
- No second localStorage read/write remains in quick persistence.
- Quick Metronome still saves, lists, and replays the latest quick recording.
- Recordings Review still sees quick recordings.
- Clearing quick repository still clears the same canonical history snapshot.
- Existing error marker cleanup behavior remains owned by
  `recordingHistoryRepository`.
- No public API break for quick UI or tests.

## Verification Commands

Run these after implementation:

```powershell
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint
& .\scripts\npm-local.ps1 --% test -- tests/unit/quick-metronome-session.test.ts tests/unit/recordings-review-repository.test.ts tests/unit/practice-session-service.test.ts
& .\scripts\npm-local.ps1 --% run test:e2e -- tests/e2e/quick-metronome.spec.ts tests/e2e/recordings-review.spec.ts
```

If targeted tests pass, run the broader local suite before merging:

```powershell
& .\scripts\npm-local.ps1 --% test
& .\scripts\npm-local.ps1 --% run build
```
