# Sheet Practice Controls v1 Roadmap

## Purpose

This module extends v0 Sheet Practice controls with richer training, segment, and bar-aware behavior.

## Builds On

- v0 controls initialize from sheet defaults.
- v0 metronome timing is verified inside Sheet Practice.
- v0 metronome and recording controls remain independent.
- v0 controls remain usable across responsive layouts.

## Candidate v1 Features

- Auto Increase.
- Mute Training.
- Complex rhythm patterns.
- Custom metronome sounds.
- Practice templates.
- Segment-level tempo.
- Bar-aware count-in.
- More advanced countdown options.
- Per-sheet metronome presets.

## Product Value

- Support more focused practice routines.
- Let users rehearse specific sections with appropriate tempo settings.
- Improve timing training without leaving Sheet Practice.

## Required v0 Boundaries to Preserve

- Metronome and recording remain independent.
- Sheet Practice and Quick Metronome continue sharing the metronome foundation.
- Timing verification remains required for metronome changes.
- Controls must not dominate or obscure the sheet.

## Possible Architecture Changes

- Training mode model.
- Segment tempo model.
- Bar-aware count-in service.
- Metronome preset storage.
- Custom sound adapter.

## Testing Implications

- Auto Increase needs tempo ramp timing tests.
- Mute Training needs audible/silent pattern tests.
- Segment tempo needs segment selection and timing tests.
- Custom sounds need generated output verification.
- Responsive control tests must continue.

## Risks

- Training controls can clutter the Sheet Practice workspace.
- Segment tempo can imply bar awareness before that model is stable.
- Mute Training silence must be distinguishable from broken audio.

## Promotion Criteria

Promote v1 controls features only after:

- v0 Sheet Practice Controls are verified.
- v0 Session Integration is verified.
- Sheet-linked recording is stable.
- The selected feature has clear timing and E2E verification requirements.
