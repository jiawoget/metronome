# P3-09 Continue Practice UI Navigation Plan

## Slice

- Slice id: `P3-09 continue-practice-ui-navigation`
- Pack: `pack-3-sessions-continue-practice`
- Current scheduler status: `not_started`
- Product feature: `home.continue-practice-recommendations`
- Planning model: `gpt-5.5`, medium effort, standard speed
- Coding/review/verification tier: Tier C - UI + browser E2E

## External Plan Review Gate

- This planning pass only writes the durable plan file.
- Leave `docs/v1/status.json` unchanged.
- Before coding, the scheduler must send this complete plan text, uncompressed, through the logged-in web ChatGPT `metronome` project review gate in Chinese and incorporate required changes.
- Do not mark this slice `ready_for_coding` until that review gate passes.

## External Review Notes

The web ChatGPT metronome project returned `PASS_WITH_CHANGES` on the initial plan review. Required changes incorporated below:

- Keep href generation out of the P3-08 identity/selector module. Put it in Home/UI navigation-local code or a clearly navigation-scoped helper, return `string | null`, and render disabled/static rows when required ids are missing.
- Narrow Sheet Practice hardening: P3-09 should default to adding or improving `initialSegmentId` focus tests. Any production change must be tiny, local, and behavior-preserving; broader selection timing, fallback UI, load semantics, or route parsing work must split to `P3-09C`.
- Add a legacy single-card regression: Home must not render the old single `Continue Practice` card/link alongside the new multi-target section.
- Tighten E2E seeded data: use only existing app flows or established E2E storage helpers/fixtures, and verify the real `getContinuePracticeTargets()` service boundary.

## Current Context

P3-08 is verified and introduced the Continue Practice target identity layer:

- `src/domain/practice/continue-practice.ts`
  - `ContinuePracticeTargetIdentity` for `quick`, `sheet`, and `segment`.
  - `ContinuePracticeTargetsResult` with `targets`, `generatedAt`, `limit`, and `rejected`.
  - `selectContinuePracticeTargets(...)` for ordering, deduplication, and stale rejection.
  - `getHomeCompatibleContinuePracticeTarget(...)` for the old single-card Home wrapper.
- `src/services/practice-session/types.ts`
  - `getContinuePracticeTargets(options?)`.
  - Existing `getContinuePracticeTarget()` compatibility method.
- `src/services/practice-session/service.ts`
  - Builds the P3-08 target list from existing recent activity.
  - Keeps the old Home-compatible target from returning segment-specific navigation.

Current Home still consumes only `continueTarget: ContinuePracticeTarget | null` from `usePracticeSessionDashboard()` and renders one `Continue Practice` link in `Primary Entries`.

Current routing already has a Sheet Practice segment query path:

- `src/domain/sheet/routes.ts`
  - `getSheetPracticeHref(sheetId)` returns `/sheet-practice/{sheetId}`.
  - `getSheetPracticeQueryHref({ sheetId, recordingId, segmentId })` returns `/sheet-practice?...`.
- `src/app/sheet-practice/page.tsx`
  - Reads `sheetId`, `recordingId`, and `segmentId` query params.
- `src/app/sheet-practice/[sheetId]/page.tsx`
  - Reads path `sheetId` and query `recordingId` / `segmentId`.
- `src/components/sheet-practice/viewer/sheet-viewer-experience.tsx`
  - Passes `returnSegmentId` through to `SheetPracticeControls`.
- `src/components/sheet-practice/segments/practice-segment-selector-panel.tsx`
  - Accepts `initialSegmentId`.
  - Selects the matching segment after segment load.
  - Shows a stale message when the saved segment is no longer available.

P3-09 should use these existing contracts instead of creating new persistence, schema, media, event replay, or route infrastructure.

## Refined Scope

Build visible Home UI for multiple valid Continue Practice recommendations and wire each recommendation to the correct existing route:

- Quick target -> `/quick-metronome`.
- Sheet target -> `/sheet-practice/{sheetId}` using `getSheetPracticeHref(sheetId)`.
- Segment target -> a Sheet Practice route carrying both sheet and segment identity.

P3-09 owns:

- Replacing or extending the Home single `continueTarget` card into compact multiple Continue Practice recommendation rows.
- Reading `getContinuePracticeTargets({ limit })` through the Home dashboard hook.
- Rendering valid quick, sheet, and segment recommendations with clear labels and metadata.
- Computing navigation hrefs from P3-08 target identities at the UI/navigation boundary.
- Confirming the route/query contract for segment focus restoration in Sheet Practice.
- Handling missing, stale, disabled, empty, loading, and service-error states at Home/UI boundaries without making stale targets clickable.
- Focused component/unit tests for target rendering and href generation.
- Browser E2E for quick, sheet, and segment navigation from Home.
- Responsive and accessibility coverage for desktop, tablet/narrow, and mobile layouts.

## Explicit Non-Goals

- No production changes to schema, migrations, Dexie stores/indexes, package files, lockfiles, media/artifact/blob/waveform/audio code, event persistence, or event replay.
- No changes to P3-08 target selection, ranking, stale filtering, or repository/service read semantics unless a tiny type/export adjustment is needed for UI consumption.
- No analytics, goals, streaks, command palette, keyboard-global command search, reminders, practice plans, AI recommendations, scoring, mistake detection, cloud sync, login, or cross-device resume.
- No new route framework, app-shell navigation item, sidebar/bottom-nav entry, or deep-link router abstraction.
- No recording artifact availability checks.
- No historical data rewrites, cleanup jobs, backfills, or migration-style stale target repair.
- No changes to recent activity row interactivity; P3-07 recent activity remains display-only.
- No broad Sheet Practice redesign. P3-09 should default to tests for the existing `initialSegmentId` route/prop focus path. Only a tiny, local, behavior-preserving production fix may stay in P3-09 if a test exposes a clear gap. If the needed change touches selection timing, fallback UI wording/state, segment load semantics, or route parsing semantics, stop and split to `P3-09C`.
- No status update to `docs/v1/status.json` during coding unless separately assigned by the scheduler.

If implementation appears to need any non-goal, stop and return to planning or split the work.

## Route And Query Contract

Use the existing route helpers as the source of truth:

- Quick:
  - `href = "/quick-metronome"`
  - Do not append `sessionId`, `recordingId`, or target metadata in this slice.
- Sheet:
  - `href = getSheetPracticeHref(target.sheetId)`
  - Path route is preferred for a plain sheet target because it is already used by Sheet Library.
- Segment:
  - Preferred contract: `href = getSheetPracticeQueryHref({ sheetId: target.sheetId, segmentId: target.segmentId })`.
  - This yields `/sheet-practice?sheetId=...&segmentId=...`.
  - It reuses the current page-level query normalization and existing `returnSegmentId` propagation.
  - Do not include `recordingId` for P3-08 Continue Practice target identities because P3-08 targets are resume identities, not take-review source-recording actions.

Do not invent a second segment query name. `segmentId` is already consumed by both Sheet Practice routes and is already used by recordings review navigation.

Optional helper:

- Add a pure helper such as `getContinuePracticeTargetHref(target: ContinuePracticeTargetIdentity): string | null` in Home/UI navigation-local code or a clearly navigation-scoped helper file.
- Do not put href generation in `src/domain/practice/continue-practice.ts`; that P3-08 module owns target identity/selection and intentionally stayed href-free.
- The helper may import `getSheetPracticeHref` and `getSheetPracticeQueryHref`.
- The helper must return `null` when required ids are missing or unsupported.
- The UI must render a disabled/static row, not a link, when the helper returns `null`.
- The helper must not downgrade a segment target to a sheet route when `segmentId` is missing.
- Keep it pure and covered by tests.
- Do not add `href` to the P3-08 target identity type; P3-08 intentionally kept identities separate from executable route contracts.

## Consuming P3-08 Target Identities

Home should consume `ContinuePracticeTargetIdentity[]`, not the old `ContinuePracticeTarget` compatibility wrapper.

Recommended shape:

- Update `PracticeSessionDashboardState` in `src/hooks/use-practice-session-dashboard.ts` to include:
  - `continueTargets: ContinuePracticeTargetsResult | null` or a narrowed UI state that contains `targets`, `rejected`, `generatedAt`, `limit`.
  - `continueTargetsStatus: "idle" | "loading" | "loaded" | "error"`.
  - `continueTargetsErrorMessage: string | null`.
