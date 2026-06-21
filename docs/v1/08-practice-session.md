# Practice Session v1 Roadmap

## Purpose

This module extends v0 Practice Session into more structured, analytics-ready, segment-aware, and sync-ready practice history.

## Builds On

- v0 supports quick and sheet sessions.
- v0 sessions can exist without recordings.
- v0 recordings must link to sessionId.
- v0 Continue Practice uses recent session.
- v0 Today Summary uses browser local day.
- v0 sessions are local-first.

## Candidate v1 Features

- Precise event timeline.
- Play and pause event tracking.
- Practice goal completion tracking.
- Practice Segment-level sessions.
- Multi-take comp sessions.
- Automatic analysis result attachments.
- Cross-device session merging.
- Session history grouped by sheet or segment.
- Session comparison over time.
- More detailed practice duration rules.
- Sync conflict handling for sessions.

## Product Value

- Make practice history more useful over time.
- Enable segment-level tracking and review.
- Support richer dashboards and goals.
- Prepare for cross-device continuity.

## Required v0 Boundaries to Preserve

- Practice can be counted without recording.
- Recording and transport controls remain independent.
- Continue Practice remains session-based.
- Local-first behavior remains available without login.
- Error markers remain recording-scoped, not session-scoped.

## Possible Architecture Changes

- Session event timeline.
- Segment session model.
- Goal completion model.
- Session analytics service.
- Sync merge policy.
- Analysis attachment model.

## Testing Implications

- Event timeline tests need deterministic event sequences.
- Segment sessions need E2E from segment practice through review.
- Goal tracking needs completion and partial completion tests.
- Sync merge needs conflict fixtures.
- Date and timezone behavior must be explicitly tested.

## Risks

- Detailed timelines can make simple practice feel over-instrumented.
- Sync merging can create duplicate or conflicting sessions.
- Segment sessions can drift toward DAW-like complexity.
- Analytics can imply precision that v0 data does not support.

## Promotion Criteria

Promote v1 Practice Session features only after:

- v0 Practice Session is verified.
- Quick, Sheet Practice, Recordings, and Settings cleanup flows are stable.
- The selected feature has clear data migration and E2E coverage.
