# P3-11 Home Dashboard Analytics Source Plan

## Slice Metadata

- Slice id: `P3-11 home-dashboard-analytics-source`
- Source feature: `home.dashboard-analytics`
- Product contract: `docs/v1/01-app-shell-home.md` and `docs/v1/remaining-feature-contracts.md`
- Slice file: `docs/v1/implementation-slices/03-sessions-continue-practice.md`
- Current lifecycle state: `not_started`
- Previous slice: `P3-10 goal-completion-evaluator` is `verified`
- Planning output only; do not mark this slice `verified` from this plan

## Purpose

P3-11 defines and implements the read-only source contract for Home dashboard analytics. It should derive honest local summary data from already verified local practice sources so P3-12 can render the analytics UI without inventing calculations, reading storage directly, or duplicating existing progress logic.

This slice is a source/service/domain boundary slice, not a UI slice. It may add or extend selectors and a `PracticeSessionService` read method, but it must not add dashboard UI, chart rendering, route changes, schema changes, package changes, or analytics persistence.

## Reuse Checkpoint

Before coding, answer these questions in the implementation notes and review:

1. Can an existing rule, service, repository, read model, helper, or contract be reused or extended?
2. Would the proposed code create a second implementation of session summaries, recent activity, continue targets, goal progress, or recording counts?
3. Is any new code genuinely necessary, or would it fragment the existing Home dashboard source path?

Expected answer for P3-11:

- Reuse `PracticeSessionService` as the only public read boundary for Home dashboard data.
- Reuse existing repository reads behind that service: `repository.listSessions()` and `recordingRepository.listRecordingMetadata()`.
- Reuse `getTodayPracticeSummary(...)` and `isBrowserLocalDay(...)` from `src/domain/practice/rules.ts` for local-day summary semantics.
- Reuse P3-06 recent activity via `getHomeRecentActivity(...)` / `selectHomeRecentActivity(...)` instead of building a second recent activity list.
- Reuse P3-08/P3-09 continue targets via `getContinuePracticeTargets(...)` / `selectContinuePracticeTargets(...)` instead of building a second target resolver.
- Reuse P3-10 goal evaluation via `evaluatePracticeGoalCompletion(...)` / `evaluateGoalCompletion(...)` for any goal-progress panel data. Do not calculate goal progress again inside analytics.
- Reuse existing session-history grouping rules only if a compact source field genuinely needs sheet/segment aggregate labels. Do not create a second grouping algorithm.

P3-11 must not create:

- `src/domain/analytics/*` as a parallel analytics engine unless a later reviewed split approves it.
- New dashboard analytics storage, localStorage key, Dexie table, migration, repository, event replay, or backfill.
- A new goal repository, goal storage, goal writeback, or goal completion read model.
- A second Home recent activity selector, continue-target selector, duration summary helper, or recording count policy.

## Refined Scope

P3-11 owns a read-only analytics source that can return compact local dashboard aggregates for P3-12 UI:

- Today summary from persisted practice sessions:
  - `durationMs`
  - `minutesToday`
  - `sessionsToday`
  - `recordingsToday`
- All-time / recent local summary fields that can be derived from existing persisted rows without new precision claims:
  - total persisted practice duration in milliseconds
  - total session count
  - total sheet take count from existing sheet recording metadata
  - practiced sheet count from non-empty normalized sheet ids in persisted sessions/recording metadata
  - segment-linked session count from existing `segmentContext`
- Existing recent activity result for navigation-safe activity rows.
- Existing continue practice targets result for valid practice/review entry points.
- Optional goal completion evaluations only from caller-provided local goal definitions, using P3-10 evaluator. Because P3-14 owns goal storage, P3-11 must not invent persistent goal definitions.
- Empty/sparse-state metadata, such as booleans or counts that let P3-12 render honest empty states.

The source contract should be intentionally small. Prefer one method such as `getHomeDashboardAnalyticsSource(input?)` on `PracticeSessionService` only if it reduces duplicate read orchestration in the current Home hook. If the existing hook can safely compose existing service methods without duplication, the plan may implement only pure domain selector types/helpers and update the hook in P3-12 instead. Coding must choose the smaller route that avoids a second read model.

Default P3-11 output should prefer only analytics primitives:

- `generatedAt`
- `summary`
- `totals`
- `emptyState`
- optional delegated `goals`

`recentActivity` and `continueTargets` may be included only if the implementation chooses a single `PracticeSessionService` orchestration method to avoid duplicate Home reads. If included, they must be exact pass-through results from existing P3-06/P3-08/P3-09 service/selectors. P3-11 must not filter, sort, normalize, enrich, re-rank, revalidate, or reinterpret those rows.

