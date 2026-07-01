# P3-10 Goal Completion Evaluator Plan

## Slice

- Slice id: `P3-10 goal-completion-evaluator`
- Pack: `pack-3-sessions-continue-practice`
- Current scheduler status: `not_started`
- Product feature: `sessions.goal-completion`
- Planning model: `gpt-5.5`, medium effort, standard speed
- Coding/review/verification tier: Tier B - Local Persistence / Service Boundary

## External Plan Review Gate

- This planning pass only writes the durable plan file.
- Leave `docs/v1/status.json` unchanged.
- Before coding, the scheduler must send this complete plan text, uncompressed, through the logged-in web ChatGPT `metronome` project review gate in Chinese and incorporate required changes.
- Do not mark this slice `ready_for_coding` until that review gate passes.

## External Review Notes

The first web ChatGPT plan review returned `PASS_WITH_CHANGES`. P3-10 may proceed only after these required corrections are applied and delta-reviewed:

- Remove all P3-10 goal repository write paths. This slice returns deterministic evaluation results only. It must not write goal records, completion fields, `completedAt`, status, or idempotent completion updates even if a future goal repository exists by coding time. Any goal-record writeback requires a separate reviewed split.
- Lock minutes-goal math before coding: sum raw `durationMs`; complete only when `sumMs >= target * 60_000`; expose `progress = Math.floor(sumMs / 60_000)`; compute `progressRatio` from the raw millisecond ratio clamped to `0..1`; do not reuse Today Summary display rounding for completion.
- Count takes from persisted sheet recording metadata returned by `listRecordingMetadata()` only. Quick recording take counting is deferred to a future goal-source slice unless a separately reviewed plan split changes the source boundary.
- Service repository read failures fail/reject the evaluation read using existing local error style. `GoalCompletionEvaluation.status` does not include `"error"` and P3-10 must not invent per-goal error evaluations.
- Normalize `goal.status` explicitly: `invalid` goals evaluate invalid; unknown statuses evaluate invalid; `completed` does not force completion when current local progress is below target after data clear/delete.

## Refined Scope

P3-10 defines and tests the local goal-completion evaluator for simple practice goals. It should be a small domain/service-boundary slice that can evaluate goal progress and completion from already-persisted local activity: sessions and sheet recording metadata. It must not create the final Home goal-management repository or UI from P3-14/P3-15.

P3-10 owns:

- A goal-domain contract for simple local goal definitions that is sufficient for evaluation tests.
- A pure evaluator that computes progress and completion for supported goal types:
  - minutes practiced;
  - sessions completed;
  - takes recorded.
- A narrow read/evaluation service boundary, preferably adjacent to `practice-session`, that reads local activity and an injected goal source.
- Completion result semantics, including partial, completed, invalid, and empty states.
- Focused tests proving the evaluator derives progress only from local sessions and recording metadata, uses the existing duration/local-day behavior conservatively, and survives reload through existing activity persistence.

The safe interpretation of "Updates local goal completion state" for this slice is: return deterministic completion evaluations from current local activity and input goal definitions. The current codebase does not have a goal repository or schema. P3-10 must not create Dexie tables, migrations, localStorage goal storage, Home goal UI, settings/data-cleanup surfaces, or any goal-record writeback path just to satisfy persistence wording.

## Explicit Non-Goals

- No Home goal create/edit/delete UI, goal list rendering, badges, progress cards, dashboard analytics, practice streaks, command palette, or notification UI.
- No `home.goal-management` repository/schema/storage implementation from P3-14 and no Home goal-management UI from P3-15.
- No schema changes, Dexie version bumps, object stores, indexes, migrations, localStorage storage contract, backfill, cleanup job, import/export changes, or settings storage summary changes.
- No media/artifact/blob/waveform/audio decode reads and no checks that recording artifacts still exist.
- No durable session event persistence, event replay, event-derived duration, event-derived take counts, or event backfill.
- No changes to recording save/commit/link/rollback/artifact cleanup ordering.
- No package/dependency changes.
- No goal record writes, completion-field writes, `completedAt` writeback, status writeback, idempotent completion updates, or goal repository adapter writes.
- No scoring, skill assessment, mistake detection, achievements, social sharing, cloud sync, login, cross-device resume, reminders, practice plans, or v2 behavior.
- No edits to `docs/v1/status.json` during coding unless the scheduler explicitly assigns a status update pass.

