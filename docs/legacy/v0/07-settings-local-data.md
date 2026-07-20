# Settings / Local Data

## Purpose

This module provides v0 settings and local data management. It supports the local-first model by making default practice settings, microphone permission state, local storage information, and cleanup behavior visible and testable.

## User Value

- The user can set default practice values.
- The user can understand that v0 data is stored locally.
- The user can see basic local data counts.
- The user can clear local data when needed.
- The user can see microphone permission status.

## v0 Scope

- Settings page.
- Default BPM.
- Default time signature.
- Default subdivision.
- Metronome volume.
- Reference default volume.
- Recording input permission status.
- Local data explanation.
- Local data overview.
- Clear all local data.
- Reset settings to defaults after clear all.
- Error state for cleanup failure.

Local data overview should include simple counts:

- Sheets count.
- Recordings count.
- References count.
- Error markers count when available.
- Practice sessions count when available.
- Browser storage estimate when supported.

## Out of Scope for v0

- Account settings.
- Cloud sync settings.
- Device sync status.
- Advanced audio device selection.
- Theme system.
- Notification settings.
- Data import/export.
- Detailed privacy settings page.
- Selective cleanup by data type.

## User Paths

```text
Open Settings
  -> Change default BPM, meter, subdivision, and volumes
  -> Refresh
  -> See settings persisted
```

```text
Open Settings with local data
  -> See local data overview
  -> Click Clear All Local Data
  -> Cancel confirmation
  -> Confirm data remains
  -> Click Clear All Local Data again
  -> Confirm cleanup
  -> Refresh
  -> See local data cleared and settings reset
```

```text
Open Settings
  -> See microphone permission status
  -> Read local data explanation
```

## Product Decisions

- v0 has no account settings.
- v0 has no cloud sync settings.
- Imported files should be copied into local app storage when possible.
- Settings must include local data cleanup.
- Clear All Local Data resets settings to defaults.
- Clear All Local Data removes sheets, recordings, references, markers, sessions/history, and local artifacts.
- Cleanup requires confirmation.
- Canceling cleanup must have no side effects.
- v0 only includes basic volume and default metronome settings.
- Advanced audio input device selection is not required for v0.

## Data Boundary

This module reads:

- User settings.
- Local data counts.
- Browser storage estimate when available.
- Microphone permission status.

This module updates:

- User settings.
- Default practice values.
- Volume preferences.

This module deletes on Clear All Local Data:

- Sheets.
- Sheet artifacts.
- Recordings.
- Recording artifacts.
- References.
- Reference artifacts.
- Error markers.
- Practice sessions.
- Practice history.
- User settings, then resets them to defaults.

This module must not create:

- Sheets.
- Recordings.
- References.
- Practice Sessions.
- Cloud accounts.

## State Boundary

Module-owned state:

- Settings form state.
- Save status.
- Storage overview loading/error state.
- Cleanup confirmation state.
- Cleanup progress/error state.

Shared state:

- Persisted settings.
- Local data store.
- Browser permission state.

## Architecture Boundary

The UI may call settings, permissions, storage summary, and cleanup services.

The UI must not directly call:

- IndexedDB / Dexie.
- Browser storage internals as source of truth.
- Media device APIs except through permission service.
- File artifact storage internals.

Cleanup must go through a local data service that owns all relevant stores and artifacts.

## Dependencies

- Local Data service.
- Recording permission service.
- Sheet Library data.
- Recording data.
- Reference data.
- Error Marker data.
- Practice Session data.

## Acceptance Criteria

- [ ] The user can open Settings.
- [ ] The user can view and edit default BPM.
- [ ] The user can view and edit default time signature.
- [ ] The user can view and edit default subdivision.
- [ ] The user can view and edit metronome volume.
- [ ] The user can view and edit reference default volume.
- [ ] Settings persist after refresh or reload.
- [ ] Microphone permission status is visible.
- [ ] Local data explanation is visible.
- [ ] Local data overview is visible.
- [ ] Overview shows counts for sheets, recordings, and references.
- [ ] Overview shows markers and sessions counts when available.
- [ ] Storage estimate appears when supported, or a clear fallback appears.
- [ ] Clear All Local Data requires confirmation.
- [ ] Canceling cleanup has no side effects.
- [ ] Confirming cleanup removes sheets, recordings, references, markers, sessions/history, and artifacts.
- [ ] Confirming cleanup resets settings to defaults.
- [ ] Cleanup result persists after refresh or reload.
- [ ] Cleanup failure shows an error state.
- [ ] No account or cloud sync settings appear as usable v0 features.

## Test Plan

### Unit Tests

- Settings validation.
- BPM min, max, and fallback behavior.
- Volume min, max, and fallback behavior.
- Default time signature validation.
- Default subdivision validation.
- Storage summary formatting.
- Clear data plan includes all v0 local data types.
- Permission status mapping.

### Integration Tests

- Update settings and persist them.
- Reload settings and verify values.
- Seed sheets, recordings, references, markers, and sessions.
- Storage summary counts are correct.
- Cancel cleanup does not delete data.
- Confirm cleanup deletes data and artifacts.
- Confirm cleanup resets settings.
- Reload after cleanup and verify data remains cleared.
- Permission granted, denied, prompt, or unknown states map to UI state.
- Cleanup failure propagates to UI error state.

