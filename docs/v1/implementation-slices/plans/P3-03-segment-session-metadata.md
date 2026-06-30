# P3-03 Segment Session Metadata Plan

## Slice

- Slice id: `P3-03 segment-session-metadata`
- Pack: `pack-3-sessions-continue-practice`
- Current scheduler status: `verified`
- Product features touched by this slice:
  - `sessions.segment-session-metadata`
- Future consumers, not implemented in P3-03:
  - `sessions.session-history-grouping`
  - `home.continue-practice-recommendations`
  - `continue-practice.segment-routing`
- Planning model: `gpt-5.5`, extra-high effort, standard speed
- Coding/review/verification tier: Tier B - Local Persistence / Service Boundary, with extra-high effort

## External Plan Review Gate

- This planning pass only writes the durable plan file.
- Leave `docs/v1/status.json` unchanged.
- Before coding, the scheduler must send this complete plan text, uncompressed, through the logged-in web ChatGPT `metronome` project review gate and incorporate required changes.
- Do not mark this slice `ready_for_coding` until that review gate passes.

## External Review Notes

- Web ChatGPT metronome project plan review: `PASS_WITH_CHANGES`.
- Web ChatGPT metronome project delta review: `PASS`.
- Internal implementation review: `PASS` after one required boundary fix.
- Independent verification review: `PASS`.
- Required changes applied in this plan revision:
  - Narrowed product-feature labels so P3-04 grouping and P3-08/Continue work are future consumers, not P3-03 deliverables.
  - Closed the `ensureSheetSession` future-caller wording that could invite selected-segment activity propagation.
  - Made Dexie-backed repository/reload compatibility tests mandatory.
  - Tightened defaulting so only missing or `undefined` `segmentContext` defaults to `null`; malformed non-null context must be rejected.
  - Required session `segmentContext` writes to happen through the existing prepared-session commit path, not a post-commit patch.
  - Reframed Continue/deleted-segment checks as regression-only, not new P3-08 behavior.
  - Added an explicit deferred work register.
- Remaining required changes after delta review: none.

## Implementation Evidence

- Implemented safe `P3-03A segment-session-metadata-boundary`.
- Changed production scope stayed within domain validation/types, practice-session service/repository boundaries, and legacy global session conversion.
- `PracticeSession.segmentContext` is a nullable `SheetRecordingSegmentContext | null`.
- Legacy missing or `undefined` session `segmentContext` parses as `null`; explicit `null` is valid; malformed non-null context is rejected/filtered; quick sessions reject non-null segment context.
- Non-null session segment-context writes are confined to validated recording metadata -> prepared session -> `commitPreparedSheetRecordingSession`.
- `ensureSheetSession` does not expose, stamp, or clear caller-provided `segmentContext`; it initializes new sheet sessions with `null` and preserves an existing persisted value when reusing a session.
- Dexie-backed repository/reload tests cover valid segment context, legacy missing context, and malformed non-null rows.
- No package, route, production UI, event persistence, grouping, duration, Home, Continue Practice routing, new store, index, or migration changes were added.
- Internal code review found one P2 boundary issue in `ensureSheetSession`; the same coding agent fixed it and delta review returned `PASS`.
- Local verification passed:
  - `& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/practice-session-service.test.ts tests/unit/practice-session-repository.test.ts tests/unit/sheet-practice-recording.test.ts tests/unit/quick-metronome-session.test.ts tests/unit/recordings-review-repository.test.ts tests/unit/reference-panel.test.tsx tests/unit/sheet-practice-controls.test.tsx` -> 7 files / 142 tests passed.
  - `& .\scripts\npm-local.ps1 --% run typecheck` -> passed.
  - `& .\scripts\npm-local.ps1 --% run lint -- <P3-03 changed files>` -> passed.
  - `git diff --check` -> passed with CRLF warnings only.
- Independent verification agent result: `PASS`.

## Refined Scope

Add optional segment metadata to persisted sheet practice sessions without changing event persistence, duration rules, grouping, Home UI, or Continue Practice routing.

P3-03 does not deliver session-history grouping, Home recommendations, or Continue Practice segment routing. It only stores a nullable sheet-session segment snapshot for later slices.

