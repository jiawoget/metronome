# P3-15 Home Goal Management UI Plan

## Slice

- Slice id: `P3-15 home-goal-management-ui`
- Source feature: `home.goal-management`
- Acceptance pack: Pack 3, Sessions / Continue Practice
- Product contract: `docs/v1/01-app-shell-home.md`
- Slice file: `docs/v1/implementation-slices/03-sessions-continue-practice.md`
- Current dependency state: `P3-14 home-goal-management-domain-repository` is verified in `docs/v1/status.json`.
- Current lifecycle state: `not_started` in `docs/v1/status.json` as of this plan. Do not edit status in this slice.
- Model tier: Tier C, User-Facing UI With Browser E2E.

## External Review Notes

The external web ChatGPT plan review returned `PASS_WITH_CHANGES`. This revision incorporates the required changes:

- IndexedDB unavailable handling must remain behind the P3-14 service or an existing app-level unavailable pattern; Home UI/hook code must not directly check or access Dexie/IndexedDB.
- Create/edit object construction must prefer a P3-14 helper when present, or use only a tiny Home-local draft-to-`LocalPracticeGoal` adapter with injectable/deterministic id and clock generation.
- Target validation must require a positive safe integer and obey existing P3-14/domain range limits.
- Browser E2E must cover minutes, sessions, and takes goals, with takes backed by real supported sheet recording metadata.
- Cleared-data/completed-status semantics, subscription lifecycle, and the P3-17 session-comparison boundary are mandatory review points.

## Context Read

Planning was based on these repo sources:

- `docs/v1/START-HERE.md`
- `docs/v1/status.json`
- `docs/v1/implementation-slices/README.md`
- `docs/v1/implementation-slices/03-sessions-continue-practice.md`
- `docs/v1/implementation-slices/product-feature-map.md`
- `docs/v1/01-app-shell-home.md`
- `docs/v1/ui-design.md`
- `docs/v0/design-style-guide.md`
- `docs/v0/project-structure.md`
- `docs/v0/tech-stack-decisions.md`
- `docs/v1/implementation-slices/plans/P3-10-goal-completion-evaluator.md`
- `docs/v1/implementation-slices/plans/P3-11-home-dashboard-analytics-source.md`
- `docs/v1/implementation-slices/plans/P3-12-home-dashboard-analytics-ui.md`
- `docs/v1/implementation-slices/plans/P3-13-home-practice-streaks.md`
- `docs/v1/implementation-slices/plans/P3-14-home-goal-management-domain-repository.md`
- Current file inventory under `src/components/home`, `src/hooks`, `src/services/practice-goals`, `src/services/practice-session`, `src/domain/practice`, `tests/unit`, and `tests/e2e`.

## Refined Goal

P3-15 adds the Home UI for local practice goal management. It should let the player create, edit, delete, view, and refresh progress for durable local goals created through the verified P3-14 goal service boundary. The UI must stay compact and practice-oriented, fit into the existing Home dashboard, and preserve existing Home entries for Quick Metronome, Continue Practice, Today Summary, Practice Analytics, Practice Streaks, Recent Activity, and utility links.

This is a UI integration slice over existing goal storage and P3-10 evaluation. It must not create a second goal repository, duplicate progress math, add goal templates, or expand into reminders, scoring, streak goals, cloud sync, or practice-plan behavior.

## Refined Scope

P3-15 owns:

- Home hook state for persisted goals, goal evaluations, loading, saving, deleting, and contained error statuses.
- Home goal panel rendering:
  - empty state when no goals exist;
  - list of persisted local goals;
  - progress display for minutes, sessions, and takes goals from stored-goal evaluations;
  - create, edit, and delete controls.
- A compact create/edit form for P3-14 goal fields:
  - goal kind: `minutes`, `sessions`, `takes`;
  - period: `today`, `all-time`;
  - positive safe-integer target within the existing P3-14/domain range;
  - optional simple display name only if an existing P3-14 type already supports it. If not, use compact derived labels and do not widen the persisted contract.
- Controlled save/delete flows through the P3-14 practice-goals service.
- Subscription or refresh integration so Home reflects goal changes without a full browser restart.
- Persistence and reload browser E2E for create, edit, delete, and progress.
- Focused unit/component tests for Home UI states, validation feedback, service calls, contained failures, and existing Home regression coverage.

## Out Of Scope