### E2E / Playwright Tests

These tests must use real browser interaction.

- Open Settings.
- Change default BPM, time signature, subdivision, metronome volume, and reference volume.
- Refresh and verify values persisted.
- Seed or create sheets, recordings, references, markers, and sessions.
- Open Settings and verify local data counts.
- Click Clear All Local Data.
- Cancel confirmation.
- Verify data counts remain unchanged.
- Click Clear All Local Data again.
- Confirm cleanup.
- Refresh.
- Verify Sheet Library is empty.
- Verify Recordings is empty.
- Verify references are gone from a sheet context or local data overview.
- Verify markers and sessions/history are gone.
- Verify Settings returned to defaults.
- Verify microphone permission status is visible.
- Check browser console errors during the tested flows.

### Manual QA

- Confirm cleanup copy is clear and not easy to trigger accidentally.
- Confirm settings layout works on desktop and mobile.
- Confirm local data explanation is understandable.
- Confirm permission status language is understandable.

### Specialized Verification

#### Cleanup Verification

The verifier must seed multiple data types before cleanup:

- Sheet metadata and artifact.
- Recording metadata and artifact.
- Reference metadata and artifact when applicable.
- Error marker.
- Practice session/history.
- Non-default settings.

The verifier must check:

- Cancel does not remove any seeded data.
- Confirm removes all seeded data and artifacts.
- Settings reset to defaults.
- Reload does not restore cleared data.

#### Storage Overview Verification

The verifier must check:

- Counts match seeded data.
- Storage estimate is displayed when browser support exists.
- Fallback state is displayed when storage estimate is unavailable.

#### Permission Verification

The verifier must check:

- Permission state is visible.
- Denied or unknown state does not pretend recording is available.
- The app does not require advanced device selection in v0.

## QA Checklist

- [ ] Real browser E2E testing was performed.
- [ ] Settings persistence was tested after reload.
- [ ] Multiple data types were seeded before cleanup.
- [ ] Cleanup cancel was tested.
- [ ] Cleanup confirm was tested.
- [ ] Data and artifacts were verified cleared.
- [ ] Settings reset to defaults was verified.
- [ ] Storage overview counts were verified.
- [ ] Permission status was verified.
- [ ] Resize/mobile layout was checked.
- [ ] No console errors appeared during tested flows.

## Failure / Edge Cases

- Invalid BPM: clamp or show validation error.
- Invalid volume: clamp or show validation error.
- Permission API unavailable: show unknown/fallback state.
- Storage estimate unavailable: show fallback.
- Cleanup partially fails: show error and do not claim full cleanup.
- User cancels cleanup: no side effects.
- Storage quota issue: show clear error.

## Implementation Contract

The implementation agent may build:

- Settings page.
- Settings persistence integration.
- Permission status display.
- Local data explanation.
- Local data overview.
- Clear All Local Data confirmation.
- Cleanup service integration.
- Error states.

The implementation agent must not build:

- Account settings.
- Cloud sync settings.
- Advanced audio device selection.
- Themes.
- Notifications.
- Data import/export.
- Selective cleanup by type.
- Fake storage counts.

Implementation handoff must include:

- Settings, storage overview, cleanup, and permission areas changed.
- Tests run.
- Seed data used for cleanup self-test.
- Persistence checks performed.
- Cleanup cancel/confirm checks performed.
- Known limitations or risks.

## Verification Contract

The verification agent must:

- Be a separate agent pass from the implementation agent.
- Run relevant automated tests.
- Use real browser interaction for settings edits, cleanup cancel, cleanup confirm, reload, and permission display.
- Seed multiple data types before cleanup.
- Verify counts before cleanup.
- Verify cancel has no side effects.
- Verify confirm clears data and artifacts.
- Verify settings reset to defaults.
- Verify results persist after reload.
- Check browser console errors.

The verifier must report FAIL if cleanup only clears visible lists, if artifacts remain accessible, if cancel has side effects, if settings do not persist/reset correctly, or if E2E interaction is skipped.

## Implementation Handoff Requirements

- Summary of settings, storage summary, cleanup, and permission changes.
- Test commands run.
- Seed data used.
- Persistence evidence from implementer self-test.
- Cleanup evidence from implementer self-test.
- Known limitations or risks.

## Verification Handoff Requirements

- PASS or FAIL.
- Acceptance criteria checklist results.
- Real browser E2E evidence.
- Settings persistence evidence.
- Storage overview evidence.
- Cleanup cancel evidence.
- Cleanup confirm evidence.
- Artifact deletion evidence.
- Permission status evidence.
- Console error status.
- Repro steps for any failure.

## Done Definition

This module is complete only when:

- All acceptance criteria pass.
- Real browser E2E covers settings persistence and cleanup.
- Cleanup is verified with multiple seeded data types.
- Cancel and confirm cleanup behavior are verified.
- Data and artifact deletion are verified after reload.
- Permission status is verified.
- A separate verification agent reports PASS.

## v1 Hooks

Preserve room for:

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

Do not implement these in v0.