The safe first PR boundary for P3-03 is:

- Add a nullable `segmentContext` field to the `PracticeSession` domain model.
- Permit `segmentContext` only on `sourceType: "sheet"` sessions.
- Reuse the existing `SheetRecordingSegmentContext` snapshot shape and validation.
- Normalize legacy sessions with no `segmentContext` field to `segmentContext: null`.
- Persist the field in the existing practice-session Dexie `sessions` row value.
- Propagate segment context to the sheet session only through already validated service boundaries:
  - In P3-03A, production writes of non-null `segmentContext` must come only from the existing sheet recording save path: validated recording metadata -> prepared session -> `commitPreparedSheetRecordingSession`.
  - `ensureSheetSession` may support omit-vs-null preservation/clearing semantics only as needed by that existing prepared-session path and focused tests.
  - `ensureSheetSession` must not become a new general selected-segment activity writer in this slice.
  - `prepareSheetRecordingMetadata` must copy the validated recording `segmentContext` into the prepared session.
  - `commitPreparedSheetRecordingSession` must save that prepared session atomically with the existing session commit behavior.
- Preserve existing no-segment sheet sessions and all quick sessions as `segmentContext: null`.
- Keep successful segment-linked recording metadata and the linked session metadata aligned after commit.

This plan intentionally does not broaden P3-03 into full segment session history. A single nullable session snapshot is descriptive metadata for later slices. It is not a duration partition, event timeline, take group, or continue target.

## Explicit Out Of Scope

- Durable session event repository, event table, event migration, event replay, or an `events` array on `PracticeSession`.
- Duration calculation from event pairs or segment ranges.
- Grouping session history by segment/date/sheet.
- Home recent activity, dashboard analytics, streaks, goals, or visible timeline UI.
- Continue Practice navigation to a segment or stale segment target rejection.
- Persisting selected segment UI state by itself. Viewing or selecting a segment still must not count as practice.
- Metronome-only or reference-only segment focus propagation is out of scope even if a service input could technically carry a `segmentContext`.
- New Practice Segment repository behavior, segment CRUD changes, measure-grid changes, or segment deletion cleanup.
- Recording artifact changes, waveform changes, take grouping, best/active take selection, or review comparison.
- Cross-device sync, login, backup conflict handling, automatic score following, automatic mistake detection, automatic PDF recognition, scoring, or cloud merge fields.
- Package changes or new dependencies.

## Likely Files And Areas

Primary domain and service files:

- `src/domain/practice/types.ts`
  - Add nullable `segmentContext` to `PracticeSession`.
  - Prefer reusing `SheetRecordingSegmentContext` directly for this slice.
  - If the coding agent wants a more general name, add only a type alias such as `SheetPracticeSegmentContext = SheetRecordingSegmentContext`; do not rename all call sites.
- `src/domain/practice/validation.ts`
  - Reuse `sheetRecordingSegmentContextSchema`.
  - Add an optional/defaulted `segmentContext` field to `practiceSessionSchema`.
  - Enforce quick sessions have `segmentContext: null`.
  - Enforce sheet sessions may have either `null` or a valid snapshot.
- `src/services/practice-session/types.ts`
  - Keep `SheetPracticeActivityInput` free of `segmentContext`.
  - Keep `segmentContext?: SheetRecordingSegmentContext | null` only on recording metadata input.
  - No quick-session segment input.
- `src/services/practice-session/service.ts`
  - Create new quick and sheet sessions with `segmentContext: null`.
  - Preserve existing segment context when `ensureSheetSession` reuses a session.
  - Do not let `ensureSheetSession` stamp or clear caller-provided segment context.
  - Validate `segmentContext` before mutating recording count, `latestRecordingId`, `updatedAt`, or session `segmentContext`.
  - Set prepared sheet recording sessions to `metadata.segmentContext`.
  - Do not use `ensureSheetSession` to write selected-segment state for metronome-only or reference-only activity.
  - Keep `captureSessionEvent` read-only with respect to sessions.
