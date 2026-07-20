# P3-16 Home Command Palette Plan

## Slice

- Slice id: `P3-16 home-command-palette`
- Pack: `pack-3-sessions-continue-practice`
- Source feature: `home.command-palette`
- Product contract: `docs/v1/01-app-shell-home.md` and `docs/v1/remaining-feature-contracts.md`
- Current scheduler status: `not_started` in `docs/v1/status.json` as of this plan. Do not edit status in this slice.
- Planning model: `gpt-5.5`, medium effort, standard speed.
- Coding/review/verification tier: Tier C - User-Facing UI With Browser E2E.

## External Plan Review Gate

- This planning pass only writes the durable plan file.
- Leave `docs/v1/status.json` unchanged.
- Before coding, the scheduler should send this complete plan text, uncompressed, through the logged-in web ChatGPT `metronome` project review gate in Chinese and incorporate required changes before promoting the slice to coding.
- Coding, review, and verification must happen in fresh agents against this plan.

## External Review Notes

The external web ChatGPT plan review returned `PASS_WITH_CHANGES`. This revision incorporates the required changes:

- Palette command execution must use the same App Shell guarded navigation path as sidebar/bottom navigation, for both pointer/click and `Enter` execution. It must not use raw `Link`/`router.push` in a way that bypasses the active-recording guard.
- App Shell must not globally depend on the full Home dashboard hook and its analytics/goals/streak reads. Use or extract a narrow Continue Practice target read model/hook; if that is not possible without introducing broad Home reads, stop and split/return to planning.
- Production route command construction must use `topLevelNavItems` as the source of truth and must not maintain a second hard-coded route allowlist.
- Stale/deleted target E2E must reuse existing verified app flows/helpers only. Do not add delete UI, storage mutation, product-only seed APIs, or production storage reads merely to test stale exclusion.
- P3-17 session comparison, session analytics comparison, and review comparison commands are out of scope and deferred.
- Verification commands must include any new command-source/helper test files so command construction, filtering, duplicate-id, and stale omission coverage actually runs.

## Context Read

Planning was based only on the requested narrow context:

- `docs/v1/START-HERE.md`
- `docs/v1/status.json`
- `docs/v1/implementation-slices/README.md`
- `docs/v1/implementation-slices/03-sessions-continue-practice.md`
- `docs/v1/implementation-slices/product-feature-map.md`
- `docs/v1/01-app-shell-home.md`
- `docs/v1/remaining-feature-contracts.md` command-palette section plus adjacent Home context
- `docs/v1/ui-design.md`
- `docs/v0/design-style-guide.md`
- `docs/v0/project-structure.md`
- `docs/v0/tech-stack-decisions.md`
- `docs/v1/implementation-slices/plans/P3-08-continue-practice-targets.md`
- `docs/v1/implementation-slices/plans/P3-09-continue-practice-ui-navigation.md`
- `docs/v1/implementation-slices/plans/P3-15-home-goal-management-ui.md`
- `src/lib/navigation.ts`
- `src/components/app-shell/app-shell.tsx`
- `src/components/home/continue-practice-navigation.ts`
- `src/hooks/use-practice-session-dashboard.ts`
- `tests/unit/app-shell.test.tsx`
- `tests/unit/continue-practice-navigation.test.ts`
- `tests/e2e/app-shell-home.spec.ts`

## Refined Goal

P3-16 adds a global command palette for keyboard-driven navigation to implemented top-level routes and valid local Continue Practice targets. It should feel like a compact practice-workspace tool, not a launcher platform. The palette opens from a global shortcut and a visible trigger, filters commands by text, supports full keyboard operation, and executes only safe navigation through existing route and target guards.

This slice should reuse the verified Pack 3 sources:

