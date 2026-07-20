# P3-14 Home Goal Management Domain Repository Plan

## Slice

- Slice id: `P3-14 home-goal-management-domain-repository`
- Source feature: `home.goal-management`
- Acceptance pack: Pack 3, Sessions / Continue Practice
- Product contract: `docs/v1/01-app-shell-home.md`
- Slice file: `docs/v1/implementation-slices/03-sessions-continue-practice.md`
- Current lifecycle state: `not_started` in `docs/v1/status.json` as of this plan. Do not edit status in this slice.
- Planning model: `gpt-5.5`, medium effort, standard speed
- Coding/review/verification tier: Tier B - Local Persistence / Service Boundary

## Context Read

Planning was based on these repo sources:

- `docs/v1/START-HERE.md`
- `docs/v1/status.json`
- `docs/v1/implementation-slices/README.md`
- `docs/v1/implementation-slices/product-feature-map.md`
- `docs/v1/implementation-slices/03-sessions-continue-practice.md`
- `docs/v1/01-app-shell-home.md`
- `docs/v1/implementation-slices/plans/P3-10-goal-completion-evaluator.md`
- `docs/v1/implementation-slices/plans/P3-11-home-dashboard-analytics-source.md`
- `docs/v1/implementation-slices/plans/P3-13-home-practice-streaks.md`
- `src/domain/practice/types.ts`
- `src/domain/practice/rules.ts`
- `src/domain/practice/validation.ts`
- `src/services/practice-session/types.ts`
- `src/services/practice-session/service.ts`
- `src/infrastructure/db/practice-session-repository.ts`
- `src/infrastructure/db/browser-practice-session-service.ts`
- `src/infrastructure/db/global-practice-session-repository.ts`
- `src/infrastructure/db/recording-history-metadata-repository.ts`
- `src/infrastructure/storage/storage-contracts.ts`
- Existing focused tests under `tests/unit/practice-session-*.test.ts`

## Refined Goal

P3-14 creates the narrow local-first goal domain/repository boundary needed by Home goal management. It should persist user-created `LocalPracticeGoal` records, expose CRUD/list operations through a small browser repository and service boundary, and provide a read path that composes those stored goals with the existing P3-10 evaluator.

This slice is not Home UI. It should make P3-15 straightforward by giving that UI a durable goal source with predictable validation, ordering, empty states, subscription behavior, and progress evaluation. It must not become a broad goals platform, notification system, analytics rewrite, or practice-plan engine.

## Refined Scope

P3-14 owns:

- A durable local goal record contract based on the existing P3-10 `LocalPracticeGoal` type.
- Validation/parsing helpers for persisted goal records.
- A narrow repository interface for local goal records:
  - `listGoals()`
  - `getGoal(goalId)`
  - `saveGoal(goal)`
  - `deleteGoal(goalId)`
  - `clear()`
  - `subscribe(listener)`
- A browser Dexie repository for goals.
- A browser service wiring point for the repository.
- Exactly one stored-goal evaluation service method, named `getPracticeGoalEvaluations()` or an equally narrow local equivalent, that composes persisted goals with existing activity reads and P3-10 evaluation semantics.
- Thin service methods for goal management, either in the preferred `practice-goals` service or as an acceptable narrow practice-session service extension:
  - `listPracticeGoals()`
  - `getPracticeGoal(goalId)`
  - `savePracticeGoal(goal)`
  - `deletePracticeGoal(goalId)`
  - `getPracticeGoalEvaluations()`
- Focused unit/repository/service tests for persistence, validation, ordering, delete/clear, subscription, read failure, fixed-clock today evaluation, and evaluation composition.

## Explicit Non-Goals

P3-14 must not implement:

- Home goal list/editor/progress UI, forms, buttons, modals, route changes, keyboard flows, or Playwright UI flows. P3-15 owns those.
- Goal cards inside `src/components/home/**`, dashboard layout changes, hook UI state, or in-app copy.
- Goal defaults, templates, suggested goals, goal recommendations, practice plans, routines, reminders, notifications, achievements, badges, social sharing, or calendar behavior.
- New goal kinds beyond P3-10's exact `minutes`, `sessions`, and `takes`.
- New periods beyond P3-10's exact `today` and `all-time`.
- Weekly/monthly recurring goals, streak goals, score/quality goals, per-sheet goals, per-segment goals, target BPM goals, or due-date scheduling.
- Goal completion writeback, status auto-updates, stored progress snapshots, analytics caches, or background jobs.
- New dashboard analytics math; stored-goal evaluation must delegate to `evaluatePracticeGoalCompletion(...)` / `evaluateGoalCompletion(...)`.
- Practice streak changes from P3-13.
- Direct recording artifact/blob/waveform/audio reads.
- Changes to recording save/link/rollback/cleanup behavior.
- Event replay, durable event-derived progress, or event persistence changes.
- Import/export, backup/restore, selective cleanup, settings storage summary, cloud sync, login, or cross-device behavior.
- Package/dependency changes.
- `docs/v1/status.json` edits.

