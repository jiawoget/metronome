# P3-13 Home Practice Streaks Plan

## Slice

- Slice id: `P3-13 home-practice-streaks`
- Source feature: `home.practice-streaks`
- Acceptance pack: Pack 3, Sessions / Continue Practice
- Product contract: `docs/v1/01-app-shell-home.md`
- Slice file: `docs/v1/implementation-slices/03-sessions-continue-practice.md`
- Current dependency state: `P3-11 home-dashboard-analytics-source` and `P3-12 home-dashboard-analytics-ui` are verified in `docs/v1/status.json`.
- Current lifecycle state: `not_started` in `docs/v1/status.json` as of this plan. Do not edit status in this slice.
- Model tier: Tier C, User-Facing UI With Browser E2E.

## Context Read

Planning was based on these repo sources:

- `docs/v1/START-HERE.md`
- `docs/v1/status.json`
- `docs/v1/implementation-slices/README.md`
- `docs/v1/implementation-slices/product-feature-map.md`
- `docs/v1/implementation-slices/03-sessions-continue-practice.md`
- `docs/v1/01-app-shell-home.md`
- `docs/v1/ui-design.md`
- `docs/v0/design-style-guide.md`
- `docs/v1/implementation-slices/plans/P3-11-home-dashboard-analytics-source.md`
- `docs/v1/implementation-slices/plans/P3-12-home-dashboard-analytics-ui.md`
- `src/domain/practice/types.ts`
- `src/domain/practice/rules.ts`
- `src/services/practice-session/types.ts`
- `src/services/practice-session/service.ts`
- `src/hooks/use-practice-session-dashboard.ts`
- `src/components/home/home-dashboard.tsx`
- `tests/unit/practice-session-duration-rules.test.ts`
- `tests/unit/practice-session-service.test.ts`
- `tests/unit/practice-session-repository.test.ts`
- `tests/unit/home-dashboard.test.tsx`
- `tests/e2e/app-shell-home.spec.ts`

## Refined Goal

P3-13 adds honest local practice streaks to Home. It should derive streak state from existing persisted practice sessions using the existing browser-local-day policy, expose the data through the existing `PracticeSessionService` and Home hook, and render a compact Home panel that helps the player see whether they practiced today and how many consecutive local days they have practiced.

This is a small source-plus-UI integration slice. It must not create streak persistence, goals, notifications, charts, scoring, or a separate analytics subsystem.

## Refined Scope

P3-13 owns:

- A pure streak selector derived from `PracticeSession.startedAt` local days:
  - current streak length in days
  - longest streak length in days
  - practiced-today boolean
  - last practiced local-day key or `null`
  - generated timestamp
  - empty-state flag
- A read-only `PracticeSessionService` method, likely `getHomePracticeStreaks()`, that reads `repository.listSessions()` and delegates to the pure selector.
- Home hook state for streak data, loading, and contained error status.
- A compact `Practice Streaks` Home panel, placed near the existing Today Summary / Practice Analytics / Recent Activity area without obscuring primary practice entries.
- Focused unit tests for local-day streak rules, service read/failure semantics, hook/component rendering, and responsive E2E persistence.

## Out Of Scope

P3-13 must not implement:

- Goal creation, goal streak goals, goal storage, goal completion changes, or goal UI. P3-14/P3-15 own goal management.
- Notification/reminder behavior, daily prompts, calendar integration, badges, achievements, social sharing, or gamification beyond displaying streak counts.
- Weekly/monthly charts, heatmaps, trend windows, predictions, quality metrics, scoring, mistake detection, or AI recommendations.
- New tables, migrations, localStorage keys, cached streak rows, background jobs, or backfill tasks.
- New recent activity, continue-practice, analytics, recording, waveform, audio decode, route, or navigation behavior.
- Direct IndexedDB reads from Home UI/hook code.
- Package, lockfile, config, or broad style refactors.
- `docs/v1/status.json` edits.

## Data Contract

Add a small type near the existing Home practice types, with final names adjusted to local style:

```ts
export type HomePracticeStreaks = {
  generatedAt: string;
  currentStreakDays: number;
  longestStreakDays: number;
  practicedToday: boolean;
  lastPracticedLocalDay: string | null;
  emptyState: {
    hasPracticeHistory: boolean;
  };
};
```

Selector input should be explicit and testable:

```ts
type HomePracticeStreaksInput = {
  sessions: readonly PracticeSession[];
  generatedAt: string;
  now?: Date;
};
```

Rules:

- Use the existing v0 browser-local-day policy. Prefer adding a small helper next to `isBrowserLocalDay(...)` in `src/domain/practice/rules.ts`; do not introduce UTC-day streaks.
- The `YYYY-MM-DD` local-day key must be derived from browser local calendar fields such as `date.getFullYear()`, `date.getMonth() + 1`, and `date.getDate()`.
- Do not use `toISOString().slice(0, 10)`, UTC day keys, or UTC calendar fields for streak keys.
- Do not use fixed `86_400_000` millisecond differences to decide whether two local days are consecutive.
- Previous and next local days must be computed through local calendar date arithmetic, such as constructing a local `Date(year, monthIndex, date +/- 1)`, so DST and offset transitions do not break streak adjacency.
- A practiced day is any browser-local date with at least one valid `PracticeSession.startedAt`.
- Multiple sessions on the same local day count as one practiced day.
- Invalid `startedAt` values are ignored for streak-day collection.
- `practicedToday` is true when at least one practiced local day matches `now` by the same policy as `isBrowserLocalDay(...)`.
- `currentStreakDays` counts consecutive practiced local days ending today when `practicedToday` is true; otherwise it counts consecutive practiced local days ending yesterday. This keeps a player with a streak through yesterday from seeing zero before practicing today.
- `longestStreakDays` is the longest consecutive run among all valid practiced local days.
- `lastPracticedLocalDay` should use a stable `YYYY-MM-DD` local-day key from the browser-local date interpretation, or `null` when there is no valid history.
- Do not use session duration, recording count, sheet validity, segment validity, or recording metadata to decide whether a day counts. Streaks are based on local practice-session occurrence only.
- Selector output must be order-independent. Sorting or set operations must make unordered session input produce the same `currentStreakDays`, `longestStreakDays`, and `lastPracticedLocalDay` as sorted input.

## Service Clock And Refresh Semantics

- `getHomePracticeStreaks()` must capture exactly one `Date` for a single read.
- The service should use the existing `now` dependency in `createPracticeSessionService(...)`, or a similarly small clock provider seam if the implementation shape requires it.
- The captured `Date` must be used for both selector `now` and `generatedAt`, so those values cannot diverge inside one refresh.
- The pure selector should receive `now` explicitly and must not call `new Date()` internally multiple times.
- Unit tests must use a fixed clock through the service/selector seam, not the real current date.
- Home hook integration must use the same refresh ordering guard introduced by P3-12/#44 for analytics. Streak reads must join the existing guarded refresh flow, not a separate unguarded subscription path.
- Older refresh success must not overwrite newer streak or dashboard state.
- Older refresh failure must not overwrite newer streak or dashboard state with stale errors.
- Loading, error, and value updates for streaks must obey the latest refresh token/sequence in the same way as the existing dashboard reads.

## Failure And Empty States

- Empty local history is not an error, but it can only come from a successful repository read with zero valid practiced local days. Return zero streak counts, `practicedToday: false`, `lastPracticedLocalDay: null`, and `hasPracticeHistory: false`.
- Repository read failure rejects the service method and is contained by the Home hook to the streak panel.
- Repository read failure must not render as `No local practice streak yet.` or as a zero-only empty state.
- First-load repository failure should show a contained streak error state while keeping Quick Metronome, Continue Practice, Today Summary, Practice Analytics, Recent Activity, and utility links usable.
- Streak read failure must not hide or fail Quick Metronome, Continue Practice, Today Summary, Practice Analytics, or Recent Activity.
- If a previous streak value exists and a later subscription refresh fails, keep the previous value visible and show the contained error state, matching P3-12 analytics behavior.
- `indexedDB` unavailable is a separate unavailable/idle browser state, not true zero history. The hook should not call `getHomePracticeStreaks()` when `indexedDB` is unavailable; the UI may show a safe unavailable/empty fallback, but tests must not treat it as evidence of successful zero-history derivation.
- Invalid session timestamps are ignored by the selector. If all rows are invalid, render the same zero/empty state as no history.

## UI Behavior

Add one compact `Practice Streaks` region to Home:

- Use existing `Card`, `CardHeader`, `CardTitle`, `CardContent`, Tailwind tokens, and `lucide-react` icons.
- Keep it dense and calm, consistent with `docs/v1/ui-design.md` and `docs/v0/design-style-guide.md`.
- Suggested placement: in the right-column stack near `Today Practice Summary` and `Practice Analytics`, before `Recent Activity` if it remains visually compact.
- Display visible labels such as `Current streak`, `Longest streak`, and a short today status.
- Use simple text, not a chart or heatmap.
- Empty copy should be honest, for example `No local practice streak yet.`
- Error copy should be distinct from empty copy, for example `Practice streaks could not be loaded.`
- If `practicedToday` is false but `currentStreakDays > 0`, use restrained copy that indicates the streak is waiting on today's practice, without creating reminder or notification behavior.
- Do not add in-app instructions, keyboard shortcuts, decorative illustrations, gradient effects, or marketing-style hero content.
- Panel must have `role="region"` and an accessible name such as `Practice Streaks`.
- Values and labels must wrap without clipping at narrow mobile width.

