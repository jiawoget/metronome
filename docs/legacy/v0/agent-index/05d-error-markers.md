# 05d Error Markers Agent Index

## Contract

Spec: `docs/v0/05d-error-markers.md`

This module owns manual recording-scoped error markers: timestamp entry,
current playback time capture, note validation, sorted marker list, seek to
marker, delete, persistence, and no automatic mistake/bar detection.

## Code Map

- UI: `src/components/sheet-practice/markers/error-marker-panel.tsx`
- Domain validation/helpers: `src/lib/recordings-review/error-markers.ts`
- Repository APIs: `src/lib/recordings-review/repository.ts`
- Playback seek boundary: `src/lib/recordings-review/wavesurfer-adapter.ts`
- Sheet latest-recording integration:
  `src/components/sheet-practice/recording/latest-sheet-recording.tsx`

## Technologies And Boundaries

- Markers are linked to recordings, not directly to sessions.
- Validation should flow through `validateErrorMarkerInput` and repository
  normalization rather than duplicated component-only checks.
- Seek must report actual playback time; do not fake success on failed seek.

## Tests

- Unit: `tests/unit/recordings-review-history.test.ts`,
  `tests/unit/recordings-review-repository.test.ts`,
  `tests/unit/sheet-practice-error-markers.test.tsx`
- E2E: `tests/e2e/sheet-recording-review.spec.ts`,
  `tests/e2e/recordings-review.spec.ts`,
  `tests/e2e/sheet-practice-integration.spec.ts`

## Spec Audit Notes

- Current status is verified.
- Post-audit fixes `e125f8a` and `dde1474` cover invalid timestamps including
  negative, tiny negative before rounding, out-of-range, `NaN`, `Infinity`,
  blank input, note trimming, and overlong note errors.
- No known unimplemented v0 error-marker item remains.

