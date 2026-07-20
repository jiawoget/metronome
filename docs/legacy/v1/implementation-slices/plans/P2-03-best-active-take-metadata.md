# P2-03 Best Active Take Metadata Plan

## Slice

- Slice id: P2-03 `best-active-take-metadata`
- Pack: Pack 2 Segment Take Review
- Product contract: `takes.active-best-take` in `docs/v1/05c-sheet-recording-review.md`
- Related contracts: `takes.multi-take-management` and `recordings.review-grouping`
- Depends on: P2-01 `take-grouping-domain` and compatibility with P2-02 grouped review UI
- Planning model requirement: GPT-5.5, medium effort, standard speed
- Coding tier: Tier B, local persistence/service boundary
- Status: ready for a fresh coding agent after this planning artifact; no product code is changed by this plan

## Goal

Add a local metadata boundary for user-controlled best and active take selections on sheet take groups. This slice persists and resolves metadata only; it does not add UI, badges, waveform comparison, scoring, or automatic best-take behavior.

## Refined Scope

- Add explicit user metadata for best and active recording ids, scoped to P2-01 sheet take groups.
- Store metadata locally through the existing recording history repository/storage pattern.
- Expose repository/service methods for reading, setting, clearing, and resolving best/active metadata for a `RecordingTakeGroup`.
- Keep latest take fully derived from recording time through P2-01 grouping.
- Treat best and active as separate user choices, not aliases and not derived values.
- Support backwards-compatible reads for existing recording snapshots with no metadata.
- Handle deleted or missing referenced recordings safely without crashing grouping or metadata reads.
- Add unit/integration coverage for persistence, reload, stale refs, deletion behavior, and legacy/no-segment/segment cases.

## Explicit Out Of Scope

- No UI controls, labels, badges, row actions, or visual states. P2-04 owns those.
- No automatic best selection, ranking, scoring, timing feedback, mistake detection, or analysis-backed recommendation.
- No waveform comparison, waveform source changes, audio decoding, or peak verification.
- No recording capture, playback, MediaRecorder, metronome, or artifact changes.
- No tags, favorites, archive, export, import, backup/restore, or selective cleanup.
- No new persistence backend and no Dexie/localStorage migration.
- No broad storage rewrite. Existing recordings without metadata must keep working as-is.
- No route changes and no browser E2E required unless the coding agent unexpectedly touches UI.

## Product Contracts Covered

This slice covers the metadata side of `takes.active-best-take`:

- Users will later be able to mark a best take and an active take.
- Best/active take identity is explicit user metadata, not inferred from latest recording, duration, BPM, score, marker count, or array order.
- Latest remains a separate derived concept from recording time.
- Segment-aware takes use saved recording `segmentContext` and P2-01 group identity.
- Metadata persists locally and survives reload.

The UI side of marking/unmarking and displaying best/active is intentionally deferred to P2-04.

## Existing Repo Context

Known current seams:

- `src/lib/recordings-review/types.ts`
  - Defines `ReviewRecording`, `RecordingReviewSnapshot`, `RecordingTakeGroup`, and `ReviewRecordingTakeGrouping`.
- `src/lib/recordings-review/take-groups.ts`
  - Defines `groupRecordingsByTake(...)`, deterministic `groupId`, newest-first sorting, and latest-take derivation.
- `src/lib/recordings-review/repository.ts`
  - Owns the local recording history snapshot boundary.
  - Uses `RECORDINGS_STORAGE_KEY` from `src/infrastructure/storage/storage-contracts.ts`.
  - Normalizes recordings and error markers, exposes `getSnapshot()`, `saveSnapshot(...)`, `getTakeGroups()`, `deleteRecording(...)`, and `subscribe(...)`.
- `src/infrastructure/db/recording-history-metadata-repository.ts`
  - Bridges sheet recording metadata into the shared recording history boundary.
- Existing tests to extend or mirror:
  - `tests/unit/recordings-review-repository.test.ts`
  - `tests/unit/recordings-review-take-groups.test.ts`

