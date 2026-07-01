# P3-08 Continue Practice Targets Plan

## Slice

- Slice id: `P3-08 continue-practice-targets`
- Pack: `pack-3-sessions-continue-practice`
- Current scheduler status: `not_started`
- Product feature: `home.continue-practice-recommendations`
- Planning model: `gpt-5.5`, medium effort, standard speed
- Coding/review/verification tier: Tier B - Local Persistence / Service Boundary

## External Plan Review Gate

- This planning pass only writes the durable plan file.
- Leave `docs/v1/status.json` unchanged.
- Before coding, the scheduler must send this complete plan text, uncompressed, through the logged-in web ChatGPT `metronome` project review gate in Chinese and incorporate required changes.
- Do not mark this slice `ready_for_coding` until that review gate passes.

## External Review Notes

The web ChatGPT metronome project returned `PASS_WITH_CHANGES` on the initial plan review. Required changes incorporated below:

- Tighten the existing Home `continueTarget.href` compatibility boundary so P3-08 cannot enable segment-specific navigation through the current single Home card.
- Demote `href` from the new P3-08 target-list contract. The new list should expose stable target identity/intent; segment route/query generation is deferred to P3-09.
- Clarify that P3-08 introduces a validated target list plus compatibility wrapper. It must not require visible Home behavior changes.
- Add a hard P3-06 reuse-isolation guard: target filtering belongs in the Continue Practice selector layer, and touching `recent-activity.ts` must preserve `getHomeRecentActivity()` display/stale semantics.
- Add Home compatibility regression coverage for the case where the best new-list target is a segment.

## Refined Scope

Build a local Continue Practice target source that returns valid quick, sheet, and segment practice target identities from existing local activity. The slice introduces a bounded, validated recommendation list plus a compatibility wrapper for the current single Home Continue Practice entry. It must not require visible Home behavior changes; richer recommendation rows and segment-specific navigation remain P3-09 work.

P3-08 owns:

- A pure domain selector/read-model for Continue Practice targets.
- A narrow practice-session service method that reads existing sessions, recording metadata, sheets, and segments through current repositories/gateways.
- Target validation for quick, sheet, and segment contexts, including deleted/missing/lookup-failed references.
- Recommendation ordering and deduplication rules for local targets.
- Compatibility behavior for the existing Home `continueTarget` card while P3-09 has not added multi-target UI/navigation. This wrapper must stay within existing quick/sheet navigation behavior and must not expose segment-specific route/query behavior.
- Focused unit/service/reload tests proving valid target construction, stale rejection, and no write/schema/media/event side effects.

This slice is data/contract work. It may expose enough target identity metadata for P3-09 to later render and navigate, but it must not define new segment URLs, add the P3-09 navigation UI, row click behavior, route parameter consumption, or segment focus restoration in Sheet Practice.

## Explicit Non-Goals

- No new navigation UI, recommendation rows, Home layout changes, row click handlers, keyboard shortcuts, command palette entries, or route-driven segment focus behavior.
- No new segment `href`, route/query contract, selected-segment route parameter, or route-consumption behavior.
- No Sheet Practice changes to consume a selected segment from a route or target.
- No app-shell sidebar/bottom-nav changes.
- No schema changes, Dexie version bumps, object stores, indexes, migrations, backfills, cleanup jobs, or historical session/recording rewrites.
- No media/artifact/blob/waveform/audio decode changes and no checks that recording artifacts still exist.
- No durable session event persistence, event replay, event-derived target ranking, or event backfill.
- No package/dependency changes.
- No analytics, goals, streaks, scoring, quality metrics, mistake detection, AI recommendations, cloud sync, login, cross-device resume, reminders, or practice plans.
- No edits to `docs/v1/status.json` during coding unless the scheduler explicitly assigns a status update pass.

If implementation appears to need any non-goal, stop and return to planning or split the work instead of folding it into P3-08.

## How P3-08 Builds On P3-06 And P3-07

P3-06 created the read-only recent activity source. It already knows how to:

- Read existing sessions plus sheet recording metadata.
- Resolve live sheet and segment targets through existing gateways.
- Preserve historical `segmentContext` snapshot names/ranges.
- Mark target states as `quick`, `valid`, `no-target`, `lookup-failed`, `missing-sheet`, or `missing-segment`.
- Keep stale rows visible for display while not treating them as navigable.
- Sort and deduplicate flat recent activity items.

