# Recordings / Review v1 Roadmap

## Purpose

This module extends the v0 unified recordings review surface into a deeper practice feedback and comparison workflow.

## Builds On

- v0 has one unified recordings list.
- v0 supports quick and sheet recording metadata.
- v0 recordings are real decodable audio artifacts.
- v0 supports playback, details, error markers, delete, and continue practice.
- v0 delete behavior is persistent.

## Candidate v1 Features

- Recording comparison.
- Multi-take management.
- Bar-level navigation.
- Analysis-backed waveform support.
- Tags.
- Favorites.
- Archive.
- Audio export.
- More detailed recording metadata.
- Comparison between user recording and local reference audio.
- Review views grouped by sheet, segment, or practice date.

## Product Value

- Help the player compare progress across takes.
- Make review useful for repeated practice, not just playback.
- Support larger recording collections.
- Enable richer local long-term history.

## Required v0 Boundaries to Preserve

- Quick and sheet recordings remain in one unified review system.
- Recording artifacts remain real and decodable.
- Delete behavior remains clear and persistent.
- Continue Practice routes are based on recording context.
- UI should not directly depend on storage, waveform, or audio analysis libraries.

## Possible Architecture Changes

- Recording comparison service.
- Take grouping model.
- Segment-linked review model.
- Tag and favorite metadata.
- Export service.
- Audio analysis result storage for bounded v1 infrastructure.

## Testing Implications

- Comparison tests need multiple real audio artifacts.
- Export tests need file integrity verification.
- Analysis-backed waveform tests need controlled audio fixtures.
- E2E tests must still use real browser interaction.

## Risks

- Multi-take review can drift toward DAW-like editing.
- Export can introduce browser compatibility issues.
- Tags and folders can add management complexity.
- Automatic scoring is deferred to v2 because weak analysis can create false confidence.

Cloud backup and restore are deferred to v2.

## Promotion Criteria

Promote v1 Recordings features only after:

- v0 Quick Metronome and Recordings are verified.
- Recording persistence is stable.
- Playback and delete flows are reliable.
- The selected v1 feature has clear audio artifact verification and E2E coverage.
