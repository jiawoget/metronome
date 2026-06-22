# 05b Practice Controls Agent Index

## Contract

Spec: `docs/v0/05b-practice-controls.md`

This module owns Sheet Practice metronome controls: BPM, meter, subdivision,
accent, countdown, transport start/stop, control lockouts, timing, recording
independence, and sheet session activity.

## Code Map

- UI: `src/components/sheet-practice/controls/sheet-practice-controls.tsx`
- State helpers: `src/components/sheet-practice/controls/practice-control-state.ts`
- Shared metronome adapter: `src/lib/quick-metronome/metronome-service.ts`
- Transport hook shared with quick flow: `src/lib/quick-metronome/use-metronome-transport.ts`
- Session service: `src/services/practice-session/service.ts`

## Technologies And Boundaries

- Reuse the quick metronome Tone adapter; do not create a second Tone transport.
- BPM draft behavior should not clamp partial typed values too early.
- Meter/countdown controls are locked while running; expected invalid edits
  should be made impossible rather than silently ignored.

## Tests

- Unit: `tests/unit/sheet-practice-controls.test.tsx`
- E2E: `tests/e2e/sheet-practice-controls.spec.ts`
- Session overlap: `tests/e2e/sheet-practice-session.spec.ts`

## Spec Audit Notes

- Current status is verified.
- Verification fix `22563a5` changed same-context sheet stops to update session
  duration rather than ending the active sheet session.
- No known unimplemented v0 practice-control item remains.

