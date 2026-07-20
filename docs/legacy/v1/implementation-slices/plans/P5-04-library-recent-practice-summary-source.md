# P5-04 Library Recent Practice Summary Source Plan

## Slice

- Slice id: P5-04 `library-recent-practice-summary-source`
- Pack: Pack 5 Library / Viewer Upgrade
- Product feature: `library.recent-practice-summary`
- Product contract: `docs/v1/04-sheet-library.md`
- Slice file: `docs/v1/implementation-slices/05-library-viewer-upgrade.md`
- Builds on: P5-01 `library-tags-favorites-domain`, P5-02 `library-tags-favorites-ui`, and P5-03 `library-batch-import-orchestrator`
- Planning model: `gpt-5.5`, medium effort, standard speed
- Ponytail mode: full; reuse existing practice-session and recording metadata boundaries, smallest viable source
- Status: planning artifact only; no product source code changed by this plan

## Refined Scope

P5-04 adds a read-only source for compact recent local practice summaries by sheet, so P5-05 can show facts on library rows/details without reading storage directly or inventing summary logic in React.

This slice owns:

- A small practice-domain read model keyed by sheet id.
- A pure selector that derives per-sheet summaries from existing `PracticeSession` rows and `SheetRecordingMetadata` rows.
- A thin `PracticeSessionService` read method that calls existing `repository.listSessions()` and `recordingRepository.listRecordingMetadata()`.
- Focused unit/service/reload tests proving empty, stale, malformed, and read-only behavior.

This slice does not own:

- Library UI rendering.
- Sheet row/detail layout, loading states, icons, badges, or responsive behavior.
- Navigation to recordings review filtered by sheet.
- New persistence, new Dexie indexes, migrations, backfills, caching, or sheet-library repository changes.

## Boundary Decision

Put the source under the existing practice-session boundary, not the sheet-library boundary.

Reasons:

- The facts are practice facts, not sheet metadata. The sheet library already stores `lastPracticedAt`, but it does not store session duration, take counts, latest recording ids, or segment context.
- `PracticeSessionService` already owns read-only sources that combine sessions and sheet recording metadata: Home recent activity, Continue Practice targets, Home analytics, goal completion, streaks, and session comparison.
- The browser practice-session service already has the correct repository wiring: `repository.listSessions()` plus `recordingRepository.listRecordingMetadata()`.
- P5-05 can compose `sheetLibraryService.listSheets()` with this summary source by `sheet.id`; P5-04 does not need to change `SheetListItem`.

Do not add a new `library summary repository`, `sheet analytics service`, localStorage key, Dexie table, schema version, or storage migration.

## Reuse Checkpoint

Before coding, the implementation notes should answer:

1. Can this be derived from existing `PracticeSession` and `SheetRecordingMetadata` rows?
2. Can the current `PracticeSessionService` read boundary expose it with one method?
3. Is any new persistence or sheet-library repository method required?

Expected answers:

- Yes, derive from `PracticeSession.sheetId`, `updatedAt`, `durationMs`, `recordingCount`, `latestRecordingId`, and `segmentContext`.
- Yes, include sheet recording metadata from `recordingRepository.listRecordingMetadata()` for take counts and latest recording facts.
- No, sheet-library storage should not change. Existing `updateLastPracticedAt(...)` remains a write-side convenience, not this source of truth.

## Proposed Source Contract

Names may follow local style, but keep the contract small.

```ts
export type LibraryRecentPracticeSummaryBySheetOptions = {
  limit?: number;
};

export type LibraryRecentPracticeSummaryBySheetItem = {
  sheetId: string;
  lastPracticedAt: string;
  lastSessionId: string | null;
  latestRecordingId: string | null;
  sessionCount: number;
  recordingCount: number;
  durationMs: number;
  segmentPracticeCount: number;
};

export type LibraryRecentPracticeSummaryBySheetSource = {
  generatedAt: string;
  limit: number;
  items: LibraryRecentPracticeSummaryBySheetItem[];
};
```

Recommended service method:

```ts
getLibraryRecentPracticeSummaryBySheet(
  options?: LibraryRecentPracticeSummaryBySheetOptions
): Promise<LibraryRecentPracticeSummaryBySheetSource>;
```

If naming reads better locally, `getLibraryRecentPracticeSummariesBySheet` is also acceptable. Prefer one service method and one selector, not a class or separate module family.

## Field Semantics