If implementation appears to need any non-goal, stop and return to planning or split the work. Do not hide persistence, migration, UI, or analytics work inside P3-10.

## Existing Contracts To Reuse

P3-10 should build on these verified Pack 3 surfaces:

- `PracticeSession.durationMs`, `recordingCount`, `startedAt`, `updatedAt`, `sourceType`, `sheetId`, and `segmentContext` in `src/domain/practice/types.ts`.
- `SheetRecordingMetadata.durationMs`, `createdAt`, `sessionId`, `sheetId`, and `segmentContext`.
- P3-05 duration rules: summaries and goals must use persisted `PracticeSession.durationMs`; do not recompute historical duration from timestamps, events, recording media, or segment ranges.
- `getTodayPracticeSummary()` and `isBrowserLocalDay()` in `src/domain/practice/rules.ts` for the current browser-local day policy.
- P3-06 recent activity and P3-08/P3-09 continue-practice targets only as adjacent read models; do not change their ordering, target-state, href, or navigation contracts.
- Current `PracticeSessionService` repository reads and `listRecordingMetadata()`.

The existing code has no production goal repository or goal UI. That means P3-10 should introduce evaluator contracts that are usable by future goal storage/UI, but it should not make storage decisions that belong to P3-14.

## Reuse Checkpoint

P3-10 must not create a parallel progress-tracking system. Before coding, the implementation must reuse and extend the existing practice-session tracking surfaces:

- Reuse `src/domain/practice/rules.ts` for pure practice activity rules because it already owns browser-local-day filtering, persisted-duration summary rules, and session-derived practice calculations.
- Reuse `src/domain/practice/types.ts` for the small goal input/output contracts if shared exported types are needed.
- Reuse `PracticeSessionService` as the only service boundary if a wrapper is needed; the wrapper may only compose existing `repository.listSessions()` and `recordingRepository.listRecordingMetadata()` reads.
- Reuse existing unit-test files where practical: pure rule coverage should extend `tests/unit/practice-session-duration-rules.test.ts` rather than creating a new evaluator test file unless the file becomes clearly unwieldy.
- Do not introduce `src/domain/practice/goal-completion.ts`, a new goal service, a goal repository, or a second read model unless a later delta review explicitly approves that split.

The new behavior is "evaluate local goal definitions from existing activity rows", not a new progress source.

## Goal Contract

Prefer adding the small goal input/output contract to `src/domain/practice/types.ts` and the pure evaluation helper to `src/domain/practice/rules.ts`, reusing the existing practice-rule surface. Exact names may differ, but the contract should be close to:

```ts
type LocalPracticeGoalKind = "minutes" | "sessions" | "takes";
type LocalPracticeGoalPeriod = "today" | "all-time";
type LocalPracticeGoalStatus = "active" | "completed" | "invalid";

type LocalPracticeGoal = {
  id: string;
  kind: LocalPracticeGoalKind;
  target: number;
  period: LocalPracticeGoalPeriod;
  createdAt: string;
  completedAt?: string | null;
  status?: LocalPracticeGoalStatus;
};

type GoalCompletionEvaluation = {
  goalId: string;
  kind: LocalPracticeGoalKind | null;
  status: "not-started" | "in-progress" | "completed" | "invalid";
  progress: number;
  target: number | null;
  progressRatio: number;
  completedAt: string | null;
  reason: string | null;
};
```

Rules:

- `target` must be a finite positive integer after normalization. Invalid, zero, negative, `NaN`, or infinite targets evaluate as `invalid`.
- Supported goal kinds are exactly `minutes`, `sessions`, and `takes`.
- `period` should be `today` or `all-time` only. If future goal storage needs weekly/monthly ranges, defer that to a later explicit goal-management or analytics slice.
- `completedAt` in the evaluation should be deterministic:
  - preserve an existing valid `goal.completedAt` when a goal is already completed and still meets the target;
  - otherwise set to the injected evaluation timestamp when progress reaches the target;
  - return `null` for incomplete or invalid goals.
- `status` normalization is part of the evaluator contract:
  - missing or `"active"` status evaluates normally from current progress;
  - `"completed"` status does not force a completed evaluation when current local progress is below target, such as after data clear/delete;
  - `"completed"` may preserve existing valid `completedAt` only when current progress still meets the target;
  - `"invalid"` status evaluates directly to `invalid`;
  - unknown status values evaluate to `invalid` with a stable reason.
- `progressRatio` is `0` for invalid goals and otherwise clamps to `0..1`.
- Evaluation must be pure and deterministic when passed the same goals, sessions, recordings, and `now`.

Do not add celebratory copy, badge labels, or UI-specific wording to the domain contract. Future UI can translate status/reason into compact display text.

## Data Sources Allowed

Allowed:

- `PracticeSession[]` from the existing practice-session repository.
- `SheetRecordingMetadata[]` from the existing recording metadata repository.
- An injected goal source or direct goal-definition input passed to the evaluator/service in tests.
- The injected `now()` clock.

Not allowed:

- IndexedDB direct reads outside existing repositories.
- New goal tables, schema versions, migrations, localStorage keys, or cleanup/import/export wiring.
- Recording artifact blobs, decoded audio details, waveform caches, media duration, or artifact existence checks.
- P3-01/P3-02 transient events, durable event replay, or event-derived activity reconstruction.
- Home dashboard DOM/state as a data source.
- Continue Practice target list as a progress source.

## Completion Semantics

Minutes practiced:

- Use persisted `PracticeSession.durationMs`.
- Accumulate raw milliseconds across included sessions as `sumMs`.
- Completion threshold is `sumMs >= target * 60_000`.
- Expose `progress` as whole minutes with `Math.floor(sumMs / 60_000)`.
- Compute `progressRatio` from the raw millisecond ratio `sumMs / (target * 60_000)`, clamped to `0..1`.
- Do not use `Math.round()` or Today Summary display rounding for completion.
- Required boundary tests: `59.9s` toward a one-minute goal is not complete with `progress = 0`; `60.0s` is complete with `progress = 1`; `119.9s` toward a two-minute goal is not complete with `progress = 1`.
- Include zero-duration sessions without crashing; they add `0`.
- Never recompute duration from timestamps, events, recordings, segment ranges, media, or reference playback.

Sessions completed:

- Count valid `PracticeSession` rows in the selected period.
- A session can count even when it has no recordings because v0 explicitly allows practice without recording.
- Do not require `endedAt`; current local practice already counts active/reused sessions in Today Summary. If product review wants "completed" to mean ended sessions only, split that as a future contract change.
- Do not count malformed sessions filtered out by existing repository validation.

Takes recorded:

- Count `SheetRecordingMetadata` rows from `listRecordingMetadata()` only because it represents persisted sheet takes.
- Quick recording take counting is not part of the default P3-10 source contract. Defer quick-take unification to a future recording/goal-source slice unless a separate plan-review split explicitly changes this boundary.
- Do not use `PracticeSession.recordingCount` as a take-count fallback because it can double count or drift from deleted metadata.
- Do not read recording artifacts or decode media.

Period filtering:

- `today` uses the same browser-local day policy as `getTodayPracticeSummary()`:
  - sessions by `startedAt`;
  - recordings by `createdAt`.
- `all-time` includes all valid local rows.
- Invalid timestamps should exclude that row from `today` and sort/evaluate safely; they may still count for `all-time` only if existing repository validation permits them and the evaluator has a documented fallback. The preferred behavior is to ignore invalid timestamp rows defensively.

## Persistence And Runtime Boundaries