P3-15 must not implement:

- New goal storage, schema, repository, Dexie database, migration, index, localStorage key, import/export, cleanup, storage summary, or settings integration.
- New goal domain kinds, periods, target types, due dates, per-sheet goals, per-segment goals, target-BPM goals, weekly/monthly goals, streak goals, recurring goals, or practice-plan entities.
- Goal defaults, templates, recommendations, suggestions, onboarding, badges, achievements, notifications, reminders, calendar behavior, or social sharing.
- Goal completion writeback, automatic stored `status` updates, stored progress snapshots, background jobs, or analytics caches.
- A second goal progress algorithm. All progress must come from P3-14 stored-goal evaluation, which delegates to P3-10.
- Dashboard analytics rewrites, streak rewrites, recent activity changes, continue-practice ranking changes, navigation changes, command palette behavior, or route additions.
- P3-17 `practice-session-session-comparison` or any session-comparison UI/source behavior.
- Direct IndexedDB/Dexie reads from `src/components/home/**` or `src/hooks/use-practice-session-dashboard.ts`.
- Recording artifact/blob/waveform/audio reads, media capture flows, or recording rollback/cleanup changes.
- Package, lockfile, config, broad style refactors, or `docs/v1/status.json` edits.
- User-facing scoring, quality assessment, automatic mistake detection, AI recommendations, cloud sync, login, backup conflict merge, cross-device resume, or v2 behavior.

If any out-of-scope item appears necessary, stop and return to planning or split the work.

## Existing Contracts To Reuse

The coding agent must reuse:

- `LocalPracticeGoal`, `LocalPracticeGoalKind`, `LocalPracticeGoalPeriod`, and `GoalCompletionEvaluation` from P3-10/P3-14.
- P3-14 `practice-goals` service/repository boundary for goal CRUD/list/subscription/evaluation.
- P3-14 stored-goal evaluation method, preferably `getPracticeGoalEvaluations()`, for progress.
- P3-10 evaluator semantics for progress:
  - minutes from raw persisted `PracticeSession.durationMs`;
  - sessions from persisted practice sessions;
  - takes from persisted sheet recording metadata only;
  - `today` by existing browser-local-day policy;
  - invalid/completed/cleared-data semantics unchanged.
- Existing Home hook guarded refresh pattern from P3-12/P3-13 so older refreshes cannot overwrite newer dashboard state.
- Existing Home card/panel, metric tile, button, form, dialog/popover, icon, tooltip, loading, and contained error patterns.
- Existing unit/E2E helper patterns in `tests/unit/home-dashboard.test.tsx` and `tests/e2e/app-shell-home.spec.ts`.

The coding agent must not:

- Recalculate goal progress in Home UI or hook code from raw sessions, recordings, analytics totals, or streak data.
- Store goal state only in React state.
- Add direct storage reads in UI/hook code.
- Create a generic goals platform or new app-wide task system.
- Mutate sessions, recordings, sheets, segments, analytics, streaks, recent activity, or continue-practice targets while saving/deleting goals.

## Data And Service Contract

Use P3-14 service methods as the Home UI source of truth. Final names should match the implementation, but the UI should need surfaces equivalent to:

```ts
type PracticeGoalService = {
  listGoals(): Promise<LocalPracticeGoal[]>;
  saveGoal(goal: LocalPracticeGoal): Promise<void>;
  deleteGoal(goalId: string): Promise<void>;
  getPracticeGoalEvaluations(): Promise<GoalCompletionEvaluation[]>;
  subscribe(listener: () => void): () => void;
};
```

Recommended Home hook state additions:

```ts
type PracticeGoalReadStatus = "idle" | "loading" | "ready" | "error";
type PracticeGoalMutationStatus = "idle" | "saving" | "deleting" | "error";

type HomeGoalManagementState = {
  goals: LocalPracticeGoal[];
  evaluations: GoalCompletionEvaluation[];
  readStatus: PracticeGoalReadStatus;
  mutationStatus: PracticeGoalMutationStatus;
  errorMessage: string | null;
  mutationErrorMessage: string | null;
};
```

Rules:

- `goals` and `evaluations` are both read from service boundaries, not from locally computed progress.
- Matching UI goal rows to evaluations uses stable `goal.id`.
- If evaluations omit a goal because it is invalid or filtered, the UI renders an honest unavailable/invalid progress state instead of fake zero completion.
- If goal read succeeds but evaluation read fails, show the goal list with contained progress-load error copy.
- If goal list read fails on first load, show a contained goal-panel error and preserve the rest of Home.
- If a later refresh fails after prior goal data exists, keep the previous goals visible and show the contained error state.
- Saving and deleting should trigger a refresh or rely on the P3-14 subscription event, but the UI must not require a full reload to show the update.
- Empty goal storage is a successful state, distinct from service failure or IndexedDB unavailable.
- IndexedDB unavailable or local storage failure must surface through the P3-14 service boundary or an existing app-level unavailable pattern. Home UI and `usePracticeSessionDashboard()` must not directly check Dexie, open IndexedDB, or bypass the browser goal service just to detect unavailable storage.

## Goal Object Construction Boundary

Create/edit flows must construct persisted goal objects at a precise boundary:

- Prefer a P3-14 create/factory/validation helper if one exists.
- If no P3-14 helper exists, allow only a tiny Home-local draft-to-`LocalPracticeGoal` adapter. It may map form draft fields into the existing P3-14 shape and nothing more.
- Do not build persisted `LocalPracticeGoal` objects directly in the React render path.
- Do not add persisted fields, display labels, UI-only state, progress snapshots, or status writeback to the saved object.
- Do not change the P3-14 repository, schema, validation, service contract, or Dexie storage shape to support the form.
- Goal id and clock generation must be injectable in tests or follow an existing deterministic repo test pattern, so unit tests do not depend on real time or random ids.
- Edit saves must preserve `id` and original `createdAt` unless a P3-14 helper explicitly owns a different validated update shape.

## Subscription Lifecycle

Goal subscription integration must be leak-free:

- Subscribe to the P3-14 goal service only once for a mounted Home dashboard/hook instance.
- Unsubscribe on unmount.
- Subscription-triggered refresh must reuse the same latest-refresh sequence guard used by P3-12/P3-13 dashboard reads.
- Older subscription-triggered successes or failures must not overwrite newer goal state.
- Save/delete mutation completions must not race with subscription refreshes in a way that resurrects stale rows.
- No `setState` after unmount. Use the existing hook cleanup/sequence pattern rather than adding a separate unguarded listener path.

## UI Shape

Add a compact `Practice Goals` region to the existing Home dashboard.

Recommended placement:

- Near the existing Today Summary, Practice Analytics, and Practice Streaks panels.
- Do not push Quick Metronome, Continue Practice, or core practice entry points below an unusable fold on desktop or mobile.

Visual and interaction requirements:

- Use the existing Home dashboard visual language: warm off-white page, white/light surfaces, subtle dividers, compact typography, restrained shadows, and 8px or smaller card radius.
- Keep yellow for primary practice/action emphasis and purple only as a restrained secondary create accent if consistent with current Home patterns.
- Use `lucide-react` icons for add/edit/delete/more actions where already available.
- Use familiar shadcn/Radix-compatible primitives for buttons, dialog, select, input, tooltip, and confirmation UI. Do not hand-roll custom select/dialog primitives.
- Do not nest `Card` inside `Card`. Goal rows inside the panel should be plain rows or lightweight divs.
- The region must have `role="region"` and an accessible name such as `Practice Goals`.
- Create/edit form fields must have labels and validation messages accessible to screen readers.
- Delete must require an explicit confirmation action, either through an existing confirmation dialog/pattern or a restrained inline confirm state.
- Mobile width around 390 px must not clip target labels, buttons, form fields, or progress text.
- Tablet width around 1024 px and desktop width around 1280 px must remain dense and readable.
- No marketing copy, hero layout, decorative illustration, tutorial text, gradient orb, or fake goal history.

Suggested copy:

- Region title: `Practice Goals`
- Empty state: `No local goals yet.`
- Create action: `New goal`
- Edit action: icon button with accessible label `Edit goal`
- Delete action: icon button with accessible label `Delete goal`
- Error: `Practice goals could not be loaded.`
- Progress error: `Goal progress could not be loaded.`

Keep copy short. Do not introduce motivational claims, notifications, reminders, scoring, or achievement language.

## Create Flow

Create flow should:

1. Open a compact form from `New goal`.
2. Default to a useful but honest local goal:
   - kind: `minutes`;
   - period: `today`;
   - target: small positive integer such as `20`, unless the current design already has a different local default.