P3-08 should reuse P3-06 semantics instead of rebuilding target validation from scratch. The likely clean approach is to share or adapt the P3-06 target-resolution helpers and target-state policy, then filter to recommendation-worthy targets in a Continue Practice selector layer.

Implementation guard: P3-08 must not change P3-06/P3-07 recent activity semantics to make target filtering easier. If implementation touches `src/domain/practice/recent-activity.ts` or service code used by `getHomeRecentActivity()`, tests and review evidence must prove the existing valid/stale/display-only behavior, ordering, deduplication, `targetState` names, and `targetState` meanings are unchanged. Stale rows remain visible in recent activity; stale candidates are rejected only by the Continue Practice selector.

P3-07 rendered recent activity rows on Home as display-only rows. It deliberately did not create Continue Practice targets or navigation. P3-08 may update the data returned to the existing Home dashboard hook/card only for minimal quick/sheet compatibility. It must not change P3-07 row display semantics, make recent activity rows interactive, or let the current Home card become a segment-specific resume surface.

P3-08 should preserve this boundary:

- P3-06/P3-07: show recent local activity, including stale rows.
- P3-08: compute valid local Continue Practice targets and reject stale references.
- P3-09: render multi-target Continue Practice UI and navigate to the correct quick/sheet/segment context.

## Existing Contracts To Reuse

Current implementation already has:

- `PracticeSession.segmentContext: SheetRecordingSegmentContext | null` as historical sheet-session metadata from P3-03.
- `SheetRecordingMetadata.segmentContext` for segment-scoped recording metadata.
- `HomeRecentActivityItem` and `HomeRecentActivityTargetState` in `src/domain/practice/recent-activity.ts`.
- `PracticeSessionService.getHomeRecentActivity(options)` in `src/services/practice-session/types.ts` and `service.ts`.
- Existing `ContinuePracticeTarget` in `src/domain/practice/types.ts`, currently limited to `quick` and `sheet` and carrying an `href`.
- Existing `getContinuePracticeTarget(session)` in `src/domain/practice/rules.ts`, currently based only on the most recent session.
- Home `Primary Entries` reads `dashboardData.continueTarget` and links to `continueTarget.href`.

P3-08 should not keep the current session-only target policy as the only internal source if it hides better recent valid segment or recording-backed sheet targets. It should introduce a recommendation read model while keeping the existing Home card working until P3-09 can render the richer list. The existing Home card compatibility path is not allowed to expose new segment navigation.

## Proposed Data And Contracts

Prefer adding a small target read model in the practice domain, either in `src/domain/practice/continue-practice.ts` or adjacent to existing rules if local style favors it. Exact names may vary, but the contract should be close to:

```ts
type ContinuePracticeTargetKind = "quick" | "sheet" | "segment";

type ContinuePracticeTargetSource = "session" | "recording" | "recent-activity";

type ContinuePracticeTarget =
  | {
      kind: "quick";
      sourceType: "quick";
      label: string;
      sessionId: string | null;
      recordingId: string | null;
      occurredAt: string;
      sortTimestamp: string | null;
      targetKey: "quick";
    }
  | {
      kind: "sheet";
      sourceType: "sheet";
      label: string;
      sessionId: string | null;
      recordingId: string | null;
      sheetId: string;
      sheetName: string | null;
      occurredAt: string;
      sortTimestamp: string | null;
      targetKey: string;
    }
  | {
      kind: "segment";
      sourceType: "sheet";
      label: string;
      sessionId: string | null;
      recordingId: string | null;
      sheetId: string;
      sheetName: string | null;
      segmentId: string;
      segmentName: string | null;
      segmentRangeLabel: string | null;
      occurredAt: string;
      sortTimestamp: string | null;
      targetKey: string;
    };

type ContinuePracticeTargetsResult = {
  targets: ContinuePracticeTarget[];
  generatedAt: string;
  limit: number;
  rejected: ContinuePracticeRejectedTarget[];
};
```

The coding agent may choose different field names, but the important contract is:

- `targets` contains only valid target identities/intents. It must not be treated as an executable navigation contract in P3-08.
- Stale/missing/deleted/lookup-failed/no-target candidates are excluded from `targets`.
- `rejected` is optional but recommended for unit tests and future diagnostics; it must not be displayed by P3-08.
- Segment targets carry enough sheet id, segment id, historical label/range, and source ids for P3-09 to generate navigation without re-reading recent activity rows, but P3-08 must not define the segment URL/query contract.
- The new target-list contract should not include `href`. `href` belongs only to the existing quick/sheet compatibility wrapper if that wrapper must keep the current Home card compiling.
- The current Home card can still consume a single compatible target. If the service keeps `getContinuePracticeTarget()`, make it return the first target that can be represented by the existing quick/sheet navigation shape. Segment targets may exist in the new list, but before P3-09 they must not produce a segment-specific `href`, route query, selected-segment resume behavior, or "continue this segment" Home card behavior. If a segment cannot be safely mapped to current behavior, the wrapper should skip it or map only to existing non-segment-specific sheet behavior, with tests documenting the choice.
- Prefer adding `getContinuePracticeTargets(options)` for the new list and keeping `getContinuePracticeTarget()` as a compatibility wrapper.

## Target Construction Rules

Input candidates should come from existing local data only:

- Recent quick sessions.
- Recent sheet sessions with live sheets.
- Recent segment sessions with live sheets and live segments.
- Recent sheet recordings with live sheets.
- Recent segment recordings with live sheets and live segments.

Use P3-06 recent activity output as the primary candidate source if it keeps the implementation smaller and consistent. A target can be derived from a `HomeRecentActivityItem` only when:

- `targetState` is `quick` for quick targets, or `valid` for sheet/segment targets.
- Required ids are present for the target kind.
- The item has a meaningful `sessionId` or `recordingId` source identity.
- The item timestamp is valid enough for ordering, or the selector has a deterministic fallback/tie breaker.

Target mapping from P3-06 rows:

- `quick-session` with `targetState: "quick"` -> quick target.
- `sheet-session` or `sheet-recording` with `targetState: "valid"` and `sheetId` -> sheet target.
- `segment-session` or `segment-recording` with `targetState: "valid"`, `sheetId`, and `segmentId` -> segment target.
- Any `no-target`, `lookup-failed`, `missing-sheet`, or `missing-segment` row -> rejected candidate, not a target.

Do not turn a stale segment into a sheet-only fallback. A segment target is valid only when both the sheet and segment are valid. If the segment is missing, reject it and let a separate valid sheet candidate rank on its own if one exists.

## Recommendation Ordering And Deduplication

Ordering should be deterministic and local-only:

1. Newest valid activity first using the same `occurredAt` / `sortTimestamp` basis as P3-06.
2. For equal timestamps, prefer segment targets over sheet targets over quick targets, because a segment is the more specific resume context.
3. For equal specificity, prefer recording-backed targets over session-backed targets only if current tests show recordings better represent completed practice. Otherwise preserve P3-06 kind priority to avoid surprise.
4. Tie-break by stable target key.

Deduplication should avoid noisy repeated targets:

- Quick practice should produce at most one quick target, sourced from the newest valid quick activity.
- A sheet target key should be `sheet:<sheetId>`.
- A segment target key should be `segment:<sheetId>:<segmentId>` to avoid merging same segment ids across sheets.
- For duplicate keys, keep the newest candidate and preserve the source ids from that candidate.
- Do not dedupe a segment target into its parent sheet target; they are different resume contexts.
- Return a small bounded list, likely 3-5 targets for the new multi-target result. Keep the existing single-target compatibility method as the first compatible quick/sheet target only; do not let a segment target at the top of the new list create segment navigation before P3-09.

## Stale, Missing, Deleted, And Lookup-Failed Handling

P3-08 must reject stale candidates from navigable recommendations while keeping the read safe:

- Quick candidates are valid only when source type is actually quick and no sheet/segment ids are attached.
- Sheet candidates with missing/blank `sheetId` are rejected as `no-target`.
- Segment candidates with missing/blank `segmentId` are rejected as `no-target`.
- Missing/deleted sheet rejects both sheet and segment candidates.
- Missing/deleted segment rejects only that segment candidate; do not downgrade it to sheet navigation.
- Sheet gateway throw/reject rejects affected sheet and segment candidates as `lookup-failed`.
- Segment gateway throw/reject rejects affected segment candidates as `lookup-failed`.
- Recording metadata with missing linked session can still produce a valid recording-backed target if its own sheet/segment target is valid.
- Session with missing latest recording metadata can still produce a valid session-backed target if its own target is valid.
- Invalid timestamps should not crash; sort last or reject only if the target cannot be ordered deterministically.
- Empty repositories return an empty target list and the existing Home fast-start entry remains available.

