# P3-06 Home Recent Activity Source Plan

## Slice

- Slice id: `P3-06 home-recent-activity-source`
- Pack: `pack-3-sessions-continue-practice`
- Current scheduler status: `not_started`
- Product feature:
  - `home.recent-activity-timeline`
- Planning model: `gpt-5.5`, medium effort, standard speed
- Coding/review/verification tier: Tier B - Local Persistence / Service Boundary

## External Plan Review Gate

- This planning pass only writes the durable plan file.
- Leave `docs/v1/status.json` unchanged.
- Before coding, the scheduler must send this complete plan text, uncompressed, through the logged-in web ChatGPT `metronome` project review gate in Chinese and incorporate required changes.
- Do not mark this slice `ready_for_coding` until that review gate passes.

## External Review Notes

- Web ChatGPT metronome project plan review: `PASS_WITH_CHANGES`.
- Web ChatGPT metronome project delta review: `PASS`.
- Required changes applied in this revision:
  - Removed ambiguous `calculatePracticeDurationMs` reuse wording from the read source and locked P3-06 to persisted `durationMs` fields only.
  - Defined `no-target` semantics for sheet-mode rows with missing/blank target ids and added the corresponding test expectations.
  - Added an explicit P3-04 target-state to Home target-state mapping and priority list.
  - Added focused dedup acceptance/test coverage so one source identity cannot produce parallel sheet/segment rows.
  - Clarified reload tests compare logical `items` only and either ignore `generatedAt` or freeze the clock.
- Remaining required changes after delta review: none.
- Implementation is allowed after the delta review while preserving the reviewed boundary.

## Refined Scope

Build a local Home recent-activity source/selector that derives compact activity rows from existing local sessions, recording metadata, sheets, and segment snapshots. This is data-layer work for Home. It creates a read model that P3-07 can render, but it must not add or change Home UI.

P3-06 owns:

- A pure domain selector/read-model module for recent activity rows.
- A narrow practice-session service method, or adjacent Home data service method if local conventions fit better, that returns recent activity rows.
- Local-only joins across:
  - parsed `PracticeSession` rows;
  - existing sheet recording metadata from `listRecordingMetadata`;
  - P3-04 session-history grouping output or equivalent target-resolution helpers;
  - live sheet and segment lookups only for target validity and labels.
- Deterministic ordering, deduplication, filtering, and stale-target state semantics.
- Focused unit/service/repository tests proving source behavior, reload stability, and stale/deleted target handling.

The source should return a bounded, display-ready data structure with labels and metadata, but no JSX, route wiring, click handlers, navigation side effects, command palette integration, or timeline component.

## Explicit Out Of Scope

- P3-07 Home recent-activity UI, responsive layout, icons, timeline row rendering, empty-state copy, visual QA, or Playwright UI checks.
- P3-08/P3-09 Continue Practice target construction, navigation, segment resume routing, or recommendation ranking.
- Home dashboard analytics, goals, streaks, command palette, practice plans, scoring, quality metrics, or detected-mistake claims.
- Durable session event repository, event replay, event-derived activity rows, event migration, or event backfill.
- Recomputing duration from events, segment ranges, recording media duration, or reference playback.
- Schema migration, new Dexie object store, new index, data backfill, cleanup job, or historical session rewrite.
- Recording artifact/media changes, waveform changes, audio decode, MediaRecorder behavior, or recording blob storage.
- Route changes, app-shell changes, sidebar/bottom-nav changes, or Home component props unless a type-only test fixture update is unavoidable.
- New package dependencies.
- Cross-device sync, login, cloud activity, backup conflict merge, social feed, automatic PDF recognition, score following, or automatic mistake detection.

If any out-of-scope item appears necessary, stop and return to planning or split before coding.

## Likely Files And Areas

Primary source boundary:

- `src/domain/practice/recent-activity.ts` or `src/domain/practice/home-recent-activity.ts`
  - Define `HomeRecentActivityItem` and pure selectors.
  - Convert sessions and sheet recording metadata into deterministic recent rows.
  - Reuse `sortSessionsByRecentActivity`, persisted `durationMs` fields, `SessionHistoryGroupTargetState`, and P3-04 target-state concepts where they fit.
  - Do not call `calculatePracticeDurationMs` or any equivalent timestamp-difference helper from the recent-activity read path to recompute historical durations.
  - If duration formatting or defensive sanitation is useful, use a helper that only accepts already-persisted duration values and never derives duration from timestamps, events, segment ranges, recording media, or references.
- `src/domain/practice/index.ts`
  - Export new types/helpers if existing barrel conventions require it.
- `src/services/practice-session/types.ts`
  - Add a read-only `getHomeRecentActivity` method and related output types if the source belongs with practice-session service.
  - Keep write inputs unchanged.
- `src/services/practice-session/service.ts`
  - Implement the read method by reading sessions and recording metadata, resolving live sheet/segment availability through existing gateways, and calling the pure selector.
  - Do not change existing session write, duration, recording commit, or Continue Practice methods.
- `src/infrastructure/db/browser-practice-session-service.ts`
  - Likely no change beyond existing gateways already wired for sheet/segment lookups.

Likely tests:

- `tests/unit/home-recent-activity-source.test.ts` or `tests/unit/practice-session-recent-activity.test.ts` for pure selector semantics.
- `tests/unit/practice-session-service.test.ts` for service joins, stale target handling, and read-only behavior.
- `tests/unit/practice-session-repository.test.ts` only if Dexie reload evidence is not already covered through service/repository helpers.
- `tests/unit/home-dashboard.test.tsx` should not be touched unless TypeScript fixture types require adding an empty `recentActivity` field without rendering behavior.

Avoid editing:

- `src/components/home/home-dashboard.tsx`
- `src/app/**`
- Playwright specs
- recording artifact/media repositories
- Dexie schema/version files
- package files

## Data Shape

The source should expose a compact local read model close to:

```ts
type HomeRecentActivityKind = "quick-session" | "sheet-session" | "sheet-recording" | "segment-session" | "segment-recording";

type HomeRecentActivityTargetState =
  | "valid"
  | "lookup-failed"
  | "missing-sheet"
  | "missing-segment"
  | "no-target"
  | "quick";

type HomeRecentActivityItem = {
  id: string;
  kind: HomeRecentActivityKind;
  occurredAt: string;
  sortTimestamp: string | null;
  label: string;
  metadata: string[];
  targetState: HomeRecentActivityTargetState;
  sessionId: string | null;
  recordingId: string | null;
  sheetId: string | null;
  sheetName: string | null;
  segmentId: string | null;
  segmentName: string | null;
  durationMs: number | null;
  bpm: number | null;
  timeSignature: string | null;
  disabledReason: string | null;
};

type HomeRecentActivityResult = {
  items: HomeRecentActivityItem[];
  generatedAt: string;
  limit: number;
};
```

Exact names may follow local style, but the behavior must be stable:

- Rows are local-only and derived from current repositories.
- `id` is deterministic and source-prefixed, for example `session:<id>`, `recording:<id>`, or `segment-session:<sessionId>:<segmentId>`.
- `occurredAt` uses recording `createdAt` for recording rows and session `updatedAt || startedAt` for session rows.
- `sortTimestamp` is `null` only when the timestamp is invalid; invalid rows sort last.
- `durationMs` for sessions is the persisted session `durationMs`; do not recompute historical durations.
- `durationMs` for recordings is recording metadata `durationMs`; do not decode media artifacts.
- `metadata` may include compact display facts such as duration, BPM, time signature, recording count, and segment range, but must not imply scoring or quality.
- `metadata` is data-layer compact facts for P3-07 to render later, not final UI copy, icons, empty-state text, or visual treatment.
- `targetState` and `disabledReason` describe whether a later UI may navigate. P3-06 does not navigate.
- `no-target` is reserved for otherwise-valid local sheet-mode activity that has no usable local target id, such as a sheet session or sheet recording with missing/blank `sheetId`. It must be disabled with a clear reason and must not be relabeled as quick activity.
- Quick rows use `targetState: "quick"` only when the source type is actually quick and `sheetId`/`segmentId` are null.