- `src/infrastructure/db/practice-session-repository.ts`
  - Ideally no schema/index version change. Touch only if a narrow test helper or type adjustment is needed.
- `src/infrastructure/db/global-practice-session-repository.ts`
  - Ensure legacy quick-session conversion produces or parses `segmentContext: null`.
- `src/infrastructure/db/recording-history-metadata-repository.ts`
  - Touch only if TypeScript needs the linked session type to include `segmentContext`.

Likely tests:

- `tests/unit/practice-session-service.test.ts`
- `tests/unit/sheet-practice-recording.test.ts`
- `tests/e2e/sheet-segment-recording.spec.ts`
- `tests/e2e/sheet-practice-session.spec.ts` only for regression coverage if the session snapshot helper changes.
- `tests/unit/factories/practice.ts` only if existing session/segment fixtures need the new field.
- A narrow practice-session repository test or test helper may be added only if needed for Dexie reload/backward-compatibility coverage.

Do not edit UI components unless the TypeScript surface requires prop/test fixture updates. Do not add segment labels, route parameters, buttons, badges, or Home content in P3-03.

## Exact Data, Model, And Persistence Boundary

Add this concept to the session model:

```ts
type PracticeSession = {
  id: string;
  sourceType: "quick" | "sheet";
  sheetId: string | null;
  startedAt: string;
  endedAt: string | null;
  durationMs: number;
  bpm: number | null;
  timeSignature: PracticeTimeSignature | null;
  recordingCount: number;
  latestRecordingId: string | null;
  updatedAt: string;
  segmentContext: SheetRecordingSegmentContext | null;
};
```

Field semantics:

- `segmentContext: null` means the session has no durable segment focus.
- A non-null `segmentContext` is a snapshot of the latest committed segment-scoped sheet-session activity.
- The snapshot uses the existing fields:
  - `segmentId`
  - `segmentName`
  - `range`
  - `targetBpm`
  - `measureGridVersion`
  - `measureGridSnapshot`
  - `measureRangeMs`
- The snapshot is historical metadata. It must remain valid even if the live segment is later renamed, edited, deleted, or made stale by a grid change.
- `segmentContext` does not prove every event or every millisecond in the session belongs to that segment.
- `segmentContext` must not be derived from P3-02 captured events.
- `segmentContext` must not point to a live segment record that must be loaded for session parsing.

Persistence boundary:

- Store `segmentContext` inside the existing `PracticeSession` row in the existing Dexie `sessions` object store.
- Do not add a new table, object store, index, or repository for P3-03.
- Do not index `segmentContext.segmentId` in P3-03. P3-04 may decide whether grouping needs an index after it defines query shape.
- Do not persist only `segmentId`; use the full snapshot so deleted/stale segment handling remains local and robust.
- Do not duplicate recording artifact data, waveform peaks, take grouping data, or event records into the session row.

Write semantics:

- New quick sessions always write `segmentContext: null`.
- New sheet sessions write `segmentContext: null`.
- Existing sheet sessions preserve their current `segmentContext` when `ensureSheetSession` reuses the session.
- `ensureSheetSession` must not accept, stamp, or clear caller-provided segment context.
- Successful sheet recording commits set the prepared session `segmentContext` to the recording metadata `segmentContext`.
- Failed sheet recording saves, rollbacks, and discarded captures must not leave new segment session metadata behind.
- Do not persist `segmentContext` through a separate post-commit session patch.
- The final session object, including `recordingCount`, `latestRecordingId`, `updatedAt`, and `segmentContext`, must be committed through the existing prepared-session commit path.
- If `commitPreparedSheetRecordingSession` fails, rollback must restore/delete the session exactly as existing behavior requires, including its previous `segmentContext`.

## Migration And Backward Compatibility

No Dexie schema version bump should be required for the safe first PR.

Reason:

- The existing `sessions` object store already stores full session objects.
- Adding a non-indexed value field does not require changing object-store indexes.
- Existing rows can be parsed by defaulting missing or `undefined` `segmentContext` to `null`.
- Existing quick legacy sessions from `recordingHistoryRepository` can be converted with `segmentContext: null`.

Required compatibility behavior:

- `parsePracticeSession` accepts legacy rows that omit `segmentContext` and returns `segmentContext: null`.
- `validatePracticeSession` accepts explicit `segmentContext: null`.
- `validatePracticeSession` rejects quick sessions with non-null `segmentContext`.
- `parsePracticeSession` rejects a row with a present but malformed non-null `segmentContext`, matching the existing safe-filter behavior for malformed session rows.
- Defaulting is allowed only for missing or `undefined` `segmentContext`. Explicit `null` is valid.
- Any explicit non-null object must be validated by the full shared `sheetRecordingSegmentContextSchema`.
- The implementation must not coerce malformed objects, blank strings, invalid ranges, invalid measure-grid snapshots, or mismatched `measureRangeMs` to `null`.
- Quick sessions with explicit non-null `segmentContext` must be rejected, not normalized to `null`.
- Existing sheet sessions without segment metadata still appear in Today Summary and Continue Practice.
- Existing sheet recordings without segment metadata still save, display, and play normally.

If the coding agent believes a Dexie version bump, indexed `segmentId`, backfill, or new migration table is required, stop and return to planning. That is broader than P3-03's safe first PR boundary.

## Interaction With P3-01 And P3-02

P3-01 defined `PracticeSessionEvent` and permits optional `segmentId` on events. P3-02 captures transport events through a sink, but those events are intentionally non-durable today.

P3-03 must keep those boundaries:

- Do not persist P3-01/P3-02 events.
- Do not add an event repository or Dexie event store.
- Do not reconstruct `segmentContext` from captured event `segmentId`.
- Do not use event order to set or clear session segment metadata.
- Do not calculate duration, grouped time, active segment intervals, or complete/incomplete event pairs.
- Do not change the event kind union, payload shape, or event sink semantics.
- It is acceptable for P3-02 to keep emitting `segmentId` as transient event context while P3-03 stores a fuller session snapshot from the service/recording metadata boundary.

The important distinction:

- Event `segmentId` is transient context on a captured action.
- Session `segmentContext` is persisted descriptive metadata on a sheet session.
- Neither one is a duration/grouping engine in this slice.

## Boundary Conditions

Legacy sessions:

- Missing `segmentContext` parses as `null`.
- Existing session summaries, Today Summary, Continue Practice, sorting, and Settings cleanup keep working.

Sheet sessions without a selected segment:

- Remain valid with `segmentContext: null`.
- No fake segment label or placeholder segment id is created.
- A successful no-segment sheet recording should clear a previously stored session segment context only through the explicit prepared-session commit path.

Quick sessions:

- Always have `sheetId: null` and `segmentContext: null`.
- `ensureQuickSession`, legacy quick conversion, quick recording links, and quick Continue Practice must not accept segment metadata.

Deleted or stale segments:

- Existing session snapshots remain readable.
- Loading session history must not require a live segment lookup.
- P3-03 must not delete sessions when segments are deleted.
- P3-03 must not rewrite old session snapshots when a segment is renamed or a MeasureGrid changes.
- P3-03 must not add or change segment deletion behavior.
- To prove snapshots are historical and do not require a live segment lookup, use a repository/storage-level read or an existing storage fixture where the session row contains `segmentContext` but no live segment lookup is performed.

Record-again and Practice Again contexts:

- A successful Record Again save with a segment context should leave the linked session with that same context.
- If Practice Again creates a fresh session, the fresh session gets the new saved recording's segment context after successful commit.
- The source recording/session must not be mutated by a new Record Again save.
- If the source segment is missing or invalid and the existing UI blocks Record Again, no new session segment context should be written.

Rollback and save failures:

- Capture start failure must not write session segment metadata.
- Decode, silent/empty artifact, artifact save, recording history write, metadata validation, prepared session commit, and rollback failures must not leave a metadata-only segment session behind.
- Restoring a previous session snapshot must restore its previous `segmentContext`.
- Deleting a newly-created failed session must remove any attempted segment context with it.

Reload and local-first behavior:

- A segment-linked session must reload from IndexedDB with the same `segmentContext`.
- The app must work offline and without login.
- Clearing local data must clear sessions and their segment context with the existing session clear path.

