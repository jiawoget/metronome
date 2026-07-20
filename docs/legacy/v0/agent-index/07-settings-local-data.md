# 07 Settings / Local Data Agent Index

## Contract

Spec: `docs/v0/07-settings-local-data.md`

This module owns the Settings page, persisted default practice settings,
microphone permission status, local data counts, storage estimate/fallback, and
Clear All Local Data with confirmation, cleanup, and reset to defaults.

## Code Map

- UI: `src/components/settings/settings-experience.tsx`
- Route: `src/app/settings/page.tsx`
- Domain: `src/domain/settings/*`
- Service: `src/services/settings/service.ts`
- Settings repository: `src/infrastructure/db/browser-settings-service.ts`
- Local data/permission/storage cleanup service:
  `src/infrastructure/db/browser-settings-local-data-service.ts`
- Cleanup touches sheet, reference, recording, marker, and practice-session
  boundaries through their services/repositories.

## Technologies And Boundaries

- Settings persistence uses Dexie in a dedicated settings database.
- Permission state uses browser Permissions API behind service mapping.
- Storage estimate uses `navigator.storage.estimate()` with fallback copy.
- UI must not call Dexie, localStorage, MediaDevices, or artifact stores.

## Tests

- Unit: `tests/unit/settings-service.test.ts`,
  `tests/unit/settings-experience.test.tsx`
- E2E: `tests/e2e/settings-local-data.spec.ts`

## Spec Audit Notes

- Current status is verified.
- Cleanup directly verifies sheet artifacts, reference artifacts, recording data
  URLs, markers, practice sessions, quick history, and settings reset.
- Important boundary: settings values are persisted and reset, but current Quick
  Metronome and Sheet Practice controls still use their own module/sheet
  defaults unless future work wires global settings consumption into them.
  Treat that as a known integration boundary to verify before relying on global
  default consumption.

