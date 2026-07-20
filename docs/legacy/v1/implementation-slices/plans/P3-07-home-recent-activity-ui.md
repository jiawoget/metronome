# P3-07 Home Recent Activity UI Plan

## Slice

- Slice id: `P3-07 home-recent-activity-ui`
- Pack: `pack-3-sessions-continue-practice`
- Current scheduler status: `not_started`
- Product feature: `home.recent-activity-timeline`
- Planning model: `gpt-5.5`, medium effort, standard speed
- Coding/review/verification tier: Tier C - User-Facing UI With Browser E2E, with the user-requested coding override listed below

## External Review Notes

- Web ChatGPT metronome project plan review: `PASS_WITH_CHANGES`.
- Required changes to apply before implementation:
  1. Lock Recent Activity rows to non-interactive display semantics. Rows must not become anchors, buttons, click targets, keyboard-focusable pseudo-actions, or quick/sheet/segment resume links.
  2. Strengthen browser E2E stale/disabled row coverage so it cannot be silently skipped. If existing helpers genuinely cannot seed a stale row without product-only hooks, the implementation report must say why and unit/component coverage must cover all stale target states.
  3. Add an explicit accessibility/display contract: status meanings must be accessible text, not color/icon-only; decorative icons should be `aria-hidden`; long labels/metadata/status text must remain readable without relying only on `title`.
- Web ChatGPT metronome project delta review: `PASS`.
- Remaining required changes: none.
- Implementation is allowed after the applied plan edits.

## Refined Scope

Render a compact recent activity timeline on Home using the already verified P3-06 read-only source/service boundary.

P3-07 owns:

- Extending the Home dashboard data hook/state to load `browserPracticeSessionService.getHomeRecentActivity()`.
- Adding a compact `Recent Activity` Home panel that renders P3-06 `HomeRecentActivityItem` rows.
- Displaying honest empty, loading, error, valid target, no-target, lookup-failed, missing-sheet, and missing-segment states.
- Preserving Home as a dense practice dashboard with primary practice entries, Today Summary, recent utility cards, and global status still visible.
- Responsive layout checks for desktop, tablet/iPad landscape, narrow mobile, and resize transitions.
- Focused unit/component, integration, and browser E2E coverage for the visible Home timeline.

The UI should be display-first. Rows may visually distinguish normal, disabled, and stale display states, but this slice must not create Continue Practice targets or route users into quick, sheet, or segment contexts.

Recent Activity rows are non-interactive display rows in P3-07. They must not be anchors or buttons, must not have row click handlers, must not become keyboard-focusable pseudo-actions, and must not expose quick, sheet, or segment resume navigation. Existing top-level Home cards and links may remain unchanged, but activity rows themselves are read-only.

## Explicit Out Of Scope

- P3-08/P3-09 Continue Practice target construction, target validation beyond reading P3-06 `targetState`, recommendation ranking, row click navigation, route generation, or segment resume routing.
- Analytics, goals, streaks, command palette, practice plans, scoring, quality metrics, mistake detection, or dashboard aggregate charts.
- Schema changes, Dexie migrations, new object stores/indexes, backfill, read-time writeback, cleanup jobs, or historical session/recording rewrites.
- Durable session event replay, event-derived activity rows, new event capture, or event migrations.
- Recording media/artifact/blob reads, waveform generation, audio decode, MediaRecorder changes, or artifact availability checks.
- Changing P3-06 selector semantics, source ordering, deduplication, target-state mapping, duration rules, or reload behavior except for type-safe display consumption.
- App shell navigation changes, sidebar/bottom-nav behavior changes, package/dependency changes, or edits to `docs/v1/status.json`.

If implementation appears to need any out-of-scope behavior, stop and return to planning instead of folding it into this UI slice.

## Likely Files And Areas

Primary implementation files:

- `src/hooks/use-practice-session-dashboard.ts`
  - Add `recentActivity: HomeRecentActivityResult` or a small Home-facing state shape derived from it.
  - Add loading/error state if the hook needs to expose the async lifecycle for the panel.
  - Load summary, current continue target, recent session, and recent activity in the same refresh cycle or a clearly contained parallel read.
  - Keep `subscribe()` refresh behavior so new sessions/recordings update the Home timeline.
