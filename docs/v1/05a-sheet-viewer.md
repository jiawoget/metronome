# Sheet Viewer v1 Roadmap

## Purpose

This module extends the v0 sheet viewer with more advanced navigation and practice-aware viewing features.

## Builds On

- v0 renders real PDF and image artifacts.
- v0 verifies non-empty PDF rendering.
- v0 verifies image decode and visible rendering.
- v0 supports basic zoom and scroll.
- v0 handles missing and bad file states.

## Candidate v1 Features

- Automatic or assisted page turning.
- Current-bar tracking.
- Bar-aware overlays.
- Annotation editing.
- Handwritten notes.
- More advanced zoom and pan.
- Page thumbnails.
- Multi-page quick jump.
- Multi-sheet side-by-side view.

## Product Value

- Reduce friction while practicing through longer sheets.
- Make it easier to navigate to important pages or sections.
- Support more structured practice once bar or segment concepts exist.

## Required v0 Boundaries to Preserve

- The sheet remains the visual priority.
- Viewer should render real artifacts, not derived fake previews.
- PDF and image handling remain behind viewer or artifact services.
- Viewer remains independently testable from metronome and recording features.

## Possible Architecture Changes

- Page navigation state.
- Thumbnail generation service.
- Annotation storage model.
- Bar overlay model.
- Assisted page-turn rules.

## Testing Implications

- Page-turn tests need multi-page PDF fixtures.
- Thumbnail tests need visual and artifact checks.
- Annotation tests need persistence and coordinate validation.
- Bar overlays need fixtures with known page coordinates.
- E2E tests must still use real browser interaction.

## Risks

- Automatic page turning can distract if timing is wrong.
- Annotation and overlay coordinates can break across zoom levels.
- Advanced PDF tools can grow beyond the practice app's v0 focus.

## Promotion Criteria

Promote v1 Sheet Viewer features only after:

- v0 Sheet Viewer is verified with real PDF and image artifacts.
- Sheet Practice integration is stable.
- The selected feature has fixtures and visual verification criteria.
