# P1-08 Recording Metadata Segment Fields Plan

## Slice

- Slice id: P1-08 `recording-metadata-segment-fields`
- Pack: Pack 1 Practice Segment MVP
- Product contract: `practice.segment-recording` and related Practice Segment context in `docs/v1/05f-practice-segments.md`
- Planning model requirement: GPT-5.5, medium effort, standard speed
- Coding tier: Tier B, local persistence/service metadata compatibility
- Status: planning artifact only; do not mark verified from this plan

## Goal

Prepare recording metadata to carry optional Practice Segment context. This slice defines and validates the persisted metadata shape, keeps old/no-segment recordings readable, and preserves the existing recording/session/review boundaries so P1-09 can later pass the selected segment context during recording save.

## Scope

- Add a reusable segment-context metadata type for sheet recordings.
- Extend `SheetRecordingMetadata` so it can carry `segmentContext: SheetRecordingSegmentContext | null`.
- Extend `SheetRecordingMetadataInput` so callers can pass optional segment context later.
- Extend `ReviewRecording` sheet records so the same optional context can survive the metadata-only placeholder path and the final artifact record path.
- Update parsing/validation so omitted legacy fields and explicit `null` both normalize to `null`.
- Update the recording history metadata bridge to map segment context both directions.
- Update focused unit/integration tests for validation, persistence, read-back, and backwards compatibility.

## Non-Scope

- No recording UI changes, segment picker changes, review display changes, or metadata form work.
- No recording-start or recording-save binding to active selected segment. P1-09 owns passing real selected segment context into save.
- No `Record again`, rerecord workflow state, take grouping, best/latest take semantics, waveform comparison, or review grouping.
- No new segment persistence, segment CRUD changes, segment repository queries from recording services, MeasureGrid CRUD, or grid recalculation during recording metadata save.
- No migration script that rewrites existing localStorage records. Backwards compatibility must happen through tolerant parsing/normalization.
- No import/export or backup/restore behavior unless an existing test fixture directly reads the recording history serialization.

## Data Contract

Add the following domain type near `SheetRecordingMetadata` in `src/domain/practice/types.ts`:

```ts
export type SheetRecordingSegmentContext = {
  segmentId: string;
  segmentName: string;
  range: MeasureRange;
  targetBpm: number | null;
  measureGridVersion: string;
  measureGridSnapshot: MeasureGrid;
  measureRangeMs: MeasureRangeMs;
};
```

Ownership notes:

- Reuse existing `MeasureRange`, `MeasureGrid`, and `MeasureRangeMs` from `@/domain/practice/measure-grid`.
- Reuse existing segment validation policies: non-empty ids, segment name max 80, target BPM integer `30..300` or `null`, valid inclusive measure range.
- Reuse existing MeasureGrid validation and deterministic range math. Do not duplicate ad hoc measure-range validators.
- `measureGridVersion` must match the segment's saved association version at context capture time. P1-08 only validates it as a non-empty string.
- `measureGridSnapshot` and `measureRangeMs` are snapshots. They must not be recalculated later from the live segment repository during metadata read.

Extend `SheetRecordingMetadata`:

```ts
segmentContext: SheetRecordingSegmentContext | null;
```

Extend `ReviewRecording`:

```ts
segmentContext?: SheetRecordingSegmentContext | null;
```

Null and absent behavior:

- Existing recordings without any segment fields must parse/read as `segmentContext: null` at the domain/session metadata boundary.
- Persisted `segmentContext: null` must remain valid.
- Persisted `segmentContext: undefined` or absent must remain valid.
- Invalid non-null segment context should make `parseSheetRecordingMetadata` return `null` for direct domain validation, but the recording history repository should not discard otherwise valid legacy recordings merely because an unknown optional segment payload is malformed. Normalize malformed review-recording segment context to `null` where possible.
- Quick recordings must not require or use segment context.

Snapshot semantics:

- Segment context is immutable recording metadata. If a source segment is later renamed, edited, deleted, or made stale by grid changes, the recording keeps the saved `segmentId`, `segmentName`, `range`, `targetBpm`, grid snapshot/version, and `measureRangeMs`.
- `segmentName` is a display snapshot, not a foreign-key lookup.
- `range` is the inclusive user-entered measure range.
- `measureRangeMs` is the timestamp range derived when context is captured. P1-09 owns calculating/passing it from the active selected segment and grid.

## UI/UX Contract

No user-visible UI is required in this slice.

- Do not add segment badges to `LatestSheetRecording`, the Recordings page, recording list filters, or recording detail panels.
- Do not add a recording metadata form field or segment selector.
- Existing recording UI must continue to render old and new records without crashing.
- If a coding agent finds that a component must be adjusted because type changes require it, keep the UI text/output unchanged and limit the edit to null-safe data plumbing.

