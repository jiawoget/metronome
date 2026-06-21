# Sheet Practice Integration v1 Roadmap

## Purpose

This module extends the v0 Sheet Practice workspace into a more structured, segment-aware, and review-aware practice environment.

## Builds On

- v0 Sheet Practice is split into independently verified submodules.
- v0 keeps the sheet visually central.
- v0 supports sheet-linked sessions and recordings.
- v0 error markers are timestamp-based.
- v0 does not require automatic bar detection or automatic analysis.

## Candidate v1 Features

- Automatic or assisted page turning.
- Current-bar tracking.
- Bar-aware error markers.
- Segment-aware practice setup.
- More precise re-recording from a selected bar.
- Countdown before recording from a segment.
- Multiple takes attached to the same sheet or segment.
- Active take selection by bar range.
- Better reference-to-recording comparison.
- Optional beat sync between reference audio and user recording.

## Product Value

- Make sheet practice more focused and repeatable.
- Help users work on specific sections without turning the app into a DAW.
- Improve review by connecting recordings, markers, and practice segments.

## Required v0 Boundaries to Preserve

- Sheet remains the visual priority.
- Recording and metronome logic remain behind service boundaries.
- Timestamp-based markers remain valid even before bar-aware features exist.
- Submodules remain independently testable.

## Possible Architecture Changes

- Practice Segment domain model.
- BeatGrid model.
- Bar-aware marker model.
- Multi-take selection model.
- Segment recording countdown flow.
- Reference comparison service.

## Testing Implications

- Segment flows need E2E tests from setup through recording and review.
- Bar-aware features need fixtures with known bar positions.
- Multi-take features need multiple real audio artifacts.
- Reference comparison needs controlled reference and recording fixtures.

## Risks

- Sheet Practice can become too complex if v1 features arrive before v0 is stable.
- Bar-aware behavior may imply automatic score understanding that does not exist.
- Multi-take workflows can drift toward full DAW editing.

## Promotion Criteria

Promote v1 Sheet Practice features only after:

- All v0 Sheet Practice submodules are verified.
- Sheet-linked recording and marker persistence are stable.
- Practice Session history is stable.
- The selected v1 feature has a clear user path, data boundary, and specialized tests.