- Top-level implemented route metadata from `src/lib/navigation.ts`.
- Valid quick/sheet/segment target identities from a narrow Continue Practice target read model/hook backed by P3-08.
- Continue Practice href generation from `src/components/home/continue-practice-navigation.ts`, backed by P3-09.
- Existing App Shell active-recording navigation guard in `src/components/app-shell/app-shell.tsx`.

## Refined Scope

P3-16 owns:

- A command-palette trigger in the app shell:
  - global keyboard shortcut;
  - visible icon button or compact button in desktop/mobile shell chrome where appropriate;
  - no new top-level route.
- Palette open/close state, query text, highlighted item, and result list state.
- A command source that combines:
  - implemented top-level route commands from `topLevelNavItems`;
  - valid local Continue Practice target commands from `continueTargets.targets`.
- Search/filter behavior over command title, route label, command kind, sheet name, segment name, range label, and route description.
- Safe execution of navigation commands only through existing hrefs.
- Keyboard and pointer interaction:
  - open shortcut;
  - close with `Escape`;
  - arrow up/down highlight movement;
  - `Enter` executes highlighted command;
  - click/tap executes a command;
  - tab order and focus restoration.
- Compact modal/dialog UI with stable list dimensions, empty/loading/error states, and mobile fallback.
- Unit/component tests for command-source shape, filtering, keyboard state, focus behavior, and navigation guard integration boundaries.
- Browser E2E for keyboard open/search/select/escape, route navigation, valid target navigation, stale target exclusion, active-recording blocking, mobile layout, focus, and console cleanliness.

## Out Of Scope

P3-16 must not implement:

- Unimplemented route or feature commands.
- Destructive commands, delete/clear/reset/import/export commands, settings mutations, goal create/edit/delete commands, or recording actions.
- Session comparison, session analytics comparison, review comparison, practice review comparison, or any command that implies P3-17 behavior.
- Plugin system, user-defined commands, command history, fuzzy-ranking libraries, saved shortcuts, command aliases, command telemetry, cloud commands, login, cross-device resume, reminders, notifications, scoring, mistake detection, AI recommendations, or practice plans.
- New route framework, new top-level navigation items, app-shell redesign, sidebar/bottom-nav redesign, or Sheet Practice route semantics.
- New Continue Practice ranking/validation, target persistence, href fields on P3-08 target identities, or stale-target fallback behavior.
- Recent Activity row interactivity.
- Direct Dexie/IndexedDB access from the palette, app shell, or command-source UI code.
- Schema changes, migrations, cleanup/backfill jobs, package/lockfile changes, media/artifact/waveform/audio changes, event replay, or recording capture behavior.
- `docs/v1/status.json` changes.

If any out-of-scope item appears necessary, stop and return to planning or split the slice.

## Command Source Shape

Prefer a small typed command read model near the UI boundary, for example in a new `src/components/app-shell/command-palette.tsx` plus a pure helper file, or in `src/components/home/command-palette-commands.ts` if the current file organization makes that clearer. Keep the model UI/navigation-scoped, not a new app-wide command platform.

Recommended shape:

```ts
type HomeCommandPaletteCommandKind = "route" | "continue-practice";

type HomeCommandPaletteCommand = {
  id: string;
  kind: HomeCommandPaletteCommandKind;
  title: string;
  subtitle: string;
  href: string;
  keywords: string[];
  disabled?: false;
};
```

Rules:

- Route commands:
  - source from `topLevelNavItems`;
  - include only current implemented top-level routes;
  - use `item.href`, `item.label`, `item.shortLabel`, and `item.description`;
  - stable id should be `route:${item.id}`.
- Continue Practice commands:
  - source from `ContinuePracticeTargetIdentity[]`;
  - call `getContinuePracticeTargetHref(target)`;
  - include only targets where href is a non-empty string;
  - stable ids should use `target.targetKey` with a namespace such as `continue:${target.targetKey}`;
  - do not downgrade malformed segment targets to sheet routes;
  - do not include rejected/stale targets.
