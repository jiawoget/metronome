# 08 Practice Session Agent Index

## Contract

Spec: `docs/v0/08-practice-session.md`

This module owns the global v0 Practice Session model: quick/sheet sessions,
session lifecycle, recording linkage, recent session, Continue Practice, Today
Summary, local-day aggregation, persistence, and clear-data integration.

## Code Map

- Domain: `src/domain/practice/*`
- Service: `src/services/practice-session/service.ts`
- Types: `src/services/practice-session/types.ts`
- Repository: `src/infrastructure/db/global-practice-session-repository.ts`,
  `src/infrastructure/db/practice-session-repository.ts`
- Browser service composition: `src/infrastructure/db/browser-practice-session-service.ts`
- Home hook/UI: `src/hooks/use-practice-session-dashboard.ts`,
  `src/components/home/home-dashboard.tsx`
- Quick integration: `src/components/quick-metronome/quick-metronome-experience.tsx`
- Sheet integration and test-injected recording harness boundary:
  `src/components/sheet-practice/controls/sheet-practice-controls.tsx`

## Technologies And Boundaries

- Dexie-backed repository owns persisted sessions.
- Legacy quick session reads are bounded to the global repository adapter for
  compatibility; do not reintroduce a second quick session model.
- Active-session reuse is limited to unended sessions from the same browser
  local day.
- Recording creation must have a sessionId and update count/latest.

## Tests

- Unit: `tests/unit/practice-session-service.test.ts`,
  `tests/unit/quick-metronome-session.test.ts`,
  `tests/unit/home-dashboard.test.tsx`,
  `tests/unit/sheet-practice-recording.test.ts`,
  `tests/unit/sheet-practice-controls.test.tsx`
- E2E: `tests/e2e/practice-session.spec.ts`,
  `tests/e2e/sheet-practice-session.spec.ts`

## Spec Audit Notes

- Current status is verified.
- Fixes after initial implementation cover previous-day/ended session handling,
  deterministic quick session selection, same-context sheet session reuse, and
  missing-sheet recovery.
- No known unimplemented v0 practice-session item remains.

