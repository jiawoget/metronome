# 05c Sheet Recording Review Agent Index

## Contract

Spec: `docs/v0/05c-sheet-recording-review.md`

This module owns sheet-linked recording in Sheet Practice: start/stop,
artifact save, metadata/session link, latest replay, waveform, Recordings
visibility, Practice Again immutability, and permission/bad-artifact states.

## Code Map

- Latest recording UI: `src/components/sheet-practice/recording/latest-sheet-recording.tsx`
- Recording service: `src/lib/sheet-practice/recording-service.ts`
- Shared artifact review: `src/components/recordings-review/recording-artifact-review.tsx`
- Recording repository/history: `src/lib/recordings-review/*`
- Sheet controls integration: `src/components/sheet-practice/controls/sheet-practice-controls.tsx`

## Technologies And Boundaries

- Browser recording uses the shared recording service boundary; do not call
  MediaRecorder directly from UI.
- Save should validate/decode artifacts before metadata is committed.
- Practice Again must create a new recording and preserve the original artifact
  and metadata.

## Tests

- Unit: `tests/unit/sheet-practice-recording.test.ts`
- E2E: `tests/e2e/sheet-recording-review.spec.ts`,
  `tests/e2e/recordings-review.spec.ts`

## Spec Audit Notes

- Current status is verified.
- Synthetic browser recording, latest replay, waveform stability, bad artifact,
  permission denial, Recordings visibility, and Practice Again immutability are
  covered.
- No known unimplemented v0 sheet-recording-review item remains.

