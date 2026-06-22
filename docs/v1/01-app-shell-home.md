# App Shell / Home v1 Roadmap

## Purpose

This module extends the v0 practice dashboard into a richer long-term practice companion while preserving Home as an action-oriented practice entry point.

## Builds On

- v0 Home is a practice dashboard, not a landing page.
- v0 has top-level navigation for Home, Quick Metronome, Sheet Library, Sheet Practice, Recordings, and Settings.
- v0 uses sidebar navigation for desktop and iPad landscape.
- v0 uses bottom navigation for narrow mobile screens.
- v0 exposes a global status area for playback or recording state.

## Candidate v1 Features

- More detailed dashboard analytics.
- Practice streaks.
- Goal management.
- Practice plan entry.
- Global command palette.
- Advanced notifications.
- Recent activity timeline.
- More detailed continue-practice recommendations.

## Product Value

- Help the player understand longer-term practice patterns.
- Make it easier to resume meaningful work instead of only the latest route.
- Surface goals and plans once the core v0 practice loop is stable.

## Required v0 Boundaries to Preserve

- Home should remain focused on practice entry and review.
- Home should not become marketing content.
- Quick Metronome should remain a primary fast-start entry.
- Sheet Practice should remain the core workspace.
- Global playback or recording state must remain clear across navigation.

## Possible Architecture Changes

- Practice analytics service.
- Goal or plan domain model.
- Notification service.
- Command palette state and routing.

## Testing Implications

- E2E tests for goal creation and dashboard navigation.
- Regression tests ensuring primary v0 entries remain visible.
- Visual checks for dashboard density and mobile layout.

## Risks

- Dashboard complexity could obscure fast practice entry.
- Analytics could imply precision the app does not yet support.
- Notifications and goals may create product weight before the practice loop is strong.
Cross-device resume is deferred to v2.

## Promotion Criteria

Promote v1 Home features only after:

- v0 Home, Quick Metronome, Recordings, and Sheet Practice are verified.
- Practice Session history is stable.
- Local data persistence is reliable.
- The selected v1 feature has a clear user path and test plan.