- The command source may accept `continueTargetsStatus` so the UI can render loading/error states, but the command array itself should contain only executable commands.
- Avoid disabled executable commands for P3-16. If a target lacks a valid href, omit it from results and expose a compact empty/error state instead.
- Do not add `href` to `ContinuePracticeTargetIdentity` and do not move href generation into `src/domain/practice/continue-practice.ts`.

## Valid Local Practice Targets

Valid local target commands are exactly the P3-08/P3-09 Continue Practice target identities that already have safe hrefs:

- Quick target:
  - command title: `Quick practice`;
  - href: `/quick-metronome`;
  - accessible execution label should include `Continue quick practice`.
- Sheet target:
  - command title: sheet name fallback such as `Sheet practice`;
  - href from `getSheetPracticeHref(sheetId)` through `getContinuePracticeTargetHref`;
  - include sheet name/id in search keywords.
- Segment target:
  - command title: segment name fallback such as `Saved segment`;
  - subtitle should include sheet context and range label when available;
  - href from `getSheetPracticeQueryHref({ sheetId, segmentId })` through `getContinuePracticeTargetHref`;
  - include segment name, sheet name, range label, and ids in keywords.

Rejected target rules:

- Missing sheet id -> no command.
- Missing segment id -> no command and no sheet fallback.
- Missing/deleted sheet or segment should already be absent from `continueTargets.targets`; the palette must not surface `rejected` entries.
- If data changes between palette open and execution, destination pages use their existing load/fallback behavior. P3-16 must not add a second validation read at click time.

## Route And Execution Constraints

- Command execution must use the same App Shell guarded navigation/request-navigation path as existing sidebar and bottom navigation.
- Palette result click/pointer execution must call `preventDefault()` and route through that guarded navigation path, not raw `Link` navigation that can bypass the guard.
- Palette `Enter` execution must use the same guarded navigation path as click execution.
- Do not call raw `router.push`, `window.location.assign`, or unguarded anchor navigation from palette execution.
- If active recording blocks navigation, the URL must remain unchanged and the existing active-recording guard alert must be visible.
- Do not add force-navigation, confirm-navigation, discard-recording, or stop-recording behavior in this slice.
- Route commands must be constructed from `topLevelNavItems`.
- Production code must not maintain a second hard-coded route allowlist. A fixed route list may appear only in tests as a current expectation snapshot.
- Continue Practice commands must use `getContinuePracticeTargetHref`.
- Do not invent new query names, selected-segment params, route aliases, hash routes, or command-only navigation paths.
- Executing the command for the current route may close the palette without changing URL. Tests should assert no crash and focus restoration, not force a reload.

## Keyboard, Focus, And Accessibility

Required interactions:

- Open shortcut:
  - support `Ctrl+K` and `Meta+K`;
  - prevent the browser default only when opening the palette;
  - ignore shortcut while focus is in text input, textarea, select, or editable content unless the focused input is already the palette search field.
- Visible trigger:
  - accessible name such as `Open command palette`;
  - available in desktop shell and mobile shell without crowding diagnostics/navigation.
- Close:
  - `Escape` closes and restores focus to the element that opened the palette when possible;
  - clicking outside or an explicit close button may close if using an existing dialog pattern.
- Focus:
  - opening moves focus to the search input;
  - closing restores focus to trigger or previously focused element;
  - focus trap stays inside the dialog while open if Radix/shadcn dialog is used;
  - visible focus rings must remain.
- Navigation:
  - `ArrowDown` and `ArrowUp` move the highlighted result with wraparound or bounded behavior; choose one and test it;
  - `Enter` executes the highlighted executable command;
  - if there are no results, `Enter` does nothing;
  - mouse hover may update highlight but must not steal keyboard focus.
- ARIA:
  - use an accessible dialog title such as `Command palette`;
  - search input label or `aria-label` must be clear;
  - result list should use a semantic list/listbox pattern consistently;
  - active result should be exposed via `aria-activedescendant` or actual focus, not only color;
  - command names must be meaningful without icons.