Do not introduce a second unsynchronized metadata source.

## Data Model

Best and active are separate concepts, but should be stored in one combined group-scoped metadata shape.

Recommended type shape:

```ts
export type RecordingTakeSelectionMetadata = {
  groupId: string;
  sheetId: string;
  segmentId: string | null;
  bestRecordingId: string | null;
  activeRecordingId: string | null;
  updatedAt: string;
};
```

Recommended snapshot extension:

```ts
export type RecordingReviewSnapshot = {
  sessions: unknown[];
  recordings: ReviewRecording[];
  errorMarkers: RecordingErrorMarker[];
  takeSelections?: RecordingTakeSelectionMetadata[];
};
```

Rationale:

- Best and active have different product meanings: best is the user's preferred take; active is the take currently chosen for review/practice continuity.
- They can intentionally point to the same recording, different recordings, or neither.
- A single metadata record per take group keeps updates atomic, avoids dueling stores, and gives P2-04 one object to render.
- Group-scoped metadata matches P2-01/P2-02 take-history semantics and avoids attaching selection fields to individual recording artifacts.

Do not store latest in this metadata. Latest remains derived from `ReviewRecording.createdAt`.

## Persistence And Service Boundary

Preferred implementation:

- Extend `RecordingReviewSnapshot` with optional `takeSelections`.
- Normalize missing `takeSelections` to `[]` when read through repository helpers.
- Preserve backwards compatibility by accepting snapshots that do not contain the field.
- Write metadata through `recordingHistoryRepository.saveSnapshot(...)` or repository methods; do not call `window.localStorage` outside the repository.
- Add small repository methods rather than UI-facing storage code, for example:
  - `getTakeSelection(groupId)`
  - `getTakeSelections()`
  - `setBestTake(group, recordingId | null)`
  - `setActiveTake(group, recordingId | null)`
  - `clearTakeSelection(groupId)`
  - `resolveTakeSelection(group)` returning metadata plus resolved `bestRecording`/`activeRecording` or `null`

The exact names can follow local style, but the boundary must keep storage normalization in `repository.ts` or a focused helper under `src/lib/recordings-review/`.

Validation rules:

- `groupId`, `sheetId`, and `updatedAt` must be non-empty strings.
- `segmentId`, `bestRecordingId`, and `activeRecordingId` may be `null`.
- Best/active recording ids must be either `null` or ids of recordings currently in the target group when set through public repository methods.
- Invalid persisted metadata should be ignored or normalized safely on read.
- Duplicate metadata for the same `groupId` should collapse deterministically, preferably keeping the most recent valid `updatedAt`, with stable tie-breakers if needed.

## Invariants

- Latest take is always derived from recording time by P2-01 grouping.
- Best take is explicit user metadata only.
- Active take is explicit user metadata only.
- Best and active may be the same recording.
- Best and active may be independently cleared.
- Setting best must not implicitly set active, and setting active must not implicitly set best.
- Metadata is scoped to a P2-01 sheet take group id, not global recording id alone.
- A recording id can be selected only if it belongs to that group at write time.
- Missing metadata means `bestRecordingId: null` and `activeRecordingId: null` behavior to callers.
- Deleted or missing recording refs must not crash reads, grouping, repository normalization, or future UI rendering.
- Quick recordings remain quick recordings and are not given fake sheet take metadata in this slice.
- Legacy sheet recordings without `segmentContext` are eligible through their P2-01 no-segment group.
- Segment recordings are eligible through their saved segment group, using saved metadata rather than live segment definitions.

## Deleted Or Missing Recording Refs

The coding agent should choose one clear behavior and test it:

- Preferred: `deleteRecording(recordingId)` removes that id from any `bestRecordingId` or `activeRecordingId` fields, and removes metadata records that then have no best and no active selection.
- Additionally, read/resolve helpers must be defensive if stale metadata is loaded from old or manually-edited storage:
  - return `bestRecording: null` when `bestRecordingId` no longer exists in the group
  - return `activeRecording: null` when `activeRecordingId` no longer exists in the group
  - do not mutate storage during a read-only resolve unless an existing repository normalization pattern already writes on save

