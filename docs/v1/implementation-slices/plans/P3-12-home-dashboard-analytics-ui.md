# P3-12 Home Dashboard Analytics UI Plan

## Slice

- Slice id: `P3-12 home-dashboard-analytics-ui`
- Source feature: `home.dashboard-analytics`
- Acceptance pack: Pack 3, Sessions / Continue Practice
- Product contract: `docs/v1/01-app-shell-home.md`
- Slice file: `docs/v1/implementation-slices/03-sessions-continue-practice.md`
- Current source dependency: `P3-11 home-dashboard-analytics-source` is verified in `docs/v1/status.json`.
- Model tier: Tier C, User-Facing UI With Browser E2E.

## Context Read

Planning was based on these repo sources:

- `docs/v1/START-HERE.md`
- `docs/v1/status.json`
- `docs/v1/implementation-slices/README.md`
- `docs/v1/implementation-slices/product-feature-map.md`
- `docs/v1/implementation-slices/03-sessions-continue-practice.md`
- `docs/v1/implementation-slices/plans/P3-11-home-dashboard-analytics-source.md`
- `docs/v1/01-app-shell-home.md`
- `docs/v1/ui-design.md`
- `docs/v0/design-style-guide.md`
- `src/hooks/use-practice-session-dashboard.ts`
- `src/components/home/home-dashboard.tsx`
- `tests/unit/home-dashboard.test.tsx`
- `tests/e2e/app-shell-home.spec.ts`

## Refined Goal

P3-12 renders dense, honest local analytics on Home using the P3-11 read-only source. It should add a compact analytics panel to the existing Home dashboard, wire that panel through the existing Home hook and `PracticeSessionService`, and verify empty, populated, error, reload, and responsive states.

This is a UI integration slice. It must not invent new analytics calculations or a second business source. It should display only values already provided by `HomeDashboardAnalyticsSource` and keep Home focused on practice entry and review.

## Refined Scope

P3-12 owns:

- Extending Home dashboard state with a read status and optional error for `HomeDashboardAnalyticsSource`.
- Reading `browserPracticeSessionService.getHomeDashboardAnalyticsSource()` from `usePracticeSessionDashboard()`.
- Rendering a `Practice Analytics` or equivalent region on Home with compact local metrics from P3-11:
  - total local practice duration
  - total local sessions
  - sheet takes
  - practiced sheets
  - segment sessions
- Rendering honest empty, loading, and error states for analytics without hiding Quick Metronome, Continue Practice, Today Summary, or Recent Activity.
- Keeping the existing Today Practice Summary visible and behavior-compatible.
- Adding focused unit tests for data-injected rendering, live hook reads, contained read failures, and formatting.
- Adding or extending focused browser E2E in `tests/e2e/app-shell-home.spec.ts` for populated persisted analytics, reload, and desktop/mobile overflow checks.

## Out Of Scope

P3-12 must not implement:

- New analytics domain helpers, repositories, storage, schema, migrations, backfill, or localStorage keys.
- A standalone `src/domain/analytics/*` subsystem.
- Weekly, monthly, trend, streak, goal, quality, scoring, prediction, or mistake-detection UI.
- Charts that imply unavailable time-series precision.
- Goal create/edit/delete, goal defaults, goal progress cards, or goal persistence. P3-14 and P3-15 own goal management.
- Practice streak UI. P3-13 owns streaks.
- Continue Practice ranking, recent activity selection, stale-target validation, route behavior, or navigation changes.
- Direct IndexedDB reads from `src/components/home/*` or `src/hooks/use-practice-session-dashboard.ts`.
- Recording artifact decode, waveform, media capture, or audio-duration recalculation.
- Package, lockfile, config, or broad style refactors.
- Status changes in `docs/v1/status.json`.

## UI Shape

Keep Home action-oriented:

- Preserve the existing header, global status, Quick Metronome primary entry, Continue Practice panel, Today Practice Summary, Recent Activity, Recent Sheets, Recent Recordings, and Settings links.
- Add one compact analytics card or region near the existing Today Summary and Recent Activity area.
- Use existing `Card`, `CardHeader`, `CardTitle`, `CardContent`, `Button`, Tailwind tokens, and `lucide-react` icons already used by Home.
- Do not nest `Card` inside another `Card`. Metric tiles inside the analytics card should be plain `div` elements with stable dimensions.
- Use restrained copy such as `Practice Analytics`, `Total practice`, `Sessions`, `Sheet takes`, `Practiced sheets`, and `Segment sessions`.
- Prefer numeric tiles and short supporting labels over charts.
- Include a small local-data scope label only if it clarifies that these are local totals, not cloud or scored analytics.

## Data Contract

Use the existing P3-11 type and service method:

```ts
HomeDashboardAnalyticsSource
PracticeSessionService.getHomeDashboardAnalyticsSource()
```

The Home hook should add fields similar to:

```ts
analytics: HomeDashboardAnalyticsSource;
analyticsStatus: PracticeSessionDashboardReadStatus;
analyticsErrorMessage: string | null;
```