Avoid using text that explains keyboard shortcuts inside the app unless the existing shell pattern already has concise shortcut affordances. The UI should be self-evident and compact.

## UI Design Requirements

- Match the v1/v0 light practice-workspace direction: warm off-white overlay context, white/light dialog surface, compact typography, subtle dividers, restrained shadow, 8px-or-less radius unless existing dialog primitives require otherwise.
- Keep Home and App Shell practice entry density intact. The command palette is a utility overlay, not a new Home panel.
- Use lucide icons for recognizable route/target categories if helpful. Do not draw custom SVG icons.
- Keep the list height stable with a max-height and scroll when many targets exist.
- Long sheet or segment names must wrap or truncate cleanly without clipping buttons or metadata.
- Mobile width around 390 px must show a usable search input and results without horizontal overflow.
- Desktop/tablet widths should center or top-position the dialog without covering the entire app in a heavy hero-style layout.
- Empty state copy should be brief, such as `No commands found.`
- Loading state for Continue Practice targets should not block route commands.
- Target-load error should not hide route commands. Show a compact status only if it helps explain missing practice targets.

## Reuse Constraints

The coding agent must reuse:

- `topLevelNavItems` from `src/lib/navigation.ts` for route commands.
- Existing route active/current behavior from App Shell; do not duplicate nav metadata.
- A narrow Continue Practice target read hook/read model for local target data. Prefer extracting a small hook that reads only `browserPracticeSessionService.getContinuePracticeTargets({ limit })` and subscribes only to the practice-session change boundary needed for targets.
- P3-08 service/selector behavior for target validity and ranking. The narrow hook/read model must not rebuild validation/ranking and must not read Dexie directly.
- `getContinuePracticeTargetHref` from `src/components/home/continue-practice-navigation.ts`.
- Existing shadcn/Radix-compatible dialog/input/button primitives if present.
- Existing App Shell active-recording navigation guard.
- Existing Home/App Shell test helpers and E2E storage helpers in `tests/e2e/app-shell-home.spec.ts`.

The coding agent must not:

- Read IndexedDB/Dexie directly to build commands.
- Rebuild Continue Practice target validation or ranking.
- Add new target href fields to domain types.
- Introduce a command framework or dependency.
- Weaken current App Shell diagnostics or mobile bottom navigation behavior.
- Make App Shell globally depend on the full `usePracticeSessionDashboard()` hook and its Home analytics, goals, streak, recent activity, or summary reads.
- If implementation can only use the full dashboard hook, stop and return to planning unless it can prove no extra Home source reads are introduced. If that proof is not straightforward, split before coding.

## Likely Files And Areas

Expected production files:

- `src/components/app-shell/app-shell.tsx`
  - Add palette trigger, state integration, shortcut listener, and render the palette.
  - Preserve existing diagnostics, active-recording guard, sidebar, mobile header, and bottom nav behavior.
  - Expose or reuse the same guarded navigation/request-navigation function for sidebar, bottom nav, and palette execution so click and `Enter` paths cannot bypass it.
- `src/components/app-shell/command-palette.tsx` or similar new component
  - Dialog, search input, result list, keyboard interaction, focus behavior, and command execution.
- `src/components/app-shell/command-palette-commands.ts` or similar pure helper
  - Build/filter commands from route items and Continue Practice targets.
- `src/hooks/use-command-palette-continue-targets.ts` or similar narrow hook/read model
  - Optional but preferred. Reads only Continue Practice targets through the existing practice-session service boundary, with contained loading/error state and no analytics/goals/streak/recent/summary reads.
- `src/components/home/continue-practice-navigation.ts`
  - Prefer no changes; only touch if a tiny export/test gap blocks reuse.
