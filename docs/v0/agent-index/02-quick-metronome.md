# 02 Quick Metronome Agent Index

## Contract

Spec: `docs/v0/02-quick-metronome.md`

This module owns the standalone metronome, quick recording, quick replay, demo
recording empty state, permission denial, transport independence, and quick
session integration.

## Code Map

- UI: `src/components/quick-metronome/quick-metronome-experience.tsx`
- Latest recording outlet: `src/components/quick-metronome/latest-quick-recording.tsx`
- Control/domain helpers: `src/lib/quick-metronome/control.ts`,
  `src/lib/quick-metronome/use-bpm-draft.ts`
- Tone adapter: `src/lib/quick-metronome/metronome-service.ts`
- Recording adapter: `src/lib/quick-metronome/recording-service.ts`
- Playback adapter: `src/lib/quick-metronome/playback-service.ts`
- Persistence/artifacts: `src/lib/quick-metronome/persistence.ts`
- Session link helpers: `src/lib/quick-metronome/session.ts`

## Technologies And Boundaries

- Tone.js is wrapped by `BrowserMetronomeService`; components should not call
  Tone directly.
- Browser recording is behind `BrowserRecordingService`; components should not
  call MediaRecorder directly.
- Quick session metadata is now owned by `src/services/practice-session`.
- Quick audio artifacts still use the v0 localStorage recording artifact path.

## Tests

- Unit: `tests/unit/quick-metronome-control.test.ts`,
  `tests/unit/quick-metronome-metronome-service.test.ts`,
  `tests/unit/quick-metronome-recording-analysis.test.ts`,
  `tests/unit/quick-metronome-session.test.ts`,
  `tests/unit/quick-metronome-transport.test.tsx`
- E2E: `tests/e2e/quick-metronome.spec.ts`

## Spec Audit Notes

- Current status is verified.
- BPM draft editing intentionally commits on blur/Enter/stepper rather than on
  every keystroke.
- Pre-run meter/countdown controls lock while running; BPM remains adjustable.
- No known unimplemented v0 quick-metronome item remains.