## Out Of Scope

P3-11 must not implement:

- Home dashboard UI, layout, cards, charts, tabs, filters, responsive behavior, or visual polish. P3-12 owns UI.
- New routes or navigation behavior.
- Browser E2E for Home analytics rendering, unless a tiny source integration smoke is required by an implementation detail. P3-12 owns visible Home E2E.
- Cloud analytics, cross-device data, login, sync, backup merge, predictions, skill scoring, quality metrics, mistake detection, practice scoring, AI recommendations, notifications, reminders, or social features.
- Detailed charts requiring missing data, such as exact day-by-day practice charts unless backed by existing session timestamps and explicitly scoped.
- Streak calculations. P3-13 owns practice streaks.
- Goal create/edit/delete, goal repository, goal persistence, goal UI, goal defaults, or goal writeback. P3-14/P3-15 own goal management.
- Recording artifact inspection, waveform, audio decode, audio duration recalculation, media cleanup, or artifact migration.
- Direct IndexedDB reads from Home/UI code.
- Package, lockfile, config, schema, migration, status, or broad refactor changes.

## Proposed Source Contract

Define a source result that is useful without implying unsupported precision. Names may be adjusted to match local style.

```ts
type HomeDashboardAnalyticsSource = {
  generatedAt: string;
  summary: TodayPracticeSummary;
  totals: {
    durationMs: number;
    sessions: number;
    sheetTakes: number;
    practicedSheets: number;
    segmentSessions: number;
  };
  recentActivity?: HomeRecentActivityResult;
  continueTargets?: ContinuePracticeTargetsResult;
  goals?: GoalCompletionEvaluation[];
  emptyState: {
    hasPracticeHistory: boolean;
    hasSheetPractice: boolean;
    hasSegmentPractice: boolean;
    hasRecordings: boolean;
    hasGoals: boolean;
  };
};
```

Constraints:

- `generatedAt` uses the existing injected `now()` from `PracticeSessionService`.
- `summary` reuses `getTodayPracticeSummary(...)`; do not copy local-day logic.
- `totals.durationMs` sums persisted `PracticeSession.durationMs`; do not recalculate active durations from timestamps.
- `totals.sheetTakes` counts existing `SheetRecordingMetadata` rows; do not fall back to `PracticeSession.recordingCount` for sheet takes.
- `practicedSheets` means the distinct count of non-empty normalized `sheetId` values observed in persisted `PracticeSession` rows and `SheetRecordingMetadata` rows. It does not mean currently existing sheets. Do not call the sheet gateway/repository to validate sheet existence for this aggregate. Deleted/stale/missing sheet semantics remain owned by existing recent activity and continue target selectors.
- `segmentSessions` counts sessions whose persisted `segmentContext` has the required non-empty ids according to the existing `PracticeSession` shape/type guard. It must not call sheet/segment gateways, infer segment practice from labels, or validate that the referenced segment still exists.
- `recentActivity` and `continueTargets` must come from existing selectors/service methods.
- `goals` may be included only when the caller provides the exact exported P3-10 goal evaluator input type. P3-11 must not introduce a new `LocalPracticeGoal` model, adapter, default goal definition, goal fixture contract, or app-wide goal type. If P3-10 cannot be called with caller-provided goal definitions without introducing new goal model code, omit goals from P3-11 entirely and defer goal source integration to P3-14/P3-15.
- The source should be read-only. It must not write sessions, recordings, sheets, segments, goals, last-practiced timestamps, metadata, or cleanup state.

## Failure Semantics

Keep failure behavior honest and contained:

- Required local repository reads for sessions and recording metadata should fail the source read if the implementation uses a single combined service method.
- If P3-11 adds a single combined service method, required repository reads reject the method on failure. Do not add new dashboard-specific partial status objects.
- If existing Home hook composition needs partial UI handling, defer that status composition to P3-12 and keep P3-11 as pure source/service data.
- Goal evaluation read failures should reject through the same P3-10 `evaluateGoalCompletion(...)` path. Do not return per-goal `"error"` statuses.
- Sheet/segment lookup failures for recent activity and continue targets should reuse existing target states such as `missing-sheet`, `missing-segment`, or `lookup-failed`.
- Empty local history is not an error. Return zero totals, empty lists, and `hasPracticeHistory: false`.
- Malformed persisted rows should continue to be filtered by existing validators/parsers at repository boundaries. P3-11 should not add loose compatibility parsing.