Do not delete or mutate stale rows while rejecting them. P3-08 is read-only.

## Persistence And Runtime Boundaries

- P3-08 adds no persistence of its own.
- It reads existing session and recording repositories, plus current sheet/segment gateways.
- It may call `getHomeRecentActivity()` internally or share its pure target resolution helpers, but it must not cause extra writes.
- It must not cache recommendations in localStorage, IndexedDB, module state, React state outside the existing dashboard hook lifecycle, or a new table.
- It must not update `lastPracticedAt`, session duration, recording metadata, or target records during reads.
- It must not read recording artifacts or media blobs to validate targets.
- It must not rely on durable event replay; event persistence remains outside this slice.
- It must not persist or cache route URLs, route query strings, selected-segment params, or generated navigation commands for segment targets.
- Reload stability should come from existing persisted sessions and recording metadata. Tests should compare logical targets and rejected states, not `generatedAt` unless the clock is frozen.

## Accessibility And User-Visible Semantics

P3-08 has no new visible UI by itself. Still, its data contract should support accessible P3-09 UI:

- Labels must be concise and human-readable without requiring icons or color.
- Segment targets should expose both segment label and enough sheet context for P3-09 to disambiguate repeated segment names.
- Rejected reasons, if exposed, should be plain text such as `Sheet no longer exists`, `Segment no longer exists`, `Target lookup failed`, or `No target is available`.
- Do not expose stale candidates as enabled targets; assistive tech in P3-09 should not have to infer that a target is disabled from color.
- Existing Home `Continue Practice` card text should not become segment-specific in P3-08. If the new list's best target is a segment, the compatibility wrapper must still avoid segment-specific Home copy/navigation; richer visible semantics are deferred to P3-09.

## Likely Files And Areas

Likely production files:

- `src/domain/practice/types.ts`
  - Add a new target-identity read model, or carefully separate it from the existing `ContinuePracticeTarget` compatibility type so quick/sheet `href` behavior remains isolated and segment targets do not gain an early URL contract.
  - Add `ContinuePracticeTargetsResult` and rejected-candidate types if used.
- `src/domain/practice/rules.ts` or new `src/domain/practice/continue-practice.ts`
  - Add pure selector logic for target construction, validation filtering, ordering, deduplication, and best-target selection.
  - Keep duration and event logic out of this module.
- `src/domain/practice/recent-activity.ts`
  - Prefer read-only import/reuse. Only change if a tiny export of existing target-state helpers is needed.
  - If touched, add or preserve tests proving `getHomeRecentActivity()` valid/stale/display-only behavior, ordering, deduplication, `targetState` names, and `targetState` meanings did not change.
- `src/domain/practice/index.ts`
  - Export new types/helpers if current barrel conventions require it.
- `src/services/practice-session/types.ts`
  - Add `getContinuePracticeTargets(options?)` while keeping `getContinuePracticeTarget()` for current Home compatibility.
- `src/services/practice-session/service.ts`
  - Implement the read by reusing existing repository reads and target resolution path.
  - `getContinuePracticeTarget()` should delegate to the new read and return the first current-Home-compatible quick/sheet target or `null`; it must not return a segment-specific navigation target.
- `src/hooks/use-practice-session-dashboard.ts`
  - Touch only if the service contract change requires Home dashboard data to keep compiling.
- `src/components/home/home-dashboard.tsx`
  - Avoid unless the existing single Continue Practice card needs a tiny compatibility type adjustment. No new multi-row UI, no segment-specific copy, and no segment route/query behavior.

Focused tests:

- `tests/unit/continue-practice-targets.test.ts` or existing `tests/unit/practice-rules.test.ts` for pure selector behavior.
- `tests/unit/practice-session-service.test.ts` for service reads, gateway stale handling, read-only behavior, and compatibility wrapper.
- `tests/unit/practice-session-repository.test.ts` only if reload evidence is not already covered through service/repository helpers.
- `tests/unit/home-dashboard.test.tsx` only if component copy/type fixtures need a small compatibility update.