- `src/components/home/home-dashboard.tsx`
  - Add recent activity data to `HomeDashboardData` and `emptyHomeDashboardData`.
  - Render a compact timeline/panel in the existing dashboard grid.
  - Reuse existing `Card`, `CardHeader`, `CardTitle`, `CardContent`, `Button`, `Link`, and `lucide-react` icon conventions.
  - Keep text compact and avoid nested cards. Use rows, dividers, badges, icons, and muted metadata rather than large promotional cards.
- `src/domain/practice/recent-activity.ts`
  - Read only for type imports and target-state semantics. Do not change unless the UI exposes a type-only export gap.
- `src/services/practice-session/types.ts`
  - Read only for `getHomeRecentActivity` service contract.

Focused tests:

- `tests/unit/home-dashboard.test.tsx`
  - Add component-level rendering tests for empty, loading/error where applicable, populated rows, valid target states, stale/disabled states, compact metadata, and no fake history.
- `tests/e2e/app-shell-home.spec.ts`
  - Extend or add focused Home coverage for the recent activity panel on desktop/tablet/mobile.
  - Seed local data through existing UI/service/test helpers where practical; do not create ad hoc production-only hooks.
- Existing P3-06 tests such as `tests/unit/home-recent-activity-source.test.ts`, `tests/unit/practice-session-service.test.ts`, and `tests/unit/practice-session-repository.test.ts`
  - Should remain unchanged unless type changes require fixture updates. Do not weaken source assertions.

Areas to inspect/reuse before coding:

- Existing Home grid/card spacing, responsive classes, and route link styling in `home-dashboard.tsx`.
- P3-06 `HomeRecentActivityItem`, `targetState`, `metadata`, `disabledReason`, `label`, `occurredAt`, and `kind` fields.
- Existing hook refresh/subscription pattern in `use-practice-session-dashboard.ts`.
- Existing e2e storage/setup helpers in `tests/e2e/**` before adding any new helper.
- Existing `lucide-react` icons already used on Home; add only obvious icons such as history/clock/file/music/mic if helpful.

## UI Design Requirements

- Follow `docs/v1/ui-design.md` and `docs/v0/design-style-guide.md`.
- Home remains a dense practice dashboard, not a landing page.
- Keep the warm off-white background, white/light surfaces, muted secondary text, thin dividers, compact typography, restrained radius, and subtle shadows.
- Yellow remains the primary practice accent. Purple remains sparse and should not dominate the activity panel.
- Do not use hero sections, decorative illustrations, gradient blobs, oversized explanatory text, or fake populated history.
- Do not nest cards inside cards. The recent activity timeline should be one Home panel with compact repeated rows.
- Use stable row heights or stable row spacing so loading, empty, valid, and stale states do not resize surrounding layout awkwardly.
- Ensure all labels, metadata, and disabled reasons wrap cleanly on mobile without clipping or overlapping.
- Status, stale, disabled, and error meanings must be present as accessible text, not color/icon-only. Decorative icons should be `aria-hidden`. Non-interactive rows must not become keyboard-focusable. Long labels, metadata, and status text must remain readable without relying only on `title` attributes.

## Display Semantics

Panel:

- Title: `Recent Activity` or equivalent concise Home label.
- Show at most the P3-06 default limit unless the source already returns a different limit.
- Render rows newest-first exactly as returned by P3-06; do not re-sort or locally deduplicate in the component.
- Each row should show:
  - a small kind icon or marker;
  - `label`;
  - compact metadata from `item.metadata`;
  - a short relative or absolute timestamp from `occurredAt` when valid;
  - a small status badge/text for disabled/stale target states.
- Metadata can be joined visually as chips or inline muted text. Do not invent scoring, quality, streak, or analytics claims.

Empty:

- When the read succeeds and `items` is empty, show an honest empty state such as no local practice activity yet.
- Keep Quick Metronome and Sheet Library entry points visible elsewhere on Home; do not turn the empty activity panel into a large onboarding block.
- Do not show placeholder/fake activity rows.

Loading:

- If the hook exposes loading, show a small stable skeleton or muted loading row inside the panel.
- Loading must not hide primary Home entries or Today Summary.
- Loading text should be brief and accessible.

Error:

- If `getHomeRecentActivity()` rejects, contain the error to the recent activity panel.
- Show a compact failure message and preserve the rest of Home.
- Do not crash Home, clear existing summary data, or label lookup failures as global read failure when P3-06 returned per-row `lookup-failed` states successfully.

Valid target:

- `targetState: "valid"` rows are normal active-looking timeline rows.
- They must remain non-interactive display rows. Do not navigate to sheet/segment practice, do not link to top-level destinations from the row, and do not present valid rows as Continue Practice targets.

Quick target:

- `targetState: "quick"` rows represent quick practice.
- They may show a Quick Metronome icon/label and can be visually normal.
- Do not mix sheet/segment ids into quick rows.
- They must remain non-interactive display rows and must not link to `/quick-metronome` from the row.

No target:

- `targetState: "no-target"` rows remain visible but disabled/stale.
- Show the P3-06 `disabledReason` or concise equivalent.
- Do not relabel these as quick activity, and do not route them.

Lookup failed:

- `targetState: "lookup-failed"` rows remain visible with a subdued warning/error badge.
- Message should imply the local target could not be checked, not that the activity is invalid or deleted.
- This is per-row stale state, not a whole-panel error.

Missing sheet:

- `targetState: "missing-sheet"` rows remain visible and disabled/stale.
- Use the label returned by P3-06, such as `Deleted sheet` or snapshot/fallback label.
- Do not drop the row or navigate to Sheet Practice.

Missing segment:

- `targetState: "missing-segment"` rows remain visible and disabled/stale.
- Preserve historical segment label/range metadata from P3-06.
- Do not navigate to a fallback sheet-only target in this slice.

Invalid timestamps:

- P3-06 exposes `sortTimestamp: null` for invalid timestamps and sorts those rows last.
- UI should avoid rendering `Invalid Date`; show no timestamp or a neutral `Unknown time` label.

## Responsive Expectations

Desktop width:

- Keep the existing two-column top grid and three-column utility section readable.
- Recent Activity should fit as a compact dashboard panel without pushing primary entries below the fold unnecessarily.
- A likely layout is to place the panel near Today Summary or below the primary entries using existing grid patterns.

Tablet/iPad landscape:

- Sidebar remains visible.
- Recent Activity rows wrap metadata without clipping.
- Row actions/status badges should not squeeze labels into unreadable fragments.

Narrow mobile:

- Bottom navigation remains visible and unobstructed.
- Timeline rows stack vertically with label, metadata, and status readable.
- No horizontal scrolling, clipped badges, overlapping icons, or text overflowing buttons/cards.
- Primary Quick Metronome and Continue Practice cards remain easy to reach above or near the activity panel.

Resize transitions:

- Resizing between desktop, tablet, and mobile must not leave overlapping rows, clipped labels, hidden navigation, or stale skeleton dimensions.

## Boundary Conditions

- Empty P3-06 result renders empty activity panel with no fake rows.
- Hook first render in browser-safe empty state does not cause hydration errors.
- `indexedDB` unavailable path keeps Home usable and does not throw.
- Service read rejection is contained to the Recent Activity panel.
- Per-row `lookup-failed` is displayed as row state, not as a panel read error.
- Rows with `disabledReason` are visibly disabled/stale but still readable.
- Rows with `metadata: []` still render a useful label/kind/timestamp without blank separators.
- Rows with long sheet or segment names wrap cleanly.
- Rows with invalid timestamp do not render `Invalid Date`.
- Rows with `durationMs: 0` keep the source-provided metadata such as `0s`.
- Rows with missing sheet/segment remain visible.
- Existing Home summary, primary links, route shells, diagnostics panel behavior, sidebar, bottom nav, and global status text do not regress.
- Existing P3-06 source, P3-04 history grouping, P3-05 duration, and Continue Practice service tests do not regress.

## Acceptance Criteria

1. Home renders a compact Recent Activity timeline sourced from `getHomeRecentActivity()` through the existing browser practice-session service boundary.
2. Empty local activity renders an honest compact empty state with no fake rows.
3. Loading and read-error states, if exposed by the hook, are contained to the Recent Activity panel and do not break the rest of Home.
4. Valid and quick rows render as normal readable activity rows with label, metadata, kind/timestamp context, and no invented analytics/scoring copy.
5. `no-target`, `lookup-failed`, `missing-sheet`, and `missing-segment` rows remain visible as disabled/stale rows with clear compact status text.
6. The UI does not construct Continue Practice targets, does not navigate to quick/sheet/segment contexts, does not add activity-row anchors/buttons/click handlers, and does not silently turn stale segment rows into sheet-only links.
7. Home remains a dense practice dashboard with Primary Entries, Today Summary, utility cards, and global status still visible and usable.
8. Desktop, tablet/iPad landscape, narrow mobile, and resize checks show no clipped text, overlap, horizontal scrolling, hidden primary actions, or broken navigation.
9. Status/stale/error meanings are exposed as accessible text rather than color or icon only; decorative icons are `aria-hidden`; rows are not keyboard-focusable pseudo-actions; long labels/metadata/status text remain readable without title-only disclosure.
10. No schema/migration/backfill/read-time writeback/event replay/media/artifact/package/status-file changes are included.
11. Existing P3-06 source/service/reload tests and existing Home/app-shell tests continue to pass or are updated only for the new visible UI contract.