Continue Practice behavior:

- Continue Practice behavior is regression-only in P3-03.
- Existing Continue Practice behavior must not regress.
- P3-03 must not add segment routing, segment stale-target rejection, or new Continue target resolution rules.

Mixed or changing session focus:

- P3-03 stores only one nullable snapshot. It represents the latest committed segment focus, not every activity inside the session.
- Later P3-04/P3-05 work must not infer segment duration or exclusive grouping from this field alone.
- If this limitation is not acceptable for a coding/review decision, stop and split the slice rather than adding a segment-session child table.

## Acceptance Criteria

1. `PracticeSession` includes `segmentContext: SheetRecordingSegmentContext | null`, and validation/defaulting handles legacy missing fields.
2. Quick sessions reject non-null segment context and continue to parse/save with `segmentContext: null`.
3. Sheet sessions accept null or valid segment context snapshots and reject malformed snapshots.
4. Successful segment-linked sheet recording commits persist the same segment snapshot on the linked session.
5. Successful no-segment sheet recording commits leave the linked session with `segmentContext: null`.
6. Failed recording saves, failed commits, rollbacks, and capture failures do not leak new session segment metadata.
7. Reloading the browser or resetting the Dexie connection preserves session segment context for valid rows and safely handles legacy rows.
8. P3-01/P3-02 event capture remains non-durable and unchanged; no event persistence, duration calculation, grouping, analytics, or Continue Practice segment routing is added.
9. Existing quick sessions, sheet sessions without segment metadata, legacy recordings, Today Summary, Settings clear data, and sheet Continue Practice still work.
10. The diff contains no package changes, broad UI additions, new storage tables, new indexes, new dependencies, or adjacent Pack 3 features.

## Test Coverage Plan

Unit/domain tests:

- `parsePracticeSession` normalizes a legacy quick row without `segmentContext` to `segmentContext: null`.
- `parsePracticeSession` normalizes a legacy sheet row without `segmentContext` to `segmentContext: null`.
- `validatePracticeSession` accepts a sheet session with a valid `segmentContext`.
- `validatePracticeSession` rejects a quick session with a non-null `segmentContext`.
- `parsePracticeSession` rejects malformed non-null segment context:
  - blank `segmentId`
  - blank `segmentName`
  - invalid measure range
  - invalid target BPM
  - invalid measure grid snapshot
  - mismatched `measureRangeMs`
- Existing `SheetRecordingSegmentContext` validation remains the shared source of truth.

Service tests in `tests/unit/practice-session-service.test.ts`:

- `ensureQuickSession` creates and updates quick sessions with `segmentContext: null`.
- `ensureSheetSession` creates a no-segment sheet session with `segmentContext: null`.
- `ensureSheetSession` ignores caller-provided segment context extras and cannot stamp segment context through the generic sheet activity path.
- `ensureSheetSession` preserves an existing committed context when it reuses a session.
- `ensureSheetSession` cannot clear segment context through the generic sheet activity path.
- `createSheetRecordingMetadata` or `prepareSheetRecordingMetadata` with a valid segment context returns a prepared session whose `segmentContext` equals metadata `segmentContext`.
- `commitPreparedSheetRecordingSession` persists that session context.
- A no-segment recording commit persists `segmentContext: null`.
- Invalid segment context rejects before recording count, latest recording id, or session context changes.
- `captureSessionEvent` with `segmentId` does not mutate session summaries or `segmentContext`.
- Legacy global quick sessions from localStorage parse with `segmentContext: null`.

Recording service tests in `tests/unit/sheet-practice-recording.test.ts`:

- `BrowserSheetRecordingService.stopAndSave` preserves segment context on both recording metadata and the prepared session commit.
- Event capture failure after a successful save does not roll back session segment metadata.
- Artifact save failure, history write failure, commit failure, and rollback paths do not emit `recording_stopped` and do not leave a new segment session context.
- Restoring a previous session snapshot restores its prior `segmentContext`.
- When an existing sheet session with prior `segmentContext` is overwritten by a new segment or cleared by a no-segment recording, a prepared-session commit failure restores the prior `segmentContext`.