- `src/hooks/use-practice-session-dashboard.ts`
  - Prefer no changes. Do not use the full Home dashboard hook from App Shell unless implementation can prove it introduces no extra Home source reads; otherwise split/return to planning.

Expected tests:

- `tests/unit/app-shell.test.tsx`
  - Trigger rendering, shortcut open/close, focus restoration, route command behavior, active-recording guard regression.
- `tests/unit/command-palette-commands.test.ts` or equivalent
  - Pure command construction/filtering if helper is extracted.
- `tests/unit/continue-practice-navigation.test.ts`
  - Keep existing href coverage; extend only if command-source reuse reveals a missing boundary.
- `tests/e2e/app-shell-home.spec.ts`
  - Add command palette E2E to existing Home/App Shell coverage or create a focused spec if the file becomes too large.

Avoid editing:

- `docs/v1/status.json`
- package files and lockfiles
- Dexie schema/storage contracts/repositories
- practice-session target selectors/services unless a blocking type-export gap is found
- sheet-practice route behavior
- recent activity UI
- recording/media/audio/waveform code
- settings/import/export/cleanup code

## Acceptance Criteria

1. A visible App Shell trigger opens the command palette with an accessible name.
2. `Ctrl+K` and `Meta+K` open the palette, while regular typing in non-palette text fields is not hijacked.
3. Opening moves focus to search; closing with `Escape` restores focus where practical.
4. Search returns implemented top-level routes from `topLevelNavItems`.
5. Search returns only valid Continue Practice quick/sheet/segment targets from `continueTargets.targets` with hrefs from `getContinuePracticeTargetHref`.
6. Search never returns stale/rejected/deleted targets, unimplemented features, destructive actions, cloud/plugin commands, or fake placeholder actions.
7. Arrow key navigation and `Enter` execute the highlighted command.
8. Clicking/tapping a result executes that command through the same guarded navigation path.
9. `Enter` execution also uses the same guarded navigation path.
10. Quick, sheet, and segment target commands navigate to the same destinations verified by P3-09.
11. Active recording navigation guard is preserved for both palette click and `Enter` execution; when blocked, URL is unchanged and the existing alert is visible.
12. App Shell target loading uses a narrow Continue Practice target boundary and does not trigger full Home dashboard analytics/goals/streak/recent/summary reads.
13. Empty, loading, and Continue Practice target-error states remain compact and route commands still work.
14. Desktop, tablet, and mobile layouts have no clipped text, overlap, or horizontal overflow.
15. Unit/component and browser E2E tests cover keyboard, focus, filtering, navigation, target validity, active-recording blocking, and responsive behavior.
16. No schema, package, status, media, event replay, command platform, cloud, scoring, notification, session-comparison, review-comparison, or destructive-action scope is added.

## Unit And Component Test Plan

Command source/filter tests:

- Builds one route command per `topLevelNavItems` item.
- Route command ids, titles, subtitles, hrefs, and keywords are stable.
- Asserts route commands are derived from the injected `topLevelNavItems` input rather than a hard-coded production allowlist. A fixed href list may be asserted only as a test snapshot of current nav items.
- Builds quick, sheet, and segment commands from valid target identities.
- Uses `getContinuePracticeTargetHref` results and omits targets whose href is `null`.
- Does not include `rejected` Continue Practice entries.
- Filters case-insensitively by route label, short label, description, command kind, sheet name, segment name, range label, and fallback labels.
- Empty query returns a deterministic ordering:
  - routes first, then valid Continue Practice targets; or
  - a documented alternate ordering that preserves fast navigation and is tested.
- Duplicate ids are not produced when target keys overlap with route ids.

App Shell/palette component tests:

- Visible `Open command palette` trigger opens the dialog.
- `Ctrl+K` and `Meta+K` open the dialog.
- Shortcut is ignored while a non-palette text field is focused.
- Search input receives focus on open.
- `Escape` closes and restores focus to the trigger or prior focused element.
- `ArrowDown`/`ArrowUp` update the active result.
- `Enter` on a highlighted route command navigates or calls the injected navigation handler.
- `Enter` uses the same guarded navigation/request-navigation handler as pointer execution.
- `Enter` with no results does not navigate.
- Clicking a result executes once.
- Clicking a result calls `preventDefault()` and uses the guarded navigation/request-navigation handler.
- Empty search renders `No commands found.`
- Continue target loading/error does not remove route commands.
- Active-recording guard still blocks command-result navigation and shows the existing guard alert for both click-result and Enter-result paths.
- Narrow Continue Practice target hook/read model calls only `getContinuePracticeTargets({ limit })` plus the required subscription boundary, and does not call Home analytics, goals, streaks, recent activity, Today Summary, or full dashboard reads.
- Existing diagnostics hide/restore behavior remains passing.
- Existing desktop/sidebar and mobile-bottom-nav active route behavior remains passing.

Accessibility tests:

- Dialog has an accessible title/name.
- Search input has an accessible name.
- Results expose meaningful accessible names, including target type and label.
- No nested interactive elements in result rows.
- Disabled/unavailable results, if any are rendered despite the preferred omit rule, are not anchors and cannot execute.

## Browser E2E Plan

Extend `tests/e2e/app-shell-home.spec.ts` or add a focused command palette E2E spec:

1. Start from empty local data on Home.
2. Press `Ctrl+K` and assert the palette opens, search is focused, and route commands are visible.
3. Search `recordings`, press `Enter`, and assert navigation to `/recordings`.
4. Return Home, open with visible trigger, search `quick`, click the Quick Metronome route command, and assert `/quick-metronome`.
5. Seed/create quick, sheet, and segment Continue Practice targets using existing app flows or established E2E helpers, matching P3-09 patterns.
6. Open palette and search the sheet name; assert the sheet target command appears and navigates to `/sheet-practice/{sheetId}`.
7. Open palette and search the segment name; assert the segment target command appears and navigates to `/sheet-practice?sheetId=...&segmentId=...`, with the target segment selected.
8. Stale/deleted target exclusion:
   - Use an existing verified segment delete UI/helper or app flow if one is already available.
   - If no verified helper/flow is available, do not add delete UI, direct storage mutation, product-only seed API, or production storage read for this test. Downgrade stale exclusion to unit/integration coverage and require verification to explain why browser stale-target E2E was not run.
9. Start an active recording with simulated microphone when needed, open the palette, click a route or target result, and assert navigation is blocked by the existing active-recording guard with URL unchanged.
10. With active recording still blocking navigation, open the palette, use keyboard search/highlight, press `Enter`, and assert the same blocked behavior with URL unchanged and existing alert visible.
11. Verify `Escape` closes the palette and returns focus.
12. Run at desktop width around 1280 px, tablet width around 1024 px, and mobile width around 390 px.
13. Assert no horizontal overflow, no console errors, and no page errors.

E2E must not:

- Add product-only seed APIs.
- Bypass P3-08/P3-09 target service/navigation with hardcoded UI-only targets.
- Depend on real microphone hardware.
- Add direct IndexedDB reads to production code.
- Add destructive/session/storage scope only to prove stale-target exclusion.

If E2E uses Playwright Chromium, verification must report it as Playwright Chromium, not real Chrome.

## Verification Commands