If any of these become necessary, stop and return to planning or split the work.

## Domain Contract

Reuse the existing P3-10 goal type as the storage contract unless implementation finds a hard blocker:

```ts
export type LocalPracticeGoalKind = "minutes" | "sessions" | "takes";
export type LocalPracticeGoalPeriod = "today" | "all-time";
export type LocalPracticeGoalStatus = "active" | "completed" | "invalid";

export type LocalPracticeGoal = {
  id: string;
  kind: LocalPracticeGoalKind;
  target: number;
  period: LocalPracticeGoalPeriod;
  createdAt: string;
  completedAt?: string | null;
  status?: LocalPracticeGoalStatus;
};
```

Repository validation should tighten this for persistence:

- `id`: trimmed non-empty string. Preserve the caller's id after trim; do not generate UI-specific ids in the repository.
- `kind`: exactly `minutes`, `sessions`, or `takes`.
- `target`: finite positive integer. Reject `0`, negative, fractional, `NaN`, and infinity.
- `period`: exactly `today` or `all-time`.
- `createdAt`: strict ISO datetime compatible with existing `validation.ts` style.
- `completedAt`: optional; persist as `null` when absent. If present, it must be a strict ISO datetime.
- `status`: optional input should persist as `active` by default. Persisted values must be exactly `active`, `completed`, or `invalid`.

Prefer adding `parseLocalPracticeGoal(...)` and `validateLocalPracticeGoal(...)` to `src/domain/practice/validation.ts` so repository reads filter malformed rows and writes reject invalid records consistently with session/recording validation.

## Persistence Shape

Use a dedicated Dexie database for local practice goals, not the practice-session Dexie database.

Recommended storage constant:

```ts
export const PRACTICE_GOAL_DB_NAME = "metronome-practice-v1-practice-goals";
```

Recommended Dexie shape:

```ts
type PracticeGoalDatabaseSchema = {
  goals: Table<LocalPracticeGoal, string>;
};

this.version(1).stores({
  goals: "id, kind, period, status, createdAt"
});
```

Rationale:

- P3-14 introduces a new durable local feature. A new v1 goal DB avoids mutating the already-verified practice-session DB versions for unrelated session storage.
- Version `1` is enough for a brand-new database. Do not add migration scaffolding beyond normal Dexie version declaration.
- No backfill is required because no prior durable goal repository exists.
- No import/export/cleanup integration belongs in this slice.
- The implementation PR must not change the verified practice-session Dexie schema, versions, indexes, stores, migrations, or database name. If coupling to the practice-session DB seems necessary, stop and return to planning/delta review before coding that change.

Repository ordering:

- `listGoals()` should return only parsed valid goals.
- Sort by newest first using `createdAt` descending, with a deterministic id tie-breaker. If product later wants custom ordering, split that separately.
- Malformed persisted rows are filtered from reads, matching existing local repository behavior.
- Write validation should throw on invalid input rather than storing invalid rows.

Delete/clear semantics:

- `getGoal(goalId)` should trim the id. Blank ids must reject and must not dispatch a goal-change event.
- `deleteGoal(goalId)` should trim the id. Blank ids must reject and must not dispatch a goal-change event.
- Deleting a missing non-blank id should not throw and must not dispatch a goal-change event because no state changed.
- `clear()` clears only the goal DB/table. It must not clear sessions, recordings, sheets, segments, settings, artifacts, or quick recording history.

Subscription semantics:

- Follow the existing repository event pattern from `practice-session-repository.ts`.
- Dispatch a browser event only after a successful operation that changes goal state: successful `saveGoal`, successful deletion of an existing goal, and `clear()` when it clears the goal table.
- Failed validation, blank `getGoal`, blank `deleteGoal`, missing-id `deleteGoal`, read-only `listGoals`, and read-only `getGoal` must not dispatch.
- `subscribe(listener)` should be a no-op unsubscribe on the server and listen to the goal change event in the browser.
- Do not reuse the practice-session change event for goals. Use a goal-specific event name.

