# App Shell / Home

## Purpose

This module defines the v0 application shell, top-level navigation, responsive layout, and Home dashboard. It gives the app a stable frame so later modules can be added without inventing navigation and page structure each time.

## User Value

- The user can open the app and immediately see where to start or resume practice.
- The user can navigate to every top-level v0 area.
- The user sees clear empty states instead of fake practice data.
- The layout works on desktop, iPad landscape, and narrow mobile screens.

## v0 Scope

- App Shell.
- Home dashboard.
- Top-level navigation.
- Desktop and iPad landscape sidebar navigation.
- iPhone portrait and narrow-screen bottom navigation.
- Current page highlight.
- Quick Metronome entry.
- Continue Practice entry.
- Recent Sheets area.
- Recent Recordings area.
- Today Practice Summary.
- Import Sheet entry.
- Settings entry.
- Lightweight global recording or playback status indicator area.

## Out of Scope for v0

- Real metronome playback.
- Real recording behavior.
- Real sheet import.
- Real recording replay.
- Complex dashboard analytics.
- Practice streaks.
- Goal management.
- Practice plan entry.
- Global command palette.
- Advanced notifications.
- Account or cloud sync.

## User Paths

```text
Open the app
  -> Land on Home
  -> See practice summary and primary entries
  -> Navigate to Quick Metronome
  -> Navigate back to Home
  -> Navigate to Sheet Library
  -> Navigate to Recordings
  -> Navigate to Settings
```

```text
Open the app with no saved data
  -> See Today Summary with zero values
  -> See empty Recent Sheets
  -> See empty Recent Recordings
  -> See Continue Practice empty state
```

## Product Decisions

- Home is a practice dashboard, not a landing page.
- Quick Metronome and Continue Practice are the most important Home entries.
- Phase 0 pages may be shells, but they must have real routes and clear empty states.
- Home must not show fake practice data.
- The global status area may be reserved in Phase 0, but it must not fake active playback or recording.
- Every top-level page should be reachable even if the feature body is not implemented yet.

## Data Boundary

This module may read:

- Practice summary.
- Recent practice session.
- Recent sheets.
- Recent recordings.
- Global playback or recording status.

In Phase 0, these may be empty or default local data sources. The module should not create recordings, sheets, or practice sessions.

## State Boundary

Module-owned state:

- Responsive navigation presentation.
- Current navigation highlight.
- Local UI expansion or collapse state if needed.

Shared state read by this module:

- Current route.
- Practice summary.
- Recent session.
- Recent sheets.
- Recent recordings.
- Global playback or recording status.

## Architecture Boundary

The UI may call app-level hooks, stores, or services for summary and navigation data.

The UI must not directly call:

- Tone.js.
- wavesurfer.js.
- MediaRecorder.
- IndexedDB / Dexie.
- Future sync or WASM modules.

## Dependencies

- Practice Session for Continue Practice data.
- Settings route for navigation.
- Sheet Library route for Import Sheet and recent sheets.
- Quick Metronome route for fast practice entry.
- Recordings route for recent recordings.

These dependencies may be route shells during Phase 0.

## Acceptance Criteria

- [ ] The user can open Home and see the main v0 practice entries.
- [ ] The user can navigate to every top-level v0 page.
- [ ] Desktop and iPad landscape widths show sidebar navigation.
- [ ] Narrow mobile width shows bottom navigation.
- [ ] The current page navigation item is highlighted.
- [ ] The Home Quick Metronome entry navigates to Quick Metronome.
- [ ] The Settings entry navigates to Settings.
- [ ] Continue Practice shows an empty state when no session exists.
- [ ] Recent Sheets shows an empty state when no sheets exist.
- [ ] Recent Recordings shows an empty state when no recordings exist.
- [ ] Today Practice Summary shows zero values when no history exists.
- [ ] The global status indicator area exists without faking playback or recording.
- [ ] No enabled Home control claims functionality that is not implemented.

