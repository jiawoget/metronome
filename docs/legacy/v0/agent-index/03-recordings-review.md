# 03 Recordings Review Agent Index

## Contract

Spec: `docs/v0/03-recordings-review.md`

This module owns the unified recordings list, filters, playback, waveform,
markers display, Practice Again routing, delete persistence, bad-artifact
states, and duration mismatch warnings.

## Code Map

- UI: `src/components/recordings-review/recordings-review-experience.tsx`
- Shared artifact review UI: `src/components/recordings-review/recording-artifact-review.tsx`
- History/domain helpers: `src/lib/recordings-review/history.ts`,
  `src/lib/recordings-review/format.ts`, `src/lib/recordings-review/types.ts`
- Marker validation: `src/lib/recordings-review/error-markers.ts`
- Repository/artifacts: `src/lib/recordings-review/repository.ts`,
  `src/lib/recordings-review/artifact-service.ts`
- Playback boundary: `src/lib/recordings-review/wavesurfer-adapter.ts`
- Quick persistence bridge: `src/lib/quick-metronome/persistence.ts`

## Technologies And Boundaries

- Use `wavesurfer-adapter.ts` for playback/seek state; UI should not directly
  own wavesurfer internals.
- Recording artifacts are validated/decoded before metadata is trusted.
- Practice Again must create a new take; never overwrite the source recording.

## Tests

- Unit: `tests/unit/recordings-review-history.test.ts`,
  `tests/unit/recordings-review-repository.test.ts`
- E2E: `tests/e2e/recordings-review.spec.ts`,
  related sheet recording coverage in `tests/e2e/sheet-recording-review.spec.ts`

## Spec Audit Notes

- Current status is verified.
- Post-audit fix `e125f8a` strengthened waveform evidence: E2E now checks
  visible rendered geometry, nonzero bar heights, and stability, not metadata
  alone.
- Post-audit fix `dde1474` validates raw marker timestamps before rounding.
- No known unimplemented v0 recordings-review item remains.