This avoids stale references while keeping reads safe for existing or corrupted local data.

## Backwards Compatibility

- Existing snapshots with only `sessions`, `recordings`, and `errorMarkers` remain valid.
- `getSnapshot()` should either include `takeSelections: []` after normalization or repository methods should behave as though it exists. Choose the option least disruptive to current tests.
- Existing recordings are not rewritten until a normal save, metadata write, or delete occurs.
- Existing quick recordings, legacy sheet recordings, malformed segment contexts normalized to `null`, and unsupported sheet recordings with missing `sheetId` keep their current P2-01/P2-02 behavior.
- No migration script is required unless tests prove the current repository cannot safely tolerate the optional field.

## Boundary Conditions And Negative Cases

Cover these explicitly:

- Empty recording history with no metadata returns no best/active selection.
- Existing snapshot with no `takeSelections` field loads without errors.
- Segment group can store different best and active recording ids.
- Segment group can store the same recording id for best and active.
- No-segment legacy group can store and reload best/active metadata.
- Clearing best preserves active.
- Clearing active preserves best.
- Setting best/active to a recording outside the group is rejected and does not persist partial changes.
- Setting best/active to a missing recording id is rejected.
- Quick recording ids are rejected for sheet take group metadata.
- Unsupported/ungrouped sheet recordings without valid `sheetId` cannot receive group-scoped metadata.
- Persisted stale best/active ids resolve to `null` safely.
- Deleting a best recording clears best while preserving active when active points elsewhere.
- Deleting an active recording clears active while preserving best when best points elsewhere.
- Deleting a recording selected as both best and active removes or clears both fields.
- Duplicate metadata for one group is deterministic.
- Invalid persisted metadata entries do not break valid entries.

## Expected Files And Areas To Touch

Likely touch:

- `src/lib/recordings-review/types.ts`
- `src/lib/recordings-review/repository.ts`
- `tests/unit/recordings-review-repository.test.ts`

Maybe touch:

- New `src/lib/recordings-review/take-selection-metadata.ts` if keeping validation/resolve helpers out of `repository.ts` makes the repository clearer.
- `tests/unit/recordings-review-take-groups.test.ts` only if group compatibility tests need a small assertion around metadata resolution.
- `src/infrastructure/db/recording-history-metadata-repository.ts` only if TypeScript requires preserving `takeSelections` when it saves sheet recording metadata into the shared snapshot.

Avoid:

- `src/components/recordings-review/*`
- `src/app/recordings/*`
- `src/components/sheet-practice/recording/*`
- Recording capture/playback/audio/waveform services
- Dexie database files unless preserving existing shared types requires a narrow import-only change

If `recordingHistoryMetadataRepository.saveRecordingMetadata(...)` writes snapshots, it must preserve existing `takeSelections` just like it preserves `errorMarkers`.

## Acceptance Criteria

- Repository/service code can persist best and active recording ids for a P2-01 sheet take group.
- Best and active are separate metadata fields and can be set, cleared, and resolved independently.
- Latest take behavior remains unchanged and derived from recording time.
- Existing snapshots without metadata load and group successfully.
- Metadata survives save/reload through the existing local recording history boundary.
- Deleting recordings clears or removes affected best/active references without orphaning unsafe state.
- Stale or malformed persisted metadata is safe to read and does not hide valid recordings or groups.
- Segment, no-segment legacy, quick, and unsupported/ungrouped cases behave according to the boundary above.
- No UI, waveform, scoring, or automatic best selection is added.

## Test Coverage Plan

Unit tests:

- Add focused repository/helper tests for metadata validation, setting, clearing, resolving, and duplicate normalization.
- Use in-memory `ReviewRecording` fixtures similar to existing recording review tests.
- Assert latest ordering from `groupRecordingsByTake(...)` is unchanged before/after metadata writes.
- Assert best/active do not derive from newest recording when metadata is missing.