- P3-10 should add no persistence of its own.
- The evaluator should be pure and synchronous.
- A service wrapper may be asynchronous only because it reads existing session/recording repositories and an injected goal source.
- No module-level cache, localStorage cache, IndexedDB goal cache, React state cache, or new table.
- Reload stability comes from existing session and recording persistence. Reload tests should seed sessions/recording metadata, reopen/reset existing repositories, then re-run the evaluator against the same in-memory goal definitions.
- The evaluator must not update sessions, recordings, sheets, segments, recent activity, continue targets, last-practiced timestamps, goal records, goal status, or `completedAt` fields.
- If an existing or future goal repository is present, P3-10 may read goal definitions only through a separately reviewed read-only boundary; it still must not write completion state.

## Failure Semantics

- Empty goals return an empty result list.
- Empty sessions/recordings produce progress `0` for valid goals.
- Invalid goals do not throw; they evaluate to `invalid` with a stable reason.
- Unknown goal kind, missing id, invalid target, invalid period, or impossible dates are invalid.
- Repository read failure should fail/reject the service evaluation read using existing local error style. Do not return per-goal `status: "error"` because `GoalCompletionEvaluation.status` does not include `"error"`.
- A failure reading recordings must fail the overall service evaluation read and must not make takes goals appear complete.
- A failure reading sessions must fail the overall service evaluation read and must not make minutes or sessions goals appear complete.
- Because P3-10 is evaluation-only, there is no partial completion write state to roll back if any required read fails.

## Likely Files And Areas

Likely production files:

- `src/domain/practice/types.ts`
  - Add small local goal input and evaluation result types if they must be exported.
- `src/domain/practice/rules.ts`
  - Add the pure goal evaluation helper next to existing practice duration/day-summary rules, reusing `isBrowserLocalDay()` and persisted `durationMs`.
- `src/domain/practice/index.ts`
  - Existing barrel should continue exporting `types.ts` and `rules.ts`; change only if current conventions require it.
- `src/services/practice-session/types.ts`
  - Optionally add `evaluateGoalCompletion(goals)` or `getGoalCompletionEvaluations(goals)` only if the service wrapper belongs with session activity reads.
  - Prefer an input-based method over storing goals in the practice-session service.
- `src/services/practice-session/service.ts`
  - Implement the narrow read wrapper by reading sessions and recording metadata, then calling the pure evaluator.
  - Do not change existing session write, duration, recent activity, or continue-practice methods.

Likely tests:

- `tests/unit/practice-session-duration-rules.test.ts` for pure goal evaluation behavior, because it already verifies persisted-duration and browser-local-day practice rules.
- `tests/unit/practice-session-service.test.ts` for service reads and read-only behavior if a service method is added.
- `tests/unit/practice-session-repository.test.ts` only if reload evidence needs real repository persistence.
- Existing `tests/unit/home-dashboard.test.tsx` should not be touched unless future goal UI already exists; normally no Home tests are expected for P3-10.

Avoid editing:

- `docs/v1/status.json`
- package files and lockfiles
- Dexie schema/version/migration files
- recording artifact/media repositories
- event repository/replay code
- `src/components/home/**` and app routes
- Playwright specs unless implementation unexpectedly changes visible UI, which should normally be deferred.

## Boundary Conditions

- No goals.
- Unknown goal kind.
- Missing/blank goal id.
- Target `0`, negative, `NaN`, infinite, fractional, and very large finite values.
- No local practice activity.
- Minutes goal with zero-duration sessions.
- Minutes goal with `59.9s`, `60.0s`, and `119.9s` boundary durations.
- Minutes goal with sessions across today and previous days.
- Sessions goal with quick and sheet sessions.
- Sessions goal with sheet sessions that have no recordings.
- Takes goal with sheet recording metadata.
- Takes goal with recording metadata whose linked session is missing.
- Takes goal with sessions whose `recordingCount` differs from metadata count.
- Invalid timestamps for today filtering.
- Goal already completed with existing `completedAt`.
- Goal previously completed but now below target because local data was cleared or recordings were deleted.
- Goal with explicit `status: "invalid"`.
- Goal with unknown `status`.
- Multiple goals of different kinds evaluated together.
- Repository read failures for sessions and recordings.
- Repeated evaluation is idempotent and does not mutate input arrays.
- Takes goal excludes quick recordings because P3-10 counts persisted sheet recording metadata only.