## Test Coverage Plan

Unit/component tests:

- `HomeDashboard` with default/empty data renders the Recent Activity panel empty state without fake history.
- `HomeDashboard` with populated `recentActivity.items` renders quick, sheet, sheet recording, segment session, and segment recording rows.
- Valid/quick rows show normal row treatment and compact metadata.
- `no-target`, `lookup-failed`, `missing-sheet`, and `missing-segment` rows show disabled/stale status text and do not render quick/sheet/segment navigation links.
- Activity rows are not anchors, buttons, click targets, or keyboard-focusable pseudo-actions.
- Status/stale/error meanings are present in accessible text, not color/icon-only, and decorative icons are `aria-hidden`.
- Invalid timestamp row does not render `Invalid Date`.
- Long labels and metadata are present in accessible text and not dependent on title-only content.
- Existing route links still point to `/quick-metronome`, `/sheet-library`, `/recordings`, and `/settings`.
- If the hook exposes explicit loading/error props or state for testability, cover loading and service rejection display.

Integration tests:

- Hook-level or component integration test mocks `browserPracticeSessionService.getHomeRecentActivity()` and confirms Home refresh includes recent activity.
- Service rejection for `getHomeRecentActivity()` is contained and does not prevent summary/continue target display if those reads succeed.
- Subscription callback refreshes the recent activity data after a service change notification.
- No repository write methods are invoked by the Home UI path.

Browser E2E:

- Extend `tests/e2e/app-shell-home.spec.ts` or add a focused Home recent activity spec.
- Verify empty-state Home at `/` on desktop and mobile still shows primary entries, Today Summary, Recent Activity empty state, sidebar/bottom-nav behavior, diagnostics behavior, and no console errors.
- Seed enough local practice/session/recording data through existing app flows or established e2e helpers to show at least:
  - a quick activity row;
  - a sheet or segment activity row;
  - a disabled/stale activity row through existing app flows or established e2e storage helpers.
- If existing app flows/helpers genuinely cannot produce a disabled/stale row without adding product-only hooks, the implementation report must explicitly say why, and unit/component coverage must cover all stale states.
- Verify the recent activity panel remains visible after reload and updates from persisted local data.
- Verify activity rows are non-interactive display rows: no row anchors/buttons/click navigation, no keyboard-focusable row pseudo-actions, and no quick/sheet/segment resume navigation from the row.
- Confirm clicking existing top-level Home links still works. Do not add assertions for row navigation into sheet/segment contexts in P3-07.

Responsive/visual checks:

- Playwright viewport checks at approximately `1280x800`, `1024x768`, and `390x844`.
- Include a resize transition from desktop to tablet to mobile on `/`.
- Assert no horizontal overflow on mobile, no clipped row text, no overlap with bottom navigation, and no missing primary practice actions.
- Capture screenshots if the verification agent needs visual evidence for the UI review gate.

Negative cases:

- Empty result.
- Service rejection/global panel error.
- Per-row `lookup-failed`.
- `no-target`.
- `missing-sheet`.
- `missing-segment`.
- Invalid timestamp.
- Long label/metadata.
- `metadata: []`.
- `indexedDB` unavailable or test environment without browser storage.

## Verification Commands

Recommended focused commands for the coding agent:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/home-dashboard.test.tsx
& .\scripts\npm-local.ps1 --% run test:e2e -- tests/e2e/app-shell-home.spec.ts
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint -- src/components/home/home-dashboard.tsx src/hooks/use-practice-session-dashboard.ts tests/unit/home-dashboard.test.tsx tests/e2e/app-shell-home.spec.ts
git diff --check
```

Recommended broader regression if time allows:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/home-recent-activity-source.test.ts tests/unit/practice-session-service.test.ts tests/unit/practice-session-repository.test.ts tests/unit/home-dashboard.test.tsx
```