## Ordering, Filtering, Deduplication, And Grouping Semantics

Ordering:

- Default order is newest first by `occurredAt`.
- Recording rows use `SheetRecordingMetadata.createdAt`.
- Session rows use `PracticeSession.updatedAt || PracticeSession.startedAt`.
- Ties are deterministic by kind priority and id.
- Invalid timestamps sort last and remain visible only if the underlying row is otherwise valid.

Filtering:

- Return at most a small bounded limit, defaulting to 8 or 10 items. The service may accept an optional limit if that matches local style.
- Include quick sessions, sheet sessions, sheet recordings, segment-linked sessions, and segment-linked recordings when data exists.
- Include sessions with zero duration, zero recordings, or no segment.
- Exclude rows only when the source repository already filtered malformed records, the row has no meaningful local activity identity, or adding the row would create duplicate noise.
- Do not invent placeholder activity for empty local state.

Deduplication:

- A segment-linked sheet recording can produce a recording row; the linked sheet session can still produce a session row if it represents meaningful broader practice activity.
- Avoid producing two rows with identical source identity and identical visible meaning. For example, do not create both `sheet-session` and `segment-session` rows for the same session unless the segment row adds distinct segment context required by the contract.
- Prefer one row per recording metadata item and one row per recent session, with the session row kind upgraded to `segment-session` when `session.segmentContext` is present.
- Do not aggregate multiple recordings into a fake event unless using existing session `recordingCount` as metadata on a session row.
- A session with `segmentContext` produces one `segment-session` row, not both a `sheet-session` and a `segment-session` row.
- A recording metadata item with `segmentContext` produces one `segment-recording` row, not both a `sheet-recording` and a `segment-recording` row.

Grouping:

- P3-06 is not a full grouped history UI. It may use P3-04 grouping helpers to resolve target state and labels, but the output is a flat recent timeline source.
- If grouping data is reused, it must remain read-only and must not change P3-04 group semantics.
- Segment rows use historical `session.segmentContext` or recording `segmentContext` snapshots for segment label/range metadata.
- Same `segmentId` under different sheets must not be merged.

Target-state mapping:

- Quick session/recording with no sheet or segment target maps to `quick`.
- Live sheet with no segment context maps to `valid` for `sheet-session` and `sheet-recording` rows.
- Live sheet and live segment maps to `valid` for `segment-session` and `segment-recording` rows.
- Sheet-mode row with missing or blank `sheetId` maps to `no-target`.
- Segment-context row with missing or blank `segmentId` maps to `no-target`.
- Sheet gateway throw/reject maps affected sheet and segment rows to `lookup-failed`.
- Missing live sheet maps affected sheet and segment rows to `missing-sheet`.
- Existing live sheet plus missing live segment maps segment rows to `missing-segment`.
- Segment gateway throw/reject after the sheet exists maps affected segment rows to `lookup-failed`.
- Priority is: malformed source row filtered by existing repository validation; then `quick`; then missing/blank target id as `no-target`; then sheet lookup failure; then missing sheet; then segment lookup failure; then missing segment; then `valid`.

## Stale Or Deleted Sheet And Segment Handling

- Missing or deleted sheets must not crash the source.
- Missing or deleted segments must not crash the source.
- A missing sheet makes sheet and segment targets non-navigable with `targetState: "missing-sheet"`.
- A missing segment under an existing sheet makes segment targets non-navigable with `targetState: "missing-segment"`.
- A gateway rejection or thrown lookup returns `targetState: "lookup-failed"` for affected rows rather than failing the whole recent activity read.
- Historical snapshot names from `segmentContext.segmentName` remain available even when the live segment is gone.
- Live sheet names may be used for current labels when available, but the output should preserve historical segment names instead of silently rewriting them.
- Quick practice rows use `targetState: "quick"` and do not require sheet/segment lookups.
- Rows without a navigable target should remain visible if they honestly reflect local activity; they are disabled by the later UI rather than deleted by the source.