Avoid editing:

- `docs/v1/status.json`
- package files and lockfiles
- Dexie schema/version/migration files
- media/artifact/waveform/recording capture code
- event repository/replay code
- Playwright specs unless the implementation unexpectedly changes visible Home behavior, which should normally be deferred to P3-09

## Boundary Conditions

- No local data returns no targets.
- Quick-only data returns one quick target.
- Sheet data with live sheet returns a sheet target.
- Segment data with live sheet and segment returns a segment target.
- Recording-backed data can produce sheet/segment targets even when linked session is missing.
- Session-backed data can produce targets even when latest recording metadata is missing.
- Deleted sheet rejects sheet and segment candidates.
- Deleted segment rejects segment candidates only.
- Lookup failures reject affected candidates without failing the whole read.
- Missing or blank ids reject candidates before gateway lookup.
- Duplicate candidates for the same quick/sheet/segment key collapse to the newest one.
- Segment and parent sheet candidates can both exist when both are valid because they represent different resume contexts.
- Segment context remains a historical snapshot; do not rewrite it from live segment labels except where the existing P3-06 target resolution already provides current validation.
- Same `segmentId` under different sheets remains distinct.
- Invalid timestamps are handled deterministically.
- `limit: 0` returns no targets.
- Existing `getRecentSession`, Today Summary, recent activity, session history grouping, and recording review behavior do not regress.

## Acceptance Criteria

1. The practice domain exposes a deterministic Continue Practice target selector for quick, sheet, and segment targets.
2. The practice-session service exposes a read method for a bounded list of valid Continue Practice targets.
3. The existing single-target `getContinuePracticeTarget()` behavior remains available as a compatibility wrapper and returns the best current-Home-compatible quick/sheet target or `null`.
4. Valid quick, sheet, segment-session, sheet-recording, and segment-recording local activity can produce targets.
5. Deleted/missing sheets, deleted/missing segments, lookup failures, and no-target candidates are rejected from navigable targets.
6. Stale segment candidates are not downgraded to sheet-only targets.
7. Recommendation ordering and deduplication are deterministic and covered by tests.
8. The implementation performs no writes, migrations, backfills, cleanup, artifact/media reads, event replay, package changes, or navigation UI changes.
9. Reload evidence proves the same logical targets can be derived after repository/Dexie reopen.
10. P3-06 recent activity source and P3-07 Home recent activity UI semantics remain unchanged.
11. If the new target list's best target is a segment, the existing Home compatibility wrapper still does not create a segment-specific `href`, route/query contract, selected-segment resume behavior, multi-target UI, or interactive recent-activity rows.

## Test Coverage Plan

Pure selector tests:

- Empty candidate list returns empty targets.
- Quick recent activity/session returns one quick target.
- Valid sheet session returns a sheet target with `sheetId` and sheet label.
- Valid sheet recording returns a sheet target, even when linked session is absent.
- Valid segment session returns a segment target with `sheetId`, `segmentId`, historical segment label/range, and sheet context.
- Valid segment recording returns a segment target.
- `no-target`, `missing-sheet`, `missing-segment`, and `lookup-failed` candidates are rejected.
- Missing segment is not downgraded to a sheet target.
- Duplicate quick candidates keep the newest quick target.
- Duplicate sheet candidates keep the newest per `sheetId`.
- Duplicate segment candidates keep the newest per `{ sheetId, segmentId }`.
- Same `segmentId` under different sheets produces distinct segment targets.
- Ordering prefers newest valid targets, then specificity/tie breaker.
- Limit truncates after sorting/deduplication.
- Invalid timestamps do not throw and sort deterministically.
- Rejected reasons are stable if a rejected-candidate diagnostic type is exposed.
- Target-list results do not include segment `href` or route/query strings; they expose target identity and intent only.

Service tests:

- `getContinuePracticeTargets()` reads sessions and recording metadata and resolves sheet/segment targets through existing gateways.
- The service does not call save, delete, clear, update duration, update last-practiced, recording artifact, or event persistence methods while reading targets.
- Valid quick + sheet + segment data returns all expected targets in deterministic order.
- Deleted sheet removes sheet and segment recommendations but preserves other valid targets.
- Deleted segment removes only the affected segment recommendation.
- Sheet lookup failure and segment lookup failure are contained and do not reject the whole read.
- Blank/missing target ids are rejected before gateway lookup.
- `getContinuePracticeTarget()` delegates to the new target list and returns the first current-Home-compatible quick/sheet target or `null`.
- When the best target in `getContinuePracticeTargets()` is a segment, `getContinuePracticeTarget()` does not produce a segment-specific `href`, route query, selected-segment resume target, or Home-only segment label.
- Existing stale deleted-sheet regression still passes.
- Existing `getHomeRecentActivity()`, `getSessionHistoryGroups()`, `getTodaySummary()`, and `getRecentSession()` tests remain valid.
- If `recent-activity.ts` or shared recent-activity service logic is touched, `getHomeRecentActivity()` tests prove display/stale semantics, ordering, deduplication, and target-state names/meanings are unchanged.

Repository/reload tests:

- Save quick, sheet, and segment-linked sessions plus recording metadata through existing repositories.
- Reopen/reset the Dexie-backed repository/service connection.
- Verify target keys, kinds, source ids, labels, order, and rejected stale states match before/after reload.
- Ignore `generatedAt` unless the clock is frozen.
- Include deleted sheet and deleted segment cases after reload.

E2E strategy:

- No new browser E2E is required if P3-08 remains a data/service slice with no visible UI or navigation behavior.
- Do not add Playwright route/navigation assertions for segment resume; that belongs to P3-09.
- If a tiny Home compatibility type change is unavoidable, existing Home unit tests should cover it. Add a regression case where a segment target ranks first in the new list but the current Home card still does not expose segment route/query/navigation or multi-target UI. Browser visual/responsive coverage should remain deferred unless visible behavior changes.

Negative cases:

- Empty repositories.
- Quick row polluted with sheet/segment ids.
- Sheet target without `sheetId`.
- Segment target without `segmentId`.
- Missing/deleted sheet.
- Missing/deleted segment.
- Sheet gateway throw.
- Segment gateway throw.
- Invalid timestamp.
- Duplicate target keys.
- Missing linked session for recording metadata.
- Missing latest recording for session.
- `limit: 0`.

## Verification Commands

Recommended focused commands for the coding agent:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/continue-practice-targets.test.ts tests/unit/practice-session-service.test.ts tests/unit/practice-session-repository.test.ts
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint -- src/domain/practice/types.ts src/domain/practice/rules.ts src/domain/practice/continue-practice.ts src/domain/practice/recent-activity.ts src/domain/practice/index.ts src/services/practice-session/types.ts src/services/practice-session/service.ts tests/unit/continue-practice-targets.test.ts tests/unit/practice-session-service.test.ts tests/unit/practice-session-repository.test.ts
git diff --check
```

Adjust file names to match the actual implementation. Omit lint targets for untouched files.

Recommended regression if time allows:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/home-recent-activity-source.test.ts tests/unit/home-dashboard.test.tsx tests/unit/practice-session-history-groups.test.ts tests/unit/practice-session-service.test.ts
```

The coding agent must report:

- Changed file list.
- Confirmation that `docs/v1/status.json` was not changed.
- Confirmation that no production UI/navigation, schema/migration/backfill/cleanup, package, media/artifact/waveform/audio, durable event persistence/replay, or route-consumption changes were added.
- Confirmation that P3-06 recent activity rows remain display data and P3-07 rows remain non-interactive.
- Confirmation that P3-08 target-list data does not define segment `href`/route/query and that the current Home compatibility wrapper cannot trigger segment-specific navigation.
- Focused unit/service/reload test output.
- Typecheck output.
- Lint output for changed files.
- `git diff --check` output.

## Model Tier

Use Tier B for coding, review, and verification:

- Coding agent: `gpt-5.5`, extra-high effort, standard speed.
- Review agent: `gpt-5.4-mini`, high effort, standard speed.
- Verification agent: `gpt-5.4-mini`, high effort, standard speed.

Reason:

- This is local read-model/service boundary work over persisted sessions and recording metadata.
- It needs stale target, deduplication, and reload evidence.
- It has no production UI, media capture, recording artifacts, waveform work, migrations, cleanup, or destructive data operation.

Escalate to Tier C only if a later reviewed split adds visible Home UI. Escalate to Tier E only if implementation discovers a real need for schema/index/migration/backfill, and stop before doing that work.

## Coding Handoff