## Local-Day And Time Semantics

- Today-based fields use browser-local day semantics from `isBrowserLocalDay(...)` through `getTodayPracticeSummary(...)`.
- All-time fields include all valid persisted local rows, independent of local day.
- Do not introduce weekly/monthly analytics in P3-11 unless a separate plan review split approves it.
- Do not use display rounding to determine completion or source values. Keep raw milliseconds for source data and let P3-12 decide display formatting.

## Likely Files

Coding should keep changes small and prefer existing files:

- `src/domain/practice/types.ts`
  - Add small source/result types only if they belong with existing practice/home data contracts.
- `src/domain/practice/rules.ts`
  - Add a pure helper such as `getHomeDashboardAnalyticsSource(...)` only if it reuses existing helpers and avoids duplicating hook/service logic.
- `src/services/practice-session/types.ts`
  - Add one read-only service method only if needed.
- `src/services/practice-session/service.ts`
  - Add a thin read wrapper that composes existing repository reads and existing selectors.
- `src/hooks/use-practice-session-dashboard.ts`
  - Touch only if the source method replaces duplicate read orchestration without changing UI behavior. Prefer deferring hook/UI changes to P3-12 if not needed.
- `tests/unit/practice-session-duration-rules.test.ts`
  - Add pure selector tests if the helper lives in `rules.ts`.
- `tests/unit/practice-session-service.test.ts`
  - Add service wrapper tests and failure semantics.
- `tests/unit/practice-session-repository.test.ts`
  - Add reload/persistence evidence if the service source depends on Dexie-backed sessions and recording metadata.

## Files And Areas Not To Touch

- `docs/v1/status.json`
- `package.json`, lockfiles, configs
- Dexie schema/index/migration files unless a blocking bug is found and separately reviewed
- Home UI rendering files such as `src/components/home/home-dashboard.tsx`, unless a tiny type-only adjustment is unavoidable and reviewed
- App routes/navigation
- Recording artifact storage, waveform, audio decode, media cleanup
- Goal storage/repository/UI files
- Streak source/UI files

## Acceptance Criteria

1. P3-11 exposes a read-only analytics source contract or pure selector that derives only from existing local sessions, sheet recording metadata, recent activity, continue targets, and caller-provided goals.
2. Existing Today Summary semantics are reused exactly; no copied browser-local-day logic appears in a new analytics helper.
3. Existing recent activity and continue target selectors remain the only source of navigation-safe activity/target rows.
4. Goal progress, if included, delegates to the P3-10 evaluator and does not create goal storage, default goals, or completion writeback.
5. Empty history returns honest zero/empty values and no fake data.
6. Deleted/stale sheet or segment targets remain represented through existing target-state semantics, not new linking logic.
7. The implementation is read-only and performs no writes to sessions, recordings, sheets, segments, goals, storage, or status files.
8. No UI, route, schema, migration, package, media, waveform, streak, notification, command palette, scoring, or cloud scope is included.
9. Unit tests cover aggregate calculations, sparse/empty states, goal delegation if present, and invalid/stale target containment through reused selectors.
10. Repository/service tests cover reload evidence if a service method reads persisted sessions/recording metadata.

## Test Coverage Plan

Pure domain/unit tests:

- Empty sessions/recordings returns zero totals and empty-state flags.
- Today summary uses existing local-day helper behavior; include same-day and other-day sessions.
- Totals sum persisted `durationMs` and count sessions without recalculating active timestamp intervals.
- Sheet take total counts only `SheetRecordingMetadata`, not `PracticeSession.recordingCount`.
- Practiced sheet count deduplicates non-empty normalized sheet ids from persisted sessions/recording metadata.
- Segment session count uses `segmentContext`, not label text.
- Goal evaluation, if included, delegates to existing P3-10 evaluator and preserves invalid/in-progress/completed semantics.
- Existing recent activity/continue target outputs can be passed through without mutation.
- Practiced sheet count must not call sheet gateway/repository or validate sheet existence; deleted/missing sheets are not reclassified by analytics aggregates.
- Segment session count must not call segment/sheet gateways or infer validity from labels/UI state.
- If recent activity or continue targets are included in the service result, tests must prove they are passed through from existing selectors/service methods without mutation.
- If goals are included, tests should spy/mock the P3-10 evaluator delegation and must not duplicate completion thresholds or progress calculation assertions inside analytics tests.

Service tests:

- The service method, if added, reads existing session and recording repositories without writes.
- Read failure rejects or is contained according to the final source contract; tests must lock the chosen behavior.
- It does not call save/delete/clear/update methods.
- It does not call sheet/segment gateways for `practicedSheets` or `segmentSessions` aggregate counts.
- If goal inputs are optional, no goal evaluation is attempted when no goals are provided.

Repository/reload tests:

- Persist quick and sheet sessions plus sheet recording metadata, reset Dexie/repository connection, then derive the same analytics source.
- Include metadata-only sheet recording rows so P3-10 clear-boundary assumptions stay covered.
- Verify cleared persisted data derives empty/zero source values if the clear path is touched.

Hook/UI tests:

- Avoid Home UI tests in P3-11 unless the hook source contract changes. If the hook changes, add focused unit tests that the hook calls the new service method and preserves existing loading/error behavior. Full visual/rendering coverage belongs to P3-12.

Browser E2E:

- Not required for P3-11 if it remains a non-UI source/service slice.
- P3-12 must own Home analytics empty/populated/stale-target responsive Playwright coverage.

## Verification Commands

Adjust file lists to the actual implementation:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/practice-session-duration-rules.test.ts tests/unit/practice-session-service.test.ts tests/unit/practice-session-repository.test.ts
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint -- src/domain/practice/types.ts src/domain/practice/rules.ts src/services/practice-session/types.ts src/services/practice-session/service.ts tests/unit/practice-session-duration-rules.test.ts tests/unit/practice-session-service.test.ts tests/unit/practice-session-repository.test.ts
git diff --check
```

If `use-practice-session-dashboard.ts` is touched, add:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/home-dashboard.test.tsx
```

## Model Tier

Recommended tier: Tier B, local service/source boundary.

- Planning agent: `gpt-5.5`, medium effort, standard speed.
- Coding agent: `gpt-5.4`, high effort, standard speed.
- Review agent: `gpt-5.4-mini`, high effort, standard speed.
- Verification agent: `gpt-5.4-mini`, high effort, standard speed.

Escalate coding/review to `gpt-5.5` high only if the implementation touches verified Home hook behavior, schema/persistence boundaries, or review finds a data-integrity issue.

## Review Checklist

Review should explicitly check:

- Is there any new storage/repository/read model that duplicates existing practice-session reads?
- Are today/local-day semantics delegated to existing helpers?
- Are recent activity and continue targets reused rather than recalculated?
- Is goal progress delegated to P3-10 and read-only?
- Are sheet/segment target states reused instead of inventing link validity logic?
- Are analytics claims limited to data the app actually stores?
- Are tests locking empty/sparse/stale/read-failure behavior?
- Did any UI, route, package, schema, status, streak, goal-management, media, or cloud scope slip in?

## Split Triggers

Stop and return to planning or split if implementation needs:

- Any dashboard visual/UI work beyond a type-safe source handoff to P3-12.
- New analytics storage, schema, migration, cache, or repository.
- Default/persisted goal definitions or goal management.
- Weekly/monthly trend windows, chart datasets, or date-bucketed history beyond simple all-time/today aggregates.
- Streak calculation.
- Direct storage reads from Home UI.
- Recording artifact/body reads or audio duration recalculation.
- Any production-code change above roughly 300-400 LOC excluding tests, unless review confirms the extra code is just focused type/test coverage.

## Coding Handoff

Implement P3-11 as the smallest source-boundary change that lets P3-12 render honest Home dashboard analytics. Start from existing `PracticeSessionService` and domain practice rules. Do not create a standalone analytics subsystem because the current app already has Home dashboard service reads, recent activity selectors, continue targets, and goal evaluation.

After implementation, report:

- Files changed grouped by production/test/docs.
- The reuse route actually taken.
- Confirmation that no storage/schema/UI/status/package changes were made.
- Focused unit/typecheck/lint/diff-check results.
- Any deferred work for P3-12/P3-13/P3-14/P3-15.

## Deferred Work Register

| Deferred item | Owner |
|---|---|
| Home analytics visual rendering, responsive layout, empty/populated/stale-target browser E2E | P3-12 |
| Practice streak source and UI | P3-13 |
| Goal repository, defaults, create/edit/delete, persistence, and goal UI | P3-14/P3-15 |
| Command palette navigation over implemented routes/targets | P3-16 |
| Session comparison or richer trend analytics | P3-17 or later explicit slice |
| Weekly/monthly charts, predictions, scoring, mistake detection, cloud analytics | Future reviewed feature, not Pack 3 P3-11 |