- `sheetId`: normalized non-empty sheet id. Trim whitespace. Drop rows with no usable sheet id.
- `generatedAt`: injected `now().toISOString()` from `PracticeSessionService`.
- `limit`: normalized finite integer, defaulting to a small value such as `20`; `0` returns no items.
- `lastPracticedAt`: newest valid timestamp from a sheet session's `updatedAt || startedAt` or sheet recording metadata `createdAt`.
- `lastSessionId`: session id associated with the newest session for that sheet, or `null` when the sheet only has recording metadata.
- `latestRecordingId`: newest recording metadata id for that sheet if present; otherwise the newest session `latestRecordingId` if non-empty; otherwise `null`.
- `sessionCount`: count of valid `PracticeSession` rows with `sourceType: "sheet"` and this sheet id.
- `recordingCount`: count of `SheetRecordingMetadata` rows for this sheet. Do not use quick recording rows. Do not read artifacts.
- `durationMs`: sum of persisted `PracticeSession.durationMs` for this sheet, using only finite non-negative values. Do not recompute from timestamps.
- `segmentPracticeCount`: count of sheet sessions and sheet recording metadata rows whose `segmentContext.segmentId` is non-empty.

Ordering:

- Sort newest first by `lastPracticedAt`.
- Invalid timestamps do not crash. A sheet with only invalid timestamps can either be omitted or sorted last with `lastPracticedAt` omitted only if the final type allows it. Prefer omitting rows with no valid activity timestamp because the library UI needs "recent" summaries.
- Tie-break by `sheetId` for deterministic output.

## Failure And Empty Semantics

- Empty sessions and recordings return `{ items: [], generatedAt, limit }`.
- Missing/deleted sheets are not errors. The source is keyed by historical `sheetId` only; P5-05 will join summaries to currently listed sheets and naturally ignore summaries for deleted sheets.
- Sheet/segment live lookups are not needed. Do not call `sheetGateway.getSheetContext(...)` or `segmentGateway.getSegmentContext(...)`.
- Repository read failure should reject the service method. Do not introduce a partial/error object for this source; P5-05 can catch and render a contained UI state.
- Malformed persisted rows should remain filtered at existing repository/parser boundaries. Do not add compatibility parsing here.
- Invalid/non-finite durations count as `0`.
- Invalid timestamps should not produce fake recency.
- The read must not call any save/delete/clear/update methods and must not update `lastPracticedAt`.

## Likely Files And Areas

Preferred production files:

- `src/domain/practice/types.ts`
  - Add the small exported source/result types if the project keeps practice read-model types here.
- `src/domain/practice/rules.ts`
  - Add a pure selector, for example `getLibraryRecentPracticeSummaryBySheet(...)`.
  - Reuse local helpers such as timestamp validation/normalization style already present in this file.
- `src/services/practice-session/types.ts`
  - Add the read-only service method.
- `src/services/practice-session/service.ts`
  - Implement a thin wrapper that reads sessions and recording metadata, then calls the selector.
- `src/domain/practice/index.ts`
  - No change if `rules.ts` and `types.ts` are already exported through the barrel; otherwise export the new module if one is created.

Likely tests:

- `tests/unit/practice-session-service.test.ts`
  - Service method reads existing repositories, returns summaries, and performs no writes.
- `tests/unit/practice-session-duration-rules.test.ts` or a new focused `tests/unit/library-recent-practice-summary-source.test.ts`
  - Pure selector coverage.
- `tests/unit/practice-session-repository.test.ts`
  - Reload evidence with persisted sheet sessions and sheet recording metadata.

Avoid:

- `src/services/sheet-library/**`
- `src/infrastructure/files/sheet-library-repository.ts`
- `src/components/sheet-library/**`
- `src/app/sheet-library/page.tsx`
- `src/app/recordings/**`
- `src/components/recordings-review/**`
- Dexie schema/index/migration files
- package and lock files
- `docs/v1/status.json`

## Acceptance Criteria

1. The source returns deterministic recent summaries grouped by non-empty sheet id.
2. The source derives only from existing local practice sessions and sheet recording metadata.
3. The service method is read-only and performs no repository writes or sheet `lastPracticedAt` updates.
4. Summary ordering is newest first by persisted session/recording timestamps with deterministic ties.
5. Durations use persisted `PracticeSession.durationMs`; no duration is recomputed from timestamps, events, artifacts, or audio.
6. Recording counts use `SheetRecordingMetadata` rows, not recording artifacts or quick recordings.
7. Segment practice counts use existing `segmentContext`, without live segment lookups.
8. Empty local history returns an empty source, not fake summary rows.
9. Deleted/missing sheets do not crash; P5-05 will join only current library sheets.
10. No UI, route, review navigation, storage schema, migration, package, media, waveform, or artifact-read scope is added.

## Test Coverage Plan

Pure selector tests:

- Empty sessions/recordings returns empty `items`.
- One sheet session returns one summary with session count, duration, last session id, and recency.
- Multiple sessions for the same sheet aggregate into one summary.
- Multiple sheets sort newest first and tie-break by sheet id.
- Sheet recording metadata contributes `recordingCount`, `latestRecordingId`, and recency.
- Metadata-only recording for a sheet still creates a summary.
- Non-empty `segmentContext.segmentId` increments `segmentPracticeCount`.
- Quick sessions are ignored.
- Blank/missing sheet ids are ignored.
- Invalid timestamps do not crash and do not create fake newest ordering.
- Non-finite or negative duration values are treated as `0`.
- `limit` truncates after sorting; `limit: 0` returns no rows.
- Input arrays are not mutated.

Service tests:

- `getLibraryRecentPracticeSummaryBySheet()` calls `repository.listSessions()` and `recordingRepository.listRecordingMetadata()` once.
- The method does not call `saveSession`, `deleteSession`, `clear`, `saveRecordingMetadata`, `sheetGateway.updateLastPracticedAt`, sheet lookups, or segment lookups.
- Repository read failure rejects the method.
- Empty repositories resolve to an empty source with generated timestamp.
- The injected `now()` controls `generatedAt`.

Repository/reload tests:

- Persist a sheet session and sheet recording metadata, reset the practice-session Dexie connection, and derive the same logical summary after reload.
- Include a metadata-only recording row for a valid historical sheet id.
- Include a deleted/missing live sheet id only as historical data; the summary source still derives it by id without sheet gateway validation.
- Compare logical fields only and either freeze `generatedAt` or ignore it.

Browser E2E:

- Not required for P5-04 because this is a non-UI source/service slice.
- P5-05 owns visible library-row/detail rendering and browser verification.

## Verification Commands For Coding Agent

Adjust file lists to the actual implementation:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/practice-session-duration-rules.test.ts tests/unit/practice-session-service.test.ts tests/unit/practice-session-repository.test.ts
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint -- src/domain/practice/types.ts src/domain/practice/rules.ts src/services/practice-session/types.ts src/services/practice-session/service.ts tests/unit/practice-session-duration-rules.test.ts tests/unit/practice-session-service.test.ts tests/unit/practice-session-repository.test.ts
git diff --check
```

If a new focused selector test file is added, include it in both `test:unit` and scoped `lint`.

## Model Tier Recommendation

- Planning agent: `gpt-5.5`, medium effort, standard-only/no-fast
- Coding agent: `gpt-5.5`, high effort, standard-only/no-fast
- Code review agent: `gpt-5.5`, extra-high effort, standard-only/no-fast
- Web ChatGPT gates: Extra High, not Pro

Reason: this is Tier B local service/source boundary work over verified local persistence, but the project workflow requires the coding and review gates above. Escalate scope only if implementation discovers a real need for schema/index/migration, direct recording artifact reads, or UI changes; in that case stop and return to planning before expanding scope.

## Handoff Notes For P5-04 Coding Agent

Read only the focused paths:

- `docs/v1/START-HERE.md`
- `docs/v1/implementation-slices/plans/P5-04-library-recent-practice-summary-source.md`
- `docs/v1/implementation-slices/05-library-viewer-upgrade.md`
- `docs/v1/04-sheet-library.md`
- `src/domain/practice/types.ts`
- `src/domain/practice/rules.ts`
- `src/services/practice-session/types.ts`
- `src/services/practice-session/service.ts`
- `src/infrastructure/db/practice-session-repository.ts`
- `src/infrastructure/db/recording-history-metadata-repository.ts`
- `tests/unit/practice-session-service.test.ts`
- `tests/unit/practice-session-repository.test.ts`

Implement P5-04 only. Prefer one pure selector and one thin service method. Do not edit Sheet Library UI or repository code just to make the next slice easier.

## Deferred Work Register

| Deferred work | Future owner |
| --- | --- |
| Rendering compact recent-practice summaries on sheet rows/details | P5-05 `library-recent-practice-summary-ui` |
| Loading/error/empty UI copy for the library summary panel | P5-05 |
| Joining summary rows to `SheetListItem` in React or a tiny UI adapter | P5-05 |
| Navigating from a sheet to Recordings Review filtered by sheet | P5-06 `library-review-by-sheet-link` |
| Review route/query/filter behavior and stale sheet handling in recordings review | P5-06 |
| Viewer thumbnails, page jump, zoom/pan, assisted page turning | P5-07 through P5-12 |
| Folder system, cloud sync, account features, sharing, automatic score following, scoring, mistake detection | Future reviewed feature, not Pack 5 P5-04 |

## Split Triggers

Stop and return to planning if implementation requires:

- Any visible Sheet Library UI.
- Any Recordings Review navigation or filter route.
- Any new persistence, schema/index/migration, cache, or backfill.
- Any direct recording artifact/blob/audio read.
- Any new repository under Sheet Library or recordings review.
- Any production-code change above roughly 250-300 LOC excluding tests.
- Any broad rewrite of practice-session, recording-history, sheet-library, or recordings-review boundaries.
