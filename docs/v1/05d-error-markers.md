# Error Markers v1 Roadmap

## Purpose

This module extends v0 timestamp-based manual markers into richer, more practice-aware review annotations.

## Builds On

- v0 markers are manually created.
- v0 markers bind to recordingId.
- v0 markers use recording timestamps.
- v0 marker seek is verified through the real playback service.
- v0 marker persistence is verified after reload.

## Candidate v1 Features

- Bar-aware markers.
- Markers attached to Practice Segments.
- Marker categories.
- Severity levels.
- Marker waveform overlay.
- Marker on sheet overlay.
- Marker grouping by section or practice session.

Automatic mistake suggestions are deferred to v2.

## Product Value

- Make review more structured.
- Help users prioritize repeated mistakes.
- Connect markers to sheet positions once bar or segment data exists.
- Prepare for future assisted analysis without requiring it in v0.

## Required v0 Boundaries to Preserve

- Timestamp-based markers remain valid.
- Markers remain scoped to recordings.
- Manual marker creation remains available and primary.
- Seek behavior must continue to use playback service boundaries.

## Possible Architecture Changes

- Bar-aware marker model.
- Practice Segment marker relation.
- Marker category metadata.
- Sheet overlay coordinate model.
- Waveform overlay rendering.

## Testing Implications

- Bar-aware markers need fixtures with known bar positions.
- Segment markers need segment setup and persistence tests.
- Overlay features need visual and coordinate tests across zoom/resize.
- E2E tests must still use real browser interaction.

## Risks

- Bar-aware markers can imply score understanding before it is reliable.
- Overlays can clutter the Sheet Practice workspace.

## Promotion Criteria

Promote v1 marker features only after:

- v0 Error Markers are verified.
- Sheet Recording / Review is verified.
- Segment or bar context exists if needed.
- The selected feature has clear fixture, persistence, seek, and visual test requirements.