3. Validate before save:
   - kind is one of `minutes`, `sessions`, `takes`;
   - period is `today` or `all-time`;
   - target passes `Number.isSafeInteger(...)`, is positive, and obeys any existing P3-14/domain max or range;
   - if no explicit max exists, reject unsafe integers, exponential/infinity-like input, and values large enough to destabilize display, progress bars, evaluator ratios, or tests;
   - blank, zero, negative, fractional, `NaN`, non-numeric, unsafe, and infinity-like text reject.
4. Construct the saved goal through a P3-14 helper if available. Otherwise use only the tiny Home-local draft-to-`LocalPracticeGoal` adapter described above, with deterministic/injectable id and clock generation.
5. Persist via `saveGoal(...)`.
6. Close the form only after a successful save.
7. Refresh/listen so the new goal row and progress appear without reload.
8. On save failure, keep the form open, show contained error copy, and do not add optimistic fake rows.

Create must not seed templates, recommendations, or hidden default goals.

## Edit Flow

Edit flow should:

1. Open the same compact form populated from the selected persisted goal.
2. Preserve the existing `id` and original `createdAt`.
3. Allow changing kind, period, and target.
4. Revalidate using the same rules as create.
5. Construct the edited goal through the same P3-14 helper or tiny Home-local adapter boundary. Do not build persisted objects in render code.
6. Save through `saveGoal(...)`.
7. Refresh/listen so updated label/progress appear without reload.
8. On save failure, keep the previous persisted row visible and show contained form error copy.

Editing must not write evaluator-derived `status`, `completedAt`, or progress snapshots. If the current stored goal has `status: "completed"`, changing the goal should preserve or normalize status only according to the existing P3-14 service/domain contract; the UI must not invent completion writeback behavior.

## Delete Flow

Delete flow should:

1. Require explicit confirmation for the selected goal.
2. Call `deleteGoal(goal.id)` only after confirmation.
3. Remove the row after service success and refresh/subscription update.
4. If the deleted goal was missing, reflect the service's normal behavior and refresh to the persisted list.
5. On delete failure, keep the row visible and show contained error copy.

Deleting a goal must not delete sessions, recordings, sheets, segments, analytics data, streak data, recent activity, continue-practice targets, or recording artifacts.

## Progress Display

Goal rows should show:

- A derived label from kind and period, such as `Today practice minutes`, `All-time sessions`, or `Sheet takes`.
- Progress value as `progress / target` using `GoalCompletionEvaluation.progress` and `target`.
- A compact percentage or progress bar only if backed directly by `progressRatio`; do not calculate a separate ratio.
- Status label for `not-started`, `in-progress`, `completed`, or `invalid` using short honest copy.
- For minutes, display whole minutes from evaluator progress. Do not display rounded raw duration or analytics total as progress.
- For takes, make the label clear that it is sheet takes if space allows, because P3-10 excludes quick recordings.

Boundary behavior:

- `progressRatio` must be clamped visually to `0..1`; trust evaluator output but keep CSS stable if bad data slips through.
- Invalid evaluations render as invalid/unavailable, not complete.
- Completed stored goal status does not force completed UI if the evaluation says local progress is below target after data clear/delete.
- Empty evaluations with existing goals render a contained progress unavailable state.

## Persistence And Reload Expectations

P3-15 completion requires browser-level evidence that:

- A created goal persists after page reload.
- An edited goal persists after page reload.
- A deleted goal stays deleted after page reload.
- Goal progress persists after reload by re-evaluating stored goals against existing sessions/recording metadata.
- Clearing or deleting local activity can lower progress without removing goal records, consistent with P3-10/P3-14 semantics, if existing test helpers make this stable.
- Empty goal state remains empty after reload.

The UI must rely on the P3-14 durable goal repository and P3-10 evaluator. It must not add localStorage mirrors, in-memory-only caches, optimistic-only rows, or synthetic E2E-only storage.

## Failure And Empty States

Required states:

- First load with no goals: successful empty state, not an error.
- First load with goal-list failure: contained `Practice Goals` error, rest of Home usable.
- Evaluation/progress failure with goal-list success: list remains visible with contained progress error.
- Save failure: form remains open, no fake persisted row.
- Delete failure: row remains visible.
- IndexedDB unavailable or storage failure: the unavailable/failure state comes through the P3-14 service boundary or an existing app-level unavailable pattern. Home UI/hook code must not directly check/access Dexie/IndexedDB or require bypassing the browser goal service. Tests should mock service failure/unavailable behavior rather than assert that the browser goal service was not called.
- Malformed persisted goals filtered by P3-14: UI renders valid rows only and does not crash.
- Existing Home dashboard read failures remain isolated to their panels and must not be conflated with goal failures.

## Boundary Conditions

Create/edit validation:

- Blank target.
- Target `0`.
- Negative target.
- Fractional target.
- Unsafe integer target.
- Exponential/infinity-like target text.
- Very large finite target that exceeds an existing P3-14/domain range or could destabilize display/evaluator behavior.
- Non-numeric target text.
- Unsupported kind if a malformed option is forced in a unit test.
- Unsupported period if a malformed option is forced in a unit test.

Goal list/rendering:

- No goals.
- One goal of each kind: minutes, sessions, takes.
- Today and all-time periods.
- Multiple goals sorted in the order returned by the P3-14 service.
- Invalid evaluation for a stored goal.
- Missing evaluation for a stored goal.
- Goal with completed evaluation.
- Goal previously completed but now below target after local activity clear/delete.
- Long labels or future localized text wrapping at mobile width.

Runtime:

- Goal list read failure.
- Evaluation read failure.
- Save failure.
- Delete failure.
- Subscription/refresh after save.
- Subscription/refresh after delete.
- Overlapping refreshes where older goal read success/failure resolves after a newer one.
- Reload after create/edit/delete.
- Existing Home analytics/streak/recent/continue reads remain visible and independent.

## Likely Files And Areas

Expected production files:

- `src/hooks/use-practice-session-dashboard.ts`
  - Add practice-goal state, guarded refresh, service calls, mutation handlers, and subscription integration.
- `src/components/home/home-dashboard.tsx`
  - Add `PracticeGoalsPanel`, create/edit/delete UI, form validation display, and progress rows.
- `src/services/practice-goals/index.ts`
  - Import/use existing browser service exports if needed by the Home hook.
- `src/services/practice-goals/types.ts`
  - Type-only reference only if Home hook needs service type imports.
- `src/domain/practice/types.ts`
  - Type-only reference only; avoid changing unless a verified P3-14 type export gap blocks UI typing.

Expected tests:

- `tests/unit/home-dashboard.test.tsx`
  - Extend existing Home dashboard unit/component/hook tests for goal UI, service calls, validation, mutation failure, and contained failures.
- `tests/e2e/app-shell-home.spec.ts`
  - Extend Home E2E with create/edit/delete/progress/reload and responsive checks.

Files to avoid unless a blocking P3-14 integration bug is found and separately reviewed:

- `src/services/practice-goals/service.ts`
- `src/infrastructure/db/practice-goal-repository.ts`
- `src/infrastructure/db/browser-practice-goal-service.ts`
- `src/domain/practice/rules.ts`
- `src/domain/practice/validation.ts`
- `src/services/practice-session/**`
- `src/infrastructure/storage/storage-contracts.ts`
- recording, waveform, audio, sheet, segment, settings, import/export, cleanup, package, lockfile, config, route, and status files.

## Unit And Component Test Plan

Add focused coverage in `tests/unit/home-dashboard.test.tsx`:

1. Injected empty goal data renders `Practice Goals` and honest empty copy.
2. Injected populated goal data renders one row each for minutes, sessions, and takes goals.
3. Progress display uses service-provided evaluations and does not require raw sessions/recordings in component props.
4. Completed, in-progress, not-started, invalid, and missing-evaluation states render distinct honest text.
5. Create form opens from `New goal`.
6. Create validation rejects blank, zero, negative, fractional, non-numeric, unsafe integer, exponential/infinity-like, and domain-range-exceeding targets.
7. Successful create calls `saveGoal(...)` with a valid P3-14 goal shape produced by a P3-14 helper or the tiny Home-local adapter, with deterministic/injectable id and clock behavior in tests.
8. Create save failure keeps the form open and shows contained error copy.
9. Edit opens with existing goal values and preserves id/createdAt on save.
10. Edit validation matches create validation.
11. Successful edit calls `saveGoal(...)` and updates visible row after refresh.
12. Delete requires confirmation before calling `deleteGoal(...)`.
13. Successful delete removes the row after refresh/subscription.
14. Delete failure keeps the row visible and shows contained error copy.
15. Goal-list first-load failure is contained to the goal panel and does not hide Quick Metronome, Continue Practice, Today Summary, Practice Analytics, Practice Streaks, or Recent Activity.
16. Evaluation failure with goal-list success keeps goal rows visible and shows progress error.
17. Previous goals remain visible when a later refresh fails.
18. Overlapping refreshes ignore stale older goal read success/failure, matching existing Home refresh guard.
19. IndexedDB/storage unavailable is modeled as P3-14 service failure/unavailable or an existing app-level unavailable pattern; Home UI/hook tests must not require direct Dexie/IndexedDB checks or browser service bypass.
20. A stored goal with `status: "completed"` must not render completed when the service-provided evaluator result is below target after local data clear/delete.
21. Subscription setup subscribes once per mounted dashboard/hook instance and unsubscribes on unmount.
22. Subscription-triggered refresh uses the existing latest-refresh sequence guard, including stale success/failure cases.
23. Unmount before an async goal read/save/delete/refresh resolves does not call `setState` after unmount.
24. Existing Home analytics, streak, recent activity, continue-practice, and legacy no-single-link assertions are not weakened.

If form logic becomes large, extract tiny pure helpers inside the component file or a local testable helper near Home. Do not create a broad form framework.

## Browser E2E Plan

Extend `tests/e2e/app-shell-home.spec.ts` with a focused Home goal management scenario:

1. Clear the P3-14 practice-goal DB and existing practice-session/recording metadata DBs using established test helpers.
2. Seed or create local practice activity sufficient for stable progress:
   - a practice session with persisted duration for minutes;
   - at least one session row for sessions;
   - at least one real P3-14/P3-10-supported sheet recording metadata fixture row for takes.
3. Navigate to Home.
4. Assert `Practice Goals` region is visible and initially empty.
5. Create a `minutes` `today` goal with a target that the seeded duration can partially or fully satisfy.
6. Assert the new goal row appears with service-derived progress.
7. Reload Home and assert the goal and progress remain visible.
8. Edit the goal target or period.
9. Assert updated row/progress appears.
10. Reload and assert the edit persists.
11. Delete the goal through the UI confirmation.
12. Assert the empty state returns.
13. Reload and assert the deleted goal stays gone.
14. Create a `sessions` goal, assert service-derived progress from the seeded session rows, reload, and assert the sessions goal persists with progress.
15. Create a `takes` goal, assert service-derived progress from real sheet recording metadata supported by P3-14/P3-10, reload, and assert the takes goal persists with progress.
16. Do not make sessions/takes coverage optional. They may be compact compared with the full minutes create/edit/delete flow, but each must include create, progress assertion, and reload persistence.
17. Check desktop width around 1280 px, tablet width around 1024 px, and mobile width around 390 px.
18. Run existing no-horizontal-overflow checks for populated form/list states.
19. Keep console/page errors empty.

E2E must not:

- Use real microphone hardware.
- Seed synthetic goal progress rows.
- Seed synthetic takes progress rows. Takes progress must come from real supported sheet recording metadata fixture data.
- Bypass the P3-14 goal repository with a UI-only localStorage key.
- Assert progress by duplicating evaluator math in the spec beyond simple fixture expectations.
- Add fake analytics/streak data to make the page look populated.

## Acceptance Criteria

P3-15 is complete when:

1. Home renders a compact `Practice Goals` region backed by the P3-14 practice-goals service.
2. Users can create, edit, and delete local goals for exactly P3-10/P3-14 kinds and periods.
3. Goal form validation rejects invalid, unsafe, out-of-range, and unsupported target/kind/period input before save.
4. Goal rows display progress from stored-goal evaluations, not duplicated UI math.
5. Minutes, sessions, and takes goals render honest labels and progress; takes remains sheet-take scoped.
6. Empty, loading, read-error, progress-error, save-error, delete-error, invalid, completed, and cleared-data states are handled without crashing.
7. Created and edited goals persist after browser reload; deleted goals remain deleted after reload.
8. Goal mutations update Home without requiring a full browser restart.
9. Existing Home dashboard panels and primary practice entry points remain visible and usable.
10. The implementation adds no new storage/schema/migration/package/status/route/media/notification/scoring/cloud scope.
11. Stored completed goals do not display as completed when the service-provided evaluator result is below target after local data clear/delete.
12. Goal subscriptions subscribe once, unsubscribe on unmount, use the existing refresh sequence guard, and do not set state after unmount.
13. Unit/component tests cover form flows, validation, contained failures, completed-status cleared-data behavior, progress rendering, subscription lifecycle, stale refresh behavior, and existing Home regressions.
14. Browser E2E covers the full minutes create/edit/delete/progress/reload flow, plus sessions and takes create/progress/reload persistence, and responsive desktop/tablet/mobile layout without horizontal overflow.