- Keep `continueTarget` only if required by existing tests or transitional compatibility, but Home should render the new multi-target section from `continueTargets.targets`.
- Home must not render both the legacy single `Continue Practice` card/link and the new multi-target Continue Practice section. If `continueTarget` remains in state for compatibility, it is not a second visible entry point.
- In the hook, call `browserPracticeSessionService.getContinuePracticeTargets({ limit: 5 })`.
- Keep the current `getRecentSession()`, `getTodaySummary()`, and `getHomeRecentActivity()` reads intact.
- Contain Continue Practice target read failures so Today Summary and Recent Activity still render.

Suggested loading behavior:

- Initial load with no targets yet: render a compact loading row/status inside the Continue Practice area.
- Loaded empty: render an honest empty state with a primary quick-start fallback link, not fake recommendations.
- Error: render a non-clickable error row/status and preserve the independent Quick Metronome primary entry.

## Home UI Behavior

Replace the current single `Continue Practice` card in `Primary Entries` with a compact Continue Practice section that can show several targets without turning Home into a heavy dashboard.

Recommended layout:

- Keep `Quick Metronome` as the first primary entry and primary fast-start action.
- Add a `Continue Practice` panel/card in the same `Primary Entries` area.
- Inside it, render up to 5 recommendation rows from P3-08.
- Each valid row is a `Link` with:
  - A visible target title.
  - A concise type label: `Quick`, `Sheet`, or `Segment`.
  - Useful secondary metadata:
    - Quick: recent quick practice timestamp.
    - Sheet: sheet name or fallback sheet id.
    - Segment: segment name/range plus sheet name.
  - A right-arrow icon or equivalent existing lucide icon.
- Do not make recent activity rows clickable; only the Continue Practice recommendation rows are navigation controls.

Recommended copy:

- Section title: `Continue Practice`.
- Quick row title: `Quick practice`.
- Sheet row title: `Sheet practice`.
- Segment row title: use `target.segmentName ?? "Saved segment"` and include sheet context below.
- Empty state: `No recent practice targets yet.`
- Error state: `Continue Practice targets could not be loaded.`

Avoid inflated explanatory copy, hero treatment, marketing language, or large decorative cards. This is a dense practice dashboard.

## Stale, Disabled, And Missing Target Handling

P3-08 should already exclude stale targets from `targets`, but P3-09 still needs UI boundary defenses:

- Never render a clickable row without the ids required by its target kind.
- If a target kind is unknown because of a future type expansion, render nothing for that row and keep the rest of the list working.
- If href generation throws or returns an empty value, render that target as a disabled row with a concise unavailable label and no `href`.
- Do not downgrade a segment target to sheet navigation if `segmentId` is missing at render time.
- If `getContinuePracticeTargets()` rejects, show the Continue Practice error state and keep Quick Metronome available.
- If `targets` is empty but `rejected` contains stale candidates, do not render stale candidates as disabled recommendations unless the existing result exposes a safe display label. Prefer the simple empty state for this slice.
- Stale target explanations remain owned by P3-06/P3-07 recent activity display and Sheet Practice segment selection fallback.

Sheet Practice destination handling:

- Missing sheet on navigation should fall through to existing Sheet Practice sheet-load error/empty handling.
- Missing segment after navigation should use existing `PracticeSegmentSelectorPanel` behavior: no selected segment and a clear message that the saved segment is no longer available.
- P3-09 should first add or adjust component tests around `initialSegmentId` if current coverage does not prove route focus behavior.
- A production Sheet Practice change is allowed only if it is tiny, local, behavior-preserving, and directly required to make existing `initialSegmentId` behavior work as already intended.
- If the fix would alter selection timing, fallback UI wording/state, segment load semantics, or route parsing semantics, split it into `P3-09C sheet-practice-initial-segment-hardening` before implementation.

## Accessibility

