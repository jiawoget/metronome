# Sheet Recording / Review v1 Roadmap

## Purpose

This module extends v0 sheet recording and latest-take review into richer multi-take, comparison, and segment-aware workflows.

## Builds On

- v0 sheet recordings use real audio artifacts.
- v0 sheet recordings link to sheetId and sessionId.
- v0 replay uses the real artifact.
- v0 waveform data and render stability are verified.
- v0 metronome and recording controls remain independent.

## Candidate v1 Features

- Multi-take management.
- Active take selection.
- Recording comparison.
- Reference-to-recording comparison.
- Audio export.
- Automatic timing analysis.
- Automatic scoring experiments.
- Segment re-recording.
- Take history per sheet or segment.
- Better waveform comparison views.

## Product Value

- Help users compare progress across takes.
- Support focused re-recording without turning the app into a DAW.
- Make review more actionable after v0 recording is stable.

## Required v0 Boundaries to Preserve

- Recordings remain real audio artifacts.
- Recording and metronome remain independent.
- Sheet recordings remain linked to sheetId and sessionId.
- Waveform rendering remains data-backed and stability-tested.
- UI does not directly depend on MediaRecorder, wavesurfer, or storage internals.

## Possible Architecture Changes

- Take grouping model.
- Active take selection model.
- Segment recording model.
- Comparison waveform service.
- Export service.
- Timing analysis result storage.

## Testing Implications

- Multi-take tests need multiple real audio artifacts.
- Comparison tests need controlled paired audio fixtures.
- Export tests need file integrity checks.
- Segment re-recording tests need session and segment context.
- Waveform stability tests must continue for comparison views.

## Risks

- Multi-take workflows can drift toward DAW editing.
- Waveform comparison can become visually complex on mobile.
- Automatic scoring can imply more confidence than analysis supports.
- Export can introduce browser compatibility issues.

## Promotion Criteria

Promote v1 recording features only after:

- v0 Sheet Recording / Review is verified.
- v0 Recordings / Review is verified.
- Session integration is stable.
- The selected feature has real audio fixtures, waveform checks, and E2E coverage.