Adjust file names if the implementation creates a focused Home recent-activity component or spec.

The coding agent must report:

- Changed file list.
- Confirmation that `docs/v1/status.json` was not changed.
- Confirmation that no schema/migration/backfill/read-time writeback/event replay/media/artifact/package changes were added.
- Confirmation that P3-08/P3-09 Continue Practice target construction/navigation remains out of scope.
- Unit/component, E2E, responsive/visual, typecheck, lint, and `git diff --check` evidence.

## Model Tier

Use Tier C with the user-requested coding-agent override:

- Coding agent: `gpt-5.5`, extra-high effort, standard speed.
- Review agent: `gpt-5.4`, medium effort, standard speed.
- Verification agent: `gpt-5.4-mini`, high effort, standard speed.

Reason:

- This is user-facing Home UI with responsive behavior and browser E2E.
- It consumes existing local read models but must not change persistence or navigation contracts.
- It is not media/timing/waveform work and has no migration or destructive data operation.

Escalate review to `gpt-5.4`, high effort only if the implementation expands into shared hook/service behavior beyond display consumption or if browser E2E uncovers repeated responsive failures.

## Coding Handoff

- Read this plan, `docs/v1/START-HERE.md`, `docs/v1/implementation-slices/03-sessions-continue-practice.md`, `docs/v1/01-app-shell-home.md`, `docs/v1/ui-design.md`, `docs/v0/design-style-guide.md`, and `docs/v1/implementation-slices/plans/P3-06-home-recent-activity-source.md`.
- Inspect only the current Home dashboard, dashboard hook, P3-06 recent activity source/types, practice-session service type, and focused Home/app-shell tests.
- Implement a compact display component or inline panel following existing Home conventions.
- Prefer the existing `getHomeRecentActivity()` service output directly; do not rebuild source selection in React.
- Keep disabled/stale target states visible and non-navigating.
- Keep Home primary entries and summary prominent.
- Do not add dependencies or product-only test hooks.
- Do not edit `docs/v1/status.json`.

## Review Handoff

Review against this plan plus the Home and UI design contracts. Focus on:

- Scope creep into Continue Practice target construction/navigation.
- Any persistence/schema/media/event/package changes.
- Whether Home still reads as a practice dashboard rather than a landing page.
- Whether stale target states are visible, honest, and non-navigating.
- Whether Recent Activity rows are strictly non-interactive display rows, with no anchors, buttons, row click handlers, keyboard-focusable pseudo-actions, or quick/sheet/segment resume navigation.
- Responsive layout, accessibility, keyboard/focus behavior, and text wrapping.
- Whether tests cover empty/populated/stale/error/responsive cases without weakening P3-06.

## Verification Handoff

Verification should run the focused commands above and inspect the app in browser viewports. PASS requires:

- Unit/component tests for display semantics.
- Browser E2E for Home with desktop/tablet/mobile coverage and no console errors.
- Typecheck, lint for changed files, and `git diff --check`.
- Visual confirmation that primary Home actions, Today Summary, Recent Activity, utility entries, sidebar/bottom nav, and global status remain usable.
- Explicit confirmation that row navigation into sheet/segment practice was not added.

## Deferred Work Register

| Deferred work | Future owner |
| --- | --- |
| Valid quick/sheet/segment Continue Practice target construction and stale target rejection | `P3-08 continue-practice-targets` |
| Continue Practice navigation into sheet/segment context | `P3-09 continue-practice-ui-navigation` |
| Goal completion, dashboard analytics, streaks, and goal UI | `P3-10` through `P3-15` |
| Command palette over valid local practice targets | `P3-16` |
| Event-derived activity timeline from durable event replay | Future explicit event-persistence/replay slice |
| Recording media/artifact availability checks for activity rows | Future recording review or cleanup slice if product requires it |
| Cross-device/cloud activity | v2 |

## Split Triggers

Stop and return to planning if implementation requires:

- More than roughly 250-350 lines of production code excluding focused tests.
- Any route generation or navigation into sheet/segment context.
- Any Dexie schema/index/migration/backfill/cleanup change.
- Any event replay, recording artifact/media/blob/waveform/audio decode change.
- Any package/dependency change.
- Any broad rewrite of Home, app shell navigation, practice-session service, or P3-06 recent activity source semantics.