- The Continue Practice area should be a named region or section with a visible heading.
- Use semantic links for enabled recommendations.
- Disabled/unavailable rows must not be anchors and should expose `aria-disabled="true"` only if using a button-like element. Prefer static text for disabled rows.
- Each link should have a clear accessible name that includes target type and label, for example `Continue segment Etude A measures 5-8`.
- Do not rely on color alone to distinguish quick/sheet/segment targets.
- Preserve visible focus rings and keyboard tab order.
- Keep row hit targets large enough for touch without making the layout visually oversized.
- Avoid nested interactive elements.
- Loading and error states should use `role="status"` where appropriate, but avoid noisy repeated announcements on every dashboard refresh.

## Responsive Behavior

Use existing Home grid/card patterns:

- Desktop: Quick Metronome and Continue Practice can remain side-by-side inside `Primary Entries`; Continue Practice rows stack inside its panel.
- Tablet/narrow: primary entries should stack or use the existing `sm:grid-cols-2` behavior only if text remains readable and rows do not compress awkwardly.
- Mobile: Continue Practice rows must be single-column, with icons/metadata wrapping cleanly and no clipped text.
- Keep stable row heights as much as practical, but allow long sheet/segment names to wrap.
- Do not let the Continue Practice panel push Today Summary or Recent Activity into overlapping layouts.
- Verify no text clipping/overlap at desktop, tablet, and mobile widths.

## Likely Files And Areas

Production files likely touched:

- `src/hooks/use-practice-session-dashboard.ts`
  - Add multi-target read state.
  - Call `getContinuePracticeTargets({ limit: 5 })`.
  - Keep errors isolated from recent activity.
- `src/components/home/home-dashboard.tsx`
  - Render multi-target Continue Practice UI.
  - Add small helper/component for recommendation rows if it keeps the component readable.
  - Preserve existing Quick Metronome primary entry and recent activity display-only rows.
- A Home/UI-local helper or clearly navigation-scoped helper file
  - Optional pure href helper for quick/sheet/segment targets.
  - Return `string | null`.
  - Do not live in `src/domain/practice/continue-practice.ts`.
  - Do not change selection/ranking behavior.
- `src/domain/practice/index.ts`
  - Export target identity/result types if the Home hook/component needs them.
- `src/domain/sheet/routes.ts`
  - Prefer no change; only touch if a tiny helper is needed and tests justify it.
- `src/components/sheet-practice/segments/practice-segment-selector-panel.tsx`
  - Prefer no production change. Add/adjust tests first.
  - Only harden existing `initialSegmentId` behavior if the fix is tiny, local, behavior-preserving, and does not alter selection timing, fallback UI, segment load semantics, or route parsing semantics.

Tests likely touched:

- `tests/unit/home-dashboard.test.tsx`
  - Multi-target rendering, empty/loading/error states, accessible names, disabled boundaries.
- `tests/unit/use-practice-session-dashboard.test.tsx` if this hook already has or needs focused tests.
- `tests/unit/continue-practice-targets.test.ts` or a new small route helper test if href generation is added to domain practice.
- Existing Sheet Practice segment selector tests or a focused component test for `initialSegmentId`.
- Playwright specs for Home -> Quick, Home -> Sheet, and Home -> Segment navigation.

Avoid editing:

- `docs/v1/status.json`
- package files and lockfiles
- Dexie schema/version/migration files
- repositories except test fixtures need normal setup
- media/artifact/waveform/audio capture/playback code
- event repository/replay code
- recording review organization/history logic except as read-only reference

## Acceptance Criteria

1. Home renders multiple Continue Practice recommendations from `getContinuePracticeTargets()` when valid targets exist.
2. Quick, sheet, and segment target rows have correct labels, metadata, accessible names, and hrefs.
3. Quick target navigation lands on Quick Metronome.
4. Sheet target navigation lands on the correct Sheet Practice sheet route.
5. Segment target navigation lands in Sheet Practice with the target segment selected or focused through the existing `segmentId` route/prop flow.
6. Empty, loading, and service-error states are visible, compact, and do not break Quick Metronome fast entry.
7. Stale/missing/disabled targets are not rendered as enabled links at Home.
8. P3-07 recent activity rows remain display-only and stale recent activity semantics remain unchanged.
9. No schema, package, media/artifact, event replay, analytics/goals/command-palette, or status-file changes are included.
10. Unit/component tests and browser E2E cover the key UI and navigation paths.
11. Responsive checks show no clipping, overlap, or unusable row targets on desktop, tablet, or mobile.
12. Home does not render the legacy single `Continue Practice` card/link at the same time as the new multi-target Continue Practice section.
13. Href generation is not implemented in `src/domain/practice/continue-practice.ts`; missing required ids return `null` and render disabled/static rows without downgrading segment targets.