- Read this plan, `docs/v1/START-HERE.md`, `docs/v1/status.json`, `docs/v1/implementation-slices/03-sessions-continue-practice.md`, `docs/v1/01-app-shell-home.md`, `docs/v1/remaining-feature-contracts.md`, `docs/v1/implementation-slices/plans/P3-06-home-recent-activity-source.md`, and `docs/v1/implementation-slices/plans/P3-07-home-recent-activity-ui.md`.
- Inspect only the current practice-session domain/service/repository, P3-06 recent activity source/types, Home dashboard hook/card if needed for compatibility, and focused tests.
- Reuse P3-06 target-state semantics and existing sheet/segment gateway resolution.
- Prefer a pure selector plus one narrow service method.
- Keep the target source read-only and local-only.
- Keep segment target output as identity/intent data only; route/query generation is P3-09.
- Keep `getContinuePracticeTarget()` as a current Home compatibility wrapper, not a segment resume bridge.
- Keep P3-09 navigation/UI out of this slice.
- Do not add dependencies.
- Do not edit `docs/v1/status.json`.

## Review Handoff

Review against this plan plus the Pack 3 slice file and `home.continue-practice-recommendations` contract. Focus on:

- Scope creep into P3-09 navigation UI or Sheet Practice route consumption.
- Any schema, migration, backfill, cleanup, event replay, media/artifact, package, or status-file changes.
- Whether stale/deleted/lookup-failed targets are rejected rather than exposed as enabled recommendations.
- Whether the new target-list contract avoids segment `href`/route/query, and whether the current Home compatibility wrapper avoids segment-specific navigation when the best target is a segment.
- Whether segment targets require both live sheet and live segment, with no stale segment to sheet fallback.
- Whether ordering/deduplication is deterministic and tested.
- Whether P3-06/P3-07 recent activity semantics remain unchanged.
- Whether tests prove read-only service behavior and reload stability.

## Verification Handoff

Verification should run the focused commands above. PASS requires:

- Unit tests for pure target construction, stale rejection, ordering, deduplication, and boundary cases.
- Service tests for gateway validation, read-only behavior, compatibility wrapper, and lookup-failure containment.
- Reload evidence if repository-backed target reads are implemented.
- Typecheck, lint for changed files, and `git diff --check`.
- Source inspection confirming no UI/navigation, schema/migration, package, media/artifact, or event replay changes were added.

## Deferred Work Register

| Deferred work | Future owner |
| --- | --- |
| Render multiple Continue Practice recommendation rows on Home | `P3-09 continue-practice-ui-navigation` |
| Navigate from a target into Quick Metronome, Sheet Practice, or Sheet Practice with selected segment context | `P3-09 continue-practice-ui-navigation` |
| Route/query contract for restoring selected segment focus in Sheet Practice | `P3-09 continue-practice-ui-navigation` |
| Command palette over valid local practice targets | `P3-16 home-command-palette` |
| Goal completion, dashboard analytics, streaks, and goal UI | `P3-10` through `P3-15` |
| Event-derived target ranking from durable event replay | Future explicit event-persistence/replay slice |
| Recording media/artifact availability validation for recommendations | Future recording review or cleanup slice if product requires it |
| Cloud/cross-device resume | v2 |

## Split Triggers

Stop and return to planning if implementation requires:

- More than roughly 300-400 lines of production code excluding focused tests.
- Any new visible Continue Practice recommendation UI.
- Any Sheet Practice route/query consumption for selected segments.
- Any app-shell, sidebar, bottom-nav, or browser route behavior change.
- Any Dexie schema version, index, object store, migration, backfill, or cleanup.
- Any durable event persistence, event replay, or event-derived ranking.
- Any recording artifact/media/blob/waveform/audio decode changes.
- Any package/dependency change.
- Any broad rewrite of practice-session, recording, sheet, segment, Home, or recent-activity code.

Safe splits if needed:

- `P3-08A continue-practice-domain-selector`: pure target contracts, selector, stale rejection, ordering, and unit tests.
- `P3-08B continue-practice-service-source`: service method, gateway joins, compatibility wrapper, and reload tests.
- `P3-08C continue-practice-home-compat`: only if a tiny existing Home card compatibility adjustment is required before P3-09, with no multi-target UI.

Do not silently expand P3-08 into P3-09 navigation, command palette, analytics, or migration work.