Repository/reload tests:

- A narrow Dexie-backed practice-session repository/reload test is required for P3-03 unless an existing repository test already covers the exact same behavior and is extended in-place.
- E2E can supplement but must not replace this repository/reload evidence.
- Required cases:
  - Save a valid sheet session with `segmentContext`, reset/reopen the Dexie connection, and read the same snapshot back.
  - Seed a legacy row without `segmentContext` and verify it reads/parses as `segmentContext: null`.
  - Seed a malformed row with invalid non-null `segmentContext` and verify it is safely filtered/rejected according to existing repository behavior.

Browser E2E:

- Extend `tests/e2e/sheet-segment-recording.spec.ts` to inspect practice sessions after the existing real/synthetic segment recording flow:
  - Create sheet, grid, and segment.
  - Record and save a segment-linked take.
  - Verify the persisted session row has the same `segmentContext` as the saved recording.
  - Reload and verify the session row still has that snapshot.
- In the existing no-segment recording path, verify the saved session has `segmentContext: null`.
- If extending that E2E becomes too broad, add a smaller dedicated E2E that seeds the same path and reads `PRACTICE_SESSION_DB_NAME` directly through the existing storage fixture helpers.
- If an existing E2E can delete a segment without product changes, it may assert the old session snapshot remains readable as regression coverage, but segment deletion behavior is not a required P3-03 implementation path.

Negative cases:

- Quick session with segment context rejected.
- Sheet session with malformed context rejected.
- Missing sheet still cannot create a sheet session.
- Continue Practice remains regression-only: existing deleted-sheet stale-target behavior must not regress, but P3-03 must not add segment stale-target logic.
- Failed recording save does not create metadata-only session context.
- Record Again invalid source does not write segment context.
- Captured event `segmentId` alone does not persist session context.

## Deferred Work

Deferred to P3-04/P3-05/P3-08 or later:

- Segment/date/sheet session grouping.
- Any `segmentId` index or query optimization.
- Duration calculation from event pairs, segment ranges, or active intervals.
- Durable session event repository and event replay.
- Home recent activity, recommendations, stats, or UI.
- Continue Practice navigation to a segment.
- Stale/deleted segment Continue target rejection.
- Metronome-only or reference-only selected-segment activity propagation.
- Segment-session child table or multi-segment session timeline.

## Verification Evidence Required

The coding agent should report:

- Changed file list.
- Confirmation that `docs/v1/status.json` was not changed by the coding pass.
- Confirmation that no package files, new dependencies, new Dexie stores, new indexes, event repository, duration selector, grouping selector, Home UI, or Continue Practice routing changes were added.
- Focused unit test output.
- Browser reload/persistence evidence for a real segment-linked sheet recording path.
- Typecheck output.
- Lint output for changed files.
- `git diff --check` output.