## Test Strategy

### Unit And Component Tests

Home dashboard:

- Renders a loading Continue Practice state while targets are loading.
- Renders an empty state when `targets` is empty.
- Renders an error state when target loading fails.
- Renders up to the configured target limit.
- Renders quick target row with href `/quick-metronome`.
- Renders sheet target row with `getSheetPracticeHref(sheetId)` href.
- Renders segment target row with `/sheet-practice?sheetId=...&segmentId=...` href through `getSheetPracticeQueryHref`.
- Uses sheet name, segment name, and range labels when present.
- Uses fallback labels when names are missing.
- Does not render stale `rejected` entries as enabled links.
- Keeps Recent Activity rows non-interactive.
- Keeps Quick Metronome primary link visible when Continue Practice has no targets or errors.
- Provides accessible link names that include target type and useful label.
- When legacy `continueTarget` and new `continueTargets` are both present in dashboard state, renders only the new multi-target Continue Practice UI and does not produce duplicate or ambiguous `Continue Practice` entry points.

Hook/service-boundary UI tests:

- `usePracticeSessionDashboard()` calls `getContinuePracticeTargets({ limit: 5 })`.
- Continue target read failure does not discard summary or recent activity data.
- Dashboard subscription refresh updates targets after service notification.
- Existing `continueTarget` compatibility expectations are either updated intentionally or preserved if still exposed.

Href helper tests, if a helper is added:

- Quick target -> `/quick-metronome`.
- Sheet target -> encoded path route.
- Segment target -> query route with encoded `sheetId` and `segmentId`.
- Missing ids return `null` or are rejected by a type guard.
- `null` helper results render disabled/static rows with no `href`.
- Segment targets missing `segmentId` are not downgraded to sheet routes.
- The helper does not live in `src/domain/practice/continue-practice.ts`.

Sheet Practice segment focus:

- Given `initialSegmentId` matching a loaded segment, `PracticeSegmentSelectorPanel` selects it and shows the active segment summary.
- Given `initialSegmentId` for a missing segment, the panel shows the existing saved-segment-unavailable message and leaves Sheet Practice usable.
- Given no `initialSegmentId`, existing default behavior remains unchanged.
- Default implementation path is test-only for existing focus behavior. Any required production fix must stay tiny/local/behavior-preserving, or split to `P3-09C`.

### E2E Tests

Add or update Playwright coverage with seeded local data:

- Seed data only through existing app flows or established E2E storage helpers/test fixtures.
- Do not add product-only seed APIs, schema fields, repository shortcuts, target overrides, or read-time writebacks for E2E convenience.
- E2E must exercise the real `getContinuePracticeTargets()` service boundary. It must not render hardcoded/mock-only UI targets that bypass P3-08.
- Home shows multiple Continue Practice rows after seeded quick, sheet, and segment activity.
- Clicking quick recommendation opens `/quick-metronome`.
- Clicking sheet recommendation opens the correct Sheet Practice sheet route and loads the sheet.
- Clicking segment recommendation opens Sheet Practice with `sheetId` and `segmentId` in the route/query and the corresponding segment selected in the segment panel.
- Deleted/missing segment candidate is not shown as a clickable recommendation after refresh/reload.
- Empty local data shows no fake recommendations and keeps Quick Metronome fast entry.
- Run at desktop and mobile widths, or add screenshot/assertion coverage for both if current E2E helpers support it.
- Check browser console has no errors during Home render and navigation.

### Regression Tests

- Existing P3-08 target selector and practice-session service tests remain passing.
- Existing Home recent activity tests remain passing.
- Existing sheet-practice session/recording E2E tests using `Continue Practice` may need selector updates because the accessible surface changes from one link to multiple row links.
- Preserve existing recordings review navigation behavior, especially `recordingId` + `segmentId` links.