## Acceptance Criteria

1. A pure goal-completion evaluator handles minutes, sessions, and takes goals from local sessions and recording metadata.
2. Completion derives only from actual local activity rows and never from fake data, UI state, events, media artifacts, or analytics assumptions.
3. Minutes goals use persisted `PracticeSession.durationMs` and do not recompute duration.
4. Sessions goals count local practice sessions, including sessions without recordings.
5. Takes goals count persisted sheet recording metadata through `listRecordingMetadata()` only; quick recording take counting is explicitly deferred.
6. `today` goals use the existing browser-local day policy consistently with Today Summary.
7. Empty, partial, completed, already-completed, invalid, cleared-data, status-normalization, minutes boundary, and read-failure states are covered.
8. The implementation is read-only for sessions/recordings/sheets/segments/goals and adds no schema, migration, event replay, media/artifact, package, Home UI, dashboard analytics, streak, command palette, notification work, or goal completion writeback.
9. Reload evidence proves the same evaluation can be derived after existing session/recording repositories reload.
10. Existing Today Summary, recent activity, Continue Practice, session history grouping, recording review, and duration tests do not regress.

## Test Coverage Plan

Pure evaluator tests:

- Empty goal list returns empty evaluations.
- Valid minutes goal with no activity is `not-started`.
- Minutes goal with partial persisted duration is `in-progress`.
- Minutes goal reaches `completed` when persisted duration meets the target threshold.
- Minutes goal uses raw milliseconds for threshold and ratio while exposing floored whole-minute progress: `59.9s` incomplete with `progress = 0`, `60.0s` complete with `progress = 1`, and `119.9s` incomplete for a two-minute target with `progress = 1`.
- Minutes goal ignores event records, recording media duration, and segment range.
- Sessions goal counts quick and sheet sessions.
- Sessions goal counts sessions without recordings.
- Takes goal counts persisted sheet recording metadata rows from `listRecordingMetadata()` only.
- Takes goal does not use `PracticeSession.recordingCount` when metadata count disagrees.
- Takes goal excludes quick recordings unless a future reviewed source-boundary split adds them.
- `today` minutes/sessions goals include only sessions whose `startedAt` is in the browser-local day.
- `today` takes goals include only recordings whose `createdAt` is in the browser-local day.
- `all-time` goals include old local activity.
- Invalid goal kinds, targets, periods, ids, and dates return `invalid` with stable reasons.
- Explicit `status: "invalid"` and unknown status values return `invalid`; `status: "completed"` evaluates incomplete when current progress is below target.
- Existing valid `completedAt` is preserved when the goal remains complete.
- Completed result uses the injected `now` when crossing the threshold.
- Progress ratio clamps to `0..1`.
- Evaluation returns deterministic results only and does not mutate or write input goal records.
- Inputs are not mutated.

Service tests, if a practice-session service method is added:

- Service reads `repository.listSessions()` and `recordingRepository.listRecordingMetadata()`.
- Service does not call save/delete/clear/update methods while evaluating.
- Mixed goals produce deterministic results from one read.
- Session read failure rejects/fails the service evaluation read and does not return fake-complete minutes/sessions evaluations.
- Recording read failure rejects/fails the service evaluation read and does not return fake-complete takes evaluations.
- Service failure paths do not return per-goal `status: "error"`.
- Existing `getTodaySummary()`, `getHomeRecentActivity()`, `getContinuePracticeTargets()`, `getSessionHistoryGroups()`, and `getRecentSession()` behavior remains unchanged.

Reload tests:

- Save quick and sheet sessions plus sheet recording metadata through existing repositories.
- Reopen/reset the Dexie-backed repository/service connection.
- Re-run the evaluator with the same goal inputs.
- Compare logical status, progress, target, and completedAt behavior. Freeze `now` when comparing generated completion timestamps.
- Include cleared-data behavior: after existing clear paths, previously complete goals evaluate below target or `not-started`, not fake-complete.
- Confirm no goal record/status/`completedAt` writeback is needed for reload stability.

Browser E2E:

- No new browser E2E is required if P3-10 remains a domain/service evaluator with no visible UI.
- Do not add Playwright goal create/edit/delete/progress flows here; P3-15 owns UI-level goal management and reload E2E.
- If implementation unexpectedly changes visible Home behavior, stop and split before adding browser tests.

Negative cases:

- Invalid target values.
- Unknown goal kind.
- Missing period.
- Invalid timestamps.
- Repository read failures.
- Deleted/cleared local activity after prior completion.
- Takes goal when quick recordings exist elsewhere but are intentionally outside the sheet metadata source.
- Multiple evaluations run back-to-back without duplicating progress or mutating completion state.

## Verification Commands

Recommended focused commands for the coding agent:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/practice-session-duration-rules.test.ts tests/unit/practice-session-service.test.ts tests/unit/practice-session-repository.test.ts
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint -- src/domain/practice/types.ts src/domain/practice/rules.ts src/domain/practice/index.ts src/services/practice-session/types.ts src/services/practice-session/service.ts tests/unit/practice-session-duration-rules.test.ts tests/unit/practice-session-service.test.ts tests/unit/practice-session-repository.test.ts
git diff --check
```

Adjust file names to match the actual implementation. Omit lint/test targets for untouched files. Add focused regression commands for `tests/unit/home-recent-activity-source.test.ts`, `tests/unit/continue-practice-targets.test.ts`, or `tests/unit/home-dashboard.test.tsx` only if their production surfaces are touched.

The coding agent must report:

- Changed file list.
- Confirmation that `docs/v1/status.json` was not changed.
- Confirmation that no Home UI, goal-management repository/schema, dashboard analytics, streaks, command palette, package files, Dexie schema/index/migration/backfill/cleanup, durable event persistence/replay, media/artifact/waveform/audio, recording rollback, or route/navigation changes were added.
- Confirmation that no goal record/status/`completedAt` writeback was added.
- Confirmation that session duration comes from persisted `durationMs`.
- Confirmation that takes goals count sheet recording metadata only.
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

- This is local domain/service boundary work over persisted sessions and recording metadata.
- It needs failure, invalid-goal, local-day, and reload evidence.
- It should not touch visible UI, media capture, recording artifacts, waveform work, migrations, cleanup, or destructive data operations.

Escalate to Tier C only if a later reviewed split adds visible Home goal UI. Escalate to Tier E only if implementation discovers a real need for schema/index/migration/backfill, and stop before doing that work.

## Coding Handoff

- Read this plan, `docs/v1/START-HERE.md`, `docs/v1/status.json`, `docs/v1/implementation-slices/03-sessions-continue-practice.md`, `docs/v1/05e-session-integration.md`, `docs/v1/08-practice-session.md`, `docs/v1/01-app-shell-home.md`, and `docs/v1/remaining-feature-contracts.md`.
- Read the P3-05 duration plan and current `src/domain/practice/rules.ts` before implementing minutes goals.
- Inspect only the current practice-session domain/service/repository, recording metadata repository, and focused tests needed for this evaluator.
- Prefer adding the pure evaluator to the existing practice rules surface with an optional narrow service wrapper.
- Do not create a separate `goal-completion.ts` module or new read model unless the existing rules/types files prove insufficient and a delta review approves the split.
- Do not invent goal persistence. Accept goal definitions as service/evaluator input and return evaluations only.
- Do not write goal records, statuses, or `completedAt` fields even if a goal repository appears by coding time; split and re-review any writeback need.
- Keep sessions/recordings read-only.
- Count takes from sheet recording metadata only; do not add quick-recording source logic in P3-10.
- Keep P3-14/P3-15 goal management storage/UI out of this slice.
- Do not add dependencies.
- Do not edit `docs/v1/status.json`.

## Review Handoff

Review against this plan plus `sessions.goal-completion`, `home.goal-management`, P3-05, P3-06, and P3-08/P3-09 boundaries. Focus on:

- Scope creep into goal storage/UI, analytics, streaks, notifications, command palette, or dashboard work.
- Any schema, migration, localStorage contract, package, media/artifact, event replay, route, or status-file changes.
- Whether progress is derived only from local sessions and recording metadata.
- Whether persisted `durationMs` is used instead of timestamp/event/media recomputation.
- Whether minutes completion uses raw milliseconds, floored progress minutes, and raw-ratio progressRatio.
- Whether takes counting is sheet-metadata-only and does not fallback to quick recordings or `recordingCount`.
- Whether invalid goals, status normalization, and read failures cannot produce fake completion.
- Whether any goal record/status/`completedAt` writeback leaked in.
- Whether reload and read-only behavior are tested.

## Verification Handoff

Verification should run the focused commands above. PASS requires:

- Pure evaluator tests for minutes/sessions/takes, partial/completed/invalid/empty states, local-day behavior, and idempotence.
- Service tests for repository reads, read-only behavior, and failure containment if a service wrapper is added.
- Reload evidence using existing persistence.
- Explicit evidence for raw-millisecond minutes boundaries, sheet-only takes, status normalization, read failure rejection, and no goal writeback.
- Typecheck, lint for changed files, and `git diff --check`.
- Source inspection confirming no UI, goal schema/storage, media/artifact, event replay, package, or navigation changes were added.

## Deferred Work Register

| Deferred work | Future owner |
| --- | --- |
| Durable local goal repository and create/edit/delete service | `P3-14 home-goal-management-domain-repository` |
| Goal completion writeback to durable goal records, including stored status or completedAt updates | Separate reviewed P3-14 follow-up or explicit goal-writeback slice |
| Home goal list/editor/progress UI and Playwright create/edit/delete/reload flows | `P3-15 home-goal-management-ui` |
| Dashboard analytics that include goal progress | `P3-11`, `P3-12` |
| Practice streaks and calendar-style consistency claims | `P3-13` |
| Command palette actions for goals or goal targets | `P3-16` |
| Notifications, reminders, achievements, plans, social sharing | Future explicit feature, not v1 P3-10 |
| Durable event-derived goal progress | Future explicit event-persistence/replay slice |
| Unified quick recording metadata source for takes goals | Future recording/goal-source slice |
| Cloud/cross-device goal sync | v2 |

## Split Triggers

Stop and return to planning if implementation requires:

- More than roughly 300-400 lines of production code excluding focused tests.
- Any goal persistence store, repository, schema, localStorage contract, migration, backfill, import/export, or cleanup work.
- Any goal record/status/`completedAt` writeback or idempotent completion update.
- Any Home UI, goal editor, goal list, badge rendering, route, or Playwright UI flow.
- Any dashboard analytics, streak, command palette, notification, or practice-plan behavior.
- Any durable event persistence, event replay, or event-derived progress.
- Any media/artifact/blob/waveform/audio decode read.
- Any recording save/link/commit/rollback/artifact cleanup change.
- Any package/dependency change.
- Any broad rewrite of practice-session, recording, Home, recent-activity, or continue-practice code.

Safe splits if needed:

- `P3-10A practice-rules-goal-evaluation`: pure goal contracts, evaluator in existing practice rules/types, and unit tests only.
- `P3-10B goal-completion-service-read`: service wrapper, read-only repository integration, failure containment, and reload tests.
- `P3-10C goal-source-adapter`: only if a verified existing goal repository appears before coding and a tiny read-only adapter is needed, with no schema, UI, or writeback work.

Do not silently expand P3-10 into P3-14/P3-15 goal management, dashboard analytics, or migration work.