## Service And Repository Contract

Existing boundaries to preserve:

- `src/services/practice-session/service.ts` owns `createSheetRecordingMetadata`.
- `src/infrastructure/db/recording-history-metadata-repository.ts` maps `SheetRecordingMetadata` to/from `ReviewRecording`.
- `src/lib/sheet-practice/recording-service.ts` creates the final artifact-backed `ReviewRecording`.
- `src/lib/recordings-review/repository.ts` normalizes the local recording history snapshot.

Required behavior:

- `createSheetRecordingMetadata(input)` accepts `segmentContext?: SheetRecordingSegmentContext | null` and writes it to the returned `SheetRecordingMetadata`.
- If `segmentContext` is omitted, save `null`.
- The practice session service validates the supplied context but does not fetch segments, grids, or repositories to build it.
- `recordingHistoryMetadataRepository.saveRecordingMetadata(recording, session)` persists the segment context on the metadata-only review record.
- `recordingHistoryMetadataRepository.listRecordingMetadata*()` returns the same segment context from review history.
- `createSheetReviewRecording({ metadata, artifact, settings })` copies `metadata.segmentContext` onto the final artifact-backed `ReviewRecording`.
- The final `saveSheetReviewRecording` replacement must not drop segment context when replacing the metadata-only placeholder.
- `recordingHistoryRepository.getSnapshot()` and `saveSnapshot()` must preserve valid optional segment context on sheet recordings while keeping old snapshots valid.

Do not:

- Inject `PracticeSegmentService` into recording/session services for this slice.
- Resolve `segmentId` against live segment storage during read or save.
- Mutate segment records from recording save.
- Store parallel top-level fields such as `segmentId` beside a nested `segmentContext`; use one nested object to avoid partial-field drift.

## Edge Cases

- Deleted segment after recording: recording still displays/reads with saved snapshot; no live lookup.
- Renamed segment after recording: saved `segmentName` remains unchanged.
- Edited measure range after recording: saved `range` and `measureRangeMs` remain unchanged.
- Grid changed after recording: saved `measureGridSnapshot`, `measureGridVersion`, and `measureRangeMs` remain unchanged.
- Stale active selection at future save time: P1-09 must validate before passing context; P1-08 only validates supplied metadata shape.
- Missing segment or missing grid in repository: P1-08 metadata parsing is unaffected because it uses snapshots only.
- Old recordings without segment fields: accepted and normalized to null.
- No-segment recordings: accepted with `segmentContext: null`; final artifact record must remain valid.
- Invalid ranges, invalid target BPM, invalid grid snapshot, non-finite timestamps, or empty segment ids/names: reject at `SheetRecordingMetadata` validation.
- Malformed optional segment context in raw review history: preserve the recording if the rest of the record is valid, but expose segment context as null.
- Serialization: JSON round trip must preserve valid nested context exactly enough for deep equality in tests.
- Error markers: remain scoped by `recordingId`; no marker schema changes.
- Import/export: no dedicated implementation in this slice. If any existing local-data export test serializes `ReviewRecording`, it should pass through optional `segmentContext` without special casing.

## Implementation Boundaries

Likely files to change:

- `src/domain/practice/types.ts`
  - Add `SheetRecordingSegmentContext`.
  - Extend `SheetRecordingMetadata`.
  - Import or re-export measure-grid types as needed without circular dependencies.
- `src/domain/practice/validation.ts`
  - Add `sheetRecordingSegmentContextSchema`.
  - Normalize omitted/null `segmentContext` to null on sheet metadata parse/validate.
- `src/services/practice-session/types.ts`
  - Extend `SheetRecordingMetadataInput` with optional `segmentContext`.
- `src/services/practice-session/service.ts`
  - Copy validated optional `segmentContext` into created metadata.
- `src/lib/recordings-review/types.ts`
  - Extend `ReviewRecording` with optional `segmentContext`.
- `src/lib/recordings-review/repository.ts`
  - Normalize optional valid segment context on read/write without rejecting otherwise valid recordings.
- `src/infrastructure/db/recording-history-metadata-repository.ts`
  - Map context in `toSheetRecordingMetadata` and `toReviewRecording`.
- `src/lib/sheet-practice/recording-service.ts`
  - Copy metadata context into final review recording.
- Tests:
  - `tests/unit/practice-session-service.test.ts`
  - `tests/unit/recordings-review-repository.test.ts`
  - `tests/unit/sheet-practice-recording.test.ts`
  - Add a small focused domain validation test if the existing validation section becomes crowded.

Explicitly out of scope:

- `src/components/sheet-practice/segments/*`
- `src/components/sheet-practice/recording/latest-sheet-recording.tsx`, unless only a type/null-safety adjustment is unavoidable.
- `src/components/recordings-review/*`
- `src/infrastructure/db/browser-practice-segment-service.ts`
- `src/services/practice-segments/*`
- `src/services/measure-grid/*`
- E2E specs, except a very small smoke update only if a type-safe fixture must include `segmentContext: null`.

## Test Plan

Unit/domain validation:

- `parseSheetRecordingMetadata` accepts old metadata without `segmentContext` and returns `segmentContext: null`.
- `validateSheetRecordingMetadata` accepts explicit `segmentContext: null`.
- Valid segment context accepts:
  - `segmentId: "segment-alpha"`
  - `segmentName: "Bridge"`
  - `range: { startMeasure: 5, endMeasure: 12 }`
  - `targetBpm: 96` and separately `targetBpm: null`
  - valid `measureGridVersion`
  - valid `measureGridSnapshot`
  - valid `measureRangeMs`
- Invalid segment context rejects empty id/name, bad range, bad target BPM, invalid grid snapshot, negative/non-finite `measureRangeMs`, and `endMs < startMs`.

Practice session service:

- `createSheetRecordingMetadata` without segment input returns metadata with `segmentContext: null` and preserves current behavior.
- `createSheetRecordingMetadata` with valid segment context returns/saves the exact snapshot.
- Invalid segment context rejects before recording repository save and does not increment recording count or latest recording id.
- Existing tests for missing session, force-new-session, and invalid session metadata keep passing.

Recording history metadata repository:

- `saveRecordingMetadata` stores segment context on the shared `ReviewRecording`.
- `listRecordingMetadataForSession` maps it back into `SheetRecordingMetadata`.
- Legacy review recordings without `segmentContext` still list as metadata with null context.
- A valid final artifact-backed sheet recording maps back with the same segment context.
- Mismatched session/sheet validations continue to fail as before.

Recording review repository:

- Raw snapshot with no segment fields still loads.
- Raw snapshot with valid `segmentContext` preserves it through `getSnapshot()` and `saveSnapshot()`.
- Raw snapshot with malformed optional `segmentContext` keeps the recording but normalizes context to null.
- Quick recording snapshots are unaffected.
- Deleting a recording still deletes linked error markers and does not need segment-specific cleanup.

Sheet practice recording service:

- `createSheetReviewRecording` copies `metadata.segmentContext` into the final `ReviewRecording`.
- `stopAndSave` still calls `createSheetRecordingMetadata` with no segment context in this slice unless its input type must pass through an optional field; current no-segment behavior remains valid.
- Rollback tests still prove placeholder metadata and session state are restored/deleted on final history save failure.
- Add a direct unit test proving a metadata object with segment context survives final artifact save when returned by the injected session service.

Component/E2E:

- No component tests are required unless type changes force null-safe fixture updates.
- No targeted Playwright E2E is required because P1-08 exposes no user-visible behavior and does not bind active segment at save time.
- P1-09 must add browser recording artifact coverage for real segment-linked saves.

## Verification Commands

Use README Windows command style:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/practice-session-service.test.ts tests/unit/recordings-review-repository.test.ts tests/unit/sheet-practice-recording.test.ts
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run typecheck
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run lint
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run build
```

If the implementation touches any recording review or Sheet Practice component fixture, also run the narrowly affected component test file. Full `test:e2e` is not expected for this slice unless the coding agent accidentally adds user-visible behavior, which should be treated as a scope warning.

## Acceptance Checklist

- [ ] `SheetRecordingMetadata` supports optional segment context and normalizes omitted/null to null.
- [ ] Segment context includes segment id, segment name snapshot, inclusive measure range, optional target BPM, grid version, grid snapshot, and derived timestamp range.
- [ ] Validation rejects malformed non-null segment context.
- [ ] Legacy/no-segment recordings still parse, list, and render through existing paths.
- [ ] Valid segment context persists through recording history JSON serialization.
- [ ] Metadata-only review records and final artifact-backed review records preserve the same context.
- [ ] Recording/session services accept supplied context without querying segment or grid repositories.
- [ ] Source segment mutation/deletion cannot change saved recording context.
- [ ] No UI, recording-save binding, rerecording, take grouping, or review display behavior is implemented.
- [ ] Focused unit/integration tests cover schema, persistence, backward compatibility, and rollback/no-segment behavior.
- [ ] Typecheck, lint, build, and targeted unit tests are run and reported by the coding agent.

## Handoff Notes For Coding Agent

- Treat P1-08 as a schema and boundary slice. The right implementation should feel boring.
- Prefer a single nested `segmentContext` object across domain and review-history records.
- Keep parsing tolerant for old data, but strict for new non-null segment context.
- Do not compute or fetch segment context in recording services yet. P1-09 will capture the active selected segment and pass this object in.
- Preserve all existing no-segment recording tests; they are the main regression guard for this slice.