Recommended focused commands for the coding agent:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/app-shell.test.tsx tests/unit/continue-practice-navigation.test.ts tests/unit/command-palette-commands.test.ts
& .\scripts\npm-local.ps1 --% run test:e2e -- tests/e2e/app-shell-home.spec.ts
& .\scripts\npm-local.ps1 --% run typecheck
& .\scripts\npm-local.ps1 --% run lint -- src/components/app-shell/app-shell.tsx src/components/app-shell/command-palette.tsx src/components/app-shell/command-palette-commands.ts src/hooks/use-command-palette-continue-targets.ts src/components/home/continue-practice-navigation.ts tests/unit/app-shell.test.tsx tests/unit/continue-practice-navigation.test.ts tests/unit/command-palette-commands.test.ts tests/e2e/app-shell-home.spec.ts
git diff --check
```

Adjust file names to match the actual implementation. Omit lint targets for untouched files and include every new command-source/helper test file, such as `tests/unit/command-palette-commands.test.ts`, so command construction/filtering/duplicate-id/stale omission coverage is executed.

Recommended regression if implementation touches existing Home dashboard code despite the preferred narrow target hook:

```powershell
& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/home-dashboard.test.tsx tests/unit/continue-practice-targets.test.ts tests/unit/practice-session-service.test.ts
```

The coding agent must report:

- Changed file list grouped by production/test/docs.
- Confirmation that `docs/v1/status.json` was not changed.
- Confirmation that no schema/migration/package/media/event replay/cloud/plugin/destructive-command scope was added.
- Confirmation that route commands are sourced from `topLevelNavItems`.
- Confirmation that local practice target commands are sourced from P3-08 `continueTargets.targets` and P3-09 `getContinuePracticeTargetHref`.
- Confirmation that rejected/stale targets are not commands.
- Confirmation that App Shell does not globally depend on full Home dashboard analytics/goals/streak/recent/summary reads.
- Confirmation that active-recording navigation guard remains effective for both palette click and `Enter` execution paths, with URL unchanged when blocked.
- Focused unit output.
- Targeted E2E output, including whether browser coverage was Playwright Chromium or real Chrome.
- Typecheck output.
- Lint output for changed files.
- `git diff --check` output.

## Risks And Edge Cases

- Global shortcut can conflict with focused form fields, especially the P3-15 Practice Goals form. Test that text input is not hijacked.
- App Shell currently owns active-recording navigation blocking. Palette execution must use the same guarded navigation/request-navigation path as sidebar and bottom navigation; raw `Link`/`router.push` execution risks bypassing the guard.
- `usePracticeSessionDashboard()` currently reads several Home data sources. The palette must not mount this full hook globally in App Shell. Prefer a narrow target-read hook; if the full dashboard hook appears necessary, require proof that no extra Home source reads are introduced or split before coding.
- A new hook for palette targets must still use the existing practice-session service boundary and must not duplicate target validation.
- Long sheet/segment names can overflow compact result rows on mobile.
- Search ranking can become subjective. Keep it simple, deterministic, and tested.
- Route commands should remain available even when Continue Practice target loading fails.
- Current route command execution should close the palette without unexpected reload.
- Segment target commands can go stale after palette open. Destination fallback is acceptable; do not add a second validation system in this slice.
- E2E locators may become ambiguous for route `Quick Metronome` vs Continue Practice `Quick practice`; use explicit accessible names.

## Split Triggers

Stop and return to planning if implementation requires:

- Any schema, migration, backfill, cleanup, package, or dependency change.
- Any direct Dexie/IndexedDB read from App Shell or palette UI.
- Any rewrite of P3-08 target selection/ranking or P3-09 href behavior.
- Any new command categories beyond route and valid Continue Practice target navigation.
- Any destructive or mutating command.
- Any session-comparison, session analytics comparison, or review comparison command.
- Any active-recording guard redesign.
- Any app-shell navigation redesign beyond adding a compact trigger/dialog.
- Any Sheet Practice route or segment-selection semantic change.
- More than roughly 300-450 production LOC excluding focused tests.

Safe splits if needed:

- `P3-16A command-source-and-filtering`: pure command model, route/target command construction, filter tests.
- `P3-16B app-shell-command-palette-ui`: dialog, shortcut, focus, keyboard/pointer behavior.
- `P3-16C command-palette-e2e-hardening`: browser E2E, active-recording guard, responsive fixes only.

## Coding Handoff

Coding should read only:

- `docs/v1/START-HERE.md`
- this plan
- `docs/v1/implementation-slices/03-sessions-continue-practice.md`
- `docs/v1/01-app-shell-home.md`
- `docs/v1/remaining-feature-contracts.md` command-palette section
- `docs/v1/ui-design.md`
- `docs/v0/design-style-guide.md`
- `docs/v0/project-structure.md`
- `docs/v0/tech-stack-decisions.md`
- current `src/lib/navigation.ts`
- current `src/components/app-shell/app-shell.tsx`
- current `src/components/home/continue-practice-navigation.ts`
- current narrow practice-session target service export or new narrow hook implementation
- current `src/hooks/use-practice-session-dashboard.ts` only as a boundary reference for what App Shell must not import wholesale
- current `tests/unit/app-shell.test.tsx`
- current `tests/unit/continue-practice-navigation.test.ts`
- current `tests/e2e/app-shell-home.spec.ts`

Keep the patch small and app-shell/UI-local. Prefer route and target command helpers that are pure and easy to test. Do not reinterpret `home.command-palette` as a general automation surface.

## Review Handoff

Review should check:

- Command scope is limited to implemented routes and valid Continue Practice targets.
- Route commands reuse `topLevelNavItems`.
- Target commands reuse P3-08 target identities and P3-09 href helper.
- Stale/rejected/deleted targets are absent.
- No destructive, mutating, cloud, plugin, scoring, notification, route-framework, schema, package, media, event replay, or status-file scope leaked in.
- No direct storage reads were added to App Shell or palette UI.
- Keyboard shortcut does not hijack normal form typing.
- Focus and accessibility behavior are real, not just visual.
- Active-recording navigation guard still blocks palette-triggered navigation through both click and `Enter` paths, with URL unchanged and the existing alert visible.
- Palette execution uses the same guarded navigation/request-navigation path as sidebar/bottom navigation and does not use raw `Link`/`router.push` bypasses.
- App Shell target data uses a narrow Continue Practice target read boundary and does not mount the full Home dashboard hook.
- Mobile and desktop shell controls are not crowded or overlapping.
- Tests cover command source, keyboard/focus, navigation, stale exclusion, guard behavior, and E2E.

## Verification Handoff

Verification should run the focused commands above and inspect changed files. PASS requires:

- Unit/component tests for command construction/filtering, open/close, keyboard highlight/execute, focus restoration, empty/error states, and guard regression.
- E2E evidence for route command navigation and quick/sheet/segment practice target navigation.
- E2E evidence that stale/deleted segment targets do not appear, or a clear verification note explaining that no existing verified app flow/helper was available and stale exclusion was therefore covered by unit/integration tests without adding destructive/session/storage scope.
- E2E evidence that active-recording navigation remains blocked for both click and `Enter` command execution paths, with URL unchanged and existing alert visible.
- Responsive desktop/tablet/mobile no-overflow evidence.
- Typecheck, lint, and `git diff --check` pass.
- Source inspection confirms no forbidden storage/schema/package/media/event/cloud/plugin/destructive-command/session-comparison/review-comparison/status scope.
- Source inspection confirms production route commands come from `topLevelNavItems`, with no second hard-coded route allowlist.

## Deferred Work

| Deferred work | Future owner |
| --- | --- |
| Goal create/edit/delete commands | Future reviewed command/action slice after P3-16 proves navigation-only palette |
| Session comparison, session analytics comparison, or review comparison commands | `P3-17 practice-session-session-comparison` or a future reviewed comparison slice |
| Recording playback or management commands | Future recordings command slice, if desired |
| Import/export/cleanup/settings commands | Pack 8 or later reviewed settings/local-data slice |
| Command aliases, custom shortcuts, recent commands, telemetry, or plugin commands | Future explicit feature |
| Cross-device/cloud command sync | v2 |