## Likely Files

Expected production files:

- `src/domain/practice/types.ts`
  - Add `HomePracticeStreaks` type.
- `src/domain/practice/rules.ts`
  - Add pure local-day key/streak selector logic near existing today/local-day rules.
- `src/services/practice-session/types.ts`
  - Add `getHomePracticeStreaks: () => Promise<HomePracticeStreaks>`.
- `src/services/practice-session/service.ts`
  - Add a thin read-only method that captures one `now()` value, reads sessions, and delegates to the selector with that same date for `now` and `generatedAt`.
- `src/hooks/use-practice-session-dashboard.ts`
  - Add streak data/status/error state and service read to the existing guarded refresh flow.
- `src/components/home/home-dashboard.tsx`
  - Add `PracticeStreaksPanel`, empty fallback data, and `HomeDashboardData` fields.

Expected tests:

- `tests/unit/practice-session-duration-rules.test.ts`
  - Add pure streak selector tests.
- `tests/unit/practice-session-service.test.ts`
  - Add service method read-only and failure tests.
- `tests/unit/practice-session-repository.test.ts`
  - Add reload/persistence evidence if not already covered by service tests.
- `tests/unit/home-dashboard.test.tsx`
  - Add component/hook rendering, loading, error, and stale-refresh coverage.
- `tests/e2e/app-shell-home.spec.ts`
  - Add persisted streak scenario across reload and responsive widths.

Files to avoid unless a blocking issue is found:

- Dexie schema/migration files
- Recording artifact storage, waveform, media, or cleanup files
- Goal storage/UI files
- Continue Practice and Recent Activity selectors
- Route/navigation files
- `package.json`, lockfiles, config files
- `docs/v1/status.json`

## Reuse Constraints

The coding agent must:

- Reuse `PracticeSessionService` as the Home read boundary.
- Reuse `repository.listSessions()` and existing repository validation/parsing behavior.
- Reuse the existing browser-local-day semantics from `isBrowserLocalDay(...)`; do not copy a conflicting UTC implementation.
- Follow the contained-read pattern and latest-refresh guard already used for Continue Practice, Recent Activity, and Practice Analytics in `usePracticeSessionDashboard()`.
- Follow the existing Home card and metric tile patterns in `home-dashboard.tsx`; do not create a new design system or nested cards.
- Keep tests close to existing unit/E2E style and fixtures.

The coding agent must not:

- Read IndexedDB directly from Home components or hooks.
- Create `src/domain/analytics/*`, `src/domain/streaks/*`, or a broad streak subsystem unless review explicitly approves a later split.
- Count recordings or metadata-only rows as practiced days.
- Infer streaks from `updatedAt`, `durationMs`, `recordingCount`, sheets, segments, or goal evaluations.
- Let an older refresh success or failure overwrite newer dashboard/streak state.
- Weaken existing Home analytics, recent activity, or continue-practice assertions while adding streak tests.

## Unit Test Matrix

Pure selector tests should cover:

1. Empty sessions return zero current/longest streaks and no last practiced day.
2. Multiple sessions on the same local day count once.
3. Practiced today yields a current streak ending today.
4. No practice today but practice yesterday keeps the current streak through yesterday.
5. A gap before yesterday yields `currentStreakDays: 0` when today and yesterday are both unpracticed.
6. Longest streak is preserved even when current streak is shorter.
7. Invalid `startedAt` values are ignored.
8. Quick, sheet, and segment-linked sessions all count equally by `startedAt`.
9. Session duration and recording count do not change streak counts.
10. Local-day boundary behavior is covered with dates near midnight using `now` injection and the existing browser-local policy.
11. Unordered session input still computes correct `currentStreakDays`, `longestStreakDays`, and `lastPracticedLocalDay`.
12. Local-day keys are derived from local calendar fields, not `toISOString().slice(0, 10)` or UTC fields.
13. Consecutive days are computed with local calendar date arithmetic, not `86_400_000` millisecond differences.
14. If the repo test environment supports it, include DST or offset-transition risk coverage. If it does not, document that limitation in the implementation notes and still cover near-midnight local-day boundaries.

Service tests should cover:

1. `getHomePracticeStreaks()` reads `repository.listSessions()` and returns selector output with an injected fixed clock.
2. Repository read failure rejects the method.
3. The method performs no writes: no `saveSession`, `deleteSession`, `clear`, recording repository write, sheet gateway update, or segment lookup calls.
4. Recording metadata repository is not read for streaks.
5. Invalid persisted rows already filtered by repository boundaries remain outside selector responsibility.
6. A single captured `Date` drives both `generatedAt` and selector `now`; the selector does not call the real clock internally.

Home unit tests should cover:

1. Injected empty dashboard data renders `Practice Streaks` with honest empty copy and zero values.
2. Injected populated data renders current streak, longest streak, and today status.
3. Loading state is contained to the streak panel.
4. First-load error state is contained to the streak panel, uses error copy rather than empty copy, and does not hide existing Home regions.
5. Live mount calls `getHomePracticeStreaks()` when `indexedDB` exists.
6. `indexedDB` unavailable does not call `getHomePracticeStreaks()` and keeps Home usable without treating unavailable storage as a successful zero-history read.
7. Previous streak data remains visible when a subscription refresh streak read fails, with an error indicator.
8. Overlapping refreshes ignore stale older streak read successes, matching the analytics refresh guard.
9. Overlapping refreshes ignore stale older streak read failures, matching the analytics refresh guard.
10. Existing Today Summary, Practice Analytics, Continue Practice, Recent Activity, and primary route links still render.

Repository/reload test should cover:

1. Persist sessions on consecutive local days, reset/recreate the repository/service boundary, and derive the same streak result.
2. Clear persisted sessions and verify the streak result returns to zero/empty.

## Browser E2E Plan

Extend `tests/e2e/app-shell-home.spec.ts` with a focused persisted Home streak scenario:

1. Clear `PRACTICE_SESSION_DB_NAME` and any storage already cleared by the Home tests.
2. Seed real practice-session rows only; do not seed synthetic streak rows.
3. Include at least:
   - two sessions on one local day to prove deduplication
   - one consecutive previous-day session
   - one older session separated by a gap for longest/current coverage if stable with the test clock
4. Navigate to Home and assert the `Practice Streaks` region is visible.
5. Assert current and longest streak values from the seeded sessions.
6. Reload Home and assert the values persist.
7. Check desktop width around 1280 px, tablet width around 1024 px, and mobile width around 390 px.
8. Run existing `expectNoHorizontalOverflow(page)` checks.
9. Keep console/page errors empty.

Because streak semantics depend on browser-local `now`, prefer one of these stable approaches:

- Seed relative to the browser's current local date from `page.evaluate(() => new Date())`, then create ISO timestamps for today/yesterday/older days inside the browser context.
- Or inject a deterministic app clock only if an existing test helper already supports it.

Do not hard-code historical dates that will make the current streak decay when the test runs later.

E2E date generation must preserve browser-local semantics:

- Build seeded timestamps from local calendar components in the browser context.
- Do not derive day keys with `toISOString().slice(0, 10)`.
- Do not subtract fixed `86_400_000` millisecond chunks to create yesterday or older consecutive local days.
- Prefer local `Date(year, monthIndex, date +/- n, hour, minute)` construction so DST or offset transitions do not silently change the intended local day.

## Acceptance Criteria

P3-13 is complete when:

1. Home has a `Practice Streaks` region backed by persisted local practice sessions.
2. Streak calculations use the existing browser-local-day policy, local calendar day keys, and local calendar date arithmetic; they do not use UTC day keys, `toISOString().slice(0, 10)`, or fixed millisecond day differences.
3. Multiple sessions on the same local day count as one practiced day.
4. Unordered session input produces correct current streak, longest streak, and last practiced local day.
5. Current streak, longest streak, practiced-today status, and last practiced local day are derived without new storage.
6. One captured service clock value drives both `generatedAt` and selector `now` for each streak read.
7. Empty history renders honest zero/empty streak state only after a successful read with no valid practiced local days.
8. First-load read failure renders a contained error state, not an empty streak state.
9. Refresh failure with previous data preserves the previous streak value and shows an error indicator.
10. Streak loading, success, and failure updates obey the latest refresh token/sequence and cannot be overwritten by older refreshes.
11. The implementation does not change routes, status files, schemas, packages, goal management, analytics totals, recent activity selection, continue-practice behavior, or recording/media behavior.
12. Unit tests cover selector rules, service read-only behavior, fixed clock injection, Home rendering states, unavailable IndexedDB behavior, and guarded refresh success/failure behavior.
13. Browser E2E covers persisted streak display across reload and responsive desktop/tablet/mobile layout without horizontal overflow.