## Verification Commands

Recommended focused commands for the coding agent:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/home-dashboard.test.tsx tests/unit/continue-practice-targets.test.ts tests/unit/practice-session-service.test.ts
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint -- src/hooks/use-practice-session-dashboard.ts src/components/home/home-dashboard.tsx src/domain/practice/continue-practice.ts src/domain/practice/index.ts tests/unit/home-dashboard.test.tsx tests/unit/continue-practice-targets.test.ts
& .\scripts\npm-local.ps1 --% run test:e2e -- tests/e2e/practice-session.spec.ts tests/e2e/sheet-practice-session.spec.ts tests/e2e/sheet-practice-integration.spec.ts
git diff --check
```

Adjust filenames to match actual implementation. Omit lint targets for untouched files.

If a new E2E spec is created for P3-09, run that focused spec plus any existing Continue Practice specs that were updated.

The coding agent must report:

- Changed file list.
- Confirmation that `docs/v1/status.json` was not changed.
- Confirmation that no schema/migration/package/media/artifact/event replay/analytics/goals/command-palette work was added.
- Confirmation that P3-08 target ranking/filtering semantics were not changed unless explicitly justified.
- Focused unit/component test output.
- E2E output, including whether browser coverage was Playwright Chromium or real Chrome.
- Confirmation that E2E seeded data used existing app flows or established E2E storage helpers/fixtures, with no product-only seed API/target override/read-time writeback.
- Typecheck output.
- Lint output for changed files.
- `git diff --check` output.

## Risks And Edge Cases

- Existing E2E locators use a single `Continue Practice` link. They may become ambiguous once multiple recommendation links exist. Update tests to use row-specific accessible names or test ids.
- Query route selection already exists, but segment selection is asynchronous after segment load. E2E must wait for the active segment summary, not just the URL.
- Long sheet or segment names can break compact cards on mobile. Component and E2E checks should include long labels.
- The old `continueTarget` compatibility wrapper may remain in hook state longer than necessary. Avoid rendering both old and new Continue Practice links.
- P3-08 target identities intentionally do not include `href`; adding href to that type would blur slice boundaries.
- Segment target route should not include `recordingId` unless a future slice explicitly turns Continue Practice into take-review resume.
- Missing segment after click can happen if data changes between Home render and Sheet Practice load. Existing Sheet Practice fallback should handle it without Home pre-validating again.
- Service read errors should not blank the whole dashboard.
- Responsive changes could make Today Summary or Recent Activity shift below the fold; acceptable, but no overlap or clipped text.

## Deferred Work

| Deferred work | Future owner |
| --- | --- |
| Command palette over valid local practice targets | `P3-16 home-command-palette` |
| Goal completion, analytics, streaks, and goal UI | `P3-10` through `P3-15` |
| Event-derived recommendation ranking | Future explicit event replay/ranking slice |
| Recording artifact availability validation for recommendations | Future recording review or cleanup slice |
| Cross-device/cloud continue practice | v2 |
| Recording-specific resume from Home using `recordingId` | Future explicit take-review/resume slice |

## Split Triggers

Stop and return to planning if implementation requires:

- Any schema, migration, backfill, cleanup, package, media/artifact, or event replay work.
- More than a small Sheet Practice hardening patch for existing `initialSegmentId` behavior.
- Any Sheet Practice change that alters selection timing, fallback UI wording/state, segment load semantics, or route parsing semantics.
- Any product-only E2E seed API, schema field, repository shortcut, target override, or read-time writeback added only to make tests easier.
- Any rewrite of P3-08 target selection/ranking or recent activity stale semantics.
- Any app-shell navigation redesign.
- Any analytics/goals/command-palette scope.
- More than roughly 300-400 lines of production code excluding tests.

Safe splits if needed:

- `P3-09A continue-practice-home-list`: Home hook and multi-target rendering only.
- `P3-09B continue-practice-navigation-e2e`: UI/navigation-local href helper, route wiring verification, and E2E.
- `P3-09C sheet-practice-initial-segment-hardening`: only if existing `initialSegmentId` route focus needs a narrow fix.