## Service Boundary

Introduce a small goal repository interface in a service-facing type file. Two acceptable shapes:

1. Preferred if keeping goal work separate from practice-session service:
   - `src/services/practice-goals/types.ts`
   - `src/services/practice-goals/service.ts`
   - `src/services/practice-goals/index.ts`
   - `browserPracticeGoalService` in `src/infrastructure/db/browser-practice-goal-service.ts`

2. Acceptable if local conventions favor the existing practice-session service as the Home read boundary:
   - add a `PracticeGoalRepository` dependency to `createPracticeSessionService(...)`
   - add methods to `PracticeSessionService` for goal CRUD/list/evaluation
   - wire `browserPracticeSessionService` with the new repository

The preferred shape is a separate `practice-goals` service because P3-14 owns goal storage and P3-15 can compose it in Home without widening practice-session responsibilities. If implementation chooses the acceptable shape, it must keep session/recording methods unchanged and explicitly update all affected tests/factories.

Required behavior whichever shape is chosen:

- Goal CRUD/list methods operate only on goal records.
- P3-14 must expose exactly one stored-goal evaluation method, preferably `getPracticeGoalEvaluations()`. It is required service surface for this slice, not an optional convenience method.
- Evaluation with stored goals must read:
  - goals from the new goal repository;
  - sessions from the existing `PracticeSessionRepository`;
  - recordings from the existing `PracticeRecordingMetadataRepository`;
  - then delegate to `evaluatePracticeGoalCompletion(...)`.
- No code should recompute goal progress outside P3-10's evaluator.
- Stored-goal evaluation must reuse P3-10 evaluator clock, period, and browser-local-day semantics exactly. Do not add a second day-boundary implementation, UTC day-key helper, or Home-specific today filter.
- If the service/evaluator supports clock injection, P3-14 must pass the injected service clock through to P3-10. Unit tests must use a fixed clock for stored-goal evaluation.
- Evaluation read failures should reject the overall method. Do not return fake empty goals or per-goal `"error"` statuses.
- A failed goal read must not evaluate stale/in-memory goals unless there is an explicit caller-supplied goal list, which is already covered by P3-10.
- Saving/deleting goals must not touch sessions, recordings, sheet last-practiced timestamps, dashboard analytics, recent activity, or streaks.

## Failure And Empty States

- Empty goal storage is a successful state: `listGoals()` returns `[]`; stored-goal evaluation returns `[]`.
- Missing goal id in `getGoal(goalId)` returns `null`.
- Invalid persisted rows are filtered from reads and must not crash the app.
- Invalid writes reject/throw and must not dispatch a change event.
- Repository open/read/write failure rejects the operation; callers must not treat it as empty storage.
- IndexedDB unavailable should reject or surface the same local repository failure style already used by Dexie-backed repositories; P3-15 can decide the UI copy.
- A goal with `status: "completed"` is only stored as data. P3-14 must not auto-maintain that status or `completedAt`.
- Clearing practice-session/recording data should not clear goals in P3-14. Existing P3-10 behavior means evaluations may become `not-started` while goal records remain.
- Clearing goals should not clear activity data.

## Likely Files

Expected production files:

- `src/domain/practice/types.ts`
  - Reuse existing `LocalPracticeGoal` types. Add only tiny storage/list result types if needed.
- `src/domain/practice/validation.ts`
  - Add parse/validate helpers for `LocalPracticeGoal`.
- `src/domain/practice/index.ts`
  - Existing barrel should continue exporting validation/types.
- `src/services/practice-goals/types.ts`
  - Define `PracticeGoalRepository` and service interface with the required `getPracticeGoalEvaluations()` method if using the preferred separate service.
- `src/services/practice-goals/service.ts`
  - Thin service over repository plus required injected session/recording/evaluator dependencies.
- `src/services/practice-goals/index.ts`
  - Barrel export.
- `src/infrastructure/storage/storage-contracts.ts`
  - Add `PRACTICE_GOAL_DB_NAME`.
- `src/infrastructure/db/practice-goal-repository.ts`
  - Dexie repository, parser export, seed/reset/clear helpers for tests.
- `src/infrastructure/db/browser-practice-goal-service.ts`
  - Browser service wiring if using separate service.