Recommended repo-local PowerShell commands:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/practice-session-service.test.ts tests/unit/sheet-practice-recording.test.ts tests/unit/practice-session-events.test.ts tests/unit/practice-segment-domain.test.ts
& .\scripts\npm-local.ps1 --% run test:e2e -- tests/e2e/sheet-segment-recording.spec.ts tests/e2e/sheet-practice-session.spec.ts
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint -- src/domain/practice/types.ts src/domain/practice/validation.ts src/services/practice-session/types.ts src/services/practice-session/service.ts src/infrastructure/db/global-practice-session-repository.ts src/lib/sheet-practice/recording-service.ts tests/unit/practice-session-service.test.ts tests/unit/sheet-practice-recording.test.ts tests/e2e/sheet-segment-recording.spec.ts tests/e2e/sheet-practice-session.spec.ts
git diff --check
```

Adjust the lint file list to exactly match changed files; do not edit untouched files just to satisfy a broad lint command. If no E2E source changes are made, still run the focused E2E if browser reload/persistence evidence cannot be proven by a narrower Dexie-backed repository test.

The verification agent should independently confirm:

- Session rows persist `segmentContext` only as a nullable sheet-session field.
- Legacy rows remain backward compatible.
- Quick sessions cannot carry segment context.
- Recording metadata and session metadata align after successful segment-linked saves.
- Failure and rollback paths do not leak segment metadata.
- P3-01/P3-02 event capture did not become durable.
- No grouping, duration, Home, Continue Practice segment routing, UI display, package, or storage-index work slipped in.

## Model Tier

Use Tier B with extra-high effort for coding, review, and verification:

- Coding agent: `gpt-5.4`, extra-high effort, standard speed
- Review agent: `gpt-5.4-mini`, extra-high effort, standard speed
- Verification agent: `gpt-5.4-mini`, extra-high effort, standard speed

Reason:

- This is local persistence and service-boundary work.
- It changes a persisted domain shape and requires backward-compatibility/reload evidence.
- It should not require media internals, timing internals, waveform behavior, broad UI, or destructive data operations.

Escalate to Tier D only if implementation must change recording capture ordering, media artifact handling, or timing behavior. Escalate to Tier E only if it truly requires a Dexie migration, index change, backfill, cleanup, or data-deleting operation. In either escalation case, stop and return to planning first.

## Reuse Constraints And No-Wheel Rules

- Reuse `SheetRecordingSegmentContext` and `sheetRecordingSegmentContextSchema`.
- Reuse `createSheetRecordingSegmentContext` for snapshots; do not duplicate measure-grid range math.
- Reuse existing `validatePracticeSession`, `parsePracticeSession`, `validateSheetRecordingMetadata`, and practice-session service boundaries.
- Reuse Dexie and the existing practice-session repository. Do not create custom IndexedDB wrappers.
- Reuse existing PowerShell wrapper commands for verification.
- Do not add a generic segment-session repository, event bus, analytics engine, grouping selector, duration engine, or continue target resolver.
- Do not introduce a new segment snapshot shape unless a type alias is enough to clarify naming.
- Do not read live segment records when parsing sessions.
- Do not add new npm dependencies.
- Do not weaken existing tests, fixtures, or rollback assertions.

## Size Guardrails And Split Triggers

P3-03 should stay as one small PR only if the implementation remains mostly in:

- `src/domain/practice/`
- `src/services/practice-session/`
- narrowly necessary infrastructure type/test helpers
- focused unit/E2E assertions

Stop and split if coding requires:

- New session event persistence or event migration.
- New `segmentSessions` table or indexed segment query.
- A visible UI change or route change.
- Continue Practice segment navigation.
- Metronome-only/reference-only selected-segment propagation through UI state.
- Broad changes to Sheet Practice controls beyond type/test fixture updates.
- Recording artifact, waveform, playback, or MediaRecorder ordering changes.
- More than roughly 500 lines of production code, excluding focused tests.
- Rewriting existing session or recording repositories.

Safe split if needed:

- `P3-03A segment-session-metadata-boundary`: domain, validation, service, persistence compatibility, successful recording commit propagation. This is the planned first PR boundary.
- `P3-03B segment-activity-context-propagation`: optional future slice only if the product requires metronome/reference selected-segment activity to write session context before P3-04/P3-08.

Do not silently expand P3-03A into P3-03B.

## Handoff Notes For Coding Agent

- Start by reading this plan, `docs/v1/START-HERE.md`, `docs/v1/implementation-slices/03-sessions-continue-practice.md`, `docs/v1/implementation-slices/plans/P3-01-session-event-model.md`, `docs/v1/implementation-slices/plans/P3-02-session-event-capture.md`, `docs/v1/05e-session-integration.md`, `docs/v1/08-practice-session.md`, `docs/v1/05f-practice-segments.md`, `docs/v0/project-structure.md`, and `docs/v0/tech-stack-decisions.md`.
- Inspect only the current practice-session, segment, sheet-practice recording, repository, and focused test files needed for the planned changes.
- Implement the safe `P3-03A` boundary first.
- Keep `segmentContext` a nullable session snapshot, not a live relation or event-derived fact.
- Keep event capture unchanged and non-durable.
- Preserve all existing recording rollback behavior.
- Do not edit `docs/v1/status.json`.
- If a Dexie migration, new index, UI selected-segment propagation, or Continue Practice segment routing appears necessary, stop and return to planning rather than expanding the slice.