## Persistence And Reload Expectations

- P3-06 adds no persistence of its own.
- The source reads existing repositories each time it is called.
- Activity survives reload only because sessions and recording metadata already survive reload.
- Dexie/repository reload tests should prove the source returns the same logical items after reopening storage for:
  - quick session activity;
  - sheet session activity;
  - sheet recording metadata;
  - segment-linked session/recording activity;
  - deleted or missing live sheet/segment references.
- The source must not cache stale activity in module state, localStorage, React state, or a new table.
- Reload tests must compare logical `items` only: item id, kind, targetState, order, key labels, and duration metadata. Do not compare `generatedAt` unless the test freezes the injected clock.
- Do not persist or cache `generatedAt` just to make reload assertions stable.
- Settings local-data clear behavior should work through existing session and recording repository clear paths; P3-06 should not add cleanup code.

## Boundary Conditions

- Empty repositories return `{ items: [] }` or an equivalent empty result without fake rows.
- Legacy sessions without `segmentContext` are no-segment sheet or quick rows.
- Malformed session rows remain filtered by existing validation/repository behavior and must not be resurrected.
- Recording metadata with `segmentContext: null` is a sheet recording row, not a segment recording row.
- Recording metadata with non-null `segmentContext` is a segment recording row and uses the snapshot label/range.
- A recording whose linked session is missing can still appear as recording activity if the metadata itself is valid; mark only target validity based on sheet/segment checks.
- A session whose latest recording is deleted or missing still appears as a session row if the session row is valid; do not query artifacts to prove media availability.
- Duration is read from `durationMs` fields. Invalid or non-finite durations should be defensively displayed as unavailable in metadata, not recalculated from events or media.
- Invalid timestamps sort last and should not crash the source.
- Quick practice rows must never carry sheet or segment ids.
- Sheet sessions with missing `sheetId` stay visible only as stale local activity and must not become quick activity.
- Target lookup failures are contained per row or per source batch.
- The source must not write, normalize, backfill, delete, or update sessions, recordings, sheets, or segments.

## Acceptance Criteria

1. A local recent-activity source returns deterministic flat activity items derived from existing sessions, sheet recording metadata, sheets, and segment snapshots.
2. The source represents quick, sheet, recording, and segment activity when valid local data exists.
3. Ordering is newest first by recording `createdAt` or session `updatedAt || startedAt`, with deterministic tie breakers and invalid timestamps sorted last.
4. Stale/deleted sheets and segments are retained as disabled/stale rows with explicit target states, while lookup failures are reported as `lookup-failed`.
5. Segment rows use historical segment snapshots and never require live segment records to parse old activity.
6. Sheet-mode rows with missing or blank target ids are disabled as `no-target`, not relabeled as quick activity.
7. A single session or recording source identity produces one row; segment context upgrades the row kind instead of creating a parallel duplicate.
8. The source performs no writes, migrations, backfills, schema/index changes, event persistence, media/artifact reads, duration recomputation, or route/navigation changes.
9. Reload evidence proves the same logical recent activity items can be derived after repository/Dexie reopen without comparing or persisting `generatedAt`.
10. Empty, legacy, no-segment, zero-duration, no-target, missing-sheet, missing-segment, missing-session, and lookup-failure cases are covered by tests.
11. Existing P3-04 grouping, P3-05 duration rules, Today Summary, `getRecentSession`, and Continue Practice behavior do not regress.
12. No Home UI, Continue Practice navigation, analytics/goals/streaks, package, or status-file changes are included in the coding pass.

## Test Coverage Plan

Pure selector tests:

- Empty sessions and recordings return an empty item list.
- Quick session becomes a quick activity row with `targetState: "quick"`.
- Sheet session with live sheet becomes a sheet-session row with live sheet label.
- Sheet session with `segmentContext` becomes a segment-session row preserving the historical segment name/range.
- Sheet recording without segment context becomes a sheet-recording row.
- Sheet recording with segment context becomes a segment-recording row.
- Newest-first ordering uses recording `createdAt` and session `updatedAt || startedAt`.
- Ties sort deterministically by kind/id.
- Invalid timestamps sort last without throwing.
- Limit truncates after sorting and does not change ordering.
- Zero-duration sessions and recordings remain visible.
- Same `segmentId` under different sheets stays distinct.
- Metadata uses existing duration/BPM/time signature fields and makes no scoring claims.
- Persisted session and recording `durationMs` values are read directly; malformed/non-finite values are sanitized as unavailable and are not recomputed from timestamps.
- A session with `segmentContext` produces one `segment-session` row and no parallel `sheet-session` duplicate.
- A recording metadata item with `segmentContext` produces one `segment-recording` row and no parallel `sheet-recording` duplicate.
- Sheet-mode rows with blank/missing `sheetId` become disabled `no-target` rows; quick rows remain `quick` and never carry sheet/segment ids.

Service/integration tests:

- `getHomeRecentActivity` reads `repository.listSessions()` and `recordingRepository.listRecordingMetadata()`.
- The method does not call save, delete, clear, update, or commit methods.
- Valid sheet and segment gateways mark rows valid.
- Missing sheet marks sheet and segment rows `missing-sheet`.
- Missing segment marks segment rows `missing-segment`.
- Gateway throw/reject marks affected rows `lookup-failed` without failing the whole read.
- Blank/missing sheet or segment target ids map to `no-target` before any gateway lookup.
- Recording metadata remains visible when its linked session is missing, as long as the metadata's sheet/segment target state can be resolved.
- Session rows remain visible when `latestRecordingId` points to missing recording metadata.
- Existing `getSessionHistoryGroups`, `getTodaySummary`, `getRecentSession`, and `getContinuePracticeTarget` tests remain unchanged or are extended only for regression.

Repository/reload tests:

- Save quick, sheet/no-segment, sheet/segment sessions and sheet recording metadata through existing repositories.
- Reopen/reset the Dexie-backed repository/service connection.
- Verify recent activity item ids, kinds, target states, ordering, and key labels match the pre-reload result.
- Ignore `generatedAt` in reload equality assertions unless the test freezes the service clock.
- Seed legacy session rows without `segmentContext` and verify they appear as no-segment activity.
- Seed malformed rows only through existing repository malformed-row helpers and verify they are filtered before recent activity selection.

Browser E2E:

- Not required for P3-06 because this slice has no production UI and no route/navigation changes.
- Do not add Playwright visual/responsive checks here. P3-07 owns Home timeline rendering and browser verification.

Negative cases:

- Deleted sheet.
- Deleted segment.
- Sheet lookup failure.
- Segment lookup failure.
- Invalid timestamp.
- Missing `sheetId` on a sheet session.
- Missing `sheetId` on a sheet recording metadata item.
- Missing `segmentId` on otherwise segment-shaped historical context, if such malformed input can reach the selector.
- Recording metadata with missing linked session.
- Session with missing latest recording metadata.
- Zero-duration and no-recording sessions.
- Attempted implementation that mutates repositories while reading.

## Verification Commands