- `src/infrastructure/db/browser-practice-session-service.ts`
  - Only if the chosen service shape injects the goal repository into practice-session service.
- `src/services/practice-session/types.ts` and `src/services/practice-session/service.ts`
  - Only if implementing goal methods on `PracticeSessionService`.

Expected tests:

- `tests/unit/practice-goal-repository.test.ts`
  - New focused repository persistence tests.
- `tests/unit/practice-goal-service.test.ts`
  - New focused service tests if using separate service.
- `tests/unit/practice-session-service.test.ts`
  - Only if goal service methods are added to practice-session service.
- `tests/unit/practice-session-repository.test.ts`
  - Only for integration evidence that stored goals plus persisted sessions/recordings evaluate correctly after reload, if not covered by the new goal service/repository tests.

Files to avoid:

- `src/components/home/**`
- `src/hooks/use-practice-session-dashboard.ts`
- `tests/unit/home-dashboard.test.tsx`
- `tests/e2e/app-shell-home.spec.ts`
- recording artifact/blob/waveform code
- existing session/recording Dexie schema versions
- existing session/recording Dexie schema versions
- package files and lockfiles
- `docs/v1/status.json`

## Reuse Constraints

The coding agent must:

- Reuse the existing `LocalPracticeGoal` contract from P3-10.
- Reuse `evaluatePracticeGoalCompletion(...)` for progress/evaluation.
- Reuse existing zod validation style from `src/domain/practice/validation.ts`.
- Reuse existing Dexie repository patterns, especially parse-on-read, validate-on-write, browser event subscriptions, and test-only reset/clear helpers.
- Keep goal storage local-first and browser-only.
- Keep the repository small: CRUD/list/subscription plus test helpers.
- Keep all P3-10 evaluator semantics unchanged.

The coding agent must not:

- Create a separate progress algorithm.
- Create a generic "goals platform" or app-wide task system.
- Add user-facing Home UI or hook state.
- Add goal defaults/templates/recommendations.
- Auto-update `status` or `completedAt` from evaluator results.
- Change session, recording, dashboard analytics, recent activity, continue-practice, streak, or route behavior.
- Add direct IndexedDB reads from UI code.
- Add dependencies.

## Unit Test Matrix

Domain validation tests should cover:

1. Valid minutes, sessions, and takes goals parse and validate.
2. Missing optional `status` normalizes to `active` for persisted writes.
3. Missing optional `completedAt` normalizes to `null`.
4. Blank id rejects.
5. Unknown kind rejects.
6. Invalid period rejects.
7. Invalid status rejects.
8. Target `0`, negative, fractional, `NaN`, and infinity reject.
9. Invalid `createdAt` rejects.
10. Invalid non-null `completedAt` rejects.
11. Input objects are not mutated.

Repository tests should cover:

1. `saveGoal` persists a valid goal and `getGoal` reads it back.
2. `listGoals` returns valid goals sorted newest first with deterministic tie-breaker.
3. `saveGoal` updates an existing goal with the same id.
4. Invalid writes reject and do not leave a partial persisted row.
5. Seeded malformed rows are filtered from `listGoals` and `getGoal`.
6. `deleteGoal` removes only the requested goal.
7. Deleting a missing goal does not throw.
8. `getGoal` with a blank id rejects and does not dispatch a change event.
9. `deleteGoal` with a blank id rejects and does not dispatch a change event.
10. Deleting a missing non-blank goal id does not dispatch a change event.
11. `clear` removes goals only.
12. Goals persist across Dexie connection reset/reopen.
13. Goal clear does not clear practice-session rows or recording metadata.
14. Practice-session clear does not clear goal rows.
15. `subscribe` fires after successful save/delete of an existing goal/clear with changed state and does not fire after failed validation, blank id operations, read-only operations, or missing-id delete.
16. Server/no-window subscribe returns an unsubscribe function without throwing if this can be tested cleanly.

Service tests should cover:

1. `listGoals` delegates to the goal repository and returns parsed/sorted goals.
2. `getGoal` returns a goal or `null`.
3. `saveGoal` and `deleteGoal` delegate only to the goal repository.
4. `getPracticeGoalEvaluations()` is implemented as the single stored-goal evaluation method.
5. Stored-goal evaluation reads goals, sessions, and recording metadata, then delegates to P3-10 evaluator.
6. Stored-goal evaluation uses P3-10's existing today/browser-local-day semantics and does not implement a separate day-boundary helper.
7. A `today` goal evaluated with a fixed injected clock includes only activity from that browser-local day.
8. If clock injection exists on the chosen service shape, the fixed service clock is passed to the P3-10 evaluator.
9. Empty goal repository evaluates to `[]`.
10. Goal repository read failure rejects stored-goal evaluation and is not treated as empty.
11. Session repository read failure rejects stored-goal evaluation.
12. Recording metadata read failure rejects stored-goal evaluation.
13. Stored-goal evaluation does not call goal save/delete/update.
14. Stored-goal evaluation does not write sessions, recordings, sheets, or segments.
15. A stored completed goal whose local activity was cleared evaluates below target through P3-10 semantics without mutating the stored goal.

Reload/integration tests should cover:

1. Persist goals, sessions, and sheet recording metadata; reset/reopen repository connections; stored-goal evaluation returns the same logical statuses/progress with a fixed clock.
2. Clear activity data while keeping goals; reset/reopen; goals still list, and evaluations reflect cleared activity.
3. Clear goals while keeping activity data; reset/reopen; activity-derived Home analytics/streak/session reads remain unaffected.

Browser E2E:

- No new browser E2E is required for P3-14 if no visible UI is changed.
- Do not add Home create/edit/delete/progress Playwright tests here; P3-15 owns them.
- If implementation unexpectedly changes visible Home behavior, stop and split before adding E2E.

## Acceptance Criteria

P3-14 is complete when:

1. A local goal repository persists `LocalPracticeGoal` records in a dedicated browser storage boundary.
2. Repository reads parse/filter malformed persisted rows and writes validate/reject invalid records.
3. CRUD/list/clear/subscribe behavior is deterministic and covered by focused tests.
4. Goal storage survives Dexie connection reset/reload.
5. Goal storage is independent from practice-session and recording storage: clearing one does not clear the other.
6. The service exposes exactly one stored-goal evaluation method, preferably `getPracticeGoalEvaluations()`.
7. Stored-goal evaluation composes persisted goals with existing sessions/recordings and delegates to P3-10 evaluator.
8. Stored-goal evaluation preserves P3-10 today/browser-local-day and clock semantics, including fixed-clock test coverage for a `today` goal.
9. Empty goal storage and failed goal/session/recording reads have distinct behavior.
10. Blank `getGoal` and `deleteGoal` ids reject; missing non-blank delete does not throw and does not dispatch a change event.
11. No Home UI, dashboard layout, goal form, Playwright UI flow, route, notification, template, recommendation, status-file, package, media/artifact, event replay, or analytics rewrite scope is added.
12. P3-10 evaluator behavior, P3-11 analytics source behavior, and P3-13 streak behavior do not regress.

## Verification Commands