## Test Plan

### Unit Tests

- Navigation configuration contains all v0 top-level pages.
- Empty summary data renders zero values.
- Empty recent sheets and recent recordings render empty states.

### Integration Tests

- Home reads empty practice summary and recent data without crashing.
- Current route maps to the correct highlighted navigation item.
- Continue Practice handles missing session data.

### E2E / Playwright Tests

These tests must use real browser interaction.

- Open Home on a desktop viewport and verify sidebar navigation is visible.
- Click Quick Metronome from Home and verify the route/page changes.
- Click Settings from navigation and verify the route/page changes.
- Click Sheet Library and Recordings navigation items and verify each page is reachable.
- Open Home on a narrow mobile viewport and verify bottom navigation is visible.
- Tap bottom navigation items and verify page changes.
- Verify no-data states for Continue Practice, Recent Sheets, Recent Recordings, and Today Summary.
- Check the browser console during the tested flows.

### Manual QA

- Inspect desktop, iPad landscape, and iPhone portrait layouts.
- Confirm text does not overlap or overflow.
- Confirm Home reads as a working practice dashboard, not a marketing page.

## QA Checklist

- [ ] Real browser E2E testing was performed.
- [ ] Navigation was tested by clicking visible controls.
- [ ] Mobile navigation was tested at a narrow viewport.
- [ ] Desktop navigation was tested at a wide viewport.
- [ ] No fake practice data is shown.
- [ ] No display-only enabled controls are presented as working features.
- [ ] No console errors appear in tested flows.

## Failure / Edge Cases

- No practice history exists: show zero summary and empty continue-practice state.
- No sheets exist: show an empty Recent Sheets state.
- No recordings exist: show an empty Recent Recordings state.
- Narrow viewport: navigation should move to bottom and remain usable.
- Unknown or unfinished module route: show a clear module shell, not a fake feature.

## Implementation Contract

The implementation agent may build:

- The shared app shell.
- Top-level route shells.
- Home dashboard with empty/default data.
- Responsive navigation.
- Current route highlighting.
- Global status indicator placeholder.

The implementation agent must not build:

- Real metronome playback.
- Real recording.
- Real sheet import.
- Real recording playback.
- Fake populated history.
- v1 dashboard analytics or goal features.

Implementation handoff must include:

- Routes and shell areas changed.
- Navigation and responsive behavior implemented.
- Empty state behavior implemented.
- Tests run before handoff.
- Any known layout limitations.

## Verification Contract

The verification agent must:

- Run relevant automated tests.
- Start the app and use real browser interaction for Home and navigation flows.
- Test both desktop and narrow mobile viewports.
- Click visible controls rather than bypassing the UI.
- Verify empty states with no seeded user data.
- Check browser console errors.

The verifier must report FAIL if navigation is only source-tested, if UI behavior is not clicked through in the browser, or if the page displays fake completed functionality.

The verification agent must be a separate agent pass from the implementation agent.

## Implementation Handoff Requirements

- Summary of app shell and Home changes.
- Top-level routes added or changed.
- Tests run by the implementation agent.
- Known limitations or risks.

## Verification Handoff Requirements

- PASS or FAIL.
- Acceptance criteria checklist results.
- Desktop browser interaction evidence.
- Mobile viewport browser interaction evidence.
- Empty state evidence.
- Console error status.
- Repro steps for any failure.

## Done Definition

This module is complete only when:

- All acceptance criteria pass.
- E2E browser interaction verifies navigation and responsive layout.
- Empty states are verified.
- No console errors appear during tested flows.
- A separate verification agent reports PASS.

## v1 Hooks

Preserve room for:

- Detailed dashboard analytics.
- Practice streaks.
- Goal management.
- Practice plan entry.
- Global command palette.
- Advanced notifications.
- Recent activity timeline.
- Cross-device resume.

Do not implement these in v0.