Recommended focused commands for the coding agent:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/home-recent-activity-source.test.ts tests/unit/practice-session-service.test.ts tests/unit/practice-session-repository.test.ts
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint -- src/domain/practice/recent-activity.ts src/domain/practice/index.ts src/services/practice-session/types.ts src/services/practice-session/service.ts tests/unit/home-recent-activity-source.test.ts tests/unit/practice-session-service.test.ts tests/unit/practice-session-repository.test.ts
git diff --check
```

Adjust file names to match the actual implementation. Omit lint targets for untouched files. Do not add E2E just to claim UI coverage.

The coding agent must report:

- Changed file list.
- Confirmation that `docs/v1/status.json` was not changed.
- Confirmation that no Home UI, routes, Continue Practice routing, analytics/goals/streaks, package files, Dexie schema/index/migration/backfill, event persistence/replay, media/artifact, waveform, or recording capture changes were added.
- Confirmation that the new source is read-only and performs no repository writes.
- Focused unit/service/reload test output.
- Typecheck output.
- Lint output for changed files.
- `git diff --check` output.

## Model Tier

Use Tier B for coding, review, and verification, with the user-requested coding-agent override:

- Coding agent: `gpt-5.5`, extra-high effort, standard speed
- Review agent: `gpt-5.4-mini`, high effort, standard speed
- Verification agent: `gpt-5.4-mini`, high effort, standard speed

Reason:

- This is local service/read-model work over persisted sessions and recording metadata.
- It requires reload and stale local-target evidence.
- It has no UI, media capture, recording artifact, migration, cleanup, or destructive data operation.
- The user explicitly instructed future coding agents to use `gpt-5.5` extra-high standard.

Escalate to Tier C only if a later reviewed split adds visible Home UI. Escalate to Tier E only if implementation discovers a real need for schema/index/migration/backfill, and stop for planning before doing that.

## Coding Handoff

- Start by reading this plan, `docs/v1/START-HERE.md`, `docs/v1/implementation-slices/03-sessions-continue-practice.md`, `docs/v1/implementation-slices/plans/P3-03-segment-session-metadata.md`, `docs/v1/implementation-slices/plans/P3-04-session-history-grouping.md`, `docs/v1/implementation-slices/plans/P3-05-session-duration-rules.md`, `docs/v1/01-app-shell-home.md`, and `docs/v1/remaining-feature-contracts.md`.
- Inspect only the current practice-session domain/service/repository, recording metadata repository, sheet/segment gateways, and focused tests needed for this source.
- Reuse P3-04 target-state semantics and P3-05 persisted duration rules.
- Prefer a pure selector plus one narrow service method.
- Keep the source read-only and local-only.
- Keep Home UI and Continue Practice navigation for later slices.
- Do not add package dependencies.
- Do not edit `docs/v1/status.json`.

## Deferred Work Register

| Deferred work | Future owner |
| --- | --- |
| Compact Home recent-activity timeline rendering, responsive layout, icons, and empty state | `P3-07 home-recent-activity-ui` |
| Click/navigation behavior for recent activity rows | `P3-07` if simple Home row links, or `P3-08/P3-09` if it becomes Continue Practice target resolution |
| Valid quick/sheet/segment Continue Practice target construction and stale target rejection | `P3-08 continue-practice-targets` |
| Continue Practice navigation into sheet/segment context | `P3-09 continue-practice-ui-navigation` |
| Goal completion, dashboard analytics, streaks, and goal UI | `P3-10` through `P3-15` |
| Command palette over valid local practice targets | `P3-16` |
| Event-derived activity timeline from durable events | Future explicit event-persistence/replay slice |
| Media/artifact availability checks for recording rows | Future recording review or cleanup slice if product requires it |
| Cross-device/cloud activity | v2 |

## Split Triggers

Stop and return to planning if implementation requires:

- More than roughly 300-400 lines of production code excluding focused tests.
- Any Home UI, route, app-shell, navigation, or Playwright visual/responsive work.
- Any Continue Practice target resolver, recommendation ranking, or segment navigation behavior.
- Any Dexie schema version, index, object store, migration, backfill, or cleanup.
- Any durable event persistence, event replay, or event-derived ordering.
- Any recording artifact/media/blob/waveform/audio decode changes.
- Any package/dependency change.
- Any broad rewrite of practice-session, recording, sheet, or segment repositories.
- Any mutation of historical sessions or recording metadata while building the source.

Safe splits if needed:

- `P3-06A recent-activity-domain-selector`: pure types/selectors and unit tests.
- `P3-06B recent-activity-service-source`: service method, gateway joins, stale target states, and reload tests.
- `P3-06C recent-activity-ui-adapter`: only if a tiny adapter is truly needed before P3-07, with no visual rendering.

Do not silently expand P3-06A/B into Home UI, Continue Practice navigation, analytics, or migration work.
