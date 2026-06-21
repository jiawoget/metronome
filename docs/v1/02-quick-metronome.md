# Quick Metronome v1 Roadmap

## Purpose

This module extends the v0 quick practice loop into more adaptive and training-oriented metronome workflows.

## Builds On

- v0 Quick Metronome provides BPM, meter, subdivision, accent, countdown, Tap Tempo, recording, replay, and quick recording persistence.
- v0 verifies actual metronome timing.
- v0 verifies recording output with controlled synthetic input.
- v0 quick recordings are linked to Practice Sessions and not linked to sheets.

## Candidate v1 Features

- Auto Increase.
- Mute Training.
- Complex rhythm patterns.
- Custom metronome sounds.
- Preset practice templates.
- Practice plans.
- Tempo progress tracking.
- Warmup routines.
- Advanced countdown options.
- More detailed tempo history per session.

## Product Value

- Help players gradually build speed.
- Improve internal time through mute training.
- Support common warmup and technique routines.
- Make repeated practice less manual.

## Required v0 Boundaries to Preserve

- Quick Metronome remains the fastest entry point.
- Quick recordings remain part of the unified recordings system.
- Quick recordings remain unlinked from sheets unless the user explicitly starts from a sheet workflow.
- Metronome logic remains behind a service or adapter boundary.
- UI must not directly call low-level audio libraries.

## Possible Architecture Changes

- Training mode domain model.
- Tempo ramp rules.
- Mute cycle scheduler.
- Metronome sound preset adapter.
- Practice template storage.
- More detailed session event tracking.

## Testing Implications

- Timing tests must cover tempo ramps.
- Mute Training tests must verify silent and audible bars occur in the expected pattern.
- Custom sound tests must verify selected sound changes generated output.
- Preset tests must verify saved routines persist and reload.
- E2E tests must still use real browser interaction.

## Risks

- Training modes can make the metronome state machine too complex.
- Tempo ramp behavior can surprise users if controls are unclear.
- Custom sounds can add storage and loading complexity.
- Mute Training must be tested carefully to distinguish intentional silence from broken audio.

## Promotion Criteria

Promote v1 Quick Metronome features only after:

- v0 Quick Metronome is verified with audio timing evidence.
- v0 recording is verified with controlled synthetic input.
- Practice Session persistence is stable.
- The selected training feature has a clear user path and test plan.
