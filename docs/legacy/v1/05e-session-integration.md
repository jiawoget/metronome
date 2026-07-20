# Sheet Practice Session Integration v1 Roadmap

## Purpose

This module extends v0 sheet session integration into more structured, segment-aware, and analytics-ready practice history.

## Builds On

- v0 creates sheet sessions only after real practice activity.
- v0 supports sessions without recordings.
- v0 keeps metronome and recording independent.
- v0 sheet recordings link to sessionId and sheetId.
- v0 Continue Practice routes to the correct sheet.

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

## Product Value

- Make practice history more meaningful.
- Support segment-level review and repetition.
- Enable richer analytics after the core practice flow is stable.
- Prepare for sync without weakening local-first behavior.

## Required v0 Boundaries to Preserve

- Viewing a sheet alone does not automatically count as practice.
- Metronome and recording remain independent.
- Session is practice context, not a transport coupling layer.
- Sheet sessions remain valid even without recordings.
- Continue Practice keeps using session context.

## Possible Architecture Changes

- Event timeline model.
- Segment session model.
- Session analytics service.
- Sync merge policy for sessions.
- Analysis result attachment model.

## Testing Implications

- Timeline tests need deterministic event sequences.
- Segment sessions need E2E from segment setup to review.
- Cross-device merge tests need conflict scenarios.
- Analysis result attachment tests need controlled audio fixtures.
- Independence tests must continue to pass.

## Risks

- Detailed timelines can overcomplicate v0's simple practice history.
- Segment sessions can blur into full DAW workflows if not bounded.
- Cross-device merge can create duplicate or conflicting sessions.

## Promotion Criteria

Promote v1 session features only after:

- v0 session integration is verified.
- Sheet-linked recording and Continue Practice are stable.
- Local session persistence is reliable.
- The selected feature has clear event, data, and E2E test contracts.