## Verification Commands

Use the repo-local PowerShell wrapper. Adjust lint file lists to actual touched files:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/home-dashboard.test.tsx tests/unit/practice-goal-service.test.ts tests/unit/practice-goal-repository.test.ts
& .\scripts\npm-local.ps1 --% run test:e2e -- tests/e2e/app-shell-home.spec.ts
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint -- src/hooks/use-practice-session-dashboard.ts src/components/home/home-dashboard.tsx src/services/practice-goals/index.ts src/services/practice-goals/types.ts tests/unit/home-dashboard.test.tsx tests/e2e/app-shell-home.spec.ts
git diff --check
```

If implementation touches no `practice-goals` service/repository code, the first focused unit command may omit `tests/unit/practice-goal-service.test.ts` and `tests/unit/practice-goal-repository.test.ts`, but verification should still include them when reviewing P3-14 regression risk after any service import/wiring changes.

The coding agent must report:

- Changed file list grouped by production/test/docs.
- Confirmation that `docs/v1/status.json` was not changed.
- Confirmation that no goal storage/schema/migration/package/status/route/media/notification/scoring/cloud scope was added.
- Confirmation that goal progress is sourced from P3-14 stored-goal evaluation and P3-10 evaluator semantics.
- Confirmation that no direct IndexedDB/Dexie reads were added to Home UI or hooks.
- Confirmation that IndexedDB/storage unavailable is handled through P3-14 service failure/unavailable or an existing app-level unavailable pattern, not by Home hook storage probing or service bypass.
- Confirmation that create/edit uses a P3-14 helper or the tiny Home-local draft adapter outside render code, with deterministic/injectable id and clock behavior.
- Focused unit output.
- Targeted E2E output, including reload and responsive evidence.
- Typecheck output.
- Lint output for changed files.
- `git diff --check` output.

## Agent Assignments

Planning:

- Model: `gpt-5.5`
- Effort: medium
- Speed: standard

Coding:

- Model: `gpt-5.5`
- Effort: high
- Speed: standard
- Reason: Tier C UI integration with browser E2E, persistence/reload coverage, and guarded Home refresh behavior.

Review:

- Model: `gpt-5.4`
- Effort: medium
- Speed: standard
- Review scope: planned slice, changed files, Home UI/hook boundaries, goal-service reuse, validation, progress delegation, and test coverage.

Verification:

- Model: `gpt-5.4-mini`
- Effort: high
- Speed: standard
- Verification scope: focused commands above plus source inspection for no storage/progress/scope creep.

## Status And Review Gates

- This planning pass only writes the durable plan file.
- Leave `docs/v1/status.json` unchanged.
- External web ChatGPT plan review returned `PASS_WITH_CHANGES`; this revision incorporates the required changes.
- Before coding, the scheduler should perform the normal delta-review/approval step for this revised plan if the workflow requires it.
- Do not mark this slice `ready_for_coding` until the required review gate is satisfied for this revised plan.
- Coding must happen in a fresh coding agent using this plan.
- Review must be performed by a fresh review agent against this plan and changed files.
- Verification must be performed by a fresh verification agent and must report PASS/FAIL with command evidence.
- Open a small PR for P3-15 only; do not bundle P3-16 command palette or unrelated Home refactors.

## Coding Handoff

Coding should read only:

- `docs/v1/START-HERE.md`
- this plan
- `docs/v1/implementation-slices/03-sessions-continue-practice.md`
- `docs/v1/01-app-shell-home.md`
- `docs/v1/ui-design.md`
- `docs/v0/design-style-guide.md`
- current `src/hooks/use-practice-session-dashboard.ts`
- current `src/components/home/home-dashboard.tsx`
- current `src/services/practice-goals/types.ts`
- current `src/services/practice-goals/service.ts`
- current `src/services/practice-goals/index.ts`
- current browser practice-goal service export if needed by the hook
- current `src/domain/practice/types.ts` as type reference
- current `tests/unit/home-dashboard.test.tsx`
- current `tests/e2e/app-shell-home.spec.ts`

Keep the patch small and Home-local. If implementation appears to require changing the P3-14 repository, changing P3-10 evaluator semantics, adding new goal fields to persistence, broad Home layout redesign, new routes, import/export/cleanup integration, notification/reminder behavior, or more than roughly 300-450 production LOC excluding tests, stop and return to planning with the exact blocker.

## Review Checklist

Review should explicitly check:

- Home UI uses the P3-14 service boundary and does not call Dexie/IndexedDB directly.
- IndexedDB/storage unavailable behavior is represented through P3-14 service failure/unavailable or an existing app-level unavailable pattern, not through new Home hook Dexie/IndexedDB checks or service bypass.
- Progress display delegates to stored-goal evaluations and does not duplicate P3-10 math.
- Create/edit/delete flows preserve P3-14 storage semantics and do not write progress/status snapshots.
- Create/edit object construction uses a P3-14 helper where available, or a tiny Home-local draft adapter outside render code, with no new persisted fields.
- Form validation enforces positive safe integers, existing P3-14/domain range limits, and target/kind/period boundaries without relying only on repository rejection.
- Delete confirmation is real and cannot be triggered accidentally by opening a menu.
- Goal read/evaluation/mutation failures are contained to the goal panel/form.
- Stored `status: "completed"` does not override a below-target evaluator result after local activity clear/delete.
- Subscription lifecycle subscribes once, unsubscribes on unmount, uses the existing refresh sequence guard, and cannot call `setState` after unmount.
- Previous data preservation and stale-refresh guard match the existing Home dashboard pattern.
- Existing Home entries, analytics, streaks, recent activity, and continue-practice behavior are not weakened.
- Tests assert behavior semantically rather than broad snapshots.
- E2E proves full minutes create/edit/delete/reload, compact sessions create/progress/reload, compact takes create/progress/reload using real sheet recording metadata, and responsive no-overflow states.
- No schema, migration, package, route, status, media, notification, scoring, template, recommendation, command palette, or cloud scope leaked in.

## Verification Handoff

Verification should run the focused commands and inspect the changed files. PASS requires evidence that:

- Unit/component tests cover create, edit, delete, validation, progress display, contained failures, and stale refresh behavior.
- Unit/component tests cover completed-status cleared-data behavior and subscription lifecycle/unmount guards.
- E2E covers minutes create/edit/delete through the UI, sessions and takes create/progress/reload persistence, progress display, and responsive desktop/tablet/mobile layout.
- Typecheck, lint, and `git diff --check` pass.
- Source inspection finds no direct storage access in Home UI/hook code.
- Source inspection finds no direct Dexie/IndexedDB unavailable checks or browser goal service bypass in Home UI/hook code.
- Source inspection finds no duplicated goal progress calculations.
- Source inspection finds no `docs/v1/status.json`, schema, migration, package, route, media, notification, scoring, template, or command-palette changes.
- If cleared-data/completed-status behavior is not covered in E2E because stable clear/delete helpers are unavailable, verification must explicitly say unit/component coverage is the required evidence and explain why E2E was not used for that boundary.

If browser E2E uses Playwright `[chromium]`, report it explicitly as Playwright Chromium, not real Chrome.

## Deferred Work

| Deferred work | Future owner |
| --- | --- |
| Command palette actions for goal creation or focus | `P3-16 home-command-palette` or later reviewed split |
| Dashboard analytics aggregation that treats goal progress as an analytics panel metric | Reviewed analytics follow-up |
| Goal completion writeback/status auto-maintenance | Separate reviewed goal-writeback slice |
| Goal templates/defaults/recommendations/practice plans | Future explicit feature |
| Weekly/monthly/streak/per-sheet/per-segment/target-BPM goals | Future explicit feature |
| Goal notifications/reminders/achievements/social sharing | Future explicit feature |
| Import/export, selective cleanup, or storage usage for goals | Pack 8 or reviewed settings/local-data slice |
| Practice-session session comparison or comparison UI/source behavior | `P3-17 practice-session-session-comparison` or later reviewed split |
| Cloud/cross-device goal sync | v2 |
