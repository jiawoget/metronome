# 05e Session Integration Agent Index

## Contract

Spec: `docs/v0/05e-session-integration.md`

This module is the Sheet Practice slice of the global Practice Session model.
It ensures sheet activity creates/restores sheet sessions, links recordings to
the active session, drives Continue Practice, and stays independent from
metronome/recording/reference transports.

## Code Map

- Harness: `src/components/sheet-practice/session/sheet-practice-session-harness.tsx`
- Sheet controls session wiring:
  `src/components/sheet-practice/controls/sheet-practice-controls.tsx`
- Reference session trigger:
  `src/components/sheet-practice/reference/reference-panel.tsx`
- Session service: `src/services/practice-session/service.ts`
- Session repository: `src/infrastructure/db/global-practice-session-repository.ts`

## Technologies And Boundaries

- Session logic belongs in `src/services/practice-session`, not in controls.
- Triggers are modeled independently: metronome, recording, and reference should
  be able to start/join a session without starting/stopping each other.
- Missing or deleted sheets should recover with a not-found/recovery state,
  not a broken route.

## Tests

- Unit: `tests/unit/practice-session-service.test.ts`,
  `tests/unit/sheet-practice-controls.test.tsx`,
  `tests/unit/sheet-practice-recording.test.ts`
- E2E: `tests/e2e/sheet-practice-session.spec.ts`,
  `tests/e2e/reference-system.spec.ts`,
  `tests/e2e/practice-session.spec.ts`

## Spec Audit Notes

- Current status is verified.
- Post-audit fix `e125f8a` strengthened reference-trigger evidence: reference
  playback now has browser proof for creating/restoring a sheet session while
  remaining reference-only before recording.
- No known unimplemented v0 session-integration item remains.