Recommended focused commands for the coding agent:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/practice-goal-repository.test.ts tests/unit/practice-goal-service.test.ts tests/unit/practice-session-service.test.ts tests/unit/practice-session-repository.test.ts
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint -- src/domain/practice/types.ts src/domain/practice/validation.ts src/domain/practice/index.ts src/services/practice-goals/types.ts src/services/practice-goals/service.ts src/services/practice-goals/index.ts src/infrastructure/storage/storage-contracts.ts src/infrastructure/db/practice-goal-repository.ts src/infrastructure/db/browser-practice-goal-service.ts src/services/practice-session/types.ts src/services/practice-session/service.ts src/infrastructure/db/browser-practice-session-service.ts tests/unit/practice-goal-repository.test.ts tests/unit/practice-goal-service.test.ts tests/unit/practice-session-service.test.ts tests/unit/practice-session-repository.test.ts
git diff --check
```

Adjust the lint/test file list to match actual touched files. If the implementation uses the separate `practice-goals` service and does not touch practice-session service files, omit the practice-session service files from targeted lint and explain where evaluation integration is covered.

The coding agent must report:

- Changed file list.
- Confirmation that `docs/v1/status.json` was not changed.
- Confirmation that no Home UI, route, hook dashboard state, Playwright UI flow, notification, template, recommendation, package, event replay, media/artifact, or analytics rewrite scope was added.
- Confirmation that progress/evaluation delegates to P3-10 and no second progress algorithm was introduced.
- Confirmation that stored-goal evaluation uses P3-10 today/browser-local-day semantics with a fixed-clock test.
- Confirmation that goal storage is separate from activity storage and clear operations do not cross boundaries.
- Confirmation that the practice-session Dexie schema/version was not changed.
- Focused unit/repository/integration test output.
- Typecheck output.
- Lint output for changed files.
- `git diff --check` output.

## Agent Assignments

Planning:

- Model: `gpt-5.5`
- Effort: medium
- Speed: standard

Coding:

- Model: `gpt-5.4`
- Effort: high
- Speed: standard
- Reason: Tier B local persistence/service boundary work with validation and reload evidence, no visible UI.

Review:

- Model: `gpt-5.4-mini`
- Effort: high
- Speed: standard
- Review scope: planned slice, changed files, goal storage boundaries, validation, repository behavior, evaluation composition, and test coverage.

Verification:

- Model: `gpt-5.4-mini`
- Effort: high
- Speed: standard
- Verification scope: focused commands above plus source inspection for no UI/scope creep.

## Status And PR Gates

- This planning pass only writes the durable plan file.
- Leave `docs/v1/status.json` unchanged.
- Before coding, the scheduler must send this complete plan text, uncompressed, through the logged-in web ChatGPT `metronome` project review gate in Chinese and incorporate required changes.
- Do not mark this slice `ready_for_coding` until the review gate passes.
- Coding must happen in a fresh coding agent using this plan.
- Review must be performed by a fresh review agent against this plan and changed files.
- Verification must be performed by a fresh verification agent and must report PASS/FAIL with command evidence.
- Open a small PR for P3-14 only; do not bundle P3-15 UI or unrelated Home refactors.

## Coding Handoff

Coding should read only:

- `docs/v1/START-HERE.md`
- this plan
- `docs/v1/implementation-slices/03-sessions-continue-practice.md`
- `docs/v1/01-app-shell-home.md`
- `docs/v1/implementation-slices/plans/P3-10-goal-completion-evaluator.md`
- current `src/domain/practice/types.ts`
- current `src/domain/practice/rules.ts`
- current `src/domain/practice/validation.ts`
- current Dexie repository examples such as `src/infrastructure/db/practice-session-repository.ts`
- current service wiring around `src/infrastructure/db/browser-practice-session-service.ts`
- focused tests for practice-session service/repository patterns

Keep the patch small. Prefer a separate `practice-goals` service/repository boundary unless the current code shape makes practice-session service extension clearly smaller and safer. In either shape, the implementation must still use a dedicated goal DB and exactly one stored-goal evaluation method. If implementation appears to require UI, broad goal categories, practice-session DB schema/version changes, migrations to existing DBs, import/export, cleanup/settings integration, completion writeback, or more than roughly 300-450 production LOC, stop and return to planning with the exact blocker.

## Review Checklist

Review should explicitly check:

- Goal persistence is local-only and narrow.
- The repository stores `LocalPracticeGoal` records, not progress snapshots or UI state.
- Validation matches P3-10 goal semantics.
- Malformed persisted rows cannot crash list/get.
- Writes reject invalid goals and do not dispatch false change events.
- Dexie schema is a dedicated new v1 goal DB, with no practice-session Dexie schema/version changes.
- Goal clear and activity clear are independent.
- Stored-goal evaluation delegates to P3-10.
- Stored-goal evaluation uses P3-10 today/browser-local-day and clock semantics; no second day-boundary implementation exists.
- No auto-writeback of `status`, `completedAt`, or progress occurs during evaluation.
- No Home UI, dashboard hook, route, notification, template, recommendation, event replay, media/artifact, package, status-file, import/export, cleanup, or settings scope appears.
- Tests prove persistence across reload, independence from activity storage, read failure behavior, and no writes during evaluation.

## Deferred Work

| Deferred work | Future owner |
| --- | --- |
| Home goal create/edit/delete/progress UI and browser E2E | `P3-15 home-goal-management-ui` |
| Goal progress display inside Home cards | `P3-15 home-goal-management-ui` |
| Dashboard analytics display of stored-goal progress | `P3-15` or a reviewed analytics follow-up |
| Goal completion writeback/status auto-maintenance | Separate reviewed goal-writeback slice |
| Goal templates/defaults/recommendations/practice plans | Future explicit feature |
| Weekly/monthly/streak/per-sheet/per-segment/target-BPM goals | Future explicit feature |
| Import/export, selective cleanup, storage usage for goals | Pack 8 or reviewed settings/local-data slice |
| Notifications/reminders/achievements/social sharing | Future explicit feature |
| Cloud/cross-device goal sync | v2 |