## Verification Commands

Use the repo-local PowerShell wrapper:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/practice-session-duration-rules.test.ts tests/unit/practice-session-service.test.ts tests/unit/practice-session-repository.test.ts tests/unit/home-dashboard.test.tsx
& .\scripts\npm-local.ps1 --% run test:e2e -- tests/e2e/app-shell-home.spec.ts
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint -- src/domain/practice/types.ts src/domain/practice/rules.ts src/services/practice-session/types.ts src/services/practice-session/service.ts src/hooks/use-practice-session-dashboard.ts src/components/home/home-dashboard.tsx tests/unit/practice-session-duration-rules.test.ts tests/unit/practice-session-service.test.ts tests/unit/practice-session-repository.test.ts tests/unit/home-dashboard.test.tsx tests/e2e/app-shell-home.spec.ts
git diff --check
```

If the implementation avoids repository-specific changes, the coding agent may omit `tests/unit/practice-session-repository.test.ts` from the first targeted run, but verification should explain why reload/persistence evidence is still covered.

## Agent Assignments

Planning:

- Model: `gpt-5.5`
- Effort: medium
- Speed: standard

Coding:

- Model: `gpt-5.5`
- Effort: high
- Speed: standard
- Reason: Tier C UI integration with browser E2E and local-day boundary risk.

Review:

- Model: `gpt-5.4`
- Effort: medium
- Speed: standard
- Review scope: planned slice, changed files, Home UI/hook/service/domain boundaries, local-day semantics, and test coverage.

Verification:

- Model: `gpt-5.4-mini`
- Effort: high
- Speed: standard
- Verification scope: commands above plus targeted evidence for reload and responsive E2E.

## Status And PR Gates

- This plan alone does not move `docs/v1/status.json`.
- Web ChatGPT plan review returned `PASS_WITH_CHANGES`; this revision incorporates the required changes and implementation may proceed after the normal delta review confirms those changes are present.
- After plan review, scheduler may move P3-13 through the normal lifecycle outside this coding slice.
- Coding must happen in a fresh coding agent using this plan.
- Review must be performed by a fresh review agent against this plan and changed files.
- Verification must be performed by a fresh verification agent and must report PASS/FAIL with command evidence.
- Open a small PR for P3-13 only; do not bundle P3-14/P3-15 goal work or unrelated Home refactors.
- If review or verification finds unclear local-day semantics, missing persistence evidence, or UI scope creep, return to planning before continuing.

## Coding Handoff

Coding should read only:

- `docs/v1/START-HERE.md`
- this plan
- `docs/v1/implementation-slices/03-sessions-continue-practice.md`
- `docs/v1/01-app-shell-home.md`
- `docs/v1/ui-design.md`
- `docs/v0/design-style-guide.md`
- current `src/domain/practice/types.ts`
- current `src/domain/practice/rules.ts`
- current `src/services/practice-session/types.ts`
- current `src/services/practice-session/service.ts`
- current `src/hooks/use-practice-session-dashboard.ts`
- current `src/components/home/home-dashboard.tsx`
- current `tests/unit/practice-session-duration-rules.test.ts`
- current `tests/unit/practice-session-service.test.ts`
- current `tests/unit/practice-session-repository.test.ts`
- current `tests/unit/home-dashboard.test.tsx`
- current `tests/e2e/app-shell-home.spec.ts`

Keep the patch small. If implementation appears to require new storage, goal definitions, notifications, trend charts, or a larger Home layout redesign, stop and return to planning with the exact blocker.

## Review Checklist

Review should explicitly check:

- Streaks are based only on valid `PracticeSession.startedAt` local days.
- Browser-local-day semantics match existing `isBrowserLocalDay(...)` behavior.
- Current streak handles both practiced-today and practiced-through-yesterday states.
- Longest streak handles gaps and duplicate sessions per day.
- Home UI does not recalculate streaks from raw sessions.
- Home hook contains streak read failures and preserves previous data on refresh failure.
- No direct IndexedDB access appears in Home UI/hook code.
- No new storage, schema, migration, package, route, goal, notification, scoring, or media scope appears.
- Tests do not hard-code dates in a way that will rot as the calendar advances.
- Existing P3-11/P3-12 analytics behavior and tests are not weakened.

## Deferred Work

- P3-14/P3-15 own goal storage, streak-like goals, goal progress UI, and goal management.
- P3-16 owns command palette.
- P3-17 owns session comparison.
- Weekly/monthly heatmaps, reminders, achievements, scoring, prediction, mistake detection, cloud analytics, sync, and notification behavior remain deferred outside P3-13.