The empty analytics object should be local to the Home hook/component layer and should match the P3-11 zero/empty semantics:

- `summary` all zeroes
- `totals.durationMs = 0`
- `totals.sessions = 0`
- `totals.sheetTakes = 0`
- `totals.practicedSheets = 0`
- `totals.segmentSessions = 0`
- all `emptyState` booleans false except `hasGoals`, which remains false until later goal slices provide real goals

Do not calculate totals in the UI. The UI may format durations and dates, but it must not filter sessions, count recordings, infer practiced sheets, or reinterpret segment context.

## Hook Behavior

`usePracticeSessionDashboard()` should keep existing contained-read behavior:

- Continue Practice and Recent Activity read failures remain contained to their panels.
- Analytics read failures are contained to the analytics panel.
- Existing Today Summary must continue using the existing `getTodaySummary()` read path and existing summary semantics. P3-12 must add a separate caught analytics read for the new analytics panel.
- If implementation appears to require replacing Today Summary with `analytics.summary`, stop and return to planning with the exact blocker instead of expanding this slice.
- On analytics read failure, keep the previous analytics value if one exists and set `analyticsStatus: "error"`.
- Empty local history is not an error.
- On subscription refresh, analytics should refresh along with the other Home reads.
- When `indexedDB` is unavailable, do not attempt the service read.

Implementation should consider whether a single `Promise.all` with per-read catches is still clear enough. Avoid introducing a generic read orchestration abstraction unless the existing hook becomes genuinely hard to read.

## Formatting Rules

Duration display should be honest and compact:

- `0` -> `0 min`
- positive durations under one minute -> `<1 min`
- whole minutes under one hour -> `N min`
- one hour or more -> `H hr M min` or `H hr` when minutes are zero

Do not display decimal hours or trends. Do not use formatted duration as source data for assertions or calculations.

Generated timestamps may be shown only as a small secondary detail. If shown:

- Use a deterministic UTC format matching existing Home time style, or a simple fallback such as `Unknown update time`.
- Do not use browser-relative labels such as `today` or `yesterday` in P3-12.

## Accessibility And Layout

Acceptance requires:

- The analytics panel has `role="region"` and an accessible name such as `Practice Analytics`.
- Loading and error states use contained status text.
- Metric labels and values are visible text, not only icons or title attributes.
- Long labels or future localized text wrap without horizontal overflow.
- Mobile width around 390 px, tablet width around 1024 px, and desktop width around 1280 px keep the Home layout readable.
- No text overlaps, clipped button labels, or hidden metric values.
- Do not add keyboard shortcuts or hidden interaction surfaces in this slice.

## Likely Files

Expected production files:

- `src/hooks/use-practice-session-dashboard.ts`
  - Import `HomeDashboardAnalyticsSource`.
  - Add empty analytics state.
  - Add analytics read status and contained error message.
  - Call `browserPracticeSessionService.getHomeDashboardAnalyticsSource()`.
- `src/components/home/home-dashboard.tsx`
  - Extend `HomeDashboardData`.
  - Render the analytics panel.
  - Add small local formatting helpers if needed.

Expected tests:

- `tests/unit/home-dashboard.test.tsx`
  - Add `getHomeDashboardAnalyticsSource` to service mocks.
  - Add factories for analytics source data.
  - Cover empty, populated, loading, error, formatting, and live service read behavior.
- `tests/e2e/app-shell-home.spec.ts`
  - Add or extend a focused Home analytics scenario with persisted local practice data, reload, desktop/mobile assertions, and no horizontal overflow.

Files to avoid unless a blocking issue is found:

- `src/domain/practice/rules.ts`
- `src/domain/practice/types.ts`
- `src/services/practice-session/service.ts`
- `src/services/practice-session/types.ts`
- repository, schema, migration, package, lockfile, and config files
- `docs/v1/status.json`

## Unit Test Plan

Add focused unit coverage:

1. Static injected data renders analytics totals without fake history.
2. Empty analytics shows an honest empty state and does not hide existing Home entries.
3. Populated analytics renders total duration, sessions, sheet takes, practiced sheets, and segment sessions.
4. Duration formatting handles zero, under one minute, minutes, and hours.
5. Analytics loading state is contained to the analytics panel.
6. Analytics error state is contained and preserves Today Summary, Continue Practice, and Recent Activity.
7. Live Home mount calls `getHomeDashboardAnalyticsSource()` when IndexedDB exists.
8. IndexedDB unavailable does not call `getHomeDashboardAnalyticsSource()`; the analytics panel stays in a safe empty or unavailable state and existing Home entries remain visible.
9. Live analytics read failure does not fail Continue Practice or Recent Activity panels.
10. Previous populated analytics stays visible when a later subscription refresh analytics read fails, while the contained error state is shown.
11. The old legacy single `Continue Practice` link still does not render.
12. No streak, goal-management, weekly/monthly chart, scoring, or prediction copy appears in P3-12 tests.