Persistence/reload tests:

- Save a mixed snapshot, set best and active, read raw `localStorage`, then reset/re-read through `recordingHistoryRepository.getSnapshot()` or metadata methods.
- Verify metadata survives reload and resolves to the expected recordings.
- Verify snapshots without `takeSelections` return empty/default selection state.

Deletion and stale ref tests:

- Delete a recording referenced as best only.
- Delete a recording referenced as active only.
- Delete a recording referenced as both.
- Load raw storage containing stale refs to missing recordings and assert resolve helpers return `null` safely.
- Verify unrelated selections in other groups survive deletion.

Compatibility cases:

- Segment sheet group with two takes.
- No-segment legacy sheet group with absent `segmentContext`.
- Explicit `segmentContext: null` grouped with legacy no-segment recordings.
- Quick recordings rejected or ignored for best/active sheet take metadata.
- Unsupported/ungrouped sheet recordings with missing/blank `sheetId` rejected or unresolved.
- Metadata writes preserve existing sessions, recordings, error markers, and segment context.

Integration-style unit tests:

- Seed `window.localStorage` under `RECORDINGS_STORAGE_KEY` with raw legacy/current snapshots.
- Read through `recordingHistoryRepository`.
- Use `recordingHistoryRepository.getTakeGroups()` to obtain the target group and then metadata methods to set/resolve selections.
- If `recordingHistoryMetadataRepository.saveRecordingMetadata(...)` is touched or affected, add a regression that existing take selections survive metadata-only sheet recording saves.

No browser E2E is required for P2-03 because there is no UI. P2-04 owns browser interaction coverage.

## Verification Commands

Use the local npm wrapper from the repo root:

```powershell
.\scripts\npm-local.ps1 run lint
.\scripts\npm-local.ps1 run typecheck
.\scripts\npm-local.ps1 run test:unit
```

For a narrower development loop:

```powershell
.\scripts\npm-local.ps1 exec vitest run tests/unit/recordings-review-repository.test.ts tests/unit/recordings-review-take-groups.test.ts
```

Final verification should include lint, typecheck, and unit tests.

## Model Tier Recommendation

- Coding agent: GPT-5.4, high effort, standard speed
- Review agent: GPT-5.4-mini, high effort, standard speed
- Verification agent: GPT-5.4-mini, high effort, standard speed

Rationale: Tier B is appropriate because this is local metadata persistence and repository/service boundary work with backwards compatibility and deletion semantics, but no UI, no real media artifact verification, no migration script, and no destructive cleanup workflow. Escalate only if implementation discovers a required migration or broad cleanup of persisted data. Do not use fast tier.

## Constraints For Coding Agent

- Reuse existing recording history repository, local storage key, snapshot normalization, and P2-01 grouping API.
- Reuse existing TypeScript types and local test fixture patterns.
- Keep the persistence boundary inside `src/lib/recordings-review/` unless a narrow shared type update is necessary.
- Do not add packages.
- Do not add a new persistence backend.
- Do not add migration code unless clearly justified by failing backwards compatibility tests.
- Do not let UI call storage directly.
- Do not mutate grouping semantics or latest-take sorting.
- Do not inspect or decode audio artifacts.
- Do not implement UI, waveform, scoring, automatic selection, tags, favorites, archive, export, or cleanup behavior.

## Handoff Notes For P2-04 UI

- P2-04 should consume the repository/service methods from this slice rather than reading raw snapshot metadata.
- P2-04 should render best and active as explicit user-set states, not as newest/latest.
- P2-04 should allow independent mark/unmark flows for best and active.
- P2-04 should use P2-01 `groupId` and recording ids as anchors.
- P2-04 should surface stale/deleted refs as unselected state; it should not need to repair storage in UI code.
- If P2-02 created grouped row components, P2-04 can add controls/badges there without changing grouping rules.
