# Settings / Local Data v1 Roadmap

## Purpose

This module extends v0 local settings and cleanup into account, sync, storage, and more advanced user preference management.

## Builds On

- v0 supports local-first settings.
- v0 supports local data overview.
- v0 supports Clear All Local Data.
- v0 cleanup deletes data and artifacts.
- v0 microphone permission state is visible.

## Candidate v1 Features

- Account settings.
- Cloud sync settings.
- Device sync status.
- Supabase-backed user data.
- Cross-device settings sync.
- Cross-device sheet and recording sync.
- Advanced audio device selection.
- Theme system.
- Notification settings.
- Data import/export.
- Detailed privacy settings page.
- Storage usage breakdown.
- Selective cleanup by data type.

## Product Value

- Give users control as the app stores more practice history.
- Support cross-device workflows after local-first behavior is stable.
- Make cleanup and storage management more precise.
- Allow richer personalization without bloating v0.

## Required v0 Boundaries to Preserve

- Local-first practice loop remains usable without login.
- Clear local data remains available.
- Sync is a layer over local data, not a replacement for it.
- UI should not directly call storage internals.

## Possible Architecture Changes

- Account/auth service.
- Sync service.
- Device sync status model.
- Storage breakdown service.
- Selective cleanup service.
- Data import/export service.
- Audio device selection service.
- Theme preference model.

## Testing Implications

- Sync tests need offline, conflict, and restore scenarios.
- Selective cleanup tests need per-data-type artifact checks.
- Import/export tests need file integrity checks.
- Device selection tests need browser capability fallbacks.
- E2E tests must still use real browser interaction.

## Risks

- Cloud sync can complicate local-first guarantees.
- Selective cleanup can create dangling references if data contracts are weak.
- Import/export can create compatibility issues.
- Advanced device settings may behave differently across browsers.

## Promotion Criteria

Promote v1 Settings/Data features only after:

- v0 local data persistence is stable.
- v0 cleanup is verified.
- Sheet, recording, reference, marker, and session data contracts are stable.
- The selected feature has a clear data migration and test strategy.