## Browser E2E Plan

Add or extend focused E2E in `tests/e2e/app-shell-home.spec.ts`:

1. Clear relevant local databases before the scenario.
2. Seed or create local practice activity that produces:
   - at least one quick session
   - at least one sheet session
   - at least one sheet recording metadata row
   - at least one segment-linked session
3. Navigate to Home and assert the analytics region is visible.
4. Assert populated local metrics match the seeded activity.
5. Reload Home and assert the same metrics remain visible.
6. Check desktop width around 1280 px, tablet width around 1024 px, and mobile width around 390 px.
7. Run `expectNoHorizontalOverflow(page)` for responsive states.
8. Keep console/page errors empty.

Prefer direct local IndexedDB seeding through existing or test-only storage helpers if it is simpler and more stable than media recording flows. Seed only real P3-11 source input rows, such as existing `PracticeSession` rows, `SheetRecordingMetadata` rows, and segment-linked sessions.

Do not seed synthetic analytics totals, do not create analytics-only rows, do not add analytics storage or localStorage keys, and do not add a product-only test hook or backdoor. If using existing UI flows, do not add real microphone assumptions; use existing fake microphone helpers only when a recording flow is truly required.

## Acceptance Criteria

P3-12 is complete when:

1. Home renders a compact analytics region backed by `getHomeDashboardAnalyticsSource()`.
2. The UI displays only P3-11 source fields and does not duplicate analytics counting logic.
3. Empty local history renders honest zero/empty analytics without fake data.
4. Populated local history renders total practice duration, sessions, sheet takes, practiced sheets, and segment sessions.
5. Analytics loading and read errors are contained to the analytics panel.
6. Existing Home primary entries, Continue Practice, Today Summary, Recent Activity, and utility links still render and navigate as before.
7. The implementation adds no analytics storage, schema, migration, repository, package, lockfile, or direct IndexedDB reads from Home UI/hook code.
8. No streak, goal-management, weekly/monthly trend, scoring, prediction, or cloud/sync claims appear.
9. Unit tests cover injected data, live hook read, contained failure, empty state, populated state, and formatting.
10. Browser E2E covers populated persisted analytics across reload and responsive desktop/mobile layout without horizontal overflow.

## Verification Commands

Use the repo-local PowerShell wrapper:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/home-dashboard.test.tsx
& .\scripts\npm-local.ps1 --% run test:e2e -- tests/e2e/app-shell-home.spec.ts
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint -- src/hooks/use-practice-session-dashboard.ts src/components/home/home-dashboard.tsx tests/unit/home-dashboard.test.tsx tests/e2e/app-shell-home.spec.ts
git diff --check
```

If targeted E2E finds a failure, classify it before editing:

- product regression
- E2E fixture drift
- browser/timing instability
- old storage-contract assumption

After any review-driven production change, rerun the focused unit test, targeted E2E, typecheck, lint, and `git diff --check`.

## Agent Assignments

Planning:

- Model: `gpt-5.5`
- Effort: medium
- Speed: standard

Coding:

- Model: `gpt-5.5`
- Effort: high
- Speed: standard
- Reason: Tier C UI with browser E2E and responsive layout requirements.

Review:

- Model: `gpt-5.4`
- Effort: medium
- Speed: standard
- Review scope: planned slice, changed files, Home UI, hook reads, test coverage, and product contract boundaries.

Verification:

- Model: `gpt-5.4-mini`
- Effort: high
- Speed: standard
- Verification scope: commands above plus manual evidence from the targeted E2E output.

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
- current `src/domain/practice/types.ts` as read-only reference for `HomeDashboardAnalyticsSource`
- current `src/services/practice-session/types.ts` as read-only reference for the service method contract
- current `src/services/practice-session/service.ts` as read-only reference only if the coding agent needs to confirm the P3-11 service read behavior
- current `tests/unit/home-dashboard.test.tsx`
- current `tests/e2e/app-shell-home.spec.ts`

Implementation should keep the patch small. If the coding agent believes P3-12 requires source/service/domain changes, it should stop and return to planning with the exact blocker instead of expanding scope.

## Review Checklist

Review should explicitly check:

- The analytics panel uses the P3-11 service source and does not recalculate totals from sessions or recordings in UI code.
- No new storage, schema, repository, migration, package, or direct IndexedDB access appears.
- Existing Home route links and Continue Practice behavior are not weakened.
- Existing recent activity stale-state behavior remains read-only.
- Unit tests do not weaken assertions or replace semantic checks with broad snapshots.
- E2E does not rely on real microphone hardware.
- Mobile and desktop layout remains dense, readable, and overflow-free.

## Deferred Work

- P3-13 owns practice streak source/UI.
- P3-14 and P3-15 own goal storage, goal management, and goal UI.
- P3-16 owns command palette.
- P3-17 or a later explicit slice owns session comparison or richer trend analytics.
- Weekly/monthly charts, scoring, prediction, mistake detection, cloud analytics, and sync remain out of v1 Pack 3 P3-12.
